/**
 * Generates MCQ quiz questions from a user's personal analysed slide.
 * Uses the diagnosis, key features, IHC markers and stain already extracted
 * by the AI — no extra API calls required.
 */

export interface SlideQuizData {
  imageUrl: string;
  diagnosis: string;
  keyFeatures: string[];
  ihcMarkers: string[];
  stain: string;
  category: string;
  clinicalPearl: string;
}

export interface GeneratedQuestion {
  id: number;
  imageUrl: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}

// ── Distractor pools ──────────────────────────────────────────────────────────

const DIAGNOSIS_POOL = [
  "Normal Liver Histology",
  "Normal Lung — Alveoli",
  "Normal Kidney Cortex",
  "Normal Skin Histology",
  "Normal Large Intestine (Colon)",
  "Normal Thyroid Gland",
  "Normal Lymph Node",
  "Normal Cardiac Muscle",
  "Normal Spleen",
  "Invasive Squamous Cell Carcinoma",
  "Chronic Active Gastritis",
  "Usual Interstitial Pneumonia (UIP / IPF)",
  "Crescentic Glomerulonephritis (RPGN)",
  "Invasive Ductal Carcinoma — Breast",
  "Pulmonary Tuberculosis — Caseating Granuloma",
  "Classical Hodgkin Lymphoma",
  "Clear Cell Renal Cell Carcinoma",
  "Chronic Hepatitis B — Ground Glass Hepatocytes",
  "Colorectal Adenocarcinoma",
  "Follicular Lymphoma",
  "Hepatocellular Carcinoma",
  "Sarcoidosis — Non-caseating Granuloma",
  "Diffuse Large B Cell Lymphoma",
  "Acute Myeloid Leukaemia (AML)",
  "Acute Lymphoblastic Leukaemia (ALL)",
  "Chronic Myeloid Leukaemia (CML)",
  "Chronic Lymphocytic Leukaemia (CLL)",
  "Meningioma",
  "Glioblastoma",
  "Papillary Thyroid Carcinoma",
  "Medullary Thyroid Carcinoma",
  "Fibroadenoma",
  "Phyllodes Tumour",
  "Lung Adenocarcinoma",
];

const IHC_POOL = [
  "CK7", "CK20", "CK5/6", "CDX2", "TTF-1", "Napsin A",
  "HepPar-1", "Arginase-1", "AFP", "p63", "p40",
  "CD20", "CD3", "CD5", "CD10", "CD30", "CD15", "CD68",
  "ER", "PR", "HER2", "Ki-67", "S100", "Melan-A", "HMB-45",
  "PAX8", "WT1", "Synaptophysin", "Chromogranin A", "CD56",
  "Calretinin", "WT1", "Vimentin", "Desmin", "SMA",
  "CA-IX", "RCC antigen", "BCL2", "BCL6", "MUM1", "PAX5",
  "Thyroglobulin", "Calcitonin", "GATA3", "TRPS1",
];

