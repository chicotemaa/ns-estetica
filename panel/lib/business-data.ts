import { managementNotes } from "./management-notes";
import "server-only";

import type { BackendClient } from "@/lib/backend/client";

import {
  createBackendAdminClient,
  hasBackendAdminConfig,
} from "@/lib/backend/client";
import type {
  WorkRecord,
  AppointmentRecord,
  AppointmentStatus,
  BookingChannel,
  BookingSettingsRecord,
  BusinessHourRecord,
  BusinessRecord,
  CustomerRecord,
  ExpenseRecord,
  PaymentRecord,
  PaymentStatus,
  PayoutRecord,
  ServiceRecord,
  ServicePriceVariantRecord,
  StaffCategoryRateRecord,
  StaffCompensationType,
  StaffRecord,
  StaffServiceAssignmentRecord,
  StaffTimeLogRecord,
  StaffWorkingHourRecord,
} from "@/lib/business-shared";
import {
  createDefaultBookingSettings,
  createDefaultCategoryRateMap,
  createDefaultBusinessHours,
  getBusinessDayLabel,
} from "@/lib/business-shared";
import {
  fetchBusinessHoursRows,
  fetchStaffWorkingHoursRows,
} from "@/lib/schedule-schema";

export interface BusinessDataBundle {
  business: BusinessRecord;
  services: ServiceRecord[];
  staffMembers: StaffRecord[];
  appointments: AppointmentRecord[];
  isLive: boolean;
}

