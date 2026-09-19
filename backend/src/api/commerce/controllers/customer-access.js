"use strict";
const { errors } = require("@strapi/utils");
const { getBusiness } = require("../../../domain/repository");
const auth = require("../../../domain/customer-auth");
const booking = require("../../../domain/online-booking");
const {
  resolveConfiguration,
  publicConfiguration,
} = require("../../../domain/customer-config");
const mp = require("../../../domain/mercado-pago");
const token = (ctx) =>
  ctx.request.headers.authorization?.replace(/^Bearer /, "");
async function session(ctx) {
  const business = await getBusiness(strapi);
  const account = await auth.accountFor(strapi, business.id, token(ctx));
  return { business, account };
}
module.exports = {
  async config(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = publicConfiguration(
      await resolveConfiguration(strapi, business.id),
    );
    ctx.set("Cache-Control", "no-store");
  },
  async challenge(ctx) {
    const business = await getBusiness(strapi);
    const { kind, email } = ctx.request.body || {};
    if (!["google", "email"].includes(kind))
      throw new errors.ValidationError("Acceso inválido.");
    ctx.body = await auth.challenge(strapi, business.id, kind, email);
  },
  async verify(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await auth.finish(strapi, business.id, ctx.request.body);
    ctx.set("Cache-Control", "no-store");
  },
  async me(ctx) {
    const { account } = await session(ctx);
    ctx.body = { account: auth.clean(account) };
    ctx.set("Cache-Control", "no-store");
  },
  async profile(ctx) {
    const { business, account } = await session(ctx);
    ctx.body = await auth.saveProfile(
      strapi,
      business.id,
      account,
      ctx.request.body,
    );
  },
  async logout(ctx) {
    ctx.body = await auth.logout(strapi, token(ctx));
  },
  async start(ctx) {
    const { business, account } = await session(ctx);
    ctx.body = await booking.start(
      strapi,
      business,
      account,
      ctx.request.body,
      ctx.request.headers["idempotency-key"],
    );
  },
  async bookings(ctx) {
    const { business, account } = await session(ctx);
    ctx.body = await booking.list(strapi, business, account, ctx.params.key);
    ctx.set("Cache-Control", "no-store");
  },
  async cancel(ctx) {
    const { business, account } = await session(ctx);
    ctx.body = await booking.cancel(strapi, business, account, ctx.params.key);
  },
  async admin(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await booking.adminStatus(strapi, business);
    ctx.set("Cache-Control", "no-store");
  },
  async save(ctx) {
    const business = await getBusiness(strapi);
    await require("../../../domain/customer-settings").save(
      strapi,
      business.id,
      ctx.request.body,
    );
    ctx.body = await booking.adminStatus(strapi, business);
    ctx.set("Cache-Control", "no-store");
  },
  async webhook(ctx) {
    const business = await getBusiness(strapi);
    const c = await resolveConfiguration(strapi, business.id);
    if (!c.paymentReady) {
      ctx.status = 503;
      ctx.body = { error: "Integración no configurada." };
      return;
    }
    const body = ctx.request.body || {};
    if (
      !mp.verifySignature(
        {
          signature: ctx.request.headers["x-signature"],
          requestId: ctx.request.headers["x-request-id"],
          id: ctx.query["data.id"],
          bodyId: body.data?.id,
        },
        c.MP_WEBHOOK_SECRET,
      )
    ) {
      ctx.status = 401;
      ctx.body = { error: "Firma inválida." };
      return;
    }
    if (body.type !== "payment") {
      ctx.body = { ignored: true };
      return;
    }
    const payment = await mp.getPayment(ctx.query["data.id"], undefined, c);
    if (String(payment.id) !== ctx.query["data.id"])
      throw new errors.ValidationError("Identificador de pago inválido.");
    ctx.body = await booking.receivePayment(strapi, business, payment);
  },
};
