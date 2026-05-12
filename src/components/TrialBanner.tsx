"use client";

import { useState, useEffect } from "react";
import { X, Crown, AlertTriangle } from "lucide-react";
import type { SubscriptionState } from "@/lib/useSubscription";

interface TrialBannerProps {
  subscription: SubscriptionState;
  onUpgrade: () => void;
}

const DISMISS_KEY = "trial_banner_dismissed_at";

export default function TrialBanner({ subscription, onUpgrade }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Re-show the banner each new day even if previously dismissed
  useEffect(() => {
    const dismissedAt = sessionStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const today = new Date().toDateString();
      if (dismissedAt === today) setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, new Date().toDateString());
    setDismissed(true);
  };

  if (dismissed || subscription.loading) return null;

  const { isTrialing, isExpired, daysLeft } = subscription;

  if (isExpired) {
    return (
      <div className="w-full bg-red-600 text-white px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Your free trial has ended — subscribe to keep using PathoLearn.</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onUpgrade}
            className="flex items-center gap-1.5 bg-white text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Crown className="w-3.5 h-3.5" /> Subscribe now
          </button>
          <button onClick={handleDismiss} className="p-1 rounded hover:bg-red-500 transition-colors" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (isTrialing && daysLeft <= 3) {
    const urgency = daysLeft === 1 ? "expires tomorrow" : `expires in ${daysLeft} days`;
    const colors = daysLeft === 1
      ? "bg-red-500 text-white"
      : "bg-amber-400 text-amber-900";
    const btnColors = daysLeft === 1
      ? "bg-white text-red-600 hover:bg-red-50"
      : "bg-amber-900 text-white hover:bg-amber-800";

    return (
      <div className={`w-full ${colors} px-4 py-2.5 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Crown className="w-4 h-4 flex-shrink-0" />
          <span>Your free trial {urgency} — subscribe to keep access.</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onUpgrade}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${btnColors}`}
          >
            <Crown className="w-3.5 h-3.5" /> Subscribe now
          </button>
          <button onClick={handleDismiss} className="p-1 rounded hover:opacity-70 transition-opacity" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