export interface BusinessOperationsBundle {
  workRecords?: WorkRecord[];
  importReviewCount?: number;
  business: BusinessRecord;
  staffMembers: StaffRecord[];
  customers: CustomerRecord[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  payouts: PayoutRecord[];
  staffTimeLogs: StaffTimeLogRecord[];
  servicePriceVariants: ServicePriceVariantRecord[];
  isLive: boolean;
}

export interface BusinessScheduleBundle {
  business: BusinessRecord;
  businessHours: BusinessHourRecord[];
  bookingSettings: BookingSettingsRecord;
  isLive: boolean;
}

export interface BusinessAgendaBundle {
  workRecords: WorkRecord[];
  business: BusinessRecord;
  services: ServiceRecord[];
  staffMembers: StaffRecord[];
  appointments: AppointmentRecord[];
  customers: CustomerRecord[];
  businessHours: BusinessHourRecord[];
  bookingSettings: BookingSettingsRecord;
  staffWorkingHours: StaffWorkingHourRecord[];
  staffServiceAssignments: StaffServiceAssignmentRecord[];
  isLive: boolean;
}

export interface BusinessTeamBundle {
  business: BusinessRecord;
  services: ServiceRecord[];
  staffMembers: StaffRecord[];
  appointments: AppointmentRecord[];
  staffTimeLogs: StaffTimeLogRecord[];
  staffWorkingHours: StaffWorkingHourRecord[];
  staffCategoryRates: StaffCategoryRateRecord[];
  staffServiceAssignments: StaffServiceAssignmentRecord[];
  isLive: boolean;
}

interface BackendBusinessRow {
  website_content?: { identity?: { name?: string } };
  monthly_collection_target?: number | string;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  time_zone: string | null;
}

interface BackendServiceRow {
  booking_enabled?: boolean;
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | string;
  is_active: boolean;
  category: ServiceRecord["category"];
}

interface BackendStaffRow {
  payroll_mode?: "hourly" | "percentage" | null;
  payroll_cadence?: "weekly" | "semimonthly" | "monthly" | null;
  payroll_weekday?: number | null;
  payroll_cutoff_first?: number | null;
  payroll_cutoff_second?: number | null;
  payroll_pay_delay?: number | null;
  collection_commission_rate?: number | string;
  id: string;
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  bio?: string | null;
  join_date?: string | null;
  employee_code?: string | null;
  hourly_rate?: number | string | null;
  rating?: number | string | null;
  compensation_type?: StaffCompensationType | null;
}

interface BackendAppointmentRow {
  arrived_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  id: string;
  customer_id?: string | null;
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
  internal_notes?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

interface BackendCustomerRow {
  id: string;
  full_name: string;
  primary_contact: string;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  address: string | null;
  status: CustomerRecord["status"];
  preferred_services: string[] | null;
  notes: string | null;
  rating: number | string | null;
  marketing_opt_in: boolean;
  last_visit_at: string | null;
  total_appointments: number;
  total_spent: number | string;
  joined_at: string;
}

interface BackendPaymentRelationRow {
  full_name?: string | null;
  customer_name?: string | null;
  name?: string | null;
  number?: string | null;
}

interface BackendPaymentRow {
  collection_date?: string | null;
  work_record_id?: string | null;
  import_ref?: string | null;
  appointment_id?: string | null;
  commission_rate?: number | string | null;
  commission_amount?: number | string | null;
  id: string;
  description: string;
  amount: number | string;
  method: PaymentRecord["method"];
  status: PaymentStatus;
  customer_id: string | null;
  invoice_id: string | null;
  staff_member_id: string | null;
  transaction_id: string | null;
  processed_at: string | null;
  created_at: string;
  notes: string | null;
  customer: BackendPaymentRelationRow | BackendPaymentRelationRow[] | null;
  work_record?: BackendPaymentRelationRow | BackendPaymentRelationRow[] | null;
  appointment?: BackendPaymentRelationRow | BackendPaymentRelationRow[] | null;
  staff_member: BackendPaymentRelationRow | BackendPaymentRelationRow[] | null;
  invoice: BackendPaymentRelationRow | BackendPaymentRelationRow[] | null;
}

interface BackendExpenseRow {
  import_ref?: string | null;
  id: string;
  expense_date: string;
  category: string;
  subcategory: string | null;
  description: string;
  vendor_name: string | null;
  amount: number | string;
  method: ExpenseRecord["method"];
  source: string;
  notes: string | null;
}

interface BackendPayoutRow {
  period_start?: string | null;
  id: string;
  payout_date: string;
  recipient_name: string;
  recipient_type: string;
  category: string;
  amount: number | string;
  method: PayoutRecord["method"];
  source: string;
  notes: string | null;
  staff_member_id: string | null;
  staff_member: BackendPaymentRelationRow | BackendPaymentRelationRow[] | null;
}

interface BackendStaffTimeLogRow {
  payable_amount?: number | string | null;
  id: string;
  staff_member_id: string;
  work_date: string;
  start_time: string | null;
  end_time: string | null;
  hours_worked: number | string;
  entry_type: string;
  source: string;
  notes: string | null;
  staff_member: BackendPaymentRelationRow | BackendPaymentRelationRow[] | null;
}

interface BackendServicePriceVariantRow {
  id: string;
  service_id: string;
  variant_name: string;
  variant_code: string | null;
  price: number | string;
  duration_minutes: number;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
  notes: string | null;
  service: BackendPaymentRelationRow | BackendPaymentRelationRow[] | null;
}

interface BackendBusinessHourRow {
  id: string;
  day_of_week: number;
  label: string;
  open_time: string | null;
  close_time: string | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  is_open: boolean;
}

interface BackendBookingSettingsRow {
  id: string;
  slot_interval_minutes: number;
  lead_time_minutes: number;
  max_booking_days_in_advance: number;
  buffer_between_appointments_minutes: number;
}

interface BackendStaffWorkingHourRow {
  id: string;
  staff_member_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  is_active: boolean;
}

interface BackendStaffServiceAssignmentRow {
  id: string;
  staff_member_id: string;
  service_id: string;
}

interface BackendStaffCategoryRateRow {
  id: string;
  staff_member_id: string;
  service_category: ServiceRecord["category"];
  percentage: number | string;
}

const STAFF_SELECT_FIELDS =
  "id, full_name, role, email, phone, is_active, bio, join_date, employee_code, hourly_rate, rating, compensation_type";

function addDays(baseDate: Date, days: number) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function formatDateForSql(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function fetchStaffMembersForBusiness(
  backend: BackendClient,
  businessId: string,
) {
  const { data, error } = await backend
    .from("staff_members")
    .select(STAFF_SELECT_FIELDS)
    .eq("business_id", businessId)
    .order("display_order");
  return { data: data as BackendStaffRow[] | null, error };
}

function createDemoBundle(): BusinessDataBundle {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);

  const business: BusinessRecord = {
    id: "demo-business",
    name: "Natalia Sánchez Estética",
    slug: "natalia-sanchez-estetica",
    description: "Estética en modo demo hasta configurar el backend.",
    timeZone: "America/Argentina/Cordoba",
  };

  const services: ServiceRecord[] = [
    {
      id: "service-masaje",
      name: "Masaje descontracturante",
      description: "Sesión de bienestar para aliviar tensiones musculares.",
      durationMinutes: 45,
      price: 18000,
      isActive: true,
      category: "corte",
    },
    {
      id: "service-facial",
      name: "Tratamiento facial",
      description: "Cuidado facial personalizado según las necesidades de la piel.",
      durationMinutes: 30,
      price: 12000,
      isActive: true,
      category: "corte",
    },
    {
      id: "service-manicura",
      name: "Manicura",
      description: "Cuidado y presentación de uñas y manos.",
      durationMinutes: 60,
      price: 26000,
      isActive: true,
      category: "corte",
    },
  ];

  const staffMembers: StaffRecord[] = [
    {
      id: "staff-natalia",
      fullName: "Natalia Sánchez",
      role: "Especialista en estética",
      email: "natalia@demo.local",
      phone: "+54 362 400-0000",
      isActive: true,
      bio: "Especialista en estética y atención personalizada.",
      joinDate: "2021-01-01",
      employeeCode: "NAT",
      hourlyRate: 3500,
      rating: 4.9,
      compensationType: "hourly",
    },
  ];

  const appointments: AppointmentRecord[] = [
    {
      id: "apt-1",
      customerId: null,
      customerName: "Lucas Ferreyra",
      customerContact: "+54 362 455-0011",
      customerEmail: "lucas@email.com",
      appointmentDate: formatDateForSql(today),
      appointmentTime: "11:00:00",
      status: "confirmed",
      channel: "website",
      serviceId: services[0].id,
      serviceName: services[0].name,
      staffMemberId: staffMembers[0].id,
      staffName: staffMembers[0].fullName,
      price: services[0].price,
      durationMinutes: services[0].durationMinutes,
      notes: "Primer turno desde la web.",
      createdAt: new Date(today.getTime() - 1000 * 60 * 30).toISOString(),
      updatedAt: new Date(today.getTime() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "apt-2",
      customerId: null,
      customerName: "Bruno Sosa",
      customerContact: "@brunososa",
      customerEmail: null,
      appointmentDate: formatDateForSql(today),
      appointmentTime: "14:30:00",
      status: "pending",
      channel: "instagram",
      serviceId: services[1].id,
      serviceName: services[1].name,
      staffMemberId: staffMembers[0].id,
      staffName: staffMembers[0].fullName,
      price: services[1].price,
      durationMinutes: services[1].durationMinutes,
      notes: null,
      createdAt: new Date(today.getTime() - 1000 * 60 * 10).toISOString(),
      updatedAt: new Date(today.getTime() - 1000 * 60 * 10).toISOString(),
    },
    {
      id: "apt-3",
      customerId: null,
      customerName: "Matias Vera",
      customerContact: "+54 362 455-8899",
      customerEmail: null,
      appointmentDate: formatDateForSql(tomorrow),
      appointmentTime: "17:30:00",
      status: "confirmed",
      channel: "website",
      serviceId: services[2].id,
      serviceName: services[2].name,
      staffMemberId: staffMembers[0].id,
      staffName: staffMembers[0].fullName,
      price: services[2].price,
      durationMinutes: services[2].durationMinutes,
      notes: null,
      createdAt: new Date(today.getTime() - 1000 * 60 * 5).toISOString(),
      updatedAt: new Date(today.getTime() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: "apt-4",
      customerId: null,
      customerName: "Ivan Lezcano",
      customerContact: "+54 362 411-7722",
      customerEmail: "ivan@email.com",
      appointmentDate: formatDateForSql(dayAfterTomorrow),
      appointmentTime: "20:30:00",
      status: "pending",
      channel: "website",
      serviceId: services[0].id,
      serviceName: services[0].name,
      staffMemberId: staffMembers[0].id,
      staffName: staffMembers[0].fullName,
      price: services[0].price,
      durationMinutes: services[0].durationMinutes,
      notes: "Pidio confirmar por WhatsApp.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return {
    business,
    services,
    staffMembers,
    appointments,
    isLive: false,
  };
}

function createDemoOperationsBundle(): BusinessOperationsBundle {
  const demoBundle = createDemoBundle();
  const customers: CustomerRecord[] = [
    {
      id: "customer-lucas",
      fullName: "Lucas Ferreyra",
      primaryContact: "+54 362 455-0011",
      email: "lucas@email.com",
      phone: "+54 362 455-0011",
      instagramHandle: null,
      address: null,
      status: "active",
      preferredServices: ["Masaje descontracturante"],
      notes: "Cliente demo generado para el backoffice.",
      rating: 5,
      marketingOptIn: false,
      lastVisitAt: demoBundle.appointments[0]?.appointmentDate ?? null,
      totalAppointments: 1,
      totalSpent: 18000,
      joinedAt:
        demoBundle.appointments[0]?.createdAt ?? new Date().toISOString(),
    },
    {
      id: "customer-bruno",
      fullName: "Bruno Sosa",
      primaryContact: "@brunososa",
      email: null,
      phone: null,
      instagramHandle: "@brunososa",
      address: null,
      status: "lead",
      preferredServices: ["Tratamiento facial"],
      notes: "Consulta habitual por Instagram.",
      rating: 4.5,
      marketingOptIn: true,
      lastVisitAt: null,
      totalAppointments: 0,
      totalSpent: 0,
      joinedAt: new Date().toISOString(),
    },
  ];

  const payments: PaymentRecord[] = [
    {
      id: "payment-demo-1",
      description: "Seña web - Masaje descontracturante",
      amount: 18000,
      method: "transfer",
      status: "completed",
      customerId: customers[0].id,
      customerName: customers[0].fullName,
      staffMemberId: demoBundle.staffMembers[0]?.id ?? null,
      staffName: demoBundle.staffMembers[0]?.fullName ?? null,
      invoiceId: null,
      invoiceNumber: null,
      transactionId: "DEMO-TRX-001",
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      notes: "Pago demo asociado a una reserva confirmada.",
    },
  ];

  const expenses: ExpenseRecord[] = [
    {
      id: "expense-demo-1",
      expenseDate: new Date().toISOString().slice(0, 10),
      category: "Insumos",
      subcategory: "Estética",
      description: "Reposición de hojas y productos básicos.",
      vendorName: "Proveedor demo",
      amount: 22000,
      method: "cash",
      source: "manual",
      notes: null,
    },
  ];

  const payouts: PayoutRecord[] = [
    {
      id: "payout-demo-1",
      payoutDate: new Date().toISOString().slice(0, 10),
      recipientName: "Natalia Sánchez",
      recipientType: "staff",
      category: "honorarios",
      staffMemberId: demoBundle.staffMembers[0]?.id ?? null,
      staffName: demoBundle.staffMembers[0]?.fullName ?? null,
      amount: 35000,
      method: "transfer",
      source: "manual",
      notes: "Cierre demo del módulo de distribuciones.",
    },
  ];

  const staffTimeLogs: StaffTimeLogRecord[] = [
    {
      id: "time-log-demo-1",
      staffMemberId: demoBundle.staffMembers[0]?.id ?? "staff-natalia",
      staffName: demoBundle.staffMembers[0]?.fullName ?? "Natalia Sánchez",
      workDate: new Date().toISOString().slice(0, 10),
      startTime: "11:00:00",
      endTime: "19:30:00",
      hoursWorked: 8.5,
      entryType: "shift",
      source: "manual",
      notes: "Jornada demo.",
    },
  ];

  const servicePriceVariants: ServicePriceVariantRecord[] =
    demoBundle.services.map((service) => ({
      id: `variant-${service.id}`,
      serviceId: service.id,
      serviceName: service.name,
      variantName: "Base",
      variantCode: "base",
      price: service.price,
      durationMinutes: service.durationMinutes,
      isDefault: true,
      isActive: service.isActive,
      displayOrder: 1,
      notes: "Variante demo construida desde el servicio base.",
    }));

  return {
    business: demoBundle.business,
    staffMembers: demoBundle.staffMembers,
    customers,
    payments,
    expenses,
    payouts,
    staffTimeLogs,
    servicePriceVariants,
    isLive: false,
  };
}

function createDemoScheduleBundle(): BusinessScheduleBundle {
  const demoBundle = createDemoBundle();

  return {
    business: demoBundle.business,
    businessHours: createDefaultBusinessHours(),
    bookingSettings: createDefaultBookingSettings(),
    isLive: false,
  };
}

function createDemoAgendaBundle(): BusinessAgendaBundle {
  const teamBundle = createDemoTeamBundle();
  const scheduleBundle = createDemoScheduleBundle();
  const operationsBundle = createDemoOperationsBundle();

  return {
    workRecords: operationsBundle.workRecords ?? [],
    business: teamBundle.business,
    services: teamBundle.services,
    staffMembers: teamBundle.staffMembers,
    appointments: teamBundle.appointments,
    customers: operationsBundle.customers,
    businessHours: scheduleBundle.businessHours,
    bookingSettings: scheduleBundle.bookingSettings,
    staffWorkingHours: teamBundle.staffWorkingHours,
    staffServiceAssignments: teamBundle.staffServiceAssignments,
    isLive: false,
  };
}

function createDemoTeamBundle(): BusinessTeamBundle {
  const demoBundle = createDemoBundle();
  const staffTimeLogs: StaffTimeLogRecord[] = [
    {
      id: "team-time-log-demo-1",
      staffMemberId: demoBundle.staffMembers[0]?.id ?? "staff-natalia",
      staffName: demoBundle.staffMembers[0]?.fullName ?? "Natalia Sánchez",
      workDate: new Date().toISOString().slice(0, 10),
      startTime: "11:00:00",
      endTime: "19:00:00",
      hoursWorked: 8,
      entryType: "shift",
      source: "manual",
      notes: "Jornada demo del módulo de empleados.",
    },
  ];

  const staffWorkingHours: StaffWorkingHourRecord[] =
    createDefaultBusinessHours().map((day) => ({
      id: `team-hour-${day.dayOfWeek}`,
      staffMemberId: demoBundle.staffMembers[0]?.id ?? "staff-natalia",
      dayOfWeek: day.dayOfWeek,
      startTime: day.openTime,
      endTime: day.closeTime,
      breakStartTime: day.breakStartTime,
      breakEndTime: day.breakEndTime,
      isActive: day.isOpen,
    }));

  const staffServiceAssignments: StaffServiceAssignmentRecord[] =
    demoBundle.services.map((service) => ({
      id: `team-assignment-${service.id}`,
      staffMemberId: demoBundle.staffMembers[0]?.id ?? "staff-natalia",
      serviceId: service.id,
    }));

  const defaultRates = createDefaultCategoryRateMap();
  defaultRates.corte = 40;

  const staffCategoryRates: StaffCategoryRateRecord[] = (
    ["corte", "coloraciones", "tratamiento"] as const
  ).map((category) => ({
    id: `team-rate-${category}`,
    staffMemberId: demoBundle.staffMembers[0]?.id ?? "staff-natalia",
    category,
    percentage: defaultRates[category],
  }));

  return {
    business: demoBundle.business,
    services: demoBundle.services,
    staffMembers: demoBundle.staffMembers,
    appointments: demoBundle.appointments,
    staffTimeLogs,
    staffWorkingHours,
    staffCategoryRates,
    staffServiceAssignments,
    isLive: false,
  };
}

function pickSingleRelation<T>(value: T | T[] | null) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapBusiness(row: BackendBusinessRow): BusinessRecord {
  return {
    monthlyCollectionTarget: Number(row.monthly_collection_target || 0),
    id: row.id,
    name: row.website_content?.identity?.name || row.name,
    slug: row.slug,
    description: row.description,
    timeZone: row.time_zone ?? "America/Argentina/Cordoba",
  };
}

function mapService(row: BackendServiceRow): ServiceRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes || 0,
    bookingEnabled: row.booking_enabled !== false,
    price: Number(row.price),
    isActive: row.is_active,
    category: row.category,
  };
}

function mapStaff(row: BackendStaffRow): StaffRecord {
  return {
    collectionCommissionRate: Number(row.collection_commission_rate || 0),
    payrollCadence: row.payroll_cadence || "semimonthly",
    payrollWeekday: row.payroll_weekday ?? 0,
    payrollCutoffFirst: row.payroll_cutoff_first ?? 15,
    payrollCutoffSecond: row.payroll_cutoff_second ?? 31,
    payrollPayDelay: row.payroll_pay_delay ?? 0,
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    isActive: row.is_active,
    bio: row.bio ?? null,
    joinDate: row.join_date ?? null,
    employeeCode: row.employee_code ?? null,
    hourlyRate: Number(row.hourly_rate ?? 0),
    rating: row.rating == null ? undefined : Number(row.rating),
    compensationType: row.payroll_mode
      ? row.payroll_mode === "hourly"
        ? "hourly"
        : "category_percentage"
      : Number(row.collection_commission_rate || 0) > 0
        ? "category_percentage"
        : (row.compensation_type ?? "hourly"),
  };
}

function mapAppointment(row: BackendAppointmentRow): AppointmentRecord {
  return {
    arrivedAt: row.arrived_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    id: row.id,
    customerId: row.customer_id ?? null,
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
    internalNotes: row.internal_notes ?? null,
    cancellationReason: row.cancellation_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}

function mapCustomer(row: BackendCustomerRow): CustomerRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    primaryContact: row.primary_contact,
    email: row.email,
    phone: row.phone,
    instagramHandle: row.instagram_handle,
    address: row.address,
    status: row.status,
    preferredServices: row.preferred_services ?? [],
    notes: row.notes,
    rating: row.rating == null ? null : Number(row.rating),
    marketingOptIn: row.marketing_opt_in,
    lastVisitAt: row.last_visit_at,
    totalAppointments: row.total_appointments,
    totalSpent: Number(row.total_spent),
    joinedAt: row.joined_at,
  };
}

function relatedPaymentCustomerName(row: BackendPaymentRow) {
  return (
    [
      pickSingleRelation(row.customer)?.full_name,
      pickSingleRelation(row.work_record)?.customer_name,
      pickSingleRelation(row.appointment)?.customer_name,
    ]
      .find((name) => typeof name === "string" && name.trim())
      ?.trim() ?? null
  );
}

function legacyPaymentSourceKey(reference?: string | null) {
  return reference &&
    /^\d+:planilla-barberia:(BASE_DATOS|DIA):[1-9]\d*:payment$/.test(reference)
    ? reference.slice(0, -":payment".length)
    : null;
}

function mapPayment(
  row: BackendPaymentRow,
  legacyCustomerNames: Map<string, string>,
): PaymentRecord {
  const staffMember = pickSingleRelation(row.staff_member);
  const invoice = pickSingleRelation(row.invoice);

  return {
    collectionDate: row.collection_date ?? null,
    workRecordId: row.work_record_id ?? null,
    importRef: row.import_ref ? "registered" : null,
    appointmentId: row.appointment_id ?? null,
    commissionRate:
      row.commission_rate == null ? null : Number(row.commission_rate),
    commissionAmount:
      row.commission_amount == null ? null : Number(row.commission_amount),
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    customerId: row.customer_id,
    customerName:
      relatedPaymentCustomerName(row) ??
      legacyCustomerNames.get(legacyPaymentSourceKey(row.import_ref) ?? "") ??
      null,
    staffMemberId: row.staff_member_id,
    staffName:
      typeof staffMember?.full_name === "string" ? staffMember.full_name : null,
    invoiceId: row.invoice_id,
    invoiceNumber: typeof invoice?.number === "string" ? invoice.number : null,
    transactionId: row.transaction_id,
    processedAt: row.processed_at,
    createdAt: row.created_at,
    notes: managementNotes(row.notes, row.import_ref),
  };
}

function mapExpense(row: BackendExpenseRow): ExpenseRecord {
  return {
    importRef:
      row.import_ref || row.source === "Gasto programado" ? "registered" : null,
    id: row.id,
    expenseDate: row.expense_date,
    category:
      row.category === "Gastos de planilla" ? "Gastos generales" : row.category,
    subcategory: row.subcategory,
    description: row.description,
    vendorName: row.vendor_name,
    amount: Number(row.amount),
    method: row.method,
    source: row.import_ref ? "Registro del negocio" : row.source,
    notes: managementNotes(row.notes, row.import_ref),
  };
}

function mapPayout(row: BackendPayoutRow): PayoutRecord {
  const staffMember = pickSingleRelation(row.staff_member);

  return {
    payrollManaged: Boolean(row.period_start),
    id: row.id,
    payoutDate: row.payout_date,
    recipientName: row.recipient_name,
    recipientType: row.recipient_type,
    category: row.category,
    staffMemberId: row.staff_member_id,
    staffName:
      typeof staffMember?.full_name === "string" ? staffMember.full_name : null,
    amount: Number(row.amount),
    method: row.method,
    source: row.source,
    notes: row.notes,
  };
}

function mapStaffTimeLog(row: BackendStaffTimeLogRow): StaffTimeLogRecord {
  const staffMember = pickSingleRelation(row.staff_member);

  return {
    id: row.id,
    staffMemberId: row.staff_member_id,
    staffName:
      typeof staffMember?.full_name === "string" ? staffMember.full_name : null,
    workDate: row.work_date,
    startTime: row.start_time,
    endTime: row.end_time,
    hoursWorked: Number(row.hours_worked),
    payableAmount:
      row.payable_amount == null ? null : Number(row.payable_amount),
    entryType: row.entry_type,
    source: row.source,
    notes: row.notes,
  };
}

function mapServicePriceVariant(
  row: BackendServicePriceVariantRow,
): ServicePriceVariantRecord {
  const service = pickSingleRelation(row.service);

  return {
    id: row.id,
    serviceId: row.service_id,
    serviceName: typeof service?.name === "string" ? service.name : null,
    variantName: row.variant_name,
    variantCode: row.variant_code,
    price: Number(row.price),
    durationMinutes: row.duration_minutes,
    isDefault: row.is_default,
    isActive: row.is_active,
    displayOrder: row.display_order,
    notes: row.notes,
  };
}

function mapBusinessHour(row: BackendBusinessHourRow): BusinessHourRecord {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    label: row.label || getBusinessDayLabel(row.day_of_week),
    openTime: row.open_time,
    closeTime: row.close_time,
    breakStartTime: row.break_start_time ?? null,
    breakEndTime: row.break_end_time ?? null,
    isOpen: row.is_open,
  };
}

function mapBookingSettings(
  row: BackendBookingSettingsRow,
): BookingSettingsRecord {
  return {
    id: row.id,
    slotIntervalMinutes: row.slot_interval_minutes,
    leadTimeMinutes: row.lead_time_minutes,
    maxBookingDaysInAdvance: row.max_booking_days_in_advance,
    bufferBetweenAppointmentsMinutes: row.buffer_between_appointments_minutes,
  };
}

function mapStaffWorkingHour(
  row: BackendStaffWorkingHourRow,
): StaffWorkingHourRecord {
  return {
    id: row.id,
    staffMemberId: row.staff_member_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    breakStartTime: row.break_start_time ?? null,
    breakEndTime: row.break_end_time ?? null,
    isActive: row.is_active,
  };
}

function mapStaffServiceAssignment(
  row: BackendStaffServiceAssignmentRow,
): StaffServiceAssignmentRecord {
  return {
    id: row.id,
    staffMemberId: row.staff_member_id,
    serviceId: row.service_id,
  };
}

function mapStaffCategoryRate(
  row: BackendStaffCategoryRateRow,
): StaffCategoryRateRecord {
  return {
    id: row.id,
    staffMemberId: row.staff_member_id,
    category: row.service_category ?? "corte",
    percentage: Number(row.percentage),
  };
}

function mergeBusinessHours(rows: BusinessHourRecord[]) {
  const defaults = createDefaultBusinessHours();
  const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]));

  return defaults.map(
    (defaultRow) => byDay.get(defaultRow.dayOfWeek) ?? defaultRow,
  );
}

