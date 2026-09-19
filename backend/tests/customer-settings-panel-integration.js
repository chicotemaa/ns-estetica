const assert = require("node:assert/strict");
module.exports = async (origin, cookie, call, token) => {
  const current = (await call("/backoffice/online-booking", { token })).body;
  const draft = Object.fromEntries(
    [
      "revision",
      "requested",
      "depositPercent",
      "holdMinutes",
      "googleEnabled",
      "googleClientId",
      "mode",
      "collectorId",
      "cloudflareAccountId",
      "senderEmail",
    ].map((field) => [field, current[field]]),
  );
  const headers = {
    Cookie: cookie,
    Origin: origin,
    "Content-Type": "application/json",
  };
  const change = {
    ...draft,
    depositPercent: 25,
    credentials: { mercadoPagoToken: "TEST-PANEL-TOKEN" },
  };
  const csrf = await fetch(origin + "/api/online-booking", {
    method: "PUT",
    headers: { ...headers, Origin: "https://unrelated.test" },
    body: JSON.stringify(change),
  });
  assert.equal(csrf.status, 403);
  const anonymous = await fetch(origin + "/api/online-booking", {
    method: "PUT",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(change),
  });
  assert.equal(anonymous.status, 401);
  const saved = await fetch(origin + "/api/online-booking", {
    method: "PUT",
    headers,
    body: JSON.stringify(change),
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get("cache-control"), "no-store");
  const result = await saved.json();
  assert.equal(result.depositPercent, 25);
  assert.equal(result.credentials.mercadoPagoToken, true);
  assert.ok(!JSON.stringify(result).includes("TEST-PANEL-TOKEN"));
  const read = await fetch(origin + "/dashboard/settings/online-booking", {
    headers,
  });
  assert.equal(read.status, 200);
  const html = await read.text();
  assert.match(html, /Guardar cambios/);
  assert.match(html, /type="password"/);
  assert.ok(!html.includes("TEST-PANEL-TOKEN"));
  const restore = await fetch(origin + "/api/online-booking", {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...draft, revision: result.revision }),
  });
  assert.equal(restore.status, 200);
  console.log(
    "PASS booking settings through panel: authenticated save, CSRF, private credentials, server-rendered form and persistence.",
  );
};
