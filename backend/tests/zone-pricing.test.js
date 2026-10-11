const { test } = require("node:test"),
  assert = require("node:assert/strict");
const pricing = require("../src/domain/zone-pricing");
const service = { zone_pricing: pricing.preset(), duration_minutes: 45 };
test("laser price list and tier discounts use integer cents and never stack", () => {
  assert.equal(service.zone_pricing.zones.length, 18);
  assert.equal(
    pricing.quote(service, { zoneIds: ["axilas"] }).totalCents,
    800000,
  );
  assert.equal(
    pricing.quote(service, { zoneIds: ["axilas", "bozo"] }).discountPercent,
    0,
  );
  const q = pricing.quote(service, {
    zoneIds: ["axilas", "bozo", "cavado-bikini"],
  });
  assert.equal(q.subtotalCents, 2400000);
  assert.equal(q.discountCents, 480000);
  assert.equal(q.totalCents, 1920000);
  const four = pricing.quote(service, {
    zoneIds: ["axilas", "bozo", "cavado-bikini", "medio-brazo"],
  });
  assert.equal(four.subtotalCents, 3200000);
  assert.equal(four.discountPercent, 30);
  assert.equal(four.totalCents, 2240000);
  const five = pricing.quote(service, {
    zoneIds: ["axilas", "bozo", "cavado-bikini", "medio-brazo", "manos"],
  });
  assert.equal(five.totalCents, 2590000);
  assert.equal(
    pricing.quote(service, {
      zoneIds: service.zone_pricing.zones.map((z) => z.id),
    }).totalCents,
    13020000,
  );
  const full = pricing.quote(service, { fullBody: true });
  assert.equal(full.subtotalCents, 18600000);
  assert.equal(full.discountPercent, 30);
  assert.equal(full.totalCents, 13020000);
});
test("rejects duplicate zones, unknown choices and invalid configuration", () => {
  assert.throws(() =>
    pricing.quote(service, { zoneIds: ["bozo", "bozo", "bozo"] }),
  );
  assert.throws(() => pricing.quote(service, { zoneIds: ["fake"] }));
  assert.throws(() => pricing.quote(service, {}));
  assert.throws(() => pricing.quote(service, { fullBody: "true" }));
  assert.throws(() =>
    pricing.validate({ ...pricing.preset(), discountPercent: 101 }),
  );
  assert.throws(() =>
    pricing.validate({ ...pricing.preset(), dates: ["2026-02-30"] }),
  );
});
test("service-specific dates, opening hours and 24-hour cutoff restrict availability", () => {
  const { availableSlots } = require("../src/domain/availability");
  const args = {
    date: "2026-10-14",
    service: {
      ...service,
      id: "1",
      is_active: true,
      duration_minutes: 30,
      zone_pricing: {
        ...pricing.preset(),
        dates: ["2026-10-14"],
        opens: "12:00",
        closes: "14:00",
      },
    },
    staff: { id: "1", is_active: true },
    hours: [
      {
        day_of_week: 3,
        is_open: true,
        open_time: "09:00",
        close_time: "18:00",
      },
    ],
    staffHours: [],
    assignments: [],
    appointments: [],
    settings: {
      lead_time_minutes: 0,
      max_booking_days_in_advance: 30,
      slot_interval_minutes: 30,
      buffer_between_appointments_minutes: 0,
    },
    timeZone: "America/Argentina/Buenos_Aires",
    now: new Date("2026-10-13T12:30:00-03:00"),
  };
  assert.deepEqual(availableSlots(args), ["12:30", "13:00", "13:30"]);
  assert.deepEqual(
    availableSlots({
      ...args,
      service: {
        ...args.service,
        zone_pricing: { ...args.service.zone_pricing, dates: [] },
      },
    }),
    [],
  );
  assert.equal(
    availableSlots({
      ...args,
      now: new Date("2026-10-13T12:31:00-03:00"),
    }).includes("12:30"),
    false,
  );
});
