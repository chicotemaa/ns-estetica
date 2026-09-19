import {
  createDefaultBusinessHours,
  createDefaultCategoryRateMap,
  getBusinessDayLabel,
  type ServiceCategory,
  type StaffCompensationType,
} from "@/lib/business-shared";

import type {
  EmployeeFormState,
  EmployeeSummary,
  EmployeeWorkingHourFormState,
} from "./employee-types";

export const INITIAL_EMPLOYEE_FORM: EmployeeFormState = {
  collectionCommissionRate: "0",
  payrollCadence: "semimonthly",
  payrollWeekday: "0",
  payrollCutoffFirst: "15",
  payrollCutoffSecond: "31",
  payrollPayDelay: "0",
  fullName: "",
  role: "",
  email: "",
  phone: "",
  bio: "",
  joinDate: "",
  employeeCode: "",
  hourlyRate: "0",
  compensationType: "hourly",
  assignedServiceIds: [],
  workingHours: createDefaultBusinessHours().map((day) => ({
    dayOfWeek: day.dayOfWeek,
    label: day.label,
    isActive: day.isOpen,
    startTime: day.openTime?.slice(0, 5) ?? "",
    endTime: day.closeTime?.slice(0, 5) ?? "",
    breakStartTime: day.breakStartTime?.slice(0, 5) ?? "",
    breakEndTime: day.breakEndTime?.slice(0, 5) ?? "",
  })),
  categoryRates: {
    corte: "0",
    coloraciones: "0",
    tratamiento: "0",
  },
  isActive: true,
};

export function compensationTypeBadgeClassName(type: StaffCompensationType) {
  switch (type) {
    case "hourly":
      return "bg-sky-100 text-sky-900";
    case "category_percentage":
      return "bg-fuchsia-100 text-fuchsia-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function categoryRatePillClassName(category: ServiceCategory) {
  switch (category) {
    case "corte":
      return "bg-sky-100 text-sky-900";
    case "coloraciones":
      return "bg-fuchsia-100 text-fuchsia-900";
    case "tratamiento":
      return "bg-emerald-100 text-emerald-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function createEmployeeFormState(
  employee?: EmployeeSummary | null,
): EmployeeFormState {
  if (!employee) {
    return INITIAL_EMPLOYEE_FORM;
  }

  const defaultRates = createDefaultCategoryRateMap();

  return {
    fullName: employee.fullName,
    collectionCommissionRate: String(employee.collectionCommissionRate ?? 0),
    payrollCadence: employee.payrollCadence || "semimonthly",
    payrollWeekday: String(employee.payrollWeekday ?? 0),
    payrollCutoffFirst: String(employee.payrollCutoffFirst ?? 15),
    payrollCutoffSecond: String(employee.payrollCutoffSecond ?? 31),
    payrollPayDelay: String(employee.payrollPayDelay ?? 0),
    role: employee.role ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    bio: employee.bio ?? "",
    joinDate: employee.joinDate ?? "",
    employeeCode: employee.employeeCode ?? "",
    hourlyRate: String(employee.hourlyRate),
    compensationType: employee.compensationType,
    assignedServiceIds: [...employee.assignedServiceIds],
    workingHours: (employee.workingHours.length > 0
      ? employee.workingHours
      : INITIAL_EMPLOYEE_FORM.workingHours
    ).map((day) => ({
      ...day,
    })),
    categoryRates: {
      corte: String(employee.categoryRates.corte ?? defaultRates.corte),
      coloraciones: String(
        employee.categoryRates.coloraciones ?? defaultRates.coloraciones,
      ),
      tratamiento: String(
        employee.categoryRates.tratamiento ?? defaultRates.tratamiento,
      ),
    },
    isActive: employee.isActive,
  };
}

export function createDefaultEmployeeWorkingHours(): EmployeeWorkingHourFormState[] {
  return createDefaultBusinessHours().map((day) => ({
    dayOfWeek: day.dayOfWeek,
    label: getBusinessDayLabel(day.dayOfWeek),
    isActive: day.isOpen,
    startTime: day.openTime?.slice(0, 5) ?? "",
    endTime: day.closeTime?.slice(0, 5) ?? "",
    breakStartTime: day.breakStartTime?.slice(0, 5) ?? "",
    breakEndTime: day.breakEndTime?.slice(0, 5) ?? "",
  }));
}
