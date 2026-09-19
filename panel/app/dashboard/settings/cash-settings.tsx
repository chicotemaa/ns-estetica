"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function CashSettings({
  initialTarget,
}: {
  initialTarget: number;
  staff: { id: string; name: string; rate: number }[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState(String(initialTarget));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="rounded-2xl border bg-white p-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/cash-settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              target: Number(target),
              rates: [],
            }),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error);
          setMessage("Objetivo guardado.");
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "No se pudo guardar.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-xl font-semibold">Objetivo mensual</h2>
      <label className="block">
        Objetivo mensual de cobros ($)
        <input
          className="mt-1 block rounded border p-2"
          type="number"
          min="0"
          step="0.01"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
        />
      </label>
      <p className="text-sm text-slate-600">
        Configurá las horas, porcentajes y frecuencia de pago en{" "}
        <a className="underline" href="/dashboard/employees">
          Equipo
        </a>
        . Revisá cada período en{" "}
        <a className="underline" href="/dashboard/liquidaciones">
          Liquidaciones
        </a>
        .
      </p>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <Button disabled={busy}>
        {busy ? "Guardando…" : "Guardar objetivo"}
      </Button>
    </form>
  );
}
