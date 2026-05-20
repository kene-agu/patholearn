"use client";

// Progressive image loader: shows blurred thumbnail immediately,
// swaps to full-res silently once loaded. Zero layout shift.

import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import { Microscope, RefreshCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  thumbUrl: string | null;
  fullUrl: string | null;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

function extractSupabaseStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|authenticated|sign)\/slide-images\/(.+?)(?:\?|$)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function withCacheBust(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_cb=${Date.now()}`;
}

export default function ProgressiveSlide({ thumbUrl, fullUrl, alt, className, onLoad }: Props) {
  const [stage, setStage] = useState<"thumb" | "full" | "error">("thumb");
  const [effectiveFullUrl, setEffectiveFullUrl] = useState<string | null>(fullUrl);
  const attemptsRef = useRef(0);
  const fullRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!fullUrl) return;
    attemptsRef.current = 0;
    setEffectiveFullUrl(fullUrl);
    setStage("thumb");

    let cancelled = false;

    const tryLoad = async (url: string) => {
      if (cancelled) return;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          void recover();
          return;
        }
        setStage("full");
        onLoad?.();
      };
      img.onerror = () => { void recover(); };
      img.src = url;
    };

    const recover = async () => {
      attemptsRef.current += 1;
      if (attemptsRef.current > 2) {
        setStage("error");
        return;
      }
      const path = attemptsRef.current === 1 ? extractSupabaseStoragePath(fullUrl) : null;
      if (path) {
        try {
          const { data } = await supabase.storage
            .from("slide-images")
            .createSignedUrl(path, 3600);
          if (data?.signedUrl) {
            setEffectiveFullUrl(data.signedUrl);
            void tryLoad(data.signedUrl);
            return;
          }
        } catch {
          // fall through
        }
      }
      const bust = withCacheBust(fullUrl);
      setEffectiveFullUrl(bust);
      void tryLoad(bust);
    };

    void tryLoad(fullUrl);
    return () => { cancelled = true; };
  }, [fullUrl, onLoad]);

  const handleManualRetry = () => {
    if (!fullUrl) return;
    attemptsRef.current = 0;
    setStage("thumb");
    setEffectiveFullUrl(withCacheBust(fullUrl));
  };

  const src = stage === "full" ? effectiveFullUrl : thumbUrl;

  if (!src && stage !== "error") {
    return (
      <div className={clsx("bg-slate-800 flex items-center justify-center", className)}>
        <span className="text-slate-500 text-xs">No preview</span>
      </div>
    );
  }

  return (
    <div className={clsx("relative overflow-hidden", className)}>
      {/* Thumb shown as blurred placeholder until full loads */}
      {thumbUrl && stage !== "full" && stage !== "error" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl}
          alt={alt}
          className="absolute inset-0 w-full h-full object-contain blur-sm scale-105 transition-opacity"
        />
      )}

      {/* Full-res image — invisible until loaded */}
      {stage !== "error" && src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={fullRef}
          src={src}
          alt={alt}
          className={clsx(
            "w-full h-full object-contain transition-opacity duration-300",
            stage === "full" ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {stage === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-center px-4">
          <Microscope className="w-8 h-8 text-slate-500 mb-2" />
          <p className="text-slate-200 text-sm font-semibold">Slide image unavailable</p>
          <p className="text-slate-400 text-xs mt-1 max-w-xs">The image couldn&apos;t be loaded.</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleManualRetry(); }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200"
          >
            <RefreshCcw className="w-3 h-3" /> Try again
          </button>
        </div>
      )}
    </div>
  );
}
