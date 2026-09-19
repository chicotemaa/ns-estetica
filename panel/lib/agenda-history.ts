import type {
  AppointmentRecord,
  BusinessHourRecord,
  WorkRecord,
} from "./business-shared";

// A history entry cannot be passed to appointment mutations: its channel and
// identifier belong to a work record, and its time exists only in this view.
export interface HistoricalAgendaEntry
  extends Omit<AppointmentRecord, "channel" | "createdAt"> {
  channel: "history";
  workRecord: WorkRecord;
}
export type AgendaEntry = AppointmentRecord | HistoricalAgendaEntry;
export type AgendaSourceFilter = "all" | "appointments" | "history";
export function isHistoricalEntry(
  entry: AgendaEntry,
): entry is HistoricalAgendaEntry {
  return entry.channel === "history";
}

const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const timeLabel = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
type Range = { start: number; end: number };
function subtract(ranges: Range[], blocked: Range): Range[] {
  return ranges.flatMap((range) => {
    if (blocked.end <= range.start || blocked.start >= range.end)
      return [range];
    return [
      { start: range.start, end: Math.min(range.end, blocked.start) },
      { start: Math.max(range.start, blocked.end), end: range.end },
    ].filter((part) => part.end > part.start);
  });
}

export function buildHistoricalAgendaEntries(
  works: WorkRecord[],
  appointments: AppointmentRecord[],
  businessHours: BusinessHourRecord[],
): HistoricalAgendaEntry[] {
  const byDate = new Map<string, WorkRecord[]>();
  // Only identical database IDs are deduplicated. Repeat visits are legitimate.
  for (const work of new Map(works.map((work) => [work.id, work])).values()) {
    const day = byDate.get(work.workDate) ?? [];
    day.push(work);
    byDate.set(work.workDate, day);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, rows]) => {
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      const hours = businessHours.find(
        (day) => day.dayOfWeek === weekday && day.isOpen,
      );
      let start = hours?.openTime ? minutes(hours.openTime) : 9 * 60;
      let end = hours?.closeTime ? minutes(hours.closeTime) : 18 * 60;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        start = 9 * 60;
        end = 18 * 60;
      }
      let ranges: Range[] = [{ start, end }];
      let fullDay: Range[] = [{ start: 0, end: 24 * 60 }];
      if (hours?.breakStartTime && hours.breakEndTime) {
        const middayBreak = {
          start: minutes(hours.breakStartTime),
          end: minutes(hours.breakEndTime),
        };
        ranges = subtract(ranges, middayBreak);
        fullDay = subtract(fullDay, middayBreak);
      }
      const baseRanges = ranges;
      for (const appointment of appointments) {
        if (
          appointment.appointmentDate !== date ||
          appointment.status === "cancelled"
        )
          continue;
        const occupiedStart = minutes(appointment.appointmentTime);
        const occupied = {
          start: occupiedStart,
          end: occupiedStart + appointment.durationMinutes,
        };
        ranges = subtract(ranges, occupied);
        fullDay = subtract(fullDay, occupied);
      }
      // One reference hour per service. Prefer opening hours, then extend the
      // visual day when necessary rather than stacking entries in those hours.
      // These blocks never consume availability or cross the source date.
      const allSlots = Array.from({ length: 24 }, (_, hour) => ({
        start: hour * 60,
        end: (hour + 1) * 60,
      }));
      const fits = (slot: Range, available: Range[]) =>
        available.some(
          (range) => slot.start >= range.start && slot.end <= range.end,
        );
      const preferred = allSlots.filter((slot) => fits(slot, ranges));
      const extra = allSlots
        .filter((slot) => !fits(slot, ranges) && fits(slot, fullDay))
        .sort((a, b) => {
          // Extend towards the evening first, then earlier in the morning.
          const rank = (slot: Range) =>
            slot.start >= start ? slot.start - start : 24 * 60 - slot.start;
          return rank(a) - rank(b);
        });
      const available = [...preferred, ...extra];
      // Fully occupied days and unusually large imports still retain every
      // service, even when reference hours must be shared.
      const fallback = allSlots.filter((slot) => fits(slot, baseRanges));
      const slots = (
        available.length ? available : fallback.length ? fallback : allSlots
      )
        .slice(0, rows.length)
        .sort((a, b) => a.start - b.start);
      return [...rows]
        .sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }))
        .map((work, index) => {
          const slot = slots[index % slots.length];
          return {
            id: `history:${work.id}`,
            workRecord: work,
            channel: "history" as const,
            customerId: work.customerId,
            customerName: work.customerName,
            customerContact: "",
            customerEmail: null,
            appointmentDate: work.workDate,
            appointmentTime: timeLabel(slot.start),
            status: "completed" as const,
            serviceId: work.serviceId,
            serviceName: work.serviceName,
            staffMemberId: work.staffMemberId,
            staffName: work.staffName,
            price: work.amount,
            durationMinutes: slot.end - slot.start,
            notes: work.notes,
          };
        });
    });
}

export function matchesAgendaSource(
  entry: AgendaEntry,
  source: AgendaSourceFilter,
) {
  return (
    source === "all" ||
    (source === "history"
      ? isHistoricalEntry(entry)
      : !isHistoricalEntry(entry))
  );
}

export function getAgendaEventTiming(
  entry: AgendaEntry,
  bufferMinutes: number,
) {
  const historical = isHistoricalEntry(entry);
  return {
    durationMinutes: entry.durationMinutes + (historical ? 0 : bufferMinutes),
    startEditable: !historical,
    durationEditable: false,
  };
}
