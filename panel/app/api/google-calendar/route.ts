import { NextResponse } from "next/server";
import { calendarRequest } from "@/lib/google-calendar-server";
export async function GET(request: Request) {
  try {
    const path =
      new URL(request.url).searchParams.get("calendars") === "1"
        ? "/calendars"
        : "";
    return NextResponse.json(await calendarRequest(path));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo cargar." },
      { status: 400 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (
      !["connect", "select", "disconnect", "sync", "resolve"].includes(
        body.action,
      )
    )
      return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
    return NextResponse.json(await calendarRequest(`/${body.action}`, body));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo guardar." },
      { status: 400 },
    );
  }
}
