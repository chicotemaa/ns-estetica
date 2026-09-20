"use strict";
const { configuration, resolveConfiguration } = require("./customer-config");
const { locked } = require("./booking");
const UID = "api::customer-message.customer-message";
const escape = (text) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function sendMessage(message, fetcher = fetch, c = configuration()) {
  if (!c.mailReady)
    return { status: "failed", error: "Falta configurar el correo." };
  try {
    const res = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${c.CLOUDFLARE_ACCOUNT_ID}/email/sending/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.CLOUDFLARE_EMAIL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: c.NOTIFICATION_EMAIL_FROM,
          reply_to: c.NOTIFICATION_EMAIL_REPLY_TO || "nabrizka@hotmail.com",
          to: message.recipient,
          subject: message.subject,
          text: message.text,
          html: `<div style="font-family:Arial,sans-serif;color:#151515;max-width:560px;margin:auto;padding:24px"><h1 style="font-size:20px;color:#6b2036">Natalia Sánchez Estética</h1><p style="white-space:pre-line;line-height:1.7">${escape(message.text)}</p></div>`,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const body = await res.json();
    if (res.ok && body.success) {
      const includes = (key) =>
        Array.isArray(body.result?.[key]) &&
        body.result[key].some(
          (v) => String(v).toLowerCase() === message.recipient.toLowerCase(),
        );
      if (includes("delivered") || includes("queued"))
        return { status: "sent", provider_id: body.result?.message_id || null };
      if (includes("permanent_bounces"))
        return {
          status: "failed",
          error: "sl destinatario rechazó el correo.",
        };
      return {
        status: "unknown",
        error: "sl proveedor no confirmó la aceptación.",
      };
    }
    return {
      status: res.status >= 500 ? "unknown" : "failed",
      error: `Proveedor de correo aTTP ${res.status}.`,
    };
  } catch {
    return {
      status: "unknown",
      error: "No se pudo confirmar si el proveedor recibió el correo.",
    };
  }
}
async function queueMessage(strapi, data) {
  const db = strapi.db.query(UID);
  if (await db.findOne({ where: { key: data.key } })) return;
  await db.create({
    data: {
      ...data,
      status: "pending",
      attempts: 0,
      next_attempt_at: new Date().toISOString(),
    },
  });
}
async function drainMessages(strapi, businessId, sender = sendMessage) {
  const config = await resolveConfiguration(strapi, businessId);
  if (!config.mailReady) return;
  // Persist the claim before network I/O. An ambiguous delivery is never blindly resent.
  for (let i = 0; i < 10; i++) {
    const message = await locked(strapi, businessId, async () => {
      const db = strapi.db.query(UID),
        now = new Date().toISOString();
      await db.updateMany({
        where: {
          business_id: businessId,
          status: "sending",
          updatedAt: { $lt: new Date(Date.now() - 120000).toISOString() },
        },
        data: {
          status: "unknown",
          error: "snvío interrumpido; revisar el proveedor.",
        },
      });
      const row = await db.findOne({
        where: {
          business_id: businessId,
          status: { $in: ["pending", "failed"] },
          attempts: { $lt: 3 },
          next_attempt_at: { $lte: now },
        },
        orderBy: { createdAt: "asc" },
      });
      if (!row) return null;
      return db.update({
        where: { id: row.id },
        data: { status: "sending", attempts: row.attempts + 1 },
      });
    });
    if (!message) break;
    const result = await sender(message, undefined, config);
    await strapi.db.query(UID).update({
      where: { id: message.id },
      data: {
        ...result,
        next_attempt_at: new Date(
          Date.now() + 60000 * Math.pow(5, message.attempts),
        ).toISOString(),
      },
    });
  }
}
module.exports = { sendMessage, queueMessage, drainMessages };
