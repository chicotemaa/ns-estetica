import { NextResponse } from "next/server";
import {
  getOperationAlerts,
  notificationRequest,
} from "@/lib/operation-alerts-server";
export async function GET() {
  try {
    const { counts, attentionCount, unreadCount, updatedAt } =
      await getOperationAlerts();
    return NextResponse.json(
      { counts, attentionCount, unreadCount, updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudieron actualizar los avisos." },
      { status: 503 },
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const { items, read } = await request.json();
    if (
      typeof read !== "boolean" ||
      !Array.isArray(items) ||
      !items.length ||
      items.length > 100
    )
      return NextResponse.json(
        { error: "Selección inválida." },
        { status: 400 },
      );
    return NextResponse.json(
      await notificationRequest("/read", {
        method: "PATCH",
        body: JSON.stringify({ items, read }),
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el estado.",
      },
      { status: 502 },
    );
  }
}
