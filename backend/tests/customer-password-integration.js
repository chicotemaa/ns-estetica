"use strict";
// Disposable real PostgreSQL database. Never reads DATABASE_URL or production credentials.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { mkdtempSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

async function main() {
  const watchdog = setTimeout(() => {
    console.error("Integration check exceeded five minutes.");
    process.exit(1);
  }, 600000);
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  mkdirSync(".tmp", { recursive: true });
  const directory = mkdtempSync(resolve(".tmp/integration-"));
  const password = randomBytes(24).toString("hex");
  const pg = new EmbeddedPostgres({
    databaseDir: `${directory}/data`,
    user: "postgres",
    password,
    port: 55441,
    persistent: true,
    authMethod: "scram-sha-256",
    initdbFlags: ["--encoding=UTF8", "--no-sync"],
    postgresFlags: [
      "-h",
      "127.0.0.1",
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
    ],
    onLog: () => {},
    onError: (error) => console.error(error),
  });
  const pgCtl = resolve(
    "node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe",
  );
  const run = (file, args) =>
    new Promise((resolve, reject) => {
      const child = spawn(file, args, { windowsHide: true, stdio: "ignore" });
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`PostgreSQL control exited with code ${code}.`)),
      );
    });
  let databaseStarted = false;
  process.on("exit", () => {
    if (databaseStarted && process.platform === "win32")
      spawnSync(
        pgCtl,
        ["-D", `${directory}/data`, "-w", "-m", "fast", "stop"],
        { windowsHide: true, stdio: "ignore", timeout: 15000 },
      );
  });
  let app;
  let panel;
  try {
    console.log("Initializing disposable PostgreSQL database…");
    await pg.initialise();
    console.log("Starting PostgreSQL…");
    // pg_ctl uses PostgreSQL's restricted Windows token when this shell is Administrator.
    if (process.platform === "win32")
      await run(
        pgCtl,
        [
          "-D",
          `${directory}/data`,
          "-l",
          `${directory}/postgres.log`,
          "-w",
          "-t",
          "30",
          "-o",
          "-p 55441 -h 127.0.0.1 -c fsync=off -c synchronous_commit=off",
          "start",
        ],
        { windowsHide: true },
      );
    else await pg.start();
    databaseStarted = true;
    const connection = pg.getPgClient("postgres", "127.0.0.1");
    await connection.connect();
    try {
      await connection.query("CREATE DATABASE barber_test");
    } finally {
      await connection.end();
    }
    console.log("Starting Strapi…");
    Object.assign(process.env, {
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: "1341",
      PUBLIC_URL: "http://127.0.0.1:1341",
      CORS_ORIGINS:
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3009",
      ESTETICA_DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:55441/barber_test`,
      DATABASE_SSL: "false",
      APP_KEYS: randomBytes(32).toString("hex"),
      ADMIN_JWT_SECRET: randomBytes(32).toString("hex"),
      JWT_SECRET: randomBytes(32).toString("hex"),
      API_TOKEN_SALT: randomBytes(32).toString("hex"),
      TRANSFER_TOKEN_SALT: randomBytes(32).toString("hex"),
      ENCRYPTION_KEY: randomBytes(32).toString("hex"),
      SEED_BUSINESS: "true",
      BUSINESS_SLUG: "password-fixture",
      CUSTOMER_PROXY_SECRET: "fixture-proxy-secret-".repeat(3),
      CUSTOMER_AUTH_SECRET: "fixture-auth-secret-".repeat(3),
      CUSTOMER_SITE_URL: "http://127.0.0.1:5173",
      STRAPI_TELEMETRY_DISABLED: "true",
      NOTIFICATION_EMAIL_ENABLED: "false",
      CLOUDFLARE_EMAIL_API_TOKEN: "",
      INITIAL_ACCOUNT_EMAIL: "initial@example.test",
      INITIAL_ADMIN_PASSWORD: password,
      INITIAL_MANAGER_PASSWORD: password,
    });
    const { createStrapi } = require("@strapi/strapi");
    app = createStrapi({
      appDir: process.cwd(),
      distDir: process.cwd(),
      serveAdminPanel: false,
    });
    await app.load();
    await app.listen();
    assert.equal(
      await app.admin.services.user.exists({ email: "initial@example.test" }),
      true,
    );
    const initialUsers = await app.db
      .query("plugin::users-permissions.user")
      .count();
    await require("../src/domain/initial-access")(app);
    assert.equal(
      await app.db.query("plugin::users-permissions.user").count(),
      initialUsers,
    );
    const base = "http://127.0.0.1:1341/api";
    const call = async (path, { token, ...options } = {}) => {
      const response = await fetch(base + path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const body = await response.json();
      return { status: response.status, body };
    };

    const manager = await call("/auth/local", {
      method: "POST",
      body: JSON.stringify({ identifier: "initial@example.test", password }),
    });
    assert.equal(manager.status, 200);
    const managerToken = manager.body.jwt;
    const headers = {
      "x-customer-proxy-key": process.env.CUSTOMER_PROXY_SECRET,
    };
    const post = (path, data, token) =>
      call(path, {
        method: "POST",
        headers,
        token,
        body: JSON.stringify(data),
      });
    const input = {
      email: " CLIENT@example.test ",
      name: "Cliente de prueba",
      phone: "3621234567",
      password: "Una frase privada 2026!",
    };
    assert.equal(
      (
        await call("/customer/register", {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).status,
      403,
    );
    const config = await call("/customer/config", { headers });
    assert.equal(config.body.passwordEnabled, true);
    assert.equal(config.body.emailEnabled, false);
    const registered = await post("/customer/register", input);
    assert.equal(registered.status, 200, JSON.stringify(registered.body));
    assert.equal(registered.body.account.email, "client@example.test");
    assert.equal(registered.body.account.password_hash, undefined);
    const oldToken = registered.body.sessionToken;
    const authDomain = require("../src/domain/customer-auth");
    const saved = await app.db
      .query(authDomain.ACCOUNT)
      .findOne({ where: { email: "client@example.test" } });
    assert.ok(saved.password_hash.startsWith("scrypt:"));
    assert.ok(!saved.password_hash.includes(input.password));
    assert.equal((await post("/customer/register", input)).status, 400);
    assert.equal(
      (
        await post("/customer/login", {
          ...input,
          password: "incorrect password",
        })
      ).status,
      400,
    );
    assert.equal((await post("/customer/login", input)).status, 200);
    assert.equal(
      (await call("/customer/me", { headers, token: oldToken })).body.account
        .name,
      input.name,
    );
    assert.equal((await call("/backoffice/customer-accounts")).status, 403);
    const listed = await call("/backoffice/customer-accounts", {
      token: managerToken,
    });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.accounts.length, 1);
    assert.equal(listed.body.accounts[0].password_hash, undefined);
    const makeRecovery = (identityConfirmed) =>
      call("/backoffice/customer-recovery", {
        method: "POST",
        token: managerToken,
        body: JSON.stringify({ accountId: saved.id, identityConfirmed }),
      });
    assert.equal((await makeRecovery(false)).status, 400);
    const otherBusiness = await app
      .documents("api::business.business")
      .create({
        data: {
          name: "Other",
          slug: "other-fixture",
          time_zone: "America/Argentina/Buenos_Aires",
        },
      });
    const foreign = await app.db
      .query(authDomain.ACCOUNT)
      .create({
        data: {
          business_id: otherBusiness.id,
          email: "other@example.test",
          email_key: otherBusiness.id + ":other@example.test",
        },
      });
    assert.equal(
      (
        await call("/backoffice/customer-recovery", {
          method: "POST",
          token: managerToken,
          body: JSON.stringify({
            accountId: foreign.id,
            identityConfirmed: true,
          }),
        })
      ).status,
      404,
    );
    const recovery = await makeRecovery(true);
    assert.equal(recovery.status, 200, JSON.stringify(recovery.body));
    const recoveryToken = new URLSearchParams(
      new URL(recovery.body.url).hash.slice(1),
    ).get("recuperar");
    assert.ok(recoveryToken);
    const newPassword = "Mi nueva frase segura!";
    const reset = await post("/customer/reset", {
      token: recoveryToken,
      password: newPassword,
    });
    assert.equal(reset.status, 200, JSON.stringify(reset.body));
    assert.equal(
      (await call("/customer/me", { headers, token: oldToken })).status,
      401,
    );
    assert.equal(
      (
        await post("/customer/reset", {
          token: recoveryToken,
          password: newPassword,
        })
      ).status,
      400,
    );
    assert.equal((await post("/customer/login", input)).status, 400);
    assert.equal(
      (await post("/customer/login", { ...input, password: newPassword }))
        .status,
      200,
    );
    const expired = await makeRecovery(true);
    await app.db
      .query(authDomain.ACCOUNT)
      .update({
        where: { id: saved.id },
        data: { recovery_expires_at: new Date(Date.now() - 1).toISOString() },
      });
    assert.equal(
      (
        await post("/customer/reset", {
          token: new URLSearchParams(
            new URL(expired.body.url).hash.slice(1),
          ).get("recuperar"),
          password: newPassword,
        })
      ).status,
      400,
    );
    for (let i = 0; i < 10; i++)
      await post("/customer/login", {
        email: "unknown@example.test",
        password: "wrong password",
      });
    const limited = await post("/customer/login", {
      email: "unknown@example.test",
      password: "wrong password",
    });
    assert.equal(limited.status, 400);
    assert.match(limited.body.error.message, /Demasiados intentos/);
    console.log(
      "PASS: real PostgreSQL registration, password hashing, login, proxy and manager guards, tenant isolation, recovery expiry and one-use, session revocation and persistent rate limits.",
    );
  } finally {
    if (panel) panel.kill();
    if (app) await app.destroy();
    if (databaseStarted) {
      if (process.platform === "win32")
        await run(
          pgCtl,
          ["-D", `${directory}/data`, "-w", "-m", "fast", "stop"],
          { windowsHide: true },
        );
      else await pg.stop();
      databaseStarted = false;
    }
    clearTimeout(watchdog);
    console.log(
      "Temporary integration database stopped (data kept under backend/.tmp for inspection).",
    );
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
