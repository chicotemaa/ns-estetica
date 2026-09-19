import { NextResponse } from "next/server";
import { getManagedBusiness } from "@/lib/managed-business";
import { palettes } from "@/lib/brand";
export async function PATCH(request: Request) {
  const context = await getManagedBusiness();
  if (!context.data)
    return NextResponse.json({ error: context.error }, { status: 503 });
  const raw = await request.json();
  if (!raw || !Object.hasOwn(palettes, raw.brand_palette))
    return NextResponse.json(
      { error: "Elegí una paleta válida." },
      { status: 400 },
    );
  const data: Record<string, string> = { brand_palette: raw.brand_palette };
  for (const [field, max] of Object.entries({
    brand_initials: 4,
    short_name: 60,
    hero_headline: 180,
    hero_copy: 600,
    booking_intro: 400,
  })) {
    if (
      typeof raw[field] !== "string" ||
      raw[field].trim().length > max ||
      !raw[field].trim()
    )
      return NextResponse.json(
        {
          error:
            "Completá los textos de la identidad visual dentro del límite indicado.",
        },
        { status: 400 },
      );
    data[field] = raw[field].trim();
  }
  const { error } = await context.data.backend
    .from("businesses")
    .update(data)
    .eq("id", context.data.business.id);
  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json({ ok: true });
}
