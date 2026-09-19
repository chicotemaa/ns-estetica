"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, {
  type DateClickArg,
} from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import timeGridPlugin from "@fullcalendar/timegrid";
import esLocale from "@fullcalendar/core/locales/es";
import type { EventInput } from "@fullcalendar/core";

import {
  formatAppointmentTime,
  getStatusLabel,
  type BookingSettingsRecord,
  type BusinessHourRecord,
  type StaffWorkingHourRecord,
} from "@/lib/business-shared";
import {
  getCalendarBoundsForDates,
  getCalendarDayWindow,
  getAppointmentDurationWithBuffer,
  slotIsBlocked,
  timeStringToMinutes,
} from "@/lib/appointment-scheduling";

import type { AgendaViewMode } from "../appointment-types";
import { getWeekDateKeys } from "../appointment-utils";
import { AppointmentsYear } from "./appointments-year";
import {
  isHistoricalEntry,
  getAgendaEventTiming,
  type AgendaEntry,
} from "@/lib/agenda-history";

function mapViewModeToFullCalendarView(viewMode: AgendaViewMode) {
  switch (viewMode) {
    case "day":
      return "timeGridDay";
    case "week":
      return "timeGridWeek";
    case "month":
      return "dayGridMonth";
    case "year":
      return "multiMonthYear";
    default:
      return "timeGridWeek";
  }
}

function formatDateTimeLocal(date: Date) {
  return `${getDateKeyFromDate(date)}T${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}:00`;
}

function buildCalendarEvents(
  appointments: AgendaEntry[],
  bookingSettings: BookingSettingsRecord,
) {
  return [...appointments]
    .sort((left, right) => {
      if (left.appointmentDate !== right.appointmentDate) {
        return left.appointmentDate.localeCompare(right.appointmentDate);
      }

      if (left.appointmentTime !== right.appointmentTime) {
        return left.appointmentTime.localeCompare(right.appointmentTime);
      }

      return left.customerName.localeCompare(right.customerName);
    })
    .map((appointment) => {
      const timing = getAgendaEventTiming(
        appointment,
        bookingSettings.bufferBetweenAppointmentsMinutes,
      );
      const start = `${appointment.appointmentDate}T${appointment.appointmentTime}`;
      const startDate = new Date(start);
      const endDate = new Date(
        startDate.getTime() + timing.durationMinutes * 60000,
      );

      const palette = isHistoricalEntry(appointment)
        ? {
            backgroundColor: "#f1f3f5",
            borderColor: "#9ca5b1",
            textColor: "#334155",
          }
        : appointment.status === "cancelled"
          ? {
              backgroundColor: "#fff1f2",
              borderColor: "#d9949f",
              textColor: "#881337",
            }
          : appointment.status === "completed"
            ? {
                backgroundColor: "#edf5fa",
                borderColor: "#8bacbf",
                textColor: "#0c4a6e",
              }
            : appointment.status === "pending"
              ? {
                  backgroundColor: "#fff8e7",
                  borderColor: "#c9a75a",
                  textColor: "#78350f",
                }
              : {
                  backgroundColor: "#eef6f0",
                  borderColor: "#87ab91",
                  textColor: "#14532d",
                };

      return {
        display: "block",
        startEditable: timing.startEditable,
        durationEditable: timing.durationEditable,
        id: appointment.id,
        title: appointment.customerName,
        start,
        end: formatDateTimeLocal(endDate),
        extendedProps: {
          appointment,
        },
        ...palette,
      } satisfies EventInput;
    });
}

function buildBreakBackgroundEvents(
  dateKeys: string[],
  businessHours: BusinessHourRecord[],
  staffMemberId: string | null,
  staffWorkingHours: StaffWorkingHourRecord[],
) {
  return dateKeys.flatMap((dateKey) => {
    const dayWindow = getCalendarDayWindow({
      businessHours,
      dateKey,
      staffMemberId,
      staffWorkingHours,
    });

    if (!dayWindow.isOpen) {
      return [];
    }

    return dayWindow.blockedRanges.map((blockedRange, index) => ({
      id: `break-${dateKey}-${index}`,
      start: `${dateKey}T${String(Math.floor(blockedRange.startMinutes / 60)).padStart(2, "0")}:${String(blockedRange.startMinutes % 60).padStart(2, "0")}:00`,
      end: `${dateKey}T${String(Math.floor(blockedRange.endMinutes / 60)).padStart(2, "0")}:${String(blockedRange.endMinutes % 60).padStart(2, "0")}:00`,
      display: "background",
      backgroundColor:
        blockedRange.kind === "staff_break" ? "#fef3c7" : "#e2e8f0",
    }));
  });
}

