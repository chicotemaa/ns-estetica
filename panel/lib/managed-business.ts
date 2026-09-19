import "server-only";

import type { BackendClient } from "@/lib/backend/client";

import {
  createBackendAdminClient,
  hasBackendAdminConfig,
} from "@/lib/backend/client";

export interface ManagedBusinessContext {
  backend: BackendClient;
  business: {
    id: string;
    slug: string;
  };
}

export async function getManagedBusiness(): Promise<{
  data?: ManagedBusinessContext;
  error?: string;
}> {
  const businessSlug = process.env.BUSINESS_SLUG;

  if (!businessSlug || !hasBackendAdminConfig()) {
    return { error: "Falta la configuración de Backend o BUSINESS_SLUG." };
  }

  const backend = createBackendAdminClient();

  if (!backend) {
    return { error: "No se pudo crear el cliente administrador de Backend." };
  }

  const { data: business, error } = await backend
    .from("businesses")
    .select("id, slug")
    .eq("slug", businessSlug)
    .maybeSingle();

  if (error || !business) {
    return { error: "No se encontró el negocio configurado." };
  }

  return {
    data: {
      backend,
      business: { id: String(business.id), slug: String(business.slug) },
    },
  };
}
