"use client";
import { useEffect, useState, type FormEvent } from "react";

type Account = { email: string; name: string; phone: string };
async function request(path: string, method = "GET", data?: unknown) {
  const r = await fetch("/api/cuenta/" + path, {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || "No se pudo completar la acción.");
  return result;
}
export default function AccountPage() {
  const [ready, setReady] = useState(false),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [account, setAccount] = useState<Account | null>(null),
    [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [recovery, setRecovery] = useState("");
  useEffect(() => {
    let alive = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "recuperar",
    );
    if (token) {
      setRecovery(token);
      setMode("reset");
      window.history.replaceState(null, "", "/cuenta");
    }
    Promise.allSettled([request("config"), request("me")]).then(
      ([config, me]) => {
        if (!alive) return;
        setEnabled(
          config.status === "fulfilled" &&
            config.value.passwordEnabled === true,
        );
        if (!token && me.status === "fulfilled") {
          setAccount(me.value.account);
          setName(me.value.account.name);
          setPhone(me.value.account.phone);
        }
        setReady(true);
      },
    );
    return () => {
      alive = false;
    };
  }, []);
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  async function enter(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (mode !== "login" && password !== confirmation)
        throw new Error("Las contraseñas no coinciden.");
      const r = await request(
        mode,
        "POST",
        mode === "reset"
          ? { token: recovery, password }
          : { email, password, name, phone },
      );
      setAccount(r.account);
      setName(r.account.name);
      setPhone(r.account.phone);
      setPassword("");
      setConfirmation("");
      setRecovery("");
      setMode("login");
      setMessage("Ya podés solicitar tu turno.");
    });
  }
  async function profile(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const r = await request("profile", "PUT", { name, phone });
      setAccount(r.account);
      setMessage("Tus datos quedaron guardados.");
    });
  }
  const details = (
    <>
      <label>
        Nombre
        <input
          className="booking-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
        />
      </label>
      <label>
        Teléfono con código de área
        <input
          className="booking-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          type="tel"
          autoComplete="tel"
          placeholder="+54 362 1234567"
          maxLength={30}
        />
      </label>
    </>
  );
  return (
    <main className="account-page">
      <a href="/">← Volver a Natalia Sánchez Estética</a>
      <section className="account-card">
        <p className="eyebrow">TU ESPACIO</p>
        <h1>
          {account
            ? "Mi cuenta"
            : mode === "register"
              ? "Crear mi cuenta"
              : mode === "reset"
                ? "Elegí una nueva contraseña"
                : "Ingresar a mi cuenta"}
        </h1>
        {!ready ? (
          <p>Cargando…</p>
        ) : account ? (
          <>
            <p>{account.email}</p>
            <form onSubmit={profile}>
              {details}
              <button className="button-primary" disabled={busy}>
                Guardar mis datos
              </button>
            </form>
            <button
              className="text-link"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await request("logout", "POST", {});
                  setAccount(null);
                  setPassword("");
                  setName("");
                  setPhone("");
                })
              }
            >
              Cerrar sesión
            </button>
          </>
        ) : !enabled ? (
          <p>
            El acceso no está disponible en este momento. Podés solicitar tu
            turno desde la web.
          </p>
        ) : (
          <>
            <form onSubmit={enter}>
              {mode === "register" && (
                <>
                  <p>
                    Guardá tus datos para completar más rápido tus próximas
                    reservas.
                  </p>
                  {details}
                </>
              )}
              {mode !== "reset" && (
                <label>
                  Email
                  <input
                    className="booking-input"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={254}
                  />
                </label>
              )}
              <label>
                {mode === "reset" ? "Nueva contraseña" : "Contraseña"}
                <input
                  className="booking-input"
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={10}
                  maxLength={128}
                  aria-describedby="password-help"
                />
              </label>
              <small id="password-help">
                Entre 10 y 128 caracteres. Podés usar una frase que recuerdes.
              </small>
              {mode !== "login" && (
                <label>
                  Repetir contraseña
                  <input
                    className="booking-input"
                    type="password"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    required
                    minLength={10}
                    maxLength={128}
                  />
                </label>
              )}
              <button className="button-primary" disabled={busy}>
                {busy
                  ? "Procesando…"
                  : mode === "register"
                    ? "Crear cuenta"
                    : mode === "reset"
                      ? "Guardar nueva contraseña"
                      : "Ingresar"}
              </button>
            </form>
            {mode !== "reset" && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setPassword("");
                  setConfirmation("");
                  setError("");
                  setMessage("");
                }}
              >
                {mode === "login"
                  ? "Es mi primera visita: crear cuenta"
                  : "Ya tengo cuenta: ingresar"}
              </button>
            )}
          </>
        )}
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <details>
          <summary>Olvidé mi contraseña</summary>
          <p>
            Contactá a Natalia al <a href="tel:+543624654117">362 4654117</a>.
            Después de confirmar tu identidad, te compartirá un enlace válido
            por 30 minutos para elegir una nueva contraseña.
          </p>
        </details>
        <p>
          <a className="text-link" href="/#reservas">
            Solicitar turno →
          </a>
        </p>
      </section>
    </main>
  );
}
