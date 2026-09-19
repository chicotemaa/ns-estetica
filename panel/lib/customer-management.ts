import "server-only";

import type { CustomerStatus } from "@/lib/business-shared";
export {
  getManagedBusiness,
  type ManagedBusinessContext,
} from "@/lib/managed-business";

export interface CustomerPayload {
  fullName?: unknown;
  primaryContact?: unknown;
  email?: unknown;
  phone?: unknown;
  instagramHandle?: unknown;
  address?: unknown;
  preferredServices?: unknown;
  notes?: unknown;
  status?: unknown;
  rating?: unknown;
  marketingOptIn?: unknown;
}

export interface ParsedCustomerPayload {
  fullName: string;
  primaryContact: string;
  email: string | null;
  phone: string | null;
  instagramHandle: string | null;
  address: string | null;
  preferredServices: string[];
  notes: string | null;
  status: CustomerStatus;
  rating: number | null;
  marketingOptIn: boolean;
}

const CUSTOMER_STATUSES = ["active", "inactive", "vip", "lead"] as const;

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parsePreferredServices(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(/[\n,]/)
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    );
  }

  return [];
}

export function parseCustomerPayload(payload: CustomerPayload): {
  data?: ParsedCustomerPayload;
  error?: string;
} {
  const fullName =
    typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  const primaryContact =
    typeof payload.primaryContact === "string"
      ? payload.primaryContact.trim()
      : "";
  const status =
    typeof payload.status === "string" &&
    CUSTOMER_STATUSES.includes(payload.status as CustomerStatus)
      ? (payload.status as CustomerStatus)
      : "active";
  const rating =
    payload.rating === undefined ||
    payload.rating === null ||
    payload.rating === ""
      ? null
      : Number(payload.rating);

  if (!fullName) {
    return { error: "El nombre del cliente es obligatorio." };
  }

  if (!primaryContact) {
    return { error: "El contacto principal es obligatorio." };
  }

  if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
    return { error: "La calificación debe estar entre 0 y 5." };
  }

  return {
    data: {
      fullName,
      primaryContact,
      email: normalizeOptionalText(payload.email),
      phone: normalizeOptionalText(payload.phone),
      instagramHandle: normalizeOptionalText(payload.instagramHandle),
      address: normalizeOptionalText(payload.address),
      preferredServices: parsePreferredServices(payload.preferredServices),
      notes: normalizeOptionalText(payload.notes),
      status,
      rating,
      marketingOptIn:
        typeof payload.marketingOptIn === "boolean"
          ? payload.marketingOptIn
          : false,
    },
  };
}
