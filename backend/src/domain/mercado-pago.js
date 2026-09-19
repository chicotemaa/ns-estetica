"use strict";
const { createHmac, timingSafeEqual } = require("node:crypto");
const { errors } = require("@strapi/utils");
const { configuration } = require("./customer-config");
async function request(
  path,
  options = {},
  fetcher = fetch,
  c = configuration(),
) {
  const response = await fetcher(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${c.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(18000),
  });
  if (!response.ok)
    throw new errors.ApplicationError(
      `Mercado Pago no respondió correctamente (HTTP ${response.status}).`,
    );
  return response.json();
}
async function createPreference(intent, fetcher, c = configuration()) {
  const back = `${c.CUSTOMER_SITE_URL.replace(/\/$/, "")}/reservas/pago?reserva=${encodeURIComponent(intent.key)}`;
  const preference = await request(
    "/checkout/preferences",
    {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            id: intent.reference,
            title:
              `Seña ${intent.deposit_percent ?? 50}% · ${intent.booking_data.service_name_snapshot}`.slice(
                0,
                250,
              ),
            quantity: 1,
            currency_id: "ARS",
            unit_price: Number(intent.deposit_cents) / 100,
          },
        ],
        external_reference: intent.reference,
        notification_url: `${c.PUBLIC_URL.replace(/\/$/, "")}/api/payments/mercado-pago/webhook`,
        back_urls: { success: back, pending: back, failure: back },
        auto_return: "approved",
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: intent.expires_at,
        payment_methods: {
          excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
          installments: 1,
        },
      }),
    },
    fetcher,
    c,
  );
  const url = preference.init_point;
  if (!preference.id || !validCheckoutUrl(url))
    throw new errors.ApplicationError(
      "Mercado Pago no devolvió un enlace de pago válido.",
    );
  return { preference_id: String(preference.id), checkout_url: url };
}
function validCheckoutUrl(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      ["www.mercadopago.com.ar", "sandbox.mercadopago.com.ar"].includes(
        u.hostname,
      ) &&
      u.pathname.startsWith("/checkout/")
    );
  } catch {
    return false;
  }
}
function verifySignature(
  { signature, requestId, id, bodyId },
  secret,
  now = Date.now(),
) {
  if (
    typeof id !== "string" ||
    !/^\d{1,30}$/.test(id) ||
    String(bodyId) !== id ||
    typeof signature !== "string" ||
    signature.length > 500 ||
    typeof requestId !== "string" ||
    !requestId ||
    requestId.length > 200 ||
    !secret
  )
    return false;
  const parts = Object.fromEntries(
    signature.split(",").map((p) => p.trim().split("=")),
  );
  if (
    !/^\d{10,13}$/.test(parts.ts || "") ||
    !/^[a-f0-9]{64}$/.test(parts.v1 || "")
  )
    return false;
  const time = Number(parts.ts) * (parts.ts.length === 10 ? 1000 : 1);
  if (Math.abs(now - time) > 15 * 60000) return false;
  const hash = createHmac("sha256", secret)
    .update(`id:${id};request-id:${requestId};ts:${parts.ts};`)
    .digest();
  return timingSafeEqual(hash, Buffer.from(parts.v1, "hex"));
}
const getPayment = (id, fetcher, c) =>
  request(`/v1/payments/${encodeURIComponent(id)}`, {}, fetcher, c);
module.exports = {
  createPreference,
  getPayment,
  verifySignature,
  validCheckoutUrl,
};
