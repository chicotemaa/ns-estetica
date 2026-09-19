"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatCurrency,
  formatDisplayDate,
  getStatusLabel,
  type AppointmentStatus,
} from "@/lib/business-shared";
type History = {
  visits: {
    id: string;
    date: string;
    time: string;
    service: string;
    staff: string | null;
    status: AppointmentStatus;
    amount: number;
    notes: string | null;
  }[];
  payments: {
    id: string;
    date: string | null;
    description: string;
    amount: number;
    status: string;
    appointmentId: string | null;
  }[];
};
export function ClientHistory({
  customerId,
  timeZone,
}: {
  customerId: string;
  timeZone: string;
}) {
  const [data, setData] = useState<History | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    fetch(`/api/customers/${customerId}/history`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (!controller.signal.aborted) setData(body);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(reason.message || "No se pudo cargar el historial.");
      });
    return () => controller.abort();
  }, [customerId, attempt]);
  if (error)
    return (
      <div role="alert">
        {error}{" "}
        <button className="underline" onClick={() => setAttempt((n) => n + 1)}>
          Reintentar
        </button>
      </div>
    );
  if (!data) return <p role="status">Consultando visitas y cobros…</p>;
  const realized = data.visits.filter((v) => v.status === "completed");
  const paid = data.payments.filter((p) => p.status === "completed");
  const total =
    paid.reduce((sum, p) => sum + Math.round(p.amount * 100), 0) / 100;
  const balance =
    realized.reduce(
      (sum, v) =>
        sum +
        Math.max(
          0,
          Math.round(v.amount * 100) -
            paid
              .filter((p) => p.appointmentId === v.id)
              .reduce((n, p) => n + Math.round(p.amount * 100), 0),
        ),
      0,
    ) / 100;
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
        <p>{realized.length} visitas realizadas</p>
        <p>Cobrado: {formatCurrency(total)}</p>
        <p>Saldo de turnos: {formatCurrency(balance)}</p>
        <p>Última visita: {realized[0]?.date || "Sin visitas registradas"}</p>
      </div>
      <Link
        className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-white"
        href={`/dashboard/appointments?customer=${customerId}`}
      >
        Agendar otra visita
      </Link>
      <h3 className="font-semibold">Historial de turnos</h3>
      {!data.visits.length && (
        <p className="text-sm text-slate-500">
          Sin turnos vinculados a este cliente.
        </p>
      )}
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {data.visits.map((v) => (
          <div key={v.id} className="rounded border p-3 text-sm">
            <p>
              {v.date} · {v.time.slice(0, 5)} · {getStatusLabel(v.status)}
            </p>
            <p>
              {v.service} · {v.staff} · {formatCurrency(v.amount)}
            </p>
            {v.notes && (
              <p className="text-slate-600">Nota interna: {v.notes}</p>
            )}
          </div>
        ))}
      </div>
      <h3 className="font-semibold">Cobros registrados</h3>
      {!data.payments.length && (
        <p className="text-sm text-slate-500">
          Sin cobros vinculados a este cliente.
        </p>
      )}
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {data.payments.map((p) => (
          <div key={p.id} className="rounded border p-3 text-sm">
            {p.date
              ? formatDisplayDate(p.date, timeZone)
              : "Sin fecha de cobro"}{" "}
            · {p.description} · {formatCurrency(p.amount)} ·{" "}
            {p.status === "completed"
              ? "Cobrado"
              : p.status === "pending"
                ? "Pendiente"
                : p.status === "refunded"
                  ? "Reintegrado"
                  : "Fallido"}
          </div>
        ))}
      </div>
    </section>
  );
}
