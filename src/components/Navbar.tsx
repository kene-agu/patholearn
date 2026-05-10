"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Microscope, BookOpen, BookMarked, Brain, Layers, LogIn, LogOut, Menu, X, BarChart2, FolderOpen, User, ChevronDown, Crown, Sun, Moon, MessageCircle, GraduationCap, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { openSupportChat } from "./SupportChatbot";

type Tab = "analyze" | "atlas" | "quiz" | "flashcards" | "progress" | "cases" | "learn";

interface NavbarProps {
  activeTab:       Tab;
  setActiveTab:    (tab: Tab) => void;
  user:            SupabaseUser | null;
  isPremium:       boolean;
  onLoginClick:    () => void;
  onLogout:        () => void;
  onAccountClick:  () => void;
  onFeedbackClick: () => void;
  streak?:         number;
}

const tabs = [
  { id: "analyze"    as Tab, label: "Analyze Slide",  icon: Microscope     },
  { id: "atlas"      as Tab, label: "Slide Library",   icon: BookOpen       },
  { id: "learn"      as Tab, label: "Smart Learn",     icon: GraduationCap  },
  { id: "cases"      as Tab, label: "My Cases",        icon: FolderOpen     },
  { id: "quiz"       as Tab, label: "Quiz Mode",        icon: Brain          },
  { id: "flashcards" as Tab, label: "Flashcards",       icon: Layers         },
  { id: "progress"   as Tab, label: "Progress",         icon: BarChart2      },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
      className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export default function Navbar({ activeTab, setActiveTab, user, isPremium, onLoginClick, onLogout, onAccountClick, onFeedbackClick, streak = 0 }: NavbarProps) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

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
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">

          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center">
              <Microscope className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="flex items-baseline">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-none">Patho</span>
                <span className="font-bold text-primary-600 text-lg leading-none">Learn</span>
              </div>
              <div className="hidden sm:block text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide leading-none mt-0.5">
                AI-Powered Histopathology
              </div>
            </div>
          </div>

          {/* Desktop tabs */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  activeTab === id
                    ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {/* Streak badge */}
            {streak > 0 && (
              <div
                title={`${streak}-day study streak 🔥`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 cursor-default select-none"
              >
                <span className="text-sm" aria-hidden>🔥</span>
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak}</span>
              </div>
            )}
            <ThemeToggle />
            {user ? (
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setDropOpen(v => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                    {user.user_metadata?.full_name ?? user.email}
                  </span>
                  <ChevronDown className={clsx("w-3.5 h-3.5 text-slate-400 transition-transform", dropOpen && "rotate-180")} />
                </button>

                {dropOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1.5 z-50">
                    <button
                      onClick={() => { setDropOpen(false); onAccountClick(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" /> My Account
                    </button>
                    {!isPremium && (
                      <Link
                        href="/pricing"
                        onClick={() => setDropOpen(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors font-medium"
                      >
                        <Crown className="w-4 h-4 text-primary-500" /> Upgrade to Premium
                      </Link>
                    )}
                    <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                    <button
                      onClick={() => { setDropOpen(false); openSupportChat(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <LifeBuoy className="w-4 h-4 text-slate-400" /> Support
                    </button>
                    <button
                      onClick={() => { setDropOpen(false); onFeedbackClick(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-slate-400" /> Send feedback
                    </button>
                    <button
                      onClick={() => { setDropOpen(false); onLogout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-slate-400" /> Sign out
                    </button>
                  </div>
                )}
              </div>
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

          {/* Mobile — theme toggle + avatar + hamburger */}
          <div className="flex md:hidden items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            {user && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
            )}
            <button
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
            className="md:hidden fixed inset-0 top-16 z-30 bg-slate-900/30 dark:bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-lg z-40 animate-fade-in">
            <div className="max-w-7xl mx-auto px-3 py-3 space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabSelect(id)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === id
                      ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}

              <div className="border-t border-slate-100 dark:border-slate-800 my-2" />

              {user ? (
                <>
                  <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 truncate">
                    Signed in as <span className="font-medium text-slate-700 dark:text-slate-200">{user.user_metadata?.full_name ?? user.email}</span>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); onAccountClick(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <User className="w-4 h-4" />
                    My Account
                  </button>
                  {!isPremium && (
                    <Link
                      href="/pricing"
                      onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                    >
                      <Crown className="w-4 h-4" />
                      Upgrade to Premium
                    </Link>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); openSupportChat(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <LifeBuoy className="w-4 h-4" />
                    Support
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onFeedbackClick(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send feedback
                  </button>
                  <button
                    onClick={() => { onLogout(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
