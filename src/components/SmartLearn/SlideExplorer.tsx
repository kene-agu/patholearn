"use client";

// Post-upload screen: grid of extracted slides + action buttons.

import { useState } from "react";
import {
  BookOpen, Zap, Brain, MessageSquare, ChevronLeft,
  FileText, Loader2, CheckCircle2,
} from "lucide-react";
import clsx from "clsx";
import type { User } from "@supabase/supabase-js";
import type { PDFDocument, PDFSlide, ProcessedPDF } from "@/types/smartLearn";
import ProgressiveSlide from "./ProgressiveSlide";
import { supabase } from "@/lib/supabase";

interface Props {
  pdfDoc: PDFDocument;
  slides: PDFSlide[];
  user: User;
  onStartQuiz: (slides: PDFSlide[], startPage?: number) => void;
  onStartFlashcards: (slides: PDFSlide[]) => void;
  onOpenTutor: (slides: PDFSlide[], startPage?: number) => void;
  onBack: () => void;
}

export default function SlideExplorer({
  pdfDoc, slides, user, onStartQuiz, onStartFlashcards, onOpenTutor, onBack,
}: Props) {
  const [summary, setSummary]         = useState<string | null>(null);
  const [summaryLoading, setSL]       = useState(false);
  const [showSummary, setShowSummary] = useState(false);

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
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
          <div className="prose prose-sm prose-invert max-w-none text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
            {summary}
          </div>
        </div>
      )}

      {/* Slide grid */}
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        All Slides
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {slides.map((slide) => (
          <SlideCard
            key={slide.id}
            slide={slide}
            onQuiz={() => onStartQuiz(slides, slide.page_number)}
            onTutor={() => onOpenTutor(slides, slide.page_number)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Slide thumbnail card ────────────────────────────────────────────────────────

function SlideCard({
  slide,
  onQuiz,
  onTutor,
}: {
  slide: PDFSlide;
  onQuiz: () => void;
  onTutor: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isAnalyzed = !!slide.analysis_json;

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
      {hovered && (
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
