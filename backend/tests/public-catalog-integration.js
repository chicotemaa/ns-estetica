const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
module.exports = async function ({
  call,
  query,
  token,
  serviceId,
  staffMemberId,
}) {
  const get = async (resource) => (await query(token, { resource })).body.data;
  const post = async (path, body) =>
    call(path, { token, method: "POST", body: JSON.stringify(body) });
  const record = {
    sheet: "DIA",
    row: 19980,
    cells: {
      A: "2026-02-04",
      B: "Daily source check",
      C: "CORTE",
      D: 12000,
      E: "EFECTIVO",
      I: "NEREA",
    },
  };
  const before = (await get("payments")).length;
  for (const date of ["2026-02-04", "2026-02-05"]) {
    const body = {
      kind: "history",
      rows: [{ ...record, cells: { ...record.cells, A: date } }],
    };
    assert.equal((await post("/backoffice/import-workbook", body)).status, 200);
    const replay = await post("/backoffice/import-workbook", body);
    assert.ok(replay.body.data[0].replayed);
  }
  assert.equal(
    (await get("payments")).length,
    before + 2,
    "Daily row reuse preserves both dates exactly once",
  );
  const staff = await get("staff_members");
  const person = staff.find((item) => item.id === staffMemberId);
  const staffUpdate = await query(token, {
    resource: "staff_members",
    operation: "update",
    filters: [{ field: "id", operator: "eq", value: staffMemberId }],
    data: { accepts_bookings: false },
  });
  assert.equal(staffUpdate.status, 200, JSON.stringify(staffUpdate.body));
  assert.ok(
    !(await call("/public/nerea-aylen-barber/catalog")).body.staffMembers.some(
      (item) => item.id === staffMemberId,
    ),
  );
  await query(token, {
    resource: "staff_members",
    operation: "update",
    filters: [{ field: "id", operator: "eq", value: staffMemberId }],
    data: { accepts_bookings: person.accepts_bookings !== false },
  });
  const variant = await query(token, {
    resource: "service_price_variants",
    operation: "insert",
    data: {
      service_id: serviceId,
      variant_name: "Verification variant",
      variant_code: "verification",
      price: 34567.89,
      duration_minutes: 60,
      is_default: false,
      is_active: true,
    },
  });
  assert.equal(variant.status, 200, JSON.stringify(variant.body));
  const serviceVariantId = variant.body.data[0].id;
  const catalog = (await call("/public/nerea-aylen-barber/catalog")).body;
  assert.equal(
    catalog.services
      .find((item) => item.id === serviceId)
      .variants.find((item) => item.id === serviceVariantId).price,
    34567.89,
  );
  const days = [];
  for (let i = 3; i < 10; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  let date, times;
  for (const day of days) {
    const r = await call(
      `/public/nerea-aylen-barber/availability?date=${day}&serviceId=${serviceId}&serviceVariantId=${serviceVariantId}&staffMemberId=${staffMemberId}`,
    );
    if (r.body.times?.length) {
      date = day;
      times = r.body.times;
      break;
    }
  }
  assert.ok(date, "Variant has available dates");
  const booking = await call("/public/nerea-aylen-barber/bookings", {
    method: "POST",
    headers: { "Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      clientName: "Variant test",
      contactInfo: "variant-test",
      serviceId,
      serviceVariantId,
      staffMemberId,
      appointmentDate: date,
      appointmentTime: times[0],
    }),
  });
  assert.equal(booking.status, 200, JSON.stringify(booking.body));
  const appointment = (await get("appointments")).find(
    (item) => item.customer_contact === "variant-test",
  );
  assert.equal(Number(appointment.price_snapshot), 34567.89);
  assert.equal(appointment.duration_snapshot, 60);
  assert.match(appointment.service_name_snapshot, /Verification variant/);
  console.log(
    "PASS: complete catalog, protected variant booking, administrative staff exclusion and daily source reuse.",
  );
};
