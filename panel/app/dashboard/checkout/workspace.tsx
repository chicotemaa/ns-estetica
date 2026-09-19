"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Plus,
  RefreshCw,
  Scissors,
  Trash2,
  Wallet,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  money,
  shortDate,
  fieldClass,
} from "@/components/dashboard/finance-ui";
import { getStatusLabel } from "@/lib/business-shared";
import type { CheckoutSummary, CheckoutPayment } from "@/lib/checkout-types";
const paymentNames: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  mercado_pago: "Mercado Pago",
  other: "Otro",
};
type Split = { method: string; amount: string };
type Pending = {
  method: "POST" | "PATCH";
  input: Record<string, unknown>;
  key: string;
};
function readPending(key: string): Pending | null {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  const value = JSON.parse(raw);
  return value.payload
    ? { method: "POST", input: JSON.parse(value.payload), key: value.key }
    : value;
}
export function CheckoutWorkspace({ initial }: { initial: CheckoutSummary }) {
  const [data, setData] = useState(initial),
    [splits, setSplits] = useState<Split[]>([
      { method: "cash", amount: String(initial.balanceCents / 100) },
    ]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [recover, setRecover] = useState<Pending | null>(null),
    [edit, setEdit] = useState<{
      action: "adjustment" | "method" | "void";
      payment?: CheckoutPayment;
    } | null>(null);
  const saving = useRef(false),
    router = useRouter(),
    a = data.appointment,
    today = new Intl.DateTimeFormat("en-CA", {
      timeZone: data.timeZone,
    }).format(new Date()),
    [complete, setComplete] = useState(
      Boolean(a.started_at || a.status === "completed"),
    );
  const entered = splits.reduce(
      (n, s) => n + Math.round((Number(s.amount) || 0) * 100),
      0,
    ),
    remaining = data.balanceCents - entered,
    storeKey = `checkout:${a.id}`;
  useEffect(() => {
    try {
      setRecover(readPending(storeKey));
    } catch {
      setError("No se pudo leer el intento pendiente del navegador.");
    }
  }, [storeKey]);
  const timestamp = (v: string) =>
    new Intl.DateTimeFormat("es-AR", {
      timeZone: data.timeZone,
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(v));
  async function reload() {
    setError("");
    try {
      const response = await fetch(`/api/checkout?appointmentId=${a.id}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setData(body);
      setSplits([{ method: "cash", amount: String(body.balanceCents / 100) }]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  }
  function prior(): Pending | null {
    return readPending(storeKey);
  }
  async function send(attempt: Pending) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(attempt));
      setRecover(attempt);
      const r = await fetch("/api/checkout", {
        method: attempt.method,
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.key,
        },
        body: JSON.stringify(attempt.input),
      });
      const body = await r.json();
      if (!r.ok) {
        if (r.status >= 400 && r.status < 500) {
          sessionStorage.removeItem(storeKey);
          setRecover(null);
        }
        throw new Error(body.error || "No se pudo guardar.");
      }
      sessionStorage.removeItem(storeKey);
      setRecover(null);
      setData(body);
      setSplits([{ method: "cash", amount: String(body.balanceCents / 100) }]);
      setMessage("Registro guardado. La caja y el saldo están actualizados.");
      router.refresh();
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo confirmar el resultado. Reintentá el registro pendiente.",
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function write(
    method: "POST" | "PATCH",
    input: Record<string, unknown>,
  ) {
    try {
      const pending = prior();
      if (pending) {
        setRecover(pending);
        setError(
          "Hay un intento anterior sin confirmar. Reintentá ese registro antes de continuar.",
        );
        return false;
      }
      return send({ method, input, key: crypto.randomUUID() });
    } catch {
      setError(
        "El navegador no permite conservar el intento. Revisá el almacenamiento de la sesión.",
      );
      return false;
    }
  }
  async function collect(e: FormEvent) {
    e.preventDefault();
    await write("POST", {
      appointmentId: a.id,
      payments: splits.map((s) => ({ method: s.method, amount: s.amount })),
      expectedBalanceCents: data.balanceCents,
      complete: complete && a.appointment_date <= today,
    });
  }
  async function modify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (
      await write("PATCH", {
        appointmentId: a.id,
        action: edit.action,
        ...values,
        expectedTotalCents: data.totalCents,
        expectedPaidCents: data.paidCents,
        ...(edit.payment
          ? { paymentId: edit.payment.id, expectedMethod: edit.payment.method }
          : {}),
      })
    )
      setEdit(null);
  }
  async function advance(step: string) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
        step === "confirm"
          ? `/api/appointments/${a.id}/status`
          : "/api/finance?action=progress",
        {
          method: step === "confirm" ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify(
            step === "confirm"
              ? { status: "confirmed" }
              : { appointmentId: a.id, step },
          ),
        },
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      await reload();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo actualizar el turno.",
      );
    } finally {
      setBusy(false);
    }
  }
  const feedback = (
    <div aria-live="polite" className="space-y-2">
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {recover && !busy && (
        <Button variant="outline" onClick={() => send(recover)}>
          Reintentar registro pendiente
        </Button>
      )}
    </div>
  );
  return (
    <div className="checkout-workspace">
      <header className="checkout-toolbar">
        <div>
          <Link
            className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500"
            href="/dashboard/checkout"
          >
            <ArrowLeft size={14} /> Todos los turnos
          </Link>
          <p className="section-kicker">Recepción y caja · Turno #{a.id}</p>
          <h1 className="page-title">Checkout</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={busy} onClick={reload}>
            <RefreshCw size={15} /> Actualizar
          </Button>
          <Link
            className="brand-button secondary"
            href={`/dashboard/appointments?appointment=${a.id}`}
          >
            Ir a la agenda <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      {!edit && feedback}
      <div className="checkout-grid">
        <aside className="space-y-4">
          <section className="checkout-card">
            <div className="brand-avatar mb-4">
              {a.customer_name.slice(0, 2).toUpperCase()}
            </div>
            <p className="section-kicker">Cliente</p>
            <h2 className="mt-1 text-xl font-semibold">{a.customer_name}</h2>
            <p className="mt-2 break-words text-sm text-slate-500">
              {a.customer_contact || "Sin contacto registrado"}
            </p>
            {a.customer_email && (
              <p className="mt-1 break-all text-xs text-slate-500">
                {a.customer_email}
              </p>
            )}
            {a.notes && (
              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm">
                {a.notes}
              </p>
            )}
          </section>
          <section className="checkout-card">
            <p className="section-kicker">La atención</p>
            <p className="mt-3 font-semibold">
              {shortDate(a.appointment_date)} · {a.appointment_time.slice(0, 5)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {a.staff_name_snapshot || "Sin profesional"} ·{" "}
              {a.duration_snapshot} min
            </p>
            <ol className="checkout-steps mt-6">
              {[
                {
                  label: "Turno confirmado",
                  done: a.status !== "pending" && a.status !== "cancelled",
                },
                { label: "Cliente presente", done: !!a.arrived_at },
                { label: "En atención", done: !!a.started_at },
                {
                  label: "Atención finalizada",
                  done: a.status === "completed",
                },
              ].map((s) => (
                <li key={s.label} data-done={s.done}>
                  <span>
                    {s.done ? (
                      <Check size={12} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  {s.label}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-slate-500">
              Estado: {getStatusLabel(a.status)}
            </p>
            {a.status === "pending" && (
              <Button
                className="mt-4 w-full"
                disabled={busy}
                onClick={() => advance("confirm")}
              >
                Confirmar turno
              </Button>
            )}
            {a.status === "confirmed" && a.appointment_date === today && (
              <Button
                className="mt-4 w-full"
                disabled={busy}
                variant="outline"
                onClick={() =>
                  advance(
                    a.started_at ? "finish" : a.arrived_at ? "start" : "arrive",
                  )
                }
              >
                {a.started_at
                  ? "Finalizar atención"
                  : a.arrived_at
                    ? "Iniciar atención"
                    : "Registrar llegada"}
              </Button>
            )}
          </section>
        </aside>
        <div className="space-y-4">
          <section className="checkout-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Servicio y ajustes</h2>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy || a.status === "cancelled"}
                onClick={() => setEdit({ action: "adjustment" })}
              >
                Ajustar importe
              </Button>
            </div>
            <div className="checkout-service-summary my-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:flex">
              <div className="rounded-2xl bg-slate-100 p-4">
                <Scissors size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.service_name_snapshot}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Clock3 size={12} />
                  {a.duration_snapshot} minutos · {a.staff_name_snapshot}
                </p>
              </div>
              <p className="col-start-2 font-semibold sm:ml-auto">
                {money(data.baseTotalCents)}
              </p>
            </div>
            {data.totalCents !== data.baseTotalCents && (
              <div className="flex justify-between border-t py-3 text-sm">
                <span>Ajustes registrados</span>
                <span>{money(data.totalCents - data.baseTotalCents)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-4 text-lg font-semibold">
              <span>Total del turno</span>
              <span>{money(data.totalCents)}</span>
            </div>
          </section>
          <section className="checkout-card">
            <div className="flex justify-between">
              <h2 className="font-semibold">Historial de cobros</h2>
              <span className="text-xs text-slate-500">
                {data.payments.length} registros
              </span>
            </div>
            {!data.payments.length ? (
              <div className="py-9 text-center">
                <Wallet className="mx-auto text-slate-300" size={28} />
                <p className="mt-3 text-sm text-slate-500">
                  Todavía no se registraron cobros.
                </p>
              </div>
            ) : (
              <div className="mt-4 divide-y">
                {data.payments.map((p) => (
                  <div className="py-4" key={p.id}>
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {paymentNames[p.method]}{" "}
                          <span className="ml-1 text-xs text-slate-400">
                            #{p.id}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {p.date ? timestamp(p.date) : "Fecha no registrada"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={
                            p.status === "voided"
                              ? "font-semibold text-slate-400 line-through"
                              : "font-semibold"
                          }
                        >
                          {money(p.amountCents)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {p.status === "completed"
                            ? "Registrado"
                            : p.status === "voided"
                              ? "Anulado"
                              : p.status}
                        </p>
                      </div>
                    </div>
                    {p.status === "completed" && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          className="text-xs underline"
                          disabled={busy}
                          onClick={() =>
                            setEdit({ action: "method", payment: p })
                          }
                        >
                          Corregir medio
                        </button>
                        {p.canVoid && (
                          <button
                            className="text-xs text-slate-500 underline"
                            disabled={busy}
                            onClick={() =>
                              setEdit({ action: "void", payment: p })
                            }
                          >
                            Anular error de carga
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
          {!!data.events.length && (
            <section className="checkout-card">
              <h2 className="font-semibold">Cambios registrados</h2>
              <div className="mt-4 space-y-4">
                {data.events.map((e) => (
                  <div className="border-l-2 border-slate-200 pl-3" key={e.id}>
                    <p className="text-sm">
                      {e.kind === "adjustment"
                        ? `${money(e.before.totalCents || 0)} → ${money(e.after.totalCents || 0)}`
                        : e.kind === "method"
                          ? `${paymentNames[e.before.method || ""]} → ${paymentNames[e.after.method || ""]}`
                          : "Cobro anulado por error de carga"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{e.reason}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {timestamp(e.date)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside>
          <section className="checkout-card checkout-payment">
            <p className="section-kicker">Resumen de caja</p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Total</span>
                <span>{money(data.totalCents)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Cobrado</span>
                <span>{money(data.paidCents)}</span>
              </div>
            </div>
            <div className="my-5 border-t border-dashed pt-5">
              <p className="text-sm text-slate-500">Saldo pendiente</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight">
                {money(data.balanceCents)}
              </p>
            </div>
            {data.balanceCents === 0 ? (
              <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 size={22} />
                <p className="mt-2 font-medium">Pago completo</p>
                <p className="mt-1 text-xs">
                  La atención está {getStatusLabel(a.status).toLowerCase()}.
                </p>
              </div>
            ) : !["confirmed", "completed"].includes(a.status) ? (
              <p className="rounded-xl bg-slate-100 p-4 text-sm">
                {a.status === "pending"
                  ? "Confirmá el turno para registrar un cobro."
                  : "Este turno está cancelado."}
              </p>
            ) : (
              <form onSubmit={collect} className="space-y-4">
                <fieldset disabled={busy || !!recover} className="space-y-3">
                  <legend className="mb-3 text-sm font-medium">
                    ¿Cómo paga el cliente?
                  </legend>
                  {splits.map((s, i) => (
                    <div key={i} className="payment-split">
                      <label className="min-w-0 flex-1">
                        <span className="payment-field-label">
                          Medio de pago {i + 1}
                        </span>
                        <select
                          className="w-full bg-transparent py-2 text-sm outline-none"
                          value={s.method}
                          onChange={(e) =>
                            setSplits((v) =>
                              v.map((r, j) =>
                                j === i ? { ...r, method: e.target.value } : r,
                              ),
                            )
                          }
                        >
                          {Object.entries(paymentNames).map(
                            ([value, label]) => (
                              <option
                                disabled={splits.some(
                                  (r, j) => j !== i && r.method === value,
                                )}
                                value={value}
                                key={value}
                              >
                                {label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <label className="payment-split-amount">
                        <span className="payment-field-label">
                          Importe {i + 1}
                        </span>
                        <input
                          className="w-full bg-transparent py-2 text-right font-semibold outline-none"
                          inputMode="decimal"
                          type="number"
                          min="0.01"
                          max={data.balanceCents / 100}
                          step="0.01"
                          value={s.amount}
                          onChange={(e) =>
                            setSplits((v) =>
                              v.map((r, j) =>
                                j === i ? { ...r, amount: e.target.value } : r,
                              ),
                            )
                          }
                          required
                        />
                      </label>
                      {splits.length > 1 && (
                        <button
                          type="button"
                          aria-label={`Quitar medio ${i + 1}`}
                          className="payment-split-remove text-slate-500"
                          onClick={() =>
                            setSplits((v) => v.filter((_, j) => j !== i))
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {splits.length < 5 && (
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-xs"
                      onClick={() =>
                        setSplits((v) => [
                          ...v,
                          {
                            method: Object.keys(paymentNames).find(
                              (m) => !v.some((r) => r.method === m),
                            )!,
                            amount:
                              remaining > 0 ? String(remaining / 100) : "",
                          },
                        ])
                      }
                    >
                      <Plus size={14} /> Agregar otro medio de pago
                    </button>
                  )}
                  <div className="flex justify-between pt-2 text-sm font-medium">
                    <span>A cobrar ahora</span>
                    <span>{money(entered)}</span>
                  </div>
                  <p
                    className={
                      remaining < 0
                        ? "text-xs text-red-700"
                        : "text-xs text-slate-500"
                    }
                  >
                    {remaining < 0
                      ? `La suma supera el saldo por ${money(-remaining)}.`
                      : remaining > 0
                        ? `Después de este cobro quedarán ${money(remaining)} pendientes.`
                        : "El turno quedará totalmente pagado."}
                  </p>
                  {a.status !== "completed" && a.appointment_date <= today && (
                    <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                      <input
                        type="checkbox"
                        checked={complete}
                        onChange={(e) => setComplete(e.target.checked)}
                        className="mt-0.5"
                      />
                      Finalizar también la atención
                    </label>
                  )}
                </fieldset>
                <Button
                  className="h-12 w-full rounded-xl"
                  disabled={busy || entered <= 0 || remaining < 0 || !!recover}
                >
                  <Wallet size={17} />
                  {busy ? "Registrando…" : `Registrar ${money(entered)}`}
                </Button>
                <p className="text-center text-[11px] leading-5 text-slate-400">
                  Confirmá los importes efectivamente recibidos. Podés combinar
                  efectivo, transferencia y otros medios.
                </p>
              </form>
            )}
          </section>
        </aside>
      </div>
      <Dialog
        open={!!edit}
        onOpenChange={(open) => {
          if (!open && !busy) setEdit(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {edit?.action === "adjustment"
                ? "Ajustar importe del turno"
                : edit?.action === "method"
                  ? "Corregir medio de pago"
                  : "Anular un error de carga"}
            </DialogTitle>
            <DialogDescription>
              {edit?.action === "void"
                ? "Usá esta opción para un cobro registrado por error. No registra una devolución al cliente. El motivo queda en el historial."
                : "La modificación queda guardada junto al valor anterior y su motivo."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={modify} className="space-y-4">
            {edit?.action === "adjustment" && (
              <label className="grid gap-1 text-sm">
                Nuevo total del turno
                <input
                  name="total"
                  inputMode="decimal"
                  type="number"
                  min={data.paidCents / 100}
                  max="10000000000"
                  step="0.01"
                  className={fieldClass}
                  defaultValue={data.totalCents / 100}
                  required
                />
              </label>
            )}
            {edit?.action === "method" && (
              <label className="grid gap-1 text-sm">
                Medio correcto
                <select
                  name="method"
                  className={fieldClass}
                  defaultValue={edit.payment?.method}
                >
                  {Object.entries(paymentNames).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1 text-sm">
              Motivo
              <textarea
                name="reason"
                className={fieldClass}
                minLength={3}
                maxLength={500}
                required
                placeholder="Ej.: descuento acordado, corrección al cargar…"
              />
            </label>
            {feedback}
            <Button className="w-full" disabled={busy}>
              {busy ? "Guardando…" : "Guardar modificación"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
