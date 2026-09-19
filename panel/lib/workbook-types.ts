export interface WorkbookData {
  rows: Record<string, unknown>[];
  count: number;
  page: number;
  pending: number;
  imported: number;
  workCount: number;
  services: {
    id: string;
    name: string;
    price: number | string;
    is_active: boolean;
    duration_minutes: number | null;
    booking_enabled: boolean;
  }[];
  staff: { id: string; full_name: string; is_active: boolean }[];
  variants: {
    id: string;
    service_id: string;
    variant_name: string;
    price: number | string;
    is_active: boolean;
    is_default: boolean;
  }[];
}
