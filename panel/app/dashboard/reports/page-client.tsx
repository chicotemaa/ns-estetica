"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardPageShell } from "@/components/dashboard/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AppointmentRecord,
  CustomerRecord,
  ExpenseRecord,
  PaymentRecord,
  PayoutRecord,
  ServiceRecord,
  StaffRecord,
  StaffTimeLogRecord,
} from "@/lib/business-shared";
import { formatCurrency } from "@/lib/business-shared";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CalendarRange,
  Download,
  Scissors,
  Users,
  Wallet,
} from "lucide-react";

import {
  buildReportsSnapshot,
  downloadReportsCsv,
  formatReportValue,
  getComparisonClassName,
  REPORT_PERIOD_OPTIONS,
} from "./report-utils";
import type { ReportPeriod } from "./report-types";

interface ReportsPageClientProps {
  appointments: AppointmentRecord[];
  workRecords?: import("@/lib/business-shared").WorkRecord[];
  businessName: string;
  customers: CustomerRecord[];
  expenses: ExpenseRecord[];
  isLive: boolean;
  payments: PaymentRecord[];
  payouts: PayoutRecord[];
  services: ServiceRecord[];
  staffMembers: StaffRecord[];
  staffTimeLogs: StaffTimeLogRecord[];
  timeZone: string;
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function BarList({
  rows,
  formatter,
}: {
  rows: Array<{ label: string; value: number; percentage: number }>;
  formatter: (value: number) => string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No hay datos suficientes en el período seleccionado.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label} className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-700">{row.label}</span>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900">
                {formatter(row.value)}
              </div>
              <div className="text-xs text-slate-500">
                {row.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-sky-500"
              style={{ width: `${Math.min(row.percentage, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportsPageClient({
  appointments,
  workRecords,
  businessName,
  customers,
  expenses,
  isLive,
  payments,
  payouts,
  services,
  staffMembers,
  staffTimeLogs,
  timeZone,
}: ReportsPageClientProps) {
  const [period, setPeriod] = useState<ReportPeriod>("month");

  const snapshot = useMemo(
    () =>
      buildReportsSnapshot(
        {
          appointments,
          workRecords,
          customers,
          expenses,
          payments,
          payouts,
          services,
          staffMembers,
          staffTimeLogs,
          timeZone,
        },
        period,
      ),
    [
      workRecords,
      appointments,
      customers,
      expenses,
      payments,
      payouts,
      services,
      staffMembers,
      staffTimeLogs,
      timeZone,
      period,
    ],
  );

  const maxTrendRevenue = Math.max(
    ...snapshot.trendPoints.map((point) => point.revenue),
    1,
  );

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        actions={
          <Button
            variant="outline"
            onClick={() => downloadReportsCsv(snapshot)}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        }
        badge={
          !isLive ? (
            <Badge className="bg-amber-100 text-amber-900">
              Modo demostración
            </Badge>
          ) : null
        }
        description={`La evolución de ${businessName}, en números.`}
        eyebrow="Analytics"
        supporting={
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
            <CalendarRange className="h-3.5 w-3.5" />
            <span className="font-medium text-slate-900">
              {snapshot.periodLabel}
            </span>
            <span>{snapshot.rangeLabel}</span>
          </div>
        }
        title="Reportes y estadísticas"
      />

      <Card>
        <CardHeader>
          <CardTitle>Período</CardTitle>
          <CardDescription>
            El filtro afecta todo el módulo: resumen, ingresos, servicios,
            equipo y clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {REPORT_PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={period === option.value ? "default" : "outline"}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atenciones sin turno del período</CardTitle>
          <CardDescription>
            {snapshot.workSummary.count} trabajos · importe{" "}
            {formatCurrency(snapshot.workSummary.amount)}. Los cobros de estas
            atenciones están incluidos en los ingresos del período.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-auto">
            {snapshot.workSummary.services.map((item) => (
              <p
                className="flex justify-between gap-3 border-b py-2 text-sm"
                key={item.name}
              >
                <span>
                  {item.name} · {item.count}
                </span>
                <strong>{formatCurrency(item.amount)}</strong>
              </p>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Las estadísticas de citas y clientes identificados se basan en
            reservas y fichas del sistema. Consultá el detalle de los trabajos
            en Atenciones.
          </p>
        </CardContent>
      </Card>
      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto">
          <TabsList className="w-full">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="revenue">Ingresos</TabsTrigger>
            <TabsTrigger value="services">Servicios</TabsTrigger>
            <TabsTrigger value="employees">Equipo</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {snapshot.overviewMetrics.map((metric) => (
              <Card key={metric.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatReportValue(metric.format, metric.value)}
                  </div>
                  <p className="text-xs text-slate-500">{metric.helper}</p>
                  <p
                    className={`mt-2 text-xs font-medium ${getComparisonClassName(
                      metric.comparison.tone,
                    )}`}
                  >
                    {metric.comparison.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia del período</CardTitle>
                <CardDescription>
                  Ingresos y citas agrupados dentro de {snapshot.rangeLabel}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {snapshot.trendPoints.length === 0 ? (
                  <EmptyState
                    title="Sin tendencia disponible"
                    description="Todavía no hay movimientos suficientes para construir la serie del período."
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {snapshot.trendPoints.map((point) => (
                      <div
                        key={point.label}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {point.label}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {point.appointments} citas
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(point.revenue)}
                          </p>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-sky-500"
                            style={{
                              width: `${(point.revenue / maxTrendRevenue) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resultado del período</CardTitle>
                  <CardDescription>
                    Cobrado menos egresos operativos y distribuciones
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <ArrowDownCircle className="h-7 w-7 text-emerald-600" />
                    <div>
                      <p className="text-sm text-slate-500">Ingresos</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(snapshot.revenue)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                    <ArrowUpCircle className="h-7 w-7 text-rose-600" />
                    <div>
                      <p className="text-sm text-slate-500">Salidas</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(snapshot.expenses + snapshot.payouts)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4">
                    <Wallet className="h-7 w-7 text-sky-600" />
                    <div>
                      <p className="text-sm text-slate-500">Caja neta</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(snapshot.netResult)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cobros por método</CardTitle>
                  <CardDescription>
                    Solo cobros completados del período visible
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BarList
                    rows={snapshot.paymentMethodRows}
                    formatter={(value) => formatCurrency(value)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Desglose del período</CardTitle>
                <CardDescription>
                  Tramos con ingresos y citas dentro de {snapshot.rangeLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {snapshot.trendPoints.length === 0 ? (
                  <EmptyState
                    title="Sin ingresos para mostrar"
                    description="No hay cobros completados dentro del período seleccionado."
                  />
                ) : (
                  snapshot.trendPoints.map((point) => (
                    <div
                      key={point.label}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100">
                          <BarChart3 className="h-6 w-6 text-sky-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {point.label}
                          </h4>
                          <p className="text-sm text-slate-500">
                            {point.appointments} citas operativas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900">
                          {formatCurrency(point.revenue)}
                        </div>
                        <div className="text-sm text-slate-500">
                          {point.appointments > 0
                            ? formatCurrency(point.revenue / point.appointments)
                            : "Sin ticket"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gastos por categoría</CardTitle>
                  <CardDescription>
                    Egresos cargados dentro del período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BarList
                    rows={snapshot.expenseCategoryRows}
                    formatter={(value) => formatCurrency(value)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lectura rápida</CardTitle>
                  <CardDescription>
                    Indicadores financieros del rango activo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Cobros completados</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {snapshot.completedPaymentsCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Gastos</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {formatCurrency(snapshot.expenses)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">Distribuciones</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {formatCurrency(snapshot.payouts)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por servicio</CardTitle>
              <CardDescription>
                Se calcula sobre citas operativas del período
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {snapshot.serviceRows.length === 0 ? (
                <EmptyState
                  title="Sin servicios en el período"
                  description="Todavía no hay citas suficientes para construir el ranking de servicios."
                />
              ) : (
                snapshot.serviceRows.slice(0, 10).map((service) => (
                  <div
                    key={service.serviceName}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                        <Scissors className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {service.serviceName}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {service.bookings} citas
                          {service.category ? ` • ${service.category}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">
                        {formatCurrency(service.revenue)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {service.percentage.toFixed(1)}% del ingreso
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categorías más fuertes</CardTitle>
              <CardDescription>
                Participación sobre el ingreso de servicios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BarList
                rows={snapshot.serviceCategoryRows}
                formatter={(value) => formatCurrency(value)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento del equipo</CardTitle>
              <CardDescription>
                Combina citas asignadas y horas trabajadas del período
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {snapshot.employeeRows.length === 0 ? (
                <EmptyState
                  title="Falta trazabilidad por profesional"
                  description="Todavía no hay suficientes citas u horas asociadas a empleados dentro del período. Cuando la agenda y la caja usen staff de forma consistente, esta vista se completa sola."
                />
              ) : (
                snapshot.employeeRows.map((employee) => (
                  <div
                    key={employee.staffId}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
                        <Users className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {employee.name}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {employee.role ?? "Sin rol"} • {employee.appointments}{" "}
                          citas
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-1 text-right">
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(employee.revenue)}
                      </span>
                      <span className="text-sm text-slate-500">
                        {employee.hoursWorked.toFixed(1)} h • ticket{" "}
                        {formatCurrency(employee.averageTicket)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Base de clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {snapshot.clientOverview.totalCustomers}
                </div>
                <p className="text-xs text-slate-500">Total acumulado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Clientes activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {snapshot.clientOverview.activeClients}
                </div>
                <p className="text-xs text-slate-500">
                  Con actividad en el período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Clientes nuevos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {snapshot.clientOverview.newCustomers}
                </div>
                <p className="text-xs text-slate-500">
                  Ingresados en el período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Retención activa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {snapshot.clientOverview.retentionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-500">
                  Clientes activos con más de una visita
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Clientes más valiosos</CardTitle>
                <CardDescription>
                  Ranking por gasto dentro del período visible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {snapshot.topClientRows.length === 0 ? (
                  <EmptyState
                    title="Sin ranking de clientes"
                    description="Todavía no hay cobros o citas suficientes para armar el top del período."
                  />
                ) : (
                  snapshot.topClientRows.map((client, index) => (
                    <div
                      key={`${client.name}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">
                            {client.name}
                          </h4>
                          <p className="text-sm text-slate-500">
                            {client.visits} visitas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          {formatCurrency(client.spent)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {client.lastVisitAt ?? "Sin fecha"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Segmentación de clientes</CardTitle>
                  <CardDescription>
                    Clasificación por frecuencia histórica de visitas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BarList
                    rows={snapshot.clientSegmentRows}
                    formatter={(value) =>
                      `${new Intl.NumberFormat("es-AR").format(value)} clientes`
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gasto promedio activo</CardTitle>
                  <CardDescription>
                    Ingreso del período sobre clientes activos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <p className="text-sm text-slate-500">
                      Promedio por cliente
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {formatCurrency(snapshot.clientOverview.averageSpend)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardPageShell>
  );
}
