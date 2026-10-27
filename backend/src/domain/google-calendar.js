"use strict";
const crypto = require("node:crypto");
const { errors } = require("@strapi/utils");
const { repository, getBusiness } = require("./repository");
const { locked } = require("./booking");
const model = require("./google-calendar-model");
const google = require("./google-calendar-api");
const UID = "api::calendar-connection.calendar-connection";
const read = (s, id) =>
  s.db.query(UID).findOne({ where: { business_key: String(id) } });
const save = (s, c, data) =>
  s.db.query(UID).update({ where: { id: c.id }, data });
function fail(message) {
  throw new errors.ValidationError(message);
}
async function ensure(s, id) {
  return (
    (await read(s, id)) ||
    s.db.query(UID).create({
      data: {
        business: id,
        business_key: String(id),
        state: { links: {}, busy: [], conflicts: [] },
      },
    })
  );
}
async function status(s, id) {
  const c = await read(s, id),
    config = model.configuration();
  return {
    ...config,
    connected: !!c?.credentials,
    enabled: !!c?.enabled,
    calendarId: c?.calendar_id || "",
    calendarName: c?.calendar_name || "",
    lastSync: c?.last_sync || null,
    error: c?.last_error || null,
    conflicts: c?.state?.conflicts || [],
  };
}
async function connect(s, id, managerId) {
  const auth = google.oauth();
  return locked(s, id, async () => {
    const c = await ensure(s, id);
    if (c.enabled)
      fail("Desconectá el calendario actual antes de conectar otra cuenta.");
    const state = crypto.randomBytes(32).toString("base64url"),
      verifier = crypto.randomBytes(32).toString("base64url");
    await save(s, c, {
      oauth_pending: {
        hash: model.hash(state),
        managerId,
        expires: Date.now() + 600000,
        verifier: model.seal(verifier),
      },
    });
    return {
      url: auth.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: google.scopes,
        state,
        code_challenge: crypto
          .createHash("sha256")
          .update(verifier)
          .digest("base64url"),
        code_challenge_method: "S256",
      }),
    };
  });
}
async function callback(s, id, managerId, { code, state }) {
  if (
    typeof code !== "string" ||
    code.length > 4096 ||
    typeof state !== "string" ||
    state.length > 200
  )
    fail("La autorización de Google es inválida.");
  // Consume once in its own transaction: failed token exchange also invalidates state.
  const pending = await locked(s, id, async () => {
    const c = await read(s, id),
      p = c?.oauth_pending;
    if (
      !p ||
      p.hash !== model.hash(state) ||
      p.managerId !== managerId ||
      p.expires < Date.now()
    )
      fail("La conexión venció. Volvé a tocar Conectar con Google.");
    await save(s, c, { oauth_pending: null });
    return p;
  });
  const { tokens } = await google
    .oauth()
    .getToken({ code, codeVerifier: model.unseal(pending.verifier) });
  if (
    !tokens.refresh_token ||
    !google.scopes.every((scope) =>
      (tokens.scope || "").split(" ").includes(scope),
    )
  )
    fail(
      "Google debe autorizar el acceso a los calendarios y sus eventos. Volvé a conectar y aceptá ambos permisos.",
    );
  await locked(s, id, async () => {
    const c = await read(s, id);
    await save(s, c, {
      credentials: model.seal({ refresh_token: tokens.refresh_token }),
      last_error: null,
    });
  });
  return { ok: true };
}
async function calendars(s, id) {
  const c = await read(s, id);
  if (!c?.credentials) fail("Conectá tu cuenta de Google.");
  return { calendars: await (await google.client(c)).calendars() };
}
async function select(s, id, calendarId) {
  if (typeof calendarId !== "string" || calendarId.length > 1024)
    fail("Calendario inválido.");
  await locked(s, id, async () => {
    const c = await read(s, id);
    if (!c?.credentials) fail("Conectá tu cuenta de Google.");
    if (c.enabled) fail("Desconectá antes de cambiar el calendario.");
    const selected = (await (await google.client(c)).calendars()).find(
      (x) => x.id === calendarId,
    );
    if (!selected) fail("Elegí un calendario con permiso de edición.");
    await save(s, c, {
      calendar_id: selected.id,
      calendar_name: selected.name,
      enabled: true,
      last_error: null,
      state:
        c.calendar_id === selected.id
          ? { ...c.state, busy: [], conflicts: [] }
          : { links: {}, busy: [], conflicts: [] },
    });
  });
  return { ok: true };
}
async function disconnect(s, id) {
  return locked(s, id, async () => {
    const c = await read(s, id);
    if (c)
      await save(s, c, {
        credentials: null,
        oauth_pending: null,
        enabled: false,
        state: { ...c.state, busy: [], conflicts: [] },
        last_error: null,
      });
    return { ok: true };
  });
}
async function blocks(s, id, date, includeDetails = false) {
  const c = await read(s, id);
  return c?.enabled
    ? (c.state?.busy || []).filter((b) => !date || b.block_date === date).map((b) => {
        const { google_event, ...interval } = b;
        return includeDetails && google_event ? { ...interval, reason: google_event.title, google_event } : interval;
      })
    : [];
}
async function sync(s, id, makeClient = google.client) {
  try {
    await locked(s, id, async () => {
      const c = await read(s, id);
      if (!c?.enabled || !c.credentials) return;
      const api = await makeClient(c),
        repo = repository(s, id),
        business = (await repo.records("businesses"))[0];
      const zone = business.time_zone || "America/Argentina/Buenos_Aires";
      const from = new Date(Date.now() - 30 * 86400000).toISOString(),
        to = new Date(Date.now() + 400 * 86400000).toISOString();
      const events = await api.events(from, to),
        byId = new Map(events.map((e) => [e.id, e]));
      const links = structuredClone(c.state?.links || {}),
        conflicts = [];
      const ownIds = new Set(Object.values(links).map((l) => l.eventId));
      // Refresh busy time before validating incoming moves, within the same booking lock.
      const busy = model.busyBlocks(
        events.filter((e) => !ownIds.has(e.id)),
        zone,
        from.slice(0, 10),
        to.slice(0, 10),
      );
      await save(s, c, { state: { ...c.state, busy } });
      const appointments = (await repo.read("appointments", [], [], true)).map(
        (r) => require("./repository").serialize("appointments", r),
      );
      const pauses = await repo.records("schedule_blocks");
      const rows = new Map([
        ...appointments.map((r) => [`appointment:${r.id}`, r]),
        ...pauses.map((r) => [`block:${r.id}`, r]),
      ]);
      const keys = new Set([...Object.keys(links), ...rows.keys()]);
      for (const key of keys) {
        const kind = key.split(":")[0];
        let row = rows.get(key),
          link = links[key];
        const date = row?.appointment_date || row?.block_date;
        if (
          !link &&
          (!row || date < from.slice(0, 10) || date > to.slice(0, 10))
        )
          continue;
        let desired = row
          ? model.localEvent(kind, row, zone)
          : { cancelled: true };
        if (!link && desired.cancelled) continue;
        let remote = link
          ? byId.get(link.eventId) || (await api.get(link.eventId))
          : null;
        const localChanged = !!link && model.hash(desired) !== link.localHash;
        const remoteChanged =
          !!link && model.hash(model.remoteShape(remote)) !== link.remoteHash;
        if (
          link &&
          remoteChanged &&
          !link.forceLocal &&
          !(desired.cancelled && remote.status === "cancelled")
        ) {
          try {
            if (localChanged)
              throw Error(
                "El turno o bloqueo cambió en ambos calendarios. Elegí conservar el panel o revisá el evento en Google.",
              );
            if (!row)
              throw Error(
                "El bloqueo se eliminó en el panel y cambió en Google.",
              );
            const filters = [{ field: "id", operator: "eq", value: row.id }];
            // Per-event savepoint: a rejected move must not poison the batch transaction.
            await s.db.transaction(async () => {
              if (kind === "appointment") {
                if (row.deleted_at)
                  throw Error(
                    "El turno está eliminado en el panel. Restauralo antes de moverlo.",
                  );
                const update = model.movedAppointment(remote, zone);
                if (remote.status !== "cancelled" && row.status === "cancelled")
                  throw Error(
                    "Reactivá el turno desde el panel antes de moverlo.",
                  );
                await repo.mutate("appointments", "update", update, filters);
                row = (await repo.records("appointments", filters))[0];
              } else if (remote.status === "cancelled") {
                await repo.mutate("schedule_blocks", "delete", null, filters);
                row = null;
              } else {
                const update = model.movedAppointment(remote, zone);
                const end = model.stamp(remote.end.dateTime, zone);
                const data = {
                  block_date: update.appointment_date,
                  start_time: update.appointment_time,
                  end_time: end.time,
                };
                await repo.mutate("schedule_blocks", "update", data, filters);
                row = (await repo.records("schedule_blocks", filters))[0];
              }
            });
            desired = row
              ? model.localEvent(kind, row, zone)
              : { cancelled: true };
            link.localHash = model.hash(desired);
            link.remoteHash = model.hash(model.remoteShape(remote));
          } catch (error) {
            conflicts.push({ key, message: error.message });
            continue;
          }
        }
        if (!link)
          link = {
            eventId: model.hash(`${c.id}:${c.calendar_id}:${key}`),
            generation: 0,
          };
        // Google tombstones cannot be reused. Increment deterministically for restored records.
        if (!desired.cancelled && remote?.status === "cancelled") {
          link.generation = (link.generation || 0) + 1;
          link.eventId = model.hash(
            `${c.id}:${c.calendar_id}:${key}:${link.generation}`,
          );
          remote = null;
        }
        if (desired.cancelled) {
          if (remote && remote.status !== "cancelled")
            await api.remove(link.eventId, remote.etag);
          remote = { id: link.eventId, status: "cancelled" };
        } else if (!remote) {
          try {
            remote = await api.insert({ ...desired, id: link.eventId });
          } catch (error) {
            if (error.status !== 409) throw error;
            remote = await api.get(link.eventId);
            if (remote.status === "cancelled")
              throw Error("El evento requiere reintentar la sincronización.");
            remote = await api.update(link.eventId, desired, remote.etag);
          }
        } else if (model.hash(desired) !== link.localHash || link.forceLocal)
          remote = await api.update(link.eventId, desired, remote.etag);
        links[key] = {
          ...link,
          forceLocal: false,
          localHash: model.hash(desired),
          remoteHash: model.hash(model.remoteShape(remote)),
        };
      }
      // Inbound conflicts remain busy at their Google time, as well as the original local appointment.
      const conflictIds = new Set(conflicts.map((x) => links[x.key]?.eventId));
      const finalOwnIds = new Set(Object.values(links).map((l) => l.eventId));
      const finalBusy = model.busyBlocks(
        events.filter((e) => !finalOwnIds.has(e.id) || conflictIds.has(e.id)),
        zone,
        from.slice(0, 10),
        to.slice(0, 10),
        true,
      );
      await save(s, c, {
        state: { links, busy: finalBusy, conflicts },
        last_sync: new Date().toISOString(),
        last_error: null,
      });
    });
  } catch (error) {
    // No tokens, provider bodies, event contents or customer details in errors/logs.
    const c = await read(s, id);
    if (c)
      await save(s, c, {
        last_error:
          "No se pudo sincronizar. Reintentá; si persiste, reconectá tu cuenta de Google.",
      });
    throw new errors.ApplicationError(
      "No se pudo sincronizar con Google Calendar. Revisá la conexión y reintentá.",
    );
  }
  return status(s, id);
}
async function resolve(s, id, key) {
  await locked(s, id, async () => {
    const c = await read(s, id);
    if (!c?.state?.conflicts?.some((x) => x.key === key))
      fail("Conflicto no encontrado.");
    const state = structuredClone(c.state);
    state.links[key].forceLocal = true;
    await save(s, c, { state });
  });
  return { ok: true };
}
async function maintain(s) {
  if (!model.configuration().ready) return;
  const business = await getBusiness(s);
  const c = await read(s, business.id);
  if (c?.enabled) await sync(s, business.id);
}
module.exports = {
  status,
  connect,
  callback,
  calendars,
  select,
  disconnect,
  blocks,
  sync,
  resolve,
  maintain,
};
