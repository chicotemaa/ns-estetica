"use client";
import Link from "next/link";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  cashMetrics,
  outstandingAppointments,
  sumMoney,
} from "@/lib/cash-metrics";
import {
  formatCurrency,
  type PaymentRecord,
  type AppointmentRecord,
  type ExpenseRecord,
  type PayoutRecord,
  type StaffRecord,
  type WorkRecord,
} from "@/lib/business-shared";
import { CheckoutButton } from "./checkout-button";
export function DailyCash({
  payments,
  expenses,
  payouts,
  appointments,
  staff,
  today,
  timeZone,
  target,
  workRecords = [],
}: {
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  payouts: PayoutRecord[];
  appointments: AppointmentRecord[];
  staff: StaffRecord[];
  today: string;
  timeZone: string;
  target: number;
  workRecords?: WorkRecord[];
}) {
  const [date, setDate] = useState(today);
  const data = cashMetrics(payments, expenses, payouts, date, timeZone);
  const due = outstandingAppointments(appointments, payments);
  const realized = appointments.filter(
    (a) => a.appointmentDate === date && a.status === "completed",
  );
  const completedWorks = workRecords.filter((w) => w.workDate === date);
  const workDue = workRecords
    .filter((w) => w.collectionVerified)
    .map((w) => ({
      ...w,
      balance:
        Math.max(
          0,
          Math.round(w.amount * 100) -
            Math.round(
              sumMoney(
                payments.filter(
                  (p) => p.workRecordId === w.id && p.status === "completed",
                ),
                (p) => p.amount,
              ) * 100,
            ),
        ) / 100,
    }))
    .filter((w) => w.balance > 0);
  const methods = {
    cash: "Efectivo",
    transfer: "Transferencia",
    card: "Tarjeta",
    mercado_pago: "Mercado Pago",
    other: "Otros",
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Caja diaria</h2>
        <label className="text-sm">
          Fecha{" "}
          <input
            aria-label="Fecha de caja"
            className="rounded border p-2"
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </label>
        <Link className="text-sm underline" href="/dashboard/payments">
          Registrar cobro o egreso
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Cobrado en el día", data.collections],
          ["Gastos y proveedores", data.dailyExpenses],
          ["Pagos al equipo y retiros", data.dailyPayouts],
          ["Movimiento neto del día", data.movementNet],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {formatCurrency(Number(value))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        {realized.length + completedWorks.length} atenciones realizadas · valor{" "}
        {formatCurrency(
          sumMoney(realized, (a) => a.price) +
            sumMoney(completedWorks, (w) => w.amount),
        )}
        . El movimiento neto descuenta cada egreso una vez; no incluye saldo de
        apertura.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cobros por medio de pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(methods).map(([key, name]) => (
              <div className="flex justify-between" key={key}>
                <span>{name}</span>
                <strong>
                  {formatCurrency(
                    sumMoney(
                      data.daily.filter((p) => p.method === key),
                      (p) => p.amount,
                    ),
                  )}
                </strong>
              </div>
            ))}
            {data.undated > 0 && (
              <p className="text-sm text-amber-800">
                {data.undated} cobros sin fecha: revisalos en Cobros para
                incluirlos en el período correcto.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Objetivo mensual · {date.slice(0, 7)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xl font-semibold">
              {formatCurrency(data.monthlyCollections)}{" "}
              <span className="text-sm font-normal">
                de {formatCurrency(target)}
              </span>
            </p>
            {target > 0 ? (
              <>
                <progress
                  className="h-3 w-full accent-emerald-600"
                  max={target}
                  value={Math.min(target, data.monthlyCollections)}
                  aria-label="Avance del objetivo mensual"
                />
                <p>
                  {Math.round((data.monthlyCollections / target) * 100)}%
                  alcanzado · faltan{" "}
                  {formatCurrency(
                    Math.max(0, target - data.monthlyCollections),
                  )}
                </p>
              </>
            ) : (
              <p>Configurá un objetivo para ver el avance.</p>
            )}
            <Link className="text-sm underline" href="/dashboard/settings">
              Cambiar objetivo y comisiones
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comisiones sobre cobros · {date.slice(0, 7)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {staff.map((person) => (
              <div key={person.id} className="flex justify-between">
                <span>{person.fullName}</span>
                <strong>
                  {formatCurrency(
                    sumMoney(
                      data.monthly.filter((p) => p.staffMemberId === person.id),
                      (p) => p.commissionAmount || 0,
                    ),
                  )}
                </strong>
              </div>
            ))}
            <p className="text-sm text-slate-600">
              Comisiones generadas por los cobros vinculados a atenciones. Se
              descuentan de caja cuando registrás el pago al equipo.
            </p>
            {data.unassigned.length > 0 && (
              <p className="text-sm text-amber-800">
                {data.unassigned.length} cobros del mes sin comisión calculada (
                {formatCurrency(sumMoney(data.unassigned, (p) => p.amount))}).
                No se les asigna un porcentaje automáticamente.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Atenciones con saldo pendiente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              {due.length} turnos ·{" "}
              {formatCurrency(sumMoney(due, (a) => a.balance))} pendientes de
              vincular a cobros.
            </p>
            <p className="text-xs text-slate-500">
              Los cobros manuales sin turno vinculado no cancelan estos saldos.
            </p>
            {workDue.length > 0 && (
              <p className="text-sm">
                {workDue.length} atenciones sin turno ·{" "}
                {formatCurrency(sumMoney(workDue, (w) => w.balance))}.{" "}
                <Link className="underline" href="/dashboard/atenciones?month=">
                  Cobrar atención
                </Link>
              </p>
            )}
            {due.slice(0, 8).map(({ appointment, balance }) => (
              <div
                key={appointment.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"
              >
                <div>
                  <p>{appointment.customerName}</p>
                  <p className="text-sm text-slate-600">
                    {appointment.serviceName} · {formatCurrency(balance)}
                  </p>
                </div>
                <CheckoutButton appointment={appointment} />
              </div>
            ))}
            {due.length > 8 && (
              <Link className="underline" href="/dashboard/appointments">
                Ver los demás turnos en agenda
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
