export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";
export type BookingChannel = "website" | "whatsapp" | "instagram" | "manual";
export type CustomerStatus = "active" | "inactive" | "vip" | "lead";
export type PaymentMethod =
  | "cash"
  | "card"
  | "transfer"
  | "mercado_pago"
  | "other";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded" | "voided";
export type ServiceCategory = "corte" | "coloraciones" | "tratamiento";
export type StaffCompensationType = "hourly" | "category_percentage";

export interface BusinessRecord {
  monthlyCollectionTarget?: number;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  timeZone: string;
}

export interface BusinessHourRecord {
  id: string;
  dayOfWeek: number;
  label: string;
  openTime: string | null;
  closeTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  isOpen: boolean;
}

export interface BookingSettingsRecord {
  id: string;
  slotIntervalMinutes: number;
  leadTimeMinutes: number;
  maxBookingDaysInAdvance: number;
  bufferBetweenAppointmentsMinutes: number;
}

export interface ServiceRecord {
  bookingEnabled?: boolean;
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  category: ServiceCategory | null;
}

export interface StaffRecord {
  payrollCadence?: "weekly" | "semimonthly" | "monthly";
  payrollWeekday?: number;
  payrollCutoffFirst?: number;
  payrollCutoffSecond?: number;
  payrollPayDelay?: number;

  collectionCommissionRate?: number;
  id: string;
  fullName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  bio?: string | null;
  joinDate?: string | null;
  employeeCode?: string | null;
  hourlyRate?: number;
  rating?: number;
  compensationType?: StaffCompensationType;
}

export interface StaffWorkingHourRecord {
  id: string;
  staffMemberId: string;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  isActive: boolean;
}

export interface StaffServiceAssignmentRecord {
  id: string;
  staffMemberId: string;
  serviceId: string;
}

export interface StaffCategoryRateRecord {
  id: string;
  staffMemberId: string;
  category: ServiceCategory;
  percentage: number;
}

export interface AppointmentRecord {
  arrivedAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  id: string;
  customerId?: string | null;
  customerName: string;
  customerContact: string;
  customerEmail: string | null;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  channel: BookingChannel;
  serviceId: string | null;
  serviceName: string;
  staffMemberId: string | null;
  staffName: string | null;
  price: number;
  durationMinutes: number;
  notes: string | null;
  internalNotes?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerRecord {
  id: string;
  fullName: string;
  primaryContact: string;
  email: string | null;
  phone: string | null;
  instagramHandle: string | null;
  address: string | null;
  status: CustomerStatus;
  preferredServices: string[];
  notes: string | null;
  rating: number | null;
  marketingOptIn: boolean;
  lastVisitAt: string | null;
  totalAppointments: number;
  totalSpent: number;
  joinedAt: string;
}

export interface PaymentRecord {
  collectionDate?: string | null;
  workRecordId?: string | null;
  importRef?: string | null;
  appointmentId?: string | null;
  commissionRate?: number | null;
  commissionAmount?: number | null;
  id: string;
  description: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  customerId: string | null;
  customerName: string | null;
  staffMemberId: string | null;
  staffName: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  transactionId: string | null;
  processedAt: string | null;
  createdAt: string;
  notes: string | null;
}

export interface ExpenseRecord {
  importRef?: string | null;
  id: string;
  expenseDate: string;
  category: string;
  subcategory: string | null;
  description: string;
  vendorName: string | null;
  amount: number;
  method: PaymentMethod;
  source: string;
  notes: string | null;
}

export interface PayoutRecord {
  payrollManaged?: boolean;
  id: string;
  payoutDate: string;
  recipientName: string;
  recipientType: string;
  category: string;
  staffMemberId: string | null;
  staffName: string | null;
  amount: number;
  method: PaymentMethod;
  source: string;
  notes: string | null;
}

export interface WorkRecord {
  id: string;
  workDate: string;
  customerName: string;
  customerId: string | null;
  serviceName: string;
  serviceId: string | null;
  staffName: string | null;
  staffMemberId: string | null;
  amount: number;
  sourceRef: string | null;
  notes: string | null;
  collectionVerified: boolean;
}

export interface StaffTimeLogRecord {
  payableAmount?: number | null;
  id: string;
  staffMemberId: string;
  staffName: string | null;
  workDate: string;
  startTime: string | null;
  endTime: string | null;
  hoursWorked: number;
  entryType: string;
  source: string;
  notes: string | null;
}

export interface ServicePriceVariantRecord {
  id: string;
  serviceId: string;
  serviceName: string | null;
  variantName: string;
  variantCode: string | null;
  price: number;
  durationMinutes: number;
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
  notes: string | null;
}

export const BUSINESS_DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

const DEFAULT_BUSINESS_HOUR_ROWS = [
  {
    dayOfWeek: 0,
    openTime: null,
    closeTime: null,
    breakStartTime: null,
    breakEndTime: null,
    isOpen: false,
  },
  {
    dayOfWeek: 1,
    openTime: null,
    closeTime: null,
    breakStartTime: null,
    breakEndTime: null,
    isOpen: false,
  },
  {
    dayOfWeek: 2,
    openTime: "11:00:00",
    closeTime: "22:00:00",
    breakStartTime: null,
    breakEndTime: null,
    isOpen: true,
  },
  {
    dayOfWeek: 3,
    openTime: "11:00:00",
    closeTime: "22:00:00",
    breakStartTime: null,
    breakEndTime: null,
    isOpen: true,
  },
  {
    dayOfWeek: 4,
    openTime: "11:00:00",
    closeTime: "22:00:00",
    breakStartTime: null,
    breakEndTime: null,
    isOpen: true,
  },
  {
    dayOfWeek: 5,
    openTime: "11:00:00",
    closeTime: "22:00:00",
    breakStartTime: null,
    breakEndTime: null,
    isOpen: true,
  },
  {
    dayOfWeek: 6,
    openTime: "12:00:00",
    closeTime: "22:00:00",
    breakStartTime: null,
    breakEndTime: null,
    isOpen: true,
  },
] as const;

export function createDefaultBusinessHours(): BusinessHourRecord[] {
  return DEFAULT_BUSINESS_HOUR_ROWS.map((row) => ({
    id: `default-hour-${row.dayOfWeek}`,
    dayOfWeek: row.dayOfWeek,
    label: BUSINESS_DAY_NAMES[row.dayOfWeek],
    openTime: row.openTime,
    closeTime: row.closeTime,
    breakStartTime: row.breakStartTime,
    breakEndTime: row.breakEndTime,
    isOpen: row.isOpen,
  }));
}

export function createDefaultBookingSettings(): BookingSettingsRecord {
  return {
    id: "default-booking-settings",
    slotIntervalMinutes: 30,
    leadTimeMinutes: 120,
    maxBookingDaysInAdvance: 30,
    bufferBetweenAppointmentsMinutes: 0,
  };
}

export function getDateKeyInTimeZone(timeZone: string, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatAppointmentDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeZone,
  }).format(new Date(`${value}T12:00:00`));
}

