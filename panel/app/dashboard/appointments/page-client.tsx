"use client";

import { ScheduleTools, type ScheduleBlock } from "./_components/schedule-tools";
import { useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCurrency,
  type AppointmentRecord,
  type WorkRecord,
  type BookingSettingsRecord,
  type BusinessHourRecord,
  type CustomerRecord,
  type ServiceRecord,
  type StaffRecord,
  type StaffServiceAssignmentRecord,
  type StaffWorkingHourRecord,
} from "@/lib/business-shared";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Plus,
  Search,
} from "lucide-react";

import { AppointmentFeedbackDialog } from "./_components/appointment-feedback-dialog";
import { AppointmentsCalendar } from "./_components/appointments-calendar";
import { AppointmentFormDialog } from "./_components/appointment-form-dialog";
import { AppointmentStatusDialog } from "./_components/appointment-status-dialog";
import { AppointmentsSelectedDayPanel } from "./_components/appointments-selected-day-panel";
import { AppointmentDetailDialog } from "./_components/appointment-detail-dialog";
import type { AgendaViewMode } from "./appointment-types";
import type { AgendaSourceFilter } from "@/lib/agenda-history";
import { useAppointmentsController } from "./use-appointments-controller";

interface AppointmentsPageClientProps {
  initialViewMode?: AgendaViewMode;
  initialDateKey?: string;
  initialAppointmentId?: string | null;
  initialCreate?: boolean;
  appointments: AppointmentRecord[];
  workRecords: WorkRecord[];
  bookingSettings: BookingSettingsRecord;
  businessHours: BusinessHourRecord[];
  businessName: string;
  customers: CustomerRecord[];
  isLive: boolean;
  services: ServiceRecord[];
  staffMembers: StaffRecord[];
  staffServiceAssignments: StaffServiceAssignmentRecord[];
  staffWorkingHours: StaffWorkingHourRecord[];
  timeZone: string;
  todayKey: string;
}

const AGENDA_VIEW_OPTIONS: Array<{ label: string; value: AgendaViewMode }> = [
  { label: "Día", value: "day" },
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" },
  { label: "Año", value: "year" },
];

