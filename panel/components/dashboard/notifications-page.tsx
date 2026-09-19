import Link from "next/link";
import {
  getOperationAlerts,
  getNotificationEmailStatus,
} from "@/lib/operation-alerts-server";
import { ALERT_LABELS, type AlertKind } from "@/lib/operation-alerts";
import { formatCurrency, formatDisplayDate } from "@/lib/business-shared";
import { RefreshNotifications } from "./refresh-notifications";
import { NotificationReadButton } from "./notification-read-button";
export async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [data, query, email] = await Promise.all([
    getOperationAlerts(),
    searchParams,
    getNotificationEmailStatus(),
  ]);
  const kind =
    typeof query.tipo === "string" && Object.hasOwn(ALERT_LABELS, query.tipo)
      ? (query.tipo as AlertKind)
      : null;
  const view =
    query.estado === "sin-ver"
      ? "sin-ver"
      : query.estado === "vistos"
        ? "vistos"
        : "todos";
  const filtered = data.alerts.filter(
    (a) =>
      (!kind || a.kind === kind) &&
      (view === "todos" || (view === "vistos" ? !!a.readAt : !a.readAt)),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 25));
  const requestedPage =
    typeof query.pagina === "string" && /^\d{1,5}$/.test(query.pagina)
      ? Number(query.pagina)
      : 1;
  const page = Math.min(pageCount, Math.max(1, requestedPage));
  const visible = filtered.slice((page - 1) * 25, page * 25);
  const href = (state: string, nextPage = 1, nextKind = kind) =>
    `/dashboard/notifications?${new URLSearchParams({ estado: state, pagina: String(nextPage), ...(nextKind ? { tipo: nextKind } : {}) })}`;
  const emailLabels: Record<string, string> = {
    delivered: "Entregado",
    queued: "En cola en Cloudflare",
    sending: "Confirmación pendiente",
    failed: "Falló el envío",
    unknown: "Resultado por verificar",
    bounced: "Rechazado por el destinatario",
  };
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Seguimiento del negocio</p>
          <h1 className="text-3xl font-semibold">Avisos y tareas</h1>
          <p className="mt-2 text-slate-600">
            {data.unreadCount} sin ver · {data.attentionCount} acciones
            pendientes. Ver un aviso no registra pagos ni cambia el estado del
            turno.
          </p>
        </div>
        <RefreshNotifications />
      </header>
      <nav
        aria-label="Tipos de aviso"
        className="grid grid-cols-2 gap-3 md:grid-cols-3"
      >
        {(Object.keys(ALERT_LABELS) as AlertKind[]).map((key) => (
          <Link
            key={key}
            href={href(view, 1, key)}
            className={`rounded-xl border p-4 ${kind === key ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}
          >
            <p className="text-sm">{ALERT_LABELS[key]}</p>
            <strong className="mt-1 block text-2xl">{data.counts[key]}</strong>
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Estado de lectura" className="flex flex-wrap gap-2">
          {[
            ["todos", "Todos"],
            ["sin-ver", "Sin ver"],
            ["vistos", "Vistos"],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={href(key)}
              aria-current={view === key ? "page" : undefined}
              className={`rounded-lg border px-3 py-2 text-sm ${view === key ? "bg-slate-900 text-white" : "bg-white"}`}
            >
              {label}
            </Link>
          ))}
          {kind && (
            <Link
              href={href(view, 1, null)}
              className="px-3 py-2 text-sm underline"
            >
              Todas las categorías
            </Link>
          )}
        </nav>
        <NotificationReadButton
          items={visible
            .filter((a) => !a.readAt)
            .map(({ id, revision }) => ({ id, revision }))}
          read={true}
          label="Marcar esta página como vista"
        />
        <Link
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          href="/dashboard/appointments?new=1"
        >
          Cargar turno
        </Link>
      </div>
      <p className="text-sm text-slate-500">
        {kind ? ALERT_LABELS[kind] : "Todos los avisos"} · {filtered.length}{" "}
        registros. Actualización automática cada minuto mientras esta pantalla
        está abierta.
      </p>
      <ul className="space-y-3">
        {visible.map((alert) => (
          <li
            className="flex flex-col items-stretch justify-between gap-4 rounded-xl border bg-white p-4 sm:flex-row sm:items-center"
            key={alert.id}
          >
            <div className="min-w-0 flex-1 break-words">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {ALERT_LABELS[alert.kind]}
                <span
                  className={`ml-2 inline-block rounded-full px-2 py-0.5 normal-case ${alert.readAt ? "bg-slate-100" : "bg-amber-100 text-amber-900"}`}
                >
                  {alert.readAt ? "Visto" : "Sin ver"}
                </span>
              </p>
              <p className="mt-1 font-semibold">{alert.title}</p>
              <p className="text-sm text-slate-600">{alert.detail}</p>
              <p className="mt-1 text-sm text-slate-500">
                {formatDisplayDate(
                  alert.date,
                  "America/Argentina/Buenos_Aires",
                )}
                {alert.time ? ` · ${alert.time}` : ""}
                {alert.amount != null
                  ? ` · ${formatCurrency(alert.amount)} pendiente`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NotificationReadButton
                items={[{ id: alert.id, revision: alert.revision }]}
                read={!alert.readAt}
                label={alert.readAt ? "Marcar sin ver" : "Marcar visto"}
              />
              <Link
                className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
                href={alert.href}
              >
                {alert.action}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      {!filtered.length && (
        <div className="rounded-xl border bg-white p-8 text-center">
          <h2 className="font-semibold">Todo al día</h2>
          <p className="mt-2 text-sm text-slate-500">
            No hay avisos en esta categoría. Podés cargar un turno o consultar
            la agenda.
          </p>
        </div>
      )}
      {pageCount > 1 && (
        <nav
          aria-label="Páginas de avisos"
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          {page > 1 ? (
            <Link
              href={href(view, page - 1)}
              className="rounded-lg border px-3 py-2"
            >
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span>
            Página {page} de {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={href(view, page + 1)}
              className="rounded-lg border px-3 py-2"
            >
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      <section className="break-words rounded-2xl border bg-white p-5 text-sm">
        <h2 className="font-semibold">Resumen por correo</h2>
        <p className="mt-2 text-slate-600">
          {email.enabled
            ? `${email.cadence}. Destino: ${email.to}.`
            : "Los avisos internos están activos. El resumen por correo se habilitará al completar la conexión de Cloudflare."}
        </p>
        {email.latest && (
          <p className="mt-2">
            Último resumen: {email.latest.date} ·{" "}
            {emailLabels[email.latest.status] || email.latest.status}
          </p>
        )}
        {email.latest?.error && (
          <p className="mt-1 text-amber-800">{email.latest.error}</p>
        )}
        <p className="mt-2 text-slate-500">
          El estado visto/sin ver corresponde a tu cuenta en la plataforma. La
          entrega del correo se registra por separado.
        </p>
      </section>
    </div>
  );
}
