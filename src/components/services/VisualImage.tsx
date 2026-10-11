"use client";
/* eslint-disable @next/next/no-img-element */
import { useRef, useEffect, type ReactNode } from "react";
import { ambientImage } from "@/lib/service-images";

export default function VisualImage({
  src,
  alt,
  position = "50% 50%",
  children,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  position?: string;
  children?: ReactNode;
  className?: string;
  eager?: boolean;
}) {
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    const allowed = window.matchMedia(
      "(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)",
    );
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    const move = (event: PointerEvent) => {
      if (!allowed.matches) return;
      const bounds = el.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5,
        y = (event.clientY - bounds.top) / bounds.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${-y * 7}deg`);
        el.style.setProperty("--ry", `${x * 7}deg`);
      });
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", reset);
    allowed.addEventListener("change", reset);
    return () => {
      reset();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", reset);
      allowed.removeEventListener("change", reset);
    };
  }, []);
  return (
    <div ref={surface} className={`visual-image ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: position }}
        onError={(event) => {
          if (event.currentTarget.getAttribute("src") !== ambientImage)
            event.currentTarget.src = ambientImage;
        }}
      />
      {children}
    </div>
  );
}
