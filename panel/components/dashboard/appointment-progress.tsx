"use client";
import { Button } from "@/components/ui/button";
import type { AppointmentRecord } from "@/lib/business-shared";
import { useFinanceWrite } from "./finance-ui";
export function AppointmentProgress({
  appointment,
  timeZone,
}: {
  appointment: AppointmentRecord;
  timeZone: string;
}) {
  const write = useFinanceWrite(),
    today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  if (!["confirmed", "completed"].includes(appointment.status)) return null;
  const stage =
    appointment.status === "completed"
      ? "Atención finalizada"
      : appointment.startedAt
        ? "En atención"
        : appointment.arrivedAt
          ? "Cliente presente"
          : "Esperando llegada";
  const step = appointment.startedAt
    ? "finish"
    : appointment.arrivedAt
      ? "start"
      : "arrive";
  const label = {
    arrive: "Registrar llegada",
    start: "Iniciar atención",
    finish: "Finalizar atención",
  }[step];
  const timestamp =
    appointment.finishedAt || appointment.startedAt || appointment.arrivedAt;
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {stage}
          {timestamp && (
            <span className="ml-2 text-xs font-normal text-slate-500">
              {new Intl.DateTimeFormat("es-AR", {
                timeZone,
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(timestamp))}
            </span>
          )}
        </p>
        {appointment.status === "confirmed" &&
          appointment.appointmentDate === today && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={write.busy}
              onClick={() =>
                write.save("progress", { appointmentId: appointment.id, step })
              }
            >
              {write.busy ? "Guardando…" : label}
            </Button>
          )}
      </div>
      {write.feedback}
    </div>
  );
}
