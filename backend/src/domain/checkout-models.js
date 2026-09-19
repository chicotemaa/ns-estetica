"use strict";
const relation = (name) => ({
  type: "relation",
  relation: "manyToOne",
  target: `api::${name}.${name}`,
});
module.exports = {
  models: {
    checkout_events: {
      name: "checkout-event",
      attributes: {
        business: relation("business"),
        appointment: relation("appointment"),
        payment: relation("payment"),
        kind: {
          type: "enumeration",
          enum: ["adjustment", "method", "void"],
          required: true,
        },
        reason: { type: "text", required: true },
        before_value: { type: "json" },
        after_value: { type: "json" },
        actor: { type: "string" },
      },
    },
  },
  additions: {
    appointments: { checkout_total: { type: "decimal", min: 0 } },
    payments: {
      status: {
        type: "enumeration",
        enum: ["pending", "completed", "failed", "refunded", "voided"],
        required: true,
        default: "pending",
      },
    },
    businesses: {
      website_content: { type: "json" },
      website_draft: { type: "json", private: true },
      website_media: { type: "json", private: true },
      website_revision: { type: "integer", default: 0 },
      website_published_at: { type: "datetime" },
      brand_palette: {
        type: "enumeration",
        enum: ["bronze", "forest", "graphite"],
      },
      booking_intro: { type: "text" },
    },
  },
};
