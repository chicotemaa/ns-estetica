"use client";

import { DayAvailabilityRow } from "@/components/schedule/day-availability-row";

import type { HoursDayFormState } from "../hours-types";

interface HoursDayRowProps {
  day: HoursDayFormState;
  onTimeChange: (
    dayOfWeek: number,
    field: "openTime" | "closeTime" | "breakStartTime" | "breakEndTime",
    value: string,
  ) => void;
  onToggleOpen: (dayOfWeek: number, checked: boolean) => void;
}

export function HoursDayRow({
  day,
  onTimeChange,
  onToggleOpen,
}: HoursDayRowProps) {
  return (
    <DayAvailabilityRow
      day={{
        dayOfWeek: day.dayOfWeek,
        label: day.label,
        isEnabled: day.isOpen,
        startTime: day.openTime,
        endTime: day.closeTime,
        breakStartTime: day.breakStartTime,
        breakEndTime: day.breakEndTime,
      }}
      description="Disponibilidad general del negocio"
      disabledLabel="Cerrado"
      enabledLabel="Abierto"
      onTimeChange={(dayOfWeek, field, value) =>
        onTimeChange(
          dayOfWeek,
          field === "startTime"
            ? "openTime"
            : field === "endTime"
              ? "closeTime"
              : field,
          value,
        )
      }
      onToggleEnabled={onToggleOpen}
    />
  );
}
