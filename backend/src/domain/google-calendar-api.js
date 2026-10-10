"use strict";
const { OAuth2Client } = require("google-auth-library");
const { configuration, unseal } = require("./google-calendar-model");
const scopes = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];
function oauth() {
  if (!configuration().ready)
    throw Error(
      "Falta configurar la aplicación de Google Calendar en el servidor.",
    );
  return new OAuth2Client(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  );
}
async function client(connection) {
  const auth = oauth();
  auth.setCredentials({
    refresh_token: unseal(connection.credentials).refresh_token,
  });
  const { token } = await auth.getAccessToken();
  if (!token) throw Error("Reconectá tu cuenta de Google.");
  async function request(path, method = "GET", body, etag) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3${path}`,
      {
        method,
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(etag ? { "If-Match": etag } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (!response.ok) {
      const error = new Error(
        `Google Calendar no pudo completar la operación (${response.status}).`,
      );
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }
  async function pages(path, params) {
    const items = [];
    let pageToken;
    do {
      const result = await request(
        `${path}?${new URLSearchParams({ ...params, ...(pageToken ? { pageToken } : {}) })}`,
      );
      items.push(...(result.items || []));
      pageToken = result.nextPageToken;
      if (items.length > 20000)
        throw Error(
          "El calendario supera el límite de eventos. Elegí un calendario específico para la estética.",
        );
    } while (pageToken);
    return items;
  }
  const base = `/calendars/${encodeURIComponent(connection.calendar_id || "primary")}/events`;
  return {
    calendars: async () =>
      (
        await pages("/users/me/calendarList", {
          minAccessRole: "writer",
          maxResults: "250",
        })
      )
        .filter((c) => ["owner", "writer"].includes(c.accessRole))
        .map((c) => ({ id: c.id, name: c.summary, primary: !!c.primary })),
    events: (from, to) =>
      pages(base, {
        timeMin: from,
        timeMax: to,
        singleEvents: "true",
        showDeleted: "true",
        maxResults: "2500",
      }),
    get: (id) =>
      request(`${base}/${encodeURIComponent(id)}`).catch((e) => {
        if ([404, 410].includes(e.status)) return { id, status: "cancelled" };
        throw e;
      }),
    insert: (body) => request(`${base}?sendUpdates=none`, "POST", body),
    update: (id, body, etag) =>
      request(
        `${base}/${encodeURIComponent(id)}?sendUpdates=none`,
        "PATCH",
        body,
        etag,
      ),
    remove: (id, etag) =>
      request(
        `${base}/${encodeURIComponent(id)}?sendUpdates=none`,
        "DELETE",
        undefined,
        etag,
      ).catch((e) => {
        if (![404, 410].includes(e.status)) throw e;
      }),
  };
}
module.exports = { oauth, scopes, client };
