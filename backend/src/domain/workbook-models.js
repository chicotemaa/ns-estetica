"use strict";
const text = { type: "text" };
const money = { type: "decimal", min: 0 };
const relation = (name) => ({
  type: "relation",
  relation: "manyToOne",
  target: `api::${name}.${name}`,
});
module.exports = {
  work_records: {
    name: "work-record",
    attributes: {
      business: relation("business"),
      customer: relation("customer"),
      service: relation("service"),
      staff_member: relation("staff-member"),
      work_date: { type: "date", required: true },
      customer_name: { ...text, required: true },
      service_name: { ...text, required: true },
      staff_name: text,
      amount: { ...money, required: true },
      notes: text,
      source_ref: text,
      collection_verified: { type: "boolean", default: false },
      import_key: { type: "string", unique: true, private: true },
      import_hash: { type: "string", private: true },
    },
  },
  import_rows: {
    name: "import-row",
    attributes: {
      business: relation("business"),
      source_sheet: { ...text, required: true },
      source_row: { type: "integer", min: 1, required: true },
      source_hash: { type: "string", required: true },
      source_data: { type: "json", required: true },
      record_date: { type: "date" },
      review_notes: { type: "json", default: [] },
      outcome: {
        type: "enumeration",
        enum: ["processed", "review", "empty"],
        required: true,
      },
      source_key: { type: "string", unique: true, required: true },
    },
  },
};
