import "server-only";

import {
  createDefaultBusinessHours,
  createDefaultCategoryRateMap,
  getBusinessDayLabel,
  type ServiceCategory,
  type StaffCompensationType,
} from "@/lib/business-shared";
import { parseDailyScheduleDay } from "@/lib/daily-schedule";
import type { ManagedBusinessContext } from "@/lib/managed-business";
export { getManagedBusiness } from "@/lib/managed-business";
import { fetchBusinessHoursRows } from "@/lib/schedule-schema";
import { SERVICE_CATEGORIES } from "@/lib/service-catalog";
export type { ManagedBusinessContext } from "@/lib/managed-business";

export interface EmployeeWorkingHourPayload {
  dayOfWeek?: unknown;
  isActive?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  breakStartTime?: unknown;
  breakEndTime?: unknown;
}

export interface EmployeePayload {
  collectionCommissionRate?: unknown;
  payrollCadence?: unknown;
  payrollWeekday?: unknown;
  payrollCutoffFirst?: unknown;
  payrollCutoffSecond?: unknown;
  payrollPayDelay?: unknown;
  fullName?: unknown;
  role?: unknown;
  email?: unknown;
  phone?: unknown;
  employeeCode?: unknown;
  bio?: unknown;
  joinDate?: unknown;
  isActive?: unknown;
  compensationType?: unknown;
  hourlyRate?: unknown;
  assignedServiceIds?: unknown;
  workingHours?: unknown;
  categoryRates?: unknown;
}

export interface ParsedEmployeePayload {
  collectionCommissionRate: number;
  payrollCadence: "weekly" | "semimonthly" | "monthly";
  payrollWeekday: number;
  payrollCutoffFirst: number;
  payrollCutoffSecond: number;
  payrollPayDelay: number;
  fullName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  employeeCode: string | null;
  bio: string | null;
  joinDate: string | null;
  isActive: boolean;
  compensationType: StaffCompensationType;
  hourlyRate: number;
  assignedServiceIds: string[];
  workingHours: Array<{
    dayOfWeek: number;
    isActive: boolean;
    startTime: string | null;
    endTime: string | null;
    breakStartTime: string | null;
    breakEndTime: string | null;
  }>;
  categoryRates: Record<ServiceCategory, number>;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseWorkingHours(input: unknown) {
  const defaultWorkingHours = createDefaultBusinessHours().map((day) => ({
    dayOfWeek: day.dayOfWeek,
    isActive: day.isOpen,
    startTime: day.openTime,
    endTime: day.closeTime,
    breakStartTime: day.breakStartTime,
    breakEndTime: day.breakEndTime,
  }));

  if (!Array.isArray(input)) {
    return { data: defaultWorkingHours };
  }

  const byDay = new Map<number, (typeof defaultWorkingHours)[number]>();

  for (const rawDay of input as EmployeeWorkingHourPayload[]) {
    const dayOfWeek =
      typeof rawDay.dayOfWeek === "number"
        ? rawDay.dayOfWeek
        : Number(rawDay.dayOfWeek);
    const isActive =
      typeof rawDay.isActive === "boolean" ? rawDay.isActive : false;

    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return {
        error: "Cada día del horario semanal debe tener un valor entre 0 y 6.",
      };
    }

    if (byDay.has(dayOfWeek)) {
      return {
        error:
          "No puede haber días repetidos en el horario semanal del empleado.",
      };
    }

    const parsedDay = parseDailyScheduleDay({
      dayOfWeek,
      isEnabled: isActive,
      startTime: rawDay.startTime,
      endTime: rawDay.endTime,
      breakStartTime: rawDay.breakStartTime,
      breakEndTime: rawDay.breakEndTime,
      label: getBusinessDayLabel(dayOfWeek),
    });

    if (parsedDay.error || !parsedDay.data) {
      return {
        error:
          parsedDay.error ?? "El horario semanal del empleado es inválido.",
      };
    }

    byDay.set(dayOfWeek, {
      dayOfWeek,
      isActive: parsedDay.data.isEnabled,
      startTime: parsedDay.data.startTime,
      endTime: parsedDay.data.endTime,
      breakStartTime: parsedDay.data.breakStartTime,
      breakEndTime: parsedDay.data.breakEndTime,
    });
  }

