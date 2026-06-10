"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2, Microscope, AlertCircle, Tag, ChevronLeft, WifiOff, Sparkles, MessageCircleQuestion } from "lucide-react";
import { clsx } from "clsx";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/authedFetch";
import { recordAnalysisCompleted } from "@/components/RatingPrompt";
import { recordReferralTrigger } from "@/components/ReferralNudge";
import { getGuestAnalysesLeft, incrementGuestAnalysesUsed, GUEST_FREE_ANALYSES } from "@/lib/guestSession";
import SlideViewer from "./SlideViewer";
import AnalysisPanel from "./AnalysisPanel";
import FollowUpQuestions from "./FollowUpQuestions";
import ImageQualityTip from "./ImageQualityTip";
import type { AnalysisResult } from "@/types/analysis";

interface SlideAnalyzerProps {
  preloadedImage?:  string | null;
  diagnosisContext?: string | null;
  user?:            User | null;
  onLoginRequest?:  (reason?: string) => void;
  onClear?:         () => void;
  previousTab?:     string | null;
  canUseInfographics?: boolean;
}

const GUEST_LIMIT_MESSAGE =
  "You've used your free analyses — create a free account to keep analyzing and to save your work.";

// Build an ordered list of URLs to try when loading an external slide image.
// Wikimedia throttles datacenter IPs (our Vercel proxy) but serves browsers
// directly via permissive CORS, so we try the user's browser first (and a
// smaller thumbnail), falling back to the proxy. First one that works wins.
function wikimediaThumb(url: string, width = 1024): string | null {
  // original: …/wikipedia/commons/c/c0/FILE
  // thumb:    …/wikipedia/commons/thumb/c/c0/FILE/{width}px-FILE
  const m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f])\/([0-9a-f]{2})\/(.+)$/);
  if (!m) return null;
  const [, base, a, ab, file] = m;
  return `${base}/thumb/${a}/${ab}/${file}/${width}px-${file}`;
}

function imageFetchCandidates(url: string): string[] {
  if (!url.startsWith("http")) return [url];          // local /slides/… path
  if (url.includes("supabase.co")) return [url];      // signed storage URL
  const proxied = (u: string) => `/api/proxy-image?url=${encodeURIComponent(u)}`;
  if (url.includes("wikimedia.org")) {
    const thumb = wikimediaThumb(url);
    const list: string[] = [];
    // Proxied ORIGINAL first: same-origin (no CORS), CDN-cached for 7 days, and
    // it's the exact URL we've confirmed resolves — so it's the safe default.
    // The thumbnail variants are smaller/faster but unverified, so they come
    // after as opportunistic speedups, with browser-direct as the last resort.
    list.push(proxied(url));              // 1. original via proxy (known-good, same-origin)
    if (thumb) list.push(proxied(thumb)); // 2. thumbnail via proxy (smaller, if it exists)
    list.push(url);                       // 3. original browser-direct (CORS fallback)
    if (thumb) list.push(thumb);          // 4. thumbnail browser-direct
    return list;
  }
  return [proxied(url)];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

// Per-attempt cap. Generous because the proxy may have to pull from Wikimedia
// on a cold cache (Wikimedia throttles datacenter IPs); after the first success
// the CDN serves it instantly.
const SLIDE_FETCH_TIMEOUT_MS = 20_000;

// ── Image compression helper ──────────────────────────────────────────────────
// Targets 768px max (Gemini's internal tile size) at JPEG 0.78 quality.
// Then enforces a 400 KB base64 hard cap — re-compresses at lower quality
// until under the limit. Keeps API costs low regardless of upload size.
function compressImage(
  dataUrl: string,
  maxPx = 768,
  quality = 0.78
): Promise<{ base64: string; dataUrl: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxPx / Math.max(w, h));
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);

      const canvas = document.createElement("canvas");
      canvas.width  = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, cw, ch);

      // Hard cap: 400 KB base64 (~300 KB actual). Re-compress if needed.
      const MAX_B64 = 400 * 1024;
      let q = quality;
      let compressed = canvas.toDataURL("image/jpeg", q);
      while (compressed.length > MAX_B64 && q > 0.4) {
        q = Math.round((q - 0.08) * 100) / 100;
        compressed = canvas.toDataURL("image/jpeg", q);
      }

      resolve({
        dataUrl:   compressed,
        base64:    compressed.split(",")[1],
        mediaType: "image/jpeg",
      });
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}

