"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export type DayAvailabilityField =
  | "startTime"
  | "endTime"
  | "breakStartTime"
  | "breakEndTime";

export interface DayAvailabilityState {
  dayOfWeek: number;
  label: string;
  isEnabled: boolean;
  startTime: string;
  endTime: string;
  breakStartTime: string;
  breakEndTime: string;
}

interface DayAvailabilityRowProps {
  day: DayAvailabilityState;
  description: string;
  disabledLabel: string;
  enabledLabel: string;
  onTimeChange: (
    dayOfWeek: number,
    field: DayAvailabilityField,
    value: string,
  ) => void;
  onToggleEnabled: (dayOfWeek: number, checked: boolean) => void;
}

function TimeField({
  day,
  disabled,
  field,
  label,
  onTimeChange,
}: {
  day: DayAvailabilityState;
  disabled: boolean;
  field: DayAvailabilityField;
  label: string;
  onTimeChange: (
    dayOfWeek: number,
    field: DayAvailabilityField,
    value: string,
  ) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <Input
        className="w-full"
        disabled={disabled}
        onChange={(event) =>
          onTimeChange(day.dayOfWeek, field, event.target.value)
        }
        aria-label={`${day.label}: ${label}`}
        type="time"
        value={day[field]}
      />
    </div>
  );
}

export function DayAvailabilityRow({
  day,
  description,
  disabledLabel,
  enabledLabel,
  onTimeChange,
  onToggleEnabled,
}: DayAvailabilityRowProps) {
  return (
    <div className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2">
      <div className="flex min-h-11 items-center gap-3 sm:col-span-2">
        <Switch
          aria-label={`Disponibilidad del ${day.label}`}
          checked={day.isEnabled}
          onCheckedChange={(checked) => onToggleEnabled(day.dayOfWeek, checked)}
        />
        <div>
          <p className="font-medium text-slate-900">{day.label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>

      <TimeField
        day={day}
        disabled={!day.isEnabled}
        field="startTime"
        label="Inicio"
        onTimeChange={onTimeChange}
      />
      <TimeField
        day={day}
        disabled={!day.isEnabled}
        field="endTime"
        label="Fin"
        onTimeChange={onTimeChange}
      />
      <TimeField
        day={day}
        disabled={!day.isEnabled}
        field="breakStartTime"
        label="Almuerzo desde"
        onTimeChange={onTimeChange}
      />
      <TimeField
        day={day}
        disabled={!day.isEnabled}
        field="breakEndTime"
        label="Almuerzo hasta"
        onTimeChange={onTimeChange}
      />

      <Badge
        className={
          day.isEnabled
            ? "bg-emerald-100 text-emerald-900"
            : "bg-slate-200 text-slate-800"
        }
      >
        {day.isEnabled ? enabledLabel : disabledLabel}
      </Badge>
    </div>
  );
}
