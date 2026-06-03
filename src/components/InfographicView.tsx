"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Microscope,
  BookOpen,
  AlertCircle,
  Star,
  Lightbulb,
  Heart,
  Zap,
  FlaskConical,
  Stethoscope,
  Dna,
  ShieldAlert,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface InfographicSection {
  heading: string;
  points: string[];
}

export interface InfographicData {
  title: string;
  subtitle: string;
  keyFact: string;
  pearl: string;
  sections: InfographicSection[];
}

interface InfographicViewProps {
  infographic: InfographicData;
  onClose: () => void;
}

// ── Section icon palette ─────────────────────────────────────────────────────
// Picks a contextually-appropriate icon based on the section heading keyword
function getSectionIcon(heading: string, index: number) {
  const h = heading.toLowerCase();
  if (/stain|histol|morphol|microscop|slide/i.test(h)) return Microscope;
  if (/pathogen|molecular|genetic|dna|gene/i.test(h)) return Dna;
  if (/clinical|correlat|present|symptom/i.test(h)) return Stethoscope;
  if (/risk|factor|aetio|etio/i.test(h)) return ShieldAlert;
  if (/complicat|prognos|outcome/i.test(h)) return AlertCircle;
  if (/treatment|manag|therap/i.test(h)) return Heart;
  if (/stain|ihc|marker/i.test(h)) return FlaskConical;
  if (/learn|key|point|summary/i.test(h)) return BookOpen;
  if (/feature|finding|sign/i.test(h)) return Zap;
  // Cycle through a fallback set
  const fallbacks = [Microscope, BookOpen, Stethoscope, FlaskConical, Dna];
  return fallbacks[index % fallbacks.length];
}

