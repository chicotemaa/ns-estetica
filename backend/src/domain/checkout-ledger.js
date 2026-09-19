"use strict";
const { createHash } = require("node:crypto");
const { errors } = require("@strapi/utils");
const { repository, resources, numericId } = require("./repository");
const { locked } = require("./booking");
const { cents } = require("./money");
const { commissionRate } = require("./finance-rules");
const fail = (message) => {
  throw new errors.ValidationError(message);
};
const eq = (field, value) => ({ field, operator: "eq", value });
const methods = ["cash", "transfer", "card", "mercado_pago", "other"];
function validKey(key) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      key || "",
    )
  )
    fail("Falta el identificador de la operación.");
}
async function checkoutSummary(strapi, businessId, appointmentId) {
  const repo = repository(strapi, businessId),
    [appointment] = await repo.records("appointments", [
      eq("id", numericId(appointmentId)),
    ]);
  if (!appointment) throw new errors.NotFoundError("Turno no encontrado.");
  const [payments, events, allocations, business] = await Promise.all([
    repo.read("payments", [eq("appointment_id", appointment.id)]),
    repo.read("checkout_events", [eq("appointment_id", appointment.id)]),
    repo.read("payroll_lines"),
    repo.read("businesses"),
  ]);
  const paidCents = payments
      .filter((p) => p.status === "completed")
      .reduce((n, p) => n + cents(p.amount), 0),
    totalCents = cents(
      appointment.checkout_total ?? appointment.price_snapshot,
    );
  return {
    appointment,
    baseTotalCents: cents(appointment.price_snapshot),
    totalCents,
    paidCents,
    balanceCents: Math.max(0, totalCents - paidCents),
    timeZone: business[0].time_zone,
    payments: payments.map((p) => ({
      id: String(p.id),
      amountCents: cents(p.amount),
      method: p.method,
      status: p.status,
      date: p.processed_at,
      commissionCents: cents(p.commission_amount || 0),
      commissionRate: Number(p.commission_rate || 0),
      canVoid:
        p.status === "completed" &&
        !String(p.checkout_key || "").startsWith("mp:") &&
        !allocations.some((a) => a.payment?.id === p.id),
    })),
    events: events
      .map((e) => ({
        id: String(e.id),
        kind: e.kind,
        reason: e.reason,
        before: e.before_value,
        after: e.after_value,
        date: e.createdAt,
        actor: e.actor,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
async function checkout(strapi, businessId, input, key) {
  validKey(key);
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some(
      (k) =>
        ![
          "appointmentId",
          "amount",
          "method",
          "payments",
          "expectedBalanceCents",
          "complete",
        ].includes(k),
    )
  )
    fail("Solicitud de cobro inválida.");
  const legacy = input.payments === undefined;
  if (!legacy && (input.amount !== undefined || input.method !== undefined))
    fail("Usá una sola lista de medios de pago.");
  const rows = legacy
    ? [{ amount: input.amount, method: input.method }]
    : input.payments;
  if (
    !Array.isArray(rows) ||
    !rows.length ||
    rows.length > 5 ||
    rows.some(
      (r) =>
        !r || Object.keys(r).some((k) => !["method", "amount"].includes(k)),
    )
  )
    fail("Agregá entre uno y cinco medios de pago.");
  const splits = rows.map((r) => ({
    method: r.method,
    amountCents: cents(r.amount),
  }));
  if (
    splits.some((r) => !methods.includes(r.method) || !r.amountCents) ||
    new Set(splits.map((r) => r.method)).size !== splits.length
  )
    fail("Revisá importes y medios de pago, sin repetir el mismo medio.");
  if (
    !Number.isSafeInteger(input.expectedBalanceCents) ||
    input.expectedBalanceCents < 0 ||
    (input.complete !== undefined && typeof input.complete !== "boolean")
  )
    fail("Saldo o estado inválido.");
  const appointmentId = numericId(input.appointmentId),
    total = splits.reduce((n, r) => n + r.amountCents, 0),
    complete = input.complete ?? true;
  const hash = createHash("sha256")
    .update(
      JSON.stringify(
        legacy && input.complete === undefined
          ? [
              businessId,
              appointmentId,
              total,
              input.method,
              input.expectedBalanceCents,
            ]
          : [
              businessId,
              appointmentId,
              splits,
              input.expectedBalanceCents,
              complete,
            ],
      ),
    )
    .digest("hex");
  return locked(strapi, businessId, async () => {
    const previous = await strapi.db
      .query(resources.payments.uid)
      .findOne({ where: { checkout_key: key }, populate: { business: true } });
    if (previous) {
      if (
        previous.business?.id !== businessId ||
        previous.checkout_hash !== hash
      )
        fail("Ese intento ya se usó con otros datos.");
      return {
        paymentId: String(previous.id),
        replayed: true,
        ...(await checkoutSummary(strapi, businessId, appointmentId)),
      };
    }
    const summary = await checkoutSummary(strapi, businessId, appointmentId),
      a = summary.appointment;
    if (!["confirmed", "completed"].includes(a.status))
      fail(
        "Confirmá el turno antes de cobrarlo. Un turno cancelado no se puede cobrar.",
      );
    if (summary.balanceCents !== input.expectedBalanceCents)
      fail("El saldo cambió. Actualizá el checkout antes de cobrar.");
    if (total > summary.balanceCents)
      fail("La suma de los medios de pago supera el saldo pendiente.");
    const now = new Date().toISOString(),
      today = new Intl.DateTimeFormat("en-CA", {
        timeZone: summary.timeZone,
      }).format(new Date());
    if (!legacy && complete && a.appointment_date > today)
      fail(
        "Podés registrar un anticipo; la atención futura todavía no puede finalizarse.",
      );
    const rate = commissionRate(a.staff_member),
      ids = [];
    let collected = 0,
      commission = 0;
    for (const [index, row] of splits.entries()) {
      collected += row.amountCents;
      const allocated = Math.round((collected * rate) / 100) - commission;
      commission += allocated;
      const payment = await strapi
        .documents(resources.payments.uid)
        .create({
          data: {
            business: businessId,
            appointment: appointmentId,
            customer: a.customer_id ? Number(a.customer_id) : null,
            staff_member: a.staff_member_id ? Number(a.staff_member_id) : null,
            description: `${a.service_name_snapshot} · ${a.customer_name}`,
            amount: row.amountCents / 100,
            method: row.method,
            status: "completed",
            processed_at: now,
            commission_rate: rate,
            commission_amount: allocated / 100,
            checkout_key: index ? `${key}:${index}` : key,
            checkout_hash: hash,
          },
        });
      ids.push(String(payment.id));
    }
    if (complete) {
      const repo = repository(strapi, businessId),
        [raw] = await repo.read("appointments", [eq("id", appointmentId)]);
      await strapi
        .documents(resources.appointments.uid)
        .update({
          documentId: raw.documentId,
          data: {
            status: "completed",
            ...(raw.started_at && !raw.finished_at ? { finished_at: now } : {}),
          },
        });
    }
    return {
      paymentId: ids[0],
      paymentIds: ids,
      replayed: false,
      ...(await checkoutSummary(strapi, businessId, appointmentId)),
    };
  });
}
async function modifyCheckout(strapi, businessId, input, key, actor) {
  validKey(key);
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some(
      (k) =>
        ![
          "appointmentId",
          "action",
          "total",
          "reason",
          "paymentId",
          "method",
          "expectedTotalCents",
          "expectedPaidCents",
          "expectedMethod",
        ].includes(k),
    )
  )
    fail("Solicitud inválida.");
  const id = numericId(input.appointmentId),
    reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < 3 || reason.length > 500)
    fail("Escribí un motivo de entre 3 y 500 caracteres.");
  const operationKey = `${businessId}:checkout-edit:${key}`,
    hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  return locked(strapi, businessId, async () => {
    const receipt = await strapi.db
      .query(resources.finance_operations.uid)
      .findOne({ where: { operation_key: operationKey } });
    if (receipt) {
      if (receipt.operation_hash !== hash)
        fail("Ese intento ya se usó con otros datos.");
      return {
        replayed: true,
        ...(await checkoutSummary(strapi, businessId, id)),
      };
    }
    const summary = await checkoutSummary(strapi, businessId, id),
      repo = repository(strapi, businessId);
    if (
      summary.totalCents !== input.expectedTotalCents ||
      summary.paidCents !== input.expectedPaidCents
    )
      fail("El checkout cambió. Actualizá antes de modificarlo.");
    const [appointment] = await repo.read("appointments", [eq("id", id)]);
    let before,
      after,
      payment = null;
    if (input.action === "adjustment") {
      if (appointment.status === "cancelled")
        fail("Un turno cancelado no admite ajustes.");
      const total = cents(input.total);
      if (total < summary.paidCents)
        fail(
          "El importe del turno no puede quedar por debajo de lo ya cobrado.",
        );
      if (total === summary.totalCents) fail("El importe no cambió.");
      before = { totalCents: summary.totalCents };
      after = { totalCents: total };
      await strapi
        .documents(resources.appointments.uid)
        .update({
          documentId: appointment.documentId,
          data: { checkout_total: total / 100 },
        });
    } else if (["method", "void"].includes(input.action)) {
      [payment] = await repo.read("payments", [
        eq("id", numericId(input.paymentId)),
        eq("appointment_id", id),
      ]);
      if (
        !payment ||
        payment.status !== "completed" ||
        payment.method !== input.expectedMethod
      )
        fail("El cobro cambió o ya no admite esa corrección.");
      if (String(payment.checkout_key || "").startsWith("mp:"))
        fail("Este pago fue acreditado por Mercado Pago. Revisá su movimiento original; no puede anularse ni cambiarse de medio manualmente.");
      before = {
        method: payment.method,
        status: payment.status,
        amountCents: cents(payment.amount),
      };
      if (input.action === "void") {
        if (
          (await repo.read("payroll_lines", [eq("payment_id", payment.id)]))
            .length
        )
          fail(
            "La comisión de este cobro ya se liquidó. El pago conserva su registro.",
          );
        after = { ...before, status: "voided" };
        await strapi
          .documents(resources.payments.uid)
          .update({
            documentId: payment.documentId,
            data: { status: "voided" },
          });
      } else {
        if (!methods.includes(input.method) || input.method === payment.method)
          fail("Elegí un medio de pago diferente.");
        after = { ...before, method: input.method };
        await strapi
          .documents(resources.payments.uid)
          .update({
            documentId: payment.documentId,
            data: { method: input.method },
          });
      }
    } else fail("Acción no permitida.");
    await strapi
      .documents(resources.checkout_events.uid)
      .create({
        data: {
          business: businessId,
          appointment: id,
          payment: payment?.id || null,
          kind: input.action,
          reason,
          before_value: before,
          after_value: after,
          actor: String(actor || "Administración").slice(0, 200),
        },
      });
    await strapi
      .documents(resources.finance_operations.uid)
      .create({
        data: {
          business: businessId,
          operation_key: operationKey,
          operation_hash: hash,
          result: { saved: true },
        },
      });
    return checkoutSummary(strapi, businessId, id);
  });
}
module.exports = { checkout, checkoutSummary, modifyCheckout };
