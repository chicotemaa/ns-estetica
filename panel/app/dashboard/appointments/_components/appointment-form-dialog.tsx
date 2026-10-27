"use client";
import Link from "next/link";
import { AppointmentZones } from "./appointment-zones";
import { hasAppointmentDuration, requiresAvailableSlot } from "@/lib/appointment-services";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrency,
  formatAppointmentTime,
  getChannelLabel,
  getStatusLabel,
  type AppointmentStatus,
  type AppointmentRecord,
  type BookingChannel,
  type CustomerRecord,
  type ServiceRecord,
  type StaffRecord,
} from "@/lib/business-shared";

import type { AppointmentFormState } from "../appointment-types";

interface AppointmentFormDialogProps {
  appointmentBeingEdited: AppointmentRecord | null;
  availableTimeOptions: string[];
  customers: CustomerRecord[];
  errorMessage: string | null;
  formState: AppointmentFormState;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onUpdateField: <K extends keyof AppointmentFormState>(
    field: K,
    value: AppointmentFormState[K],
  ) => void;
  services: ServiceRecord[];
  staffMembers: StaffRecord[];
}

const ADMIN_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];
const ADMIN_APPOINTMENT_CHANNELS: BookingChannel[] = [
  "manual",
  "website",
  "whatsapp",
  "instagram",
];

