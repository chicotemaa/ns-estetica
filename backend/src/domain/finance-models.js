"use strict";
const text = { type: "text" };
const money = { type: "decimal", min: 0 };
const relation = (name) => ({
  type: "relation",
  relation: "manyToOne",
  target: `api::${name}.${name}`,
});
const operation = {
  operation_key: { type: "string", unique: true, private: true },
  operation_hash: { type: "string", private: true },
};
module.exports = {
  models: {
    finance_operations: {
      name: "finance-operation",
      attributes: {
        business: relation("business"),
        ...operation,
        result: { type: "json", private: true },
      },
    },
    expense_plans: {
      name: "expense-plan",
      attributes: {
        business: relation("business"),
        title: { ...text, required: true },
        category: text,
        vendor: text,
        amount: { ...money, required: true },
        recurrence: {
          type: "enumeration",
          enum: ["monthly", "once"],
          required: true,
        },
        start_month: { type: "string", required: true },
        end_month: { type: "string" },
        due_day: { type: "integer", min: 1, max: 31, required: true },
        notes: text,
        ...operation,
      },
    },
    expense_obligations: {
      name: "expense-obligation",
      attributes: {
        business: relation("business"),
        expense_plan: relation("expense-plan"),
        period: { type: "string", required: true },
        due_date: { type: "date", required: true },
        amount: { ...money, required: true },
        state: {
          type: "enumeration",
          enum: ["pending", "paid", "cancelled"],
          default: "pending",
        },
        expense: relation("expense"),
        occurrence_key: { type: "string", unique: true, private: true },
        notes: text,
      },
    },
    payroll_lines: {
      name: "payroll-line",
      attributes: {
        business: relation("business"),
        payout: relation("payout"),
        staff_member: relation("staff-member"),
        source_key: { type: "string", unique: true, required: true },
        earning_date: { type: "date", required: true },
        description: text,
        amount: { ...money, required: true },
        payment: relation("payment"),
        staff_time_log: relation("staff-time-log"),
      },
    },
  },
  additions: {
    staff_members: {
      payroll_mode: { type: "enumeration", enum: ["hourly", "percentage"] },
      payroll_cadence: {
        type: "enumeration",
        enum: ["weekly", "semimonthly", "monthly"],
      },
      payroll_weekday: { type: "integer", min: 0, max: 6 },
      payroll_cutoff_first: { type: "integer", min: 1, max: 27 },
      payroll_cutoff_second: { type: "integer", min: 1, max: 31 },
      payroll_pay_delay: { type: "integer", min: 0, max: 30 },
    },
    staff_time_logs: {
      hourly_rate_snapshot: money,
      payable_amount: money,
      ...operation,
    },
    payouts: {
      period_start: { type: "date" },
      period_end: { type: "date" },
      payroll_detail: { type: "json" },
      ...operation,
    },
    appointments: {
      arrived_at: { type: "datetime" },
      started_at: { type: "datetime" },
      finished_at: { type: "datetime" },
    },
  },
};
