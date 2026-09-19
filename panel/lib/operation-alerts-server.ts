import "server-only";
import { cookies } from "next/headers";
import { backendUrl, sessionCookie } from "./backend/config";
import type { AlertKind, OperationAlert } from "./operation-alerts";
export interface InboxAlert extends OperationAlert {
  revision: string;
  readAt: string | null;
}
export interface InboxData {
  alerts: InboxAlert[];
  counts: Record<AlertKind, number>;
  attentionCount: number;
  unreadCount: number;
  today: string;
  updatedAt: string;
}
export interface EmailStatus {
  configured: boolean;
  enabled: boolean;
  from: string | null;
  to: string | null;
  cadence: string;
  latest: {
    date: string;
    status: string;
    error: string | null;
    updatedAt: string;
  } | null;
}
export async function notificationRequest(path = "", init: RequestInit = {}) {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) throw new Error("Iniciá sesión para continuar.");
  const response = await fetch(
    `${backendUrl()}/api/backoffice/notifications${path}`,
    {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error?.message || "No se pudieron actualizar los avisos.",
    );
  return result;
}
export async function getOperationAlerts(): Promise<InboxData> {
  return notificationRequest();
}
export async function getNotificationEmailStatus(): Promise<EmailStatus> {
  return notificationRequest("/email");
}
