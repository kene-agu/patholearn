"use client";

import { Microscope, Sparkles, BookOpen, Brain, GraduationCap, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

const SMART_LEARN_SEEN_KEY = "patholearn_smartlearn_seen";

const features = [
  {
    icon: Microscope,
    title: "AI Slide Analysis",
    desc: "Upload any histology slide and get instant expert-level annotation of key structures",
    color: "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
    border: "border-primary-100 dark:border-primary-900/30",
  },
  {
    icon: Sparkles,
    title: "Smart Annotations",
    desc: "Key structures highlighted with arrows, IHC markers, and educational labels",
    color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    border: "border-purple-100 dark:border-purple-900/30",
  },
  {
    icon: BookOpen,
    title: "Deep Learning Context",
    desc: "Stain identification, risk factors, complications, differentials & clinical pearls",
    color: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400",
    border: "border-teal-100 dark:border-teal-900/30",
  },
  {
    icon: Brain,
    title: "Interactive Quizzes",
    desc: "Adaptive quiz and spaced-repetition flashcard modes built for OSCE prep",
    color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-900/30",
  },
];

export default function Hero() {
  const [smartLearnSeen, setSmartLearnSeen] = useState(true);

  useEffect(() => {
    setSmartLearnSeen(!!localStorage.getItem(SMART_LEARN_SEEN_KEY));
  }, []);

  const handleSmartLearnClick = () => {
    localStorage.setItem(SMART_LEARN_SEEN_KEY, "1");
    setSmartLearnSeen(true);
  };

  return (
    <div className="mb-10 text-center">
      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full px-4 py-1.5 text-sm font-medium mb-5 animate-fade-in">
        <Sparkles className="w-4 h-4" />
        AI-Powered Visual Learning
      </div>

      {/* Main headline — concrete & action-oriented */}
      <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4 leading-tight tracking-tight">
        Upload a slide.{" "}
        <span className="text-primary-600 dark:text-primary-400">
          Understand it in seconds.
        </span>
      </h1>

      <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
        PathoLearn&apos;s AI identifies structures, annotates key features, and guides
        your histopathology learning — step by step.
      </p>

      {/* Feature cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">

        {/* Smart Learn — full-width featured card */}
        <div
          onClick={handleSmartLearnClick}
          className={`text-left relative cursor-pointer bg-white dark:bg-slate-800 rounded-2xl border p-5 col-span-2 md:col-span-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
            !smartLearnSeen
              ? "border-indigo-200 dark:border-indigo-800 shadow-sm"
              : "border-slate-100 dark:border-slate-700 shadow-sm"
          }`}
        >
          {!smartLearnSeen && (
            <span className="absolute top-3 right-3 relative inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider overflow-hidden">
              <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              New
            </span>
          )}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-0.5">Smart Learn</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Upload your lecture PDFs or slides — AI generates quizzes, flashcards, and a personal tutor from your own study material.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0 hidden sm:block" />
          </div>
        </div>

        {/* Feature cards */}
        {features.map(({ icon: Icon, title, desc, color, border }) => (
          <div
            key={title}
            className={`text-left bg-white dark:bg-slate-800 rounded-2xl border ${border} shadow-sm p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
          >
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1 leading-snug">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
