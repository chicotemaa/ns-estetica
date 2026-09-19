import { getBusinessOperationsBundle, getBusinessDataBundle } from "@/lib/business-data";

import { ClientsPageClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [operations, agenda] = await Promise.all([getBusinessOperationsBundle(), getBusinessDataBundle()]);
  const { business, isLive, payments } = operations;
  const customers = operations.customers.map(customer => {
    const visits = agenda.appointments.filter(a => a.customerId === customer.id && a.status === "completed").sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));
    return { ...customer, totalAppointments: visits.length, totalSpent: payments.filter(p => p.customerId === customer.id && p.status === "completed").reduce((sum, p) => sum + Math.round(p.amount * 100), 0) / 100, lastVisitAt: visits[0] ? visits[0].appointmentDate + "T12:00:00Z" : null };
  });

  return (
    <ClientsPageClient
      businessName={business.name}
      customers={customers}
      isLive={isLive}
      timeZone={business.timeZone}
    />
  );
}
