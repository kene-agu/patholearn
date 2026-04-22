"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Loader2, Microscope, AlertCircle, Tag } from "lucide-react";
import { clsx } from "clsx";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import SlideCanvas from "./SlideCanvas";
import AnalysisPanel from "./AnalysisPanel";
import FollowUpQuestions from "./FollowUpQuestions";
import type { AnalysisResult } from "@/types/analysis";

interface SlideAnalyzerProps {
  preloadedImage?:  string | null;
  diagnosisContext?: string | null;
  user?:            User | null;
  onLoginRequest?:  () => void;
  onClear?:         () => void;
}

// ── Image compression helper ──────────────────────────────────────────────────
// Resizes + compresses any image to max 1024px on the longest side at JPEG 0.82
// before encoding to base64 — keeps API payloads well under 1 MB.
function compressImage(
  dataUrl: string,
  maxPx = 1024,
  quality = 0.82
): Promise<{ base64: string; dataUrl: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
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
      const compressed = canvas.toDataURL("image/jpeg", quality);
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

export default function SlideAnalyzer({ preloadedImage, diagnosisContext, user, onLoginRequest, onClear }: SlideAnalyzerProps) {
  const [imageUrl,    setImageUrl]    = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType,   setMediaType]   = useState<string>("image/jpeg");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [analysis,    setAnalysis]    = useState<AnalysisResult | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [userLabel,        setUserLabel]        = useState<string>("");

  // Load preloaded image from library
  useEffect(() => {
    if (!preloadedImage) return;

    setAnalysis(null);
    setError(null);
    setImageUrl(null);
    setIsLoading(true);

    fetch(preloadedImage)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const raw = e.target?.result as string;
          try {
            const { dataUrl, base64, mediaType: mt } = await compressImage(raw);
            setImageUrl(dataUrl);
            setImageBase64(base64);
            setMediaType(mt);
          } catch {
            // Compression failed — fall back to original (may still be large)
            setImageUrl(raw);
            setImageBase64(raw.split(",")[1]);
            setMediaType(blob.type || "image/jpeg");
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        setError("Failed to load the selected slide. Please try uploading it directly.");
        setIsLoading(false);
      });
  }, [preloadedImage]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setAnalysis(null);
    setError(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target?.result as string;
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
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType, diagnosisContext: effectiveContext }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data.analysis);

      // ── Save to study history if user is logged in ────────────────────
      if (user && data.analysis?.diagnosis) {
        await supabase.from("slide_history").insert({
          user_id:      user.id,
          diagnosis:    data.analysis.diagnosis,
          slide_label:  effectiveContext ?? null,
          image_source: diagnosisContext
            ? diagnosisContext.split("—")[0].trim()
            : "upload",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setImageUrl(null);
    setImageBase64(null);
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
      <div
        {...getRootProps()}
        className={clsx(
          "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-150",
          isDragActive
            ? "border-primary-400 bg-primary-50"
            : "border-slate-200 hover:border-primary-300 hover:bg-slate-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
          {isLoading
            ? <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            : <Upload className="w-8 h-8 text-primary-500" />}
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          {isLoading
            ? "Loading slide…"
            : isDragActive
            ? "Drop your slide here"
            : "Upload a Histopathology Slide"}
        </h3>
        {!isLoading && (
          <>
            <p className="text-slate-500 text-sm mb-1">Drag & drop or click to browse</p>
            <p className="text-slate-400 text-xs">Supports JPG, PNG, TIFF, BMP, WebP</p>
          </>
        )}
      </div>
    );
  }

  // ── Image loaded ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <Microscope className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Slide Loaded</h2>
            <p className="text-xs text-slate-500">
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

      {/* Known diagnosis input */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Tag className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 mb-0.5">
              Slide label / known diagnosis
              <span className="ml-2 text-xs font-normal text-slate-400">(optional)</span>
            </p>
            <p className="text-xs text-slate-400 mb-2">
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
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Canvas */}
        <div className="xl:col-span-3">
          <SlideCanvas
            imageUrl={imageUrl}
            annotations={analysis?.annotations ?? []}
            activeAnnotation={activeAnnotation}
            onAnnotationClick={setActiveAnnotation}
          />
        </div>

        {/* Analysis panel */}
        <div className="xl:col-span-2">
          {isAnalyzing ? (
            <div className="card h-full flex flex-col items-center justify-center gap-4 min-h-[400px]">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium text-slate-700">Analysing slide…</p>
                <p className="text-sm text-slate-400 mt-1">AI Vision is examining the tissue</p>
              </div>
            </div>
          ) : analysis ? (
            <AnalysisPanel
              analysis={analysis}
              activeAnnotation={activeAnnotation}
              onAnnotationSelect={setActiveAnnotation}
            />
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

      {/* Follow-up questions */}
      {analysis && (
        <FollowUpQuestions
          imageBase64={imageBase64!}
          mediaType={mediaType}
          analysis={analysis}
          diagnosisContext={effectiveContext}
        />
      )}
    </div>
  );
}
