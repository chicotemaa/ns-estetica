import type { ScheduleBlock } from "./schedule-tools";

type EventDetails = NonNullable<ScheduleBlock["google_event"]>;
export function GoogleEventDetails({ event, timeZone }: { event: EventDetails; timeZone: string }) {
  function stamp(value: string, dateOnly = false) {
    const date = new Date(dateOnly ? `${value}T12:00:00Z` : value);
    if (!Number.isFinite(date.getTime())) return value;
    return new Intl.DateTimeFormat("es-AR", { timeZone, dateStyle: "short", ...(dateOnly ? {} : { timeStyle: "short" as const }) }).format(date);
  }
  const description = event.description.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/(p|div|li)>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  const person = (p: NonNullable<EventDetails["organizer"]>) => [p.name, p.email].filter(Boolean).join(" · ");
  const responses: Record<string, string> = { accepted: "Aceptó", declined: "Rechazó", tentative: "Tentativo", needsAction: "Sin responder" };
  return <div className="mt-3 space-y-3 text-sm">
    {description && <p className="whitespace-pre-wrap break-words">{description}</p>}
    <dl className="space-y-2 break-words">
      {event.location && <div><dt className="font-semibold">Lugar</dt><dd>{event.location}</dd></div>}
      {event.start && <div><dt className="font-semibold">Comienza</dt><dd>{event.start.dateTime ? stamp(event.start.dateTime) : event.start.date ? `${stamp(event.start.date, true)} · Todo el día` : "Sin fecha"}</dd></div>}
      {event.end?.dateTime && <div><dt className="font-semibold">Finaliza</dt><dd>{stamp(event.end.dateTime)}</dd></div>}
      {event.end?.date && <div><dt className="font-semibold">Último día</dt><dd>{stamp(new Date(new Date(`${event.end.date}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10), true)}</dd></div>}
      {event.organizer && <div><dt className="font-semibold">Organiza</dt><dd>{person(event.organizer)}</dd></div>}
      {event.attendees.length > 0 && <div><dt className="font-semibold">Participantes</dt><dd><ul className="space-y-1">{event.attendees.map((p, index) => <li key={`${p.email}:${index}`}>{person(p)}{p.optional ? " · Opcional" : ""}{responses[p.response] ? ` · ${responses[p.response]}` : ""}</li>)}</ul></dd></div>}
      <div><dt className="font-semibold">Estado</dt><dd>{({ confirmed: "Confirmado", tentative: "Tentativo", cancelled: "Cancelado" } as Record<string, string>)[event.status] || event.status}{event.recurring ? " · Evento recurrente" : ""}</dd></div>
    </dl>
    {event.video_link && <a className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4" href={event.video_link} target="_blank" rel="noopener noreferrer">Abrir videollamada</a>}
    <details>
      <summary className="cursor-pointer font-semibold">Más información del evento</summary>
      <dl className="mt-2 space-y-2 break-words">
        {event.creator && <div><dt className="font-semibold">Creado por</dt><dd>{person(event.creator)}</dd></div>}
        {event.created && <div><dt className="font-semibold">Creado</dt><dd>{stamp(event.created)}</dd></div>}
        {event.updated && <div><dt className="font-semibold">Actualizado</dt><dd>{stamp(event.updated)}</dd></div>}
        <div><dt className="font-semibold">Visibilidad en Google</dt><dd>{({ default: "La del calendario", private: "Privado", public: "Público", confidential: "Confidencial" } as Record<string, string>)[event.visibility] || event.visibility}</dd></div>
      </dl>
    </details>
  </div>;
}
