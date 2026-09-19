"use client";
export default function DashboardError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div role="alert" className="m-8 space-y-4 rounded-2xl border p-6">
      <h1 className="text-xl font-semibold">
        No pudimos cargar los datos del negocio
      </h1>
      <p>
        Revisá la conexión e intentá nuevamente. Si el problema continúa,
        verificá la configuración del servidor.
      </p>
      <button
        className="rounded-lg bg-slate-900 px-4 py-2 text-white"
        onClick={reset}
      >
        Volver a intentar
      </button>
    </div>
  );
}