// ── Tiled inference helper ────────────────────────────────────────────────────
// Only tiles images that are large enough to benefit (shortest side ≥ 800px).
// Each tile targets 768px at JPEG 0.70 with the same 400 KB hard cap.
// Quadrant order: [top-left, top-right, bottom-left, bottom-right].
function createTiles(
  rawDataUrl: string,
  tileMaxPx = 768,
  quality = 0.70
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      // Skip tiling for small images — it adds cost without adding detail.
      if (Math.min(w, h) < 800) { resolve([]); return; }

      const halfW = Math.floor(w / 2);
      const halfH = Math.floor(h / 2);
      const MAX_B64 = 400 * 1024;

      const quadrants: Array<[number, number]> = [
        [0,     0    ],
        [halfW, 0    ],
        [0,     halfH],
        [halfW, halfH],
      ];

      try {
        const tiles = quadrants.map(([sx, sy]) => {
          const scale = Math.min(1, tileMaxPx / Math.max(halfW, halfH));
          const dw = Math.round(halfW * scale);
          const dh = Math.round(halfH * scale);

          const canvas = document.createElement("canvas");
          canvas.width = dw;
          canvas.height = dh;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas unavailable");
          ctx.drawImage(img, sx, sy, halfW, halfH, 0, 0, dw, dh);

          let q = quality;
          let dataUrl = canvas.toDataURL("image/jpeg", q);
          while (dataUrl.length > MAX_B64 && q > 0.4) {
            q = Math.round((q - 0.08) * 100) / 100;
            dataUrl = canvas.toDataURL("image/jpeg", q);
          }
          return dataUrl.split(",")[1];
        });
        resolve(tiles);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image for tiling"));
    img.src = rawDataUrl;
  });
}

