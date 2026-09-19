"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStaffCompensationTypeLabel } from "@/lib/business-shared";
import { Eye, EyeOff, PencilLine, Users } from "lucide-react";

import type { EmployeeSummary } from "../employee-types";
import { compensationTypeBadgeClassName } from "../employee-utils";

interface EmployeesTableProps {
  employees: EmployeeSummary[];
  onEdit: (employee: EmployeeSummary) => void;
  onToggleStatus: (employee: EmployeeSummary) => void;
}

export function EmployeesTable({
  employees,
  onEdit,
  onToggleStatus,
}: EmployeesTableProps) {
  return (
    <Table
      mobileLabels={[
        "Profesional",
        "Liquidación",
        "Citas",
        "Hs registradas",
        "Facturación",
        "Remuneración generada",
        "Estado",
        "Acciones",
      ]}
    >
      <TableHeader>
        <TableRow>
          <TableHead>Profesional</TableHead>
          <TableHead>Liquidación</TableHead>
          <TableHead>Citas</TableHead>
          <TableHead>Hs registradas</TableHead>
          <TableHead>Facturación</TableHead>
          <TableHead>Remuneración generada</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <p className="font-medium text-slate-900">
                    {employee.fullName}
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  {employee.role ?? "Profesional"}
                </p>
                <p className="text-xs text-slate-500">
                  {employee.employeeCode
                    ? `Código ${employee.employeeCode}`
                    : (employee.email ?? employee.phone ?? "Sin contacto")}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-2">
                <Badge
                  className={compensationTypeBadgeClassName(
                    employee.compensationType,
                  )}
                >
                  {getStaffCompensationTypeLabel(employee.compensationType)}
                </Badge>
                <p className="text-xs text-slate-500">
                  {employee.compensationType === "hourly"
                    ? `${employee.formattedHourlyRate} / hora`
                    : `${employee.collectionCommissionRate || 0}% sobre cobros`}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <p className="font-medium text-slate-900">
                  {employee.totalAppointments}
                </p>
                <p className="text-xs text-slate-500">
                  {employee.pendingAppointments} pendientes
                </p>
              </div>
            </TableCell>
            <TableCell>{employee.formattedHoursWorked}</TableCell>
            <TableCell>{employee.formattedRevenue}</TableCell>
            <TableCell>{employee.formattedEstimatedCompensation}</TableCell>
            <TableCell>
              <Badge
                className={
                  employee.isActive
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-slate-100 text-slate-700"
                }
              >
                {employee.isActive ? "Activo" : "Inactivo"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  aria-label="Editar registro"
                  onClick={() => onEdit(employee)}
                >
                  <PencilLine className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Cambiar estado"
                  onClick={() => onToggleStatus(employee)}
                >
                  {employee.isActive ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
