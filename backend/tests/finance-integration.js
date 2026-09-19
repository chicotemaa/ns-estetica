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
  const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date()),
    month = today.slice(0, 7);
  const post = (action, body, key = randomUUID()) =>
    call("/backoffice/finance/" + action, {
      token,
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Idempotency-Key": key },
    });
  const ok = (r) => {
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return r.body;
  };
  const get = async (resource) => ok(await query(token, { resource })).data;
  const insert = async (resource, data) =>
    ok(await query(token, { resource, operation: "insert", data })).data[0];
  const change = async (resource, id, data) =>
    query(token, {
      resource,
      operation: "update",
      filters: [{ field: "id", operator: "eq", value: id }],
      data,
    });
  const expenseView = async (m = month) =>
    ok(await call("/backoffice/finance/expenses?month=" + m, { token }));
  assert.equal(
    (await call("/backoffice/finance/expenses?month=" + month)).status,
    403,
  );
  const before = (await get("expenses")).length,
    key = randomUUID();
  const planInput = {
    title: "Alquiler de prueba",
    category: "Alquiler",
    amount: 1000.25,
    dueDay: 31,
    month,
    recurrence: "monthly",
  };
  const plan = ok(await post("plan", planInput, key));
  assert.equal(ok(await post("plan", planInput, key)).id, plan.id);
  assert.equal(
    (await post("plan", { ...planInput, amount: 2000 }, key)).status,
    400,
  );
  assert.equal(
    (await get("expenses")).length,
    before,
    "planning does not create cash expense",
  );
  assert.equal(
    (await expenseView("2028-02")).rows.find((r) => r.id === plan.id).dueDate,
    "2028-02-29",
  );
  let row = (await expenseView()).rows.find((r) => r.id === plan.id);
  const occurrence = () => ({
    planId: plan.id,
    month,
    expectedAmountCents: row.amountCents,
    expectedDueDate: row.dueDate,
  });
  ok(
    await post("edit-expense", {
      ...occurrence(),
      amount: 1200.75,
      dueDate: month + "-20",
    }),
  );
  row = (await expenseView()).rows.find((r) => r.id === plan.id);
  assert.equal(row.amountCents, 120075);
  const pay = { ...occurrence(), date: today, method: "transfer" },
    payKey = randomUUID();
  const paid = ok(await post("pay-expense", pay, payKey));
  assert.equal(ok(await post("pay-expense", pay, payKey)).id, paid.id);
  assert.equal((await post("pay-expense", pay)).status, 400);
  assert.equal((await get("expenses")).length, before + 1);
  assert.equal(
    (await post("edit-expense", { ...occurrence(), amount: 1, dueDate: today }))
      .status,
    400,
  );
  const managedExpense = (await get("expenses")).find(
    (e) => e.description === planInput.title,
  );
  assert.equal(
    (await change("expenses", managedExpense.id, { amount: 2 })).status,
    400,
  );
  assert.equal(
    (
      await query(token, {
        resource: "expenses",
        operation: "upsert",
        data: { id: managedExpense.id, amount: 2 },
      })
    ).status,
    400,
  );
  ok(await post("stop-plan", { planId: plan.id, month }));
  assert.equal(
    (await expenseView()).rows.find((r) => r.id === plan.id).state,
    "paid",
  );
  assert.equal((await expenseView("2028-02")).rows.length, 0);
  const hourly = await insert("staff_members", {
    business_id: businessId,
    full_name: "Empleado por hora de prueba",
    payroll_mode: "hourly",
    hourly_rate: 1500.25,
    collection_commission_rate: 50,
    payroll_cadence: "monthly",
  });
  const hourKey = randomUUID(),
    hourInput = { staffId: hourly.id, date: today, hours: 2.5 };
  const hour = ok(await post("hours", hourInput, hourKey));
  assert.equal(ok(await post("hours", hourInput, hourKey)).id, hour.id);
  ok(await change("staff_members", hourly.id, { hourly_rate: 2000 }));
  const payroll = async (id = hourly.id) =>
    ok(
      await call(
        `/backoffice/finance/payroll?month=${month}&staffId=${id}&period=first`,
        { token },
      ),
    );
  let view = await payroll();
  assert.equal(view.unpaidCents, 375063);
  assert.equal(view.timeLogs[0].rate, 1500.25);
  const payrollInput = {
    staffId: hourly.id,
    month,
    period: "first",
    date: today,
    method: "cash",
    expectedAmountCents: view.unpaidCents,
  };
  const payrollKey = randomUUID(),
    salary = ok(await post("payroll", payrollInput, payrollKey));
  assert.equal(
    ok(await post("payroll", payrollInput, payrollKey)).id,
    salary.id,
  );
  assert.equal((await post("payroll", payrollInput)).status, 400);
  assert.equal((await payroll()).unpaidCents, 0);
  assert.equal((await post("void-hours", { id: hour.id })).status, 400);
  assert.equal((await change("payouts", salary.id, { amount: 1 })).status, 400);
  assert.equal(
    (await change("staff_time_logs", hour.id, { hours_worked: 9 })).status,
    400,
  );
  const extra = ok(
    await post("hours", { staffId: hourly.id, date: today, hours: 1 }),
  );
  assert.equal((await payroll()).unpaidCents, 200000);
  ok(await post("void-hours", { id: extra.id }));
  assert.equal((await payroll()).unpaidCents, 0);
  const minuteEmployee = await insert("staff_members", {
    business_id: businessId,
    full_name: "Pago exacto por minutos",
    payroll_mode: "hourly",
    hourly_rate: 3100,
    accepts_bookings: false,
  });
  const minuteInput = {
    staffId: minuteEmployee.id,
    date: today,
    minutes: 185,
    startTime: "11:15",
    endTime: "14:20",
  };
  const minuteKey = randomUUID();
  const minuteLog = ok(await post("hours", minuteInput, minuteKey));
  assert.equal(
    ok(await post("hours", minuteInput, minuteKey)).id,
    minuteLog.id,
  );
  const minuteRows = ok(
    await query(token, {
      resource: "staff_time_logs",
      filters: [{ field: "id", operator: "eq", value: minuteLog.id }],
    }),
  ).data;
  assert.equal(Number(minuteRows[0].payable_amount), 9558.33);
  assert.equal(
    (await post("hours", { ...minuteInput, endTime: "14:00" })).status,
    400,
  );
  assert.equal(
    (await post("hours", { ...minuteInput, hours: 3.08 })).status,
    400,
  );
  const percentage = await insert("staff_members", {
    business_id: businessId,
    full_name: "Empleado por porcentaje de prueba",
    payroll_mode: "percentage",
    collection_commission_rate: 50,
    payroll_cadence: "monthly",
  });
  const work = ok(
    await call("/backoffice/workbook/work", {
      token,
      method: "POST",
      headers: { "Idempotency-Key": randomUUID() },
      body: JSON.stringify({
        serviceId,
        staffId: percentage.id,
        date: today,
        customerName: "Cliente de prueba financiera",
        amount: 100,
        paid: 40,
        method: "cash",
      }),
    }),
  );
  assert.equal(
    (await payroll(percentage.id)).unpaidCents,
    2000,
    "commission on collected amount only",
  );
  ok(
    await change("staff_members", percentage.id, {
      payroll_mode: "hourly",
      hourly_rate: 1000,
    }),
  );
  ok(
    await call("/backoffice/workbook/collect", {
      token,
      method: "POST",
      headers: { "Idempotency-Key": randomUUID() },
      body: JSON.stringify({
        workId: work.id,
        date: today,
        amount: 60,
        method: "transfer",
      }),
    }),
  );
  assert.equal(
    (await payroll(percentage.id)).unpaidCents,
    2000,
    "hourly mode adds no new commission, keeps historical snapshot",
  );
  const other = await app
    .documents("api::business.business")
    .create({ data: { name: "Finance isolation", slug: "finance-isolation" } });
  const foreign = await app.documents("api::expense-plan.expense-plan").create({
    data: {
      business: other.id,
      title: "Foreign",
      amount: 1,
      due_day: 1,
      start_month: month,
      recurrence: "monthly",
    },
  });
  assert.equal(
    (
      await post("pay-expense", {
        planId: foreign.id,
        month,
        date: today,
        method: "cash",
        expectedAmountCents: 100,
        expectedDueDate: month + "-01",
      })
    ).status,
    400,
  );
  assert.equal(
    (await post("hours", { staffId: hourly.id, date: "2099-01-01", hours: 1 }))
      .status,
    400,
  );
  assert.equal(
    (
      await change("staff_members", hourly.id, {
        payroll_cadence: "semimonthly",
        payroll_cutoff_first: 25,
        payroll_cutoff_second: 10,
      })
    ).status,
    400,
  );
  const { locked } = require("../src/domain/booking");
  const appt = await locked(app, Number(businessId), () =>
    app.documents("api::appointment.appointment").create({
      data: {
        business: Number(businessId),
        service: Number(serviceId),
        staff_member: Number(hourly.id),
        customer_name: "Llegada de prueba",
        customer_contact: "test",
        appointment_date: today,
        appointment_time: "09:00:00.000",
        status: "confirmed",
        channel: "manual",
        service_name_snapshot: "Atención de prueba",
        staff_name_snapshot: hourly.full_name,
        price_snapshot: 100,
        duration_minutes_snapshot: 30,
      },
    }),
  );
  ok(
    await post("progress", { appointmentId: String(appt.id), step: "arrive" }),
  );
  ok(await post("progress", { appointmentId: String(appt.id), step: "start" }));
  assert.equal(
    (await change("appointments", String(appt.id), { price_snapshot: 1 }))
      .status,
    400,
  );
  ok(
    await post("progress", { appointmentId: String(appt.id), step: "finish" }),
  );
  assert.ok(
    (await get("appointments")).find((a) => a.id === String(appt.id))
      .finished_at,
  );
  const alertPlan = ok(
    await post("plan", {
      title: "Vencimiento para aviso",
      amount: 10,
      dueDay: Number(today.slice(8)),
      month,
      recurrence: "once",
    }),
  );
  const alerts = () => call("/backoffice/finance/alerts", { token });
  assert.ok(
    ok(await alerts()).some((a) => a.id === `expense:${alertPlan.id}:${month}`),
  );
  const alertRow = (await expenseView()).rows.find(
    (r) => r.id === alertPlan.id,
  );
  ok(
    await post("pay-expense", {
      planId: alertPlan.id,
      month,
      date: today,
      method: "cash",
      expectedAmountCents: alertRow.amountCents,
      expectedDueDate: alertRow.dueDate,
    }),
  );
  assert.ok(
    !ok(await alerts()).some(
      (a) => a.id === `expense:${alertPlan.id}:${month}`,
    ),
  );
  ok(
    await change("staff_members", percentage.id, {
      payroll_cadence: "weekly",
      payroll_weekday: new Date(`${today}T12:00:00Z`).getUTCDay(),
    }),
  );
  const salaryAlert = ok(await alerts()).find(
    (a) => a.kind === "payroll" && a.id.startsWith(`payroll:${percentage.id}:`),
  );
  assert.equal(salaryAlert.amount, 20);
  assert.equal(salaryAlert.date, today);
  console.log(
    "PASS: expense recurrence, paid cash once, snapshots, payroll idempotency, worked hours, collected commissions, isolation and appointment progress.",
  );
};
