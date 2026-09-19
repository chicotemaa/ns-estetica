import {
  formatCurrency,
  getPaymentMethodLabel,
  getServiceCategoryLabel,
} from "@/lib/business-shared";
import type {
  AppointmentRecord,
  CustomerRecord,
  PaymentRecord,
  ServiceRecord,
  StaffRecord,
  StaffTimeLogRecord,
} from "@/lib/business-shared";

import type {
  ReportBreakdownRow,
  ReportClientRow,
  ReportComparisonTone,
  ReportEmployeeRow,
  ReportMetric,
  ReportMetricFormat,
  ReportPeriod,
  ReportsSnapshot,
  ReportsSourceData,
  ReportServiceRow,
  ReportTrendPoint,
} from "./report-types";

interface DateParts {
  year: number;
  month: number;
  day: number;
  key: string;
}

interface PeriodRange {
  start: Date;
  end: Date;
}

interface TrendBucket {
  label: string;
  start: Date;
  end: Date;
}

export const REPORT_PERIOD_OPTIONS: Array<{
  value: ReportPeriod;
  label: string;
}> = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensual" },
  { value: "year", label: "Anual" },
];

const ACTIVE_APPOINTMENT_STATUSES = new Set([
  "pending",
  "confirmed",
  "completed",
] as AppointmentRecord["status"][]);

function normalizeTextKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function createUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getStartOfWeek(value: Date) {
  const start = new Date(value);
  const day = start.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - offset);
  return start;
}

function getEndOfWeek(value: Date) {
  return addUtcDays(getStartOfWeek(value), 6);
}

function getStartOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function getEndOfMonth(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
}

function getStartOfYear(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
}

function getEndOfYear(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), 11, 31));
}

