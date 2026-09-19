"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatCurrency,
  formatDisplayDate,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "@/lib/business-shared";

import type { MovementRecord } from "../payment-types";

interface MovementDetailDialogProps {
  movement: MovementRecord | null;
  onOpenChange: (open: boolean) => void;
  timeZone: string;
}

export function MovementDetailDialog({
  movement,
  onOpenChange,
  timeZone,
}: MovementDetailDialogProps) {
  return (
    <Dialog open={movement !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del movimiento</DialogTitle>
          <DialogDescription>
            Vista puntual del registro operativo.
          </DialogDescription>
        </DialogHeader>

        {movement?.kind === "payment" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="space-y-2 pt-6 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Concepto:</span>{" "}
                  {movement.data.description}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Cliente:</span>{" "}
                  {movement.data.customerName ?? "Sin cliente"}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Staff:</span>{" "}
                  {movement.data.staffName ?? "Sin staff"}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Factura:</span>{" "}
                  {movement.data.invoiceNumber ?? "Sin factura"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 pt-6 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Método:</span>{" "}
                  {getPaymentMethodLabel(movement.data.method)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Estado:</span>{" "}
                  {getPaymentStatusLabel(movement.data.status)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Fecha:</span>{" "}
                  {formatDisplayDate(
                    movement.data.collectionDate ?? movement.data.processedAt ?? movement.data.createdAt,
                    timeZone,
                  )}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Importe:</span>{" "}
                  {formatCurrency(movement.data.amount)}
                </p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardContent className="space-y-2 pt-6 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">
                    ID transacción:
                  </span>{" "}
                  {movement.data.transactionId ?? "Sin ID"}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Notas:</span>{" "}
                  {movement.data.notes ?? "Sin notas"}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {movement?.kind === "expense" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="space-y-2 pt-6 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Categoría:</span>{" "}
                  {movement.data.category}
                </p>
                <p>
                  <span className="font-medium text-slate-900">
                    Subcategoría:
                  </span>{" "}
                  {movement.data.subcategory ?? "Sin subtipo"}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Detalle:</span>{" "}
                  {movement.data.description}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Proveedor:</span>{" "}
                  {movement.data.vendorName ?? "Sin proveedor"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 pt-6 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Método:</span>{" "}
                  {getPaymentMethodLabel(movement.data.method)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Fecha:</span>{" "}
                  {formatDisplayDate(movement.data.expenseDate, timeZone)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Importe:</span>{" "}
                  {formatCurrency(movement.data.amount)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Origen:</span>{" "}
                  {movement.data.source}
                </p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardContent className="space-y-2 pt-6 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Notas:</span>{" "}
                  {movement.data.notes ?? "Sin notas"}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {movement?.kind === "payout" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="space-y-2 pt-6 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">
                    Destinatario:
                  </span>{" "}
                  {movement.data.recipientName}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Tipo:</span>{" "}
                  {movement.data.recipientType}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Categoría:</span>{" "}
                  {movement.data.category}
                </p>
                <p>
                  <span className="font-medium text-slate-900">
                    Staff asociado:
                  </span>{" "}
                  {movement.data.staffName ?? "Sin staff"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-2 pt-6 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Método:</span>{" "}
                  {getPaymentMethodLabel(movement.data.method)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Fecha:</span>{" "}
                  {formatDisplayDate(movement.data.payoutDate, timeZone)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Importe:</span>{" "}
                  {formatCurrency(movement.data.amount)}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Origen:</span>{" "}
                  {movement.data.source}
                </p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardContent className="space-y-2 pt-6 text-sm text-slate-700">
                <p>
                  <span className="font-medium text-slate-900">Notas:</span>{" "}
                  {movement.data.notes ?? "Sin notas"}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
