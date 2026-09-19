const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const { configuration } = require("../src/domain/customer-config");
const { profile, emailAddress } = require("../src/domain/customer-auth");
const {
  depositCents,
  canCancel,
  appointmentInstant,
} = require("../src/domain/online-booking");
const {
  verifySignature,
  validCheckoutUrl,
} = require("../src/domain/mercado-pago");
test("stored credentials are authenticated, bound to their business and encrypted with the server key", () => {
  const { encrypt, decrypt } = require("../src/domain/customer-settings");
  const original = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = "test-encryption-key-".repeat(3);
  try {
    const saved = encrypt("fake-provider-secret", 1, "mercadoPagoToken");
    assert.ok(!JSON.stringify(saved).includes("fake-provider-secret"));
    assert.equal(decrypt(saved, 1, "mercadoPagoToken"), "fake-provider-secret");
    assert.throws(() => decrypt(saved, 2, "mercadoPagoToken"));
    assert.throws(() => decrypt(saved, 1, "cloudflareEmailToken"));
    assert.throws(() =>
      decrypt(
        { ...saved, tag: Buffer.alloc(16).toString("base64") },
        1,
        "mercadoPagoToken",
      ),
    );
  } finally {
    if (original === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = original;
  }
});
test("customer configuration fails closed and never exposes its secrets through public config", () => {
  const c = configuration({ CUSTOMER_BOOKING_ENABLED: "true" });
  assert.equal(c.enabled, false);
  assert.ok(c.missing.includes("MP_ACCESS_TOKEN"));
});
test("deposit uses cents and cancellation respects the exact 24-hour boundary in Argentina", () => {
  assert.equal(depositCents("26000"), 1300000);
  assert.equal(depositCents("0.03"), 2);
  assert.equal(depositCents("26000", 30), 780000);
  assert.equal(depositCents("0.03", 30), 1);
  assert.equal(depositCents("123.45", 100), 12345);
  assert.throws(() => depositCents("1.001"));
  const a = {
      appointment_date: "2026-10-10",
      appointment_time: "14:30:00.000",
    },
    zone = "America/Argentina/Buenos_Aires";
  assert.equal(appointmentInstant(a, zone), Date.parse("2026-10-10T17:30:00Z"));
  assert.equal(canCancel(a, zone, Date.parse("2026-10-09T17:30:00Z")), true);
  assert.equal(
    canCancel(a, zone, Date.parse("2026-10-09T17:30:00.001Z")),
    false,
  );
});
test("profile requires phone and rejects Instagram as a phone", () => {
  assert.equal(
    profile({ name: "Cliente", phone: "362 123-4567" }).phone,
    "+543621234567",
  );
  assert.equal(
    profile({ name: "Cliente", phone: "+54 9 362 1234567" }).phone,
    "+5493621234567",
  );
  assert.throws(() => profile({ name: "Cliente", phone: "@cliente" }));
  assert.throws(() => emailAddress("<x>@example.test"));
});
test("Mercado Pago signature binds timestamp, payment ID and request ID; URLs are restricted", () => {
  const now = Date.now(),
    id = "123456",
    requestId = "request-one",
    secret = "test-secret";
  const mac = createHmac("sha256", secret)
    .update(`id:${id};request-id:${requestId};ts:${now};`)
    .digest("hex");
  const args = { signature: `ts=${now},v1=${mac}`, id, bodyId: id, requestId };
  assert.ok(verifySignature(args, secret, now));
  assert.equal(verifySignature({ ...args, bodyId: "999" }, secret, now), false);
  assert.equal(verifySignature(args, secret, now + 16 * 60000), false);
  assert.equal(
    verifySignature({ ...args, requestId: "other" }, secret, now),
    false,
  );
  assert.ok(
    validCheckoutUrl(
      "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=one",
    ),
  );
  assert.equal(
    validCheckoutUrl("https://www.mercadopago.com.ar.attacker.test/checkout/"),
    false,
  );
  assert.equal(
    validCheckoutUrl("https://me@www.mercadopago.com.ar/checkout/"),
    false,
  );
});
test("public proxy enforces origin, stores token only in HttpOnly cookie and rejects arbitrary routes", async () => {
  const { customerProxy } = await import("../../server/customer-proxy.mjs");
  const env = {
    CUSTOMER_PROXY_SECRET: "x".repeat(32),
    CUSTOMER_ALLOWED_ORIGINS: "https://salon.test",
    NODE_ENV: "production",
  };
  const run = async (req, fetcher) => {
    const out = { headers: {} };
    const res = {
      setHeader: (k, v) => (out.headers[k] = v),
      status: (s) => {
        out.status = s;
        return res;
      },
      json: (v) => (out.body = v),
    };
    await customerProxy(req, res, { env, fetcher });
    return out;
  };
  const req = {
    url: "/api/customer/verify",
    method: "POST",
    headers: {
      origin: "https://salon.test",
      "content-type": "application/json",
    },
    body: {},
  };
  let fetched = false;
  const fetcher = async () => {
    fetched = true;
    return Response.json({
      sessionToken: "a".repeat(43),
      account: { email: "a@example.test" },
    });
  };
  const denied = await run(
    { ...req, headers: { ...req.headers, origin: "https://attacker.test" } },
    fetcher,
  );
  assert.equal(denied.status, 403);
  assert.equal(fetched, false);
  const ok = await run(req, fetcher);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.sessionToken, undefined);
  assert.match(ok.headers["Set-Cookie"], /HttpOnly; SameSite=Lax/);
  assert.match(ok.headers["Set-Cookie"], /Secure/);
  assert.equal(
    (
      await run(
        { ...req, url: "/api/customer/../../backoffice/query" },
        fetcher,
      )
    ).status,
    404,
  );
});
