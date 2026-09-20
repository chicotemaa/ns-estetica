"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
type Account = { id: string; name: string; email: string; phone: string };
export function WebsiteAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [selected, setSelected] = useState<Account | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [url, setUrl] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/customer-accounts?search=" + encodeURIComponent(search), {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw Error(d.error);
          return d;
        })
        .then((d) => {
          setAccounts(d.accounts);
          setError("");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);
  async function recover() {
    if (!selected || !confirmed || busy) return;
    setBusy(true);
    setError("");
    setUrl("");
    try {
      const r = await fetch("/api/customer-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selected.id,
          identityConfirmed: confirmed,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setUrl(d.url);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo generar el enlace.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuentas de la web</CardTitle>
        <p className="text-sm text-muted-foreground">
          Acceso de clientes y recuperación asistida. El email de estas cuentas
          no está verificado.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          aria-label="Buscar cuenta por nombre o email"
          placeholder="Buscar por nombre o email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <p className="text-sm text-muted-foreground">
          Últimas 50 coincidencias.
        </p>
        {accounts.length === 0 && <p>No hay cuentas para mostrar.</p>}
        <ul className="space-y-3">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"
            >
              <div>
                <strong>{a.name || "Sin nombre"}</strong>
                <p>{a.email}</p>
                <p className="text-sm">{a.phone}</p>
              </div>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setSelected(a);
                  setConfirmed(false);
                  setUrl("");
                  setError("");
                }}
              >
                Recuperar acceso
              </Button>
            </li>
          ))}
        </ul>
        {selected && (
          <div className="space-y-3 rounded-md border p-4">
            <p>
              Recuperar acceso de <strong>{selected.email}</strong>
            </p>
            <p className="text-sm">
              Confirmá la identidad con el cliente por un contacto conocido. No
              alcanza con que te indiquen su email.
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy || !!url}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Confirmé la identidad del cliente
            </label>
            {!url && (
              <Button disabled={!confirmed || busy} onClick={recover}>
                {busy ? "Generando…" : "Generar enlace de recuperación"}
              </Button>
            )}
            {url && (
              <>
                <label className="block">
                  Enlace privado
                  <Input
                    readOnly
                    value={url}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <p className="text-sm">
                  Compartilo únicamente con este cliente por el contacto
                  verificado. Vence en 30 minutos y se usa una sola vez. Al
                  cambiar la contraseña se cierran sus sesiones anteriores.
                </p>
              </>
            )}
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setUrl("");
                setConfirmed(false);
              }}
            >
              Cerrar
            </Button>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
      </CardContent>
    </Card>
  );
}
