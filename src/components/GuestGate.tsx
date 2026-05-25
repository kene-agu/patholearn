"use client";

import { Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface GuestGateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onSignUp: () => void;
}

// Friendly "create a free account to unlock this" card shown to guests in place
// of features that need a saved profile (history, progress, document uploads).
// Framed as a reward for what they unlock, not a wall.
export default function GuestGate({ icon: Icon, title, description, onSignUp }: GuestGateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      <button
        onClick={onSignUp}
        className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm font-medium"
      >
        <Sparkles className="w-4 h-4" />
        Create your free account
      </button>
      <button
        onClick={onSignUp}
        className="mt-3 text-xs text-slate-400 hover:text-primary-600 transition-colors"
      >
        Already have an account? Sign in
      </button>
    </div>
  );
}
