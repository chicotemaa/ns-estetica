"use strict";
const { errors } = require("@strapi/utils");
const { validDate, minutes } = require("./availability");
const fail = (message) => {
  throw new errors.ValidationError(message);
};
function validate(config) {
  if (config == null) return null;
  if (
    config.type !== "zones" ||
    !Array.isArray(config.zones) ||
    !config.zones.length ||
    config.zones.length > 50
  )
    fail("Configuración de zonas inválida.");
  const ids = new Set();
  const zones = config.zones.map((z) => {
    if (
      !z ||
      !/^[a-z0-9-]{1,50}$/.test(z.id) ||
      ids.has(z.id) ||
      typeof z.name !== "string" ||
      !z.name.trim() ||
      z.name.length > 100 ||
      !Number.isFinite(z.price) ||
      z.price < 0 ||
      z.price > 10000000 ||
      Math.abs(z.price * 100 - Math.round(z.price * 100)) > 0.000001
    )
      fail(
        "Revisá los nombres y precios de las zonas: no puede haber zonas repetidas.",
      );
    ids.add(z.id);
    return { id: z.id, name: z.name.trim(), price: z.price };
  });
  if (
    !Number.isInteger(config.minimumZones) ||
    config.minimumZones < 1 ||
    config.minimumZones > 50 ||
    ![config.discountPercent, config.fullBodyPercent].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 100,
    )
  )
    fail("Descuentos inválidos.");
  if (
    !Array.isArray(config.dates) ||
    config.dates.length > 100 ||
    config.dates.some((d) => !validDate(d))
  )
    fail("Indicá fechas válidas para las jornadas de depilación.");
  if (
    !Array.isArray(config.weekdays) ||
    config.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    fail("Días de atención inválidos.");
  if (config.opens !== "" || config.closes !== "")
    if (
      minutes(config.opens) === null ||
      minutes(config.closes) === null ||
      minutes(config.opens) >= minutes(config.closes)
    )
      fail("Revisá el horario de la jornada.");
  if (
    !Number.isInteger(config.leadMinutes) ||
    config.leadMinutes < 0 ||
    config.leadMinutes > 43200
  )
    fail("Anticipación inválida.");
  return {
    type: "zones",
    zones,
    minimumZones: config.minimumZones,
    discountPercent: config.discountPercent,
    fullBodyPercent: config.fullBodyPercent,
    dates: [...new Set(config.dates)],
    weekdays: [...new Set(config.weekdays)],
    opens: config.opens,
    closes: config.closes,
    leadMinutes: config.leadMinutes,
  };
}
function selection(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    fail("Selección de zonas inválida.");
  const ids = raw.zoneIds ?? [];
  if (
    !Array.isArray(ids) ||
    ids.length > 50 ||
    ids.some((id) => typeof id !== "string" || !/^[a-z0-9-]{1,50}$/.test(id)) ||
    new Set(ids).size !== ids.length
  )
    fail("Elegí cada zona una sola vez.");
  if (raw.fullBody !== undefined && typeof raw.fullBody !== "boolean")
    fail("Paquete inválido.");
  return { zoneIds: [...ids].sort(), fullBody: raw.fullBody === true };
}
function quote(service, raw) {
  const config = validate(service.zone_pricing),
    picked = selection(raw);
  if (!config) fail("Este servicio no tiene precios por zona.");
  if (picked.zoneIds.some((id) => !config.zones.some((z) => z.id === id)))
    fail("Alguna zona ya no está disponible. Actualizá la selección.");
  const lines = picked.fullBody
    ? config.zones
    : config.zones.filter((z) => picked.zoneIds.includes(z.id));
  if (!lines.length) fail("Elegí al menos una zona.");
  const subtotalCents = lines.reduce(
    (sum, z) => sum + Math.round(z.price * 100),
    0,
  );
  const percent = picked.fullBody
    ? config.fullBodyPercent
    : lines.length >= config.minimumZones
      ? config.discountPercent
      : 0;
  const discountCents = Math.round((subtotalCents * percent) / 100);
  return {
    selection: {
      zoneIds: lines.map((z) => z.id).sort(),
      fullBody: picked.fullBody,
    },
    lines,
    zoneCount: lines.length,
    subtotalCents,
    discountPercent: percent,
    discountCents,
    totalCents: subtotalCents - discountCents,
    durationMinutes: Number(service.duration_minutes) || null,
  };
}
function apply(data, serviceId, raw) {
  const service = data.services.find((s) => s.id === String(serviceId));
  if (!service?.zone_pricing) return data;
  const result = quote(service, raw);
  return {
    ...data,
    services: data.services.map((s) =>
      s.id !== String(serviceId)
        ? s
        : {
            ...s,
            price: result.totalCents / 100,
            name: `${s.name} · ${result.selection.fullBody ? "Todo el cuerpo" : result.lines.map((z) => z.name).join(" + ")}`,
            zone_quote: result,
          },
    ),
  };
}
function preset() {
  const rows = [
    ["cavado-bikini", "Cavado bikini", 8000],
    ["cavado-completo", "Cavado completo", 10000],
    ["tiro-cola", "Tiro de cola", 8000],
    ["gluteos", "Glúteos", 12000],
    ["bozo", "Bozo", 8000],
    ["rostro-completo", "Rostro completo", 10000],
    ["axilas", "Axilas", 8000],
    ["medio-brazo", "Medio brazo", 8000],
    ["brazo-completo", "Brazo completo", 12000],
    ["manos", "Manos", 5000],
    ["hombro", "Hombro", 8000],
    ["pecho", "Pecho", 10000],
    ["abdomen", "Abdomen", 10000],
    ["pecho-completo", "Pecho completo", 15000],
    ["media-pierna", "Media pierna", 12000],
    ["pierna-completa", "Pierna completa", 15000],
    ["media-espalda", "Media espalda", 12000],
    ["espalda-completa", "Espalda completa", 15000],
  ];
  return {
    type: "zones",
    zones: rows.map(([id, name, price]) => ({ id, name, price })),
    minimumZones: 3,
    discountPercent: 20,
    fullBodyPercent: 30,
    dates: [],
    weekdays: [],
    opens: "",
    closes: "",
    leadMinutes: 1440,
  };
}
function sameSelection(a, b) {
  return JSON.stringify(selection(a)) === JSON.stringify(selection(b));
}
async function prepareAppointment(strapi, businessId, data, previous) {
  const serviceId = data.service ?? previous.service_id;
  if (!serviceId) return;
  const [service] = await require("./repository")
    .repository(strapi, businessId)
    .records("services", [{ field: "id", operator: "eq", value: serviceId }]);
  if (!service?.zone_pricing) return;
  const picked =
    data.zone_selection ||
    previous.zone_selection ||
    previous.pricing_snapshot?.selection;
  const preserve =
    previous.pricing_snapshot &&
    String(serviceId) === String(previous.service_id) &&
    (!data.zone_selection ||
      sameSelection(data.zone_selection, previous.pricing_snapshot.selection));
  const q = preserve ? previous.pricing_snapshot : quote(service, picked);
  data.pricing_snapshot = q;
  data.zone_selection = q.selection;
  data.price_snapshot = preserve ? previous.price_snapshot : q.totalCents / 100;
  data.service_name_snapshot = preserve
    ? previous.service_name_snapshot
    : `${service.name} · ${q.selection.fullBody ? "Todo el cuerpo" : q.lines.map((z) => z.name).join(" + ")}`;
}
module.exports = {
  validate,
  selection,
  quote,
  apply,
  preset,
  prepareAppointment,
  sameSelection,
};
