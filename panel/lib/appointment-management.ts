import "server-only";

import type {
  AppointmentRecord,
  AppointmentStatus,
  BookingChannel,
  BookingSettingsRecord,
  BusinessHourRecord,
  StaffWorkingHourRecord,
} from "@/lib/business-shared";
import { createDefaultBookingSettings } from "@/lib/business-shared";
export {
  getManagedBusiness,
  type ManagedBusinessContext,
} from "@/lib/managed-business";
import {
  getAvailableAppointmentTimes,
  getDayOfWeekFromDateKey,
} from "@/lib/appointment-scheduling";
import { normalizeScheduleTime } from "@/lib/daily-schedule";
import type { ManagedBusinessContext } from "@/lib/managed-business";
import {
  fetchBusinessHoursRows,
  fetchStaffWorkingHoursRows,
} from "@/lib/schedule-schema";

export interface AppointmentPayload {
  customerId?: unknown;
  customerName?: unknown;
  customerContact?: unknown;
  customerEmail?: unknown;
  serviceId?: unknown;
  staffMemberId?: unknown;
  appointmentDate?: unknown;
  appointmentTime?: unknown;
  status?: unknown;
  channel?: unknown;
  notes?: unknown;
  internalNotes?: unknown;
  cancellationReason?: unknown;
}

export interface AppointmentStatusPayload {
  status?: unknown;
  cancellationReason?: unknown;
}

export interface ParsedAppointmentPayload {
  customerId: string | null;
  customerName: string;
  customerContact: string;
  customerEmail: string | null;
  serviceId: string;
  staffMemberId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  channel: BookingChannel;
  notes: string | null;
  internalNotes: string | null;
  cancellationReason: string | null;
}

