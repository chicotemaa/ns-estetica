import { NextRequest, NextResponse } from "next/server";
import { backendUrl, sessionCookie } from "@/lib/backend/config";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 254 ||
      password.length > 1024
    )
      return NextResponse.json(
        { error: "Credenciales inválidas." },
        { status: 400 },
      );
    const response = await fetch(`${backendUrl()}/api/auth/local`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email.trim(), password }),
    });
    if (!response.ok)
      return NextResponse.json(
        {
          error:
            response.status === 429
              ? "Demasiados intentos. Esperá un minuto."
              : "Revisá tu email y contraseña.",
        },
        { status: response.status === 429 ? 429 : 401 },
      );
    const result = await response.json();
    if (typeof result.jwt !== "string") throw new Error("Invalid session");
    const session = await fetch(`${backendUrl()}/api/backoffice/session`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${result.jwt}` },
    });
    if (!session.ok)
      return NextResponse.json(
        { error: "Tu cuenta no tiene acceso a este negocio." },
        { status: 403 },
      );
    const output = NextResponse.json({ ok: true });
    output.cookies.set(sessionCookie, result.jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return output;
  } catch {
    return NextResponse.json(
      { error: "No pudimos conectar con el servidor. Intentá nuevamente." },
      { status: 503 },
    );
  }
}
