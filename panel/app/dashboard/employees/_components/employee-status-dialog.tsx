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

import type { EmployeeSummary } from "../employee-types";

interface EmployeeStatusDialogProps {
  employee: EmployeeSummary | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeStatusDialog({
  employee,
  isSubmitting,
  onConfirm,
  onOpenChange,
}: EmployeeStatusDialogProps) {
  const nextIsActive = employee ? !employee.isActive : false;

  return (
    <Dialog open={employee !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {nextIsActive ? "Activar profesional" : "Desactivar profesional"}
          </DialogTitle>
          <DialogDescription>
            {nextIsActive
              ? "El profesional volverá a quedar disponible para agenda interna y, si corresponde, para reservas públicas."
              : "El profesional dejará de mostrarse como activo, pero se conservará su historial de citas y liquidación."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {employee
            ? `Profesional: ${employee.fullName}`
            : "Selecciona un profesional para continuar."}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isSubmitting} onClick={onConfirm}>
            {nextIsActive ? "Activar" : "Desactivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
