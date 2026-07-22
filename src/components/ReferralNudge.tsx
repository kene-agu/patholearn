"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Gift, X, Copy, Check } from "lucide-react";
import { clsx } from "clsx";
import { useReferral } from "@/lib/useReferral";

const TRIGGER_KEY      = "pl-referral-nudge-triggers";
const DISMISS_KEY      = "pl-referral-nudge-dismissed-at";
const TRIGGER_AT       = 3;                                    // show after N feature completions
const REPROMPT_AFTER_MS = 14 * 24 * 60 * 60 * 1000;            // re-show 14 days after dismiss

interface Props {
  user: User | null;
}

/**
 * Increments the cross-feature engagement counter. Call this from any major
 * feature when the user successfully completes an interaction (e.g. finished
 * a slide analysis, completed a quiz, finished a flashcard session, processed
 * a Smart Learn document).
 */
export function recordReferralTrigger(_featureKey?: string) {
  if (typeof window === "undefined") return;
  const n = parseInt(localStorage.getItem(TRIGGER_KEY) ?? "0", 10);
  localStorage.setItem(TRIGGER_KEY, String(n + 1));
}

function isDismissedRecently(userId: string): boolean {
  try {
    const raw = localStorage.getItem(`${DISMISS_KEY}-${userId}`);
    if (!raw) return false;
    const at = parseInt(raw, 10);
    if (Number.isNaN(at)) return false;
    return Date.now() - at < REPROMPT_AFTER_MS;
  } catch { return false; }
}

function markDismissedNow(userId: string) {
  try { localStorage.setItem(`${DISMISS_KEY}-${userId}`, String(Date.now())); } catch {}
}

export default function ReferralNudge({ user }: Props) {
  const { referralLink } = useReferral(user);
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !referralLink) return;
    const check = () => {
      const triggers = parseInt(localStorage.getItem(TRIGGER_KEY) ?? "0", 10);
      if (triggers < TRIGGER_AT) return;
      if (isDismissedRecently(user.id)) return;
      setOpen(true);
    };

    check();
    const interval  = setInterval(check, 4000);
    const onStorage = (e: StorageEvent) => { if (e.key === TRIGGER_KEY) check(); };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, [user?.id, referralLink]);

  if (!open || !user || !referralLink) return null;

  const dismiss = () => {
    markDismissedNow(user.id);
    // Reset the trigger counter so it has to climb again before next prompt
    try { localStorage.setItem(TRIGGER_KEY, "0"); } catch {}
    setOpen(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-6 z-40 w-full max-w-xs bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 p-4 animate-fade-in"
      role="dialog"
      aria-label="Refer a friend"
    >
      <button
        onClick={dismiss}
        className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <Gift className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight">
            Enjoying PathoLearn?
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
            Share with a friend — when they subscribe, you get
            <span className="font-semibold text-slate-700 dark:text-slate-300"> 30 free days</span>{" "}
            and they get 20% off their first month.
          </p>
        </div>
      </div>

      <button
        onClick={copy}
        className={clsx(
          "w-full mt-3 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
          copied
            ? "bg-emerald-500 text-white"
            : "bg-primary-600 text-white hover:bg-primary-700"
        )}
      >
        {copied
          ? <><Check className="w-3.5 h-3.5" /> Link copied — now paste & send</>
          : <><Copy className="w-3.5 h-3.5" /> Copy referral link</>}
      </button>
    </div>
  );
}
