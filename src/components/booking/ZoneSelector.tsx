"use client";
export type ZonePricing = {
  type: "zones";
  zones: { id: string; name: string; price: number }[];
  minimumZones: number;
  discountPercent: number;
  fullBodyPercent: number;
  dates: string[];
  weekdays: number[];
  opens: string;
  closes: string;
  leadMinutes: number;
};
export type ZoneQuote = {
  lines: { id: string; name: string; price: number }[];
  zoneCount: number;
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  totalCents: number;
  durationMinutes: number | null;
};
export const money = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(n);
export function QuoteSummary({ quote }: { quote: ZoneQuote }) {
  return (
    <dl className="zone-total" aria-live="polite">
      <div>
        <dt>Subtotal · {quote.zoneCount} zonas</dt>
        <dd>{money(quote.subtotalCents / 100)}</dd>
      </div>
      <div>
        <dt>Descuento {quote.discountPercent}%</dt>
        <dd>−{money(quote.discountCents / 100)}</dd>
      </div>
      <div className="zone-grand-total">
        <dt>Total por sesión</dt>
        <dd>{money(quote.totalCents / 100)}</dd>
      </div>
    </dl>
  );
}
export default function ZoneSelector({
  config,
  ids,
  fullBody,
  onChange,
}: {
  config: ZonePricing;
  ids: string[];
  fullBody: boolean;
  onChange: (ids: string[], full: boolean) => void;
}) {
  return (
    <fieldset className="zone-selector booking-wide">
      <legend>Armá tu sesión de depilación</legend>
      <p>
        Desde {config.minimumZones} zonas: {config.discountPercent}% de
        descuento. Todo el cuerpo: {config.fullBodyPercent}%. Las promociones no
        se acumulan.
      </p>
      <label className="zone-choice zone-package">
        <input
          type="checkbox"
          checked={fullBody}
          onChange={(e) =>
            onChange(
              e.target.checked ? config.zones.map((z) => z.id) : [],
              e.target.checked,
            )
          }
        />
        <span>
          Todo el cuerpo{" "}
          <small>Incluye las {config.zones.length} zonas de la lista</small>
        </span>
        <strong>−{config.fullBodyPercent}%</strong>
      </label>
      <div className="zone-options">
        {config.zones.map((z) => (
          <label key={z.id} className="zone-choice">
            <input
              type="checkbox"
              checked={fullBody || ids.includes(z.id)}
              disabled={fullBody}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...ids, z.id]
                    : ids.filter((id) => id !== z.id),
                  false,
                )
              }
            />
            <span>{z.name}</span>
            <strong>{money(z.price)}</strong>
          </label>
        ))}
      </div>
      <p>
        Reservá hasta {config.leadMinutes / 60} horas antes.{" "}
        {config.dates.length > 0
          ? `Jornadas: ${config.dates.map((d) => d.split("-").reverse().join("/")).join(", ")}. `
          : ""}
        {config.weekdays.length > 0
          ? `Días: ${config.weekdays.map((d) => ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d]).join(", ")}. `
          : ""}
        {config.opens && config.closes
          ? `De ${config.opens} a ${config.closes}.`
          : ""}
      </p>
    </fieldset>
  );
}
