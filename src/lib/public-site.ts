import { defaultWebsite, type WebsiteContent } from './website-content';
export type BusinessContact = { address?: string; phone?: string; email?: string; instagramHandle?: string; whatsappPhone?: string };
export type SiteCatalog = { website?: WebsiteContent | null; brand?: BusinessContact; services?: { id: string; name: string; price: number; durationMinutes?: number }[] };
export async function getSiteCatalog(): Promise<SiteCatalog> {
  const origin = process.env.ESTETICA_BACKEND_URL;
  if (!origin) return {};
  try {
    const response = await fetch(new URL('/api/public/natalia-sanchez-estetica/catalog', origin), {cache:'no-store', signal:AbortSignal.timeout(8000)});
    return response.ok ? await response.json() : {};
  } catch { return {}; }
}
export function mergeWebsite(saved?: Partial<WebsiteContent> | null): WebsiteContent {
  return Object.fromEntries(Object.entries(defaultWebsite).map(([key, value]) => [key, {...value,...(saved?.[key as keyof WebsiteContent] || {})}])) as WebsiteContent;
}

