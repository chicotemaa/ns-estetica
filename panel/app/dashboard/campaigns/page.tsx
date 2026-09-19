import Link from "next/link";
export default function CampaignsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-8">
      <h1 className="text-3xl font-semibold">Campañas</h1>
      <div className="space-y-3 rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-medium">
          Envíos pendientes de configuración
        </h2>
        <p>
          Para enviar campañas hay que conectar un proveedor de WhatsApp o
          email, configurar el remitente y definir los destinatarios que
          aceptaron recibir mensajes.
        </p>
        <p>
          Todavía no se envían mensajes ni se muestran estadísticas de campañas.
        </p>
        <Link className="underline" href="/dashboard/clients">
          Ver los clientes del negocio
        </Link>
      </div>
    </div>
  );
}
