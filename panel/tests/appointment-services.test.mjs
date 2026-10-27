import test from "node:test";
import assert from "node:assert/strict";
import { getAppointmentServices, hasAppointmentDuration, requiresAvailableSlot } from "../lib/appointment-services.ts";

const service = (id, extra = {}) => ({
  id, name: `Servicio ${id}`, description: null, durationMinutes: 45,
  price: 20000, isActive: true, category: null, ...extra,
});

test("manual booking keeps every active service, including missing durations and services hidden online", () => {
  const services = [
    service("facial"),
    service("laser", { durationMinutes: 0, bookingEnabled: false }),
    service("manual", { bookingEnabled: false }),
    service("inactive", { isActive: false }),
  ];
  assert.deepEqual(getAppointmentServices(services).map(s => s.id), ["facial", "laser", "manual"]);
  assert.equal(hasAppointmentDuration(services[1]), false);
  assert.equal(hasAppointmentDuration(services[2]), true);
  assert.equal(getAppointmentServices(services, "inactive").at(-1).id, "inactive");
});

test("do not invent durations or expose slots for invalid scheduling data", () => {
  for (const durationMinutes of [0, -1, null, undefined, NaN, 1.5, 1441]) {
    assert.equal(hasAppointmentDuration(service("laser", { durationMinutes })), false);
  }
  assert.equal(hasAppointmentDuration(null), false);
  assert.equal(hasAppointmentDuration(service("facial", { durationMinutes: 30 })), true);
});

test("new and rescheduled appointments validate availability while unchanged edits and cancellations remain possible", () => {
  const original = { appointmentDate: "2026-10-27", appointmentTime: "10:00:00", serviceId: "fixture", staffMemberId: "fixture", status: "confirmed" };
  const form = { ...original, appointmentTime: "10:00" };
  assert.equal(requiresAvailableSlot(form, null), true);
  assert.equal(requiresAvailableSlot(form, original), false);
  assert.equal(requiresAvailableSlot({ ...form, appointmentTime: "14:00" }, original), true);
  assert.equal(requiresAvailableSlot({ ...form, staffMemberId: "other" }, original), true);
  assert.equal(requiresAvailableSlot({ ...form, status: "cancelled" }, original), false);
});
