"use client";

import { useState, useEffect } from "react";
import { Microscope, BookOpen, Brain, FlaskConical, Layers, LogIn, LogOut, Menu, X, BarChart2, FolderOpen } from "lucide-react";
import { clsx } from "clsx";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type Tab = "analyze" | "library" | "quiz" | "flashcards" | "progress" | "cases";

interface NavbarProps {
  activeTab:    Tab;
  setActiveTab: (tab: Tab) => void;
  user:         SupabaseUser | null;
  onLoginClick: () => void;
  onLogout:     () => void;
}

const tabs = [
  { id: "analyze"    as Tab, label: "Analyze Slide", icon: Microscope  },
  { id: "library"    as Tab, label: "Slide Library",  icon: BookOpen    },
  { id: "cases"      as Tab, label: "My Cases",       icon: FolderOpen  },
  { id: "quiz"       as Tab, label: "Quiz Mode",       icon: Brain       },
  { id: "flashcards" as Tab, label: "Flashcards",      icon: Layers      },
  { id: "progress"   as Tab, label: "Progress",        icon: BarChart2   },
];

export default function Navbar({ activeTab, setActiveTab, user, onLoginClick, onLogout }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleTabSelect = (id: Tab) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">

          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-baseline">
                <span className="font-bold text-slate-900 text-lg leading-none">Patho</span>
                <span className="font-bold text-primary-600 text-lg leading-none">Learn</span>
              </div>
              <div className="hidden sm:block text-[10px] text-slate-400 font-medium tracking-wide leading-none mt-0.5">
                AI-Powered Histopathology
              </div>
            </div>
          </div>

          {/* Desktop tabs */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  activeTab === id
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[140px] truncate">
                    {user.user_metadata?.full_name ?? user.email}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-1.5 btn-primary text-sm px-4 py-2"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
            )}
          </div>

          {/* Mobile — avatar + hamburger */}
          <div className="flex md:hidden items-center gap-2 flex-shrink-0">
            {user && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
            )}
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-16 z-30 bg-slate-900/30"
            onClick={() => setMenuOpen(false)}
          />
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-lg z-40 animate-fade-in">
            <div className="max-w-7xl mx-auto px-3 py-3 space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabSelect(id)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === id
                      ? "bg-primary-50 text-primary-700"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}

              <div className="border-t border-slate-100 my-2" />

              {user ? (
                <>
                  <div className="px-3 py-2 text-xs text-slate-500 truncate">
                    Signed in as <span className="font-medium text-slate-700">{user.user_metadata?.full_name ?? user.email}</span>
                  </div>
                  <button
                    onClick={() => { onLogout(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { onLoginClick(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
