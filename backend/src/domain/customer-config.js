"use strict";
const { errors } = require("@strapi/utils");
const POLICY_VERSION = "deposit-50-cancel-24h-2026-09-15";
function configuration(env = process.env) {
  const values = {
    CUSTOMER_PROXY_SECRET: env.CUSTOMER_PROXY_SECRET?.trim(),
    CUSTOMER_AUTH_SECRET: env.CUSTOMER_AUTH_SECRET?.trim(),
    CUSTOMER_SITE_URL: env.CUSTOMER_SITE_URL?.trim(),
    MP_ACCESS_TOKEN: env.MP_ACCESS_TOKEN?.trim(),
    MP_WEBHOOK_SECRET: env.MP_WEBHOOK_SECRET?.trim(),
    MP_COLLECTOR_ID: env.MP_COLLECTOR_ID?.trim(),
    PUBLIC_URL: env.PUBLIC_URL?.trim(),
    CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID?.trim(),
    CLOUDFLARE_EMAIL_API_TOKEN: env.CLOUDFLARE_EMAIL_API_TOKEN?.trim(),
    NOTIFICATION_EMAIL_FROM: env.NOTIFICATION_EMAIL_FROM?.trim(),
  };
  const missing = Object.entries(values)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  for (const key of ["CUSTOMER_PROXY_SECRET", "CUSTOMER_AUTH_SECRET"])
    if (values[key] && values[key].length < 32) missing.push(key);
  for (const key of ["CUSTOMER_SITE_URL", "PUBLIC_URL"]) {
    try {
      const url = new URL(values[key]);
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        (url.protocol !== "https:" &&
          !(env.NODE_ENV === "test" && url.hostname === "127.0.0.1"))
      )
        throw Error();
    } catch {
      if (!missing.includes(key)) missing.push(key);
    }
  }
  if (!["test", "production"].includes(env.MP_MODE)) missing.push("MP_MODE");
  if (values.MP_COLLECTOR_ID && !/^\d+$/.test(values.MP_COLLECTOR_ID))
    missing.push("MP_COLLECTOR_ID");
  if (
    values.CLOUDFLARE_ACCOUNT_ID &&
    !/^[a-f0-9]{32}$/.test(values.CLOUDFLARE_ACCOUNT_ID)
  )
    missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (
    values.NOTIFICATION_EMAIL_FROM &&
    !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(values.NOTIFICATION_EMAIL_FROM)
  )
    missing.push("NOTIFICATION_EMAIL_FROM");
  const rawPercent = Number(env.BOOKING_DEPOSIT_PERCENT || 50);
  const validPercent =
    Number.isInteger(rawPercent) && rawPercent >= 1 && rawPercent <= 100;
  if (!validPercent) missing.push("BOOKING_DEPOSIT_PERCENT");
  const ready = missing.length === 0;
  const authReady = !missing.some((k) =>
    [
      "CUSTOMER_PROXY_SECRET",
      "CUSTOMER_AUTH_SECRET",
      "CUSTOMER_SITE_URL",
    ].includes(k),
  );
  const mailReady = !missing.some(
    (k) => k.startsWith("CLOUDFLARE_") || k === "NOTIFICATION_EMAIL_FROM",
  );
  const paymentReady = !missing.some(
    (k) =>
      k.startsWith("MP_") || k === "PUBLIC_URL" || k === "CUSTOMER_SITE_URL",
  );
  const depositPercent = validPercent ? rawPercent : 50;
  const googleEnabled = env.GOOGLE_LOGIN_ENABLED !== "false";
  const holdMinutes = Math.min(
    30,
    Math.max(5, Number(env.BOOKING_HOLD_MINUTES) || 15),
  );
  return {
    ...values,
    ready,
    authReady,
    mailReady,
    paymentReady,
    googleEnabled,
    missing: [...new Set(missing)],
    enabled: ready && env.CUSTOMER_BOOKING_ENABLED === "true",
    requested: env.CUSTOMER_BOOKING_ENABLED === "true",
    mode: env.MP_MODE || "test",
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() || "",
    holdMinutes,
    depositPercent,
    cancellationHours: 24,
    policyVersion:
      depositPercent === 50
        ? POLICY_VERSION
        : `deposit-${depositPercent}-cancel-24h-2026-09-15`,
  };
}
function requireEnabled(config = configuration()) {
  if (!config.enabled)
    throw new errors.ApplicationError(
      "La reserva con seña todavía no está habilitada.",
    );
  return config;
}
function requireAccess(kind, c) {
  if (
    !c.authReady ||
    (kind === "google" ? !c.googleEnabled || !c.googleClientId : !c.mailReady)
  )
    throw new errors.ApplicationError(
      kind === "google"
        ? "El acceso con Google todavía no está disponible."
        : "El acceso por correo todavía no está disponible.",
    );
  return c;
}
async function resolveConfiguration(strapi, businessId) {
  const row = await strapi.db
    .query("api::business.business")
    .findOne({
      where: { id: businessId },
      select: [
        "id",
        "online_booking_settings",
        "online_booking_secrets",
        "online_booking_revision",
      ],
    });
  if (!row) throw new errors.NotFoundError("Negocio no encontrado.");
  const stored = require("./customer-settings").environment(row);
  return {
    ...configuration({ ...process.env, ...stored }),
    revision: row.online_booking_revision || 0,
  };
}
function publicConfiguration(c = configuration()) {
  return {
    enabled: c.enabled,
    googleClientId: c.authReady && c.googleEnabled ? c.googleClientId : "",
    emailEnabled: c.authReady && c.mailReady,
    accountEnabled:
      c.authReady && (c.mailReady || (c.googleEnabled && !!c.googleClientId)),
    depositPercent: c.depositPercent,
    cancellationHours: c.cancellationHours,
    holdMinutes: c.holdMinutes,
    policyVersion: c.policyVersion,
  };
}
module.exports = {
  configuration,
  resolveConfiguration,
  requireAccess,
  requireEnabled,
  publicConfiguration,
  POLICY_VERSION,
};
