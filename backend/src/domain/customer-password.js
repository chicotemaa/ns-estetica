"use strict";
const { scrypt, randomBytes, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");
const { errors } = require("@strapi/utils");
const { locked } = require("./booking");
const auth = require("./customer-auth");
const { resolveConfiguration } = require("./customer-config");
const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
function password(value) {
  if (typeof value !== "string" || value.length < 10 || value.length > 128)
    throw new errors.ValidationError(
      "La contraseña debe tener entre 10 y 128 caracteres.",
    );
  return value;
}
async function hash(value) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password(value), salt, 64, options);
  return `scrypt:${salt}:${key.toString("hex")}`;
}
async function matches(value, encoded) {
  const valid =
    typeof encoded === "string" &&
    /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(encoded);
  const [, salt, expected] = valid
    ? encoded.split(":")
    : ["", "0".repeat(32), "0".repeat(128)];
  const key = await derive(value, salt, 64, options);
  return timingSafeEqual(key, Buffer.from(expected, "hex")) && valid;
}
async function ready(strapi, businessId) {
  const c = await resolveConfiguration(strapi, businessId);
  if (!c.authReady)
    throw new errors.ApplicationError("El acceso todavía no está disponible.");
  return c;
}
async function limit(strapi, businessId, email) {
  const db = strapi.db.query(auth.CHALLENGE);
  // Persistent attempt counters also cover nonexistent accounts and multiple server instances.
  const where = {
    business_id: businessId,
    kind: "password-attempt",
    createdAt: { $gt: new Date(Date.now() - 900000).toISOString() },
  };
  await locked(strapi, businessId, async () => {
    if (
      (await db.count({ where: { ...where, email } })) >= 10 ||
      (await db.count({ where })) >= 200
    )
      throw new errors.ApplicationError(
        "Demasiados intentos. Esperá 15 minutos y volvé a intentar.",
      );
    await db.create({
      data: {
        business_id: businessId,
        kind: "password-attempt",
        email,
        expires_at: new Date(Date.now() + 900000).toISOString(),
      },
    });
    await db.deleteMany({
      where: {
        business_id: businessId,
        kind: "password-attempt",
        createdAt: { $lt: new Date(Date.now() - 86400000).toISOString() },
      },
    });
  });
}
async function session(strapi, account) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  await strapi.db
    .query(auth.SESSION)
    .create({
      data: {
        account_id: account.id,
        token_hash: auth.digest(token),
        expires_at: expiresAt,
      },
    });
  return { account: auth.clean(account), sessionToken: token, expiresAt };
}
async function register(strapi, businessId, input) {
  await ready(strapi, businessId);
  const email = auth.emailAddress(input?.email),
    details = auth.profile(input);
  password(input?.password);
  await limit(strapi, businessId, email);
  const encoded = await hash(input.password);
  return locked(strapi, businessId, async () => {
    const db = strapi.db.query(auth.ACCOUNT),
      email_key = `${businessId}:${email}`;
    if (await db.findOne({ where: { email_key } }))
      throw new errors.ValidationError(
        "No se pudo crear la cuenta. Si ya te registraste, ingresá o solicitá ayuda a Natalia.",
      );
    const account = await db.create({
      data: {
        business_id: businessId,
        email_key,
        email,
        ...details,
        password_hash: encoded,
      },
    });
    return session(strapi, account);
  });
}
async function login(strapi, businessId, input) {
  await ready(strapi, businessId);
  const email = auth.emailAddress(input?.email);
  password(input?.password);
  await limit(strapi, businessId, email);
  const account = await strapi.db
    .query(auth.ACCOUNT)
    .findOne({
      where: { email_key: `${businessId}:${email}`, business_id: businessId },
    });
  if (!(await matches(input.password, account?.password_hash)))
    throw new errors.ValidationError("Email o contraseña incorrectos.");
  return locked(strapi, businessId, async () => {
    const current = await strapi.db
      .query(auth.ACCOUNT)
      .findOne({ where: { id: account.id, business_id: businessId } });
    if (!current || current.password_hash !== account.password_hash)
      throw new errors.ValidationError("Volvé a ingresar.");
    return session(strapi, current);
  });
}
async function list(strapi, businessId, query) {
  const search = typeof query === "string" ? query.trim().slice(0, 254) : "";
  const rows = await strapi.db.query(auth.ACCOUNT).findMany({
    where: {
      business_id: businessId,
      ...(search
        ? {
            $or: [
              { email: { $containsi: search } },
              { name: { $containsi: search } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    limit: 50,
  });
  return { accounts: rows.map(auth.clean) };
}
async function recovery(strapi, businessId, input) {
  const c = await ready(strapi, businessId);
  if (input?.identityConfirmed !== true)
    throw new errors.ValidationError(
      "Confirmá la identidad del cliente antes de recuperar el acceso.",
    );
  return locked(strapi, businessId, async () => {
    const account = await strapi.db
      .query(auth.ACCOUNT)
      .findOne({ where: { id: input.accountId, business_id: businessId } });
    if (!account) throw new errors.NotFoundError("Cuenta no encontrada.");
    const token = randomBytes(32).toString("base64url"),
      expiresAt = new Date(Date.now() + 1800000).toISOString();
    await strapi.db
      .query(auth.ACCOUNT)
      .update({
        where: { id: account.id },
        data: {
          recovery_hash: auth.digest(token),
          recovery_expires_at: expiresAt,
        },
      });
    // Fragment keeps the one-time secret out of HTTP URLs and server access logs.
    return {
      url: `${new URL(c.CUSTOMER_SITE_URL).origin}/cuenta#recuperar=${token}`,
      expiresAt,
    };
  });
}
async function reset(strapi, businessId, input) {
  await ready(strapi, businessId);
  if (typeof input?.token !== "string" || !/^[\w-]{43}$/.test(input.token))
    throw new errors.ValidationError("Enlace inválido o vencido.");
  password(input?.password);
  await limit(strapi, businessId, "recovery");
  const encoded = await hash(input.password);
  return locked(strapi, businessId, async () => {
    const db = strapi.db.query(auth.ACCOUNT);
    const account = await db.findOne({
      where: {
        business_id: businessId,
        recovery_hash: auth.digest(input.token),
        recovery_expires_at: { $gt: new Date().toISOString() },
      },
    });
    if (!account)
      throw new errors.ValidationError(
        "Enlace inválido o vencido. Pedí uno nuevo a Natalia.",
      );
    await db.update({
      where: { id: account.id },
      data: {
        password_hash: encoded,
        recovery_hash: null,
        recovery_expires_at: null,
      },
    });
    await strapi.db
      .query(auth.SESSION)
      .deleteMany({ where: { account_id: account.id } });
    return session(strapi, account);
  });
}
module.exports = {
  hash,
  matches,
  password,
  register,
  login,
  list,
  recovery,
  reset,
};
