"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SlideAnalyzer from "@/components/SlideAnalyzer";
import SlideLibrary from "@/components/SlideLibrary";
import PathologyAtlas from "@/components/PathologyAtlas";
import QuizMode from "@/components/QuizMode";
import FlashcardMode from "@/components/FlashcardMode";
import ProgressDashboard from "@/components/ProgressDashboard";
import SavedCases from "@/components/SavedCases";
import AuthModal from "@/components/AuthModal";
import AccountModal from "@/components/AccountModal";
import FeedbackModal from "@/components/FeedbackModal";
import ScrollToTop from "@/components/ScrollToTop";
import RatingPrompt from "@/components/RatingPrompt";
import { useSubscription } from "@/lib/useSubscription";
import { useSessionGuard } from "@/lib/useSessionGuard";
import { useStreak } from "@/lib/useStreak";
import TooManyDevicesModal from "@/components/TooManyDevicesModal";
import IOSInstallPrompt from "@/components/IOSInstallPrompt";
import type { SlideQuizData } from "@/lib/generatePersonalQuiz";

type Tab = "analyze" | "library" | "atlas" | "quiz" | "flashcards" | "progress" | "cases";

export default function Home() {
  const [activeTab,        setActiveTab]        = useState<Tab>("analyze");
  const [previousTab,      setPreviousTab]      = useState<Tab | null>(null);
  const [selectedSlide,    setSelectedSlide]    = useState<string | null>(null);
  const [selectedSlideHint,setSelectedSlideHint]= useState<string | null>(null);
  const [user,             setUser]             = useState<User | null>(null);
  const [authLoading,      setAuthLoading]      = useState(true);
  const [showAuthModal,    setShowAuthModal]    = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  // Quiz filter — set when user clicks "Quick Quiz" on a flashcard
  const [quizFlashcardIds,  setQuizFlashcardIds]  = useState<string[] | undefined>(undefined);
  // Data for generating questions from a personal slide
  const [personalSlideData, setPersonalSlideData] = useState<SlideQuizData | undefined>(undefined);
  const subscription = useSubscription(user);
  const { sessionStatus, kickAndClaim } = useSessionGuard(user);
  const streak = useStreak(user);

  const handleQuizCard = (flashcardId: string, slideData?: SlideQuizData) => {
    if (flashcardId.startsWith("user-") && slideData) {
      // Personal slide — pass data so QuizMode can generate questions from it
      setPersonalSlideData(slideData);
      setQuizFlashcardIds([flashcardId]);
    } else {
      setPersonalSlideData(undefined);
      setQuizFlashcardIds([flashcardId]);
    }
    setActiveTab("quiz");
  };

  const handleQuizCards = (flashcardIds: string[]) => {
    // Strip personal slides — only built-in flashcard IDs have bank questions
    const bankIds = flashcardIds.filter(id => !id.startsWith("user-"));
    setPersonalSlideData(undefined);
    setQuizFlashcardIds(bankIds.length > 0 ? bankIds : undefined);
    setActiveTab("quiz");
  };

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
    setPreviousTab(activeTab);
    setSelectedSlide(imageUrl);
    setSelectedSlideHint(diagnosisHint);
    setActiveTab("analyze");
  };

  const handleClear = () => {
    setSelectedSlide(null);
    setSelectedSlideHint(null);
    if (previousTab) { setActiveTab(previousTab); setPreviousTab(null); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // While checking session, show a quiet splash to avoid flash of login screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-primary-500 animate-spin" />
      </div>
    );
  }

  // Gate the whole app behind login
  if (!user) {
    return <AuthModal gated onSuccess={() => { /* user state updates via listener */ }} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar
        activeTab={activeTab}
        streak={streak}
        setActiveTab={(tab) => {
          // Clear flashcard filter + personal slide data when manually navigating to quiz
          if (tab === "quiz") { setQuizFlashcardIds(undefined); setPersonalSlideData(undefined); }
          setActiveTab(tab);
        }}
        user={user}
        onLoginClick={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onAccountClick={() => setShowAccountModal(true)}
        onFeedbackClick={() => setShowFeedbackModal(true)}
      />

      {activeTab === "analyze" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!selectedSlide && <Hero />}
          <SlideAnalyzer
            preloadedImage={selectedSlide}
            diagnosisContext={selectedSlideHint}
            user={user}
            onLoginRequest={() => setShowAuthModal(true)}
            onClear={handleClear}
            previousTab={previousTab}
          />
        </main>
      )}

      {activeTab === "library" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SlideLibrary onSelect={(url, hint) => handleLibrarySelect(url, hint)} />
        </main>
      )}

      {activeTab === "atlas" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PathologyAtlas onSelect={(url, hint) => handleLibrarySelect(url, hint)} />
        </main>
      )}

      {activeTab === "quiz" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <QuizMode
            user={user}
            isPremium={subscription.isPremium}
            isTrialing={subscription.isTrialing}
            filterFlashcardIds={quizFlashcardIds}
            personalSlideData={personalSlideData}
            onUpgrade={() => setShowAccountModal(true)}
            onStartFullQuiz={() => { setQuizFlashcardIds(undefined); setPersonalSlideData(undefined); }}
          />
        </main>
      )}

      {activeTab === "flashcards" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FlashcardMode
            user={user}
            onQuizCard={handleQuizCard}
            onQuizCards={handleQuizCards}
          />
        </main>
      )}

      {activeTab === "cases" && (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SavedCases user={user} />
        </main>
      )}

      {activeTab === "progress" && (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProgressDashboard user={user} />
        </main>
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      )}

      {/* Too-many-devices gate */}
      {sessionStatus.kind === "too_many" && (
        <TooManyDevicesModal
          deviceCount={sessionStatus.deviceCount}
          onKickAndClaim={kickAndClaim}
          onLogout={handleLogout}
        />
      )}

      {/* Account modal */}
      {showAccountModal && user && (
        <AccountModal
          user={user}
          subscription={subscription}
          onClose={() => setShowAccountModal(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Feedback modal */}
      {showFeedbackModal && (
        <FeedbackModal onClose={() => setShowFeedbackModal(false)} />
      )}

      {/* Floating helpers */}
      <ScrollToTop />
      <RatingPrompt user={user} />
      {user && <IOSInstallPrompt />}
    </div>
  );
}
