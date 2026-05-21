"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { usePushNotifications } from "@/lib/usePushNotifications";

const STORAGE_KEY = "patholearn_push_nudge_dismissed";

interface Props {
  user: User;
}

export default function PushNotificationNudge({ user }: Props) {
  const push = usePushNotifications(user);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!push.isSupported || push.isSubscribed) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Small delay so it doesn't flash immediately on page load
        const t = setTimeout(() => setVisible(true), 4000);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage unavailable
    }
  }, [push.isSupported, push.isSubscribed]);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setVisible(false);
  };

  const handleEnable = async () => {
    await push.subscribe();
    dismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-5 right-5 z-50 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="w-4.5 h-4.5 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Stay in the loop</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Enable notifications to get study reminders and news about new PathoLearn features.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleEnable}
                  disabled={push.isLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {push.isLoading ? "Enabling…" : "Enable"}
                </button>
                <button
                  onClick={dismiss}
                  className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
