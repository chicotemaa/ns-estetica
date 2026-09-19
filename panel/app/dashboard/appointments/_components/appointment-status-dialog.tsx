"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatAppointmentTime, getStatusLabel } from "@/lib/business-shared";

import type { AppointmentStatusDialogState } from "../appointment-types";

interface AppointmentStatusDialogProps {
  dialogState: AppointmentStatusDialogState | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  onReasonChange: (value: string) => void;
  reason: string;
}

export function AppointmentStatusDialog({
  dialogState,
  isSubmitting,
  onConfirm,
  onOpenChange,
  onReasonChange,
  reason,
}: AppointmentStatusDialogProps) {
  const appointment = dialogState?.appointment ?? null;
  const isCancellation = dialogState?.nextStatus === "cancelled";

  return (
    <Dialog open={dialogState !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{dialogState?.title ?? "Actualizar turno"}</DialogTitle>
          <DialogDescription>
            {dialogState?.description ?? "Confirma la actualización del turno."}
          </DialogDescription>
        </DialogHeader>

        {appointment ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">
              {appointment.customerName}
            </p>
            <p>
              {appointment.serviceName} · {formatAppointmentTime(appointment.appointmentTime)}
            </p>
            <p className="text-slate-500">
              Estado actual: {getStatusLabel(appointment.status)}
            </p>
          </div>
        ) : null}

        {isCancellation ? (
          <div className="space-y-2">
            <Label htmlFor="appointment-status-reason">Motivo</Label>
            <Textarea
              id="appointment-status-reason"
              rows={4}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button disabled={isSubmitting} onClick={onConfirm}>
            {dialogState?.confirmLabel ?? "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
