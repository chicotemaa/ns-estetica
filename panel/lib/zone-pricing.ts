export type ZonePricing = {
  type: "zones";
  zones: { id: string; name: string; price: number }[];
  minimumZones: number;
  discountPercent: number;
  fullBodyPercent: number;
  dates: string[];
  weekdays: number[];
  opens: string;
  closes: string;
  leadMinutes: number;
};
export type ZoneSelection = { zoneIds: string[]; fullBody: boolean };
export const sameZoneSelection = (a: ZoneSelection, b: ZoneSelection) =>
  a.fullBody === b.fullBody &&
  JSON.stringify([...a.zoneIds].sort()) ===
    JSON.stringify([...b.zoneIds].sort());
export function zoneAllows(
  config: ZonePricing,
  date: string,
  time: string,
  duration: number,
  enforceLead: boolean,
) {
  const day = new Date(`${date}T12:00Z`).getUTCDay();
  if (!config.dates.includes(date) && !config.weekdays.includes(day))
    return false;
  const mins = (s: string) =>
    Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  if (time < config.opens || mins(time) + duration > mins(config.closes))
    return false;
  return (
    !enforceLead ||
    Date.parse(`${date}T${time}:00-03:00`) - Date.now() >=
      config.leadMinutes * 60000
  );
}
export function estimateZones(config: ZonePricing, selection: ZoneSelection) {
  const lines = selection.fullBody
    ? config.zones
    : config.zones.filter((z) => selection.zoneIds.includes(z.id));
  const subtotalCents = lines.reduce(
    (n, z) => n + Math.round(z.price * 100),
    0,
  );
  const discountPercent = selection.fullBody
    ? config.fullBodyPercent
    : lines.length >= config.minimumZones
      ? config.discountPercent
      : 0;
  const discountCents = Math.round((subtotalCents * discountPercent) / 100);
  return {
    lines,
    subtotalCents,
    discountPercent,
    discountCents,
    totalCents: subtotalCents - discountCents,
  };
}

export type ZoneQuote = ReturnType<typeof estimateZones> & {
  selection: ZoneSelection;
  durationMinutes: number | null;
};
