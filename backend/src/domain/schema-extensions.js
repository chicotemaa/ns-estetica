"use strict";
// Kept separate from the legacy SQL translator so regeneration preserves new rules.
module.exports = {
  businesses: {
    monthly_collection_target: { type: "decimal", min: 0, default: 0 },
  },
  staff_members: {
    accepts_bookings: { type: "boolean", default: true },
    collection_commission_rate: {
      type: "decimal",
      min: 0,
      max: 100,
      default: 0,
    },
  },
  customers: { rating: { type: "decimal", min: 0, max: 5 } },
  payments: {
    commission_rate: { type: "decimal", min: 0, max: 100 },
    commission_amount: { type: "decimal", min: 0 },
    checkout_key: { type: "string", unique: true, private: true },
    checkout_hash: { type: "string", private: true },
  },
};
