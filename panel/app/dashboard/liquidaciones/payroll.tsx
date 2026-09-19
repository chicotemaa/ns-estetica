"use client";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Metric,
  MethodSelect,
  fieldClass,
  money,
  shortDate,
  useFinanceWrite,
} from "@/components/dashboard/finance-ui";
import type { PayrollData } from "@/lib/finance-types";
export function Payroll({
  data,
  periodKey,
}: {
  data: PayrollData;
  periodKey?: string;
}) {
  const router = useRouter(),
    write = useFinanceWrite(),
    [dialog, setDialog] = useState<"hours" | "payroll" | null>(null),
    [voidId, setVoidId] = useState<string | null>(null);
  const selectedPeriod =
    periodKey || (data.person?.cadence === "weekly" ? "week-1" : "first");
  const weekly = data.person?.cadence === "weekly",
    monthly = data.person?.cadence === "monthly";
  const days = new Date(
    Number(data.month.slice(0, 4)),
    Number(data.month.slice(5)),
    0,
  ).getDate();
  const firstEnd =
    1 +
    (((data.person?.weekday ?? 0) -
      new Date(`${data.month}-01T12:00:00Z`).getUTCDay() +
      7) %
      7);
  const weeks = Math.floor((days - firstEnd) / 7) + 1;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (
      await write.save(dialog, {
        ...values,
        staffId: data.person?.id,
        month: data.month,
        period: selectedPeriod,
        ...(dialog === "payroll"
          ? { expectedAmountCents: data.unpaidCents }
          : {}),
      })
    )
      setDialog(null);
  }
  const blocked =
    data.manualPayouts.length > 0 || data.unpricedHours.length > 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Equipo</p>
          <h1 className="text-3xl font-semibold">Liquidaciones y jornadas</h1>
          <p className="mt-2 text-slate-600">
            Revisá las horas y comisiones del período antes de registrar el
            pago.
          </p>
        </div>
        <Link className="text-sm underline" href="/dashboard/employees">
          Configurar empleados y forma de pago
        </Link>
      </div>
      <form className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Mes de cierre
          <input
            className={fieldClass}
            type="month"
            name="month"
            required
            defaultValue={data.month}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Empleado
          <select
            className={fieldClass}
            name="staffId"
            value={data.person?.id || ""}
            onChange={(e) =>
              router.push(
                `/dashboard/liquidaciones?month=${data.month}&staffId=${e.target.value}`,
              )
            }
          >
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Período
          <select
            className={fieldClass}
            name="period"
            defaultValue={selectedPeriod}
            key={`${data.person?.id}:${selectedPeriod}:${data.month}`}
          >
            {weekly ? (
              Array.from({ length: weeks }, (_, i) => (
                <option key={i} value={`week-${i + 1}`}>
                  Semana que cierra el {firstEnd + i * 7}
                </option>
              ))
            ) : monthly ? (
              <option value="first">Mes completo</option>
            ) : (
              <>
                <option value="first">Primera quincena</option>
                <option value="second">Segunda quincena</option>
              </>
            )}
          </select>
        </label>
        <Button variant="outline">Ver liquidación</Button>
      </form>
      {data.person && data.period && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-100 p-4">
          <div>
            <p className="font-medium">
              {data.person.name}
              {data.person.role ? ` · ${data.person.role}` : ""}
            </p>
            <p className="text-sm text-slate-600">
              Del {shortDate(data.period.start)} al {shortDate(data.period.end)}{" "}
              · Pago previsto: {shortDate(data.period.payDate)}
            </p>
            <p className="text-xs text-slate-500">
              Modalidad actual:{" "}
              {data.person.mode === "hourly"
                ? "por hora trabajada"
                : "porcentaje sobre lo cobrado"}
              . El detalle conserva la tarifa de cada registro.
            </p>
          </div>
          <div className="flex gap-2">
            {data.person.mode === "hourly" && (
              <Button variant="outline" onClick={() => setDialog("hours")}>
                Cargar horas
              </Button>
            )}
            <Button
              disabled={!data.unpaidCents || blocked || write.busy}
              onClick={() => setDialog("payroll")}
            >
              Registrar pago
            </Button>
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Generado en el período" value={data.earnedCents} />
        <Metric label="Ya liquidado" value={data.paidCents} />
        <Metric label="Pendiente de liquidar" value={data.unpaidCents} />
      </div>
      {!dialog && !voidId && write.feedback}
      {!data.history.length && data.earnedCents > 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          El saldo se calcula con los pagos registrados en esta plataforma.
          Antes del primer pago, revisá los sueldos que ya se hayan abonado para
          establecer el saldo inicial correcto.
        </p>
      )}
      {blocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold">
            Hay registros anteriores para conciliar
          </p>
          {data.manualPayouts.map((p) => (
            <p key={p.id}>
              Pago manual del {shortDate(p.date)}: {money(p.amountCents)} (
              {p.category}).
            </p>
          ))}
          {data.unpricedHours.map((h) => (
            <p key={h.id}>
              {h.hours} horas del {shortDate(h.date)} sin tarifa guardada.
            </p>
          ))}
          <p className="mt-2">
            El pago del período queda bloqueado hasta revisar estos registros
            para evitar pagar dos veces o usar una tarifa incorrecta.
          </p>
        </div>
      )}
      <section className="overflow-x-auto rounded-2xl border bg-white">
        <div className="border-b p-4">
          <h2 className="font-semibold">Detalle del período</h2>
          <p className="text-xs text-slate-500">
            Cada cobro parcial genera su comisión. Las horas corresponden a
            jornadas cargadas.
          </p>
        </div>
        <Table
          mobileLabels={[
            "Fecha",
            "Trabajo o jornada",
            "Base y tarifa",
            "A pagar",
            "Estado",
          ]}
          className="w-full min-w-[680px] text-sm"
        >
          <TableHeader className="bg-slate-50 text-left">
            <TableRow>
              {[
                "Fecha",
                "Trabajo o jornada",
                "Base y tarifa",
                "A pagar",
                "Estado",
              ].map((t) => (
                <TableHead className="p-4 font-medium" key={t}>
                  {t}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.lines.map((line) => (
              <TableRow className="border-t" key={line.key}>
                <TableCell className="p-4">{shortDate(line.date)}</TableCell>
                <TableCell className="p-4">{line.description}</TableCell>
                <TableCell className="p-4">
                  {line.kind === "payment"
                    ? `${money(Math.round(line.base * 100))} × ${line.rate}%`
                    : `${line.base} h × ${money(Math.round(line.rate * 100))}`}
                </TableCell>
                <TableCell className="p-4 font-medium">
                  {money(line.amountCents)}
                </TableCell>
                <TableCell className="p-4">
                  {line.paid ? (
                    <span className="text-emerald-700">Liquidado</span>
                  ) : (
                    "Pendiente"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data.lines.length && (
          <p className="p-8 text-center text-sm text-slate-500">
            No hay comisiones ni horas con importe para este período.
          </p>
        )}
      </section>
      {!!data.timeLogs.length && (
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold">Jornadas registradas</h2>
          <div className="mt-3 divide-y">
            {data.timeLogs.map((h) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                key={h.id}
              >
                <div>
                  <p>
                    {shortDate(h.date)} · {h.hours} horas ·{" "}
                    {money(h.amountCents)}
                  </p>
                  {h.notes && (
                    <p className="text-xs text-slate-500">{h.notes}</p>
                  )}
                </div>
                {!h.paid && h.hours > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVoidId(h.id)}
                  >
                    Anular jornada
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="rounded-2xl border bg-white p-4">
        <h2 className="font-semibold">Historial de pagos del período</h2>
        {data.history.map((p) => (
          <details className="mt-3 rounded-lg border p-3 text-sm" key={p.id}>
            <summary className="cursor-pointer font-medium">
              {shortDate(p.date)} · {money(p.amountCents)} ·{" "}
              {p.method === "cash"
                ? "Efectivo"
                : p.method === "transfer"
                  ? "Transferencia"
                  : p.method}
            </summary>
            <p className="mt-2 text-slate-500">
              Período: {shortDate(p.start)} al {shortDate(p.end)}
            </p>
            <ul className="mt-2 space-y-1">
              {p.detail?.map((l) => (
                <li key={l.key}>
                  {shortDate(l.date)} · {l.description} · {money(l.amountCents)}
                </li>
              ))}
            </ul>
          </details>
        ))}
        {!data.history.length && (
          <p className="mt-3 text-sm text-slate-500">
            Todavía no se registraron pagos de esta liquidación.
          </p>
        )}
      </section>
      <Dialog
        open={!!dialog}
        onOpenChange={(open) => {
          if (!open && !write.busy) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "hours"
                ? "Cargar jornada trabajada"
                : "Registrar pago al empleado"}
            </DialogTitle>
            <DialogDescription>
              {data.person?.name}
              {dialog === "payroll"
                ? ` · ${money(data.unpaidCents)} pendientes`
                : " · Se guardará la tarifa por hora configurada actualmente."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <label className="grid gap-1 text-sm">
              {dialog === "hours" ? "Fecha trabajada" : "Fecha del pago"}
              <input
                className={fieldClass}
                name="date"
                type="date"
                defaultValue={data.today}
                max={data.today}
                required
              />
            </label>
            {dialog === "hours" ? (
              <>
                <label className="grid gap-1 text-sm">
                  Horas trabajadas
                  <input
                    className={fieldClass}
                    name="hours"
                    type="number"
                    min="0.01"
                    max="24"
                    step="0.01"
                    required
                    placeholder="Ej.: 7.5"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Notas
                  <textarea
                    className={fieldClass}
                    name="notes"
                    maxLength={2000}
                  />
                </label>
              </>
            ) : (
              <>
                <MethodSelect />
                <p className="text-sm text-slate-600">
                  Se registrará una salida de caja por {money(data.unpaidCents)}{" "}
                  y se marcarán como pagados los conceptos pendientes. Confirmá
                  cuando hayas realizado el pago.
                </p>
              </>
            )}
            {write.feedback}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={write.busy}
                onClick={() => setDialog(null)}
              >
                Volver
              </Button>
              <Button disabled={write.busy}>
                {write.busy
                  ? "Guardando…"
                  : dialog === "hours"
                    ? "Guardar jornada"
                    : "Confirmar pago realizado"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!voidId}
        onOpenChange={(open) => {
          if (!open && !write.busy) setVoidId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular jornada</DialogTitle>
            <DialogDescription>
              Se conserva la anotación y se quitan las horas y el importe
              pendientes de liquidar. Podrás cargar la jornada correcta.
            </DialogDescription>
          </DialogHeader>
          {write.feedback}
          <Button
            disabled={write.busy}
            onClick={async () => {
              if (await write.save("void-hours", { id: voidId }))
                setVoidId(null);
            }}
          >
            Confirmar anulación
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
