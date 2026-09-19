"use strict";
const {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} = require("node:crypto");
const { errors } = require("@strapi/utils");
const UID = "api::business.business";
const fields = {
  requested: "CUSTOMER_BOOKING_ENABLED",
  depositPercent: "BOOKING_DEPOSIT_PERCENT",
  holdMinutes: "BOOKING_HOLD_MINUTES",
  googleEnabled: "GOOGLE_LOGIN_ENABLED",
  googleClientId: "GOOGLE_CLIENT_ID",
  mode: "MP_MODE",
  collectorId: "MP_COLLECTOR_ID",
  cloudflareAccountId: "CLOUDFLARE_ACCOUNT_ID",
  senderEmail: "NOTIFICATION_EMAIL_FROM",
};
const secrets = {
  mercadoPagoToken: "MP_ACCESS_TOKEN",
  mercadoPagoWebhookSecret: "MP_WEBHOOK_SECRET",
  cloudflareEmailToken: "CLOUDFLARE_EMAIL_API_TOKEN",
};
function key() {
  const source = process.env.ENCRYPTION_KEY;
  if (!source || source.length < 32)
    throw new errors.ApplicationError(
      "El servidor no está preparado para guardar credenciales.",
    );
  return createHash("sha256").update(`online-booking:v1:${source}`).digest();
}
function encrypt(value, businessId, field) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(`${businessId}:${field}`));
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    body: body.toString("base64"),
  };
}
function decrypt(value, businessId, field) {
  try {
    if (value.version !== 1) throw Error();
    const cipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(value.iv, "base64"),
    );
    cipher.setAAD(Buffer.from(`${businessId}:${field}`));
    cipher.setAuthTag(Buffer.from(value.tag, "base64"));
    return Buffer.concat([
      cipher.update(Buffer.from(value.body, "base64")),
      cipher.final(),
    ]).toString("utf8");
  } catch {
    throw new errors.ApplicationError(
      "No se pudieron leer las credenciales guardadas. Revisá la clave de cifrado del servidor.",
    );
  }
}
function environment(row) {
  const values = {};
  for (const [field, env] of Object.entries(fields))
    if (Object.hasOwn(row.online_booking_settings || {}, field))
      values[env] = String(row.online_booking_settings[field]);
  for (const [field, env] of Object.entries(secrets))
    if (row.online_booking_secrets?.[field])
      values[env] = decrypt(row.online_booking_secrets[field], row.id, field);
  return values;
}
const invalid = (message) => {
  throw new errors.ValidationError(message);
};
function validate(input) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some(
      (k) => ![...Object.keys(fields), "revision", "credentials"].includes(k),
    )
  )
    invalid("Configuración inválida.");
  if (!Number.isInteger(input.revision) || input.revision < 0)
    invalid("Actualizá la configuración antes de guardar.");
  const data = {};
  for (const name of ["requested", "googleEnabled"]) {
    if (typeof input[name] !== "boolean")
      invalid("Revisá las opciones de activación.");
    data[name] = input[name];
  }
  for (const [name, min, max] of [
    ["depositPercent", 1, 100],
    ["holdMinutes", 5, 30],
  ]) {
    if (
      !Number.isInteger(input[name]) ||
      input[name] < min ||
      input[name] > max
    )
      invalid(
        name === "depositPercent"
          ? "La seña debe ser un porcentaje entero entre 1 y 100."
          : "El tiempo para pagar debe ser entre 5 y 30 minutos.",
      );
    data[name] = input[name];
  }
  if (!["test", "production"].includes(input.mode))
    invalid("Elegí pruebas o producción.");
  data.mode = input.mode;
  const patterns = {
    googleClientId: /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/,
    collectorId: /^\d{1,30}$/,
    cloudflareAccountId: /^[a-f0-9]{32}$/,
    senderEmail: /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/,
  };
  for (const [name, pattern] of Object.entries(patterns)) {
    if (typeof input[name] !== "string" || input[name].length > 300)
      invalid("Revisá los datos de conexión.");
    data[name] = input[name].trim();
    if (data[name] && !pattern.test(data[name]))
      invalid(
        `Revisá ${{ googleClientId: "el Client ID de Google", collectorId: "el ID de vendedor", cloudflareAccountId: "el ID de cuenta de Cloudflare", senderEmail: "el correo remitente" }[name]}.`,
      );
  }
  const credentials = input.credentials || {};
  if (
    typeof credentials !== "object" ||
    Array.isArray(credentials) ||
    Object.keys(credentials).some((k) => !Object.hasOwn(secrets, k))
  )
    invalid("Credenciales inválidas.");
  for (const value of Object.values(credentials))
    if (
      typeof value !== "string" ||
      value.length > 4096 ||
      (value.trim() && (value.trim().length < 8 || /\s/.test(value.trim())))
    )
      invalid("Pegá la credencial completa, sin espacios intermedios.");
  return { data, credentials };
}
async function save(strapi, businessId, input) {
  const { data, credentials } = validate(input);
  await require("./booking").locked(strapi, businessId, async () => {
    const db = strapi.db.query(UID),
      row = await db.findOne({ where: { id: businessId } });
    if (!row) throw new errors.NotFoundError("Negocio no encontrado.");
    if ((row.online_booking_revision || 0) !== input.revision)
      throw new errors.ApplicationError(
        "Otra persona actualizó esta configuración. Recargá la página antes de guardar.",
      );
    const savedSecrets = { ...row.online_booking_secrets };
    for (const [field, value] of Object.entries(credentials))
      if (value.trim())
        savedSecrets[field] = encrypt(value.trim(), businessId, field);
    // Changing merchant/environment would prevent reconciling the existing ledger.
    const old = { ...process.env, ...environment(row) };
    const paymentChanged =
      data.mode !== (old.MP_MODE || "test") ||
      data.collectorId !== (old.MP_COLLECTOR_ID || "");
    if (
      paymentChanged &&
      (await strapi.db
        .query("api::booking-intent.booking-intent")
        .count({
          where: {
            business_id: businessId,
            $or: [
              { status: "awaiting_payment" },
              { payment_id: { $notNull: true } },
              { status: "review" },
            ],
          },
        }))
    )
      invalid(
        "Hay reservas con pagos asociados. Para cambiar la cuenta o el modo de Mercado Pago, primero hay que coordinar la conciliación de esos pagos.",
      );
    await db.update({
      where: { id: businessId },
      data: {
        online_booking_settings: data,
        online_booking_secrets: savedSecrets,
        online_booking_revision: input.revision + 1,
      },
    });
  });
}
function summary(c) {
  return {
    revision: c.revision,
    googleEnabled: c.googleEnabled,
    googleClientId: c.googleClientId,
    collectorId: c.MP_COLLECTOR_ID || "",
    cloudflareAccountId: c.CLOUDFLARE_ACCOUNT_ID || "",
    senderEmail: c.NOTIFICATION_EMAIL_FROM || "",
    credentials: Object.fromEntries(
      Object.entries(secrets).map(([field, env]) => [field, !!c[env]]),
    ),
    webhookUrl: c.PUBLIC_URL
      ? `${c.PUBLIC_URL.replace(/\/$/, "")}/api/payments/mercado-pago/webhook`
      : "",
    googleOrigins: c.CUSTOMER_SITE_URL
      ? [
          ...new Set([
            new URL(c.CUSTOMER_SITE_URL).origin,
            new URL(c.CUSTOMER_SITE_URL).origin.replace(
              "https://www.",
              "https://",
            ),
          ]),
        ]
      : [],
  };
}
module.exports = { environment, save, summary, validate, encrypt, decrypt };
