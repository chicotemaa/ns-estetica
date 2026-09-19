"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/business-shared";
export const money = (cents: number) => formatCurrency(cents / 100);
export const shortDate = (date: string) => date.split("-").reverse().join("/");
export const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
export function Metric({
  label,
  value,
  help,
}: {
  label: string;
  value: number;
  help?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {money(value)}
      </p>
      {help && <p className="mt-2 text-xs text-slate-500">{help}</p>}
    </div>
  );
}
export function MethodSelect() {
  return (
    <label className="grid gap-1 text-sm">
      Medio de pago
      <select className={fieldClass} name="method" defaultValue="transfer">
        <option value="transfer">Transferencia</option>
        <option value="cash">Efectivo</option>
        <option value="card">Tarjeta</option>
        <option value="mercado_pago">Mercado Pago</option>
        <option value="other">Otro</option>
      </select>
    </label>
  );
}
type Pending = { action: string; input: Record<string, unknown>; key: string };
const storageKey = "pending-finance-write-v1";
export function useFinanceWrite() {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    try {
      const value = sessionStorage.getItem(storageKey);
      if (value) setPending(JSON.parse(value));
    } catch {
      setError(
        "El navegador no permite conservar el intento de pago. Habilitá el almacenamiento de la sesión.",
      );
    }
  }, []);
  async function execute(attempt: Pending) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/finance?action=${attempt.action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.key,
        },
        body: JSON.stringify(attempt.input),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          sessionStorage.removeItem(storageKey);
          setPending(null);
        }
        throw new Error(data.error || "No se pudo guardar.");
      }
      sessionStorage.removeItem(storageKey);
      setPending(null);
      setNotice("Registro guardado.");
      router.refresh();
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo confirmar el resultado.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save(action: string, input: Record<string, unknown>) {
    if (busy) return false;
    try {
      const stored = sessionStorage.getItem(storageKey),
        existing: Pending | null = stored ? JSON.parse(stored) : null;
      if (
        existing &&
        (existing.action !== action ||
          JSON.stringify(existing.input) !== JSON.stringify(input))
      ) {
        setPending(existing);
        setError(
          "Primero reintentá el registro pendiente para confirmar su resultado.",
        );
        return false;
      }
      const attempt = existing || { action, input, key: crypto.randomUUID() };
      sessionStorage.setItem(storageKey, JSON.stringify(attempt));
      setPending(attempt);
      return await execute(attempt);
    } catch {
      setError(
        "No se pudo conservar el intento. Revisá el almacenamiento del navegador.",
      );
      return false;
    }
  }
  return {
    busy,
    save,
    feedback: (
      <div aria-live="polite" className="space-y-2">
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-emerald-800">{notice}</p>}
        {pending && !busy && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <p>Hay un registro cuyo resultado falta confirmar.</p>
            <Button
              className="mt-2"
              variant="outline"
              onClick={() => execute(pending)}
            >
              Reintentar registro pendiente
            </Button>
          </div>
        )}
      </div>
    ),
  };
}
