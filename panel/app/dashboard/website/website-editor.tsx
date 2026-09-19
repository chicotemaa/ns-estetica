"use client";
/* Uploaded images retain their own origin; next/image is intentionally not used in this media editor. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  Globe,
  ImagePlus,
  Loader2,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  defaultWebsite,
  type WebsiteContent,
  type WebsiteMedia,
  type WebsiteState,
} from "@/lib/website/website-content";

type Section = keyof WebsiteContent;
type Value = string | boolean | Value[] | { [key: string]: Value };
const sections: { id: Section; title: string; description: string }[] = [
  {
    id: "identity",
    title: "Identidad",
    description:
      "Colores, nombre, logo y estilo compartidos por tu web y este panel.",
  },
  {
    id: "hero",
    title: "Portada",
    description:
      "La primera impresión: imagen principal, título y llamada a reservar.",
  },
  {
    id: "navigation",
    title: "Navegación",
    description: "Textos del encabezado y enlaces principales.",
  },
  {
    id: "services",
    title: "Servicios",
    description:
      "Presentación del catálogo. Los precios y la disponibilidad se administran en Servicios.",
  },
  {
    id: "work",
    title: "Trabajos en inicio",
    description:
      "Se muestran las primeras cuatro fotos de tu galería, en el orden que elijas.",
  },
  {
    id: "about",
    title: "El estudio",
    description: "Tu presentación, una foto y la historia que querés contar.",
  },
  {
    id: "brand",
    title: "Nuestra marca",
    description: "Una selección de imágenes y detalles de tu identidad.",
  },
  {
    id: "gallery",
    title: "Galería",
    description: "Agregá trabajos, cambiá fotos y ordenalos con las flechas.",
  },
  {
    id: "journal",
    title: "Notas y consejos",
    description:
      "Publicá novedades y consejos. Separá los párrafos con una línea en blanco.",
  },
  {
    id: "videos",
    title: "Videos",
    description:
      "Subí un MP4 / WebM o pegá un enlace de YouTube o Vimeo. Se reproducen cuando el visitante lo decide.",
  },
  {
    id: "visit",
    title: "Visitanos",
    description:
      "La dirección y los horarios se toman de la configuración del negocio.",
  },
  {
    id: "booking",
    title: "Reservas",
    description: "Textos que acompañan el formulario para pedir turno.",
  },
  {
    id: "footer",
    title: "Pie de página",
    description:
      "Una descripción breve y un acceso a reservar. Las redes se editan en Configuración.",
  },
];
const labels: Record<string, string> = {
  name: "Nombre completo",
  shortName: "Nombre corto",
  logo: "Logo",
  gray: "Gris · color principal",
  black: "Negro · estructura",
  burgundy: "Borgoña · acciones",
  white: "Blanco · contraste",
  font: "Tipografía",
  rounded: "Bordes redondeados",
  eyebrow: "Texto superior",
  title: "Título",
  note: "Frase de portada",
  image: "Imagen",
  alt: "Descripción de la imagen",
  buttonText: "Texto del botón",
  secondaryText: "Enlace secundario",
  signature: "Firma",
  enabled: "Mostrar sección",
  body: "Texto",
  caption: "Pie de foto",
  linkText: "Texto del enlace",
  credit: "Crédito de las imágenes",
  photos: "Fotografías",
  posts: "Notas",
  items: "Videos",
  description: "Descripción",
  bookingText: "Texto del botón de reserva",
  intro: "Introducción",
  topbar: "Franja superior",
  services: "Servicios",
  work: "Trabajos",
  about: "El estudio",
  booking: "Reserva",
  journal: "Consejos",
  category: "Categoría",
  position: "Encuadre",
  excerpt: "Resumen",
  date: "Fecha de la nota",
  readingTime: "Tiempo de lectura",
  content: "Contenido de la nota",
  url: "Video",
  poster: "Portada del video (opcional)",
};
const builtins: WebsiteMedia[] = [
  ...new Set([
    defaultWebsite.identity.logo,
    defaultWebsite.hero.image,
    defaultWebsite.about.image,
    ...(defaultWebsite.gallery.photos as { image: string }[]).map((p) => p.image),
    ...(defaultWebsite.brand.photos as { image: string }[]).map((p) => p.image),
  ]),
].map((url, i) => ({
  id: `original-${i}`,
  url,
  name:
    i === 0
      ? "Logo Natalia Sánchez"
      : i === 1
        ? "Retrato de Natalia"
        : [
            ...(defaultWebsite.gallery.photos as { image: string; title: string }[]),
            ...(defaultWebsite.brand.photos as { image: string; title: string }[]),
          ].find((p) => p.image === url)?.title || "Natalia en el estudio",
  mime: "image/webp",
  size: 0,
  createdAt: "",
}));
async function request(path = "", method = "GET", body?: unknown) {
  const response = await fetch(`/api/website${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la acción.");
  return data;
}
const templateFor = (key: string): Value =>
  key === "items"
    ? {
        id: crypto.randomUUID(),
        title: "Nuevo video",
        description: "",
        url: "",
        poster: "",
      }
    : key === "posts"
      ? {
          id: crypto.randomUUID(),
          title: "Nueva nota",
          excerpt: "",
          content: "",
        }
      : key === "photos"
        ? {
            image: "",
            id: crypto.randomUUID(),
            title: "Nueva fotografía",
            alt: "",
            description: "",
          }
        : {};
export default function WebsiteEditor({ siteUrl }: { siteUrl: string }) {
  const router = useRouter();
  const [state, setState] = useState<WebsiteState | null>(null),
    [content, setContent] = useState<WebsiteContent>(defaultWebsite),
    [saved, setSaved] = useState("");
  const [section, setSection] = useState<Section>("identity"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false),
    [mobile, setMobile] = useState(false),
    [previewPath, setPreviewPath] = useState("/");
  const [library, setLibrary] = useState<{
      path: string[];
      video: boolean;
    } | null>(null),
    [uploadProgress, setUploadProgress] = useState<number | null>(null),
    [mediaSearch, setMediaSearch] = useState("");
  const iframe = useRef<HTMLIFrameElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    previewFrame = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 390, height: 650 });
  const dirty = !!state && JSON.stringify(content) !== saved;
  const unpublished =
    !!state && JSON.stringify(content) !== JSON.stringify(state.published);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result: WebsiteState = await request();
      setState(result);
      setContent(result.draft);
      setSaved(JSON.stringify(result.draft));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!preview || !previewFrame.current) return;
    const element = previewFrame.current;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === 0) return;
      setPreviewSize({
        width: element.clientWidth,
        height: Math.min(760, window.innerHeight * 0.72),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [preview]);
  useEffect(() => {
    if (!dirty) return;
    const leave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const navigate = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (
        a &&
        a.origin === location.origin &&
        a.pathname !== location.pathname &&
        !a.target &&
        !window.confirm("Tenés cambios sin guardar. ¿Querés salir del editor?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  const sendPreview = useCallback(() => {
    iframe.current?.contentWindow?.postMessage(
      { type: "nerea:preview", content },
      new URL(siteUrl).origin,
    );
  }, [content, siteUrl]);
  useEffect(() => {
    const timer = setTimeout(sendPreview, 180);
    return () => clearTimeout(timer);
  }, [sendPreview, preview]);
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (
        e.origin === new URL(siteUrl).origin &&
        e.source === iframe.current?.contentWindow &&
        e.data?.type === "nerea:ready"
      )
        sendPreview();
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [sendPreview, siteUrl]);
  function update(path: string[], value: Value) {
    setContent((previous) => {
      const copy = structuredClone(previous);
      let target = copy as unknown as Record<string, Value>;
      for (const key of path.slice(0, -1))
        target = target[key] as Record<string, Value>;
      target[path.at(-1)!] = value;
      return copy;
    });
    setNotice("");
  }
  async function save(publish = false) {
    if (!state) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result: WebsiteState = await request(
        publish ? "/publish" : "",
        publish ? "POST" : "PUT",
        { content, revision: state.revision },
      );
      setState(result);
      setContent(result.draft);
      setSaved(JSON.stringify(result.draft));
      setNotice(
        publish
          ? "Cambios publicados. Tu web ya está actualizada."
          : "Borrador guardado. La web conserva la versión publicada.",
      );
      if (publish) router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    setError("");
    setUploadProgress(0);
    try {
      const ticket = await request("/upload-ticket", "POST", {
        name: file.name,
        size: file.size,
        mime: file.type,
      });
      const result = await new Promise<{ media: WebsiteMedia }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", ticket.uploadUrl);
          xhr.setRequestHeader("Authorization", `Bearer ${ticket.token}`);
          xhr.timeout = 120000;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onerror = () =>
            reject(new Error("La carga se interrumpió. Volvé a intentar."));
          xhr.ontimeout = () =>
            reject(new Error("La carga tardó demasiado. Volvé a intentar."));
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) resolve(data);
              else
                reject(
                  new Error(
                    data.error?.message || "No se pudo subir el archivo.",
                  ),
                );
            } catch {
              reject(new Error("No se pudo leer la respuesta de carga."));
            }
          };
          const form = new FormData();
          form.append("file", file);
          xhr.send(form);
        },
      );
      setState((previous) =>
        previous
          ? { ...previous, media: [result.media, ...previous.media] }
          : previous,
      );
      if (library) {
        update(library.path, result.media.url);
        setLibrary(null);
      }
      setNotice("Archivo cargado. Guardá o publicá para aplicar el cambio.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadProgress(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  const absolute = (url: string) =>
    url.startsWith("/") ? new URL(url, siteUrl).href : url;
  function mediaField(value: string, path: string[], video = false) {
    const label = labels[path.at(-1)!] || "Archivo";
    return (
      <div className="web-field" key={path.join(".")}>
        <span className="web-label">{label}</span>
        <div className="web-media-field">
          {value && !video ? (
            <img src={absolute(value)} alt="Imagen seleccionada" />
          ) : (
            <div className="web-media-empty">
              <ImagePlus size={24} />
            </div>
          )}
          <div>
            <button
              type="button"
              className="web-small-button"
              onClick={() => {
                setMediaSearch("");
                setLibrary({ path, video });
              }}
            >
              <ImagePlus size={15} />
              {value ? "Cambiar archivo" : "Elegir archivo"}
            </button>
            {path.at(-1) === "poster" && value && (
              <button
                type="button"
                className="web-small-button"
                onClick={() => update(path, "")}
              >
                Quitar portada
              </button>
            )}
            <p>
              {video
                ? "MP4 / WebM · hasta 50 MB"
                : "JPG, PNG o WebP · hasta 10 MB"}
            </p>
          </div>
        </div>
        {video && (
          <label className="web-field">
            <span>O enlace de YouTube / Vimeo</span>
            <input
              aria-label="Enlace del video"
              value={value}
              onChange={(e) => update(path, e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </label>
        )}
      </div>
    );
  }
  function fields(value: Value, path: string[]): React.ReactNode {
    if (Array.isArray(value)) {
      const key = path.at(-1)!;
      return (
        <div className="web-collection" key={path.join(".")}>
          <div className="web-collection-heading">
            <h3>{labels[key]}</h3>
            <span>
              {value.length} / {key === "posts" ? 20 : 40}
            </span>
          </div>
          {value.map((item, index) => {
            const row = item as Record<string, Value>;
            return (
              <details className="web-item" key={String(row.id || index)}>
                <summary>
                  {typeof row.image === "string" && (
                    <img src={absolute(row.image)} alt="" />
                  )}
                  <span>{String(row.title || `Elemento ${index + 1}`)}</span>
                  <ChevronRight size={16} />
                </summary>
                <div className="web-item-body">
                  <div className="web-item-actions">
                    <button
                      type="button"
                      className="web-small-button"
                      disabled={index === 0}
                      aria-label={`Subir ${row.title}`}
                      onClick={() => {
                        const copy = [...value];
                        [copy[index - 1], copy[index]] = [
                          copy[index],
                          copy[index - 1],
                        ];
                        update(path, copy);
                      }}
                    >
                      <ArrowUp size={16} />
                      Subir
                    </button>
                    <button
                      type="button"
                      className="web-small-button"
                      disabled={index === value.length - 1}
                      aria-label={`Bajar ${row.title}`}
                      onClick={() => {
                        const copy = [...value];
                        [copy[index + 1], copy[index]] = [
                          copy[index],
                          copy[index + 1],
                        ];
                        update(path, copy);
                      }}
                    >
                      <ArrowDown size={16} />
                      Bajar
                    </button>
                    <button
                      type="button"
                      className="web-small-button"
                      onClick={() =>
                        update(
                          path,
                          value.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={15} />
                      Quitar
                    </button>
                  </div>
                  {fields(item, [...path, String(index)])}
                </div>
              </details>
            );
          })}
          <button
            className="web-small-button"
            type="button"
            disabled={value.length >= (key === "posts" ? 20 : 40)}
            onClick={() => {
              const item =
                path[0] === "brand"
                  ? {
                      image: defaultWebsite.identity.logo,
                      title: "Nueva imagen",
                      alt: "",
                    }
                  : templateFor(key);
              update(path, [...value, item]);
            }}
          >
            <Plus size={16} />
            Agregar{" "}
            {key === "items"
              ? "video"
              : key === "posts"
                ? "nota"
                : "fotografía"}
          </button>
        </div>
      );
    }
    if (typeof value === "object") {
      const order =
        path.length === 1
          ? Object.keys(defaultWebsite[path[0] as Section])
          : [
              "title",
              "image",
              "alt",
              "url",
              "poster",
              "category",
              "position",
              "description",
              "excerpt",
              "date",
              "readingTime",
              "content",
            ];
      return Object.entries(value)
        .filter(([key]) => key !== "id")
        .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
        .map(([key, item]) => fields(item, [...path, key]));
    }
    const key = path.at(-1)!,
      id = path.join("-"),
      label = labels[key] || key;
    if (typeof value === "boolean")
      return (
        <label key={id} className="web-toggle">
          <span>{label}</span>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => update(path, e.target.checked)}
          />
        </label>
      );
    if (["image", "logo", "poster", "url"].includes(key))
      return mediaField(value, path, key === "url");
    if (["gray", "black", "burgundy", "white"].includes(key))
      return (
        <label key={id} className="web-color">
          <span>{label}</span>
          <input
            aria-label={label}
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
            onChange={(e) => update(path, e.target.value)}
          />
          <input
            aria-label={`${label} hexadecimal`}
            value={value}
            maxLength={7}
            onChange={(e) => update(path, e.target.value)}
            spellCheck={false}
          />
        </label>
      );
    if (key === "font")
      return (
        <label key={id} className="web-field">
          <span>{label}</span>
          <select value={value} onChange={(e) => update(path, e.target.value)}>
            <option value="manrope">Manrope · identidad del estudio</option>
            <option value="system">Sistema · simple y familiar</option>
          </select>
        </label>
      );
    if (key === "position")
      return (
        <label key={id} className="web-field">
          <span>Altura del encuadre</span>
          <input
            type="range"
            min="0"
            max="100"
            aria-label="Altura del encuadre"
            value={Number(value.match(/\d+/)?.[0] || 50)}
            onChange={(e) => update(path, `center ${e.target.value}%`)}
          />
          <small>Deslizá para centrar el detalle de la foto.</small>
        </label>
      );
    const multiline = [
      "body",
      "content",
      "description",
      "note",
      "title",
      "intro",
      "signature",
    ].includes(key);
    const max =
      key === "content"
        ? 12000
        : ["body", "description", "intro"].includes(key)
          ? 2000
          : key === "title"
            ? path[0] === "hero"
              ? 14
              : 100
            : 500;
    return (
      <label key={id} className="web-field" htmlFor={id}>
        <span>{label}</span>
        {multiline ? (
          <textarea
            id={id}
            value={value}
            rows={
              key === "content"
                ? 10
                : ["body", "description"].includes(key)
                  ? 4
                  : 2
            }
            maxLength={max}
            onChange={(e) => update(path, e.target.value)}
          />
        ) : (
          <input
            id={id}
            value={value}
            maxLength={max}
            onChange={(e) => update(path, e.target.value)}
          />
        )}
      </label>
    );
  }
  const selected = sections.find((s) => s.id === section)!;
  const list = [...(state?.media || []), ...builtins]
    .filter((m) =>
      library?.video
        ? m.mime.startsWith("video/")
        : m.mime.startsWith("image/"),
    )
    .filter((m) =>
      m.name.toLocaleLowerCase().includes(mediaSearch.toLocaleLowerCase()),
    );
  return (
    <div className="website-editor">
      <div className="web-heading">
        <div>
          <p className="section-kicker">Tu identidad, en tus manos</p>
          <h1 className="page-title">Mi web</h1>
          <p>Una misma marca. Todo tu contenido, desde acá.</p>
        </div>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="web-small-button"
        >
          Ver mi web
          <ExternalLink size={15} />
        </a>
      </div>
      <div className="web-toolbar">
        <div className="web-save-state">
          <span
            className={dirty ? "web-status-dot pending" : "web-status-dot"}
          />
          {busy
            ? "Guardando / cargando…"
            : dirty
              ? "Cambios sin guardar"
              : unpublished
                ? "Borrador guardado"
                : state?.publishedAt
                  ? "Todo publicado"
                  : "Listo para editar"}
        </div>
        <div className="web-toolbar-actions">
          <button
            type="button"
            className="web-small-button"
            disabled={!state}
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            <Eye size={16} />
            <span>Vista previa</span>
          </button>
          <button
            type="button"
            className="web-small-button"
            disabled={busy || !dirty || uploadProgress !== null}
            onClick={() => void save()}
          >
            <Save size={16} />
            <span>Guardar borrador</span>
          </button>
          <button
            type="button"
            className="brand-button"
            disabled={
              busy ||
              !state ||
              uploadProgress !== null ||
              (!unpublished && !!state.publishedAt)
            }
            onClick={() => void save(true)}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Globe size={16} />
            )}
            Publicar
          </button>
        </div>
      </div>
      {error && (
        <div className="web-message error" role="alert">
          {error}
          <button
            type="button"
            onClick={() => {
              if (
                !dirty ||
                window.confirm(
                  "Se reemplazarán los cambios de esta pantalla por el borrador guardado. ¿Continuar?",
                )
              )
                void load();
            }}
          >
            Recargar contenido
          </button>
        </div>
      )}
      {notice && (
        <p className="web-message" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}
      {!state ? (
        <div className="web-loading">
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              Cargando tu contenido…
            </>
          ) : (
            <button
              type="button"
              className="brand-button"
              onClick={() => void load()}
            >
              Reintentar
            </button>
          )}
        </div>
      ) : (
        <div className={`web-workspace ${preview ? "with-preview" : ""}`}>
          <label className="web-section-select">
            <span>Sección a editar</span>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as Section)}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <nav className="web-sections" aria-label="Secciones de mi web">
            {sections.map((s) => (
              <button
                type="button"
                key={s.id}
                aria-current={s.id === section ? "page" : undefined}
                onClick={() => setSection(s.id)}
              >
                {s.title}
                <ChevronRight size={14} />
              </button>
            ))}
          </nav>
          <section
            className="web-form-panel"
            aria-labelledby="editor-section-title"
          >
            <div className="web-form-intro">
              <p className="section-kicker">Editar sección</p>
              <h2 id="editor-section-title">{selected.title}</h2>
              <p>{selected.description}</p>
              {["services", "visit", "footer"].includes(section) && (
                <Link
                  className="web-inline-link"
                  href={
                    section === "services"
                      ? "/dashboard/services"
                      : section === "visit"
                        ? "/dashboard/hours"
                        : "/dashboard/settings"
                  }
                >
                  Administrar{" "}
                  {section === "services"
                    ? "servicios"
                    : section === "visit"
                      ? "horarios"
                      : "contacto y redes"}
                  <ExternalLink size={13} />
                </Link>
              )}
            </div>
            <fieldset
              disabled={busy || uploadProgress !== null}
              className="web-fields"
            >
              {fields(content[section] as Value, [section])}
            </fieldset>
            <div className="web-editor-footnote">
              <p>Los cambios se aplican a la web al publicar.</p>
              {unpublished && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setContent(structuredClone(state.published));
                    setNotice(
                      "Versión publicada recuperada en el editor. Guardá para reemplazar el borrador.",
                    );
                  }}
                >
                  Recuperar versión publicada
                </button>
              )}
            </div>
          </section>
          {preview && (
            <aside className="web-preview">
              <div className="web-preview-tools">
                <span>Vista previa · sin publicar</span>
                <button
                  type="button"
                  aria-label="Vista de escritorio"
                  aria-pressed={!mobile}
                  onClick={() => setMobile(false)}
                >
                  <Monitor size={17} />
                </button>
                <button
                  type="button"
                  aria-label="Vista de celular"
                  aria-pressed={mobile}
                  onClick={() => setMobile(true)}
                >
                  <Smartphone size={17} />
                </button>
                <button
                  type="button"
                  aria-label="Cerrar vista previa"
                  onClick={() => setPreview(false)}
                >
                  <X size={17} />
                </button>
              </div>
              <select
                aria-label="Página de la vista previa"
                value={previewPath}
                onChange={(e) => setPreviewPath(e.target.value)}
              >
                <option value="/">Inicio</option>
                <option value="/nuestro-trabajo">Galería</option>
                <option value="/blog">Notas</option>
                <option value="/reservas">Reservas</option>
              </select>
              <div
                ref={previewFrame}
                className="web-preview-frame"
                style={{ height: previewSize.height }}
              >
                <iframe
                  ref={iframe}
                  title="Vista previa de tu web"
                  src={`${siteUrl.replace(/\/$/, "")}${previewPath}?editorPreview=1`}
                  onLoad={sendPreview}
                  style={{
                    width: mobile ? 390 : 1280,
                    height:
                      previewSize.height /
                      (previewSize.width / (mobile ? 390 : 1280)),
                    transform: `scale(${previewSize.width / (mobile ? 390 : 1280)})`,
                  }}
                />
              </div>
            </aside>
          )}
        </div>
      )}
      <Dialog
        open={!!library}
        onOpenChange={(open) => {
          if (!open && uploadProgress === null) setLibrary(null);
        }}
      >
        <DialogContent className="web-library-dialog">
          <DialogHeader>
            <DialogTitle>
              {library?.video ? "Elegir video" : "Elegir imagen"}
            </DialogTitle>
            <DialogDescription>
              Los archivos quedan guardados en tu biblioteca. Seleccioná uno
              para usarlo en esta sección.
            </DialogDescription>
          </DialogHeader>
          <div className="web-library-toolbar">
            <input
              aria-label="Buscar archivos"
              placeholder="Buscar en la biblioteca…"
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
            />
            <input
              ref={fileInput}
              type="file"
              hidden
              accept={
                library?.video
                  ? "video/mp4,video/webm"
                  : "image/jpeg,image/png,image/webp"
              }
              onChange={(e) => {
                if (e.target.files?.[0]) void upload(e.target.files[0]);
              }}
            />
            <button
              className="brand-button"
              type="button"
              disabled={uploadProgress !== null}
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={16} />
              Subir {library?.video ? "video" : "foto"}
            </button>
          </div>
          {uploadProgress !== null && (
            <p role="status">
              {uploadProgress === 100
                ? "Procesando archivo…"
                : `Cargando ${uploadProgress}%…`}
            </p>
          )}
          {error && (
            <p className="web-message error" role="alert">
              {error}
            </p>
          )}
          <div className="web-library-grid">
            {list.map((file) => (
              <button
                type="button"
                disabled={uploadProgress !== null}
                key={file.id}
                className="web-library-item"
                onClick={() => {
                  if (library) update(library.path, file.url);
                  setLibrary(null);
                }}
              >
                {file.mime.startsWith("image/") ? (
                  <img
                    src={absolute(file.url)}
                    alt={file.name}
                    loading="lazy"
                  />
                ) : (
                  <div className="web-media-empty">
                    <Monitor size={32} />
                    <span>Video</span>
                  </div>
                )}
                <span>{file.name}</span>
              </button>
            ))}
          </div>
          {!list.length && (
            <p>
              Tu biblioteca está lista para recibir el primer{" "}
              {library?.video ? "video" : "archivo"}.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
