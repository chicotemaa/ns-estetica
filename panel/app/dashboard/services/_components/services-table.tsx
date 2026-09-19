"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, getServiceCategoryLabel } from "@/lib/business-shared";
import { Clock3, Eye, EyeOff, Pencil, Scissors, Trash2 } from "lucide-react";

import type { ServiceSummary } from "../service-types";
import { categoryBadgeClassName } from "../service-utils";

interface ServicesTableProps {
  onDelete: (service: ServiceSummary) => void;
  onEdit: (service: ServiceSummary) => void;
  onToggleStatus: (service: ServiceSummary) => void;
  services: ServiceSummary[];
}

export function ServicesTable({
  onDelete,
  onEdit,
  onToggleStatus,
  services,
}: ServicesTableProps) {
  return (
    <Table
      mobileLabels={[
        "Servicio",
        "Categoría",
        "Duración",
        "Precio",
        "Reservas",
        "Estado",
        "Acciones",
      ]}
    >
      <TableHeader>
        <TableRow>
          <TableHead>Servicio</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Duración</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Reservas</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="w-24 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {services.map((service) => (
          <TableRow key={service.id}>
            <TableCell>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-slate-400" />
                  <p className="font-medium text-slate-900">{service.name}</p>
                </div>
                <p className="text-sm text-slate-500">
                  {service.description ?? "Sin descripción"}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <Badge className={categoryBadgeClassName(service.category)}>
                {getServiceCategoryLabel(service.category)}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-slate-700">
                <Clock3 className="h-4 w-4 text-slate-400" />
                {service.durationMinutes
                  ? `${service.durationMinutes} min`
                  : "Por definir"}
              </div>
            </TableCell>
            <TableCell className="font-medium">
              {formatCurrency(service.price)}
            </TableCell>
            <TableCell>{service.bookings}</TableCell>
            <TableCell>
              <Badge
                className={
                  service.isActive
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-slate-100 text-slate-700"
                }
              >
                {service.isActive ? "Activo" : "Oculto"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Editar registro"
                  onClick={() => onEdit(service)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Cambiar estado"
                  onClick={() => onToggleStatus(service)}
                >
                  {service.isActive ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Eliminar registro"
                  onClick={() => onDelete(service)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
