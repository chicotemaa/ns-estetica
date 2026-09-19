"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { cents } = require("../src/domain/checkout");
test("currency input keeps cents exact and rejects ambiguous or non monetary values", () => {
  assert.equal(cents(0.29), 29);
  assert.equal(cents("1500000.50"), 150000050);
  for (const value of [
    null,
    undefined,
    "",
    " ",
    true,
    [],
    {},
    NaN,
    Infinity,
    -1,
    0.001,
    "1,500",
    "1e3",
  ])
    assert.throws(() => cents(value));
});
