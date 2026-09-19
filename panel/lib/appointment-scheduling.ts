import type {
  AppointmentRecord,
  BookingSettingsRecord,
  BusinessHourRecord,
  StaffWorkingHourRecord,
} from "@/lib/business-shared";

const ACTIVE_APPOINTMENT_STATUSES = new Set(["pending", "confirmed", "completed"]);

function normalizeTimeValue(value: string) {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

export function timeStringToMinutes(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = normalizeTimeValue(value);
  const [hours, minutes] = normalized.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function minutesToTimeString(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}:00`;
}

export function getDayOfWeekFromDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).getDay();
}

export function getAppointmentDurationWithBuffer(
  durationMinutes: number,
  bookingSettings: BookingSettingsRecord,
) {
  return durationMinutes + bookingSettings.bufferBetweenAppointmentsMinutes;
}

export function getBusinessDayWindow(
  dateKey: string,
  businessHours: BusinessHourRecord[],
) {
  const dayOfWeek = getDayOfWeekFromDateKey(dateKey);
  return businessHours.find((entry) => entry.dayOfWeek === dayOfWeek) ?? null;
}

export function getStaffDayWindow(
  dateKey: string,
  staffMemberId: string,
  businessHours: BusinessHourRecord[],
  staffWorkingHours: StaffWorkingHourRecord[],
) {
  const dayOfWeek = getDayOfWeekFromDateKey(dateKey);

  const staffEntries = staffWorkingHours.filter(
    (entry) => entry.staffMemberId === staffMemberId,
  );

  if (staffEntries.length === 0) {
    const businessDay = getBusinessDayWindow(dateKey, businessHours);

    if (!businessDay) {
      return null;
    }

    return {
      id: `fallback-${staffMemberId}-${dayOfWeek}`,
      staffMemberId,
      dayOfWeek,
      startTime: businessDay.openTime,
      endTime: businessDay.closeTime,
      breakStartTime: businessDay.breakStartTime,
      breakEndTime: businessDay.breakEndTime,
      isActive: businessDay.isOpen,
    } satisfies StaffWorkingHourRecord;
  }

  return (
    staffEntries.find(
      (entry) =>
        entry.staffMemberId === staffMemberId && entry.dayOfWeek === dayOfWeek,
    ) ?? null
  );
}

export interface CalendarBlockedRange {
  endMinutes: number;
  kind: "business_break" | "staff_break";
  startMinutes: number;
}

export interface CalendarDayWindow {
  blockedRanges: CalendarBlockedRange[];
  businessDay: BusinessHourRecord | null;
  closeMinutes: number | null;
  dateKey: string;
  isOpen: boolean;
  openMinutes: number | null;
  staffDay: StaffWorkingHourRecord | null;
}

function clampRangeToWindow(
  startMinutes: number | null,
  endMinutes: number | null,
  windowStart: number,
  windowEnd: number,
) {
  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  const clampedStart = Math.max(startMinutes, windowStart);
  const clampedEnd = Math.min(endMinutes, windowEnd);

  if (clampedStart >= clampedEnd) {
    return null;
  }

  return {
    startMinutes: clampedStart,
    endMinutes: clampedEnd,
  };
}

export function getCalendarDayWindow({
  businessHours,
  dateKey,
  staffMemberId = null,
  staffWorkingHours,
}: {
  businessHours: BusinessHourRecord[];
  dateKey: string;
  staffMemberId?: string | null;
  staffWorkingHours: StaffWorkingHourRecord[];
}): CalendarDayWindow {
  const businessDay = getBusinessDayWindow(dateKey, businessHours);

  if (
    !businessDay ||
    !businessDay.isOpen ||
    !businessDay.openTime ||
    !businessDay.closeTime
  ) {
    return {
      dateKey,
      businessDay,
      staffDay: null,
      isOpen: false,
      openMinutes: null,
      closeMinutes: null,
      blockedRanges: [],
    };
  }

  const businessOpenMinutes = timeStringToMinutes(businessDay.openTime);
  const businessCloseMinutes = timeStringToMinutes(businessDay.closeTime);

  if (businessOpenMinutes === null || businessCloseMinutes === null) {
    return {
      dateKey,
      businessDay,
      staffDay: null,
      isOpen: false,
      openMinutes: null,
      closeMinutes: null,
      blockedRanges: [],
    };
  }

  const staffDay =
    staffMemberId !== null
      ? getStaffDayWindow(
          dateKey,
          staffMemberId,
          businessHours,
          staffWorkingHours,
        )
      : null;

  if (
    staffMemberId !== null &&
    (!staffDay || !staffDay.isActive || !staffDay.startTime || !staffDay.endTime)
  ) {
    return {
      dateKey,
      businessDay,
      staffDay,
      isOpen: false,
      openMinutes: null,
      closeMinutes: null,
      blockedRanges: [],
    };
  }

  const staffOpenMinutes = staffDay
    ? timeStringToMinutes(staffDay.startTime)
    : businessOpenMinutes;
  const staffCloseMinutes = staffDay
    ? timeStringToMinutes(staffDay.endTime)
    : businessCloseMinutes;

  if (staffOpenMinutes === null || staffCloseMinutes === null) {
    return {
      dateKey,
      businessDay,
      staffDay,
      isOpen: false,
      openMinutes: null,
      closeMinutes: null,
      blockedRanges: [],
    };
  }

  const openMinutes = Math.max(businessOpenMinutes, staffOpenMinutes);
  const closeMinutes = Math.min(businessCloseMinutes, staffCloseMinutes);

  if (openMinutes >= closeMinutes) {
    return {
      dateKey,
      businessDay,
      staffDay,
      isOpen: false,
      openMinutes: null,
      closeMinutes: null,
      blockedRanges: [],
    };
  }

  const blockedRanges: CalendarBlockedRange[] = [];
  const businessBreak = clampRangeToWindow(
    timeStringToMinutes(businessDay.breakStartTime),
    timeStringToMinutes(businessDay.breakEndTime),
    openMinutes,
    closeMinutes,
  );
  const staffBreak = clampRangeToWindow(
    timeStringToMinutes(staffDay?.breakStartTime ?? null),
    timeStringToMinutes(staffDay?.breakEndTime ?? null),
    openMinutes,
    closeMinutes,
  );

  if (businessBreak) {
    blockedRanges.push({ ...businessBreak, kind: "business_break" });
  }

  if (staffBreak) {
    blockedRanges.push({ ...staffBreak, kind: "staff_break" });
  }

  return {
    dateKey,
    businessDay,
    staffDay,
    isOpen: true,
    openMinutes,
    closeMinutes,
    blockedRanges,
  };
}

export function getCalendarBoundsForDates({
  businessHours,
  dateKeys,
  staffMemberId = null,
  staffWorkingHours,
}: {
  businessHours: BusinessHourRecord[];
  dateKeys: string[];
  staffMemberId?: string | null;
  staffWorkingHours: StaffWorkingHourRecord[];
}) {
  const dayWindows = dateKeys.map((dateKey) =>
    getCalendarDayWindow({
      businessHours,
      dateKey,
      staffMemberId,
      staffWorkingHours,
    }),
  );
  const openWindows = dayWindows.filter(
    (window): window is CalendarDayWindow & {
      closeMinutes: number;
      openMinutes: number;
    } => window.isOpen && window.openMinutes !== null && window.closeMinutes !== null,
  );

  return {
    dayWindows,
    earliest:
      openWindows.length > 0
        ? Math.min(...openWindows.map((window) => window.openMinutes))
        : 8 * 60,
    latest:
      openWindows.length > 0
        ? Math.max(...openWindows.map((window) => window.closeMinutes))
        : 22 * 60,
  };
}

export function slotIsBlocked(
  slotStartMinutes: number,
  slotDurationMinutes: number,
  blockedRanges: CalendarBlockedRange[],
) {
  return blockedRanges.some((blockedRange) =>
    intervalsOverlap(
      slotStartMinutes,
      slotStartMinutes + slotDurationMinutes,
      blockedRange.startMinutes,
      blockedRange.endMinutes,
    ),
  );
}

function intervalsOverlap(
  startLeft: number,
  endLeft: number,
  startRight: number,
  endRight: number,
) {
  return startLeft < endRight && endLeft > startRight;
}

function overlapsBreak(
  startMinutes: number,
  endMinutes: number,
  breakStartTime: string | null,
  breakEndTime: string | null,
) {
  const breakStartMinutes = timeStringToMinutes(breakStartTime);
  const breakEndMinutes = timeStringToMinutes(breakEndTime);

  if (breakStartMinutes === null || breakEndMinutes === null) {
    return false;
  }

  return intervalsOverlap(
    startMinutes,
    endMinutes,
    breakStartMinutes,
    breakEndMinutes,
  );
}

export interface AppointmentAvailabilityContext {
  appointmentDate: string;
  appointmentIdToIgnore?: string | null;
  appointments: AppointmentRecord[];
  bookingSettings: BookingSettingsRecord;
  businessHours: BusinessHourRecord[];
  durationMinutes: number;
  staffMemberId: string;
  staffWorkingHours: StaffWorkingHourRecord[];
}

export function getAvailableAppointmentTimes({
  appointmentDate,
  appointmentIdToIgnore = null,
  appointments,
  bookingSettings,
  businessHours,
  durationMinutes,
  staffMemberId,
  staffWorkingHours,
}: AppointmentAvailabilityContext) {
  const businessDay = getBusinessDayWindow(appointmentDate, businessHours);
  const staffDay = getStaffDayWindow(
    appointmentDate,
    staffMemberId,
    businessHours,
    staffWorkingHours,
  );

  if (
    !businessDay ||
    !businessDay.isOpen ||
    !businessDay.openTime ||
    !businessDay.closeTime ||
    !staffDay ||
    !staffDay.isActive ||
    !staffDay.startTime ||
    !staffDay.endTime
  ) {
    return [];
  }

  const businessOpenMinutes = timeStringToMinutes(businessDay.openTime);
  const businessCloseMinutes = timeStringToMinutes(businessDay.closeTime);
  const staffOpenMinutes = timeStringToMinutes(staffDay.startTime);
  const staffCloseMinutes = timeStringToMinutes(staffDay.endTime);

  if (
    businessOpenMinutes === null ||
    businessCloseMinutes === null ||
    staffOpenMinutes === null ||
    staffCloseMinutes === null
  ) {
    return [];
  }

  const startWindow = Math.max(businessOpenMinutes, staffOpenMinutes);
  const endWindow = Math.min(businessCloseMinutes, staffCloseMinutes);
  const totalDuration = getAppointmentDurationWithBuffer(
    durationMinutes,
    bookingSettings,
  );

  if (startWindow >= endWindow || totalDuration <= 0) {
    return [];
  }

  const appointmentsForSlotValidation = appointments.filter((appointment) => {
    if (appointment.id === appointmentIdToIgnore) {
      return false;
    }

    if (appointment.appointmentDate !== appointmentDate) {
      return false;
    }

    if (!ACTIVE_APPOINTMENT_STATUSES.has(appointment.status)) {
      return false;
    }

    return appointment.staffMemberId === staffMemberId;
  });

  const slots: string[] = [];

  for (
    let cursor = startWindow;
    cursor < endWindow;
    cursor += bookingSettings.slotIntervalMinutes
  ) {
    const candidateEnd = cursor + totalDuration;

    if (candidateEnd > endWindow) {
      continue;
    }

    if (
      overlapsBreak(
        cursor,
        candidateEnd,
        businessDay.breakStartTime,
        businessDay.breakEndTime,
      ) ||
      overlapsBreak(
        cursor,
        candidateEnd,
        staffDay.breakStartTime,
        staffDay.breakEndTime,
      )
    ) {
      continue;
    }

    const overlapsExistingAppointment = appointmentsForSlotValidation.some(
      (appointment) => {
        const appointmentStart = timeStringToMinutes(appointment.appointmentTime);

        if (appointmentStart === null) {
          return false;
        }

        const appointmentEnd =
          appointmentStart +
          getAppointmentDurationWithBuffer(
            appointment.durationMinutes,
            bookingSettings,
          );

        return intervalsOverlap(
          cursor,
          candidateEnd,
          appointmentStart,
          appointmentEnd,
        );
      },
    );

    if (!overlapsExistingAppointment) {
      slots.push(minutesToTimeString(cursor));
    }
  }

  return slots;
}

export function getScheduleBounds(
  businessHours: BusinessHourRecord[],
  staffWorkingHours: StaffWorkingHourRecord[],
) {
  const openTimes = [
    ...businessHours.map((entry) => timeStringToMinutes(entry.openTime)),
    ...staffWorkingHours.map((entry) => timeStringToMinutes(entry.startTime)),
  ].filter((value): value is number => value !== null);

  const closeTimes = [
    ...businessHours.map((entry) => timeStringToMinutes(entry.closeTime)),
    ...staffWorkingHours.map((entry) => timeStringToMinutes(entry.endTime)),
  ].filter((value): value is number => value !== null);

  return {
    earliest: openTimes.length > 0 ? Math.min(...openTimes) : 8 * 60,
    latest: closeTimes.length > 0 ? Math.max(...closeTimes) : 22 * 60,
  };
}
