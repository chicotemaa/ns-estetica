"use strict";
const {
  getBusiness,
  repository,
  numericId,
} = require("../../../domain/repository");
const { errors } = require("@strapi/utils");
module.exports = {
  async install(ctx) {
    const b = await getBusiness(strapi);
    ctx.body = await require("../../../domain/booking").locked(
      strapi,
      b.id,
      async () => {
        const repo = repository(strapi, b.id),
          name = "Depilación definitiva láser";
        const [existing] = await repo.records("services", [
          { field: "name", operator: "ilike", value: name },
        ]);
        if (existing)
          return {
            created: false,
            id: existing.id,
            message: "El servicio ya existe; se conservaron sus datos.",
          };
        const result = await repo.mutate("services", "insert", {
          business_id: String(b.id),
          name,
          description:
            "Seleccioná tus zonas. Desde 3 zonas, 20% de descuento; todo el cuerpo, 30%. Reservá hasta 24 horas antes de tu turno.",
          category: "coloraciones",
          price: 5000,
          duration_minutes: null,
          is_active: true,
          booking_enabled: false,
          zone_pricing: require("../../../domain/zone-pricing").preset(),
        });
        return { created: true, id: String(result[0].id) };
      },
    );
  },
  async preset(ctx) {
    ctx.body = require("../../../domain/zone-pricing").preset();
  },
  async quote(ctx) {
    const b = await getBusiness(strapi, ctx.params.slug);
    numericId(ctx.query.serviceId);
    const [s] = await repository(strapi, b.id).records("services", [
      { field: "id", operator: "eq", value: ctx.query.serviceId },
    ]);
    if (!s?.is_active)
      throw new errors.NotFoundError("Servicio no disponible.");
    ctx.set("Cache-Control", "no-store");
    ctx.body = require("../../../domain/zone-pricing").quote(s, {
      zoneIds:
        typeof ctx.query.zoneIds === "string" && ctx.query.zoneIds
          ? ctx.query.zoneIds.split(",")
          : [],
      fullBody: ctx.query.fullBody === "true",
    });
  },
};
