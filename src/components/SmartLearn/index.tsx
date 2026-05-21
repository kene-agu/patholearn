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
import { FileText, Plus, ChevronRight, Loader2, Search, X, Trash2 } from "lucide-react";

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
  canUseInfographics?: boolean;
}

type Screen =
  | { name: "library" }
  | { name: "upload" }
  | { name: "explorer"; pdfDoc: PDFDocument; slides: PDFSlide[] }
  | { name: "learner";  pdfDoc: PDFDocument; slides: PDFSlide[]; startPage?: number; panel?: "quiz" | "chat" }
  | { name: "flashcards"; pdfDoc: PDFDocument; slides: PDFSlide[] };

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

// ── Library screen (with search) ──────────────────────────────────────────────

function LibraryScreen({
  library,
  libLoading,
  onUpload,
  onOpen,
  onDelete,
}: {
  library: PDFDocument[];
  libLoading: boolean;
  onUpload: () => void;
  onOpen: (doc: PDFDocument) => void;
  onDelete: (doc: PDFDocument) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? library.filter(doc => cleanDocTitle(doc.title).toLowerCase().includes(trimmed))
    : library;

  const handleDelete = async (doc: PDFDocument) => {
    setDeletingId(doc.id);
    try {
      await onDelete(doc);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Smart Learn</h1>
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {libLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      ) : library.length === 0 ? (
        <EmptyLibrary onUpload={onUpload} />
      ) : (
        <>
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search documents…"
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Document list */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No documents match your search.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(doc => {
                const isConfirming = confirmId === doc.id;
                const isDeleting   = deletingId === doc.id;

                if (isConfirming) {
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-slate-800 border border-red-500/40"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center flex-shrink-0">
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{cleanDocTitle(doc.title)}</p>
                        <p className="text-slate-400 text-xs mt-0.5">This will permanently delete the document and all its data.</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          disabled={isDeleting}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-60 transition-colors"
                        >
                          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={doc.id} className="flex items-center gap-2 group">
                    <button
                      onClick={() => onOpen(doc)}
                      className="flex-1 flex items-center gap-4 p-4 rounded-2xl bg-slate-800 border border-slate-700 hover:border-violet-500/50 hover:bg-slate-800/80 transition-all text-left min-w-0"
                    >
                      <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{cleanDocTitle(doc.title)}</p>
                        <p className="text-slate-400 text-sm">{doc.total_pages} slides · {new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                    </button>
                    <button
                      onClick={() => setConfirmId(doc.id)}
                      aria-label="Delete document"
                      className="p-2.5 rounded-xl text-slate-600 hover:text-red-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SmartLearn({ user, canUseInfographics = true }: Props) {
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

  const handleDeleteDoc = async (pdfDoc: PDFDocument) => {
    const token = await getToken();
    await fetch(`/api/pdf/${pdfDoc.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setLibrary(prev => prev.filter(d => d.id !== pdfDoc.id));
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
      onDelete={handleDeleteDoc}
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
        canUseInfographics={canUseInfographics}
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
