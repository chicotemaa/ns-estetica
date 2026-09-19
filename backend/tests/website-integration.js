"use strict";
const assert = require("node:assert/strict");
module.exports = async function websiteIntegration(call, token) {
  assert.equal((await call("/backoffice/website")).status, 403);
  assert.equal(
    (
      await call("/backoffice/website/upload-ticket", {
        method: "POST",
        body: "{}",
      })
    ).status,
    403,
  );
  const initial = await call("/backoffice/website", { token });
  assert.equal(initial.status, 200, JSON.stringify(initial.body));
  const draft = structuredClone(initial.body.draft);
  draft.hero.note = "Borrador privado";
  const save = await call("/backoffice/website", {
    token,
    method: "PUT",
    body: JSON.stringify({ content: draft, revision: 0 }),
  });
  assert.equal(save.status, 200, JSON.stringify(save.body));
  assert.equal(save.body.revision, 1);
  assert.equal(save.body.draft.hero.note, "Borrador privado");
  const publicDraft = await call("/public/nerea-aylen-barber/catalog");
  assert.equal(publicDraft.body.website, null);
  assert.equal(
    JSON.stringify(publicDraft.body).includes("Borrador privado"),
    false,
  );
  const stale = await call("/backoffice/website/publish", {
    token,
    method: "POST",
    body: JSON.stringify({ content: draft, revision: 0 }),
  });
  assert.equal(stale.status, 409);
  const published = await call("/backoffice/website/publish", {
    token,
    method: "POST",
    body: JSON.stringify({ content: draft, revision: 1 }),
  });
  assert.equal(published.status, 200, JSON.stringify(published.body));
  assert.ok(published.body.publishedAt);
  const catalog = await call("/public/nerea-aylen-barber/catalog");
  assert.equal(catalog.body.website.hero.note, "Borrador privado");
  assert.equal(catalog.body.website_draft, undefined);
  const generic = await call("/backoffice/query", {
    token,
    method: "POST",
    body: JSON.stringify({
      resource: "businesses",
      operation: "update",
      data: { website_content: draft },
      filters: [{ field: "id", operator: "eq", value: "1" }],
    }),
  });
  assert.equal(generic.status, 400);
  const sharp = require("sharp");
  const bytes = await sharp({
    create: { width: 24, height: 24, channels: 3, background: "#6b2036" },
  })
    .png()
    .toBuffer();
  const ticket = await call("/backoffice/website/upload-ticket", {
    token,
    method: "POST",
    body: JSON.stringify({
      name: "Integration.png",
      mime: "image/png",
      size: bytes.length,
    }),
  });
  assert.equal(ticket.status, 200, JSON.stringify(ticket.body));
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes], { type: "image/png" }),
    "Integration.png",
  );
  const upload = await fetch(ticket.body.uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${ticket.body.token}` },
    body: form,
  });
  const uploaded = await upload.json();
  assert.equal(upload.status, 200, JSON.stringify(uploaded));
  assert.equal(uploaded.media.mime, "image/webp");
  const asset = await fetch(uploaded.media.url);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("content-type"), /image\/webp/);
  const replay = await fetch(ticket.body.uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${ticket.body.token}` },
    body: form,
  });
  assert.equal(replay.status, 401);
  const unauthorized = await fetch(ticket.body.uploadUrl, {
    method: "POST",
    body: "not multipart",
  });
  assert.equal(unauthorized.status, 401);
  const library = await call("/backoffice/website", { token });
  assert.equal(library.body.media.length, 1);
  const original = structuredClone(initial.body.draft);
  assert.equal(
    (
      await call("/backoffice/website/publish", {
        token,
        method: "POST",
        body: JSON.stringify({ content: original, revision: 2 }),
      })
    ).status,
    200,
  );
  console.log(
    "PASS: Website drafts, publication, conflicts, authorization, upload capabilities, optimized media and public assets.",
  );
};
