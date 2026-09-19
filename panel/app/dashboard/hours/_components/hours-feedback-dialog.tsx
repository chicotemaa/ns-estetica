"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { HoursFeedbackState } from "../hours-types"

interface HoursFeedbackDialogProps {
  feedback: HoursFeedbackState | null
  onOpenChange: (open: boolean) => void
}

export function HoursFeedbackDialog({ feedback, onOpenChange }: HoursFeedbackDialogProps) {
  const buttonClassName =
    feedback?.tone === "error"
      ? "bg-rose-600 hover:bg-rose-700"
      : feedback?.tone === "warning"
        ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
        : undefined

  return (
    <Dialog open={Boolean(feedback)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{feedback?.title}</DialogTitle>
          <DialogDescription>{feedback?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className={buttonClassName} onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
