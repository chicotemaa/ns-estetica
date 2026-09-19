import type { ExpensePlanRow } from "./finance-types";
export type ExpenseFilter =
  | "all"
  | "pending"
  | "overdue"
  | "paid"
  | "cancelled";
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function filterExpenses(
  rows: ExpensePlanRow[],
  query: string,
  status: ExpenseFilter,
  category: string,
) {
  const text = normalize(query.trim());
  return rows.filter(
    (row) =>
      (!category || (row.category || "Sin categoría") === category) &&
      (status === "all" ||
        (status === "overdue" ? row.overdue : row.state === status)) &&
      (!text ||
        normalize(
          [row.title, row.vendor, row.category, row.notes].join(" "),
        ).includes(text)),
  );
}
export function expensePlanningSummary(rows: ExpensePlanRow[], today: string) {
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const horizon = end.toISOString().slice(0, 10);
  const upcoming = rows.filter(
    (row) =>
      row.state === "pending" && row.dueDate >= today && row.dueDate <= horizon,
  );
  const categories = new Map<
    string,
    { name: string; plannedCents: number; pendingCents: number }
  >();
  for (const row of rows) {
    if (row.state === "cancelled") continue;
    const name = row.category || "Sin categoría";
    const category = categories.get(name) || {
      name,
      plannedCents: 0,
      pendingCents: 0,
    };
    category.plannedCents += row.amountCents;
    if (row.state === "pending") category.pendingCents += row.amountCents;
    categories.set(name, category);
  }
  return {
    upcomingCents: upcoming.reduce((n, row) => n + row.amountCents, 0),
    upcomingCount: upcoming.length,
    categories: [...categories.values()].sort(
      (a, b) => b.plannedCents - a.plannedCents || a.name.localeCompare(b.name),
    ),
  };
}
