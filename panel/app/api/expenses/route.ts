import { NextResponse } from "next/server";

import {
  getManagedBusiness,
  parseExpensePayload,
  type ExpensePayload,
} from "@/lib/cash-flow-management";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const businessResult = await getManagedBusiness();

  if (businessResult.error || !businessResult.data) {
    return NextResponse.json(
      { error: businessResult.error ?? "No se pudo resolver el negocio." },
      { status: 500 },
    );
  }

  const payload = (await request.json()) as ExpensePayload;
  const parsed = parseExpensePayload(payload);

  if (parsed.error || !parsed.data) {
    return badRequest(parsed.error ?? "Solicitud inválida.");
  }

  const { backend, business } = businessResult.data;

  const { data, error } = await backend
    .from("expenses")
    .insert({
      business_id: business.id,
      expense_date: parsed.data.expenseDate,
      category: parsed.data.category,
      subcategory: parsed.data.subcategory,
      description: parsed.data.description,
      vendor_name: parsed.data.vendorName,
      amount: parsed.data.amount,
      method: parsed.data.method,
      source: parsed.data.source,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No se pudo crear el gasto." },
      { status: 500 },
    );
  }

  return NextResponse.json({ expense: data }, { status: 201 });
}
