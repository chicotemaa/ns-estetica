"use strict";

function publicServices(services, variants) {
  return services
    .filter((service) => service.is_active)
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category || "tratamiento",
      durationMinutes: service.duration_minutes || null,
      price: Number(service.price),
      bookingEnabled:
        service.booking_enabled !== false &&
        Number(service.duration_minutes) > 0,
      variants: variants
        .filter(
          (variant) => variant.service_id === service.id && variant.is_active,
        )
        .map((variant) => ({
          id: variant.id,
          name: variant.variant_name,
          price: Number(variant.price),
          durationMinutes:
            variant.duration_minutes || service.duration_minutes || null,
        })),
    }));
}

// A variant must belong to this active service. Never trust a price or duration from the browser.
function withVariant(data, serviceId, variantId) {
  if (!variantId) {
    const variants = data.variants.filter(
      (item) => item.service_id === String(serviceId) && item.is_active,
    );
    return variants.length > 1
      ? {
          ...data,
          services: data.services.filter(
            (service) => service.id !== String(serviceId),
          ),
        }
      : data;
  }
  const variant = data.variants.find(
    (item) =>
      item.id === String(variantId) &&
      item.service_id === String(serviceId) &&
      item.is_active,
  );
  if (!variant) return { ...data, services: [] };
  return {
    ...data,
    services: data.services.map((service) =>
      service.id === String(serviceId)
        ? {
            ...service,
            name:
              variant.variant_name === "Base"
                ? service.name
                : `${service.name} · ${variant.variant_name}`,
            price: Number(variant.price),
            duration_minutes:
              variant.duration_minutes || service.duration_minutes,
          }
        : service,
    ),
  };
}

module.exports = { publicServices, withVariant };
