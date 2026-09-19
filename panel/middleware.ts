import { NextRequest, NextResponse } from "next/server";
import { backendUrl, sessionCookie } from "./lib/backend/config";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const expected = process.env.PANEL_ORIGIN || request.nextUrl.origin;
    if (origin !== expected)
      return NextResponse.json(
        { error: "Origen de solicitud inválido." },
        { status: 403 },
      );
  }
  if (path.startsWith("/api/auth/")) return NextResponse.next();
  const token = request.cookies.get(sessionCookie)?.value;
  let valid = false;
  if (token) {
    try {
      const result = await fetch(`${backendUrl()}/api/backoffice/session`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (result.status >= 500)
        return new NextResponse(
          "El servidor no está disponible. Volvé a intentar.",
          { status: 503 },
        );
      valid = result.ok;
    } catch {
      return new NextResponse(
        "No se pudo conectar con el servidor. Volvé a intentar.",
        { status: 503 },
      );
    }
  }
  if (valid) return NextResponse.next();
  const response = path.startsWith("/api/")
    ? NextResponse.json(
        { error: "Iniciá sesión para continuar." },
        { status: 401 },
      )
    : NextResponse.redirect(new URL("/auth", request.url));
  response.cookies.delete(sessionCookie);
  return response;
}
export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] };
