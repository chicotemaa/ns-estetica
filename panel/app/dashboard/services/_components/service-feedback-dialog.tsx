"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

import type { ServiceFeedbackState } from "../service-types"

interface ServiceFeedbackDialogProps {
  feedback: ServiceFeedbackState | null
  onOpenChange: (open: boolean) => void
}

export function ServiceFeedbackDialog({ feedback, onOpenChange }: ServiceFeedbackDialogProps) {
  const toneClassName =
    feedback?.tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900"

  return (
    <Dialog open={feedback !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{feedback?.title ?? "Resultado"}</DialogTitle>
          <DialogDescription>{feedback?.description ?? "La operación terminó."}</DialogDescription>
        </DialogHeader>

        <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClassName}`}>
          {feedback?.description ?? "La operación terminó."}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
