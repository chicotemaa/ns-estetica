"use strict";
// Disposable real PostgreSQL database. Never reads DATABASE_URL or production credentials.
const assert = require("node:assert/strict");
const { randomBytes, randomUUID } = require("node:crypto");
const { mkdtempSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

function serializedArray(html, property) {
  const flight = [...html.matchAll(/self\.__next_f\.push\((\[1,"(?:[^"\\]|\\.)*"\])\)/g)]
    .map(match => JSON.parse(match[1])[1]).join('');
  const marker = `"${property}":[`, index = flight.indexOf(marker);
  assert.ok(index >= 0, `${property} props missing`);
  const data = flight.slice(index + marker.length - 1);
  let depth = 0, quoted = false, escape = false;
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (quoted) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') quoted = false;
    } else {
      if (c === '"') quoted = true;
      else if (c === '[') depth++;
      else if (c === ']' && --depth === 0) return JSON.parse(data.slice(0, i + 1));
    }
  }
  throw new Error(`Incomplete ${property} props`);
}

async function main() {
  const watchdog = setTimeout(() => {
    console.error("Integration check exceeded five minutes.");
    process.exit(1);
  }, 600000);
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  mkdirSync(".tmp", { recursive: true });
  const directory = mkdtempSync(resolve(".tmp/integration-"));
  const password = process.argv.includes('--preview') ? 'Checkout-local-only-2026!' : randomBytes(24).toString("hex");
  const pg = new EmbeddedPostgres({
    databaseDir: `${directory}/data`,
    user: "postgres",
    password,
    port: 55439,
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
          "-p 55439 -h 127.0.0.1 -c fsync=off -c synchronous_commit=off",
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
      PORT: "1339",
      PUBLIC_URL: "http://127.0.0.1:1339",
      CORS_ORIGINS: "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:3009",
      DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:55439/barber_test`,
      DATABASE_SSL: "false",
      APP_KEYS: randomBytes(32).toString("hex"),
      ADMIN_JWT_SECRET: randomBytes(32).toString("hex"),
      JWT_SECRET: randomBytes(32).toString("hex"),
      API_TOKEN_SALT: randomBytes(32).toString("hex"),
      TRANSFER_TOKEN_SALT: randomBytes(32).toString("hex"),
      ENCRYPTION_KEY: randomBytes(32).toString("hex"),
      SEED_BUSINESS: "true",
      BUSINESS_SLUG: "nerea-aylen-barber",
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
    const base = "http://127.0.0.1:1339/api";
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
    const query = (token, body) =>
      call("/backoffice/query", {
        token,
        method: "POST",
        body: JSON.stringify(body),
      });
    const anonymous = await query(null, { resource: "appointments" });
    assert.equal(anonymous.status, 403, JSON.stringify(anonymous.body));
    const { body: catalog, status: catalogStatus } = await call(
      "/public/nerea-aylen-barber/catalog",
    );
    assert.equal(catalogStatus, 200, JSON.stringify(catalog));
    assert.equal(catalog.services.length, 4);
    assert.equal(catalog.staffMembers[0].email, undefined);
    const role = await app.db
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: "business-manager" } });
    const user = await app.plugin("users-permissions").service("user").add({
      username: "integration-manager",
      email: "manager@example.test",
      password,
      provider: "local",
      confirmed: true,
      blocked: false,
      role: role.id,
    });
    const auth = await call("/auth/local", {
      method: "POST",
      body: JSON.stringify({ identifier: user.email, password }),
    });
    assert.equal(auth.status, 200, JSON.stringify(auth.body));
    const token = auth.body.jwt;
    await require('./website-integration')(call,token);
    assert.equal((await call("/backoffice/session", { token })).status, 200);
    assert.equal(
      (
        await call("/auth/local/register", {
          method: "POST",
          body: JSON.stringify({
            username: "outsider",
            email: "outsider@example.test",
            password,
          }),
        })
      ).status,
      400,
    );
    assert.equal(
      await app.db
        .query("plugin::users-permissions.user")
        .count({ where: { email: "outsider@example.test" } }),
      0,
    );
    const { body: businessRows } = await query(token, {
      resource: "businesses",
    });
    const businessId = businessRows.data[0].id;
    let date = new Date();
    date.setUTCDate(date.getUTCDate() + 2);
    while ([0, 1].includes(date.getUTCDay()))
      date.setUTCDate(date.getUTCDate() + 1);
    const dateKey = date.toISOString().slice(0, 10);
    const serviceId = catalog.services[0].id;
    const staffMemberId = catalog.staffMembers[0].id;
    const availabilityPath = `/public/nerea-aylen-barber/availability?date=${dateKey}&serviceId=${serviceId}&staffMemberId=${staffMemberId}`;
    const slots = await call(availabilityPath);
    assert.equal(slots.status, 200, JSON.stringify(slots.body));
    assert.ok(slots.body.times.length);
    const input = {
      clientName: "Cliente de prueba",
      contactInfo: "555000111",
      serviceId,
      staffMemberId,
      appointmentDate: dateKey,
      appointmentTime: slots.body.times[0],
    };
    const key = randomUUID();
    const book = (requestKey, data = input) =>
      call("/public/nerea-aylen-barber/bookings", {
        method: "POST",
        headers: { "Idempotency-Key": requestKey },
        body: JSON.stringify(data),
      });
    const attempts = await Promise.all([book(key), book(key)]);
    assert.equal(attempts[0].status, 200, JSON.stringify(attempts));
    assert.equal(
      attempts[1].body.createdId,
      attempts[0].body.createdId,
      JSON.stringify(attempts),
    );
    assert.equal((await book(randomUUID())).status, 400);
    assert.equal((await book(key, { ...input, notes: "changed" })).status, 400);
    assert.equal(
      (await book(randomUUID(), { ...input, price_snapshot: 1 })).status,
      400,
    );
    const rows = await query(token, { resource: "appointments" });
    assert.equal(rows.body.data.length, 1, JSON.stringify(rows.body));
    const appointment = rows.body.data[0];
    assert.equal(Number(appointment.price_snapshot), catalog.services[0].price);
    assert.equal(appointment.request_key, undefined);
    assert.equal(
      (await call(availabilityPath)).body.times.includes(input.appointmentTime),
      false,
    );
    const customer = await query(token, {
      resource: "customers",
      operation: "insert",
      data: {
        business_id: businessId,
        full_name: "Cliente interno",
        primary_contact: "555000222",
        phone: "555000222",
        status: "active",
      },
    });
    assert.equal(customer.status, 200, JSON.stringify(customer.body));
    const patch = await query(token, {
      resource: "appointments",
      operation: "update",
      filters: [{ field: "id", operator: "eq", value: appointment.id }],
      data: { status: "cancelled" },
    });
    assert.equal(patch.status, 200, JSON.stringify(patch.body));
    assert.equal(
      (await call(availabilityPath)).body.times.includes(input.appointmentTime),
      true,
    );
    const privateBooking = await query(token, {
      resource: "appointments",
      operation: "insert",
      data: {
        business_id: businessId,
        service_id: serviceId,
        staff_member_id: staffMemberId,
        customer_id: customer.body.data[0].id,
        customer_name: "Cliente interno",
        customer_contact: "555000222",
        appointment_date: dateKey,
        appointment_time: input.appointmentTime + ":00.000",
        status: "confirmed",
        channel: "manual",
        service_name_snapshot: catalog.services[0].name,
        duration_snapshot: catalog.services[0].durationMinutes,
        price_snapshot: catalog.services[0].price,
      },
    });
    assert.equal(
      privateBooking.status,
      200,
      JSON.stringify(privateBooking.body),
    );
    assert.equal(
      (await call(availabilityPath)).body.times.includes(input.appointmentTime),
      false,
    );
    const service = await query(token, {
      resource: "services",
      operation: "update",
      filters: [{ field: "id", operator: "eq", value: serviceId }],
      data: { price: 17000 },
    });
    assert.equal(service.status, 200, JSON.stringify(service.body));
    assert.equal(
      (await call("/public/nerea-aylen-barber/catalog")).body.services.find(
        (item) => item.id === serviceId,
      ).price,
      17000,
    );
    const { resources } = require("../src/domain/repository");
    const other = await app
      .documents(resources.businesses.uid)
      .create({ data: { name: "Other business", slug: "other-business" } });
    const foreignService = await app.documents(resources.services.uid).create({
      data: {
        business: other.id,
        name: "Other service",
        price: 100,
        duration_minutes: 30,
      },
    });
    assert.equal(
      (
        await query(token, {
          resource: "services",
          filters: [{ field: "id", operator: "eq", value: foreignService.id }],
        })
      ).body.data.length,
      0,
    );
    assert.equal(
      (
        await query(token, {
          resource: "staff_member_services",
          operation: "insert",
          data: {
            staff_member_id: staffMemberId,
            service_id: foreignService.id,
          },
        })
      ).status,
      400,
    );
    const rollback = await call("/backoffice/batch", {
      token,
      method: "POST",
      body: JSON.stringify({
        operations: [
          {
            resource: "services",
            operation: "update",
            filters: [{ field: "id", operator: "eq", value: serviceId }],
            data: { price: 99999 },
          },
          {
            resource: "customers",
            operation: "insert",
            data: { business_id: businessId },
          },
        ],
      }),
    });
    assert.equal(rollback.status, 400, JSON.stringify(rollback.body));
    assert.equal(
      (await call("/public/nerea-aylen-barber/catalog")).body.services.find(
        (item) => item.id === serviceId,
      ).price,
      17000,
      "Failed batch must roll back every write",
    );
    const raceInput = { ...input, appointmentTime: slots.body.times.at(-1) };
    const race = await Promise.all([
      book(randomUUID(), raceInput),
      book(randomUUID(), raceInput),
    ]);
    assert.deepEqual(race.map((item) => item.status).sort(), [200, 400]);
    // Financial writes use the same business lock as the agenda. A lost response
    // or two open tabs must never create a second collection for the same balance.
    const checkoutAppointment = privateBooking.body.data[0];
    const checkoutTotal = Math.round(
      Number(checkoutAppointment.price_snapshot) * 100,
    );
    await query(token, {
      resource: "staff_members",
      operation: "update",
      filters: [{ field: "id", operator: "eq", value: staffMemberId }],
      data: { collection_commission_rate: 50 },
    });
    const checkoutCall = (requestKey, data, auth = token) =>
      call("/backoffice/checkout", {
        token: auth,
        method: "POST",
        headers: { "Idempotency-Key": requestKey },
        body: JSON.stringify(data),
      });
    const firstPayment = {
      appointmentId: checkoutAppointment.id,
      amount: 100,
      method: "cash",
      expectedBalanceCents: checkoutTotal,
    };
    assert.equal(
      (await checkoutCall(randomUUID(), firstPayment, null)).status,
      403,
    );
    assert.equal(
      (
        await checkoutCall(randomUUID(), {
          ...firstPayment,
          amount: checkoutTotal / 100 + 1,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await checkoutCall(randomUUID(), {
          ...firstPayment,
          appointmentId: appointment.id,
        })
      ).status,
      400,
      "Cancelled appointments cannot be collected",
    );
    const collectionKey = randomUUID();
    const collected = await Promise.all([
      checkoutCall(collectionKey, firstPayment),
      checkoutCall(collectionKey, firstPayment),
    ]);
    assert.equal(collected[0].status, 200, JSON.stringify(collected));
    assert.equal(collected[1].status, 200, JSON.stringify(collected));
    assert.equal(collected[0].body.paymentId, collected[1].body.paymentId);
    assert.equal(collected[0].body.balanceCents, checkoutTotal - 10000);
    assert.equal(collected[0].body.appointment.status, "completed");
    assert.equal(
      (await checkoutCall(collectionKey, { ...firstPayment, amount: 50 }))
        .status,
      400,
    );
    assert.equal(
      (await checkoutCall(randomUUID(), firstPayment)).status,
      400,
      "A stale balance from another tab is rejected",
    );
    const paymentsForTurn = () =>
      query(token, {
        resource: "payments",
        filters: [
          {
            field: "appointment_id",
            operator: "eq",
            value: checkoutAppointment.id,
          },
        ],
      });
    let financialRows = (await paymentsForTurn()).body.data;
    assert.equal(financialRows.length, 1);
    assert.equal(Number(financialRows[0].commission_amount), 50);
    assert.equal(Number(financialRows[0].commission_rate), 50);
    assert.equal(financialRows[0].checkout_key, undefined);
    assert.equal(financialRows[0].customer_id, checkoutAppointment.customer_id);
    assert.equal(
      (
        await query(token, {
          resource: "payments",
          operation: "update",
          filters: [
            { field: "id", operator: "eq", value: financialRows[0].id },
          ],
          data: { amount: 1 },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await query(token, {
          resource: "payments",
          operation: "upsert",
          data: { id: financialRows[0].id, amount: 1 },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await query(token, {
          resource: "appointments",
          operation: "update",
          filters: [
            { field: "id", operator: "eq", value: checkoutAppointment.id },
          ],
          data: { status: "cancelled" },
        })
      ).status,
      400,
    );
    await query(token, {
      resource: "staff_members",
      operation: "update",
      filters: [{ field: "id", operator: "eq", value: staffMemberId }],
      data: { collection_commission_rate: 25 },
    });
    const remaining = {
      ...firstPayment,
      amount: (checkoutTotal - 10000) / 100,
      expectedBalanceCents: checkoutTotal - 10000,
    };
    const finalRace = await Promise.all([
      checkoutCall(randomUUID(), remaining),
      checkoutCall(randomUUID(), remaining),
    ]);
    assert.deepEqual(finalRace.map((r) => r.status).sort(), [200, 400]);
    financialRows = (await paymentsForTurn()).body.data;
    assert.equal(financialRows.length, 2);
    assert.equal(
      financialRows.reduce(
        (sum, p) => sum + Math.round(Number(p.amount) * 100),
        0,
      ),
      checkoutTotal,
    );
    assert.equal(
      Number(
        financialRows.find((p) => p.id === collected[0].body.paymentId)
          .commission_rate,
      ),
      50,
      "Historical commission remains unchanged",
    );
    assert.equal(
      (
        await call(
          `/backoffice/appointments/${checkoutAppointment.id}/checkout`,
          { token },
        )
      ).body.balanceCents,
      0,
    );
    assert.equal(
      customer.body.data[0].rating,
      null,
      "New customers have no fabricated rating",
    );
    console.log(
      "PASS: atomic partial checkout, concurrent retries, stale balance, commission snapshots and protected financial records.",
    );
    await require('./workbook-integration')({ call, query, token, staffMemberId, serviceId, fullPlan: process.argv.includes('--workbook') });
    await require('./finance-integration')({ call, query, token, businessId, serviceId, app });
    const splitAppointmentId = await require('./checkout-integration')({ call, query, token, businessId, serviceId, app });
    await require('./public-catalog-integration')({call,query,token,serviceId,staffMemberId});
    await require('./notifications-integration')({ app, call, token, password });
    if (process.argv.includes("--panel")) {
      const panelDir = resolve("../../mi-comercio-app");
      const panelOrigin = "http://127.0.0.1:3009";
      panel = spawn(
        process.execPath,
        [
          resolve(panelDir, "node_modules/next/dist/bin/next"),
          "start",
          "--hostname",
          "127.0.0.1",
          "--port",
          "3009",
        ],
        {
          cwd: panelDir,
          windowsHide: true,
          stdio: "ignore",
          env: {
            ...process.env,
            NODE_ENV: "production",
            STRAPI_URL: "http://127.0.0.1:1339",
            PANEL_ORIGIN: panelOrigin,
            BUSINESS_SLUG: "nerea-aylen-barber",
          },
        },
      );
      panel.on("error", (error) => {
        console.error("Panel startup failed:", error.message);
      });
      let ready = false;
      for (let attempt = 0; attempt < 90; attempt++) {
        try {
          ready = (await fetch(`${panelOrigin}/auth`)).ok;
        } catch {
          /* wait for server */
        }
        if (ready) break;
        await new Promise((done) => setTimeout(done, 500));
      }
      assert.ok(ready, "Built Next.js panel must start");
      const anonymousPanel = await fetch(`${panelOrigin}/dashboard`, {
        redirect: "manual",
      });
      assert.equal(anonymousPanel.status, 307);
      const login = await fetch(`${panelOrigin}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: panelOrigin },
        body: JSON.stringify({ email: user.email, password }),
      });
      assert.equal(login.status, 200, await login.text());
      const cookieHeader = login.headers.get("set-cookie");
      assert.ok(/HttpOnly/i.test(cookieHeader) && /Secure/i.test(cookieHeader));
      const cookie = cookieHeader.split(";")[0];
      await require('./website-panel-integration')(panelOrigin,cookie);
      await require('./customer-settings-panel-integration')(panelOrigin,cookie,call,token);
      for (const path of [
        "/dashboard",
        "/dashboard/appointments",
        "/dashboard/clients",
        "/dashboard/services",
        "/dashboard/employees",
        "/dashboard/hours",
          "/dashboard/payments",
          "/dashboard/gastos",
          "/dashboard/liquidaciones",
        "/dashboard/reports",
        "/dashboard/atenciones",
        "/dashboard/services/prices",
        "/dashboard/settings",
        "/dashboard/website",
        "/dashboard/notifications",
      ]) {
        const page = await fetch(panelOrigin + path, {
          headers: { Cookie: cookie },
        });
        const html = await page.text();
        assert.equal(page.status, 200, path);
        assert.ok(
          !html.includes("NEXT_REDIRECT") &&
            !html.includes("No pudimos cargar los datos del negocio"),
          `${path} must render real data`,
        );
        if (['/dashboard', '/dashboard/atenciones', '/dashboard/services/prices', '/dashboard/payments', '/dashboard/reports', '/dashboard/notifications'].includes(path)) {
          assert.ok(!/BASE_DATOS!|filas de origen|filas del Excel|Planilla del negocio|filas importadas/.test(html), `${path} must present business data, without the file-import interface`);
        }
      }
      const oldWorkbook = await fetch(panelOrigin + '/dashboard/workbook?tab=prices', { headers: { Cookie: cookie }, redirect: 'manual' });
      const historyBefore = await query(token, {resource: 'work_records'});
      const paymentsBeforeHistory = await query(token, {resource: 'payments'});
      const appointmentsBeforeHistory = await query(token, {resource: 'appointments'});
      const cashPage = await fetch(panelOrigin + '/dashboard/payments', {headers: {Cookie: cookie}});
      assert.equal(cashPage.status, 200);
      const cashHtml = await cashPage.text();
      const cashPayments = serializedArray(cashHtml, 'payments');
      const cashById = new Map(cashPayments.map(payment => [payment.id, payment]));
      const sourcePayment = paymentsBeforeHistory.body.data.find(payment => payment.import_ref?.endsWith(':19992:payment'));
      assert.ok(sourcePayment && !sourcePayment.work_record_id && !sourcePayment.customer_id);
      assert.equal(cashById.get(sourcePayment.id).customerName, 'Cliente · Apellido compuesto');
      const workPayment = paymentsBeforeHistory.body.data.find(payment => payment.import_ref?.endsWith(':19990:payment'));
      assert.ok(workPayment.work_record_id && !workPayment.customer_id);
      assert.equal(cashById.get(workPayment.id).customerName, 'Prueba histórica');
      for (const payment of paymentsBeforeHistory.body.data) {
        const displayed = cashById.get(payment.id);
        assert.ok(displayed);
        assert.equal(displayed.amount, Number(payment.amount));
        assert.equal(displayed.description, payment.description);
        assert.equal(displayed.method, payment.method);
        assert.equal(displayed.customerId, payment.customer_id);
        if (payment.customer?.full_name)
          assert.equal(displayed.customerName, payment.customer.full_name.trim());
      }
      assert.ok(!cashHtml.includes('source_data') && !cashHtml.includes('planilla-barberia:'));
      console.log('PASS cash resolves customer names from linked work and exact legacy source rows, preserving collections and customer IDs.');
      const historyEntry = historyBefore.body.data.find(work => work.customer_name === 'Prueba histórica');
      assert.ok(historyEntry);
      const agendaHistory = await fetch(panelOrigin + '/dashboard/appointments?work=' + historyEntry.id, {headers: {Cookie: cookie}});
      const agendaHistoryHtml = await agendaHistory.text();
      assert.equal(agendaHistory.status, 200);
      assert.ok(agendaHistoryHtml.includes(`data-history-id="${historyEntry.id}"`));
      assert.ok(agendaHistoryHtml.includes('Hora estimada'));
      assert.ok(agendaHistoryHtml.includes('Ver detalle de Prueba histórica'));
      assert.ok(!agendaHistoryHtml.includes('BASE_DATOS!'));
      assert.deepEqual((await query(token, {resource: 'work_records'})).body.data, historyBefore.body.data);
      assert.deepEqual((await query(token, {resource: 'payments'})).body.data, paymentsBeforeHistory.body.data);
      assert.deepEqual((await query(token, {resource: 'appointments'})).body.data, appointmentsBeforeHistory.body.data);
      console.log('PASS database history renders in agenda with estimated time and no financial or booking mutations.');
      for (const path of ['/dashboard/checkout', '/dashboard/checkout?appointment=' + splitAppointmentId]) {
        const page = await fetch(panelOrigin + path, {headers:{Cookie:cookie}});
        const html = await page.text();
        assert.equal(page.status,200);
        assert.ok(html.includes('Checkout') || html.includes('Todo a mano'));
        assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK'));
      }
      assert.equal(oldWorkbook.status, 307); assert.ok(oldWorkbook.headers.get('location').startsWith('/dashboard/services/prices'));
      const noticeSummary = await fetch(panelOrigin + '/api/notifications', { headers: { Cookie: cookie } });
      assert.equal(noticeSummary.status, 200);
      const noticeData = await noticeSummary.json();
      assert.ok(Number.isInteger(noticeData.attentionCount)); assert.equal(noticeData.alerts, undefined);
      const selectedPage = await fetch(panelOrigin + '/dashboard/appointments?appointment=' + checkoutAppointment.id, { headers: { Cookie: cookie } });
      assert.equal(selectedPage.status, 200); assert.ok((await selectedPage.text()).includes('initialAppointmentId'));
      const checkoutProxy = await fetch(panelOrigin + "/api/checkout", { method: "POST", headers: { Cookie: cookie, Origin: panelOrigin, "Content-Type": "application/json", "Idempotency-Key": collectionKey }, body: JSON.stringify(firstPayment) });
      const csv = await fetch(panelOrigin + '/api/workbook?format=csv&month=&tab=works', { headers: { Cookie: cookie } });
      assert.equal(csv.status, 200); assert.ok(csv.headers.get('content-type').includes('text/csv'));
      assert.ok((await csv.text()).includes('Importe original'));
      assert.equal(checkoutProxy.status, 200, await checkoutProxy.text());
      const customerHistory = await fetch(panelOrigin + "/api/customers/" + checkoutAppointment.customer_id + "/history", { headers: { Cookie: cookie } });
      assert.equal(customerHistory.status, 200);
      assert.equal((await customerHistory.json()).payments.length, 2);
      const settings = await fetch(panelOrigin + "/api/cash-settings", { method: "PATCH", headers: { Cookie: cookie, Origin: panelOrigin, "Content-Type": "application/json" }, body: JSON.stringify({ target: 1500000, rates: [{ id: staffMemberId, rate: 50 }] }) });
      assert.equal(settings.status, 200, await settings.text());
      const configuredBusiness = (await query(token, { resource: "businesses" })).body.data[0];
      assert.equal(Number(configuredBusiness.monthly_collection_target), 1500000);
      const forbidden = await fetch(`${panelOrigin}/api/business`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: "https://untrusted.example",
        },
        body: "{}",
      });
      assert.equal(forbidden.status, 403);
      const changed = await fetch(`${panelOrigin}/api/business`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
          Origin: panelOrigin,
        },
        body: JSON.stringify({
          name: "Nerea Aylen Barber",
          description: "Integration verified",
          address: "25 de Mayo 485",
          phone: "",
          email: "",
          website: "",
          cuit: "",
          instagram_handle: "https://www.instagram.com/footer_fixture/?igsh=test",
          whatsapp_phone: "+54 9 11 5555-1234",
        }),
      });
      assert.equal(changed.status, 200, await changed.text());
      const publicContact = (await call('/public/nerea-aylen-barber/catalog')).body.brand;
      assert.equal(publicContact.instagramHandle, 'footer_fixture');
      assert.equal(publicContact.whatsappPhone, '5491155551234');
      assert.equal(publicContact.cuit, undefined);
      const logout = await fetch(`${panelOrigin}/api/auth/logout`, {
        method: "POST",
        headers: { Cookie: cookie, Origin: panelOrigin },
      });
      assert.equal(logout.status, 200);
      assert.ok(logout.headers.get("set-cookie").includes("Max-Age=0"));
      console.log(
        "PASS: Next.js panel login, protected pages, live data adapters, CSRF, business settings and logout.",
      );
    }
    await require('./customer-booking-integration')(app,call,token);
    console.log(
      "PASS: PostgreSQL + Strapi: login, roles, public catalog, availability, concurrent booking, idempotency, panel CRUD and cancellation.",
    );
    if (process.argv.includes('--preview')) {
      if (process.argv.includes('--current-sheet')) await require('./current-sheet-integration')(app,businessId);
      const {locked} = require('../src/domain/booking');
      const demo = await locked(app,Number(businessId),()=>app.documents('api::appointment.appointment').create({data:{business:Number(businessId),service:Number(serviceId),staff_member:Number(staffMemberId),customer_name:'Cliente demo checkout',customer_contact:'@cliente.demo',appointment_date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date()),appointment_time:'10:00:00.000',status:'confirmed',channel:'manual',price_snapshot:26000,service_name_snapshot:'Corte de prueba',staff_name_snapshot:'Nerea',duration_minutes_snapshot:40}}));
      console.log('LOCAL PREVIEW: http://127.0.0.1:3009/dashboard/checkout?appointment='+demo.id);
      clearTimeout(watchdog);
      const previewMinutes = Math.min(60, Math.max(1, Number(process.env.PREVIEW_MINUTES) || 5));
      await new Promise(resolve=>setTimeout(resolve,previewMinutes * 60000));
    }
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
