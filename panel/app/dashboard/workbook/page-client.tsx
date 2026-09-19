"use client";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import type { WorkbookData } from "@/lib/workbook-types";
import { CollectWork } from "./collect-work";
const inputClass =
  "block mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900";
export function WorkbookClient({
  data,
  tab,
  month,
  q,
  today,
  startNew = false,
}: {
  data: WorkbookData;
  tab: string;
  month: string;
  q: string;
  today: string;
  startNew?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(startNew),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [priceEdit, setPriceEdit] = useState<{
    id: string;
    name: string;
    price: string;
  } | null>(null);
  const active = data.services.filter((s) => s.is_active);
  const initial = {
    date: today,
    customerName: "",
    serviceId: active[0]?.id || "",
    variantId:
      data.variants.find((v) => v.service_id === active[0]?.id && v.is_default)
        ?.id || "",
    staffId: data.staff.find((s) => s.is_active)?.id || "",
    amount: String(active[0]?.price || 0),
    paid: String(active[0]?.price || 0),
    method: "cash",
    notes: "",
  };
  const [form, setForm] = useState(initial);
  const sending = useRef(false),
    attempt = useRef<{ key: string; body: string } | null>(null);
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("pending-work");
      if (saved) {
        attempt.current = JSON.parse(saved);
        const body = JSON.parse(attempt.current!.body);
        setForm({
          ...body,
          amount: String(body.amount),
          paid: String(body.paid),
        });
        setOpen(true);
        setError(
          "Hay un intento por confirmar. Reintentá con los mismos datos para verificarlo.",
        );
      }
    } catch {
      /* browser storage is optional */
    }
  }, []);
  const basePath =
    tab === "prices" ? "/dashboard/services/prices" : "/dashboard/atenciones";
  const query = (overrides: Record<string, string> = {}) =>
    new URLSearchParams({
      tab,
      month,
      q,
      page: String(data.page),
      ...overrides,
    }).toString();
  async function saveWork(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    const body = JSON.stringify({
      ...form,
      amount: Number(form.amount),
      paid: Number(form.paid),
    });
    if (attempt.current && attempt.current.body !== body) {
      setError("Reintentá primero la atención anterior con los mismos datos.");
      sending.current = false;
      setBusy(false);
      return;
    }
    attempt.current ||= { key: crypto.randomUUID(), body };
    try {
      try {
        sessionStorage.setItem("pending-work", JSON.stringify(attempt.current));
      } catch {}
      const response = await fetch("/api/workbook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.current.key,
        },
        body: attempt.current.body,
      });
      const result = await response.json();
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        attempt.current = null;
        try {
          sessionStorage.removeItem("pending-work");
        } catch {}
      }
      if (!response.ok) throw new Error(result.error);
      attempt.current = null;
      setOpen(false);
      setForm(initial);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo confirmar la atención. Reintentá con los mismos datos.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  async function savePrice(event: React.FormEvent) {
    event.preventDefault();
    if (!priceEdit || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/workbook", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: priceEdit.id,
          price: Number(priceEdit.price),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPriceEdit(null);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo guardar el precio.",
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {tab === "prices" ? "Catálogo de servicios" : "Gestión del negocio"}
          </p>
          <h1 className="text-3xl font-semibold">
            {tab === "prices" ? "Precios y variantes" : "Atenciones realizadas"}
          </h1>
          <p className="mt-2 text-slate-600">
            {tab === "prices"
              ? "Actualizá los precios según el servicio y la opción elegida."
              : "Consultá los trabajos realizados y registrá las atenciones que no tienen turno."}
          </p>
        </div>
        {tab === "works" ? (
          <Button
            onClick={() => {
              setError("");
              setOpen(true);
            }}
          >
            Registrar atención
          </Button>
        ) : (
          <Link
            className="rounded-lg border px-4 py-2 text-sm"
            href="/dashboard/services"
          >
            Gestionar servicios
          </Link>
        )}
      </header>
      {tab === "works" && (
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            className="rounded-lg border bg-white px-4 py-2"
            href="/dashboard/appointments?new=1"
          >
            Cargar turno
          </Link>
          <Link
            className="rounded-lg border bg-white px-4 py-2"
            href="/dashboard/payments"
          >
            Ver caja y cobros
          </Link>
        </div>
      )}
      <form action={basePath} className="flex flex-wrap items-end gap-3">
        {tab === "works" && (
          <label className="text-sm">
            Mes
            <input
              className={inputClass}
              type="month"
              name="month"
              defaultValue={month}
              key={month}
            />
          </label>
        )}
        <label className="text-sm">
          Buscar
          <input
            className={inputClass}
            name="q"
            defaultValue={q}
            key={q}
            placeholder={
              tab === "prices" ? "Nombre del servicio" : "Cliente o servicio"
            }
          />
        </label>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
        {tab === "works" && (
          <Link
            className="text-sm underline"
            href={basePath + "?" + query({ month: "", page: "1", q: "" })}
          >
            Todo el historial
          </Link>
        )}
      </form>
      <p className="text-sm text-slate-500">
        {data.count} {tab === "works" ? "atenciones" : "servicios"}.{" "}
        {tab === "prices"
          ? "Los cambios de precio se aplican a nuevas atenciones. Definí la duración en Servicios para habilitar las reservas."
          : "El importe de cada trabajo se conserva aunque cambien los precios del catálogo."}
      </p>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <Table
          mobileLabels={
            tab === "works"
              ? [
                  "Fecha",
                  "Cliente",
                  "Servicio",
                  "Profesional",
                  "Importe",
                  "Cobro",
                ]
              : ["Servicio", "Variante", "Precio", "Reservas", "Acciones"]
          }
          className="w-full min-w-[680px] text-sm"
        >
          <TableHeader className="bg-slate-50 text-left">
            <TableRow>
              {(tab === "works"
                ? [
                    "Fecha",
                    "Cliente",
                    "Servicio",
                    "Profesional",
                    "Importe",
                    "Cobro",
                  ]
                : ["Servicio", "Variante", "Precio", "Reservas", ""]
              ).map((name, i) => (
                <TableHead className="p-3" key={name || i}>
                  {name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tab === "works" &&
              data.rows.map((row) => (
                <TableRow className="border-t" key={String(row.id)}>
                  {[
                    row.work_date,
                    row.customer_name,
                    row.service_name,
                    row.staff_name || "Sin asignar",
                    formatCurrency(Number(row.amount)),
                  ].map((value, i) => (
                    <TableCell className="p-3 align-top" key={i}>
                      {String(value ?? "")}
                    </TableCell>
                  ))}
                  <TableCell className="p-3 align-top">
                    <CollectWork row={row} today={today} />
                    <Button asChild variant="ghost" size="sm" className="mt-2">
                      <Link
                        href={`/dashboard/appointments?work=${encodeURIComponent(String(row.id))}`}
                      >
                        Ver en agenda
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            {tab === "prices" &&
              data.rows.flatMap((row) =>
                data.variants
                  .filter((v) => v.service_id === row.id && v.is_active)
                  .map((variant) => (
                    <TableRow className="border-t" key={variant.id}>
                      <TableCell className="p-3">{String(row.name)}</TableCell>
                      <TableCell className="p-3">
                        {variant.variant_name}
                      </TableCell>
                      <TableCell className="p-3">
                        {formatCurrency(Number(variant.price))}
                      </TableCell>
                      <TableCell className="p-3">
                        {row.booking_enabled && row.duration_minutes
                          ? "Habilitadas"
                          : "Sin habilitar"}
                      </TableCell>
                      <TableCell className="p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setError("");
                            setPriceEdit({
                              id: variant.id,
                              name:
                                String(row.name) + " · " + variant.variant_name,
                              price: String(variant.price),
                            });
                          }}
                        >
                          Editar precio
                        </Button>
                      </TableCell>
                    </TableRow>
                  )),
              )}
            {!data.rows.length && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="p-8 text-center text-slate-500"
                >
                  No hay registros para esta búsqueda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <Link
          className={
            "text-sm underline " +
            (data.page <= 1 ? "pointer-events-none opacity-40" : "")
          }
          aria-disabled={data.page <= 1}
          href={
            basePath + "?" + query({ page: String(Math.max(1, data.page - 1)) })
          }
        >
          Anterior
        </Link>
        <span className="text-sm">
          Página {data.page} de {Math.max(1, Math.ceil(data.count / 50))}
        </span>
        <Link
          className={
            "text-sm underline " +
            (data.page * 50 >= data.count
              ? "pointer-events-none opacity-40"
              : "")
          }
          aria-disabled={data.page * 50 >= data.count}
          href={basePath + "?" + query({ page: String(data.page + 1) })}
        >
          Siguiente
        </Link>
      </div>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar atención realizada</DialogTitle>
            <DialogDescription>
              Para trabajos realizados sin reserva. La fecha se aplica a la
              atención y al cobro que registrás aquí.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveWork} className="space-y-3">
            <fieldset disabled={busy} className="space-y-3">
              <label className="block text-sm">
                Fecha
                <input
                  className={inputClass}
                  type="date"
                  value={form.date}
                  max={today}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </label>
              <label className="block text-sm">
                Cliente
                <input
                  className={inputClass}
                  value={form.customerName}
                  onChange={(e) =>
                    setForm({ ...form, customerName: e.target.value })
                  }
                  minLength={2}
                  maxLength={160}
                  required
                />
              </label>
              <label className="block text-sm">
                Servicio
                <select
                  className={inputClass}
                  value={form.serviceId}
                  onChange={(e) => {
                    const s = active.find((s) => s.id === e.target.value);
                    setForm({
                      ...form,
                      serviceId: e.target.value,
                      variantId:
                        data.variants.find(
                          (v) =>
                            v.service_id === e.target.value && v.is_default,
                        )?.id || "",
                      amount: String(s?.price || 0),
                      paid: String(s?.price || 0),
                    });
                  }}
                >
                  {active.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Variante de precio
                <select
                  className={inputClass}
                  value={form.variantId}
                  onChange={(e) => {
                    const v = data.variants.find(
                      (v) => v.id === e.target.value,
                    );
                    if (v)
                      setForm({
                        ...form,
                        variantId: v.id,
                        amount: String(v.price),
                        paid: String(v.price),
                      });
                    else setForm({ ...form, variantId: "" });
                  }}
                >
                  <option value="">Importe personalizado</option>
                  {data.variants
                    .filter(
                      (v) => v.service_id === form.serviceId && v.is_active,
                    )
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.variant_name} · {formatCurrency(Number(v.price))}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block text-sm">
                Profesional
                <select
                  className={inputClass}
                  value={form.staffId}
                  onChange={(e) =>
                    setForm({ ...form, staffId: e.target.value })
                  }
                >
                  {data.staff
                    .filter((s) => s.is_active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Importe de la atención
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="text-sm">
                  Importe cobrado
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    max={form.amount}
                    value={form.paid}
                    onChange={(e) => setForm({ ...form, paid: e.target.value })}
                    required
                  />
                </label>
              </div>
              <label className="block text-sm">
                Medio de pago
                <select
                  className={inputClass}
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label className="block text-sm">
                Notas
                <textarea
                  className={inputClass}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  maxLength={2000}
                />
              </label>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
            <Button disabled={busy || !active.length}>
              {busy ? "Guardando…" : "Guardar atención y cobro"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!priceEdit}
        onOpenChange={(value) => {
          if (!value && !busy) setPriceEdit(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar precio</DialogTitle>
            <DialogDescription>
              {priceEdit?.name}. Los trabajos anteriores conservan su importe.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={savePrice}>
            <label className="block text-sm">
              Precio nuevo
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={priceEdit?.price || ""}
                onChange={(e) =>
                  setPriceEdit((p) =>
                    p ? { ...p, price: e.target.value } : null,
                  )
                }
                required
              />
            </label>
            {error && (
              <p role="alert" className="text-rose-700">
                {error}
              </p>
            )}
            <Button disabled={busy}>
              {busy ? "Guardando…" : "Guardar precio"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
