"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SlideAnalyzer from "@/components/SlideAnalyzer";
import SlideLibrary from "@/components/SlideLibrary";
import QuizMode from "@/components/QuizMode";
import FlashcardMode from "@/components/FlashcardMode";
import AuthModal from "@/components/AuthModal";

type Tab = "analyze" | "library" | "quiz" | "flashcards";

export default function Home() {
  const [activeTab,        setActiveTab]        = useState<Tab>("analyze");
  const [selectedSlide,    setSelectedSlide]    = useState<string | null>(null);
  const [selectedSlideHint,setSelectedSlideHint]= useState<string | null>(null);
  const [user,             setUser]             = useState<User | null>(null);
  const [authLoading,      setAuthLoading]      = useState(true);
  const [showAuthModal,    setShowAuthModal]    = useState(false);

  // ── Auth state listener ────────────────────────────────────────────────
  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for login / logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLibrarySelect = (imageUrl: string, diagnosisHint: string) => {
    setSelectedSlide(imageUrl);
    setSelectedSlideHint(diagnosisHint);
    setActiveTab("analyze");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // While checking session, show a quiet splash to avoid flash of login screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-primary-500 animate-spin" />
      </div>
    );
  }

  // Gate the whole app behind login
  if (!user) {
    return <AuthModal gated onSuccess={() => { /* user state updates via listener */ }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLoginClick={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {activeTab === "analyze" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!selectedSlide && <Hero />}
          <SlideAnalyzer
            preloadedImage={selectedSlide}
            diagnosisContext={selectedSlideHint}
            user={user}
            onLoginRequest={() => setShowAuthModal(true)}
            onClear={() => { setSelectedSlide(null); setSelectedSlideHint(null); }}
          />
        </main>
      )}

      {activeTab === "library" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SlideLibrary onSelect={(url, hint) => handleLibrarySelect(url, hint)} />
        </main>
      )}

      {activeTab === "quiz" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <QuizMode />
        </main>
      )}

      {activeTab === "flashcards" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FlashcardMode />
        </main>
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
