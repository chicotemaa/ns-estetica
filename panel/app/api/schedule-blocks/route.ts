import { NextResponse } from "next/server";
import { getManagedBusiness } from "@/lib/managed-business";
export async function GET() {
  const context = await getManagedBusiness();
  if (!context.data)
    return NextResponse.json({ error: context.error }, { status: 401 });
  const result = await context.data.backend
    .from("schedule_blocks")
    .order("block_date");
  return NextResponse.json(
    result.error ? { error: result.error.message } : { blocks: result.data },
    { status: result.error ? 400 : 200 },
  );
}
async function save(request: Request, method: string) {
  const context = await getManagedBusiness();
  if (!context.data)
    return NextResponse.json({ error: context.error }, { status: 401 });
  const body = await request.json();
  const { backend, business } = context.data;
  const data = {
    business_id: business.id,
    block_date: body.date,
    start_time: body.start,
    end_time: body.end,
    reason: body.reason || "Pausa",
    staff_member_id: body.staffId || null,
  };
  if (method !== "POST" && !/^[1-9]\d*$/.test(String(body.id)))
    return NextResponse.json({ error: "Bloqueo inválido." }, { status: 400 });
  const result =
    method === "DELETE"
      ? await backend.from("schedule_blocks").delete().eq("id", body.id)
      : method === "PATCH"
        ? await backend.from("schedule_blocks").update(data).eq("id", body.id)
        : await backend.from("schedule_blocks").insert(data);
  return NextResponse.json(
    result.error ? { error: result.error.message } : { ok: true },
    { status: result.error ? 400 : 200 },
  );
}
export const POST = (r: Request) => save(r, "POST");
export const PATCH = (r: Request) => save(r, "PATCH");
export const DELETE = (r: Request) => save(r, "DELETE");
