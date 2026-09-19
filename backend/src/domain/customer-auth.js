"use strict";
const {
  randomBytes,
  randomInt,
  randomUUID,
  createHash,
  createHmac,
  timingSafeEqual,
} = require("node:crypto");
const { errors } = require("@strapi/utils");
const { locked } = require("./booking");
const { resolveConfiguration, requireAccess } = require("./customer-config");
const { sendMessage } = require("./customer-mail");
const ACCOUNT = "api::customer-account.customer-account",
  CHALLENGE = "api::customer-challenge.customer-challenge",
  SESSION = "api::customer-session.customer-session";
const digest = (value) => createHash("sha256").update(value).digest("hex");
const equal = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
function emailAddress(raw) {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email))
    throw new errors.ValidationError("Revisá el correo electrónico.");
  return email;
}
function profile(raw) {
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  const source = typeof raw?.phone === "string" ? raw.phone.trim() : "";
  const digits = source.replace(/[\s().-]/g, "");
  // Argentine local numbers are accepted; other countries must include +country code.
  const phone = /^\d{10}$/.test(digits) ? "+54" + digits : digits;
  if (name.length < 2 || name.length > 100 || !/^\+[1-9]\d{7,14}$/.test(phone))
    throw new errors.ValidationError(
      "Ingresá tu nombre y teléfono con código de área (o + y código de país).",
    );
  return { name, phone };
}
const clean = (a) => ({
  id: String(a.id),
  email: a.email,
  name: a.name || "",
  phone: a.phone || "",
});
function proof(key, value, config) {
  return createHmac("sha256", config.CUSTOMER_AUTH_SECRET)
    .update(`${key}:${value}`)
    .digest("hex");
}
async function challenge(
  strapi,
  businessId,
  kind,
  rawEmail,
  sender = sendMessage,
) {
  const config = requireAccess(
    kind,
    await resolveConfiguration(strapi, businessId),
  );
  if (kind === "google" && !config.googleClientId)
    throw new errors.ValidationError(
      "El acceso con Google todavía no está disponible.",
    );
  const email = kind === "email" ? emailAddress(rawEmail) : null;
  const key = randomUUID(),
    value =
      kind === "email"
        ? String(randomInt(100000, 1000000))
        : randomBytes(32).toString("base64url");
  await locked(strapi, businessId, async () => {
    const db = strapi.db.query(CHALLENGE),
      hourAgo = new Date(Date.now() - 3600000).toISOString();
    if (
      (await db.count({
        where: { business_id: businessId, createdAt: { $gt: hourAgo } },
      })) >= 100
    )
      throw new errors.ApplicationError(
        "Demasiados intentos. Probá más tarde.",
      );
    if (email) {
      const recent = await db.findMany({
        where: { business_id: businessId, email, createdAt: { $gt: hourAgo } },
        orderBy: { createdAt: "desc" },
      });
      if (
        recent.length >= 5 ||
        (recent[0] && Date.parse(recent[0].createdAt) > Date.now() - 60000)
      )
        throw new errors.ApplicationError(
          "Esperá un minuto antes de pedir otro código.",
        );
      await db.updateMany({
        where: { business_id: businessId, email, consumed_at: { $null: true } },
        data: { consumed_at: new Date().toISOString() },
      });
    }
    await db.create({
      data: {
        business_id: businessId,
        key,
        kind,
        email,
        proof_hash: proof(key, value, config),
        attempts: 0,
        expires_at: new Date(Date.now() + 600000).toISOString(),
      },
    });
  });
  if (kind === "email") {
    const result = await sender(
      {
        recipient: email,
        subject: "Tu código para Natalia Sánchez",
        text: `Tu código para ingresar es ${value}.\n\nVence en 10 minutos y se puede usar una sola vez. Si no lo solicitaste, podés ignorar este mensaje.`,
      },
      undefined,
      config,
    );
    if (result.status !== "sent") {
      await strapi.db.query(CHALLENGE).update({
        where: { key },
        data: { consumed_at: new Date().toISOString() },
      });
      throw new errors.ApplicationError(
        "No pudimos enviar el código. Intentá nuevamente en un minuto.",
      );
    }
  }
  return {
    challengeId: key,
    ...(kind === "google" ? { nonce: value } : {}),
    expiresIn: 600,
  };
}
async function finish(strapi, businessId, input, googleVerifier) {
  const config = requireAccess(
    input?.kind,
    await resolveConfiguration(strapi, businessId),
  );
  if (
    !input ||
    !["email", "google"].includes(input.kind) ||
    typeof input.challengeId !== "string"
  )
    throw new errors.ValidationError("Solicitud inválida.");
  let google;
  if (input.kind === "google") {
    if (typeof input.credential !== "string" || input.credential.length > 10000)
      throw new errors.ValidationError("Credencial inválida.");
    try {
      const clientId = config.googleClientId;
      if (!clientId) throw Error();
      if (googleVerifier) google = await googleVerifier(input.credential);
      else {
        const { OAuth2Client } = require("google-auth-library");
        const ticket = await new OAuth2Client(clientId).verifyIdToken({
          idToken: input.credential,
          audience: clientId,
        });
        google = ticket.getPayload();
      }
      if (
        !google?.sub ||
        !google.email_verified ||
        !google.email ||
        (!google.email.endsWith("@gmail.com") && !google.hd)
      )
        throw Error();
      google.email = emailAddress(google.email);
    } catch {
      throw new errors.ValidationError(
        "No pudimos verificar Google. Probá ingresar con un código por correo.",
      );
    }
  }
  const outcome = await locked(strapi, businessId, async () => {
    const db = strapi.db.query(CHALLENGE),
      row = await db.findOne({
        where: {
          key: input.challengeId,
          business_id: businessId,
          kind: input.kind,
        },
      });
    const valid =
      row &&
      !row.consumed_at &&
      Date.parse(row.expires_at) > Date.now() &&
      row.attempts < 5;
    if (!valid) return { error: true };
    const provided = input.kind === "google" ? google.nonce : input.code;
    if (
      typeof provided !== "string" ||
      provided.length > 200 ||
      !equal(row.proof_hash, proof(row.key, provided, config))
    ) {
      await db.update({
        where: { id: row.id },
        data: { attempts: row.attempts + 1 },
      });
      return { error: true };
    }
    await db.update({
      where: { id: row.id },
      data: { consumed_at: new Date().toISOString() },
    });
    const email = google?.email || row.email,
      accounts = strapi.db.query(ACCOUNT);
    const googleKey = google ? `${businessId}:${google.sub}` : null;
    let account = googleKey
      ? await accounts.findOne({
          where: { google_key: googleKey, business_id: businessId },
        })
      : null;
    if (account && account.email !== email) {
      const collision = await accounts.findOne({
        where: { email_key: `${businessId}:${email}` },
      });
      if (collision && collision.id !== account.id) return { error: true };
      account = await accounts.update({
        where: { id: account.id },
        data: { email, email_key: `${businessId}:${email}` },
      });
    }
    if (!account)
      account = await accounts.findOne({
        where: { email_key: `${businessId}:${email}` },
      });
    if (!account)
      account = await accounts.create({
        data: {
          business_id: businessId,
          email,
          email_key: `${businessId}:${email}`,
          google_key: googleKey,
          name: google?.name?.slice(0, 100) || "",
        },
      });
    else if (googleKey && !account.google_key)
      account = await accounts.update({
        where: { id: account.id },
        data: { google_key: googleKey },
      });
    else if (googleKey && account.google_key !== googleKey)
      return { error: true };
    const token = randomBytes(32).toString("base64url"),
      expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    await strapi.db.query(SESSION).create({
      data: {
        account_id: account.id,
        token_hash: digest(token),
        expires_at: expiresAt,
      },
    });
    return { sessionToken: token, expiresAt, account: clean(account) };
  });
  if (outcome.error)
    throw new errors.ValidationError(
      "El código o acceso venció o no es válido. Pedí uno nuevo.",
    );
  return outcome;
}
async function accountFor(strapi, businessId, token) {
  if (typeof token !== "string" || !/^[\w-]{43}$/.test(token))
    throw new errors.UnauthorizedError("Ingresá para continuar.");
  const session = await strapi.db.query(SESSION).findOne({
    where: {
      token_hash: digest(token),
      expires_at: { $gt: new Date().toISOString() },
    },
  });
  const account =
    session &&
    (await strapi.db
      .query(ACCOUNT)
      .findOne({ where: { id: session.account_id, business_id: businessId } }));
  if (!account)
    throw new errors.UnauthorizedError("Tu sesión venció. Ingresá nuevamente.");
  return account;
}
async function saveProfile(strapi, businessId, account, input) {
  const data = profile(input);
  return locked(strapi, businessId, async () => {
    const updated = await strapi.db
      .query(ACCOUNT)
      .update({ where: { id: account.id, business_id: businessId }, data });
    return { account: clean(updated) };
  });
}
async function logout(strapi, token) {
  if (typeof token === "string")
    await strapi.db
      .query(SESSION)
      .deleteMany({ where: { token_hash: digest(token) } });
  return { ok: true };
}
module.exports = {
  ACCOUNT,
  CHALLENGE,
  SESSION,
  digest,
  equal,
  emailAddress,
  profile,
  clean,
  challenge,
  finish,
  accountFor,
  saveProfile,
  logout,
};
