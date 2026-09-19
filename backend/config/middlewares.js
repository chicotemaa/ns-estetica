module.exports = ({ env }) => [
  "strapi::logger",
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: {
      origin: env.array("CORS_ORIGINS", [
        "http://localhost:5173",
        "http://localhost:3000",
      ]),
      headers: ["Content-Type", "Authorization", "Idempotency-Key"],
      credentials: false,
    },
  },
  "strapi::poweredBy",
  "strapi::query",
  "global::website-upload",
  {
    name: "strapi::body",
    config: {
      jsonLimit: "256kb",
      formidable: {
        maxFileSize: 50 * 1024 * 1024,
        maxTotalFileSize: 50 * 1024 * 1024,
        maxFiles: 1,
        maxFieldsSize: 1024,
      },
    },
  },
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