interface BackendAppointmentMutationRow {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_contact: string;
  customer_email: string | null;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  channel: BookingChannel;
  service_id: string | null;
  service_name_snapshot: string;
  staff_member_id: string | null;
  staff_name_snapshot: string | null;
  price_snapshot: number | string;
  checkout_total?: number | string | null;
  duration_snapshot: number;
  notes: string | null;
  internal_notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

const APPOINTMENT_SELECT_FIELDS =
  "id, customer_id, customer_name, customer_contact, customer_email, appointment_date, appointment_time, status, channel, service_id, service_name_snapshot, staff_member_id, staff_name_snapshot, price_snapshot, duration_snapshot, notes, internal_notes, cancellation_reason, created_at, updated_at";

const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
] as const;
const BOOKING_CHANNELS = [
  "website",
  "whatsapp",
  "instagram",
  "manual",
] as const;

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function mapAppointmentRow(
  row: BackendAppointmentMutationRow,
): AppointmentRecord {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerContact: row.customer_contact,
    customerEmail: row.customer_email,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    status: row.status,
    channel: row.channel,
    serviceId: row.service_id,
    serviceName: row.service_name_snapshot,
    staffMemberId: row.staff_member_id,
    staffName: row.staff_name_snapshot,
    price: Number(row.checkout_total ?? row.price_snapshot),
    durationMinutes: row.duration_snapshot,
    notes: row.notes,
    internalNotes: row.internal_notes,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBusinessHours(
  rows: Awaited<ReturnType<typeof fetchBusinessHoursRows>>["data"],
) {
  return (rows ?? []).map(
    (row) =>
      ({
        id: row.id,
        dayOfWeek: row.day_of_week,
        label: row.label,
        openTime: row.open_time,
        closeTime: row.close_time,
        breakStartTime: row.break_start_time ?? null,
        breakEndTime: row.break_end_time ?? null,
        isOpen: row.is_open,
      }) satisfies BusinessHourRecord,
  );
}

function mapStaffWorkingHours(
  staffMemberId: string,
  rows: Awaited<ReturnType<typeof fetchStaffWorkingHoursRows>>["data"],
) {
  return (rows ?? [])
    .filter((row) => row.staff_member_id === staffMemberId)
    .map(
      (row) =>
        ({
          id: row.id,
          staffMemberId: row.staff_member_id,
          dayOfWeek: row.day_of_week,
          startTime: row.start_time,
          endTime: row.end_time,
          breakStartTime: row.break_start_time ?? null,
          breakEndTime: row.break_end_time ?? null,
          isActive: row.is_active,
        }) satisfies StaffWorkingHourRecord,
    );
}

function getStaffDaySchedule(
  appointmentDate: string,
  businessDay: BusinessHourRecord | null,
  staffWorkingHours: StaffWorkingHourRecord[],
  staffMemberId: string,
) {
  const dayOfWeek = getDayOfWeekFromDateKey(appointmentDate);

  if (staffWorkingHours.length === 0) {
    if (!businessDay) {
      return null;
    }

    return {
      id: `fallback-${staffMemberId}-${dayOfWeek}`,
      staffMemberId,
      dayOfWeek,
      startTime: businessDay.openTime,
      endTime: businessDay.closeTime,
      breakStartTime: businessDay.breakStartTime,
      breakEndTime: businessDay.breakEndTime,
      isActive: businessDay.isOpen,
    } satisfies StaffWorkingHourRecord;
  }

  return (
    staffWorkingHours.find((entry) => entry.dayOfWeek === dayOfWeek) ?? null
  );
}

export function parseAppointmentPayload(payload: AppointmentPayload): {
  data?: ParsedAppointmentPayload;
  error?: string;
} {
  const customerId =
    typeof payload.customerId === "string" && payload.customerId.trim()
      ? payload.customerId.trim()
      : null;
  const customerName =
    typeof payload.customerName === "string" ? payload.customerName.trim() : "";
  const customerContact =
    typeof payload.customerContact === "string"
      ? payload.customerContact.trim()
      : "";
  const customerEmail = normalizeOptionalText(payload.customerEmail);
  const serviceId =
    typeof payload.serviceId === "string" ? payload.serviceId.trim() : "";
  const staffMemberId =
    typeof payload.staffMemberId === "string"
      ? payload.staffMemberId.trim()
      : "";
  const appointmentDate =
    typeof payload.appointmentDate === "string"
      ? payload.appointmentDate.trim()
      : "";
  const appointmentTime = normalizeScheduleTime(payload.appointmentTime);
  const status =
    typeof payload.status === "string" &&
    APPOINTMENT_STATUSES.includes(payload.status as AppointmentStatus)
      ? (payload.status as AppointmentStatus)
      : "confirmed";
  const channel =
    typeof payload.channel === "string" &&
    BOOKING_CHANNELS.includes(payload.channel as BookingChannel)
      ? (payload.channel as BookingChannel)
      : "manual";

  if (!customerName) {
    return { error: "El nombre del cliente es obligatorio." };
  }

  if (!customerContact) {
    return { error: "El contacto del cliente es obligatorio." };
  }

  if (!serviceId) {
    return { error: "Debes seleccionar un servicio." };
  }

  if (!staffMemberId) {
    return { error: "Debes seleccionar un profesional." };
  }

  if (!appointmentDate || !isValidDateKey(appointmentDate)) {
    return { error: "La fecha del turno es inválida." };
  }

  if (!appointmentTime) {
    return { error: "La hora del turno es inválida." };
  }

  return {
    data: {
      customerId,
      customerName,
      customerContact,
      customerEmail,
      serviceId,
      staffMemberId,
      appointmentDate,
      appointmentTime,
      status,
      channel,
      notes: normalizeOptionalText(payload.notes),
      internalNotes: normalizeOptionalText(payload.internalNotes),
      cancellationReason: normalizeOptionalText(payload.cancellationReason),
    },
  };
}

export function parseAppointmentStatusPayload(
  payload: AppointmentStatusPayload,
): {
  data?: { status: AppointmentStatus; cancellationReason: string | null };
  error?: string;
} {
  const status =
    typeof payload.status === "string" &&
    APPOINTMENT_STATUSES.includes(payload.status as AppointmentStatus)
      ? (payload.status as AppointmentStatus)
      : null;

  if (!status) {
    return { error: "El estado del turno es inválido." };
  }

  return {
    data: {
      status,
      cancellationReason: normalizeOptionalText(payload.cancellationReason),
    },
  };
}

export async function findBusinessAppointment(
  context: ManagedBusinessContext,
  appointmentId: string,
) {
  const { data, error } = await context.backend
    .from("appointments")
    .select(
      "id, customer_id, staff_member_id, status, appointment_date, appointment_time, duration_snapshot",
    )
    .eq("id", appointmentId)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (error) {
    return { error: "No se pudo validar el turno seleccionado." };
  }

  if (!data) {
    return { error: "No se encontró el turno seleccionado." };
  }

  return { data };
}

export async function getAppointmentRecord(
  context: ManagedBusinessContext,
  appointmentId: string,
) {
  const { data, error } = await context.backend
    .from("appointments")
    .select(APPOINTMENT_SELECT_FIELDS)
    .eq("id", appointmentId)
    .eq("business_id", context.business.id)
    .maybeSingle();

  if (error) {
    return { error: "No se pudo cargar el turno actualizado." };
  }

  if (!data) {
    return { error: "No se encontró el turno actualizado." };
  }

  return {
    data: mapAppointmentRow(data as BackendAppointmentMutationRow),
  };
}

async function resolveAppointmentCustomer(
  context: ManagedBusinessContext,
  payload: ParsedAppointmentPayload,
) {
  const { backend, business } = context;
  const timestamp = new Date().toISOString();

  if (payload.customerId) {
    const { data: existingCustomer, error: existingCustomerError } =
      await backend
        .from("customers")
        .select("id")
        .eq("id", payload.customerId)
        .eq("business_id", business.id)
        .maybeSingle();

    if (existingCustomerError) {
      return { error: "No se pudo validar el cliente seleccionado." };
    }

    if (!existingCustomer) {
      return { error: "El cliente seleccionado no pertenece al negocio." };
    }

    const { data, error } = await backend
      .from("customers")
      .update({
        full_name: payload.customerName,
        primary_contact: payload.customerContact,
        email: payload.customerEmail,
        updated_at: timestamp,
      })
      .eq("id", payload.customerId)
      .eq("business_id", business.id)
      .select("id")
      .single();

    if (error || !data) {
      return {
        error:
          error?.code === "23505"
            ? "Ya existe otro cliente con ese contacto o email."
            : "No se pudo actualizar el cliente del turno.",
      };
    }

    return { data };
  }

  const { data: matchedByContact, error: matchedByContactError } = await backend
    .from("customers")
    .select("id")
    .eq("business_id", business.id)
    .eq("primary_contact", payload.customerContact)
    .maybeSingle();

  if (matchedByContactError) {
    return { error: "No se pudo validar el cliente del turno." };
  }

  let matchedCustomer = matchedByContact;

  if (!matchedCustomer && payload.customerEmail) {
    const { data: matchedByEmail, error: matchedByEmailError } = await backend
      .from("customers")
      .select("id")
      .eq("business_id", business.id)
      .ilike("email", payload.customerEmail)
      .maybeSingle();

    if (matchedByEmailError) {
      return { error: "No se pudo validar el cliente del turno." };
    }

    matchedCustomer = matchedByEmail;
  }

  if (matchedCustomer) {
    const { data, error } = await backend
      .from("customers")
      .update({
        full_name: payload.customerName,
        primary_contact: payload.customerContact,
        email: payload.customerEmail,
        updated_at: timestamp,
      })
      .eq("id", matchedCustomer.id)
      .eq("business_id", business.id)
      .select("id")
      .single();

    if (error || !data) {
      return {
        error:
          error?.code === "23505"
            ? "Ya existe otro cliente con ese contacto o email."
            : "No se pudo actualizar el cliente del turno.",
      };
    }

    return { data };
  }

  const { data, error } = await backend
    .from("customers")
    .insert({
      business_id: business.id,
      full_name: payload.customerName,
      primary_contact: payload.customerContact,
      email: payload.customerEmail,
      status: "active",
      marketing_opt_in: false,
      updated_at: timestamp,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error:
        error?.code === "23505"
          ? "Ya existe otro cliente con ese contacto o email."
          : "No se pudo crear el cliente del turno.",
    };
  }

  return { data };
}

export async function syncCustomerAppointmentStats(
  context: ManagedBusinessContext,
  customerId: string | null,
) {
  if (!customerId) {
    return;
  }

  const { backend, business } = context;
  const { data: appointments, error: appointmentsError } = await backend
    .from("appointments")
    .select("appointment_date, status")
    .eq("business_id", business.id)
    .eq("customer_id", customerId);

  if (appointmentsError) {
    return;
  }

  const nonCancelledAppointments = (appointments ?? []).filter(
    (appointment) => appointment.status !== "cancelled",
  );
  const lastCompletedAppointment = (appointments ?? [])
    .filter((appointment) => appointment.status === "completed")
    .sort((left, right) =>
      left.appointment_date < right.appointment_date ? 1 : -1,
    )[0];

  await backend
    .from("customers")
    .update({
      total_appointments: nonCancelledAppointments.length,
      last_visit_at: lastCompletedAppointment?.appointment_date ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .eq("business_id", business.id);
}

export async function validateAppointmentPayload(
  context: ManagedBusinessContext,
  payload: ParsedAppointmentPayload,
  options?: { appointmentIdToIgnore?: string | null },
) {
  const { backend, business } = context;

  const [
    { data: service, error: serviceError },
    { data: staffMember, error: staffError },
    { data: staffAssignments, error: staffAssignmentsError },
    businessHoursResult,
    staffWorkingHoursResult,
    { data: bookingSettings, error: bookingSettingsError },
    { data: appointments, error: appointmentsError },
  ] = await Promise.all([
    backend
      .from("services")
      .select("id, name, duration_minutes, price, is_active")
      .eq("id", payload.serviceId)
      .eq("business_id", business.id)
      .maybeSingle(),
    backend
      .from("staff_members")
      .select("id, full_name, is_active")
      .eq("id", payload.staffMemberId)
      .eq("business_id", business.id)
      .maybeSingle(),
    backend
      .from("staff_member_services")
      .select("service_id")
      .eq("staff_member_id", payload.staffMemberId),
    fetchBusinessHoursRows(backend, business.id),
    fetchStaffWorkingHoursRows(backend),
    backend
      .from("booking_settings")
      .select(
        "id, slot_interval_minutes, lead_time_minutes, max_booking_days_in_advance, buffer_between_appointments_minutes",
      )
      .eq("business_id", business.id)
      .maybeSingle(),
    backend
      .from("appointments")
      .select(APPOINTMENT_SELECT_FIELDS)
      .eq("business_id", business.id)
      .eq("appointment_date", payload.appointmentDate),
  ]);

  if (serviceError || !service) {
    return { error: "El servicio seleccionado no existe en este negocio." };
  }

  if (!service.is_active) {
    return {
      error: "El servicio seleccionado está inactivo. Reactívalo o elige otro.",
    };
  }

  if (staffError || !staffMember) {
    return { error: "El profesional seleccionado no existe en este negocio." };
  }

  if (!staffMember.is_active) {
    return {
      error:
        "El profesional seleccionado está inactivo. Reactívalo o elige otro.",
    };
  }

  if (
    staffAssignmentsError ||
    businessHoursResult.error ||
    staffWorkingHoursResult.error ||
    appointmentsError
  ) {
    return { error: "No se pudo validar la disponibilidad del turno." };
  }

  const hasServiceAssignments = (staffAssignments ?? []).length > 0;

  if (
    hasServiceAssignments &&
    !(staffAssignments ?? []).some(
      (assignment) => assignment.service_id === payload.serviceId,
    )
  ) {
    return {
      error:
        "Ese profesional no tiene asignado el servicio seleccionado. Revisa su configuración o elige otro.",
    };
  }

  if (bookingSettingsError) {
    return { error: "No se pudieron cargar las reglas generales de turnos." };
  }

  const businessHours = mapBusinessHours(businessHoursResult.data);
  const staffWorkingHours = mapStaffWorkingHours(
    payload.staffMemberId,
    staffWorkingHoursResult.data,
  );
  const parsedBookingSettings: BookingSettingsRecord = bookingSettings
    ? {
        id: bookingSettings.id,
        slotIntervalMinutes: bookingSettings.slot_interval_minutes,
        leadTimeMinutes: bookingSettings.lead_time_minutes,
        maxBookingDaysInAdvance: bookingSettings.max_booking_days_in_advance,
        bufferBetweenAppointmentsMinutes:
          bookingSettings.buffer_between_appointments_minutes,
      }
    : createDefaultBookingSettings();

  const dayOfWeek = getDayOfWeekFromDateKey(payload.appointmentDate);
  const businessDay =
    businessHours.find((entry) => entry.dayOfWeek === dayOfWeek) ?? null;

  if (
    !businessDay ||
    !businessDay.isOpen ||
    !businessDay.openTime ||
    !businessDay.closeTime
  ) {
    return { error: "El negocio está cerrado en la fecha seleccionada." };
  }

  const staffDay = getStaffDaySchedule(
    payload.appointmentDate,
    businessDay,
    staffWorkingHours,
    payload.staffMemberId,
  );

  if (
    !staffDay ||
    !staffDay.isActive ||
    !staffDay.startTime ||
    !staffDay.endTime
  ) {
    return { error: "El profesional no atiende en la fecha seleccionada." };
  }

  const availableTimes = getAvailableAppointmentTimes({
    appointmentDate: payload.appointmentDate,
    appointmentIdToIgnore: options?.appointmentIdToIgnore ?? null,
    appointments:
      (appointments as BackendAppointmentMutationRow[] | null)?.map(
        mapAppointmentRow,
      ) ?? [],
    bookingSettings: parsedBookingSettings,
    businessHours,
    durationMinutes: service.duration_minutes,
    staffMemberId: payload.staffMemberId,
    staffWorkingHours,
  });

  if (!availableTimes.includes(payload.appointmentTime)) {
    return {
      error:
        "Ese horario no está disponible para el profesional seleccionado. Revisa el picker y elige otro turno.",
    };
  }

  const customerResult = await resolveAppointmentCustomer(context, payload);

  if (customerResult.error || !customerResult.data) {
    return { error: customerResult.error ?? "No se pudo resolver el cliente." };
  }

  return {
    data: {
      customerId: customerResult.data.id,
      price: Number(service.price),
      serviceDurationMinutes: service.duration_minutes,
      serviceName: service.name,
      staffName: staffMember.full_name,
    },
  };
}
