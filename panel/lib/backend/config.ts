export const sessionCookie = "mi_comercio_session";

export function backendUrl() {
  const raw = process.env.STRAPI_URL?.trim();
  if (!raw) throw new Error("Falta configurar STRAPI_URL.");
  const url = new URL(raw);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("STRAPI_URL inválida.");
  return url.origin;
}
