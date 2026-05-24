"use client";

// Split-view: left = Konva slide viewer with zoom/pan/annotations
//             right = tabbed panel (Quiz | Chat)

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Zap, MessageSquare,
  Loader2, CheckCircle2, XCircle, Send, RotateCcw,
  ZoomIn, ZoomOut, Maximize2, Eye, EyeOff,
} from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import { stripMathMarkup } from "@/lib/sanitizeAiText";
import type { User } from "@supabase/supabase-js";
import type { PDFSlide, SlideAnalysis, SlideQuestion, ChatMessage } from "@/types/smartLearn";
import ProgressiveSlide from "./ProgressiveSlide";
import { supabase } from "@/lib/supabase";
import { parseDataUrl } from "@/lib/imageOptimization";
import { recordReferralTrigger } from "@/components/ReferralNudge";

let Stage: any, Layer: any, KImage: any, Circle: any, Text: any;
if (typeof window !== "undefined") {
  const konva = require("react-konva");
  Stage = konva.Stage;
  Layer = konva.Layer;
  KImage = konva.Image;
  Circle = konva.Circle;
  Text = konva.Text;
}

interface Props {
  slides: PDFSlide[];
  initialPage?: number;
  user: User;
  defaultPanel?: "quiz" | "chat";
  onBack: () => void;
}

type Panel = "quiz" | "chat";

