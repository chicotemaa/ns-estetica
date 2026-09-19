import { NextResponse } from "next/server";

import {
  findBusinessAppointment,
  getAppointmentRecord,
  getManagedBusiness,
  parseAppointmentStatusPayload,
  syncCustomerAppointmentStats,
} from "@/lib/appointment-management";

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
  const existingAppointment = await findBusinessAppointment(
    businessResult.data,
    id,
  );

  if (existingAppointment.error || !existingAppointment.data) {
    return NextResponse.json(
      { error: existingAppointment.error ?? "No se encontró el turno." },
      { status: 404 },
    );
  }

  const payload = (await request.json()) as {
    status?: unknown;
    cancellationReason?: unknown;
  };
  const parsed = parseAppointmentStatusPayload(payload);

  if (parsed.error || !parsed.data) {
    return badRequest(parsed.error ?? "Solicitud inválida.");
  }

  const { backend, business } = businessResult.data;
  const { error } = await backend
    .from("appointments")
    .update({
      status: parsed.data.status,
      cancellation_reason:
        parsed.data.status === "cancelled"
          ? parsed.data.cancellationReason
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar el estado del turno." },
      { status: 500 },
    );
  }

  await syncCustomerAppointmentStats(
    businessResult.data,
    existingAppointment.data.customer_id,
  );

  const appointmentResult = await getAppointmentRecord(
    businessResult.data,
    id,
  );

  if (appointmentResult.error || !appointmentResult.data) {
    return NextResponse.json(
      {
        error:
          appointmentResult.error ??
          "El estado se actualizó, pero no se pudo devolver el turno.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ appointment: appointmentResult.data });
}
