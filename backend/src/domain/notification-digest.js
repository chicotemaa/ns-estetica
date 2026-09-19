"use strict";
const { getBusiness } = require("./repository");
const { locked } = require("./booking");
const { activeAlerts } = require("./notifications");
const { mailConfiguration, sendDigest } = require("./cloudflare-mail");
const UID = "api::notification-delivery.notification-delivery";
async function status(strapi, businessId) {
  const config = mailConfiguration();
  const latest = await strapi.db
    .query(UID)
    .findOne({
      where: { business_id: businessId },
      orderBy: { createdAt: "desc" },
    });
  return {
    configured: config.ready,
    enabled: config.enabled,
    from: config.from || null,
    to: config.to || null,
    cadence: "Resumen diario a las 09:00, hora del negocio",
    latest: latest
      ? {
          date: latest.date,
          status: latest.status,
          error: latest.error,
          updatedAt: latest.updatedAt,
        }
      : null,
  };
}
async function runDigest(
  strapi,
  { now = new Date(), sender = sendDigest } = {},
) {
  const config = mailConfiguration();
  if (!config.enabled) return { status: "disabled" };
  const business = await getBusiness(strapi);
  const timeZone = business.time_zone || "America/Argentina/Buenos_Aires";
  const date = new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour < 9) return { status: "scheduled" };
  const key = `${business.id}:${date}`;
  const claimed = await locked(strapi, business.id, async () => {
    const db = strapi.db.query(UID);
    if (await db.findOne({ where: { delivery_key: key } })) return null;
    const { alerts } = await activeAlerts(strapi, business.id);
    if (!alerts.length) return null;
    const row = await db.create({
      data: {
        business_id: business.id,
        delivery_key: key,
        date,
        status: "sending",
        recipient: config.to,
      },
    });
    return { id: row.id, alerts };
  });
  if (!claimed) return { status: "unchanged" };
  // Claim is durable before network I/O. Ambiguous results are never resent
  // automatically, including a process restart during the provider request.
  const result = await sender(config, claimed.alerts, date);
  await strapi.db
    .query(UID)
    .update({
      where: { id: claimed.id },
      data: { status: result.status, error: result.error || null },
    });
  return result;
}
module.exports = { status, runDigest };
