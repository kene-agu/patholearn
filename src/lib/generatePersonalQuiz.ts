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

// ── Clinical case vignettes ───────────────────────────────────────────────────
// Each entry pairs diagnosis keywords with a short clinical case presentation
// (demographics + symptoms + investigations + biopsy context) so that generated
// questions read like the case-based MCQs in the built-in question bank rather
// than dry "what is the diagnosis?" stems.
//
// Matching is case-insensitive substring against the diagnosis string returned
// by the AI; the FIRST matching entry wins, so order more-specific keys first.

interface CaseVignette {
  keywords: string[];
  stem: string;
}

const CASE_VIGNETTES: CaseVignette[] = [
  // ── Malignancies ─────────────────────────────────────────────────────────
  {
    keywords: ["invasive ductal carcinoma", "idc"],
    stem: "A 49-year-old woman presents with a firm, irregular 2.8 cm lump in her right breast, with overlying skin dimpling and a palpable axillary lymph node. Mammography shows a spiculated mass. A core needle biopsy is obtained, shown here.",
  },
  {
    keywords: ["ductal carcinoma in situ", "dcis"],
    stem: "A 54-year-old woman attends breast screening; mammography shows a 1.5 cm cluster of fine, branching microcalcifications in the upper outer quadrant of the left breast with no palpable mass. A stereotactic core biopsy is performed, shown here.",
  },
  {
    keywords: ["fibroadenoma"],
    stem: "A 22-year-old woman notices a smooth, mobile, painless 2 cm lump in her left breast that has been slowly enlarging over 6 months. Ultrasound shows a well-circumscribed, homogeneous oval lesion. An excisional biopsy is shown here.",
  },
  {
    keywords: ["phyllodes"],
    stem: "A 38-year-old woman presents with a rapidly enlarging, firm 6 cm breast mass that has doubled in size over 3 months. Ultrasound shows a heterogeneous lobulated lesion. A wide local excision is performed, shown here.",
  },
  {
    keywords: ["squamous cell carcinoma", "scc"],
    stem: "A 64-year-old male smoker presents with progressive hoarseness and a 3-month dry cough. Laryngoscopy reveals a friable exophytic lesion at the right vocal cord. This biopsy is taken.",
  },
  {
    keywords: ["hepatocellular carcinoma", "hcc"],
    stem: "A 58-year-old man with known chronic hepatitis B and child-Pugh A cirrhosis is found to have a 5 cm AFP-secreting (AFP 1,200 ng/mL) hypervascular hepatic mass on surveillance ultrasound. A core liver biopsy of the lesion is performed, shown here.",
  },
  {
    keywords: ["clear cell renal cell carcinoma", "clear cell rcc", "ccrcc", "clear cell renal"],
    stem: "A 61-year-old man presents with frank haematuria, dull left loin pain, and a palpable left flank mass — the classic triad. CT reveals a 9 cm hypervascular renal mass with arterial enhancement and central necrosis. A biopsy from the solid component is shown.",
  },
  {
    keywords: ["renal cell carcinoma", "rcc"],
    stem: "A 65-year-old man presents with intermittent painless haematuria and unintentional 7 kg weight loss over 4 months. CT shows a 6 cm enhancing right renal mass. A nephrectomy specimen is sectioned, with the tumour shown here.",
  },
  {
    keywords: ["colorectal adenocarcinoma", "colorectal carcinoma", "colorectal cancer"],
    stem: "A 65-year-old man presents with a 3-month history of rectal bleeding, change in bowel habit to loose stool, and a 6 kg weight loss. Colonoscopy identifies a 4 cm ulcerated mass in the sigmoid colon. A biopsy is taken, shown here.",
  },
  {
    keywords: ["gastric adenocarcinoma"],
    stem: "A 67-year-old man presents with epigastric pain, early satiety, and 8 kg weight loss over 4 months. OGD reveals an ulcerated lesion at the gastric antrum. A biopsy is taken, shown here.",
  },
  {
    keywords: ["lung adenocarcinoma"],
    stem: "A 62-year-old never-smoker woman of East Asian origin presents with a chronic dry cough and an incidentally detected 3 cm peripheral right upper lobe lung mass on chest CT. A CT-guided core biopsy is performed, shown here.",
  },
  {
    keywords: ["pulmonary tuberculosis", "caseating granuloma", "tuberculosis", "tb"],
    stem: "A 32-year-old man from rural Nigeria presents with a 6-week history of fever, night sweats, haemoptysis, and 10 kg weight loss. Chest X-ray shows upper lobe consolidation with a cavitating lesion. A CT-guided lung biopsy is shown here.",
  },
  {
    keywords: ["sarcoidosis", "non-caseating granuloma", "noncaseating granuloma"],
    stem: "A 34-year-old African-Caribbean woman presents with a 2-month dry cough, exertional dyspnoea, and erythema nodosum on her shins. Chest X-ray shows bilateral hilar lymphadenopathy. A transbronchial lung biopsy is performed, shown here.",
  },
  {
    keywords: ["classical hodgkin", "hodgkin lymphoma", "hodgkin's lymphoma"],
    stem: "A 26-year-old woman presents with painless cervical lymphadenopathy, drenching night sweats, and 12 kg weight loss (B symptoms). PET-CT shows mediastinal and cervical lymph node involvement. An excision biopsy from a cervical node is shown here.",
  },
  {
    keywords: ["diffuse large b cell lymphoma", "dlbcl"],
    stem: "A 68-year-old man presents with a rapidly enlarging painless cervical mass, drenching night sweats, and a raised LDH. Excision biopsy of the enlarged lymph node is performed, shown here.",
  },
  {
    keywords: ["follicular lymphoma"],
    stem: "A 58-year-old woman presents with painless, waxing-and-waning cervical and inguinal lymphadenopathy noted over the past 8 months, with mild fatigue but no B symptoms. An excisional lymph node biopsy is shown here.",
  },
  {
    keywords: ["burkitt"],
    stem: "A 7-year-old boy from sub-Saharan Africa presents with a rapidly growing jaw mass distorting the right mandible over 3 weeks. An incisional biopsy is performed, shown here.",
  },
  {
    keywords: ["acute myeloid leukaemia", "acute myeloid leukemia", "aml"],
    stem: "A 58-year-old man presents with a 3-week history of fatigue, easy bruising, and recurrent gum bleeding. FBC shows WCC 80 × 10⁹/L with 70% blasts, Hb 7.4 g/dL, platelets 28 × 10⁹/L. A bone marrow trephine is shown here.",
  },
  {
    keywords: ["acute lymphoblastic leukaemia", "acute lymphoblastic leukemia", "all"],
    stem: "A 5-year-old boy presents with a 2-week history of pallor, bone pain, fever, and easy bruising. FBC shows WCC 45 × 10⁹/L with circulating blasts. A bone marrow aspirate is performed, shown here.",
  },
  {
    keywords: ["chronic myeloid leukaemia", "chronic myeloid leukemia", "cml"],
    stem: "A 45-year-old man is referred after a routine FBC for life insurance shows WCC 120 × 10⁹/L with a full myeloid spectrum and basophilia. He has mild left upper quadrant discomfort and a palpable spleen 6 cm below the costal margin. A bone marrow trephine is shown here.",
  },
  {
    keywords: ["chronic lymphocytic leukaemia", "chronic lymphocytic leukemia", "cll"],
    stem: "A 72-year-old man is found to have an asymptomatic lymphocytosis (WCC 25 × 10⁹/L, lymphocytes 20 × 10⁹/L) on a routine pre-operative blood test. Examination reveals small, non-tender bilateral cervical lymph nodes. A lymph node biopsy is shown here.",
  },
  {
    keywords: ["meningioma"],
    stem: "A 52-year-old woman presents with a 6-month history of progressive headaches and a recent focal seizure. MRI brain shows a 4 cm dural-based, contrast-enhancing extra-axial mass overlying the right parietal convexity. The resection specimen is shown here.",
  },
  {
    keywords: ["glioblastoma", "gbm"],
    stem: "A 64-year-old man presents with a 4-week history of progressive headaches, expressive dysphasia, and a right-sided focal seizure. MRI shows a heterogeneous ring-enhancing mass in the left temporal lobe with surrounding oedema. A stereotactic biopsy is performed, shown here.",
  },
  {
    keywords: ["papillary thyroid carcinoma", "ptc"],
    stem: "A 38-year-old woman is referred after her GP palpates a firm 2 cm thyroid nodule. Ultrasound shows a hypoechoic lesion with microcalcifications and irregular margins. FNA cytology is suggestive of malignancy, and hemithyroidectomy is performed; the lesion is shown here.",
  },
  {
    keywords: ["medullary thyroid carcinoma", "mtc"],
    stem: "A 42-year-old man with a family history of MEN2A presents with a thyroid nodule. Serum calcitonin is markedly elevated at 850 pg/mL. Total thyroidectomy is performed; the tumour is shown here.",
  },
  {
    keywords: ["wilms", "nephroblastoma"],
    stem: "A 3-year-old child presents with a smooth, non-tender abdominal mass noted by their parents during bathing. Imaging shows a large heterogeneous mass arising from the right kidney. The nephrectomy specimen is shown here.",
  },
  {
    keywords: ["melanoma"],
    stem: "A 52-year-old fair-skinned man presents with a 7 mm asymmetric, irregularly pigmented lesion on his back that his partner noticed had changed in colour and started bleeding. An excisional biopsy is performed, shown here.",
  },
  {
    keywords: ["basal cell carcinoma", "bcc"],
    stem: "A 68-year-old man with chronic sun exposure presents with a slowly enlarging, pearly, rolled-edge nodule with central ulceration and telangiectasia on his nose. A shave biopsy is performed, shown here.",
  },
  // ── Inflammatory / infective / chronic disease ───────────────────────────
  {
    keywords: ["chronic active gastritis", "chronic gastritis", "active gastritis"],
    stem: "A 38-year-old man from West Africa presents with recurrent epigastric burning, bloating, and early satiety. Rapid urease test at endoscopy is positive. This gastric antral biopsy is shown.",
  },
  {
    keywords: ["chronic hepatitis b", "ground glass hepatocyte", "hepatitis b"],
    stem: "A 45-year-old asymptomatic Nigerian man is found to have HBsAg and HBeAg positivity and ALT 3× upper limit of normal during occupational health screening. A liver biopsy is performed, shown here.",
  },
  {
    keywords: ["chronic hepatitis c", "hepatitis c"],
    stem: "A 52-year-old man with a remote history of IV drug use is found to be HCV antibody positive with HCV RNA 2 million IU/mL and ALT 110. A liver biopsy is performed to assess fibrosis stage, shown here.",
  },
  {
    keywords: ["cirrhosis"],
    stem: "A 56-year-old man with a long history of alcohol excess presents with abdominal distension, ankle swelling, and easy bruising. Examination reveals ascites and spider naevi. A transjugular liver biopsy is performed, shown here.",
  },
  {
    keywords: ["usual interstitial pneumonia", "uip", "ipf", "idiopathic pulmonary fibrosis"],
    stem: "A 72-year-old retired miner presents with a 10-year history of progressive exertional dyspnoea and a persistent dry cough. His CT shows bilateral basal honeycombing and traction bronchiectasis. A surgical lung biopsy is shown here.",
  },
  {
    keywords: ["crescentic glomerulonephritis", "rpgn", "rapidly progressive glomerulonephritis"],
    stem: "A 24-year-old man presents with a 2-week history of haematuria, haemoptysis, and rapidly rising serum creatinine. Urinalysis shows red cell casts and his creatinine doubles in 72 hours. An emergency renal biopsy is shown here.",
  },
  {
    keywords: ["iga nephropathy"],
    stem: "A 23-year-old man presents with visible haematuria 2 days after the onset of a sore throat — a pattern he has noticed several times before. Urine dipstick shows blood +++ and protein +. A renal biopsy is shown here.",
  },
  {
    keywords: ["minimal change"],
    stem: "A 5-year-old boy presents with rapidly developing periorbital and peripheral oedema and frothy urine. Urine protein:creatinine ratio is 800 mg/mmol, albumin 18 g/L. A renal biopsy is performed, shown here.",
  },
  {
    keywords: ["membranous"],
    stem: "A 55-year-old man presents with insidious leg swelling and frothy urine over 3 months. Urine protein:creatinine ratio is 700 mg/mmol, albumin 22 g/L. Anti-PLA2R antibodies are positive. A renal biopsy is shown here.",
  },
  {
    keywords: ["diabetic nephropathy"],
    stem: "A 58-year-old man with poorly controlled type 2 diabetes for 18 years presents with worsening leg oedema, hypertension, and proteinuria of 4 g/day. A renal biopsy is performed, shown here.",
  },
  {
    keywords: ["ulcerative colitis"],
    stem: "A 28-year-old man presents with a 2-month history of bloody diarrhoea (up to 8 times daily), lower abdominal cramps, and weight loss. Colonoscopy reveals continuous mucosal inflammation from the rectum to the splenic flexure. A colonic biopsy is shown here.",
  },
  {
    keywords: ["crohn"],
    stem: "A 24-year-old woman presents with intermittent right iliac fossa pain, chronic diarrhoea, and weight loss. Colonoscopy reveals skip lesions with cobblestoning in the terminal ileum. An ileal biopsy is shown here.",
  },
  {
    keywords: ["coeliac", "celiac"],
    stem: "A 32-year-old woman presents with chronic diarrhoea, bloating, and iron-deficiency anaemia. Anti-tissue transglutaminase IgA antibodies are strongly positive. A duodenal biopsy is performed, shown here.",
  },
  {
    keywords: ["myocardial infarction", "mi ", "acute mi"],
    stem: "A 64-year-old man dies suddenly 4 days after presenting with a STEMI managed with primary PCI. At post-mortem, a section through the left ventricular anterior wall is examined, shown here.",
  },
  {
    keywords: ["atherosclerosis", "atheroma"],
    stem: "A 68-year-old man with long-standing hypertension, hyperlipidaemia, and a 40 pack-year smoking history dies of an ischaemic stroke. A section through his abdominal aorta at post-mortem is shown here.",
  },
  {
    keywords: ["rheumatic"],
    stem: "A 16-year-old girl from a low-income setting presents with progressive exertional dyspnoea and a history of recurrent sore throats in childhood. A loud mid-diastolic murmur is heard at the apex. A mitral valve specimen taken at later valve replacement is shown here.",
  },
  // ── Normal histology ─────────────────────────────────────────────────────
  {
    keywords: ["normal liver"],
    stem: "A 48-year-old man undergoes an ultrasound-guided liver biopsy for investigation of mildly raised ALT, with no clear cause identified on imaging or serology. This section from the biopsy is shown here.",
  },
  {
    keywords: ["normal lung", "normal alveoli"],
    stem: "A 26-week premature neonate is born with grunting respirations and intercostal recession; the neonatologist explains surfactant deficiency is the cause. This normal alveolar histology is reviewed for teaching purposes.",
  },
  {
    keywords: ["normal kidney", "normal renal"],
    stem: "A 22-year-old woman presents with frothy urine and bilateral periorbital oedema; her urine protein:creatinine ratio is 600 mg/mmol. As part of her work-up, the normal renal cortical architecture is reviewed alongside her biopsy — this normal reference section is shown here.",
  },
  {
    keywords: ["normal skin"],
    stem: "A 30-year-old woman attending the dermatology clinic has a small benign naevus excised for cosmetic reasons. Adjacent normal skin from the specimen is shown here for teaching purposes.",
  },
  {
    keywords: ["normal colon", "normal large intestine"],
    stem: "A 55-year-old man undergoes screening colonoscopy and has a normal-appearing biopsy taken from the sigmoid colon to confirm baseline mucosal architecture, shown here.",
  },
  {
    keywords: ["normal thyroid"],
    stem: "A 45-year-old euthyroid woman undergoes hemithyroidectomy for a benign solitary nodule. Adjacent normal thyroid parenchyma from the specimen is shown here.",
  },
  {
    keywords: ["normal lymph node"],
    stem: "A 23-year-old woman receives a booster meningococcal vaccine and 5 days later notices a tender, enlarged right inguinal lymph node. This section from the reactive node shows normal background architecture with prominent germinal centres.",
  },
  {
    keywords: ["normal cardiac", "normal heart", "cardiac muscle"],
    stem: "A 21-year-old male athlete collapses on the football pitch and is resuscitated from ventricular fibrillation. A post-event endomyocardial biopsy is reviewed alongside this normal cardiac muscle reference section, shown here.",
  },
  {
    keywords: ["normal spleen"],
    stem: "A 28-year-old man undergoes splenectomy after a road traffic collision causing splenic rupture. Sections of the histologically normal residual splenic parenchyma are shown here.",
  },
];

