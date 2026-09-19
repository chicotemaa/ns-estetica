import { financeRequest, FinanceError } from "@/lib/finance-server";
import { getBusinessDataBundle } from "@/lib/business-data";
import { Payroll } from "./payroll";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; staffId?: string; period?: string }>;
}) {
  const [params, { business }] = await Promise.all([
    searchParams,
    getBusinessDataBundle(),
  ]);
  const current = new Intl.DateTimeFormat("en-CA", {
    timeZone: business.timeZone,
  })
    .format(new Date())
    .slice(0, 7);
  const query = new URLSearchParams({
    month: /^20\d{2}-(0[1-9]|1[0-2])$/.test(params.month || "")
      ? params.month!
      : current,
  });
  if (params.staffId) query.set("staffId", params.staffId);
  if (params.period) query.set("period", params.period);
  let data;
  try {
    data = await financeRequest(`payroll?${query}`);
  } catch (error) {
    if (
      !(error instanceof FinanceError) ||
      error.status !== 400 ||
      !query.has("period")
    )
      throw error;
    query.delete("period");
    data = await financeRequest(`payroll?${query}`);
  }
  return <Payroll data={data} periodKey={query.get("period") || undefined} />;
}