export async function getBusinessDataBundle(): Promise<BusinessDataBundle> {
  const businessSlug = process.env.BUSINESS_SLUG;

  if (!businessSlug || !hasBackendAdminConfig()) {
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }

  const backend = createBackendAdminClient();

  if (!backend) {
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }

  try {
    const { data: business, error: businessError } = await backend
      .from("businesses")
      .select("id, name, slug, description, time_zone")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (businessError || !business) {
      console.error("Backend business lookup failed", businessError);
      if (
        process.env.DEMO_MODE === "true" &&
        process.env.NODE_ENV !== "production"
      )
        return createDemoBundle();
      throw new Error("No se pudo cargar el negocio desde Strapi.");
    }

    const [
      { data: services, error: servicesError },
      { data: staffMembers, error: staffError },
      { data: appointments, error: appointmentsError },
    ] = await Promise.all([
      backend
        .from("services")
        .select(
          "id, name, description, duration_minutes, price, is_active, category",
        )
        .eq("business_id", business.id)
        .order("display_order", { ascending: true }),
      fetchStaffMembersForBusiness(backend, business.id),
      backend
        .from("appointments")
        .select(
          "id, customer_id, customer_name, customer_contact, customer_email, appointment_date, appointment_time, status, channel, service_id, service_name_snapshot, staff_member_id, staff_name_snapshot, price_snapshot, duration_snapshot, notes, internal_notes, cancellation_reason, created_at, updated_at",
        )
        .eq("business_id", business.id)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true }),
    ]);

    if (servicesError || staffError || appointmentsError) {
      console.error("Backend bundle lookup failed", {
        servicesError,
        staffError,
        appointmentsError,
      });
      if (
        process.env.DEMO_MODE === "true" &&
        process.env.NODE_ENV !== "production"
      )
        return createDemoBundle();
      throw new Error("No se pudo cargar el negocio desde Strapi.");
    }

    return {
      business: mapBusiness(business as BackendBusinessRow),
      services: (services as BackendServiceRow[] | null)?.map(mapService) ?? [],
      staffMembers:
        (staffMembers as BackendStaffRow[] | null)?.map(mapStaff) ?? [],
      appointments:
        (appointments as BackendAppointmentRow[] | null)?.map(mapAppointment) ??
        [],
      isLive: true,
    };
  } catch (error) {
    console.error("Backend bundle lookup crashed", error);
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }
}

