import { NextResponse } from "next/server";
import { getManagedBusiness } from "@/lib/managed-business";
export async function GET() {
  const context = await getManagedBusiness();
  if (!context.data)
    return NextResponse.json({ error: context.error }, { status: 401 });
  const result = await context.data.backend
    .from("appointments")
    .withDeleted()
    .neq("deleted_at", null)
    .order("appointment_date", { ascending: false });
  return NextResponse.json(
    result.error
      ? { error: result.error.message }
      : {
          appointments: (result.data || []).map((a) => ({
            id: a.id,
            name: a.customer_name,
            service: a.service_name_snapshot,
            date: a.appointment_date,
            time: a.appointment_time,
            deletedAt: a.deleted_at,
          })),
        },
    { status: result.error ? 400 : 200 },
  );
}
export async function POST(request: Request) {
  const context = await getManagedBusiness();
  if (!context.data)
    return NextResponse.json({ error: context.error }, { status: 401 });
  const { id } = await request.json();
  if (!/^[1-9]\d*$/.test(String(id)))
    return NextResponse.json({ error: "Turno inválido." }, { status: 400 });
  const result = await context.data.backend
    .from("appointments")
    .update({ deleted_at: null })
    .eq("id", id);
  return NextResponse.json(
    result.error ? { error: result.error.message } : { ok: true },
    { status: result.error ? 400 : 200 },
  );
}
