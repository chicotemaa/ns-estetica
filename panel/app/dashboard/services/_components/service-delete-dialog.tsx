"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import type { ServiceSummary } from "../service-types"

interface ServiceDeleteDialogProps {
  isDeleting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  service: ServiceSummary | null
}

export function ServiceDeleteDialog({ isDeleting, onConfirm, onOpenChange, service }: ServiceDeleteDialogProps) {
  return (
    <Dialog open={service !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar servicio</DialogTitle>
          <DialogDescription>
            {service
              ? `Se va a eliminar "${service.name}" del catálogo compartido.`
              : "Se va a eliminar el servicio seleccionado."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          Esta acción no se puede deshacer.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isDeleting} variant="destructive" onClick={onConfirm}>
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
