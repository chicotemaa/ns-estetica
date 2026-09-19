import "server-only";

export {
  getManagedBusiness,
  type ManagedBusinessContext,
} from "@/lib/managed-business";
import {
  getDefaultDurationMinutes,
  SERVICE_CATEGORIES,
} from "@/lib/service-catalog";
import type { ServiceCategory } from "@/lib/business-shared";

export interface ServicePayload {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  category?: unknown;
  durationMinutes?: unknown;
  bookingEnabled?: unknown;
  isActive?: unknown;
}

export interface ParsedServicePayload {
  name: string;
  description: string | null;
  price: number;
  category: ServiceCategory;
  durationMinutes: number | null;
  bookingEnabled: boolean;
  isActive: boolean;
}

export function parseServicePayload(payload: ServicePayload): {
  data?: ParsedServicePayload;
  error?: string;
} {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const description =
    typeof payload.description === "string" ? payload.description.trim() : "";
  const price =
    typeof payload.price === "number" ? payload.price : Number(payload.price);
  const category =
    typeof payload.category === "string"
      ? payload.category.trim().toLowerCase()
      : "";
  const durationMinutes =
    payload.durationMinutes === "" || payload.durationMinutes === null
      ? null
      : payload.durationMinutes === undefined
        ? getDefaultDurationMinutes(category as ServiceCategory)
        : Number(payload.durationMinutes);
  const bookingEnabled =
    typeof payload.bookingEnabled === "boolean"
      ? payload.bookingEnabled
      : durationMinutes != null;
  const isActive =
    typeof payload.isActive === "boolean" ? payload.isActive : true;

  if (!name) {
    return { error: "El nombre es obligatorio." };
  }

  if (!Number.isFinite(price) || price < 0) {
    return {
      error: "El costo debe ser un número válido mayor o igual a cero.",
    };
  }

  if (!SERVICE_CATEGORIES.includes(category as ServiceCategory)) {
    return {
      error: "La categoría debe ser corte, coloraciones o tratamiento.",
    };
  }

  if (
    (durationMinutes !== null &&
      (!Number.isInteger(durationMinutes) || durationMinutes <= 0)) ||
    (bookingEnabled && durationMinutes === null)
  ) {
    return { error: "La duración debe ser un número válido mayor a cero." };
  }

  return {
    data: {
      name,
      description: description || null,
      price,
      category: category as ServiceCategory,
      durationMinutes,
      bookingEnabled,
      isActive,
    },
  };
}

export function parseServiceStatusPayload(
  payload: Pick<ServicePayload, "isActive">,
): { isActive?: boolean; error?: string } {
  if (typeof payload.isActive !== "boolean") {
    return { error: "El estado activo debe ser booleano." };
  }

  return { isActive: payload.isActive };
}
