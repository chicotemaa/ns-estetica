// Opt-in verification of a private, reviewed incremental plan. Source files are never committed.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { repository } = require("../src/domain/repository");
const { importPrices, importHistory } = require("../src/domain/workbook");
module.exports = async function (app, businessId) {
  const plan = JSON.parse(readFileSync(".tmp/sheet-update-plan.json"));
  const repo = repository(app, Number(businessId));
  const count = async (resource) => (await repo.records(resource)).length;
  const before = {
    works: await count("work_records"),
    payments: await count("payments"),
    expenses: await count("expenses"),
  };
  await importPrices(app, Number(businessId), plan.prices);
  for (let i = 0; i < plan.rows.length; i += 25)
    await importHistory(app, Number(businessId), plan.rows.slice(i, i + 25));
  for (let i = 0; i < plan.rows.length; i += 25)
    assert.ok(
      (
        await importHistory(app, Number(businessId), plan.rows.slice(i, i + 25))
      ).every((row) => row.replayed),
    );
  assert.equal((await count("work_records")) - before.works, plan.stats.works);
  assert.equal(
    (await count("payments")) - before.payments,
    plan.stats.payments,
  );
  assert.equal(
    (await count("expenses")) - before.expenses,
    plan.stats.expenses,
  );
  const employee = (
    await repo.mutate("staff_members", "insert", {
      business_id: String(businessId),
      full_name: "Patricia",
      employee_code: "ADMI",
      role: "Administración",
      is_active: true,
      accepts_bookings: false,
      payroll_mode: "hourly",
      hourly_rate: 3100,
    })
  )[0];
  for (const shift of plan.hours ?? []) {
    const input = {
      staffId: String(employee.id),
      date: shift.date,
      minutes: shift.minutes,
      startTime: shift.startTime,
      endTime: shift.endTime,
      notes: `Origen: HS TRABAJO!${shift.sourceRow}`,
    };
    const result = await require("../src/domain/finance").writeFinance(
      app,
      Number(businessId),
      "hours",
      input,
      shift.key,
    );
    const replay = await require("../src/domain/finance").writeFinance(
      app,
      Number(businessId),
      "hours",
      input,
      shift.key,
    );
    assert.equal(result.id, replay.id);
    const rows = await repo.records("staff_time_logs", [
      { field: "id", operator: "eq", value: result.id },
    ]);
    assert.equal(Number(rows[0].payable_amount), shift.amount);
  }
  const business = await app.db
    .query("api::business.business")
    .findOne({ where: { id: Number(businessId) } });
  await app.documents("api::business.business").update({
    documentId: business.documentId,
    data: { instagram_handle: "nereaylen", whatsapp_phone: "5493624848842" },
  });
  console.log(
    "PASS current sheet: exact incremental work/payment counts and replay without duplicate charges.",
  );
};
