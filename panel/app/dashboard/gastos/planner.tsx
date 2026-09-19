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
import type { ExpensePlanRow, ExpensePlanningData } from "@/lib/finance-types";
import {
  expensePlanningSummary,
  filterExpenses,
  type ExpenseFilter,
} from "@/lib/expense-planning";
export function ExpensesPlanner({ data }: { data: ExpensePlanningData }) {
  const [dialog, setDialog] = useState<{
      action: string;
      row?: ExpensePlanRow;
    } | null>(null),
    write = useFinanceWrite();
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState<ExpenseFilter>("all"),
    [category, setCategory] = useState("");
  const summary = expensePlanningSummary(data.rows, data.today);
  const filtered = filterExpenses(data.rows, search, status, category);
  const categories = [
    ...new Set(data.rows.map((r) => r.category || "Sin categoría")),
  ].sort();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const values = Object.fromEntries(new FormData(event.currentTarget)),
      row = dialog.row;
    const input = {
      ...values,
      month: data.month,
      ...(row
        ? {
            planId: row.id,
            expectedAmountCents: row.amountCents,
            expectedDueDate: row.dueDate,
          }
        : {}),
    };
    if (await write.save(dialog.action, input)) setDialog(null);
  }
  const titles: Record<string, string> = {
    plan: "Programar gasto",
    "edit-expense": "Ajustar gasto del mes",
    "pay-expense": "Registrar pago del gasto",
    "cancel-expense": "Anular este vencimiento",
    "stop-plan": "Dejar de repetir el gasto",
  };
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Administración</p>
          <h1 className="text-3xl font-semibold">Gastos y vencimientos</h1>
          <p className="mt-2 text-slate-600">
            Planificá los gastos fijos y los de cada mes. Registrá el pago
            cuando se realice.
          </p>
        </div>
        <Button onClick={() => setDialog({ action: "plan" })}>
          Programar gasto
        </Button>
      </div>
      <form className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Mes
          <input
            className={fieldClass}
            type="month"
            name="month"
            defaultValue={data.month}
            required
          />
        </label>
        <Button variant="outline">Ver mes</Button>
        <Link
          className="px-2 py-2 text-sm underline"
          href="/dashboard/payments"
        >
          Ver movimientos de caja
        </Link>
        <Link
          className="px-2 py-2 text-sm underline"
          href="/dashboard/liquidaciones"
        >
          Planificar pagos al equipo
        </Link>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Programado para el mes"
          value={data.totals.plannedCents}
        />
        <Metric label="Pendiente de pago" value={data.totals.pendingCents} />
        <Metric label="Vencido" value={data.totals.overdueCents} />
        <Metric
          label="Gastos pagados en el mes"
          value={data.totals.cashExpensesCents}
          help="Incluye gastos directos y programados, según la fecha real del pago."
        />
      </div>
      {!dialog && write.feedback}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Previsión de pagos</h2>
          <p className="mt-3 text-2xl font-semibold">
            {money(summary.upcomingCents)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {summary.upcomingCount} vencimientos en los próximos 7 días, dentro
            del mes seleccionado.
          </p>
          <Link
            href="/dashboard/notifications?tipo=expense"
            className="mt-3 inline-flex min-h-11 items-center text-sm underline"
          >
            Ver avisos de gastos y vencidos de otros meses
          </Link>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Distribución de lo programado</h2>
          {summary.categories.length ? (
            <ul className="mt-3 space-y-2">
              {summary.categories.map((item) => (
                <li
                  key={item.name}
                  className="flex min-w-0 flex-wrap justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 max-w-full break-words">{item.name}</span>
                  <span>
                    {money(item.plannedCents)}{" "}
                    <span className="text-slate-500">
                      · {money(item.pendingCents)} pendiente
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              La distribución aparece al programar gastos.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Excluye vencimientos anulados. Los gastos directos ya pagados se
            consultan en Caja.
          </p>
        </section>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Buscar gasto
          <input
            type="search"
            className={fieldClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Concepto, proveedor o nota"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Estado
          <select
            className={fieldClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as ExpenseFilter)}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="overdue">Vencidos</option>
            <option value="paid">Pagados</option>
            <option value="cancelled">Anulados</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Categoría
          <select
            className={fieldClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-sm text-slate-500">
        {filtered.length} de {data.rows.length} gastos. Los totales superiores
        corresponden al mes completo.
      </p>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <Table
          mobileLabels={[
            "Concepto",
            "Vencimiento",
            "Importe",
            "Estado",
            "Acciones",
          ]}
          className="w-full min-w-[760px] text-sm"
        >
          <TableHeader className="border-b bg-slate-50 text-left text-slate-600">
            <TableRow>
              {["Concepto", "Vencimiento", "Importe", "Estado", "Acciones"].map(
                (t) => (
                  <TableHead className="p-4 font-medium" key={t}>
                    {t}
                  </TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id} className="border-b last:border-0">
                <TableCell className="p-4">
                  <p className="font-medium">{row.title}</p>
                  <p className="text-xs text-slate-500">
                    {row.category} ·{" "}
                    {row.recurrence === "monthly"
                      ? "Se repite cada mes"
                      : "Solo este mes"}
                  </p>
                  {row.vendor && (
                    <p className="text-xs text-slate-500">{row.vendor}</p>
                  )}
                </TableCell>
                <TableCell className="p-4">{shortDate(row.dueDate)}</TableCell>
                <TableCell className="p-4 font-medium">
                  {money(row.amountCents)}
                </TableCell>
                <TableCell className="p-4">
                  <span
                    className={
                      row.overdue
                        ? "text-red-700"
                        : row.state === "paid"
                          ? "text-emerald-700"
                          : "text-slate-600"
                    }
                  >
                    {row.state === "paid"
                      ? "Pagado"
                      : row.state === "cancelled"
                        ? "Anulado"
                        : row.overdue
                          ? "Vencido"
                          : "Pendiente"}
                  </span>
                  {row.paidDate && (
                    <p className="text-xs">
                      {shortDate(row.paidDate)} ·{" "}
                      {row.method === "cash"
                        ? "Efectivo"
                        : row.method === "transfer"
                          ? "Transferencia"
                          : row.method}
                    </p>
                  )}
                </TableCell>
                <TableCell className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {row.state === "pending" && (
                      <>
                        <Button
                          size="sm"
                          disabled={write.busy}
                          onClick={() =>
                            setDialog({ action: "pay-expense", row })
                          }
                        >
                          Registrar pago
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setDialog({ action: "edit-expense", row })
                          }
                        >
                          Ajustar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDialog({ action: "cancel-expense", row })
                          }
                        >
                          Anular mes
                        </Button>
                      </>
                    )}
                    {row.recurrence === "monthly" &&
                      !row.endMonth &&
                      data.month >= data.today.slice(0, 7) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDialog({ action: "stop-plan", row })
                          }
                        >
                          Dejar de repetir
                        </Button>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data.rows.length && (
          <div className="p-10 text-center">
            <p className="font-medium">
              Todavía no hay gastos programados para este mes.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Podés cargar alquiler, expensas o cualquier otro compromiso, con
              su importe y vencimiento.
            </p>
          </div>
        )}
        {!!data.rows.length && !filtered.length && (
          <div className="p-8 text-center">
            <p>No hay gastos con esos filtros.</p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setCategory("");
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>
      <Dialog
        open={!!dialog}
        onOpenChange={(open) => {
          if (!open && !write.busy) setDialog(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog && titles[dialog.action]}</DialogTitle>
            <DialogDescription>
              {dialog?.row
                ? `${dialog.row.title} · ${shortDate(dialog.row.dueDate)} · ${money(dialog.row.amountCents)}`
                : "Elegí si se repite mensualmente o si corresponde a un solo mes."}
            </DialogDescription>
          </DialogHeader>
          {dialog && (
            <form onSubmit={submit} className="space-y-4">
              {dialog.action === "plan" && (
                <>
                  <label className="grid gap-1 text-sm">
                    Concepto
                    <input
                      name="title"
                      className={fieldClass}
                      required
                      maxLength={300}
                      placeholder="Ej.: alquiler"
                    />
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      Categoría
                      <input
                        className={fieldClass}
                        name="category"
                        list="expense-categories"
                        defaultValue="Gastos generales"
                      />
                      <datalist id="expense-categories">
                        {[
                          "Alquiler",
                          "Expensas",
                          "Servicios",
                          "Insumos",
                          "Mantenimiento",
                          "Gastos generales",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </datalist>
                    </label>
                    <label className="grid gap-1 text-sm">
                      Proveedor
                      <input name="vendor" className={fieldClass} />
                    </label>
                  </div>
                  <label className="grid gap-1 text-sm">
                    Frecuencia
                    <select
                      className={fieldClass}
                      name="recurrence"
                      defaultValue="monthly"
                    >
                      <option value="monthly">
                        Mensual, desde {data.month}
                      </option>
                      <option value="once">Solo este mes</option>
                    </select>
                  </label>
                </>
              )}
              {["plan", "edit-expense"].includes(dialog.action) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    Importe
                    <input
                      className={fieldClass}
                      name="amount"
                      type="number"
                      min="0.01"
                      max="10000000000"
                      step="0.01"
                      required
                      defaultValue={
                        dialog.row ? dialog.row.amountCents / 100 : undefined
                      }
                    />
                  </label>
                  {dialog.action === "plan" ? (
                    <label className="grid gap-1 text-sm">
                      Día de vencimiento
                      <input
                        className={fieldClass}
                        name="dueDay"
                        type="number"
                        min="1"
                        max="31"
                        defaultValue="10"
                        required
                      />
                    </label>
                  ) : (
                    <label className="grid gap-1 text-sm">
                      Vencimiento
                      <input
                        className={fieldClass}
                        name="dueDate"
                        type="date"
                        defaultValue={dialog.row?.dueDate}
                        required
                      />
                    </label>
                  )}
                </div>
              )}
              {dialog.action === "plan" && (
                <p className="text-xs text-slate-500">
                  Si el mes tiene menos días, vence el último día del mes. Podés
                  ajustar el importe de cada mes antes de pagarlo.
                </p>
              )}
              {dialog.action === "edit-expense" && (
                <p className="text-sm text-slate-600">
                  Este ajuste corresponde únicamente a {data.month}. Los demás
                  meses conservan el importe programado.
                </p>
              )}
              {dialog.action === "pay-expense" && (
                <>
                  <label className="grid gap-1 text-sm">
                    Fecha del pago
                    <input
                      className={fieldClass}
                      type="date"
                      name="date"
                      defaultValue={data.today}
                      max={data.today}
                      required
                    />
                  </label>
                  <MethodSelect />
                  <p className="text-sm text-slate-600">
                    Se registrará la salida de {money(dialog.row!.amountCents)}{" "}
                    en caja. Confirmá cuando el pago esté realizado.
                  </p>
                </>
              )}
              {dialog.action === "cancel-expense" && (
                <p className="text-sm">
                  Se anula solamente el vencimiento de {data.month}.
                </p>
              )}
              {dialog.action === "stop-plan" && (
                <p className="text-sm">
                  Se dejará de programar desde {data.month}, incluido este mes.
                  Los pagos realizados se conservan.
                </p>
              )}
              {["plan", "edit-expense", "pay-expense"].includes(
                dialog.action,
              ) && (
                <label className="grid gap-1 text-sm">
                  Notas
                  <textarea
                    className={fieldClass}
                    name="notes"
                    maxLength={2000}
                    defaultValue={dialog.row?.notes}
                  />
                </label>
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
                    : dialog.action === "pay-expense"
                      ? "Confirmar pago realizado"
                      : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
