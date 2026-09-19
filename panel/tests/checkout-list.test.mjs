import test from "node:test";
import assert from "node:assert/strict";
import { buildHistoricalAgendaEntries } from "../lib/agenda-history.ts";
import { filterCheckoutEntries } from "../lib/checkout-list.ts";

const works = ["Primera visita", "Segunda visita"].map((customerName, index) => ({
  id: String(index + 721),
  workDate: "2026-08-10",
  customerName,
  customerId: null,
  serviceName: "CORTE Y BARBA",
  serviceId: null,
  staffName: "Profesional",
  staffMemberId: null,
  amount: 30000,
  notes: null,
  collectionVerified: true,
}));

test("reception includes services without an appointment or a time on the selected day", () => {
  const snapshot = structuredClone(works);
  const entries = buildHistoricalAgendaEntries(works, [], []);
  const rows = filterCheckoutEntries(entries, { date: "2026-08-10", today: "2026-09-15" });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => [row.appointmentDate, row.appointmentTime, row.price]), [
    ["2026-08-10", "09:00", 30000],
    ["2026-08-10", "10:00", 30000],
  ]);
  assert.deepEqual(works, snapshot);
  const match = filterCheckoutEntries(entries, { query: " SEGUNDA ", today: "2026-09-15" });
  assert.deepEqual(match, [rows[1]]);
  assert.equal(filterCheckoutEntries(entries, { date: "2026-08-11", today: "2026-09-15" }).length, 0);
});

test("real appointments retain their identity, exact time and checkout status alongside history", () => {
  const appointment = {
    id: "721", // Same numeric ID in a different table must not hide either entry.
    channel: "manual",
    appointmentDate: "2026-08-10",
    appointmentTime: "09:30:00",
    durationMinutes: 30,
    customerName: "Reserva web",
    serviceName: "Corte",
    status: "confirmed",
    price: 12345,
  };
  const snapshot = structuredClone(appointment);
  const history = buildHistoricalAgendaEntries(works, [appointment], []);
  const entries = [appointment, ...history];
  const rows = filterCheckoutEntries(entries, { date: "2026-08-10", today: "2026-09-15" });
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map((row) => row.id)).size, 3);
  assert.deepEqual(rows[0], snapshot);
  assert.deepEqual(history.map((row) => row.appointmentTime), ["10:00", "11:00"]);
  assert.deepEqual(appointment, snapshot);
});
