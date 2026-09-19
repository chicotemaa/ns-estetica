"use strict";
const { equal } = require("../domain/customer-auth");
module.exports = async (ctx) => {
  const expected = process.env.CUSTOMER_PROXY_SECRET?.trim();
  return (
    !!expected &&
    expected.length >= 32 &&
    equal(ctx.request.headers["x-customer-proxy-key"], expected)
  );
};
