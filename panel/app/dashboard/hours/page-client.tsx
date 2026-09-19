"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardPageShell } from "@/components/dashboard/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  BookingSettingsRecord,
  BusinessHourRecord,
} from "@/lib/business-shared";
import { Clock3, RotateCcw, Save } from "lucide-react";

import { HoursDayRow } from "./_components/hours-day-row";
import { HoursFeedbackDialog } from "./_components/hours-feedback-dialog";
import { useHoursController } from "./use-hours-controller";

interface HoursPageClientProps {
  bookingSettings: BookingSettingsRecord;
  businessHours: BusinessHourRecord[];
  businessName: string;
  isLive: boolean;
}

function formatTimeLabel(value: string | null) {
  return value ? `${value} hs` : "Sin horario";
}

export function HoursPageClient({
  bookingSettings,
  businessHours,
  businessName,
  isLive,
}: HoursPageClientProps) {
  const controller = useHoursController(businessHours, bookingSettings);

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        actions={
          <>
            <Button
              disabled={
                !controller.isDirty ||
                controller.isSubmitting ||
                controller.isRefreshing
              }
              onClick={controller.resetForm}
              variant="outline"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Descartar cambios
            </Button>
            <Button
              disabled={
                !controller.isDirty ||
                controller.isSubmitting ||
                controller.isRefreshing
              }
              onClick={() => void controller.submitForm()}
            >
              <Save className="mr-2 h-4 w-4" />
              Guardar reglas
            </Button>
          </>
        }
        badge={
          !isLive ? (
            <Badge className="bg-amber-100 text-amber-900">
              Modo demostración
            </Badge>
          ) : null
        }
        description={`Días y horarios de atención de ${businessName}.`}
        eyebrow="Disponibilidad"
        title="Horarios"
      />

      <div className="metric-grid grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Días abiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {controller.openDaysCount}
            </div>
            <p className="text-xs text-slate-500">Sobre 7 días configurables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Primer turno del día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {formatTimeLabel(controller.earliestOpenTime)}
            </div>
            <p className="text-xs text-slate-500">
              Apertura más temprana configurada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Último cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {formatTimeLabel(controller.latestCloseTime)}
            </div>
            <p className="text-xs text-slate-500">
              Cierre más tarde disponible
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" />
              Horario semanal
            </CardTitle>
            <CardDescription>
              Si un día queda cerrado, ese día no debería ofrecer turnos nuevos.
              Si no hay almuerzo, deja esa franja vacía.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {controller.days.map((day) => (
              <HoursDayRow
                day={day}
                key={day.dayOfWeek}
                onTimeChange={controller.updateDayTime}
                onToggleOpen={controller.toggleDayOpen}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reglas generales de turnos</CardTitle>
            <CardDescription>
              Estas reglas acotan cómo y cuándo se pueden reservar turnos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="slot-interval">Intervalo entre turnos</Label>
              <Input
                id="slot-interval"
                min="5"
                onChange={(event) =>
                  controller.updateBookingRule(
                    "slotIntervalMinutes",
                    event.target.value,
                  )
                }
                type="number"
                value={controller.bookingRules.slotIntervalMinutes}
              />
              <p className="text-xs text-slate-500">
                Minutos entre un horario disponible y el siguiente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-time">Anticipación mínima</Label>
              <Input
                id="lead-time"
                min="0"
                onChange={(event) =>
                  controller.updateBookingRule(
                    "leadTimeMinutes",
                    event.target.value,
                  )
                }
                type="number"
                value={controller.bookingRules.leadTimeMinutes}
              />
              <p className="text-xs text-slate-500">
                Minutos mínimos con los que se puede pedir un turno.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-advance">
                Máximo de días de anticipación
              </Label>
              <Input
                id="max-advance"
                min="1"
                onChange={(event) =>
                  controller.updateBookingRule(
                    "maxBookingDaysInAdvance",
                    event.target.value,
                  )
                }
                type="number"
                value={controller.bookingRules.maxBookingDaysInAdvance}
              />
              <p className="text-xs text-slate-500">
                Hasta cuántos días adelante se habilitan reservas.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="buffer">Colchón entre turnos</Label>
              <Input
                id="buffer"
                min="0"
                onChange={(event) =>
                  controller.updateBookingRule(
                    "bufferBetweenAppointmentsMinutes",
                    event.target.value,
                  )
                }
                type="number"
                value={controller.bookingRules.bufferBetweenAppointmentsMinutes}
              />
              <p className="text-xs text-slate-500">
                Minutos extra a respetar entre un turno y el siguiente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <HoursFeedbackDialog
        feedback={controller.feedbackState}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeFeedbackDialog();
          }
        }}
      />
    </DashboardPageShell>
  );
}
