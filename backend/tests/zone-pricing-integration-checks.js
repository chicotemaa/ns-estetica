const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { repository, resources } = require("../src/domain/repository");
const { locked } = require("../src/domain/booking");
module.exports = async ({ app, call, token, businessId, date }) => {
  const install = () =>
    call("/backoffice/service-presets/laser", {
      method: "POST",
      token,
      body: "{}",
    });
  assert.equal(
    (
      await call("/backoffice/service-presets/laser", {
        method: "POST",
        body: "{}",
      })
    ).status,
    403,
  );
  const installed = await install();
  assert.equal(installed.status, 200, JSON.stringify(installed.body));
  assert.equal(installed.body.created, true);
  assert.equal((await install()).body.created, false);
  const id = installed.body.id,
    repo = repository(app, businessId),
    filters = [{ field: "id", operator: "eq", value: id }];
  const [initial] = await repo.records("services", filters);
  assert.equal(initial.booking_enabled, false);
  assert.equal(initial.zone_pricing.zones.length, 18);
  await assert.rejects(() =>
    locked(app, businessId, () =>
      repo.mutate("services", "update", { booking_enabled: true }, filters),
    ),
  );
  const config = {
    ...initial.zone_pricing,
    dates: [date],
    opens: "11:00",
    closes: "22:00",
  };
  await locked(app, businessId, () =>
    repo.mutate(
      "services",
      "update",
      { zone_pricing: config, duration_minutes: 45, booking_enabled: true },
      filters,
    ),
  );
  const selection = "zoneIds=axilas,bozo,cavado-bikini";
  const quote = await call(
    `/public/password-fixture/quote?serviceId=${id}&${selection}`,
  );
  assert.equal(quote.status, 200);
  assert.equal(quote.body.totalCents, 1920000);
  const slots = await call(
    `/public/password-fixture/availability?serviceId=${id}&date=${date}&${selection}`,
  );
  assert.equal(slots.status, 200, JSON.stringify(slots.body));
  assert.ok(slots.body.times.length);
  const payload = {
    clientName: "Laser fixture",
    contactInfo: "fixture-only",
    customerEmail: "laser@example.test",
    serviceId: id,
    zoneIds: ["axilas", "bozo", "cavado-bikini"],
    fullBody: false,
    quoteTotalCents: 1,
    appointmentDate: date,
    appointmentTime: slots.body.times[0],
  };
  const book = (body) =>
    call("/public/password-fixture/bookings", {
      method: "POST",
      headers: { "Idempotency-Key": randomUUID() },
      body: JSON.stringify(body),
    });
  assert.equal((await book(payload)).status, 400);
  payload.quoteTotalCents = 1920000;
  const booked = await book(payload);
  assert.equal(booked.status, 200, JSON.stringify(booked.body));
  const stored = await app.db
    .query(resources.appointments.uid)
    .findOne({ where: { documentId: booked.body.createdId } });
  assert.equal(Number(stored.price_snapshot), 19200);
  assert.equal(stored.pricing_snapshot.discountPercent, 20);
  assert.equal(stored.zone_selection.zoneIds.length, 3);
  // Current catalog prices must not overwrite historical reservation amounts.
  await locked(app, businessId, () =>
    repo.mutate(
      "services",
      "update",
      {
        zone_pricing: {
          ...config,
          zones: config.zones.map((z) => ({ ...z, price: z.price + 1000 })),
        },
      },
      filters,
    ),
  );
  await locked(app, businessId, () =>
    repo.mutate("appointments", "update", { notes: "Updated note" }, [
      { field: "id", operator: "eq", value: stored.id },
    ]),
  );
  const saved = (
    await repo.records("appointments", [
      { field: "id", operator: "eq", value: stored.id },
    ])
  )[0];
  assert.equal(Number(saved.price_snapshot), 19200);
  assert.equal(saved.pricing_snapshot.subtotalCents, 2400000);
  // Admin creation also computes its amount server-side, ignoring submitted price.
  const nextSlots = await call(
    `/public/password-fixture/availability?serviceId=${id}&date=${date}&${selection}`,
  );
  const admin = {
    business_id: String(businessId),
    service_id: id,
    staff_member_id: saved.staff_member_id,
    customer_name: "Admin laser fixture",
    customer_contact: "fixture",
    appointment_date: date,
    appointment_time: nextSlots.body.times.at(-1),
    status: "confirmed",
    channel: "manual",
    service_name_snapshot: "Laser",
    price_snapshot: 1,
    duration_snapshot: 45,
    zone_selection: {
      zoneIds: ["axilas", "bozo", "cavado-bikini"],
      fullBody: false,
    },
  };
  const created = await locked(app, businessId, () =>
    repo.mutate("appointments", "insert", admin),
  );
  assert.equal(Number(created[0].price_snapshot), 21600);
  await assert.rejects(() =>
    locked(app, businessId, () =>
      repo.mutate("appointments", "insert", { ...admin, zone_selection: null }),
    ),
  );
  console.log(
    "PASS: laser preset, quote, server-authoritative discounts, persisted breakdown, preserved history and administrator calculation.",
  );
};
