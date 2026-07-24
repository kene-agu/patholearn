"use client";

import { useEffect } from "react";

/**
 * Progressive-enhancement motion for the landing page. All content is
 * server-rendered and fully visible without this component; on mount it
 * flips the root into `.is-ready` (which arms the hidden-then-rise states)
 * and wires up the IntersectionObservers and nav-scroll border.
 *
 * `prefers-reduced-motion` is honoured entirely in CSS, so this still runs
 * but the transitions it triggers are no-ops.
 */
export default function LandingMotion() {
  useEffect(() => {
    const root = document.getElementById("pl-landing");
    if (!root) return;

    root.classList.add("is-ready");

    const rise = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            rise.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    root.querySelectorAll("[data-rise]").forEach((el) => rise.observe(el));

    const shot = document.getElementById("pl-shot");
    let shotObs: IntersectionObserver | undefined;
    if (shot) {
      shotObs = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              shot.classList.add("in");
              obs.unobserve(e.target);
            }
          });
        },
        { threshold: 0.1 }
      );
      shotObs.observe(shot);
    }

    const nav = document.getElementById("pl-nav");
    const onScroll = () => nav?.classList.toggle("stuck", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      rise.disconnect();
      shotObs?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
