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

import type { MovementRecord } from "../payment-types";

interface MovementDeleteDialogProps {
  isSubmitting: boolean;
  movement: MovementRecord | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function MovementDeleteDialog({
  isSubmitting,
  movement,
  onConfirm,
  onOpenChange,
}: MovementDeleteDialogProps) {
  const label =
    movement?.kind === "payment"
      ? "el cobro"
      : movement?.kind === "expense"
        ? "el gasto"
        : movement?.kind === "payout"
          ? "la distribución"
          : "este movimiento";

  return (
    <Dialog open={movement !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar movimiento</DialogTitle>
          <DialogDescription>
            Esta acción quitará {label} de la caja del negocio.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-rose-600 hover:bg-rose-700"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
