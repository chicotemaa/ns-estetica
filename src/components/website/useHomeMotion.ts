"use client";

import { useEffect, type RefObject } from "react";

const targets =
  ".section-heading, .visual-treatment-copy, .treatment-card, .about-visual, .about-copy, .experience-top, .experience-step, .location-strip, .booking-intro, .contact-intro, .service-grid > figure, .editable-title";

/** Content stays visible without JavaScript; each section animates only once. */
export function useHomeMotion(rootRef: RefObject<HTMLDivElement>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.IntersectionObserver || !Element.prototype.animate)
      return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hero = root.querySelector<HTMLElement>('.hero');
    let frame = 0;
    const scroll = () => {
      cancelAnimationFrame(frame);
      if (preference.matches || !hero) return;
      const rect = hero.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      frame = requestAnimationFrame(() => hero.style.setProperty('--hero-scroll', `${Math.max(-35, Math.min(55, -rect.top * .09))}px`));
    };
    window.addEventListener('scroll', scroll, {passive:true});
    const seen = new WeakSet<Element>();
    const running = new Map<Element, Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (
            preference.matches ||
            entry.target.contains(document.activeElement)
          )
            continue;
          const animation = entry.target.animate(
            [
              { opacity: 0, transform: "translateY(20px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 580,
              delay: (order++ % 3) * 65,
              easing: "cubic-bezier(.22,1,.36,1)",
              fill: "backwards",
            },
          );
          running.set(entry.target, animation);
          animation.onfinish = () => {
            animation.cancel();
            running.delete(entry.target);
          };
        }
      },
      { threshold: 0.06 },
    );
    const register = (element: Element) => {
      const elements = [
        ...(element.matches(targets) ? [element] : []),
        ...Array.from(element.querySelectorAll(targets)),
      ];
      for (const target of elements) {
        if (seen.has(target)) continue;
        seen.add(target);
        if (!preference.matches) observer.observe(target);
      }
    };
    register(root);
    const mutations = new MutationObserver((records) => {
      for (const record of records)
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof Element) register(node);
        }
    });
    mutations.observe(root, { childList: true, subtree: true });
    const stop = () => {
      if (!preference.matches) return;
      cancelAnimationFrame(frame);
      hero?.style.removeProperty('--hero-scroll');
      observer.disconnect();
      running.forEach((animation) => animation.cancel());
      running.clear();
    };
    const focus = (event: FocusEvent) => {
      running.forEach((animation, element) => {
        if (event.target instanceof Node && element.contains(event.target)) {
          animation.cancel();
          running.delete(element);
        }
      });
    };
    preference.addEventListener("change", stop);
    root.addEventListener("focusin", focus);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scroll);
      observer.disconnect();
      mutations.disconnect();
      running.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", stop);
      root.removeEventListener("focusin", focus);
    };
  }, [rootRef]);
}
