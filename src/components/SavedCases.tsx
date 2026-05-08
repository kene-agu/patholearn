"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AnalysisResult } from "@/types/analysis";
import AnalysisPanel from "@/components/AnalysisPanel";
import { Clock, Trash2, X, FolderOpen, ChevronRight, Download, ImagePlus, Brain } from "lucide-react";
import { clsx } from "clsx";
import PersonalSlides from "@/components/PersonalSlides";
import type { SlideQuizData } from "@/lib/generatePersonalQuiz";

interface Props {
  user: User;
  onAnalyze?: (imageUrl: string, title: string) => void;
  onQuiz?: (slideData: SlideQuizData) => void;
}

interface SavedCase {
  id: string;
  diagnosis: string;
  slide_label: string | null;
  image_url: string | null;
  image_source: string | null;
  analysis_json: Record<string, unknown> | null;
  analyzed_at: string;
}

function bestDiagnosis(c: SavedCase): string {
  const fromJson = (c.analysis_json as Record<string, unknown> | null)?.diagnosis;
  if (typeof fromJson === "string" && fromJson.length > 0) return fromJson;
  return c.diagnosis;
}

// Fallback for legacy saved cases where image_url wasn't persisted.
// Order matters — more specific patterns first.
const DIAGNOSIS_TO_SLIDE: Array<[RegExp, string]> = [
  // ── Specific conditions (before generic organ catches) ────────────────────
  [/squamous cell carcinoma|scc(?!\w)/i,    "/slides/scc.jpg"],
  [/ductal carcinoma in situ|dcis/i,        "/slides/dcis.jpg"],
  [/invasive ductal|idc(?!\w)|breast.*carcin|carcinoma.*breast/i, "/slides/idc.jpg"],
  [/fibroadenoma/i,                         "/slides/fibroadenoma.jpg"],
  [/dermoid|teratoma/i,                     "/slides/ovary.jpg"],
  [/ovarian|ovary|corpus luteum|follicle/i, "/slides/ovary.jpg"],
  [/bph|prostatic hyperplasia|benign.*prostat/i, "/slides/prostate.jpg"],
  [/prostate|prostatic/i,                   "/slides/prostate.jpg"],
  [/colorectal|crc(?!\w)|colon.*adeno|adeno.*colon/i, "/slides/crc.jpg"],
  [/crohn/i,                                "/slides/crohn.jpg"],
  [/gastritis|gastric/i,                    "/slides/gastritis.jpg"],
  [/oesophageal|esophageal/i,               "/slides/oesophageal.jpg"],
  [/clear cell renal|ccrcc/i,               "/slides/ccrcc.jpg"],
  [/crescentic|rpgn/i,                      "/slides/rpgn.jpg"],
  [/kimmelstiel|nodular glomer/i,           "/slides/kw-nodules.jpg"],
  [/wilms|nephroblastoma/i,                 "/slides/wilms.jpg"],
  [/uip|usual interstitial|pulmonary fibrosis/i, "/slides/uip.jpg"],
  [/ziehl|acid.?fast|afb/i,                 "/slides/tb-zn.jpg"],
  [/tuberculosis/i,                         "/slides/tb.jpg"],
  [/hodgkin/i,                              "/slides/hodgkin.jpg"],
  [/dlbcl|diffuse large/i,                  "/slides/dlbcl.jpg"],
  [/myeloma/i,                              "/slides/myeloma.jpg"],
  [/ground.?glass hepato|hepatitis b|hep.?b/i, "/slides/hep-b.jpg"],
  [/hepatitis/i,                            "/slides/hep-b.jpg"],
  [/hepatocellular|hcc(?!\w)/i,             "/slides/hcc.jpg"],
  [/myocardial infarct|ami(?!\w)/i,         "/slides/ami.jpg"],
  [/atheroscler/i,                          "/slides/atherosclerosis.jpg"],
  [/rheumatic.*heart|heart.*rheumatic/i,    "/slides/rheumatic.jpg"],
  [/glioblastoma|gbm(?!\w)/i,              "/slides/gbm.jpg"],
  [/meningioma/i,                           "/slides/meningioma.jpg"],
  [/papillary thyroid|ptc(?!\w)/i,          "/slides/ptc.jpg"],
  [/phaeochromo|pheochromo/i,               "/slides/phaeochromocytoma.jpg"],
  [/melanoma/i,                             "/slides/melanoma.jpg"],
  [/basal cell|bcc(?!\w)/i,                 "/slides/bcc.jpg"],
  [/squamous cell/i,                        "/slides/scc.jpg"],
  [/cin\s*3|hsil|cervical intraep/i,        "/slides/cin3.jpg"],
  [/endometri/i,                            "/slides/endometrial.jpg"],
  [/hydatidiform mole|gestational tropho/i, "/slides/ovary.jpg"],
  [/osteosarc/i,                            "/slides/osteosarcoma.jpg"],
  [/giant cell.*bone|bone.*giant cell/i,    "/slides/gct-bone.jpg"],
  [/aneurysmal bone|bone cyst/i,            "/slides/osteosarcoma.jpg"],
  [/sarcoma|mesenchymal|spindle cell/i,     "/slides/osteosarcoma.jpg"],
  // ── Breast (generic, after specific) ─────────────────────────────────────
  [/breast/i,                               "/slides/dcis.jpg"],
  // ── Organ-level (broad, last resort) ─────────────────────────────────────
  [/hepato|liver/i,                         "/slides/liver.jpg"],
  [/lung|alveol|pneumon/i,                  "/slides/lung.jpg"],
  [/kidney|renal|glomerul|nephro/i,         "/slides/kidney.jpg"],
  [/colon|colorect|intestin|bowel/i,        "/slides/colon.jpg"],
  [/thyroid/i,                              "/slides/thyroid.jpg"],
  [/lymph node|lymphoma|lymphocyt/i,        "/slides/lymph-node.jpg"],
  [/cardiac|myocard|heart/i,                "/slides/cardiac.jpg"],
  [/spleen/i,                               "/slides/spleen.jpg"],
  [/bone marrow/i,                          "/slides/bone-marrow.jpg"],
  [/skin|dermis|epidermis|cutaneous/i,      "/slides/skin.jpg"],
];

