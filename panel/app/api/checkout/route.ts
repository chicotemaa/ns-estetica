import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { backendUrl, sessionCookie } from "@/lib/backend/config";

async function forward(request: Request, method: "GET" | "POST" | "PATCH") {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token)
    return NextResponse.json(
      { error: "Iniciá sesión para continuar." },
      { status: 401 },
    );
  const id = new URL(request.url).searchParams.get("appointmentId");
  if (method === "GET" && !/^[1-9]\d*$/.test(id || ""))
    return NextResponse.json({ error: "Turno inválido." }, { status: 400 });
  try {
    const response = await fetch(
      `${backendUrl()}/api/backoffice/${method === "GET" ? `appointments/${id}/checkout` : "checkout"}`,
      {
        method,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": request.headers.get("Idempotency-Key") || "",
        },
        ...(method !== "GET"
          ? { body: JSON.stringify(await request.json()) }
          : {}),
      },
    );
    const body = await response.json();
    return NextResponse.json(
      response.ok
        ? body
        : { error: body.error?.message || "No se pudo registrar el cobro." },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo confirmar el resultado. Reintentá sin cambiar los datos para evitar duplicados.",
      },
      { status: 502 },
    );
  }
}
export const GET = (request: Request) => forward(request, "GET");
export const POST = (request: Request) => forward(request, "POST");
export const PATCH = (request: Request) => forward(request, "PATCH");
