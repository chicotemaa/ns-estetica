"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ServiceCategory } from "@/lib/business-shared";

import type {
  EmployeeFeedbackState,
  EmployeeFormState,
  EmployeeServiceOption,
  EmployeeSummary,
} from "./employee-types";
import { createEmployeeFormState } from "./employee-utils";

function createFeedbackState(
  title: string,
  description: string,
  tone: EmployeeFeedbackState["tone"],
) {
  return {
    title,
    description,
    tone,
  } satisfies EmployeeFeedbackState;
}

export function useEmployeesController(
  employees: EmployeeSummary[],
  serviceOptions: EmployeeServiceOption[],
) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [editingEmployee, setEditingEmployee] =
    useState<EmployeeSummary | null>(null);
  const [employeeToToggle, setEmployeeToToggle] =
    useState<EmployeeSummary | null>(null);
  const [formState, setFormState] = useState<EmployeeFormState>(
    createEmployeeFormState(),
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] =
    useState<EmployeeFeedbackState | null>(null);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const normalizedSearch = searchTerm.toLowerCase();
      const matchesSearch =
        employee.fullName.toLowerCase().includes(normalizedSearch) ||
        employee.role?.toLowerCase().includes(normalizedSearch) ||
        employee.email?.toLowerCase().includes(normalizedSearch) ||
        employee.employeeCode?.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? employee.isActive : !employee.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  function resetForm() {
    setEditingEmployee(null);
    setFormState(createEmployeeFormState());
    setFormError(null);
  }

  function handleFormOpenChange(open: boolean) {
    setIsFormOpen(open);

    if (!open) {
      resetForm();
    }
  }

  function openCreateDialog() {
    resetForm();
    setIsFormOpen(true);
  }

  function openEditDialog(employee: EmployeeSummary) {
    setEditingEmployee(employee);
    setFormState(createEmployeeFormState(employee));
    setFormError(null);
    setIsFormOpen(true);
  }

  function updateFormField<K extends keyof EmployeeFormState>(
    field: K,
    value: EmployeeFormState[K],
  ) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateCategoryRate(category: ServiceCategory, value: string) {
    setFormState((current) => ({
      ...current,
      categoryRates: {
        ...current.categoryRates,
        [category]: value,
      },
    }));
  }

  function updateWorkingHour(
    dayOfWeek: number,
    field:
      | "startTime"
      | "endTime"
      | "breakStartTime"
      | "breakEndTime"
      | "isActive",
    value: string | boolean,
  ) {
    setFormState((current) => ({
      ...current,
      workingHours: current.workingHours.map((day) => {
        if (day.dayOfWeek !== dayOfWeek) {
          return day;
        }

        if (field === "isActive") {
          const checked = Boolean(value);
          return {
            ...day,
            isActive: checked,
            startTime: checked ? day.startTime || "09:00" : "",
            endTime: checked ? day.endTime || "18:00" : "",
            breakStartTime: checked ? day.breakStartTime : "",
            breakEndTime: checked ? day.breakEndTime : "",
          };
        }

        return {
          ...day,
          [field]: String(value),
        };
      }),
    }));
  }

  function toggleAssignedService(serviceId: string) {
    setFormState((current) => {
      const exists = current.assignedServiceIds.includes(serviceId);

      return {
        ...current,
        assignedServiceIds: exists
          ? current.assignedServiceIds.filter((id) => id !== serviceId)
          : [...current.assignedServiceIds, serviceId],
      };
    });
  }

  function refreshData() {
    startTransition(() => {
      router.refresh();
    });
  }

  async function submitForm() {
    setIsSubmitting(true);
    setFormError(null);

    const endpoint = editingEmployee
      ? `/api/employees/${editingEmployee.id}`
      : "/api/employees";
    const method = editingEmployee ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formState.fullName,
          role: formState.role,
          email: formState.email,
          phone: formState.phone,
          bio: formState.bio,
          joinDate: formState.joinDate,
          employeeCode: formState.employeeCode,
          hourlyRate: Number(formState.hourlyRate),
          compensationType: formState.compensationType,
          collectionCommissionRate: Number(formState.collectionCommissionRate),
          payrollCadence: formState.payrollCadence,
          payrollWeekday: Number(formState.payrollWeekday),
          payrollCutoffFirst: Number(formState.payrollCutoffFirst),
          payrollCutoffSecond: Number(formState.payrollCutoffSecond),
          payrollPayDelay: Number(formState.payrollPayDelay),
          assignedServiceIds: formState.assignedServiceIds,
          workingHours: formState.workingHours.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            isActive: day.isActive,
            startTime: day.isActive ? day.startTime : null,
            endTime: day.isActive ? day.endTime : null,
            breakStartTime:
              day.isActive && day.breakStartTime ? day.breakStartTime : null,
            breakEndTime:
              day.isActive && day.breakEndTime ? day.breakEndTime : null,
          })),
          categoryRates: {
            corte: Number(formState.categoryRates.corte),
            coloraciones: Number(formState.categoryRates.coloraciones),
            tratamiento: Number(formState.categoryRates.tratamiento),
          },
          isActive: formState.isActive,
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        warning?: string | null;
      } | null;

      if (!response.ok) {
        setFormError(body?.error ?? "No se pudo guardar el profesional.");
        return;
      }

      handleFormOpenChange(false);
      setFeedbackState(
        createFeedbackState(
          body?.warning
            ? editingEmployee
              ? "Profesional actualizado con advertencia"
              : "Profesional creado con advertencia"
            : editingEmployee
              ? "Profesional actualizado"
              : "Profesional creado",
          body?.warning ??
            (editingEmployee
              ? "Los datos del profesional se actualizaron correctamente."
              : "El profesional se agregó correctamente al equipo."),
          body?.warning ? "warning" : "success",
        ),
      );
      refreshData();
    } catch {
      setFormError("Ocurrió un problema al guardar el profesional.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openStatusDialog(employee: EmployeeSummary) {
    setEmployeeToToggle(employee);
  }

  function closeStatusDialog() {
    setEmployeeToToggle(null);
  }

  async function confirmToggleStatus() {
    if (!employeeToToggle) {
      return;
    }

    setIsTogglingStatus(true);

    try {
      const response = await fetch(
        `/api/employees/${employeeToToggle.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive: !employeeToToggle.isActive }),
        },
      );

      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        closeStatusDialog();
        setFeedbackState(
          createFeedbackState(
            "No se pudo actualizar",
            body?.error ??
              "Ocurrió un problema al cambiar el estado del profesional.",
            "error",
          ),
        );
        return;
      }

      const nextIsActive = !employeeToToggle.isActive;
      closeStatusDialog();
      setFeedbackState(
        createFeedbackState(
          nextIsActive ? "Profesional activado" : "Profesional desactivado",
          nextIsActive
            ? "El profesional volvió a quedar disponible en el equipo."
            : "El profesional dejó de estar activo sin perder su historial.",
          "success",
        ),
      );
      refreshData();
    } catch {
      closeStatusDialog();
      setFeedbackState(
        createFeedbackState(
          "No se pudo actualizar",
          "Ocurrió un problema al cambiar el estado del profesional.",
          "error",
        ),
      );
    } finally {
      setIsTogglingStatus(false);
    }
  }

  function closeFeedbackDialog() {
    setFeedbackState(null);
  }

  return {
    closeFeedbackDialog,
    closeStatusDialog,
    confirmToggleStatus,
    editingEmployee,
    feedbackState,
    filteredEmployees,
    formError,
    formState,
    handleFormOpenChange,
    isFormOpen,
    isRefreshing,
    isSubmitting,
    isTogglingStatus,
    openCreateDialog,
    openEditDialog,
    openStatusDialog,
    searchTerm,
    selectedEmployeeToToggle: employeeToToggle,
    serviceOptions,
    setSearchTerm,
    setStatusFilter,
    statusFilter,
    submitForm,
    toggleAssignedService,
    updateCategoryRate,
    updateFormField,
    updateWorkingHour,
  };
}
