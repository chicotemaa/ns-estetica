"use strict";
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
module.exports = async ({
  app,
  call,
  customerCall,
  managerToken,
  token,
  business,
  input,
  oldKey,
}) => {
  const config = require("../src/domain/customer-config");
  const online = require("../src/domain/online-booking");
  const current = (
    await call("/backoffice/online-booking", { token: managerToken })
  ).body;
  const draft = {
    revision: current.revision,
    requested: true,
    depositPercent: 30,
    holdMinutes: 20,
    googleEnabled: true,
    googleClientId: "updated.apps.googleusercontent.com",
    mode: "test",
    collectorId: "123",
    cloudflareAccountId: "a".repeat(32),
    senderEmail: "salon@example.test",
    credentials: {
      mercadoPagoToken: "TEST-SAVED-TOKEN",
      mercadoPagoWebhookSecret: "TEST-SAVED-WEBHOOK",
      cloudflareEmailToken: "TEST-SAVED-EMAIL",
    },
  };
  const save = (body, auth = managerToken) =>
    call("/backoffice/online-booking", {
      token: auth,
      method: "PUT",
      body: JSON.stringify(body),
    });
  assert.equal((await save(draft, token)).status, 403);
  assert.equal((await save(draft, "")).status, 403);
  assert.equal((await save({ ...draft, depositPercent: 0 })).status, 400);
  assert.equal((await save({ ...draft, depositPercent: 100.5 })).status, 400);
  assert.equal(
    (
      await save({
        ...draft,
        credentials: { CUSTOMER_PROXY_SECRET: "attacker-key" },
      })
    ).status,
    400,
  );
  assert.equal(
    (await save({ ...draft, googleClientId: "https://wrong.example.test" }))
      .status,
    400,
  );
  let saved = await save(draft);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.depositPercent, 30);
  assert.equal(saved.body.googleEnabled, true);
  assert.equal(saved.body.credentials.mercadoPagoToken, true);
  assert.equal(saved.body.revision, 1);
  assert.ok(!JSON.stringify(saved.body).includes("TEST-SAVED"));
  assert.equal(
    (await save(draft)).status,
    400,
    "stale edits cannot overwrite newer settings",
  );
  const stored = await app.db
    .query("api::business.business")
    .findOne({ where: { id: business.id } });
  assert.ok(
    !JSON.stringify(stored.online_booking_secrets).includes("TEST-SAVED"),
  );
  assert.equal(
    (await config.resolveConfiguration(app, business.id)).MP_ACCESS_TOKEN,
    "TEST-SAVED-TOKEN",
  );
  const another = await app
    .documents("api::business.business")
    .create({ data: { name: "Separate settings", slug: "separate-settings" } });
  assert.equal(
    (await config.resolveConfiguration(app, another.id)).depositPercent,
    50,
  );
  const catalog = await call("/public/customer-fixture/catalog");
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.onlineBooking.depositPercent, 30);
  assert.ok(!JSON.stringify(catalog.body).includes("TEST-SAVED"));
  assert.equal((await customerCall("config")).body.depositPercent, 30);
  const retained = await customerCall("bookings", {
    method: "POST",
    token,
    headers: { "Idempotency-Key": oldKey },
    body: JSON.stringify(input),
  });
  assert.equal(retained.status, 200);
  assert.equal(retained.body.depositCents, 1300000);
  assert.equal(retained.body.depositPercent, 50);
  const oldPolicy = await customerCall("bookings", {
    method: "POST",
    token,
    headers: { "Idempotency-Key": randomUUID() },
    body: JSON.stringify({ ...input, appointmentTime: "15:00" }),
  });
  assert.equal(oldPolicy.status, 400);
  const previousFetch = global.fetch;
  try {
    global.fetch = async (url, options) => {
      if (String(url) === "https://api.mercadopago.com/checkout/preferences") {
        assert.equal(options.headers.Authorization, "Bearer TEST-SAVED-TOKEN");
        const body = JSON.parse(options.body);
        assert.equal(body.items[0].unit_price, 7800);
        assert.match(body.items[0].title, /Seña 30%/);
        return Response.json({
          id: "saved-settings",
          init_point:
            "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=saved-settings",
        });
      }
      if (String(url).startsWith("https://api.cloudflare.com/"))
        assert.equal(options.headers.Authorization, "Bearer TEST-SAVED-EMAIL");
      return previousFetch(url, options);
    };
    const fresh = await customerCall("bookings", {
      method: "POST",
      token,
      headers: { "Idempotency-Key": randomUUID() },
      body: JSON.stringify({
        ...input,
        appointmentTime: "15:00",
        policyVersion: catalog.body.onlineBooking.policyVersion,
      }),
    });
    assert.equal(fresh.status, 200, JSON.stringify(fresh.body));
    assert.equal(fresh.body.depositCents, 780000);
    assert.equal(fresh.body.depositPercent, 30);
    const pending = await app.db
      .query(online.INTENT)
      .findOne({ where: { key: fresh.body.id } });
    assert.equal(pending.deposit_percent, 30);
    assert.equal(
      (
        await customerCall("challenge", {
          method: "POST",
          body: JSON.stringify({
            kind: "email",
            email: "settings@example.test",
          }),
        })
      ).status,
      200,
    );
  } finally {
    global.fetch = previousFetch;
  }
  const { credentials, ...noSecrets } = draft;
  saved = await save({
    ...noSecrets,
    revision: 1,
    requested: false,
    googleEnabled: false,
    credentials: { mercadoPagoToken: "" },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.enabled, false);
  assert.equal(
    (await config.resolveConfiguration(app, business.id)).MP_ACCESS_TOKEN,
    credentials.mercadoPagoToken,
  );
  assert.equal(
    (
      await customerCall("challenge", {
        method: "POST",
        body: JSON.stringify({ kind: "google" }),
      })
    ).status,
    400,
  );
  saved = await save({
    ...noSecrets,
    revision: 2,
    requested: false,
    googleEnabled: true,
  });
  assert.equal(saved.status, 200);
  assert.equal(
    (
      await customerCall("challenge", {
        method: "POST",
        body: JSON.stringify({ kind: "google" }),
      })
    ).status,
    200,
    "Google does not depend on paid bookings being enabled",
  );
  assert.equal(
    (await save({ ...noSecrets, revision: 3, mode: "production" })).status,
    400,
    "merchant mode cannot invalidate existing payments",
  );
  assert.equal(
    (await customerCall("bookings/" + oldKey, { token })).status,
    200,
  );
  console.log(
    "PASS editable booking settings: authorization, encrypted storage, secret preservation, revision conflicts, public config, frozen deposits, dynamic MP amounts and independent Google access.",
  );
};
