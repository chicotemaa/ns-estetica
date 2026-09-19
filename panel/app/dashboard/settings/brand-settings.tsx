"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/dashboard/finance-ui";
import { palettes } from "@/lib/brand";
export function BrandSettings({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [palette, setPalette] = useState(initial.brand_palette || "bronze"),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState(""),
    router = useRouter();
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFeedback("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch("/api/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, brand_palette: palette }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setFeedback(
        "Identidad actualizada. El panel ya usa estos colores; la web los toma al volver a cargarla.",
      );
      router.refresh();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="checkout-card">
      <p className="section-kicker">Una misma identidad</p>
      <h2 className="mt-2 text-xl font-semibold">Diseño y textos de la web</h2>
      <p className="mt-2 text-sm text-slate-500">
        Elegí los colores del negocio y personalizá cómo reciben a tus clientes
        la web y el panel.
      </p>
      <form onSubmit={save} className="mt-6 space-y-5">
        <fieldset disabled={busy}>
          <legend className="mb-3 text-sm font-medium">
            Paleta de colores
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(palettes).map(([value, label]) => (
              <label
                key={value}
                data-palette={value}
                className="brand-palette-option"
                data-selected={palette === value}
              >
                <input
                  type="radio"
                  name="palette"
                  value={value}
                  checked={palette === value}
                  onChange={() => setPalette(value)}
                  className="sr-only"
                />
                <span className="brand-palette-swatch" />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          {[
            { key: "brand_initials", label: "Iniciales del logo", max: 4 },
            { key: "short_name", label: "Nombre corto", max: 60 },
            { key: "hero_headline", label: "Título de portada", max: 180 },
            { key: "hero_copy", label: "Presentación de la portada", max: 600 },
            {
              key: "booking_intro",
              label: "Introducción para pedir turno",
              max: 400,
            },
          ].map((f) => (
            <label
              key={f.key}
              className={
                f.max > 100
                  ? "grid gap-1.5 text-sm sm:col-span-2"
                  : "grid gap-1.5 text-sm"
              }
            >
              {f.label}
              {f.max > 200 ? (
                <textarea
                  className={fieldClass}
                  name={f.key}
                  defaultValue={initial[f.key]}
                  maxLength={f.max}
                  rows={3}
                  required
                />
              ) : (
                <input
                  className={fieldClass}
                  name={f.key}
                  defaultValue={initial[f.key]}
                  maxLength={f.max}
                  required
                />
              )}
            </label>
          ))}
        </fieldset>
        <p aria-live="polite" className="text-sm">
          {feedback}
        </p>
        <Button disabled={busy}>
          {busy ? "Guardando…" : "Guardar identidad"}
        </Button>
      </form>
    </section>
  );
}
