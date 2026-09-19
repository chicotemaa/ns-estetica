"use client";

import { ClientHistory } from "./client-history";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDisplayDate,
  getCustomerStatusBadgeClassName,
  getCustomerStatusLabel,
} from "@/lib/business-shared";
import {
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import type { ClientSummary } from "../client-types";
import { getClientInitials } from "../client-utils";

interface ClientDetailDialogProps {
  client: ClientSummary | null;
  onOpenChange: (open: boolean) => void;
  timeZone: string;
}

export function ClientDetailDialog({
  client,
  onOpenChange,
  timeZone,
}: ClientDetailDialogProps) {
  return (
    <Dialog open={client !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ficha del cliente</DialogTitle>
          <DialogDescription>
            Resumen operativo para seguimiento y atención.
          </DialogDescription>
        </DialogHeader>

        {client ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback>
                    {getClientInitials(client.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {client.fullName}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {client.primaryContact}
                  </p>
                </div>
              </div>
              <Badge className={getCustomerStatusBadgeClassName(client.status)}>
                {getCustomerStatusLabel(client.status)}
              </Badge>
            </div>

            <ClientHistory key={client.id} customerId={client.id} timeZone={timeZone} />
            <p className="text-sm">Calificación: {client.rating == null ? "Sin calificar" : `${client.rating.toFixed(1)} / 5`}</p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">Contacto</p>
                      <p>{client.primaryContact}</p>
                      <p>{client.phone ?? "Sin teléfono"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">Canales</p>
                      <p>{client.email ?? "Sin email"}</p>
                      <p>{client.instagramHandle ?? "Sin Instagram"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">Dirección</p>
                      <p>{client.address ?? "Sin dirección"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">
                    Servicios preferidos
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {client.preferredServices.length > 0 ? (
                      client.preferredServices.map((service) => (
                        <Badge key={service} variant="outline">
                          {service}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-slate-500">
                        Todavía no hay preferencias consolidadas.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Notas</p>
                  <p className="mt-2">
                    {client.notes?.trim()
                      ? client.notes
                      : "Sin observaciones todavía."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Alta y marketing</p>
                  <p className="mt-2">
                    Alta: {formatDisplayDate(client.joinedAt, timeZone)}
                  </p>
                  <p>
                    Marketing:{" "}
                    {client.marketingOptIn ? "Habilitado" : "No habilitado"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
