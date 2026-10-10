"use strict";
module.exports = {
  routes: [
    {
      method: "POST",
      path: "/backoffice/service-presets/laser",
      handler: "zones.install",
      config: { auth: false, policies: ["global::manager"] },
    },
    {
      method: "GET",
      path: "/backoffice/service-presets/laser",
      handler: "zones.preset",
      config: { auth: false, policies: ["global::manager"] },
    },
    {
      method: "GET",
      path: "/public/:slug/quote",
      handler: "zones.quote",
      config: { auth: false },
    },
  ],
};
