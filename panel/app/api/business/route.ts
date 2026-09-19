import { NextResponse } from "next/server";
import { getManagedBusiness } from "@/lib/managed-business";
export async function PATCH(request: Request) {
  const context = await getManagedBusiness();
  if (!context.data)
    return NextResponse.json({ error: context.error }, { status: 503 });
  const raw = await request.json();
  const fields = [
    "name",
    "description",
    "address",
    "phone",
    "email",
    "website",
    "cuit",
  ] as const;
  const data: Record<string, string> = {};
  for (const field of fields) {
    if (
      typeof raw[field] !== "string" ||
      raw[field].length > (field === "description" ? 1000 : 254)
    )
      return NextResponse.json(
        { error: "Revisá los datos del negocio." },
        { status: 400 },
      );
    data[field] = raw[field].trim();
  }
  if (
    data.name.length < 2 ||
    (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
  )
    return NextResponse.json(
      { error: "Revisá el nombre y el email." },
      { status: 400 },
    );
  if (raw.instagram_handle !== undefined) {
    if (typeof raw.instagram_handle !== "string" || raw.instagram_handle.length > 254)
      return NextResponse.json({ error: "Revisá el perfil de Instagram." }, { status: 400 });
    let handle = raw.instagram_handle.trim();
    if (/^https?:\/\//i.test(handle)) {
      try {
        const url = new URL(handle);
        if (!["instagram.com", "www.instagram.com"].includes(url.hostname) || url.username || url.password)
          throw new Error("Perfil inválido");
        handle = url.pathname.replace(/^\//, "").replace(/\/$/, "");
      } catch {
        return NextResponse.json({ error: "Usá el usuario o enlace al perfil de Instagram." }, { status: 400 });
      }
    }
    handle = handle.replace(/^@/, "");
    if (handle && (!/^[a-zA-Z0-9._]{1,30}$/.test(handle) || /^(p|reel|reels|stories|explore)$/i.test(handle)))
      return NextResponse.json({ error: "Usá el perfil de Instagram, no una publicación." }, { status: 400 });
    data.instagram_handle = handle;
  }
  if (raw.whatsapp_phone !== undefined) {
    if (typeof raw.whatsapp_phone !== "string" || raw.whatsapp_phone.length > 254)
      return NextResponse.json({ error: "Revisá el número de WhatsApp." }, { status: 400 });
    const phone = raw.whatsapp_phone.trim().replace(/[\s()+-]/g, "");
    if (phone && !/^[1-9]\d{7,14}$/.test(phone))
      return NextResponse.json({ error: "Ingresá WhatsApp con código de país, sin enlaces ni extensiones." }, { status: 400 });
    data.whatsapp_phone = phone;
  }
  const { error } = await context.data.backend
    .from("businesses")
    .update(data)
    .eq("id", context.data.business.id);
  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json({ ok: true });
}
