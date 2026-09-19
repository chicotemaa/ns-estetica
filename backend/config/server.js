module.exports = ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  url: env("PUBLIC_URL", "http://localhost:1337"),
  proxy: { koa: true },
  app: { keys: env.array("APP_KEYS") },
  cron: {
    enabled: true,
    tasks: {
      customerBookings: {
        task: async ({ strapi }) => {
          try {
            await require("../src/domain/online-booking").maintain(strapi);
          } catch {
            strapi.log.error(
              "No se pudieron procesar los avisos de reservas online.",
            );
          }
        },
        options: { rule: "* * * * *" },
      },
      notificationDigest: {
        task: async ({ strapi }) => {
          try {
            await require("../src/domain/notification-digest").runDigest(
              strapi,
            );
          } catch {
            strapi.log.error(
              "No se pudo procesar el resumen de notificaciones.",
            );
          }
        },
        options: { rule: "*/5 * * * *" },
      },
    },
  },
});
