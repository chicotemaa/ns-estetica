"use strict";
const privateConfig = { auth: false, policies: ["global::manager"] };
module.exports = {
  routes: [
    {
      method: "GET",
      path: "/backoffice/notifications",
      handler: "commerce.notifications",
      config: privateConfig,
    },
    {
      method: "PATCH",
      path: "/backoffice/notifications/read",
      handler: "commerce.notificationRead",
      config: privateConfig,
    },
    {
      method: "GET",
      path: "/backoffice/notifications/email",
      handler: "commerce.notificationEmail",
      config: privateConfig,
    },
    {
      method: "PATCH",
      path: "/backoffice/checkout",
      handler: "commerce.modifyCheckout",
      config: privateConfig,
    },
    {
      method: "GET",
      path: "/backoffice/finance/alerts",
      handler: "commerce.financeAlerts",
      config: privateConfig,
    },
    {
      method: "GET",
      path: "/backoffice/finance/expenses",
      handler: "commerce.financeExpenses",
      config: privateConfig,
    },
    {
      method: "GET",
      path: "/backoffice/finance/payroll",
      handler: "commerce.financePayroll",
      config: privateConfig,
    },
    {
      method: "POST",
      path: "/backoffice/finance/:action",
      handler: "commerce.financeWrite",
      config: privateConfig,
    },
    {
      method: "POST",
      path: "/backoffice/workbook/collect",
      handler: "commerce.collectWork",
      config: privateConfig,
    },
    {
      method: "POST",
      path: "/backoffice/import-workbook",
      handler: "commerce.importWorkbook",
      config: privateConfig,
    },
    {
      method: "GET",
      path: "/backoffice/workbook",
      handler: "commerce.workbook",
      config: privateConfig,
    },
    {
      method: "POST",
      path: "/backoffice/workbook/work",
      handler: "commerce.saveWork",
      config: privateConfig,
    },
    {
      method: "PATCH",
      path: "/backoffice/workbook/price",
      handler: "commerce.workbookPrice",
      config: privateConfig,
    },
    {
      method: "GET",
      path: "/backoffice/appointments/:id/checkout",
      handler: "commerce.checkoutSummary",
      config: privateConfig,
    },
    {
      method: "POST",
      path: "/backoffice/checkout",
      handler: "commerce.checkout",
      config: privateConfig,
    },
    {
      method: "GET",
      path: "/public/:slug/catalog",
      handler: "commerce.catalog",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/public/:slug/availability",
      handler: "commerce.availability",
      config: {
        auth: false,
        middlewares: [
          { name: "global::booking-rate-limit", config: { max: 90 } },
        ],
      },
    },
    {
      method: "POST",
      path: "/public/:slug/bookings",
      handler: "commerce.booking",
      config: { auth: false, middlewares: ["global::booking-rate-limit"] },
    },
    {
      method: "GET",
      path: "/backoffice/session",
      handler: "commerce.session",
      config: privateConfig,
    },
    {
      method: "POST",
      path: "/backoffice/query",
      handler: "commerce.query",
      config: privateConfig,
    },
    {
      method: "POST",
      path: "/backoffice/batch",
      handler: "commerce.batch",
      config: privateConfig,
    },
  ],
};
