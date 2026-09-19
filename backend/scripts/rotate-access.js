"use strict";
// Operator-only command; never exposed as an HTTP route. Secrets arrive over
// stdin so they do not appear in process arguments, source control or logs.
const fs = require("node:fs");
const { createStrapi } = require("@strapi/strapi");
const { inspectAccess, rotateAccess } = require("../src/domain/rotate-access");
(async () => {
  process.env.NOTIFICATION_EMAIL_ENABLED = "false";
  process.env.SEED_BUSINESS = "false";
  delete process.env.INITIAL_ACCOUNT_EMAIL;
  const input = process.argv.includes("--apply")
    ? JSON.parse(fs.readFileSync(0, "utf8"))
    : null;
  const app = await createStrapi({
    appDir: process.cwd(),
    distDir: process.cwd(),
  }).load();
  try {
    console.log(
      JSON.stringify(
        input ? await rotateAccess(app, input) : await inspectAccess(app),
      ),
    );
  } finally {
    // Admin creation starts background metrics queries. Let the pool drain
    // before closing it so a committed rotation doesn't exit with "aborted".
    const pool = app.db.connection.client.pool;
    const deadline = Date.now() + 5000;
    let idleChecks = 0;
    while (Date.now() < deadline && idleChecks < 4) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      idleChecks =
        pool.numUsed() || pool.numPendingAcquires() ? 0 : idleChecks + 1;
    }
    await app.destroy();
  }
})().catch(() => {
  console.error(
    "No se completó la actualización de accesos. Inspeccioná las cuentas antes de reintentar.",
  );
  process.exitCode = 1;
});
