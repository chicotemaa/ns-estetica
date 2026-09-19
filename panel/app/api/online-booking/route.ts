import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendUrl, sessionCookie } from "@/lib/backend/config";

export async function PUT(request: Request) {
  const token = (await cookies()).get(sessionCookie)?.value;
  const headers = { "Cache-Control": "no-store" };
  if (!token)
    return NextResponse.json(
      { error: "Iniciá sesión." },
      { status: 401, headers },
    );
  try {
    const body = await request.text();
    if (body.length > 20000)
      return NextResponse.json(
        { error: "Configuración demasiado grande." },
        { status: 413, headers },
      );
    const response = await fetch(
      `${backendUrl()}/api/backoffice/online-booking`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      },
    );
    const result = await response.json();
    return NextResponse.json(
      response.ok
        ? result
        : {
            error:
              result.error?.message || "No se pudo guardar la configuración.",
          },
      { status: response.status, headers },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo conectar. Los cambios siguen en pantalla; volvé a intentar.",
      },
      { status: 502, headers },
    );
  }
}
