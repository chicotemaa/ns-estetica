import { getBusinessOperationsBundle } from "@/lib/business-data";

import { PaymentsPageClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const {
    business,
    customers,
    staffMembers,
    payments,
    expenses,
    payouts,
    isLive,
  } = await getBusinessOperationsBundle();

  return (
    <PaymentsPageClient
      businessName={business.name}
      customers={customers}
      expenses={expenses}
      isLive={isLive}
      payments={payments}
      payouts={payouts}
      staffMembers={staffMembers}
      timeZone={business.timeZone}
    />
  );
}
