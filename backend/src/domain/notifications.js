"use strict";
const { createHash } = require("node:crypto");
const { errors } = require("@strapi/utils");
const { repository } = require("./repository");
const { locked } = require("./booking");
const { financeAlerts } = require("./finance");
const { operationAlerts, revision, KINDS } = require("./operation-alerts");
const RECEIPT = "api::notification-receipt.notification-receipt";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const scope = (businessId, userId) => ({
  business_id: businessId,
  manager_id: userId,
});

async function activeAlerts(strapi, businessId) {
  const repo = repository(strapi, businessId);
  const [appointments, payments, workRecords, [business], finance] =
    await Promise.all([
      repo.records("appointments"),
      repo.records("payments"),
      repo.records("work_records"),
      repo.records("businesses"),
      financeAlerts(strapi, businessId),
    ]);
  const data = operationAlerts({
    appointments,
    payments,
    workRecords,
    timeZone: business.time_zone || "America/Argentina/Buenos_Aires",
  });
  data.alerts.push(...finance);
  const onlinePayments = await strapi.db
    .query("api::online-payment.online-payment")
    .findMany({
      where: { business_id: businessId, review_reason: { $notNull: true } },
      limit: 100,
    });
  const mailIssues = await strapi.db
    .query("api::customer-message.customer-message")
    .findMany({
      where: {
        business_id: businessId,
        status: { $in: ["failed", "unknown"] },
      },
      limit: 100,
    });
  for (const payment of onlinePayments)
    data.alerts.push({
      id: `online-payment:${payment.id}`,
      kind: "pending",
      priority: 0,
      title: "Revisar pago de Mercado Pago",
      detail: `Pago ${payment.provider_id} · ${payment.review_reason}`,
      date: payment.updatedAt.slice(0, 10),
      amount: Number(payment.amount_cents) / 100,
      href: "/dashboard/settings/online-booking",
      action: "Revisar pago",
    });
  for (const message of mailIssues)
    data.alerts.push({
      id: `customer-mail:${message.id}`,
      kind: "pending",
      priority: 1,
      title: "Correo de reserva pendiente",
      detail: `${message.recipient} · ${message.error}`,
      date: message.updatedAt.slice(0, 10),
      href: "/dashboard/settings/online-booking",
      action: "Revisar envío",
    });
  data.alerts.sort(
    (a, b) =>
      a.priority - b.priority ||
      a.date.localeCompare(b.date) ||
      a.id.localeCompare(b.id),
  );
  return data;
}

async function inbox(strapi, businessId, userId) {
  const data = await activeAlerts(strapi, businessId);
  const receipts = data.alerts.length
    ? await strapi.db.query(RECEIPT).findMany({
        where: {
          ...scope(businessId, userId),
          source_id: { $in: data.alerts.map((a) => a.id) },
        },
        limit: 10000,
      })
    : [];
  const bySource = new Map(receipts.map((r) => [r.source_id, r]));
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0]));
  const alerts = data.alerts.map((a) => {
    counts[a.kind]++;
    const version = revision(a),
      receipt = bySource.get(a.id);
    return {
      ...a,
      revision: version,
      readAt: receipt?.revision === version ? receipt.read_at : null,
    };
  });
  return {
    ...data,
    alerts,
    counts,
    unreadCount: alerts.filter((a) => !a.readAt).length,
    attentionCount: alerts.filter((a) => a.kind !== "today").length,
    updatedAt: new Date().toISOString(),
  };
}

async function markRead(strapi, businessId, userId, input) {
  if (
    !input ||
    typeof input.read !== "boolean" ||
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 100 ||
    input.items.some(
      (i) =>
        !i ||
        typeof i.id !== "string" ||
        i.id.length > 180 ||
        !/^[a-f0-9]{64}$/.test(i.revision || ""),
    )
  )
    throw new errors.ValidationError("Elegí entre 1 y 100 avisos válidos.");
  // The browser supplies identifiers, never notification contents or user IDs.
  return locked(strapi, businessId, async () => {
    const { alerts } = await activeAlerts(strapi, businessId);
    const current = new Map(alerts.map((a) => [a.id, revision(a)]));
    let updated = 0;
    for (const item of input.items) {
      if (current.get(item.id) !== item.revision) continue;
      const receipt_key = hash(`${businessId}:${userId}:${item.id}`);
      const db = strapi.db.query(RECEIPT);
      const row = await db.findOne({
        where: { receipt_key, ...scope(businessId, userId) },
      });
      const data = {
        ...scope(businessId, userId),
        receipt_key,
        source_id: item.id,
        revision: item.revision,
        read_at: input.read ? new Date().toISOString() : null,
      };
      if (row) await db.update({ where: { id: row.id }, data });
      else await db.create({ data });
      updated++;
    }
    return { updated };
  });
}
module.exports = { inbox, markRead, activeAlerts };
