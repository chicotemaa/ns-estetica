"use strict";
const resources = require("./resources.json");
const { errors } = require("@strapi/utils");
const { ValidationError, NotFoundError } = errors;
const uniqueFields = {
  services: [["business_id", "name"]],
  customers: [
    ["business_id", "primary_contact"],
    ["business_id", "email"],
  ],
  staff_members: [["business_id", "employee_code"]],
  booking_settings: [["business_id"]],
  business_hours: [["business_id", "day_of_week"]],
  staff_member_working_hours: [["staff_member_id", "day_of_week"]],
  staff_member_services: [["staff_member_id", "service_id"]],
  staff_member_category_rates: [["staff_member_id", "service_category"]],
  service_price_variants: [["service_id", "variant_name"]],
  invoices: [["business_id", "number"]],
};

function descriptor(resource) {
  if (!Object.hasOwn(resources, resource))
    throw new ValidationError("Recurso no permitido.");
  return resources[resource];
}
function numericId(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    throw new ValidationError("Identificador inválido.");
  return Number(value);
}
function fieldPath(resource, field) {
  if (field === "id") return ["id"];
  if (field === "created_at") return ["createdAt"];
  if (field === "updated_at") return ["updatedAt"];
  const item = Object.hasOwn(descriptor(resource).fields, field)
    ? descriptor(resource).fields[field]
    : null;
  if (!item) throw new ValidationError("Campo no permitido.");
  return item.target ? [item.attribute, "id"] : [item.attribute];
}
function nested(path, value) {
  return path.reduceRight((result, key) => ({ [key]: result }), value);
}
function scope(resource, businessId) {
  if (resource === "businesses") return { id: businessId };
  const fields = descriptor(resource).fields;
  if (fields.business_id) return { business: { id: businessId } };
  if (fields.staff_member_id)
    return { staff_member: { business: { id: businessId } } };
  if (fields.service_id) return { service: { business: { id: businessId } } };
  throw new ValidationError("Recurso sin ámbito de negocio.");
}
function filtersWhere(resource, filters = []) {
  if (!Array.isArray(filters) || filters.length > 20)
    throw new ValidationError("Filtros inválidos.");
  return filters.map(({ field, operator, value }) => {
    const path = fieldPath(resource, field);
    const op = {
      eq: "$eq",
      neq: "$ne",
      in: "$in",
      ilike: "$eqi",
      gte: "$gte",
      lte: "$lte",
      lt: "$lt",
    }[operator];
    if (!op) throw new ValidationError("Operador no permitido.");
    if (operator === "in" && (!Array.isArray(value) || value.length > 1000))
      throw new ValidationError("Filtro demasiado grande.");
    const normalized =
      path.at(-1) === "id"
        ? Array.isArray(value)
          ? value.map(numericId)
          : numericId(value)
        : value;
    return nested(path, { [op]: normalized });
  });
}
function serialize(resource, row, includeRelations = true) {
  if (!row) return null;
  const result = {
    id: String(row.id),
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
  for (const [field, info] of Object.entries(descriptor(resource).fields)) {
    const value = row[info.attribute];
    if (info.target) {
      result[field] = value?.id ? String(value.id) : null;
      if (includeRelations)
        result[info.attribute] = value
          ? serialize(info.target, value, false)
          : null;
    } else result[field] = value ?? null;
  }
  return result;
}
const populate = (resource) =>
  Object.fromEntries(
    Object.values(descriptor(resource).fields)
      .filter((field) => field.target)
      .map(({ attribute }) => [attribute, true]),
  );

function repository(strapi, businessId) {
  async function read(resource, filters = [], order = [], includeDeleted = false) {
    const where = {
      $and: [scope(resource, businessId), ...filtersWhere(resource, filters), ...(resource === "appointments" && !includeDeleted && !filters.some(f => f.field === "deleted_at") ? [{ deleted_at: { $null: true } }] : [])],
    };
    if (!Array.isArray(order) || order.length > 5)
      throw new ValidationError("Orden inválido.");
    const orderBy = order.map(({ field, ascending }) =>
      nested(fieldPath(resource, field), ascending === false ? "desc" : "asc"),
    );
    const rows = await strapi.db
      .query(descriptor(resource).uid)
      .findMany({ where, orderBy, populate: populate(resource), limit: 10001 });
    if (rows.length > 10000)
      throw new ValidationError("La consulta requiere paginación.");
    return rows;
  }
  async function prepare(resource, input, creating = false) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new ValidationError("Datos inválidos.");
    const result = {};
    for (const [field, value] of Object.entries(input)) {
      if (["id", "created_at", "updated_at"].includes(field)) continue;
      const info = Object.hasOwn(descriptor(resource).fields, field)
        ? descriptor(resource).fields[field]
        : null;
      if (!info) throw new ValidationError(`Campo no permitido: ${field}`);
      if (info.target) {
        if (value === null) {
          if (info.required)
            throw new ValidationError("Falta una referencia obligatoria.");
          result[info.attribute] = null;
          continue;
        }
        const related = await read(info.target, [
          { field: "id", operator: "eq", value },
        ]);
        if (!related.length)
          throw new ValidationError("La referencia no pertenece al negocio.");
        result[info.attribute] = related[0].id;
      } else {
        const type =
          strapi.contentTypes[descriptor(resource).uid].attributes[
            info.attribute
          ]?.type;
        result[info.attribute] =
          type === "time" &&
          typeof value === "string" &&
          /^\d{2}:\d{2}$/.test(value)
            ? `${value}:00.000`
            : value;
      }
    }
    if (descriptor(resource).fields.business_id) result.business = businessId;
    if (creating) {
      for (const info of Object.values(descriptor(resource).fields)) {
        if (info.target && info.required && !result[info.attribute])
          throw new ValidationError("Falta una referencia obligatoria.");
      }
      if (resource === "customers" && !result.joined_at)
        result.joined_at = new Date().toISOString();
    }
    return result;
  }
  async function mutate(resource, operation, input, filters, onConflict) {
    const definition = descriptor(resource);
    if (
      [
        "expense_plans",
        "expense_obligations",
        "payroll_lines",
        "finance_operations",
        "staff_time_logs",
        "checkout_events",
      ].includes(resource)
    )
      throw new ValidationError(
        "Gestioná este registro desde Gastos o Liquidaciones para conservar sus pagos.",
      );
    if (
      (resource === "payouts" &&
        (Array.isArray(input) ? input : [input]).some(
          (v) =>
            v &&
            ["period_start", "period_end", "payroll_detail"].some(
              (k) => k in v,
            ),
        )) ||
      (resource === "appointments" &&
        (Array.isArray(input) ? input : [input]).some(
          (v) =>
            v &&
            ["arrived_at", "started_at", "finished_at", "checkout_total"].some(
              (k) => k in v,
            ),
        ))
    )
      throw new ValidationError(
        "Estos campos se registran desde su acción específica.",
      );
    if (["work_records", "import_rows"].includes(resource))
      throw new ValidationError(
        "Usá la planilla para registrar atenciones. Los registros de origen se conservan.",
      );
    if (
      resource === "payments" &&
      (Array.isArray(input) ? input : [input]).some(
        (value) =>
          value &&
          ["work_record_id", "import_ref", "collection_date"].some(
            (field) => value[field] != null,
          ),
      )
    )
      throw new ValidationError(
        "Los cobros de la planilla se registran junto con su atención.",
      );
    if (
      resource === "expenses" &&
      (Array.isArray(input) ? input : [input]).some(
        (value) => value?.import_ref,
      )
    )
      throw new ValidationError(
        "La referencia de importación es de solo lectura.",
      );
    if (
      operation === "upsert" &&
      ["payments", "appointments", "payouts", "expenses"].includes(resource)
    )
      throw new ValidationError("Usá crear o actualizar para turnos y cobros.");
    if (
      resource === "payments" &&
      (Array.isArray(input) ? input : [input]).some(
        (value) =>
          value &&
          ["appointment_id", "commission_rate", "commission_amount"].some(
            (field) => value[field] != null,
          ),
      )
    )
      throw new ValidationError(
        "Los cobros de turnos se registran desde Completar y cobrar.",
      );
    if (resource === "businesses" && operation !== "update")
      throw new ValidationError(
        "El negocio configurado no se puede crear ni eliminar desde el panel.",
      );
    if (
      resource === "businesses" &&
      Object.keys(input || {}).some(
        (key) =>
          ![
            "name",
            "description",
            "address",
            "phone",
            "email",
            "website",
            "cuit",
            "instagram_handle",
            "whatsapp_phone",
            "monthly_collection_target",
            "brand_palette",
            "brand_initials",
            "short_name",
            "hero_headline",
            "hero_copy",
            "booking_intro",
          ].includes(key),
      )
    )
      throw new ValidationError(
        "Campo del negocio no editable desde el panel.",
      );
    if (resource === "businesses") {
      for (const [field, pattern] of [
        ["instagram_handle", /^[a-zA-Z0-9._]{1,30}$/],
        ["whatsapp_phone", /^[1-9]\d{7,14}$/],
      ]) {
        if (input[field] !== undefined &&
          (typeof input[field] !== "string" || (input[field] !== "" && !pattern.test(input[field]))))
          throw new ValidationError("Revisá Instagram y el número internacional de WhatsApp.");
      }
      for (const [field, max] of Object.entries({
        brand_initials: 4,
        short_name: 60,
        hero_headline: 180,
        hero_copy: 600,
        booking_intro: 400,
      })) {
        if (
          input[field] !== undefined &&
          (typeof input[field] !== "string" ||
            !input[field].trim() ||
            input[field].length > max)
        )
          throw new ValidationError(
            "Revisá los textos de la identidad visual.",
          );
      }
    }
    if (operation === "insert" || operation === "upsert") {
      const inputs = Array.isArray(input) ? input : [input];
      if (!inputs.length || inputs.length > 100)
        throw new ValidationError("Cantidad de registros inválida.");
      const results = [];
      for (const value of inputs) {
        let existing;
        if (operation === "upsert") {
          const keys =
            typeof onConflict === "string"
              ? onConflict.split(",").map((key) => key.trim())
              : ["id"];
          if (keys.some((key) => value[key] === undefined))
            throw new ValidationError(
              "Faltan claves para actualizar el registro.",
            );
          [existing] = await read(
            resource,
            keys.map((field) => ({
              field,
              operator: "eq",
              value: value[field],
            })),
          );
        }
        if (resource === "expenses" && existing?.import_ref)
          throw new ValidationError(
            "Este movimiento conserva el dato original de la planilla.",
          );
        const data = await prepare(resource, value, !existing);
        await checkUnique(resource, value, existing);
        if (resource === "appointments")
          await require("./booking").validateAppointment(
            strapi,
            businessId,
            data,
            existing,
          );
        const saved = existing
          ? await strapi
              .documents(definition.uid)
              .update({ documentId: existing.documentId, data })
          : await strapi.documents(definition.uid).create({ data });
        results.push(
          await strapi.db
            .query(definition.uid)
            .findOne({ where: { id: saved.id }, populate: populate(resource) }),
        );
      }
      return results;
    }
    if (!["update", "delete"].includes(operation) || !filters?.length)
      throw new ValidationError("La modificación requiere filtros.");
    const rows = await read(resource, filters, [], resource === "appointments");
    if (rows.length > 100)
      throw new ValidationError("Demasiados registros para modificar.");
    const result = [];
    for (const row of rows) {
      if (resource === "appointments" && (operation === "delete" || Object.hasOwn(input || {}, "deleted_at"))) {
        if (operation !== "delete" && Object.keys(input).some(k => !["deleted_at", "updated_at"].includes(k))) throw new ValidationError("Restaurá el turno antes de modificarlo.");
        const deletedAt = operation === "delete" ? new Date().toISOString() : input.deleted_at;
        if (deletedAt !== null && operation !== "delete") throw new ValidationError("Usá Eliminar para archivar un turno.");
        if (deletedAt === null && row.deleted_at && ["pending", "confirmed"].includes(row.status)) {
          await require("./booking").validateAppointment(strapi, businessId, { appointment_date: row.appointment_date, appointment_time: row.appointment_time }, { ...row, appointment_date: "" });
        }
        const saved = await strapi.documents(definition.uid).update({ documentId: row.documentId, data: { deleted_at: deletedAt } });
        result.push(await strapi.db.query(definition.uid).findOne({ where: { id: saved.id }, populate: populate(resource) }));
        continue;
      }
      if (resource === "appointments" && row.deleted_at) throw new ValidationError("El turno está eliminado. Restauralo antes de editarlo.");
      if (
        resource === "appointments" &&
        row.checkout_total != null &&
        ["price_snapshot", "service_id"].some(
          (k) =>
            input?.[k] !== undefined &&
            String(input[k]) !== String(serialize(resource, row)[k]),
        )
      )
        throw new ValidationError(
          "El turno tiene ajustes registrados. Modificá su importe desde el checkout.",
        );
      if (resource === "payouts" && row.period_start)
        throw new ValidationError(
          "La liquidación pagada conserva su detalle y no puede editarse ni eliminarse.",
        );
      if (
        resource === "expenses" &&
        (
          await read("expense_obligations", [
            { field: "expense_id", operator: "eq", value: row.id },
          ])
        ).length
      )
        throw new ValidationError(
          "Este gasto pagado está vinculado a un vencimiento y conserva su historial.",
        );
      if (
        resource === "appointments" &&
        row.started_at &&
        (operation === "delete" ||
          ["pending", "cancelled"].includes(input?.status) ||
          [
            "appointment_date",
            "appointment_time",
            "staff_member_id",
            "customer_id",
            "price_snapshot",
            "service_id",
          ].some((k) => k in (input || {})))
      )
        throw new ValidationError(
          "La atención ya comenzó. Conservá sus datos y registrá su finalización.",
        );
      if (
        (resource === "payments" && (row.work_record || row.import_ref)) ||
        (resource === "expenses" && row.import_ref)
      )
        throw new ValidationError(
          "Este movimiento conserva el dato original de la planilla.",
        );
      if (resource === "payments" && row.appointment)
        throw new ValidationError(
          "Este cobro está vinculado a un turno y conserva su registro original.",
        );
      if (
        resource === "appointments" &&
        (
          await read("payments", [
            { field: "appointment_id", operator: "eq", value: row.id },
          ])
        ).length
      ) {
        const original = serialize(resource, row);
        if (
          operation === "delete" ||
          (input.status && input.status !== "completed") ||
          [
            "customer_id",
            "service_id",
            "staff_member_id",
            "price_snapshot",
            "customer_name",
            "appointment_date",
            "appointment_time",
          ].some(
            (field) =>
              input[field] !== undefined &&
              String(input[field]) !== String(original[field]),
          )
        )
          throw new ValidationError(
            "El turno tiene cobros registrados. Su importe, cliente y profesional deben conservarse.",
          );
      }
      if (operation === "delete") {
        if (resource === "services") {
          const used = await read("appointments", [{ field: "service_id", operator: "eq", value: row.id }], [], true);
          if (used.length) throw new ValidationError("El servicio tiene historial. Desactivalo para conservar los turnos.");
          const variants = await read("service_price_variants", [{ field: "service_id", operator: "eq", value: row.id }]);
          for (const variant of variants) await strapi.documents(resources.service_price_variants.uid).delete({ documentId: variant.documentId });
        }
        for (const [dependent, spec] of Object.entries(resources)) {
          for (const [field, info] of Object.entries(spec.fields)) {
            if (
              info.target === resource &&
              (
                await read(dependent, [
                  { field, operator: "eq", value: row.id },
                ], [], true)
              ).length
            ) {
              throw new ValidationError(
                "El registro tiene datos asociados. Desactivalo en lugar de eliminarlo.",
              );
            }
          }
        }
        await strapi
          .documents(definition.uid)
          .delete({ documentId: row.documentId });
        result.push(row);
      } else {
        const data = await prepare(resource, input);
        await checkUnique(resource, input, row);
        if (resource === "appointments")
          await require("./booking").validateAppointment(
            strapi,
            businessId,
            data,
            row,
          );
        await strapi
          .documents(definition.uid)
          .update({ documentId: row.documentId, data });
        result.push(
          await strapi.db
            .query(definition.uid)
            .findOne({ where: { id: row.id }, populate: populate(resource) }),
        );
      }
    }
    return result;
  }
  async function checkUnique(resource, input, existing) {
    const candidate = { ...serialize(resource, existing), ...input };
    if (resource === "schedule_blocks") await require("./schedule-blocks").validateBlock(strapi, businessId, candidate, existing?.id);
    if (resource === "staff_members") {
      const first = Number(candidate.payroll_cutoff_first ?? 15),
        second = Number(candidate.payroll_cutoff_second ?? 31);
      if (
        !Number.isInteger(first) ||
        !Number.isInteger(second) ||
        first < 1 ||
        first > 27 ||
        (candidate.payroll_cadence !== "weekly" &&
          candidate.payroll_cadence !== "monthly" &&
          second <= first) ||
        second < 1 ||
        second > 31
      )
        throw new ValidationError(
          "El segundo corte debe ser posterior al primero (días 1 a 31).",
        );
      for (const key of ["hourly_rate", "collection_commission_rate"]) {
        if (
          candidate[key] != null &&
          (!Number.isFinite(Number(candidate[key])) ||
            Number(candidate[key]) < 0 ||
            Number(candidate[key]) > (key === "hourly_rate" ? 1e10 : 100))
        )
          throw new ValidationError("Tarifa o porcentaje inválido.");
      }
    }
    if (descriptor(resource).fields.business_id)
      candidate.business_id = String(businessId);
    const groups = [...(uniqueFields[resource] || [])];
    if (resource === "service_price_variants" && candidate.is_default)
      groups.push(["service_id", "is_default"]);
    for (const fields of groups) {
      if (
        fields.some(
          (field) =>
            candidate[field] === null ||
            candidate[field] === undefined ||
            candidate[field] === "",
        )
      )
        continue;
      const filters = fields.map((field) => ({
        field,
        operator: ["email", "name", "variant_name"].includes(field)
          ? "ilike"
          : "eq",
        value: candidate[field],
      }));
      if (existing)
        filters.push({ field: "id", operator: "neq", value: existing.id });
      if ((await read(resource, filters)).length)
        throw new ValidationError("Ya existe un registro con esos datos.", {
          code: "23505",
        });
    }
  }
  return {
    read,
    mutate,
    prepare,
    async records(resource, filters, order) {
      return (await read(resource, filters, order)).map((row) =>
        serialize(resource, row),
      );
    },
  };
}
async function getBusiness(strapi, requestedSlug) {
  const slug = process.env.BUSINESS_SLUG || "natalia-sanchez-estetica";
  if (requestedSlug && requestedSlug !== slug)
    throw new NotFoundError("Negocio no encontrado.");
  const business = await strapi.db
    .query(resources.businesses.uid)
    .findOne({ where: { slug } });
  if (!business) throw new NotFoundError("Negocio no configurado.");
  return business;
}
module.exports = {
  resources,
  repository,
  descriptor,
  numericId,
  serialize,
  getBusiness,
  filtersWhere,
  scope,
};
