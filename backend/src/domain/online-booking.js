"use strict";
const { randomUUID, createHash } = require("node:crypto");
const { errors } = require("@strapi/utils");
const { locked, schedule, choices, publicInput } = require("./booking");
const { withVariant } = require("./public-catalog");
const { resources, getBusiness } = require("./repository");
const { resolveConfiguration, requireEnabled } = require("./customer-config");
const { profile, ACCOUNT } = require("./customer-auth");
const { cents } = require("./money");
const { commissionRate } = require("./finance-rules");
const { queueMessage, drainMessages } = require("./customer-mail");
const mp = require("./mercado-pago");
const INTENT = "api::booking-intent.booking-intent",
  PAYMENT = "api::online-payment.online-payment";
const fail = (message) => {
  throw new errors.ValidationError(message);
};
const depositCents = (total, percent = 50) =>
  Math.ceil((cents(total) * percent) / 100);
function appointmentInstant(data, timeZone) {
  // Resolve the business's wall-clock time to an instant, including timezone offsets.
  const target = Date.parse(
    `${data.appointment_date}T${data.appointment_time.slice(0, 5)}:00Z`,
  );
  let candidate = target;
  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(candidate)
        .map((p) => [p.type, p.value]),
    );
    const local = Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`,
    );
    candidate += target - local;
  }
  return candidate;
}
function canCancel(data, timeZone, now = Date.now()) {
  return appointmentInstant(data, timeZone) - now >= 24 * 3600000;
}
async function activeHolds(strapi, businessId, date) {
  const rows = await strapi.db.query(INTENT).findMany({
    where: {
      business_id: businessId,
      status: "awaiting_payment",
      expires_at: { $gt: new Date().toISOString() },
    },
    limit: 501,
  });
  if (rows.length > 500)
    throw new errors.ApplicationError(
      "La agenda está ocupada. Intentá más tarde.",
    );
  return rows
    .filter((r) => r.booking_data?.appointment_date === date)
    .map((r) => ({
      ...r.booking_data,
      id: `hold:${r.id}`,
      status: "pending",
      staff_member_id: String(r.booking_data.staff_member),
    }));
}
async function start(
  strapi,
  business,
  account,
  input,
  key,
  preferenceCreator = mp.createPreference,
) {
  let config;
  if (
    !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
      key || "",
    )
  )
    fail("Falta el identificador de la reserva.");
  const allowed = [
    "serviceId",
    "serviceVariantId",
    "staffMemberId",
    "appointmentDate",
    "appointmentTime",
    "notes",
    "policyVersion",
    "acceptPolicy",
    "expectedTotalCents",
  ];
  if (!input || typeof input !== "object")
    fail("Solicitud de reserva inválida.");
  if (Object.keys(input).some((k) => !allowed.includes(k)))
    fail("Solicitud de reserva inválida.");
  const person = profile(account);
  const form = publicInput({
    clientName: person.name,
    contactInfo: person.phone,
    customerEmail: account.email,
    ...Object.fromEntries(
      Object.entries(input).filter(
        ([k]) =>
          !["policyVersion", "acceptPolicy", "expectedTotalCents"].includes(k),
      ),
    ),
  });
  const hash = createHash("sha256")
    .update(
      JSON.stringify([form, input.expectedTotalCents, input.policyVersion]),
    )
    .digest("hex");
  let created = false;
  let intent = await locked(strapi, business.id, async () => {
    const db = strapi.db.query(INTENT),
      previous = await db.findOne({ where: { key } });
    if (previous) {
      if (
        previous.account_id !== account.id ||
        previous.business_id !== business.id ||
        previous.request_hash !== hash
      )
        fail("Este intento ya corresponde a otra solicitud.");
      return previous;
    }
    config = requireEnabled(await resolveConfiguration(strapi, business.id));
    if (
      input.policyVersion !== config.policyVersion ||
      input.acceptPolicy !== true
    )
      fail(
        "Las condiciones de la seña cambiaron. Actualizá la página y aceptalas para continuar.",
      );
    const active = await db.count({
      where: {
        business_id: business.id,
        account_id: account.id,
        status: "awaiting_payment",
        expires_at: { $gt: new Date().toISOString() },
      },
    });
    if (active >= 2)
      fail(
        "Ya tenés una reserva esperando el pago. Revisala antes de iniciar otra.",
      );
    const state = withVariant(
      await schedule(strapi, business.id, form.appointmentDate),
      form.serviceId,
      form.serviceVariantId,
    );
    const choice = choices(
      state,
      form.appointmentDate,
      form.serviceId,
      form.staffMemberId,
    ).find((c) => c.slots.includes(form.appointmentTime));
    if (!choice)
      throw new errors.ApplicationError(
        "Ese horario ya no está disponible. Elegí otro.",
        { code: "SLOT_UNAVAILABLE" },
      );
    const service = state.services.find((s) => s.id === form.serviceId),
      total = cents(service.price);
    if (
      !total ||
      !Number.isSafeInteger(input.expectedTotalCents) ||
      input.expectedTotalCents !== total
    )
      fail("El precio cambió. Actualizá el servicio antes de continuar.");
    created = true;
    return db.create({
      data: {
        business_id: business.id,
        account_id: account.id,
        key,
        request_hash: hash,
        status: "awaiting_payment",
        expires_at: new Date(
          Date.now() + config.holdMinutes * 60000,
        ).toISOString(),
        total_cents: total,
        deposit_cents: depositCents(service.price, config.depositPercent),
        deposit_percent: config.depositPercent,
        reference: `estetica-${randomUUID()}`,
        policy_version: config.policyVersion,
        policy_accepted_at: new Date().toISOString(),
        booking_data: {
          business: business.id,
          service: Number(service.id),
          staff_member: Number(choice.staff.id),
          customer_name: person.name,
          customer_contact: person.phone,
          customer_email: account.email,
          appointment_date: form.appointmentDate,
          appointment_time: `${form.appointmentTime}:00.000`,
          channel: "website",
          notes: form.notes || null,
          service_name_snapshot: service.name,
          staff_name_snapshot: choice.staff.full_name,
          price_snapshot: total / 100,
          duration_snapshot: service.duration_minutes,
        },
      },
    });
  });
  if (created) {
    try {
      const preference = await preferenceCreator(intent, undefined, config);
      intent = await locked(strapi, business.id, () =>
        strapi.db
          .query(INTENT)
          .update({ where: { id: intent.id }, data: preference }),
      );
    } catch {
      // The provider may have accepted the request. Do not issue a second preference.
      throw new errors.ApplicationError(
        "No pudimos abrir Mercado Pago. Revisá Mis reservas; el horario se liberará si no se completa el pago.",
      );
    }
  }
  return present(strapi, intent, business);
}
async function present(strapi, row, business) {
  const appointment = row.appointment_id
    ? await strapi.db.query(resources.appointments.uid).findOne({
        where: { id: row.appointment_id, business: { id: business.id } },
      })
    : null;
  const data = appointment || row.booking_data;
  const status =
    appointment?.status === "cancelled"
      ? "cancelled"
      : row.status === "awaiting_payment" &&
          Date.parse(row.expires_at) <= Date.now()
        ? "expired"
        : row.status;
  const paymentRows = row.appointment_id
    ? await strapi.db.query(resources.payments.uid).findMany({
        where: {
          appointment: { id: row.appointment_id },
          business: { id: business.id },
          status: "completed",
        },
      })
    : [];
  const paid = paymentRows.reduce((sum, p) => sum + cents(p.amount), 0);
  const reviewPayments =
    status === "review"
      ? await strapi.db.query(PAYMENT).findMany({
          where: { intent_id: row.id, review_reason: { $notNull: true } },
        })
      : [];
  const email = await strapi.db
    .query("api::customer-message.customer-message")
    .findOne({ where: { intent_id: row.id }, orderBy: { createdAt: "desc" } });
  return {
    id: row.key,
    status,
    appointmentStatus: appointment?.status || null,
    appointmentId: row.appointment_id ? String(row.appointment_id) : null,
    service: data.service_name_snapshot,
    professional: data.staff_name_snapshot,
    date: data.appointment_date,
    time: data.appointment_time.slice(0, 5),
    totalCents: cents(appointment?.checkout_total ?? data.price_snapshot),
    depositCents: Number(row.deposit_cents),
    depositPercent: row.deposit_percent ?? 50,
    paidCents: paid,
    balanceCents: Math.max(
      0,
      cents(appointment?.checkout_total ?? data.price_snapshot) - paid,
    ),
    expiresAt: row.expires_at,
    checkoutUrl: status === "awaiting_payment" ? row.checkout_url : null,
    canCancel:
      status === "confirmed" &&
      appointment?.status === "confirmed" &&
      canCancel(data, business.time_zone || "America/Argentina/Buenos_Aires"),
    emailStatus: email?.status || null,
    reviewAmountCents: reviewPayments.reduce(
      (sum, p) => sum + Number(p.amount_cents),
      0,
    ),
  };
}
async function list(strapi, business, account, key) {
  const rows = await strapi.db.query(INTENT).findMany({
    where: {
      business_id: business.id,
      account_id: account.id,
      ...(key ? { key } : {}),
    },
    orderBy: { createdAt: "desc" },
    limit: 50,
  });
  if (key && !rows.length)
    throw new errors.NotFoundError("Reserva no encontrada.");
  const bookings = await Promise.all(
    rows.map((row) => present(strapi, row, business)),
  );
  return key ? bookings[0] : { bookings };
}
async function receivePayment(strapi, business, payment) {
  const c = await resolveConfiguration(strapi, business.id),
    id = String(payment.id || "");
  if (
    !/^\d+$/.test(id) ||
    String(payment.collector_id) !== c.MP_COLLECTOR_ID ||
    payment.currency_id !== "ARS" ||
    payment.live_mode !== (c.mode === "production")
  )
    throw new errors.ValidationError(
      "El pago no corresponde a esta integración.",
    );
  const amount = cents(payment.transaction_amount),
    refunded = cents(payment.transaction_amount_refunded || 0);
  return locked(strapi, business.id, async () => {
    const intents = strapi.db.query(INTENT),
      payments = strapi.db.query(PAYMENT);
    let intent = await intents.findOne({
      where: {
        business_id: business.id,
        reference: payment.external_reference,
      },
    });
    if (!intent) return { ignored: true };
    const previous = await payments.findOne({ where: { provider_id: id } });
    if (previous && previous.intent_id !== intent.id)
      throw new errors.ValidationError("Referencia de pago inconsistente.");
    if (
      previous?.provider_updated_at &&
      Date.parse(payment.date_last_updated) <
        Date.parse(previous.provider_updated_at)
    )
      return { replayed: true };
    const details = {
      business_id: business.id,
      intent_id: intent.id,
      provider_id: id,
      provider_status: payment.status,
      amount_cents: amount,
      refunded_cents: refunded,
      provider_updated_at: Number.isFinite(
        Date.parse(payment.date_last_updated),
      )
        ? new Date(payment.date_last_updated).toISOString()
        : new Date().toISOString(),
    };
    let row = previous
      ? await payments.update({ where: { id: previous.id }, data: details })
      : await payments.create({ data: details });
    if (["refunded", "charged_back"].includes(payment.status) || refunded > 0) {
      const reason =
        payment.status === "charged_back"
          ? "Mercado Pago informó un contracargo. Revisar Caja y liquidaciones."
          : "Mercado Pago informó una devolución. Revisar Caja y liquidaciones.";
      await payments.update({
        where: { id: row.id },
        data: { review_reason: reason },
      });
      await intents.update({
        where: { id: intent.id },
        data: { status: "review", review_reason: reason },
      });
      return { review: true };
    }
    if (payment.status !== "approved") return { pending: true };
    if (previous?.ledger_id) return { replayed: true };
    let reason =
      amount !== Number(intent.deposit_cents)
        ? "El importe recibido no coincide con la seña."
        : intent.payment_id && intent.payment_id !== id
          ? "Se recibió un segundo pago para la misma reserva."
          : intent.status !== "awaiting_payment" ||
              Date.parse(intent.expires_at) <= Date.now()
            ? "El pago llegó después de liberar el horario."
            : null;
    if (!reason) {
      const snapshot = intent.booking_data;
      const state = await schedule(
        strapi,
        business.id,
        snapshot.appointment_date,
      );
      state.services = state.services.map((s) =>
        s.id === String(snapshot.service)
          ? { ...s, duration_minutes: snapshot.duration_snapshot }
          : s,
      );
      const stillAvailable = choices(
        state,
        snapshot.appointment_date,
        String(snapshot.service),
        String(snapshot.staff_member),
        {
          ignoreId: `hold:${intent.id}`,
          enforceLead: false,
          publicOnly: false,
        },
      ).some((c) => c.slots.includes(snapshot.appointment_time.slice(0, 5)));
      if (!stillAvailable)
        reason =
          "La disponibilidad cambió durante el pago. Revisar el horario con el cliente.";
    }
    if (reason) {
      await payments.update({
        where: { id: row.id },
        data: { review_reason: reason },
      });
      await intents.update({
        where: { id: intent.id },
        data: { status: "review", review_reason: reason },
      });
      return { review: true };
    }
    const account = await strapi.db
      .query(ACCOUNT)
      .findOne({ where: { id: intent.account_id, business_id: business.id } });
    let customer =
      account.customer_id &&
      (await strapi.db.query(resources.customers.uid).findOne({
        where: { id: account.customer_id, business: { id: business.id } },
      }));
    if (!customer) {
      // Never claim imported customer history by guessing a phone or matching a name.
      customer = await strapi.documents(resources.customers.uid).create({
        data: {
          business: business.id,
          full_name: intent.booking_data.customer_name,
          primary_contact: intent.booking_data.customer_contact,
          phone: intent.booking_data.customer_contact,
          email: account.email,
          status: "active",
          marketing_opt_in: false,
          joined_at: new Date().toISOString(),
        },
      });
      await strapi.db.query(ACCOUNT).update({
        where: { id: account.id },
        data: { customer_id: customer.id },
      });
    }
    const appointment = await strapi
      .documents(resources.appointments.uid)
      .create({
        data: {
          ...intent.booking_data,
          customer: customer.id,
          status: "confirmed",
          request_key: `online:${intent.key}`,
          request_hash: intent.request_hash,
        },
      });
    const staff = await strapi.db.query(resources.staff_members.uid).findOne({
        where: {
          id: intent.booking_data.staff_member,
          business: { id: business.id },
        },
      }),
      rate = commissionRate(staff);
    const ledger = await strapi.documents(resources.payments.uid).create({
      data: {
        business: business.id,
        appointment: appointment.id,
        customer: customer.id,
        staff_member: staff.id,
        description: `Seña · ${intent.booking_data.service_name_snapshot} · ${intent.booking_data.customer_name}`,
        amount: amount / 100,
        method: "mercado_pago",
        status: "completed",
        transaction_id: id,
        processed_at: payment.date_approved || new Date().toISOString(),
        commission_rate: rate,
        commission_amount: Math.round((amount * rate) / 100) / 100,
        checkout_key: `mp:${id}`,
        checkout_hash: intent.request_hash,
      },
    });
    await payments.update({
      where: { id: row.id },
      data: { ledger_id: ledger.id },
    });
    intent = await intents.update({
      where: { id: intent.id },
      data: {
        status: "confirmed",
        payment_id: id,
        appointment_id: appointment.id,
      },
    });
    await strapi.documents(resources.customers.uid).update({
      documentId: customer.documentId,
      data: {
        total_appointments: await strapi.db
          .query(resources.appointments.uid)
          .count({ where: { customer: { id: customer.id } } }),
      },
    });
    const currency = (n) =>
      new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
      }).format(n / 100);
    await queueMessage(strapi, {
      business_id: business.id,
      intent_id: intent.id,
      key: `confirmation:${intent.id}`,
      recipient: account.email,
      subject: "Tu turno está confirmado · Natalia Sánchez",
      text: `Hola, ${intent.booking_data.customer_name}.\n\nTu turno está confirmado.\n${intent.booking_data.service_name_snapshot}\n${intent.booking_data.appointment_date} a las ${intent.booking_data.appointment_time.slice(0, 5)} (hora de Argentina).\nProfesional: ${intent.booking_data.staff_name_snapshot}\nSeña abonada: ${currency(amount)}\nSaldo: ${currency(Number(intent.total_cents) - amount)}\n\nPodés cancelar con al menos 24 horas de anticipación. La seña no se devuelve al cancelar.\nVer tu reserva: ${c.CUSTOMER_SITE_URL}/reservas/pago?reserva=${intent.key}`,
    });
    return { confirmed: true };
  });
}
async function cancel(strapi, business, account, key) {
  return locked(strapi, business.id, async () => {
    const db = strapi.db.query(INTENT),
      row = await db.findOne({
        where: { key, account_id: account.id, business_id: business.id },
      });
    if (!row) throw new errors.NotFoundError("Reserva no encontrada.");
    if (row.status === "cancelled") return { cancelled: true };
    if (row.status === "awaiting_payment") {
      await db.update({ where: { id: row.id }, data: { status: "cancelled" } });
      return { cancelled: true };
    }
    const appointment =
      row.appointment_id &&
      (await strapi.db.query(resources.appointments.uid).findOne({
        where: { id: row.appointment_id, business: { id: business.id } },
      }));
    if (
      row.status !== "confirmed" ||
      appointment?.status !== "confirmed" ||
      !canCancel(
        appointment,
        business.time_zone || "America/Argentina/Buenos_Aires",
      )
    )
      fail(
        "Para cancelar desde la web faltan al menos 24 horas para el turno. Si necesitás ayuda, contactá al salón.",
      );
    await strapi.documents(resources.appointments.uid).update({
      documentId: appointment.documentId,
      data: {
        status: "cancelled",
        cancellation_reason: "Cancelado por el cliente. Seña no reembolsable.",
      },
    });
    await db.update({ where: { id: row.id }, data: { status: "cancelled" } });
    await queueMessage(strapi, {
      business_id: business.id,
      intent_id: row.id,
      key: `cancellation:${row.id}`,
      recipient: account.email,
      subject: "Cancelación de turno · Natalia Sánchez",
      text: `Cancelaste ${appointment.service_name_snapshot} del ${appointment.appointment_date} a las ${appointment.appointment_time.slice(0, 5)}.\n\nLa seña no se devuelve, según las condiciones aceptadas al reservar.`,
    });
    return { cancelled: true };
  });
}
async function maintain(strapi) {
  const business = await getBusiness(strapi);
  await locked(strapi, business.id, () =>
    strapi.db.query(INTENT).updateMany({
      where: {
        business_id: business.id,
        status: "awaiting_payment",
        expires_at: { $lte: new Date().toISOString() },
      },
      data: { status: "expired" },
    }),
  );
  await drainMessages(strapi, business.id);
}
async function adminStatus(strapi, business) {
  const c = await resolveConfiguration(strapi, business.id);
  const [rows, payments, messages] = await Promise.all([
    strapi.db.query(INTENT).findMany({
      where: { business_id: business.id },
      orderBy: { createdAt: "desc" },
      limit: 50,
    }),
    strapi.db.query(PAYMENT).findMany({
      where: { business_id: business.id, review_reason: { $notNull: true } },
      orderBy: { updatedAt: "desc" },
      limit: 50,
    }),
    strapi.db.query("api::customer-message.customer-message").findMany({
      where: {
        business_id: business.id,
        status: { $in: ["failed", "unknown"] },
      },
      orderBy: { updatedAt: "desc" },
      limit: 50,
    }),
  ]);
  return {
    ...require("./customer-settings").summary(c),
    enabled: c.enabled,
    ready: c.ready,
    requested: c.requested,
    mode: c.mode,
    missing: c.missing,
    googleConfigured: !!c.googleClientId,
    googleReady: c.authReady && c.googleEnabled && !!c.googleClientId,
    depositPercent: c.depositPercent,
    cancellationHours: 24,
    holdMinutes: c.holdMinutes,
    bookings: await Promise.all(
      rows.map(async (r) => ({
        ...(await present(strapi, r, business)),
        customer: r.booking_data.customer_name,
        reviewReason: r.review_reason || null,
      })),
    ),
    paymentReviews: payments.map((p) => ({
      id: p.provider_id,
      status: p.provider_status,
      amountCents: Number(p.amount_cents),
      reason: p.review_reason,
    })),
    mailIssues: messages.map((m) => ({
      id: m.id,
      recipient: m.recipient,
      status: m.status,
      error: m.error,
    })),
  };
}
module.exports = {
  INTENT,
  PAYMENT,
  depositCents,
  appointmentInstant,
  canCancel,
  activeHolds,
  start,
  list,
  present,
  receivePayment,
  cancel,
  maintain,
  adminStatus,
};
