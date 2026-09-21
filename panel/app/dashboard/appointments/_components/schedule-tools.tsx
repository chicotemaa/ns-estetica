"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export type ScheduleBlock = {
  id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  staff_member_id: string | null;
};
type Archived = {
  id: string;
  name: string;
  service: string;
  date: string;
  time: string;
};
export function ScheduleTools({
  date,
  staff,
  onBlocks,
}: {
  date: string;
  staff: { id: string; fullName: string }[];
  onBlocks: (blocks: ScheduleBlock[]) => void;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]),
    [archive, setArchive] = useState<Archived[]>([]);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    id: "",
    date,
    start: "13:00",
    end: "14:00",
    reason: "Almuerzo",
    staffId: "",
  });
  useEffect(() => {
    setForm((f) => (f.id ? f : { ...f, date }));
  }, [date]);
  async function load() {
    const [b, a] = await Promise.all([
      fetch("/api/schedule-blocks", { cache: "no-store" }),
      fetch("/api/appointments/archive", { cache: "no-store" }),
    ]);
    const [bj, aj] = await Promise.all([b.json(), a.json()]);
    if (!b.ok || !a.ok) throw new Error(bj.error || aj.error);
    setBlocks(bj.blocks);
    onBlocks(bj.blocks);
    setArchive(aj.appointments);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function mutate(url: string, method: string, data: unknown) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setForm((f) => ({ ...f, id: "" }));
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="rounded-xl border bg-white p-5 space-y-4"
      aria-label="Bloqueos y turnos eliminados"
    >
      <details>
        <summary className="cursor-pointer font-semibold">
          Bloquear horarios · almuerzos y pausas
        </summary>
        <p className="my-3 text-sm">
          Elegí el día y el período. El bloqueo afecta solo esa fecha y no
          modifica tus horarios habituales.
        </p>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutate("/api/schedule-blocks", form.id ? "PATCH" : "POST", form);
          }}
        >
          <label>
            Fecha
            <Input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            Desde
            <Input
              required
              type="time"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
          </label>
          <label>
            Hasta
            <Input
              required
              type="time"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </label>
          <label>
            Motivo
            <Input
              required
              maxLength={200}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </label>
          <label>
            Profesional
            <select
              className="block w-full rounded border p-2"
              value={form.staffId}
              onChange={(e) => setForm({ ...form, staffId: e.target.value })}
            >
              <option value="">Todo el local</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button disabled={busy}>
              {form.id ? "Guardar bloqueo" : "Bloquear horario"}
            </Button>
            {form.id && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm({ ...form, id: "" })}
              >
                Volver
              </Button>
            )}
          </div>
        </form>
        <div className="mt-4 space-y-2">
          {blocks
            .filter((b) => b.block_date >= date)
            .map((b) => (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded border-l-4 border-amber-600 bg-amber-50 p-3"
                key={b.id}
              >
                <span>
                  <strong>
                    {b.block_date} · {b.start_time.slice(0, 5)}–
                    {b.end_time.slice(0, 5)}
                  </strong>{" "}
                  · {b.reason} ·{" "}
                  {staff.find((s) => s.id === b.staff_member_id)?.fullName ||
                    "Todo el local"}
                </span>
                <div className="flex gap-2">
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() =>
                      setForm({
                        id: b.id,
                        date: b.block_date,
                        start: b.start_time.slice(0, 5),
                        end: b.end_time.slice(0, 5),
                        reason: b.reason,
                        staffId: b.staff_member_id || "",
                      })
                    }
                  >
                    Editar
                  </Button>
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() =>
                      mutate("/api/schedule-blocks", "DELETE", { id: b.id })
                    }
                  >
                    Quitar bloqueo
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </details>
      <details
        onToggle={(e) => {
          if (e.currentTarget.open)
            load().catch((err) => setError(err.message));
        }}
      >
        <summary className="cursor-pointer font-semibold">
          Turnos eliminados · restaurar
        </summary>
        <p className="my-3 text-sm">
          Se conservan los datos y los cobros. Restaurar una reserva activa
          vuelve a comprobar que el horario esté libre.
        </p>
        {archive.length === 0 && <p>No hay turnos eliminados.</p>}
        {archive.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap justify-between gap-2 border-b py-3"
          >
            <span>
              {a.date} {a.time.slice(0, 5)} · {a.name} · {a.service}
            </span>
            <Button
              disabled={busy}
              variant="outline"
              onClick={() =>
                mutate("/api/appointments/archive", "POST", { id: a.id })
              }
            >
              Restaurar turno
            </Button>
          </div>
        ))}
      </details>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
