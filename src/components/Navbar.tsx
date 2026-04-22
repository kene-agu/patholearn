"use client";

import { Microscope, BookOpen, Brain, FlaskConical, Layers, LogIn, LogOut, User } from "lucide-react";
import { clsx } from "clsx";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type Tab = "analyze" | "library" | "quiz" | "flashcards";

interface NavbarProps {
  activeTab:    Tab;
  setActiveTab: (tab: Tab) => void;
  user:         SupabaseUser | null;
  onLoginClick: () => void;
  onLogout:     () => void;
}

const tabs = [
  { id: "analyze"    as Tab, label: "Analyze Slide", icon: Microscope },
  { id: "library"    as Tab, label: "Slide Library",  icon: BookOpen   },
  { id: "quiz"       as Tab, label: "Quiz Mode",       icon: Brain      },
  { id: "flashcards" as Tab, label: "Flashcards",      icon: Layers     },
];

export default function Navbar({ activeTab, setActiveTab, user, onLoginClick, onLogout }: NavbarProps) {
  const initials = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg leading-none">Patho</span>
              <span className="font-bold text-primary-600 text-lg leading-none">Learn</span>
              <div className="text-[10px] text-slate-400 font-medium tracking-wide leading-none mt-0.5">
                AI-Powered Histopathology
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
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
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Right side — auth */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Avatar + name */}
                <div className="hidden md:flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {user.user_metadata?.full_name ?? user.email}
                  </span>
                </div>
                {/* Mobile avatar only */}
                <div className="md:hidden w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-patho-purple flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </>
            ) : (
              <>
                <span className="hidden md:flex items-center gap-1.5 badge bg-primary-50 text-primary-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block animate-pulse" />
                  AI Vision
                </span>
                <button
                  onClick={onLoginClick}
                  className="flex items-center gap-1.5 btn-primary text-sm px-4 py-2"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
