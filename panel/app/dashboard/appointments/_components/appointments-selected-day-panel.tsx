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
import type { ScheduleBlock } from "./schedule-tools";

interface AppointmentsSelectedDayPanelProps {
  appointments: AgendaEntry[];
  blocks: ScheduleBlock[];
  staff: { id: string; fullName: string }[];
  dateKey: string;
  onCreate: () => void;
  onSelectAppointment: (appointmentId: string) => void;
  selectedAppointmentId: string | null;
  timeZone: string;
}

export function AppointmentsSelectedDayPanel({
  appointments,
  blocks,
  staff,
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
            {blocks.length > 0 && ` · ${blocks.length} ${blocks.length === 1 ? "bloqueo" : "bloqueos"}`}
          </p>
        </div>
        <Button onClick={onCreate} type="button" variant="outline" size="sm">
          <Plus size={16} /> Nuevo
        </Button>
      </div>
      <div className="space-y-3" aria-label="Horarios bloqueados del día">
        {blocks.map((block) => (
          <div key={block.id} className="rounded-xl bg-amber-50 p-4 text-amber-950">
            <p className="font-bold tabular-nums">
              {block.start_time.slice(0, 5) === "00:00" && block.end_time.slice(0, 5) === "24:00"
                ? "Todo el día"
                : `${block.start_time.slice(0, 5)}–${block.end_time.slice(0, 5)}`} · Bloqueado
            </p>
            <p className="mt-1 break-words font-semibold">{block.reason}</p>
            <p className="mt-1 text-sm">{block.read_only ? "Google Calendar" : "Bloqueo del panel"} · {block.staff_member_id ? staff.find((member) => member.id === block.staff_member_id)?.fullName || "Profesional" : "Todo el local"}</p>
            {block.read_only && (
              <a className="mt-3 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={`https://calendar.google.com/calendar/r/day/${block.block_date.replaceAll("-", "/")}`} target="_blank" rel="noopener noreferrer">
                Ver evento en Google Calendar
              </a>
            )}
          </div>
        ))}
      </div>
      {appointments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          {blocks.length ? "No hay turnos cargados. Los horarios indicados arriba están bloqueados." : "No hay turnos ni atenciones cargadas para este día."}
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
                data-status={history ? "history" : entry.status}
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