export function AppointmentsPageClient({
  initialViewMode,
  initialDateKey,
  initialAppointmentId,
  initialCreate,
  appointments,
  workRecords,
  bookingSettings,
  businessHours,
  businessName,
  customers,
  isLive,
  services,
  staffMembers,
  staffServiceAssignments,
  staffWorkingHours,
  timeZone,
  todayKey,
}: AppointmentsPageClientProps) {
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const isMobile = useIsMobile();
  const [isDetailOpen, setIsDetailOpen] = useState(Boolean(initialAppointmentId));
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const controller = useAppointmentsController({
    blocks: scheduleBlocks,
    initialViewMode,
    initialDateKey,
    initialAppointmentId,
    initialCreate,
    appointments,
    workRecords,
    bookingSettings,
    businessHours,
    customers,
    services,
    staffMembers,
    staffServiceAssignments,
    staffWorkingHours,
    timeZone,
    todayKey,
  });

  function handleSelectAppointment(appointmentId: string, dateKey?: string) {
    detailTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (dateKey) {
      controller.selectDate(dateKey);
    }

    controller.setSelectedAppointmentId(appointmentId);
    setIsDetailOpen(true);
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        actions={
          <Button onClick={() => controller.openCreateDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo turno
          </Button>
        }
        badge={
          !isLive ? (
            <Badge className="bg-amber-100 text-amber-900">
              Modo demostración
            </Badge>
          ) : null
        }
        description={`Organizá las atenciones de ${businessName}.`}
        eyebrow="Agenda"
        supporting={
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
            <CalendarRange className="h-3.5 w-3.5" />
            <span className="font-medium text-slate-900">
              {controller.rangeMeta.subtitle}
            </span>
            <span className="capitalize">{controller.rangeMeta.title}</span>
          </div>
        }
        title="Turnos"
      />

      <dl className="agenda-summary" aria-label="Resumen de la vista">
        <div>
          <dt>Registros</dt>
          <dd>{controller.agendaMetrics.total}</dd>
        </div>
        <div>
          <dt>Pendientes</dt>
          <dd>{controller.agendaMetrics.pending}</dd>
        </div>
        <div>
          <dt>Completados</dt>
          <dd>{controller.agendaMetrics.completed}</dd>
        </div>
        <div>
          <dt>Valor estimado</dt>
          <dd>{formatCurrency(controller.agendaMetrics.revenue)}</dd>
        </div>
      </dl>

      <Card className="agenda-controls">
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <Tabs
              value={controller.viewMode}
              onValueChange={(value) =>
                controller.changeViewMode(value as AgendaViewMode)
              }
            >
              <TabsList className="grid w-full grid-cols-4 xl:w-[420px]">
                {AGENDA_VIEW_OPTIONS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => controller.navigate(-1)}
                type="button"
                variant="outline"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Anterior</span>
              </Button>
              <Button
                onClick={controller.goToToday}
                type="button"
                variant="outline"
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Hoy
              </Button>
              <Button
                onClick={() => controller.navigate(1)}
                type="button"
                variant="outline"
              >
                <span className="sr-only sm:not-sr-only">Siguiente</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="grid min-w-0 gap-1 text-sm text-slate-600">
              Ir a una fecha
              <Input
                type="date"
                value={controller.selectedDateKey}
                onChange={(event) => {
                  if (event.target.value)
                    controller.openDay(event.target.value);
                }}
              />
            </label>
            {controller.latestHistoryDate && (
              <Button
                variant="ghost"
                onClick={() => {
                  controller.setSourceFilter("all");
                  controller.setStatusFilter("all");
                  controller.setStaffFilter("all");
                  controller.setSearchTerm("");
                  controller.openDay(controller.latestHistoryDate!);
                }}
              >
                Últimas atenciones
              </Button>
            )}
          </div>
          <details className="filter-disclosure">
            <summary>
              <ListFilter size={16} aria-hidden="true" /> Buscar y filtrar
              {controller.searchTerm ||
              controller.staffFilter !== "all" ||
              controller.statusFilter !== "all" ||
              controller.sourceFilter !== "all" ? (
                <span className="filter-active">Filtros activos</span>
              ) : null}
            </summary>
            <div className="grid gap-3 pt-3 sm:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  aria-label="Buscar turnos"
                  placeholder="Cliente, servicio o contacto"
                  value={controller.searchTerm}
                  onChange={(event) =>
                    controller.setSearchTerm(event.target.value)
                  }
                />
              </div>

              <Select
                value={controller.staffFilter}
                onValueChange={controller.setStaffFilter}
              >
                <SelectTrigger aria-label="Filtrar por profesional">
                  <SelectValue placeholder="Profesional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el equipo</SelectItem>
                  <SelectItem value="unassigned">Sin profesional</SelectItem>
                  {staffMembers.map((staffMember) => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {staffMember.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={controller.statusFilter}
                onValueChange={(value) =>
                  controller.setStatusFilter(
                    value as "all" | AppointmentRecord["status"],
                  )
                }
              >
                <SelectTrigger aria-label="Filtrar por estado">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="confirmed">Confirmados</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={controller.sourceFilter}
                onValueChange={(value) =>
                  controller.setSourceFilter(value as AgendaSourceFilter)
                }
              >
                <SelectTrigger aria-label="Filtrar por origen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Turnos e historial</SelectItem>
                  <SelectItem value="appointments">Solo turnos</SelectItem>
                  <SelectItem value="history">Solo historial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </details>
        </CardContent>
      </Card>

      <ScheduleTools date={controller.selectedDateKey} staff={staffMembers} onBlocks={setScheduleBlocks}/>
      <div className="agenda-workspace" data-view={controller.viewMode}>
        <Card
          className={
            isMobile && controller.viewMode === "day" ? "hidden" : "min-w-0"
          }
        >
          <CardHeader>
            <CardTitle className="capitalize">
              {controller.rangeMeta.title}
            </CardTitle>
            <CardDescription>
              {controller.visibleAppointments.some(
                (entry) => entry.channel === "history",
              )
                ? "El historial sin hora usa horarios de referencia separados por una hora."
                : "Seleccioná un turno para ver sus detalles."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppointmentsCalendar
              blocks={scheduleBlocks}
              appointments={controller.visibleAppointments}
              bookingSettings={bookingSettings}
              onOpenDay={controller.openDay}
              onOpenMonth={controller.openMonth}
              businessHours={businessHours}
              focusDateKey={controller.focusDateKey}
              onDateClick={(dateKey, time) => {
                controller.selectDate(dateKey);
                controller.openCreateDialog({ dateKey, time });
              }}
              onEventClick={handleSelectAppointment}
              onEventDrop={(appointmentId, nextDateKey, nextTime, revert) =>
                void controller.moveAppointment(
                  appointmentId,
                  nextDateKey,
                  nextTime,
                  revert,
                )
              }
              onVisibleDateChange={controller.syncVisibleRangeStart}
              selectedAppointmentId={controller.selectedAppointmentId}
              selectedStaffId={
                controller.staffFilter === "all" ||
                controller.staffFilter === "unassigned"
                  ? null
                  : controller.staffFilter
              }
              staffWorkingHours={staffWorkingHours}
              viewMode={controller.viewMode}
            />
          </CardContent>
        </Card>

        <AppointmentsSelectedDayPanel
          appointments={controller.selectedDateAppointments}
          dateKey={controller.selectedDateKey}
          onCreate={() =>
            controller.openCreateDialog({ dateKey: controller.selectedDateKey })
          }
          onSelectAppointment={handleSelectAppointment}
          selectedAppointmentId={controller.selectedAppointmentId}
          timeZone={timeZone}
        />
      </div>

      <AppointmentDetailDialog
        entry={controller.selectedAppointment}
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        timeZone={timeZone}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (!controller.isFormOpen && !controller.statusDialogState)
            detailTriggerRef.current?.focus({ preventScroll: true });
        }}
        onEdit={(entry) => {
          setIsDetailOpen(false);
          controller.openEditDialog(entry);
        }}
        onStatusChange={(entry, status) => {
          setIsDetailOpen(false);
          controller.openStatusDialog(entry, status);
        }}
      />
      <AppointmentFormDialog
        appointmentBeingEdited={controller.editingAppointment}
        availableTimeOptions={controller.availableTimeOptions}
        customers={controller.customers}
        errorMessage={controller.formError}
        formState={controller.formState}
        isOpen={controller.isFormOpen}
        isSubmitting={controller.isSubmitting || controller.isRefreshing}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeFormDialog();
          }
        }}
        onSubmit={() => void controller.submitForm()}
        onUpdateField={controller.updateFormField}
        services={controller.services}
        staffMembers={controller.compatibleStaffMembers}
      />

      <AppointmentStatusDialog
        dialogState={controller.statusDialogState}
        isSubmitting={controller.isStatusSubmitting || controller.isRefreshing}
        onConfirm={() => void controller.confirmStatusChange()}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeStatusDialog();
          }
        }}
        onReasonChange={controller.setStatusReason}
        reason={controller.statusReason}
      />

      <AppointmentFeedbackDialog
        feedback={controller.feedbackState}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeFeedbackDialog();
          }
        }}
      />
    </DashboardPageShell>
  );
}
