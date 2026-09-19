"use strict";
const { randomBytes, randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { errors } = require("@strapi/utils");
const { locked } = require("./booking");
const tickets = new Map();
const types = {
  "image/jpeg": 10,
  "image/png": 10,
  "image/webp": 10,
  "video/mp4": 50,
  "video/webm": 50,
};
function issue(businessId, input) {
  const now = Date.now();
  for (const [key, ticket] of tickets)
    if (ticket.expires < now) tickets.delete(key);
  if (
    !input ||
    !Object.hasOwn(types, input.mime) ||
    !Number.isInteger(input.size) ||
    input.size <= 0 ||
    input.size > types[input.mime] * 1024 * 1024
  )
    throw new errors.ValidationError(
      "Subí JPG, PNG o WebP de hasta 10 MB, o MP4 / WebM de hasta 50 MB.",
    );
  if (tickets.size >= 100)
    throw new errors.ApplicationError(
      "Esperá unos minutos antes de subir otro archivo.",
    );
  const token = randomBytes(32).toString("hex");
  tickets.set(token, {
    businessId,
    mime: input.mime,
    size: input.size,
    name: String(input.name || "Archivo").slice(0, 120),
    expires: now + 300000,
  });
  return {
    token,
    uploadUrl: `${(process.env.PUBLIC_URL || "http://localhost:1337").replace(/\/$/, "")}/api/website/upload`,
  };
}
function consume(token) {
  const ticket = tickets.get(token);
  tickets.delete(token);
  return ticket && ticket.expires > Date.now() ? ticket : null;
}
async function upload(strapi, ticket, files) {
  const list = Object.values(files || {}).flat();
  if (list.length !== 1)
    throw new errors.ValidationError("Subí un archivo por vez.");
  const file = list[0];
  const directory = path.join(strapi.dirs.static.public, "uploads", "site");
  let destination;
  try {
    if (file.size !== ticket.size || file.mimetype !== ticket.mime)
      throw new errors.ValidationError(
        "El archivo no coincide con la carga autorizada.",
      );
    const input = await fs.readFile(file.filepath);
    let bytes, extension;
    if (ticket.mime.startsWith("image/")) {
      try {
        bytes = await sharp(input, { limitInputPixels: 40000000 })
          .rotate()
          .resize({
            width: 2400,
            height: 2400,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer();
        extension = "webp";
      } catch {
        throw new errors.ValidationError(
          "La imagen está dañada o es demasiado grande.",
        );
      }
    } else {
      const valid =
        ticket.mime === "video/mp4"
          ? input.subarray(4, 8).toString() === "ftyp"
          : input.subarray(0, 4).toString("hex") === "1a45dfa3";
      if (!valid)
        throw new errors.ValidationError(
          "El archivo no es un video MP4 / WebM válido.",
        );
      bytes = input;
      extension = ticket.mime === "video/mp4" ? "mp4" : "webm";
    }
    const id = randomUUID(),
      filename = `${id}.${extension}`;
    await fs.mkdir(directory, { recursive: true });
    destination = path.join(directory, filename);
    await fs.writeFile(destination, bytes, { flag: "wx" });
    const media = {
      id,
      url: `${(process.env.PUBLIC_URL || "http://localhost:1337").replace(/\/$/, "")}/uploads/site/${filename}`,
      name: ticket.name,
      mime: extension === "webp" ? "image/webp" : ticket.mime,
      size: bytes.length,
      createdAt: new Date().toISOString(),
    };
    await locked(strapi, ticket.businessId, async () => {
      const business = await strapi.db
        .query("api::business.business")
        .findOne({ where: { id: ticket.businessId } });
      const library = business.website_media || [];
      if (library.length >= 500)
        throw new errors.ValidationError("La biblioteca alcanzó su capacidad.");
      await strapi
        .documents("api::business.business")
        .update({
          documentId: business.documentId,
          data: { website_media: [media, ...library] },
        });
    });
    return { media };
  } catch (error) {
    if (destination) await fs.unlink(destination).catch(() => {});
    throw error;
  } finally {
    await fs.unlink(file.filepath).catch(() => {});
  }
}
module.exports = { issue, consume, upload };
