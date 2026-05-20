"use client";

import { useState, useEffect, useRef } from "react";
import { Microscope, RefreshCcw } from "lucide-react";
import { clsx } from "clsx";
import { supabase } from "@/lib/supabase";
import Watermark from "@/components/Watermark";

interface Props {
  src: string;
  alt: string;
  /** Classes applied to the <img>. The caller must provide a positioned (`relative`) parent that sizes the image. */
  className?: string;
  /** When provided, renders the email watermark once the image has actually painted. */
  email?: string;
  /** Optional label shown in the fallback panel (e.g. card diagnosis) so the card is still studiable. */
  fallbackLabel?: string;
  loading?: "eager" | "lazy";
  /** Optional onLoad passthrough for callers that need to fade in surrounding chrome. */
  onLoaded?: () => void;
}

function extractSupabaseStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|authenticated|sign)\/slide-images\/(.+?)(?:\?|$)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function withCacheBust(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}_cb=${Date.now()}`;
}

/**
 * Robust slide-image renderer. Replaces raw <img> tags throughout the app.
 *
 * Failure modes it survives:
 *  - Stale browser cache from an old deploy serving a 0-byte response
 *  - Supabase signed URL expiry (auto re-signs)
 *  - Transient network blips (one cache-bust retry)
 *  - True missing asset (renders an in-app fallback panel — no external service)
 *
 * Never shows a watermark on top of an unloaded image, so users never see
 * a "dark void with floating emails" if the image fails.
 */
const LOAD_TIMEOUT_MS = 12_000;

export default function SlideImage({
  src,
  alt,
  className,
  email,
  fallbackLabel,
  loading = "eager",
  onLoaded,
}: Props) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [state, setState] = useState<"loading" | "loaded" | "failed">(src ? "loading" : "failed");
  const attemptsRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Hard timeout — if the browser never fires onLoad/onError (slow network,
  // certain proxies, browser bugs), treat the load as failed so the user
  // never sees a perpetual loading skeleton.
  useEffect(() => {
    if (state !== "loading") {
      clearLoadTimeout();
      return;
    }
    clearLoadTimeout();
    timeoutRef.current = setTimeout(() => { void recover(); }, LOAD_TIMEOUT_MS);
    return clearLoadTimeout;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, currentSrc]);

  useEffect(() => {
    attemptsRef.current = 0;
    setCurrentSrc(src);
    setState(src ? "loading" : "failed");
  }, [src]);

  const recover = async () => {
    clearLoadTimeout();
    if (!src) {
      setState("failed");
      return;
    }
    attemptsRef.current += 1;
    if (attemptsRef.current > 2) {
      setState("failed");
      return;
    }

    // First retry: if it's a Supabase signed URL that may have expired, re-sign it.
    const path = attemptsRef.current === 1 ? extractSupabaseStoragePath(src) : null;
    if (path) {
      try {
        const { data } = await supabase.storage
          .from("slide-images")
          .createSignedUrl(path, 3600);
        if (data?.signedUrl) {
          setCurrentSrc(data.signedUrl);
          return;
        }
      } catch {
        // fall through to cache-bust
      }
    }

    // Otherwise (or if re-signing failed): bust caches and try the original URL again.
    setCurrentSrc(withCacheBust(src));
  };

  const handleManualRetry = () => {
    attemptsRef.current = 0;
    setState("loading");
    setCurrentSrc(withCacheBust(src));
  };

  if (state === "failed") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-center px-6 z-10">
        <Microscope className="w-10 h-10 text-slate-500 mb-3" />
        <p className="text-slate-200 text-sm font-semibold">Slide image unavailable</p>
        {fallbackLabel && (
          <p className="text-slate-400 text-xs mt-1.5 max-w-xs line-clamp-2">{fallbackLabel}</p>
        )}
        {src && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleManualRetry(); }}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200"
          >
            <RefreshCcw className="w-3 h-3" /> Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {state === "loading" && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 animate-pulse pointer-events-none"
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        className={clsx(className, state === "loading" && "opacity-0")}
        onLoad={(e) => {
          const img = e.currentTarget;
          // Some stale-cache / mid-deploy responses come back as 0-byte 200s.
          // Treat those as failures so we can retry instead of silently rendering a blank.
          if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            void recover();
            return;
          }
          setState("loaded");
          onLoaded?.();
        }}
        onError={() => { void recover(); }}
      />
      {email && state === "loaded" && <Watermark email={email} />}
    </>
  );
}
