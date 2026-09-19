"use strict";
const { errors } = require("@strapi/utils");
const { writes, locked } = require("./domain/booking");
const { resources } = require("./domain/repository");
const initialAccess = require("./domain/initial-access");
module.exports = {
  register({ strapi }) {
    strapi.documents.use(async (context, next) => {
      if (
        context.uid === resources.appointments.uid &&
        ["create", "update", "delete", "clone"].includes(context.action) &&
        !writes.getStore()
      ) {
        throw new errors.ValidationError(
          "Gestioná los turnos desde Mi Comercio para validar su disponibilidad.",
        );
      }
      return next();
    });
  },
  async bootstrap({ strapi }) {
    const store = strapi.store({ type: "plugin", name: "users-permissions" });
    const advanced = await store.get({ key: "advanced" });
    await store.set({
      key: "advanced",
      value: { ...advanced, allow_register: false },
    });
    const roles = strapi.db.query("plugin::users-permissions.role");
    if (!(await roles.findOne({ where: { type: "business-manager" } }))) {
      await roles.create({
        data: {
          name: "Business Manager",
          type: "business-manager",
          description:
            "Acceso privado a Mi Comercio para el negocio configurado.",
        },
      });
    }
    await initialAccess(strapi);
    if (process.env.SEED_BUSINESS === "true") {
      const slug = process.env.BUSINESS_SLUG || "natalia-sanchez-estetica";
      // Only initialize an empty business. Never replace existing business data.
      await locked(strapi, 0, async () => {
        if (
          await strapi.db
            .query(resources.businesses.uid)
            .findOne({ where: { slug } })
        )
          return;
        const business = await strapi
          .documents(resources.businesses.uid)
          .create({
            data: {
              name: "Natalia Sánchez Estética",
              slug,
              time_zone: "America/Argentina/Buenos_Aires",
              brand_initials: "NA",
            },
          });
        for (const [index, [name, duration_minutes, price]] of [
          ["Masaje descontracturante", 60, 0],
          ["Tratamiento facial", 60, 0],
          ["Manicura", 60, 0],
          ["Pedicura", 60, 0],
        ].entries()) {
          await strapi.documents(resources.services.uid).create({
            data: {
              business: business.id,
              name,
              duration_minutes,
              price,
              display_order: index,
              is_active: false,
            },
          });
        }
        await strapi.documents(resources.staff_members.uid).create({
          data: {
            business: business.id,
            full_name: "Natalia Sánchez",
            role: "Especialista en estética",
            is_active: true,
          },
        });
        for (let day = 0; day < 7; day += 1) {
          await strapi.documents(resources.business_hours.uid).create({
            data: {
              business: business.id,
              day_of_week: day,
              label: [
                "Domingo",
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
              ][day],
              is_open: day >= 2,
              open_time: day === 6 ? "12:00:00.000" : "11:00:00.000",
              close_time: "22:00:00.000",
            },
          });
        }
        await strapi.documents(resources.booking_settings.uid).create({
          data: {
            business: business.id,
            slot_interval_minutes: 30,
            lead_time_minutes: 120,
            max_booking_days_in_advance: 30,
            buffer_between_appointments_minutes: 0,
          },
        });
        strapi.log.info(
          "Negocio inicial creado. Revisá precios y horarios en Mi Comercio antes de publicar.",
        );
      });
    }
  },
};
