import type { ServiceRecord } from "./business-shared";

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
