"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { historyFacts } = require("../src/domain/workbook");
const row = (cells = {}, extra = {}) => ({
  sheet: "BASE_DATOS",
  row: 3,
  cells: {
    A: "2026-08-01",
    B: "Cliente de prueba",
    C: "CORTE",
    D: 10000,
    E: "EFECTIVO",
    I: "Nerea",
    ...cells,
  },
  ...extra,
});
test("historical work retains original amount and explicit payment method", () => {
  const f = historyFacts(row());
  assert.equal(f.amount, 10000);
  assert.equal(f.service, true);
  assert.equal(f.method, "cash");
  assert.deepEqual(f.notes, []);
});
test("duplicate and negative adjustments are held from accounting", () => {
  assert.equal(historyFacts(row({}, { duplicate: true })).blocked, true);
  assert.equal(historyFacts(row({ D: 0, G: -7000 })).blocked, true);
});
test("split payment, deposit and unspecified payment retain review evidence", () => {
  assert.equal(historyFacts(row({ C: null })).service, false);
  assert.equal(historyFacts(row({ C: "SEÑA CORTE DE HOMBRE" })).service, false);
  const f = historyFacts(row({ E: null }));
  assert.equal(f.method, null);
  assert.equal(f.service, true);
  assert.ok(f.notes.length);
});
test("questioned supplier value is held without dropping valid same-row receipts", () => {
  const f = historyFacts(row({ F: 108749320 }, { row: 1030 }));
  assert.equal(f.blockedSupplier, true);
  assert.equal(f.blocked, false);
});
