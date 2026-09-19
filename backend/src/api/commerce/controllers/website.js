"use strict";
const { getBusiness } = require("../../../domain/repository");
const website = require("../../../domain/website");
const media = require("../../../domain/website-media");
async function write(ctx, publish) {
  const business = await getBusiness(strapi);
  try {
    ctx.body = await website.save(
      strapi,
      business.id,
      ctx.request.body,
      publish,
    );
  } catch (error) {
    if (error.status === 409) {
      ctx.status = 409;
      ctx.body = { error: { message: error.message } };
    } else throw error;
  }
  ctx.set("Cache-Control", "no-store");
}
module.exports = {
  async get(ctx) {
    ctx.body = website.state(await getBusiness(strapi));
    ctx.set("Cache-Control", "no-store");
  },
  save: (ctx) => write(ctx, false),
  publish: (ctx) => write(ctx, true),
  async ticket(ctx) {
    const b = await getBusiness(strapi);
    ctx.body = media.issue(b.id, ctx.request.body);
    ctx.set("Cache-Control", "no-store");
  },
  async upload(ctx) {
    if (!ctx.state.websiteUpload) return ctx.unauthorized();
    ctx.body = await media.upload(
      strapi,
      ctx.state.websiteUpload,
      ctx.request.files,
    );
    ctx.set("Cache-Control", "no-store");
  },
};
