"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
const fields = {
  name: "Nombre",
  description: "Descripción",
  address: "Dirección",
  phone: "Teléfono",
  email: "Email",
  website: "Sitio web",
  cuit: "CUIT",
};
const socialFields = {
  instagram_handle: { label: "Instagram", hint: "Usuario o enlace al perfil del negocio." },
  whatsapp_phone: { label: "WhatsApp", hint: "Número internacional con código de país. En Argentina, +54 9, código de área y número, sin 0 ni 15." },
};
export default function BusinessForm({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const saving = useRef(false);
  const router = useRouter();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      setFeedback({ text: "Datos guardados.", error: false });
      router.refresh();
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "No se pudo guardar.",
        error: true,
      });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="rounded-2xl border bg-white p-6">
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Información del negocio</legend>
        {Object.entries(fields).map(([key, label]) => (
          <label key={key} className="space-y-1" htmlFor={key}>
            <span>{label}</span>
            <input
              id={key}
              name={key}
              type={key === "email" ? "email" : "text"}
              defaultValue={initial[key]}
              required={key === "name"}
              maxLength={key === "description" ? 1000 : 254}
              className="block w-full rounded-lg border p-2"
            />
          </label>
        ))}
      </fieldset>
      <fieldset disabled={busy} className="mt-6 grid gap-4 border-t pt-4 sm:grid-cols-2">
        <legend className="px-1 text-lg font-semibold">Redes y contacto público</legend>
        <p className="text-sm text-slate-600 sm:col-span-2">Instagram y WhatsApp aparecen en el pie de la web. Dejá un campo vacío para ocultarlo. El teléfono y el email del negocio también se muestran cuando están completos.</p>
        {Object.entries(socialFields).map(([key, { label, hint }]) => (
          <label key={key} className="space-y-1" htmlFor={key}>
            <span>{label}</span>
            <input id={key} name={key} type={key === "whatsapp_phone" ? "tel" : "text"} defaultValue={initial[key] ?? ""} maxLength={254} aria-describedby={`${key}-hint`} className="block w-full rounded-lg border p-2" />
            <span id={`${key}-hint`} className="block text-xs leading-5 text-slate-500">{hint}</span>
          </label>
        ))}
      </fieldset>
        <button
          disabled={busy}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
      {feedback ? (
        <p role={feedback.error ? "alert" : "status"} className="mt-4">
          {feedback.text}
        </p>
      ) : null}
    </form>
  );
}
