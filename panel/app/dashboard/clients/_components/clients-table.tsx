"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  formatCurrency,
  formatDisplayDate,
  getCustomerStatusBadgeClassName,
  getCustomerStatusLabel,
} from "@/lib/business-shared";
import { Eye, Pencil } from "lucide-react";

import type { ClientSummary } from "../client-types";
import { getClientInitials } from "../client-utils";

interface ClientsTableProps {
  clients: ClientSummary[];
  onEdit: (client: ClientSummary) => void;
  onView: (client: ClientSummary) => void;
  timeZone: string;
}

export function ClientsTable({
  clients,
  onEdit,
  onView,
  timeZone,
}: ClientsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table
        mobileLabels={[
          "Cliente",
          "Contacto",
          "Última visita",
          "Citas",
          "Total gastado",
          "Estado",
          "Acciones",
        ]}
        className="min-w-[920px]"
      >
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Última visita</TableHead>
            <TableHead className="text-right">Citas</TableHead>
            <TableHead className="text-right">Total gastado</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-28 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {getClientInitials(client.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-slate-900">
                      {client.fullName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDisplayDate(client.joinedAt, timeZone)}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-slate-900">
                    {client.primaryContact}
                  </p>
                  <p className="text-sm text-slate-500">
                    {client.email ??
                      client.phone ??
                      client.instagramHandle ??
                      "Sin canal secundario"}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                {formatDisplayDate(client.lastVisitAt, timeZone)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {client.totalAppointments}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(client.totalSpent)}
              </TableCell>
              <TableCell>
                <Badge
                  className={getCustomerStatusBadgeClassName(client.status)}
                >
                  {getCustomerStatusLabel(client.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Ver detalle"
                    onClick={() => onView(client)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Editar registro"
                    onClick={() => onEdit(client)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