export async function getBusinessOperationsBundle(): Promise<BusinessOperationsBundle> {
  const businessSlug = process.env.BUSINESS_SLUG;

  if (!businessSlug || !hasBackendAdminConfig()) {
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoOperationsBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }

  const backend = createBackendAdminClient();

  if (!backend) {
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoOperationsBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }

  try {
    const { data: business, error: businessError } = await backend
      .from("businesses")
      .select("id, name, slug, description, time_zone")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (businessError || !business) {
      console.error(
        "Backend business lookup for operations failed",
        businessError,
      );
      if (
        process.env.DEMO_MODE === "true" &&
        process.env.NODE_ENV !== "production"
      )
        return createDemoOperationsBundle();
      throw new Error("No se pudo cargar el negocio desde Strapi.");
    }

    const [
      { data: staffMembers, error: staffMembersError },
      { data: customers, error: customersError },
      { data: payments, error: paymentsError },
      { data: expenses, error: expensesError },
      { data: payouts, error: payoutsError },
      { data: staffTimeLogs, error: staffTimeLogsError },
      { data: services, error: servicesError },
    ] = await Promise.all([
      fetchStaffMembersForBusiness(backend, business.id),
      backend
        .from("customers")
        .select(
          "id, full_name, primary_contact, email, phone, instagram_handle, address, status, preferred_services, notes, rating, marketing_opt_in, last_visit_at, total_appointments, total_spent, joined_at",
        )
        .eq("business_id", business.id)
        .order("total_spent", { ascending: false }),
      backend
        .from("payments")
        .select(
          "id, description, amount, method, status, customer_id, invoice_id, staff_member_id, transaction_id, processed_at, created_at, notes, customer:customers(full_name), staff_member:staff_members(full_name), invoice:invoices(number)",
        )
        .eq("business_id", business.id)
        .order("created_at", { ascending: false }),
      backend
        .from("expenses")
        .select(
          "id, expense_date, category, subcategory, description, vendor_name, amount, method, source, notes",
        )
        .eq("business_id", business.id)
        .order("expense_date", { ascending: false }),
      backend
        .from("payouts")
        .select(
          "id, payout_date, recipient_name, recipient_type, category, amount, method, source, notes, staff_member_id, staff_member:staff_members(full_name)",
        )
        .eq("business_id", business.id)
        .order("payout_date", { ascending: false }),
      backend
        .from("staff_time_logs")
        .select(
          "id, staff_member_id, work_date, start_time, end_time, hours_worked, entry_type, source, notes, staff_member:staff_members(full_name)",
        )
        .eq("business_id", business.id)
        .order("work_date", { ascending: false }),
      backend
        .from("services")
        .select("id, name")
        .eq("business_id", business.id)
        .order("display_order", { ascending: true }),
    ]);

    if (
      staffMembersError ||
      customersError ||
      paymentsError ||
      expensesError ||
      payoutsError ||
      staffTimeLogsError ||
      servicesError
    ) {
      console.error("Backend operations lookup failed", {
        staffMembersError,
        customersError,
        paymentsError,
        expensesError,
        payoutsError,
        staffTimeLogsError,
        servicesError,
      });
      if (
        process.env.DEMO_MODE === "true" &&
        process.env.NODE_ENV !== "production"
      )
        return createDemoOperationsBundle();
      throw new Error("No se pudo cargar el negocio desde Strapi.");
    }

    const serviceIds = (services ?? []).map((service) => service.id);
    let servicePriceVariants: BackendServicePriceVariantRow[] | null = [];

    if (serviceIds.length > 0) {
      const { data: variants, error: variantsError } = await backend
        .from("service_price_variants")
        .select(
          "id, service_id, variant_name, variant_code, price, duration_minutes, is_default, is_active, display_order, notes, service:services(name)",
        )
        .in("service_id", serviceIds)
        .order("display_order", { ascending: true });

      if (variantsError) {
        console.error(
          "Backend service price variants lookup failed",
          variantsError,
        );
        if (
          process.env.DEMO_MODE === "true" &&
          process.env.NODE_ENV !== "production"
        )
          return createDemoOperationsBundle();
        throw new Error("No se pudo cargar el negocio desde Strapi.");
      }

      servicePriceVariants = variants as BackendServicePriceVariantRow[] | null;
    }

    const workResult = await backend.from("work_records").select();
    if (workResult.error)
      throw new Error("No se pudo cargar la planilla histórica.");
    const paymentRows = (payments ?? []) as BackendPaymentRow[];
    // Some historical collections have no work record (the service was blank).
    // Resolve those customers from the exact source row, never from free-text
    // descriptions or a guessed customer association. Keep source data server-side.
    const legacySourceKeys = [
      ...new Set(
        paymentRows
          .filter((row) => !relatedPaymentCustomerName(row))
          .map((row) => legacyPaymentSourceKey(row.import_ref))
          .filter((key): key is string => key !== null),
      ),
    ];
    const legacyCustomerNames = new Map<string, string>();
    for (let offset = 0; offset < legacySourceKeys.length; offset += 1000) {
      const { data: sourceRows, error } = await backend
        .from("import_rows")
        .select("source_key, source_data")
        .eq("business_id", business.id)
        .in("source_key", legacySourceKeys.slice(offset, offset + 1000));
      if (error)
        throw new Error(
          "No se pudieron cargar los clientes de los cobros históricos.",
        );
      for (const source of sourceRows ?? []) {
        const name = source.source_data?.B;
        if (typeof name === "string" && name.trim())
          legacyCustomerNames.set(source.source_key, name.trim());
      }
    }
    return {
      workRecords: (workResult.data || []).map((r) => ({
        id: r.id,
        workDate: r.work_date,
        customerId: r.customer_id,
        customerName: r.customer_name,
        serviceId: r.service_id,
        serviceName: r.service_name,
        staffMemberId: r.staff_member_id,
        staffName: r.staff_name,
        amount: Number(r.amount),
        notes: r.notes,
        sourceRef: null,
        collectionVerified: !!r.collection_verified,
      })),
      business: mapBusiness(business as BackendBusinessRow),
      staffMembers:
        (staffMembers as BackendStaffRow[] | null)?.map(mapStaff) ?? [],
      customers:
        (customers as BackendCustomerRow[] | null)?.map(mapCustomer) ?? [],
      payments: paymentRows.map((row) => mapPayment(row, legacyCustomerNames)),
      expenses: (expenses as BackendExpenseRow[] | null)?.map(mapExpense) ?? [],
      payouts: (payouts as BackendPayoutRow[] | null)?.map(mapPayout) ?? [],
      staffTimeLogs:
        (staffTimeLogs as BackendStaffTimeLogRow[] | null)?.map(
          mapStaffTimeLog,
        ) ?? [],
      servicePriceVariants: (servicePriceVariants ?? []).map(
        mapServicePriceVariant,
      ),
      isLive: true,
    };
  } catch (error) {
    console.error("Backend operations lookup crashed", error);
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoOperationsBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }
}