export function AppointmentFormDialog({
  appointmentBeingEdited,
  availableTimeOptions,
  customers,
  errorMessage,
  formState,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  onUpdateField,
  services,
  staffMembers,
}: AppointmentFormDialogProps) {
  const selectedService =
    services.find((service) => service.id === formState.serviceId) ?? null;
  const unavailableTime = !!formState.appointmentTime && !availableTimeOptions.includes(formState.appointmentTime);
  const invalidSlot = requiresAvailableSlot(formState, appointmentBeingEdited) && !availableTimeOptions.includes(formState.appointmentTime);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[min(100%,72rem)] max-w-[min(72rem,100%)] overflow-x-hidden overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointmentBeingEdited ? "Editar turno" : "Nuevo turno"}
          </DialogTitle>
          <DialogDescription>
            Elegí el cliente, el servicio y un horario disponible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Datos del cliente
                </p>
                <p className="text-xs text-slate-500">
                  Seleccioná un cliente o cargá sus datos.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Cliente existente</Label>
                <Select
                  value={formState.customerId || "new"}
                  onValueChange={(value) =>
                    onUpdateField("customerId", value === "new" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Elegir cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Cargar nuevo cliente</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.fullName} · {customer.primaryContact}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="appointment-customer-name">Nombre</Label>
                  <Input
                    id="appointment-customer-name"
                    value={formState.customerName}
                    onChange={(event) =>
                      onUpdateField("customerName", event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointment-customer-contact">Contacto</Label>
                  <Input
                    id="appointment-customer-contact"
                    value={formState.customerContact}
                    onChange={(event) =>
                      onUpdateField("customerContact", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appointment-customer-email">Email</Label>
                <Input
                  id="appointment-customer-email"
                  type="email"
                  value={formState.customerEmail}
                  onChange={(event) =>
                    onUpdateField("customerEmail", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Configuración del turno
                </p>
                <p className="text-xs text-slate-500">
                  Los horarios se ajustan al servicio y al profesional.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appointment-service">Servicio</Label>
                <Select
                  value={formState.serviceId}
                  onValueChange={(value) => {
                    onUpdateField("serviceId", value);
                    onUpdateField("zoneSelection", null);
                  }}
                >
                  <SelectTrigger id="appointment-service" className="w-full min-w-0">
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} · {formatCurrency(service.price)}
                        {!hasAppointmentDuration(service) ? " · Falta duración" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedService && hasAppointmentDuration(selectedService) ? (
                  <p className="text-xs text-slate-500">
                    {selectedService.durationMinutes} min ·{" "}
                    {formatCurrency(selectedService.price)}
                  </p>
                ) : null}
                {selectedService && !hasAppointmentDuration(selectedService) ? (
                  <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                    <p>Este servicio todavía no tiene una duración válida. Completala para calcular los horarios disponibles.</p>
                    <Link
                      className="mt-2 inline-block font-semibold underline underline-offset-4"
                      href={`/dashboard/services?edit=${encodeURIComponent(selectedService.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Configurar servicio (nueva pestaña)
                    </Link>
                  </div>
                ) : null}
                {selectedService?.zonePricing && (
                  <AppointmentZones
                    config={selectedService.zonePricing}
                    original={
                      appointmentBeingEdited?.serviceId === selectedService.id
                        ? appointmentBeingEdited.pricingSnapshot
                        : null
                    }
                    value={formState.zoneSelection}
                    onChange={(s) => onUpdateField("zoneSelection", s)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Profesional</Label>
                <Select
                  value={formState.staffMemberId}
                  onValueChange={(value) =>
                    onUpdateField("staffMemberId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar profesional" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffMembers.map((staffMember) => (
                      <SelectItem key={staffMember.id} value={staffMember.id}>
                        {staffMember.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="appointment-date">Fecha</Label>
                  <Input
                    id="appointment-date"
                    type="date"
                    value={formState.appointmentDate}
                    onChange={(event) =>
                      onUpdateField("appointmentDate", event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hora</Label>
                  <Select
                    value={formState.appointmentTime || "none"}
                    onValueChange={(value) =>
                      onUpdateField(
                        "appointmentTime",
                        value === "none" ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar horario" />
                    </SelectTrigger>
                    <SelectContent>
                      {unavailableTime && <SelectItem disabled value={formState.appointmentTime}>{formatAppointmentTime(formState.appointmentTime)} · No disponible</SelectItem>}
                      {availableTimeOptions.length === 0 ? (
                        <SelectItem disabled value="none">
                          Sin horarios disponibles
                        </SelectItem>
                      ) : (
                        availableTimeOptions.map((timeValue) => (
                          <SelectItem key={timeValue} value={timeValue}>
                            {formatAppointmentTime(timeValue)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {unavailableTime && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Conservamos las {formatAppointmentTime(formState.appointmentTime)} que elegiste. Ese horario no está disponible para esta combinación de servicio, profesional y fecha; elegí otro o revisá los bloqueos y horarios de atención.</p>}
              {availableTimeOptions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Horarios disponibles
                  </p>
                  <div className="flex flex-wrap gap-2 overflow-hidden">
                    {availableTimeOptions.slice(0, 8).map((timeValue) => (
                      <Button
                        key={timeValue}
                        className={
                          formState.appointmentTime === timeValue
                            ? "bg-slate-900 text-white hover:bg-slate-800"
                            : ""
                        }
                        onClick={() =>
                          onUpdateField("appointmentTime", timeValue)
                        }
                        size="sm"
                        type="button"
                        variant={
                          formState.appointmentTime === timeValue
                            ? "default"
                            : "outline"
                        }
                      >
                        {formatAppointmentTime(timeValue)}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  No hay horarios disponibles con la combinación actual de
                  servicio, profesional y fecha.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={formState.status}
                    onValueChange={(value) =>
                      onUpdateField("status", value as AppointmentStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_APPOINTMENT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {getStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select
                    value={formState.channel}
                    onValueChange={(value) =>
                      onUpdateField("channel", value as BookingChannel)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_APPOINTMENT_CHANNELS.map((channel) => (
                        <SelectItem key={channel} value={channel}>
                          {getChannelLabel(channel)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="appointment-notes">Notas visibles</Label>
              <Textarea
                id="appointment-notes"
                rows={4}
                value={formState.notes}
                onChange={(event) => onUpdateField("notes", event.target.value)}
              />
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="appointment-internal-notes">Notas internas</Label>
              <Textarea
                id="appointment-internal-notes"
                rows={4}
                value={formState.internalNotes}
                onChange={(event) =>
                  onUpdateField("internalNotes", event.target.value)
                }
              />
            </div>
          </div>

          {formState.status === "cancelled" ? (
            <div className="space-y-2">
              <Label htmlFor="appointment-cancellation-reason">
                Motivo de cancelación
              </Label>
              <Textarea
                id="appointment-cancellation-reason"
                rows={3}
                value={formState.cancellationReason}
                onChange={(event) =>
                  onUpdateField("cancellationReason", event.target.value)
                }
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isSubmitting || !hasAppointmentDuration(selectedService) || invalidSlot} onClick={onSubmit}>
            {appointmentBeingEdited ? "Guardar cambios" : "Crear turno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
