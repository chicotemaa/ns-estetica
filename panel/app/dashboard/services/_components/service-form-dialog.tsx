"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { SERVICE_CATEGORIES } from "@/lib/service-catalog"
import type { ServiceCategory } from "@/lib/business-shared"
import { getServiceCategoryLabel } from "@/lib/business-shared"

import type { ServiceFormState, ServiceSummary } from "../service-types"

interface ServiceFormDialogProps {
  errorMessage: string | null
  formState: ServiceFormState
  isOpen: boolean
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
  onUpdateField: <K extends keyof ServiceFormState>(field: K, value: ServiceFormState[K]) => void
  serviceBeingEdited: ServiceSummary | null
}

export function ServiceFormDialog({
  errorMessage,
  formState,
  isOpen,
  isSubmitting,
  onOpenChange,
  onSubmit,
  onUpdateField,
  serviceBeingEdited,
}: ServiceFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{serviceBeingEdited ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>
            Editá el nombre del trabajo, su descripción, precio y duración. Los cambios se usan en las próximas reservas de la web.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="service-name">Nombre del servicio o trabajo</Label>
            <Input
              id="service-name"
              value={formState.name}
              onChange={(event) => onUpdateField("name", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-description">Descripción</Label>
            <Textarea
              id="service-description"
              rows={4}
              value={formState.description}
              onChange={(event) => onUpdateField("description", event.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formState.bookingEnabled} onChange={event => onUpdateField("bookingEnabled", event.target.checked)} />Habilitar reservas online (requiere duración)</label>
          <p className="text-sm text-slate-500">Cada tratamiento puede durar un tiempo distinto: 30, 40, 45, 60, 90 minutos u otro valor. La agenda reserva ese tiempo. Las variantes con un tiempo propio se editan en Precios y variantes.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="service-price">Precio (ARS)</Label>
              <Input
                id="service-price"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="26000"
                value={formState.price}
                onChange={(event) => onUpdateField("price", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={formState.category}
                onValueChange={(value) => onUpdateField("category", value as ServiceCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {getServiceCategoryLabel(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-duration">Duración (minutos)</Label>
              <Input
                id="service-duration"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="45"
                value={formState.durationMinutes}
                onChange={(event) => onUpdateField("durationMinutes", event.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={isSubmitting} onClick={onSubmit}>
            {serviceBeingEdited ? "Guardar cambios" : "Crear servicio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
