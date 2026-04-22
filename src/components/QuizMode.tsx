"use client";

import { useState } from "react";
import { Brain, CheckCircle, XCircle, RotateCcw, Trophy, ChevronRight, Lightbulb } from "lucide-react";
import { clsx } from "clsx";

const proxy = (url: string) => `/api/proxy-image?url=${encodeURIComponent(url)}`;

interface QuizQuestion {
  id: number;
  imageUrl: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/8/82/Histopathology_of_liver_zones.jpg"),
    question: "What is the most likely tissue seen in this H&E section?",
    options: ["Kidney cortex", "Normal liver parenchyma", "Pancreatic acini", "Adrenal gland"],
    correctIndex: 1,
    explanation: "The slide shows hepatocytes arranged in cords (plates) with central veins and portal tracts — characteristic of normal liver parenchyma. The polygonal cells with central nuclei and pink granular cytoplasm are hallmarks of hepatocytes.",
    category: "Hepatology",
  },
  {
    id: 2,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/f/f8/Micrograph_of_invasive_squamous_cell_carcinoma_-_150x.jpg"),
    question: "The eosinophilic concentric whorls visible here are known as:",
    options: ["Psammoma bodies", "Keratin pearls", "Lewy bodies", "Mallory-Denk bodies"],
    correctIndex: 1,
    explanation: "Keratin (squamous) pearls are concentric whorls of squamous cells undergoing keratinisation, which is a hallmark of well-differentiated squamous cell carcinoma. They help distinguish SCC from other carcinomas.",
    category: "Oncology",
  },
  {
    id: 3,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/5/55/Srifhistology3.jpg"),
    question: "The dense blue staining in this Masson Trichrome slide represents:",
    options: ["Inflammatory cells", "Collagen deposition (fibrosis)", "Mucus secretion", "Haemosiderin deposits"],
    correctIndex: 1,
    explanation: "In Masson Trichrome staining, collagen fibres stain blue/green while muscle stains red. Dense blue areas here indicate extensive fibrosis — a hallmark of Usual Interstitial Pneumonia (UIP) / IPF.",
    category: "Pulmonology",
  },
  {
    id: 4,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/f/f8/Micrograph_of_ductal_carcinoma_with_marked_nuclear_pleomorphism_and_increased_mitotic_rate.jpg"),
    question: "This breast histology shows irregular glands invading stroma. What is the diagnosis?",
    options: ["Fibroadenoma", "Ductal carcinoma in situ (DCIS)", "Invasive ductal carcinoma (IDC)", "Phyllodes tumour"],
    correctIndex: 2,
    explanation: "Invasive ductal carcinoma is characterised by irregular malignant glandular formations invading the surrounding desmoplastic (fibrous) stroma. Unlike DCIS, the basement membrane is breached. IDC is the most common breast malignancy.",
    category: "Oncology",
  },
  {
    id: 5,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/f/fc/Carcinoma_Stomach_10x.jpg"),
    question: "Which cell type is predominantly seen in the gastric mucosa inflammatory infiltrate in chronic gastritis?",
    options: ["Neutrophils", "Eosinophils", "Lymphocytes and plasma cells", "Mast cells"],
    correctIndex: 2,
    explanation: "Chronic gastritis is characterised by a predominantly lymphocytic and plasma cell infiltrate within the lamina propria. Neutrophils indicate active gastritis superimposed on chronic disease. H. pylori infection is the most common cause.",
    category: "Gastroenterology",
  },
  {
    id: 6,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/a/ac/Normal_lung_%283660695207%29.jpg"),
    question: "This normal lung section shows thin-walled air sacs. Which cells produce surfactant to reduce surface tension?",
    options: ["Type I pneumocytes", "Type II pneumocytes", "Clara (club) cells", "Alveolar macrophages"],
    correctIndex: 1,
    explanation: "Type II pneumocytes are cuboidal cells that produce pulmonary surfactant (dipalmitoylphosphatidylcholine), which reduces alveolar surface tension and prevents collapse. They also act as stem cells that regenerate type I cells after injury. Surfactant deficiency in premature infants causes neonatal respiratory distress syndrome.",
    category: "Normal Histology",
  },
  {
    id: 7,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/63/Histology-kidney.jpg"),
    question: "In this normal kidney cortex, the glomerular filtration barrier consists of which three layers?",
    options: [
      "Endothelium, lamina densa, mesangium",
      "Fenestrated endothelium, glomerular basement membrane, podocyte foot processes",
      "Parietal epithelium, Bowman's space, tubular epithelium",
      "Smooth muscle, elastic lamina, endothelium",
    ],
    correctIndex: 1,
    explanation: "The glomerular filtration barrier has three layers: (1) fenestrated capillary endothelium — prevents cells from passing; (2) glomerular basement membrane (GBM) — rich in type IV collagen and heparan sulphate, acting as a size/charge barrier; (3) podocyte foot processes with slit diaphragms — the final filtration checkpoint. Disruption of any layer causes proteinuria or haematuria.",
    category: "Normal Histology",
  },
  {
    id: 8,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/6a/Thyroid_gland_microscope.jpg"),
    question: "The pink homogeneous material filling thyroid follicles is colloid (thyroglobulin). Which IHC marker confirms thyroid follicular origin?",
    options: ["Chromogranin A", "Thyroid Transcription Factor-1 (TTF-1)", "CD138", "Synaptophysin"],
    correctIndex: 1,
    explanation: "TTF-1 (Thyroid Transcription Factor-1) is expressed by follicular cells of the thyroid and by lung pneumocytes. It is a key IHC marker used to confirm thyroid origin in metastatic carcinomas and to identify primary thyroid tumours. Calcitonin and chromogranin A are used for medullary thyroid carcinoma (parafollicular C-cell origin), not follicular origin.",
    category: "IHC",
  },
  {
    id: 9,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/5/55/Cardiac_muscle_305.png"),
    question: "Which unique junction visible in cardiac muscle allows electrical impulses to spread between cells, enabling synchronised contraction?",
    options: ["Tight junctions (zonula occludens)", "Desmosomes", "Gap junctions (connexons) within intercalated discs", "Hemidesmosomes"],
    correctIndex: 2,
    explanation: "Gap junctions (made of connexin proteins) within intercalated discs provide low-resistance electrical pathways between cardiomyocytes, allowing action potentials to spread rapidly and enabling the heart to function as an electrical syncytium. Desmosomes provide mechanical coupling; fascia adherens anchor actin filaments. Loss of connexin-43 is associated with arrhythmias.",
    category: "Normal Histology",
  },
  {
    id: 10,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/f/f8/Micrograph_of_ductal_carcinoma_with_marked_nuclear_pleomorphism_and_increased_mitotic_rate.jpg"),
    question: "Which IHC marker combination is most characteristic of invasive ductal carcinoma of the breast?",
    options: [
      "CK20+, CDX2+, ER−",
      "CK7+, ER+/−, PR+/−, HER2 variable",
      "CD20+, CD3−, PAX5+",
      "TTF-1+, Napsin A+, CK7+",
    ],
    correctIndex: 1,
    explanation: "Breast carcinomas are CK7+ and CK20−. Hormone receptor (ER/PR) positivity predicts response to endocrine therapy (tamoxifen, aromatase inhibitors). HER2 overexpression (by IHC 3+ or FISH amplification) indicates eligibility for trastuzumab. Ki-67 measures proliferative index. Triple-negative breast cancer (ER−, PR−, HER2−) carries the worst prognosis and requires chemotherapy.",
    category: "IHC",
  },
  {
    id: 11,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/d/da/Lymph_node_histology.jpg"),
    question: "In a normal lymph node, germinal centres form in response to antigen. Which B cell process occurs here?",
    options: [
      "V(D)J recombination and initial antibody production",
      "Somatic hypermutation and affinity maturation",
      "Class switching from IgM to IgE only",
      "Negative selection of autoreactive T cells",
    ],
    correctIndex: 1,
    explanation: "Germinal centres are sites of intense B cell activity: somatic hypermutation (introducing random mutations in immunoglobulin variable regions) followed by affinity maturation (positive selection of B cells with higher-affinity antibodies). Class-switch recombination also occurs here (IgM → IgG/A/E). High-grade B cell lymphomas (e.g. diffuse large B cell lymphoma) arise from germinal centre or post-germinal centre B cells.",
    category: "Normal Histology",
  },
  {
    id: 12,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/6a/Crescentic_glomerulonephritis_HE_stain.JPEG"),
    question: "Cellular crescents compressing glomeruli in RPGN are composed of which cells?",
    options: [
      "Proliferating mesangial cells alone",
      "Parietal epithelial cells and infiltrating monocytes/macrophages",
      "Fibrocytes from interstitial scarring",
      "Neutrophils in acute inflammation",
    ],
    correctIndex: 1,
    explanation: "Crescents form when parietal epithelial cells (lining Bowman's capsule) rapidly proliferate and are joined by infiltrating monocytes/macrophages, filling Bowman's space in response to glomerular injury and fibrin leakage. This is the hallmark of rapidly progressive glomerulonephritis (RPGN), caused by anti-GBM antibodies (Goodpasture's), ANCA-associated vasculitis, or immune complex deposition. Untreated, it leads to end-stage renal failure within weeks.",
    category: "Nephrology",
  },
  {
    id: 13,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/3/37/Pulmonary_tuberculosis_-_Necrotizing_granuloma_%286545185917%29.jpg"),
    question: "This H&E section shows a granuloma with central pink amorphous material. What is this necrosis pattern called and what disease does it suggest?",
    options: [
      "Liquefactive necrosis — brain abscess",
      "Caseous necrosis — Mycobacterium tuberculosis infection",
      "Coagulative necrosis — myocardial infarction",
      "Fat necrosis — acute pancreatitis",
    ],
    correctIndex: 1,
    explanation: "Caseous necrosis appears as structureless pink ('cheese-like') material in the centre of a granuloma. It is the hallmark of TB and distinguishes it from sarcoidosis (non-caseating granulomas). The granuloma consists of epithelioid histiocytes, Langhans giant cells (horseshoe-shaped nuclei), and a peripheral lymphocytic cuff. In Africa, TB remains the leading infectious cause of death and the most common cause of caseating granulomas encountered in pathology.",
    category: "Infectious Disease",
  },
  {
    id: 14,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/9/98/Mycobacterium_tuberculosis_Ziehl-Neelsen_stain.jpg"),
    question: "In this Ziehl-Neelsen stained smear, the red-staining bacilli are described as 'acid-fast'. Why do mycobacteria retain the red dye?",
    options: [
      "They have a thick peptidoglycan wall that traps crystal violet",
      "Their high mycolic acid content in the cell wall resists decolourisation with acid-alcohol",
      "They produce a red pigment (pyocyanin) under aerobic conditions",
      "Their capsule prevents dye penetration",
    ],
    correctIndex: 1,
    explanation: "Mycobacteria have an unusually thick, waxy cell wall rich in mycolic acids. When stained with carbol fuchsin (red dye) and heated (Ziehl-Neelsen) or treated with phenol (Kinyoun), the mycolic acids bind the dye tightly. Acid-alcohol — used to decolourise — cannot penetrate this waxy wall, so mycobacteria retain the red colour (acid-fast). This is clinically critical: a positive ZN smear or GeneXpert result is often the first confirmation of TB, especially in Africa where TB is epidemic.",
    category: "Infectious Disease",
  },
  {
    id: 15,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/3/33/Hodgkin_Disease,_Reed-Sternberg_Cell.jpg"),
    question: "The large binucleated cell with prominent 'owl-eye' nucleoli seen here is pathognomonic of:",
    options: [
      "Burkitt lymphoma — starry-sky pattern",
      "Reed-Sternberg cell — Classical Hodgkin Lymphoma",
      "Flame cell — Multiple myeloma",
      "Aschoff body — Rheumatic fever",
    ],
    correctIndex: 1,
    explanation: "Reed-Sternberg (RS) cells are large binucleated or multinucleated cells with prominent inclusion-like 'owl-eye' nucleoli — the pathognomonic feature of Classical Hodgkin Lymphoma. They are malignant B cells that have aberrantly activated NF-κB. RS cells are CD15+ and CD30+ (negative for CD20, unlike most B cell lymphomas). The diagnosis requires RS cells in the appropriate reactive background (lymphocytes, eosinophils, plasma cells). Hodgkin lymphoma is one of the most curable cancers with ABVD chemotherapy.",
    category: "Haematology",
  },
  {
    id: 16,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/2/22/Ground_glass_hepatocytes_high_mag_2.jpg"),
    question: "Hepatocytes with pale finely granular 'ground glass' cytoplasm on H&E are caused by accumulation of:",
    options: [
      "Glycogen in type II glycogen storage disease",
      "HBsAg (Hepatitis B surface antigen) in smooth ER",
      "Alpha-1 antitrypsin globules",
      "Iron deposits in haemochromatosis",
    ],
    correctIndex: 1,
    explanation: "Ground glass hepatocytes are a hallmark of chronic Hepatitis B infection. The smooth endoplasmic reticulum expands massively with accumulated HBsAg (Hepatitis B surface antigen), creating the characteristic pale granular appearance. Confirmed by Orcein or Shikata stain (positive), or IHC for HBsAg. Chronic HBV is the leading cause of hepatocellular carcinoma worldwide, and is highly prevalent in sub-Saharan Africa due to high rates of perinatal transmission.",
    category: "Hepatology",
  },
  {
    id: 17,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/a/a1/Histopathology_of_clear_cell_renal_cell_carcinoma,_grade_1,_high_magnification.jpg"),
    question: "The optically clear cytoplasm in these tumour cells is caused by:",
    options: [
      "Mucin accumulation (PAS positive)",
      "Lipid and glycogen dissolved during tissue processing",
      "Viral inclusion bodies",
      "Amyloid deposition",
    ],
    correctIndex: 1,
    explanation: "In clear cell RCC (the most common renal cancer, ~75% of cases), tumour cells accumulate large amounts of lipid and glycogen. During routine tissue processing with organic solvents (xylene), these are dissolved, leaving optically clear cytoplasm. The cells are arranged in nests with a characteristic thin sinusoidal vasculature. ~90% of ccRCC have a VHL gene mutation (chromosome 3p deletion), leading to HIF upregulation, VEGF overproduction, and angiogenesis — the basis for anti-VEGF therapy (sunitinib, sorafenib).",
    category: "Nephrology",
  },
  {
    id: 18,
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/1/18/Adenocarcinoma_of_the_colon-histology.JPG"),
    question: "This colorectal carcinoma shows 'dirty necrosis' in the gland lumens. What does this finding indicate?",
    options: [
      "It confirms the tumour is low-grade",
      "Luminal necrotic debris — a feature that distinguishes colorectal adenocarcinoma from other GI tumours",
      "Evidence of viral cytopathic effect",
      "Normal goblet cell secretion",
    ],
    correctIndex: 1,
    explanation: "Dirty (luminal) necrosis — necrotic cell debris, mucin, and inflammatory cells within gland lumens — is a characteristic feature of colorectal adenocarcinoma that helps distinguish it from other glandular tumours (e.g. pancreatic or endometrial carcinoma). Combined with CK20+/CDX2+ IHC, it confirms colorectal origin. Risk factors include age, red meat consumption, IBD, Lynch syndrome (MMR deficiency), and adenoma-carcinoma sequence. The Wnt/β-catenin pathway (APC mutation) is the key molecular driver.",
    category: "Gastroenterology",
  },
];

