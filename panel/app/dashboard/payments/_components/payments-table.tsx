"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  getPaymentStatusBadgeClassName,
  getPaymentStatusLabel,
} from "@/lib/business-shared";
import { Eye, Pencil, Trash2 } from "lucide-react";

import type { PaymentRecord } from "@/lib/business-shared";

interface PaymentsTableProps {
  onDelete: (payment: PaymentRecord) => void;
  onEdit: (payment: PaymentRecord) => void;
  onView: (payment: PaymentRecord) => void;
  payments: PaymentRecord[];
  timeZone: string;
}

export function PaymentsTable({
  onDelete,
  onEdit,
  onView,
  payments,
  timeZone,
}: PaymentsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table
        mobileLabels={[
          "Fecha",
          "Concepto",
          "Cliente",
          "Método",
          "Estado",
          "Importe",
          "Acciones",
        ]}
        className="min-w-[980px]"
      >
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Importe</TableHead>
            <TableHead className="w-28 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell>
                {formatDisplayDate(
                  payment.collectionDate ??
                    payment.processedAt ??
                    payment.createdAt,
                  timeZone,
                )}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-slate-900">
                    {payment.description}
                  </p>
                  <p className="text-sm text-slate-500">
                    {payment.staffName ?? "Sin staff asociado"}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                {payment.customerName ?? "Sin cliente asociado"}
              </TableCell>
              <TableCell>{getPaymentMethodLabel(payment.method)}</TableCell>
              <TableCell>
                <Badge
                  className={getPaymentStatusBadgeClassName(payment.status)}
                >
                  {getPaymentStatusLabel(payment.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(payment.amount)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Ver detalle"
                    onClick={() => onView(payment)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={
                      !!(
                        payment.appointmentId ||
                        payment.workRecordId ||
                        payment.importRef
                      )
                    }
                    title={
                      payment.appointmentId ||
                      payment.workRecordId ||
                      payment.importRef
                        ? "Cobro vinculado: conserva su registro original"
                        : "Editar cobro"
                    }
                    aria-label="Editar registro"
                    onClick={() => onEdit(payment)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={
                      !!(
                        payment.appointmentId ||
                        payment.workRecordId ||
                        payment.importRef
                      )
                    }
                    title={
                      payment.appointmentId ||
                      payment.workRecordId ||
                      payment.importRef
                        ? "Cobro vinculado: conserva su registro original"
                        : "Eliminar cobro"
                    }
                    aria-label="Eliminar registro"
                    onClick={() => onDelete(payment)}
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
