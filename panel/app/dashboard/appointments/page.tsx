import { getBusinessAgendaBundle } from "@/lib/business-data";
import { getDateKeyInTimeZone } from "@/lib/business-shared";

import { AppointmentsPageClient } from "./page-client";
import type { AgendaViewMode } from "./appointment-types";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const {
    appointments,
    workRecords,
    bookingSettings,
    business,
    businessHours,
    customers,
    isLive,
    services,
    staffMembers,
    staffServiceAssignments,
    staffWorkingHours,
  } = await getBusinessAgendaBundle();
  const selected = appointments.find((a) => a.id === query.appointment);
  const selectedWork = workRecords.find((work) => work.id === query.work);
  const requestedDate =
    typeof query.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(query.date) &&
    Number.isFinite(Date.parse(`${query.date}T12:00:00Z`)) &&
    new Date(`${query.date}T12:00:00Z`).toISOString().slice(0, 10) ===
      query.date
      ? query.date
      : null;
  const todayKey = getDateKeyInTimeZone(business.timeZone);
  const initialDateKey =
    selected?.appointmentDate ||
    selectedWork?.workDate ||
    requestedDate ||
    todayKey;
  const initialEntryId =
    selected?.id || (selectedWork ? `history:${selectedWork.id}` : null);
  const initialCreate = query.new === "1";
  const initialViewMode =
    typeof query.view === "string" &&
    ["day", "week", "month", "year"].includes(query.view)
      ? (query.view as AgendaViewMode)
      : undefined;

  return (
    <AppointmentsPageClient
      key={`${initialEntryId || ""}:${initialDateKey}:${initialCreate}:${initialViewMode || ""}`}
      initialViewMode={initialViewMode}
      initialDateKey={initialDateKey}
      initialAppointmentId={initialEntryId}
      initialCreate={initialCreate}
      appointments={appointments}
      workRecords={workRecords}
      bookingSettings={bookingSettings}
      businessHours={businessHours}
      businessName={business.name}
      customers={customers}
      isLive={isLive}
      services={services}
      staffMembers={staffMembers}
      staffServiceAssignments={staffServiceAssignments}
      staffWorkingHours={staffWorkingHours}
      timeZone={business.timeZone}
      todayKey={todayKey}
    />
  );
}
