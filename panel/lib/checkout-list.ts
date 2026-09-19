import type { AgendaEntry } from "./agenda-history";

export function filterCheckoutEntries(
  entries: AgendaEntry[],
  { date, query = "", today }: { date?: string; query?: string; today: string },
) {
  const search = query.trim().toLocaleLowerCase("es");
  return entries
    .filter(
      (entry) =>
        (!date || entry.appointmentDate === date) &&
        (!search ||
          `${entry.customerName} ${entry.serviceName}`
            .toLocaleLowerCase("es")
            .includes(search)),
    )
    .sort(
      (a, b) =>
        Number(b.appointmentDate === today) -
          Number(a.appointmentDate === today) ||
        b.appointmentDate.localeCompare(a.appointmentDate) ||
        a.appointmentTime.localeCompare(b.appointmentTime) ||
        a.id.localeCompare(b.id, "en", { numeric: true }),
    );
}
