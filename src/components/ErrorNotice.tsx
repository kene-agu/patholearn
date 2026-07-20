"use client";

/**
 * Shared error display. Tone drives colour + icon so users can tell at a
 * glance whether it's something they can fix (amber), something transient
 * (sky, with a retry button), something needing an account action (primary),
 * or an unexpected error (red).
 */

import { AlertCircle, AlertTriangle, Clock, RefreshCw, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import type { FriendlyError } from "@/lib/friendlyError";

interface ErrorNoticeProps {
  error: FriendlyError;
  /** Shown as a "Try again" button when the error is retryable. */
  onRetry?: () => void;
  /** Optional call-to-action (e.g. Upgrade, Sign in) for action-tone errors. */
  action?: { label: string; onClick: () => void };
  className?: string;
}

const TONE_STYLES = {
  fix: {
    box: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  wait: {
    box: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-200",
    icon: Clock,
    iconColor: "text-sky-500",
  },
  action: {
    box: "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800/60 text-primary-800 dark:text-primary-200",
    icon: Sparkles,
    iconColor: "text-primary-500",
  },
  error: {
    box: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300",
    icon: AlertCircle,
    iconColor: "text-red-500",
  },
} as const;

export default function ErrorNotice({ error, onRetry, action, className }: ErrorNoticeProps) {
  const tone = TONE_STYLES[error.tone];
  const Icon = tone.icon;
  const showRetry = onRetry && error.canRetry;

  return (
    <div
      role="alert"
      className={clsx("flex items-start gap-2.5 rounded-xl border p-4 text-sm", tone.box, className)}
    >
      <Icon className={clsx("w-4 h-4 flex-shrink-0 mt-0.5", tone.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{error.title}</p>
        <p className="mt-0.5 opacity-90">{error.message}</p>
        {(showRetry || action) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            {action && (
              <button
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                {action.label}
              </button>
            )}
            {showRetry && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRetry(); }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Try again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
