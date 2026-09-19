import Link from "next/link";
import { getManagedBusiness } from "@/lib/managed-business";
import BusinessForm from "./business-form";
import { CashSettings } from "./cash-settings";
export default async function SettingsPage() {
  const result = await getManagedBusiness();
  if (!result.data) throw new Error(result.error);
  const { data, error } = await result.data.backend
    .from("businesses")
    .select()
    .eq("id", result.data.business.id)
    .single();
  if (error || !data) throw new Error("No se pudo cargar la configuración.");
  const people = await result.data.backend
    .from("staff_members")
    .select()
    .eq("business_id", result.data.business.id);
  if (people.error) throw new Error(people.error.message);
  const fields = [
    "name",
    "description",
    "address",
    "phone",
    "email",
    "website",
    "cuit",
    "instagram_handle",
    "whatsapp_phone",
  ] as const;
  const initial = Object.fromEntries(
    fields.map((field) => [field, String(data[field] ?? "")]),
  );
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold">Configuración del negocio</h1>
      <BusinessForm initial={initial} />
      <div className="rounded-2xl border bg-white p-6 space-y-3">
        <h2 className="text-xl font-semibold">Reservas online y señas</h2>
        <p>
          Revisá el acceso de clientes, Mercado Pago, las confirmaciones por
          correo y los pagos que necesitan atención.
        </p>
        <Link
          className="brand-button"
          href="/dashboard/settings/online-booking"
        >
          Ver reservas online
        </Link>
      </div>
      <div className="rounded-2xl border bg-white p-6 space-y-3">
        <h2 className="text-xl font-semibold">
          Identidad y contenido de tu web
        </h2>
        <p>
          Editá colores, logo, fotos, textos, notas y videos desde Mi web.
          Guardá un borrador, revisalo y publicá cuando esté listo.
        </p>
        <Link className="brand-button" href="/dashboard/website">
          Abrir Mi web
        </Link>
      </div>
      <CashSettings
        initialTarget={Number(data.monthly_collection_target || 0)}
        staff={(people.data || []).map((p) => ({
          id: p.id,
          name: p.full_name,
          rate: Number(p.collection_commission_rate || 0),
        }))}
      />
      <div className="rounded-2xl border bg-white p-6 space-y-3">
        <h2 className="text-xl font-semibold">Accesos y horarios</h2>
        <p>
          Las cuentas autorizadas se administran desde Strapi, en Usuarios. El
          rol Business Manager permite acceder a Mi Comercio.
        </p>
        <Link className="underline" href="/dashboard/hours">
          Administrar horarios y reglas de reserva
        </Link>
      </div>
    </div>
  );
}
