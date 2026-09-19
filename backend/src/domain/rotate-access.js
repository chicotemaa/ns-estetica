"use strict";
const { errors } = require("@strapi/utils");
async function inspectAccess(strapi) {
  const [managers, admins] = await Promise.all([
    strapi.db
      .query("plugin::users-permissions.user")
      .findMany({
        where: { role: { type: "business-manager" } },
        select: ["id", "email", "blocked"],
      }),
    strapi.db
      .query("admin::user")
      .findMany({ select: ["id", "email", "isActive"] }),
  ]);
  return { managers, admins };
}
async function rotateAccess(strapi, input) {
  const { oldEmail, email, panelPassword, adminPassword } = input || {};
  const validEmail = (value) =>
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
    value.length <= 254;
  if (
    !validEmail(oldEmail) ||
    !validEmail(email) ||
    oldEmail === email ||
    [panelPassword, adminPassword].some(
      (p) =>
        typeof p !== "string" || p.length < 20 || Buffer.byteLength(p) > 72,
    ) ||
    panelPassword === adminPassword
  )
    throw new errors.ValidationError(
      "Se requieren dos emails distintos y contraseñas distintas de 20 a 72 bytes.",
    );
  return strapi.db.transaction(async ({ trx }) => {
    await trx.raw("SELECT pg_advisory_xact_lock(73422, 0)");
    const users = strapi.db.query("plugin::users-permissions.user"),
      admins = strapi.db.query("admin::user");
    const [
      oldManager,
      oldAdmin,
      managerRole,
      adminRole,
      existingManager,
      existingAdmin,
    ] = await Promise.all([
      users.findOne({
        where: { email: oldEmail, role: { type: "business-manager" } },
      }),
      admins.findOne({ where: { email: oldEmail }, populate: ["roles"] }),
      strapi.db
        .query("plugin::users-permissions.role")
        .findOne({ where: { type: "business-manager" } }),
      strapi.db
        .query("admin::role")
        .findOne({ where: { code: "strapi-super-admin" } }),
      users.findOne({ where: { email } }),
      admins.findOne({ where: { email } }),
    ]);
    if (
      !oldManager ||
      !oldAdmin ||
      !managerRole ||
      !adminRole ||
      !oldAdmin.roles?.some((r) => r.code === "strapi-super-admin")
    )
      throw new errors.ValidationError(
        "No se encontraron las dos cuentas anteriores con los permisos esperados.",
      );
    if (existingManager || existingAdmin)
      throw new errors.ValidationError(
        "El nuevo email ya tiene una cuenta. Revisá el acceso existente antes de repetir la operación.",
      );
    const manager = await strapi
      .plugin("users-permissions")
      .service("user")
      .add({
        username: email,
        email,
        password: panelPassword,
        provider: "local",
        confirmed: true,
        blocked: false,
        role: managerRole.id,
      });
    const admin = await strapi.admin.services.user.create({
      email,
      password: adminPassword,
      firstname: "Natalia",
      lastname: "Aylen",
      isActive: true,
      registrationToken: null,
      roles: [adminRole.id],
    });
    // New accounts are created before disabling the exact old accounts. Old
    // panel JWTs immediately fail the manager policy even if not yet expired.
    await strapi
      .plugin("users-permissions")
      .service("user")
      .edit(oldManager.id, { blocked: true });
    await strapi.admin.services.user.updateById(oldAdmin.id, {
      isActive: false,
    });
    return {
      email,
      managerId: manager.id,
      adminId: admin.id,
      previousAccountsDisabled: true,
    };
  });
}
module.exports = { inspectAccess, rotateAccess };
