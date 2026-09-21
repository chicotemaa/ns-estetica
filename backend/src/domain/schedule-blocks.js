"use strict";
const { errors } = require("@strapi/utils");
const { validDate, minutes } = require("./availability");
async function validateBlock(strapi, businessId, candidate, ignoreId) {
  const start = minutes(candidate.start_time),
    end = minutes(candidate.end_time);
  if (
    !validDate(candidate.block_date) ||
    start === null ||
    end === null ||
    start >= end
  )
    throw new errors.ValidationError(
      "Indicá una fecha válida y una hora final posterior a la inicial.",
    );
  const { repository } = require("./repository");
  const repo = repository(strapi, businessId);
  const sameStaff = (id) =>
    !candidate.staff_member_id ||
    !id ||
    String(id) === String(candidate.staff_member_id);
  const overlaps = (from, to) => start < to && end > from;
  const blocks = await repo.records("schedule_blocks", [
    { field: "block_date", operator: "eq", value: candidate.block_date },
  ]);
  if (
    blocks.some(
      (b) =>
        String(b.id) !== String(ignoreId) &&
        sameStaff(b.staff_member_id) &&
        overlaps(minutes(b.start_time), minutes(b.end_time)),
    )
  )
    throw new errors.ValidationError(
      "Ya existe un bloqueo que se superpone con ese período.",
    );
  const appointments = await repo.records("appointments", [
    { field: "appointment_date", operator: "eq", value: candidate.block_date },
  ]);
  const holds = await require("./online-booking").activeHolds(
    strapi,
    businessId,
    candidate.block_date,
  );
  const settings = (await repo.records("booking_settings"))[0];
  const buffer = Number(settings?.buffer_between_appointments_minutes || 0);
  if (
    [...appointments, ...holds].some(
      (a) =>
        ["pending", "confirmed", "completed"].includes(a.status) &&
        sameStaff(a.staff_member_id) &&
        overlaps(
          minutes(a.appointment_time),
          minutes(a.appointment_time) + Number(a.duration_snapshot) + buffer,
        ),
    )
  )
    throw new errors.ValidationError(
      "Ese período tiene turnos. Reprogramalos o cancelalos antes de bloquearlo.",
    );
}
module.exports = { validateBlock };