// Generic fallback by clinical category — used when the diagnosis doesn't match
// any keyword in CASE_VIGNETTES. Keeps the question clinical without fabricating
// implausibly specific details for an unknown diagnosis.
const CATEGORY_VIGNETTES: Record<string, string> = {
  hepatology:
    "A middle-aged patient is referred for investigation of deranged liver function tests and an abnormal liver lesion on imaging. A core liver biopsy is taken, shown here.",
  pulmonology:
    "An adult patient presents with progressive respiratory symptoms and an abnormal chest CT. A diagnostic lung biopsy is obtained, shown here.",
  nephrology:
    "An adult patient presents with proteinuria, haematuria, and deteriorating renal function. A renal biopsy is performed, shown here.",
  gastroenterology:
    "An adult patient presents with persistent gastrointestinal symptoms and an abnormal endoscopic appearance. A mucosal biopsy is taken, shown here.",
  haematology:
    "An adult patient presents with an unexplained abnormal full blood count and constitutional symptoms. A bone marrow or lymph node biopsy is performed, shown here.",
  oncology:
    "A patient presents with a new mass lesion identified on imaging. A core needle biopsy of the lesion is performed, shown here.",
  dermatology:
    "An adult patient presents with a suspicious cutaneous lesion that has changed in size and appearance. An excisional skin biopsy is obtained, shown here.",
  neuropathology:
    "An adult patient presents with progressive neurological symptoms and an intracranial mass on MRI. A stereotactic brain biopsy is performed, shown here.",
  endocrinology:
    "An adult patient is investigated for a thyroid nodule with abnormal ultrasound features. A diagnostic excision is performed, shown here.",
  "infectious disease":
    "A patient presents with chronic constitutional symptoms and an abnormal tissue lesion. A diagnostic biopsy is obtained, shown here.",
  ihc:
    "A patient is undergoing diagnostic work-up of a tissue lesion. The histology is reviewed alongside an immunohistochemistry panel, shown here.",
  "normal histology":
    "A patient is undergoing routine investigation, and this normal reference section is reviewed alongside their specimen for teaching purposes.",
  pathology:
    "A patient presents for diagnostic work-up of an abnormal tissue lesion. A representative biopsy is shown here.",
};

