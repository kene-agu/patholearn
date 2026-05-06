"use client";

import { useEffect, useState } from "react";
import { X, Share } from "lucide-react";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

const SNOOZE_KEY = "ios_prompt_snooze_until";
const SNOOZE_MS  = 14 * 24 * 60 * 60 * 1000; // 14 days

export default function IOSInstallPrompt() {
  const [visible, setVisible]   = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isIOS() || isInstalled()) return;

    const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
    if (snoozedUntil && Date.now() < Number(snoozedUntil)) return;

    const t = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setExpanded(false);
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center animate-slide-up pb-safe">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">

        {/* Collapsed row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">P</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              Add PathoLearn to Home Screen
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Faster access, full-screen mode
            </p>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs font-semibold text-violet-600 dark:text-violet-400 px-2 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/30"
          >
            {expanded ? "Less" : "How?"}
          </button>
          <button onClick={dismiss} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Expanded instructions */}
        {expanded && (
          <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 space-y-2.5 bg-slate-50 dark:bg-slate-900/50">
            {[
              {
                n: 1,
                icon: <Share className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />,
                text: <>Tap the <strong>Share</strong> <span className="inline-flex items-center gap-0.5 text-blue-500">⎙</span> button at the bottom of Safari</>,
              },
              {
                n: 2,
                icon: <span className="text-blue-500 font-bold text-[11px] flex-shrink-0">＋</span>,
                text: <>Scroll down and tap <strong>"Add to Home Screen"</strong></>,
              },
              {
                n: 3,
                icon: <span className="text-emerald-500 font-bold text-[11px] flex-shrink-0">✓</span>,
                text: <>Tap <strong>Add</strong> — done!</>,
              },
            ].map(({ n, icon, text }) => (
              <div key={n} className="flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {n}
                </span>
                {icon}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
