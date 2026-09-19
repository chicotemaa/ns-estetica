import LoginForm from "./login-form";
import { backendUrl } from "@/lib/backend/config";
import {
  defaultWebsite,
  type WebsiteContent,
} from "@/lib/website/website-content";
export const dynamic = "force-dynamic";
export default async function AuthPage() {
  let identity = defaultWebsite.identity;
  try {
    const response = await fetch(
      `${backendUrl()}/api/public/${encodeURIComponent(process.env.BUSINESS_SLUG || "natalia-sanchez-estetica")}/catalog`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (response.ok) {
      const catalog = await response.json();
      identity =
        (catalog.website as WebsiteContent | null)?.identity || identity;
    }
  } catch {
    /* The sign-in form remains available if the catalog is temporarily unreachable. */
  }
  const logo = identity.logo.startsWith("/")
    ? new URL(
        identity.logo,
        process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.nataliasanchez.com.ar",
      ).href
    : identity.logo;
  return <LoginForm identity={{ ...identity, logo }} />;
}
