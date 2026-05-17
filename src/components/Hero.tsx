"use client";

import { Microscope, Sparkles, BookOpen, Brain, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";

const SMART_LEARN_SEEN_KEY = "patholearn_smartlearn_seen";

const features = [
  {
    icon: Microscope,
    title: "AI Slide Analysis",
    desc: "Upload any histology slide and get instant expert-level analysis",
    color: "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
    isNew: false,
  },
  {
    icon: Sparkles,
    title: "Smart Annotations",
    desc: "Key structures highlighted with arrows and educational labels",
    color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    isNew: false,
  },
  {
    icon: BookOpen,
    title: "Deep Learning Context",
    desc: "Stain identification, risk factors, complications & differentials",
    color: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400",
    isNew: false,
  },
  {
    icon: Brain,
    title: "Interactive Quizzes",
    desc: "Test your knowledge with adaptive quiz and flashcard modes",
    color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
    isNew: false,
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
      <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
        <Sparkles className="w-4 h-4" />
        AI-Powered Visual Learning
      </div>
      <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
        Master Histopathology with AI
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto mb-10">
        Upload a slide or choose from our library. PathoLearn&apos;s AI will
        identify structures, annotate key features, and guide your learning
        step by step.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {/* Smart Learn — full-width featured card at the top */}
        <div
          onClick={handleSmartLearnClick}
          className="card text-left hover:shadow-md transition-shadow col-span-2 md:col-span-4 relative cursor-pointer border border-indigo-100 dark:border-indigo-900/40"
        >
          {!smartLearnSeen && (
            <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              New
            </span>
          )}
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">Smart Learn</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Upload PDFs, Word docs, or PowerPoint slides and let AI generate quizzes, flashcards, and a personal tutor — all from your own study material.
              </p>
            </div>
          </div>
        </div>

        {features.map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="card text-left hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