export function formatAppointmentTime(value: string) {
  return value.slice(0, 5);
}

export function getBusinessDayLabel(dayOfWeek: number) {
  return BUSINESS_DAY_NAMES[dayOfWeek] ?? `Día ${dayOfWeek}`;
}

export function createDefaultCategoryRateMap() {
  return {
    corte: 0,
    coloraciones: 0,
    tratamiento: 0,
  } satisfies Record<ServiceCategory, number>;
}

export function getStatusLabel(status: AppointmentStatus) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "confirmed":
      return "Confirmada";
    case "cancelled":
      return "Cancelada";
    case "completed":
      return "Completada";
    default:
      return status;
  }
}

export function getStatusBadgeClassName(status: AppointmentStatus) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900";
    case "confirmed":
      return "bg-emerald-100 text-emerald-900";
    case "cancelled":
      return "bg-rose-100 text-rose-900";
    case "completed":
      return "bg-sky-100 text-sky-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function getChannelLabel(channel: BookingChannel) {
  switch (channel) {
    case "website":
      return "Web";
    case "whatsapp":
      return "WhatsApp";
    case "instagram":
      return "Instagram";
    case "manual":
      return "Manual";
    default:
      return channel;
  }
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  switch (method) {
    case "cash":
      return "Efectivo";
    case "card":
      return "Tarjeta";
    case "transfer":
      return "Transferencia";
    case "mercado_pago":
      return "Mercado Pago";
    case "other":
      return "Otro";
    default:
      return method;
  }
}

export function getPaymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "completed":
      return "Completado";
    case "failed":
      return "Fallido";
    case "voided":
      return "Anulado";
    case "refunded":
      return "Reintegrado";
    default:
      return status;
  }
}

export function getPaymentStatusBadgeClassName(status: PaymentStatus) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900";
    case "completed":
      return "bg-emerald-100 text-emerald-900";
    case "failed":
      return "bg-rose-100 text-rose-900";
    case "refunded":
      return "bg-slate-200 text-slate-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function getCustomerStatusLabel(status: CustomerStatus) {
  switch (status) {
    case "active":
      return "Activo";
    case "inactive":
      return "Inactivo";
    case "vip":
      return "VIP";
    case "lead":
      return "Lead";
    default:
      return status;
  }
}

export function getCustomerStatusBadgeClassName(status: CustomerStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-900";
    case "inactive":
      return "bg-slate-100 text-slate-800";
    case "vip":
      return "bg-fuchsia-100 text-fuchsia-900";
    case "lead":
      return "bg-sky-100 text-sky-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function formatDisplayDate(value: string | null, timeZone: string) {
  if (!value) {
    return "Sin dato";
  }

  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T12:00:00`);

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeZone: value.includes("T") ? timeZone : "UTC",
  }).format(value.includes("T") ? date : new Date(`${value}T12:00:00Z`));
}

export function getServiceCategoryLabel(category: ServiceCategory | null) {
  switch (category) {
    case "corte":
      return "Corte";
    case "coloraciones":
      return "Coloraciones";
    case "tratamiento":
      return "Tratamiento";
    default:
      return "Sin categoría";
  }
}

export function getStaffCompensationTypeLabel(type: StaffCompensationType) {
  switch (type) {
    case "hourly":
      return "Por hora";
    case "category_percentage":
      return "% sobre cobros";
    default:
      return type;
  }
}
