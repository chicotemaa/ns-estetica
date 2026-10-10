import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendUrl, sessionCookie } from "@/lib/backend/config";
export async function GET() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token)
    return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 });
  const response = await fetch(
    `${backendUrl()}/api/backoffice/service-presets/laser`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
