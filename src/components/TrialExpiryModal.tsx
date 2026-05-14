"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Microscope, Layers, Flame, X, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface Props {
  user: User;
  daysLeft: number;
  isTrialing: boolean;
  onUpgradeClick: () => void;
}

interface ActivityStats {
  slidesAnalyzed: number;
  flashcardsStudied: number;
  flashcardsMastered: number;
  streak: number;
}

const STORAGE_KEY = "patholearn_trial_nudge_dismissed";

function getDismissedDate(userId: string): string | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return raw ?? null;
  } catch {
    return null;
  }
}

function setDismissedToday(userId: string) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, new Date().toDateString());
  } catch {}
}

async function fetchActivityStats(userId: string): Promise<ActivityStats> {
  const [slidesResult, reviewsResult] = await Promise.all([
    supabase.from("slide_history").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("flashcard_reviews")
      .select("repetitions, ease_factor, last_reviewed_at")
      .eq("user_id", userId),
  ]);

  const slidesAnalyzed = slidesResult.count ?? 0;
  const reviews = reviewsResult.data ?? [];

  const flashcardsStudied = reviews.filter((r) => r.repetitions > 0).length;
  const flashcardsMastered = reviews.filter(
    (r) => r.repetitions >= 3 && r.ease_factor >= 2.5
  ).length;

  // Streak: count consecutive days with a review
  const reviewDays = new Set(
    reviews
      .filter((r) => r.last_reviewed_at)
      .map((r) => new Date(r.last_reviewed_at).toDateString())
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (reviewDays.has(d.toDateString())) streak++;
    else break;
  }

  return { slidesAnalyzed, flashcardsStudied, flashcardsMastered, streak };
}

export default function TrialExpiryModal({ user, daysLeft, isTrialing, onUpgradeClick }: Props) {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<ActivityStats | null>(null);

  useEffect(() => {
    // ?preview_trial=1 in the URL forces the modal open (dev preview only)
    const forcePreview =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("preview_trial") === "1";

    if (!forcePreview && (!isTrialing || daysLeft > 3 || daysLeft <= 0)) return;

    const dismissedDate = getDismissedDate(user.id);
    if (!forcePreview && dismissedDate === new Date().toDateString()) return;

    fetchActivityStats(user.id).then((s) => {
      setStats(s);
      // Delay slightly so page content loads first
      setTimeout(() => setVisible(true), 1200);
    });
  }, [user.id, daysLeft, isTrialing]);

  function dismiss() {
    setDismissedToday(user.id);
    setVisible(false);
  }

  function handleUpgrade() {
    dismiss();
    onUpgradeClick();
  }

  // In preview mode substitute a display value of 3
  const displayDays =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview_trial") === "1" &&
    daysLeft === 0
      ? 3
      : daysLeft;

  const urgencyColor =
    displayDays <= 1
      ? "from-red-500 to-rose-600"
      : displayDays <= 2
      ? "from-orange-500 to-amber-600"
      : "from-primary-500 to-violet-600";

  type StatItem = { icon: React.ElementType; value: number; label: string };
  const statItems: StatItem[] = stats
    ? ([
        stats.slidesAnalyzed > 0 && {
          icon: Microscope,
          value: stats.slidesAnalyzed,
          label: `slide${stats.slidesAnalyzed !== 1 ? "s" : ""} analyzed`,
        },
        stats.flashcardsStudied > 0 && {
          icon: Layers,
          value: stats.flashcardsStudied,
          label: `flashcard${stats.flashcardsStudied !== 1 ? "s" : ""} studied`,
        },
        stats.flashcardsMastered > 0 && {
          icon: Crown,
          value: stats.flashcardsMastered,
          label: `card${stats.flashcardsMastered !== 1 ? "s" : ""} mastered`,
        },
        stats.streak > 1 && {
          icon: Flame,
          value: stats.streak,
          label: `day streak`,
        },
      ].filter(Boolean) as StatItem[])
    : [];

  const hasStats = statItems.length > 0;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

              {/* Header strip */}
              <div className={`bg-gradient-to-r ${urgencyColor} px-6 py-4 relative`}>
                <button
                  onClick={dismiss}
                  aria-label="Dismiss"
                  className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Free trial</p>
                    <p className="text-white font-bold text-lg leading-tight">
                      {displayDays === 1 ? "Ends tomorrow" : `${displayDays} days left`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {hasStats ? (
                  <>
                    <p className="text-slate-800 dark:text-slate-100 font-semibold text-base mb-1">
                      Don&apos;t lose what you&apos;ve built
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                      You&apos;ve made real progress during your trial. Subscribing keeps everything intact.
                    </p>

                    {/* Stat pills */}
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {statItems.map(({ icon: Icon, value, label }) => (
                        <div
                          key={label}
                          className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-700"
                        >
                          <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-900 dark:text-slate-100 font-bold text-base leading-none">{value}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs leading-tight mt-0.5 truncate">{label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-slate-800 dark:text-slate-100 font-semibold text-base mb-1">
                      Keep your full access
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
                      Your trial ends in {displayDays === 1 ? "1 day" : `${displayDays} days`}. Subscribe to keep analyzing slides, studying flashcards, and accessing the full quiz bank.
                    </p>
                  </>
                )}

                {/* Pricing teaser */}
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-primary-700 dark:text-primary-300 font-semibold text-sm">Premium access</p>
                    <p className="text-primary-500 dark:text-primary-400 text-xs">Unlimited slides · Full quiz bank · Smart Learn</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-primary-700 dark:text-primary-300 font-bold text-lg leading-none">$2.99</p>
                    <p className="text-primary-500 dark:text-primary-400 text-xs">/month</p>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleUpgrade}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98] shadow-sm"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade Now
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </button>
                  <Link
                    href="/pricing"
                    onClick={dismiss}
                    className="w-full text-center text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 py-2 transition-colors"
                  >
                    See all features →
                  </Link>
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