export default function SlideLearner({ slides, initialPage = 1, user, defaultPanel = "quiz", onBack }: Props) {
  const [pageIdx, setPageIdx] = useState(
    Math.max(0, slides.findIndex(s => s.page_number === initialPage))
  );
  const [panel, setPanel]         = useState<Panel>(defaultPanel);
  const [analysis, setAnalysis]   = useState<SlideAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeErr, setAnalyzeErr] = useState<string | null>(null);
  const [isSlideRevealed, setIsSlideRevealed] = useState(false);

  const slide = slides[pageIdx];

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  };

  // Auto-analyze when slide changes (use cached if available)
  // Also reset the reveal state so new slides are blurred again
  useEffect(() => {
    if (!slide) return;
    setIsSlideRevealed(false);
    if (slide.analysis_json) {
      setAnalysis(slide.analysis_json as SlideAnalysis);
      setAnalyzeErr(null);
      return;
    }
    analyzeSlide(slide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx]);

  // Preload adjacent slide images so Next/Prev feels instant — browser
  // caches the response and the viewer shows it without a network round-trip.
  useEffect(() => {
    const neighbours = [slides[pageIdx + 1], slides[pageIdx - 1], slides[pageIdx + 2]];
    for (const n of neighbours) {
      if (!n) continue;
      if (n.fullUrl) { const i = new window.Image(); i.src = n.fullUrl; }
      else if (n.thumbUrl) { const i = new window.Image(); i.src = n.thumbUrl; }
    }
  }, [pageIdx, slides]);

  const analyzeSlide = async (s: PDFSlide) => {
    if (!s.fullUrl && !s.thumbUrl) return;
    setAnalyzing(true);
    setAnalysis(null);
    setAnalyzeErr(null);
    try {
      const imgUrl = s.fullUrl ?? s.thumbUrl!;
      const imgRes = await fetch(imgUrl);
      const blob   = await imgRes.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((res) => {
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.readAsDataURL(blob);
      });

      const token = await getToken();
      const res   = await fetch(`/api/pdf/${s.pdf_id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64: base64, mediaType: blob.type, pageText: s.page_text }),
      });

      if (!res.ok) throw new Error("Analysis failed");
      const { analysis: a } = await res.json();
      setAnalysis(a);
      recordReferralTrigger("smartlearn");

      // Cache back to DB
      await fetch(`/api/pdf/${s.pdf_id}/slides`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slideId: s.id, field: "analysis_json", value: a }),
      });

      // Mutate slide in memory so grid shows analyzed badge
      s.analysis_json = a;
    } catch (e) {
      setAnalyzeErr(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const navigate = (delta: number) => {
    const next = pageIdx + delta;
    if (next < 0 || next >= slides.length) return;
    setPageIdx(next);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/60">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate flex-1">
          {slide?.analysis_json
            ? (slide.analysis_json as SlideAnalysis).diagnosis
            : `Slide ${slide?.page_number ?? 1}`}
        </span>
        {/* Slide navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            disabled={pageIdx === 0}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-600 dark:text-slate-400 w-16 text-center">
            {pageIdx + 1} / {slides.length}
          </span>
          <button
            onClick={() => navigate(1)}
            disabled={pageIdx === slides.length - 1}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {/* Panel toggle */}
        <div className="flex rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
          {(["quiz", "chat"] as Panel[]).map((p) => (
            <button
              key={p}
              onClick={() => setPanel(p)}
              className={clsx(
                "px-3 py-1 text-xs font-medium flex items-center gap-1 transition-colors",
                panel === p ? "bg-violet-600 text-white" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {p === "quiz" ? <Zap className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
              {p === "quiz" ? "Quiz" : "Ask AI"}
            </button>
          ))}
        </div>
      </div>

      {/* Main split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left — slide viewer (hidden in quiz mode) */}
        {panel !== "quiz" && (
          <div className="w-full md:w-1/2 bg-slate-50 dark:bg-slate-950 flex flex-col">
            <SlideViewer
              slide={slide}
              analysis={analysis}
              analyzing={analyzing}
              onRetry={() => analyzeSlide(slide)}
              isSlideRevealed={isSlideRevealed}
              setIsSlideRevealed={setIsSlideRevealed}
            />
          </div>
        )}

        {/* Right — quiz / chat panel (full-width in quiz mode) */}
        <div className={clsx(
          "flex flex-col border-slate-200 dark:border-slate-700/60 overflow-hidden",
          panel === "quiz"
            ? "w-full"
            : "w-full md:w-1/2 border-t md:border-t-0 md:border-l"
        )}>
          {panel === "quiz" ? (
            <QuizPanel slide={slide} analysis={analysis} getToken={getToken} />
          ) : (
            <ChatPanel slide={slide} analysis={analysis} getToken={getToken} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Slide Viewer with Konva zoom/pan ──────────────────────────────────────────

function SlideViewer({
  slide, analysis, analyzing, onRetry, isSlideRevealed, setIsSlideRevealed,
}: {
  slide: PDFSlide;
  analysis: SlideAnalysis | null;
  analyzing: boolean;
  onRetry: () => void;
  isSlideRevealed: boolean;
  setIsSlideRevealed: (revealed: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims]   = useState({ w: 600, h: 450 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgEl, setImgEl]   = useState<HTMLImageElement | null>(null);
  const isDragging = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Load image element for Konva
  useEffect(() => {
    const src = slide?.fullUrl ?? slide?.thumbUrl;
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImgEl(img);
    img.src = src;
  }, [slide?.fullUrl, slide?.thumbUrl]);

  // Fit image to container on load or resize
  useEffect(() => {
    if (!imgEl) return;
    const scaleX = dims.w / imgEl.width;
    const scaleY = dims.h / imgEl.height;
    const fit    = Math.min(scaleX, scaleY, 1);
    setScale(fit);
    setOffset({
      x: (dims.w - imgEl.width  * fit) / 2,
      y: (dims.h - imgEl.height * fit) / 2,
    });
  }, [imgEl, dims]);

  const zoom = (factor: number) => {
    setScale(s => Math.max(0.2, Math.min(5, s * factor)));
  };

  const resetView = () => {
    if (!imgEl) return;
    const fit = Math.min(dims.w / imgEl.width, dims.h / imgEl.height, 1);
    setScale(fit);
    setOffset({ x: (dims.w - imgEl.width * fit) / 2, y: (dims.h - imgEl.height * fit) / 2 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setScale(s => Math.max(0.2, Math.min(5, s * factor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
  };
  const handleMouseUp = () => { isDragging.current = false; };

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900">
        <button onClick={() => zoom(1.2)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => zoom(0.8)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={resetView} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          <Maximize2 className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-500 ml-2">{Math.round(scale * 100)}%</span>
        <span className="flex-1" />
        <button
          onClick={() => setIsSlideRevealed(!isSlideRevealed)}
          title={isSlideRevealed ? "Hide slide (blur)" : "Reveal slide"}
          className={clsx(
            "p-1.5 rounded flex items-center gap-1 text-xs font-medium transition-colors",
            isSlideRevealed
              ? "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
              : "bg-violet-600 text-white hover:bg-violet-500"
          )}
        >
          {isSlideRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isSlideRevealed ? "Hide" : "Reveal"}</span>
        </button>
        {analyzing && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />}
        {analysis && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Analyzed</span>}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={clsx(
          "flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative",
          !isSlideRevealed && "blur-lg"
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {imgEl ? (
          <Stage width={dims.w} height={dims.h}>
            <Layer>
              <KImage
                image={imgEl}
                x={offset.x}
                y={offset.y}
                width={imgEl.width   * scale}
                height={imgEl.height * scale}
              />
              {/* Annotation dots */}
              {analysis?.annotations?.map((ann) => {
                const ax = offset.x + ann.xPercent / 100 * imgEl.width  * scale;
                const ay = offset.y + ann.yPercent / 100 * imgEl.height * scale;
                return (
                  <AnnotationDot
                    key={ann.id}
                    x={ax} y={ay}
                    label={ann.label}
                  />
                );
              })}
            </Layer>
          </Stage>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            {slide?.thumbUrl
              ? <ProgressiveSlide thumbUrl={slide.thumbUrl} fullUrl={slide.fullUrl ?? null} alt={`Slide ${slide.page_number}`} className="w-full h-full" />
              : <Loader2 className="w-6 h-6 animate-spin text-slate-500" />}
          </div>
        )}

        {/* Reveal overlay */}
        {!isSlideRevealed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <button
              onClick={() => setIsSlideRevealed(true)}
              className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors shadow-lg"
            >
              Reveal Slide
            </button>
          </div>
        )}
      </div>

      {/* Analysis status bar */}
      {analyzing && (
        <div className="px-3 py-2 text-xs text-violet-300 bg-violet-900/20 border-t border-violet-700/30 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Analysing this slide…
        </div>
      )}
    </div>
  );
}

// ── Konva annotation dot ──────────────────────────────────────────────────────

function AnnotationDot({ x, y, label }: { x: number; y: number; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <>
      <Circle
        x={x} y={y} radius={8}
        fill={hovered ? "#7c3aed" : "#8b5cf6"}
        stroke="white" strokeWidth={2}
        opacity={0.9}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {hovered && (
        <Text
          x={x + 12} y={y - 8}
          text={label}
          fontSize={11}
          fill="white"
          padding={4}
          background="rgba(0,0,0,0.7)"
        />
      )}
    </>
  );
}

// ── Quiz Panel ────────────────────────────────────────────────────────────────

// The model tends to return the correct answer in the same slot (the schema
// example uses correctIndex 0), so without shuffling the right answer is almost
// always first and easy to guess. Randomise option order and remap correctIndex.
// True/False is left in natural order since position carries no information there.
function shuffleQuestion(q: SlideQuestion): SlideQuestion {
  if (q.type === "true-false" || q.options.length <= 2) return q;
  const correctText = q.options[q.correctIndex];
  const opts = [...q.options];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  const correctIndex = opts.indexOf(correctText);
  return { ...q, options: opts, correctIndex: correctIndex >= 0 ? correctIndex : q.correctIndex };
}

function QuizPanel({
  slide, analysis, getToken,
}: {
  slide: PDFSlide;
  analysis: SlideAnalysis | null;
  getToken: () => Promise<string>;
}) {
  const [questions, setQuestions] = useState<SlideQuestion[]>([]);
  const [loading, setLoading]     = useState(false);
  const [loadErr, setLoadErr]     = useState<string | null>(null);
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<number | null>(null);
  const [score, setScore]         = useState(0);
  const [done, setDone]           = useState(false);

  // Reset when slide changes
  useEffect(() => {
    setQuestions([]);
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setDone(false);
    setLoadErr(null);
    // Auto-load if slide already has quiz cached
    if (slide?.quiz_json) {
      setQuestions((slide.quiz_json as SlideQuestion[]).map(shuffleQuestion));
    }
  }, [slide?.id]);

  const loadQuestions = async () => {
    // Quiz works from either analysis or page text — analysis is just richer.
    if (!analysis && !slide?.page_text?.trim()) {
      setLoadErr("This slide has no extractable text to quiz from.");
      return;
    }
    setLoading(true);
    setLoadErr(null);
    try {
      const token = await getToken();
      const res   = await fetch(`/api/pdf/${slide.pdf_id}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ analysis: analysis ?? null, pageText: slide.page_text, count: 6 }),
      });
      // Be defensive: if the server returns a non-JSON error page (e.g. a
      // Vercel framework error), surface a clean message instead of the
      // raw "Unexpected token 'A'" JSON.parse exception.
      const raw = await res.text();
      let payload: { error?: string; questions?: SlideQuestion[] } = {};
      try { payload = raw ? JSON.parse(raw) : {}; }
      catch { throw new Error(`Quiz generation failed (HTTP ${res.status}). Please try again.`); }
      if (!res.ok) {
        throw new Error(payload?.error ?? `Quiz generation failed (${res.status})`);
      }
      const qs: SlideQuestion[] = Array.isArray(payload?.questions) ? payload.questions : [];
      if (qs.length === 0) {
        throw new Error("The model returned no questions for this slide. Try again or move to a slide with more content.");
      }
      setQuestions(qs.map(shuffleQuestion));
      setCurrent(0); setSelected(null); setScore(0); setDone(false);

      // Cache back
      await fetch(`/api/pdf/${slide.pdf_id}/slides`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slideId: slide.id, field: "quiz_json", value: qs }),
      });
      slide.quiz_json = qs;
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Quiz generation failed");
    } finally { setLoading(false); }
  };

  const q = questions[current];

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correctIndex) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) { setDone(true); return; }
    setCurrent(c => c + 1);
    setSelected(null);
  };

  // Only block on analysis if there's literally no slide text to fall back on.
  if (!analysis && !slide?.quiz_json && !slide?.page_text?.trim()) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        <p className="text-slate-600 dark:text-slate-400 text-sm">Waiting for slide analysis…</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <Zap className="w-10 h-10 text-violet-400" />
        <p className="text-slate-900 dark:text-white font-semibold">Ready to quiz this slide?</p>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Generate 6 exam-style questions based on this slide&apos;s content.</p>
        <button
          onClick={loadQuestions}
          disabled={loading}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</> : "Generate Quiz"}
        </button>
        {loadErr && (
          <p className="text-red-400 text-xs max-w-sm">{loadErr}</p>
        )}
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        <div className={clsx(
          "w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold",
          pct >= 80 ? "bg-emerald-500/20 text-emerald-400" : pct >= 60 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
        )}>
          {pct}%
        </div>
        <p className="text-slate-900 dark:text-white font-semibold">{score}/{questions.length} correct</p>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {pct >= 80 ? "Excellent work!" : pct >= 60 ? "Good effort — review the misses." : "Keep studying this slide."}
        </p>
        <button
          onClick={() => { setCurrent(0); setSelected(null); setScore(0); setDone(false); }}
          className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-semibold flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
        <button onClick={loadQuestions} className="text-violet-400 text-sm hover:text-violet-300">
          New questions
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-600 dark:text-slate-400">Question {current + 1}/{questions.length}</span>
        <span className="text-xs text-slate-600 dark:text-slate-400">{score} correct</span>
      </div>
      <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full mb-5">
        <div
          className="h-full bg-violet-500 rounded-full transition-all"
          style={{ width: `${((current) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-slate-900 dark:text-white font-medium text-sm leading-relaxed mb-5">{q.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex;
          const isSelected = selected === i;
          let style = "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-violet-500";
          if (selected !== null) {
            if (isCorrect)       style = "border-emerald-500 bg-emerald-900/30 text-emerald-300";
            else if (isSelected) style = "border-red-500 bg-red-900/30 text-red-300";
            else                 style = "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 text-slate-500";
          }
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={selected !== null}
              className={clsx("w-full text-left border rounded-xl px-4 py-3 text-sm transition-all flex items-start gap-3", style)}
            >
              <span className="font-mono text-xs mt-0.5 opacity-60">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{opt}</span>
              {selected !== null && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
              {selected !== null && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {selected !== null && (
        <div className="mt-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Explanation</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
          <button
            onClick={handleNext}
            className="mt-3 w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
          >
            {current + 1 >= questions.length ? "See Results" : "Next Question →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Build context-aware starter questions from slide analysis ─────────────────

function buildStarters(analysis: SlideAnalysis | null): string[] {
  if (!analysis) {
    return [
      "Walk me through this slide",
      "Summarise the key points",
      "What should I take away from this?",
      "Quiz me on this slide",
    ];
  }

  const starters: string[] = [];
  const topic = analysis.diagnosis?.trim();
  const isHisto =
    (analysis.ihcMarkers?.length ?? 0) > 0 ||
    (analysis.stain?.type && analysis.stain.type !== "N/A" && analysis.stain.type !== "none");

  if (topic) {
    starters.push(isHisto ? `Explain the diagnosis: ${topic}` : `Explain ${topic} in more depth`);
  } else {
    starters.push("Walk me through this slide");
  }

  // Surface as many concrete learning points as fit — for outline-style slides
  // these correspond to actual sections (Biodata, Chief Complaint, History of
  // Present Illness…) and the student wants to drill into each one.
  const points = analysis.keyLearningPoints ?? [];
  const pointStarters = points
    .slice(0, 4)
    .map((p) => `Tell me more about: ${truncate(p, 70)}`);
  starters.push(...pointStarters);

  if (isHisto && (analysis.ihcMarkers?.length ?? 0) > 0) {
    starters.push("Which IHC markers would confirm this?");
  } else if ((analysis.differentialDiagnosis?.length ?? 0) > 0) {
    starters.push("What are the main differentials and how do I tell them apart?");
  } else {
    starters.push("Quiz me with a quick scenario on this");
  }

  return starters.slice(0, 6);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

// ── Chat (AI Tutor) Panel ─────────────────────────────────────────────────────

function ChatPanel({
  slide, analysis, getToken,
}: {
  slide: PDFSlide;
  analysis: SlideAnalysis | null;
  getToken: () => Promise<string>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => buildStarters(analysis));
  const [asked, setAsked]       = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset when slide changes
  useEffect(() => {
    setMessages([]);
    setAsked(new Set());
    setSuggestions(buildStarters(analysis));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide?.id]);

  // Refresh the starter chips once analysis loads, but only while the chat is
  // still empty — don't clobber AI-generated follow-ups mid-conversation.
  useEffect(() => {
    if (messages.length === 0) setSuggestions(buildStarters(analysis));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (override?: string) => {
    const q = (override ?? input).trim();
    if (!q || sending) return;
    if (!override) setInput("");
    setAsked(prev => new Set(prev).add(q));

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const token = await getToken();
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(`/api/pdf/${slide.pdf_id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question: q,
          slideId: slide.id,
          slideAnalysis: analysis,
          pageText: slide.page_text,
          history,
        }),
      });
      const { answer, error, suggestions: followups } = await res.json();
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer ?? error ?? "Sorry, I couldn't answer that.",
        created_at: new Date().toISOString(),
      }]);
      if (Array.isArray(followups) && followups.length > 0) {
        setSuggestions(followups.slice(0, 4));
      }
    } finally { setSending(false); }
  };

  // Hide suggestions the student has already asked so the list stays fresh.
  const visibleSuggestions = suggestions.filter(s => !asked.has(s));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-4">
            <MessageSquare className="w-10 h-10 text-blue-400" />
            <div>
              <p className="text-slate-900 dark:text-white font-semibold mb-1">Ask about this slide</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Expert AI tutoring will answer using your slide content as context.</p>
            </div>
            <div className="w-full space-y-2">
              {visibleSuggestions.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={sending}
                  className="w-full text-left px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={clsx("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white">
                  AI
                </div>
              )}
              <div className={clsx(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                m.role === "user"
                  ? "bg-violet-600 text-white rounded-tr-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700"
              )}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{stripMathMarkup(m.content)}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{m.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">AI</div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 dark:border-slate-700/60 p-3 bg-white dark:bg-slate-900">
        {messages.length > 0 && visibleSuggestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-1 -mx-1 px-1 scrollbar-thin">
            {visibleSuggestions.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={sending}
                className="flex-shrink-0 max-w-[240px] truncate px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs border border-blue-200 dark:border-blue-500/30 transition-colors disabled:opacity-50"
                title={s}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about this slide…"
            className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || sending}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
