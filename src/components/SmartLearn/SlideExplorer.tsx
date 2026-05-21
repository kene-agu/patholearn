"use client";

// Post-upload screen: grid of extracted slides + action buttons.

import { useState, useMemo } from "react";
import {
  BookOpen, Zap, Brain, MessageSquare, ChevronLeft,
  FileText, Loader2, CheckCircle2, Filter, Trash2, LayoutTemplate, Crown,
} from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import type { User } from "@supabase/supabase-js";
import type { PDFDocument, PDFSlide, ProcessedPDF } from "@/types/smartLearn";
import type { InfographicData } from "@/components/InfographicView";
import ProgressiveSlide from "./ProgressiveSlide";
import { authedFetch } from "@/lib/authedFetch";
import { supabase } from "@/lib/supabase";

type InfographicState = "idle" | "loading" | "error";

interface Props {
  pdfDoc: PDFDocument;
  slides: PDFSlide[];
  user: User;
  onStartQuiz: (slides: PDFSlide[], startPage?: number) => void;
  onStartFlashcards: (slides: PDFSlide[]) => void;
  onOpenTutor: (slides: PDFSlide[], startPage?: number) => void;
  onDeleteSlide: (slideId: string) => Promise<void>;
  onBack: () => void;
  canUseInfographics?: boolean;
}

