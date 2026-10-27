import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Google Calendar y privacidad · Natalia Sánchez Estética",
  description: "Uso de los datos de Google Calendar en la agenda de Natalia Sánchez Estética.",
};

export default function GoogleCalendarPrivacyPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12 text-stone-900">
      <article className="mx-auto max-w-3xl space-y-8 rounded-2xl border border-stone-200 bg-white p-6 sm:p-10">
        <header className="space-y-3">
          <p className="font-semibold text-stone-600">Natalia Sánchez Estética</p>
          <h1 className="text-3xl font-bold tracking-tight">Google Calendar y privacidad</h1>
          <p className="leading-7">La conexión es opcional y permite al administrador sincronizar la agenda de la estética con un calendario de Google que elija.</p>
          <p className="text-sm text-stone-600">Actualizado el 26 de octubre de 2026.</p>
        </header>
        <section className="space-y-3 leading-7">
          <h2 className="text-xl font-semibold">Responsable y contacto</h2>
          <p>Esta integración pertenece a Natalia Sánchez Estética, Wilde 12, local 1, planta baja. Para consultas sobre los datos o solicitudes de eliminación, escribí a <a className="underline" href="mailto:info@nataliasanchez.com.ar">info@nataliasanchez.com.ar</a>.</p>
        </section>
        <section className="space-y-3 leading-7">
          <h2 className="text-xl font-semibold">Datos a los que accede la aplicación</h2>
          <p>Google solicita permiso para consultar tu lista de calendarios y para ver y editar eventos. Usamos la lista para mostrar los calendarios editables y operamos sobre el que selecciones. La aplicación recibe los eventos de ese calendario para comparar fechas, horarios, duración, cancelaciones y disponibilidad.</p>
          <p>En el servidor guardamos el identificador y nombre del calendario elegido, una credencial de actualización cifrada, referencias a eventos sincronizados, intervalos ocupados y datos técnicos de sincronización. Para mostrar el detalle de los eventos ocupados al administrador, también guardamos su título, descripción, ubicación, fechas, organizador, creador, participantes y respuestas, estado, visibilidad y enlaces de Google Calendar y Google Meet, cuando Google los proporciona. Estos detalles se muestran solo en el panel administrativo; la reserva pública recibe únicamente la disponibilidad.</p>
        </section>
        <section className="space-y-3 leading-7">
          <h2 className="text-xl font-semibold">Para qué se usan los datos</h2>
          <p>Los turnos y las pausas del panel se crean o actualizan como eventos privados en Google. El título del turno incluye el nombre del cliente y el servicio. Al cancelar o eliminar un turno en el panel se retira el evento de Google. No se envían invitaciones a clientes.</p>
          <p>Mover un evento vinculado en Google puede reprogramar el turno del panel; eliminarlo puede cancelarlo conservando su historial. Otros eventos ocupados del calendario elegido se usan para bloquear horarios del local. Los conflictos se muestran al administrador para su resolución.</p>
          <p>Los datos obtenidos de Google se usan exclusivamente para esta función de agenda. No se venden ni se usan para publicidad, perfiles comerciales o entrenamiento de modelos de inteligencia artificial. Su uso y transferencia se ajustan a la <a className="underline" href="https://developers.google.com/terms/api-services-user-data-policy">Política de Datos del Usuario de los Servicios de las APIs de Google</a>, incluidos los requisitos de Uso Limitado.</p>
        </section>
        <section className="space-y-3 leading-7">
          <h2 className="text-xl font-semibold">Almacenamiento y acceso</h2>
          <p>La conexión con Google se realiza mediante OAuth y HTTPS. El panel no solicita ni almacena la contraseña de Google. Las credenciales de actualización se cifran en el backend y no se entregan al navegador.</p>
          <p>El backend y la base de datos del negocio se alojan en Railway. Google recibe los eventos exportados. El acceso a la configuración se limita al administrador del negocio; los eventos de Google también quedan sujetos a los permisos que ya tenga el calendario seleccionado.</p>
        </section>
        <section className="space-y-3 leading-7">
          <h2 className="text-xl font-semibold">Cómo desconectar y eliminar los datos</h2>
          <p>En Configuración → Google Calendar → Desconectar se desactiva la sincronización, se eliminan las credenciales guardadas y se quitan los bloqueos importados. Los turnos del negocio y los eventos que ya están en Google se conservan. También se conservan referencias de sincronización para evitar duplicados al reconectar el mismo calendario.</p>
          <p>Podés revocar el permiso desde <a className="underline" href="https://myaccount.google.com/connections">las conexiones de tu cuenta de Google</a>. Para solicitar la eliminación de las referencias restantes o consultar la conservación de tus datos, contactá a info@nataliasanchez.com.ar.</p>
        </section>
        <footer className="flex flex-wrap gap-6 border-t border-stone-200 pt-6">
          <a className="font-semibold underline" href="https://www.nataliasanchez.com.ar/">Web de Natalia Sánchez</a>
          <Link className="font-semibold underline" href="/dashboard/settings/google-calendar">Configurar Google Calendar</Link>
        </footer>
      </article>
    </main>
  );
}
