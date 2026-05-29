"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { authedFetch } from "@/lib/authedFetch";
import { track } from "@/lib/track";

interface AnalysisFeedbackProps {
  /** The diagnosis — used both as admin context and to remember the vote per-case. */
  diagnosis: string;
  /** Optional slide identifier, makes the per-case memory key more specific. */
  slideLabel?: string | null;
}

type Verdict = "up" | "down";
type Phase = "idle" | "commenting" | "submitting" | "done";

const STORE_PREFIX = "pl-analysis-fb:";

function caseKey(diagnosis: string, slideLabel?: string | null): string {
  const raw = `${slideLabel ?? ""}|${diagnosis}`.toLowerCase().trim();
  return STORE_PREFIX + raw.replace(/\s+/g, "-").slice(0, 120);
}

/**
 * Lightweight 👍 / 👎 reaction shown under each slide analysis — like the
 * "Rate this translation" widget on X. A thumbs-up submits instantly; a
 * thumbs-down opens an optional "what was off?" box (the highest-signal
 * input for improving the AI). Works for guests as well as signed-in users.
 */
export default function AnalysisFeedback({ diagnosis, slideLabel }: AnalysisFeedbackProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [comment, setComment] = useState("");

  const key = caseKey(diagnosis, slideLabel);

  // Restore a previous vote for this case so we don't keep asking.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prev = localStorage.getItem(key);
    if (prev === "up" || prev === "down") {
      setVerdict(prev);
      setPhase("done");
    } else {
      setVerdict(null);
      setComment("");
      setPhase("idle");
    }
  }, [key]);

  const submit = async (v: Verdict, note: string) => {
    setVerdict(v);
    setPhase("submitting");
    try {
      localStorage.setItem(key, v);
    } catch {
      /* private mode — non-fatal */
    }
    try {
      await authedFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          type: "analysis",
          verdict: v,
          context: diagnosis,
          message: note.trim() || null,
        }),
      });
    } catch {
      // Don't surface feedback-submission errors to the user — the vote is
      // already recorded locally and this is fire-and-forget signal.
    }
    track("analysis_rated", { verdict: v, diagnosis, hasComment: Boolean(note.trim()) });
    setPhase("done");
  };

  const handleClick = (v: Verdict) => {
    if (phase === "submitting" || phase === "done") return;
    if (v === "up") {
      submit("up", "");
    } else {
      setVerdict("down");
      setPhase("commenting");
    }
  };

  return (
    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
      {phase === "done" ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          {verdict === "up" ? <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" /> : <ThumbsDown className="w-3.5 h-3.5 text-slate-400" />}
          Thanks for the feedback! 💚
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Was this analysis helpful?
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleClick("up")}
                disabled={phase === "submitting"}
                aria-label="Helpful"
                className={clsx(
                  "p-1.5 rounded-lg border transition-colors disabled:opacity-60",
                  verdict === "up"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
                    : "text-slate-400 border-transparent hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                )}
              >
                {phase === "submitting" && verdict === "up"
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ThumbsUp className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleClick("down")}
                disabled={phase === "submitting"}
                aria-label="Not helpful"
                className={clsx(
                  "p-1.5 rounded-lg border transition-colors disabled:opacity-60",
                  verdict === "down"
                    ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                    : "text-slate-400 border-transparent hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                )}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {phase === "commenting" && (
            <div className="mt-2.5">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What was off? (optional — helps us improve the AI)"
                rows={2}
                maxLength={1000}
                autoFocus
                className="input w-full resize-none text-xs"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => submit("down", "")}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Skip
                </button>
                <button
                  onClick={() => submit("down", comment)}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
