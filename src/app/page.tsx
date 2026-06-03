"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SlideAnalyzer from "@/components/SlideAnalyzer";
import dynamic from "next/dynamic";
import ScrollToTop from "@/components/ScrollToTop";
import RatingPrompt from "@/components/RatingPrompt";
import { useSubscription } from "@/lib/useSubscription";
import { useSessionGuard } from "@/lib/useSessionGuard";
import { useStreak } from "@/lib/useStreak";
import IOSInstallPrompt from "@/components/IOSInstallPrompt";
import type { SlideQuizData } from "@/lib/generatePersonalQuiz";
import GuestGate from "@/components/GuestGate";
import { FolderOpen, BarChart2, GraduationCap, Loader2 } from "lucide-react";
import ReferralNudge from "@/components/ReferralNudge";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import PushNotificationNudge from "@/components/PushNotificationNudge";

// ── Lazily-loaded tabs & modals ──────────────────────────────────────────────
// Only the default "analyze" tab (SlideAnalyzer, imported statically above)
// renders on first load. The other tabs and the modals each ship as their own
// chunk and download on demand — the first switch/open fetches them — so the
// initial JS payload drops to just the landing view.
const TabFallback = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
  </div>
);

const PathologyAtlas    = dynamic(() => import("@/components/PathologyAtlas"),    { loading: TabFallback });
const QuizMode          = dynamic(() => import("@/components/QuizMode"),          { loading: TabFallback });
const FlashcardMode     = dynamic(() => import("@/components/FlashcardMode"),     { loading: TabFallback });
const ProgressDashboard = dynamic(() => import("@/components/ProgressDashboard"), { loading: TabFallback });
const SavedCases        = dynamic(() => import("@/components/SavedCases"),        { loading: TabFallback });
const SmartLearn        = dynamic(() => import("@/components/SmartLearn"),        { loading: TabFallback });

const AuthModal           = dynamic(() => import("@/components/AuthModal"));
const AccountModal        = dynamic(() => import("@/components/AccountModal"));
const FeedbackModal       = dynamic(() => import("@/components/FeedbackModal"));
const TipsModal           = dynamic(() => import("@/components/TipsModal"));
const TooManyDevicesModal = dynamic(() => import("@/components/TooManyDevicesModal"));
const TrialExpiryModal    = dynamic(() => import("@/components/TrialExpiryModal"));

type Tab = "analyze" | "atlas" | "quiz" | "flashcards" | "progress" | "cases" | "learn";

export default function Home() {
  const [activeTab,        setActiveTab]        = useState<Tab>("analyze");
  const [previousTab,      setPreviousTab]      = useState<Tab | null>(null);
  const [selectedSlide,    setSelectedSlide]    = useState<string | null>(null);
  const [selectedSlideHint,setSelectedSlideHint]= useState<string | null>(null);
  const [user,             setUser]             = useState<User | null>(null);
  const [authLoading,      setAuthLoading]      = useState(true);
  const [showAuthModal,    setShowAuthModal]    = useState(false);
  const [authContext,      setAuthContext]      = useState<string | undefined>(undefined);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTipsModal,    setShowTipsModal]    = useState(false);
  // Quiz filter — set when user clicks "Quick Quiz" on a flashcard
  const [quizFlashcardIds,  setQuizFlashcardIds]  = useState<string[] | undefined>(undefined);
  // Data for generating questions from a personal slide
  const [personalSlideData, setPersonalSlideData] = useState<SlideQuizData | undefined>(undefined);
  const subscription = useSubscription(user);
  const { sessionStatus, kickAndClaim } = useSessionGuard(user);
  const streak = useStreak(user);

  // Open the auth modal, optionally with a contextual sign-up nudge.
  const promptAuth = (reason?: string) => { setAuthContext(reason); setShowAuthModal(true); };
  const closeAuth = () => { setShowAuthModal(false); setAuthContext(undefined); };

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AnnouncementBanner
        id="infographics-launch"
        message="✨ New: Generate beautiful infographic study cards from any slide analysis — try it now!"
        ctaLabel="Try Infographics"
        onCtaClick={() => setActiveTab("analyze")}
      />

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
        isPremium={subscription.isPremium}
        isTrialing={subscription.isTrialing}
        daysLeft={subscription.daysLeft}
        onLoginClick={() => promptAuth()}
        onLogout={handleLogout}
        onAccountClick={() => setShowAccountModal(true)}
        onFeedbackClick={() => setShowFeedbackModal(true)}
        onTipsClick={() => setShowTipsModal(true)}
      />

      {activeTab === "analyze" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!selectedSlide && <Hero />}
          <SlideAnalyzer
            preloadedImage={selectedSlide}
            diagnosisContext={selectedSlideHint}
            user={user}
            onLoginRequest={promptAuth}
            onClear={handleClear}
            previousTab={previousTab}
            canUseInfographics={subscription.isPremium || subscription.isTrialing}
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
            onUpgrade={() => { window.location.href = "/pricing"; }}
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
          {user ? (
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
          ) : (
            <GuestGate
              icon={FolderOpen}
              title="Your saved cases live here"
              description="Create a free account to save every slide you analyze, revisit your study history, and turn cases into quizzes."
              onSignUp={() => promptAuth("Create a free account to save and revisit your analyzed cases.")}
            />
          )}
        </main>
      )}

      {activeTab === "learn" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {user ? (
            <SmartLearn user={user} canUseInfographics={subscription.isPremium || subscription.isTrialing} />
          ) : (
            <GuestGate
              icon={GraduationCap}
              title="Smart Learn turns your notes into study sets"
              description="Create a free account to upload your lecture slides and documents and let the AI build flashcards and quizzes from them."
              onSignUp={() => promptAuth("Create a free account to upload documents and generate study sets with Smart Learn.")}
            />
          )}
        </main>
      )}

      {activeTab === "progress" && (
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {user ? (
            <ProgressDashboard user={user} />
          ) : (
            <GuestGate
              icon={BarChart2}
              title="Track your learning progress"
              description="Create a free account to build study streaks, track quiz performance, and watch your histopathology skills grow over time."
              onSignUp={() => promptAuth("Create a free account to track your progress and build study streaks.")}
            />
          )}
        </main>
      )}

      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          onClose={closeAuth}
          onSuccess={closeAuth}
          contextMessage={authContext}
          defaultMode={authContext ? "signup" : "signin"}
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

      {/* Push notification nudge — appears 4s after first load for new users */}
      {user && <PushNotificationNudge user={user} />}

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

      {/* Tips modal */}
      {showTipsModal && (
        <TipsModal onClose={() => setShowTipsModal(false)} />
      )}

      {/* Trial expiry nudge (shows day 11–13 of trial, once per day) */}
      {user && (
        <TrialExpiryModal
          user={user}
          daysLeft={subscription.daysLeft}
          isTrialing={subscription.isTrialing}
          monthlyPrice={subscription.monthlyPrice}
          onUpgradeClick={() => setShowAccountModal(true)}
        />
      )}

      {/* Floating helpers */}
      <ScrollToTop />
      <RatingPrompt user={user} />
      <ReferralNudge user={user} />
      {user && <IOSInstallPrompt />}
    </div>
  );
}
