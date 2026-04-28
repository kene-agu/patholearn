"use client";

/**
 * Shows a "Add to Home Screen" instruction banner for iPhone/iPad users
 * who are browsing in Safari but haven't installed the PWA yet.
 *
 * Apple does not support the beforeinstallprompt event so we show our own
 * custom UI. The banner is dismissed for 30 days once the user taps ✕.
 */

import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    ("standalone" in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

const DISMISSED_KEY = "ios_install_prompt_dismissed_until";

export default function IOSInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIOS()) return;
    if (isInStandaloneMode()) return; // already installed

    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    // Small delay so it doesn't pop immediately on page load
    const t = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShow(false);
    // Suppress for 30 days
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe animate-slide-up">
      <div className="max-w-sm mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            {/* App icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg font-bold">P</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Install PathoLearn</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Add to your Home Screen</p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className="px-4 pb-4 space-y-2.5">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Install PathoLearn for the best experience — faster loading, full-screen view, and offline access.
          </p>

          <div className="space-y-2">
            <Step
              number={1}
              icon={<Share className="w-4 h-4 text-blue-500" />}
              text={<>Tap the <strong>Share</strong> button in Safari's toolbar</>}
            />
            <Step
              number={2}
              icon={<Plus className="w-4 h-4 text-blue-500" />}
              text={<>Scroll down and tap <strong>"Add to Home Screen"</strong></>}
            />
            <Step
              number={3}
              icon={<span className="text-blue-500 font-bold text-xs">✓</span>}
              text={<>Tap <strong>Add</strong> — PathoLearn will appear on your Home Screen</>}
            />
          </div>

          {/* Visual hint showing the Share icon location */}
          <div className="flex items-center gap-2 mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Share className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>The Share button is the box with an upward arrow at the bottom of Safari</span>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="w-full mt-1 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  icon,
  text,
}: {
  number: number;
  icon: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-blue-600">{number}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-1">
        {icon}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