export async function getBusinessScheduleBundle(): Promise<BusinessScheduleBundle> {
  const businessSlug = process.env.BUSINESS_SLUG;

  if (!businessSlug || !hasBackendAdminConfig()) {
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoScheduleBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }

  const backend = createBackendAdminClient();

  if (!backend) {
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoScheduleBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }

  try {
    const { data: business, error: businessError } = await backend
      .from("businesses")
      .select("id, name, slug, description, time_zone")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (businessError || !business) {
      console.error(
        "Backend business lookup for schedule failed",
        businessError,
      );
      if (
        process.env.DEMO_MODE === "true" &&
        process.env.NODE_ENV !== "production"
      )
        return createDemoScheduleBundle();
      throw new Error("No se pudo cargar el negocio desde Strapi.");
    }

    const [
      businessHoursResult,
      { data: bookingSettings, error: bookingSettingsError },
    ] = await Promise.all([
      fetchBusinessHoursRows(backend, business.id),
      backend
        .from("booking_settings")
        .select(
          "id, slot_interval_minutes, lead_time_minutes, max_booking_days_in_advance, buffer_between_appointments_minutes",
        )
        .eq("business_id", business.id)
        .maybeSingle(),
    ]);
    const businessHoursError = businessHoursResult.error;

    if (businessHoursError || bookingSettingsError) {
      console.error("Backend schedule lookup failed", {
        businessHoursError,
        bookingSettingsError,
      });
      if (
        process.env.DEMO_MODE === "true" &&
        process.env.NODE_ENV !== "production"
      )
        return createDemoScheduleBundle();
      throw new Error("No se pudo cargar el negocio desde Strapi.");
    }

    if (!businessHoursResult.hasBreakColumns) {
      console.warn(
        "Backend business_hours table is missing lunch break columns. Falling back to schedules without breaks.",
      );
    }

    return {
      business: mapBusiness(business as BackendBusinessRow),
      businessHours: mergeBusinessHours(
        (businessHoursResult.data ?? []).map(mapBusinessHour),
      ),
      bookingSettings: bookingSettings
        ? mapBookingSettings(bookingSettings as BackendBookingSettingsRow)
        : createDefaultBookingSettings(),
      isLive: true,
    };
  } catch (error) {
    console.error("Backend schedule lookup crashed", error);
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoScheduleBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }
}

