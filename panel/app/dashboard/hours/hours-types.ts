export interface HoursDayFormState {
  dayOfWeek: number;
  label: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStartTime: string;
  breakEndTime: string;
}

export interface BookingRulesFormState {
  slotIntervalMinutes: string;
  leadTimeMinutes: string;
  maxBookingDaysInAdvance: string;
  bufferBetweenAppointmentsMinutes: string;
}

export interface HoursFeedbackState {
  title: string;
  description: string;
  tone: "success" | "warning" | "error";
}
