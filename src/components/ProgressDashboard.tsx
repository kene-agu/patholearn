"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Flame, CheckCircle2, Target, BookOpen, TrendingUp, AlertTriangle, Clock, Star } from "lucide-react";
import { clsx } from "clsx";

interface Props { user: User }

interface Stats {
  streak: number;
  reviewsToday: number;
  reviewsThisWeek: number;
  totalSeen: number;
  mastered: number;
  dueNow: number;
  accuracyPct: number;
  weakAreas: WeakArea[];
}

interface WeakArea {
  cardId: string;
  label: string;
  avgQuality: number;
  reviews: number;
}

const builtinMap = new Map<string, string>([
  ["f-n1","Normal Liver Histology"],["f-n2","Normal Lung — Alveoli"],
  ["f-n3","Normal Kidney Cortex"],["f-n4","Normal Skin Histology"],
  ["f-n5","Normal Large Intestine"],["f-n6","Normal Thyroid Gland"],
  ["f-n7","Normal Lymph Node"],["f-n8","Normal Cardiac Muscle"],
  ["f-n9","Normal Spleen"],
  ["f-p1","Invasive Squamous Cell Carcinoma"],["f-p2","Chronic Gastritis"],
  ["f-p3","Usual Interstitial Pneumonia"],["f-p4","Crescentic Glomerulonephritis"],
  ["f-p5","Invasive Ductal Carcinoma"],["f-p6","Pulmonary TB — Granuloma"],
  ["f-p7","Tuberculosis — ZN Stain"],["f-p8","Classical Hodgkin Lymphoma"],
  ["f-p9","Clear Cell Renal Cell Carcinoma"],["f-p10","Chronic Hepatitis B"],
  ["f-p11","Tubular Adenoma — Colon"],
]);

async function fetchStats(userId: string): Promise<Stats> {
  const { data: reviews } = await supabase
    .from("flashcard_reviews")
    .select("card_id, ease_factor, repetitions, last_quality, last_reviewed_at, next_review_at")
    .eq("user_id", userId);

  const { data: slides } = await supabase
    .from("slide_history")
    .select("id, diagnosis")
    .eq("user_id", userId);

  const slideMap = new Map<string, string>(
    (slides ?? []).map((s: { id: string; diagnosis: string }) => [`user-${s.id}`, s.diagnosis])
  );

  const rows = reviews ?? [];
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);

  const reviewsToday = rows.filter(r => r.last_reviewed_at && new Date(r.last_reviewed_at) >= todayStart).length;
  const reviewsThisWeek = rows.filter(r => r.last_reviewed_at && new Date(r.last_reviewed_at) >= weekStart).length;
  const totalSeen = rows.filter(r => r.repetitions > 0).length;
  const mastered = rows.filter(r => r.repetitions >= 3 && r.ease_factor >= 2.5).length;
  const dueNow = rows.filter(r => new Date(r.next_review_at) <= now).length;

  // Accuracy: average last_quality mapped to pct
  const rated = rows.filter(r => r.last_quality != null);
  const accuracyPct = rated.length
    ? Math.round((rated.reduce((s: number, r) => s + (r.last_quality as number), 0) / rated.length / 5) * 100)
    : 0;

  // Streak: distinct dates with at least one review, consecutive ending today
  const reviewedDates = new Set(
    rows
      .filter(r => r.last_reviewed_at)
      .map(r => new Date(r.last_reviewed_at!).toDateString())
  );
  let streak = 0;
  const cursor = new Date(now);
  while (reviewedDates.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Weak areas: cards with last_quality <= 3 (Again/Hard)
  const weak = rows
    .filter(r => r.last_quality != null && (r.last_quality as number) <= 3)
    .map(r => ({
      cardId: r.card_id as string,
      label: slideMap.get(r.card_id as string) ?? builtinMap.get(r.card_id as string) ?? ((r.card_id as string).startsWith("user-") ? "Deleted slide" : r.card_id as string),
      avgQuality: r.last_quality as number,
      reviews: r.repetitions as number,
    }))
    .sort((a, b) => a.avgQuality - b.avgQuality)
    .slice(0, 6);

  return { streak, reviewsToday, reviewsThisWeek, totalSeen, mastered, dueNow, accuracyPct, weakAreas: weak };
}

