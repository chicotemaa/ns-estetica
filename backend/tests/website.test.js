"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  defaults,
  validateContent,
  videoUrl,
  contrast,
} = require("../src/domain/website");
const { issue, consume } = require("../src/domain/website-media");
test("complete current website round trips without losing content", () =>
  assert.deepEqual(validateContent(structuredClone(defaults)), defaults));
test("rejects unreadable colors, unknown fields, executable URLs and duplicate content IDs", () => {
  for (const mutate of [
    (d) => (d.identity.gray = "#151515"),
    (d) => (d.identity.extra = true),
    (d) => (d.hero.image = "javascript:alert(1)"),
    (d) => d.gallery.photos.push(d.gallery.photos[0]),
    (d) => (d.hero.title = "A".repeat(101)),
    (d) => (d.videos.enabled = true),
  ]) {
    const d = structuredClone(defaults);
    mutate(d);
    assert.throws(() => validateContent(d));
  }
  assert.ok(contrast(defaults.identity.burgundy, defaults.identity.white) > 4.5);
});
test("only known video embeds and own uploaded media are accepted", () => {
  assert.equal(videoUrl("https://youtu.be/dQw4w9WgXcQ"), true);
  assert.equal(videoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  for (const url of [
    "https://youtube.com.attacker.test/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://example.test/video.mp4",
    "https://user:password@youtube.com/watch?v=dQw4w9WgXcQ",
  ])
    assert.equal(videoUrl(url), false);
});
test("upload tickets are one-use capabilities with type and size limits", () => {
  const ticket = issue(123, { mime: "image/png", name: "Test", size: 12 });
  assert.equal(consume(ticket.token).businessId, 123);
  assert.equal(consume(ticket.token), null);
  for (const input of [
    { mime: "text/html", size: 100 },
    { mime: "image/png", size: 11 * 1024 * 1024 },
    { mime: "video/mp4", size: 51 * 1024 * 1024 },
  ])
    assert.throws(() => issue(1, input));
});
