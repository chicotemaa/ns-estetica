"use strict";
const calendar = require("../../../domain/google-calendar");
const { getBusiness } = require("../../../domain/repository");
const { errors } = require("@strapi/utils");
module.exports = {
  async status(ctx) {
    const b = await getBusiness(strapi);
    ctx.set("Cache-Control", "no-store");
    ctx.body = await calendar.status(strapi, b.id);
  },
  async blocks(ctx) {
    const b = await getBusiness(strapi);
    ctx.set("Cache-Control", "no-store");
    ctx.body = { blocks: await calendar.blocks(strapi, b.id, undefined, true) };
  },
  async calendars(ctx) {
    const b = await getBusiness(strapi);
    ctx.set("Cache-Control", "no-store");
    ctx.body = await calendar.calendars(strapi, b.id);
  },
  async action(ctx) {
    const b = await getBusiness(strapi),
      body = ctx.request.body || {};
    ctx.set("Cache-Control", "no-store");
    switch (ctx.params.action) {
      case "connect":
        ctx.body = await calendar.connect(strapi, b.id, ctx.state.manager.id);
        break;
      case "callback":
        ctx.body = await calendar.callback(
          strapi,
          b.id,
          ctx.state.manager.id,
          body,
        );
        break;
      case "select":
        ctx.body = await calendar.select(strapi, b.id, body.calendarId);
        break;
      case "disconnect":
        ctx.body = await calendar.disconnect(strapi, b.id);
        break;
      case "sync":
        ctx.body = await calendar.sync(strapi, b.id);
        break;
      case "resolve":
        ctx.body = await calendar.resolve(strapi, b.id, body.key);
        break;
      default:
        throw new errors.ValidationError("Acción inválida.");
    }
  },
};
