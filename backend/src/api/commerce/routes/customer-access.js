"use strict";
const config = {
  auth: false,
  policies: ["global::customer-proxy"],
  middlewares: [{ name: "global::booking-rate-limit", config: { max: 60 } }],
};
const route = (method, path, handler) => ({
  method,
  path: `/customer/${path}`,
  handler: `customer-access.${handler}`,
  config,
});
module.exports = {
  routes: [
    route("POST", "register", "register"),
    route("POST", "login", "login"),
    route("POST", "reset", "reset"),
    {
      method: "GET",
      path: "/backoffice/customer-accounts",
      handler: "customer-access.accounts",
      config: { auth: false, policies: ["global::manager"] },
    },
    {
      method: "POST",
      path: "/backoffice/customer-recovery",
      handler: "customer-access.recovery",
      config: { auth: false, policies: ["global::manager"] },
    },
    route("GET", "config", "config"),
    route("POST", "challenge", "challenge"),
    route("POST", "verify", "verify"),
    route("GET", "me", "me"),
    route("PUT", "profile", "profile"),
    route("POST", "logout", "logout"),
    route("POST", "bookings", "start"),
    route("GET", "bookings", "bookings"),
    route("GET", "bookings/:key", "bookings"),
    route("POST", "bookings/:key/cancel", "cancel"),
    {
      method: "GET",
      path: "/backoffice/online-booking",
      handler: "customer-access.admin",
      config: { auth: false, policies: ["global::manager"] },
    },
    {
      method: "PUT",
      path: "/backoffice/online-booking",
      handler: "customer-access.save",
      config: { auth: false, policies: ["global::manager"] },
    },
    {
      method: "POST",
      path: "/payments/mercado-pago/webhook",
      handler: "customer-access.webhook",
      config: { auth: false },
    },
  ],
};
