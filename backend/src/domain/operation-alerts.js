"use strict";
const { createHash } = require("node:crypto");
const KINDS = ["pending", "today", "close", "balance", "expense", "payroll"];
const revision = (alert) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        alert.id,
        alert.title,
        alert.detail,
        alert.date,
        alert.time || "",
        alert.amount ?? null,
      ]),
    )
    .digest("hex");

// Monetary comparisons use cents. Imported amounts without verified collection
// must never become a collectible balance.
function operationAlerts({
  appointments,
  payments,
  workRecords,
  timeZone,
  now = new Date(),
}) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const nowLocal = `${today}T${time}`;
  const alerts = [];
  const paid = new Map(),
    collected = new Map();
  for (const p of payments) {
    if (p.status !== "completed") continue;
    for (const [key, map] of [
      [p.appointment_id, paid],
      [p.work_record_id, collected],
    ])
      if (key)
        map.set(
          String(key),
          (map.get(String(key)) || 0) + Math.round(Number(p.amount) * 100),
        );
  }
  for (const a of appointments) {
    const start = `${a.appointment_date}T${a.appointment_time.slice(0, 5)}`;
    const base = {
      title: a.customer_name,
      detail: a.service_name_snapshot,
      date: a.appointment_date,
      time: a.appointment_time.slice(0, 5),
      href: `/dashboard/appointments?${new URLSearchParams({ appointment: a.id, date: a.appointment_date })}`,
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
            ? `${base.detail} · La fecha solicitada ya pasó; revisá su estado.`
            : base.detail,
      });
    if (a.status === "confirmed") {
      const end = new Date(
        new Date(`${start}:00Z`).getTime() +
          Number(a.duration_snapshot) * 60000,
      )
        .toISOString()
        .slice(0, 16);
      if (end <= nowLocal)
        alerts.push({
          ...base,
          id: `close:${a.id}`,
          kind: "close",
          action: "Cerrar atención",
          priority: 1,
        });
      else if (a.appointment_date === today)
        alerts.push({
          ...base,
          id: `today:${a.id}`,
          kind: "today",
          action: "Ver turno",
          priority: 2,
          detail:
            start <= nowLocal
              ? `${base.detail} · En horario de atención`
              : base.detail,
        });
    }
    if (a.status === "completed") {
      const balance = Math.max(
        0,
        Math.round(Number(a.checkout_total ?? a.price_snapshot) * 100) -
          (paid.get(String(a.id)) || 0),
      );
      if (balance)
        alerts.push({
          ...base,
          id: `balance:appointment:${a.id}`,
          kind: "balance",
          amount: balance / 100,
          action: "Cobrar saldo",
          priority: 3,
        });
    }
  }
  for (const w of workRecords) {
    if (!w.collection_verified) continue;
    const balance = Math.max(
      0,
      Math.round(Number(w.amount) * 100) - (collected.get(String(w.id)) || 0),
    );
    if (balance)
      alerts.push({
        id: `balance:work:${w.id}`,
        kind: "balance",
        title: w.customer_name,
        detail: w.service_name,
        date: w.work_date,
        amount: balance / 100,
        action: "Cobrar saldo",
        priority: 3,
        href: `/dashboard/atenciones?${new URLSearchParams({ month: w.work_date.slice(0, 7), q: w.customer_name })}`,
      });
  }
  return { alerts, today };
}
module.exports = { operationAlerts, revision, KINDS };
