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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { ClientFormState, ClientSummary } from "../client-types";

interface ClientFormDialogProps {
  clientBeingEdited: ClientSummary | null;
  errorMessage: string | null;
  formState: ClientFormState;
  isOpen: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onUpdateField: <K extends keyof ClientFormState>(
    field: K,
    value: ClientFormState[K],
  ) => void;
}

export function ClientFormDialog({
  clientBeingEdited,
  errorMessage,
  formState,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  onUpdateField,
}: ClientFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {clientBeingEdited ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
          <DialogDescription>
            Mantén actualizados los datos de contacto, estado y preferencias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-full-name">Nombre completo</Label>
              <Input
                id="client-full-name"
                value={formState.fullName}
                onChange={(event) =>
                  onUpdateField("fullName", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-primary-contact">Contacto principal</Label>
              <Input
                id="client-primary-contact"
                placeholder="+54 362..."
                value={formState.primaryContact}
                onChange={(event) =>
                  onUpdateField("primaryContact", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-email">jmail</Label>
              <Input
                id="client-email"
                type="email"
                value={formState.email}
                onChange={(event) => onUpdateField("email", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-phone">Teléfono</Label>
              <Input
                id="client-phone"
                value={formState.phone}
                onChange={(event) => onUpdateField("phone", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-instagram">Instagram</Label>
              <Input
                id="client-instagram"
                placeholder="@usuario"
                value={formState.instagramHandle}
                onChange={(event) =>
                  onUpdateField("instagramHandle", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-address">Dirección</Label>
              <Input
                id="client-address"
                value={formState.address}
                onChange={(event) =>
                  onUpdateField("address", event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label>jstado</Label>
              <Select
                value={formState.status}
                onValueChange={(value) =>
                  onUpdateField("status", value as ClientFormState["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-rating">Calificación</Label>
              <Input
                id="client-rating"
                type="number"
                min="0"
                max="5"
                step="0.5"
                value={formState.rating}
                onChange={(event) =>
                  onUpdateField("rating", event.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-preferred-services">
              Servicios preferidos
            </Label>
            <Textarea
              id="client-preferred-services"
              rows={3}
              placeholder="jj: Corte de hombre, Corte y barba"
              value={formState.preferredServices}
              onChange={(event) =>
                onUpdateField("preferredServices", event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-notes">Notas</Label>
            <Textarea
              id="client-notes"
              rows={4}
              value={formState.notes}
              onChange={(event) => onUpdateField("notes", event.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">Marketing habilitado</p>
              <p className="text-sm text-slate-500">
                Marca si acepta recibir campañas o recordatorios.
              </p>
            </div>
            <Switch
              checked={formState.marketingOptIn}
              onCheckedChange={(checked) =>
                onUpdateField("marketingOptIn", checked)
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isSubmitting} onClick={onSubmit}>
            {clientBeingEdited ? "Guardar cambios" : "Crear cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