function buildBusinessHours(
  businessHours: BusinessHourRecord[],
  staffMemberId: string | null,
  staffWorkingHours: StaffWorkingHourRecord[],
) {
  return businessHours.flatMap((businessDay) => {
    if (
      !businessDay.isOpen ||
      !businessDay.openTime ||
      !businessDay.closeTime
    ) {
      return [];
    }

    if (!staffMemberId) {
      return [
        {
          daysOfWeek: [businessDay.dayOfWeek],
          startTime: businessDay.openTime,
          endTime: businessDay.closeTime,
        },
      ];
    }

    const staffDay = staffWorkingHours.find(
      (workingHour) =>
        workingHour.staffMemberId === staffMemberId &&
        workingHour.dayOfWeek === businessDay.dayOfWeek &&
        workingHour.isActive &&
        workingHour.startTime &&
        workingHour.endTime,
    );

    if (!staffDay || !staffDay.startTime || !staffDay.endTime) {
      return [];
    }

    const businessStart = timeStringToMinutes(businessDay.openTime);
    const businessEnd = timeStringToMinutes(businessDay.closeTime);
    const staffStart = timeStringToMinutes(staffDay.startTime);
    const staffEnd = timeStringToMinutes(staffDay.endTime);

    if (
      businessStart === null ||
      businessEnd === null ||
      staffStart === null ||
      staffEnd === null
    ) {
      return [];
    }

    const openMinutes = Math.max(businessStart, staffStart);
    const closeMinutes = Math.min(businessEnd, staffEnd);

    if (openMinutes >= closeMinutes) {
      return [];
    }

    return [
      {
        daysOfWeek: [businessDay.dayOfWeek],
        startTime: `${String(Math.floor(openMinutes / 60)).padStart(2, "0")}:${String(openMinutes % 60).padStart(2, "0")}:00`,
        endTime: `${String(Math.floor(closeMinutes / 60)).padStart(2, "0")}:${String(closeMinutes % 60).padStart(2, "0")}:00`,
      },
    ];
  });
}

function getDateKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTimeValueFromDate(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

interface AppointmentsCalendarProps {
  appointments: AgendaEntry[];
  bookingSettings: BookingSettingsRecord;
  businessHours: BusinessHourRecord[];
  focusDateKey: string;
  onDateClick: (dateKey: string, time?: string) => void;
  onOpenDay: (dateKey: string) => void;
  onOpenMonth: (dateKey: string) => void;
  onEventClick: (appointmentId: string, dateKey: string) => void;
  onEventDrop: (
    appointmentId: string,
    nextDateKey: string,
    nextTime: string,
    revert: () => void,
  ) => void;
  onVisibleDateChange: (dateKey: string) => void;
  selectedAppointmentId: string | null;
  selectedStaffId: string | null;
  staffWorkingHours: StaffWorkingHourRecord[];
  viewMode: AgendaViewMode;
}

export function AppointmentsCalendar({
  appointments,
  bookingSettings,
  businessHours,
  focusDateKey,
  onDateClick,
  onOpenDay,
  onOpenMonth,
  onEventClick,
  onEventDrop,
  onVisibleDateChange,
  selectedAppointmentId,
  selectedStaffId,
  staffWorkingHours,
  viewMode,
}: AppointmentsCalendarProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [compactMonth, setCompactMonth] = useState(false);
  const summaryOnly =
    viewMode === "year" || (viewMode === "month" && compactMonth);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setCompactMonth(entry.contentRect.width < 560),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const fullCalendarView = mapViewModeToFullCalendarView(viewMode);

  useEffect(() => {
    const api = calendarRef.current?.getApi();

    if (!api) {
      return;
    }

    if (api.view.type !== fullCalendarView) {
      api.changeView(fullCalendarView);
    }

    if (api.getDate().toISOString().slice(0, 10) !== focusDateKey) {
      api.gotoDate(focusDateKey);
    }
  }, [focusDateKey, fullCalendarView]);

  const weekDateKeys = useMemo(
    () => getWeekDateKeys(focusDateKey),
    [focusDateKey],
  );

  const visibleDateKeys = useMemo(
    () =>
      viewMode === "day"
        ? [focusDateKey]
        : viewMode === "week"
          ? weekDateKeys
          : [],
    [focusDateKey, viewMode, weekDateKeys],
  );

  const calendarBounds = useMemo(
    () =>
      visibleDateKeys.length > 0
        ? getCalendarBoundsForDates({
            businessHours,
            dateKeys: visibleDateKeys,
            staffMemberId: selectedStaffId,
            staffWorkingHours,
          })
        : { earliest: 8 * 60, latest: 22 * 60, dayWindows: [] },
    [businessHours, selectedStaffId, staffWorkingHours, visibleDateKeys],
  );

  const events = useMemo(
    () => buildCalendarEvents(appointments, bookingSettings),
    [appointments, bookingSettings],
  );
  // Past work can predate today's opening hours or fall on a now-closed day.
  // Include every visible event in the time axis instead of clipping it.
  const displayBounds = useMemo(
    () =>
      appointments.reduce(
        (bounds, entry) => {
          const start = timeStringToMinutes(entry.appointmentTime);
          if (start === null) return bounds;
          const end =
            start +
            getAgendaEventTiming(
              entry,
              bookingSettings.bufferBetweenAppointmentsMinutes,
            ).durationMinutes;
          return {
            earliest: Math.min(bounds.earliest, start),
            latest: Math.max(bounds.latest, end),
          };
        },
        { earliest: calendarBounds.earliest, latest: calendarBounds.latest },
      ),
    [appointments, bookingSettings, calendarBounds],
  );
  const breakBackgroundEvents = useMemo(
    () =>
      viewMode === "day" || viewMode === "week"
        ? buildBreakBackgroundEvents(
            visibleDateKeys,
            businessHours,
            selectedStaffId,
            staffWorkingHours,
          )
        : [],
    [
      businessHours,
      selectedStaffId,
      staffWorkingHours,
      viewMode,
      visibleDateKeys,
    ],
  );

  const businessHoursConfig = useMemo(
    () => buildBusinessHours(businessHours, selectedStaffId, staffWorkingHours),
    [businessHours, selectedStaffId, staffWorkingHours],
  );

  function handleDateClick(info: DateClickArg) {
    const dateKey = info.dateStr.slice(0, 10);
    if (info.allDay) {
      onOpenDay(dateKey);
      return;
    }
    const timeValue = info.allDay ? undefined : getTimeValueFromDate(info.date);

    if (timeValue) {
      const slotMinutes = timeStringToMinutes(timeValue);
      const dayWindow = getCalendarDayWindow({
        businessHours,
        dateKey,
        staffMemberId: selectedStaffId,
        staffWorkingHours,
      });

      if (
        slotMinutes === null ||
        !dayWindow.isOpen ||
        dayWindow.openMinutes === null ||
        dayWindow.closeMinutes === null ||
        slotMinutes < dayWindow.openMinutes ||
        slotMinutes >= dayWindow.closeMinutes ||
        slotIsBlocked(
          slotMinutes,
          bookingSettings.slotIntervalMinutes,
          dayWindow.blockedRanges,
        )
      ) {
        return;
      }
    }

    onDateClick(dateKey, timeValue);
  }

  function handleEventClick(info: EventClickArg) {
    info.el.focus({ preventScroll: true });
    const appointmentId = info.event.id;
    const dateKey = info.event.start
      ? getDateKeyFromDate(info.event.start)
      : focusDateKey;
    onEventClick(appointmentId, dateKey);
  }

  function handleEventDrop(info: EventDropArg) {
    const entry = info.event.extendedProps.appointment as
      | AgendaEntry
      | undefined;
    if (!info.event.start || !entry || isHistoricalEntry(entry)) {
      info.revert();
      return;
    }

    onEventDrop(
      info.event.id,
      getDateKeyFromDate(info.event.start),
      getTimeValueFromDate(info.event.start),
      info.revert,
    );
  }

  function handleEventAllow(
    dropInfo: { start: Date | null },
    draggedEvent: {
      extendedProps?: { appointment?: AgendaEntry };
    } | null,
  ) {
    const appointment = draggedEvent?.extendedProps?.appointment;

    if (!appointment || isHistoricalEntry(appointment) || !dropInfo.start) {
      return false;
    }

    const dateKey = getDateKeyFromDate(dropInfo.start);
    const timeValue = getTimeValueFromDate(dropInfo.start);
    const slotMinutes = timeStringToMinutes(timeValue);
    const dayWindow = getCalendarDayWindow({
      businessHours,
      dateKey,
      staffMemberId: appointment.staffMemberId ?? selectedStaffId,
      staffWorkingHours,
    });

    if (
      slotMinutes === null ||
      !dayWindow.isOpen ||
      dayWindow.openMinutes === null ||
      dayWindow.closeMinutes === null ||
      slotMinutes < dayWindow.openMinutes ||
      slotMinutes >= dayWindow.closeMinutes ||
      slotIsBlocked(
        slotMinutes,
        getAppointmentDurationWithBuffer(
          appointment.durationMinutes,
          bookingSettings,
        ),
        dayWindow.blockedRanges,
      )
    ) {
      return false;
    }

    return true;
  }

  return (
    <div
      ref={containerRef}
      className="appointments-calendar"
      data-view={viewMode}
      data-summary={summaryOnly ? "true" : "false"}
    >
      {summaryOnly && (
        <p className="mb-3 text-xs text-slate-500">
          Cada número indica las atenciones del día. Tocá para verlas.
        </p>
      )}
      {viewMode === "week" && (
        <p className="mb-3 text-xs text-slate-500 lg:hidden">
          Deslizá el calendario hacia los costados para ver toda la semana. Tocá
          un turno para gestionarlo.
        </p>
      )}
      {viewMode === "year" ? (
        <AppointmentsYear
          appointments={appointments}
          focusDateKey={focusDateKey}
          onOpenDay={onOpenDay}
          onOpenMonth={onOpenMonth}
        />
      ) : (
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={fullCalendarView}
          initialDate={focusDateKey}
          locale={esLocale}
          headerToolbar={false}
          height="auto"
          editable={
            viewMode === "day" || viewMode === "week" || viewMode === "month"
          }
          selectable={false}
          eventLongPressDelay={600}
          eventInteractive
          eventMinHeight={44}
          eventMaxStack={viewMode === "week" ? 2 : 4}
          eventShortHeight={65}
          slotEventOverlap={false}
          eventStartEditable={true}
          weekends
          slotDuration={`${String(Math.floor(bookingSettings.slotIntervalMinutes / 60)).padStart(2, "0")}:${String(bookingSettings.slotIntervalMinutes % 60).padStart(2, "0")}:00`}
          slotMinTime={`${String(Math.floor(displayBounds.earliest / 60)).padStart(2, "0")}:${String(displayBounds.earliest % 60).padStart(2, "0")}:00`}
          slotMaxTime={`${String(Math.floor(displayBounds.latest / 60)).padStart(2, "0")}:${String(displayBounds.latest % 60).padStart(2, "0")}:00`}
          nowIndicator
          allDaySlot={false}
          expandRows
          dayMaxEvents={summaryOnly ? 0 : viewMode === "month" ? 3 : false}
          moreLinkContent={(arg) =>
            summaryOnly ? `${arg.num}` : `+${arg.num} más`
          }
          moreLinkClick={(arg) => {
            // FullCalendar passes its UTC date marker here, unlike event.start.
            // Local date getters would open the previous day in Argentina.
            onOpenDay(arg.date.toISOString().slice(0, 10));
            return "timeGridDay";
          }}
          moreLinkDidMount={({ el }) => el.setAttribute("role", "button")}
          navLinks
          navLinkDayClick={(date) => onOpenDay(getDateKeyFromDate(date))}
          eventOrder="start,-duration,title"
          eventOrderStrict
          events={[...events, ...breakBackgroundEvents]}
          businessHours={businessHoursConfig}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventDidMount={({ el, event }) => {
            if (event.extendedProps.appointment)
              el.setAttribute("aria-haspopup", "dialog");
          }}
          eventDrop={handleEventDrop}
          eventAllow={handleEventAllow}
          eventOverlap={(stillEvent, movingEvent) => {
            const stillAppointment = stillEvent.extendedProps.appointment as
              | AgendaEntry
              | undefined;
            const movingAppointment = movingEvent?.extendedProps.appointment as
              | AgendaEntry
              | undefined;

            if (
              !stillAppointment ||
              !movingAppointment ||
              isHistoricalEntry(stillAppointment) ||
              isHistoricalEntry(movingAppointment)
            ) {
              return true;
            }

            if (stillAppointment.id === movingAppointment.id) {
              return true;
            }

            if (
              stillAppointment.status === "cancelled" ||
              movingAppointment.status === "cancelled"
            ) {
              return true;
            }

            return (
              stillAppointment.staffMemberId !== movingAppointment.staffMemberId
            );
          }}
          datesSet={(info) => {
            onVisibleDateChange(getDateKeyFromDate(info.view.currentStart));
          }}
          eventClassNames={(arg) =>
            arg.event.id === selectedAppointmentId ? ["is-selected-event"] : []
          }
          eventContent={(contentArg) => {
            const appointment = contentArg.event.extendedProps.appointment as
              | AgendaEntry
              | undefined;

            if (!appointment) {
              return <span>{contentArg.event.title}</span>;
            }

            const label = `${formatAppointmentTime(appointment.appointmentTime)}${isHistoricalEntry(appointment) ? ", hora estimada" : ""} · ${appointment.customerName} · ${appointment.serviceName} · ${appointment.staffName || "Sin profesional"} · ${getStatusLabel(appointment.status)}`;
            return (
              <div className="fc-appointment-event" title={label}>
                <span className="sr-only">Ver detalle: {label}</span>
                <div className="fc-appointment-event__time" aria-hidden="true">
                  {formatAppointmentTime(appointment.appointmentTime)}
                  {isHistoricalEntry(appointment) && (
                    <span aria-hidden="true"> ≈</span>
                  )}
                </div>
                <div className="fc-appointment-event__title" aria-hidden="true">
                  {appointment.customerName}
                </div>
                <div className="fc-appointment-event__meta" aria-hidden="true">
                  {appointment.serviceName}
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
