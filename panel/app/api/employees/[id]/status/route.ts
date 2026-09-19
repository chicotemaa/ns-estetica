import { NextResponse } from "next/server";

import {
  getManagedBusiness,
  parseEmployeeStatusPayload,
  type EmployeePayload,
} from "@/lib/employee-management";

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

  const payload = (await request.json()) as Pick<EmployeePayload, "isActive">;
  const parsed = parseEmployeeStatusPayload(payload);

  if (parsed.error || parsed.isActive === undefined) {
    return NextResponse.json(
      { error: parsed.error ?? "Solicitud inválida." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const { backend, business } = businessResult.data;

  const { data, error } = await backend
    .from("staff_members")
    .update({
      is_active: parsed.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", business.id)
    .select("id, is_active")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No se pudo actualizar el estado del profesional." },
      { status: 500 },
    );
  }

  return NextResponse.json({ employee: data });
}
