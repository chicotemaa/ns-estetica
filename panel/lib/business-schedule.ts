import "server-only";

import {
  createDefaultBookingSettings,
  getBusinessDayLabel,
} from "@/lib/business-shared";
import { parseDailyScheduleDay } from "@/lib/daily-schedule";

export interface ScheduleDayPayload {
  dayOfWeek?: unknown;
  isOpen?: unknown;
  openTime?: unknown;
  closeTime?: unknown;
  breakStartTime?: unknown;
  breakEndTime?: unknown;
}

export interface BookingSettingsPayload {
  slotIntervalMinutes?: unknown;
  leadTimeMinutes?: unknown;
  maxBookingDaysInAdvance?: unknown;
  bufferBetweenAppointmentsMinutes?: unknown;
}

export interface BusinessSchedulePayload {
  days?: unknown;
  bookingSettings?: unknown;
}

interface ParsedScheduleDay {
  dayOfWeek: number;
  label: string;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
}

interface ParsedBookingSettings {
  slotIntervalMinutes: number;
  leadTimeMinutes: number;
  maxBookingDaysInAdvance: number;
  bufferBetweenAppointmentsMinutes: number;
}

function parsePositiveInteger(
  value: unknown,
  fieldLabel: string,
  options: { min: number; max: number },
) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < options.min ||
    parsed > options.max
  ) {
    return {
      error: `${fieldLabel} debe ser un número entero entre ${options.min} y ${options.max}.`,
    };
  }

  return { value: parsed };
}

export function parseBusinessSchedulePayload(
  payload: BusinessSchedulePayload,
): {
  data?: { days: ParsedScheduleDay[]; bookingSettings: ParsedBookingSettings };
  error?: string;
} {
  if (!Array.isArray(payload.days)) {
    return { error: "Los horarios semanales son obligatorios." };
  }

  if (!payload.bookingSettings || typeof payload.bookingSettings !== "object") {
    return { error: "Las reglas generales de reserva son obligatorias." };
  }

  const dayMap = new Map<number, ParsedScheduleDay>();

  for (const rawDay of payload.days as ScheduleDayPayload[]) {
    const dayOfWeek =
      typeof rawDay.dayOfWeek === "number"
        ? rawDay.dayOfWeek
        : Number(rawDay.dayOfWeek);
    const isOpen = typeof rawDay.isOpen === "boolean" ? rawDay.isOpen : false;

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return { error: "Cada día debe indicar un número válido entre 0 y 6." };
    }

    if (dayMap.has(dayOfWeek)) {
      return {
        error: "No puede haber días repetidos en la configuración horaria.",
      };
    }

    const parsedDay = parseDailyScheduleDay({
      dayOfWeek,
      isEnabled: isOpen,
      startTime: rawDay.openTime,
      endTime: rawDay.closeTime,
      breakStartTime: rawDay.breakStartTime,
      breakEndTime: rawDay.breakEndTime,
      label: getBusinessDayLabel(dayOfWeek),
    });

    if (parsedDay.error || !parsedDay.data) {
      return {
        error: parsedDay.error ?? "La configuración horaria es inválida.",
      };
    }

    dayMap.set(dayOfWeek, {
      dayOfWeek,
      label: parsedDay.data.label,
      isOpen: parsedDay.data.isEnabled,
      openTime: parsedDay.data.startTime,
      closeTime: parsedDay.data.endTime,
      breakStartTime: parsedDay.data.breakStartTime,
      breakEndTime: parsedDay.data.breakEndTime,
    });
  }

  if (dayMap.size !== 7) {
    return { error: "Debes enviar los 7 días de la semana." };
  }

  const bookingSettingsPayload =
    payload.bookingSettings as BookingSettingsPayload;
  const defaultSettings = createDefaultBookingSettings();

  const slotIntervalMinutes = parsePositiveInteger(
    bookingSettingsPayload.slotIntervalMinutes ??
      defaultSettings.slotIntervalMinutes,
    "El intervalo entre turnos",
    { min: 5, max: 240 },
  );
  const leadTimeMinutes = parsePositiveInteger(
    bookingSettingsPayload.leadTimeMinutes ?? defaultSettings.leadTimeMinutes,
    "La anticipación mínima",
    { min: 0, max: 10080 },
  );
  const maxBookingDaysInAdvance = parsePositiveInteger(
    bookingSettingsPayload.maxBookingDaysInAdvance ??
      defaultSettings.maxBookingDaysInAdvance,
    "El máximo de días de anticipación",
    { min: 1, max: 365 },
  );
  const bufferBetweenAppointmentsMinutes = parsePositiveInteger(
    bookingSettingsPayload.bufferBetweenAppointmentsMinutes ??
      defaultSettings.bufferBetweenAppointmentsMinutes,
    "El colchón entre turnos",
    { min: 0, max: 240 },
  );

  const errors = [
    slotIntervalMinutes.error,
    leadTimeMinutes.error,
    maxBookingDaysInAdvance.error,
    bufferBetweenAppointmentsMinutes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    return { error: errors[0] };
  }

  return {
    data: {
      days: Array.from(dayMap.values()).sort(
        (left, right) => left.dayOfWeek - right.dayOfWeek,
      ),
      bookingSettings: {
        slotIntervalMinutes:
          slotIntervalMinutes.value ?? defaultSettings.slotIntervalMinutes,
        leadTimeMinutes:
          leadTimeMinutes.value ?? defaultSettings.leadTimeMinutes,
        maxBookingDaysInAdvance:
          maxBookingDaysInAdvance.value ??
          defaultSettings.maxBookingDaysInAdvance,
        bufferBetweenAppointmentsMinutes:
          bufferBetweenAppointmentsMinutes.value ??
          defaultSettings.bufferBetweenAppointmentsMinutes,
      },
    },
  };
}
