"use strict";
const config = { auth: false, policies: ["global::manager"] };
module.exports = {
  routes: [
    {
      method: "GET",
      path: "/backoffice/google-calendar",
      handler: "google-calendar.status",
      config,
    },
    {
      method: "GET",
      path: "/backoffice/google-calendar/blocks",
      handler: "google-calendar.blocks",
      config,
    },
    {
      method: "GET",
      path: "/backoffice/google-calendar/calendars",
      handler: "google-calendar.calendars",
      config,
    },
    {
      method: "POST",
      path: "/backoffice/google-calendar/:action",
      handler: "google-calendar.action",
      config,
    },
  ],
};