const STAIN_POOL = [
  "H&E",
  "Masson Trichrome",
  "Ziehl-Neelsen (ZN)",
  "PAS (Periodic Acid-Schiff)",
  "Congo Red",
  "Orcein / Shikata",
  "Alcian Blue",
  "Reticulin",
  "Prussian Blue",
  "Gomori Methenamine Silver (GMS)",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(correct: string, pool: string[], n: number): string[] {
  return shuffleArr(
    pool.filter(d => d.trim().toLowerCase() !== correct.trim().toLowerCase())
  ).slice(0, n);
}

function buildOptions(
  correct: string,
  distractors: string[]
): { options: string[]; correctIndex: number } {
  const all = shuffleArr([correct, ...distractors.slice(0, 3)]);
  return { options: all, correctIndex: all.indexOf(correct) };
}

function trimLabel(s: string, max = 90): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateQuestionsFromSlide(
  data: SlideQuizData
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  const BASE = 9000; // avoids collision with built-in bank IDs

  // ── Q1: Diagnosis ─────────────────────────────────────────────────────
  {
    const distractors = pickDistractors(data.diagnosis, DIAGNOSIS_POOL, 3);
    if (distractors.length >= 3) {
      const { options, correctIndex } = buildOptions(data.diagnosis, distractors);
      const featureHint = data.keyFeatures.slice(0, 2).join("; ");
      questions.push({
        id: BASE + 1,
        imageUrl: data.imageUrl,
        question:
          "Based on the histological features visible in this section, what is the most likely diagnosis?",
        options,
        correctIndex,
        explanation: data.clinicalPearl
          ? `The diagnosis is ${data.diagnosis}. ${data.clinicalPearl}`
          : `The diagnosis is ${data.diagnosis}. Key features include: ${featureHint}.`,
        category: data.category,
      });
    }
  }

  // ── Q2: Key histological feature ──────────────────────────────────────
  if (data.keyFeatures.length >= 2) {
    const correct = trimLabel(data.keyFeatures[0]);
    const genericWrong = [
      "Psammoma bodies arranged in concentric lamellae",
      "Hobnail cells lining papillary structures",
      "Goblet cell metaplasia with submucosal mucin pooling",
      "Reed-Sternberg cells with prominent owl-eye nucleoli",
      "Foamy macrophages with lipid-laden cytoplasm",
      "Signet-ring cells with eccentric nuclei",
    ];
    const wrongPool = [...data.keyFeatures.slice(1), ...genericWrong]
      .map(f => trimLabel(f))
      .filter(f => f !== correct);

    const distractors = pickDistractors(correct, wrongPool, 3);
    if (distractors.length >= 2) {
      const { options, correctIndex } = buildOptions(correct, distractors);
      questions.push({
        id: BASE + 2,
        imageUrl: data.imageUrl,
        question: `Which of the following is a defining histological feature of ${data.diagnosis}?`,
        options,
        correctIndex,
        explanation: `${data.keyFeatures[0]}. ${data.keyFeatures.slice(1, 3).join("; ")}.`,
        category: data.category,
      });
    }
  }

  // ── Q3: IHC marker ────────────────────────────────────────────────────
  if (data.ihcMarkers.length > 0) {
    // Extract just the marker name (before space / parenthesis)
    const rawMarker = data.ihcMarkers[0];
    const correctMarker = rawMarker.split(/[\s(]/)[0].trim();
    const distractors = pickDistractors(correctMarker, IHC_POOL, 3);
    if (distractors.length >= 3) {
      const { options, correctIndex } = buildOptions(correctMarker, distractors);
      questions.push({
        id: BASE + 3,
        imageUrl: data.imageUrl,
        question: `Which IHC marker would you order to help confirm the diagnosis of ${data.diagnosis}?`,
        options,
        correctIndex,
        explanation: `${rawMarker} is a key IHC marker for ${data.diagnosis}. Full panel: ${data.ihcMarkers.slice(0, 4).join(", ")}.`,
        category: data.category,
      });
    }
  }

  // ── Q4: Stain identification ──────────────────────────────────────────
  {
    const stainLabel = data.stain || "H&E";
    const distractors = pickDistractors(stainLabel, STAIN_POOL, 3);
    if (distractors.length >= 3) {
      const { options, correctIndex } = buildOptions(stainLabel, distractors);
      const stainNote =
        stainLabel === "H&E"
          ? "H&E is the standard histopathology stain — haematoxylin stains nuclei blue/purple; eosin stains cytoplasm pink."
          : stainLabel.includes("Trichrome")
          ? "Masson Trichrome stains collagen blue/green and muscle red — used to highlight fibrosis."
          : stainLabel.includes("Ziehl") || stainLabel.includes("ZN")
          ? "ZN stain uses carbol fuchsin to stain acid-fast mycobacteria red against a blue background."
          : `${stainLabel} is used to highlight specific tissue components relevant to this diagnosis.`;
      questions.push({
        id: BASE + 4,
        imageUrl: data.imageUrl,
        question: "What stain was used to prepare this histological section?",
        options,
        correctIndex,
        explanation: `This section is stained with ${stainLabel}. ${stainNote}`,
        category: data.category,
      });
    }
  }

  return questions;
}
