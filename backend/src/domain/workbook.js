"use strict";
const { createHash } = require("node:crypto");
const { errors } = require("@strapi/utils");
const { repository, resources, numericId, serialize } = require("./repository");
const { locked } = require("./booking");
const { validDate } = require("./availability");
const { cents } = require("./checkout");
const fail = (message) => {
  throw new errors.ValidationError(message);
};
const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const methods = { EFECTIVO: "cash", TRANSFERENCIA: "transfer" };
const nonService = (value) =>
  /^(MENSUAL|SENA|CUENTA CORRIENTE|BONO|ABONO|GEL |AFTER|AMPOLLAS QUESTION)/.test(
    normalize(value),
  );
const serviceKind = (value) =>
  normalize(value) && normalize(value) !== "SERVICIOS" && !nonService(value);
const dateOf = (value) =>
  typeof value === "string" && validDate(value.slice(0, 10))
    ? value.slice(0, 10)
    : null;
const numberOf = (value) =>
  value == null || value === ""
    ? 0
    : Number(value) < 0
      ? -cents(Math.abs(Number(value))) / 100
      : cents(value) / 100;
function historyFacts(input) {
  if (
    !["BASE_DATOS", "DIA"].includes(input.sheet) ||
    !Number.isInteger(input.row) ||
    input.row < (input.sheet === "DIA" ? 6 : 2) ||
    input.row > 20000 ||
    !input.cells ||
    typeof input.cells !== "object"
  )
    fail("Fila de origen inválida.");
  const c = input.cells;
  const date = dateOf(c.A),
    amount = numberOf(c.D),
    supplier = numberOf(c.F),
    expense = numberOf(c.G);
  if (!date) fail("La fila no tiene una fecha válida.");
  for (const value of Object.values(c))
    if (
      value != null &&
      (!["string", "number", "boolean"].includes(typeof value) ||
        String(value).length > 4000)
    )
      fail("Contenido de fila inválido.");
  const method = methods[normalize(c.E)] || null;
  const notes = [];
  const negative = [amount, supplier, expense].some((n) => n < 0);
  if (negative)
    notes.push(
      "Importe negativo: requiere identificar el ajuste o reintegro antes de contabilizar.",
    );
  if (input.duplicate === true)
    notes.push(
      "Posible fila duplicada: requiere revisión antes de contabilizar.",
    );
  if (amount && !normalize(c.C))
    notes.push("Cobro sin servicio: puede ser parte de un pago dividido.");
  if (amount && normalize(c.C) === "SERVICIOS")
    notes.push("Concepto genérico: no identifica una atención individual.");
  if (amount && nonService(c.C))
    notes.push(
      "Seña, abono, cuenta o producto: no se cuenta como atención ni se asigna comisión automáticamente.",
    );
  if ((amount || supplier || expense) && !method)
    notes.push("Medio de pago ausente: movimiento pendiente de confirmar.");
  if (amount && !normalize(c.I))
    notes.push("Profesional sin identificar: comisión pendiente.");
  if (
    input.sheet === "BASE_DATOS" &&
    input.row === 1030 &&
    supplier === 108749320
  )
    notes.push(
      "Importe de proveedor $108.749.320 pendiente de confirmar; excluido de caja.",
    );
  return {
    date,
    amount,
    supplier,
    expense,
    method,
    notes,
    blocked: input.duplicate === true || negative,
    blockedSupplier:
      input.sheet === "BASE_DATOS" &&
      input.row === 1030 &&
      supplier === 108749320,
    service: !!serviceKind(c.C),
  };
}
async function create(strapi, resource, data) {
  return strapi.documents(resources[resource].uid).create({ data });
}
async function importHistory(strapi, businessId, inputs) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.length > 50)
    fail("Importá entre 1 y 50 filas por lote.");
  const repo = repository(strapi, businessId);
  return locked(strapi, businessId, async () => {
    const services = await repo.records("services"),
      staff = await repo.records("staff_members");
    const results = [];
    for (const input of inputs) {
      const fact = historyFacts(input),
        key = `planilla-barberia:${input.sheet}:${input.sheet === "DIA" ? fact.date + ":" : ""}${input.row}`,
        hash = digest(input.cells);
      let previous = await strapi.db
        .query(resources.import_rows.uid)
        .findOne({ where: { source_key: `${businessId}:${key}` } });
      if (!previous && input.sheet === "DIA") {
        const legacy = await strapi.db
          .query(resources.import_rows.uid)
          .findOne({
            where: {
              source_key: `${businessId}:planilla-barberia:DIA:${input.row}`,
            },
          });
        if (legacy?.record_date === fact.date) previous = legacy;
      }
      if (previous) {
        if (previous.source_hash !== hash)
          fail(
            `La fila ${input.sheet}!${input.row} cambió. Se requiere conciliarla antes de reemplazarla.`,
          );
        results.push({ row: input.row, replayed: true });
        continue;
      }
      const c = input.cells,
        sourceRef = `${input.sheet}!A${input.row}:I${input.row}`;
      const matchedStaff = staff.filter(
        (p) =>
          normalize(c.I) &&
          [
            normalize(p.full_name),
            normalize(p.employee_code),
            "NEREA",
          ].includes(normalize(c.I)) &&
          (normalize(c.I) !== "NEREA" ||
            /^NEREA\b/.test(normalize(p.full_name))),
      );
      const person = matchedStaff.length === 1 ? matchedStaff[0] : null;
      if (fact.amount && normalize(c.I) && !person)
        fact.notes.push("Profesional no asociado de forma única.");
      let work = null;
      if (fact.amount && fact.service && !fact.blocked) {
        const candidates = services.filter(
          (s) => normalize(s.source_label || s.name) === normalize(c.C),
        );
        work = await create(strapi, "work_records", {
          business: businessId,
          work_date: fact.date,
          customer_name: String(c.B || "Sin nombre en origen").trim(),
          service_name: String(c.C).trim(),
          service: candidates.length === 1 ? Number(candidates[0].id) : null,
          staff_member: person ? Number(person.id) : null,
          staff_name: c.I ? String(c.I).trim() : null,
          amount: fact.amount,
          notes: c.H ? String(c.H) : null,
          source_ref: sourceRef,
          collection_verified: !!fact.method,
          import_key: `${businessId}:${key}:work`,
          import_hash: hash,
        });
      }
      if (fact.amount && fact.method && !fact.blocked) {
        const eligible = !!work && !!person;
        const rate = eligible
          ? Number(person.collection_commission_rate || 0)
          : null;
        await create(strapi, "payments", {
          business: businessId,
          work_record: work?.id || null,
          staff_member: person ? Number(person.id) : null,
          description: `${String(c.C || "Concepto sin especificar").trim()} · ${String(c.B || "Sin nombre").trim()}`,
          amount: fact.amount,
          method: fact.method,
          status: "completed",
          collection_date: fact.date,
          commission_rate: rate,
          commission_amount:
            rate == null
              ? null
              : Math.round((cents(fact.amount) * rate) / 100) / 100,
          import_ref: `${businessId}:${key}:payment`,
          import_hash: hash,
          notes:
            `Origen: ${sourceRef}. Fecha original sin hora. ${c.H || ""}`.trim(),
        });
      }
      for (const [kind, amount] of [
        ["supplier", fact.supplier],
        ["expense", fact.expense],
      ]) {
        if (
          !amount ||
          !fact.method ||
          fact.blocked ||
          (kind === "supplier" && fact.blockedSupplier)
        )
          continue;
        await create(strapi, "expenses", {
          business: businessId,
          expense_date: fact.date,
          category: kind === "supplier" ? "Proveedores" : "Gastos de planilla",
          description: String(
            c.B || (kind === "supplier" ? "Pago a proveedor" : "Gasto"),
          ).trim(),
          vendor_name:
            kind === "supplier" ? String(c.B || "").trim() || null : null,
          amount,
          method: fact.method,
          source: "excel",
          notes: `Origen: ${sourceRef}. ${c.H || ""}`.trim(),
          import_ref: `${businessId}:${key}:${kind}`,
        });
      }
      await create(strapi, "import_rows", {
        business: businessId,
        source_sheet: input.sheet,
        source_row: input.row,
        source_key: `${businessId}:${key}`,
        source_hash: hash,
        source_data: c,
        record_date: fact.date,
        review_notes: fact.notes,
        outcome: fact.notes.length
          ? "review"
          : fact.amount || fact.supplier || fact.expense
            ? "processed"
            : "empty",
      });
      results.push({
        row: input.row,
        imported: true,
        review: fact.notes.length > 0,
      });
    }
    return results;
  });
}
async function importPrices(strapi, businessId, entries) {
  if (!Array.isArray(entries) || !entries.length || entries.length > 60)
    fail("Catálogo inválido.");
  const repo = repository(strapi, businessId);
  return locked(strapi, businessId, async () => {
    const existing = await repo.read("services");
    const output = [];
    for (const item of entries) {
      if (
        !Number.isInteger(item.row) ||
        item.row < 5 ||
        item.row > 59 ||
        !item.name ||
        String(item.name).length > 180 ||
        !Array.isArray(item.prices) ||
        !item.prices.length ||
        item.prices.length > 4 ||
        !["corte", "coloraciones", "tratamiento"].includes(item.category)
      )
        fail("Precio de origen inválido.");
      const sourceRef = `PRECIOS!A${item.row}:F${item.row}`;
      let service = existing.find((s) => s.source_ref === sourceRef);
      const aliases =
        {
          37: ["CORTE CLASICO", "CORTE DE HOMBRE"],
          39: ["COMBO CORTE + BARBA", "CORTE Y BARBA"],
        }[item.row] || [];
      service ||= existing.find((s) => aliases.includes(normalize(s.name)));
      const price = numberOf(item.prices[0].price);
      const data = {
        business: businessId,
        name: String(item.name).trim(),
        source_label: String(item.label || item.name).trim(),
        source_ref: sourceRef,
        description: item.notes ? String(item.notes).slice(0, 2000) : null,
        price,
        category: item.category,
        is_active: true,
        ...(service ? {} : { booking_enabled: false, duration_minutes: null }),
      };
      if (service?.source_ref) {
        output.push({ id: service.id, replayed: true });
        continue;
      }
      const saved = service
        ? await strapi
            .documents(resources.services.uid)
            .update({ documentId: service.documentId, data })
        : await create(strapi, "services", data);
      // Existing base variants are reused. Unknown durations stay null and cannot be booked.
      const variants = await repo.read("service_price_variants", [
        { field: "service_id", operator: "eq", value: saved.id },
      ]);
      for (const [index, value] of item.prices.entries()) {
        if (
          !["Base", "Corto", "Medio", "Largo", "Extralargo"].includes(
            value.name,
          )
        )
          fail("Variante inválida.");
        const previous = variants.find((v) => v.variant_name === value.name);
        const variantData = {
          service: saved.id,
          variant_name: value.name,
          variant_code: normalize(value.name).toLowerCase(),
          price: numberOf(value.price),
          duration_minutes: service?.duration_minutes || null,
          is_default: index === 0,
          is_active: true,
          display_order: index,
        };
        if (previous)
          await strapi
            .documents(resources.service_price_variants.uid)
            .update({ documentId: previous.documentId, data: variantData });
        else await create(strapi, "service_price_variants", variantData);
      }
      output.push({ id: saved.id, imported: true });
    }
    // These initial demo names have no unambiguous counterpart in the supplied price list.
    for (const service of existing.filter(
      (s) =>
        !s.source_ref &&
        ["FADE / DEGRADE", "PERFILADO DE BARBA"].includes(normalize(s.name)),
    ))
      await strapi.documents(resources.services.uid).update({
        documentId: service.documentId,
        data: { is_active: false, booking_enabled: false },
      });
    return output;
  });
}
async function workbookData(strapi, businessId, query = {}) {
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  if (!Number.isInteger(page)) fail("Página inválida.");
  const tab = ["works", "review", "prices"].includes(query.tab)
    ? query.tab
    : "works";
  const search = String(query.q || "")
      .trim()
      .slice(0, 100),
    month = String(query.month || "");
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail("Mes inválido.");
  const dateWhere = month
    ? {
        $gte: `${month}-01`,
        $lt: new Date(
          Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 1),
        )
          .toISOString()
          .slice(0, 10),
      }
    : undefined;
  const scope = { business: { id: businessId } };
  const uid =
    resources[
      tab === "works"
        ? "work_records"
        : tab === "review"
          ? "import_rows"
          : "services"
    ].uid;
  const where = {
    ...scope,
    ...(tab === "prices" ? { is_active: true } : {}),
    ...(tab === "review" ? { outcome: "review" } : {}),
    ...(dateWhere && tab !== "prices"
      ? { [tab === "works" ? "work_date" : "record_date"]: dateWhere }
      : {}),
    ...(search
      ? {
          $or: (tab === "works"
            ? ["customer_name", "service_name"]
            : tab === "prices"
              ? ["name"]
              : ["source_sheet"]
          ).map((field) => ({ [field]: { $containsi: search } })),
        }
      : {}),
  };
  const count = await strapi.db.query(uid).count({ where });
  if (query.export === "true" && count > 10000)
    fail("Acotá el período para descargar hasta 10.000 filas.");
  const rows = await strapi.db.query(uid).findMany({
    where,
    orderBy:
      tab === "works"
        ? [{ work_date: "desc" }, { id: "desc" }]
        : [{ id: "asc" }],
    offset: query.export === "true" ? 0 : (page - 1) * 50,
    limit: query.export === "true" ? 10000 : 50,
    populate:
      tab === "works"
        ? { service: true, staff_member: true, customer: true }
        : {},
  });
  const repo = repository(strapi, businessId);
  const services = await repo.records("services");
  const staff = await repo.records("staff_members");
  const variants = await repo.records("service_price_variants");
  const pending = await strapi.db
    .query(resources.import_rows.uid)
    .count({ where: { ...scope, outcome: "review" } });
  const imported = await strapi.db
    .query(resources.import_rows.uid)
    .count({ where: scope });
  const workCount = await strapi.db
    .query(resources.work_records.uid)
    .count({ where: scope });
  const payments = tab === "works" ? await repo.records("payments") : [];
  return {
    rows: rows.map((row) => {
      const result = serialize(
        tab === "works"
          ? "work_records"
          : tab === "review"
            ? "import_rows"
            : "services",
        row,
      );
      if (tab === "works") {
        result.collected =
          payments
            .filter(
              (p) => p.work_record_id === result.id && p.status === "completed",
            )
            .reduce((sum, p) => sum + cents(p.amount), 0) / 100;
        result.balance = row.collection_verified
          ? Math.max(0, cents(row.amount) - cents(result.collected)) / 100
          : null;
      }
      return result;
    }),
    count,
    page,
    pending,
    imported,
    workCount,
    services,
    staff,
    variants,
  };
}
async function saveWork(strapi, businessId, input, key) {
  if (!/^[0-9a-f-]{36}$/i.test(key || ""))
    fail("Falta el identificador de la atención.");
  if (
    !input ||
    !validDate(input.date) ||
    typeof input.customerName !== "string" ||
    input.customerName.trim().length < 2 ||
    input.customerName.length > 160 ||
    (input.notes && String(input.notes).length > 2000)
  )
    fail("Revisá fecha, cliente y notas.");
  const total = cents(input.amount),
    paid = cents(input.paid);
  if (
    paid > total ||
    !["cash", "transfer", "card", "mercado_pago", "other"].includes(
      input.method,
    )
  )
    fail("Revisá el importe cobrado.");
  const hash = digest(input),
    importKey = `${businessId}:manual-work:${key}`;
  return locked(strapi, businessId, async () => {
    const previous = await strapi.db
      .query(resources.work_records.uid)
      .findOne({ where: { import_key: importKey } });
    if (previous) {
      if (previous.import_hash !== hash)
        fail("El intento cambió. Revisá la atención antes de repetir.");
      return { id: String(previous.id), replayed: true };
    }
    const repo = repository(strapi, businessId);
    const [service] = await repo.read("services", [
      { field: "id", operator: "eq", value: numericId(input.serviceId) },
    ]);
    const [staff] = await repo.read("staff_members", [
      { field: "id", operator: "eq", value: numericId(input.staffId) },
    ]);
    const [business] = await repo.read("businesses");
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: business.time_zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (input.date > today)
      fail("Una atención realizada no puede tener fecha futura.");
    if (!service?.is_active || !staff?.is_active)
      fail("Servicio o profesional no disponible.");
    let variant = null;
    if (input.variantId) {
      [variant] = await repo.read("service_price_variants", [
        { field: "id", operator: "eq", value: numericId(input.variantId) },
      ]);
      if (!variant?.is_active || variant.service.id !== service.id)
        fail("Variante no disponible para este servicio.");
    }
    const serviceName =
      variant && variant.variant_name !== "Base"
        ? `${service.name} · ${variant.variant_name}`
        : service.name;
    const work = await create(strapi, "work_records", {
      business: businessId,
      work_date: input.date,
      customer_name: input.customerName.trim(),
      service: service.id,
      service_name: serviceName,
      staff_member: staff.id,
      staff_name: staff.full_name,
      amount: total / 100,
      notes: input.notes || null,
      source_ref: "Carga manual",
      collection_verified: true,
      import_key: importKey,
      import_hash: hash,
    });
    if (paid) {
      const rate = require("./finance-rules").commissionRate(staff);
      await create(strapi, "payments", {
        business: businessId,
        work_record: work.id,
        staff_member: staff.id,
        description: `${serviceName} · ${input.customerName.trim()}`,
        amount: paid / 100,
        method: input.method,
        status: "completed",
        collection_date: input.date,
        commission_rate: rate,
        commission_amount: Math.round((paid * rate) / 100) / 100,
        import_ref: `${importKey}:payment`,
      });
    }
    return { id: String(work.id) };
  });
}
async function collectWork(strapi, businessId, input, key) {
  if (!/^[0-9a-f-]{36}$/i.test(key || "") || !input || !validDate(input.date))
    fail("Identificador o fecha inválidos.");
  const amount = cents(input.amount),
    hash = digest(input),
    ref = `${businessId}:work-payment:${key}`;
  if (
    !amount ||
    !["cash", "transfer", "card", "mercado_pago", "other"].includes(
      input.method,
    )
  )
    fail("Revisá importe y medio de pago.");
  return locked(strapi, businessId, async () => {
    const previous = await strapi.db
      .query(resources.payments.uid)
      .findOne({ where: { import_ref: ref } });
    if (previous) {
      if (previous.import_hash !== hash)
        fail("El intento cambió. Revisá el cobro anterior.");
      return { id: String(previous.id), replayed: true };
    }
    const repo = repository(strapi, businessId);
    const [work] = await repo.read("work_records", [
      { field: "id", operator: "eq", value: numericId(input.workId) },
    ]);
    if (!work || !work.collection_verified)
      fail("Esta atención requiere conciliar su cobro de origen primero.");
    const [business] = await repo.read("businesses");
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: business.time_zone,
    }).format(new Date());
    if (input.date < work.work_date || input.date > today)
      fail("La fecha del cobro debe estar entre la atención y hoy.");
    const payments = await repo.read("payments", [
      { field: "work_record_id", operator: "eq", value: work.id },
    ]);
    const collected = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + cents(p.amount), 0);
    if (amount > cents(work.amount) - collected)
      fail("El importe supera el saldo pendiente.");
    const rate = work.staff_member
      ? require("./finance-rules").commissionRate(work.staff_member)
      : null;
    const payment = await create(strapi, "payments", {
      business: businessId,
      work_record: work.id,
      staff_member: work.staff_member?.id || null,
      description: `${work.service_name} · ${work.customer_name}`,
      amount: amount / 100,
      method: input.method,
      status: "completed",
      collection_date: input.date,
      commission_rate: rate,
      commission_amount:
        rate == null ? null : Math.round((amount * rate) / 100) / 100,
      import_ref: ref,
      import_hash: hash,
    });
    return { id: String(payment.id) };
  });
}
module.exports = {
  importHistory,
  importPrices,
  workbookData,
  saveWork,
  collectWork,
  historyFacts,
  normalize,
  digest,
};
