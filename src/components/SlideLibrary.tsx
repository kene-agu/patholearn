"use client";

import { useState } from "react";
import { Search, BookOpen, ArrowRight, FlaskConical, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

interface Slide {
  id: string;
  title: string;
  category: string;
  stain: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  type: "Normal Histology" | "Pathology";
  imageUrl: string;    // direct URL — fast display in grid
  analyzeUrl: string;  // proxied URL — used when fetching blob for AI analysis
  description: string;
  diagnosisHint: string;
}

const wiki = (path: string) => `https://upload.wikimedia.org/wikipedia/commons/${path}`;
const proxy = (url: string) => `/api/proxy-image?url=${encodeURIComponent(url)}`;

// ── Pathology slides ─────────────────────────────────────────────────────────
const PATHOLOGY_SLIDES: Slide[] = [
  {
    id: "p1",
    title: "Normal Liver Histology",
    category: "Hepatology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl: wiki("8/82/Histopathology_of_liver_zones.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/8/82/Histopathology_of_liver_zones.jpg"),
    description: "Normal hepatic parenchyma with portal tracts and central veins.",
    diagnosisHint: "Normal Liver Histology — hepatocytes in cords, portal tracts, central veins, sinusoids",
  },
  {
    id: "p2",
    title: "Squamous Cell Carcinoma",
    category: "Oncology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl: wiki("f/f8/Micrograph_of_invasive_squamous_cell_carcinoma_-_150x.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/f/f8/Micrograph_of_invasive_squamous_cell_carcinoma_-_150x.jpg"),
    description: "Invasive squamous cell carcinoma with keratin pearl formation.",
    diagnosisHint: "Invasive Squamous Cell Carcinoma — keratin pearls, nuclear atypia, stromal invasion, desmoplastic reaction",
  },
  {
    id: "p3",
    title: "Chronic Gastritis",
    category: "Gastroenterology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl: wiki("f/fc/Carcinoma_Stomach_10x.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/f/fc/Carcinoma_Stomach_10x.jpg"),
    description: "Gastric mucosa showing chronic inflammatory infiltrate.",
    diagnosisHint: "Chronic Gastritis — lymphoplasmacytic infiltrate in lamina propria, gastric mucosal changes, H. pylori association",
  },
  {
    id: "p4",
    title: "Crescentic Glomerulonephritis",
    category: "Nephrology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl: wiki("6/6a/Crescentic_glomerulonephritis_HE_stain.JPEG"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/6a/Crescentic_glomerulonephritis_HE_stain.JPEG"),
    description: "Glomeruli with cellular crescents indicating rapidly progressive GN.",
    diagnosisHint: "Crescentic Glomerulonephritis (RPGN) — cellular crescents in Bowman's space, parietal epithelial cell proliferation, glomerular compression",
  },
  {
    id: "p5",
    title: "Invasive Ductal Carcinoma",
    category: "Oncology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl: wiki("f/f8/Micrograph_of_ductal_carcinoma_with_marked_nuclear_pleomorphism_and_increased_mitotic_rate.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/f/f8/Micrograph_of_ductal_carcinoma_with_marked_nuclear_pleomorphism_and_increased_mitotic_rate.jpg"),
    description: "Breast invasive ductal carcinoma with desmoplastic stroma.",
    diagnosisHint: "Invasive Ductal Carcinoma of the Breast — malignant glands invading stroma, nuclear pleomorphism, mitotic figures, desmoplastic reaction",
  },
  {
    id: "p6",
    title: "Pulmonary Fibrosis (UIP/IPF)",
    category: "Pulmonology", stain: "Masson Trichrome", difficulty: "Advanced", type: "Pathology",
    imageUrl: wiki("5/55/Srifhistology3.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/5/55/Srifhistology3.jpg"),
    description: "Dense collagen deposition replacing normal lung parenchyma (UIP/IPF pattern).",
    diagnosisHint: "Usual Interstitial Pneumonia (UIP) / Idiopathic Pulmonary Fibrosis — dense collagen (blue on Masson Trichrome), temporal heterogeneity, fibroblastic foci, honeycombing",
  },
  {
    id: "p7",
    title: "Pulmonary Tuberculosis — Granuloma",
    category: "Infectious Disease", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl: wiki("3/37/Pulmonary_tuberculosis_-_Necrotizing_granuloma_%286545185917%29.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/3/37/Pulmonary_tuberculosis_-_Necrotizing_granuloma_%286545185917%29.jpg"),
    description: "Necrotising granuloma with central caseous necrosis and epithelioid histiocytes.",
    diagnosisHint: "Pulmonary Tuberculosis — caseating granuloma with central caseous necrosis, epithelioid histiocytes, Langhans giant cells, lymphocytic cuff",
  },
  {
    id: "p8",
    title: "TB — Ziehl-Neelsen Stain",
    category: "Infectious Disease", stain: "ZN", difficulty: "Intermediate", type: "Pathology",
    imageUrl: wiki("9/98/Mycobacterium_tuberculosis_Ziehl-Neelsen_stain.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/9/98/Mycobacterium_tuberculosis_Ziehl-Neelsen_stain.jpg"),
    description: "Acid-fast bacilli (red rods) against blue background — hallmark of M. tuberculosis.",
    diagnosisHint: "Mycobacterium tuberculosis — Ziehl-Neelsen stain showing red acid-fast bacilli (AFB) against blue counterstain. Slender beaded red rods confirm mycobacterial infection.",
  },
  {
    id: "p9",
    title: "Hodgkin Lymphoma",
    category: "Haematology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl: wiki("3/33/Hodgkin_Disease,_Reed-Sternberg_Cell.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/3/33/Hodgkin_Disease,_Reed-Sternberg_Cell.jpg"),
    description: "Classic Reed-Sternberg cells with owl-eye nucleoli in a mixed inflammatory background.",
    diagnosisHint: "Classical Hodgkin Lymphoma — Reed-Sternberg cells (large binucleated cells with prominent owl-eye nucleoli, CD15+, CD30+) in a background of lymphocytes, eosinophils, plasma cells, and neutrophils",
  },
  {
    id: "p11",
    title: "Clear Cell Renal Cell Carcinoma",
    category: "Nephrology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl: wiki("a/a1/Histopathology_of_clear_cell_renal_cell_carcinoma,_grade_1,_high_magnification.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/a/a1/Histopathology_of_clear_cell_renal_cell_carcinoma,_grade_1,_high_magnification.jpg"),
    description: "Nests of tumour cells with clear cytoplasm (lipid/glycogen washed out) and delicate vasculature.",
    diagnosisHint: "Clear Cell Renal Cell Carcinoma (ccRCC) — nests and sheets of tumour cells with optically clear or pale cytoplasm (lipid/glycogen), small round nuclei (grade 1), thin-walled sinusoidal vasculature, VHL mutation-driven",
  },
  {
    id: "p12",
    title: "Hepatitis B — Ground Glass Hepatocytes",
    category: "Hepatology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl: wiki("2/22/Ground_glass_hepatocytes_high_mag_2.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/2/22/Ground_glass_hepatocytes_high_mag_2.jpg"),
    description: "Hepatocytes with finely granular 'ground glass' cytoplasm packed with HBsAg.",
    diagnosisHint: "Chronic Hepatitis B — ground glass hepatocytes with pale finely granular eosinophilic cytoplasm (HBsAg accumulation in smooth ER), portal inflammation, interface hepatitis, possible bridging fibrosis",
  },
  {
    id: "p13",
    title: "Colorectal Adenocarcinoma",
    category: "Gastroenterology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl: wiki("1/18/Adenocarcinoma_of_the_colon-histology.JPG"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/1/18/Adenocarcinoma_of_the_colon-histology.JPG"),
    description: "Malignant glandular structures invading the colonic wall with desmoplastic stroma.",
    diagnosisHint: "Colorectal Adenocarcinoma — irregular malignant glands with nuclear stratification, prominent nucleoli, loss of polarity, necrotic luminal debris (dirty necrosis), invasive growth through muscularis propria",
  },
];