export async function getBusinessAgendaBundle(): Promise<BusinessAgendaBundle> {
  const businessSlug = process.env.BUSINESS_SLUG;

  if (!businessSlug || !hasBackendAdminConfig()) {
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoAgendaBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }

  const backend = createBackendAdminClient();

  if (!backend) {
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoAgendaBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }

  try {
    const { data: business, error: businessError } = await backend
      .from("businesses")
      .select("id, name, slug, description, time_zone")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (businessError || !business) {
      console.error("Backend business lookup for agenda failed", businessError);
      if (
        process.env.DEMO_MODE === "true" &&
        process.env.NODE_ENV !== "production"
      )
        return createDemoAgendaBundle();
      throw new Error("No se pudo cargar el negocio desde Strapi.");
    }

    const [
      { data: services, error: servicesError },
      { data: staffMembers, error: staffError },
      { data: appointments, error: appointmentsError },
      { data: customers, error: customersError },
      businessHoursResult,
      { data: bookingSettings, error: bookingSettingsError },
      staffWorkingHoursResult,
      { data: staffServiceAssignments, error: staffServiceAssignmentsError },
      { data: workRecords, error: workRecordsError },
    ] = await Promise.all([
      backend
        .from("services")
        .select(
          "id, name, description, duration_minutes, price, is_active, category",
        )
        .eq("business_id", business.id)
        .order("display_order", { ascending: true }),
      fetchStaffMembersForBusiness(backend, business.id),
      backend
        .from("appointments")
        .select(
          "id, customer_id, customer_name, customer_contact, customer_email, appointment_date, appointment_time, status, channel, service_id, service_name_snapshot, staff_member_id, staff_name_snapshot, price_snapshot, duration_snapshot, notes, internal_notes, cancellation_reason, created_at, updated_at",
        )
        .eq("business_id", business.id)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true }),
      backend
        .from("customers")
        .select(
          "id, full_name, primary_contact, email, phone, instagram_handle, address, status, preferred_services, notes, rating, marketing_opt_in, last_visit_at, total_appointments, total_spent, joined_at",
        )
        .eq("business_id", business.id)
        .order("full_name", { ascending: true }),
      fetchBusinessHoursRows(backend, business.id),
      backend
        .from("booking_settings")
        .select(
          "id, slot_interval_minutes, lead_time_minutes, max_booking_days_in_advance, buffer_between_appointments_minutes",
        )
        .eq("business_id", business.id)
        .maybeSingle(),
      fetchStaffWorkingHoursRows(backend),
      backend
        .from("staff_member_services")
        .select("id, staff_member_id, service_id"),
      backend
        .from("work_records")
        .select()
        .eq("business_id", business.id)
        .order("work_date", { ascending: true })
        .order("id", { ascending: true }),
    ]);
    const businessHoursError = businessHoursResult.error;
    const staffWorkingHoursError = staffWorkingHoursResult.error;

    if (
      servicesError ||
      staffError ||
      appointmentsError ||
      customersError ||
      businessHoursError ||
      staffWorkingHoursError ||
      staffServiceAssignmentsError ||
      workRecordsError ||
      bookingSettingsError
    ) {
      console.error("Backend agenda lookup failed", {
        servicesError,
        staffError,
        appointmentsError,
        customersError,
        businessHoursError,
        staffWorkingHoursError,
        staffServiceAssignmentsError,
        workRecordsError,
        bookingSettingsError,
      });
      if (
        process.env.DEMO_MODE === "true" &&
        process.env.NODE_ENV !== "production"
      )
        return createDemoAgendaBundle();
      throw new Error("No se pudo cargar el negocio desde Strapi.");
    }

    if (!businessHoursResult.hasBreakColumns) {
      console.warn(
        "Backend business_hours table is missing lunch break columns. Falling back to schedules without breaks.",
      );
    }

    if (!staffWorkingHoursResult.hasBreakColumns) {
      console.warn(
        "Backend staff_member_working_hours table is missing lunch break columns. Falling back to schedules without breaks.",
      );
    }

    const staffIds = new Set(
      (staffMembers as BackendStaffRow[] | null)?.map(
        (staffMember) => staffMember.id,
      ) ?? [],
    );

    return {
      workRecords: (workRecords ?? []).map((row) => ({
        id: row.id,
        workDate: row.work_date,
        customerId: row.customer_id,
        customerName: row.customer_name,
        serviceId: row.service_id,
        serviceName: row.service_name,
        staffMemberId: row.staff_member_id,
        staffName: row.staff_name,
        amount: Number(row.amount),
        notes: row.notes,
        sourceRef: null,
        collectionVerified: Boolean(row.collection_verified),
      })),
      business: mapBusiness(business as BackendBusinessRow),
      services: (services as BackendServiceRow[] | null)?.map(mapService) ?? [],
      staffMembers:
        (staffMembers as BackendStaffRow[] | null)?.map(mapStaff) ?? [],
      appointments:
        (appointments as BackendAppointmentRow[] | null)?.map(mapAppointment) ??
        [],
      customers:
        (customers as BackendCustomerRow[] | null)?.map(mapCustomer) ?? [],
      businessHours: mergeBusinessHours(
        (businessHoursResult.data ?? []).map(mapBusinessHour),
      ),
      bookingSettings: bookingSettings
        ? mapBookingSettings(bookingSettings as BackendBookingSettingsRow)
        : createDefaultBookingSettings(),
      staffWorkingHours:
        (staffWorkingHoursResult.data ?? [])
          .filter((workingHour) => staffIds.has(workingHour.staff_member_id))
          .map(mapStaffWorkingHour) ?? [],
      staffServiceAssignments:
        (
          staffServiceAssignments as
            | {
                id: string;
                staff_member_id: string;
                service_id: string;
              }[]
            | null
        )
          ?.filter((assignment) => staffIds.has(assignment.staff_member_id))
          .map((assignment) => ({
            id: assignment.id,
            staffMemberId: assignment.staff_member_id,
            serviceId: assignment.service_id,
          })) ?? [],
      isLive: true,
    };
  } catch (error) {
    console.error("Backend agenda lookup crashed", error);
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoAgendaBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }
}

