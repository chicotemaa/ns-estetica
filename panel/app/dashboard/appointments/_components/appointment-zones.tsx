"use client";
import {
  estimateZones,
  sameZoneSelection,
  type ZoneQuote,
  type ZonePricing,
  type ZoneSelection,
} from "@/lib/zone-pricing";
const money = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    n / 100,
  );
export function AppointmentZones({
  config,
  value,
  original,
  onChange,
}: {
  original?: ZoneQuote | null;
  config: ZonePricing;
  value?: ZoneSelection | null;
  onChange: (s: ZoneSelection) => void;
}) {
  const selection = value || { zoneIds: [], fullBody: false };
  const preserved =
    original && sameZoneSelection(selection, original.selection);
  const q = preserved ? original : estimateZones(config, selection);
  return (
    <fieldset className="space-y-3 rounded-xl border bg-rose-50 p-4">
      <legend className="font-semibold">Zonas de depilación</legend>
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={selection.fullBody}
          onChange={(e) =>
            onChange({
              zoneIds: e.target.checked ? config.zones.map((z) => z.id) : [],
              fullBody: e.target.checked,
            })
          }
        />
        Todo el cuerpo · {config.fullBodyPercent}%
      </label>
      {config.zones
        .map((current) =>
          preserved
            ? original.lines.find((line) => line.id === current.id) || current
            : current,
        )
        .map((z) => (
          <label className="flex items-center gap-2" key={z.id}>
            <input
              type="checkbox"
              disabled={selection.fullBody}
              checked={selection.fullBody || selection.zoneIds.includes(z.id)}
              onChange={(e) =>
                onChange({
                  fullBody: false,
                  zoneIds: e.target.checked
                    ? [...selection.zoneIds, z.id]
                    : selection.zoneIds.filter((id) => id !== z.id),
                })
              }
            />
            <span className="flex-1">{z.name}</span>
            <strong>{money(Math.round(z.price * 100))}</strong>
          </label>
        ))}
      {preserved && (
        <p className="text-sm">
          Se conserva el precio acordado al reservar. Si cambiás las zonas, se
          aplican los precios actuales.
        </p>
      )}
      <div aria-live="polite" className="border-t pt-3">
        <p>Subtotal: {money(q.subtotalCents)}</p>
        <p>
          Descuento {q.discountPercent}%: −{money(q.discountCents)}
        </p>
        <p className="text-lg font-bold">Total: {money(q.totalCents)}</p>
      </div>
    </fieldset>
  );
}
