"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SlideAnalyzer from "@/components/SlideAnalyzer";
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

type Tab = "analyze" | "atlas" | "quiz" | "flashcards" | "progress" | "cases";

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

  // While checking session, show a skeleton splash to avoid flash of login screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Skeleton navbar */}
        <div className="h-16 bg-slate-800/80 border-b border-slate-700/50 flex items-center px-6 gap-4">
          <div className="w-8 h-8 rounded-lg bg-slate-700 animate-pulse" />
          <div className="w-28 h-4 rounded bg-slate-700 animate-pulse" />
          <div className="flex-1" />
          {[80, 64, 56, 72, 64].map((w, i) => (
            <div key={i} className="hidden sm:block rounded bg-slate-700 animate-pulse h-3" style={{ width: w }} />
          ))}
          <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse ml-2" />
        </div>

        {/* Skeleton content area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          {/* Logo + name */}
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600/40 to-purple-600/40 animate-pulse flex items-center justify-center">
              <span className="text-3xl">🔬</span>
            </div>
            <div className="w-32 h-5 rounded-full bg-slate-700 animate-pulse" />
            <div className="w-48 h-3 rounded-full bg-slate-800 animate-pulse" />
          </div>

          {/* Skeleton card strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl bg-slate-800 border border-slate-700/50 p-4 animate-pulse flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-700" />
                <div className="w-full h-3 rounded bg-slate-700 mt-1" />
                <div className="w-2/3 h-2 rounded bg-slate-700/60" />
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-600 animate-pulse">Loading PathoLearn…</p>
        </div>
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
          // library tab merged into atlas
          if ((tab as string) === "library") { setActiveTab("atlas"); return; }
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
            onBack={() => setActiveTab("analyze")}
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
          <SavedCases
            user={user}
            onAnalyze={(imageUrl) => {
              setSelectedSlide(imageUrl);
              setSelectedSlideHint(null); // personal slides have no known diagnosis yet — let AI decide
              setPreviousTab("cases");
              setActiveTab("analyze");
            }}
            onQuiz={(slideData) => {
              setPersonalSlideData(slideData);
              setQuizFlashcardIds([`user-${Date.now()}`]);
              setActiveTab("quiz");
            }}
          />
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
