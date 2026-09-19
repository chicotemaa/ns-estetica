import {
  getDateKeyInTimeZone,
  type AppointmentRecord,
  type PaymentRecord,
  type WorkRecord,
} from "./business-shared";
import { outstandingAppointments } from "./cash-metrics";
export type AlertKind =
  | "pending"
  | "today"
  | "close"
  | "balance"
  | "expense"
  | "payroll";
export const ALERT_LABELS: Record<AlertKind, string> = {
  pending: "Por confirmar",
  today: "Próximos de hoy",
  close: "Por cerrar",
  balance: "Saldos pendientes",
  expense: "Gastos por pagar",
  payroll: "Pagos al equipo",
};
export interface OperationAlert {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  date: string;
  time?: string;
  amount?: number;
  href: string;
  action: string;
  priority: number;
}
export function buildOperationAlerts({
  appointments,
  payments,
  workRecords = [],
  timeZone,
  now = new Date(),
}: {
  appointments: AppointmentRecord[];
  payments: PaymentRecord[];
  workRecords?: WorkRecord[];
  timeZone: string;
  now?: Date;
}) {
  const today = getDateKeyInTimeZone(timeZone, now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const nowLocal = `${today}T${time}`;
  const alerts: OperationAlert[] = [];
  const agendaLink = (a: AppointmentRecord) =>
    `/dashboard/appointments?${new URLSearchParams({ appointment: a.id, date: a.appointmentDate })}`;
  for (const a of appointments) {
    const start = `${a.appointmentDate}T${a.appointmentTime.slice(0, 5)}`;
    const base = {
      title: a.customerName,
      detail: a.serviceName,
      date: a.appointmentDate,
      time: a.appointmentTime.slice(0, 5),
      href: agendaLink(a),
    };
    if (a.status === "pending")
      alerts.push({
        ...base,
        id: `pending:${a.id}`,
        kind: "pending",
        action: "Revisar solicitud",
        priority: 0,
        detail:
          start < nowLocal
            ? `${a.serviceName} · La fecha solicitada ya pasó; revisá su estado.`
            : a.serviceName,
      });
    if (a.status === "confirmed") {
      const ends = new Date(
        new Date(`${start}:00Z`).getTime() + a.durationMinutes * 60000,
      )
        .toISOString()
        .slice(0, 16);
      if (ends <= nowLocal)
        alerts.push({
          ...base,
          id: `close:${a.id}`,
          kind: "close",
          action: "Cerrar atención",
          priority: 1,
        });
      else if (a.appointmentDate === today)
        alerts.push({
          ...base,
          id: `today:${a.id}`,
          kind: "today",
          action: "Ver turno",
          priority: 2,
          detail:
            start <= nowLocal
              ? `${a.serviceName} · En horario de atención`
              : a.serviceName,
        });
    }
  }
  for (const { appointment: a, balance } of outstandingAppointments(
    appointments,
    payments,
  ))
    alerts.push({
      id: `balance:appointment:${a.id}`,
      kind: "balance",
      title: a.customerName,
      detail: a.serviceName,
      date: a.appointmentDate,
      amount: balance,
      href: agendaLink(a),
      action: "Cobrar saldo",
      priority: 3,
    });
  const collected = new Map<string, number>();
  for (const p of payments)
    if (p.workRecordId && p.status === "completed")
      collected.set(
        p.workRecordId,
        (collected.get(p.workRecordId) || 0) + Math.round(p.amount * 100),
      );
  for (const w of workRecords) {
    if (!w.collectionVerified) continue;
    const balance =
      Math.max(0, Math.round(w.amount * 100) - (collected.get(w.id) || 0)) /
      100;
    if (balance > 0)
      alerts.push({
        id: `balance:work:${w.id}`,
        kind: "balance",
        title: w.customerName,
        detail: w.serviceName,
        date: w.workDate,
        amount: balance,
        href: `/dashboard/atenciones?${new URLSearchParams({ month: w.workDate.slice(0, 7), q: w.customerName })}`,
        action: "Cobrar saldo",
        priority: 3,
      });
  }
  alerts.sort(
    (a, b) =>
      a.priority - b.priority ||
      `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`) ||
      a.id.localeCompare(b.id),
  );
  const counts = {
    pending: 0,
    today: 0,
    close: 0,
    balance: 0,
    expense: 0,
    payroll: 0,
  };
  for (const alert of alerts) counts[alert.kind]++;
  return {
    alerts,
    counts,
    attentionCount: counts.pending + counts.close + counts.balance,
    today,
    updatedAt: now.toISOString(),
  };
}
