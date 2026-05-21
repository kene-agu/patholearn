"use client";

import { useState } from "react";
import {
  CheckCircle, AlertTriangle, FlaskConical, ShieldAlert,
  GitBranch, Stethoscope, Lightbulb, MapPin, ChevronDown, ChevronUp,
  Dna, Microscope, BookmarkPlus, Loader2, Check, Download, GraduationCap,
  XCircle, LayoutTemplate, Crown,
} from "lucide-react";
import { clsx } from "clsx";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/authedFetch";
import type { AnalysisResult } from "@/types/analysis";
import type { InfographicData } from "@/components/InfographicView";

interface AnalysisPanelProps {
  analysis: AnalysisResult;
  activeAnnotation: string | null;
  onAnnotationSelect: (id: string | null) => void;
  user?: User | null;
  rawDataUrl?: string | null;
  preloadedImageUrl?: string | null;
  slideLabel?: string | null;
  diagnosisContext?: string | null;
  canUseInfographics?: boolean;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type InfographicState = "idle" | "loading" | "error";

const confidenceColors: Record<string, string> = {
  High:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low:    "bg-red-50 text-red-700 border-red-200",
};

const SECTION_COLORS = [
  "#38bdf8", "#a78bfa", "#34d399", "#fb923c",
  "#f472b6", "#facc15", "#60a5fa", "#4ade80",
];

const ihcResultColors: Record<string, string> = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  negative: "bg-red-50 text-red-600 border-red-200",
  variable: "bg-amber-50 text-amber-700 border-amber-200",
};

type Section = "structures" | "stain" | "risk" | "complications" | "differentials" | "clinical" | "learning" | "ihc" | "pathogenesis" | "molecular" | "teaching";

async function resizeDataUrlToBlob(dataUrl: string, maxDim: number, quality: number): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))), "image/jpeg", quality);
  });
}

