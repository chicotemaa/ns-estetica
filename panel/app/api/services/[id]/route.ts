import { NextResponse } from "next/server";

import {
  getManagedBusiness,
  parseServicePayload,
  type ServicePayload,
} from "@/lib/service-management";

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
  const payload = (await request.json()) as ServicePayload;
  const parsed = parseServicePayload(payload);

  if (parsed.error || !parsed.data) {
    return badRequest(parsed.error ?? "Solicitud inválida.");
  }

  const { backend, business } = businessResult.data;

  const { data: duplicateService, error: duplicateError } = await backend
    .from("services")
    .select("id")
    .eq("business_id", business.id)
    .ilike("name", parsed.data.name)
    .neq("id", id)
    .maybeSingle();

  if (duplicateError) {
    return NextResponse.json(
      { error: "No se pudo validar el nombre del servicio." },
      { status: 500 },
    );
  }

  if (duplicateService) {
    return badRequest("Ya existe otro servicio con ese nombre.");
  }

  const { data, error } = await backend
    .from("services")
    .update({
      ...(parsed.data.imageUrl !== undefined ? { image_url: parsed.data.imageUrl } : {}),
      ...(parsed.data.gallery !== undefined ? { image_gallery: parsed.data.gallery } : {}),
      ...(parsed.data.imagePosition !== undefined ? { image_position: parsed.data.imagePosition } : {}),
      ...(parsed.data.featured !== undefined ? { featured: parsed.data.featured } : {}),
      name: parsed.data.name,
      ...(parsed.data.zonePricing !== undefined
        ? { zone_pricing: parsed.data.zonePricing }
        : {}),
      description: parsed.data.description,
      duration_minutes: parsed.data.durationMinutes,
      booking_enabled: parsed.data.bookingEnabled,
      price: parsed.data.price,
      category: parsed.data.category,
      is_active: parsed.data.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", business.id)
    .select(
      "id, name, description, duration_minutes, price, is_active, category",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "No se pudo actualizar el servicio." },
      { status: 400 },
    );
  }

  const { data: baseVariant } = await backend
    .from("service_price_variants")
    .select("id")
    .eq("service_id", id)
    .eq("is_default", true)
    .maybeSingle();

  if (baseVariant) {
    await backend
      .from("service_price_variants")
      .update({
        price: parsed.data.price,
        duration_minutes: parsed.data.durationMinutes,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", baseVariant.id);
  }

  return NextResponse.json({ service: data });
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
    .from("services")
    .delete()
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo eliminar el servicio." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