export default function SlideExplorer({
  pdfDoc, slides, user, onStartQuiz, onStartFlashcards, onOpenTutor, onDeleteSlide, onBack,
  canUseInfographics = true,
}: Props) {
  const [summary, setSummary]         = useState<string | null>(null);
  const [summaryLoading, setSL]       = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [filterMode, setFilterMode]   = useState<"content" | "all">("content");

  // Infographic state
  const [infographicState, setInfographicState] = useState<InfographicState>("idle");
  const [infographicData, setInfographicData]   = useState<InfographicData | null>(null);
  const [showInfographic, setShowInfographic]   = useState(false);
  const [InfographicView, setInfographicView]   = useState<((props: { infographic: InfographicData; onClose: () => void }) => JSX.Element) | null>(null);

  const visibleSlides = useMemo(() => {
    if (filterMode === "all") return slides;
    const filtered = slides.filter(isContentSlide);
    // If the filter strips everything (rare), fall back to all
    return filtered.length > 0 ? filtered : slides;
  }, [slides, filterMode]);

  const skippedCount = slides.length - visibleSlides.length;

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  };

  const fetchSummary = async () => {
    if (summary) { setShowSummary(true); return; }
    setSL(true);
    try {
      const token = await getAuthToken();
      const res   = await fetch(`/api/pdf/${pdfDoc.id}/summary`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const { summary: text } = await res.json();
      setSummary(text ?? null);
      setShowSummary(true);
    } finally { setSL(false); }
  };

  const handleGenerateInfographic = async () => {
    if (infographicState === "loading") return;
    setInfographicState("loading");

    try {
      // Build a rich summary object from all available slide data.
      // We include slide analyses (if pre-warmed), page text, and flashcard data.
      const analyzedSlides = slides
        .filter(s => s.analysis_json || s.page_text?.trim())
        .map(s => ({
          page: s.page_number,
          analysis: s.analysis_json ?? null,
          text: s.page_text ?? null,
          flashcards: s.flashcard_json ?? null,
        }));

      const analysis = {
        documentTitle: pdfDoc.title,
        totalSlides: slides.length,
        slides: analyzedSlides,
      };

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
      console.error("[SmartLearn] Infographic generation failed:", err);
      setInfographicState("error");
      // Auto-reset after 4 s so the user can retry
      setTimeout(() => setInfographicState("idle"), 4000);
    }
  };

  const actions = [
    {
      icon: <Zap className="w-5 h-5" />,
      label: "Start Quiz",
      desc: "MCQ questions from your slides",
      color: "from-violet-600 to-purple-700",
      onClick: () => onStartQuiz(slides),
    },
    {
      icon: <Brain className="w-5 h-5" />,
      label: "Flashcards",
      desc: "Spaced repetition study mode",
      color: "from-emerald-600 to-teal-700",
      onClick: () => onStartFlashcards(slides),
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      label: "AI Tutor",
      desc: "Chat about any slide",
      color: "from-blue-600 to-cyan-700",
      onClick: () => onOpenTutor(slides),
    },
    {
      icon: summaryLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />,
      label: "Quick Summary",
      desc: "AI overview of your PDF",
      color: "from-amber-600 to-orange-700",
      onClick: fetchSummary,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors mt-0.5"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <h1 className="text-lg font-bold text-white truncate">{pdfDoc.title}</h1>
          </div>
          <p className="text-slate-400 text-sm">{slides.length} slides extracted</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={clsx(
              "rounded-2xl p-4 text-white text-left bg-gradient-to-br transition-transform hover:scale-[1.02] active:scale-[0.98]",
              a.color
            )}
          >
            <div className="mb-2">{a.icon}</div>
            <p className="font-semibold text-sm">{a.label}</p>
            <p className="text-xs opacity-80 mt-0.5">{a.desc}</p>
          </button>
        ))}
      </div>

      {/* Infographic button — full-width row beneath the 2×2 grid */}
      <div className="mb-8">
        {canUseInfographics ? (
          <button
            onClick={handleGenerateInfographic}
            disabled={infographicState === "loading"}
            className={clsx(
              "w-full rounded-2xl p-4 text-white text-left bg-gradient-to-br transition-transform hover:scale-[1.005] active:scale-[0.995] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-4",
              infographicState === "error"
                ? "from-red-700 to-red-800"
                : "from-violet-700 to-violet-900"
            )}
          >
            <div className="flex-shrink-0">
              {infographicState === "loading"
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <LayoutTemplate className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm flex items-center gap-1.5">
                {infographicState === "loading"
                  ? "Generating Infographic…"
                  : infographicState === "error"
                    ? "Infographic failed — tap to retry"
                    : <>Generate Infographic <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-bold uppercase tracking-wider leading-none">New</span></>}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                Visual study sheet summarising this entire document
              </p>
            </div>
          </button>
        ) : (
          <div className="w-full rounded-2xl p-4 text-left bg-slate-800 border border-slate-700 flex items-center gap-4 opacity-60 cursor-not-allowed">
            <div className="flex-shrink-0">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white flex items-center gap-1.5">
                Generate Infographic
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider leading-none">Pro</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Available on free trial and Premium — upgrade to unlock
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary panel */}
      {showSummary && summary && (
        <div className="mb-8 bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Quick Summary</h3>
            <button
              onClick={() => setShowSummary(false)}
              className="text-slate-500 hover:text-slate-300 text-sm"
            >
              Close
            </button>
          </div>
          <div className="prose prose-sm prose-invert max-w-none text-slate-300 text-sm leading-relaxed">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Slide grid */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          {filterMode === "content" ? "Content Slides" : "All Slides"}
          <span className="ml-2 text-slate-500 normal-case font-normal">
            ({visibleSlides.length}{filterMode === "content" && skippedCount > 0 ? ` · ${skippedCount} hidden` : ""})
          </span>
        </h2>
        <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
          {(["content", "all"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFilterMode(m)}
              className={clsx(
                "px-2.5 py-1 rounded-md font-medium transition-colors",
                filterMode === m
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {m === "content" ? "Content only" : "Show all"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {visibleSlides.map((slide) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            onQuiz={() => onStartQuiz(slides, slide.page_number)}
            onTutor={() => onOpenTutor(slides, slide.page_number)}
            onDelete={() => onDeleteSlide(slide.id)}
          />
        ))}
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

// ── Filter heuristic: skip title / outline / "thanks" / nearly-empty pages ────

const SKIP_KEYWORDS = [
  "outline", "objectives", "agenda", "table of contents", "contents",
  "introduction to", "thank you", "thanks for", "any questions",
  "questions?", "references", "bibliography", "acknowledg",
];

function isContentSlide(slide: PDFSlide): boolean {
  const text = (slide.page_text ?? "").trim();
  // Very short slides are almost always section dividers / titles
  if (text.length < 40) return false;
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 8) return false;

  const lower = text.toLowerCase();

  // First slide is almost always the title — only skip if it looks like one
  if (slide.page_number === 1 && wordCount < 25) return false;

  // Skip explicit outline / thanks / refs slides
  for (const kw of SKIP_KEYWORDS) {
    if (lower.startsWith(kw) || lower.includes(`\n${kw}`)) return false;
  }
  return true;
}

// ── Slide thumbnail card ────────────────────────────────────────────────────────

function SlideCard({
  slide,
  onQuiz,
  onTutor,
  onDelete,
}: {
  slide: PDFSlide;
  onQuiz: () => void;
  onTutor: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isAnalyzed = !!slide.analysis_json;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div
      className="group relative rounded-xl bg-slate-800 border border-slate-700 overflow-hidden cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-slate-900">
        <ProgressiveSlide
          thumbUrl={slide.thumbUrl ?? null}
          fullUrl={slide.thumbUrl ?? null} // show thumb in grid — full only in viewer
          alt={`Slide ${slide.page_number}`}
          className="w-full h-full"
        />
      </div>

      {/* Page number + analyzed badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        <span className="bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md font-mono">
          {slide.page_number}
        </span>
        {isAnalyzed && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 drop-shadow" />
        )}
      </div>

      {/* Hover overlay */}
      {hovered && !showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 p-2">
          <button
            onClick={onQuiz}
            className="w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
          >
            Quiz this slide
          </button>
          <button
            onClick={onTutor}
            className="w-full py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold transition-colors"
          >
            Ask AI about this
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 p-3 rounded-xl">
          <p className="text-white text-xs font-semibold text-center">Delete this slide?</p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}

      {/* Slide label */}
      <div className="px-2 py-1.5 border-t border-slate-700">
        <p className="text-slate-400 text-xs truncate">
          {slide.analysis_json
            ? (slide.analysis_json as { diagnosis?: string }).diagnosis ?? `Slide ${slide.page_number}`
            : `Slide ${slide.page_number}`}
        </p>
      </div>
    </div>
  );
}
