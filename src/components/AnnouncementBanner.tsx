"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";

interface AnnouncementBannerProps {
  id: string;
  message: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

const STORAGE_PREFIX = "patholearn_banner_dismissed_";

export default function AnnouncementBanner({
  id,
  message,
  ctaLabel,
  onCtaClick,
}: AnnouncementBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [id]);

  const dismiss = () => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, "1");
    } catch {}
    setVisible(false);
  };

  const handleCta = () => {
    onCtaClick?.();
    dismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="bg-gradient-to-r from-primary-600 to-violet-600 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug truncate sm:whitespace-normal sm:overflow-visible">
                  {message}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {ctaLabel && onCtaClick && (
                  <button
                    onClick={handleCta}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {ctaLabel}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={dismiss}
                  aria-label="Dismiss announcement"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
