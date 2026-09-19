"use strict";
const { errors } = require("@strapi/utils");
const fail = (message) => {
  throw new errors.ValidationError(message);
};
function cents(value) {
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !/^\d+(\.\d{1,2})?$/.test(value))
  )
    fail("Importe inválido.");
  const number = Number(value);
  if (
    value === null ||
    value === "" ||
    !Number.isFinite(number) ||
    number < 0 ||
    number > 1e10 ||
    Math.abs(number * 100 - Math.round(number * 100)) > 0.0001
  )
    fail("Importe inválido: usá hasta dos decimales.");
  return Math.round(number * 100);
}

module.exports = { cents };