  if (byDay.size !== 7) {
    return {
      error: "Debes enviar los 7 días del horario semanal del empleado.",
    };
  }

  return {
    data: Array.from(byDay.values()).sort(
      (left, right) => left.dayOfWeek - right.dayOfWeek,
    ),
  };
}

function parseCategoryRates(input: unknown) {
  const defaultCategoryRates = createDefaultCategoryRateMap();

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { data: defaultCategoryRates };
  }

  const parsedRates = { ...defaultCategoryRates };

  for (const category of SERVICE_CATEGORIES) {
    const rawValue = (input as Record<string, unknown>)[category];
    const parsedValue =
      rawValue === undefined || rawValue === null || rawValue === ""
        ? 0
        : Number(rawValue);

    if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100) {
      return {
        error: `El porcentaje de ${category} debe ser un número entre 0 y 100.`,
      };
    }

    parsedRates[category] = parsedValue;
  }

  return { data: parsedRates };
}

export function parseEmployeePayload(payload: EmployeePayload): {
  data?: ParsedEmployeePayload;
  error?: string;
} {
  const collectionCommissionRate = Number(
    payload.collectionCommissionRate ?? 0,
  );
  const payrollCadence =
    payload.payrollCadence === "weekly"
      ? "weekly"
      : payload.payrollCadence === "monthly"
        ? "monthly"
        : "semimonthly";
  const payrollWeekday = Number(payload.payrollWeekday ?? 0),
    payrollCutoffFirst = Number(payload.payrollCutoffFirst ?? 15),
    payrollCutoffSecond = Number(payload.payrollCutoffSecond ?? 31),
    payrollPayDelay = Number(payload.payrollPayDelay ?? 0);
  if (
    !Number.isFinite(collectionCommissionRate) ||
    collectionCommissionRate < 0 ||
    collectionCommissionRate > 100
  )
    return { error: "El porcentaje debe estar entre 0 y 100." };
  if (
    ![
      payrollWeekday,
      payrollCutoffFirst,
      payrollCutoffSecond,
      payrollPayDelay,
    ].every(Number.isInteger) ||
    payrollWeekday < 0 ||
    payrollWeekday > 6 ||
    payrollCutoffFirst < 1 ||
    payrollCutoffFirst > 27 ||
    (payrollCadence === "semimonthly" && payrollCutoffSecond <= payrollCutoffFirst) ||
    payrollCutoffSecond < 1 ||
    payrollCutoffSecond > 31 ||
    payrollPayDelay < 0 ||
    payrollPayDelay > 30
  )
    return { error: "Revisá los días de corte y el plazo de pago." };
  const fullName =
    typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  const employeeCode =
    normalizeOptionalText(payload.employeeCode)?.toUpperCase() ?? null;
  const compensationType =
    payload.compensationType === "category_percentage"
      ? "category_percentage"
      : "hourly";
  const hourlyRate =
    payload.hourlyRate === undefined ||
    payload.hourlyRate === null ||
    payload.hourlyRate === ""
      ? 0
      : Number(payload.hourlyRate);
  const assignedServiceIds = Array.isArray(payload.assignedServiceIds)
    ? Array.from(
        new Set(
          payload.assignedServiceIds.filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          ),
        ),
      )
    : [];

  if (!fullName) {
    return { error: "El nombre del profesional es obligatorio." };
  }

  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return {
      error:
        "El valor por hora debe ser un número válido mayor o igual a cero.",
    };
  }

  const workingHours = parseWorkingHours(payload.workingHours);

  if (workingHours.error || !workingHours.data) {
    return { error: workingHours.error ?? "El horario semanal es inválido." };
  }

  const categoryRates = parseCategoryRates(payload.categoryRates);

  if (categoryRates.error || !categoryRates.data) {
    return {
      error:
        categoryRates.error ?? "Los porcentajes por categoría son inválidos.",
    };
  }

  return {
    data: {
      fullName,
      collectionCommissionRate,
      payrollCadence,
      payrollWeekday,
      payrollCutoffFirst,
      payrollCutoffSecond,
      payrollPayDelay,
      role: normalizeOptionalText(payload.role),
      email: normalizeOptionalText(payload.email),
      phone: normalizeOptionalText(payload.phone),
      employeeCode,
      bio: normalizeOptionalText(payload.bio),
      joinDate: normalizeOptionalText(payload.joinDate),
      isActive: typeof payload.isActive === "boolean" ? payload.isActive : true,
      compensationType,
      hourlyRate,
      assignedServiceIds,
      workingHours: workingHours.data,
      categoryRates: categoryRates.data,
    },
  };
}

