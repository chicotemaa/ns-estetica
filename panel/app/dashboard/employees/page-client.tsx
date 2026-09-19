"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { DashboardPageShell } from "@/components/dashboard/page-shell";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/business-shared";
import { Plus, Search } from "lucide-react";

import { EmployeeFeedbackDialog } from "./_components/employee-feedback-dialog";
import { EmployeeFormDialog } from "./_components/employee-form-dialog";
import { EmployeeStatusDialog } from "./_components/employee-status-dialog";
import { EmployeesTable } from "./_components/employees-table";
import type { EmployeeServiceOption, EmployeeSummary } from "./employee-types";
import { useEmployeesController } from "./use-employees-controller";

interface EmployeesPageClientProps {
  businessName: string;
  employees: EmployeeSummary[];
  isLive: boolean;
  serviceOptions: EmployeeServiceOption[];
}

export function EmployeesPageClient({
  businessName,
  employees,
  isLive,
  serviceOptions,
}: EmployeesPageClientProps) {
  const controller = useEmployeesController(employees, serviceOptions);
  const totalEstimatedCompensation = employees.reduce(
    (total, employee) => total + employee.estimatedCompensation,
    0,
  );
  const totalHoursWorked = employees.reduce(
    (total, employee) => total + employee.totalHoursWorked,
    0,
  );

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        actions={
          <Button onClick={controller.openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo profesional
          </Button>
        }
        badge={
          !isLive ? (
            <Badge className="bg-amber-100 text-amber-900">
              Modo demostración
            </Badge>
          ) : null
        }
        description={`Profesionales, servicios y formas de pago de ${businessName}.`}
        eyebrow="Equipo"
        title="Equipo y remuneraciones"
      />

      <p className="text-sm text-slate-600">
        Configurá el cargo, la modalidad y el calendario de pago con Editar.
        Este resumen muestra importes acumulados; en Liquidaciones podés revisar
        cada período y los pagos registrados.
      </p>
      <div className="metric-grid grid gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profesionales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {employees.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {employees.filter((employee) => employee.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Horas registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {totalHoursWorked.toFixed(1).replace(".", ",")}
            </div>
            <p className="text-xs text-slate-500">
              Horas acumuladas en fichajes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Remuneración generada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(totalEstimatedCompensation)}
            </div>
            <p className="text-xs text-slate-500">
              Comisiones sobre cobros y horas registradas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar profesional</CardTitle>
          <CardDescription>
            Filtra por nombre, rol, email o código interno
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              onChange={(event) => controller.setSearchTerm(event.target.value)}
              placeholder="Ej: nerea, agos, NERE..."
              value={controller.searchTerm}
            />
          </div>

          <Select
            value={controller.statusFilter}
            onValueChange={(value) =>
              controller.setStatusFilter(value as "all" | "active" | "inactive")
            }
          >
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Solo activos</SelectItem>
              <SelectItem value="inactive">Solo inactivos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipo conectado</CardTitle>
          <CardDescription>
            Aquí se define qué profesional atiende, qué servicios toma y cómo se
            calcula su liquidación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {controller.filteredEmployees.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No hay profesionales que coincidan con la búsqueda.
            </div>
          ) : (
            <EmployeesTable
              employees={controller.filteredEmployees}
              onEdit={controller.openEditDialog}
              onToggleStatus={controller.openStatusDialog}
            />
          )}
        </CardContent>
      </Card>

      <EmployeeFormDialog
        employeeBeingEdited={controller.editingEmployee}
        errorMessage={controller.formError}
        formState={controller.formState}
        isOpen={controller.isFormOpen}
        isSubmitting={controller.isSubmitting || controller.isRefreshing}
        onOpenChange={controller.handleFormOpenChange}
        onSubmit={() => void controller.submitForm()}
        onToggleAssignedService={controller.toggleAssignedService}
        onUpdateCategoryRate={controller.updateCategoryRate}
        onUpdateField={controller.updateFormField}
        onUpdateWorkingHour={controller.updateWorkingHour}
        serviceOptions={controller.serviceOptions}
      />

      <EmployeeStatusDialog
        employee={controller.selectedEmployeeToToggle}
        isSubmitting={controller.isTogglingStatus || controller.isRefreshing}
        onConfirm={() => void controller.confirmToggleStatus()}
        onOpenChange={(open) => {
          if (!open) {
            controller.closeStatusDialog();
          }
        }}
      />

      <EmployeeFeedbackDialog
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
