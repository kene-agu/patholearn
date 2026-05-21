"use client";

import { useState } from "react";
import { X, Lightbulb, Microscope, BookOpen, GraduationCap, FolderOpen, Brain, Layers, BarChart2, Sparkles, LayoutTemplate } from "lucide-react";
import { clsx } from "clsx";

interface TipsModalProps {
  onClose: () => void;
}

interface Tip {
  text: string;
}

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  tips: Tip[];
}

const SECTIONS: Section[] = [
  {
    id: "general",
    label: "Getting Started",
    icon: Sparkles,
    color: "violet",
    tips: [
      { text: "PathoLearn works best as a daily study companion — even 15 minutes a day builds strong pattern recognition over time." },
      { text: "Premium subscribers get unlimited slide analyses, full atlas access, and all study features unlocked." },
      { text: "Use the streak counter in the navbar to keep your daily study habit going." },
      { text: "The support chatbot (bottom-right) can answer questions about specific pathology findings or help you navigate the platform." },
    ],
  },
  {
    id: "infographics",
    label: "Infographics",
    icon: LayoutTemplate,
    color: "violet",
    tips: [
      { text: "Generate an infographic from any completed slide analysis — click the 'Generate Infographic' button in the Analyze Slide section after the AI has finished." },
      { text: "In Smart Learn, generate a document-level infographic after uploading a PDF — it summarises the entire document into a visual study card." },
      { text: "The AI adapts the infographic structure to your content — histopathology slides get different sections than pharmacology or microbiology notes." },
      { text: "Use the 'Export PDF' button inside the infographic to save a print-ready A4 study card to your device." },
      { text: "Infographics work best on completed, high-quality analyses — the richer the analysis, the better the infographic." },
    ],
  },
  {
    id: "analyze",
    label: "Analyze Slide",
    icon: Microscope,
    color: "sky",
    tips: [
      { text: "Upload clear, high-resolution H&E slides for the most accurate AI interpretation. Blurry or low-contrast images reduce analysis quality." },
      { text: "The AI automatically identifies stain type, tissue origin, key morphological features, and relevant IHC markers." },
      { text: "After analysis, use the annotation canvas to highlight key structures yourself — active annotation reinforces memory." },
      { text: "IHC stains (e.g. Ki-67, CD20, TTF-1) are supported — upload them for automated marker interpretation." },
      { text: "Drag and drop images directly onto the upload zone for faster workflow." },
    ],
  },
  {
    id: "atlas",
    label: "Slide Library",
    icon: BookOpen,
    color: "teal",
    tips: [
      { text: "The Pathology Atlas contains curated, high-quality slides covering major organ systems and common pathologies." },
      { text: "Click any atlas slide to open it directly in the Analyzer for full AI interpretation and annotation." },
      { text: "Study atlas slides before quizzes to familiarise yourself with classic morphological appearances." },
      { text: "Use the atlas to compare similar conditions side-by-side and understand key differentiating features." },
    ],
  },
  {
    id: "learn",
    label: "Smart Learn",
    icon: GraduationCap,
    color: "indigo",
    tips: [
      { text: "Upload your lecture PDFs or revision notes to auto-generate personalised flashcards from your own material." },
      { text: "Extracted slides can be explored in depth with AI explanations tailored to the content of your notes." },
      { text: "Smart Learn works best with structured PDF notes — slides, textbook chapters, and past paper compilations all work well." },
      { text: "Generated flashcards are added to your personal deck and can be reviewed using spaced repetition." },
    ],
  },
  {
    id: "cases",
    label: "My Cases",
    icon: FolderOpen,
    color: "amber",
    tips: [
      { text: "Save any slide you've analyzed to build your own personal pathology case library over time." },
      { text: "Use \"Quick Quiz\" on saved cases to test yourself on slides you've already studied." },
      { text: "Re-analyzing a saved case after further study is a great way to check whether your interpretation has improved." },
      { text: "Cases are stored securely to your account and are accessible across devices." },
    ],
  },
  {
    id: "quiz",
    label: "Quiz Mode",
    icon: Brain,
    color: "rose",
    tips: [
      { text: "Select specific flashcard topics from your deck to target your weakest areas first." },
      { text: "Use timed quiz mode to simulate OSCE exam pressure — consistent timed practice dramatically improves recall speed." },
      { text: "Always read the full explanation after each question, even when you answer correctly — explanations contain high-yield clinical correlations." },
      { text: "Quiz questions linked to your saved cases can be generated from the \"My Cases\" tab." },
    ],
  },
  {
    id: "flashcards",
    label: "Flashcards",
    icon: Layers,
    color: "purple",
    tips: [
      { text: "Rate every card honestly (Again / Hard / Good / Easy) — spaced repetition only works when your self-assessment is accurate." },
      { text: "Cards rated \"Again\" or \"Hard\" reappear sooner to strengthen weak memories before they fade." },
      { text: "Review due cards every day. Missing a day doesn't reset your progress, but consistent daily review keeps cards in long-term memory." },
      { text: "OSCE mode adds a countdown timer to each card, simulating the time pressure of a real viva or OSCE station." },
    ],
  },
  {
    id: "progress",
    label: "Progress",
    icon: BarChart2,
    color: "green",
    tips: [
      { text: "Check your progress dashboard weekly to identify knowledge gaps across different pathology categories." },
      { text: "Your daily streak is updated each time you analyze a slide or complete a review session." },
      { text: "Use performance trends to decide which topics to prioritize in your next study session." },
      { text: "Progress data is preserved across sessions — your study history is always available to review." },
    ],
  },
];

const COLOR_MAP: Record<string, { tab: string; icon: string; badge: string }> = {
  violet: {
    tab:   "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700",
    icon:  "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    badge: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300",
  },
  sky: {
    tab:   "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700",
    icon:  "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400",
    badge: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
  },
  teal: {
    tab:   "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700",
    icon:  "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
    badge: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  },
  indigo: {
    tab:   "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700",
    icon:  "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  },
  amber: {
    tab:   "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
    icon:  "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  },
  rose: {
    tab:   "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700",
    icon:  "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
    badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
  },
  purple: {
    tab:   "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700",
    icon:  "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  },
  green: {
    tab:   "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
    icon:  "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  },
};

export default function TipsModal({ onClose }: TipsModalProps) {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const section = SECTIONS.find(s => s.id === activeSection) ?? SECTIONS[0];
  const colors = COLOR_MAP[section.color];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-slate-800 sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Tips &amp; Tricks</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Get the most out of PathoLearn</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close tips"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Section sidebar */}
          <nav className="w-36 sm:w-44 flex-shrink-0 border-r border-slate-100 dark:border-slate-700 overflow-y-auto py-2">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              const isActive = s.id === activeSection;
              const c = COLOR_MAP[s.color];
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition-colors",
                    isActive
                      ? clsx("border-r-2", c.tab)
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="leading-tight">{s.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Tips content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", colors.badge)}>
                <section.icon className="w-3 h-3" />
                {section.label}
              </span>
              <span className="text-xs text-slate-400">{section.tips.length} tips</span>
            </div>

            {section.tips.map((tip, i) => (
              <div
                key={i}
                className="flex gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700"
              >
                <div className={clsx("w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5", colors.icon)}>
                  {i + 1}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
          <p className="text-xs text-slate-400 text-center">
            More questions? Use the{" "}
            <span className="font-medium text-slate-500 dark:text-slate-300">support chatbot</span>
            {" "}in the bottom-right corner.
          </p>
        </div>
      </div>
    </div>
  );
}
