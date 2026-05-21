"use client";

// Root SmartLearn component — owns navigation state between all sub-screens.
// Screens: upload → explorer → (learner | flashcards)

import { useState, useEffect, useRef, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import type { PDFDocument, PDFSlide, ProcessedPDF, SlideAnalysis } from "@/types/smartLearn";
import PDFUploader from "./PDFUploader";
import SlideExplorer from "./SlideExplorer";
import SlideLearner from "./SlideLearner";
import PDFFlashcards from "./PDFFlashcards";
import { supabase } from "@/lib/supabase";
import { prewarmAnalyses } from "@/lib/analysisPrewarm";
import { FileText, Plus, ChevronRight, Loader2, Search, X } from "lucide-react";

// ── Display-only title cleaner ────────────────────────────────────────────────
// Strips special characters and removes trailing presenter codes from titles.
// Does NOT modify stored data.
function cleanDocTitle(raw: string): string {
  // Remove special characters — keep alphanumeric, spaces, commas, hyphens,
  // colons, parentheses, and apostrophes.
  let title = raw.replace(/[^a-zA-Z0-9 ,\-:()']/g, " ").replace(/\s{2,}/g, " ").trim();

  // Remove trailing all-caps abbreviation codes.
  // Rule: if a word is all-caps AND 2–5 chars AND appears after the 5th word,
  // it is likely a presenter code — drop it and everything after it.
  const words = title.split(" ");
  let cutAt = words.length;
  for (let i = Math.min(5, words.length - 1); i < words.length; i++) {
    const w = words[i];
    if (/^[A-Z]{2,5}$/.test(w)) {
      cutAt = i;
      break;
    }
  }
  return words.slice(0, cutAt).join(" ").trim();
}

interface Props {
  user: User;
}

type Screen =
  | { name: "library" }
  | { name: "upload" }
  | { name: "explorer"; pdfDoc: PDFDocument; slides: PDFSlide[] }
  | { name: "learner";  pdfDoc: PDFDocument; slides: PDFSlide[]; startPage?: number; panel?: "quiz" | "chat" }
  | { name: "flashcards"; pdfDoc: PDFDocument; slides: PDFSlide[] };

export default function SmartLearn({ user }: Props) {
  const [screen, setScreen] = useState<Screen>({ name: "library" });
  const [library, setLibrary] = useState<PDFDocument[]>([]);
  const [libLoading, setLibLoading] = useState(true);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  };

  // Load user's PDF library on mount
  useEffect(() => {
    (async () => {
      setLibLoading(true);
      const { data } = await supabase
        .from("pdf_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setLibrary((data as PDFDocument[]) ?? []);
      setLibLoading(false);
    })();
  }, [user.id]);

  const handleUploadComplete = (result: ProcessedPDF) => {
    setLibrary(prev => [result.pdfDoc, ...prev]);
    setScreen({ name: "explorer", pdfDoc: result.pdfDoc, slides: result.slides });
  };

  // ── Background pre-warm: analyse every un-analysed slide on entry ───────────
  // Updates the live `screen.slides` array as each result lands so the user
  // sees instant "Analyzed" badges and skips the 8-10s LLM wait on navigation.
  const prewarmedRef = useRef<Set<string>>(new Set());

  const applyAnalysis = useCallback((slideId: string, analysis: SlideAnalysis) => {
    setScreen(prev => {
      if (prev.name !== "explorer" && prev.name !== "learner" && prev.name !== "flashcards") return prev;
      return {
        ...prev,
        slides: prev.slides.map(s => s.id === slideId ? { ...s, analysis_json: analysis } : s),
      };
    });
  }, []);

  useEffect(() => {
    if (screen.name !== "explorer" && screen.name !== "learner") return;
    const pdfId = screen.pdfDoc.id;
    if (prewarmedRef.current.has(pdfId)) return;
    prewarmedRef.current.add(pdfId);

    let cancelled = false;
    prewarmAnalyses(screen.slides, {
      getToken,
      onAnalyzed: applyAnalysis,
      shouldAbort: () => cancelled,
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.name, "pdfDoc" in screen ? screen.pdfDoc?.id : null]);

  const openPDF = async (pdfDoc: PDFDocument) => {
    const token = await getToken();
    const res   = await fetch(`/api/pdf/${pdfDoc.id}/slides`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { slides } = await res.json();
    setScreen({ name: "explorer", pdfDoc, slides: slides ?? [] });
  };

  const handleDeleteSlide = async (slideId: string) => {
    const token = await getToken();
    await fetch(`/api/pdf/slides/${slideId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (screen.name === "explorer") {
      setScreen({
        ...screen,
        slides: screen.slides.filter(s => s.id !== slideId),
      });
    }
  };

  // ── Library screen ──────────────────────────────────────────────────────────
  if (screen.name === "library") {
    return <LibraryScreen
      library={library}
      libLoading={libLoading}
      onUpload={() => setScreen({ name: "upload" })}
      onOpen={openPDF}
    />;
  }

  // ── Upload screen ───────────────────────────────────────────────────────────
  if (screen.name === "upload") {
    return (
      <PDFUploader
        user={user}
        onComplete={handleUploadComplete}
        onBack={() => setScreen({ name: "library" })}
      />
    );
  }

  // ── Explorer screen ─────────────────────────────────────────────────────────
  if (screen.name === "explorer") {
    const { pdfDoc, slides } = screen;
    return (
      <SlideExplorer
        pdfDoc={pdfDoc}
        slides={slides}
        user={user}
        onBack={() => setScreen({ name: "library" })}
        onStartQuiz={(s, startPage) =>
          setScreen({ name: "learner", pdfDoc, slides: s, startPage, panel: "quiz" })}
        onStartFlashcards={(s) =>
          setScreen({ name: "flashcards", pdfDoc, slides: s })}
        onOpenTutor={(s, startPage) =>
          setScreen({ name: "learner", pdfDoc, slides: s, startPage, panel: "chat" })}
        onDeleteSlide={handleDeleteSlide}
      />
    );
  }

  // ── Learner (split-view) screen ─────────────────────────────────────────────
  if (screen.name === "learner") {
    const { pdfDoc, slides, startPage, panel } = screen;
    return (
      <SlideLearner
        slides={slides}
        initialPage={startPage}
        user={user}
        defaultPanel={panel ?? "quiz"}
        onBack={() => setScreen({ name: "explorer", pdfDoc, slides })}
      />
    );
  }

  // ── Flashcards screen ───────────────────────────────────────────────────────
  if (screen.name === "flashcards") {
    const { pdfDoc, slides } = screen;
    return (
      <PDFFlashcards
        slides={slides}
        user={user}
        onBack={() => setScreen({ name: "explorer", pdfDoc, slides })}
      />
    );
  }

  return null;
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyLibrary({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="text-center py-20 px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-violet-600/10 mb-6">
        <FileText className="w-10 h-10 text-violet-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">No documents yet</h2>
      <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
        Upload lecture slides, notes, or textbook chapters and instantly convert them into
        quizzes, flashcards, and an AI tutor session.
      </p>
      <button
        onClick={onUpload}
        className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl inline-flex items-center gap-2 transition-colors"
      >
        <Plus className="w-4 h-4" /> Upload your first document
      </button>

      <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm mx-auto text-center">
        {[
          { emoji: "⚡", label: "Quiz Mode", desc: "6 AI questions per slide" },
          { emoji: "🧠", label: "Flashcards", desc: "SM-2 spaced repetition" },
          { emoji: "💬", label: "AI Tutor", desc: "Ask anything about your slides" },
        ].map(({ emoji, label, desc }) => (
          <div key={label} className="bg-slate-800/60 rounded-2xl p-4">
            <span className="text-2xl">{emoji}</span>
            <p className="text-white text-xs font-semibold mt-2">{label}</p>
            <p className="text-slate-500 text-xs mt-1">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
