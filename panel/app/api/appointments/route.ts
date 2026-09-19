import { NextResponse } from "next/server";

import {
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

export async function POST(request: Request) {
  const businessResult = await getManagedBusiness();

  if (businessResult.error || !businessResult.data) {
    return NextResponse.json(
      { error: businessResult.error ?? "No se pudo resolver el negocio." },
      { status: 500 },
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
  );

  if (validation.error || !validation.data) {
    return badRequest(
      validation.error ?? "No se pudo validar el turno solicitado.",
    );
  }

  const timestamp = new Date().toISOString();
  const { backend, business } = businessResult.data;
  const { data, error } = await backend
    .from("appointments")
    .insert({
      business_id: business.id,
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
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "No se pudo crear el turno." },
      { status: 500 },
    );
  }

  await syncCustomerAppointmentStats(
    businessResult.data,
    validation.data.customerId,
  );

  const appointmentResult = await getAppointmentRecord(
    businessResult.data,
    data.id,
  );

  if (appointmentResult.error || !appointmentResult.data) {
    return NextResponse.json(
      {
        error:
          appointmentResult.error ??
          "El turno se creó, pero no se pudo devolver la versión actualizada.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { appointment: appointmentResult.data },
    { status: 201 },
  );
}
