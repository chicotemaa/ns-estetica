import { NextResponse } from "next/server";
import {
  parseBusinessSchedulePayload,
  type BusinessSchedulePayload,
} from "@/lib/business-schedule";
import { getManagedBusiness } from "@/lib/managed-business";
export async function PUT(request: Request) {
  const context = await getManagedBusiness();
  if (!context.data)
    return NextResponse.json({ error: context.error }, { status: 503 });
  const parsed = parseBusinessSchedulePayload(
    (await request.json()) as BusinessSchedulePayload,
  );
  if (!parsed.data)
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { backend, business } = context.data;
  const settings = parsed.data.bookingSettings;
  const { error } = await backend.batch([
    {
      resource: "business_hours",
      operation: "upsert",
      onConflict: "business_id,day_of_week",
      data: parsed.data.days.map((day) => ({
        business_id: business.id,
        day_of_week: day.dayOfWeek,
        label: day.label,
        open_time: day.openTime,
        close_time: day.closeTime,
        break_start_time: day.breakStartTime,
        break_end_time: day.breakEndTime,
        is_open: day.isOpen,
      })),
    },
    {
      resource: "booking_settings",
      operation: "upsert",
      onConflict: "business_id",
      data: {
        business_id: business.id,
        slot_interval_minutes: settings.slotIntervalMinutes,
        lead_time_minutes: settings.leadTimeMinutes,
        max_booking_days_in_advance: settings.maxBookingDaysInAdvance,
        buffer_between_appointments_minutes:
          settings.bufferBetweenAppointmentsMinutes,
      },
    },
  ]);
  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json({ success: true, warning: null });
}
