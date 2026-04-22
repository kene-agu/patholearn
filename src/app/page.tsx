"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SlideAnalyzer from "@/components/SlideAnalyzer";
import SlideLibrary from "@/components/SlideLibrary";
import QuizMode from "@/components/QuizMode";
import FlashcardMode from "@/components/FlashcardMode";

type Tab = "analyze" | "library" | "quiz" | "flashcards";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null);
  const [selectedSlideHint, setSelectedSlideHint] = useState<string | null>(null);

  const handleLibrarySelect = (imageUrl: string, diagnosisHint: string) => {
    setSelectedSlide(imageUrl);
    setSelectedSlideHint(diagnosisHint);
    setActiveTab("analyze");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "analyze" && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!selectedSlide && <Hero />}
          <SlideAnalyzer
            preloadedImage={selectedSlide}
            diagnosisContext={selectedSlideHint}
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
    </div>
  );
}
