import { activityPageData } from "@/lib/activity-page-data";
import { WorkbookClient } from "../workbook/page-client";
export const dynamic = "force-dynamic";
export default async function AtencionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const props = await activityPageData(query, "works");
  return (
    <WorkbookClient
      key={query.new === "1" ? "new" : "list"}
      {...props}
      tab="works"
      startNew={query.new === "1"}
    />
  );
}
