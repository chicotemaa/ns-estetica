import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardPageShell } from "@/components/dashboard/page-shell";
import {
  formatAppointmentDate,
  formatAppointmentTime,
  formatCurrency,
  getChannelLabel,
  getDateKeyInTimeZone,
  getStatusBadgeClassName,
  getStatusLabel,
} from "@/lib/business-shared";
import { DailyCash } from "@/components/dashboard/daily-cash";
import Link from "next/link";
import {
  getBusinessDataBundle,
  getBusinessOperationsBundle,
} from "@/lib/business-data";
import { Calendar, Clock3, DollarSign, Scissors, Users } from "lucide-react";

function getShortWeekdayLabel(dateValue: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    timeZone,
  }).format(new Date(`${dateValue}T12:00:00Z`));
}

function getDateKeyOffset(baseDate: string, offset: number) {
  const nextDate = new Date(`${baseDate}T12:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + offset);
  return nextDate.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const [bundle, operations] = await Promise.all([
    getBusinessDataBundle(),
    getBusinessOperationsBundle(),
  ]);
  const { business, appointments, services, staffMembers, isLive } = bundle;
  const today = new Date();
  const todayKey = getDateKeyInTimeZone(business.timeZone, today);
  const timeKey = new Intl.DateTimeFormat("en-GB", {
    timeZone: business.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(today);
  const upcomingAppointments = appointments.filter(
    (a) =>
      (a.status === "pending" || a.status === "confirmed") &&
      (a.appointmentDate > todayKey ||
        (a.appointmentDate === todayKey &&
          a.appointmentTime.slice(0, 5) >= timeKey)),
  );
  const todaysAppointments = appointments.filter(
    (appointment) =>
      appointment.appointmentDate === todayKey &&
      appointment.status !== "cancelled",
  );
  const pendingAppointments = appointments.filter(
    (appointment) => appointment.status === "pending",
  );
  const todaysRevenue = todaysAppointments
    .filter(
      (appointment) =>
        appointment.status === "confirmed" ||
        appointment.status === "completed",
    )
    .reduce((total, appointment) => total + appointment.price, 0);
  const activeServices = services.filter((service) => service.isActive).length;

  const weeklyAppointments = Array.from({ length: 7 }, (_, index) => {
    const dateKey = getDateKeyOffset(todayKey, index);
    return {
      dateKey,
      label: getShortWeekdayLabel(dateKey, business.timeZone),
      appointments: appointments.filter(
        (appointment) =>
          appointment.appointmentDate === dateKey &&
          appointment.status !== "cancelled",
      ).length,
    };
  });

  const maxWeeklyAppointments = Math.max(
    ...weeklyAppointments.map((entry) => entry.appointments),
    1,
  );
  const popularServices = services
    .map((service) => ({
      ...service,
      bookings: appointments.filter(
        (appointment) =>
          appointment.serviceId === service.id &&
          appointment.status !== "cancelled",
      ).length,
    }))
    .sort((left, right) => right.bookings - left.bookings)
    .slice(0, 3);

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link className="brand-button" href="/dashboard/checkout">
              Abrir checkout
            </Link>
            <Link
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
              href="/dashboard/appointments?new=1"
            >
              Cargar turno
            </Link>
            <Link
              className="rounded-lg border bg-white px-4 py-2 text-sm"
              href="/dashboard/atenciones?new=1"
            >
              Registrar atención
            </Link>
            <Link
              className="rounded-lg border bg-white px-4 py-2 text-sm"
              href="/dashboard/notifications"
            >
              Ver avisos
            </Link>
          </div>
        }
        badge={
          !isLive ? (
            <Badge className="bg-amber-100 text-amber-900">
              Modo demostración
            </Badge>
          ) : null
        }
        description={
          isLive
            ? "Administrá las reservas, el equipo y los servicios de tu negocio."
            : "Estás viendo datos de ejemplo para explorar el panel."
        }
        eyebrow="Panel del negocio"
        title={business.name}
      />

      <DailyCash
        workRecords={operations.workRecords}
        payments={operations.payments}
        expenses={operations.expenses}
        payouts={operations.payouts}
        appointments={appointments}
        staff={staffMembers}
        today={todayKey}
        timeZone={business.timeZone}
        target={business.monthlyCollectionTarget || 0}
      />
      <Link className="text-sm underline" href="/dashboard/appointments">
        Abrir agenda y gestionar confirmaciones
      </Link>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas de hoy</CardTitle>
            <Calendar className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {todaysAppointments.length}
            </div>
            <p className="text-sm text-slate-600">
              {formatAppointmentDate(todayKey, business.timeZone)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor de turnos del día
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(todaysRevenue)}
            </div>
            <p className="text-sm text-slate-600">
              Solo citas confirmadas o completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock3 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {pendingAppointments.length}
            </div>
            <p className="text-sm text-slate-600">
              Reservas esperando confirmacion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Catalogo activo
            </CardTitle>
            <Scissors className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {activeServices}
            </div>
            <p className="text-sm text-slate-600">
              {staffMembers.length}{" "}
              {staffMembers.length === 1 ? "profesional" : "profesionales"}{" "}
              disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Proximas citas</CardTitle>
            <CardDescription>
              Las siguientes reservas creadas desde web, redes o carga manual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAppointments.slice(0, 6).map((appointment) => (
              <div
                key={appointment.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {appointment.customerName}
                    </p>
                    <Badge
                      className={getStatusBadgeClassName(appointment.status)}
                    >
                      {getStatusLabel(appointment.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {appointment.serviceName}
                    {appointment.staffName
                      ? ` con ${appointment.staffName}`
                      : ""}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatAppointmentDate(
                      appointment.appointmentDate,
                      business.timeZone,
                    )}{" "}
                    a las {formatAppointmentTime(appointment.appointmentTime)}
                  </p>
                </div>
                <div className="text-sm text-slate-500 lg:text-right">
                  <p>{appointment.customerContact}</p>
                  <p>{getChannelLabel(appointment.channel)}</p>
                </div>
              </div>
            ))}

            {upcomingAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                No hay citas futuras cargadas todavia.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agenda de 7 dias</CardTitle>
            <CardDescription>
              Actividad proyectada para la proxima semana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-3">
              {weeklyAppointments.map((entry) => (
                <div
                  key={entry.dateKey}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-2xl bg-slate-900"
                      style={{
                        height: `${Math.max((entry.appointments / maxWeeklyAppointments) * 100, 8)}%`,
                      }}
                    />
                  </div>
                  <div className="text-center text-xs text-slate-500">
                    <p className="font-medium uppercase">
                      {entry.label.replace(".", "")}
                    </p>
                    <p>{entry.appointments}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Servicios mas reservados</CardTitle>
            <CardDescription>Los servicios con más reservas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {popularServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">{service.name}</p>
                  <p className="text-sm text-slate-500">
                    {service.durationMinutes
                      ? service.durationMinutes + " min"
                      : "Duración por definir"}{" "}
                    · {formatCurrency(service.price)}
                  </p>
                </div>
                <Badge variant="outline">{service.bookings} reservas</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipo conectado</CardTitle>
            <CardDescription>
              Profesionales visibles en la web y en el panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffMembers.map((staffMember) => {
              const relatedAppointments = appointments.filter(
                (appointment) => appointment.staffMemberId === staffMember.id,
              );

              return (
                <div
                  key={staffMember.id}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {staffMember.fullName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {staffMember.role ?? "Profesional"}
                      </p>
                    </div>
                    <Users className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {relatedAppointments.length} citas registradas ·{" "}
                    {staffMember.isActive ? "Visible" : "Oculto"} en la web
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
}
