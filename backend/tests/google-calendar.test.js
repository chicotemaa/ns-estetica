"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const m = require("../src/domain/google-calendar-model");
const zone = "America/Argentina/Buenos_Aires";
test("OAuth configuration requires a fixed callback and a separate encryption key", () => {
  const env = {
    GOOGLE_CALENDAR_CLIENT_ID: "fixture",
    GOOGLE_CALENDAR_CLIENT_SECRET: "fixture",
    GOOGLE_CALENDAR_REDIRECT_URI:
      "https://example.test/api/google-calendar/callback",
    GOOGLE_CALENDAR_ENCRYPTION_KEY: "ab".repeat(32),
    NODE_ENV: "production",
  };
  assert.equal(m.configuration(env).ready, true);
  assert.equal(
    m.configuration({
      ...env,
      GOOGLE_CALENDAR_REDIRECT_URI:
        "http://example.test/api/google-calendar/callback",
    }).ready,
    false,
  );
  assert.equal(
    m.configuration({ ...env, GOOGLE_CALENDAR_ENCRYPTION_KEY: "short" }).ready,
    false,
  );
});
test("encrypted refresh credentials authenticate ciphertext", () => {
  const key = "ab".repeat(32),
    encrypted = m.seal({ refresh_token: "fake-refresh" }, key);
  assert.ok(!encrypted.includes("fake-refresh"));
  assert.deepEqual(m.unseal(encrypted, key), { refresh_token: "fake-refresh" });
  assert.throws(() => m.unseal(encrypted, "cd".repeat(32)));
});
test("incoming moves respect business timezone and reject all-day and recurring appointments", () => {
  const event = {
    start: { dateTime: "2026-10-15T15:00:00Z" },
    end: { dateTime: "2026-10-15T15:45:00Z" },
  };
  assert.deepEqual(m.movedAppointment(event, zone), {
    appointment_date: "2026-10-15",
    appointment_time: "12:00",
    duration_snapshot: 45,
  });
  assert.deepEqual(m.movedAppointment({ status: "cancelled" }, zone), {
    status: "cancelled",
  });
  assert.throws(() =>
    m.movedAppointment({ ...event, recurrence: ["RRULE:FREQ=DAILY"] }, zone),
  );
  assert.throws(() =>
    m.movedAppointment(
      { start: { date: "2026-10-15" }, end: { date: "2026-10-16" } },
      zone,
    ),
  );
});
test("busy intervals split days, respect exclusive all-day end and omit private details", () => {
  const events = [
    {
      id: "private",
      summary: "SECRET",
      start: { date: "2026-10-15" },
      end: { date: "2026-10-17" },
    },
    {
      id: "overnight",
      start: { dateTime: "2026-10-18T23:00:00-03:00" },
      end: { dateTime: "2026-10-19T01:00:00-03:00" },
    },
    {
      id: "free",
      transparency: "transparent",
      start: { date: "2026-10-15" },
      end: { date: "2026-10-16" },
    },
  ];
  const blocks = m.busyBlocks(events, zone, "2026-10-01", "2026-11-01");
  assert.equal(blocks.length, 4);
  assert.deepEqual(
    blocks.map((b) => [b.block_date, b.start_time, b.end_time]),
    [
      ["2026-10-15", "00:00", "24:00"],
      ["2026-10-16", "00:00", "24:00"],
      ["2026-10-18", "23:00", "24:00"],
      ["2026-10-19", "00:00", "01:00"],
    ],
  );
  assert.ok(!JSON.stringify(blocks).includes("SECRET"));
});
test("export only shares appointment title and schedule, not contact, notes or price", () => {
  const row = {
    customer_name: "Cliente ficticio",
    service_name_snapshot: "Servicio ficticio",
    appointment_date: "2026-10-15",
    appointment_time: "14:00",
    duration_snapshot: 45,
    notes: "PRIVATE",
    customer_email: "private@example.test",
    price_snapshot: 100,
  };
  const e = m.localEvent("appointment", row, zone);
  assert.equal(e.end.dateTime, "2026-10-15T14:45:00");
  assert.equal(e.visibility, "private");
  assert.ok(!JSON.stringify(e).includes("PRIVATE"));
  assert.deepEqual(
    m.localEvent("appointment", { ...row, deleted_at: "2026-10-01" }, zone),
    { cancelled: true },
  );
});
