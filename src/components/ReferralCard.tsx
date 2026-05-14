"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Gift, Copy, Check, Share2 } from "lucide-react";
import { clsx } from "clsx";
import { useReferral } from "@/lib/useReferral";

interface Props { user: User }

const SHARE_TEXT =
  "I've been using PathoLearn to study histopathology with AI — it analyses slides, makes flashcards & quizzes from your own notes. Try it free for 14 days:";

export default function ReferralCard({ user }: Props) {
  const { referralLink, referralCount, loading } = useReferral(user);
  const [copied, setCopied] = useState(false);

  if (loading || !referralLink) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shareNative = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "PathoLearn", text: SHARE_TEXT, url: referralLink });
        return;
      } catch { /* user canceled */ }
    }
    copy();
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${referralLink}`)}`;
  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(referralLink)}`;

  return (
    <div className="bg-gradient-to-br from-primary-50 to-violet-50 dark:from-primary-950/40 dark:to-violet-950/40 rounded-2xl border border-primary-100 dark:border-primary-900/50 p-5 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base sm:text-lg">
            Invite a friend, get 30 free days
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            When they subscribe, you get a free month added to your plan — automatically.
            {referralCount > 0 && (
              <span className="ml-1 text-primary-600 dark:text-primary-400 font-semibold">
                {referralCount} friend{referralCount !== 1 ? "s" : ""} referred so far.
              </span>
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <input
              readOnly
              value={referralLink}
              onClick={e => (e.target as HTMLInputElement).select()}
              className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-primary-200 dark:border-primary-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-400 select-all"
            />
            <button
              onClick={copy}
              className={clsx(
                "px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors",
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-primary-600 text-white hover:bg-primary-700"
              )}
            >
              {copied
                ? <><Check className="w-4 h-4" /> Copied</>
                : <><Copy className="w-4 h-4" /> Copy</>}
            </button>
          </div>

          {/* Share row */}
          <div className="flex items-center gap-2 mt-3 text-xs">
            <button
              onClick={shareNative}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            >
              WhatsApp
            </a>
            <a
              href={twitterUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600 transition-colors"
            >
              X / Twitter
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
