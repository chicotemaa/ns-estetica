"use strict";
// Validate the one-use capability BEFORE parsing a potentially large multipart body.
module.exports = () => async (ctx, next) => {
  if (ctx.path === "/api/website/upload" && ctx.method === "POST") {
    const token = (ctx.request.header.authorization || "").replace(
      /^Bearer /,
      "",
    );
    const ticket = require("../domain/website-media").consume(token);
    if (!ticket)
      return ctx.unauthorized(
        "La autorización de carga venció. Volvé a intentar.",
      );
    if (!ctx.is("multipart/form-data"))
      return ctx.badRequest("Formato de carga inválido.");
    ctx.state.websiteUpload = ticket;
  }
  return next();
};
