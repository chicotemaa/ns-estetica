import { activityPageData } from "@/lib/activity-page-data";
import { WorkbookClient } from "../../workbook/page-client";
export const dynamic = "force-dynamic";
export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <WorkbookClient
      {...await activityPageData(await searchParams, "prices")}
      tab="prices"
    />
  );
}
