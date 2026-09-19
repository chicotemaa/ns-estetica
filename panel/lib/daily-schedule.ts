import { getBusinessDayLabel } from "@/lib/business-shared";

export interface ParsedDailyScheduleDay {
  dayOfWeek: number;
  label: string;
  isEnabled: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
}

export function normalizeScheduleTime(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();

  if (!/^\d{2}:\d{2}$/.test(normalizedValue)) {
    return undefined;
  }

  return `${normalizedValue}:00`;
}

export function parseDailyScheduleDay(input: {
  dayOfWeek: number;
  isEnabled: boolean;
  startTime: unknown;
  endTime: unknown;
  breakStartTime?: unknown;
  breakEndTime?: unknown;
  label?: string;
}) {
  const label = input.label ?? getBusinessDayLabel(input.dayOfWeek);
  const startTime = normalizeScheduleTime(input.startTime);
  const endTime = normalizeScheduleTime(input.endTime);
  const breakStartTime = normalizeScheduleTime(input.breakStartTime);
  const breakEndTime = normalizeScheduleTime(input.breakEndTime);

  if (
    startTime === undefined ||
    endTime === undefined ||
    breakStartTime === undefined ||
    breakEndTime === undefined
  ) {
    return { error: `${label} tiene un horario inválido.` };
  }

  if (!input.isEnabled) {
    return {
      data: {
        dayOfWeek: input.dayOfWeek,
        label,
        isEnabled: false,
        startTime: null,
        endTime: null,
        breakStartTime: null,
        breakEndTime: null,
      } satisfies ParsedDailyScheduleDay,
    };
  }

  if (!startTime || !endTime) {
    return { error: `${label} debe tener inicio y fin.` };
  }

  if (startTime >= endTime) {
    return { error: `${label} debe terminar después de empezar.` };
  }

  if ((breakStartTime && !breakEndTime) || (!breakStartTime && breakEndTime)) {
    return { error: `${label} debe completar inicio y fin del almuerzo.` };
  }

  if (breakStartTime && breakEndTime) {
    if (breakStartTime >= breakEndTime) {
      return {
        error: `${label} debe terminar el almuerzo después de empezarlo.`,
      };
    }

    if (breakStartTime <= startTime || breakEndTime >= endTime) {
      return {
        error: `${label} debe ubicar el almuerzo dentro del horario disponible.`,
      };
    }
  }

  return {
    data: {
      dayOfWeek: input.dayOfWeek,
      label,
      isEnabled: true,
      startTime,
      endTime,
      breakStartTime: breakStartTime ?? null,
      breakEndTime: breakEndTime ?? null,
    } satisfies ParsedDailyScheduleDay,
  };
}