function StatCard({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", accent)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 leading-none">{value}</div>
        <div className="text-sm font-medium text-slate-600 mt-1">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function QualityBar({ quality }: { quality: number }) {
  const pct = (quality / 5) * 100;
  const color = quality <= 2 ? "bg-red-400" : quality <= 3 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-5 text-right">{quality}/5</span>
    </div>
  );
}

export default function ProgressDashboard({ user }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats(user.id).then(s => { setStats(s); setLoading(false); });
  }, [user.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
              <div className="h-7 bg-slate-100 rounded animate-pulse w-3/4" />
            </div>
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="card p-5 space-y-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
          <div className="h-32 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        {/* List skeleton */}
        <div className="card p-5 space-y-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse w-1/4" />
          {[70, 55, 85, 60].map((w, i) => (
            <div key={i} className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const masteryPct = stats.totalSeen > 0 ? Math.round((stats.mastered / stats.totalSeen) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Progress</h1>
        <p className="text-slate-500 text-sm mt-1">Your study stats and weak areas at a glance</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Flame}
          label="Day streak"
          value={stats.streak}
          sub={stats.streak === 0 ? "Review today to start" : stats.streak === 1 ? "Keep it going!" : "Amazing! 🔥"}
          accent="bg-orange-50 text-orange-500"
        />
        <StatCard
          icon={Clock}
          label="Reviews today"
          value={stats.reviewsToday}
          sub={`${stats.reviewsThisWeek} this week`}
          accent="bg-blue-50 text-blue-500"
        />
        <StatCard
          icon={Target}
          label="Accuracy"
          value={`${stats.accuracyPct}%`}
          sub="Based on last ratings"
          accent="bg-primary-50 text-primary-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Due now"
          value={stats.dueNow}
          sub={stats.dueNow === 0 ? "All caught up!" : "Cards to review"}
          accent="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Mastery bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-slate-800">Deck mastery</h2>
          </div>
          <span className="text-sm text-slate-500">{stats.mastered} / {stats.totalSeen} cards mastered</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700"
            style={{ width: `${masteryPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>0%</span>
          <span className="font-medium text-primary-600">{masteryPct}%</span>
          <span>100%</span>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          A card is mastered after 3+ correct reviews with ease factor ≥ 2.5
        </p>
      </div>

      {/* Weak areas */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="font-semibold text-slate-800">Weak areas</h2>
          <span className="text-xs text-slate-400 ml-auto">Cards rated Again or Hard</span>
        </div>

        {stats.weakAreas.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="font-medium text-slate-700">No weak areas yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Review some flashcards — cards rated Again or Hard will surface here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.weakAreas.map(area => (
              <div key={area.cardId} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{area.label}</p>
                  <p className="text-xs text-slate-400">{area.reviews} review{area.reviews !== 1 ? "s" : ""}</p>
                </div>
                <QualityBar quality={area.avgQuality} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly activity */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <BookOpen className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-slate-800">This week</h2>
        </div>
        <WeeklyActivity userId={user.id} />
      </div>
    </div>
  );
}

function WeeklyActivity({ userId }: { userId: string }) {
  const [dayCounts, setDayCounts] = useState<number[]>(Array(7).fill(0));

  useEffect(() => {
    supabase
      .from("flashcard_reviews")
      .select("last_reviewed_at")
      .eq("user_id", userId)
      .gte("last_reviewed_at", (() => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d.toISOString(); })())
      .then(({ data }) => {
        const counts = Array(7).fill(0);
        (data ?? []).forEach(r => {
          if (!r.last_reviewed_at) return;
          const diff = Math.floor((Date.now() - new Date(r.last_reviewed_at).getTime()) / 86400000);
          if (diff >= 0 && diff < 7) counts[6 - diff]++;
        });
        setDayCounts(counts);
      });
  }, [userId]);

  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const today = new Date().getDay();
  const labels = Array.from({ length: 7 }, (_, i) => days[(today - 6 + i + 7) % 7]);
  const max = Math.max(...dayCounts, 1);

  return (
    <div className="flex items-end gap-2 h-20">
      {dayCounts.map((count, i) => {
        const heightPct = (count / max) * 100;
        const isToday = i === 6;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center" style={{ height: "56px" }}>
              <div
                className={clsx(
                  "w-full rounded-t-md transition-all duration-500",
                  isToday ? "bg-primary-500" : "bg-primary-200"
                )}
                style={{ height: count === 0 ? "4px" : `${Math.max(heightPct, 8)}%` }}
              />
            </div>
            <span className={clsx("text-[10px] font-medium", isToday ? "text-primary-600" : "text-slate-400")}>
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
