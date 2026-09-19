import "server-only";
import { cookies } from "next/headers";
import { backendUrl, sessionCookie } from "./backend/config";
export class WorkbookRequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function workbookRequest(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) throw new Error("Iniciá sesión para continuar.");
  const response = await fetch(
    `${backendUrl()}/api/backoffice/workbook${path}`,
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
    throw new WorkbookRequestError(
      body.error?.message || "No se pudo consultar la planilla.",
      response.status,
    );
  return body;
}
