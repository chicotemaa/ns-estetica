import {
  getMonthGridDays,
  getYearMonthDateKeys,
  parseDateKey,
} from "../appointment-utils";
import type { AgendaEntry } from "@/lib/agenda-history";

export function AppointmentsYear({
  appointments,
  focusDateKey,
  onOpenDay,
  onOpenMonth,
}: {
  appointments: AgendaEntry[];
  focusDateKey: string;
  onOpenDay: (date: string) => void;
  onOpenMonth: (date: string) => void;
}) {
  const counts = new Map<string, number>();
  for (const entry of appointments)
    counts.set(
      entry.appointmentDate,
      (counts.get(entry.appointmentDate) ?? 0) + 1,
    );
  return (
    <div className="agenda-year">
      {getYearMonthDateKeys(focusDateKey).map((month) => {
        const title = new Intl.DateTimeFormat("es-AR", {
          month: "long",
          year: "numeric",
        }).format(parseDateKey(month));
        const days = getMonthGridDays(month);
        const last = days.findLastIndex((day) => day.inCurrentMonth);
        const monthDays = days.slice(0, Math.ceil((last + 1) / 7) * 7);
        return (
          <section key={month} className="agenda-year-month" aria-label={title}>
            <button
              className="agenda-year-title"
              onClick={() => onOpenMonth(month)}
              aria-label={`Ver ${title}`}
            >
              {title}
            </button>
            <div className="agenda-year-days">
              {["L", "M", "X", "J", "V", "S", "D"].map((label, index) => (
                <span
                  key={index}
                  className="agenda-year-weekday"
                  aria-hidden="true"
                >
                  {label}
                </span>
              ))}
              {monthDays.map((day) => {
                const count = counts.get(day.dateKey) ?? 0;
                return day.inCurrentMonth ? (
                  <button
                    type="button"
                    key={day.dateKey}
                    className="agenda-year-day"
                    data-count={count || undefined}
                    onClick={() => onOpenDay(day.dateKey)}
                    aria-label={`${Number(day.dateKey.slice(-2))} de ${title}, ${count} ${count === 1 ? "atención" : "atenciones"}`}
                  >
                    <span>{Number(day.dateKey.slice(-2))}</span>
                    {count > 0 && <small>{count}</small>}
                  </button>
                ) : (
                  <span key={day.dateKey} aria-hidden="true" />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
