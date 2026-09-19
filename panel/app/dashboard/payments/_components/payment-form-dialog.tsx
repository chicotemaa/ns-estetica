"use client";

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

import type {
  PaymentFormState,
  PaymentOptionCustomer,
  PaymentOptionStaff,
} from "../payment-types";

interface PaymentFormDialogProps {
  customers: PaymentOptionCustomer[];
  errorMessage: string | null;
  formState: PaymentFormState;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onUpdateField: <K extends keyof PaymentFormState>(
    field: K,
    value: PaymentFormState[K],
  ) => void;
  paymentBeingEdited: boolean;
  staffMembers: PaymentOptionStaff[];
}

export function PaymentFormDialog({
  customers,
  errorMessage,
  formState,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  onUpdateField,
  paymentBeingEdited,
  staffMembers,
}: PaymentFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {paymentBeingEdited ? "Editar cobro" : "Nuevo cobro"}
          </DialogTitle>
          <DialogDescription>
            Registra un ingreso y relaciónalo con cliente o profesional cuando
            haga falta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="payment-description">Concepto</Label>
              <Input
                id="payment-description"
                value={formState.description}
                onChange={(event) =>
                  onUpdateField("description", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Importe</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                value={formState.amount}
                onChange={(event) =>
                  onUpdateField("amount", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Método</Label>
              <Select
                value={formState.method}
                onValueChange={(value) =>
                  onUpdateField("method", value as PaymentFormState["method"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="mercado_pago">Mercado Pago</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formState.status}
                onValueChange={(value) =>
                  onUpdateField("status", value as PaymentFormState["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                  <SelectItem value="refunded">Reintegrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-processed-at">Fecha y hora</Label>
              <Input
                id="payment-processed-at"
                type="datetime-local"
                value={formState.processedAt}
                onChange={(event) =>
                  onUpdateField("processedAt", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={formState.customerId || "none"}
                onValueChange={(value) =>
                  onUpdateField("customerId", value === "none" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin cliente asociado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente asociado</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Profesional</Label>
              <Select
                value={formState.staffMemberId || "none"}
                onValueChange={(value) =>
                  onUpdateField("staffMemberId", value === "none" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin profesional asociado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin profesional asociado</SelectItem>
                  {staffMembers.map((staffMember) => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {staffMember.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-transaction">ID transacción</Label>
              <Input
                id="payment-transaction"
                value={formState.transactionId}
                onChange={(event) =>
                  onUpdateField("transactionId", event.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Notas</Label>
            <Textarea
              id="payment-notes"
              rows={4}
              value={formState.notes}
              onChange={(event) => onUpdateField("notes", event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isSubmitting} onClick={onSubmit}>
            {paymentBeingEdited ? "Guardar cambios" : "Crear cobro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
