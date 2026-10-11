"use client";
/* eslint-disable @next/next/no-img-element */
import { useLayoutEffect, useRef, useState } from "react";
import type { CatalogService } from "@/lib/public-site";
import { isGeneratedImage, serviceImage } from "@/lib/service-images";
import ZoneEstimate from "@/components/booking/ZoneEstimate";
import VisualImage from "./VisualImage";

const categories: Record<string, string> = {
  corte: "Facial",
  coloraciones: "Corporal",
  tratamiento: "Manos y pies",
};
const money = (amount: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function carryImage(image: HTMLImageElement, from: DOMRect, to: DOMRect) {
  if (reduced() || !image.animate || !from.width || !to.width) return;
  const clone = image.cloneNode() as HTMLImageElement;
  clone.alt = "";
  clone.setAttribute("aria-hidden", "true");
  Object.assign(clone.style, {
    position: "fixed",
    left: `${to.left}px`,
    top: `${to.top}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
    objectFit: "cover",
    zIndex: "2",
    pointerEvents: "none",
    margin: "0",
  });
  image.closest("dialog")?.append(clone);
  const animation = clone.animate(
    [
      {
        transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width},${from.height / to.height})`,
        transformOrigin: "0 0",
        clipPath: "inset(0 round 14px)",
      },
      {
        transform: "translate(0,0) scale(1)",
        transformOrigin: "0 0",
        clipPath: "inset(0 round 0px)",
      },
    ],
    { duration: 620, easing: "cubic-bezier(.16,1,.3,1)" },
  );
  const remove = () => clone.remove();
  animation.onfinish = remove;
  animation.oncancel = remove;
  return () => {
    animation.cancel();
    remove();
  };
}
function ServiceFacts({ service }: { service: CatalogService }) {
  if (service.zonePricing)
    return <ZoneEstimate serviceId={service.id} config={service.zonePricing} />;
  if (service.variants && service.variants.length > 1)
    return (
      <ul className="treatment-variants">
        {service.variants.map((v) => (
          <li key={v.id}>
            <span>
              {v.name}
              {v.durationMinutes ? ` · ${v.durationMinutes} min` : ""}
            </span>
            <strong>{money(v.price)}</strong>
          </li>
        ))}
      </ul>
    );
  return (
    <div className="treatment-facts">
      <strong>{money(service.price)}</strong>
      <span>
        {service.durationMinutes
          ? `${service.durationMinutes} minutos`
          : "Duración a consultar"}
      </span>
    </div>
  );
}
export default function ServiceExperience({
  services,
  title,
  onChoose,
}: {
  services?: CatalogService[];
  title: string;
  onChoose: (id: string) => void;
}) {
  const [category, setCategory] = useState("all"),
    [active, setActive] = useState<CatalogService | null>(null),
    [photo, setPhoto] = useState("");
  const grid = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    detailImage = useRef<HTMLDivElement>(null);
  const origin = useRef<{ rect: DOMRect; button: HTMLButtonElement } | null>(
    null,
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ordered = [...(services || [])].sort(
    (a, b) => Number(!!b.featured) - Number(!!a.featured),
  );
  const label = (s: CatalogService) =>
    s.zonePricing
      ? "Depilación"
      : categories[s.category || ""] || "Otros tratamientos";
  const groups = Array.from(new Set(ordered.map(label)));
  const visible = ordered.filter(
    (s) => category === "all" || label(s) === category,
  );
  const pictures = active
    ? Array.from(new Set([serviceImage(active), ...(active.gallery || [])]))
    : [];
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!active || !element) return;
    element.showModal();
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const img = detailImage.current?.querySelector("img");
    const cancel =
      img && origin.current
        ? carryImage(img, origin.current.rect, img.getBoundingClientRect())
        : undefined;
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      cancel?.();
      document.body.style.overflow = priorOverflow;
      element.close();
      origin.current?.button.focus({ preventScroll: true });
    };
  }, [active]);
  function close() {
    if (closeTimer.current) return;
    const image = detailImage.current?.querySelector("img");
    if (image && origin.current && !reduced()) {
      carryImage(image, image.getBoundingClientRect(), origin.current.rect);
      closeTimer.current = setTimeout(() => setActive(null), 620);
    } else setActive(null);
  }
  function open(service: CatalogService, button: HTMLButtonElement) {
    const img = button.querySelector("img");
    origin.current = { rect: (img || button).getBoundingClientRect(), button };
    setPhoto(serviceImage(service));
    setActive(service);
  }
  function filter(value: string) {
    const old = new Map(
      Array.from(
        grid.current?.querySelectorAll<HTMLElement>("[data-service]") || [],
      ).map((el) => [el.dataset.service, el.getBoundingClientRect()]),
    );
    setCategory(value);
    requestAnimationFrame(() => {
      if (reduced()) return;
      grid.current
        ?.querySelectorAll<HTMLElement>("[data-service]")
        .forEach((el) => {
          const previous = old.get(el.dataset.service),
            next = el.getBoundingClientRect();
          if (previous)
            el.animate(
              [
                {
                  transform: `translate(${previous.left - next.left}px,${previous.top - next.top}px)`,
                },
                { transform: "translate(0,0)" },
              ],
              { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" },
            );
        });
    });
  }
  function choose() {
    if (!active) return;
    onChoose(active.id);
    setActive(null);
    requestAnimationFrame(() =>
      document
        .getElementById("reservas")
        ?.scrollIntoView({ behavior: reduced() ? "instant" : "smooth" }),
    );
  }
  function openFromCopy(service: CatalogService, button: HTMLButtonElement) {
    const trigger = button
      .closest("article")
      ?.querySelector<HTMLButtonElement>(".treatment-image-button");
    if (trigger) open(service, trigger);
  }
  return (
    <section
      id="services"
      className="services-section section-pad visual-catalog"
    >
      <div className="section-heading">
        <h2>{title}</h2>
        <p>
          Un momento para tu piel.
          <br />
          Un respiro para tu cuerpo.
          <br />
          Elegí cómo querés cuidarte.
        </p>
      </div>
      {groups.length > 1 && (
        <div className="catalog-filters" aria-label="Filtrar tratamientos">
          {["all", ...groups].map((group) => (
            <button
              type="button"
              key={group}
              aria-pressed={category === group}
              onClick={() => filter(group)}
            >
              {group === "all" ? "Todos los tratamientos" : group}
            </button>
          ))}
        </div>
      )}
      <div ref={grid} className="visual-treatment-grid">
        {visible.map((service, i) => (
          <article
            key={service.id}
            data-service={service.id}
            className={`visual-treatment ${service.featured || i === 0 ? "is-featured" : ""} ${service.zonePricing ? "is-laser" : ""}`}
          >
            <button
              className="treatment-image-button"
              type="button"
              aria-label={`Ver ${service.name}`}
              onClick={(event) => open(service, event.currentTarget)}
            >
              <VisualImage
                src={serviceImage(service)}
                alt={`Imagen ilustrativa de ${service.name}`}
                position={service.imagePosition || "50% 50%"}
              >
                {isGeneratedImage(serviceImage(service)) && (
                  <span className="photo-credit">Imagen ilustrativa</span>
                )}
              </VisualImage>
            </button>
            <div className="visual-treatment-copy">
              <span className="treatment-category">{label(service)}</span>
              <h3>
                <button
                  type="button"
                  onClick={(event) =>
                    openFromCopy(service, event.currentTarget)
                  }
                >
                  {service.name}
                </button>
              </h3>
              <p>
                {service.description ||
                  "Consultanos para conocer los detalles de este tratamiento."}
              </p>
              <div className="visual-treatment-footer">
                <span>
                  {service.zonePricing
                    ? `Desde ${money(service.price)}`
                    : money(service.price)}
                </span>
                <span>
                  {service.durationMinutes
                    ? `${service.durationMinutes} min`
                    : "Consultar duración"}
                </span>
                <button
                  type="button"
                  onClick={(event) =>
                    openFromCopy(service, event.currentTarget)
                  }
                >
                  {service.zonePricing ? "Elegir zonas" : "Ver detalle"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <p role="status">
          {services
            ? "Próximamente vas a encontrar nuestros tratamientos acá."
            : "No pudimos cargar los tratamientos. Actualizá la página o escribinos para consultar."}
        </p>
      )}
      <dialog
        ref={dialog}
        className="treatment-detail"
        aria-labelledby="treatment-detail-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        {active && (
          <div className="treatment-detail-layout">
            <button
              className="detail-close"
              type="button"
              aria-label="Cerrar detalle"
              onClick={close}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
            <div className="detail-visual">
              <div ref={detailImage} className="detail-main-image">
                <VisualImage
                  key={photo}
                  src={photo}
                  alt={`Imagen ilustrativa de ${active.name}`}
                  position={active.imagePosition || "50% 50%"}
                  eager
                />
              </div>
              {pictures.length > 1 && (
                <div
                  className="detail-gallery"
                  aria-label="Galería del tratamiento"
                >
                  {pictures.map((src, i) => (
                    <button
                      type="button"
                      key={src}
                      aria-label={`Ver imagen ${i + 1}`}
                      aria-pressed={photo === src}
                      onClick={() => setPhoto(src)}
                    >
                      <img src={src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              <span className="detail-image-note">
                {isGeneratedImage(photo)
                  ? "Imagen generada · Ilustrativa"
                  : "Imagen ilustrativa del tratamiento"}
              </span>
            </div>
            <div className="detail-copy">
              <span className="treatment-category">{label(active)}</span>
              <h2 id="treatment-detail-title">{active.name}</h2>
              <p>
                {active.description ||
                  "Consultanos para conocer los detalles de este tratamiento."}
              </p>
              <ServiceFacts service={active} />
              <div className="detail-reserve">
                {active.bookingEnabled !== false ? (
                  <button
                    type="button"
                    className="button-primary"
                    onClick={choose}
                  >
                    Reservar este tratamiento{" "}
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </button>
                ) : (
                  <a
                    className="button-primary"
                    href="#contact"
                    onClick={() => setActive(null)}
                  >
                    Consultar disponibilidad
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
