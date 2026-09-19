import { NextResponse } from "next/server";
import { getManagedBusiness } from "@/lib/managed-business";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id))
    return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
  const context = await getManagedBusiness();
  if (!context.data)
    return NextResponse.json({ error: context.error }, { status: 401 });
  const { backend } = context.data;
  const customer = await backend.from("customers").eq("id", id).maybeSingle();
  if (!customer.data)
    return NextResponse.json(
      { error: "Cliente no encontrado." },
      { status: 404 },
    );
  const [appointments, payments] = await Promise.all([
    backend
      .from("appointments")
      .eq("customer_id", id)
      .order("appointment_date", { ascending: false }),
    backend
      .from("payments")
      .eq("customer_id", id)
      .order("processed_at", { ascending: false }),
  ]);
  if (appointments.error || payments.error)
    return NextResponse.json(
      { error: "No se pudo cargar el historial." },
      { status: 502 },
    );
  return NextResponse.json(
    {
      visits: (appointments.data || []).map((a) => ({
        id: a.id,
        date: a.appointment_date,
        time: a.appointment_time,
        service: a.service_name_snapshot,
        staff: a.staff_name_snapshot,
        status: a.status,
        amount: Number(a.price_snapshot),
        notes: a.internal_notes,
      })),
      payments: (payments.data || []).map((p) => ({
        id: p.id,
        date: p.processed_at,
        description: p.description,
        amount: Number(p.amount),
        status: p.status,
        appointmentId: p.appointment_id,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