const GENERIC_STEM =
  "A patient presents for diagnostic work-up of an abnormal tissue lesion. A representative biopsy is shown here.";

function getCaseStem(diagnosis: string, category: string): string {
  const dLower = (diagnosis ?? "").toLowerCase();
  for (const v of CASE_VIGNETTES) {
    if (v.keywords.some(k => dLower.includes(k))) return v.stem;
  }
  const catKey = (category ?? "").toLowerCase().trim();
  return CATEGORY_VIGNETTES[catKey] ?? GENERIC_STEM;
}

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

  // Shared clinical case presentation prefixed to every question so the quiz
  // reads like the case-based MCQs in the built-in bank.
  const caseStem = getCaseStem(data.diagnosis, data.category);

  // ── Q1: Diagnosis ─────────────────────────────────────────────────────
  {
    const distractors = pickDistractors(data.diagnosis, DIAGNOSIS_POOL, 3);
    if (distractors.length >= 3) {
      const { options, correctIndex } = buildOptions(data.diagnosis, distractors);
      const featureHint = data.keyFeatures.slice(0, 2).join("; ");
      questions.push({
        id: BASE + 1,
        imageUrl: data.imageUrl,
        question: `${caseStem} What is the most likely diagnosis?`,
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
        question: `${caseStem} Which of the following is a defining histological feature of ${data.diagnosis}?`,
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
        question: `${caseStem} To confirm the diagnosis of ${data.diagnosis}, which IHC marker would be most appropriate to order?`,
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
        question: `${caseStem} Which stain was used to prepare the histological section shown?`,
        options,
        correctIndex,
        explanation: `This section is stained with ${stainLabel}. ${stainNote}`,
        category: data.category,
      });
    }
  }

  return questions;
}
