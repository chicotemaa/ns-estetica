"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter, useSearchParams } from "next/navigation";

import { getAvailableAppointmentTimes } from "@/lib/appointment-scheduling";
import {
  buildHistoricalAgendaEntries,
  matchesAgendaSource,
  type AgendaSourceFilter,
} from "@/lib/agenda-history";
import type {
  AppointmentRecord,
  WorkRecord,
  AppointmentStatus,
  BookingSettingsRecord,
  BusinessHourRecord,
  CustomerRecord,
  ServiceRecord,
  StaffRecord,
  StaffServiceAssignmentRecord,
  StaffWorkingHourRecord,
} from "@/lib/business-shared";

import type {
  AgendaFeedbackState,
  AgendaViewMode,
  AppointmentFormState,
  AppointmentStatusDialogState,
} from "./appointment-types";
import {
  createAppointmentFormState,
  filterAppointmentsForAgenda,
  getAgendaMetrics,
  getAgendaRangeMeta,
  getAppointmentsForDate,
  navigateAgendaDate,
  sortAppointments,
} from "./appointment-utils";

function createFeedbackState(
  title: string,
  description: string,
  tone: AgendaFeedbackState["tone"],
) {
  return { title, description, tone } satisfies AgendaFeedbackState;
}

function createStatusDialogState(
  appointment: AppointmentRecord,
  nextStatus: AppointmentStatus,
) {
  if (nextStatus === "cancelled") {
    return {
      appointment,
      nextStatus,
      confirmLabel: "Cancelar turno",
      description:
        "El turno se marcará como cancelado. Puedes dejar un motivo para que quede registrado.",
      title: "Cancelar turno",
    } satisfies AppointmentStatusDialogState;
  }

  if (nextStatus === "completed") {
    return {
      appointment,
      nextStatus,
      confirmLabel: "Marcar como completado",
      description:
        "Este turno pasará a estado completado y contará como atención realizada.",
      title: "Completar turno",
    } satisfies AppointmentStatusDialogState;
  }

  return {
    appointment,
    nextStatus,
    confirmLabel: "Confirmar turno",
    description:
      "El turno quedará confirmado en agenda y listo para seguimiento operativo.",
    title: "Confirmar turno",
  } satisfies AppointmentStatusDialogState;
}

function ensureSortedAppointments(appointments: AppointmentRecord[]) {
  return sortAppointments(appointments);
}

function upsertAppointment(
  appointments: AppointmentRecord[],
  appointment: AppointmentRecord,
) {
  const hasExistingAppointment = appointments.some(
    (currentAppointment) => currentAppointment.id === appointment.id,
  );

  const nextAppointments = hasExistingAppointment
    ? appointments.map((currentAppointment) =>
        currentAppointment.id === appointment.id
          ? appointment
          : currentAppointment,
      )
    : [...appointments, appointment];

  return ensureSortedAppointments(nextAppointments);
}

