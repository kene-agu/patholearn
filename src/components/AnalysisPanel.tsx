"use client";

import { useState } from "react";
import {
  CheckCircle, AlertTriangle, FlaskConical, ShieldAlert,
  GitBranch, Stethoscope, Lightbulb, MapPin, ChevronDown, ChevronUp,
  Dna, Microscope,
} from "lucide-react";
import { clsx } from "clsx";
import type { AnalysisResult } from "@/types/analysis";

interface AnalysisPanelProps {
  analysis: AnalysisResult;
  activeAnnotation: string | null;
  onAnnotationSelect: (id: string | null) => void;
}

const confidenceColors: Record<string, string> = {
  High:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low:    "bg-red-50 text-red-700 border-red-200",
};

const SECTION_COLORS = [
  "#38bdf8", "#a78bfa", "#34d399", "#fb923c",
  "#f472b6", "#facc15", "#60a5fa", "#4ade80",
];

const ihcResultColors: Record<string, string> = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  negative: "bg-red-50 text-red-600 border-red-200",
  variable: "bg-amber-50 text-amber-700 border-amber-200",
};

type Section = "structures" | "stain" | "risk" | "complications" | "differentials" | "clinical" | "learning" | "ihc" | "pathogenesis";

export default function AnalysisPanel({ analysis, activeAnnotation, onAnnotationSelect }: AnalysisPanelProps) {
  const [openSection, setOpenSection] = useState<Section | null>("structures");

  const toggle = (s: Section) => setOpenSection((prev) => (prev === s ? null : s));

  return (
    <div className="card p-0 overflow-hidden flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-primary-50 to-purple-50">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base leading-tight">{analysis.diagnosis}</h2>
            <p className="text-slate-500 text-xs mt-0.5">{analysis.overview}</p>
          </div>
          <span className={clsx("badge border text-xs ml-3 flex-shrink-0", confidenceColors[analysis.confidence])}>
            {analysis.confidence} confidence
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1">

        {/* Annotations list */}
        {analysis.annotations.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-50">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Annotated Structures
            </p>
            <div className="space-y-1.5">
              {analysis.annotations.map((ann, i) => (
                <button
                  key={ann.id}
                  onClick={() => onAnnotationSelect(activeAnnotation === ann.id ? null : ann.id)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150",
                    activeAnnotation === ann.id
                      ? "bg-primary-50 border border-primary-200"
                      : "hover:bg-slate-50 border border-transparent"
                  )}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: SECTION_COLORS[i % SECTION_COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{ann.label}</p>
                    <p className="text-[11px] text-slate-500 truncate">{ann.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Accordion sections */}
        <Accordion
          id="stain"
          open={openSection === "stain"}
          toggle={() => toggle("stain")}
          icon={<FlaskConical className="w-4 h-4 text-teal-600" />}
          title="Stain Identification"
          badgeText={analysis.stain.type}
          badgeColor="bg-teal-50 text-teal-700"
        >
          <p className="text-xs text-slate-600 mb-1"><span className="font-medium">Reasoning: </span>{analysis.stain.reasoning}</p>
          <p className="text-xs text-slate-600"><span className="font-medium">Colours: </span>{analysis.stain.colorCharacteristics}</p>
        </Accordion>

        <Accordion
          id="structures"
          open={openSection === "structures"}
          toggle={() => toggle("structures")}
          icon={<CheckCircle className="w-4 h-4 text-primary-600" />}
          title="Key Structures"
          badgeText={`${analysis.structures.length} found`}
          badgeColor="bg-primary-50 text-primary-700"
        >
          <div className="space-y-3">
            {analysis.structures.map((s) => (
              <div key={s.name} className={clsx(
                "rounded-xl p-3 border text-xs",
                s.normalOrAbnormal === "abnormal"
                  ? "bg-red-50 border-red-100"
                  : "bg-emerald-50 border-emerald-100"
              )}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-slate-800">{s.name}</p>
                  <span className={clsx("badge text-[10px]",
                    s.normalOrAbnormal === "abnormal"
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  )}>
                    {s.normalOrAbnormal}
                  </span>
                </div>
                <p className="text-slate-600 mb-1.5">{s.description}</p>
                <p className="text-slate-500 italic flex gap-1">
                  <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-500" />
                  {s.educationalNote}
                </p>
              </div>
            ))}
          </div>
        </Accordion>

        {/* ── IHC Markers ─────────────────────────────────────────────── */}
        {analysis.ihcMarkers && analysis.ihcMarkers.length > 0 && (
          <Accordion
            id="ihc"
            open={openSection === "ihc"}
            toggle={() => toggle("ihc")}
            icon={<Microscope className="w-4 h-4 text-indigo-600" />}
            title="IHC Markers"
            badgeText={`${analysis.ihcMarkers.length} markers`}
            badgeColor="bg-indigo-50 text-indigo-700"
          >
            <div className="space-y-2.5">
              {analysis.ihcMarkers.map((m) => (
                <div key={m.marker} className="rounded-xl border border-slate-100 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                    <p className="text-xs font-bold text-slate-800 font-mono tracking-wide">{m.marker}</p>
                    <span className={clsx(
                      "badge border text-[10px] font-semibold",
                      ihcResultColors[m.expectedResult]
                    )}>
                      {m.expectedResult === "positive" ? "+" : m.expectedResult === "negative" ? "−" : "±"}{" "}
                      {m.expectedResult}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 px-3 py-2 leading-relaxed">{m.significance}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-3 italic">
              * IHC results shown are expected/typical for this diagnosis. Confirm with clinical context.
            </p>
          </Accordion>
        )}

        {/* ── Pathogenesis ─────────────────────────────────────────────── */}
        {analysis.pathogenesis && analysis.pathogenesis.length > 0 && (
          <Accordion
            id="pathogenesis"
            open={openSection === "pathogenesis"}
            toggle={() => toggle("pathogenesis")}
            icon={<Dna className="w-4 h-4 text-rose-600" />}
            title="Pathogenesis"
            badgeText={`${analysis.pathogenesis.length} steps`}
            badgeColor="bg-rose-50 text-rose-700"
          >
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-gradient-to-b from-rose-300 to-rose-100" />
              <div className="space-y-4 relative">
                {analysis.pathogenesis.map((step) => (
                  <div key={step.step} className="flex gap-4 items-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 z-10 shadow-sm">
                      {step.step}
                    </div>
                    <div className="pb-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 mb-0.5">{step.title}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Accordion>
        )}

        <Accordion
          id="risk"
          open={openSection === "risk"}
          toggle={() => toggle("risk")}
          icon={<ShieldAlert className="w-4 h-4 text-amber-600" />}
          title="Risk Factors"
          badgeText={`${analysis.riskFactors.length}`}
          badgeColor="bg-amber-50 text-amber-700"
        >
          <ul className="space-y-1.5">
            {analysis.riskFactors.map((r) => (
              <li key={r} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                {r}
              </li>
            ))}
          </ul>
        </Accordion>

        <Accordion
          id="complications"
          open={openSection === "complications"}
          toggle={() => toggle("complications")}
          icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
          title="Complications"
          badgeText={`${analysis.complications.length}`}
          badgeColor="bg-red-50 text-red-600"
        >
          <ul className="space-y-1.5">
            {analysis.complications.map((c) => (
              <li key={c} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                {c}
              </li>
            ))}
          </ul>
        </Accordion>

        <Accordion
          id="differentials"
          open={openSection === "differentials"}
          toggle={() => toggle("differentials")}
          icon={<GitBranch className="w-4 h-4 text-purple-600" />}
          title="Differential Diagnoses"
          badgeText={`${analysis.differentialDiagnosis.length}`}
          badgeColor="bg-purple-50 text-purple-700"
        >
          <div className="space-y-2">
            {analysis.differentialDiagnosis.map((d) => (
              <div key={d.diagnosis} className="bg-purple-50 rounded-xl p-3 text-xs">
                <p className="font-semibold text-slate-800 mb-0.5">{d.diagnosis}</p>
                <p className="text-slate-600">{d.distinguishingFeatures}</p>
              </div>
            ))}
          </div>
        </Accordion>

        <Accordion
          id="clinical"
          open={openSection === "clinical"}
          toggle={() => toggle("clinical")}
          icon={<Stethoscope className="w-4 h-4 text-sky-600" />}
          title="Clinical Correlation"
        >
          <p className="text-xs text-slate-600 leading-relaxed">{analysis.clinicalCorrelation}</p>
        </Accordion>

        <Accordion
          id="learning"
          open={openSection === "learning"}
          toggle={() => toggle("learning")}
          icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
          title="Key Learning Points"
          badgeText={`${analysis.keyLearningPoints.length}`}
          badgeColor="bg-amber-50 text-amber-700"
        >
          <ol className="space-y-2">
            {analysis.keyLearningPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </Accordion>

      </div>
    </div>
  );
}

// ── Reusable accordion ───────────────────────────────────────────────────────
function Accordion({
  id, open, toggle, icon, title, badgeText, badgeColor, children,
}: {
  id: string;
  open: boolean;
  toggle: () => void;
  icon: React.ReactNode;
  title: string;
  badgeText?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-50 last:border-0">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-medium text-slate-700">{title}</span>
          {badgeText && (
            <span className={clsx("badge text-[10px]", badgeColor)}>{badgeText}</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}
