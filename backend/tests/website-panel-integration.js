const assert = require("node:assert/strict");
module.exports = async function (origin, cookie) {
  const headers = {
    Cookie: cookie,
    Origin: origin,
    "Content-Type": "application/json",
  };
  const response = await fetch(origin + "/api/website", { headers });
  assert.equal(response.status, 200);
  const state = await response.json();
  assert.ok(state.draft.identity.logo);
  const csrf = await fetch(origin + "/api/website/publish", {
    method: "POST",
    headers: { ...headers, Origin: "https://unrelated.test" },
    body: JSON.stringify({ content: state.draft, revision: state.revision }),
  });
  assert.equal(csrf.status, 403);
  const changed = structuredClone(state.draft);
  changed.hero.note = "Preview through panel";
  const save = await fetch(origin + "/api/website", {
    method: "PUT",
    headers,
    body: JSON.stringify({ content: changed, revision: state.revision }),
  });
  assert.equal(save.status, 200);
  const updated = await save.json();
  assert.equal(updated.draft.hero.note, "Preview through panel");
  assert.notEqual(updated.published.hero.note, "Preview through panel");
  const restore = await fetch(origin + "/api/website", {
    method: "PUT",
    headers,
    body: JSON.stringify({ content: state.draft, revision: updated.revision }),
  });
  assert.equal(restore.status, 200);
  const ticket = await fetch(origin + "/api/website/upload-ticket", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "test.png", mime: "image/png", size: 10 }),
  });
  assert.equal(ticket.status, 200);
  assert.ok((await ticket.json()).uploadUrl.endsWith("/api/website/upload"));
  console.log(
    "PASS: Mi web panel proxy, draft persistence, CSRF and direct-upload capability.",
  );
};
