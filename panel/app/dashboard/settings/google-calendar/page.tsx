"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
type State = {
  ready: boolean;
  missing: string[];
  connected: boolean;
  enabled: boolean;
  calendarName: string;
  calendarId: string;
  lastSync: string | null;
  error: string | null;
  conflicts: { key: string; message: string }[];
};
type Calendar = { id: string; name: string; primary: boolean };
export default function GoogleCalendarPage() {
  const [state, setState] = useState<State | null>(null),
    [calendars, setCalendars] = useState<Calendar[]>([]),
    [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function load() {
    const response = await fetch("/api/google-calendar", { cache: "no-store" }),
      data = await response.json();
    if (!response.ok) throw Error(data.error);
    setState(data);
    if (data.connected && !data.enabled) {
      const r = await fetch("/api/google-calendar?calendars=1", {
          cache: "no-store",
        }),
        c = await r.json();
      if (!r.ok) throw Error(c.error);
      setCalendars(c.calendars);
      setSelected(
        c.calendars.find((x: Calendar) => x.id === data.calendarId)?.id ||
          c.calendars.find((x: Calendar) => x.primary)?.id ||
          c.calendars[0]?.id ||
          "",
      );
    }
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
    if (
      new URLSearchParams(window.location.search).get("connection") === "error"
    )
      setError(
        "No se completó la autorización. Volvé a conectar con Google y aceptá los permisos del calendario.",
      );
  }, []);
  async function action(action: string, extra: Record<string, string> = {}) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/google-calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...extra }),
        }),
        data = await r.json();
      if (!r.ok) throw Error(data.error);
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      await load();
      setNotice(
        action === "select"
          ? "Calendario conectado. La primera sincronización se realizará en los próximos dos minutos."
          : action === "disconnect"
            ? "Conexión desactivada. Los eventos existentes se conservan en Google."
            : action === "resolve"
              ? "Se conservará el panel en la próxima sincronización."
              : "Sincronización completada. Revisá si hay cambios pendientes de resolver.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo completar la operación.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link className="underline" href="/dashboard/settings">
        Volver a configuración
      </Link>
      <h1 className="text-3xl font-semibold">Google Calendar</h1>
      <p>
        Conectá tu cuenta de Google y elegí el calendario que usás para la
        estética. Esta conexión administra la agenda de todo el local.
      </p>
      <Link className="inline-block text-sm underline" href="/privacidad/google-calendar">
        Cómo usamos tus datos de Google Calendar
      </Link>
      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded border border-green-300 bg-green-50 p-4"
        >
          {notice}
        </p>
      )}
      {!state && !error && <p role="status">Cargando conexión…</p>}
      {state && (
        <>
          <section className="space-y-4 rounded-xl border bg-white p-6">
            <h2 className="text-xl font-semibold">
              {state.enabled
                ? "Calendario conectado"
                : state.connected
                  ? "Elegí tu calendario"
                  : "Conectá tu cuenta"}
            </h2>
            {!state.ready && (
              <p>
                Falta habilitar la aplicación de Google en el servidor. El
                administrador técnico debe completar la configuración antes de
                conectar una cuenta.
              </p>
            )}
            {state.ready && !state.connected && (
              <Button disabled={busy} onClick={() => action("connect")}>
                Conectar con Google
              </Button>
            )}
            {state.connected && !state.enabled && (
              <>
                <label className="block font-medium" htmlFor="google-calendar">
                  Calendario
                </label>
                <select
                  id="google-calendar"
                  className="w-full rounded border p-3"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  disabled={busy}
                >
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.primary ? " (principal)" : ""}
                    </option>
                  ))}
                </select>
                {!calendars.length && (
                  <p>
                    No hay calendarios con permiso de edición en esta cuenta.
                  </p>
                )}
                <p className="text-sm">
                  Se compartirán con ese calendario el nombre del cliente, el
                  servicio y el horario. Quienes ya tengan acceso al calendario
                  podrían verlos según sus permisos. Elegí un calendario privado
                  del negocio.
                </p>
                <Button
                  disabled={busy || !selected}
                  onClick={() => action("select", { calendarId: selected })}
                >
                  Activar sincronización
                </Button>
              </>
            )}
            {state.enabled && (
              <>
                <p className="font-medium">{state.calendarName}</p>
                <p>
                  Última sincronización:{" "}
                  {state.lastSync
                    ? new Date(state.lastSync).toLocaleString("es-AR", {
                        timeZone: "America/Argentina/Buenos_Aires",
                      })
                    : "Pendiente"}
                </p>
                {state.error && (
                  <p role="alert" className="text-red-800">
                    {state.error}
                  </p>
                )}
                <Button disabled={busy} onClick={() => action("sync")}>
                  {busy ? "Procesando…" : "Sincronizar ahora"}
                </Button>
              </>
            )}
            {state.connected && (
              <details>
                <summary className="cursor-pointer font-medium">
                  Desconectar o cambiar de cuenta
                </summary>
                <p className="my-3 text-sm">
                  Se detendrá la sincronización y se quitarán los horarios
                  ocupados importados. Tus turnos permanecen en el panel y los
                  eventos ya enviados se conservan en Google.
                </p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => action("disconnect")}
                >
                  Desconectar Google Calendar
                </Button>
              </details>
            )}
          </section>
          <section className="space-y-3 rounded-xl border p-6">
            <h2 className="text-xl font-semibold">Cómo se sincroniza</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Los turnos y las pausas del panel se guardan en Google. Cancelar
                o eliminar un turno lo retira del calendario.
              </li>
              <li>
                Mover un evento de turno en Google reprograma su fecha, hora y
                duración. Eliminarlo cancela el turno, conservando su historial.
              </li>
              <li>
                Los otros eventos marcados como ocupados bloquean la agenda de
                todo el local, incluidos los eventos de día completo.
              </li>
              <li>
                Se revisan cambios cada dos minutos. La ventana incluye los
                últimos 30 días y los próximos 400 días; un cambio recién hecho
                puede tardar en aparecer.
              </li>
              <li>
                Los cambios incompatibles con horarios, otros turnos o cobros se
                señalan para resolverlos. No se envían invitaciones a clientes.
              </li>
            </ul>
          </section>
          {state.conflicts.length > 0 && (
            <section className="space-y-4 rounded-xl border border-amber-400 bg-amber-50 p-6">
              <h2 className="text-xl font-semibold">Cambios para revisar</h2>
              {state.conflicts.map((c) => (
                <div key={c.key} className="space-y-2 border-b pb-4">
                  <p className="font-medium">
                    {c.key.startsWith("appointment:") ? "Turno" : "Bloqueo"} #
                    {c.key.split(":")[1]}
                  </p>
                  <p>{c.message}</p>
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() => action("resolve", { key: c.key })}
                  >
                    Conservar datos del panel
                  </Button>
                </div>
              ))}
              <p className="text-sm">
                También podés corregir el evento en Google y volver a
                sincronizar.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
