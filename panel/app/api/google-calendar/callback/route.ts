import { NextResponse } from "next/server";
import { calendarRequest } from "@/lib/google-calendar-server";
import { panelOrigin } from "@/lib/panel-origin";
export async function GET(request: Request) {
  const url = new URL(request.url);
  let outcome = "connected";
  try {
    if (url.searchParams.has("error"))
      throw new Error("Autorización cancelada.");
    await calendarRequest("/callback", {
      code: url.searchParams.get("code"),
      state: url.searchParams.get("state"),
    });
  } catch {
    outcome = "error";
  }
  // Never echo authorization codes or provider errors into the destination URL.
  const response = NextResponse.redirect(
    new URL(
      `/dashboard/settings/google-calendar?connection=${outcome}`,
      panelOrigin(),
    ),
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
