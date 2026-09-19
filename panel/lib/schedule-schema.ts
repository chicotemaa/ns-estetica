import "server-only";

import type { BackendClient } from "@/lib/backend/client";

export interface BackendBusinessHoursScheduleRow {
  id: string;
  day_of_week: number;
  label: string;
  open_time: string | null;
  close_time: string | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  is_open: boolean;
}

export interface BackendStaffWorkingHoursScheduleRow {
  id: string;
  staff_member_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
  is_active: boolean;
}

export async function fetchBusinessHoursRows(
  backend: BackendClient,
  businessId: string,
) {
  const { data, error } = await backend
    .from("business_hours")
    .select()
    .eq("business_id", businessId)
    .order("day_of_week");
  return {
    data: data as BackendBusinessHoursScheduleRow[] | null,
    error,
    hasBreakColumns: true,
  };
}
export async function fetchStaffWorkingHoursRows(backend: BackendClient) {
  const { data, error } = await backend
    .from("staff_member_working_hours")
    .select()
    .order("day_of_week");
  return {
    data: data as BackendStaffWorkingHoursScheduleRow[] | null,
    error,
    hasBreakColumns: true,
  };
}
