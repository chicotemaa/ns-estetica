import { NextResponse } from "next/server";
import { workbookRequest, WorkbookRequestError } from "@/lib/workbook-server";
import type { WorkbookData } from "@/lib/workbook-types";
const csvCell = (value: unknown) => {
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value).replace(".", ",") : "";
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
};
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if (params.get("format") !== "csv")
      return NextResponse.json(await workbookRequest(`?${params}`));
    params.set("export", "true");
    params.delete("format");
    const data: WorkbookData = await workbookRequest(`?${params}`);
    const tab = params.get("tab") || "works";
    const rows =
      tab === "prices"
        ? [
            ["Servicio", "Variante", "Precio actual", "Origen"],
            ...data.rows.flatMap((row) =>
              data.variants
                .filter((v) => v.service_id === row.id)
                .map((v) => [
                  row.name,
                  v.variant_name,
                  Number(v.price),
                  row.source_ref,
                ]),
            ),
          ]
        : tab === "review"
          ? [
              ["Hoja", "Fila", "Fecha", "Observaciones", "Datos originales"],
              ...data.rows.map((row) => [
                row.source_sheet,
                row.source_row,
                row.record_date,
                Array.isArray(row.review_notes)
                  ? row.review_notes.join(" | ")
                  : "",
                JSON.stringify(row.source_data),
              ]),
            ]
          : [
              [
                "Fecha",
                "Cliente en origen",
                "Trabajo realizado",
                "Profesional",
                "Importe original",
                "Cobro verificado",
                "Notas",
                "Origen",
              ],
              ...data.rows.map((row) => [
                row.work_date,
                row.customer_name,
                row.service_name,
                row.staff_name,
                Number(row.amount),
                row.collection_verified ? "Sí" : "Por verificar",
                row.notes,
                row.source_ref,
              ]),
            ];
    return new Response(
      "\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="planilla-${tab}.csv"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo descargar.",
      },
      { status: 400 },
    );
  }
}
async function write(request: Request, path: string, method: string) {
  try {
    return NextResponse.json(
      await workbookRequest(path, {
        method,
        headers: {
          "Idempotency-Key": request.headers.get("Idempotency-Key") || "",
        },
        body: JSON.stringify(await request.json()),
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo confirmar el resultado. Reintentá con los mismos datos.",
      },
      { status: error instanceof WorkbookRequestError ? error.status : 502 },
    );
  }
}
export const POST = (request: Request) =>
  write(
    request,
    new URL(request.url).searchParams.get("action") === "collect"
      ? "/collect"
      : "/work",
    "POST",
  );
export const PATCH = (request: Request) => write(request, "/price", "PATCH");
