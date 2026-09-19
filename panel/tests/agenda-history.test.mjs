import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHistoricalAgendaEntries,
  getAgendaEventTiming,
  isHistoricalEntry,
  matchesAgendaSource,
} from "../lib/agenda-history.ts";

const work = (id, extra = {}) => ({
  id: String(id),
  workDate: "2026-01-05",
  customerName: "Cliente",
  customerId: null,
  serviceName: "Servicio original",
  serviceId: null,
  staffName: null,
  staffMemberId: null,
  amount: 1234.56,
  notes: null,
  sourceRef: null,
  collectionVerified: false,
  ...extra,
});
const hours = [
  {
    dayOfWeek: 1,
    isOpen: true,
    openTime: "09:00:00",
    closeTime: "18:00:00",
    breakStartTime: "13:00:00",
    breakEndTime: "14:00:00",
  },
];

test("every database service keeps its date, amount and identity, including unlinked records and repeat visits", () => {
  const works = Array.from({ length: 763 }, (_, i) => work(i + 1));
  const snapshot = structuredClone(works);
  const entries = buildHistoricalAgendaEntries(works, [], hours);
  assert.equal(entries.length, 763);
  assert.equal(new Set(entries.map((e) => e.id)).size, 763);
  assert.ok(
    entries.every(
      (e) =>
        e.appointmentDate === "2026-01-05" &&
        e.price === 1234.56 &&
        e.status === "completed" &&
        e.channel === "history",
    ),
  );
  assert.deepEqual(works, snapshot);
  assert.ok(
    entries.every(
      (e) => /^(?:[01]\d|2[0-3]):00$/.test(e.appointmentTime) && e.durationMinutes === 60,
    ),
  );
});

test("visual times are stable by database ID, do not depend on query order, and deduplicate IDs only", () => {
  const works = [work(10), work(2), work(3)];
  const first = buildHistoricalAgendaEntries(works, [], hours);
  assert.deepEqual(
    first,
    buildHistoricalAgendaEntries([...works].reverse(), [], hours),
  );
  assert.deepEqual(
    first.map((e) => e.appointmentTime),
    ["09:00", "10:00", "11:00"],
  );
  assert.equal(
    buildHistoricalAgendaEntries([...works, works[0]], [], hours).length,
    3,
  );
  const added = buildHistoricalAgendaEntries([...works, work(20)], [], hours);
  assert.deepEqual(added.slice(0, 3), first);
});

test("placements avoid real reservations and breaks, without shifting a real reservation or hiding historical work", () => {
  const appointment = {
    id: "2",
    appointmentDate: "2026-01-05",
    appointmentTime: "09:00",
    durationMinutes: 60,
    channel: "manual",
    status: "confirmed",
  };
  const snapshot = structuredClone(appointment);
  const entries = buildHistoricalAgendaEntries(
    Array.from({ length: 4 }, (_, i) => work(i)),
    [appointment],
    hours,
  );
  assert.equal(entries[0].appointmentTime, "10:00");
  assert.deepEqual(entries.map((e) => e.appointmentTime), ["10:00", "11:00", "12:00", "14:00"]);
  assert.ok(
    entries.every(
      (e) => e.appointmentTime < "13:00" || e.appointmentTime >= "14:00",
    ),
  );
  assert.deepEqual(appointment, snapshot);
  assert.equal(entries.find((e) => e.workRecord.id === "2").id, "history:2");
  assert.equal(
    buildHistoricalAgendaEntries(
      [work(1)],
      [{ ...appointment, durationMinutes: 540 }],
      hours,
    ).length,
    1,
  );
});

test("closed days and changed business hours still show work on its original date", () => {
  const entries = buildHistoricalAgendaEntries(
    [work(1, { workDate: "2026-01-04" })],
    [],
    hours,
  );
  assert.equal(entries[0].appointmentTime, "09:00");
  assert.equal(entries[0].appointmentDate, "2026-01-04");
  assert.equal(
    buildHistoricalAgendaEntries(
      [work(1)],
      [],
      [{ ...hours[0], openTime: "18:00", closeTime: "09:00" }],
    )[0].appointmentTime,
    "09:00",
  );
});

test("history cannot be dragged/resized or gain booking buffer; source filters never change its estimated time", () => {
  const [entry] = buildHistoricalAgendaEntries([work(1)], [], hours);
  assert.equal(isHistoricalEntry(entry), true);
  assert.deepEqual(getAgendaEventTiming(entry, 15), {
    durationMinutes: 60,
    startEditable: false,
    durationEditable: false,
  });
  const appointment = { ...entry, channel: "manual" };
  assert.deepEqual(getAgendaEventTiming(appointment, 15), {
    durationMinutes: 75,
    startEditable: true,
    durationEditable: false,
  });
  assert.deepEqual(
    [appointment, entry].filter((e) => matchesAgendaSource(e, "history")),
    [entry],
  );
  assert.deepEqual(
    [appointment, entry].filter((e) => matchesAgendaSource(e, "appointments")),
    [appointment],
  );
  assert.equal(
    [appointment, entry].filter((e) => matchesAgendaSource(e, "all")).length,
    2,
  );
});

test("busy historical days extend the reference hours without stacking or changing the date", () => {
  const entries = buildHistoricalAgendaEntries(
    Array.from({ length: 14 }, (_, i) => work(i)),
    [],
    [{ ...hours[0], openTime: "11:00", closeTime: "22:00", breakStartTime: null, breakEndTime: null }],
  );
  assert.deepEqual(entries.map((e) => e.appointmentTime), Array.from({ length: 14 }, (_, i) => `${i + 10}:00`));
  assert.ok(entries.every((e) => e.appointmentDate === "2026-01-05"));
});