// ── Normal histology slides ──────────────────────────────────────────────────
const NORMAL_SLIDES: Slide[] = [
  {
    id: "n1",
    title: "Normal Lung (Alveoli)",
    category: "Pulmonology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl: wiki("a/ac/Normal_lung_%283660695207%29.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/a/ac/Normal_lung_%283660695207%29.jpg"),
    description: "Normal alveolar architecture with thin walls and type I/II pneumocytes.",
    diagnosisHint: "Normal Lung Histology — alveoli with thin walls, type I pneumocytes (flat), type II pneumocytes (cuboidal, surfactant-producing), alveolar macrophages",
  },
  {
    id: "n2",
    title: "Normal Kidney (Cortex)",
    category: "Nephrology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl: wiki("6/63/Histology-kidney.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/63/Histology-kidney.jpg"),
    description: "Normal renal cortex with glomeruli, Bowman's capsule, and tubular profiles.",
    diagnosisHint: "Normal Kidney Cortex — glomeruli with Bowman's capsule, proximal convoluted tubules (brush border), distal convoluted tubules, no pathological changes",
  },
  {
    id: "n3",
    title: "Normal Skin",
    category: "Dermatology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl: wiki("b/b4/Normal_Epidermis_and_Dermis_with_Intradermal_Nevus_10x.JPG"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/b/b4/Normal_Epidermis_and_Dermis_with_Intradermal_Nevus_10x.JPG"),
    description: "Normal skin showing epidermis layers, dermis, and adnexal structures.",
    diagnosisHint: "Normal Skin Histology — stratified squamous epithelium (stratum basale, spinosum, granulosum, corneum), papillary and reticular dermis, no dysplasia or invasion",
  },
  {
    id: "n4",
    title: "Normal Large Intestine",
    category: "Gastroenterology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl: wiki("d/de/Large_intestine_histology.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/d/de/Large_intestine_histology.jpg"),
    description: "Normal colonic mucosa with straight crypts, goblet cells, and muscularis mucosae.",
    diagnosisHint: "Normal Large Intestine (Colon) Histology — straight parallel crypts, abundant goblet cells, no inflammatory infiltrate beyond normal, muscularis mucosae intact",
  },
  {
    id: "n5",
    title: "Normal Thyroid Gland",
    category: "Endocrinology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl: wiki("6/6a/Thyroid_gland_microscope.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/6a/Thyroid_gland_microscope.jpg"),
    description: "Normal thyroid follicles filled with colloid, lined by cuboidal follicular cells.",
    diagnosisHint: "Normal Thyroid Histology — follicles of varying size filled with eosinophilic colloid, lined by cuboidal follicular cells, parafollicular C cells, no capsular invasion or nuclear atypia",
  },
  {
    id: "n6",
    title: "Normal Lymph Node",
    category: "Haematology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl: wiki("d/da/Lymph_node_histology.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/d/da/Lymph_node_histology.jpg"),
    description: "Normal lymph node architecture with cortex, germinal centres, and medullary sinuses.",
    diagnosisHint: "Normal Lymph Node — intact capsule, cortex with primary/secondary follicles and germinal centres, paracortex (T cell zone), medullary sinuses, no effacement of architecture",
  },
  {
    id: "n7",
    title: "Cardiac Muscle",
    category: "Cardiology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl: wiki("5/55/Cardiac_muscle_305.png"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/5/55/Cardiac_muscle_305.png"),
    description: "Normal cardiac myocytes with cross-striations and intercalated discs.",
    diagnosisHint: "Normal Cardiac Muscle — branching striated fibres with central nuclei, intercalated discs (step-like junctions between cells), no necrosis or inflammatory infiltrate",
  },
  {
    id: "n8",
    title: "Normal Spleen",
    category: "Haematology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl: wiki("6/60/Histology_of_Spleen.jpg"),
    analyzeUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/60/Histology_of_Spleen.jpg"),
    description: "Normal spleen showing white pulp (lymphoid follicles) and red pulp (sinusoids).",
    diagnosisHint: "Normal Spleen Histology — white pulp (periarteriolar lymphoid sheaths and follicles) and red pulp (venous sinusoids and splenic cords of Billroth), trabecular arteries",
  },
];

