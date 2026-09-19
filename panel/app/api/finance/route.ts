import { NextResponse } from "next/server";
import { financeRequest, FinanceError } from "@/lib/finance-server";
const actions = [
  "plan",
  "edit-expense",
  "pay-expense",
  "cancel-expense",
  "stop-plan",
  "hours",
  "void-hours",
  "payroll",
  "progress",
];
export async function POST(request: Request) {
  const action = new URL(request.url).searchParams.get("action") || "";
  if (!actions.includes(action))
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  try {
    return NextResponse.json(
      await financeRequest(action, {
        method: "POST",
        headers: {
          "Idempotency-Key": request.headers.get("Idempotency-Key") || "",
        },
        body: JSON.stringify(await request.json()),
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof FinanceError
            ? error.message
            : "No se pudo confirmar el resultado. Reintentá el registro pendiente.",
      },
      { status: error instanceof FinanceError ? error.status : 502 },
    );
  }
}
