"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/business-shared";
export function CollectWork({
  row,
  today,
}: {
  row: Record<string, unknown>;
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [date, setDate] = useState(today),
    [amount, setAmount] = useState(String(row.balance)),
    [method, setMethod] = useState("cash");
  const attempt = useRef<{ key: string; body: string } | null>(null),
    sending = useRef(false);
  const storageKey = `work-collection-${row.id}`;
  function begin() {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        attempt.current = JSON.parse(saved);
        const body = JSON.parse(attempt.current!.body);
        setDate(body.date);
        setAmount(String(body.amount));
        setMethod(body.method);
      }
    } catch {
      /* form remains usable when browser storage is unavailable */
    }
    setError("");
    setOpen(true);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    const body = JSON.stringify({
      workId: row.id,
      date,
      amount: Number(amount),
      method,
    });
    try {
      if (attempt.current && attempt.current.body !== body)
        throw new Error(
          "Confirmá primero el intento anterior con sus mismos datos.",
        );
      attempt.current ||= { key: crypto.randomUUID(), body };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(attempt.current));
      } catch {
        /* server still prevents a repeated request */
      }
      const response = await fetch("/api/workbook?action=collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.current.key,
        },
        body,
      });
      const result = await response.json();
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        attempt.current = null;
        try {
          sessionStorage.removeItem(storageKey);
        } catch {}
      }
      if (!response.ok)
        throw new Error(result.error || "No se pudo confirmar el cobro.");
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Reintentá con los mismos datos.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  if (row.balance == null)
    return <span className="text-amber-800">Cobro por verificar</span>;
  if (Number(row.balance) <= 0)
    return <span className="text-emerald-800">Saldado</span>;
  return (
    <>
      <p>{formatCurrency(Number(row.balance))} pendiente</p>
      <Button size="sm" variant="outline" onClick={begin}>
        Cobrar saldo
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cobrar atención</DialogTitle>
            <DialogDescription>
              {String(row.customer_name)} · {String(row.service_name)}. Saldo{" "}
              {formatCurrency(Number(row.balance))}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={busy} className="space-y-3">
              <label className="block">
                Fecha del cobro
                <input
                  className="block w-full rounded border p-2"
                  type="date"
                  value={date}
                  min={String(row.work_date)}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                Importe
                <input
                  className="block w-full rounded border p-2"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={String(row.balance)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                Medio de pago
                <select
                  className="block w-full rounded border p-2"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="other">Otro</option>
                </select>
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
            <Button disabled={busy}>
              {busy ? "Confirmando…" : "Registrar cobro"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
