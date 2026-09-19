const cookieName = "nerea_customer_session";
const allowed = new Map([
  ["config", ["GET"]],
  ["challenge", ["POST"]],
  ["verify", ["POST"]],
  ["me", ["GET"]],
  ["profile", ["PUT"]],
  ["logout", ["POST"]],
  ["bookings", ["GET", "POST"]],
]);
export async function customerProxy(
  req,
  res,
  { env = process.env, fetcher = fetch } = {},
) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const send = (status, data) => res.status(status).json(data);
  const url = new URL(req.url, "http://internal"),
    path = url.pathname.replace(/^\/api\/customer\/?/, "");
  const methods =
    allowed.get(path) ||
    (/^bookings\/[\da-f-]{36}$/.test(path)
      ? ["GET"]
      : /^bookings\/[\da-f-]{36}\/cancel$/.test(path)
        ? ["POST"]
        : []);
  if (!methods.includes(req.method))
    return send(404, { error: "Acción no encontrada." });
  const origins = (
    env.CUSTOMER_ALLOWED_ORIGINS ||
    "https://www.nereaaylen.com.ar,https://nereaaylen.com.ar"
  )
    .split(",")
    .map((s) => s.trim());
  if (req.method !== "GET" && !origins.includes(req.headers.origin))
    return send(403, { error: "Origen no permitido." });
  if (!env.CUSTOMER_PROXY_SECRET || env.CUSTOMER_PROXY_SECRET.length < 32)
    return send(503, {
      error: "El acceso de clientes todavía no está habilitado.",
    });
  const base =
    env.CUSTOMER_API_URL || "https://strapi-production-9487.up.railway.app";
  const secure = env.NODE_ENV !== "test";
  const cookie = (token, age) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? "; Secure" : ""}`;
  const token = (req.headers.cookie || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  try {
    let body;
    if (req.method !== "GET") {
      if (
        !String(req.headers["content-type"] || "").startsWith(
          "application/json",
        )
      )
        return send(415, { error: "Formato no permitido." });
      body =
        typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body || {});
      if (Buffer.byteLength(body) > 16000)
        return send(413, { error: "Solicitud demasiado grande." });
      JSON.parse(body);
    }
    const response = await fetcher(
      `${base.replace(/\/$/, "")}/api/customer/${path}`,
      {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
          "X-Customer-Proxy-Key": env.CUSTOMER_PROXY_SECRET,
          ...(token && /^[\w-]{43}$/.test(token)
            ? { Authorization: `Bearer ${token}` }
            : {}),
          ...(typeof req.headers["idempotency-key"] === "string"
            ? { "Idempotency-Key": req.headers["idempotency-key"] }
            : {}),
        },
        body,
        signal: AbortSignal.timeout(25000),
        redirect: "error",
      },
    );
    const data = await response.json();
    if (response.status === 401) res.setHeader("Set-Cookie", cookie("", 0));
    if (response.ok && path === "verify") {
      if (!/^[\w-]{43}$/.test(data.sessionToken || ""))
        throw Error("Invalid session");
      res.setHeader("Set-Cookie", cookie(data.sessionToken, 7 * 86400));
      delete data.sessionToken;
      delete data.expiresAt;
    }
    if (path === "logout") res.setHeader("Set-Cookie", cookie("", 0));
    return send(
      response.status,
      response.ok
        ? data
        : {
            error: data.error?.message || "No se pudo completar la solicitud.",
          },
    );
  } catch {
    return send(502, {
      error: "No pudimos conectar. Volvé a intentar en unos instantes.",
    });
  }
}
