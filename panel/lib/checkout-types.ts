export interface CheckoutPayment {
  id: string;
  amountCents: number;
  method: string;
  status: string;
  date: string;
  commissionCents: number;
  commissionRate: number;
  canVoid: boolean;
}
export interface CheckoutSummary {
  appointment: {
    id: string;
    customer_id: string | null;
    customer_name: string;
    customer_contact: string;
    customer_email: string | null;
    service_name_snapshot: string;
    staff_name_snapshot: string | null;
    appointment_date: string;
    appointment_time: string;
    duration_snapshot: number;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    notes: string | null;
    arrived_at?: string | null;
    started_at?: string | null;
    finished_at?: string | null;
  };
  baseTotalCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  timeZone: string;
  payments: CheckoutPayment[];
  events: {
    id: string;
    kind: string;
    reason: string;
    before: { totalCents?: number; method?: string; status?: string };
    after: { totalCents?: number; method?: string; status?: string };
    date: string;
    actor: string;
  }[];
}
