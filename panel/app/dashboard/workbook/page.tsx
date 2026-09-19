import { redirect } from "next/navigation";
export default async function LegacyWorkbookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const path =
    query.tab === "prices"
      ? "/dashboard/services/prices"
      : "/dashboard/atenciones";
  const params = new URLSearchParams();
  for (const key of ["month", "q", "page"])
    if (typeof query[key] === "string") params.set(key, query[key]);
  redirect(path + "?" + params);
}
