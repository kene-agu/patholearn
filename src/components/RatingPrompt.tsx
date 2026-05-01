"use client";

import { useEffect, useState } from "react";
import { X, Star, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import type { User } from "@supabase/supabase-js";
import { authedFetch } from "@/lib/authedFetch";

const ANALYSES_BEFORE_PROMPT = 5;
const COUNTER_KEY  = "pl-analyses-completed";
const PROMPTED_KEY = "pl-rating-prompted-at";
// Re-prompt at most once per 30 days, only if user dismissed without rating
const REPROMPT_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

interface RatingPromptProps {
  user: User | null;
}

/**
 * Increments the analyses-completed counter. Call this from anywhere a slide
 * analysis successfully completes.
 */
export function recordAnalysisCompleted() {
  if (typeof window === "undefined") return;
  const n = parseInt(localStorage.getItem(COUNTER_KEY) ?? "0", 10);
  localStorage.setItem(COUNTER_KEY, String(n + 1));
}

export default function RatingPrompt({ user }: RatingPromptProps) {
  const [open, setOpen]     = useState(false);
  const [rating, setRating] = useState(0);
  const [hover,  setHover]  = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  useEffect(() => {
    if (!user) return;
    const check = () => {
      const count = parseInt(localStorage.getItem(COUNTER_KEY) ?? "0", 10);
      if (count < ANALYSES_BEFORE_PROMPT) return;

      const promptedAt = parseInt(localStorage.getItem(PROMPTED_KEY) ?? "0", 10);
      if (promptedAt && Date.now() - promptedAt < REPROMPT_AFTER_MS) return;

      setOpen(true);
    };

    // Check on mount and when storage updates (works across tabs)
    check();
    const onStorage = (e: StorageEvent) => { if (e.key === COUNTER_KEY) check(); };
    window.addEventListener("storage", onStorage);
    // Also re-check periodically in case the same tab updated counter via recordAnalysisCompleted()
    const interval = setInterval(check, 5000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, [user]);

  const dismiss = (markPrompted: boolean) => {
    if (markPrompted) {
      localStorage.setItem(PROMPTED_KEY, String(Date.now()));
    }
    setOpen(false);
  };

  const submit = async () => {
    if (rating < 1) return;
    setSubmitting(true);
    try {
      await authedFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ type: "rating", rating, message: comment.trim() || null }),
      });
      // Permanent — never re-prompt this user after they actually rated
      localStorage.setItem(PROMPTED_KEY, String(Date.now() + REPROMPT_AFTER_MS * 100));
      setSubmitted(true);
      setTimeout(() => setOpen(false), 1500);
    } catch {
      // Silent — don't bother the user about a feedback error
      dismiss(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !user) return null;

  return (
    <div
      className="fixed bottom-6 left-6 z-40 w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-5 animate-fade-in"
      role="dialog"
      aria-label="Rate PathoLearn"
    >
      <button
        onClick={() => dismiss(true)}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {submitted ? (
        <div className="py-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Thanks for the feedback! 💚</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">It helps us make PathoLearn better.</p>
        </div>
      ) : (
        <>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">How is PathoLearn going?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Your feedback is private and only seen by our team.
          </p>

          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={clsx(
                    "w-7 h-7 transition-colors",
                    (hover || rating) >= n
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-300 dark:text-slate-600"
                  )}
                />
              </button>
            ))}
          </div>

          {rating > 0 && (
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                rating >= 4
                  ? "What's working well? (optional)"
                  : "What could we improve? (optional)"
              }
              rows={2}
              maxLength={1000}
              className="input w-full resize-none text-sm mb-3"
            />
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => dismiss(true)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Maybe later
            </button>
            <button
              onClick={submit}
              disabled={rating < 1 || submitting}
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Submit
            </button>
          </div>
        </>
      )}
    </div>
  );
}
