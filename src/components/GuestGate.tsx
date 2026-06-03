"use client";

import { Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface GuestGateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onSignUp: () => void;
}

export default function GuestGate({ icon: Icon, title, description, onSignUp }: GuestGateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4 animate-fade-in">
      {/* Animated icon container */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center shadow-lg animate-float">
          <Icon className="w-9 h-9 text-white" />
        </div>
        {/* Subtle glow ring */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-400 to-patho-purple opacity-20 blur-xl scale-110" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">{title}</h2>
      <p className="text-base text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
        {description}
      </p>

      <button
        onClick={onSignUp}
        className="btn-primary flex items-center gap-2 px-8 py-3 text-sm font-semibold"
      >
        <Sparkles className="w-4 h-4" />
        Create your free account
      </button>
      <button
        onClick={onSignUp}
        className="mt-4 text-xs text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors underline underline-offset-2"
      >
        Already have an account? Sign in
      </button>
    </div>
  );
}
