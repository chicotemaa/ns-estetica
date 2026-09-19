import { NextResponse } from "next/server";

import {
  getManagedBusiness,
  parseCustomerPayload,
  type CustomerPayload,
} from "@/lib/customer-management";

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

  const payload = (await request.json()) as CustomerPayload;
  const parsed = parseCustomerPayload(payload);

  if (parsed.error || !parsed.data) {
    return badRequest(parsed.error ?? "Solicitud inválida.");
  }

  const { backend, business } = businessResult.data;

  const { data: existingCustomer, error: existingCustomerError } =
    await backend
      .from("customers")
      .select("id")
      .eq("business_id", business.id)
      .eq("primary_contact", parsed.data.primaryContact)
      .maybeSingle();

  if (existingCustomerError) {
    return NextResponse.json(
      { error: "No se pudo validar el contacto principal del cliente." },
      { status: 500 },
    );
  }

  if (existingCustomer) {
    return badRequest("Ya existe un cliente con ese contacto principal.");
  }

  const { data, error } = await backend
    .from("customers")
    .insert({
      business_id: business.id,
      full_name: parsed.data.fullName,
      primary_contact: parsed.data.primaryContact,
      email: parsed.data.email,
      phone: parsed.data.phone,
      instagram_handle: parsed.data.instagramHandle,
      address: parsed.data.address,
      preferred_services: parsed.data.preferredServices,
      notes: parsed.data.notes,
      status: parsed.data.status,
      rating: parsed.data.rating,
      marketing_opt_in: parsed.data.marketingOptIn,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No se pudo crear el cliente." },
      { status: 500 },
    );
  }

  return NextResponse.json({ customer: data }, { status: 201 });
}
