import type { ServiceCategory } from "@/lib/business-shared"

export const SERVICE_CATEGORIES: ServiceCategory[] = ["corte", "coloraciones", "tratamiento"]

export function getDefaultDurationMinutes(category: ServiceCategory) {
  switch (category) {
    case "corte":
      return 45
    case "coloraciones":
      return 180
    case "tratamiento":
      return 120
    default:
      return 60
  }
}