export function useAppointmentsController({
  initialViewMode,
  initialDateKey,
  initialAppointmentId = null,
  initialCreate = false,
  appointments,
  workRecords,
  bookingSettings,
  businessHours,
  customers,
  services,
  staffMembers,
  staffServiceAssignments,
  staffWorkingHours,
  timeZone,
  todayKey,
}: {
  initialViewMode?: AgendaViewMode;
  initialDateKey?: string;
  initialAppointmentId?: string | null;
  initialCreate?: boolean;
  appointments: AppointmentRecord[];
  workRecords: WorkRecord[];
  bookingSettings: BookingSettingsRecord;
  businessHours: BusinessHourRecord[];
  customers: CustomerRecord[];
  services: ServiceRecord[];
  staffMembers: StaffRecord[];
  staffServiceAssignments: StaffServiceAssignmentRecord[];
  staffWorkingHours: StaffWorkingHourRecord[];
  timeZone: string;
  todayKey: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    let last = 0;
    const refresh = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 15000) {
        last = Date.now();
        router.refresh();
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  const [isRefreshing, startTransition] = useTransition();
  const [appointmentsState, setAppointmentsState] = useState(
    ensureSortedAppointments(appointments),
  );
  const isMobile = useIsMobile();
  const [requestedViewMode, setViewMode] = useState<AgendaViewMode | null>(
    initialViewMode ?? null,
  );
  const viewMode =
    requestedViewMode ?? (initialAppointmentId || isMobile ? "day" : "week");
  const [rangeFocusDateKey, setFocusDateKey] = useState(
    initialDateKey || todayKey,
  );
  const [selectedDateKey, setSelectedDateKey] = useState(
    initialDateKey || todayKey,
  );
  // The daily calendar and its detail list always represent the same date,
  // including when hydration switches the initial week view to mobile day view.
  const focusDateKey = viewMode === "day" ? selectedDateKey : rangeFocusDateKey;
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(initialAppointmentId);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>(
    "all",
  );
  const [staffFilter, setStaffFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<AgendaSourceFilter>("all");
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentRecord | null>(null);
  const [formState, setFormState] = useState<AppointmentFormState>(() => ({
    ...createAppointmentFormState({ dateKey: initialDateKey || todayKey }),
    ...(initialCreate
      ? {
          serviceId:
            services.find((s) => s.isActive && s.durationMinutes > 0)?.id || "",
          staffMemberId: staffMembers.find((s) => s.isActive)?.id || "",
        }
      : {}),
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(initialCreate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusDialogState, setStatusDialogState] =
    useState<AppointmentStatusDialogState | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);
  const [feedbackState, setFeedbackState] =
    useState<AgendaFeedbackState | null>(null);

  useEffect(() => {
    setAppointmentsState(ensureSortedAppointments(appointments));
  }, [appointments]);

  const activeServices = useMemo(
    () =>
      services.filter(
        (service) =>
          (service.isActive && service.durationMinutes > 0) ||
          service.id === formState.serviceId,
      ),
    [formState.serviceId, services],
  );
  const activeStaffMembers = useMemo(
    () =>
      staffMembers.filter(
        (staffMember) =>
          staffMember.isActive || staffMember.id === formState.staffMemberId,
      ),
    [formState.staffMemberId, staffMembers],
  );

  const compatibleStaffMembers = useMemo(() => {
    if (!formState.serviceId) {
      return activeStaffMembers;
    }

    return activeStaffMembers.filter((staffMember) => {
      const assignments = staffServiceAssignments.filter(
        (assignment) => assignment.staffMemberId === staffMember.id,
      );

      if (assignments.length === 0) {
        return true;
      }

      return assignments.some(
        (assignment) => assignment.serviceId === formState.serviceId,
      );
    });
  }, [activeStaffMembers, formState.serviceId, staffServiceAssignments]);

  function getCompatibleStaffForService(serviceId: string) {
    if (!serviceId) {
      return activeStaffMembers;
    }

    return activeStaffMembers.filter((staffMember) => {
      const assignments = staffServiceAssignments.filter(
        (assignment) => assignment.staffMemberId === staffMember.id,
      );

      if (assignments.length === 0) {
        return true;
      }

      return assignments.some(
        (assignment) => assignment.serviceId === serviceId,
      );
    });
  }

  useEffect(() => {
    if (!isFormOpen || compatibleStaffMembers.length === 0) {
      return;
    }

    if (
      formState.staffMemberId &&
      compatibleStaffMembers.some(
        (staffMember) => staffMember.id === formState.staffMemberId,
      )
    ) {
      return;
    }

    setFormState((current) => ({
      ...current,
      staffMemberId: compatibleStaffMembers[0]?.id ?? "",
    }));
  }, [compatibleStaffMembers, formState.staffMemberId, isFormOpen]);

  const historicalEntries = useMemo(
    () =>
      buildHistoricalAgendaEntries(
        workRecords,
        appointmentsState,
        businessHours,
      ),
    [workRecords, appointmentsState, businessHours],
  );
  const agendaEntries = useMemo(
    () =>
      [...appointmentsState, ...historicalEntries].filter((entry) =>
        matchesAgendaSource(entry, sourceFilter),
      ),
    [appointmentsState, historicalEntries, sourceFilter],
  );
  const latestHistoryDate = historicalEntries.at(-1)?.appointmentDate ?? null;
  const visibleAppointments = useMemo(
    () =>
      filterAppointmentsForAgenda(agendaEntries, viewMode, focusDateKey, {
        searchTerm,
        staffFilter,
        statusFilter,
      }),
    [
      agendaEntries,
      focusDateKey,
      searchTerm,
      staffFilter,
      statusFilter,
      viewMode,
    ],
  );

  const selectedDateAppointments = useMemo(
    () =>
      getAppointmentsForDate(agendaEntries, selectedDateKey, {
        searchTerm,
        staffFilter,
        statusFilter,
      }),
    [agendaEntries, searchTerm, selectedDateKey, staffFilter, statusFilter],
  );

  useEffect(() => {
    if (selectedDateAppointments.length === 0) {
      setSelectedAppointmentId(null);
      return;
    }

    if (
      selectedAppointmentId &&
      selectedDateAppointments.some(
        (appointment) => appointment.id === selectedAppointmentId,
      )
    ) {
      return;
    }

    setSelectedAppointmentId(selectedDateAppointments[0]?.id ?? null);
  }, [selectedAppointmentId, selectedDateAppointments]);

  const selectedAppointment =
    selectedDateAppointments.find(
      (appointment) => appointment.id === selectedAppointmentId,
    ) ?? null;

  const agendaMetrics = useMemo(
    () => getAgendaMetrics(visibleAppointments),
    [visibleAppointments],
  );
  const rangeMeta = useMemo(
    () => getAgendaRangeMeta(viewMode, focusDateKey, timeZone),
    [focusDateKey, timeZone, viewMode],
  );

  const selectedService = useMemo(
    () =>
      services.find((service) => service.id === formState.serviceId) ?? null,
    [formState.serviceId, services],
  );

  const availableTimeOptions = useMemo(() => {
    if (
      !formState.appointmentDate ||
      !formState.serviceId ||
      !formState.staffMemberId ||
      !selectedService
    ) {
      return [];
    }

    return getAvailableAppointmentTimes({
      appointmentDate: formState.appointmentDate,
      appointmentIdToIgnore: editingAppointment?.id ?? null,
      appointments: appointmentsState,
      bookingSettings,
      businessHours,
      durationMinutes: selectedService.durationMinutes,
      staffMemberId: formState.staffMemberId,
      staffWorkingHours,
    }).map((timeValue) => timeValue.slice(0, 5));
  }, [
    appointmentsState,
    bookingSettings,
    businessHours,
    editingAppointment?.id,
    formState.appointmentDate,
    formState.serviceId,
    formState.staffMemberId,
    selectedService,
    staffWorkingHours,
  ]);

  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    if (availableTimeOptions.length === 0) {
      if (!formState.appointmentTime) {
        return;
      }

      setFormState((current) => ({ ...current, appointmentTime: "" }));
      return;
    }

    if (availableTimeOptions.includes(formState.appointmentTime)) {
      return;
    }

    setFormState((current) => ({
      ...current,
      appointmentTime: availableTimeOptions[0] ?? "",
    }));
  }, [availableTimeOptions, formState.appointmentTime, isFormOpen]);

  function refreshData() {
    startTransition(() => {
      router.refresh();
    });
  }

  function closeFeedbackDialog() {
    setFeedbackState(null);
  }

  function closeFormDialog() {
    setIsFormOpen(false);
    setEditingAppointment(null);
    setFormError(null);
    setFormState(createAppointmentFormState({ dateKey: selectedDateKey }));
  }

  function updateFormField<K extends keyof AppointmentFormState>(
    field: K,
    value: AppointmentFormState[K],
  ) {
    if (field === "customerId") {
      const customerId = value as string;
      const selectedCustomer = customers.find(
        (customer) => customer.id === customerId,
      );

      if (selectedCustomer) {
        setFormState((current) => ({
          ...current,
          customerId,
          customerName: selectedCustomer.fullName,
          customerContact:
            selectedCustomer.primaryContact || selectedCustomer.phone || "",
          customerEmail: selectedCustomer.email ?? "",
        }));
        return;
      }
    }

    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreateDialog(options?: { dateKey?: string; time?: string }) {
    const dateKey = options?.dateKey ?? selectedDateKey;
    const time = options?.time ?? "";
    const defaultService = activeServices[0] ?? null;
    const defaultStaff =
      getCompatibleStaffForService(defaultService?.id ?? "")[0] ??
      activeStaffMembers[0] ??
      null;

    const customer = customers.find(
      (c) => c.id === searchParams.get("customer"),
    );
    setEditingAppointment(null);
    setFormError(null);
    setFormState({
      ...createAppointmentFormState({ dateKey, time }),
      ...(customer
        ? {
            customerId: customer.id,
            customerName: customer.fullName,
            customerContact: customer.primaryContact,
            customerEmail: customer.email || "",
          }
        : {}),
      serviceId: defaultService?.id ?? "",
      staffMemberId: defaultStaff?.id ?? "",
    });
    setSelectedDateKey(dateKey);
    setIsFormOpen(true);
  }

  function openEditDialog(appointment: AppointmentRecord) {
    setEditingAppointment(appointment);
    setFormError(null);
    setSelectedDateKey(appointment.appointmentDate);
    setSelectedAppointmentId(appointment.id);
    setFormState(createAppointmentFormState({ appointment }));
    setIsFormOpen(true);
  }

  function openStatusDialog(
    appointment: AppointmentRecord,
    nextStatus: AppointmentStatus,
  ) {
    setStatusDialogState(createStatusDialogState(appointment, nextStatus));
    setStatusReason(appointment.cancellationReason ?? "");
  }

  function closeStatusDialog() {
    setStatusDialogState(null);
    setStatusReason("");
  }

  async function submitForm() {
    setIsSubmitting(true);
    setFormError(null);

    const endpoint = editingAppointment
      ? `/api/appointments/${editingAppointment.id}`
      : "/api/appointments";
    const method = editingAppointment ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: formState.customerId || null,
          customerName: formState.customerName,
          customerContact: formState.customerContact,
          customerEmail: formState.customerEmail,
          serviceId: formState.serviceId,
          staffMemberId: formState.staffMemberId,
          appointmentDate: formState.appointmentDate,
          appointmentTime: formState.appointmentTime,
          status: formState.status,
          channel: formState.channel,
          notes: formState.notes,
          internalNotes: formState.internalNotes,
          cancellationReason: formState.cancellationReason,
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        appointment?: AppointmentRecord;
        error?: string;
      } | null;

      if (!response.ok || !body?.appointment) {
        setFormError(body?.error ?? "No se pudo guardar el turno.");
        return;
      }

      setAppointmentsState((current) =>
        upsertAppointment(current, body.appointment as AppointmentRecord),
      );
      setSelectedDateKey(body.appointment.appointmentDate);
      setSelectedAppointmentId(body.appointment.id);
      setIsFormOpen(false);
      setEditingAppointment(null);
      setFormState(
        createAppointmentFormState({
          dateKey: body.appointment.appointmentDate,
        }),
      );
      setFeedbackState(
        createFeedbackState(
          editingAppointment ? "Turno actualizado" : "Turno creado",
          editingAppointment
            ? "La agenda reflejó correctamente los cambios del turno."
            : "El turno quedó cargado y disponible en la agenda.",
          "success",
        ),
      );
      refreshData();
    } catch {
      setFormError("Ocurrió un problema al guardar el turno.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmStatusChange() {
    if (!statusDialogState) {
      return;
    }

    setIsStatusSubmitting(true);

    try {
      const response = await fetch(
        `/api/appointments/${statusDialogState.appointment.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: statusDialogState.nextStatus,
            cancellationReason:
              statusDialogState.nextStatus === "cancelled"
                ? statusReason
                : null,
          }),
        },
      );

      const body = (await response.json().catch(() => null)) as {
        appointment?: AppointmentRecord;
        error?: string;
      } | null;

      if (!response.ok || !body?.appointment) {
        closeStatusDialog();
        setFeedbackState(
          createFeedbackState(
            "No se pudo actualizar el estado",
            body?.error ?? "Ocurrió un problema al actualizar el turno.",
            "error",
          ),
        );
        return;
      }

      setAppointmentsState((current) =>
        upsertAppointment(current, body.appointment as AppointmentRecord),
      );
      setSelectedDateKey(body.appointment.appointmentDate);
      setSelectedAppointmentId(body.appointment.id);
      closeStatusDialog();
      setFeedbackState(
        createFeedbackState(
          "Estado actualizado",
          "La agenda se actualizó correctamente.",
          "success",
        ),
      );
      refreshData();
    } catch {
      closeStatusDialog();
      setFeedbackState(
        createFeedbackState(
          "No se pudo actualizar el estado",
          "Ocurrió un problema al actualizar el turno.",
          "error",
        ),
      );
    } finally {
      setIsStatusSubmitting(false);
    }
  }

  async function moveAppointment(
    appointmentId: string,
    nextDateKey: string,
    nextTime: string,
    revert: () => void,
  ) {
    const appointment = appointmentsState.find(
      (currentAppointment) => currentAppointment.id === appointmentId,
    );

    if (!appointment) {
      revert();
      return;
    }

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: appointment.customerId ?? null,
          customerName: appointment.customerName,
          customerContact: appointment.customerContact,
          customerEmail: appointment.customerEmail,
          serviceId: appointment.serviceId,
          staffMemberId: appointment.staffMemberId,
          appointmentDate: nextDateKey,
          appointmentTime: nextTime,
          status: appointment.status,
          channel: appointment.channel,
          notes: appointment.notes,
          internalNotes: appointment.internalNotes,
          cancellationReason: appointment.cancellationReason,
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        appointment?: AppointmentRecord;
        error?: string;
      } | null;

      if (!response.ok || !body?.appointment) {
        revert();
        setFeedbackState(
          createFeedbackState(
            "No se pudo mover el turno",
            body?.error ?? "La reprogramación no pudo guardarse.",
            "error",
          ),
        );
        return;
      }

      setAppointmentsState((current) =>
        upsertAppointment(current, body.appointment as AppointmentRecord),
      );
      setSelectedDateKey(body.appointment.appointmentDate);
      setSelectedAppointmentId(body.appointment.id);
      refreshData();
    } catch {
      revert();
      setFeedbackState(
        createFeedbackState(
          "No se pudo mover el turno",
          "La reprogramación no pudo guardarse.",
          "error",
        ),
      );
    }
  }

  function changeViewMode(nextViewMode: AgendaViewMode) {
    setViewMode(nextViewMode);
    // Switching from a month back to a week keeps the selected attention in
    // view, instead of jumping to the week containing the first of the month.
    setFocusDateKey(selectedDateKey);
  }

  function navigate(direction: -1 | 1) {
    const nextDateKey = navigateAgendaDate(focusDateKey, viewMode, direction);
    setFocusDateKey(nextDateKey);
    setSelectedDateKey(nextDateKey);
  }

  function goToToday() {
    setFocusDateKey(todayKey);
    setSelectedDateKey(todayKey);
  }

  function selectDate(dateKey: string) {
    setSelectedDateKey(dateKey);

    if (viewMode === "day") {
      setFocusDateKey(dateKey);
    }
  }

  function openDay(dateKey: string) {
    setViewMode("day");
    setSelectedDateKey(dateKey);
    setFocusDateKey(dateKey);
  }

  function openMonth(dateKey: string) {
    setViewMode("month");
    setFocusDateKey(dateKey);
    setSelectedDateKey(dateKey);
  }

  function syncVisibleRangeStart(dateKey: string) {
    setFocusDateKey((current) => (current === dateKey ? current : dateKey));
  }

  return {
    latestHistoryDate,
    sourceFilter,
    setSourceFilter,
    agendaMetrics,
    availableTimeOptions,
    closeFeedbackDialog,
    closeFormDialog,
    closeStatusDialog,
    compatibleStaffMembers,
    customers,
    editingAppointment,
    feedbackState,
    focusDateKey,
    formError,
    formState,
    isFormOpen,
    isRefreshing,
    isStatusSubmitting,
    isSubmitting,
    moveAppointment,
    openCreateDialog,
    openEditDialog,
    openStatusDialog,
    rangeMeta,
    searchTerm,
    selectDate,
    selectedAppointment,
    selectedAppointmentId,
    selectedDateAppointments,
    selectedDateKey,
    services: activeServices,
    setSearchTerm,
    setSelectedAppointmentId,
    setStaffFilter,
    setStatusFilter,
    staffFilter,
    staffMembers,
    statusDialogState,
    statusFilter,
    statusReason,
    submitForm,
    syncVisibleRangeStart,
    timeZone,
    todayKey,
    updateFormField,
    setStatusReason,
    viewMode,
    visibleAppointments,
    goToToday,
    navigate,
    changeViewMode,
    openDay,
    confirmStatusChange,
    openMonth,
  };
}
