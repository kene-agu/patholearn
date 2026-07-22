"use client";

import { useState, useEffect } from "react";
import { Microscope, BookOpen, Brain, BarChart2, GraduationCap } from "lucide-react";
import { clsx } from "clsx";

type Tab = "analyze" | "atlas" | "quiz" | "flashcards" | "progress" | "cases" | "learn";

interface BottomNavProps {
  activeTab:    Tab;
  setActiveTab: (tab: Tab) => void;
}

const SMART_LEARN_SEEN_KEY = "patholearn_smartlearn_seen";

const items = [
  { id: "analyze"  as Tab, label: "Analyze",  icon: Microscope },
  { id: "atlas"    as Tab, label: "Library",  icon: BookOpen },
  { id: "learn"    as Tab, label: "Learn",    icon: GraduationCap },
  { id: "quiz"     as Tab, label: "Quiz",     icon: Brain },
  { id: "progress" as Tab, label: "Progress", icon: BarChart2 },
];

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const [smartLearnSeen, setSmartLearnSeen] = useState(true);

  useEffect(() => {
    setSmartLearnSeen(!!localStorage.getItem(SMART_LEARN_SEEN_KEY));
  }, []);

  const handleSelect = (id: Tab) => {
    if (id === "learn" && !smartLearnSeen) {
      localStorage.setItem(SMART_LEARN_SEEN_KEY, "1");
      setSmartLearnSeen(true);
    }
    setActiveTab(id);
  };

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-100 dark:border-slate-800 pb-safe-nav"
    >
      <div className="grid grid-cols-5">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <span className="relative">
                <Icon className={clsx("w-5 h-5 transition-transform", active && "scale-110")} strokeWidth={active ? 2.4 : 2} />
                {id === "learn" && !smartLearnSeen && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
