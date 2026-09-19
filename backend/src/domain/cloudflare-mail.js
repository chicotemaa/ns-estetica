"use strict";
const validEmail = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);
function mailConfiguration(env = process.env) {
  const from = env.NOTIFICATION_EMAIL_FROM?.trim(),
    to = env.NOTIFICATION_EMAIL_TO?.trim();
  const account = env.CLOUDFLARE_ACCOUNT_ID?.trim(),
    token = env.CLOUDFLARE_EMAIL_API_TOKEN?.trim();
  let panel;
  try {
    panel = new URL(env.PANEL_ORIGIN);
  } catch {
    /* Report incomplete configuration. */
  }
  const ready = !!(
    validEmail(from) &&
    validEmail(to) &&
    /^[a-f0-9]{32}$/.test(account || "") &&
    token &&
    panel?.protocol === "https:" &&
    !panel.username &&
    !panel.password
  );
  return {
    ready,
    enabled: ready && env.NOTIFICATION_EMAIL_ENABLED === "true",
    from,
    to,
    account,
    token,
    panel: panel?.origin,
  };
}
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function digestMessage(config, alerts, date) {
  const selected = alerts.slice(0, 50);
  const subject = `Natalia Sánchez · ${alerts.length} avisos · ${date}`;
  const text = `${subject}\n\n${selected.map((a) => `${a.title}\n${a.detail}\n${a.date}${a.amount != null ? ` · $${a.amount}` : ""}\n${config.panel}${a.href}`).join("\n\n")}\n\nVer todos: ${config.panel}/dashboard/notifications\nMarcar un aviso como visto no registra un pago ni resuelve el trabajo pendiente.`;
  const html = `<h1>Tu resumen del negocio</h1><p>${escape(date)} · ${alerts.length} avisos</p>${selected.map((a) => `<section><h2>${escape(a.title)}</h2><p>${escape(a.detail)}</p><p>${escape(a.date)}${a.amount != null ? ` · $${escape(a.amount)}` : ""}</p><a href="${escape(config.panel + a.href)}">${escape(a.action)}</a></section>`).join("")}<p><a href="${config.panel}/dashboard/notifications">Ver todos los avisos</a></p><p>Marcar un aviso como visto no registra un pago ni resuelve el trabajo pendiente.</p>`;
  return { to: config.to, from: config.from, subject, text, html };
}
async function sendDigest(config, alerts, date, fetcher = fetch) {
  if (!config.enabled) return { status: "disabled" };
  let response, body;
  try {
    response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${config.account}/email/sending/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(digestMessage(config, alerts, date)),
        signal: AbortSignal.timeout(20000),
      },
    );
    body = await response.json();
  } catch {
    return {
      status: "unknown",
      error:
        "No se pudo confirmar el envío. Revisá el registro en Cloudflare antes de reintentar.",
    };
  }
  if (response.ok && body.success === true) {
    const contains = (values) =>
      Array.isArray(values) &&
      values.some((v) => String(v).toLowerCase() === config.to.toLowerCase());
    if (contains(body.result?.delivered)) return { status: "delivered" };
    if (contains(body.result?.permanent_bounces))
      return { status: "bounced", error: "El destinatario rechazó el correo." };
    if (contains(body.result?.queued)) return { status: "queued" };
    return {
      status: "unknown",
      error: "Cloudflare no confirmó el estado del destinatario.",
    };
  }
  return {
    status: response.status >= 500 ? "unknown" : "failed",
    error: `Cloudflare respondió HTTP ${response.status}. Revisá la configuración del correo.`,
  };
}
module.exports = { mailConfiguration, digestMessage, sendDigest };