type QuizState = "intro" | "answering" | "result" | "review";

export default function QuizMode() {
  const [quizState, setQuizState] = useState<QuizState>("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ_QUESTIONS.length).fill(null));
  const [showExplanation, setShowExplanation] = useState(false);

  const current = QUIZ_QUESTIONS[currentIdx];
  const isAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === current?.correctIndex;
  const score = answers.filter((a, i) => a === QUIZ_QUESTIONS[i].correctIndex).length;

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(idx);
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIdx + 1 < QUIZ_QUESTIONS.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizState("result");
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setAnswers(Array(QUIZ_QUESTIONS.length).fill(null));
    setShowExplanation(false);
    setQuizState("answering");
  };

  // ── Intro ─────────────────────────────────────────────────────────────
  if (quizState === "intro") {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-primary-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Quiz Mode</h1>
        <p className="text-slate-500 mb-2">
          Test your histopathology skills — from normal tissue recognition to IHC markers and pathology.
        </p>
        <p className="text-slate-400 text-sm mb-8">
          {QUIZ_QUESTIONS.length} questions · Multiple choice · Detailed explanations
        </p>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Questions", value: QUIZ_QUESTIONS.length },
            { label: "Topics", value: new Set(QUIZ_QUESTIONS.map((q) => q.category)).size },
            { label: "Difficulty", value: "Mixed" },
          ].map(({ label, value }) => (
            <div key={label} className="card text-center">
              <p className="text-2xl font-bold text-primary-600">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Topic breakdown */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {Array.from(new Set(QUIZ_QUESTIONS.map((q) => q.category))).map((cat) => (
            <span key={cat} className="text-xs px-3 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-medium">
              {cat}
            </span>
          ))}
        </div>

        <button onClick={() => setQuizState("answering")} className="btn-primary text-base px-8 py-3">
          Start Quiz
        </button>
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────
  if (quizState === "result") {
    const pct = Math.round((score / QUIZ_QUESTIONS.length) * 100);
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-1">Quiz Complete!</h2>
        <p className="text-slate-500 mb-6">Here&apos;s how you did</p>

        <div className="card mb-6">
          <div className="text-5xl font-bold text-primary-600 mb-1">{pct}%</div>
          <p className="text-slate-500 text-sm">{score} / {QUIZ_QUESTIONS.length} correct</p>

          <div className="w-full bg-slate-100 rounded-full h-2 mt-4">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {pct >= 80 ? "🎉 Excellent work! Strong histopathology foundation." :
             pct >= 60 ? "👍 Good effort! Review the explanations to strengthen weak areas." :
             "📚 Keep studying! Use the slide analyzer to explore each case deeper."}
          </p>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-2 mb-8 text-left">
          {QUIZ_QUESTIONS.map((q, i) => {
            const correct = answers[i] === q.correctIndex;
            return (
              <div key={q.id} className={clsx("flex items-start gap-3 p-3 rounded-xl border text-sm",
                correct ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
              )}>
                {correct
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="font-medium text-slate-800">{q.question}</p>
                  {!correct && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your answer: <span className="text-red-600">{q.options[answers[i] ?? 0]}</span>
                      {" · "}Correct: <span className="text-emerald-600">{q.options[q.correctIndex]}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={handleRestart} className="btn-secondary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Answering ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Question {currentIdx + 1} of {QUIZ_QUESTIONS.length}</span>
        <span className="badge bg-primary-50 text-primary-700">{current.category}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-primary-500 transition-all duration-300"
          style={{ width: `${((currentIdx) / QUIZ_QUESTIONS.length) * 100}%` }}
        />
      </div>

      {/* Slide image */}
      <div className="rounded-2xl overflow-hidden bg-slate-900 max-h-72">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.imageUrl}
          alt="Quiz slide"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className="w-full h-72 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/800x300/0f172a/38bdf8?text=Slide+Image";
          }}
        />
      </div>

      {/* Question */}
      <div className="card">
        <p className="text-base font-semibold text-slate-900 mb-5">{current.question}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {current.options.map((opt, i) => {
            let style = "border-slate-200 hover:border-primary-300 hover:bg-primary-50 text-slate-700";
            if (isAnswered) {
              if (i === current.correctIndex) style = "border-emerald-400 bg-emerald-50 text-emerald-800";
              else if (i === selectedAnswer) style = "border-red-400 bg-red-50 text-red-700";
              else style = "border-slate-100 text-slate-400 opacity-60";
            }
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={isAnswered}
                className={clsx(
                  "flex items-center gap-3 p-3.5 rounded-xl border-2 text-left text-sm font-medium transition-all duration-150",
                  style
                )}
              >
                <span className={clsx(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0",
                  isAnswered && i === current.correctIndex ? "border-emerald-500 text-emerald-600" :
                  isAnswered && i === selectedAnswer ? "border-red-400 text-red-500" :
                  "border-slate-300 text-slate-500"
                )}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
                {isAnswered && i === current.correctIndex && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
                )}
                {isAnswered && i === selectedAnswer && i !== current.correctIndex && (
                  <XCircle className="w-4 h-4 text-red-400 ml-auto" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={clsx(
            "mt-5 p-4 rounded-xl border text-sm",
            isCorrect ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
          )}>
            <div className="flex items-center gap-2 mb-2 font-semibold text-slate-800">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              {isCorrect ? "Correct! Here's why:" : "Not quite — here's the explanation:"}
            </div>
            <p className="text-slate-700 leading-relaxed">{current.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {isAnswered && (
          <button onClick={handleNext} className="btn-primary mt-5 flex items-center gap-2 ml-auto">
            {currentIdx + 1 < QUIZ_QUESTIONS.length ? (
              <><ChevronRight className="w-4 h-4" /> Next Question</>
            ) : (
              <><Trophy className="w-4 h-4" /> See Results</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
