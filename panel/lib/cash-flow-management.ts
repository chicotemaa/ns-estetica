import "server-only";

import type {
  PaymentMethod,
  PaymentStatus,
  StaffRecord,
} from "@/lib/business-shared";
import type { ManagedBusinessContext } from "@/lib/managed-business";
export {
  getManagedBusiness,
  type ManagedBusinessContext,
} from "@/lib/managed-business";

const PAYMENT_METHODS = [
  "cash",
  "card",
  "transfer",
  "mercado_pago",
  "other",
] as const;
const PAYMENT_STATUSES = [
  "pending",
  "completed",
  "failed",
  "refunded",
] as const;

export interface PaymentPayload {
  description?: unknown;
  amount?: unknown;
  method?: unknown;
  status?: unknown;
  customerId?: unknown;
  staffMemberId?: unknown;
  transactionId?: unknown;
  processedAt?: unknown;
  notes?: unknown;
}

export interface ExpensePayload {
  expenseDate?: unknown;
  category?: unknown;
  subcategory?: unknown;
  description?: unknown;
  vendorName?: unknown;
  amount?: unknown;
  method?: unknown;
  source?: unknown;
  notes?: unknown;
}

export interface PayoutPayload {
  payoutDate?: unknown;
  recipientName?: unknown;
  recipientType?: unknown;
  category?: unknown;
  staffMemberId?: unknown;
  amount?: unknown;
  method?: unknown;
  source?: unknown;
  notes?: unknown;
}

export interface ParsedPaymentPayload {
  description: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  customerId: string | null;
  staffMemberId: string | null;
  transactionId: string | null;
  processedAt: string | null;
  notes: string | null;
}

export interface ParsedExpensePayload {
  expenseDate: string;
  category: string;
  subcategory: string | null;
  description: string;
  vendorName: string | null;
  amount: number;
  method: PaymentMethod;
  source: string;
  notes: string | null;
}

export interface ParsedPayoutPayload {
  payoutDate: string;
  recipientName: string;
  recipientType: string;
  category: string;
  staffMemberId: string | null;
  amount: number;
  method: PaymentMethod;
  source: string;
  notes: string | null;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseAmount(value: unknown, fieldLabel: string) {
  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return {
      error: `${fieldLabel} debe ser un número válido mayor o igual a cero.`,
    };
  }

  return { value: amount };
}

function parseDate(value: unknown, fieldLabel: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return { error: `${fieldLabel} debe tener formato AAAA-MM-DD.` };
  }

  return { value: value.trim() };
}

function parseDateTime(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }

  if (typeof value !== "string") {
    return { error: "La fecha y hora del cobro es inválida." };
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return { error: "La fecha y hora del cobro es inválida." };
  }

  return { value: parsed.toISOString() };
}

function parsePaymentMethod(value: unknown) {
  if (
    typeof value !== "string" ||
    !PAYMENT_METHODS.includes(value as PaymentMethod)
  ) {
    return { error: "El método de pago es inválido." };
  }

  return { value: value as PaymentMethod };
}

function parsePaymentStatus(value: unknown) {
  if (
    typeof value !== "string" ||
    !PAYMENT_STATUSES.some(status => status === value)
  ) {
    return { error: "El estado del cobro es inválido." };
  }

  return { value: value as PaymentStatus };
}

export function parsePaymentPayload(payload: PaymentPayload): {
  data?: ParsedPaymentPayload;
  error?: string;
} {
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const amount = parseAmount(payload.amount, "El importe");
  const method = parsePaymentMethod(payload.method);
  const status = parsePaymentStatus(payload.status);
  const processedAt = parseDateTime(payload.processedAt);

  if (!description) {
    return { error: "La descripción del cobro es obligatoria." };
  }

  if (amount.error || method.error || status.error || processedAt.error) {
    return {
      error: amount.error ?? method.error ?? status.error ?? processedAt.error,
    };
  }

  return {
    data: {
      description,
      amount: amount.value ?? 0,
      method: method.value ?? "cash",
      status: status.value ?? "pending",
      customerId: normalizeOptionalText(payload.customerId),
      staffMemberId: normalizeOptionalText(payload.staffMemberId),
      transactionId: normalizeOptionalText(payload.transactionId),
      processedAt: processedAt.value ?? null,
      notes: normalizeOptionalText(payload.notes),
    },
  };
}

