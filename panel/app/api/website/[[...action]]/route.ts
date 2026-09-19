import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendUrl, sessionCookie } from "@/lib/backend/config";

async function proxy(
  request: Request,
  context: { params: Promise<{ action?: string[] }> },
) {
  const { action = [] } = await context.params;
  const suffix = action.join("/");
  if (
    !["", "publish", "upload-ticket"].includes(suffix) ||
    (suffix && request.method !== "POST")
  )
    return NextResponse.json({ error: "Acción inválida." }, { status: 404 });
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token)
    return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 });
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    if (body && body.length > 200000)
      return NextResponse.json(
        { error: "El contenido es demasiado grande." },
        { status: 413 },
      );
    const response = await fetch(
      `${backendUrl()}/api/backoffice/website${suffix ? "/" + suffix : ""}`,
      {
        method: request.method,
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
            error: result.error?.message || "No se pudo guardar el contenido.",
          },
      { status: response.status, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo conectar. Tu edición sigue en pantalla; volvé a intentar.",
      },
      { status: 502 },
    );
  }
}
export { proxy as GET, proxy as PUT, proxy as POST };
