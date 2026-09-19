import "server-only";
import { cookies } from "next/headers";
import { backendUrl, sessionCookie } from "./backend/config";
export class FinanceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function financeRequest(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) throw new FinanceError("Iniciá sesión para continuar.", 401);
  const response = await fetch(
    `${backendUrl()}/api/backoffice/finance/${path}`,
    {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const body = await response.json();
  if (!response.ok)
    throw new FinanceError(
      body.error?.message || "No se pudo guardar el registro.",
      response.status,
    );
  return body;
}