// ── Section colour palette ────────────────────────────────────────────────────
// Each section card gets a distinct colour pair [bg, border, icon, heading]
const SECTION_PALETTES = [
  {
    card: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800",
    icon: "text-sky-600 dark:text-sky-400",
    heading: "text-sky-800 dark:text-sky-200",
    dot: "bg-sky-400",
    badge: "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300",
  },
  {
    card: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",
    icon: "text-violet-600 dark:text-violet-400",
    heading: "text-violet-800 dark:text-violet-200",
    dot: "bg-violet-400",
    badge: "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  },
  {
    card: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    icon: "text-emerald-600 dark:text-emerald-400",
    heading: "text-emerald-800 dark:text-emerald-200",
    dot: "bg-emerald-400",
    badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  },
  {
    card: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    heading: "text-amber-800 dark:text-amber-200",
    dot: "bg-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  },
  {
    card: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
    icon: "text-rose-600 dark:text-rose-400",
    heading: "text-rose-800 dark:text-rose-200",
    dot: "bg-rose-400",
    badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
  },
];

// ── PDF export ────────────────────────────────────────────────────────────────

async function exportInfographicPdf(infographic: InfographicData) {
  const { jsPDF } = await import("jspdf");

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 14;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const PRIMARY: [number, number, number] = [37, 99, 235];
  const PURPLE: [number, number, number] = [124, 58, 237];
  const TEAL: [number, number, number] = [13, 148, 136];
  const AMBER: [number, number, number] = [217, 119, 6];
  const SLATE900: [number, number, number] = [15, 23, 42];
  const SLATE600: [number, number, number] = [71, 85, 105];
  const SLATE400: [number, number, number] = [148, 163, 184];
  const WHITE: [number, number, number] = [255, 255, 255];

  const SECTION_COLORS: [number, number, number][] = [
    [2, 132, 199],   // sky-600
    [124, 58, 237],  // violet-600
    [5, 150, 105],   // emerald-600
    [217, 119, 6],   // amber-600
    [225, 29, 72],   // rose-600
  ];

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  const addPage = () => { doc.addPage(); y = MARGIN; };
  const checkY = (needed: number) => { if (y + needed > PAGE_H - MARGIN) addPage(); };

  // ── Header gradient band ──────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PAGE_W, 38, "F");
  // Accent stripe
  doc.setFillColor(...PURPLE);
  doc.rect(0, 32, PAGE_W, 6, "F");

  // PathoLearn badge
  doc.setFillColor(...WHITE);
  doc.roundedRect(MARGIN, 5, 30, 7, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...PRIMARY);
  doc.text("PathoLearn", MARGIN + 15, 9.5, { align: "center" });

  // Title
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(infographic.title, CONTENT_W - 35) as string[];
  doc.text(titleLines, MARGIN, 20);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const subtitleLines = doc.splitTextToSize(infographic.subtitle, CONTENT_W) as string[];
  doc.text(subtitleLines, MARGIN, 20 + titleLines.length * 7);

  y = 46;

  // ── Key Fact box ──────────────────────────────────────────────────────────
  checkY(22);
  doc.setFillColor(239, 246, 255); // blue-50
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, "F");
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, "S");

  doc.setFillColor(...PRIMARY);
  doc.roundedRect(MARGIN, y, 28, 18, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text("KEY FACT", MARGIN + 14, y + 10.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE900);
  const factLines = doc.splitTextToSize(infographic.keyFact, CONTENT_W - 34) as string[];
  doc.text(factLines, MARGIN + 32, y + (18 - factLines.length * 4) / 2 + 3.5);
  y += 22;

  // ── Section cards ─────────────────────────────────────────────────────────
  infographic.sections.forEach((section, i) => {
    const color = SECTION_COLORS[i % SECTION_COLORS.length];
    const bulletPts = section.points.length;
    const cardH = 14 + bulletPts * 10; // rough estimate
    checkY(cardH);

    // Card background
    doc.setFillColor(245 - i * 3, 245 - i * 3, 255);
    doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 3, 3, "F");

    // Left colour bar
    doc.setFillColor(...color);
    doc.roundedRect(MARGIN, y, 4, cardH, 2, 2, "F");
    doc.rect(MARGIN + 2, y, 2, cardH, "F"); // square the right edge of bar

    // Section heading
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(section.heading.toUpperCase(), MARGIN + 8, y + 7);

    // Bullet points
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...SLATE600);
    let bulletY = y + 12;

    section.points.forEach((point) => {
      const lines = doc.splitTextToSize(`• ${point}`, CONTENT_W - 12) as string[];
      const lineH = lines.length * 4;
      if (bulletY + lineH > y + cardH - 2) return; // skip if overflow
      doc.text(lines, MARGIN + 8, bulletY);
      bulletY += lineH + 2;
    });

    y += cardH + 4;
  });

  // ── Pearl box ─────────────────────────────────────────────────────────────
  checkY(22);
  doc.setFillColor(245, 243, 255); // violet-50
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, "F");
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 3, 3, "S");

  doc.setFillColor(...PURPLE);
  doc.roundedRect(MARGIN, y, 26, 18, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text("PEARL", MARGIN + 13, y + 10.5, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE900);
  const pearlLines = doc.splitTextToSize(infographic.pearl, CONTENT_W - 32) as string[];
  doc.text(pearlLines, MARGIN + 30, y + (18 - pearlLines.length * 4) / 2 + 3.5);
  y += 22;

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SLATE400);
    doc.text("Generated by PathoLearn · AI-assisted analysis, not for clinical use", MARGIN, PAGE_H - 4);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
  }

  const fileName = `PathoLearn_Infographic_${infographic.title.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.pdf`;
  doc.save(fileName);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InfographicView({ infographic, onClose }: InfographicViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      {/* Overlay */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <motion.div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Card */}
        <motion.div
          className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-3xl flex flex-col max-h-[92dvh]"
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
        >
          {/* ── Hero header ──────────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-t-3xl sm:rounded-t-3xl flex-shrink-0">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-violet-600 to-primary-700" />
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/5" />

            {/* Grab handle — bottom-sheet affordance on mobile */}
            <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/40" />

            <div className="relative px-5 pt-6 pb-4 sm:px-7 sm:pt-6 sm:pb-5">
              {/* Top bar: PathoLearn badge + close button */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 bg-white/10 px-2.5 py-1 rounded-full">
                  PathoLearn Infographic
                </span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Close infographic"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Title + subtitle */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight mb-1.5">
                {infographic.title}
              </h1>
              <p className="text-sm text-white/75 leading-snug max-w-xl">
                {infographic.subtitle}
              </p>
            </div>
          </div>

          {/* ── Scrollable body ───────────────────────────────────────────── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-4">

              {/* Key Fact highlight */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-4"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-0.5">
                    Key Fact
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                    {infographic.keyFact}
                  </p>
                </div>
              </motion.div>

              {/* Section cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {infographic.sections.map((section, i) => {
                  const palette = SECTION_PALETTES[i % SECTION_PALETTES.length];
                  const Icon = getSectionIcon(section.heading, i);

                  return (
                    <motion.div
                      key={section.heading}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                      className={`rounded-2xl border p-4 ${palette.card}`}
                    >
                      {/* Section header */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${palette.badge} flex-shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${palette.icon}`} />
                        </div>
                        <h3 className={`text-xs font-bold uppercase tracking-wide ${palette.heading} leading-tight`}>
                          {section.heading}
                        </h3>
                      </div>

                      {/* Bullet points */}
                      <ul className="space-y-2">
                        {section.points.map((point, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            <span className={`w-1.5 h-1.5 rounded-full ${palette.dot} flex-shrink-0 mt-1.5`} />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pearl highlight */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + infographic.sections.length * 0.06 + 0.05 }}
                className="flex items-start gap-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-0.5">
                    Clinical Pearl
                  </p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug italic">
                    {infographic.pearl}
                  </p>
                </div>
              </motion.div>

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center pb-1">
                AI-generated educational content — not for clinical use
              </p>
            </div>
          </div>

          {/* ── Sticky footer with actions ────────────────────────────────── */}
          <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-3 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-b-3xl">
            <button
              onClick={onClose}
              className="flex-shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-3 py-2"
            >
              Close
            </button>
            <button
              onClick={() => exportInfographicPdf(infographic)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 sm:py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
