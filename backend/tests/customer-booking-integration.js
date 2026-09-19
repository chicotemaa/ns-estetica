"use strict";
const assert = require("node:assert/strict");
const { randomUUID, createHmac } = require("node:crypto");
module.exports = async function customerIntegration(app, call, managerToken) {
  const originalEnv = { ...process.env },
    originalFetch = global.fetch;
  const auth = require("../src/domain/customer-auth"),
    online = require("../src/domain/online-booking"),
    { locked, schedule, choices } = require("../src/domain/booking");
  let latestCode,
    preferenceCalls = 0;
  const providerPayments = new Map();
  Object.assign(process.env, {
    CUSTOMER_BOOKING_ENABLED: "true",
    CUSTOMER_PROXY_SECRET: "test-proxy-".repeat(4),
    CUSTOMER_AUTH_SECRET: "test-auth-".repeat(4),
    CUSTOMER_SITE_URL: "http://127.0.0.1:5173",
    MP_MODE: "test",
    MP_ACCESS_TOKEN: "TEST-FIXTURE",
    MP_COLLECTOR_ID: "123",
    MP_WEBHOOK_SECRET: "test-webhook",
    CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
    CLOUDFLARE_EMAIL_API_TOKEN: "TEST-EMAIL",
    NOTIFICATION_EMAIL_FROM: "salon@example.test",
    GOOGLE_CLIENT_ID: "fixture.apps.googleusercontent.com",
  });
  global.fetch = async (url, options) => {
    if (String(url).startsWith("https://api.cloudflare.com/")) {
      const body = JSON.parse(options.body);
      latestCode = body.text.match(/\b\d{6}\b/)?.[0];
      if (process.argv.includes("--customer-preview") && latestCode)
        require("node:fs").writeFileSync(
          ".tmp/customer-preview-code.local",
          JSON.stringify({ email: body.to, code: latestCode }),
        );
      return Response.json({ success: true, result: { queued: [body.to] } });
    }
    if (String(url) === "https://api.mercadopago.com/checkout/preferences") {
      preferenceCalls++;
      const body = JSON.parse(options.body);
      assert.equal(body.items[0].currency_id, "ARS");
      assert.equal(body.items[0].unit_price, 13000);
      return Response.json({
        id: "preference-" + preferenceCalls,
        init_point:
          "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=" +
          preferenceCalls,
      });
    }
    if (String(url).startsWith("https://api.mercadopago.com/v1/payments/"))
      return Response.json(providerPayments.get(String(url).split("/").pop()));
    return originalFetch(url, options);
  };
  try {
    const business = await app
      .documents("api::business.business")
      .create({
        data: {
          name: "Customer fixture",
          slug: "customer-fixture",
          time_zone: "America/Argentina/Buenos_Aires",
        },
      });
    process.env.BUSINESS_SLUG = "customer-fixture";
    const service = await app
      .documents("api::service.service")
      .create({
        data: {
          business: business.id,
          name: "Corte fixture",
          price: 26000,
          duration_minutes: 40,
          is_active: true,
          booking_enabled: true,
        },
      });
    const staff = await app
      .documents("api::staff-member.staff-member")
      .create({
        data: {
          business: business.id,
          full_name: "Profesional fixture",
          is_active: true,
          accepts_bookings: true,
          collection_commission_rate: 50,
        },
      });
    for (let day = 0; day < 7; day++)
      await app
        .documents("api::business-hour.business-hour")
        .create({
          data: {
            business: business.id,
            day_of_week: day,
            label: String(day),
            is_open: true,
            open_time: "09:00:00.000",
            close_time: "20:00:00.000",
          },
        });
    await app
      .documents("api::booking-setting.booking-setting")
      .create({
        data: {
          business: business.id,
          slot_interval_minutes: 30,
          lead_time_minutes: 0,
          max_booking_days_in_advance: 30,
          buffer_between_appointments_minutes: 0,
        },
      });
    const proxy = { "X-Customer-Proxy-Key": process.env.CUSTOMER_PROXY_SECRET };
    const customerCall = (path, options = {}) =>
      call("/customer/" + path, {
        ...options,
        headers: { ...proxy, ...options.headers },
      });
    assert.equal((await call("/customer/me")).status, 403);
    assert.equal((await customerCall("me")).status, 401);
    let challenge = await customerCall("challenge", {
      method: "POST",
      body: JSON.stringify({ kind: "email", email: "customer@example.test" }),
    });
    assert.equal(challenge.status, 200, JSON.stringify(challenge.body));
    assert.ok(latestCode);
    const code = latestCode;
    const wrong = await customerCall("verify", {
      method: "POST",
      body: JSON.stringify({
        kind: "email",
        challengeId: challenge.body.challengeId,
        code: "000000",
      }),
    });
    assert.equal(wrong.status, 400);
    let login = await customerCall("verify", {
      method: "POST",
      body: JSON.stringify({
        kind: "email",
        challengeId: challenge.body.challengeId,
        code,
      }),
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    const token = login.body.sessionToken;
    assert.ok(token);
    assert.equal((await call("/backoffice/session", { token })).status, 403);
    assert.equal(
      (
        await customerCall("verify", {
          method: "POST",
          body: JSON.stringify({
            kind: "email",
            challengeId: challenge.body.challengeId,
            code,
          }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await customerCall("profile", {
          method: "PUT",
          token,
          body: JSON.stringify({ name: "Cliente fixture", phone: "@client" }),
        })
      ).status,
      400,
    );
    const profile = await customerCall("profile", {
      method: "PUT",
      token,
      body: JSON.stringify({ name: "Cliente fixture", phone: "3621234567" }),
    });
    assert.equal(profile.status, 200);
    const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const input = {
      serviceId: String(service.id),
      staffMemberId: String(staff.id),
      appointmentDate: date,
      appointmentTime: "10:00",
      notes: "Prueba de reserva",
      expectedTotalCents: 2600000,
      acceptPolicy: true,
      policyVersion: require("../src/domain/customer-config").POLICY_VERSION,
    };
    assert.equal(
      (
        await call("/public/customer-fixture/bookings", {
          method: "POST",
          headers: { "Idempotency-Key": randomUUID() },
          body: "{}",
        })
      ).status,
      401,
    );
    const key = randomUUID();
    const start = await customerCall("bookings", {
      method: "POST",
      token,
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(input),
    });
    assert.equal(start.status, 200, JSON.stringify(start.body));
    assert.equal(start.body.status, "awaiting_payment");
    const replay = await customerCall("bookings", {
      method: "POST",
      token,
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(input),
    });
    assert.equal(replay.body.id, key);
    assert.equal(preferenceCalls, 1);
    const state = await schedule(app, business.id, date);
    assert.ok(
      !choices(state, date, String(service.id))[0].slots.includes("10:00"),
    );
    const overlap = await customerCall("bookings", {
      method: "POST",
      token,
      headers: { "Idempotency-Key": randomUUID() },
      body: JSON.stringify(input),
    });
    assert.equal(overlap.status, 400);
    const db = app.db.query(online.INTENT),
      intent = await db.findOne({ where: { key } });
    assert.equal(
      await app.db
        .query("api::appointment.appointment")
        .count({ where: { business: { id: business.id } } }),
      0,
    );
    const payment = {
      id: 901,
      collector_id: 123,
      currency_id: "ARS",
      live_mode: false,
      transaction_amount: 13000,
      transaction_amount_refunded: 0,
      status: "approved",
      external_reference: intent.reference,
      date_last_updated: new Date().toISOString(),
      date_approved: new Date().toISOString(),
    };
    providerPayments.set("901", payment);
    const ts = Date.now(),
      requestId = randomUUID(),
      signature = createHmac("sha256", process.env.MP_WEBHOOK_SECRET)
        .update(`id:901;request-id:${requestId};ts:${ts};`)
        .digest("hex");
    const hookOptions = {
      method: "POST",
      headers: {
        "x-request-id": requestId,
        "x-signature": `ts=${ts},v1=${signature}`,
      },
      body: JSON.stringify({ type: "payment", data: { id: "901" } }),
    };
    const forged = await call(
      "/payments/mercado-pago/webhook?data.id=902",
      hookOptions,
    );
    assert.equal(forged.status, 401);
    const paid = await call(
      "/payments/mercado-pago/webhook?data.id=901",
      hookOptions,
    );
    assert.equal(paid.status, 200, JSON.stringify(paid.body));
    assert.equal(paid.body.confirmed, true);
    assert.equal(
      (await call("/payments/mercado-pago/webhook?data.id=901", hookOptions))
        .body.replayed,
      true,
    );
    const confirmed = await customerCall("bookings/" + key, { token });
    assert.equal(confirmed.body.status, "confirmed");
    assert.equal(confirmed.body.paidCents, 1300000);
    assert.equal(confirmed.body.balanceCents, 1300000);
    const ledger = await app.db
      .query("api::payment.payment")
      .findMany({ where: { business: { id: business.id } } });
    assert.equal(ledger.length, 1);
    assert.equal(Number(ledger[0].commission_amount), 6500);
    const checkout = await call(
      "/backoffice/appointments/" + confirmed.body.appointmentId + "/checkout",
      { token: managerToken },
    );
    assert.equal(checkout.status, 200);
    assert.equal(checkout.body.balanceCents, 1300000);
    const messages = app.db.query("api::customer-message.customer-message");
    assert.equal(await messages.count({ where: { intent_id: intent.id } }), 1);
    await require("../src/domain/customer-mail").drainMessages(
      app,
      business.id,
    );
    assert.equal(
      (await messages.findOne({ where: { intent_id: intent.id } })).status,
      "sent",
    );
    const cancelled = await customerCall("bookings/" + key + "/cancel", {
      method: "POST",
      token,
      body: "{}",
    });
    assert.equal(cancelled.status, 200);
    assert.equal(
      (await customerCall("bookings/" + key, { token })).body.status,
      "cancelled",
    );
    assert.equal(
      (
        await app.db
          .query("api::payment.payment")
          .findOne({ where: { id: ledger[0].id } })
      ).status,
      "completed",
    );
    const secondKey = randomUUID();
    const second = await customerCall("bookings", {
      method: "POST",
      token,
      headers: { "Idempotency-Key": secondKey },
      body: JSON.stringify({ ...input, appointmentTime: "11:00" }),
    });
    assert.equal(second.status, 200);
    const secondIntent = await db.findOne({ where: { key: secondKey } });
    await db.update({
      where: { id: secondIntent.id },
      data: { expires_at: new Date(Date.now() - 1000).toISOString() },
    });
    assert.ok(
      choices(
        await schedule(app, business.id, date),
        date,
        String(service.id),
      )[0].slots.includes("11:00"),
    );
    assert.equal(
      (
        await online.receivePayment(app, business, {
          ...payment,
          id: 902,
          external_reference: secondIntent.reference,
        })
      ).review,
      true,
    );
    assert.equal(
      await app.db
        .query("api::appointment.appointment")
        .count({ where: { business: { id: business.id } } }),
      1,
    );
    assert.equal(
      (await call("/backoffice/online-booking", { token: managerToken })).body
        .paymentReviews.length,
      1,
    );
    const googleChallenge = await auth.challenge(app, business.id, "google");
    const googleLogin = await auth.finish(
      app,
      business.id,
      {
        kind: "google",
        challengeId: googleChallenge.challengeId,
        credential: "fixture",
      },
      async () => ({
        sub: "google-fixture",
        email: "google@gmail.com",
        email_verified: true,
        nonce: googleChallenge.nonce,
        name: "Google fixture",
      }),
    );
    assert.notEqual(googleLogin.account.id, login.body.account.id);
    assert.equal(
      (
        await customerCall("bookings/" + key, {
          token: googleLogin.sessionToken,
        })
      ).status,
      404,
    );
    await require("./customer-settings-integration")({ app, call, customerCall, managerToken, token, business, input, oldKey: key });
    await auth.logout(app, token);
    assert.equal((await customerCall("me", { token })).status, 401);
    if (process.argv.includes("--customer-preview")) {
      process.env.GOOGLE_CLIENT_ID = "";
      console.log(
        "Customer preview backend ready; provider calls are simulated in this disposable database.",
      );
      await new Promise((resolve) => setTimeout(resolve, 300000));
    }
    console.log(
      "PASS customer accounts: email OTP, replay denial, Google nonce, profile, isolated sessions; booking holds, MP signatures, single collection, commission, email, cancellation and late-payment review.",
    );
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env))
      if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
};
