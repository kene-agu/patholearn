"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { clsx } from "clsx";

const SHOW_AFTER_PX = 400;

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className={clsx(
        "fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full",
        "bg-primary-600 hover:bg-primary-700 text-white shadow-lg",
        "flex items-center justify-center transition-all duration-200",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
