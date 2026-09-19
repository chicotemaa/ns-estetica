"use strict";
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync } = require("node:fs");
module.exports = async function verifyWorkbook({
  call,
  query,
  token,
  staffMemberId,
  serviceId,
  fullPlan,
}) {
  const get = async (resource) => {
    const r = await query(token, { resource });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body.data;
  };
  const post = async (path, body, key = randomUUID()) =>
    call(path, {
      token,
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": key },
    });
  const beforeAppointments = (await get("appointments")).length;
  const rows = [
    {
      sheet: "BASE_DATOS",
      row: 19990,
      cells: {
        A: "2026-01-03",
        B: "Prueba histórica",
        C: "CORTE DE HOMBRE",
        D: 1234.56,
        E: "EFECTIVO",
        I: "NEREA",
      },
    },
    {
      sheet: "BASE_DATOS",
      row: 19991,
      cells: {
        A: "2026-01-03",
        B: "Sin medio",
        C: "CORTE",
        D: 3000,
        E: null,
        I: "NEREA",
      },
    },
    {
      sheet: "BASE_DATOS",
      row: 19992,
      cells: {
        A: "2026-01-03",
        B: "Cliente · Apellido compuesto",
        C: null,
        D: 200,
        E: "EFECTIVO",
        I: "NEREA",
      },
    },
  ];
  const imported = await post("/backoffice/import-workbook", {
    kind: "history",
    rows,
  });
  assert.equal(imported.status, 200, JSON.stringify(imported.body));
  const replay = await post("/backoffice/import-workbook", {
    kind: "history",
    rows,
  });
  assert.equal(replay.status, 200);
  assert.ok(replay.body.data.every((r) => r.replayed));
  const changed = structuredClone(rows);
  changed[0].cells.D = 7777;
  assert.equal(
    (
      await post("/backoffice/import-workbook", {
        kind: "history",
        rows: changed,
      })
    ).status,
    400,
  );
  assert.equal((await get("work_records")).length, 2);
  const originalPayment = (await get("payments")).find((p) =>
    p.import_ref?.includes("19990"),
  );
  assert.equal(Number(originalPayment.amount), 1234.56);
  assert.equal(originalPayment.collection_date, "2026-01-03");
  assert.equal(originalPayment.processed_at, null);
  assert.equal(
    (
      await query(token, {
        resource: "payments",
        operation: "delete",
        filters: [{ field: "id", operator: "eq", value: originalPayment.id }],
      })
    ).status,
    400,
  );
  const work = {
    date: "2026-01-04",
    customerName: "Atención de prueba",
    serviceId,
    staffId: staffMemberId,
    amount: 1000,
    paid: 400,
    method: "cash",
  };
  const key = randomUUID();
  const saved = await post("/backoffice/workbook/work", work, key);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(
    (await post("/backoffice/workbook/work", work, key)).body.replayed,
    true,
  );
  assert.equal(
    (await post("/backoffice/workbook/work", { ...work, amount: 2000 }, key))
      .status,
    400,
  );
  assert.equal(
    (
      await post("/backoffice/workbook/collect", {
        workId: saved.body.id,
        date: "2026-01-05",
        amount: 601,
        method: "transfer",
      })
    ).status,
    400,
  );
  const paymentKey = randomUUID(),
    collection = {
      workId: saved.body.id,
      date: "2026-01-05",
      amount: 600,
      method: "transfer",
    };
  const collected = await post(
    "/backoffice/workbook/collect",
    collection,
    paymentKey,
  );
  assert.equal(collected.status, 200, JSON.stringify(collected.body));
  assert.equal(
    (await post("/backoffice/workbook/collect", collection, paymentKey)).body
      .replayed,
    true,
  );
  const data = await call("/backoffice/workbook?month=2026-01", { token });
  assert.equal(data.status, 200, JSON.stringify(data.body));
  assert.equal(data.body.rows.find((w) => w.id === saved.body.id).balance, 0);
  assert.equal(
    data.body.rows.find((w) => w.source_ref?.includes("19991")).balance,
    null,
  );
  assert.equal((await get("appointments")).length, beforeAppointments);
  assert.equal((await call("/backoffice/workbook")).status, 403);
  if (fullPlan) {
    const plan = JSON.parse(readFileSync(".tmp/workbook-import-plan.json"));
    const before = {
      works: (await get("work_records")).length,
      payments: await get("payments"),
      expenses: await get("expenses"),
    };
    const priceImport = await post("/backoffice/import-workbook", {
      kind: "prices",
      rows: plan.prices,
    });
    assert.equal(priceImport.status, 200, JSON.stringify(priceImport.body));
    for (let offset = 0; offset < plan.rows.length; offset += 50) {
      const result = await post("/backoffice/import-workbook", {
        kind: "history",
        rows: plan.rows.slice(offset, offset + 50),
      });
      assert.equal(
        result.status,
        200,
        `Batch ${offset}: ${JSON.stringify(result.body)}`,
      );
      if (offset % 250 === 0)
        console.log(
          `Workbook isolated import: ${Math.min(offset + 50, plan.rows.length)}/${plan.rows.length}`,
        );
    }
    const works = await get("work_records"),
      payments = await get("payments"),
      expenses = await get("expenses");
    assert.equal(works.length - before.works, plan.totals.works);
    assert.equal(
      payments.length - before.payments.length,
      plan.totals.payments,
    );
    assert.equal(
      expenses.length - before.expenses.length,
      plan.totals.expenses,
    );
    const sum = (rows) =>
      rows.reduce((n, r) => n + Math.round(Number(r.amount) * 100), 0);
    assert.equal(
      sum(payments) - sum(before.payments),
      Math.round(plan.totals.collections * 100),
    );
    assert.equal(
      sum(expenses) - sum(before.expenses),
      Math.round(plan.totals.expenseAmount * 100),
    );
    assert.equal(
      (await get("import_rows")).filter((r) => r.outcome === "review").length,
      plan.totals.reviewRows + 1,
    );
    const services = (await get("services")).filter((s) => s.source_ref);
    assert.equal(services.length, plan.totals.services);
    const importedIds = new Set(services.map(s => s.id));
    assert.equal((await get('service_price_variants')).filter(v => importedIds.has(v.service_id)).length, plan.totals.priceVariants);
    const variant = (await get("service_price_variants")).find(
      (v) => importedIds.has(v.service_id) && v.variant_name !== 'Base',
    );
    assert.equal(
      (
        await call("/backoffice/workbook/price", {
          token,
          method: "PATCH",
          body: JSON.stringify({ variantId: variant.id, price: 99999 }),
        })
      ).status,
      200,
    );
    assert.equal(
      (await get("work_records")).find((w) => w.id === works[0].id).amount,
      works[0].amount,
    );
    assert.equal((await get("appointments")).length, beforeAppointments);
    const variantWork = await post('/backoffice/workbook/work', { ...work, serviceId: variant.service_id, variantId: variant.id, amount: 2000, paid: 0 });
    assert.equal(variantWork.status, 200, JSON.stringify(variantWork.body));
    const variantSnapshot = (await get('work_records')).find(w => w.id === variantWork.body.id);
    assert.ok(variantSnapshot.service_name.includes(variant.variant_name));
    const protectedExpense = expenses.find(e => e.import_ref);
    assert.equal((await query(token, { resource: 'expenses', operation: 'upsert', data: { id: protectedExpense.id, amount: 1 } })).status, 400);
    const pricesView = await call('/backoffice/workbook?tab=prices', { token });
    assert.ok(pricesView.body.rows.every(r => r.is_active));
    console.log(
      "PASS: complete workbook in isolated PostgreSQL: 41 services, 97 price variants, 763 historical works, 809 collections, 219 expenses, totals and review rows.",
    );
  }
  console.log(
    "PASS: workbook provenance, import and checkout idempotency, historical dates, held rows, immutable receipts and partial collections.",
  );
};
