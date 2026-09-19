import test from "node:test";
import assert from "node:assert/strict";
import {
  expensePlanningSummary,
  filterExpenses,
} from "../lib/expense-planning.ts";
const row = (id, fields = {}) => ({
  id,
  title: "Alquiler",
  category: "Local",
  vendor: "Administración",
  notes: "",
  state: "pending",
  amountCents: 10010,
  dueDate: "2026-09-15",
  overdue: false,
  ...fields,
});
test("planning counts only unpaid upcoming expenses and excludes cancellations from categories", () => {
  const rows = [
    row("1"),
    row("2", { state: "paid" }),
    row("3", { state: "cancelled" }),
    row("4", { dueDate: "2026-09-01", overdue: true }),
    row("5", { dueDate: "2026-09-30", category: "Servicios" }),
  ];
  const result = expensePlanningSummary(rows, "2026-09-14");
  assert.equal(result.upcomingCents, 10010);
  assert.equal(result.upcomingCount, 1);
  assert.deepEqual(result.categories[0], {
    name: "Local",
    plannedCents: 30030,
    pendingCents: 20020,
  });
});
test("filters match accents, vendors and the real paid/overdue states", () => {
  const rows = [
    row("1"),
    row("2", { overdue: true }),
    row("3", { state: "paid", category: "Servicios" }),
  ];
  assert.deepEqual(
    filterExpenses(rows, "administracion", "overdue", "Local").map((r) => r.id),
    ["2"],
  );
  assert.equal(filterExpenses(rows, "missing", "all", "").length, 0);
  assert.deepEqual(
    filterExpenses(rows, "", "paid", "Servicios").map((r) => r.id),
    ["3"],
  );
});
