"use strict";
const { errors } = require("@strapi/utils");
const {
  repository,
  getBusiness,
  serialize,
  numericId,
} = require("../../../domain/repository");
const {
  schedule,
  choices,
  locked,
  bookPublic,
} = require("../../../domain/booking");
const { validDate } = require("../../../domain/availability");
module.exports = {
  async notifications(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/notifications").inbox(
      strapi,
      business.id,
      ctx.state.manager.id,
    );
    ctx.set("Cache-Control", "no-store");
  },
  async notificationRead(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/notifications").markRead(
      strapi,
      business.id,
      ctx.state.manager.id,
      ctx.request.body,
    );
    ctx.set("Cache-Control", "no-store");
  },
  async notificationEmail(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/notification-digest").status(
      strapi,
      business.id,
    );
    ctx.set("Cache-Control", "no-store");
  },
  async collectWork(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/workbook").collectWork(
      strapi,
      business.id,
      ctx.request.body,
      ctx.request.header["idempotency-key"],
    );
    ctx.set("Cache-Control", "no-store");
  },
  async importWorkbook(ctx) {
    const business = await getBusiness(strapi);
    const importer = require("../../../domain/workbook");
    const { kind, rows } = ctx.request.body || {};
    if (!["history", "prices"].includes(kind))
      throw new errors.ValidationError("Tipo de importación inválido.");
    ctx.body = {
      data: await (
        kind === "prices" ? importer.importPrices : importer.importHistory
      )(strapi, business.id, rows),
    };
    ctx.set("Cache-Control", "no-store");
  },
  async workbook(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/workbook").workbookData(
      strapi,
      business.id,
      ctx.query,
    );
    ctx.set("Cache-Control", "no-store");
  },
  async saveWork(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/workbook").saveWork(
      strapi,
      business.id,
      ctx.request.body,
      ctx.request.header["idempotency-key"],
    );
    ctx.set("Cache-Control", "no-store");
  },
  async workbookPrice(ctx) {
    const business = await getBusiness(strapi),
      repo = repository(strapi, business.id);
    const { variantId, price } = ctx.request.body || {};
    const amount = require("../../../domain/checkout").cents(price) / 100;
    ctx.body = await locked(strapi, business.id, async () => {
      const [variant] = await repo.records("service_price_variants", [
        { field: "id", operator: "eq", value: numericId(variantId) },
      ]);
      if (!variant) throw new errors.NotFoundError("Precio no encontrado.");
      await repo.mutate("service_price_variants", "update", { price: amount }, [
        { field: "id", operator: "eq", value: variant.id },
      ]);
      if (variant.is_default)
        await repo.mutate("services", "update", { price: amount }, [
          { field: "id", operator: "eq", value: variant.service_id },
        ]);
      return { saved: true };
    });
  },
  async checkoutSummary(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/checkout").checkoutSummary(
      strapi,
      business.id,
      ctx.params.id,
    );
    ctx.set("Cache-Control", "no-store");
  },
  async modifyCheckout(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/checkout").modifyCheckout(
      strapi,
      business.id,
      ctx.request.body,
      ctx.request.header["idempotency-key"],
      ctx.state.manager?.email,
    );
    ctx.set("Cache-Control", "no-store");
  },
  async financeExpenses(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/finance").expensesData(
      strapi,
      business.id,
      ctx.query.month,
    );
    ctx.set("Cache-Control", "no-store");
  },
  async financeAlerts(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/finance").financeAlerts(
      strapi,
      business.id,
    );
    ctx.set("Cache-Control", "no-store");
  },
  async financePayroll(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/finance").payrollData(
      strapi,
      business.id,
      ctx.query,
    );
    ctx.set("Cache-Control", "no-store");
  },
  async financeWrite(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/finance").writeFinance(
      strapi,
      business.id,
      ctx.params.action,
      ctx.request.body,
      ctx.request.header["idempotency-key"],
    );
    ctx.set("Cache-Control", "no-store");
  },
  async checkout(ctx) {
    const business = await getBusiness(strapi);
    ctx.body = await require("../../../domain/checkout").checkout(
      strapi,
      business.id,
      ctx.request.body,
      ctx.request.header["idempotency-key"],
    );
    ctx.set("Cache-Control", "no-store");
  },
  async catalog(ctx) {
    const business = await getBusiness(strapi, ctx.params.slug);
    const repo = repository(strapi, business.id);
    const active = [{ field: "is_active", operator: "eq", value: true }];
    const [services, staff, hours, variants] = await Promise.all([
      repo.records("services", active, [{ field: "display_order" }]),
      repo.records("staff_members", active, [{ field: "display_order" }]),
      repo.records("business_hours"),
      repo.records("service_price_variants", active, [
        { field: "display_order" },
      ]),
    ]);
    ctx.set("Cache-Control", "no-store");
    ctx.body = {
      businessName: business.name,
      onlineBooking:
        require("../../../domain/customer-config").publicConfiguration(await require("../../../domain/customer-config").resolveConfiguration(strapi, business.id)),
      businessSlug: business.slug,
      website: business.website_content || null,
      brand: {
        palette: business.brand_palette || "bronze",
        initials: business.brand_initials || "NA",
        shortName: business.short_name || business.name,
        heroHeadline: business.hero_headline,
        heroCopy: business.hero_copy,
        bookingIntro: business.booking_intro,
        address: business.address,
        phone: business.phone,
        email: business.email,
        instagramHandle: business.instagram_handle,
        whatsappPhone: business.whatsapp_phone,
      },
      timeZone: business.time_zone,
      isLive: true,
      services: require("../../../domain/public-catalog").publicServices(
        services,
        variants,
      ),
      staffMembers: staff
        .filter((item) => item.accepts_bookings !== false)
        .map((item) => ({
          id: item.id,
          fullName: item.full_name,
          role: item.role,
        })),
      businessHours: hours.map((item) => ({
        day: item.day_of_week,
        isOpen: item.is_open,
        opens: item.open_time?.slice(0, 5),
        closes: item.close_time?.slice(0, 5),
      })),
    };
  },
  async availability(ctx) {
    const business = await getBusiness(strapi, ctx.params.slug);
    const { date, serviceId, staffMemberId, serviceVariantId } = ctx.query;
    if (!validDate(date)) throw new errors.ValidationError("Fecha inválida.");
    numericId(serviceId);
    if (staffMemberId) numericId(staffMemberId);
    if (serviceVariantId) numericId(serviceVariantId);
    const data = require("../../../domain/public-catalog").withVariant(
      await schedule(strapi, business.id, date),
      serviceId,
      serviceVariantId,
    );
    ctx.set("Cache-Control", "no-store");
    const times = [...new Set(choices(data, date, serviceId, staffMemberId).flatMap(item => item.slots))].sort();
    let message = '';
    if (!times.length) {
      const clock = require("../../../domain/availability").localNow(data.timeZone);
      const daysAhead = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${clock.date}T12:00:00Z`)) / 86400000);
      const day = data.hours.find(item => item.day_of_week === new Date(`${date}T12:00:00Z`).getUTCDay());
      if (daysAhead < 0) message = 'Elegí una fecha de hoy en adelante.';
      else if (daysAhead > data.settings.max_booking_days_in_advance) message = `Podés reservar hasta ${data.settings.max_booking_days_in_advance} días de anticipación. Elegí una fecha más cercana.`;
      else if (!day?.is_open) message = 'El local está cerrado ese día. Elegí otra fecha.';
      else message = 'No hay horarios disponibles para este tratamiento y profesional en esa fecha. Probá con otro día o sin preferencia de profesional.';
    }
    ctx.body = { times, message };
  },
  async booking(ctx) {
    const business = await getBusiness(strapi, ctx.params.slug);
    ctx.body = await bookPublic(
      strapi,
      business,
      ctx.request.body,
      ctx.request.header["idempotency-key"],
    );
    ctx.set("Cache-Control", "no-store");
  },
  async session(ctx) {
    ctx.set("Cache-Control", "no-store");
    ctx.body = { user: ctx.state.manager };
  },
  async batch(ctx) {
    const business = await getBusiness(strapi);
    const operations = ctx.request.body?.operations;
    if (
      !Array.isArray(operations) ||
      !operations.length ||
      operations.length > 20
    )
      throw new errors.ValidationError("Operaciones inválidas.");
    const repo = repository(strapi, business.id);
    ctx.body = {
      data: await locked(strapi, business.id, async () => {
        const result = [];
        for (const item of operations) {
          const rows = await repo.mutate(
            item.resource,
            item.operation,
            item.data,
            item.filters,
            item.onConflict,
          );
          result.push(rows.map((row) => serialize(item.resource, row)));
        }
        return result;
      }),
    };
    ctx.set("Cache-Control", "no-store");
  },
  async query(ctx) {
    const business = await getBusiness(strapi);
    const {
      resource,
      operation = "select",
      data,
      filters = [],
      order = [],
      onConflict,
    } = ctx.request.body || {};
    const repo = repository(strapi, business.id);
    const result =
      operation === "select"
        ? await repo.read(resource, filters, order)
        : await locked(strapi, business.id, () =>
            repo.mutate(resource, operation, data, filters, onConflict),
          );
    ctx.set("Cache-Control", "no-store");
    ctx.body = { data: result.map((row) => serialize(resource, row)) };
  },
};
