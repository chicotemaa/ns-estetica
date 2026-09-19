import { NextResponse } from "next/server";
import { getManagedBusiness } from "@/lib/managed-business";
export async function PATCH(request: Request) {
  const result = await getManagedBusiness();
  if (!result.data)
    return NextResponse.json({ error: result.error }, { status: 401 });
  const input = await request.json();
  if (
    typeof input.target !== "number" ||
    !Number.isFinite(input.target) ||
    input.target < 0 ||
    input.target > 1e10 ||
    !Array.isArray(input.rates) ||
    input.rates.length > 19 ||
    input.rates.some(
      (r: { id: string; rate: number }) =>
        !r ||
        !/^[1-9]\d*$/.test(r.id) ||
        typeof r.rate !== "number" ||
        !Number.isFinite(r.rate) ||
        r.rate < 0 ||
        r.rate > 100,
    )
  )
    return NextResponse.json(
      { error: "Revisá el objetivo y los porcentajes (0 a 100)." },
      { status: 400 },
    );
  const { backend, business } = result.data;
  const saved = await backend.batch([
    {
      resource: "businesses",
      operation: "update",
      filters: [{ field: "id", operator: "eq", value: business.id }],
      data: { monthly_collection_target: input.target },
    },
    ...input.rates.map((r: { id: string; rate: number }) => ({
      resource: "staff_members",
      operation: "update" as const,
      filters: [{ field: "id", operator: "eq" as const, value: r.id }],
      data: { collection_commission_rate: r.rate },
    })),
  ]);
  return NextResponse.json(
    saved.error ? { error: saved.error.message } : { saved: true },
    { status: saved.error ? 400 : 200 },
  );
}
