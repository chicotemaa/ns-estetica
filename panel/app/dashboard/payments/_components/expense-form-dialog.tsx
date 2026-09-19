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

import type { ExpenseFormState } from "../payment-types";

interface ExpenseFormDialogProps {
  errorMessage: string | null;
  expenseBeingEdited: boolean;
  formState: ExpenseFormState;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onUpdateField: <K extends keyof ExpenseFormState>(
    field: K,
    value: ExpenseFormState[K],
  ) => void;
}

export function ExpenseFormDialog({
  errorMessage,
  expenseBeingEdited,
  formState,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  onUpdateField,
}: ExpenseFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {expenseBeingEdited ? "Editar gasto" : "Nuevo gasto"}
          </DialogTitle>
          <DialogDescription>
            Registra un egreso operativo, proveedor y categoría.
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
              <Label htmlFor="expense-date">Fecha</Label>
              <Input
                id="expense-date"
                type="date"
                value={formState.expenseDate}
                onChange={(event) =>
                  onUpdateField("expenseDate", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-amount">Importe</Label>
              <Input
                id="expense-amount"
                inputMode="decimal"
                value={formState.amount}
                onChange={(event) =>
                  onUpdateField("amount", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-category">Categoría</Label>
              <Input
                id="expense-category"
                value={formState.category}
                onChange={(event) =>
                  onUpdateField("category", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-subcategory">Subcategoría</Label>
              <Input
                id="expense-subcategory"
                value={formState.subcategory}
                onChange={(event) =>
                  onUpdateField("subcategory", event.target.value)
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="expense-description">Descripción</Label>
              <Input
                id="expense-description"
                value={formState.description}
                onChange={(event) =>
                  onUpdateField("description", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-vendor">Proveedor</Label>
              <Input
                id="expense-vendor"
                value={formState.vendorName}
                onChange={(event) =>
                  onUpdateField("vendorName", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Método</Label>
              <Select
                value={formState.method}
                onValueChange={(value) =>
                  onUpdateField("method", value as ExpenseFormState["method"])
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

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="expense-source">Origen</Label>
              <Input
                id="expense-source"
                value={formState.source}
                onChange={(event) =>
                  onUpdateField("source", event.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-notes">Notas</Label>
            <Textarea
              id="expense-notes"
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
            {expenseBeingEdited ? "Guardar cambios" : "Crear gasto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
