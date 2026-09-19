import type {
  AppointmentRecord,
  AppointmentStatus,
  BookingChannel,
} from "@/lib/business-shared";

export type AgendaViewMode = "day" | "week" | "month" | "year";

export interface AppointmentFormState {
  customerId: string;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  serviceId: string;
  staffMemberId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  channel: BookingChannel;
  notes: string;
  internalNotes: string;
  cancellationReason: string;
}

export interface AgendaFeedbackState {
  title: string;
  description: string;
  tone: "success" | "error";
}

export interface AppointmentStatusDialogState {
  appointment: AppointmentRecord;
  nextStatus: AppointmentStatus;
  confirmLabel: string;
  description: string;
  title: string;
}

export interface AgendaRangeMeta {
  title: string;
  subtitle: string;
}

export interface AgendaMetricSummary {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  revenue: number;
}
