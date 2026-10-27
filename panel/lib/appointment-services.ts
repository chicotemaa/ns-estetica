import type { ServiceRecord, AppointmentRecord } from "./business-shared";

type Slot = Pick<AppointmentRecord, "appointmentDate" | "appointmentTime" | "serviceId" | "staffMemberId" | "status">;
export function requiresAvailableSlot(form: Slot, original: AppointmentRecord | null) {
  return form.status !== "cancelled" && (!original ||
    form.appointmentDate !== original.appointmentDate ||
    form.appointmentTime.slice(0, 5) !== original.appointmentTime.slice(0, 5) ||
    form.serviceId !== original.serviceId || form.staffMemberId !== original.staffMemberId);
}

// Missing scheduling settings must remain visible so the administrator can fix
// them. Public booking visibility does not restrict manual appointments.
export function getAppointmentServices(
  services: ServiceRecord[],
  selectedServiceId = "",
) {
  return services.filter(
    (service) => service.isActive || service.id === selectedServiceId,
  );
}

export function hasAppointmentDuration(service: ServiceRecord | null) {
  return Boolean(
    service &&
      Number.isInteger(service.durationMinutes) &&
      service.durationMinutes > 0 &&
      service.durationMinutes <= 1440,
  );
}
