import "server-only";
import { cookies } from "next/headers";
import { backendUrl, sessionCookie } from "./backend/config";
export async function getCheckout(id: string) {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) throw new Error("Iniciá sesión para continuar.");
  const response = await fetch(
    `${backendUrl()}/api/backoffice/appointments/${id}/checkout`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    },
  );
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error?.message || "No se pudo consultar el turno.");
  return body;
}