export default function SlideAnalyzer({ preloadedImage, diagnosisContext, user, onLoginRequest, onClear, previousTab, canUseInfographics = true }: SlideAnalyzerProps) {
  const [imageUrl,    setImageUrl]    = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [rawDataUrl,  setRawDataUrl]  = useState<string | null>(null);
  const [mediaType,   setMediaType]   = useState<string>("image/jpeg");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [analysis,    setAnalysis]    = useState<AnalysisResult | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [usedModel,   setUsedModel]   = useState<string | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [userLabel,        setUserLabel]        = useState<string>("");
  const [retryNonce,       setRetryNonce]       = useState(0);

  const isGuest = !user;
  const [guestLeft, setGuestLeft] = useState(GUEST_FREE_ANALYSES);
  useEffect(() => {
    if (isGuest) setGuestLeft(getGuestAnalysesLeft());
  }, [isGuest, analysis]);

  // Load preloaded image from library
  useEffect(() => {
    if (!preloadedImage) return;

    setAnalysis(null);
    setError(null);
    setImageUrl(null);
    setIsLoading(true);

    // `cancelled` guards against a superseded load (new slide / retry / unmount).
    let cancelled = false;
    const candidates = imageFetchCandidates(preloadedImage);

    // Fetch one candidate with its own per-attempt timeout. Resolves to a Blob,
    // or null if this candidate failed/timed out (so we can try the next).
    const tryFetch = async (src: string): Promise<Blob | null> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SLIDE_FETCH_TIMEOUT_MS);
      try {
        const r = await fetch(src, { signal: controller.signal });
        if (!r.ok) return null;
        const blob = await r.blob();
        return blob.size > 0 ? blob : null;
      } catch {
        return null; // network error / abort / CORS — caller advances to next candidate
      } finally {
        clearTimeout(timer);
      }
    };

    (async () => {
      let blob: Blob | null = null;
      for (const src of candidates) {
        if (cancelled) return;
        blob = await tryFetch(src);
        if (blob) break;
      }
      if (cancelled) return;

      if (!blob) {
        setError(
          "We couldn’t open this slide right now — the image source isn’t responding. " +
          "Please tap “Try again”, pick another slide, or upload an image instead."
        );
        setIsLoading(false);
        return;
      }

      try {
        const raw = await blobToDataUrl(blob);
        if (cancelled) return;
        setRawDataUrl(raw);
        try {
          const { dataUrl, base64, mediaType: mt } = await compressImage(raw);
          if (cancelled) return;
          setImageUrl(dataUrl);
          setImageBase64(base64);
          setMediaType(mt);
        } catch {
          // Compression failed — fall back to original (may still be large)
          if (cancelled) return;
          setImageUrl(raw);
          setImageBase64(raw.split(",")[1]);
          setMediaType(blob.type || "image/jpeg");
        }
      } catch {
        if (cancelled) return;
        setError("We couldn’t read this slide image. Please try again, or upload one instead.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [preloadedImage, retryNonce]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setAnalysis(null);
    setError(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target?.result as string;
      setRawDataUrl(raw);
      try {
        const { dataUrl, base64, mediaType: mt } = await compressImage(raw);
        setImageUrl(dataUrl);
        setImageBase64(base64);
        setMediaType(mt);
      } catch {
        setImageUrl(raw);
        setImageBase64(raw.split(",")[1]);
        setMediaType(file.type || "image/jpeg");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".tiff", ".bmp", ".webp"] },
    multiple: false,
  });

  const handleAnalyze = async () => {
    if (!imageBase64) return;

    // Guest budget check — prompt sign-up instead of burning a failed call.
    if (isGuest && getGuestAnalysesLeft() <= 0) {
      onLoginRequest?.(GUEST_LIMIT_MESSAGE);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      // Generate 4 quadrant tiles for tiled inference — each at up to 2x
      // the detail of the overview, so the model can examine regions closely.
      let tiles: string[] | undefined;
      if (rawDataUrl) {
        try {
          tiles = await createTiles(rawDataUrl);
        } catch {
          // Non-fatal — fall back to single-image analysis
          tiles = undefined;
        }
      }

      const res = await authedFetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ imageBase64, mediaType, tiles, diagnosisContext: effectiveContext }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Guest hit the free limit — surface the sign-up prompt, not an error.
        if (data.guestLimitReached) {
          onLoginRequest?.(GUEST_LIMIT_MESSAGE);
          return;
        }
        throw new Error(data.error || "Analysis failed");
      }
      const modelLabel = data.pipeline === "groq" ? "Fallback pipeline"
        : data.pipeline === "dual" ? "Multi-model pipeline"
        : "Primary pipeline";
      setUsedModel(modelLabel);
      setAnalysis(data.analysis);
      if (isGuest) {
        incrementGuestAnalysesUsed();
        setGuestLeft(getGuestAnalysesLeft());
      }
      recordAnalysisCompleted();
      recordReferralTrigger("slide");

      // Note: analysis is NOT auto-saved. User clicks "Save to Flashcards"
      // explicitly from the AnalysisPanel so they can see success/errors.
    } catch (err) {
      const msg = err instanceof TypeError && (err as TypeError).message === "Failed to fetch"
        ? "No internet connection. Please check your network and try again."
        : err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setImageUrl(null);
    setImageBase64(null);
    setRawDataUrl(null);
    setAnalysis(null);
    setError(null);
    setActiveAnnotation(null);
    setUserLabel("");
    onClear?.();
  };

  // User-typed label takes priority over library context
  const effectiveContext = userLabel.trim() || diagnosisContext || undefined;

  // ── No image yet (or still loading) ──────────────────────────────────────
  if (!imageUrl) {
    return (
      <div>
        {!isLoading && error && (
          <div className="mb-4 flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/40 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{error}</p>
              {preloadedImage && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setError(null); setRetryNonce((n) => n + 1); }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:underline"
                >
                  <Loader2 className="w-3 h-3" /> Try again
                </button>
              )}
            </div>
          </div>
        )}
        {!isLoading && <ImageQualityTip />}
        <div
          {...getRootProps()}
          className={clsx(
            "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-150",
            isDragActive
              ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20"
              : "border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-4">
            {isLoading
              ? <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              : <Upload className="w-8 h-8 text-primary-500" />}
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
            {isLoading
              ? "Loading slide…"
              : isDragActive
              ? "Drop your slide here"
              : "Upload a Histopathology Slide"}
          </h3>
          {!isLoading && (
            <>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Drag & drop or click to browse</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs">Supports JPG, PNG, TIFF, BMP, WebP</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const backLabel: Record<string, string> = {
    library: "Slide Library",
    cases:   "My Cases",
    analyze: "Analyzer",
  };

  // ── Image loaded ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Back breadcrumb */}
      {previousTab && (
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {backLabel[previousTab] ?? previousTab}
        </button>
      )}

      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
            <Microscope className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Slide Loaded</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {effectiveContext ? effectiveContext.split("—")[0].trim() : "Ready for AI analysis"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleClear} className="btn-ghost text-sm flex items-center gap-1.5">
            <X className="w-4 h-4" /> Clear
          </button>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Microscope className="w-4 h-4" /> {analysis ? "Re-Analyze" : "Analyze Slide"}</>
            )}
          </button>
        </div>
      </div>

      {/* Guest free-analysis hint */}
      {isGuest && (
        <div className="flex items-center gap-2 text-xs rounded-xl border border-primary-100 dark:border-primary-900/40 bg-primary-50/60 dark:bg-primary-900/10 px-3 py-2 text-slate-600 dark:text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
          <span>
            {guestLeft > 0
              ? <>You have <strong>{guestLeft}</strong> free {guestLeft === 1 ? "analysis" : "analyses"} left today.</>
              : <>You&apos;ve used your free analyses for today.</>}{" "}
            <button
              onClick={() => onLoginRequest?.(GUEST_LIMIT_MESSAGE)}
              className="font-semibold text-primary-600 hover:underline"
            >
              Sign up free
            </button>{" "}
            to save your work and keep going.
          </span>
        </div>
      )}

      {/* Known diagnosis input */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5">
              Slide label / known diagnosis
              <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">(optional)</span>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
              If your slide already has a label, type it here — the AI will explain the features rather than guess.
            </p>
            <input
              type="text"
              value={userLabel}
              onChange={(e) => setUserLabel(e.target.value)}
              placeholder="e.g. Squamous Cell Carcinoma, Normal Liver, Chronic Gastritis…"
              className="input w-full text-sm"
              disabled={isAnalyzing}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm">
          {error.startsWith("No internet") ? <WifiOff className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {error}
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Canvas */}
        <div className="xl:col-span-3">
          <SlideViewer
            imageUrl={imageUrl}
            annotations={analysis?.annotations ?? []}
            activeAnnotation={activeAnnotation}
            onAnnotationClick={setActiveAnnotation}
            watermarkText={user?.email ?? undefined}
          />
        </div>

        {/* Analysis panel */}
        <div className="xl:col-span-2">
          {isAnalyzing ? (
            <div className="card h-full min-h-[400px] space-y-4 p-5">
              {/* Skeleton — mimics diagnosis + sections */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
              <div className="h-px bg-slate-100" />
              {[80, 60, 90, 50, 70].map((w, i) => (
                <div key={i} className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }} />
              ))}
              <div className="h-px bg-slate-100 mt-2" />
              {[65, 85, 55].map((w, i) => (
                <div key={i} className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${w}%`, animationDelay: `${(i + 5) * 80}ms` }} />
              ))}
              <div className="mt-auto pt-4 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin" />
                <span className="text-xs text-slate-400">Analysing image…</span>
              </div>
            </div>
          ) : analysis ? (
            <>
              {usedModel && (
                <div className="flex justify-end px-1 mb-1">
                  <span
                    title={usedModel}
                    className={`w-2.5 h-2.5 rounded-full cursor-default ${usedModel.includes("Fallback") ? "bg-amber-400" : "bg-emerald-400"}`}
                  />
                </div>
              )}
              <AnalysisPanel
                analysis={analysis}
                activeAnnotation={activeAnnotation}
                onAnnotationSelect={setActiveAnnotation}
                user={user ?? null}
                rawDataUrl={rawDataUrl}
                preloadedImageUrl={preloadedImage ?? null}
                slideLabel={effectiveContext ?? null}
                diagnosisContext={diagnosisContext ?? null}
                canUseInfographics={canUseInfographics}
                onAuthRequired={(reason) => onLoginRequest?.(reason)}
              />
            </>
          ) : (
            <div className="card h-full flex flex-col items-center justify-center gap-3 min-h-[400px] text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                <Microscope className="w-7 h-7 text-slate-300" />
              </div>
              <p className="font-medium text-slate-400">No analysis yet</p>
              <p className="text-sm text-slate-400">Click &ldquo;Analyze Slide&rdquo; to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Follow-up questions — gated for guests (extra AI cost) */}
      {analysis && (user ? (
        <FollowUpQuestions
          imageBase64={imageBase64!}
          mediaType={mediaType}
          analysis={analysis}
          diagnosisContext={effectiveContext}
        />
      ) : (
        <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
            <MessageCircleQuestion className="w-5 h-5 text-primary-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Want to dig deeper?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Create a free account to ask the AI follow-up questions about this slide.</p>
          </div>
          <button
            onClick={() => onLoginRequest?.("Create a free account to ask follow-up questions about your slides.")}
            className="btn-primary text-sm flex items-center gap-1.5 flex-shrink-0"
          >
            <Sparkles className="w-4 h-4" /> Sign up free
          </button>
        </div>
      ))}
    </div>
  );
}
