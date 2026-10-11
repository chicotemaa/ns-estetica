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
  imageUrl?: unknown;
  gallery?: unknown;
  imagePosition?: unknown;
  featured?: unknown;
  zonePricing?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  category?: unknown;
  durationMinutes?: unknown;
  bookingEnabled?: unknown;
  isActive?: unknown;
}

export interface ParsedServicePayload {
  imageUrl?: string | null;
  gallery?: string[];
  imagePosition?: string;
  featured?: boolean;
  zonePricing?: unknown;
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
  const validImage = (value: unknown): value is string => {
    if (typeof value !== "string" || value.length > 2048) return false;
    if (/^\/images\/[\w./-]+$/.test(value) && !value.includes(".."))
      return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  };
  if (
    payload.imageUrl !== undefined &&
    payload.imageUrl !== null &&
    payload.imageUrl !== "" &&
    !validImage(payload.imageUrl)
  )
    return { error: "Usá una imagen subida o una dirección HTTPS válida." };
  if (
    payload.gallery !== undefined &&
    (!Array.isArray(payload.gallery) ||
      payload.gallery.length > 6 ||
      !payload.gallery.every(validImage))
  )
    return {
      error:
        "La galería admite hasta 6 imágenes con direcciones HTTPS válidas.",
    };
  if (
    payload.imagePosition !== undefined &&
    (typeof payload.imagePosition !== "string" ||
      !/^(0|25|50|75|100)% (0|25|50|75|100)%$/.test(payload.imagePosition))
  )
    return { error: "Elegí un encuadre válido para la imagen." };
  if (payload.featured !== undefined && typeof payload.featured !== "boolean")
    return { error: "La opción destacado debe ser verdadera o falsa." };
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
      error: "La categoría debe ser facial, corporal o manos y pies.",
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
      ...(payload.imageUrl !== undefined
        ? { imageUrl: payload.imageUrl ? String(payload.imageUrl) : null }
        : {}),
      ...(payload.gallery !== undefined
        ? { gallery: payload.gallery as string[] }
        : {}),
      ...(payload.imagePosition !== undefined
        ? { imagePosition: payload.imagePosition as string }
        : {}),
      ...(payload.featured !== undefined
        ? { featured: payload.featured as boolean }
        : {}),
      ...(payload.zonePricing !== undefined
        ? { zonePricing: payload.zonePricing }
        : {}),
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
