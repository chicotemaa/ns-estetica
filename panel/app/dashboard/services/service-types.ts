import type { ServiceCategory } from "@/lib/business-shared"

export interface ServiceSummary {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive: boolean
  bookingEnabled?: boolean
  bookings: number
  bookingRevenue: number
  category: ServiceCategory | null
}

export interface ServiceFormState {
  name: string
  description: string
  price: string
  category: ServiceCategory
  durationMinutes: string
  bookingEnabled: boolean
}

export interface ServiceFeedbackState {
  title: string
  description: string
  tone: "success" | "error"
}
