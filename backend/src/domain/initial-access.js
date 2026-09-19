"use strict";

// Optional one-time provisioning before the HTTP server accepts requests.
// Existing accounts and passwords are never changed by a restart.
module.exports = async function initialAccess(strapi) {
  const email = process.env.INITIAL_ACCOUNT_EMAIL?.trim().toLowerCase();
  if (!email) return;
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const managerPassword = process.env.INITIAL_MANAGER_PASSWORD;
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !adminPassword ||
    adminPassword.length < 20 ||
    !managerPassword ||
    managerPassword.length < 20
  ) {
    throw new Error(
      "Initial access requires a valid email and two passwords of at least 20 characters.",
    );
  }
  await strapi.db.transaction(async ({ trx }) => {
    await trx.raw("SELECT pg_advisory_xact_lock(73421, -1)");
    if (!(await strapi.admin.services.user.exists())) {
      await strapi.admin.services.user.createFirstAdmin({
        email,
        password: adminPassword,
        firstname: "Administrador",
        lastname: "Prueba",
      });
    }
    const users = strapi.db.query("plugin::users-permissions.user");
    // Provision only a completely empty customer-access table.
    if ((await users.count()) === 0) {
      const role = await strapi.db
        .query("plugin::users-permissions.role")
        .findOne({ where: { type: "business-manager" } });
      await strapi.plugin("users-permissions").service("user").add({
        username: email,
        email,
        password: managerPassword,
        provider: "local",
        confirmed: true,
        blocked: false,
        role: role.id,
      });
    }
  });
};
