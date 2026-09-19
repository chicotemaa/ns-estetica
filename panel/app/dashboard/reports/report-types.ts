import type {
  AppointmentRecord,
  WorkRecord,
  CustomerRecord,
  ExpenseRecord,
  PaymentRecord,
  PayoutRecord,
  ServiceRecord,
  StaffRecord,
  StaffTimeLogRecord,
} from "@/lib/business-shared";

export type ReportPeriod = "day" | "week" | "month" | "year";
export type ReportMetricFormat = "currency" | "number" | "percentage";
export type ReportComparisonTone = "positive" | "negative" | "neutral";

export interface ReportMetric {
  label: string;
  helper: string;
  value: number;
  previousValue: number;
  format: ReportMetricFormat;
  comparison: {
    label: string;
    tone: ReportComparisonTone;
    percentageDelta: number | null;
  };
}

export interface ReportTrendPoint {
  label: string;
  revenue: number;
  appointments: number;
}

export interface ReportBreakdownRow {
  label: string;
  value: number;
  percentage: number;
}

export interface ReportServiceRow {
  serviceName: string;
  category: ServiceRecord["category"];
  bookings: number;
  revenue: number;
  percentage: number;
}

export interface ReportEmployeeRow {
  staffId: string;
  name: string;
  role: string | null;
  appointments: number;
  revenue: number;
  hoursWorked: number;
  averageTicket: number;
  rating: number;
}

export interface ReportClientRow {
  customerId: string | null;
  name: string;
  visits: number;
  spent: number;
  lastVisitAt: string | null;
}

export interface ReportsSnapshot {
  period: ReportPeriod;
  workSummary: {
    count: number;
    amount: number;
    services: { name: string; count: number; amount: number }[];
  };
  periodLabel: string;
  rangeLabel: string;
  revenue: number;
  expenses: number;
  payouts: number;
  netResult: number;
  completedPaymentsCount: number;
  appointmentsCount: number;
  activeClientsCount: number;
  overviewMetrics: ReportMetric[];
  trendPoints: ReportTrendPoint[];
  paymentMethodRows: ReportBreakdownRow[];
  expenseCategoryRows: ReportBreakdownRow[];
  serviceRows: ReportServiceRow[];
  serviceCategoryRows: ReportBreakdownRow[];
  employeeRows: ReportEmployeeRow[];
  topClientRows: ReportClientRow[];
  clientSegmentRows: ReportBreakdownRow[];
  clientOverview: {
    totalCustomers: number;
    activeClients: number;
    newCustomers: number;
    retentionRate: number;
    averageSpend: number;
  };
}

export interface ReportsSourceData {
  appointments: AppointmentRecord[];
  workRecords?: WorkRecord[];
  customers: CustomerRecord[];
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
  payouts: PayoutRecord[];
  services: ServiceRecord[];
  staffMembers: StaffRecord[];
  staffTimeLogs: StaffTimeLogRecord[];
  timeZone: string;
}
