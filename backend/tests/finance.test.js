const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  periodFor,
  monthDay,
  commissionRate,
} = require("../src/domain/finance-rules");
test("calendar payroll periods cover month boundaries without overlaps, including leap February", () => {
  const semi = {
    payroll_cadence: "semimonthly",
    payroll_cutoff_first: 15,
    payroll_cutoff_second: 31,
    payroll_pay_delay: 2,
  };
  assert.deepEqual(periodFor(semi, "2028-02", "second"), {
    start: "2028-02-16",
    end: "2028-02-29",
    payDate: "2028-03-02",
  });
  assert.equal(periodFor(semi, "2028-03", "first").start, "2028-03-01");
  assert.deepEqual(
    periodFor(
      { ...semi, payroll_cutoff_first: 10, payroll_cutoff_second: 25 },
      "2026-09",
      "first",
    ),
    { start: "2026-08-26", end: "2026-09-10", payDate: "2026-09-12" },
  );
  const weekly = { payroll_cadence: "weekly", payroll_weekday: 0 };
  assert.deepEqual(periodFor(weekly, "2026-09", "week-1"), {
    start: "2026-08-31",
    end: "2026-09-06",
    payDate: "2026-09-06",
  });
  assert.equal(periodFor(weekly, "2026-09", "week-2").start, "2026-09-07");
  assert.throws(() => periodFor(weekly, "2026-09", "week-5"));
  assert.equal(monthDay("2027-02", 31), "2027-02-28");
  assert.deepEqual(
    periodFor(
      { payroll_cadence: "monthly", payroll_cutoff_second: 1 },
      "2026-09",
    ),
    { start: "2026-08-02", end: "2026-09-01", payDate: "2026-09-01" },
  );
});
test("explicit hourly pay excludes commissions and legacy collection policy is preserved", () => {
  assert.equal(
    commissionRate({ payroll_mode: "hourly", collection_commission_rate: 50 }),
    0,
  );
  assert.equal(
    commissionRate({
      payroll_mode: "percentage",
      collection_commission_rate: 25,
    }),
    25,
  );
  assert.equal(
    commissionRate({
      compensation_type: "hourly",
      collection_commission_rate: 50,
    }),
    50,
  );
});
