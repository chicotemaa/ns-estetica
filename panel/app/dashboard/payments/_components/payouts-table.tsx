"use client";

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
  getPaymentMethodLabel,
} from "@/lib/business-shared";
import { Eye, Pencil, Trash2 } from "lucide-react";

import type { PayoutRecord } from "@/lib/business-shared";

interface PayoutsTableProps {
  onDelete: (payout: PayoutRecord) => void;
  onEdit: (payout: PayoutRecord) => void;
  onView: (payout: PayoutRecord) => void;
  payouts: PayoutRecord[];
  timeZone: string;
}

export function PayoutsTable({
  onDelete,
  onEdit,
  onView,
  payouts,
  timeZone,
}: PayoutsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table
        mobileLabels={[
          "Fecha",
          "Destinatario",
          "Categoría",
          "Método",
          "Importe",
          "Acciones",
        ]}
        className="min-w-[960px]"
      >
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Destinatario</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead className="w-28 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.map((payout) => (
            <TableRow key={payout.id}>
              <TableCell>
                {formatDisplayDate(payout.payoutDate, timeZone)}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-slate-900">
                    {payout.recipientName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {payout.staffName ?? payout.recipientType}
                  </p>
                </div>
              </TableCell>
              <TableCell>{payout.category}</TableCell>
              <TableCell>{getPaymentMethodLabel(payout.method)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(payout.amount)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Ver detalle"
                    onClick={() => onView(payout)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Editar registro"
                    onClick={() => onEdit(payout)}
                    disabled={payout.payrollManaged}
                    title={
                      payout.payrollManaged
                        ? "Liquidación registrada"
                        : "Editar"
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Eliminar registro"
                    onClick={() => onDelete(payout)}
                    disabled={payout.payrollManaged}
                    title={
                      payout.payrollManaged
                        ? "Liquidación registrada"
                        : "Eliminar"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
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
