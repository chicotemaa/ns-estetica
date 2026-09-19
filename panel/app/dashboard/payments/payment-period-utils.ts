"use client";

import type {
  ExpenseRecord,
  PaymentRecord,
  PayoutRecord,
} from "@/lib/business-shared";

import type { MovementPeriod } from "./payment-types";

interface DateParts {
  year: number;
  month: number;
  day: number;
  key: string;
}

interface PeriodMeta {
  chipLabel: string;
  title: string;
  rangeLabel: string;
}

export const MOVEMENT_PERIOD_OPTIONS: Array<{
  value: MovementPeriod;
  label: string;
}> = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensual" },
  { value: "year", label: "Anual" },
];

function getDatePartsInTimeZone(timeZone: string, date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return {
    year,
    month,
    day,
    key: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  } satisfies DateParts;
}

function getDatePartsFromValue(value: string | null, timeZone: string) {
  if (!value) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return { year, month, day, key: value };
  }

  const parsedDate = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return getDatePartsInTimeZone(timeZone, parsedDate);
}

function createUtcDateFromParts(parts: DateParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function getWeekStart(referenceDate: Date) {
  const weekStart = new Date(referenceDate);
  const weekday = weekStart.getUTCDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  weekStart.setUTCDate(weekStart.getUTCDate() - offset);
  return weekStart;
}

function getWeekEnd(referenceDate: Date) {
  const weekEnd = new Date(referenceDate);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  return weekEnd;
}

function formatUtcDate(date: Date, format: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    ...format,
  }).format(date);
}

function formatDateKeyForDisplay(value: string) {
  return formatUtcDate(new Date(`${value}T12:00:00Z`), {
    dateStyle: "medium",
  });
}

function isDateWithinWeek(target: DateParts, reference: DateParts) {
  const targetDate = createUtcDateFromParts(target);
  const referenceDate = createUtcDateFromParts(reference);
  const weekStart = getWeekStart(referenceDate);
  const weekEnd = getWeekEnd(weekStart);

  return targetDate >= weekStart && targetDate <= weekEnd;
}

export function isDateInMovementPeriod(
  value: string | null,
  period: MovementPeriod,
  timeZone: string,
  referenceDate = new Date(),
) {
  const target = getDatePartsFromValue(value, timeZone);
  const reference = getDatePartsInTimeZone(timeZone, referenceDate);

  if (!target || !reference) {
    return false;
  }

  switch (period) {
    case "day":
      return target.key === reference.key;
    case "week":
      return isDateWithinWeek(target, reference);
    case "month":
      return target.year === reference.year && target.month === reference.month;
    case "year":
      return target.year === reference.year;
    default:
      return false;
  }
}

export function getMovementPeriodMeta(
  period: MovementPeriod,
  timeZone: string,
  referenceDate = new Date(),
): PeriodMeta {
  const reference = getDatePartsInTimeZone(timeZone, referenceDate);

  if (!reference) {
    return {
      chipLabel: "Período actual",
      title: "Período actual",
      rangeLabel: "Sin rango disponible",
    };
  }

  const referenceUtc = createUtcDateFromParts(reference);

  switch (period) {
    case "day":
      return {
        chipLabel: "Hoy",
        title: "Vista diaria",
        rangeLabel: formatDateKeyForDisplay(reference.key),
      };
    case "week": {
      const weekStart = getWeekStart(referenceUtc);
      const weekEnd = getWeekEnd(weekStart);
      return {
        chipLabel: "Semana actual",
        title: "Vista semanal",
        rangeLabel: `${formatUtcDate(weekStart, { dateStyle: "medium" })} al ${formatUtcDate(weekEnd, { dateStyle: "medium" })}`,
      };
    }
    case "month":
      return {
        chipLabel: "Mes actual",
        title: "Vista mensual",
        rangeLabel: formatUtcDate(referenceUtc, {
          month: "long",
          year: "numeric",
        }),
      };
    case "year":
      return {
        chipLabel: "Año actual",
        title: "Vista anual",
        rangeLabel: String(reference.year),
      };
    default:
      return {
        chipLabel: "Período actual",
        title: "Período actual",
        rangeLabel: "Sin rango disponible",
      };
  }
}

export function getPaymentDateValue(payment: PaymentRecord) {
  return payment.collectionDate ?? payment.processedAt ?? payment.createdAt;
}

export function getExpenseDateValue(expense: ExpenseRecord) {
  return expense.expenseDate;
}

export function getPayoutDateValue(payout: PayoutRecord) {
  return payout.payoutDate;
}