export async function getBusinessTeamBundle(): Promise<BusinessTeamBundle> {
  const businessSlug = process.env.BUSINESS_SLUG;

  if (!businessSlug || !hasBackendAdminConfig()) {
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoTeamBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }

  const backend = createBackendAdminClient();

  if (!backend) {
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoTeamBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }

  try {
    const { data: business, error: businessError } = await backend
      .from("businesses")
      .select("id, name, slug, description, time_zone")
      .eq("slug", businessSlug)
      .maybeSingle();

    if (businessError || !business) {
      console.error("Backend business lookup for team failed", businessError);
      if (
        process.env.DEMO_MODE === "true" &&
        process.env.NODE_ENV !== "production"
      )
        return createDemoTeamBundle();
      throw new Error("No se pudo cargar el negocio desde Strapi.");
    }

    const [
      { data: services, error: servicesError },
      { data: staffMembers, error: staffError },
      { data: appointments, error: appointmentsError },
      { data: staffTimeLogs, error: staffTimeLogsError },
      staffWorkingHoursResult,
      { data: staffServiceAssignments, error: staffServiceAssignmentsError },
      { data: staffCategoryRates, error: staffCategoryRatesError },
    ] = await Promise.all([
      backend
        .from("services")
        .select(
          "id, name, description, duration_minutes, price, is_active, category",
        )
        .eq("business_id", business.id)
        .order("display_order", { ascending: true }),
      fetchStaffMembersForBusiness(backend, business.id),
      backend
        .from("appointments")
        .select(
          "id, customer_id, customer_name, customer_contact, customer_email, appointment_date, appointment_time, status, channel, service_id, service_name_snapshot, staff_member_id, staff_name_snapshot, price_snapshot, duration_snapshot, notes, internal_notes, cancellation_reason, created_at, updated_at",
        )
        .eq("business_id", business.id)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true }),
      backend
        .from("staff_time_logs")
        .select(
          "id, staff_member_id, work_date, start_time, end_time, hours_worked, entry_type, source, notes, staff_member:staff_members(full_name)",
        )
        .eq("business_id", business.id)
        .order("work_date", { ascending: false }),
      fetchStaffWorkingHoursRows(backend),
      backend
        .from("staff_member_services")
        .select("id, staff_member_id, service_id"),
      backend
        .from("staff_member_category_rates")
        .select("id, staff_member_id, service_category, percentage"),
    ]);

    const staffWorkingHoursError = staffWorkingHoursResult.error;

    if (
      servicesError ||
      staffError ||
      appointmentsError ||
      staffTimeLogsError ||
      staffWorkingHoursError ||
      staffServiceAssignmentsError ||
      staffCategoryRatesError
    ) {
      console.error("Backend team lookup failed", {
        servicesError,
        staffError,
        appointmentsError,
        staffTimeLogsError,
        staffWorkingHoursError,
        staffServiceAssignmentsError,
        staffCategoryRatesError,
      });
      if (
        process.env.DEMO_MODE === "true" &&
        process.env.NODE_ENV !== "production"
      )
        return createDemoTeamBundle();
      throw new Error("No se pudo cargar el negocio desde Strapi.");
    }

    if (!staffWorkingHoursResult.hasBreakColumns) {
      console.warn(
        "Backend staff_member_working_hours table is missing lunch break columns. Falling back to schedules without breaks.",
      );
    }

    const staffIds = new Set(
      (staffMembers as BackendStaffRow[] | null)?.map(
        (staffMember) => staffMember.id,
      ) ?? [],
    );

    return {
      business: mapBusiness(business as BackendBusinessRow),
      services: (services as BackendServiceRow[] | null)?.map(mapService) ?? [],
      staffMembers:
        (staffMembers as BackendStaffRow[] | null)?.map(mapStaff) ?? [],
      appointments:
        (appointments as BackendAppointmentRow[] | null)?.map(mapAppointment) ??
        [],
      staffTimeLogs:
        (staffTimeLogs as BackendStaffTimeLogRow[] | null)?.map(
          mapStaffTimeLog,
        ) ?? [],
      staffWorkingHours:
        (staffWorkingHoursResult.data ?? [])
          ?.filter((workingHour) => staffIds.has(workingHour.staff_member_id))
          .map(mapStaffWorkingHour) ?? [],
      staffServiceAssignments:
        (staffServiceAssignments as BackendStaffServiceAssignmentRow[] | null)
          ?.filter((assignment) => staffIds.has(assignment.staff_member_id))
          .map(mapStaffServiceAssignment) ?? [],
      staffCategoryRates:
        (staffCategoryRates as BackendStaffCategoryRateRow[] | null)
          ?.filter((rate) => staffIds.has(rate.staff_member_id))
          .map(mapStaffCategoryRate) ?? [],
      isLive: true,
    };
  } catch (error) {
    console.error("Backend team lookup crashed", error);
    if (
      process.env.DEMO_MODE === "true" &&
      process.env.NODE_ENV !== "production"
    )
      return createDemoTeamBundle();
    throw new Error("No se pudo cargar el negocio desde Strapi.");
  }
}

