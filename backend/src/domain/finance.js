"use strict";
const { createHash } = require("node:crypto");
const { errors } = require("@strapi/utils");
const { repository, resources, numericId } = require("./repository");
const { locked } = require("./booking");
const { cents } = require("./checkout");
const { validDate, minutes: clockMinutes } = require("./availability");
const {
  monthValid,
  monthDay,
  addDays,
  previousMonth,
  periodFor,
  paymentDate,
  mode,
} = require("./finance-rules");
const fail = (message) => {
  throw new errors.ValidationError(message);
};
const eq = (field, value) => ({ field, operator: "eq", value });
const inPeriod = (date, start, end) => date && date >= start && date <= end;
const text = (value, max = 300) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const create = (strapi, resource, data) =>
  strapi.documents(resources[resource].uid).create({ data });
const update = (strapi, resource, row, data) =>
  strapi
    .documents(resources[resource].uid)
    .update({ documentId: row.documentId, data });
async function one(repo, resource, id) {
  const [row] = await repo.read(resource, [eq("id", numericId(id))]);
  if (!row) fail("Registro no encontrado en este negocio.");
  return row;
}
async function context(strapi, businessId) {
  const repo = repository(strapi, businessId),
    [business] = await repo.read("businesses");
  const timeZone = business.time_zone || "America/Argentina/Buenos_Aires";
  return {
    repo,
    timeZone,
    today: new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date()),
  };
}
function payMethod(input, today) {
  if (
    !validDate(input.date) ||
    input.date > today ||
    !["cash", "transfer", "card", "mercado_pago", "other"].includes(
      input.method,
    )
  )
    fail("Revisá fecha y medio de pago. No se puede registrar un pago futuro.");
}
async function expensesData(strapi, businessId, month) {
  const { repo, today } = await context(strapi, businessId);
  if (!monthValid(month)) fail("Mes inválido.");
  const [plans, obligations, expenses] = await Promise.all([
    repo.read("expense_plans"),
    repo.read("expense_obligations", [eq("period", month)]),
    repo.read("expenses", [
      { field: "expense_date", operator: "gte", value: `${month}-01` },
      { field: "expense_date", operator: "lte", value: monthDay(month, 31) },
    ]),
  ]);
  const rows = plans
    .flatMap((plan) => {
      const saved = obligations.find((o) => o.expense_plan?.id === plan.id);
      const active =
        plan.start_month <= month &&
        (!plan.end_month || month <= plan.end_month) &&
        (plan.recurrence === "monthly" || plan.start_month === month);
      if (!active && !saved) return [];
      const state = saved?.state || "pending",
        dueDate = saved?.due_date || monthDay(month, plan.due_day);
      return [
        {
          id: String(plan.id),
          title: plan.title,
          category: plan.category,
          vendor: plan.vendor,
          recurrence: plan.recurrence,
          amountCents: cents(saved?.amount ?? plan.amount),
          dueDate,
          state,
          overdue: state === "pending" && dueDate < today,
          paidDate: saved?.expense?.expense_date || null,
          method: saved?.expense?.method || null,
          notes: saved?.notes || plan.notes || "",
          endMonth: plan.end_month || null,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title),
    );
  const sum = (state) =>
    rows
      .filter((r) => r.state === state)
      .reduce((n, r) => n + r.amountCents, 0);
  return {
    month,
    today,
    rows,
    totals: {
      plannedCents: sum("pending") + sum("paid"),
      paidCents: sum("paid"),
      pendingCents: sum("pending"),
      overdueCents: rows
        .filter((r) => r.overdue)
        .reduce((n, r) => n + r.amountCents, 0),
      cashExpensesCents: expenses.reduce((n, e) => n + cents(e.amount), 0),
    },
  };
}
async function obligation(strapi, businessId, repo, input) {
  if (!monthValid(input.month)) fail("Mes inválido.");
  const plan = await one(repo, "expense_plans", input.planId);
  const [saved] = await repo.read("expense_obligations", [
    eq("expense_plan_id", plan.id),
    eq("period", input.month),
  ]);
  if (
    !saved &&
    (input.month < plan.start_month ||
      (plan.end_month && input.month > plan.end_month) ||
      (plan.recurrence === "once" && input.month !== plan.start_month))
  )
    fail("El gasto no está programado para ese mes.");
  const data = {
    business: businessId,
    expense_plan: plan.id,
    period: input.month,
    due_date: monthDay(input.month, plan.due_day),
    amount: plan.amount,
    state: "pending",
    occurrence_key: `${businessId}:${plan.id}:${input.month}`,
  };
  return {
    plan,
    saved,
    data,
    amountCents: cents(saved?.amount ?? plan.amount),
    state: saved?.state || "pending",
    dueDate: saved?.due_date || data.due_date,
  };
}
async function payrollData(strapi, businessId, input) {
  const { repo, timeZone, today } = await context(strapi, businessId);
  const staff = await repo.read("staff_members");
  const staffId =
    input.staffId ||
    String(staff.find((s) => s.is_active)?.id || staff[0]?.id || "");
  const person = staff.find((s) => String(s.id) === String(staffId));
  if (!person)
    return {
      staff: [],
      person: null,
      lines: [],
      history: [],
      timeLogs: [],
      manualPayouts: [],
      unpricedHours: [],
      period: null,
      unpaidCents: 0,
      earnedCents: 0,
      paidCents: 0,
      today,
      month: input.month,
    };
  let period;
  try {
    period = periodFor(
      person,
      input.month,
      input.period ||
        (person.payroll_cadence === "weekly" ? "week-1" : "first"),
    );
  } catch (error) {
    fail(error.message);
  }
  const [payments, hours, allocations, payouts] = await Promise.all([
    repo.read("payments", [
      eq("staff_member_id", person.id),
      eq("status", "completed"),
    ]),
    repo.read("staff_time_logs", [eq("staff_member_id", person.id)]),
    repo.read("payroll_lines", [eq("staff_member_id", person.id)]),
    repo.read("payouts", [eq("staff_member_id", person.id)]),
  ]);
  const sourceKey = (kind, id) => `${businessId}:${kind}:${id}`;
  const line = (kind, row, date, amount, description, base, rate) => ({
    key: sourceKey(kind, row.id),
    id: String(row.id),
    kind,
    date,
    description,
    amountCents: cents(amount),
    base,
    rate,
    paid: allocations.some((a) => a.source_key === sourceKey(kind, row.id)),
  });
  const lines = [
    ...payments
      .filter(
        (p) =>
          inPeriod(paymentDate(p, timeZone), period.start, period.end) &&
          Number(p.commission_amount) > 0,
      )
      .map((p) =>
        line(
          "payment",
          p,
          paymentDate(p, timeZone),
          p.commission_amount,
          p.description,
          Number(p.amount),
          Number(p.commission_rate),
        ),
      ),
    ...hours
      .filter(
        (h) =>
          inPeriod(h.work_date, period.start, period.end) &&
          Number(h.payable_amount) > 0,
      )
      .map((h) =>
        line(
          "hours",
          h,
          h.work_date,
          h.payable_amount,
          `${Number(h.hours_worked)} horas trabajadas`,
          Number(h.hours_worked),
          Number(h.hourly_rate_snapshot),
        ),
      ),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
  const history = payouts
    .filter(
      (p) =>
        p.period_start &&
        p.period_start <= period.end &&
        p.period_end >= period.start,
    )
    .map((p) => ({
      id: String(p.id),
      date: p.payout_date,
      amountCents: cents(p.amount),
      method: p.method,
      start: p.period_start,
      end: p.period_end,
      detail: p.payroll_detail,
    }));
  const manualPayouts = payouts
    .filter(
      (p) =>
        !p.period_start && inPeriod(p.payout_date, period.start, period.end),
    )
    .map((p) => ({
      id: String(p.id),
      date: p.payout_date,
      amountCents: cents(p.amount),
      category: p.category,
    }));
  const unpricedHours = hours
    .filter(
      (h) =>
        inPeriod(h.work_date, period.start, period.end) &&
        h.payable_amount == null &&
        Number(h.hours_worked) > 0,
    )
    .map((h) => ({
      id: String(h.id),
      date: h.work_date,
      hours: Number(h.hours_worked),
    }));
  const summary = (s) => ({
    id: String(s.id),
    name: s.full_name,
    role: s.role,
    mode: mode(s),
    cadence: s.payroll_cadence || "semimonthly",
    weekday: s.payroll_weekday ?? 0,
  });
  const earnedCents = lines.reduce((n, l) => n + l.amountCents, 0),
    paidCents = lines
      .filter((l) => l.paid)
      .reduce((n, l) => n + l.amountCents, 0);
  return {
    staff: staff.map(summary),
    person: summary(person),
    period,
    month: input.month,
    today,
    lines,
    history,
    manualPayouts,
    unpricedHours,
    earnedCents,
    paidCents,
    unpaidCents: earnedCents - paidCents,
    timeLogs: hours
      .filter((h) => inPeriod(h.work_date, period.start, period.end))
      .map((h) => ({
        id: String(h.id),
        date: h.work_date,
        hours: Number(h.hours_worked),
        rate: Number(h.hourly_rate_snapshot || 0),
        amountCents: cents(h.payable_amount || 0),
        notes: h.notes,
        paid: allocations.some((a) => a.staff_time_log?.id === h.id),
      })),
  };
}
async function writeFinance(strapi, businessId, action, input, key) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      key || "",
    )
  )
    fail("Solicitud inválida. Volvé a abrir el formulario.");
  const operationKey = `${businessId}:${key}`,
    hash = createHash("sha256")
      .update(JSON.stringify([action, input]))
      .digest("hex");
  return locked(strapi, businessId, async () => {
    const previous = await strapi.db
      .query(resources.finance_operations.uid)
      .findOne({ where: { operation_key: operationKey } });
    if (previous) {
      if (previous.operation_hash !== hash)
        fail("Ese intento ya se usó con otros datos.");
      return { ...previous.result, replayed: true };
    }
    const { repo, today } = await context(strapi, businessId);
    let result;
    if (action === "plan") {
      const amount = cents(input.amount),
        dueDay = Number(input.dueDay),
        title = text(input.title);
      if (
        !title ||
        !amount ||
        !monthValid(input.month) ||
        !Number.isInteger(dueDay) ||
        dueDay < 1 ||
        dueDay > 31 ||
        !["monthly", "once"].includes(input.recurrence)
      )
        fail("Completá concepto, importe, mes y vencimiento.");
      const saved = await create(strapi, "expense_plans", {
        business: businessId,
        title,
        category: text(input.category) || "Gastos generales",
        vendor: text(input.vendor),
        amount: amount / 100,
        due_day: dueDay,
        start_month: input.month,
        recurrence: input.recurrence,
        notes: text(input.notes, 2000),
      });
      result = { id: String(saved.id) };
    } else if (
      ["edit-expense", "pay-expense", "cancel-expense"].includes(action)
    ) {
      const o = await obligation(strapi, businessId, repo, input);
      if (o.state !== "pending")
        fail("Este vencimiento ya está pagado o anulado.");
      if (
        input.expectedAmountCents !== o.amountCents ||
        input.expectedDueDate !== o.dueDate
      )
        fail("El gasto cambió. Actualizá antes de continuar.");
      let data = {
        ...o.data,
        amount: o.amountCents / 100,
        due_date: o.dueDate,
        notes: o.saved?.notes || o.plan.notes || "",
      };
      if (action === "edit-expense") {
        const amount = cents(input.amount);
        if (
          !amount ||
          !validDate(input.dueDate) ||
          !input.dueDate.startsWith(input.month)
        )
          fail("Revisá el importe y el vencimiento dentro del mes.");
        data = {
          ...data,
          amount: amount / 100,
          due_date: input.dueDate,
          notes: text(input.notes, 2000),
        };
      } else if (action === "cancel-expense") data.state = "cancelled";
      else {
        payMethod(input, today);
        const expense = await create(strapi, "expenses", {
          business: businessId,
          expense_date: input.date,
          description: o.plan.title,
          category: o.plan.category || "Gastos generales",
          vendor_name: o.plan.vendor,
          amount: o.amountCents / 100,
          method: input.method,
          source: "Gasto programado",
          notes: text(input.notes, 2000),
        });
        data = {
          ...data,
          amount: o.amountCents / 100,
          due_date: o.dueDate,
          expense: expense.id,
          state: "paid",
        };
      }
      const saved = o.saved
        ? await update(strapi, "expense_obligations", o.saved, data)
        : await create(strapi, "expense_obligations", data);
      result = { id: String(saved.id) };
    } else if (action === "stop-plan") {
      const plan = await one(repo, "expense_plans", input.planId);
      if (!monthValid(input.month) || input.month < today.slice(0, 7))
        fail(
          "Elegí desde qué mes dejar de repetirlo, a partir del mes actual.",
        );
      await update(strapi, "expense_plans", plan, {
        end_month: previousMonth(input.month),
      });
      // Materialized unpaid months are also cancelled; completed payments stay in history.
      const saved = await repo.read("expense_obligations", [
        eq("expense_plan_id", plan.id),
        { field: "period", operator: "gte", value: input.month },
        eq("state", "pending"),
      ]);
      for (const row of saved)
        await update(strapi, "expense_obligations", row, {
          state: "cancelled",
        });
      result = { saved: true };
    } else if (action === "hours") {
      const usesMinutes = input.minutes !== undefined;
      if (
        usesMinutes &&
        (input.hours !== undefined ||
          !Number.isInteger(input.minutes) ||
          input.minutes <= 0 ||
          input.minutes > 1440)
      )
        fail(
          "Indicá minutos enteros trabajados, hasta 24 horas, sin duplicar el campo horas.",
        );
      const person = await one(repo, "staff_members", input.staffId),
        hours = usesMinutes ? input.minutes / 60 : Number(input.hours);
      if (!person.is_active || mode(person) !== "hourly")
        fail("Elegí un empleado activo con pago por hora.");
      if (
        !validDate(input.date) ||
        input.date > today ||
        !Number.isFinite(hours) ||
        hours <= 0 ||
        hours > 24 ||
        (!usesMinutes &&
          Math.abs(hours * 100 - Math.round(hours * 100)) > 0.0001)
      )
        fail("Cargá la fecha trabajada y hasta 24 horas, con dos decimales.");
      if (input.startTime !== undefined || input.endTime !== undefined) {
        const start = clockMinutes(input.startTime),
          end = clockMinutes(input.endTime);
        if (
          !usesMinutes ||
          start === null ||
          end === null ||
          end - start !== input.minutes
        )
          fail(
            "La entrada y salida deben coincidir con los minutos trabajados.",
          );
      }
      const existing = await repo.read("staff_time_logs", [
        eq("staff_member_id", person.id),
        eq("work_date", input.date),
      ]);
      if (existing.reduce((n, h) => n + Number(h.hours_worked), hours) > 24)
        fail("Ya hay horas registradas: el total del día supera 24 horas.");
      const rate = cents(person.hourly_rate);
      if (!rate)
        fail(
          "Configurá el valor por hora del empleado antes de cargar la jornada.",
        );
      const row = await create(strapi, "staff_time_logs", {
        business: businessId,
        staff_member: person.id,
        work_date: input.date,
        start_time: input.startTime
          ? `${input.startTime.slice(0, 5)}:00.000`
          : null,
        end_time: input.endTime ? `${input.endTime.slice(0, 5)}:00.000` : null,
        hours_worked: hours,
        hourly_rate_snapshot: rate / 100,
        payable_amount:
          Math.round(usesMinutes ? (rate * input.minutes) / 60 : rate * hours) /
          100,
        notes: text(input.notes, 2000),
        entry_type: "shift",
        source: "manual",
        operation_key: operationKey,
      });
      result = { id: String(row.id) };
    } else if (action === "void-hours") {
      const row = await one(repo, "staff_time_logs", input.id);
      if (
        (await repo.read("payroll_lines", [eq("staff_time_log_id", row.id)]))
          .length
      )
        fail("La jornada ya se incluyó en un pago y conserva su historial.");
      if (row.payable_amount == null)
        fail("Esta jornada anterior necesita revisión antes de cambiarla.");
      await update(strapi, "staff_time_logs", row, {
        hours_worked: 0,
        payable_amount: 0,
        notes: `Anulada: ${row.hours_worked} horas. ${row.notes || ""}`,
      });
      result = { saved: true };
    } else if (action === "payroll") {
      payMethod(input, today);
      const data = await payrollData(strapi, businessId, input),
        unpaid = data.lines.filter((l) => !l.paid);
      if (!data.unpaidCents || data.unpaidCents !== input.expectedAmountCents)
        fail("El importe cambió o no queda saldo. Actualizá la liquidación.");
      if (data.manualPayouts.length || data.unpricedHours.length)
        fail(
          "Hay pagos manuales u horas sin tarifa que requieren conciliarse antes de liquidar este período.",
        );
      if (unpaid.some((l) => l.date > input.date))
        fail(
          "La fecha del pago no puede ser anterior al trabajo o cobro que estás liquidando.",
        );
      const payout = await create(strapi, "payouts", {
        business: businessId,
        staff_member: Number(data.person.id),
        recipient_name: data.person.name,
        recipient_type: "staff",
        category: "salary",
        amount: data.unpaidCents / 100,
        payout_date: input.date,
        method: input.method,
        source: "Liquidación del equipo",
        period_start: data.period.start,
        period_end: data.period.end,
        payroll_detail: unpaid,
        operation_key: operationKey,
      });
      for (const line of unpaid)
        await create(strapi, "payroll_lines", {
          business: businessId,
          payout: payout.id,
          staff_member: Number(data.person.id),
          source_key: line.key,
          earning_date: line.date,
          description: line.description,
          amount: line.amountCents / 100,
          [line.kind === "payment" ? "payment" : "staff_time_log"]: Number(
            line.id,
          ),
        });
      result = { id: String(payout.id) };
    } else if (action === "progress") {
      const appointment = await one(repo, "appointments", input.appointmentId);
      if (!["confirmed", "completed"].includes(appointment.status))
        fail("Confirmá el turno antes de registrar la atención.");
      if (appointment.appointment_date !== today)
        fail("La llegada y el inicio se registran en el día del turno.");
      const now = new Date().toISOString();
      let data;
      if (input.step === "arrive" && appointment.status === "confirmed")
        data = { arrived_at: appointment.arrived_at || now };
      else if (input.step === "start" && appointment.status === "confirmed")
        data = {
          arrived_at: appointment.arrived_at || now,
          started_at: appointment.started_at || now,
        };
      else if (input.step === "finish" && appointment.started_at)
        data = {
          status: "completed",
          finished_at: appointment.finished_at || now,
        };
      else fail("Acción no disponible para este turno.");
      await update(strapi, "appointments", appointment, data);
      result = { saved: true };
    } else fail("Acción no permitida.");
    await create(strapi, "finance_operations", {
      business: businessId,
      operation_key: operationKey,
      operation_hash: hash,
      result,
    });
    return result;
  });
}
async function financeAlerts(strapi, businessId) {
  const { repo, today, timeZone } = await context(strapi, businessId),
    horizon = addDays(today, 7);
  const [plans, obligations, staff, payments, hours, allocations] =
    await Promise.all([
      repo.read("expense_plans"),
      repo.read("expense_obligations"),
      repo.read("staff_members"),
      repo.read("payments", [eq("status", "completed")]),
      repo.read("staff_time_logs"),
      repo.read("payroll_lines"),
    ]);
  const alerts = [],
    saved = new Map(
      obligations.map((o) => [`${o.expense_plan?.id}:${o.period}`, o]),
    );
  for (const plan of plans) {
    for (
      let month = plan.start_month;
      month <= horizon.slice(0, 7) &&
      (!plan.end_month || month <= plan.end_month);
      month = addDays(monthDay(month, 31), 1).slice(0, 7)
    ) {
      if (plan.recurrence === "once" && month !== plan.start_month) break;
      const row = saved.get(`${plan.id}:${month}`),
        date = row?.due_date || monthDay(month, plan.due_day);
      if ((row?.state || "pending") !== "pending" || date > horizon) continue;
      alerts.push({
        id: `expense:${plan.id}:${month}`,
        kind: "expense",
        title: plan.title,
        detail:
          date < today
            ? "Gasto vencido, pendiente de pago."
            : "Vencimiento dentro de los próximos 7 días.",
        date,
        amount: Number(row?.amount ?? plan.amount),
        href: `/dashboard/gastos?month=${month}`,
        action: "Revisar gasto",
        priority: date < today ? 0 : 4,
      });
    }
  }
  const assigned = new Set(allocations.map((l) => l.source_key));
  for (const person of staff) {
    const earnings = [
      ...payments
        .filter(
          (p) =>
            p.staff_member?.id === person.id && Number(p.commission_amount) > 0,
        )
        .map((p) => ({
          key: `${businessId}:payment:${p.id}`,
          date: paymentDate(p, timeZone),
          amount: cents(p.commission_amount),
        })),
      ...hours
        .filter(
          (h) =>
            h.staff_member?.id === person.id && Number(h.payable_amount) > 0,
        )
        .map((h) => ({
          key: `${businessId}:hours:${h.id}`,
          date: h.work_date,
          amount: cents(h.payable_amount),
        })),
    ];
    const groups = new Map();
    for (const earning of earnings) {
      if (!earning.date || assigned.has(earning.key)) continue;
      let month = earning.date.slice(0, 7),
        periodKey = "first";
      if (person.payroll_cadence === "weekly") {
        const end = addDays(
          earning.date,
          (Number(person.payroll_weekday ?? 0) -
            new Date(`${earning.date}T12:00:00Z`).getUTCDay() +
            7) %
            7,
        );
        month = end.slice(0, 7);
        periodKey = `week-${Math.ceil(Number(end.slice(8)) / 7)}`;
      } else if (
        Number(earning.date.slice(8)) >
        Number(person.payroll_cutoff_second || 31)
      )
        month = addDays(monthDay(month, 31), 1).slice(0, 7);
      else if (
        person.payroll_cadence !== "monthly" &&
        Number(earning.date.slice(8)) >
          Number(person.payroll_cutoff_first || 15)
      )
        periodKey = "second";
      const period = periodFor(person, month, periodKey);
      if (period.payDate > horizon) continue;
      const key = `${month}:${periodKey}`,
        existing = groups.get(key);
      groups.set(key, {
        month,
        periodKey,
        period,
        amount: (existing?.amount || 0) + earning.amount,
      });
    }
    for (const [key, g] of groups)
      alerts.push({
        id: `payroll:${person.id}:${key}`,
        kind: "payroll",
        title: `Pago a ${person.full_name}`,
        detail: `Período ${g.period.start} al ${g.period.end}. Revisá las horas y comisiones pendientes.`,
        date: g.period.payDate,
        amount: g.amount / 100,
        href: `/dashboard/liquidaciones?staffId=${person.id}&month=${g.month}&period=${g.periodKey}`,
        action: "Revisar liquidación",
        priority: g.period.payDate < today ? 0 : 4,
      });
  }
  return alerts;
}
module.exports = { expensesData, payrollData, writeFinance, financeAlerts };
