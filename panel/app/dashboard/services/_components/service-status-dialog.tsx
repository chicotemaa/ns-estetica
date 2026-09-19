"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import type { ServiceSummary } from "../service-types"

interface ServiceStatusDialogProps {
  isSubmitting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  service: ServiceSummary | null
}

export function ServiceStatusDialog({ isSubmitting, onConfirm, onOpenChange, service }: ServiceStatusDialogProps) {
  const nextAction = service?.isActive ? "desactivar" : "activar"

  return (
    <Dialog open={service !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service?.isActive ? "Desactivar servicio" : "Activar servicio"}</DialogTitle>
          <DialogDescription>
            {service
              ? `Se va a ${nextAction} "${service.name}" sin borrarlo del sistema.`
              : "Se va a cambiar el estado del servicio seleccionado."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {service?.isActive
            ? "Mientras esté desactivado, el servicio no debería mostrarse como disponible para nuevas reservas."
            : "Al activarlo, el servicio vuelve a quedar disponible en el catálogo compartido."}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isSubmitting} onClick={onConfirm}>
            {service?.isActive ? "Desactivar" : "Activar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
