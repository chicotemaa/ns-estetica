import { NextResponse } from "next/server"

import { getManagedBusiness, parseServicePayload, type ServicePayload } from "@/lib/service-management"

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function POST(request: Request) {
  const businessResult = await getManagedBusiness()

  if (businessResult.error || !businessResult.data) {
    return NextResponse.json({ error: businessResult.error ?? "No se pudo resolver el negocio." }, { status: 500 })
  }

  const payload = (await request.json()) as ServicePayload
  const parsed = parseServicePayload(payload)

  if (parsed.error || !parsed.data) {
    return badRequest(parsed.error ?? "Solicitud inválida.")
  }

  const { backend, business } = businessResult.data

  const { data: existingService, error: existingError } = await backend
    .from("services")
    .select("id")
    .eq("business_id", business.id)
    .ilike("name", parsed.data.name)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ error: "No se pudo validar si el servicio ya existe." }, { status: 500 })
  }

  if (existingService) {
    return badRequest("Ya existe un servicio con ese nombre.")
  }

  const { data, error } = await backend
    .from("services")
    .insert({
      business_id: business.id,
      name: parsed.data.name,
      description: parsed.data.description,
      duration_minutes: parsed.data.durationMinutes,
      price: parsed.data.price,
      category: parsed.data.category,
      is_active: parsed.data.isActive,
      booking_enabled: parsed.data.bookingEnabled,
      updated_at: new Date().toISOString(),
    })
    .select("id, name, description, duration_minutes, price, is_active, category")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo crear el servicio." }, { status: 500 })
  }

  await backend.from("service_price_variants").insert({
    service_id: data.id,
    variant_name: "Base",
    variant_code: "base",
    price: parsed.data.price,
    duration_minutes: parsed.data.durationMinutes,
    is_default: true,
    is_active: true,
    display_order: 1,
    notes: "Variante base creada desde el CRUD del backoffice.",
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ service: data }, { status: 201 })
}
