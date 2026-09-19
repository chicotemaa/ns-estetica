import type {
  AppointmentRecord,
  AppointmentStatus,
} from "@/lib/business-shared";
import type { AgendaEntry } from "@/lib/agenda-history";

import type {
  AgendaMetricSummary,
  AgendaRangeMeta,
  AgendaViewMode,
  AppointmentFormState,
} from "./appointment-types";

function padNumber(value: number) {
  return String(value).padStart(2, "0");
}

export function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

export function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(
    date.getDate(),
  )}`;
}

export function addDaysToDateKey(dateKey: string, amount: number) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return formatDateKey(date);
}

export function getStartOfWeekDateKey(dateKey: string) {
  const date = parseDateKey(dateKey);
  const currentDay = date.getDay();
  const distanceFromMonday = currentDay === 0 ? 6 : currentDay - 1;
  return addDaysToDateKey(dateKey, -distanceFromMonday);
}

export function getWeekDateKeys(dateKey: string) {
  const weekStart = getStartOfWeekDateKey(dateKey);
  return Array.from({ length: 7 }, (_, index) =>
    addDaysToDateKey(weekStart, index),
  );
}

export function getMonthStartDateKey(dateKey: string) {
  const date = parseDateKey(dateKey);
  date.setDate(1);
  return formatDateKey(date);
}

export function getMonthEndDateKey(dateKey: string) {
  const date = parseDateKey(getMonthStartDateKey(dateKey));
  date.setMonth(date.getMonth() + 1, 0);
  return formatDateKey(date);
}

export function getMonthGridDays(dateKey: string) {
  const monthStart = getMonthStartDateKey(dateKey);
  const monthEnd = getMonthEndDateKey(dateKey);
  const gridStart = getStartOfWeekDateKey(monthStart);
  const result: Array<{ dateKey: string; inCurrentMonth: boolean }> = [];

  for (let index = 0; index < 42; index += 1) {
    const currentDateKey = addDaysToDateKey(gridStart, index);
    result.push({
      dateKey: currentDateKey,
      inCurrentMonth:
        currentDateKey >= monthStart && currentDateKey <= monthEnd,
    });
  }

  return result;
}

export function getYearMonthDateKeys(dateKey: string) {
  const date = parseDateKey(dateKey);
  const year = date.getFullYear();

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDate = new Date(year, monthIndex, 1, 12, 0, 0);
    return formatDateKey(monthDate);
  });
}

export function navigateAgendaDate(
  dateKey: string,
  viewMode: AgendaViewMode,
  direction: -1 | 1,
) {
  if (viewMode === "day") {
    return addDaysToDateKey(dateKey, direction);
  }

  if (viewMode === "week") {
    return addDaysToDateKey(dateKey, direction * 7);
  }

  if (viewMode === "month") {
    const date = parseDateKey(dateKey);
    date.setMonth(date.getMonth() + direction, 1);
    return formatDateKey(date);
  }

  const date = parseDateKey(dateKey);
  date.setFullYear(date.getFullYear() + direction, 0, 1);
  return formatDateKey(date);
}

export function getAgendaRange(viewMode: AgendaViewMode, focusDateKey: string) {
  if (viewMode === "day") {
    return {
      startDateKey: focusDateKey,
      endDateKey: focusDateKey,
    };
  }

  if (viewMode === "week") {
    const weekDates = getWeekDateKeys(focusDateKey);
    return {
      startDateKey: weekDates[0] ?? focusDateKey,
      endDateKey: weekDates[6] ?? focusDateKey,
    };
  }

  if (viewMode === "month") {
    return {
      startDateKey: getMonthStartDateKey(focusDateKey),
      endDateKey: getMonthEndDateKey(focusDateKey),
    };
  }

  const year = parseDateKey(focusDateKey).getFullYear();
  return {
    startDateKey: `${year}-01-01`,
    endDateKey: `${year}-12-31`,
  };
}

export function getAgendaRangeMeta(
  viewMode: AgendaViewMode,
  focusDateKey: string,
  timeZone: string,
): AgendaRangeMeta {
  const focusDate = parseDateKey(focusDateKey);

  if (viewMode === "day") {
    return {
      title: new Intl.DateTimeFormat("es-AR", {
        dateStyle: "full",
        timeZone,
      }).format(focusDate),
      subtitle: "Vista diaria",
    };
  }

  if (viewMode === "week") {
    const weekDays = getWeekDateKeys(focusDateKey);
    const startDate = parseDateKey(weekDays[0] ?? focusDateKey);
    const endDate = parseDateKey(weekDays[6] ?? focusDateKey);

    return {
      title: `${new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        timeZone,
      }).format(startDate)} al ${new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone,
      }).format(endDate)}`,
      subtitle: "Vista semanal",
    };
  }

  if (viewMode === "month") {
    return {
      title: new Intl.DateTimeFormat("es-AR", {
        month: "long",
        year: "numeric",
        timeZone,
      }).format(focusDate),
      subtitle: "Vista mensual",
    };
  }

  return {
    title: new Intl.DateTimeFormat("es-AR", {
      year: "numeric",
      timeZone,
    }).format(focusDate),
    subtitle: "Vista anual",
  };
}

export function matchesAppointmentFilters(
  appointment: AgendaEntry,
  {
    searchTerm,
    staffFilter,
    statusFilter,
  }: {
    searchTerm: string;
    staffFilter: string;
    statusFilter: "all" | AppointmentStatus;
  },
) {
  const haystack = [
    appointment.customerName,
    appointment.customerContact,
    appointment.customerEmail ?? "",
    appointment.serviceName,
    appointment.staffName ?? "",
    appointment.notes ?? "",
    appointment.internalNotes ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const matchesSearch = haystack.includes(searchTerm.toLowerCase());
  const matchesStaff =
    staffFilter === "all" ||
    (staffFilter === "unassigned"
      ? !appointment.staffMemberId
      : appointment.staffMemberId === staffFilter);
  const matchesStatus =
    statusFilter === "all" || appointment.status === statusFilter;

  return matchesSearch && matchesStaff && matchesStatus;
}

export function sortAppointments<T extends AgendaEntry>(
  appointments: T[],
): T[] {
  return [...appointments].sort((left, right) => {
    if (left.appointmentDate !== right.appointmentDate) {
      return left.appointmentDate.localeCompare(right.appointmentDate);
    }

    if (left.appointmentTime !== right.appointmentTime) {
      return left.appointmentTime.localeCompare(right.appointmentTime);
    }

    return left.customerName.localeCompare(right.customerName);
  });
}

export function filterAppointmentsForAgenda(
  appointments: AgendaEntry[],
  viewMode: AgendaViewMode,
  focusDateKey: string,
  filters: {
    searchTerm: string;
    staffFilter: string;
    statusFilter: "all" | AppointmentStatus;
  },
) {
  const { startDateKey, endDateKey } = getAgendaRange(viewMode, focusDateKey);

  return sortAppointments(
    appointments.filter((appointment) => {
      if (
        appointment.appointmentDate < startDateKey ||
        appointment.appointmentDate > endDateKey
      ) {
        return false;
      }

      return matchesAppointmentFilters(appointment, filters);
    }),
  );
}

export function getAppointmentsForDate(
  appointments: AgendaEntry[],
  dateKey: string,
  filters: {
    searchTerm: string;
    staffFilter: string;
    statusFilter: "all" | AppointmentStatus;
  },
) {
  return sortAppointments(
    appointments.filter(
      (appointment) =>
        appointment.appointmentDate === dateKey &&
        matchesAppointmentFilters(appointment, filters),
    ),
  );
}

export function createAppointmentFormState(options?: {
  appointment?: AppointmentRecord | null;
  dateKey?: string;
  time?: string;
}): AppointmentFormState {
  const appointment = options?.appointment;

  if (appointment) {
    return {
      customerId: appointment.customerId ?? "",
      customerName: appointment.customerName,
      customerContact: appointment.customerContact,
      customerEmail: appointment.customerEmail ?? "",
      serviceId: appointment.serviceId ?? "",
      staffMemberId: appointment.staffMemberId ?? "",
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime.slice(0, 5),
      status: appointment.status,
      channel: appointment.channel,
      notes: appointment.notes ?? "",
      internalNotes: appointment.internalNotes ?? "",
      cancellationReason: appointment.cancellationReason ?? "",
    };
  }

  return {
    customerId: "",
    customerName: "",
    customerContact: "",
    customerEmail: "",
    serviceId: "",
    staffMemberId: "",
    appointmentDate: options?.dateKey ?? "",
    appointmentTime: options?.time ?? "",
    status: "confirmed",
    channel: "manual",
    notes: "",
    internalNotes: "",
    cancellationReason: "",
  };
}

export function getAgendaMetrics(
  appointments: AgendaEntry[],
): AgendaMetricSummary {
  return appointments.reduce<AgendaMetricSummary>(
    (summary, appointment) => {
      summary.total += 1;
      summary[appointment.status] += 1;

      if (
        appointment.status === "confirmed" ||
        appointment.status === "completed"
      ) {
        summary.revenue += appointment.price;
      }

      return summary;
    },
    {
      total: 0,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      revenue: 0,
    },
  );
}

export function formatAgendaDayLabel(dateKey: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(parseDateKey(dateKey));
}

export function formatAgendaShortDay(dateKey: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(parseDateKey(dateKey));
}

export function formatAgendaMonthLabel(dateKey: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone,
  }).format(parseDateKey(dateKey));
}
