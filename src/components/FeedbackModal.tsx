"use client";

import { useState } from "react";
import { X, Loader2, Send, Bug, Sparkles, MessageSquare, HelpCircle, CheckCircle, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { authedFetch } from "@/lib/authedFetch";

type FeedbackType = "bug" | "feature" | "question" | "other";

interface FeedbackModalProps {
  onClose: () => void;
}

const CATEGORIES: { value: FeedbackType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "bug",      label: "Bug report",      icon: Bug,           color: "rose"   },
  { value: "feature",  label: "Feature request", icon: Sparkles,      color: "violet" },
  { value: "question", label: "Question",        icon: HelpCircle,    color: "sky"    },
  { value: "other",    label: "Other",           color: "slate",      icon: MessageSquare },
];

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [type, setType]       = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) { setError("Please describe what you'd like to share."); return; }
    setLoading(true); setError(null);
    try {
      const res = await authedFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({ type, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg p-5 sm:p-7 animate-fade-in max-h-[90dvh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="py-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">Thanks for the feedback!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              We&apos;ve received your message and will get back to you soon.
            </p>
            <button onClick={onClose} className="btn-primary text-sm px-5 py-2">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Send feedback</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Found a bug, want a feature, or have a question? We read every message.
              </p>
            </div>

            {/* Category buttons */}
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    type === value
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Your message
              </label>
              <textarea
                value={message}
                onChange={(e) => { setMessage(e.target.value); setError(null); }}
                placeholder={
                  type === "bug"      ? "What happened? What were you expecting?"
                  : type === "feature" ? "What feature would you love to see?"
                  : type === "question" ? "What can we help you with?"
                  : "Tell us more…"
                }
                rows={5}
                maxLength={4000}
                className="input w-full resize-none text-sm"
                required
              />
              <div className="text-[11px] text-slate-400 mt-1 text-right">
                {message.length}/4000
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-3 text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                : <><Send className="w-4 h-4" /> Send feedback</>
              }
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
