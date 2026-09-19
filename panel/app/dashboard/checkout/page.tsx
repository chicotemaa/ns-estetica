import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { getBusinessAgendaBundle } from "@/lib/business-data";
import {
  buildHistoricalAgendaEntries,
  isHistoricalEntry,
} from "@/lib/agenda-history";
import { filterCheckoutEntries } from "@/lib/checkout-list";
import { getCheckout } from "@/lib/checkout-server";
import {
  formatCurrency,
  getStatusLabel,
  getDateKeyInTimeZone,
} from "@/lib/business-shared";
import { CheckoutWorkspace } from "./workspace";
export const dynamic = "force-dynamic";
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ appointment?: string; q?: string; date?: string }>;
}) {
  const params = await searchParams;
  if (params.appointment && /^[1-9]\d*$/.test(params.appointment))
    return (
      <CheckoutWorkspace
        initial={await getCheckout(params.appointment)}
        key={params.appointment}
      />
    );
  const { appointments, business, workRecords, businessHours } =
    await getBusinessAgendaBundle();
  const today = getDateKeyInTimeZone(business.timeZone);
  // Assign reference hours before filtering, so searching never changes a time.
  const rows = filterCheckoutEntries(
    [
      ...appointments,
      ...buildHistoricalAgendaEntries(workRecords, appointments, businessHours),
    ],
    { query: params.q, date: params.date, today },
  );
  const visibleRows = rows.slice(0, 100);
  return (
    <div className="space-y-7 p-4 md:p-7">
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="section-kicker">Recepción y caja</p>
          <h1 className="page-title">Un turno. Todo a mano.</h1>
          <p className="mt-2 text-sm text-slate-500">
            Consultá el historial o abrí un turno para revisar la atención y cobrar.
          </p>
        </div>
        <Link className="brand-button" href="/dashboard/appointments?new=1">
          Nuevo turno <ArrowUpRight size={16} />
        </Link>
      </header>
      <form className="flex flex-wrap gap-3 rounded-2xl border bg-white p-4">
        <label className="flex min-w-[200px] flex-1 items-center gap-2">
          <Search size={17} />
          <input
            className="w-full bg-transparent p-2 outline-none"
            aria-label="Buscar cliente o servicio"
            name="q"
            defaultValue={params.q}
            placeholder="Buscar cliente o servicio…"
          />
        </label>
        <input
          className="rounded-xl border px-3 py-2"
          type="date"
          name="date"
          aria-label="Fecha del turno"
          defaultValue={params.date}
        />
        <button className="brand-button">Buscar</button>
        <Link
          className="px-3 py-3 text-sm underline"
          href={`/dashboard/checkout?date=${today}`}
        >
          Hoy
        </Link>
      </form>
      {visibleRows.some(isHistoricalEntry) && (
        <p className="text-sm leading-relaxed text-slate-500">
          Las atenciones del historial sin hora se ordenan con horarios de
          referencia, separados por una hora.
        </p>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {visibleRows.map((a) => (
          <Link
            key={a.id}
            prefetch={false}
            data-history-id={isHistoricalEntry(a) ? a.workRecord.id : undefined}
            className="checkout-appointment-card group"
            href={
              isHistoricalEntry(a)
                ? `/dashboard/appointments?work=${encodeURIComponent(a.workRecord.id)}&view=day`
                : `/dashboard/checkout?appointment=${a.id}`
            }
          >
            <div className="flex items-start gap-4">
              <div className="brand-avatar hidden shrink-0 sm:flex">
                {a.customerName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold">{a.customerName}</p>
                <p className="mt-1 break-words text-sm text-slate-500">
                  {a.serviceName} · {a.staffName || "Sin profesional"}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {a.appointmentDate.split("-").reverse().join("/")} ·{" "}
                  {a.appointmentTime.slice(0, 5)} ·{" "}
                  {isHistoricalEntry(a)
                    ? "Realizado · Historial"
                    : getStatusLabel(a.status)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold">{formatCurrency(a.price)}</p>
                <ArrowUpRight
                  className="ml-auto mt-3 text-slate-400 transition-transform group-hover:-translate-y-1"
                  size={19}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!rows.length && (
        <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">
          No hay turnos ni atenciones con esos filtros. Podés cargar uno desde
          Nuevo turno.
        </p>
      )}
      {rows.length > 100 && (
        <p className="text-sm text-slate-500">
          Se muestran 100 de {rows.length} atenciones. Usá la búsqueda o elegí una
          fecha para encontrar una anterior.
        </p>
      )}
    </div>
  );
}
