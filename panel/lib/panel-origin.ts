// Railway's internal request URL can contain 0.0.0.0:3000. Never use it
// (or untrusted forwarded headers) for redirects back to the administrator.
export function panelOrigin() {
  const raw = process.env.PANEL_ORIGIN?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "https://app.nataliasanchez.com.ar"
      : "http://localhost:3001");
  const url = new URL(raw);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username || url.password ||
    ["0.0.0.0", "[::]"].includes(url.hostname) ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  ) throw new Error("PANEL_ORIGIN inválida.");
  return url.origin;
}
