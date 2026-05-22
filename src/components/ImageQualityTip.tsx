"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Focus, Sun, Crop, X } from "lucide-react";

const STORAGE_KEY = "patholearn_image_quality_tip_dismissed";

const tips = [
  {
    icon: Focus,
    title: "Sharp focus",
    body: "Crisp, in-focus slides let the AI read nuclei and stain patterns accurately.",
  },
  {
    icon: Sun,
    title: "Even lighting",
    body: "Avoid glare, shadows, or yellow-tinted lamps — they distort stain colour.",
  },
  {
    icon: Crop,
    title: "Frame the field",
    body: "Centre the area of interest and avoid black borders or microscope edges.",
  },
];

export default function ImageQualityTip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden mb-6"
        >
          <div className="relative rounded-2xl border border-primary-200/60 dark:border-primary-800/40 bg-gradient-to-br from-primary-50 via-white to-violet-50 dark:from-primary-950/40 dark:via-slate-900 dark:to-violet-950/30 p-5 sm:p-6 shadow-sm">
            <button
              onClick={dismiss}
              aria-label="Dismiss tip"
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Get the most accurate diagnosis
              </h4>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 pr-8">
              The AI reads what it sees — clearer slides lead to sharper analysis. A few quick pointers:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tips.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="flex items-start gap-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 p-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary-600 dark:text-primary-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                      {title}
                    </p>
                    <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
