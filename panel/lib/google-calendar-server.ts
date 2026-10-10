import "server-only";
import { cookies } from "next/headers";
import { backendUrl, sessionCookie } from "./backend/config";
export async function calendarRequest(path = "", body?: unknown) {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) throw new Error("Iniciá sesión para continuar.");
  const response = await fetch(
    `${backendUrl()}/api/backoffice/google-calendar${path}`,
    {
      method: body === undefined ? "GET" : "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error?.message || "No se pudo conectar con Google Calendar.",
    );
  return data;
}
