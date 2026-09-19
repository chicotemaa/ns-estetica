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

import type { MovementFeedbackState } from "../payment-types";

interface MovementFeedbackDialogProps {
  feedback: MovementFeedbackState | null;
  onOpenChange: (open: boolean) => void;
}

export function MovementFeedbackDialog({
  feedback,
  onOpenChange,
}: MovementFeedbackDialogProps) {
  const buttonClassName =
    feedback?.tone === "error" ? "bg-rose-600 hover:bg-rose-700" : undefined;

  return (
    <Dialog open={Boolean(feedback)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{feedback?.title}</DialogTitle>
          <DialogDescription>{feedback?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            className={buttonClassName}
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