export function parseExpensePayload(payload: ExpensePayload): {
  data?: ParsedExpensePayload;
  error?: string;
} {
  const expenseDate = parseDate(payload.expenseDate, "La fecha del gasto");
  const amount = parseAmount(payload.amount, "El importe");
  const method = parsePaymentMethod(payload.method);
  const category =
    typeof payload.category === "string" ? payload.category.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const source =
    typeof payload.source === "string" && payload.source.trim().length > 0
      ? payload.source.trim()
      : "manual";

  if (!category) {
    return { error: "La categoría del gasto es obligatoria." };
  }

  if (!description) {
    return { error: "La descripción del gasto es obligatoria." };
  }

  if (expenseDate.error || amount.error || method.error) {
    return { error: expenseDate.error ?? amount.error ?? method.error };
  }

  return {
    data: {
      expenseDate: expenseDate.value ?? "",
      category,
      subcategory: normalizeOptionalText(payload.subcategory),
      description,
      vendorName: normalizeOptionalText(payload.vendorName),
      amount: amount.value ?? 0,
      method: method.value ?? "cash",
      source,
      notes: normalizeOptionalText(payload.notes),
    },
  };
}

export function parsePayoutPayload(payload: PayoutPayload): {
  data?: ParsedPayoutPayload;
  error?: string;
} {
  const payoutDate = parseDate(payload.payoutDate, "La fecha del pago");
  const amount = parseAmount(payload.amount, "El importe");
  const method = parsePaymentMethod(payload.method);
  const recipientName =
    typeof payload.recipientName === "string"
      ? payload.recipientName.trim()
      : "";
  const recipientType =
    typeof payload.recipientType === "string"
      ? payload.recipientType.trim()
      : "";
  const category =
    typeof payload.category === "string" ? payload.category.trim() : "";
  const source =
    typeof payload.source === "string" && payload.source.trim().length > 0
      ? payload.source.trim()
      : "manual";

  if (!recipientName) {
    return { error: "El destinatario es obligatorio." };
  }

  if (!recipientType) {
    return { error: "El tipo de destinatario es obligatorio." };
  }

  if (!category) {
    return { error: "La categoría de la salida es obligatoria." };
  }

  if (payoutDate.error || amount.error || method.error) {
    return { error: payoutDate.error ?? amount.error ?? method.error };
  }

  return {
    data: {
      payoutDate: payoutDate.value ?? "",
      recipientName,
      recipientType,
      category,
      staffMemberId: normalizeOptionalText(payload.staffMemberId),
      amount: amount.value ?? 0,
      method: method.value ?? "transfer",
      source,
      notes: normalizeOptionalText(payload.notes),
    },
  };
}

export async function validateBusinessCustomer(
  context: ManagedBusinessContext,
  customerId: string | null,
) {
  if (!customerId) {
    return { data: null };
  }

  const { data, error } = await context.backend
    .from("customers")
    .select("id")
    .eq("business_id", context.business.id)
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    return { error: "No se pudo validar el cliente asociado." };
  }

  if (!data) {
    return { error: "El cliente asociado no existe en este negocio." };
  }

  return { data: customerId };
}

export async function validateBusinessStaffMember(
  context: ManagedBusinessContext,
  staffMemberId: string | null,
) {
  if (!staffMemberId) {
    return { data: null as { id: string; full_name: string } | null };
  }

  const { data, error } = await context.backend
    .from("staff_members")
    .select("id, full_name")
    .eq("business_id", context.business.id)
    .eq("id", staffMemberId)
    .maybeSingle();

  if (error) {
    return { error: "No se pudo validar el profesional asociado." };
  }

  if (!data) {
    return { error: "El profesional asociado no existe en este negocio." };
  }

  return { data };
}

export function getDefaultPayoutRecipientName(
  staffMember: Pick<StaffRecord, "fullName"> | null,
) {
  return staffMember?.fullName ?? "";
}
