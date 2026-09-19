import { NextResponse } from "next/server";

import {
  findBusinessAppointment,
  getAppointmentRecord,
  getManagedBusiness,
  parseAppointmentPayload,
  syncCustomerAppointmentStats,
  validateAppointmentPayload,
  type AppointmentPayload,
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

  const payload = (await request.json()) as AppointmentPayload;
  const parsed = parseAppointmentPayload(payload);

  if (parsed.error || !parsed.data) {
    return badRequest(parsed.error ?? "Solicitud inválida.");
  }

  const validation = await validateAppointmentPayload(
    businessResult.data,
    parsed.data,
    { appointmentIdToIgnore: id },
  );

  if (validation.error || !validation.data) {
    return badRequest(
      validation.error ?? "No se pudo validar el turno solicitado.",
    );
  }

  const timestamp = new Date().toISOString();
  const { backend, business } = businessResult.data;
  const { error } = await backend
    .from("appointments")
    .update({
      customer_id: validation.data.customerId,
      customer_name: parsed.data.customerName,
      customer_contact: parsed.data.customerContact,
      customer_email: parsed.data.customerEmail,
      service_id: parsed.data.serviceId,
      staff_member_id: parsed.data.staffMemberId,
      appointment_date: parsed.data.appointmentDate,
      appointment_time: parsed.data.appointmentTime,
      status: parsed.data.status,
      channel: parsed.data.channel,
      service_name_snapshot: validation.data.serviceName,
      staff_name_snapshot: validation.data.staffName,
      price_snapshot: validation.data.price,
      duration_snapshot: validation.data.serviceDurationMinutes,
      notes: parsed.data.notes,
      internal_notes: parsed.data.internalNotes,
      cancellation_reason:
        parsed.data.status === "cancelled"
          ? parsed.data.cancellationReason
          : null,
      updated_at: timestamp,
    })
    .eq("id", id)
    .eq("business_id", business.id);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar el turno." },
      { status: 500 },
    );
  }

  await Promise.all([
    syncCustomerAppointmentStats(
      businessResult.data,
      existingAppointment.data.customer_id,
    ),
    syncCustomerAppointmentStats(
      businessResult.data,
      validation.data.customerId,
    ),
  ]);

  const appointmentResult = await getAppointmentRecord(
    businessResult.data,
    id,
  );

  if (appointmentResult.error || !appointmentResult.data) {
    return NextResponse.json(
      {
        error:
          appointmentResult.error ??
          "El turno se actualizó, pero no se pudo devolver la versión actualizada.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ appointment: appointmentResult.data });
}
