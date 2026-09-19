import type {
  ServiceCategory,
  StaffCompensationType,
} from "@/lib/business-shared";

export interface EmployeeServiceOption {
  id: string;
  name: string;
  category: ServiceCategory | null;
  isActive: boolean;
}

export interface EmployeeWorkingHourFormState {
  dayOfWeek: number;
  label: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
  breakStartTime: string;
  breakEndTime: string;
}

export interface EmployeeSummary {
  payrollCadence?: "weekly" | "semimonthly" | "monthly";
  payrollWeekday?: number;
  payrollCutoffFirst?: number;
  payrollCutoffSecond?: number;
  payrollPayDelay?: number;

  collectionCommissionRate?: number;
  id: string;
  fullName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  joinDate: string | null;
  isActive: boolean;
  employeeCode: string | null;
  hourlyRate: number;
  rating: number;
  compensationType: StaffCompensationType;
  assignedServiceIds: string[];
  workingHours: EmployeeWorkingHourFormState[];
  categoryRates: Record<ServiceCategory, number>;
  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;
  generatedRevenue: number;
  averageTicket: number;
  totalHoursWorked: number;
  estimatedCompensation: number;
  formattedRevenue: string;
  formattedAverageTicket: string;
  formattedHoursWorked: string;
  formattedEstimatedCompensation: string;
  formattedHourlyRate: string;
}

export interface EmployeeFormState {
  collectionCommissionRate: string;
  payrollCadence: "weekly" | "semimonthly" | "monthly";
  payrollWeekday: string;
  payrollCutoffFirst: string;
  payrollCutoffSecond: string;
  payrollPayDelay: string;
  fullName: string;
  role: string;
  email: string;
  phone: string;
  bio: string;
  joinDate: string;
  employeeCode: string;
  hourlyRate: string;
  compensationType: StaffCompensationType;
  assignedServiceIds: string[];
  workingHours: EmployeeWorkingHourFormState[];
  categoryRates: Record<ServiceCategory, string>;
  isActive: boolean;
}

export interface EmployeeFeedbackState {
  title: string;
  description: string;
  tone: "success" | "warning" | "error";
}