export function parseEmployeeStatusPayload(
  payload: Pick<EmployeePayload, "isActive">,
) {
  if (typeof payload.isActive !== "boolean") {
    return { error: "El estado activo debe ser booleano." };
  }

  return { isActive: payload.isActive };
}

export async function validateEmployeeWorkingHoursAgainstBusinessHours(
  context: ManagedBusinessContext,
  workingHours: ParsedEmployeePayload["workingHours"],
) {
  const businessHoursResult = await fetchBusinessHoursRows(
    context.backend,
    context.business.id,
  );

  if (businessHoursResult.error) {
    return {
      error:
        "No se pudo validar el horario del profesional contra el horario general del negocio.",
    };
  }

  const businessHoursByDay = new Map(
    (businessHoursResult.data ?? []).map((row) => [
      row.day_of_week,
      {
        isOpen: row.is_open,
        openTime: row.open_time,
        closeTime: row.close_time,
      },
    ]),
  );

  for (const workingDay of workingHours) {
    if (!workingDay.isActive) {
      continue;
    }

    const businessDay = businessHoursByDay.get(workingDay.dayOfWeek);
    const label = getBusinessDayLabel(workingDay.dayOfWeek);

    if (
      !businessDay ||
      !businessDay.isOpen ||
      !businessDay.openTime ||
      !businessDay.closeTime
    ) {
      return {
        error: `${label} no puede quedar disponible para el profesional si el negocio está cerrado.`,
      };
    }

    if (
      !workingDay.startTime ||
      !workingDay.endTime ||
      workingDay.startTime < businessDay.openTime ||
      workingDay.endTime > businessDay.closeTime
    ) {
      return {
        error: `${label} del profesional debe quedar dentro del horario general del negocio.`,
      };
    }
  }

  return { data: true as const };
}

export async function validateAssignedServices(
  context: ManagedBusinessContext,
  serviceIds: string[],
) {
  if (serviceIds.length === 0) {
    return { data: [] as string[] };
  }

  const { data, error } = await context.backend
    .from("services")
    .select("id")
    .eq("business_id", context.business.id)
    .in("id", serviceIds);

  if (error) {
    return { error: "No se pudieron validar los servicios asignados." };
  }

  const validServiceIds = (data ?? []).map((service) => service.id);

  if (validServiceIds.length !== serviceIds.length) {
    return {
      error:
        "Hay servicios asignados que no existen o no pertenecen al negocio.",
    };
  }

  return { data: validServiceIds };
}

export async function syncEmployeeRelations(
  context: ManagedBusinessContext,
  staffMemberId: string,
  payload: ParsedEmployeePayload,
) {
  const operations: import("@/lib/backend/client").BatchOperation[] = [
    {
      resource: "staff_member_working_hours",
      operation: "upsert",
      onConflict: "staff_member_id,day_of_week",
      data: payload.workingHours.map((day) => ({
        staff_member_id: staffMemberId,
        day_of_week: day.dayOfWeek,
        start_time: day.startTime,
        end_time: day.endTime,
        break_start_time: day.breakStartTime,
        break_end_time: day.breakEndTime,
        is_active: day.isActive,
      })),
    },
    {
      resource: "staff_member_services",
      operation: "delete",
      filters: [
        { field: "staff_member_id", operator: "eq", value: staffMemberId },
      ],
    },
  ];
  if (payload.assignedServiceIds.length)
    operations.push({
      resource: "staff_member_services",
      operation: "insert",
      data: payload.assignedServiceIds.map((serviceId) => ({
        staff_member_id: staffMemberId,
        service_id: serviceId,
      })),
    });
  operations.push({
    resource: "staff_member_category_rates",
    operation: "upsert",
    onConflict: "staff_member_id,service_category",
    data: SERVICE_CATEGORIES.map((category) => ({
      staff_member_id: staffMemberId,
      service_category: category,
      percentage: payload.categoryRates[category],
    })),
  });
  const { error } = await context.backend.batch(operations);
  return error
    ? { error: error.message }
    : { data: true as const, warning: null };
}
