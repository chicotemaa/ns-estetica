"use strict";
const { errors } = require("@strapi/utils");
const { locked } = require("./booking");
const defaults = require("./website-defaults.json");
const uid = "api::business.business";
const videoTemplate = {
  id: "",
  title: "",
  description: "",
  url: "",
  poster: "",
};
const fail = (message) => {
  throw new errors.ValidationError(message);
};
function mediaUrl(value, optional = false) {
  if (!value && optional) return true;
  if (/^\/images\/[a-zA-Z0-9_/-]+\.(webp|png|jpe?g)$/i.test(value)) return true;
  try {
    const url = new URL(value),
      base = new URL(process.env.PUBLIC_URL || "http://localhost:1337");
    return (
      url.origin === base.origin &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      /^\/uploads\/site\/[a-f0-9-]+\.(webp|mp4|webm)$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}
function videoUrl(value) {
  if (mediaUrl(value) && /\.(mp4|webm)$/.test(value)) return true;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    if (["www.youtube.com", "youtube.com"].includes(u.hostname))
      return (
        u.pathname === "/watch" &&
        /^[\w-]{11}$/.test(u.searchParams.get("v") || "")
      );
    if (u.hostname === "youtu.be") return /^\/[\w-]{11}$/.test(u.pathname);
    return (
      ["vimeo.com", "www.vimeo.com"].includes(u.hostname) &&
      /^\/\d{6,12}$/.test(u.pathname)
    );
  } catch {
    return false;
  }
}
function luminance(hex) {
  return [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function validateContent(input) {
  if (JSON.stringify(input || {}).length > 180000)
    fail("El contenido supera el tamaño permitido.");
  function check(value, shape, path) {
    if (Array.isArray(shape)) {
      if (
        !Array.isArray(value) ||
        value.length > (path.endsWith("posts") ? 20 : 40)
      )
        fail(`Revisá la cantidad de elementos en ${path}.`);
      const itemShape = shape[0] || (path.endsWith("photos")
        ? { id: "", title: "", image: "", alt: "", description: "" }
        : path.endsWith("posts") ? { id: "", title: "", excerpt: "", content: "" } : videoTemplate);
      const result = value.map((item, i) =>
        check(item, itemShape, `${path}.${i}`),
      );
      if (
        result.some((item) => item.id) &&
        new Set(result.map((item) => item.id)).size !== result.length
      )
        fail("Hay elementos con identificadores repetidos.");
      return result;
    }
    if (shape && typeof shape === "object") {
      if (!value || typeof value !== "object" || Array.isArray(value))
        fail(`Completá ${path}.`);
      if (Object.keys(value).some((key) => !Object.hasOwn(shape, key)))
        fail(`Campo no permitido en ${path}.`);
      return Object.fromEntries(
        Object.entries(shape).map(([key, template]) => [
          key,
          check(value[key], template, `${path}.${key}`),
        ]),
      );
    }
    if (typeof value !== typeof shape) fail(`Formato inválido en ${path}.`);
    if (typeof value !== "string") return value;
    const key = path.split(".").pop();
    const max =
      key === "content"
        ? 12000
        : ["body", "description", "intro"].includes(key)
          ? 2000
          : key === "title"
            ? 100
            : 500;
    const result = value.trim();
    if (result.length > max)
      fail(`El texto de ${path} es demasiado largo (máximo ${max}).`);
    if (
      ["image", "logo", "poster"].includes(key) &&
      (!mediaUrl(result, key === "poster") || /\.(mp4|webm)$/.test(result))
    )
      fail("Elegí una imagen de la biblioteca.");
    if (key === "url" && !videoUrl(result))
      fail("Usá un video subido, un enlace de YouTube o Vimeo.");
    if (key === "id" && !/^[a-zA-Z0-9_-]{1,80}$/.test(result))
      fail("Identificador de contenido inválido.");
    if (
      key === "position" &&
      !/^(center|left|right)( (\d{1,2}|100)%)?$/.test(result)
    )
      fail("Encuadre de imagen inválido.");
    return result;
  }
  const content = check(input, defaults, "web"),
    c = content.identity;
  for (const key of ["gray", "black", "burgundy", "white"])
    if (!/^#[0-9a-f]{6}$/i.test(c[key]))
      fail("Usá colores hexadecimales de seis dígitos.");
  if (!["manrope", "system"].includes(c.font))
    fail("Elegí una tipografía válida.");
  if (
    contrast(c.gray, c.black) < 4.5 ||
    contrast(c.burgundy, c.white) < 4.5 ||
    contrast(c.burgundy, c.gray) < 4.5 ||
    contrast(c.black, c.white) < 4.5
  )
    fail(
      "Los colores necesitan más contraste para que los textos y botones se lean bien.",
    );
  if (
    !c.name ||
    !c.shortName ||
    !content.hero.title ||
    content.hero.title.length > 100
  )
    fail("Completá el nombre y un título de portada de hasta 100 caracteres.");
  if (content.videos.enabled && !content.videos.items.length)
    fail("Agregá un video antes de mostrar la sección.");
  return content;
}
function state(business) {
  const merge = (saved) => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, { ...value, ...(saved?.[key] || {}) }]));
  const published = merge(business.website_content);
  return {
    draft: business.website_draft ? merge(business.website_draft) : published,
    published,
    revision: business.website_revision || 0,
    publishedAt: business.website_published_at || null,
    media: business.website_media || [],
  };
}
async function save(strapi, businessId, input, publish) {
  const content = validateContent(input?.content);
  return locked(strapi, businessId, async () => {
    const business = await strapi.db
      .query(uid)
      .findOne({ where: { id: businessId } });
    if (
      !Number.isInteger(input.revision) ||
      input.revision !== (business.website_revision || 0)
    ) {
      const error = new Error(
        "Otra persona guardó cambios. Recargá el editor antes de continuar.",
      );
      error.status = 409;
      throw error;
    }
    const data = {
      website_draft: content,
      website_revision: input.revision + 1,
    };
    if (publish)
      Object.assign(data, {
        website_content: content,
        website_published_at: new Date().toISOString(),
      });
    return state(
      await strapi
        .documents(uid)
        .update({ documentId: business.documentId, data }),
    );
  });
}
module.exports = {
  defaults,
  state,
  save,
  validateContent,
  mediaUrl,
  videoUrl,
  contrast,
};
