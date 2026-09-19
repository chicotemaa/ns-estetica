import { getDefaultDurationMinutes } from "@/lib/service-catalog"
import type { ServiceCategory } from "@/lib/business-shared"

import type { ServiceFormState, ServiceSummary } from "./service-types"

export const INITIAL_SERVICE_FORM: ServiceFormState = {
  bookingEnabled: true,
  name: "",
  description: "",
  price: "",
  category: "corte",
  durationMinutes: String(getDefaultDurationMinutes("corte")),
}

export function categoryBadgeClassName(category: ServiceCategory | null) {
  switch (category) {
    case "corte":
      return "bg-sky-100 text-sky-900"
    case "coloraciones":
      return "bg-fuchsia-100 text-fuchsia-900"
    case "tratamiento":
      return "bg-emerald-100 text-emerald-900"
    default:
      return "bg-slate-100 text-slate-800"
  }
}

export function createServiceFormState(service?: ServiceSummary | null): ServiceFormState {
  if (!service) {
    return INITIAL_SERVICE_FORM
  }

  return {
    name: service.name,
    description: service.description ?? "",
    price: String(service.price),
    category: service.category ?? "corte",
    durationMinutes: service.durationMinutes ? String(service.durationMinutes) : "",
    bookingEnabled: service.bookingEnabled !== false && service.durationMinutes > 0,
  }
}
