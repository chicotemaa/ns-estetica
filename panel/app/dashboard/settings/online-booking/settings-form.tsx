"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type BookingSettings = {
  revision: number;
  enabled: boolean;
  requested: boolean;
  ready: boolean;
  mode: string;
  missing: string[];
  depositPercent: number;
  holdMinutes: number;
  googleEnabled: boolean;
  googleReady: boolean;
  googleClientId: string;
  collectorId: string;
  cloudflareAccountId: string;
  senderEmail: string;
  credentials: Record<string, boolean>;
  webhookUrl: string;
  googleOrigins: string[];
};
const emptyCredentials = {
  mercadoPagoToken: "",
  mercadoPagoWebhookSecret: "",
  cloudflareEmailToken: "",
};
const fieldClass =
  "mt-2 w-full min-w-0 rounded-xl border bg-background px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const pendingNames: Record<string, string> = {
  MP_ACCESS_TOKEN: "Access Token de Mercado Pago",
  MP_WEBHOOK_SECRET: "Clave de webhooks de Mercado Pago",
  MP_COLLECTOR_ID: "ID del vendedor",
  MP_MODE: "Modo de Mercado Pago",
  CLOUDFLARE_ACCOUNT_ID: "ID de cuenta de Cloudflare",
  CLOUDFLARE_EMAIL_API_TOKEN: "Token de correo de Cloudflare",
  NOTIFICATION_EMAIL_FROM: "Correo remitente",
};
export default function SettingsForm({
  initial,
}: {
  initial: BookingSettings;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [credentials, setCredentials] = useState(emptyCredentials);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function change<K extends keyof BookingSettings>(
    key: K,
    value: BookingSettings[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const {
        revision,
        requested,
        depositPercent,
        holdMinutes,
        googleEnabled,
        googleClientId,
        mode,
        collectorId,
        cloudflareAccountId,
        senderEmail,
      } = form;
      const response = await fetch("/api/online-booking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision,
          requested,
          depositPercent,
          holdMinutes,
          googleEnabled,
          googleClientId,
          mode,
          collectorId,
          cloudflareAccountId,
          senderEmail,
          credentials,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar.");
      setSaved(result);
      setForm(result);
      setCredentials(emptyCredentials);
      setMessage(
        "Cambios guardados. Se aplican a las nuevas reservas; las señas ya pactadas se conservan.",
      );
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo guardar. Volvé a intentar.",
      );
    } finally {
      setBusy(false);
    }
  }
  function secret(label: string, key: keyof typeof emptyCredentials) {
    return (
      <label className="block min-w-0 text-sm font-medium">
        {label}
        <input
          className={fieldClass}
          type="password"
          autoComplete="new-password"
          spellCheck={false}
          maxLength={4096}
          value={credentials[key]}
          placeholder={
            saved.credentials[key]
              ? "Guardada · pegá otra para reemplazarla"
              : "Pegá la credencial aquí"
          }
          onChange={(e) => {
            setCredentials((c) => ({ ...c, [key]: e.target.value }));
            setMessage("");
          }}
        />
        <span className="mt-2 block text-xs font-normal text-muted-foreground">
          {saved.credentials[key]
            ? "Credencial guardada. Dejá vacío para conservarla."
            : "Todavía no hay una credencial guardada."}
        </span>
      </label>
    );
  }
  return (
    <form onSubmit={save} className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 text-sm leading-6">
        <p className="font-semibold">
          {saved.enabled
            ? `Reservas con seña activas · ${saved.mode === "production" ? "producción" : "pruebas"}`
            : "Reservas con seña pendientes de activación"}
        </p>
        <p className="mt-1 text-muted-foreground">
          Los cambios se guardan desde acá y se aplican en la web sin volver a
          publicarla.
        </p>
        {!saved.ready && (
          <details className="mt-3">
            <summary className="cursor-pointer font-medium">
              Qué falta para cobrar señas
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {saved.missing.map((key) => (
                <li key={key}>
                  {pendingNames[key] || "Configuración del servidor: " + key}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <fieldset
        disabled={busy}
        className="min-w-0 space-y-5 disabled:opacity-70"
      >
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Seña y confirmación</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Elegí qué porcentaje se cobra al reservar.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Porcentaje de seña
              <div className="relative">
                <input
                  className={fieldClass + " pr-10"}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  step={1}
                  required
                  value={form.depositPercent || ""}
                  onChange={(e) =>
                    change("depositPercent", Number(e.target.value))
                  }
                />
                <span
                  className="absolute right-4 top-5 text-muted-foreground"
                  aria-hidden="true"
                >
                  %
                </span>
              </div>
              <span className="mt-2 block text-xs font-normal text-muted-foreground">
                De 1 a 100%. Sobre un servicio de $20.000:{" "}
                {new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  maximumFractionDigits: 0,
                }).format((20000 * (form.depositPercent || 0)) / 100)}{" "}
                de seña.
              </span>
            </label>
            <label className="block text-sm font-medium">
              Minutos para completar el pago
              <input
                className={fieldClass}
                type="number"
                inputMode="numeric"
                min={5}
                max={30}
                step={1}
                required
                value={form.holdMinutes || ""}
                onChange={(e) => change("holdMinutes", Number(e.target.value))}
              />
              <span className="mt-2 block text-xs font-normal text-muted-foreground">
                El horario se libera si el pago no se completa.
              </span>
            </label>
          </div>
          <label className="mt-5 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
              checked={form.requested}
              onChange={(e) => change("requested", e.target.checked)}
            />
            <span>
              <span className="block font-medium">
                Activar reservas con seña
              </span>
              <span className="mt-1 block text-muted-foreground">
                Se habilitan al completar Mercado Pago y correo. Hasta entonces
                sigue disponible la solicitud de turnos actual.
              </span>
            </span>
          </label>
          <p className="mt-4 text-xs text-muted-foreground">
            Cancelación con al menos 24 horas de anticipación. La seña no se
            devuelve.
          </p>
        </section>
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Acceso con Google</h2>
            <span className="text-xs text-muted-foreground">
              {saved.googleReady
                ? "Configurado"
                : saved.googleEnabled
                  ? "Activado · falta conectar Google"
                  : "Desactivado"}
            </span>
          </div>
          <label className="mt-5 flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={form.googleEnabled}
              onChange={(e) => change("googleEnabled", e.target.checked)}
            />
            Permitir que los clientes ingresen con Google
          </label>
          <label className="mt-5 block text-sm font-medium">
            Client ID de Google
            <input
              className={fieldClass}
              autoComplete="off"
              spellCheck={false}
              maxLength={300}
              value={form.googleClientId}
              placeholder="…apps.googleusercontent.com"
              onChange={(e) => change("googleClientId", e.target.value)}
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Pegá el Client ID de una aplicación web. Este acceso no necesita un
            Client Secret ni depende de que Mercado Pago esté activado.
          </p>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer">Cómo conectar Google</summary>
            <div className="mt-3 space-y-3 leading-6">
              <p>
                Creá el cliente OAuth de tipo Aplicación web y agregá estos
                orígenes autorizados:
              </p>
              {saved.googleOrigins.map((origin) => (
                <code
                  key={origin}
                  className="block break-all rounded-lg bg-muted p-3 text-xs"
                >
                  {origin}
                </code>
              ))}
              <a
                className="underline"
                href="https://console.cloud.google.com/auth/clients"
                target="_blank"
                rel="noreferrer"
              >
                Abrir Google Cloud
              </a>
            </div>
          </details>
        </section>
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Mercado Pago</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pegá las credenciales de la cuenta que recibe las señas.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Modo de cobro
              <select
                className={fieldClass}
                value={form.mode}
                onChange={(e) => change("mode", e.target.value)}
              >
                <option value="test">Pruebas</option>
                <option value="production">Producción · cobros reales</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              ID del vendedor (Collector ID)
              <input
                className={fieldClass}
                inputMode="numeric"
                autoComplete="off"
                maxLength={30}
                value={form.collectorId}
                onChange={(e) => change("collectorId", e.target.value)}
              />
            </label>
            {secret("Access Token de Mercado Pago", "mercadoPagoToken")}
            {secret("Clave secreta de webhooks", "mercadoPagoWebhookSecret")}
          </div>
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer">
              Datos para conectar Mercado Pago
            </summary>
            <div className="mt-3 space-y-3 leading-6">
              <p>
                En la aplicación de Checkout Pro, configurá notificaciones de
                Pagos con esta URL y pegá arriba su clave secreta:
              </p>
              <code className="block break-all rounded-lg bg-muted p-3 text-xs">
                {saved.webhookUrl}
              </code>
              <a
                className="underline"
                href="https://www.mercadopago.com.ar/developers/panel/app"
                target="_blank"
                rel="noreferrer"
              >
                Abrir integraciones de Mercado Pago
              </a>
            </div>
          </details>
        </section>
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Correo de reservas</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cloudflare envía los códigos de acceso y las confirmaciones.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Correo remitente
              <input
                className={fieldClass}
                type="email"
                maxLength={254}
                value={form.senderEmail}
                onChange={(e) => change("senderEmail", e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              ID de cuenta de Cloudflare
              <input
                className={fieldClass}
                autoComplete="off"
                spellCheck={false}
                maxLength={32}
                value={form.cloudflareAccountId}
                onChange={(e) => change("cloudflareAccountId", e.target.value)}
              />
            </label>
            {secret("Token de Email Sending", "cloudflareEmailToken")}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            La cuenta debe tener Email Sending habilitado y el dominio remitente
            verificado. Email Routing por sí solo no envía confirmaciones.
          </p>
        </section>
      </fieldset>
      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 rounded-2xl border bg-card p-4 shadow-sm lg:bottom-3">
        {error && (
          <p role="alert" className="mb-3 text-sm leading-6">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="mb-3 text-sm leading-6">
            {message}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-lg text-xs leading-5 text-muted-foreground">
            Las claves se guardan cifradas. Un campo vacío conserva la
            credencial existente.
          </p>
          <button
            className="brand-button min-h-11 w-full sm:w-auto"
            type="submit"
            disabled={busy}
          >
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}
