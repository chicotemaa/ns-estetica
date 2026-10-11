const test = require("node:test");
const assert = require("node:assert/strict");
const { publicServices, withVariant } = require("../src/domain/public-catalog");
const services = [
  {
    id: "1",
    name: "Color",
    is_active: true,
    booking_enabled: false,
    duration_minutes: null,
    price: 70000,
  },
  {
    id: "2",
    name: "Corte",
    is_active: true,
    booking_enabled: true,
    duration_minutes: 40,
    price: 26000,
  },
  { id: "3", is_active: false },
];
const variants = [
  {
    id: "10",
    service_id: "1",
    variant_name: "Largo",
    price: 120000,
    is_active: true,
  },
  {
    id: "11",
    service_id: "2",
    variant_name: "Base",
    price: 26000,
    is_active: true,
  },
  {
    id: "12",
    service_id: "1",
    variant_name: "Corto",
    price: 70000,
    is_active: true,
  },
];
test("public catalog includes active services awaiting scheduling with accurate variant prices, without private fields", () => {
  const catalog = publicServices(services, variants);
  assert.equal(catalog.length, 2);
  assert.equal(catalog[0].bookingEnabled, false);
  assert.equal(catalog[0].durationMinutes, null);
  assert.equal(catalog[0].variants[0].price, 120000);
  assert.equal(catalog[0].source_ref, undefined);
  assert.equal(catalog[1].bookingEnabled, true);
});
test("foreign and missing multi-price variants cannot produce a bookable service", () => {
  assert.equal(
    withVariant({ services, variants }, "1", "11").services.length,
    0,
  );
  assert.ok(
    !withVariant({ services, variants }, "1", "").services.some(
      (service) => service.id === "1",
    ),
  );
  const selected = withVariant({ services, variants }, "1", "10").services[0];
  assert.equal(selected.price, 120000);
  assert.equal(selected.name, "Color · Largo");
  assert.equal(selected.booking_enabled, false);
});
test("service photographs and gallery survive the public projection without exposing internal metadata", () => {
  const catalog = publicServices(
    [
      {
        ...services[1],
        image_url: "https://example.com/facial.webp",
        image_gallery: ["https://example.com/studio.webp"],
        image_position: "50% 0%",
        featured: true,
        source_ref: "private-import",
      },
    ],
    [],
  );
  assert.equal(catalog[0].imageUrl, "https://example.com/facial.webp");
  assert.deepEqual(catalog[0].gallery, ["https://example.com/studio.webp"]);
  assert.equal(catalog[0].imagePosition, "50% 0%");
  assert.equal(catalog[0].featured, true);
  assert.equal(catalog[0].source_ref, undefined);
  assert.equal(catalog[0].price, 26000);
});