export default function AnalysisPanel({
  analysis, activeAnnotation, onAnnotationSelect,
  user, rawDataUrl, preloadedImageUrl, slideLabel, diagnosisContext,
  canUseInfographics = true,
}: AnalysisPanelProps) {
  const [openSection, setOpenSection] = useState<Section | null>("structures");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Infographic state
  const [infographicState, setInfographicState] = useState<InfographicState>("idle");
  const [infographicData, setInfographicData] = useState<InfographicData | null>(null);
  const [showInfographic, setShowInfographic] = useState(false);
  const [InfographicView, setInfographicView] = useState<((props: { infographic: InfographicData; onClose: () => void }) => JSX.Element) | null>(null);

  const toggle = (s: Section) => setOpenSection((prev) => (prev === s ? null : s));

  const handleGenerateInfographic = async () => {
    if (infographicState === "loading") return;
    setInfographicState("loading");

    try {
      const res = await authedFetch("/api/infographic", {
        method: "POST",
        body: JSON.stringify({ analysis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate infographic");

      // Lazy-load InfographicView so it doesn't bloat the initial bundle
      const mod = await import("@/components/InfographicView");
      setInfographicView(() => mod.default);
      setInfographicData(data.infographic);
      setShowInfographic(true);
      setInfographicState("idle");
    } catch (err) {
      console.error("Infographic generation failed:", err);
      setInfographicState("error");
      // Auto-reset error state after 4 s so user can retry
      setTimeout(() => setInfographicState("idle"), 4000);
    }
  };

  const handleSaveToFlashcards = async () => {
    if (!user) { setSaveError("Sign in to save flashcards"); setSaveState("error"); return; }
    setSaveState("saving");
    setSaveError(null);
    try {
      let imageUrl: string | null = null;

      // Curated slide from /public/slides/ — use the stable path, no upload needed
      if (preloadedImageUrl && !preloadedImageUrl.startsWith("data:")) {
        imageUrl = preloadedImageUrl;
      } else if (rawDataUrl && rawDataUrl.startsWith("data:")) {
        // User-uploaded image — push to Supabase Storage. If the bucket is
        // misconfigured we still want to save the analysis (just without a thumbnail)
        // rather than block the user with a hard failure.
        try {
          const blob = await resizeDataUrlToBlob(rawDataUrl, 1280, 0.82);
          const path = `${user.id}/${Date.now()}.jpg`;
          console.log(`[AnalysisPanel] Uploading slide image to storage: ${path}`);
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("slide-images")
            .upload(path, blob, { contentType: "image/jpeg", upsert: false });
          if (uploadError) {
            console.error(`[AnalysisPanel] Storage upload failed for ${path}:`, uploadError);
            throw uploadError;
          }
          console.log(`[AnalysisPanel] Upload successful. Path: ${uploadData.path}`);
          const { data: urlData } = supabase.storage.from("slide-images").getPublicUrl(uploadData.path);
          imageUrl = urlData.publicUrl;
          console.log(`[AnalysisPanel] Public URL: ${imageUrl}`);
        } catch (uploadErr) {
          const errMsg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
          console.error(`[AnalysisPanel] Slide image upload failed. Error: ${errMsg}`);
          if (errMsg.includes("403") || errMsg.includes("permission")) {
            console.error("[AnalysisPanel] → This is likely an RLS policy issue. Check Supabase dashboard.");
            console.error("[AnalysisPanel] → Storage → Policies → ensure 'slide-images' bucket allows authenticated uploads.");
          } else if (errMsg.includes("not found") || errMsg.includes("404")) {
            console.error("[AnalysisPanel] → The 'slide-images' bucket may not exist. Create it in Supabase Storage.");
          }
          console.warn("[AnalysisPanel] Saving analysis without thumbnail. User can still view analysis results.");
          imageUrl = null;
        }
      }

      const { error: insertError } = await supabase.from("slide_history").insert({
        user_id:       user.id,
        diagnosis:     analysis.diagnosis,
        slide_label:   slideLabel,
        image_source:  diagnosisContext ? diagnosisContext.split("—")[0].trim() : "upload",
        image_url:     imageUrl,
        analysis_json: analysis as unknown as Record<string, unknown>,
      });
      if (insertError) throw new Error(`Save failed: ${insertError.message}`);

      setSaveState("saved");
    } catch (e) {
      console.error("Save to flashcards failed:", e);
      setSaveError(e instanceof Error ? e.message : "Unknown error");
      setSaveState("error");
    }
  };

  return (
    <div className="card p-0 overflow-hidden flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">{analysis.diagnosis}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{analysis.overview}</p>
          </div>
          <span className={clsx("badge border text-xs ml-3 flex-shrink-0", confidenceColors[analysis.confidence])}>
            {analysis.confidence} confidence
          </span>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={handleSaveToFlashcards}
            disabled={saveState === "saving" || saveState === "saved"}
            className={clsx(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
              saveState === "saved"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : saveState === "error"
                ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                : "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-60"
            )}
          >
            {saveState === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saveState === "saved" && <Check className="w-3.5 h-3.5" />}
            {(saveState === "idle" || saveState === "error") && <BookmarkPlus className="w-3.5 h-3.5" />}
            {saveState === "saving" ? "Saving..."
              : saveState === "saved" ? "Saved to Flashcards"
              : saveState === "error" ? "Retry save"
              : "Save to Flashcards"}
          </button>
          <button
            onClick={async () => {
              const { exportAnalysisPdf } = await import("@/lib/exportPdf");
              exportAnalysisPdf(analysis, preloadedImageUrl ?? rawDataUrl ?? null, slideLabel ?? null);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export PDF
          </button>
          {canUseInfographics ? (
            <button
              onClick={handleGenerateInfographic}
              disabled={infographicState === "loading"}
              className={clsx(
                "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                infographicState === "error"
                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                  : "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 disabled:opacity-60"
              )}
            >
              {infographicState === "loading"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <LayoutTemplate className="w-3.5 h-3.5" />}
              {infographicState === "loading"
                ? "Generating…"
                : infographicState === "error"
                ? "Try again"
                : <>Infographic <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-bold uppercase tracking-wider leading-none">New</span></>}
            </button>
          ) : (
            <button
              onClick={() => { window.location.href = "/pricing"; }}
              title="Upgrade to Premium to use Infographics"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            >
              <Crown className="w-3.5 h-3.5" />
              Infographic
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider leading-none">Pro</span>
            </button>
          )}
          {saveState === "error" && saveError && (
            <span className="text-[11px] text-red-600 truncate w-full" title={saveError}>{saveError}</span>
          )}
          {saveState === "saved" && (
            <span className="text-[11px] text-slate-500">Available in Flashcards → My Slides</span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1">

        {/* Annotations list */}
        {analysis.annotations.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Annotated Structures
            </p>
            <div className="space-y-1.5">
              {analysis.annotations.map((ann, i) => (
                <button
                  key={ann.id}
                  onClick={() => onAnnotationSelect(activeAnnotation === ann.id ? null : ann.id)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150",
                    activeAnnotation === ann.id
                      ? "bg-primary-50 border border-primary-200"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700 border border-transparent"
                  )}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: SECTION_COLORS[i % SECTION_COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{ann.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{ann.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Accordion sections */}
        <Accordion
          id="stain"
          open={openSection === "stain"}
          toggle={() => toggle("stain")}
          icon={<FlaskConical className="w-4 h-4 text-teal-600" />}
          title="Stain Identification"
          badgeText={analysis.stain.type}
          badgeColor="bg-teal-50 text-teal-700"
        >
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1"><span className="font-medium">Reasoning: </span>{analysis.stain.reasoning}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-medium">Colours: </span>{analysis.stain.colorCharacteristics}</p>
        </Accordion>

        <Accordion
          id="structures"
          open={openSection === "structures"}
          toggle={() => toggle("structures")}
          icon={<CheckCircle className="w-4 h-4 text-primary-600" />}
          title="Key Structures"
          badgeText={`${analysis.structures.length} found`}
          badgeColor="bg-primary-50 text-primary-700"
        >
          <div className="space-y-3">
            {analysis.structures.map((s) => (
              <div key={s.name} className={clsx(
                "rounded-xl p-3 border text-xs",
                s.normalOrAbnormal === "abnormal"
                  ? "bg-red-50 border-red-100"
                  : "bg-emerald-50 border-emerald-100"
              )}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</p>
                  <span className={clsx("badge text-[10px]",
                    s.normalOrAbnormal === "abnormal"
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  )}>
                    {s.normalOrAbnormal}
                  </span>
                </div>
                <p className="text-slate-600 mb-1.5">{s.description}</p>
                <p className="text-slate-500 italic flex gap-1">
                  <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-500" />
                  {s.educationalNote}
                </p>
              </div>
            ))}
          </div>
        </Accordion>

        {/* ── IHC Markers ─────────────────────────────────────────────── */}
        {analysis.ihcMarkers && analysis.ihcMarkers.length > 0 && (
          <Accordion
            id="ihc"
            open={openSection === "ihc"}
            toggle={() => toggle("ihc")}
            icon={<Microscope className="w-4 h-4 text-indigo-600" />}
            title="IHC Markers"
            badgeText={`${analysis.ihcMarkers.length} markers`}
            badgeColor="bg-indigo-50 text-indigo-700"
          >
            <div className="space-y-2.5">
              {analysis.ihcMarkers.map((m) => (
                <div key={m.marker} className="rounded-xl border border-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs font-bold text-slate-800 font-mono tracking-wide">{m.marker}</p>
                    <span className={clsx(
                      "badge border text-[10px] font-semibold",
                      ihcResultColors[m.expectedResult]
                    )}>
                      {m.expectedResult === "positive" ? "+" : m.expectedResult === "negative" ? "−" : "±"}{" "}
                      {m.expectedResult}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 px-3 py-2 leading-relaxed">{m.significance}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-3 italic">
              * IHC results shown are expected/typical for this diagnosis. Confirm with clinical context.
            </p>
          </Accordion>
        )}

        {/* ── Pathogenesis ─────────────────────────────────────────────── */}
        {analysis.pathogenesis && analysis.pathogenesis.length > 0 && (
          <Accordion
            id="pathogenesis"
            open={openSection === "pathogenesis"}
            toggle={() => toggle("pathogenesis")}
            icon={<Dna className="w-4 h-4 text-rose-600" />}
            title="Pathogenesis"
            badgeText={`${analysis.pathogenesis.length} steps`}
            badgeColor="bg-rose-50 text-rose-700"
          >
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-gradient-to-b from-rose-300 to-rose-100" />
              <div className="space-y-4 relative">
                {analysis.pathogenesis.map((step) => (
                  <div key={step.step} className="flex gap-4 items-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 z-10 shadow-sm">
                      {step.step}
                    </div>
                    <div className="pb-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 mb-0.5">{step.title}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Accordion>
        )}

        {analysis.molecularProfile && analysis.molecularProfile.length > 0 && (
          <Accordion
            id="molecular"
            open={openSection === "molecular"}
            toggle={() => toggle("molecular")}
            icon={<Dna className="w-4 h-4 text-violet-600" />}
            title="Molecular Profile"
            badgeText={`${analysis.molecularProfile.length} alterations`}
            badgeColor="bg-violet-50 text-violet-700"
          >
            <div className="space-y-3">
              {analysis.molecularProfile.map((m) => (
                <div key={m.gene} className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-violet-800 font-mono">{m.gene}</span>
                    <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">{m.frequency}</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mb-1 italic">{m.alteration}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{m.significance}</p>
                </div>
              ))}
            </div>
          </Accordion>
        )}

        <Accordion
          id="risk"
          open={openSection === "risk"}
          toggle={() => toggle("risk")}
          icon={<ShieldAlert className="w-4 h-4 text-amber-600" />}
          title="Risk Factors"
          badgeText={`${analysis.riskFactors.length}`}
          badgeColor="bg-amber-50 text-amber-700"
        >
          <ul className="space-y-1.5">
            {analysis.riskFactors.map((r) => (
              <li key={r} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                {r}
              </li>
            ))}
          </ul>
        </Accordion>

        <Accordion
          id="complications"
          open={openSection === "complications"}
          toggle={() => toggle("complications")}
          icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
          title="Complications"
          badgeText={`${analysis.complications.length}`}
          badgeColor="bg-red-50 text-red-600"
        >
          <ul className="space-y-1.5">
            {analysis.complications.map((c) => (
              <li key={c} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                {c}
              </li>
            ))}
          </ul>
        </Accordion>

        <Accordion
          id="differentials"
          open={openSection === "differentials"}
          toggle={() => toggle("differentials")}
          icon={<GitBranch className="w-4 h-4 text-purple-600" />}
          title="Differential Diagnoses"
          badgeText={`${analysis.differentialDiagnosis.length}`}
          badgeColor="bg-purple-50 text-purple-700"
        >
          <div className="space-y-3">

            {/* ── Primary diagnosis ── */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      Primary Diagnosis
                    </span>
                    <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full border", confidenceColors[analysis.confidence])}>
                      {analysis.confidence} confidence
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">{analysis.diagnosis}</p>
                  {analysis.reasoningChain?.differentialNarrowing && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {analysis.reasoningChain.differentialNarrowing}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Considered & excluded ── */}
            {analysis.differentialDiagnosis.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
                  Considered &amp; Excluded
                </p>
                {analysis.differentialDiagnosis.map((d) => (
                  <div
                    key={d.diagnosis}
                    className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-3.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <XCircle className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{d.diagnosis}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          <span className="font-medium text-amber-700 dark:text-amber-400">Why excluded: </span>
                          {d.distinguishingFeatures}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Key mimickers ── */}
            {analysis.mimickerExclusion && analysis.mimickerExclusion.length > 0 && (
              <div className="border border-rose-100 dark:border-rose-900/40 rounded-2xl p-4 bg-rose-50/50 dark:bg-rose-900/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 dark:text-rose-500 mb-3">
                  Classic Mimickers — Don&apos;t Be Fooled
                </p>
                <div className="space-y-2.5">
                  {analysis.mimickerExclusion.map((m) => (
                    <div key={m.mimicker} className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{m.mimicker}</span>
                        <span className="text-slate-500 dark:text-slate-400"> — {m.excludingFeature}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </Accordion>

        <Accordion
          id="clinical"
          open={openSection === "clinical"}
          toggle={() => toggle("clinical")}
          icon={<Stethoscope className="w-4 h-4 text-sky-600" />}
          title="Clinical Correlation"
        >
          <p className="text-xs text-slate-600 leading-relaxed">{analysis.clinicalCorrelation}</p>
        </Accordion>

        <Accordion
          id="learning"
          open={openSection === "learning"}
          toggle={() => toggle("learning")}
          icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
          title="Key Learning Points"
          badgeText={`${analysis.keyLearningPoints.length}`}
          badgeColor="bg-amber-50 text-amber-700"
        >
          <ol className="space-y-2">
            {analysis.keyLearningPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </Accordion>

        {analysis.teachingClose && (
          <Accordion
            id="teaching"
            open={openSection === "teaching"}
            toggle={() => toggle("teaching")}
            icon={<GraduationCap className="w-4 h-4 text-indigo-600" />}
            title="Teaching Close"
            badgeColor="bg-indigo-50 text-indigo-700"
          >
            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                <p className="font-bold text-indigo-700 uppercase tracking-wider text-[10px] mb-1">Pearl</p>
                <p className="text-slate-700 leading-relaxed">{analysis.teachingClose.pearl}</p>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                <p className="font-bold text-red-600 uppercase tracking-wider text-[10px] mb-1">Pitfall</p>
                <p className="text-slate-700 leading-relaxed">{analysis.teachingClose.pitfall}</p>
              </div>
            </div>
          </Accordion>
        )}

      </div>

      {/* Infographic modal — lazy loaded */}
      {showInfographic && infographicData && InfographicView && (
        <InfographicView
          infographic={infographicData}
          onClose={() => setShowInfographic(false)}
        />
      )}
    </div>
  );
}

// ── Reusable accordion ───────────────────────────────────────────────────────
function Accordion({
  id, open, toggle, icon, title, badgeText, badgeColor, children,
}: {
  id: string;
  open: boolean;
  toggle: () => void;
  icon: React.ReactNode;
  title: string;
  badgeText?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</span>
          {badgeText && (
            <span className={clsx("badge text-[10px]", badgeColor)}>{badgeText}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}
