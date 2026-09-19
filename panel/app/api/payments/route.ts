import { NextResponse } from "next/server";

import {
  getManagedBusiness,
  parsePaymentPayload,
  validateBusinessCustomer,
  validateBusinessStaffMember,
  type PaymentPayload,
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

  const payload = (await request.json()) as PaymentPayload;
  const parsed = parsePaymentPayload(payload);

  if (parsed.error || !parsed.data) {
    return badRequest(parsed.error ?? "Solicitud inválida.");
  }

  const customerValidation = await validateBusinessCustomer(
    businessResult.data,
    parsed.data.customerId,
  );

  if (customerValidation.error) {
    return badRequest(customerValidation.error);
  }

  const staffValidation = await validateBusinessStaffMember(
    businessResult.data,
    parsed.data.staffMemberId,
  );

  if (staffValidation.error) {
    return badRequest(staffValidation.error);
  }

  const { backend, business } = businessResult.data;

  const { data, error } = await backend
    .from("payments")
    .insert({
      business_id: business.id,
      customer_id: parsed.data.customerId,
      staff_member_id: parsed.data.staffMemberId,
      description: parsed.data.description,
      amount: parsed.data.amount,
      method: parsed.data.method,
      status: parsed.data.status,
      transaction_id: parsed.data.transactionId,
      processed_at: parsed.data.processedAt,
      notes: parsed.data.notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No se pudo crear el cobro." },
      { status: 500 },
    );
  }

  return NextResponse.json({ payment: data }, { status: 201 });
}
