"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Microscope, Brain, BookOpen, Trophy, ArrowRight } from "lucide-react";

interface Props {
  userName: string;
  onClose: () => void;
}

const features = [
  {
    icon: Microscope,
    title: "Analyze Slides",
    desc: "Upload any histopathology slide and get instant AI-powered analysis.",
  },
  {
    icon: Brain,
    title: "Smart Quizzes",
    desc: "Test yourself with questions tailored to your learning level.",
  },
  {
    icon: BookOpen,
    title: "Flashcards & Cases",
    desc: "Study curated flashcards and save your own cases for later.",
  },
  {
    icon: Trophy,
    title: "Track Progress",
    desc: "See your streaks, mastery stats, and how far you've come.",
  },
];

export default function WelcomeModal({ userName, onClose }: Props) {
  const firstName = userName.split(" ")[0];

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

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
          <div className="bg-gradient-to-r from-primary-500 to-patho-purple px-6 py-5 relative">
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Microscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-xs font-medium uppercase tracking-wider">Welcome aboard</p>
                <p className="text-white font-bold text-xl leading-tight">
                  Hi {firstName}! 👋
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <p className="text-slate-700 dark:text-slate-300 text-sm mb-5">
              You now have <span className="font-semibold text-primary-600 dark:text-primary-400">14 days of free access</span> to everything PathoLearn has to offer. Here&apos;s what you can do:
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {features.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-slate-800 dark:text-slate-100 font-semibold text-xs">{title}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-tight mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-violet-600 hover:from-primary-700 hover:to-violet-700 text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98] shadow-sm"
            >
              Start Learning
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
