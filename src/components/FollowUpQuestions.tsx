"use client";

import { useState, useMemo } from "react";
import { MessageCircle, Loader2, Send, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { stripMathMarkup } from "@/lib/sanitizeAiText";
import type { AnalysisResult } from "@/types/analysis";
import { authedFetch } from "@/lib/authedFetch";
import Combobox, { type Suggestion } from "@/components/Combobox";
import { buildSlideSuggestions } from "@/lib/slideQuestionSuggestions";

interface FollowUpQuestionsProps {
  imageBase64: string;
  mediaType: string;
  analysis: AnalysisResult;
  diagnosisContext?: string;
}

const PRESET_QUESTIONS = [
  { label: "Stain details", q: "What stain was used in this slide? Describe the colour pattern and what each colour represents structurally and chemically." },
  { label: "Risk factors", q: "What are the major risk factors associated with this condition? Include environmental, genetic, and lifestyle factors." },
  { label: "Complications", q: "What are the potential complications and long-term consequences of this pathological finding?" },
  { label: "Differentials", q: "What are the key differential diagnoses and how would you distinguish them histologically?" },
  { label: "Clinical features", q: "How does this histological finding correlate with the clinical presentation a patient might show?" },
  { label: "IHC markers", q: "What immunohistochemistry (IHC) markers would you use to confirm this diagnosis? List each marker, whether it would be positive or negative, and explain the clinical and diagnostic significance of each marker in the context of this condition." },
  { label: "Pathogenesis", q: "Walk me through the complete pathogenesis of this condition — from the initiating aetiology through the molecular and cellular mechanisms to the end-stage tissue changes seen in this slide. Use clear sequential steps suitable for a medical student." },
  { label: "Treatment", q: "What are the main treatment options for this condition and how does the histological grade influence management?" },
  { label: "Prognosis", q: "What is the prognosis for this condition and which histological features influence it most?" },
  { label: "Grading/Staging", q: "Is there a grading or staging system applicable to this condition? How does what you see in this slide fit into it?" },
  { label: "Molecular targets", q: "Are there any targetable molecular pathways or genetic mutations associated with this condition? How do they influence therapy selection?" },
];

interface QAItem {
  question: string;
  answer: string;
}

export default function FollowUpQuestions({ imageBase64, mediaType, analysis, diagnosisContext }: FollowUpQuestionsProps) {
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [openAnswerIdx, setOpenAnswerIdx] = useState<number | null>(null);

  // Searchable question suggestions — diagnosis-aware (tailored to this slide)
  // plus a general histopath bank. Filters as you type.
  const suggestionBank = useMemo(() => buildSlideSuggestions(analysis), [analysis]);
  const getSuggestions = (query: string): Suggestion[] => {
    const q = query.trim().toLowerCase();
    return q ? suggestionBank.filter((s) => s.label.toLowerCase().includes(q)) : suggestionBank;
  };

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    setLoading(true);

    try {
      const res = await authedFetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ imageBase64, mediaType, question, analysisContext: analysis, diagnosisContext }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // Account prompts (guest limit, expired trial) carry a user-facing
        // message worth showing verbatim; anything else gets a human fallback.
        const isAccountPrompt = (res.status === 401 || res.status === 403) && typeof data?.error === "string";
        const answer = isAccountPrompt
          ? data.error
          : "We couldn't get an answer just now — the AI service may be busy. Please ask again in a moment.";
        setQaList((prev) => [{ question, answer }, ...prev]);
        setOpenAnswerIdx(0);
        return;
      }

      const answer = data?.raw ?? data?.analysis?.overview ?? "No answer received.";
      const newItem = { question, answer };
      setQaList((prev) => [newItem, ...prev]);
      setOpenAnswerIdx(0);
      setCustomQuestion("");
    } catch {
      setQaList((prev) => [{ question, answer: "We couldn't get an answer just now — please check your connection and ask again." }, ...prev]);
      setOpenAnswerIdx(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800 text-sm">Follow-Up Questions</p>
            <p className="text-xs text-slate-500">Ask anything about this slide</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-100">

          {/* Preset question chips */}
          <div className="pt-4">
            <p className="text-xs font-medium text-slate-500 mb-2.5">Quick questions</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_QUESTIONS.map(({ label, q }) => (
                <button
                  key={label}
                  onClick={() => ask(q)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 text-slate-600 transition-all duration-150 disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom question input with searchable suggestions */}
          <Combobox
            value={customQuestion}
            onChange={setCustomQuestion}
            onSelect={(s) => ask(s.label)}
            onSubmit={(v) => ask(v)}
            getSuggestions={getSuggestions}
            placeholder="Ask your own question about this slide…"
            disabled={loading}
            heading="Suggestions"
            inputClassName="input text-sm"
            trailing={
              <button
                onClick={() => ask(customQuestion)}
                disabled={loading || !customQuestion.trim()}
                className="btn-primary px-4 flex items-center gap-1.5 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            }
          />

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
              Analysing…
            </div>
          )}

          {/* Q&A list */}
          {qaList.length > 0 && (
            <div className="space-y-3">
              {qaList.map((item, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenAnswerIdx(openAnswerIdx === idx ? null : idx)}
                    className="w-full flex items-start justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <p className="text-sm font-medium text-slate-800 leading-snug">{item.question}</p>
                    {openAnswerIdx === idx
                      ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />}
                  </button>
                  {openAnswerIdx === idx && (
                    <div className="px-4 py-3 bg-white prose prose-sm prose-slate max-w-none
                      prose-headings:font-semibold prose-headings:text-slate-800
                      prose-h2:text-sm prose-h2:mt-3 prose-h2:mb-1
                      prose-h3:text-xs prose-h3:mt-2 prose-h3:mb-1
                      prose-p:text-slate-700 prose-p:leading-relaxed prose-p:my-1
                      prose-strong:text-slate-800 prose-strong:font-semibold
                      prose-ul:my-1 prose-li:my-0.5 prose-li:text-slate-700
                      prose-ol:my-1">
                      <ReactMarkdown>{stripMathMarkup(item.answer)}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
