import type {
  ExpenseRecord,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  PayoutRecord,
  StaffRecord,
  CustomerRecord,
} from "@/lib/business-shared";

export type MovementKind = "payment" | "expense" | "payout";
export type MovementTab = "payments" | "expenses" | "payouts" | "summary";
export type MovementPeriod = "day" | "week" | "month" | "year";

export interface PaymentFormState {
  description: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  customerId: string;
  staffMemberId: string;
  transactionId: string;
  processedAt: string;
  notes: string;
}

export interface ExpenseFormState {
  expenseDate: string;
  category: string;
  subcategory: string;
  description: string;
  vendorName: string;
  amount: string;
  method: PaymentMethod;
  source: string;
  notes: string;
}

export interface PayoutFormState {
  payoutDate: string;
  recipientName: string;
  recipientType: string;
  category: string;
  staffMemberId: string;
  amount: string;
  method: PaymentMethod;
  source: string;
  notes: string;
}

export type MovementRecord =
  | { kind: "payment"; data: PaymentRecord }
  | { kind: "expense"; data: ExpenseRecord }
  | { kind: "payout"; data: PayoutRecord };

export interface MovementFeedbackState {
  title: string;
  description: string;
  tone: "success" | "error";
}

export type PaymentOptionCustomer = Pick<CustomerRecord, "id" | "fullName">;
export type PaymentOptionStaff = Pick<StaffRecord, "id" | "fullName">;
