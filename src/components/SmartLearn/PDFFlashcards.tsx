"use client";

// Spaced repetition flashcard mode for PDF slides.
// Fetches/caches flashcards per slide, SM-2 spaced repetition on user ratings.

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, RotateCcw, Brain } from "lucide-react";
import clsx from "clsx";
import type { User } from "@supabase/supabase-js";
import type { PDFSlide, SlideFlashcard, SlideAnalysis } from "@/types/smartLearn";
import { supabase } from "@/lib/supabase";

interface Props {
  slides: PDFSlide[];
  user: User;
  onBack: () => void;
}

type Quality = 0 | 1 | 2 | 3; // Again | Hard | Good | Easy → SM-2 q=1,3,4,5

interface CardState {
  ef: number;       // ease factor
  interval: number; // days
  reps: number;
}

// Minimal SM-2 — same algorithm used by the existing FlashcardMode
function sm2(state: CardState, quality: Quality): CardState {
  const q = [1, 3, 4, 5][quality];
  if (q < 3) return { ef: Math.max(1.3, state.ef - 0.2), interval: 1, reps: 0 };
  const interval = state.reps === 0 ? 1 : state.reps === 1 ? 6 : Math.round(state.interval * state.ef);
  const ef = Math.max(1.3, state.ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return { ef, interval, reps: state.reps + 1 };
}

const INITIAL_STATE: CardState = { ef: 2.5, interval: 1, reps: 0 };

export default function PDFFlashcards({ slides, user, onBack }: Props) {
  // Flatten all flashcards across all slides (loaded on demand per slide)
  const [allCards, setAllCards]   = useState<(SlideFlashcard & { slideId: string; pdfId: string })[]>([]);
  const [loading, setLoading]     = useState(false);
  const [cardIdx, setCardIdx]     = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [sessionDone, setSessionDone] = useState(false);
  const [loadedSlides, setLoadedSlides] = useState<Set<string>>(new Set());

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  };

  const loadFlashcardsForSlide = useCallback(async (slide: PDFSlide) => {
    if (loadedSlides.has(slide.id)) return;

    // Use cached flashcards if available
    if (slide.flashcard_json && Array.isArray(slide.flashcard_json) && slide.flashcard_json.length > 0) {
      const cards = (slide.flashcard_json as SlideFlashcard[]).map(fc => ({
        ...fc,
        slideId: slide.id,
        pdfId: slide.pdf_id,
      }));
      setAllCards(prev => [...prev, ...cards]);
      setLoadedSlides(prev => new Set([...Array.from(prev), slide.id]));
      return;
    }

    // Need analysis first
    if (!slide.analysis_json) return;

    const token = await getToken();
    const res = await fetch(`/api/pdf/${slide.pdf_id}/flashcards`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ analysis: slide.analysis_json, pageText: slide.page_text }),
    });

    if (!res.ok) return;
    const { flashcards } = await res.json();
    if (!flashcards?.length) return;

    // Cache back to slide
    await fetch(`/api/pdf/${slide.pdf_id}/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slideId: slide.id, field: "flashcard_json", value: flashcards }),
    });
    slide.flashcard_json = flashcards;

    const cards = flashcards.map((fc: SlideFlashcard) => ({
      ...fc,
      slideId: slide.id,
      pdfId: slide.pdf_id,
    }));
    setAllCards(prev => [...prev, ...cards]);
    setLoadedSlides(prev => new Set([...Array.from(prev), slide.id]));
  }, [loadedSlides]);

  // Load flashcards for slides that already have analysis
  useEffect(() => {
    const analyzed = slides.filter(s => s.analysis_json || s.flashcard_json);
    if (analyzed.length === 0) return;
    setLoading(true);
    Promise.all(analyzed.map(loadFlashcardsForSlide)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = allCards[cardIdx];

  const handleRate = (quality: Quality) => {
    if (!card) return;
    const prev = cardStates[card.id] ?? INITIAL_STATE;
    const next = sm2(prev, quality);
    setCardStates(s => ({ ...s, [card.id]: next }));
    setFlipped(false);

    const nextIdx = cardIdx + 1;
    if (nextIdx >= allCards.length) {
      setSessionDone(true);
    } else {
      setCardIdx(nextIdx);
    }
  };

  const restart = () => {
    setCardIdx(0);
    setFlipped(false);
    setSessionDone(false);
  };

  const analyzedCount = slides.filter(s => s.analysis_json || s.flashcard_json).length;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-slate-400 text-sm">Generating flashcards from your slides…</p>
        <p className="text-slate-500 text-xs">This uses Claude to create exam-quality cards</p>
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Brain className="w-12 h-12 text-emerald-400" />
        <h2 className="text-white font-bold text-lg">No flashcards yet</h2>
        <p className="text-slate-400 text-sm">
          {analyzedCount === 0
            ? "Open the Quiz mode first to analyse slides — flashcards need the analysis."
            : `Analyzed ${analyzedCount}/${slides.length} slides. No cards could be generated yet.`}
        </p>
        <button onClick={onBack} className="text-emerald-400 text-sm hover:text-emerald-300">
          ← Back to slides
        </button>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Brain className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-white font-bold text-xl">Session complete!</h2>
        <p className="text-slate-400 text-sm">{allCards.length} cards reviewed</p>
        <div className="flex gap-3">
          <button
            onClick={restart}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Study again
          </button>
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold"
          >
            Back to slides
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="h-1.5 bg-slate-700 rounded-full">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(cardIdx / allCards.length) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-slate-400 w-16 text-right">{cardIdx + 1}/{allCards.length}</span>
      </div>

      {/* Card */}
      <div
        className={clsx(
          "flex-1 flex flex-col rounded-2xl border cursor-pointer transition-all duration-300 min-h-[320px]",
          flipped
            ? "border-emerald-500/50 bg-emerald-900/10"
            : "border-slate-700 bg-slate-800/60 hover:border-slate-600"
        )}
        onClick={() => !flipped && setFlipped(true)}
      >
        {/* Category badge */}
        <div className="px-5 pt-4 flex items-center justify-between">
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
            {card?.category ?? "Pathology"}
          </span>
          {!flipped && (
            <span className="text-xs text-slate-500">Tap to reveal answer</span>
          )}
        </div>

        {/* Front */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className={clsx(
            "font-semibold leading-relaxed",
            flipped ? "text-slate-400 text-sm" : "text-white text-base"
          )}>
            {card?.front}
          </p>

          {flipped && (
            <div className="mt-6 w-full text-left space-y-4">
              <div className="border-t border-slate-700 pt-4">
                <p className="text-white font-semibold text-base mb-3">{card?.back}</p>
                {card?.keyPoints?.length > 0 && (
                  <ul className="space-y-1.5">
                    {card.keyPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-emerald-400 mt-0.5 flex-shrink-0">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {!flipped && (
          <div className="px-6 pb-5 text-center">
            <span className="text-slate-600 text-xs">Click to flip</span>
          </div>
        )}
      </div>

      {/* Rating buttons (only after flip) */}
      {flipped && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: "Again", color: "bg-red-700 hover:bg-red-600",    quality: 0 as Quality },
            { label: "Hard",  color: "bg-amber-700 hover:bg-amber-600", quality: 1 as Quality },
            { label: "Good",  color: "bg-blue-700 hover:bg-blue-600",   quality: 2 as Quality },
            { label: "Easy",  color: "bg-emerald-700 hover:bg-emerald-600", quality: 3 as Quality },
          ].map(({ label, color, quality }) => (
            <button
              key={label}
              onClick={() => handleRate(quality)}
              className={clsx("py-2.5 rounded-xl text-white text-sm font-semibold transition-colors", color)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
