'use strict';

function minutes(value) {
  if (
    typeof value !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(value)
  )
    return null;
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
function localNow(timeZone, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}
const overlap = (start, end, otherStart, otherEnd) =>
  start < otherEnd && end > otherStart;

function availableSlots({
  date,
  service,
  staff,
  hours,
  staffHours,
  assignments,
  appointments,
  settings,
  timeZone,
  ignoreId,
  now = new Date(),
  enforceLead = true,
}) {
  if (!validDate(date) || !service?.is_active || !staff?.is_active) return [];
  const clock = localNow(timeZone, now);
  const daysAhead = Math.round(
    (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${clock.date}T12:00:00Z`)) /
      86400000,
  );
  if (
    enforceLead &&
    (daysAhead < 0 || daysAhead > settings.max_booking_days_in_advance)
  )
    return [];
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const businessDay = hours.find((day) => day.day_of_week === weekday);
  if (!businessDay?.is_open) return [];
  const employeeDays = staffHours.filter(
    (day) => day.staff_member_id === staff.id,
  );
  const employeeDay = employeeDays.length
    ? employeeDays.find((day) => day.day_of_week === weekday)
    : {
        is_active: true,
        start_time: businessDay.open_time,
        end_time: businessDay.close_time,
      };
  if (!employeeDay?.is_active) return [];
  const assigned = assignments.filter(
    (item) => item.staff_member_id === staff.id,
  );
  if (
    assigned.length &&
    !assigned.some((item) => item.service_id === service.id)
  )
    return [];
  const boundaries = [
    businessDay.open_time,
    businessDay.close_time,
    employeeDay.start_time,
    employeeDay.end_time,
  ].map(minutes);
  if (boundaries.some((value) => value === null)) return [];
  const start = Math.max(boundaries[0], boundaries[2]);
  const end = Math.min(boundaries[1], boundaries[3]);
  const duration = Number(service.duration_minutes);
  const interval = Number(settings.slot_interval_minutes);
  const buffer = Number(settings.buffer_between_appointments_minutes);
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isInteger(interval) ||
    interval < 5 ||
    !Number.isFinite(buffer) ||
    buffer < 0
  )
    return [];
  const breaks = [businessDay, employeeDay]
    .map((day) => [minutes(day.break_start_time), minutes(day.break_end_time)])
    .filter(([from, to]) => from !== null && to !== null && to > from);
  const busy = appointments.filter(
    (item) =>
      item.id !== ignoreId &&
      item.staff_member_id === staff.id &&
      item.appointment_date === date &&
      ['pending', 'confirmed', 'completed'].includes(item.status),
  );
  const results = [];
  for (
    let candidate = start;
    candidate + duration <= end;
    candidate += interval
  ) {
    if (
      enforceLead &&
      daysAhead * 1440 + candidate <
        clock.minutes + Number(settings.lead_time_minutes)
    )
      continue;
    if (
      breaks.some(([from, to]) =>
        overlap(candidate, candidate + duration, from, to),
      )
    )
      continue;
    if (
      busy.some((item) => {
        const from = minutes(item.appointment_time);
        return (
          from !== null &&
          overlap(
            candidate,
            candidate + duration + buffer,
            from,
            from + Number(item.duration_snapshot) + buffer,
          )
        );
      })
    )
      continue;
    results.push(
      `${String(Math.floor(candidate / 60)).padStart(2, '0')}:${String(candidate % 60).padStart(2, '0')}`,
    );
  }
  return results;
}
module.exports = { minutes, validDate, localNow, availableSlots };
