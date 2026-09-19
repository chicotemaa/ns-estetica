import "server-only";
import { cookies } from "next/headers";
import { backendUrl, sessionCookie } from "./config";

type Filter = {
  field: string;
  operator: "eq" | "neq" | "in" | "ilike";
  value: unknown;
};
type BackendError = { message: string; code?: string };
// This adapter preserves the legacy row contracts while all authorization and
// database operations are performed by Strapi's bounded resource API.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Result<T> = { data: T | null; error: BackendError | null };

class Query<T = Row[]> implements PromiseLike<Result<T>> {
  private operation = "select";
  private payload: unknown;
  private filters: Filter[] = [];
  private ordering: { field: string; ascending: boolean }[] = [];
  private conflict?: string;
  private cardinality: "many" | "one" | "optional" = "many";
  private execution?: Promise<Result<T>>;
  constructor(private resource: string) {}
  select(_columns?: string) {
    void _columns;
    return this;
  }
  eq(field: string, value: unknown) {
    this.filters.push({ field, operator: "eq", value });
    return this;
  }
  neq(field: string, value: unknown) {
    this.filters.push({ field, operator: "neq", value });
    return this;
  }
  in(field: string, value: unknown[]) {
    this.filters.push({ field, operator: "in", value });
    return this;
  }
  ilike(field: string, value: string) {
    this.filters.push({ field, operator: "ilike", value });
    return this;
  }
  order(field: string, options: { ascending?: boolean } = {}) {
    this.ordering.push({ field, ascending: options.ascending !== false });
    return this;
  }
  insert(data: unknown) {
    this.operation = "insert";
    this.payload = data;
    return this;
  }
  update(data: unknown) {
    this.operation = "update";
    this.payload = data;
    return this;
  }
  delete() {
    this.operation = "delete";
    return this;
  }
  upsert(data: unknown, options: { onConflict?: string } = {}) {
    this.operation = "upsert";
    this.payload = data;
    this.conflict = options.onConflict;
    return this;
  }
  single() {
    this.cardinality = "one";
    return this as unknown as Query<Row>;
  }
  maybeSingle() {
    this.cardinality = "optional";
    return this as unknown as Query<Row>;
  }
  private async execute(): Promise<Result<T>> {
    try {
      const token = (await cookies()).get(sessionCookie)?.value;
      if (!token)
        return {
          data: null,
          error: {
            message: "Iniciá sesión para continuar.",
            code: "UNAUTHORIZED",
          },
        };
      const response = await fetch(`${backendUrl()}/api/backoffice/query`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resource: this.resource,
          operation: this.operation,
          data: this.payload,
          filters: this.filters,
          order: this.ordering,
          onConflict: this.conflict,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        return {
          data: null,
          error: {
            message: body.error?.message || "No se pudo consultar el servidor.",
            code: body.error?.details?.code,
          },
        };
      if (!Array.isArray(body.data))
        throw new Error("Respuesta inválida del servidor.");
      if (
        this.cardinality !== "many" &&
        (body.data.length > 1 ||
          (this.cardinality === "one" && body.data.length !== 1))
      )
        throw new Error("No se encontró un registro único.");
      return {
        data: (this.cardinality === "many"
          ? body.data
          : (body.data[0] ?? null)) as T,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "No se pudo conectar con el servidor.",
        },
      };
    }
  }
  then<TResult1 = Result<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: Result<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    this.execution ??= this.execute();
    return this.execution.then(onfulfilled, onrejected);
  }
}
export type BatchOperation = {
  resource: string;
  operation: "insert" | "update" | "delete" | "upsert";
  data?: unknown;
  filters?: Filter[];
  onConflict?: string;
};
export class BackendClient {
  from(resource: string) {
    return new Query(resource);
  }
  async batch(operations: BatchOperation[]): Promise<Result<Row[][]>> {
    try {
      const token = (await cookies()).get(sessionCookie)?.value;
      if (!token) throw new Error("Iniciá sesión para continuar.");
      const response = await fetch(`${backendUrl()}/api/backoffice/batch`, {
        method: "POST",
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ operations }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message || "No se pudieron guardar los cambios.",
        );
      return { data: result.data, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "No se pudieron guardar los cambios.",
        },
      };
    }
  }
}
export function hasBackendAdminConfig() {
  return Boolean(process.env.STRAPI_URL && process.env.BUSINESS_SLUG);
}
export function createBackendAdminClient() {
  return hasBackendAdminConfig() ? new BackendClient() : null;
}