const ALL_SLIDES = [...NORMAL_SLIDES, ...PATHOLOGY_SLIDES];

const CATEGORIES  = ["All", ...Array.from(new Set(ALL_SLIDES.map((s) => s.category))).sort()];
const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];

const difficultyColors: Record<string, string> = {
  Beginner:     "bg-emerald-50 text-emerald-700",
  Intermediate: "bg-amber-50 text-amber-700",
  Advanced:     "bg-red-50 text-red-700",
};

const typeColors: Record<string, string> = {
  "Normal Histology": "bg-sky-50 text-sky-700",
  "Pathology":        "bg-rose-50 text-rose-700",
};

interface SlideLibraryProps {
  onSelect: (imageUrl: string, diagnosisHint: string) => void;
}

export default function SlideLibrary({ onSelect }: SlideLibraryProps) {
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [slideType, setSlideType] = useState("All");

  const filtered = ALL_SLIDES.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    const matchCat  = category === "All" || s.category === category;
    const matchDiff = difficulty === "All" || s.difficulty === difficulty;
    const matchType = slideType === "All" || s.type === slideType;
    return matchSearch && matchCat && matchDiff && matchType;
  });

  const normalCount    = ALL_SLIDES.filter((s) => s.type === "Normal Histology").length;
  const pathologyCount = ALL_SLIDES.filter((s) => s.type === "Pathology").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Slide Library</h1>
          <p className="text-sm text-slate-500">Browse curated histopathology cases — click any slide to analyze</p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All Slides",        count: ALL_SLIDES.length, value: "All",              activeClass: "bg-slate-800 text-white border-slate-800" },
          { label: "Normal Histology",  count: normalCount,        value: "Normal Histology", activeClass: "bg-sky-600 text-white border-sky-600" },
          { label: "Pathology",         count: pathologyCount,     value: "Pathology",        activeClass: "bg-rose-600 text-white border-rose-600" },
        ].map(({ label, count, value, activeClass }) => (
          <button
            key={value}
            onClick={() => setSlideType(value)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150",
              slideType === value
                ? activeClass
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {label}
            <span className={clsx(
              "text-xs font-bold px-1.5 py-0.5 rounded-full",
              slideType === value ? "bg-white/20" : "bg-slate-100 text-slate-500"
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search slides…"
            className="input pl-9"
          />
        </div>
        <select value={category}   onChange={(e) => setCategory(e.target.value)}   className="input w-auto">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input w-auto">
          {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No slides match your filters.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400 font-medium">
            Showing {filtered.length} of {ALL_SLIDES.length} slides
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((slide) => (
              <div
                key={slide.id}
                className="card p-0 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onSelect(slide.analyzeUrl, slide.diagnosisHint)}
              >
                {/* Thumbnail */}
                <div className="relative h-44 bg-slate-900 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/400x200/0f172a/38bdf8?text=Slide";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap">
                    <span className="badge bg-black/40 text-white text-[10px]">{slide.stain}</span>
                    <span className={clsx("badge text-[10px]", difficultyColors[slide.difficulty])}>
                      {slide.difficulty}
                    </span>
                    <span className={clsx("badge text-[10px]", typeColors[slide.type])}>
                      {slide.type === "Normal Histology" ? "Normal" : "Pathology"}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{slide.title}</h3>
                      <p className="text-xs text-primary-600 font-medium mt-0.5">{slide.category}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 flex-shrink-0 mt-0.5 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{slide.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Hint note */}
          <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
            <p>Click any slide to open it in the AI Analyzer for a full diagnosis, IHC markers, pathogenesis walkthrough, and follow-up questions.</p>
          </div>
        </>
      )}
    </div>
  );
}
