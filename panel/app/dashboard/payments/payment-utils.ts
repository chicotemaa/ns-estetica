import type {
  ExpenseRecord,
  PaymentRecord,
  PayoutRecord,
} from "@/lib/business-shared";

import type {
  ExpenseFormState,
  PaymentFormState,
  PayoutFormState,
} from "./payment-types";

function formatDateTimeLocalValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export const INITIAL_PAYMENT_FORM: PaymentFormState = {
  description: "",
  amount: "0",
  method: "cash",
  status: "pending",
  customerId: "",
  staffMemberId: "",
  transactionId: "",
  processedAt: "",
  notes: "",
};

export const INITIAL_EXPENSE_FORM: ExpenseFormState = {
  expenseDate: getTodayDateValue(),
  category: "",
  subcategory: "",
  description: "",
  vendorName: "",
  amount: "0",
  method: "cash",
  source: "manual",
  notes: "",
};

export const INITIAL_PAYOUT_FORM: PayoutFormState = {
  payoutDate: getTodayDateValue(),
  recipientName: "",
  recipientType: "staff",
  category: "honorarios",
  staffMemberId: "",
  amount: "0",
  method: "transfer",
  source: "manual",
  notes: "",
};

export function createPaymentFormState(
  payment?: PaymentRecord | null,
): PaymentFormState {
  if (!payment) {
    return INITIAL_PAYMENT_FORM;
  }

  return {
    description: payment.description,
    amount: String(payment.amount),
    method: payment.method,
    status: payment.status,
    customerId: payment.customerId ?? "",
    staffMemberId: payment.staffMemberId ?? "",
    transactionId: payment.transactionId ?? "",
    processedAt: formatDateTimeLocalValue(payment.processedAt),
    notes: payment.notes ?? "",
  };
}

export function createExpenseFormState(
  expense?: ExpenseRecord | null,
): ExpenseFormState {
  if (!expense) {
    return INITIAL_EXPENSE_FORM;
  }

  return {
    expenseDate: expense.expenseDate,
    category: expense.category,
    subcategory: expense.subcategory ?? "",
    description: expense.description,
    vendorName: expense.vendorName ?? "",
    amount: String(expense.amount),
    method: expense.method,
    source: expense.source,
    notes: expense.notes ?? "",
  };
}

export function createPayoutFormState(
  payout?: PayoutRecord | null,
): PayoutFormState {
  if (!payout) {
    return INITIAL_PAYOUT_FORM;
  }

  return {
    payoutDate: payout.payoutDate,
    recipientName: payout.recipientName,
    recipientType: payout.recipientType,
    category: payout.category,
    staffMemberId: payout.staffMemberId ?? "",
    amount: String(payout.amount),
    method: payout.method,
    source: payout.source,
    notes: payout.notes ?? "",
  };
}
