const assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
module.exports = async function ({
  call,
  query,
  token,
  businessId,
  serviceId,
  app,
}) {
  const { locked } = require("../src/domain/booking"),
    today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date());
  const ok = (r) => {
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body;
  };
  const write = (method, input, key = randomUUID(), auth = token) =>
    call("/backoffice/checkout", {
      token: auth,
      method,
      body: JSON.stringify(input),
      headers: { "Idempotency-Key": key },
    });
  const staff = ok(
    await query(token, {
      resource: "staff_members",
      operation: "insert",
      data: {
        business_id: businessId,
        full_name: "Checkout fixture",
        payroll_mode: "percentage",
        collection_commission_rate: 50,
        payroll_cadence: "monthly",
      },
    }),
  ).data[0];
  const appointment = await locked(app, Number(businessId), () =>
    app
      .documents("api::appointment.appointment")
      .create({
        data: {
          business: Number(businessId),
          service: Number(serviceId),
          staff_member: Number(staff.id),
          customer_name: "Split test",
          customer_contact: "test",
          appointment_date: today,
          appointment_time: "09:00:00.000",
          status: "confirmed",
          channel: "manual",
          service_name_snapshot: "Checkout test",
          staff_name_snapshot: staff.full_name,
          price_snapshot: 100,
          duration_minutes_snapshot: 30,
        },
      }),
  );
  const id = String(appointment.id),
    get = async () =>
      ok(await call(`/backoffice/appointments/${id}/checkout`, { token }));
  const input = {
      appointmentId: id,
      payments: [
        { method: "cash", amount: 30 },
        { method: "transfer", amount: 20 },
      ],
      expectedBalanceCents: 10000,
      complete: false,
    },
    key = randomUUID();
  assert.equal((await write("POST", input, key, null)).status, 403);
  assert.equal(
    (
      await write("POST", {
        ...input,
        payments: [
          { method: "cash", amount: 30 },
          { method: "transfer", amount: 80 },
        ],
      })
    ).status,
    400,
  );
  assert.equal((await get()).payments.length, 0);
  const race = await Promise.all([
    write("POST", input, key),
    write("POST", input, key),
  ]);
  race.forEach(ok);
  let view = await get();
  assert.equal(view.payments.length, 2);
  assert.equal(view.paidCents, 5000);
  assert.equal(view.balanceCents, 5000);
  assert.equal(view.appointment.status, "confirmed");
  assert.equal(
    view.payments.reduce((n, p) => n + p.commissionCents, 0),
    2500,
  );
  assert.equal(
    (await write("POST", input)).status,
    400,
    "stale amount cannot double collect",
  );
  assert.equal(
    (await write("POST", { ...input, complete: true }, key)).status,
    400,
  );
  const edit = (action, extra = {}) => ({
    appointmentId: id,
    action,
    reason: "Corrección acordada con cliente",
    expectedTotalCents: view.totalCents,
    expectedPaidCents: view.paidCents,
    ...extra,
  });
  assert.equal(
    (await write("PATCH", edit("adjustment", { total: 49 }))).status,
    400,
  );
  const adjust = edit("adjustment", { total: 90 }),
    adjustKey = randomUUID();
  view = ok(await write("PATCH", adjust, adjustKey));
  assert.equal(view.totalCents, 9000);
  assert.equal(view.baseTotalCents, 10000);
  assert.equal(view.balanceCents, 4000);
  assert.equal(ok(await write("PATCH", adjust, adjustKey)).events.length, 1);
  let payment = view.payments[0];
  view = ok(
    await write(
      "PATCH",
      edit("method", {
        paymentId: payment.id,
        expectedMethod: payment.method,
        method: "card",
      }),
    ),
  );
  assert.equal(view.payments.find((p) => p.id === payment.id).method, "card");
  assert.equal(view.paidCents, 5000);
  assert.equal(
    (
      await write(
        "PATCH",
        edit("void", { paymentId: payment.id, expectedMethod: payment.method }),
      )
    ).status,
    400,
  );
  view = ok(
    await write(
      "PATCH",
      edit("void", { paymentId: payment.id, expectedMethod: "card" }),
    ),
  );
  assert.equal(view.payments.find((p) => p.id === payment.id).status, "voided");
  assert.equal(view.balanceCents, 7000);
  assert.equal(view.events.length, 3);
  const immutable = await query(token, {
    resource: "checkout_events",
    operation: "delete",
    filters: [{ field: "id", operator: "eq", value: view.events[0].id }],
  });
  assert.equal(immutable.status, 400);
  const remaining = {
    appointmentId: id,
    payments: [
      { method: "cash", amount: 0.01 },
      { method: "transfer", amount: 69.99 },
    ],
    expectedBalanceCents: 7000,
    complete: true,
  };
  view = ok(await write("POST", remaining));
  assert.equal(view.balanceCents, 0);
  assert.equal(view.appointment.status, "completed");
  assert.equal(
    view.payments
      .filter((p) => p.status === "completed")
      .reduce((n, p) => n + p.commissionCents, 0),
    4500,
    "commission rounding for split cents reconciles",
  );
  const salary = ok(
    await call(
      `/backoffice/finance/payroll?staffId=${staff.id}&month=${today.slice(0, 7)}&period=first`,
      { token },
    ),
  );
  assert.equal(salary.unpaidCents, 4500);
  ok(
    await call("/backoffice/finance/payroll", {
      token,
      method: "POST",
      body: JSON.stringify({
        staffId: staff.id,
        month: today.slice(0, 7),
        period: "first",
        date: today,
        method: "cash",
        expectedAmountCents: 4500,
      }),
      headers: { "Idempotency-Key": randomUUID() },
    }),
  );
  payment = view.payments.find((p) => p.status === "completed");
  assert.equal(
    (
      await write(
        "PATCH",
        edit("void", { paymentId: payment.id, expectedMethod: payment.method }),
      )
    ).status,
    400,
    "settled commission cannot be voided",
  );
  assert.ok(
    (await get()).payments
      .filter((p) => p.status === "completed")
      .every((p) => !p.canVoid),
  );
  const other = await app
    .documents("api::business.business")
    .create({
      data: { name: "Checkout isolation", slug: "checkout-isolation" },
    });
  const foreign = await locked(app, other.id, () =>
    app
      .documents("api::appointment.appointment")
      .create({
        data: {
          business: other.id,
          customer_name: "Foreign",
          customer_contact: "test",
          appointment_date: today,
        appointment_time: "12:00:00.000",
          status: "confirmed",
          channel: "manual",
          price_snapshot: 100,
          service_name_snapshot: "Foreign",
          duration_minutes_snapshot: 30,
        },
      }),
  );
  assert.equal(
    (await write("POST", { ...input, appointmentId: String(foreign.id) }))
      .status,
    404,
  );
  ok(
    await query(token, {
      resource: "businesses",
      operation: "update",
      filters: [{ field: "id", operator: "eq", value: businessId }],
      data: {
        brand_palette: "forest",
        brand_initials: "QA",
        short_name: "Test Brand",
        hero_headline: "Brand title",
        hero_copy: "Brand description",
        booking_intro: "Choose a service",
      },
    }),
  );
  const brand = ok(await call("/public/nerea-aylen-barber/catalog")).brand;
  assert.equal(brand.palette, "forest");
  assert.equal(brand.shortName, "Test Brand");
  assert.equal(
    (
      await query(token, {
        resource: "businesses",
        operation: "update",
        filters: [{ field: "id", operator: "eq", value: businessId }],
        data: { brand_initials: "TOOLONG" },
      })
    ).status,
    400,
  );
  console.log(
    "PASS: split checkout, atomicity, retry, stale balance, adjustments, correction audit, voided cash, payroll guard, tenant isolation and public brand.",
  );
  return id;
};
