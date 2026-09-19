"use strict";
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
module.exports = async function ({ app, call, token, password }) {
  const get = async (who = token) => {
    const r = await call("/backoffice/notifications", { token: who });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body;
  };
  assert.equal((await call("/backoffice/notifications")).status, 403);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
  const plan = await call("/backoffice/finance/plan", {
    token,
    method: "POST",
    headers: { "Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      title: "Aviso de alquiler",
      category: "Local",
      amount: 123.45,
      dueDay: Number(today.slice(8)),
      month: today.slice(0, 7),
      recurrence: "once",
    }),
  });
  assert.equal(plan.status, 200, JSON.stringify(plan.body));
  const source = (await get()).alerts.find(
    (a) => a.title === "Aviso de alquiler",
  );
  assert.ok(source);
  assert.equal(source.readAt, null);
  const mark = async (revision = source.revision, read = true) =>
    call("/backoffice/notifications/read", {
      token,
      method: "PATCH",
      body: JSON.stringify({ read, items: [{ id: source.id, revision }] }),
    });
  assert.equal((await mark()).body.updated, 1);
  assert.ok((await get()).alerts.find((a) => a.id === source.id).readAt);
  assert.equal(
    (await mark("0".repeat(64))).body.updated,
    0,
    "stale browser cannot acknowledge a newer alert",
  );
  const initial = await app.db
    .query("plugin::users-permissions.user")
    .findOne({ where: { email: "initial@example.test" } });
  const otherToken = app
    .plugin("users-permissions")
    .service("jwt")
    .issue({ id: initial.id });
  assert.equal(
    (await get(otherToken)).alerts.find((a) => a.id === source.id).readAt,
    null,
    "read receipts belong to each manager",
  );
  assert.equal((await mark(source.revision, false)).body.updated, 1);
  assert.equal(
    (await get()).alerts.find((a) => a.id === source.id).readAt,
    null,
  );
  await mark();
  const edited = await call("/backoffice/finance/edit-expense", {
    token,
    method: "POST",
    headers: { "Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      planId: plan.body.id,
      month: today.slice(0, 7),
      expectedAmountCents: 12345,
      expectedDueDate: today,
      amount: 150.5,
      dueDate: today,
    }),
  });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  const changed = (await get()).alerts.find((a) => a.id === source.id);
  assert.equal(changed.amount, 150.5);
  assert.equal(
    changed.readAt,
    null,
    "a changed amount must be unseen even after acknowledgement",
  );
  assert.notEqual(changed.revision, source.revision);
  const email = await call("/backoffice/notifications/email", { token });
  assert.equal(email.status, 200);
  assert.equal(email.body.enabled, false);
  const { runDigest } = require("../src/domain/notification-digest");
  const mailEnv = {
    NOTIFICATION_EMAIL_ENABLED: "true",
    CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
    CLOUDFLARE_EMAIL_API_TOKEN: "isolated-test-token",
    NOTIFICATION_EMAIL_FROM: "info@example.test",
    NOTIFICATION_EMAIL_TO: "owner@example.test",
    PANEL_ORIGIN: "https://example.test",
  };
  const previousEnv = Object.fromEntries(
    Object.keys(mailEnv).map((k) => [k, process.env[k]]),
  );
  try {
    Object.assign(process.env, mailEnv);
    let calls = 0;
    const now = new Date(today + "T15:00:00Z");
    const sender = async () => {
      calls++;
      return { status: "unknown", error: "Simulated timeout" };
    };
    await Promise.all([
      runDigest(app, { now, sender }),
      runDigest(app, { now, sender }),
    ]);
    await runDigest(app, { now, sender });
    assert.equal(
      calls,
      1,
      "concurrent runs and ambiguous delivery never resend the same daily digest",
    );
    const deliveries = await app.db
      .query("api::notification-delivery.notification-delivery")
      .findMany({ where: { date: today } });
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].status, "unknown");
  } finally {
    for (const [k, v] of Object.entries(previousEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
  const { rotateAccess } = require("../src/domain/rotate-access");
  const panelPassword = randomBytes(24).toString("hex"),
    adminPassword = randomBytes(24).toString("hex");
  await rotateAccess(app, {
    oldEmail: "initial@example.test",
    email: "info@example.test",
    panelPassword,
    adminPassword,
  });
  assert.equal(
    (await call("/backoffice/session", { token: otherToken })).status,
    403,
    "old JWT revoked by disabled account",
  );
  assert.equal(
    (
      await call("/auth/local", {
        method: "POST",
        body: JSON.stringify({ identifier: "initial@example.test", password }),
      })
    ).status,
    400,
  );
  const login = await call("/auth/local", {
    method: "POST",
    body: JSON.stringify({
      identifier: "info@example.test",
      password: panelPassword,
    }),
  });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  assert.equal(
    (await call("/backoffice/session", { token: login.body.jwt })).status,
    200,
  );
  const admin = await app.db
    .query("admin::user")
    .findOne({ where: { email: "info@example.test" }, populate: ["roles"] });
  assert.ok(
    admin.isActive && admin.roles.some((r) => r.code === "strapi-super-admin"),
  );
  assert.equal(
    await app.admin.services.auth.validatePassword(
      adminPassword,
      admin.password,
    ),
    true,
  );
  const operator = require("node:child_process").spawnSync(
    process.execPath,
    ["scripts/rotate-access.js", "--apply"],
    {
      windowsHide: true,
      encoding: "utf8",
      timeout: 60000,
      input: JSON.stringify({
        oldEmail: "info@example.test",
        email: "operator@example.test",
        panelPassword: randomBytes(24).toString("hex"),
        adminPassword: randomBytes(24).toString("hex"),
      }),
    },
  );
  assert.equal(
    operator.status,
    0,
    `Operator must exit cleanly after committing: ${operator.stderr}`,
  );
  assert.ok(operator.stdout.includes('"previousAccountsDisabled":true'));
  console.log(
    "PASS notifications: persisted read/unread, per-user isolation, updated amounts become unseen, stale revision protection, exactly-once digest claim and credential rotation/revocation.",
  );
};