function getDatePartsInTimeZone(timeZone: string, value: string | Date | null) {
  if (!value) {
    return null;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return { year, month, day, key: value };
  }

  const parsed =
    value instanceof Date
      ? value
      : value.includes("T")
        ? new Date(value)
        : new Date(`${value}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(parsed);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
    key: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  } satisfies DateParts;
}

function createDateFromParts(parts: DateParts) {
  return createUtcDate(parts.year, parts.month, parts.day);
}

function formatUtcDate(value: Date, format: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    ...format,
  }).format(value);
}

function formatRangeLabel(period: ReportPeriod, range: PeriodRange) {
  switch (period) {
    case "day":
      return formatUtcDate(range.start, { dateStyle: "medium" });
    case "week":
      return `${formatUtcDate(range.start, { dateStyle: "medium" })} al ${formatUtcDate(range.end, { dateStyle: "medium" })}`;
    case "month":
      return formatUtcDate(range.start, { month: "long", year: "numeric" });
    case "year":
      return formatUtcDate(range.start, { year: "numeric" });
    default:
      return "Período actual";
  }
}

function getPeriodLabel(period: ReportPeriod) {
  switch (period) {
    case "day":
      return "Vista diaria";
    case "week":
      return "Vista semanal";
    case "month":
      return "Vista mensual";
    case "year":
      return "Vista anual";
    default:
      return "Vista general";
  }
}

function getCurrentPeriodRange(period: ReportPeriod, timeZone: string) {
  const referenceParts = getDatePartsInTimeZone(timeZone, new Date());

  if (!referenceParts) {
    const today = new Date();
    return { start: today, end: today } satisfies PeriodRange;
  }

  const referenceDate = createDateFromParts(referenceParts);

  switch (period) {
    case "day":
      return { start: referenceDate, end: referenceDate };
    case "week":
      return {
        start: getStartOfWeek(referenceDate),
        end: getEndOfWeek(referenceDate),
      };
    case "month":
      return {
        start: getStartOfMonth(referenceDate),
        end: getEndOfMonth(referenceDate),
      };
    case "year":
      return {
        start: getStartOfYear(referenceDate),
        end: getEndOfYear(referenceDate),
      };
    default:
      return { start: referenceDate, end: referenceDate };
  }
}

function getPreviousPeriodRange(
  period: ReportPeriod,
  currentRange: PeriodRange,
) {
  switch (period) {
    case "day": {
      const previousDay = addUtcDays(currentRange.start, -1);
      return { start: previousDay, end: previousDay };
    }
    case "week":
      return {
        start: addUtcDays(currentRange.start, -7),
        end: addUtcDays(currentRange.end, -7),
      };
    case "month": {
      const previousMonthReference = addUtcDays(currentRange.start, -1);
      return {
        start: getStartOfMonth(previousMonthReference),
        end: getEndOfMonth(previousMonthReference),
      };
    }
    case "year": {
      const previousYearReference = addUtcDays(currentRange.start, -1);
      return {
        start: getStartOfYear(previousYearReference),
        end: getEndOfYear(previousYearReference),
      };
    }
    default:
      return currentRange;
  }
}

function isDateWithinRange(
  value: string | Date | null,
  timeZone: string,
  range: PeriodRange,
) {
  const parts = getDatePartsInTimeZone(timeZone, value);
  if (!parts) {
    return false;
  }

  const date = createDateFromParts(parts);
  return date >= range.start && date <= range.end;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getPercentageShare(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (value / total) * 100;
}

function buildComparison(
  currentValue: number,
  previousValue: number,
  direction: "higher_is_better" | "lower_is_better" = "higher_is_better",
): {
  label: string;
  tone: ReportComparisonTone;
  percentageDelta: number | null;
} {
  if (previousValue <= 0 && currentValue <= 0) {
    return {
      label: "Sin cambios respecto al período anterior",
      tone: "neutral",
      percentageDelta: null,
    };
  }

  if (previousValue <= 0) {
    return {
      label: "Sin base previa para comparar",
      tone: "neutral",
      percentageDelta: null,
    };
  }

  const rawDelta = ((currentValue - previousValue) / previousValue) * 100;
  const rounded = Number(rawDelta.toFixed(1));
  const tone =
    rounded === 0
      ? "neutral"
      : direction === "higher_is_better"
        ? rounded > 0
          ? "positive"
          : "negative"
        : rounded < 0
          ? "positive"
          : "negative";

  const prefix = rounded > 0 ? "+" : "";
  return {
    label: `${prefix}${rounded}% vs período anterior`,
    tone,
    percentageDelta: rounded,
  };
}

function createMetric(
  label: string,
  helper: string,
  value: number,
  previousValue: number,
  format: ReportMetricFormat,
  direction: "higher_is_better" | "lower_is_better" = "higher_is_better",
) {
  return {
    label,
    helper,
    value,
    previousValue,
    format,
    comparison: buildComparison(value, previousValue, direction),
  } satisfies ReportMetric;
}

function createTrendBuckets(period: ReportPeriod, range: PeriodRange) {
  if (period === "day") {
    return [
      {
        label: formatUtcDate(range.start, {
          weekday: "short",
          day: "2-digit",
        }),
        start: range.start,
        end: range.end,
      },
    ] satisfies TrendBucket[];
  }

  if (period === "week") {
    return Array.from({ length: 7 }, (_, index) => {
      const day = addUtcDays(range.start, index);
      return {
        label: formatUtcDate(day, {
          weekday: "short",
          day: "2-digit",
        }),
        start: day,
        end: day,
      };
    });
  }

  if (period === "month") {
    const buckets: TrendBucket[] = [];
    let pointer = range.start;
    let weekNumber = 1;

    while (pointer <= range.end) {
      const bucketEnd = addUtcDays(pointer, 6);
      const end = bucketEnd <= range.end ? bucketEnd : range.end;
      buckets.push({
        label: `Sem ${weekNumber}`,
        start: pointer,
        end,
      });
      pointer = addUtcDays(end, 1);
      weekNumber += 1;
    }

    return buckets;
  }

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthStart = new Date(
      Date.UTC(range.start.getUTCFullYear(), monthIndex, 1),
    );
    const monthEnd = new Date(
      Date.UTC(range.start.getUTCFullYear(), monthIndex + 1, 0),
    );
    return {
      label: formatUtcDate(monthStart, { month: "short" }),
      start: monthStart,
      end: monthEnd,
    };
  });
}

function valueInBucket(
  value: string | Date | null,
  timeZone: string,
  bucket: TrendBucket,
) {
  return isDateWithinRange(value, timeZone, {
    start: bucket.start,
    end: bucket.end,
  });
}

function buildBreakdownRows(entries: Map<string, number>, total: number) {
  return Array.from(entries.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({
      label,
      value,
      percentage: getPercentageShare(value, total),
    })) satisfies ReportBreakdownRow[];
}

function getPaymentDate(payment: PaymentRecord) {
  return payment.collectionDate ?? payment.processedAt ?? payment.createdAt;
}

function getCustomerEntryDate(customer: CustomerRecord) {
  return customer.joinedAt;
}

function buildActiveClientSet(
  appointments: AppointmentRecord[],
  payments: PaymentRecord[],
) {
  const keys = new Set<string>();

  for (const appointment of appointments) {
    const nameKey = normalizeTextKey(appointment.customerName);
    if (nameKey) {
      keys.add(`name:${nameKey}`);
    }
  }

  for (const payment of payments) {
    if (payment.customerId) {
      keys.add(`id:${payment.customerId}`);
      continue;
    }
    const nameKey = normalizeTextKey(payment.customerName);
    if (nameKey) {
      keys.add(`name:${nameKey}`);
    }
  }

  return keys;
}

function buildCustomerLookup(customers: CustomerRecord[]) {
  const lookup = new Map<string, CustomerRecord>();

  for (const customer of customers) {
    lookup.set(`id:${customer.id}`, customer);
    lookup.set(`name:${normalizeTextKey(customer.fullName)}`, customer);
  }

  return lookup;
}

function buildServiceLookup(services: ServiceRecord[]) {
  const byId = new Map<string, ServiceRecord>();
  const byName = new Map<string, ServiceRecord>();

  for (const service of services) {
    byId.set(service.id, service);
    byName.set(normalizeTextKey(service.name), service);
  }

  return { byId, byName };
}

function getReportService(
  appointment: AppointmentRecord,
  services: ReturnType<typeof buildServiceLookup>,
) {
  if (appointment.serviceId && services.byId.has(appointment.serviceId)) {
    return services.byId.get(appointment.serviceId) ?? null;
  }

  return services.byName.get(normalizeTextKey(appointment.serviceName)) ?? null;
}

function buildServiceRows(
  appointments: AppointmentRecord[],
  services: ReturnType<typeof buildServiceLookup>,
) {
  const aggregates = new Map<
    string,
    {
      serviceName: string;
      category: ServiceRecord["category"];
      bookings: number;
      revenue: number;
    }
  >();

  for (const appointment of appointments) {
    const service = getReportService(appointment, services);
    const serviceName = appointment.serviceName;
    const key = normalizeTextKey(serviceName);
    const current = aggregates.get(key) ?? {
      serviceName,
      category: service?.category ?? null,
      bookings: 0,
      revenue: 0,
    };

    current.bookings += 1;
    current.revenue += appointment.price;
    if (!current.category && service?.category) {
      current.category = service.category;
    }

    aggregates.set(key, current);
  }

  const totalRevenue = sum(
    Array.from(aggregates.values()).map((entry) => entry.revenue),
  );

  return Array.from(aggregates.values())
    .sort(
      (left, right) =>
        right.revenue - left.revenue || right.bookings - left.bookings,
    )
    .map((entry) => ({
      serviceName: entry.serviceName,
      category: entry.category,
      bookings: entry.bookings,
      revenue: entry.revenue,
      percentage: getPercentageShare(entry.revenue, totalRevenue),
    })) satisfies ReportServiceRow[];
}

function buildServiceCategoryRows(serviceRows: ReportServiceRow[]) {
  const aggregates = new Map<string, number>();
  const totalRevenue = sum(serviceRows.map((row) => row.revenue));

  for (const row of serviceRows) {
    const label = row.category
      ? getServiceCategoryLabel(row.category)
      : "Sin categoría";
    aggregates.set(label, (aggregates.get(label) ?? 0) + row.revenue);
  }

  return buildBreakdownRows(aggregates, totalRevenue);
}

function buildTrendPoints(
  period: ReportPeriod,
  range: PeriodRange,
  payments: PaymentRecord[],
  appointments: AppointmentRecord[],
  timeZone: string,
) {
  const buckets = createTrendBuckets(period, range);

  return buckets.map((bucket) => ({
    label: bucket.label,
    revenue: sum(
      payments
        .filter((payment) =>
          valueInBucket(getPaymentDate(payment), timeZone, bucket),
        )
        .map((payment) => payment.amount),
    ),
    appointments: appointments.filter((appointment) =>
      valueInBucket(appointment.appointmentDate, timeZone, bucket),
    ).length,
  })) satisfies ReportTrendPoint[];
}

function buildEmployeeRows(
  staffMembers: StaffRecord[],
  appointments: AppointmentRecord[],
  staffTimeLogs: StaffTimeLogRecord[],
) {
  const aggregates = new Map<
    string,
    {
      staffId: string;
      name: string;
      role: string | null;
      appointments: number;
      revenue: number;
      hoursWorked: number;
      rating: number;
    }
  >();

  for (const staffMember of staffMembers) {
    aggregates.set(staffMember.id, {
      staffId: staffMember.id,
      name: staffMember.fullName,
      role: staffMember.role,
      appointments: 0,
      revenue: 0,
      hoursWorked: 0,
      rating: Number(staffMember.rating ?? 0),
    });
  }

  for (const appointment of appointments) {
    if (!appointment.staffMemberId) {
      continue;
    }

    const current = aggregates.get(appointment.staffMemberId);
    if (!current) {
      continue;
    }

    current.appointments += 1;
    current.revenue += appointment.price;
  }

  for (const timeLog of staffTimeLogs) {
    const current = aggregates.get(timeLog.staffMemberId);
    if (!current) {
      continue;
    }

    current.hoursWorked += timeLog.hoursWorked;
  }

  return Array.from(aggregates.values())
    .map((entry) => ({
      staffId: entry.staffId,
      name: entry.name,
      role: entry.role,
      appointments: entry.appointments,
      revenue: entry.revenue,
      hoursWorked: Number(entry.hoursWorked.toFixed(2)),
      averageTicket:
        entry.appointments > 0 ? entry.revenue / entry.appointments : 0,
      rating: entry.rating,
    }))
    .filter(
      (entry) =>
        entry.appointments > 0 || entry.revenue > 0 || entry.hoursWorked > 0,
    )
    .sort(
      (left, right) =>
        right.revenue - left.revenue || right.appointments - left.appointments,
    ) satisfies ReportEmployeeRow[];
}

function buildTopClientRows(
  customerLookup: Map<string, CustomerRecord>,
  payments: PaymentRecord[],
  appointments: AppointmentRecord[],
) {
  const aggregates = new Map<
    string,
    {
      customerId: string | null;
      name: string;
      visits: number;
      spent: number;
      lastVisitAt: string | null;
    }
  >();

  for (const payment of payments) {
    const key =
      payment.customerId ??
      (payment.customerName
        ? `name:${normalizeTextKey(payment.customerName)}`
        : "");

    if (!key) {
      continue;
    }

    const customer =
      customerLookup.get(`id:${payment.customerId}`) ??
      customerLookup.get(`name:${normalizeTextKey(payment.customerName)}`);
    const label = customer?.fullName ?? payment.customerName ?? "Cliente";
    const current = aggregates.get(key) ?? {
      customerId: customer?.id ?? payment.customerId ?? null,
      name: label,
      visits: 0,
      spent: 0,
      lastVisitAt: customer?.lastVisitAt ?? null,
    };

    current.spent += payment.amount;
    aggregates.set(key, current);
  }

  for (const appointment of appointments) {
    const customer = customerLookup.get(
      `name:${normalizeTextKey(appointment.customerName)}`,
    );
    const key =
      customer?.id ?? `name:${normalizeTextKey(appointment.customerName)}`;
    const current = aggregates.get(key) ?? {
      customerId: customer?.id ?? null,
      name: customer?.fullName ?? appointment.customerName,
      visits: 0,
      spent: 0,
      lastVisitAt: customer?.lastVisitAt ?? null,
    };

    current.visits += 1;
    if (
      !current.lastVisitAt ||
      appointment.appointmentDate > current.lastVisitAt
    ) {
      current.lastVisitAt = appointment.appointmentDate;
    }
    aggregates.set(key, current);
  }

  return Array.from(aggregates.values())
    .sort(
      (left, right) => right.spent - left.spent || right.visits - left.visits,
    )
    .slice(0, 10) satisfies ReportClientRow[];
}

function buildClientSegmentRows(customers: CustomerRecord[]) {
  const segments = [
    {
      label: "VIP (10+ visitas)",
      count: customers.filter((customer) => customer.totalAppointments >= 10)
        .length,
    },
    {
      label: "Frecuentes (5-9 visitas)",
      count: customers.filter(
        (customer) =>
          customer.totalAppointments >= 5 && customer.totalAppointments <= 9,
      ).length,
    },
    {
      label: "Regulares (2-4 visitas)",
      count: customers.filter(
        (customer) =>
          customer.totalAppointments >= 2 && customer.totalAppointments <= 4,
      ).length,
    },
    {
      label: "Nuevos (1 visita)",
      count: customers.filter((customer) => customer.totalAppointments === 1)
        .length,
    },
  ];

  const totalCustomers = customers.length;
  return segments
    .filter((segment) => segment.count > 0)
    .map((segment) => ({
      label: segment.label,
      value: segment.count,
      percentage: getPercentageShare(segment.count, totalCustomers),
    })) satisfies ReportBreakdownRow[];
}

export function formatReportValue(format: ReportMetricFormat, value: number) {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "number":
    default:
      return new Intl.NumberFormat("es-AR", {
        maximumFractionDigits: value % 1 === 0 ? 0 : 1,
      }).format(value);
  }
}

export function getComparisonClassName(tone: ReportComparisonTone) {
  switch (tone) {
    case "positive":
      return "text-emerald-700";
    case "negative":
      return "text-rose-700";
    default:
      return "text-slate-500";
  }
}

export function buildReportsSnapshot(
  {
    appointments,
    workRecords = [],
    customers,
    expenses,
    payments,
    payouts,
    services,
    staffMembers,
    staffTimeLogs,
    timeZone,
  }: ReportsSourceData,
  period: ReportPeriod,
) {
  const currentRange = getCurrentPeriodRange(period, timeZone);
  const previousRange = getPreviousPeriodRange(period, currentRange);

  const currentWorks = workRecords.filter((w) =>
    isDateWithinRange(w.workDate, timeZone, currentRange),
  );
  const workServices = new Map<
    string,
    { name: string; count: number; amount: number }
  >();
  for (const w of currentWorks) {
    const group = workServices.get(w.serviceName) || {
      name: w.serviceName,
      count: 0,
      amount: 0,
    };
    group.count++;
    group.amount = Math.round((group.amount + w.amount) * 100) / 100;
    workServices.set(w.serviceName, group);
  }
  const currentPayments = payments.filter((payment) =>
    isDateWithinRange(getPaymentDate(payment), timeZone, currentRange),
  );
  const previousPayments = payments.filter((payment) =>
    isDateWithinRange(getPaymentDate(payment), timeZone, previousRange),
  );
  const completedPayments = currentPayments.filter(
    (payment) => payment.status === "completed",
  );
  const previousCompletedPayments = previousPayments.filter(
    (payment) => payment.status === "completed",
  );

  const currentExpenses = expenses.filter((expense) =>
    isDateWithinRange(expense.expenseDate, timeZone, currentRange),
  );
  const currentPayouts = payouts.filter((payout) =>
    isDateWithinRange(payout.payoutDate, timeZone, currentRange),
  );

  const activeAppointments = appointments.filter(
    (appointment) =>
      ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) &&
      isDateWithinRange(appointment.appointmentDate, timeZone, currentRange),
  );
  const previousActiveAppointments = appointments.filter(
    (appointment) =>
      ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) &&
      isDateWithinRange(appointment.appointmentDate, timeZone, previousRange),
  );

  const currentTimeLogs = staffTimeLogs.filter((timeLog) =>
    isDateWithinRange(timeLog.workDate, timeZone, currentRange),
  );

  const revenue = sum(completedPayments.map((payment) => payment.amount));
  const previousRevenue = sum(
    previousCompletedPayments.map((payment) => payment.amount),
  );
  const totalExpenses = sum(currentExpenses.map((expense) => expense.amount));
  const totalPayouts = sum(currentPayouts.map((payout) => payout.amount));
  const netResult = revenue - totalExpenses - totalPayouts;

  const currentActiveClientKeys = buildActiveClientSet(
    activeAppointments,
    completedPayments,
  );
  const previousActiveClientKeys = buildActiveClientSet(
    previousActiveAppointments,
    previousCompletedPayments,
  );
  const currentActiveClientsCount = currentActiveClientKeys.size;
  const previousActiveClientsCount = previousActiveClientKeys.size;

  const ticketAverage = completedPayments.length
    ? revenue / completedPayments.length
    : 0;
  const previousTicketAverage = previousCompletedPayments.length
    ? previousRevenue / previousCompletedPayments.length
    : 0;

  const newCustomersCount = customers.filter((customer) =>
    isDateWithinRange(getCustomerEntryDate(customer), timeZone, currentRange),
  ).length;

  const customerLookup = buildCustomerLookup(customers);
  const recurrentActiveClientsCount = Array.from(
    currentActiveClientKeys,
  ).filter(
    (key) => (customerLookup.get(key)?.totalAppointments ?? 0) > 1,
  ).length;
  const retentionRate =
    currentActiveClientsCount > 0
      ? (recurrentActiveClientsCount / currentActiveClientsCount) * 100
      : 0;

  const averageSpend =
    currentActiveClientsCount > 0 ? revenue / currentActiveClientsCount : 0;

  const paymentMethodEntries = new Map<string, number>();
  for (const payment of completedPayments) {
    const label = getPaymentMethodLabel(payment.method);
    paymentMethodEntries.set(
      label,
      (paymentMethodEntries.get(label) ?? 0) + payment.amount,
    );
  }

  const expenseCategoryEntries = new Map<string, number>();
  for (const expense of currentExpenses) {
    expenseCategoryEntries.set(
      expense.category,
      (expenseCategoryEntries.get(expense.category) ?? 0) + expense.amount,
    );
  }

  const servicesLookup = buildServiceLookup(services);
  const serviceRows = buildServiceRows(activeAppointments, servicesLookup);
  const serviceCategoryRows = buildServiceCategoryRows(serviceRows);
  const employeeRows = buildEmployeeRows(
    staffMembers,
    activeAppointments,
    currentTimeLogs,
  );
  const topClientRows = buildTopClientRows(
    customerLookup,
    completedPayments,
    activeAppointments,
  );
  const clientSegmentRows = buildClientSegmentRows(customers);

  const overviewMetrics = [
    createMetric(
      "Ingresos totales",
      "Cobros completados del período",
      revenue,
      previousRevenue,
      "currency",
    ),
    createMetric(
      "Citas operativas",
      "Pendientes, confirmadas y completadas",
      activeAppointments.length,
      previousActiveAppointments.length,
      "number",
    ),
    createMetric(
      "Clientes activos",
      "Clientes con actividad en el período",
      currentActiveClientsCount,
      previousActiveClientsCount,
      "number",
    ),
    createMetric(
      "Cobro promedio",
      "Ingresos sobre cantidad de cobros completados",
      ticketAverage,
      previousTicketAverage,
      "currency",
    ),
  ] satisfies ReportMetric[];

  return {
    period,
    workSummary: {
      count: currentWorks.length,
      amount: sum(currentWorks.map((w) => w.amount)),
      services: [...workServices.values()].sort((a, b) => b.count - a.count),
    },
    periodLabel: getPeriodLabel(period),
    rangeLabel: formatRangeLabel(period, currentRange),
    revenue,
    expenses: totalExpenses,
    payouts: totalPayouts,
    netResult,
    completedPaymentsCount: completedPayments.length,
    appointmentsCount: activeAppointments.length,
    activeClientsCount: currentActiveClientsCount,
    overviewMetrics,
    trendPoints: buildTrendPoints(
      period,
      currentRange,
      completedPayments,
      activeAppointments,
      timeZone,
    ),
    paymentMethodRows: buildBreakdownRows(paymentMethodEntries, revenue),
    expenseCategoryRows: buildBreakdownRows(
      expenseCategoryEntries,
      totalExpenses,
    ),
    serviceRows,
    serviceCategoryRows,
    employeeRows,
    topClientRows,
    clientSegmentRows,
    clientOverview: {
      totalCustomers: customers.length,
      activeClients: currentActiveClientsCount,
      newCustomers: newCustomersCount,
      retentionRate,
      averageSpend,
    },
  } satisfies ReportsSnapshot;
}

function escapeCsvValue(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function downloadReportsCsv(snapshot: ReportsSnapshot) {
  const lines: string[] = [
    "Seccion,Concepto,Valor",
    `Resumen,Período,${escapeCsvValue(snapshot.rangeLabel)}`,
    `Resumen,Ingresos,${escapeCsvValue(snapshot.revenue)}`,
    `Resumen,Gastos,${escapeCsvValue(snapshot.expenses)}`,
    `Resumen,Distribuciones,${escapeCsvValue(snapshot.payouts)}`,
    `Resumen,Resultado neto,${escapeCsvValue(snapshot.netResult)}`,
    `Resumen,Citas operativas,${escapeCsvValue(snapshot.appointmentsCount)}`,
    `Resumen,Clientes activos,${escapeCsvValue(snapshot.activeClientsCount)}`,
  ];

  for (const row of snapshot.serviceRows.slice(0, 10)) {
    lines.push(
      `Servicios,${escapeCsvValue(row.serviceName)},${escapeCsvValue(row.revenue)}`,
    );
  }

  for (const row of snapshot.topClientRows.slice(0, 10)) {
    lines.push(
      `Clientes,${escapeCsvValue(row.name)},${escapeCsvValue(row.spent)}`,
    );
  }

  for (const row of snapshot.employeeRows.slice(0, 10)) {
    lines.push(
      `Equipo,${escapeCsvValue(row.name)},${escapeCsvValue(row.revenue)}`,
    );
  }

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `reporte-${snapshot.period}-${snapshot.rangeLabel.replaceAll(" ", "-")}.csv`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
