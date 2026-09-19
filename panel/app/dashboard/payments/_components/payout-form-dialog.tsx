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

import type { PaymentOptionStaff, PayoutFormState } from "../payment-types";

interface PayoutFormDialogProps {
  errorMessage: string | null;
  formState: PayoutFormState;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onUpdateField: <K extends keyof PayoutFormState>(
    field: K,
    value: PayoutFormState[K],
  ) => void;
  onUpdateStaffMember: (staffMemberId: string) => void;
  payoutBeingEdited: boolean;
  staffMembers: PaymentOptionStaff[];
}

export function PayoutFormDialog({
  errorMessage,
  formState,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  onUpdateField,
  onUpdateStaffMember,
  payoutBeingEdited,
  staffMembers,
}: PayoutFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {payoutBeingEdited ? "Editar distribución" : "Nueva distribución"}
          </DialogTitle>
          <DialogDescription>
            Registra pagos a profesionales o terceros desde la caja del negocio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payout-date">Fecha</Label>
              <Input
                id="payout-date"
                type="date"
                value={formState.payoutDate}
                onChange={(event) =>
                  onUpdateField("payoutDate", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-amount">Importe</Label>
              <Input
                id="payout-amount"
                inputMode="decimal"
                value={formState.amount}
                onChange={(event) =>
                  onUpdateField("amount", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de destinatario</Label>
              <Select
                value={formState.recipientType}
                onValueChange={(value) => onUpdateField("recipientType", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Profesional</SelectItem>
                  <SelectItem value="supplier">Proveedor</SelectItem>
                  <SelectItem value="partner">Socio</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Profesional asociado</Label>
              <Select
                value={formState.staffMemberId || "none"}
                onValueChange={(value) =>
                  onUpdateStaffMember(value === "none" ? "" : value)
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
              <Label htmlFor="payout-recipient">Destinatario</Label>
              <Input
                id="payout-recipient"
                value={formState.recipientName}
                onChange={(event) =>
                  onUpdateField("recipientName", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-category">Categoría</Label>
              <Input
                id="payout-category"
                value={formState.category}
                onChange={(event) =>
                  onUpdateField("category", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Método</Label>
              <Select
                value={formState.method}
                onValueChange={(value) =>
                  onUpdateField("method", value as PayoutFormState["method"])
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
              <Label htmlFor="payout-source">Origen</Label>
              <Input
                id="payout-source"
                value={formState.source}
                onChange={(event) =>
                  onUpdateField("source", event.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payout-notes">Notas</Label>
            <Textarea
              id="payout-notes"
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
            {payoutBeingEdited ? "Guardar cambios" : "Crear distribución"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
