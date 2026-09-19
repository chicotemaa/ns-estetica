"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const { operationAlerts, revision } = require("../src/domain/operation-alerts");
const {
  mailConfiguration,
  digestMessage,
  sendDigest,
} = require("../src/domain/cloudflare-mail");
const config = {
  enabled: true,
  from: "info@example.com",
  to: "owner@example.com",
  account: "a".repeat(32),
  token: "test",
  panel: "https://app.example.com",
};
test("alerts preserve checkout totals, real payments, timezone and verified historical balances", () => {
  const data = operationAlerts({
    timeZone: "America/Argentina/Buenos_Aires",
    now: new Date("2026-09-15T02:50:00Z"),
    appointments: [
      {
        id: "1",
        status: "completed",
        customer_name: "Cliente",
        service_name_snapshot: "Corte",
        appointment_date: "2026-09-14",
        appointment_time: "23:00:00",
        duration_snapshot: 30,
        checkout_total: 0.3,
        price_snapshot: 999,
      },
    ],
    payments: [
      { appointment_id: "1", amount: 0.1, status: "completed" },
      { appointment_id: "1", amount: 50, status: "pending" },
    ],
    workRecords: [{ id: "2", collection_verified: false, amount: 1000 }],
  });
  assert.equal(data.today, "2026-09-14");
  assert.equal(data.alerts.length, 1);
  assert.equal(data.alerts[0].amount, 0.2);
  assert.notEqual(
    revision(data.alerts[0]),
    revision({ ...data.alerts[0], amount: 0.1 }),
  );
});
test("mail remains disabled until explicit activation with valid configuration", () => {
  assert.equal(mailConfiguration({}).enabled, false);
  assert.equal(
    mailConfiguration({
      CLOUDFLARE_ACCOUNT_ID: config.account,
      CLOUDFLARE_EMAIL_API_TOKEN: "test",
      NOTIFICATION_EMAIL_FROM: config.from,
      NOTIFICATION_EMAIL_TO: config.to,
      PANEL_ORIGIN: config.panel,
    }).enabled,
    false,
  );
  assert.equal(
    mailConfiguration({
      CLOUDFLARE_ACCOUNT_ID: config.account,
      CLOUDFLARE_EMAIL_API_TOKEN: "test",
      NOTIFICATION_EMAIL_FROM: config.from,
      NOTIFICATION_EMAIL_TO: config.to,
      PANEL_ORIGIN: "http://bad.example",
      NOTIFICATION_EMAIL_ENABLED: "true",
    }).enabled,
    false,
  );
});
test("email escapes business text and keeps delivery separate from reading", async () => {
  const alerts = [
    {
      id: "expense:1",
      title: "<script>alert(1)</script>",
      detail: "A & B",
      date: "2026-09-14",
      href: "/dashboard/gastos",
      action: "Revisar",
    },
  ];
  assert.ok(
    !digestMessage(config, alerts, "2026-09-14").html.includes("<script>"),
  );
  const fetcher = async (_url, options) => {
    assert.equal(JSON.parse(options.body).to, config.to);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        result: { delivered: [], queued: [config.to] },
      }),
    };
  };
  assert.equal(
    (await sendDigest(config, alerts, "2026-09-14", fetcher)).status,
    "queued",
  );
  assert.equal(
    (
      await sendDigest(config, alerts, "2026-09-14", async () => {
        throw Error("timeout");
      })
    ).status,
    "unknown",
  );
});
