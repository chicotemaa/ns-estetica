import "server-only";
import { workbookRequest } from "./workbook-server";
import { getDateKeyInTimeZone } from "./business-shared";
import type { WorkbookData } from "./workbook-types";
export async function activityPageData(
  query: Record<string, string | string[] | undefined>,
  tab: "works" | "prices",
) {
  const today = getDateKeyInTimeZone("America/Argentina/Buenos_Aires");
  const month =
    tab === "prices"
      ? ""
      : typeof query.month === "string"
        ? query.month
        : today.slice(0, 7);
  const q = typeof query.q === "string" ? query.q : "";
  const page = typeof query.page === "string" ? query.page : "1";
  const result: WorkbookData = await workbookRequest(
    `?${new URLSearchParams({ tab, month, q, page })}`,
  );
  const fields =
    tab === "works"
      ? [
          "id",
          "work_date",
          "customer_name",
          "service_name",
          "staff_name",
          "amount",
          "collected",
          "balance",
          "collection_verified",
        ]
      : ["id", "name", "is_active", "booking_enabled", "duration_minutes"];
  const data: WorkbookData = {
    ...result,
    pending: 0,
    imported: 0,
    rows: result.rows.map((row) =>
      Object.fromEntries(fields.map((key) => [key, row[key]])),
    ),
    services: result.services.map(
      ({ id, name, price, is_active, duration_minutes, booking_enabled }) => ({
        id,
        name,
        price,
        is_active,
        duration_minutes,
        booking_enabled,
      }),
    ),
    staff: result.staff.map(({ id, full_name, is_active }) => ({
      id,
      full_name,
      is_active,
    })),
    variants: result.variants.map(
      ({ id, service_id, variant_name, price, is_active, is_default }) => ({
        id,
        service_id,
        variant_name,
        price,
        is_active,
        is_default,
      }),
    ),
  };
  return { data, month, q, today };
}
