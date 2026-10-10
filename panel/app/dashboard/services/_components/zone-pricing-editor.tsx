"use client";
import { useState } from "react";
import type { ZonePricing } from "@/lib/zone-pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function ZonePricingEditor({
  value,
  onChange,
}: {
  value: ZonePricing;
  onChange: (v: ZonePricing) => void;
}) {
  const [date, setDate] = useState("");
  const update = (data: Partial<ZonePricing>) =>
    onChange({ ...value, ...data });
  return (
    <section className="space-y-4 rounded-xl border bg-rose-50/50 p-4">
      <h3 className="text-lg font-semibold">Zonas y promociones automáticas</h3>
      <p className="text-sm">
        Cada zona se selecciona una vez. Todo el cuerpo incluye la lista
        completa y aplica solo el descuento del paquete.
      </p>
      {value.zones.map((z, i) => (
        <div className="grid grid-cols-[1fr_110px] gap-2" key={z.id}>
          <label className="text-sm">
            Zona
            <Input
              aria-label={`Nombre de ${z.name}`}
              value={z.name}
              onChange={(e) =>
                update({
                  zones: value.zones.map((a, j) =>
                    i === j ? { ...a, name: e.target.value } : a,
                  ),
                })
              }
            />
          </label>
          <label className="text-sm">
            Precio ARS
            <Input
              aria-label={`Precio de ${z.name}`}
              type="number"
              min={0}
              step="0.01"
              value={z.price}
              onChange={(e) =>
                update({
                  zones: value.zones.map((a, j) =>
                    i === j ? { ...a, price: Number(e.target.value) } : a,
                  ),
                })
              }
            />
          </label>
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          Desde cuántas zonas
          <Input
            type="number"
            min={1}
            max={50}
            value={value.minimumZones}
            onChange={(e) => update({ minimumZones: Number(e.target.value) })}
          />
        </label>
        <label>
          Descuento por zonas (%)
          <Input
            type="number"
            min={0}
            max={100}
            value={value.discountPercent}
            onChange={(e) =>
              update({ discountPercent: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Todo el cuerpo (%)
          <Input
            type="number"
            min={0}
            max={100}
            value={value.fullBodyPercent}
            onChange={(e) =>
              update({ fullBodyPercent: Number(e.target.value) })
            }
          />
        </label>
      </div>
      <h3 className="text-lg font-semibold">Jornadas de depilación</h3>
      <p className="text-sm">
        Elegí fechas puntuales o un día semanal. La disponibilidad también
        respeta los horarios del local, el profesional y sus bloqueos.
      </p>
      <div className="flex flex-wrap gap-3">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, i) => (
          <label key={day}>
            <input
              type="checkbox"
              checked={value.weekdays.includes(i)}
              onChange={(e) =>
                update({
                  weekdays: e.target.checked
                    ? [...value.weekdays, i]
                    : value.weekdays.filter((d) => d !== i),
                })
              }
            />{" "}
            {day}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label>
          Fecha puntual
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={!date}
          onClick={() => {
            update({ dates: [...new Set([...value.dates, date])].sort() });
            setDate("");
          }}
        >
          Agregar fecha
        </Button>
      </div>
      <ul>
        {value.dates.map((d) => (
          <li key={d} className="flex items-center gap-2">
            {d}
            <Button
              type="button"
              variant="ghost"
              aria-label={`Quitar fecha ${d}`}
              onClick={() =>
                update({ dates: value.dates.filter((x) => x !== d) })
              }
            >
              Quitar
            </Button>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          Desde
          <Input
            type="time"
            value={value.opens}
            onChange={(e) => update({ opens: e.target.value })}
          />
        </label>
        <label>
          Hasta
          <Input
            type="time"
            value={value.closes}
            onChange={(e) => update({ closes: e.target.value })}
          />
        </label>
        <label>
          Cerrar reservas (horas antes)
          <Input
            type="number"
            min={0}
            max={720}
            value={value.leadMinutes / 60}
            onChange={(e) =>
              update({ leadMinutes: Math.round(Number(e.target.value) * 60) })
            }
          />
        </label>
      </div>
      <p className="text-sm font-medium">
        Definí también la duración del turno en el campo de minutos del servicio
        antes de habilitar las reservas.
      </p>
    </section>
  );
}
