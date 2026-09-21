"use strict";
const assert = require("node:assert/strict");
module.exports = async function checkAgenda({
  app,
  call,
  token,
  businessId,
  appointmentId,
  date,
  serviceId,
  time,
}) {
  const query = (data) =>
    call("/backoffice/query", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  const mutate = (resource, operation, data, id) =>
    query({
      resource,
      operation,
      data,
      filters: id ? [{ field: "id", operator: "eq", value: String(id) }] : [],
    });
  const active = () => query({ resource: "appointments" });
  const slots = () =>
    call(
      `/public/password-fixture/availability?date=${date}&serviceId=${serviceId}`,
    );
  assert.equal(
    (
      await call("/backoffice/query", {
        method: "POST",
        body: JSON.stringify({ resource: "schedule_blocks" }),
      })
    ).status,
    403,
  );
  let result = await mutate(
    "appointments",
    "update",
    { notes: "Nota editada" },
    appointmentId,
  );
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const beforeDelete = await app.db
    .query("api::appointment.appointment")
    .findOne({ where: { id: appointmentId } });
  const blockInput = {
    business_id: String(businessId),
    block_date: date,
    start_time: time,
    end_time: `${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}:${time.slice(3, 5)}`,
    reason: "Almuerzo flexible",
    staff_member_id: null,
  };
  assert.equal(
    (await mutate("schedule_blocks", "insert", blockInput)).status,
    400,
    "cannot block an existing appointment",
  );
  result = await mutate(
    "appointments",
    "update",
    { status: "cancelled", cancellation_reason: "Cambio de planes" },
    appointmentId,
  );
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.ok(
    (await slots()).body.times.includes(time),
    "cancellation frees the slot",
  );
  result = await mutate(
    "appointments",
    "update",
    { status: "confirmed" },
    appointmentId,
  );
  assert.equal(result.status, 200, JSON.stringify(result.body));
  result = await mutate("appointments", "delete", undefined, appointmentId);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const hidden = await app.db
    .query("api::appointment.appointment")
    .findOne({ where: { id: appointmentId } });
  assert.ok(hidden.deleted_at);
  assert.equal(hidden.status, "confirmed");
  assert.equal(hidden.documentId, beforeDelete.documentId);
  assert.ok(
    !(await active()).body.data.some((a) => a.id === String(appointmentId)),
  );
  assert.ok(
    (
      await query({ resource: "appointments", includeDeleted: true })
    ).body.data.some((a) => a.id === String(appointmentId)),
  );
  assert.ok((await slots()).body.times.includes(time));
  assert.equal(
    (
      await mutate(
        "appointments",
        "update",
        { notes: "No permitido" },
        appointmentId,
      )
    ).status,
    400,
  );
  result = await mutate("schedule_blocks", "insert", blockInput);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const blockId = result.body.data[0].id;
  assert.ok(
    !(await slots()).body.times.includes(time),
    "block affects public availability",
  );
  assert.equal(
    (
      await mutate(
        "appointments",
        "update",
        { deleted_at: null },
        appointmentId,
      )
    ).status,
    400,
    "restore checks occupied period",
  );
  assert.equal(
    (
      await mutate(
        "schedule_blocks",
        "update",
        { reason: "Pausa actualizada" },
        blockId,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await mutate("schedule_blocks", "insert", {
        ...blockInput,
        end_time: "00:00",
      })
    ).status,
    400,
  );
  assert.equal(
    (await mutate("schedule_blocks", "delete", undefined, blockId)).status,
    200,
  );
  assert.equal(
    (
      await mutate(
        "appointments",
        "update",
        { deleted_at: null },
        appointmentId,
      )
    ).status,
    200,
  );
  assert.ok(
    (await active()).body.data.some((a) => a.id === String(appointmentId)),
  );
  assert.ok(!(await slots()).body.times.includes(time));
  const movedTime = (await slots()).body.times.at(-1);
  assert.equal(
    (
      await mutate(
        "appointments",
        "update",
        { appointment_time: movedTime },
        appointmentId,
      )
    ).status,
    200,
    "rescheduling works",
  );
  const payment = await app
    .documents("api::payment.payment")
    .create({
      data: {
        business: businessId,
        appointment: appointmentId,
        description: "Archive preservation fixture",
        amount: 100,
        method: "cash",
        status: "completed",
      },
    });
  assert.equal(
    (await mutate("appointments", "delete", undefined, appointmentId)).status,
    200,
    "soft deletion preserves paid appointments",
  );
  const preservedPayment = await app.db
    .query("api::payment.payment")
    .findOne({ where: { id: payment.id }, populate: ["appointment"] });
  assert.equal(preservedPayment.appointment.id, appointmentId);
  assert.equal(Number(preservedPayment.amount), 100);
  assert.ok(
    (
      await query({
        resource: "appointments",
        filters: [{ field: "deleted_at", operator: "neq", value: null }],
      })
    ).body.data.some((a) => a.id === String(appointmentId)),
  );
  // Business scoping also applies to blocks and archived records.
  const other = await app
    .documents("api::business.business")
    .create({
      data: {
        name: "Agenda other tenant",
        slug: "agenda-other-tenant",
        time_zone: "America/Argentina/Buenos_Aires",
      },
    });
  const foreignBlock = await app
    .documents("api::schedule-block.schedule-block")
    .create({
      data: {
        business: other.id,
        block_date: date,
        start_time: "18:00:00.000",
        end_time: "19:00:00.000",
        reason: "Private",
      },
    });
  assert.ok(
    !(await query({ resource: "schedule_blocks" })).body.data.some(
      (b) => b.id === String(foreignBlock.id),
    ),
  );
  assert.equal(
    (
      await mutate(
        "schedule_blocks",
        "update",
        { reason: "Unauthorized" },
        foreignBlock.id,
      )
    ).body.data.length,
    0,
  );
  assert.equal(
    (
      await app.db
        .query("api::schedule-block.schedule-block")
        .findOne({ where: { id: foreignBlock.id } })
    ).reason,
    "Private",
  );
  // CRUD smoke checks on the main catalog resources with disposable rows.
  for (const [resource, create, change] of [
    [
      "customers",
      {
        business_id: String(businessId),
        full_name: "CRUD fixture",
        primary_contact: "crud-fixture",
        email: "crud@example.test",
        status: "lead",
      },
      { full_name: "CRUD updated" },
    ],
    [
      "staff_members",
      {
        business_id: String(businessId),
        full_name: "CRUD employee",
        is_active: true,
      },
      { full_name: "CRUD employee updated" },
    ],
    [
      "services",
      {
        business_id: String(businessId),
        name: "CRUD service",
        price: 100,
        duration_minutes: 30,
        is_active: false,
      },
      { price: 200, duration_minutes: 45 },
    ],
  ]) {
    const inserted = await mutate(resource, "insert", create);
    assert.equal(inserted.status, 200, JSON.stringify(inserted.body));
    const id = inserted.body.data[0].id;
    assert.equal((await mutate(resource, "update", change, id)).status, 200);
    assert.ok((await query({ resource })).body.data.some((r) => r.id === id));
    if (resource === "services")
      assert.equal(
        (
          await mutate("service_price_variants", "insert", {
            service_id: id,
            variant_name: "Base",
            variant_code: "base",
            price: 200,
            duration_minutes: 45,
            is_default: true,
            is_active: true,
          })
        ).status,
        200,
      );
    assert.equal((await mutate(resource, "delete", undefined, id)).status, 200);
    assert.ok(!(await query({ resource })).body.data.some((r) => r.id === id));
  }
  console.log(
    "PASS: appointment edit/cancel/soft delete/restore, block CRUD and conflicts, tenant isolation, customer/staff/service CRUD.",
  );
};
