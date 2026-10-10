import type { ServiceCategory } from "@/lib/business-shared";
import type { ZonePricing } from "@/lib/zone-pricing";

export interface ServiceSummary {
  zonePricing?: ZonePricing | null;
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  bookingEnabled?: boolean;
  bookings: number;
  bookingRevenue: number;
  category: ServiceCategory | null;
}

export interface ServiceFormState {
  zonePricing: ZonePricing | null;
  name: string;
  description: string;
  price: string;
  category: ServiceCategory;
  durationMinutes: string;
  bookingEnabled: boolean;
}

export interface ServiceFeedbackState {
  title: string;
  description: string;
  tone: "success" | "error";
}
