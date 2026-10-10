"use strict";
const crypto = require("node:crypto");
const { localNow, validDate, minutes } = require("./availability");
const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
function configuration(env = process.env) {
  const names = [
    "GOOGLE_CALENDAR_CLIENT_ID",
    "GOOGLE_CALENDAR_CLIENT_SECRET",
    "GOOGLE_CALENDAR_REDIRECT_URI",
    "GOOGLE_CALENDAR_ENCRYPTION_KEY",
  ];
  const missing = names.filter((k) => !env[k]);
  if (
    env.GOOGLE_CALENDAR_ENCRYPTION_KEY &&
    !/^[a-f0-9]{64}$/i.test(env.GOOGLE_CALENDAR_ENCRYPTION_KEY)
  )
    missing.push("GOOGLE_CALENDAR_ENCRYPTION_KEY");
  try {
    const url = new URL(env.GOOGLE_CALENDAR_REDIRECT_URI);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/api/google-calendar/callback" ||
      (url.protocol !== "https:" &&
        !(
          env.NODE_ENV !== "production" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)
        ))
    )
      throw Error();
  } catch {
    missing.push("GOOGLE_CALENDAR_REDIRECT_URI");
  }
  return { ready: !missing.length, missing: [...new Set(missing)] };
}
function seal(value, key = process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY) {
  const iv = crypto.randomBytes(12),
    cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), data]
    .map((b) => b.toString("base64url"))
    .join(".");
}
function unseal(value, key = process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY) {
  const [iv, tag, data] = value
    .split(".")
    .map((v) => Buffer.from(v, "base64url"));
  const cipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    iv,
  );
  cipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8"),
  );
}
function stamp(iso, zone) {
  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime()))
    throw Error("Fecha de Google inválida.");
  const p = localNow(zone, instant);
  return {
    date: p.date,
    time: `${String(Math.floor(p.minutes / 60)).padStart(2, "0")}:${String(p.minutes % 60).padStart(2, "0")}`,
  };
}
function dayAfter(date) {
  return new Date(Date.parse(date + "T12:00:00Z") + 86400000)
    .toISOString()
    .slice(0, 10);
}
function remoteShape(event) {
  return event.status === "cancelled"
    ? { cancelled: true }
    : {
        start: event.start,
        end: event.end,
        recurrence: event.recurrence || null,
      };
}
function movedAppointment(event, zone) {
  if (event.status === "cancelled") return { status: "cancelled" };
  if (
    !event.start?.dateTime ||
    !event.end?.dateTime ||
    event.recurrence ||
    event.recurringEventId
  )
    throw Error(
      "Los turnos deben ser eventos individuales con hora de inicio y fin.",
    );
  const start = stamp(event.start.dateTime, zone),
    end = stamp(event.end.dateTime, zone);
  const duration =
    (Date.parse(event.end.dateTime) - Date.parse(event.start.dateTime)) / 60000;
  if (
    start.date !== end.date ||
    !Number.isInteger(duration) ||
    duration < 1 ||
    duration > 1440 ||
    new Date(event.start.dateTime).getUTCSeconds() ||
    new Date(event.end.dateTime).getUTCSeconds()
  )
    throw Error(
      "El turno debe comenzar y terminar el mismo día, en minutos completos.",
    );
  return {
    appointment_date: start.date,
    appointment_time: start.time,
    duration_snapshot: duration,
  };
}
function localEvent(kind, row, zone) {
  if (kind === "appointment" && (row.deleted_at || row.status === "cancelled"))
    return { cancelled: true };
  const date = kind === "appointment" ? row.appointment_date : row.block_date;
  const start = (
    kind === "appointment" ? row.appointment_time : row.start_time
  ).slice(0, 5);
  const endMinutes =
    kind === "appointment"
      ? minutes(start) + Number(row.duration_snapshot)
      : minutes(row.end_time);
  const endDate = endMinutes >= 1440 ? dayAfter(date) : date;
  const end = `${String(Math.floor((endMinutes % 1440) / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
  return {
    summary:
      kind === "appointment"
        ? `${row.customer_name} · ${row.service_name_snapshot}`
        : `Pausa · ${row.reason || "Bloqueo"}`,
    start: { dateTime: `${date}T${start}:00`, timeZone: zone },
    end: { dateTime: `${endDate}T${end}:00`, timeZone: zone },
    visibility: "private",
    transparency: "opaque",
  };
}
// Personal event names/details are deliberately never stored. Only busy intervals.
function busyBlocks(events, zone, from, to) {
  const result = [];
  for (const e of events) {
    if (
      e.status === "cancelled" ||
      e.transparency === "transparent" ||
      e.attendees?.some((a) => a.self && a.responseStatus === "declined")
    )
      continue;
    const start = e.start?.date
      ? { date: e.start.date, time: "00:00" }
      : e.start?.dateTime
        ? stamp(e.start.dateTime, zone)
        : null;
    const end = e.end?.date
      ? { date: e.end.date, time: "00:00" }
      : e.end?.dateTime
        ? stamp(e.end.dateTime, zone)
        : null;
    if (!start || !end || !validDate(start.date) || !validDate(end.date))
      continue;
    for (
      let date = start.date < from ? from : start.date;
      date <= end.date && date <= to;
      date = dayAfter(date)
    ) {
      const a = date === start.date ? start.time : "00:00",
        b = date === end.date ? end.time : "24:00";
      if (a < b)
        result.push({
          id: `google:${hash(e.id).slice(0, 16)}:${date}`,
          block_date: date,
          start_time: a,
          end_time: b,
          staff_member_id: null,
          reason: "Ocupado en Google Calendar",
          read_only: true,
        });
    }
  }
  return result;
}
module.exports = {
  hash,
  configuration,
  seal,
  unseal,
  stamp,
  remoteShape,
  movedAppointment,
  localEvent,
  busyBlocks,
};
