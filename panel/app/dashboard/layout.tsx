import { getManagedBusiness } from "@/lib/managed-business";
import { brandFromRecord } from "@/lib/brand";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { sessionCookie } from "@/lib/backend/config";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await cookies()).has(sessionCookie)) redirect("/auth");
  const result = await getManagedBusiness();
  if (!result.data) throw new Error(result.error);
  const {data,error} = await result.data.backend.from("businesses").select().eq("id",result.data.business.id).single();
  if (error || !data) throw new Error("No se pudo cargar el negocio.");
  return <DashboardLayout brand={brandFromRecord(data)}>{children}</DashboardLayout>;
}
