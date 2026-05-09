"use client";

// Progressive image loader: shows blurred thumbnail immediately,
// swaps to full-res silently once loaded. Zero layout shift.

import { useState, useEffect, useRef } from "react";
import clsx from "clsx";

interface Props {
  thumbUrl: string | null;
  fullUrl: string | null;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

export default function ProgressiveSlide({ thumbUrl, fullUrl, alt, className, onLoad }: Props) {
  const [stage, setStage] = useState<"thumb" | "full" | "error">("thumb");
  const fullRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!fullUrl) return;
    setStage("thumb");

    const img = new Image();
    img.onload = () => {
      setStage("full");
      onLoad?.();
    };
    img.onerror = () => setStage("error");
    img.src = fullUrl;
  }, [fullUrl, onLoad]);

  const src = stage === "full" ? fullUrl : thumbUrl;

  if (!src) {
    return (
      <div className={clsx("bg-slate-800 flex items-center justify-center", className)}>
        <span className="text-slate-500 text-xs">No preview</span>
      </div>
    );
  }

  return (
    <div className={clsx("relative overflow-hidden", className)}>
      {/* Thumb shown as blurred placeholder until full loads */}
      {thumbUrl && stage !== "full" && (
        <img
          src={thumbUrl}
          alt={alt}
          className="absolute inset-0 w-full h-full object-contain blur-sm scale-105 transition-opacity"
        />
      )}

      {/* Full-res image — invisible until loaded */}
      <img
        ref={fullRef}
        src={src}
        alt={alt}
        className={clsx(
          "w-full h-full object-contain transition-opacity duration-300",
          stage === "full" ? "opacity-100" : "opacity-0"
        )}
      />

      {stage === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <span className="text-red-400 text-xs">Failed to load</span>
        </div>
      )}
    </div>
  );
}
