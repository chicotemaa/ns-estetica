"use strict";
const { validDate } = require("./availability");
function monthValid(value) {
  return typeof value === "string" && /^20\d{2}-(0[1-9]|1[0-2])$/.test(value);
}
function monthEnd(month) {
  return new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0),
  ).getUTCDate();
}
function monthDay(month, day) {
  return `${month}-${String(Math.min(day, monthEnd(month))).padStart(2, "0")}`;
}
function addDays(date, days) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function previousMonth(month) {
  return addDays(`${month}-01`, -1).slice(0, 7);
}
function mode(staff) {
  return (
    staff?.payroll_mode ||
    (Number(staff?.collection_commission_rate || 0) > 0 ||
    staff?.compensation_type === "category_percentage"
      ? "percentage"
      : "hourly")
  );
}
function commissionRate(staff) {
  return mode(staff) === "percentage"
    ? Number(staff?.collection_commission_rate || 0)
    : 0;
}
function periodFor(staff, month, half = "first") {
  if (!monthValid(month)) throw new Error("Período inválido.");
  if (staff.payroll_cadence === "weekly") {
    if (!/^week-[1-5]$/.test(half)) throw new Error("Elegí una semana.");
    const weekday = Number(staff.payroll_weekday ?? 0);
    const firstWeekday = new Date(`${month}-01T12:00:00Z`).getUTCDay();
    const day =
      1 + ((weekday - firstWeekday + 7) % 7) + (Number(half.slice(5)) - 1) * 7;
    if (day > monthEnd(month))
      throw new Error("Esa semana cierra en otro mes.");
    const end = monthDay(month, day);
    return {
      start: addDays(end, -6),
      end,
      payDate: addDays(end, Number(staff.payroll_pay_delay || 0)),
    };
  }
  if (!["first", "second"].includes(half)) throw new Error("Período inválido.");
  const first = Number(staff.payroll_cutoff_first || 15),
    second = Number(staff.payroll_cutoff_second || 31);
  const monthly = staff.payroll_cadence === "monthly";
  const end = monthDay(month, monthly || half === "second" ? second : first);
  const prior =
    !monthly && half === "second"
      ? monthDay(month, first)
      : monthDay(previousMonth(month), second);
  return {
    start: addDays(prior, 1),
    end,
    payDate: addDays(end, Number(staff.payroll_pay_delay || 0)),
  };
}
function paymentDate(payment, timeZone) {
  if (validDate(payment.collection_date)) return payment.collection_date;
  if (!payment.processed_at) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(payment.processed_at),
  );
}
module.exports = {
  monthValid,
  monthDay,
  addDays,
  previousMonth,
  periodFor,
  paymentDate,
  mode,
  commissionRate,
};
