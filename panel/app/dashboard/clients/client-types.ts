import type { CustomerRecord, CustomerStatus } from "@/lib/business-shared";

export interface ClientFormState {
  fullName: string;
  primaryContact: string;
  email: string;
  phone: string;
  instagramHandle: string;
  address: string;
  preferredServices: string;
  notes: string;
  status: CustomerStatus;
  rating: string;
  marketingOptIn: boolean;
}

export interface ClientFeedbackState {
  title: string;
  description: string;
  tone: "success" | "error";
}

export type ClientSummary = CustomerRecord;
