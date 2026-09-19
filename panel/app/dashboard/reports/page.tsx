import {
  getBusinessDataBundle,
  getBusinessOperationsBundle,
} from "@/lib/business-data";

import { ReportsPageClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [businessData, businessOperations] = await Promise.all([
    getBusinessDataBundle(),
    getBusinessOperationsBundle(),
  ]);

  const business = businessData.isLive
    ? businessData.business
    : businessOperations.business;

  return (
    <ReportsPageClient
      appointments={businessData.appointments}
      workRecords={businessOperations.workRecords}
      businessName={business.name}
      customers={businessOperations.customers}
      expenses={businessOperations.expenses}
      isLive={businessData.isLive && businessOperations.isLive}
      payments={businessOperations.payments}
      payouts={businessOperations.payouts}
      services={businessData.services}
      staffMembers={businessData.staffMembers}
      staffTimeLogs={businessOperations.staffTimeLogs}
      timeZone={business.timeZone}
    />
  );
}
