"use client";

import { Button } from "@/components/ui/button";
import { DayAvailabilityRow } from "@/components/schedule/day-availability-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getServiceCategoryLabel,
  getStaffCompensationTypeLabel,
  type ServiceCategory,
  type StaffCompensationType,
} from "@/lib/business-shared";

import type {
  EmployeeFormState,
  EmployeeServiceOption,
  EmployeeSummary,
} from "../employee-types";

interface EmployeeFormDialogProps {
  employeeBeingEdited: EmployeeSummary | null;
  errorMessage: string | null;
  formState: EmployeeFormState;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onToggleAssignedService: (serviceId: string) => void;
  onUpdateCategoryRate: (category: ServiceCategory, value: string) => void;
  onUpdateField: <K extends keyof EmployeeFormState>(
    field: K,
    value: EmployeeFormState[K],
  ) => void;
  onUpdateWorkingHour: (
    dayOfWeek: number,
    field:
      | "startTime"
      | "endTime"
      | "breakStartTime"
      | "breakEndTime"
      | "isActive",
    value: string | boolean,
  ) => void;
  serviceOptions: EmployeeServiceOption[];
}

export function EmployeeFormDialog({
  employeeBeingEdited,
  errorMessage,
  formState,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  onToggleAssignedService,
  onUpdateField,
  onUpdateWorkingHour,
  serviceOptions,
}: EmployeeFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employeeBeingEdited ? "Editar profesional" : "Nuevo profesional"}
          </DialogTitle>
          <DialogDescription>
            Configura datos del equipo, servicios asignados, horario semanal y
            forma de liquidación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee-full-name">Nombre completo</Label>
              <Input
                id="employee-full-name"
                value={formState.fullName}
                onChange={(event) =>
                  onUpdateField("fullName", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <datalist id="employee-roles">
                {[
                  "Esteticista",
                  "Estilista",
                  "Colorista",
                  "Recepcionista",
                  "Encargado/a",
                  "Asistente",
                ].map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </datalist>
              <Label htmlFor="employee-role">Rol</Label>
              <Input
                id="employee-role"
                list="employee-roles"
                placeholder="Especialista en estética"
                value={formState.role}
                onChange={(event) => onUpdateField("role", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-email">Email</Label>
              <Input
                id="employee-email"
                type="email"
                value={formState.email}
                onChange={(event) => onUpdateField("email", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-phone">Teléfono</Label>
              <Input
                id="employee-phone"
                value={formState.phone}
                onChange={(event) => onUpdateField("phone", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-code">Código interno</Label>
              <Input
                id="employee-code"
                placeholder="NERE"
                value={formState.employeeCode}
                onChange={(event) =>
                  onUpdateField(
                    "employeeCode",
                    event.target.value.toUpperCase(),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-join-date">Fecha de ingreso</Label>
              <Input
                id="employee-join-date"
                type="date"
                value={formState.joinDate}
                onChange={(event) =>
                  onUpdateField("joinDate", event.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee-bio">Bio</Label>
            <Textarea
              id="employee-bio"
              rows={3}
              value={formState.bio}
              onChange={(event) => onUpdateField("bio", event.target.value)}
            />
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div className="space-y-2">
                <Label>Tipo de liquidación</Label>
                <Select
                  value={formState.compensationType}
                  onValueChange={(value) =>
                    onUpdateField(
                      "compensationType",
                      value as StaffCompensationType,
                    )
                  }
                >
                  <SelectTrigger aria-label="Tipo de liquidación">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">
                      {getStaffCompensationTypeLabel("hourly")}
                    </SelectItem>
                    <SelectItem value="category_percentage">
                      {getStaffCompensationTypeLabel("category_percentage")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-hourly-rate">
                  {formState.compensationType === "hourly"
                    ? "Valor por hora"
                    : "Porcentaje sobre cobros"}
                </Label>
                <Input
                  id="employee-hourly-rate"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  max={
                    formState.compensationType === "hourly" ? 10000000000 : 100
                  }
                  value={
                    formState.compensationType === "hourly"
                      ? formState.hourlyRate
                      : formState.collectionCommissionRate
                  }
                  onChange={(event) =>
                    onUpdateField(
                      formState.compensationType === "hourly"
                        ? "hourlyRate"
                        : "collectionCommissionRate",
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>

            <p className="text-sm text-slate-600">
              La modalidad elegida se aplica a los nuevos registros. Los cobros
              y jornadas anteriores conservan su tarifa. El porcentaje se
              calcula sobre lo efectivamente cobrado por los servicios de este
              profesional.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Frecuencia de pago
                <select
                  className="rounded-md border p-2"
                  value={formState.payrollCadence}
                  onChange={(e) =>
                    onUpdateField(
                      "payrollCadence",
                      e.target.value as "weekly" | "semimonthly" | "monthly",
                    )
                  }
                >
                  <option value="weekly">Semanal</option>
                  <option value="semimonthly">Quincenal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Días desde el corte hasta el pago
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={formState.payrollPayDelay}
                  onChange={(e) =>
                    onUpdateField("payrollPayDelay", e.target.value)
                  }
                />
              </label>
              {formState.payrollCadence === "weekly" ? (
                <label className="grid gap-1 text-sm">
                  Día de cierre semanal
                  <select
                    className="rounded-md border p-2"
                    value={formState.payrollWeekday}
                    onChange={(e) =>
                      onUpdateField("payrollWeekday", e.target.value)
                    }
                  >
                    {[
                      "Domingo",
                      "Lunes",
                      "Martes",
                      "Miércoles",
                      "Jueves",
                      "Viernes",
                      "Sábado",
                    ].map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  {formState.payrollCadence === "semimonthly" && (
                    <label className="grid gap-1 text-sm">
                      Primer corte del mes
                      <Input
                        type="number"
                        min="1"
                        max="27"
                        value={formState.payrollCutoffFirst}
                        onChange={(e) =>
                          onUpdateField("payrollCutoffFirst", e.target.value)
                        }
                      />
                    </label>
                  )}
                  <label className="grid gap-1 text-sm">
                    {formState.payrollCadence === "monthly"
                      ? "Corte mensual"
                      : "Segundo corte del mes"}
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formState.payrollCutoffSecond}
                      onChange={(e) =>
                        onUpdateField("payrollCutoffSecond", e.target.value)
                      }
                    />
                  </label>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Las semanas se calculan según el día de cierre. El día 31 equivale
              al último día del mes. Los plazos de pago se cuentan en días
              corridos.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Servicios asignados
              </p>
              <p className="text-xs text-slate-500">
                Selecciona qué servicios puede tomar este profesional.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {serviceOptions.map((service) => {
                const isSelected = formState.assignedServiceIds.includes(
                  service.id,
                );

                return (
                  <Button
                    className={
                      isSelected ? undefined : "border-slate-300 text-slate-700"
                    }
                    key={service.id}
                    onClick={() => onToggleAssignedService(service.id)}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                  >
                    {service.name}
                    {service.category
                      ? ` · ${getServiceCategoryLabel(service.category)}`
                      : ""}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Horario semanal
              </p>
              <p className="text-xs text-slate-500">
                Este horario define cuándo puede atender el profesional. Si no
                corta para almorzar, deja esa franja vacía.
              </p>
            </div>
            <div className="space-y-3">
              {formState.workingHours.map((day) => (
                <DayAvailabilityRow
                  day={{
                    dayOfWeek: day.dayOfWeek,
                    label: day.label,
                    isEnabled: day.isActive,
                    startTime: day.startTime,
                    endTime: day.endTime,
                    breakStartTime: day.breakStartTime,
                    breakEndTime: day.breakEndTime,
                  }}
                  description="Disponibilidad del profesional"
                  disabledLabel="Sin atención"
                  enabledLabel="Disponible"
                  key={day.dayOfWeek}
                  onTimeChange={(dayOfWeek, field, value) =>
                    onUpdateWorkingHour(dayOfWeek, field, value)
                  }
                  onToggleEnabled={(dayOfWeek, checked) =>
                    onUpdateWorkingHour(dayOfWeek, "isActive", checked)
                  }
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isSubmitting} onClick={onSubmit}>
            {employeeBeingEdited ? "Guardar cambios" : "Crear profesional"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
