"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton } from "@/components/dashboard/checkout-button";
import { AppointmentProgress } from "@/components/dashboard/appointment-progress";
import { isHistoricalEntry, type AgendaEntry } from "@/lib/agenda-history";
import {
  formatAppointmentTime,
  formatCurrency,
  getChannelLabel,
  getStatusBadgeClassName,
  getStatusLabel,
  type AppointmentRecord,
} from "@/lib/business-shared";
import { formatAgendaDayLabel } from "../appointment-utils";

export function AppointmentDetailDialog({
  entry,
  isOpen,
  onOpenChange,
  onEdit,
  onStatusChange,
  onCloseAutoFocus,
  timeZone,
}: {
  entry: AgendaEntry | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  onEdit: (entry: AppointmentRecord) => void;
  onStatusChange: (
    entry: AppointmentRecord,
    status: AppointmentRecord["status"],
  ) => void;
  timeZone: string;
}) {
  if (!entry) return null;
  const history = isHistoricalEntry(entry);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="agenda-detail-dialog"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {history ? "Atención realizada" : "Detalle del turno"}
          </p>
          <DialogTitle className="text-xl leading-snug">
            {entry.customerName}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            {entry.serviceName}
          </DialogDescription>
        </DialogHeader>
        <Badge className={getStatusBadgeClassName(entry.status)}>
          {history ? "Realizado · Historial" : getStatusLabel(entry.status)}
        </Badge>
        <dl className="agenda-detail-facts">
          <div>
            <dt>Fecha</dt>
            <dd className="capitalize">
              {formatAgendaDayLabel(entry.appointmentDate, timeZone)}
            </dd>
          </div>
          <div>
            <dt>{history ? "Hora estimada" : "Horario"}</dt>
            <dd>
              {formatAppointmentTime(entry.appointmentTime)}
              {!history && ` · ${entry.durationMinutes} min`}
            </dd>
          </div>
          <div>
            <dt>Profesional</dt>
            <dd>{entry.staffName || "Sin profesional"}</dd>
          </div>
          <div>
            <dt>Importe del servicio</dt>
            <dd className="font-semibold tabular-nums">
              {formatCurrency(entry.price)}
            </dd>
          </div>
          {!history && entry.customerContact && (
            <div>
              <dt>Contacto</dt>
              <dd>{entry.customerContact}</dd>
            </div>
          )}
          {!history && entry.customerEmail && (
            <div>
              <dt>Email</dt>
              <dd>{entry.customerEmail}</dd>
            </div>
          )}
        </dl>
        {history ? (
          <>
            <p className="text-sm leading-relaxed text-slate-500">
              Hora y duración orientativas. La fecha y el importe son los
              originales; los cobros se consultan en Atenciones.
            </p>
            <Button asChild>
              <Link
                href={`/dashboard/atenciones?${new URLSearchParams({ month: entry.appointmentDate.slice(0, 7), q: entry.customerName })}`}
              >
                Ver en atenciones
              </Link>
            </Button>
          </>
        ) : (
          <>
            <AppointmentProgress appointment={entry} timeZone={timeZone} />
            <div className="agenda-detail-actions">
              <CheckoutButton appointment={entry} />
              <Button variant="outline" onClick={() => onEdit(entry)}>
                Editar turno
              </Button>
            </div>
            {(entry.notes ||
              entry.internalNotes ||
              entry.cancellationReason) && (
              <details className="agenda-detail-disclosure">
                <summary>Notas y observaciones</summary>
                {entry.notes && <p>{entry.notes}</p>}
                {entry.internalNotes && (
                  <p>
                    <strong>Nota interna:</strong> {entry.internalNotes}
                  </p>
                )}
                {entry.cancellationReason && (
                  <p>
                    <strong>Motivo de cancelación:</strong>{" "}
                    {entry.cancellationReason}
                  </p>
                )}
              </details>
            )}
            <details className="agenda-detail-disclosure">
              <summary>Otras acciones</summary>
              <p>Origen: {getChannelLabel(entry.channel)}</p>
              <div className="agenda-detail-actions">
                {entry.status === "pending" && (
                  <Button
                    variant="outline"
                    onClick={() => onStatusChange(entry, "confirmed")}
                  >
                    Confirmar turno
                  </Button>
                )}
                {entry.status === "confirmed" && (
                  <Button
                    variant="outline"
                    onClick={() => onStatusChange(entry, "completed")}
                  >
                    Completar sin cobro
                  </Button>
                )}
                {entry.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    className="text-rose-700"
                    onClick={() => onStatusChange(entry, "cancelled")}
                  >
                    Cancelar turno
                  </Button>
                )}
              </div>
            </details>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
