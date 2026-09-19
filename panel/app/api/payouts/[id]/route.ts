import { NextResponse } from "next/server";

import {
  getManagedBusiness,
  parsePayoutPayload,
  validateBusinessStaffMember,
  type PayoutPayload,
} from "@/lib/cash-flow-management";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const businessResult = await getManagedBusiness();

  if (businessResult.error || !businessResult.data) {
    return NextResponse.json(
      { error: businessResult.error ?? "No se pudo resolver el negocio." },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const payload = (await request.json()) as PayoutPayload;
  const parsed = parsePayoutPayload(payload);

  if (parsed.error || !parsed.data) {
    return badRequest(parsed.error ?? "Solicitud inválida.");
  }

  const staffValidation = await validateBusinessStaffMember(
    businessResult.data,
    parsed.data.staffMemberId,
  );

  if (staffValidation.error) {
    return badRequest(staffValidation.error);
  }

  const { backend, business } = businessResult.data;
  const recipientName =
    staffValidation.data?.full_name ?? parsed.data.recipientName;

  const { data, error } = await backend
    .from("payouts")
    .update({
      payout_date: parsed.data.payoutDate,
      recipient_name: recipientName,
      recipient_type: parsed.data.recipientType,
      category: parsed.data.category,
      staff_member_id: parsed.data.staffMemberId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      source: parsed.data.source,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", business.id)
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No se pudo actualizar la distribución." },
      { status: 500 },
    );
  }

  return NextResponse.json({ payout: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const businessResult = await getManagedBusiness();

  if (businessResult.error || !businessResult.data) {
    return NextResponse.json(
      { error: businessResult.error ?? "No se pudo resolver el negocio." },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const { backend, business } = businessResult.data;

  const { error } = await backend
    .from("payouts")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo eliminar la distribución." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
