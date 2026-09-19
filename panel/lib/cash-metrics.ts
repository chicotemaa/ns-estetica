import type {
  AppointmentRecord,
  PaymentRecord,
  ExpenseRecord,
  PayoutRecord,
} from "./business-shared";

export function businessDate(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export const sumMoney = <T>(rows: T[], amount: (row: T) => number) =>
  rows.reduce((sum, row) => sum + Math.round(amount(row) * 100), 0) / 100;
export function outstandingAppointments(
  appointments: AppointmentRecord[],
  payments: PaymentRecord[],
) {
  const paid = new Map<string, number>();
  for (const payment of payments)
    if (payment.status === "completed" && payment.appointmentId)
      paid.set(
        payment.appointmentId,
        (paid.get(payment.appointmentId) || 0) +
          Math.round(payment.amount * 100),
      );
  return appointments
    .filter((a) => a.status === "completed")
    .map((a) => ({
      appointment: a,
      balance:
        Math.max(0, Math.round(a.price * 100) - (paid.get(a.id) || 0)) / 100,
    }))
    .filter((a) => a.balance > 0);
}
export function cashMetrics(
  payments: PaymentRecord[],
  expenses: ExpenseRecord[],
  payouts: PayoutRecord[],
  date: string,
  timeZone: string,
) {
  const month = date.slice(0, 7);
  const dated = payments
    .filter((p) => p.status === "completed" && (p.collectionDate || p.processedAt))
    .map((p) => ({ ...p, date: p.collectionDate || businessDate(p.processedAt!, timeZone) }));
  const daily = dated.filter((p) => p.date === date);
  const monthly = dated.filter((p) => p.date.startsWith(month));
  const dailyExpenses = sumMoney(
    expenses.filter((e) => e.expenseDate === date),
    (e) => e.amount,
  );
  const dailyPayouts = sumMoney(
    payouts.filter((p) => p.payoutDate === date),
    (p) => p.amount,
  );
  const collections = sumMoney(daily, (p) => p.amount);
  return {
    daily,
    monthly,
    collections,
    monthlyCollections: sumMoney(monthly, (p) => p.amount),
    dailyExpenses,
    dailyPayouts,
    movementNet: collections - dailyExpenses - dailyPayouts,
    commissions: sumMoney(monthly, (p) => p.commissionAmount || 0),
    unassigned: monthly.filter((p) => p.commissionAmount == null),
    undated: payments.filter((p) => p.status === "completed" && !p.collectionDate && !p.processedAt)
      .length,
  };
}
