"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ServiceFormState } from "../service-types";

export function ServiceImagesEditor({
  value,
  onChange,
  onBusy,
}: {
  value: ServiceFormState;
  onChange: <K extends keyof ServiceFormState>(
    key: K,
    value: ServiceFormState[K],
  ) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const preview = (url: string) =>
    url.startsWith("/images/")
      ? "https://www.nataliasanchez.com.ar" + url
      : url;
  async function upload(file: File, target: "main" | "gallery") {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("Elegí una imagen JPG, PNG o WebP de hasta 10 MB.");
      return;
    }
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const response = await fetch("/api/website/upload-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          mime: file.type,
        }),
      });
      const ticket = await response.json();
      if (!response.ok)
        throw Error(ticket.error || "No se pudo preparar la carga.");
      const form = new FormData();
      form.append("file", file);
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 120000);
      let result: Response;
      try {
        result = await fetch(ticket.uploadUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${ticket.token}` },
          body: form,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const data = await result.json();
      if (!result.ok || !data.media?.url)
        throw Error(data.error?.message || "No se pudo subir la imagen.");
      if (target === "main") onChange("imageUrl", data.media.url);
      else onChange("gallery", [...value.gallery, data.media.url]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar. Volvé a intentar.",
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <fieldset className="space-y-4 rounded-xl border p-4" disabled={busy}>
      <legend className="px-2 font-semibold">Imágenes de la web</legend>
      <div className="space-y-2">
        <Label htmlFor="service-image-url">
          Imagen principal (dirección HTTPS o imagen subida)
        </Label>
        <Input
          id="service-image-url"
          value={value.imageUrl}
          onChange={(e) => onChange("imageUrl", e.target.value)}
          placeholder="https://..."
        />
        <Label htmlFor="service-image-file">Subir imagen principal</Label>
        <Input
          id="service-image-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file, "main");
            e.target.value = "";
          }}
        />
      </div>
      {value.imageUrl && (
        <img
          src={preview(value.imageUrl)}
          alt="Vista previa del encuadre"
          style={{ objectPosition: value.imagePosition }}
          className="h-48 w-full rounded-lg object-cover"
        />
      )}
      <div className="space-y-2">
        <Label htmlFor="service-image-position">Encuadre de la imagen</Label>
        <select
          id="service-image-position"
          className="w-full rounded-md border p-2"
          value={value.imagePosition}
          onChange={(e) => onChange("imagePosition", e.target.value)}
        >
          {[
            ["50% 50%", "Centro"],
            ["50% 0%", "Arriba"],
            ["50% 100%", "Abajo"],
            ["0% 50%", "Izquierda"],
            ["100% 50%", "Derecha"],
          ].map(([position, label]) => (
            <option key={position} value={position}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.featured}
          onChange={(e) => onChange("featured", e.target.checked)}
        />
        Destacar este tratamiento en la web
      </label>
      <div className="space-y-2">
        <Label htmlFor="service-gallery-file">Galería · hasta 6 imágenes</Label>
        <Input
          id="service-gallery-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={value.gallery.length >= 6}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file, "gallery");
            e.target.value = "";
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {value.gallery.map((url, i) => (
          <div key={`${url}-${i}`}>
            <img
              src={preview(url)}
              alt={`Imagen ${i + 1} de la galería`}
              className="h-24 w-full rounded-lg object-cover"
            />
            <div className="mt-1 flex flex-wrap gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={i === 0}
                aria-label={`Mover imagen ${i + 1} antes`}
                onClick={() => {
                  const next = [...value.gallery];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange("gallery", next);
                }}
              >
                Antes
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={i === value.gallery.length - 1}
                aria-label={`Mover imagen ${i + 1} después`}
                onClick={() => {
                  const next = [...value.gallery];
                  [next[i + 1], next[i]] = [next[i], next[i + 1]];
                  onChange("gallery", next);
                }}
              >
                Después
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={`Quitar imagen ${i + 1} de la galería`}
                onClick={() =>
                  onChange(
                    "gallery",
                    value.gallery.filter((_, index) => index !== i),
                  )
                }
              >
                Quitar
              </Button>
            </div>
          </div>
        ))}
      </div>
      {busy && <p role="status">Subiendo imagen…</p>}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <p className="text-sm text-slate-600">
        Sin imagen propia, la web muestra una imagen ilustrativa según el
        tratamiento. Los cambios se publican al guardar el servicio.
      </p>
    </fieldset>
  );
}
