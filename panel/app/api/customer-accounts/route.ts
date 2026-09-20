import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendUrl, sessionCookie } from "@/lib/backend/config";
export const dynamic = "force-dynamic";
async function forward(request: Request, method: "GET" | "POST") {
  const headers = { "Cache-Control": "no-store" };
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token)
    return NextResponse.json(
      { error: "Iniciá sesión." },
      { status: 401, headers },
    );
  try {
    const target = new URL(
      "/api/backoffice/" +
        (method === "GET" ? "customer-accounts" : "customer-recovery"),
      backendUrl(),
    );
    if (method === "GET")
      target.searchParams.set(
        "search",
        new URL(request.url).searchParams.get("search") || "",
      );
    const body = method === "POST" ? await request.text() : undefined;
    if (body && body.length > 2000)
      return NextResponse.json(
        { error: "Solicitud inválida." },
        { status: 413, headers },
      );
    const r = await fetch(target, {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json();
    return NextResponse.json(
      r.ok
        ? data
        : { error: data.error?.message || "No se pudo completar la acción." },
      { status: r.status, headers },
    );
  } catch {
    return NextResponse.json(
      { error: "No pudimos conectar. Intentá nuevamente." },
      { status: 502, headers },
    );
  }
}
export const GET = (r: Request) => forward(r, "GET");
export const POST = (r: Request) => forward(r, "POST");
