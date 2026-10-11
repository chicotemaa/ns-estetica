"use strict";
const assert = require("node:assert/strict");

module.exports = async function ({ app, call, query, password }) {
  const role = await app.db
    .query("plugin::users-permissions.role")
    .findOne({ where: { type: "business-manager" } });
  const user = await app.plugin("users-permissions").service("user").add({
    username: "image-test-manager",
    email: "images@example.test",
    password,
    provider: "local",
    confirmed: true,
    blocked: false,
    role: role.id,
  });
  const auth = await call("/auth/local", {
    method: "POST",
    body: JSON.stringify({ identifier: user.email, password }),
  });
  assert.equal(auth.status, 200);
  const token = auth.body.jwt;
  const images = {
    image_url: "https://example.com/facial.webp",
    image_gallery: ["https://example.com/studio.webp"],
    image_position: "50% 0%",
    featured: true,
  };
  const inserted = await query(token, {
    resource: "services",
    operation: "insert",
    data: {
      name: "Facial ficticio",
      description: "Prueba local de imágenes",
      price: 12345,
      duration_minutes: 45,
      category: "corte",
      is_active: true,
      booking_enabled: true,
      display_order: 0,
      ...images,
    },
  });
  assert.equal(inserted.status, 200, JSON.stringify(inserted.body));
  const id = inserted.body.data[0].id;
  const filters = [{ field: "id", operator: "eq", value: id }];
  const saved = await query(token, { resource: "services", filters });
  assert.equal(saved.status, 200);
  for (const [field, value] of Object.entries(images))
    assert.deepEqual(saved.body.data[0][field], value);
  const path = `/public/${process.env.BUSINESS_SLUG}/catalog`;
  const catalog = await call(path);
  assert.equal(catalog.status, 200);
  const visible = catalog.body.services.find((service) => service.id === id);
  assert.ok(visible, "Active service appears in public catalog");
  assert.equal(visible.imageUrl, images.image_url);
  assert.deepEqual(visible.gallery, images.image_gallery);
  assert.equal(visible.imagePosition, images.image_position);
  assert.equal(visible.featured, true);
  assert.equal(Number(visible.price), 12345);
  assert.equal(visible.durationMinutes, 45);
  const updated = await query(token, {
    resource: "services",
    operation: "update",
    filters,
    data: {
      image_url: null,
      image_gallery: [],
      image_position: "50% 50%",
      featured: false,
    },
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  const cleared = (await call(path)).body.services.find(
    (service) => service.id === id,
  );
  assert.equal(cleared.imageUrl, null);
  assert.deepEqual(cleared.gallery, []);
  assert.equal(cleared.featured, false);
  console.log(
    "PASS: authenticated service images persist, project publicly and clear without changing price or duration.",
  );
};
