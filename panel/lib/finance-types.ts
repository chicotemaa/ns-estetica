export interface ExpensePlanRow {
  id: string;
  title: string;
  category: string;
  vendor: string;
  recurrence: "monthly" | "once";
  amountCents: number;
  dueDate: string;
  state: "pending" | "paid" | "cancelled";
  overdue: boolean;
  paidDate: string | null;
  method: string | null;
  notes: string;
  endMonth: string | null;
}
export interface ExpensePlanningData {
  month: string;
  today: string;
  rows: ExpensePlanRow[];
  totals: {
    plannedCents: number;
    paidCents: number;
    pendingCents: number;
    overdueCents: number;
    cashExpensesCents: number;
  };
}
export interface PayrollPerson {
  id: string;
  name: string;
  role: string | null;
  mode: "hourly" | "percentage";
  cadence: "weekly" | "semimonthly" | "monthly";
  weekday: number;
}
export interface EarningLine {
  key: string;
  id: string;
  kind: "payment" | "hours";
  date: string;
  description: string;
  amountCents: number;
  base: number;
  rate: number;
  paid: boolean;
}
export interface PayrollData {
  staff: PayrollPerson[];
  person: PayrollPerson | null;
  month: string;
  today: string;
  period: { start: string; end: string; payDate: string } | null;
  earnedCents: number;
  paidCents: number;
  unpaidCents: number;
  lines: EarningLine[];
  history: {
    id: string;
    date: string;
    amountCents: number;
    method: string;
    start: string;
    end: string;
    detail: EarningLine[];
  }[];
  manualPayouts: {
    id: string;
    date: string;
    amountCents: number;
    category: string;
  }[];
  unpricedHours: { id: string; date: string; hours: number }[];
  timeLogs: {
    id: string;
    date: string;
    hours: number;
    rate: number;
    amountCents: number;
    notes: string | null;
    paid: boolean;
  }[];
}
