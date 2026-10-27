"use strict";
const assert = require("node:assert/strict");
const calendar = require("../src/domain/google-calendar"),
  model = require("../src/domain/google-calendar-model");
const {
  repository,
  resources,
  serialize,
} = require("../src/domain/repository");
const { locked, schedule, choices } = require("../src/domain/booking");
module.exports = async function ({
  app,
  call,
  token,
  businessId,
  appointmentId,
  date,
  serviceId,
}) {
  const UID = "api::calendar-connection.calendar-connection",
    repo = repository(app, businessId);
  const original = (
    await repo.read(
      "appointments",
      [{ field: "id", operator: "eq", value: appointmentId }],
      [],
      true,
    )
  )[0];
  const originalRow = serialize("appointments", original);
  const options = choices(
    await schedule(app, businessId, date),
    date,
    serviceId,
    null,
    { publicOnly: false },
  );
  const times = options[0].slots;
  assert.ok(times.length >= 4);
  const fixture = await locked(app, businessId, () =>
    app.documents(resources.appointments.uid).create({
      data: {
        business: businessId,
        staff_member: Number(options[0].staff.id),
        service: serviceId,
        customer_name: "Calendar fixture",
        customer_contact: "fixture-only",
        appointment_date: date,
        appointment_time: times[0] + ":00.000",
        duration_snapshot: 45,
        price_snapshot: 100,
        status: "confirmed",
        channel: "manual",
        service_name_snapshot: "Fixture service",
      },
    }),
  );
  const connection = await app.db.query(UID).create({
    data: {
      business: businessId,
      business_key: String(businessId),
      enabled: true,
      credentials: "fake-ciphertext",
      calendar_id: "fixture@example.test",
      state: { links: {}, busy: [], conflicts: [] },
    },
  });
  assert.equal((await call("/backoffice/google-calendar")).status, 403);
  const checked = await call("/backoffice/google-calendar", { token });
  assert.equal(checked.status, 200);
  assert.ok(!JSON.stringify(checked.body).includes("fake-ciphertext"));
  const forbidden = await call("/backoffice/query", {
    method: "POST",
    token,
    body: JSON.stringify({
      resource: "calendar_connections",
      operation: "select",
    }),
  });
  assert.equal(forbidden.status, 400);
  const events = new Map();
  let sequence = 0,
    inserts = 0;
  function event(body) {
    const e = structuredClone(body);
    for (const k of ["start", "end"])
      if (e[k]?.dateTime && !/[Zz]|[+-]\d\d:\d\d$/.test(e[k].dateTime))
        e[k].dateTime += "-03:00";
    return { ...e, etag: String(++sequence) };
  }
  const api = {
    events: async () => [...events.values()].map(structuredCloneSafe),
    get: async (id) => events.get(id) || { id, status: "cancelled" },
    insert: async (body) => {
      if (events.has(body.id))
        throw Object.assign(Error("duplicate"), { status: 409 });
      inserts++;
      const e = event(body);
      events.set(body.id, e);
      return e;
    },
    update: async (id, body, etag) => {
      assert.equal(events.get(id).etag, etag);
      const e = event({ ...events.get(id), ...body, id });
      events.set(id, e);
      return e;
    },
    remove: async (id, etag) => {
      assert.equal(events.get(id).etag, etag);
      events.set(id, { id, status: "cancelled", etag: String(++sequence) });
    },
  };
  function structuredCloneSafe(e) {
    return structuredClone(e);
  }
  const sync = () => calendar.sync(app, businessId, async () => api);
  const getConnection = () =>
    app.db.query(UID).findOne({ where: { id: connection.id } });
  const getRow = () =>
    app.db
      .query(resources.appointments.uid)
      .findOne({ where: { id: fixture.id } });
  const filters = [{ field: "id", operator: "eq", value: fixture.id }],
    key = `appointment:${fixture.id}`;
  try {
    await sync();
    const firstCount = inserts;
    await sync();
    assert.equal(inserts, firstCount, "no duplicate export");
    let link = (await getConnection()).state.links[key],
      remote = events.get(link.eventId);
    const move = (time) =>
      event({
        ...remote,
        start: { dateTime: `${date}T${time}:00-03:00` },
        end: {
          dateTime: `${date}T${String(Number(time.slice(0, 2)) + 1).padStart(2, "0")}:${time.slice(3)}:00-03:00`,
        },
      });
    const target = times.find((t) => t > times[0] && t.slice(0, 2) < "20");
    events.set(link.eventId, move(target));
    await sync();
    assert.equal((await getRow()).appointment_time.slice(0, 5), target);
    assert.equal((await getRow()).duration_snapshot, 60);
    events.set(link.eventId, { id: link.eventId, status: "cancelled" });
    await sync();
    assert.equal((await getRow()).status, "cancelled");
    await locked(app, businessId, () =>
      repo.mutate("appointments", "update", { status: "confirmed" }, filters),
    );
    await sync();
    link = (await getConnection()).state.links[key];
    assert.notEqual(link.eventId, remote.id, "restoration creates new ID");
    await locked(app, businessId, () =>
      repo.mutate("appointments", "delete", null, filters),
    );
    await sync();
    assert.equal(events.get(link.eventId).status, "cancelled");
    assert.ok((await getRow()).deleted_at);
    await locked(app, businessId, () =>
      repo.mutate("appointments", "update", { deleted_at: null }, filters),
    );
    await sync();
    link = (await getConnection()).state.links[key];
    remote = events.get(link.eventId);
    // Private event information is available only through the manager projection.
    events.set("personal", {
      id: "personal",
      summary: "Private appointment",
      start: { date },
      end: {
        date: new Date(Date.parse(date + "T12:00Z") + 86400000)
          .toISOString()
          .slice(0, 10),
      },
    });
    await sync();
    assert.ok(
      (await calendar.blocks(app, businessId, date)).some(
        (b) => b.start_time === "00:00" && b.end_time === "24:00",
      ),
    );
    assert.equal(
      choices(await schedule(app, businessId, date), date, serviceId, null)[0]
        .slots.length,
      0,
    );
    assert.ok(
      !JSON.stringify(await calendar.blocks(app, businessId, date)).includes(
        "Private appointment",
      ),
    );
    const adminBlocks = await call("/backoffice/google-calendar/blocks", { token });
    assert.equal(adminBlocks.status, 200);
    assert.ok(adminBlocks.body.blocks.some((b) => b.google_event?.title === "Private appointment"));
    assert.equal((await call("/backoffice/google-calendar/blocks")).status, 403);
    events.delete("personal");
    await sync();
    assert.equal((await calendar.blocks(app, businessId, date)).length, 0);
    // Simultaneous changes produce a visible conflict; explicitly choosing local resolves it.
    await locked(app, businessId, () =>
      repo.mutate(
        "appointments",
        "update",
        { customer_name: "Updated fixture" },
        filters,
      ),
    );
    events.set(link.eventId, move(times[0]));
    await sync();
    assert.ok(
      (await calendar.status(app, businessId)).conflicts.some(
        (c) => c.key === key,
      ),
    );
    await calendar.resolve(app, businessId, key);
    await sync();
    assert.equal((await calendar.status(app, businessId)).conflicts.length, 0);
    assert.ok(events.get(link.eventId).summary.includes("Updated fixture"));
    // Invalid movement (outside hours) preserves local appointment and reports conflict.
    remote = events.get(link.eventId);
    events.set(link.eventId, move("01:00"));
    await sync();
    assert.ok((await calendar.status(app, businessId)).conflicts.length);
    assert.equal((await getRow()).appointment_time.slice(0, 5), target);
    await calendar.resolve(app, businessId, key);
    await sync();
    // Failure keeps previous cache and exposes only a safe error.
    await assert.rejects(() =>
      calendar.sync(app, businessId, async () => ({
        events: async () => {
          throw Error("secret token");
        },
      })),
    );
    assert.ok(
      !(await calendar.status(app, businessId)).error.includes("secret token"),
    );
    await sync();
    // OAuth state and manager binding checked before any network token exchange.
    const previousEnv = { ...process.env };
    Object.assign(process.env, {
      GOOGLE_CALENDAR_CLIENT_ID: "fixture",
      GOOGLE_CALENDAR_CLIENT_SECRET: "fixture",
      GOOGLE_CALENDAR_REDIRECT_URI:
        "https://example.test/api/google-calendar/callback",
      GOOGLE_CALENDAR_ENCRYPTION_KEY: "ab".repeat(32),
    });
    await calendar.disconnect(app, businessId);
    const url = new URL((await calendar.connect(app, businessId, 987)).url);
    assert.ok(url.searchParams.get("code_challenge"));
    assert.equal(url.searchParams.get("access_type"), "offline");
    await assert.rejects(() =>
      calendar.callback(app, businessId, 986, {
        code: "fake",
        state: url.searchParams.get("state"),
      }),
    );
    for (const k of Object.keys(process.env))
      if (k.startsWith("GOOGLE_CALENDAR_")) {
        if (previousEnv[k] === undefined) delete process.env[k];
        else process.env[k] = previousEnv[k];
      }
    assert.equal((await calendar.blocks(app, businessId)).length, 0);
    assert.equal((await calendar.status(app, businessId)).connected, false);
    assert.equal((await getRow()).customer_name, "Updated fixture");
    console.log(
      "PASS: Google Calendar auth guards, encrypted-state isolation, export idempotency, inbound move/cancel, soft delete/restore, personal busy time, conflicts and disconnect.",
    );
  } finally {
    await app.db.query(UID).delete({ where: { id: connection.id } });
    await locked(app, businessId, () =>
      repo.mutate("appointments", "delete", null, filters),
    );
  }
};
