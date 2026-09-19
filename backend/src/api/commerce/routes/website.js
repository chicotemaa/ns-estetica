"use strict";
const manager = { auth: false, policies: ["global::manager"] };
module.exports = {
  routes: [
    {
      method: "GET",
      path: "/backoffice/website",
      handler: "website.get",
      config: manager,
    },
    {
      method: "PUT",
      path: "/backoffice/website",
      handler: "website.save",
      config: manager,
    },
    {
      method: "POST",
      path: "/backoffice/website/publish",
      handler: "website.publish",
      config: manager,
    },
    {
      method: "POST",
      path: "/backoffice/website/upload-ticket",
      handler: "website.ticket",
      config: manager,
    },
    {
      method: "POST",
      path: "/website/upload",
      handler: "website.upload",
      config: { auth: false },
    },
  ],
};
