"use client";

import { isHistoricalEntry, type AgendaEntry } from "@/lib/agenda-history";
import { Button } from "@/components/ui/button";
import {
  formatAppointmentTime,
  formatCurrency,
  getStatusLabel,
} from "@/lib/business-shared";
import { ChevronRight, Plus } from "lucide-react";
import { formatAgendaDayLabel } from "../appointment-utils";

interface AppointmentsSelectedDayPanelProps {
  appointments: AgendaEntry[];
  dateKey: string;
  onCreate: () => void;
  onSelectAppointment: (appointmentId: string) => void;
  selectedAppointmentId: string | null;
  timeZone: string;
}

export function AppointmentsSelectedDayPanel({
  appointments,
  dateKey,
  onCreate,
  onSelectAppointment,
  selectedAppointmentId,
  timeZone,
}: AppointmentsSelectedDayPanelProps) {
  return (
    <section className="selected-day-panel" aria-label="Atenciones del día">
      <div className="selected-day-heading">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold capitalize text-slate-900">
            {formatAgendaDayLabel(dateKey, timeZone)}
          </h2>
          <p className="text-sm text-slate-500">
            {appointments.length}{" "}
            {appointments.length === 1 ? "atención" : "atenciones"} · Tocá una
            tarjeta para ver el detalle
          </p>
        </div>
        <Button onClick={onCreate} type="button" variant="outline" size="sm">
          <Plus size={16} /> Nuevo
        </Button>
      </div>
      {appointments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          No hay turnos ni atenciones cargadas para este día.
        </p>
      ) : (
        <div className="agenda-day-list">
          {appointments.map((entry) => {
            const history = isHistoricalEntry(entry);
            return (
              <button
                key={entry.id}
                type="button"
                data-history-id={history ? entry.workRecord.id : undefined}
                className={`agenda-day-card ${selectedAppointmentId === entry.id ? "is-selected" : ""}`}
                aria-label={`Ver detalle de ${entry.customerName}, ${entry.serviceName}, ${formatAppointmentTime(entry.appointmentTime)}${history ? ", hora estimada" : ""}`}
                aria-haspopup="dialog"
                onClick={() => onSelectAppointment(entry.id)}
              >
                <span className="agenda-day-card__top">
                  <span className="font-semibold tabular-nums">
                    {formatAppointmentTime(entry.appointmentTime)}
                  </span>
                  <span className="agenda-day-card__status">
                    <i data-status={history ? "history" : entry.status} />
                    {history ? "Hora estimada" : getStatusLabel(entry.status)}
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </span>
                <span className="agenda-day-card__name">
                  {entry.customerName}
                </span>
                <span className="agenda-day-card__service">
                  {entry.serviceName}
                </span>
                <span className="agenda-day-card__footer">
                  <span>{entry.staffName || "Sin profesional"}</span>
                  <span>{formatCurrency(entry.price)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
