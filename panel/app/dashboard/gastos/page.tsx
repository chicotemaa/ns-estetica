import { financeRequest } from "@/lib/finance-server";
import { getBusinessDataBundle } from "@/lib/business-data";
import { ExpensesPlanner } from "./planner";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ month }, { business }] = await Promise.all([
    searchParams,
    getBusinessDataBundle(),
  ]);
  const current = new Intl.DateTimeFormat("en-CA", {
    timeZone: business.timeZone,
  })
    .format(new Date())
    .slice(0, 7);
  return (
    <ExpensesPlanner
      data={await financeRequest(
        `expenses?month=${encodeURIComponent(/^20\d{2}-(0[1-9]|1[0-2])$/.test(month || "") ? month! : current)}`,
      )}
    />
  );
}
