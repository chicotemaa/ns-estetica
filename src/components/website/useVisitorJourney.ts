"use client";
import {
  useEffect,
  useState,
  type RefObject,
  type Dispatch,
  type SetStateAction,
} from "react";

export function useVisitorJourney(
  rootRef: RefObject<HTMLDivElement>,
  menu: boolean,
  setMenu: Dispatch<SetStateAction<boolean>>,
) {
  const [active, setActive] = useState("inicio");
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height =
          document.documentElement.scrollHeight - window.innerHeight;
        root.style.setProperty(
          "--page-progress",
          String(height > 0 ? Math.min(1, window.scrollY / height) : 0),
        );
      });
    };
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>("main > section[id]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-15% 0px -65% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    const visibility = new Map<Element, boolean>();
    const dock = new IntersectionObserver((entries) => {
      entries.forEach((entry) =>
        visibility.set(entry.target, entry.isIntersecting),
      );
      const hero = root.querySelector(".hero");
      root.dataset.dock =
        hero &&
        !visibility.get(hero) &&
        !Array.from(visibility.values()).some(Boolean)
          ? "visible"
          : "hidden";
    });
    root
      .querySelectorAll(".hero,#reservas,#contact,.site-footer")
      .forEach((element) => dock.observe(element));
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      dock.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef.current;
    if (!menu || !root) return;
    const overflow = document.body.style.overflow;
    const desktop = window.matchMedia("(min-width: 801px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenu(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    document.body.style.overflow = "hidden";
    const surfaces = Array.from(
      root.querySelectorAll<HTMLElement>(
        "main,.site-footer,.mobile-reserve-dock",
      ),
    );
    const previous = surfaces.map((element) => element.inert);
    surfaces.forEach((element) => {
      element.inert = true;
    });
    const toggle = root.querySelector<HTMLButtonElement>(".menu-toggle");
    const frame = requestAnimationFrame(() =>
      root.querySelector<HTMLElement>(".nav-links a")?.focus(),
    );
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        toggle?.focus();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        root.querySelectorAll<HTMLElement>(
          ".site-header a,.site-header button",
        ),
      ).filter((element) => element.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      surfaces.forEach((element, index) => {
        element.inert = previous[index];
      });
      document.removeEventListener("keydown", keys);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [menu, rootRef, setMenu]);
  return active;
}