function deriveImageUrl(c: SavedCase): string | null {
  if (c.image_url && c.image_url.length > 0) return c.image_url;
  // Build a rich haystack from all available text: diagnosis, label, source, and JSON fields
  const jsonDx = (c.analysis_json as Record<string, unknown> | null)?.diagnosis ?? "";
  const overview = (c.analysis_json as Record<string, unknown> | null)?.overview ?? "";
  const haystack = [
    c.diagnosis, c.slide_label, c.image_source, bestDiagnosis(c), jsonDx, overview,
  ].filter(Boolean).join(" ").toLowerCase();
  for (const [re, path] of DIAGNOSIS_TO_SLIDE) {
    if (re.test(haystack)) return path;
  }
  return null;
}

const confidenceColors: Record<string, string> = {
  High:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50  text-amber-700  border-amber-200",
  Low:    "bg-red-50    text-red-600    border-red-200",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SavedCases({ user, onAnalyze, onQuiz }: Props) {
  const [activeTab, setActiveTab]   = useState<"analyses" | "slides">("analyses");
  const [cases, setCases]           = useState<SavedCase[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<SavedCase | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    supabase
      .from("slide_history")
      .select("id, diagnosis, slide_label, image_url, image_source, analysis_json, analyzed_at")
      .eq("user_id", user.id)
      .order("analyzed_at", { ascending: false })
      .then(({ data }) => { setCases((data as SavedCase[]) ?? []); setLoading(false); });
  }, [user.id]);

  const handleClearAll = async () => {
    setClearingAll(true);
    await supabase.from("slide_history").delete().eq("user_id", user.id);
    setCases([]);
    setSelected(null);
    setConfirmClear(false);
    setClearingAll(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    await supabase.from("slide_history").delete().eq("id", id).eq("user_id", user.id);
    setCases(prev => prev.filter(c => c.id !== id));
    if (selected?.id === id) setSelected(null);
    setDeleting(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-tab switcher */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("analyses")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === "analyses"
              ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <FolderOpen className="w-4 h-4" />
          Saved Analyses
        </button>
        <button
          onClick={() => setActiveTab("slides")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === "slides"
              ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <ImagePlus className="w-4 h-4" />
          My Slides
        </button>
      </div>

      {/* ── My Slides tab ── */}
      {activeTab === "slides" && onAnalyze && (
        <PersonalSlides user={user} onAnalyze={onAnalyze} />
      )}
      {activeTab === "slides" && !onAnalyze && (
        <div className="text-center py-16 text-slate-400 text-sm">Personal slides unavailable</div>
      )}

      {/* ── Saved Analyses tab ── */}
      {activeTab === "analyses" && loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-1/3" />
              </div>
              <div className="w-20 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {activeTab === "analyses" && !loading && cases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderOpen className="w-14 h-14 text-slate-200 mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">No saved cases yet</h2>
          <p className="text-sm text-slate-400 max-w-xs">
            Analyze a slide and click <span className="font-medium text-slate-600">Save to Flashcards</span> to store it here.
          </p>
        </div>
      )}

      {activeTab === "analyses" && !loading && cases.length > 0 && (<>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Saved Cases</h1>
          <p className="text-slate-500 text-sm mt-1">{cases.length} case{cases.length !== 1 ? "s" : ""} saved</p>
        </div>
        {confirmClear ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-slate-600">Delete all {cases.length} cases?</span>
            <button
              onClick={handleClearAll}
              disabled={clearingAll}
              className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {clearingAll ? "Deleting…" : "Yes, delete all"}
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cases.map(c => {
          const analysis = c.analysis_json as unknown as AnalysisResult | null;
          const confidence = analysis?.confidence ?? "Medium";
          const displayUrl = deriveImageUrl(c);
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="group text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all overflow-hidden"
            >
              {/* Image */}
              <div className="relative h-40 bg-slate-900 overflow-hidden">
                {displayUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayUrl}
                    alt={c.diagnosis}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">No image</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                  <span className={clsx("text-[10px] font-medium px-2 py-0.5 rounded-full border", confidenceColors[confidence])}>
                    {confidence}
                  </span>
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    disabled={deleting === c.id}
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
                    title="Delete case"
                  >
                    {deleting === c.id
                      ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-snug mb-1 line-clamp-2">{bestDiagnosis(c)}</h3>
                {c.slide_label && (
                  <p className="text-xs text-slate-400 mb-2 truncate">{c.slide_label}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {timeAgo(c.analyzed_at)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary-600 font-medium group-hover:gap-2 transition-all">
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail modal */}
      {selected && selected.analysis_json && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-slate-50 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <div className="min-w-0">
                <h2 className="font-bold text-slate-900 dark:text-slate-100 truncate">{bestDiagnosis(selected)}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{timeAgo(selected.analyzed_at)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {onQuiz && (() => {
                  const a = selected.analysis_json as unknown as AnalysisResult | null;
                  if (!a) return null;
                  const slideData: SlideQuizData = {
                    imageUrl:     deriveImageUrl(selected) ?? "",
                    diagnosis:    bestDiagnosis(selected),
                    keyFeatures:  a.keyLearningPoints ?? [],
                    ihcMarkers:   (a.ihcMarkers ?? []).map(m => `${m.marker} (${m.expectedResult})`),
                    stain:        a.stain?.type ?? "H&E",
                    category:     "Pathology",
                    clinicalPearl: a.teachingClose?.pearl ?? a.clinicalCorrelation ?? "",
                  };
                  return (
                    <button
                      onClick={() => { setSelected(null); onQuiz(slideData); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      Quick Quiz
                    </button>
                  );
                })()}
                <button
                  onClick={async () => {
                    const { exportAnalysisPdf } = await import("@/lib/exportPdf");
                    exportAnalysisPdf(
                      selected.analysis_json as unknown as import("@/types/analysis").AnalysisResult,
                      selected.image_url,
                      selected.slide_label,
                      selected.analyzed_at,
                    );
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export PDF
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slide image */}
            {(() => {
              const modalUrl = deriveImageUrl(selected);
              if (!modalUrl) return null;
              return (
                <div className="h-56 bg-slate-900 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={modalUrl} alt={selected.diagnosis} className="w-full h-full object-cover" />
                </div>
              );
            })()}

            {/* Full analysis */}
            <div className="p-4">
              <AnalysisPanel
                analysis={selected.analysis_json as unknown as AnalysisResult}
                activeAnnotation={null}
                onAnnotationSelect={() => {}}
                user={user}
                rawDataUrl={null}
                preloadedImageUrl={selected.image_url}
                slideLabel={selected.slide_label}
                diagnosisContext={null}
              />
            </div>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
