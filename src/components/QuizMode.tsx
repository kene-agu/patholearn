"use client";

import { useState, useEffect, useMemo } from "react";
import { Brain, CheckCircle, XCircle, RotateCcw, Trophy, ChevronRight, Lightbulb, Timer, Lock, AlertTriangle, Zap } from "lucide-react";
import { clsx } from "clsx";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { playWarningBeep, playUrgentBeep, playTimeUpSound } from "@/lib/timerSound";
import { signalEngagement } from "@/lib/pwaEngagement";
import { recordReferralTrigger } from "@/components/ReferralNudge";
import { generateQuestionsFromSlide, type SlideQuizData } from "@/lib/generatePersonalQuiz";
import { SLIDES } from "@/lib/slideImages";
import SlideImage from "@/components/SlideImage";

/**
 * Returns the best src for a quiz/flashcard image.
 * - Local /slides/ paths (self-hosted) → returned as-is
 * - Supabase storage URLs → returned as-is
 * - Wikimedia/Wikipedia URLs → loaded directly by browser (bypasses Vercel)
 * - Any other external URL → goes through proxy
 */
const quizImgSrc = (url: string): string => {
  if (!url.startsWith("http")) return url;
  if (url.includes("supabase.co")) return url;
  if (url.includes("wikimedia.org") || url.includes("wikipedia.org")) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
};

// ── Images — all sourced from SLIDES (self-hosted in /public/slides/) ─────────
const IMG = {
  liver:      SLIDES.liver,
  lung:       SLIDES.lung,
  kidney:     SLIDES.kidney,
  skin:       SLIDES.skin,
  colon:      SLIDES.colon,
  thyroid:    SLIDES.thyroid,
  lymphNode:  SLIDES.lymphNode,
  cardiac:    SLIDES.cardiac,
  spleen:     SLIDES.spleen,
  scc:        SLIDES.scc,
  gastritis:  SLIDES.gastritis,
  uip:        SLIDES.uip,
  rpgn:       SLIDES.rpgn,
  idc:        SLIDES.idc,
  tb:         SLIDES.tb,
  zn:         SLIDES.tbZN,
  hodgkin:    SLIDES.hodgkin,
  ccrcc:      SLIDES.ccrcc,
  hepB:       SLIDES.hepB,
  crc:        SLIDES.crc,
  mi:         SLIDES.ami,
  atheroma:   SLIDES.atherosclerosis,
  gbm:        SLIDES.gbm,
  meningioma: SLIDES.meningioma,
  ptc:        SLIDES.ptc,
  phaeochrom: SLIDES.phaeochromocytoma,
  melanoma:   SLIDES.melanoma,
  bcc:        SLIDES.bcc,
  dcis:       SLIDES.dcis,
  fibroaden:  SLIDES.fibroadenoma,
  cin3:       SLIDES.cin3,
  endometrial:SLIDES.endometrial,
  prostate:   SLIDES.prostate,
  wilms:      SLIDES.wilms,
  crohn:      SLIDES.crohn,
  kw:         SLIDES.kwNodules,
  hcc:        SLIDES.hcc,
  dlbcl:      SLIDES.dlbcl,
  myeloma:    SLIDES.myeloma,
  osteoSarc:  SLIDES.osteosarcoma,
  rheumatic:  SLIDES.rheumatic,
  oesophageal:SLIDES.oesophageal,
  gctBone:    SLIDES.gctBone,
  boneMarrow: SLIDES.boneMarrow,
};

// Maps each proxy image URL → the flashcard ID it belongs to.
// Used to filter quiz questions by flashcard when "Quick Quiz" is triggered.
const IMG_TO_FLASHCARD: Record<string, string> = {
  [IMG.liver]:      "f-n1",
  [IMG.lung]:       "f-n2",
  [IMG.kidney]:     "f-n3",
  [IMG.skin]:       "f-n4",
  [IMG.colon]:      "f-n5",
  [IMG.thyroid]:    "f-n6",
  [IMG.lymphNode]:  "f-n7",
  [IMG.cardiac]:    "f-n8",
  [IMG.spleen]:     "f-n9",
  [IMG.scc]:        "f-p1",
  [IMG.gastritis]:  "f-p2",
  [IMG.uip]:        "f-p3",
  [IMG.rpgn]:       "f-p4",
  [IMG.idc]:        "f-p5",
  [IMG.tb]:         "f-p6",
  [IMG.zn]:         "f-p7",
  [IMG.hodgkin]:    "f-p8",
  [IMG.ccrcc]:      "f-p9",
  [IMG.hepB]:       "f-p10",
  [IMG.crc]:        "f-p11",
  [IMG.mi]:         "f-p12",
  [IMG.atheroma]:   "f-p13",
  [IMG.gbm]:        "f-p16",
  [IMG.meningioma]: "f-p17",
  [IMG.ptc]:        "f-p18",
  [IMG.phaeochrom]: "f-p19",
  [IMG.melanoma]:   "f-p20",
  [IMG.bcc]:        "f-p21",
  [IMG.dcis]:       "f-p22",
  [IMG.fibroaden]:  "f-p23",
  [IMG.cin3]:       "f-p24",
  [IMG.endometrial]:"f-p25",
  [IMG.prostate]:   "f-p26",
  [IMG.wilms]:      "f-p27",
  [IMG.crohn]:      "f-p28",
  [IMG.kw]:         "f-p30",
  [IMG.hcc]:        "f-p31",
  [IMG.dlbcl]:      "f-p32",
  [IMG.myeloma]:    "f-p33",
  [IMG.osteoSarc]:  "f-p34",
  [IMG.rheumatic]:   "f-p15",
  [IMG.oesophageal]: "f-p29",
  [IMG.gctBone]:     "f-p35",
  [IMG.boneMarrow]:  "f-n11",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleOptions(q: QuizQuestion): QuizQuestion {
  const correctText = q.options[q.correctIndex];
  const shuffled = shuffle(q.options);
  return { ...q, options: shuffled, correctIndex: shuffled.indexOf(correctText) };
}

interface QuizQuestion {
  id: number;
  imageUrl: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}

const QUESTION_BANK: QuizQuestion[] = [
  {
    id: 1,
    imageUrl: IMG.liver,
    question: "A 48-year-old man undergoes an ultrasound-guided biopsy for investigation of hepatomegaly. The pathologist describes polygonal cells arranged in plates (1–2 cells thick) radiating from a central vein, with portal triads at the periphery. Which organ has been biopsied?",
    options: ["Kidney cortex", "Normal liver parenchyma", "Pancreatic acini", "Adrenal gland"],
    correctIndex: 1,
    explanation: "The slide shows hepatocytes arranged in cords (plates) with central veins and portal tracts — characteristic of normal liver parenchyma. The polygonal cells with central nuclei and pink granular cytoplasm are hallmarks of hepatocytes.",
    category: "Hepatology",
  },
  {
    id: 2,
    imageUrl: IMG.scc,
    question: "A 64-year-old male smoker presents with progressive hoarseness and a 3-month dry cough. Laryngoscopy reveals a friable exophytic lesion at the vocal cord. This biopsy is taken. The eosinophilic concentric whorls within the tumour nests are best described as:",
    options: ["Psammoma bodies", "Keratin pearls", "Lewy bodies", "Mallory-Denk bodies"],
    correctIndex: 1,
    explanation: "Keratin (squamous) pearls are concentric whorls of squamous cells undergoing keratinisation, which is a hallmark of well-differentiated squamous cell carcinoma. They help distinguish SCC from other carcinomas.",
    category: "Oncology",
  },
  {
    id: 3,
    imageUrl: IMG.uip,
    question: "A 72-year-old retired miner presents with a 10-year history of progressive exertional dyspnoea and a persistent dry cough. His CT shows bilateral basal honeycombing and traction bronchiectasis. This Masson Trichrome section from a surgical lung biopsy is shown. The dense blue material occupying the parenchyma represents:",
    options: ["Inflammatory cells", "Collagen deposition (fibrosis)", "Mucus secretion", "Haemosiderin deposits"],
    correctIndex: 1,
    explanation: "In Masson Trichrome staining, collagen fibres stain blue/green while muscle stains red. Dense blue areas here indicate extensive fibrosis — a hallmark of Usual Interstitial Pneumonia (UIP) / IPF.",
    category: "Pulmonology",
  },
  {
    id: 4,
    imageUrl: IMG.idc,
    question: "A 49-year-old woman presents with a firm, irregular 2.8 cm lump in her right breast with skin dimpling and axillary lymph node enlargement. Mammography shows a spiculated mass. This core needle biopsy is obtained. What is the most likely diagnosis?",
    options: ["Fibroadenoma", "Ductal carcinoma in situ (DCIS)", "Invasive ductal carcinoma (IDC)", "Phyllodes tumour"],
    correctIndex: 2,
    explanation: "Invasive ductal carcinoma is characterised by irregular malignant glandular formations invading the surrounding desmoplastic (fibrous) stroma. Unlike DCIS, the basement membrane is breached. IDC is the most common breast malignancy.",
    category: "Oncology",
  },
  {
    id: 5,
    imageUrl: IMG.gastritis,
    question: "A 38-year-old man from West Africa presents with recurrent epigastric burning, bloating, and early satiety. Rapid urease test at endoscopy is positive. This gastric antral biopsy is shown. The predominant inflammatory cells within the lamina propria are:",
    options: ["Neutrophils", "Eosinophils", "Lymphocytes and plasma cells", "Mast cells"],
    correctIndex: 2,
    explanation: "Chronic gastritis is characterised by a predominantly lymphocytic and plasma cell infiltrate within the lamina propria. Neutrophils indicate active gastritis superimposed on chronic disease. H. pylori infection is the most common cause.",
    category: "Gastroenterology",
  },
  {
    id: 6,
    imageUrl: IMG.lung,
    question: "A 26-week premature neonate is born with grunting respirations, intercostal recession, and an oxygen requirement of 60%. The neonatologist explains surfactant deficiency is the cause. Looking at this normal alveolar histology, which cell produces surfactant to prevent end-expiratory alveolar collapse?",
    options: ["Type I pneumocytes", "Type II pneumocytes", "Clara (club) cells", "Alveolar macrophages"],
    correctIndex: 1,
    explanation: "Type II pneumocytes are cuboidal cells that produce pulmonary surfactant (dipalmitoylphosphatidylcholine), which reduces alveolar surface tension and prevents collapse. They also act as stem cells that regenerate type I cells after injury. Surfactant deficiency in premature infants causes neonatal respiratory distress syndrome.",
    category: "Normal Histology",
  },
  {
    id: 7,
    imageUrl: IMG.kidney,
    question: "A 22-year-old woman presents with frothy urine and bilateral periorbital oedema. Urine protein:creatinine ratio is 600 mg/mmol. Her nephrologist explains her glomerular filtration barrier has been disrupted. Looking at this normal renal cortex, which three layers constitute the glomerular filtration barrier?",
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
    imageUrl: IMG.thyroid,
    question: "A 56-year-old woman undergoes thyroidectomy for a 3 cm follicular lesion with capsular invasion. Lymph node staging reveals metastatic deposits of unknown origin in her cervical nodes. To confirm thyroid follicular cell origin in the metastatic deposit, which IHC marker is most appropriate?",
    options: ["Chromogranin A", "Thyroid Transcription Factor-1 (TTF-1)", "CD138", "Synaptophysin"],
    correctIndex: 1,
    explanation: "TTF-1 (Thyroid Transcription Factor-1) is expressed by follicular cells of the thyroid and by lung pneumocytes. It is a key IHC marker used to confirm thyroid origin in metastatic carcinomas and to identify primary thyroid tumours. Calcitonin and chromogranin A are used for medullary thyroid carcinoma (parafollicular C-cell origin), not follicular origin.",
    category: "IHC",
  },
  {
    id: 9,
    imageUrl: IMG.cardiac,
    question: "A 21-year-old male athlete collapses on the football pitch and is resuscitated from ventricular fibrillation. Cardiac MRI later confirms arrhythmogenic right ventricular cardiomyopathy (ARVC). Disruption of which specialised junction within cardiac intercalated discs — allowing electrical coupling between cardiomyocytes — underlies his arrhythmia?",
    options: ["Tight junctions (zonula occludens)", "Desmosomes", "Gap junctions (connexons) within intercalated discs", "Hemidesmosomes"],
    correctIndex: 2,
    explanation: "Gap junctions (made of connexin proteins) within intercalated discs provide low-resistance electrical pathways between cardiomyocytes, allowing action potentials to spread rapidly and enabling the heart to function as an electrical syncytium. Desmosomes provide mechanical coupling; fascia adherens anchor actin filaments. Loss of connexin-43 is associated with arrhythmias.",
    category: "Normal Histology",
  },
  {
    id: 10,
    imageUrl: IMG.idc,
    question: "A 51-year-old woman is diagnosed with invasive ductal carcinoma of the breast. Her oncologist requests IHC receptor testing to guide systemic therapy. Her tumour is HER2 2+ equivocal by IHC and is sent for FISH. Which IHC expression profile confirms the breast adenocarcinoma origin and guides hormone therapy eligibility?",
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
    imageUrl: IMG.lymphNode,
    question: "A 23-year-old woman receives a booster meningococcal vaccine and 5 days later notices a tender, enlarged right inguinal lymph node. This section from a reactive lymph node is shown, with prominent germinal centres. Which process occurring within these germinal centres generates high-affinity antibodies?",
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
    imageUrl: IMG.rpgn,
    question: "A 24-year-old man presents with a 2-week history of haematuria, haemoptysis, and rapidly rising serum creatinine. Urinalysis shows red cell casts. His creatinine doubles in 72 hours. An emergency renal biopsy is performed. The cellular crescents compressing the glomeruli are composed of:",
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
    imageUrl: IMG.tb,
    question: "A 32-year-old man from rural Nigeria presents with a 6-week history of fever, night sweats, haemoptysis, and 10 kg weight loss. Chest X-ray shows upper lobe consolidation with a cavitating lesion. A CT-guided lung biopsy is shown. The central amorphous pink material surrounded by epithelioid histiocytes represents:",
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
    imageUrl: IMG.zn,
    question: "A 30-year-old HIV-positive man with CD4 count of 120 cells/μL presents with a 3-week productive cough and night sweats. This Ziehl-Neelsen-stained sputum smear is shown. A junior doctor asks why mycobacteria appear red while the background cells are blue. The correct explanation is:",
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
    imageUrl: IMG.hodgkin,
    question: "A 26-year-old woman presents with painless cervical lymphadenopathy, drenching night sweats, and 12 kg weight loss (B symptoms). PET-CT shows mediastinal and cervical lymph node involvement. This excision biopsy from a cervical node is shown. The large binucleated cell with prominent 'owl-eye' nucleoli is pathognomonic of:",
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
    imageUrl: IMG.hepB,
    question: "A 45-year-old asymptomatic Nigerian man is found to have HBeAg positivity and ALT 3× upper limit of normal during occupational health screening. A liver biopsy is performed as shown. Hepatocytes containing pale, finely granular 'ground-glass' cytoplasm accumulate which substance?",
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
    imageUrl: IMG.ccrcc,
    question: "A 61-year-old man presents with frank haematuria, a dull left loin pain, and a palpable left flank mass — the classic triad. CT reveals a 9 cm hypervascular renal mass with arterial enhancement and central necrosis. This biopsy from the solid component is shown. The optically clear cytoplasm results from:",
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
    imageUrl: IMG.crc,
    question: "A 65-year-old man presents with a 3-month history of rectal bleeding, change in bowel habit to loose stool, and a 6 kg weight loss. Colonoscopy identifies a 4 cm ulcerated mass in the sigmoid colon. This biopsy is taken. The necrotic cellular debris admixed with mucin within glandular lumens ('dirty necrosis') is a histological feature that:",
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

  // ── Normal Liver (extra) ──────────────────────────────────────────────────
  {
    id: 19,
    imageUrl: IMG.liver,
    question: "Which IHC marker confirms hepatocyte origin in a liver tumour?",
    options: ["CK20", "HepPar-1", "TTF-1", "CDX2"],
    correctIndex: 1,
    explanation: "HepPar-1 (Hepatocyte Paraffin 1) is the most specific IHC marker for hepatocyte differentiation and is used to confirm hepatocellular carcinoma (HCC). TTF-1 is a lung/thyroid marker, CDX2 is intestinal, and CK20 marks colorectal/urothelial tumours. AFP is also used for HCC but is less specific.",
    category: "Hepatology",
  },
  {
    id: 20,
    imageUrl: IMG.liver,
    question: "Which hepatic zone is most susceptible to ischaemic injury and paracetamol (acetaminophen) toxicity?",
    options: ["Zone 1 (periportal)", "Zone 2 (mid-zonal)", "Zone 3 (centrilobular)", "All zones equally"],
    correctIndex: 2,
    explanation: "Zone 3 hepatocytes (centrilobular) receive blood last and have the lowest oxygen tension, making them most vulnerable to ischaemia. They also have the highest concentration of CYP2E1, the enzyme that converts paracetamol to the toxic metabolite NAPQI, explaining why paracetamol overdose causes centrilobular necrosis.",
    category: "Hepatology",
  },

  // ── Normal Lung (extra) ───────────────────────────────────────────────────
  {
    id: 21,
    imageUrl: IMG.lung,
    question: "Which IHC marker is used to confirm type II pneumocyte origin in a lung tumour?",
    options: ["CK20", "CDX2", "Napsin A", "CD138"],
    correctIndex: 2,
    explanation: "Napsin A (together with TTF-1) is a highly sensitive and specific marker for lung adenocarcinoma — the tumour derived from type II pneumocytes. Napsin A is an aspartyl protease expressed in type II pneumocytes and renal proximal tubules. CK20 and CDX2 mark colorectal origin; CD138 marks plasma cells.",
    category: "Pulmonology",
  },
  {
    id: 22,
    imageUrl: IMG.lung,
    question: "Surfactant deficiency in premature neonates causes respiratory distress syndrome (RDS). What is the primary component of surfactant?",
    options: ["Phosphatidylcholine (DPPC)", "IgA", "Lysozyme", "Clara cell protein (CC16)"],
    correctIndex: 0,
    explanation: "Dipalmitoylphosphatidylcholine (DPPC) is the major lipid component of surfactant, reducing alveolar surface tension and preventing end-expiratory collapse. Surfactant also contains surfactant proteins SP-A, SP-B, SP-C, SP-D. Treatment of neonatal RDS involves exogenous surfactant instillation and antenatal corticosteroids to accelerate lung maturation.",
    category: "Pulmonology",
  },

  // ── Normal Kidney (extra) ─────────────────────────────────────────────────
  {
    id: 23,
    imageUrl: IMG.kidney,
    question: "Which glomerular disease shows foot process effacement on electron microscopy but appears NORMAL on light microscopy?",
    options: ["IgA nephropathy", "Focal segmental glomerulosclerosis", "Minimal Change Disease", "Membranous nephropathy"],
    correctIndex: 2,
    explanation: "Minimal Change Disease (MCD) is the classic example — light microscopy is essentially normal, but electron microscopy reveals diffuse podocyte foot process effacement. It is the commonest cause of nephrotic syndrome in children and responds excellently to steroids. The name 'minimal change' reflects the normal H&E appearance.",
    category: "Nephrology",
  },
  {
    id: 24,
    imageUrl: IMG.kidney,
    question: "How do you distinguish proximal from distal tubules on H&E?",
    options: [
      "Proximal tubules have a clear lumen and thin wall; distal have a brush border",
      "Proximal tubules have a brush border (microvilli) and granular cytoplasm; distal have a cleaner open lumen",
      "Distal tubules always stain darker due to mitochondria",
      "They are indistinguishable on H&E alone",
    ],
    correctIndex: 1,
    explanation: "Proximal convoluted tubules (PCTs) are lined by large cells with abundant eosinophilic granular cytoplasm and a prominent apical brush border (microvilli). This makes their lumens appear narrow/irregular. Distal convoluted tubules (DCTs) are smaller, with less cytoplasm, and an open, well-defined lumen without a brush border. PCTs are more susceptible to ischaemic acute tubular necrosis.",
    category: "Nephrology",
  },

  // ── Normal Skin ───────────────────────────────────────────────────────────
  {
    id: 25,
    imageUrl: IMG.skin,
    question: "Which cell in the epidermis is responsible for immune surveillance and antigen presentation?",
    options: ["Keratinocyte", "Melanocyte", "Langerhans cell", "Merkel cell"],
    correctIndex: 2,
    explanation: "Langerhans cells are dendritic antigen-presenting cells in the epidermis, identified by IHC with CD1a and S100. They capture antigens, migrate to regional lymph nodes, and present to T cells — forming the first line of adaptive immune defence in the skin. They are depleted in HIV infection, impairing skin immunity.",
    category: "Dermatology",
  },
  {
    id: 26,
    imageUrl: IMG.skin,
    question: "What is the correct order of epidermal layers from base to surface?",
    options: [
      "Stratum corneum → granulosum → spinosum → basale",
      "Stratum basale → spinosum → granulosum → corneum",
      "Stratum basale → granulosum → spinosum → corneum",
      "Stratum spinosum → basale → granulosum → corneum",
    ],
    correctIndex: 1,
    explanation: "The epidermis layers from deep to superficial: Basale (stem cells, melanocytes) → Spinosum (desmosomes, 'prickle cells') → Granulosum (keratohyalin granules, lamellar bodies) → Lucidum (only in thick skin) → Corneum (anucleate, keratin-rich 'dead' cells). A useful mnemonic: 'Baby Seals Get Lovingly Cuddled' (Basale, Spinosum, Granulosum, Lucidum, Corneum).",
    category: "Dermatology",
  },
  {
    id: 27,
    imageUrl: IMG.skin,
    question: "Which IHC marker confirms melanocyte/melanoma origin in a skin tumour?",
    options: ["CK5/6", "S100 and Melan-A (MART-1)", "CD20", "TTF-1"],
    correctIndex: 1,
    explanation: "S100 is a sensitive but not specific melanocyte marker. Melan-A (MART-1) and HMB-45 are more specific. Sox10 is also used. This panel is essential to distinguish melanoma from carcinoma, lymphoma, and sarcoma in poorly differentiated tumours. Melanoma is notorious for metastasising widely and mimicking other tumours histologically.",
    category: "Dermatology",
  },

  // ── Normal Colon ──────────────────────────────────────────────────────────
  {
    id: 28,
    imageUrl: IMG.colon,
    question: "Which IHC panel confirms colorectal origin in a metastatic adenocarcinoma?",
    options: ["CK7+, CK20−, TTF-1+", "CK20+, CDX2+, CK7−", "ER+, PR+, CK7+", "HepPar-1+, AFP+"],
    correctIndex: 1,
    explanation: "Colorectal adenocarcinoma is classically CK20+ and CDX2+ (intestinal transcription factor). It is typically CK7−, distinguishing it from upper GI, lung, and ovarian tumours (CK7+). CDX2 positivity identifies any intestinal-type differentiation. This panel is essential in identifying primary site when a patient presents with metastatic adenocarcinoma of unknown origin.",
    category: "Gastroenterology",
  },
  {
    id: 29,
    imageUrl: IMG.colon,
    question: "Crypt distortion and branching in a colonic biopsy suggests which condition rather than infectious colitis?",
    options: [
      "Acute self-limiting (infectious) colitis",
      "Chronic inflammatory bowel disease (IBD)",
      "Normal variation in colonic architecture",
      "Ischaemic colitis",
    ],
    correctIndex: 1,
    explanation: "Normal colon crypts run straight and parallel from surface to muscularis mucosae. Chronic IBD (Crohn's disease or ulcerative colitis) causes architectural distortion — crypt branching, shortening, and basal plasmacytosis — that persists even during remission. Infectious (acute) colitis preserves crypt architecture. Basal plasmacytosis (plasma cells below the crypts) is a reliable early marker of chronic IBD.",
    category: "Gastroenterology",
  },

  // ── Normal Thyroid (extra) ────────────────────────────────────────────────
  {
    id: 30,
    imageUrl: IMG.thyroid,
    question: "In Graves' disease, what histological change occurs in the thyroid follicles?",
    options: [
      "Follicles become large and full of colloid with flat epithelium",
      "Follicles become small with tall columnar epithelium and scalloped colloid edges",
      "Follicles are replaced by lymphocytes",
      "Follicles show amyloid deposition",
    ],
    correctIndex: 1,
    explanation: "In Graves' disease (autoimmune hyperthyroidism), TSH receptor antibodies chronically stimulate follicular cells, causing hyperplasia. Histologically: small follicles, tall columnar follicular cells, scalloping ('Sanderson's polsters') at the colloid-cell interface due to active reabsorption, and a lymphocytic infiltrate. Full follicles + flat epithelium = hypothyroid (colloid goitre). Empty + tall = hyperthyroid.",
    category: "Endocrinology",
  },
  {
    id: 31,
    imageUrl: IMG.thyroid,
    question: "Which IHC marker is used to identify parafollicular C cells (and medullary thyroid carcinoma)?",
    options: ["Thyroglobulin", "TTF-1", "Calcitonin", "CK7"],
    correctIndex: 2,
    explanation: "Parafollicular C cells produce calcitonin, which lowers blood calcium. Medullary thyroid carcinoma (MTC) arises from C cells and is diagnosed by elevated serum calcitonin ± IHC positivity. MTC is associated with MEN2A and MEN2B syndromes (RET mutation). Unlike follicular-derived thyroid cancers, MTC does NOT take up radioiodine.",
    category: "Endocrinology",
  },

  // ── Normal Lymph Node (extra) ─────────────────────────────────────────────
  {
    id: 32,
    imageUrl: IMG.lymphNode,
    question: "Effacement of lymph node architecture with no identifiable follicles or sinuses suggests:",
    options: [
      "Reactive hyperplasia",
      "Lymphoma — architectural effacement is a key diagnostic criterion",
      "Sinus histiocytosis",
      "Granulomatous inflammation",
    ],
    correctIndex: 1,
    explanation: "Normal lymph node architecture (cortex with follicles, paracortex, medullary sinuses) is preserved in reactive conditions. Complete architectural effacement — where follicles and sinuses cannot be identified — is a hallmark of lymphoma. This must be confirmed with IHC (CD20, CD3, CD5, CD10, BCL2, Ki-67, etc.) and often molecular studies (clonality). 'Effacement = Exclude lymphoma' is a core diagnostic principle.",
    category: "Haematology",
  },
  {
    id: 33,
    imageUrl: IMG.lymphNode,
    question: "Which IHC marker identifies B cells in the follicles of a lymph node?",
    options: ["CD3", "CD20", "CD68", "CD56"],
    correctIndex: 1,
    explanation: "CD20 is a B cell marker expressed on mature B lymphocytes and most B cell lymphomas. It is the target of rituximab (anti-CD20 monoclonal antibody), used in B cell lymphoma and autoimmune disease treatment. CD3 marks T cells; CD68 marks macrophages/histiocytes; CD56 marks NK cells and neuroendocrine tumours.",
    category: "Haematology",
  },

  // ── Normal Cardiac Muscle (extra) ─────────────────────────────────────────
  {
    id: 34,
    imageUrl: IMG.cardiac,
    question: "Troponin T and I leak into blood during myocardial infarction because:",
    options: [
      "They are synthesised in the liver and spill over during liver injury",
      "Cardiomyocyte membrane disruption releases cytoplasmic troponin into the bloodstream",
      "They are secreted by pericardial mesothelial cells",
      "They are filtered by the kidney and elevated in renal failure only",
    ],
    correctIndex: 1,
    explanation: "Cardiac troponin T (cTnT) and troponin I (cTnI) are structural proteins of the cardiomyocyte contractile apparatus. During MI, ischaemia causes irreversible membrane disruption, releasing troponin into circulation. Serum troponin rises within 3-6 hours, peaks at 12-24 hours, and remains elevated for 7-14 days. High-sensitivity troponin assays allow earlier MI detection. Troponin is also elevated in myocarditis, PE, and severe heart failure.",
    category: "Cardiology",
  },
  {
    id: 35,
    imageUrl: IMG.cardiac,
    question: "What are intercalated discs in cardiac muscle and what is their function?",
    options: [
      "Satellite cells that repair damaged cardiomyocytes",
      "Specialised cell junctions containing gap junctions and desmosomes that couple cardiomyocytes electrically and mechanically",
      "T-tubule invaginations that bring calcium to myofibrils",
      "Regions of mitochondrial clustering for ATP production",
    ],
    correctIndex: 1,
    explanation: "Intercalated discs are specialised junctions at the ends of cardiomyocytes containing: (1) Fascia adherens — anchor actin filaments; (2) Desmosomes — mechanical coupling; (3) Gap junctions (connexins) — electrical coupling, allowing action potentials to spread rapidly. This makes the heart a functional syncytium. Loss of connexin-43 expression is associated with arrhythmias and sudden cardiac death.",
    category: "Cardiology",
  },

  // ── Normal Spleen ─────────────────────────────────────────────────────────
  {
    id: 36,
    imageUrl: IMG.spleen,
    question: "The white pulp of the spleen is composed of which cells?",
    options: [
      "Red blood cells and sinusoids",
      "Lymphocytes (T cells in PALS, B cells in follicles) surrounding central arterioles",
      "Macrophages and dendritic cells only",
      "Plasma cells secreting IgA",
    ],
    correctIndex: 1,
    explanation: "White pulp = lymphoid tissue organised around central arterioles. The periarteriolar lymphoid sheath (PALS) contains T cells (CD3+); germinal centres contain B cells (CD20+). White pulp is the immune component — site of antigen presentation and lymphocyte activation. Red pulp (majority of spleen) contains sinusoids and is responsible for filtering blood and removing senescent RBCs.",
    category: "Haematology",
  },
  {
    id: 37,
    imageUrl: IMG.spleen,
    question: "Asplenic patients are most vulnerable to infections with which class of organisms?",
    options: ["Intracellular viruses (HIV, EBV)", "Encapsulated bacteria (pneumococcus, meningococcus, H. influenzae)", "Fungi (Candida, Aspergillus)", "Protozoa (Plasmodium, Toxoplasma)"],
    correctIndex: 1,
    explanation: "The spleen filters encapsulated bacteria opsonised with IgM (the first antibody produced). Without a spleen, IgM-mediated phagocytosis is impaired. Asplenic patients (post-splenectomy or functional asplenia in sickle cell) must receive vaccines against Streptococcus pneumoniae, Neisseria meningitidis, and Haemophilus influenzae type b — the 'OPSI' organisms. Lifelong prophylactic penicillin V is recommended.",
    category: "Haematology",
  },
  {
    id: 38,
    imageUrl: IMG.spleen,
    question: "Howell-Jolly bodies in red blood cells on a peripheral blood smear indicate:",
    options: [
      "Iron deficiency anaemia",
      "Asplenia or hyposplenia — the spleen normally removes nuclear remnants",
      "Vitamin B12 deficiency",
      "Hereditary spherocytosis",
    ],
    correctIndex: 1,
    explanation: "Howell-Jolly bodies are nuclear remnants (DNA fragments) that persist in red blood cells when not removed by splenic macrophages. Their presence on a blood film indicates absent or non-functional spleen. Causes: splenectomy, sickle cell disease (auto-splenectomy), coeliac disease, congenital asplenia. Always suggest vaccination against encapsulated organisms when Howell-Jolly bodies are found incidentally.",
    category: "Haematology",
  },

  // ── SCC (extra) ───────────────────────────────────────────────────────────
  {
    id: 39,
    imageUrl: IMG.scc,
    question: "Which IHC panel confirms squamous cell carcinoma differentiation?",
    options: ["CK7+, TTF-1+, Napsin A+", "CK5/6+, p63+, p40+", "CK20+, CDX2+", "ER+, PR+, HER2+"],
    correctIndex: 1,
    explanation: "SCC markers: CK5/6 (high molecular weight cytokeratin expressed in squamous epithelium), p63 (nuclear transcription factor in basal/squamous cells), and p40 (more specific p63 isoform). This panel distinguishes SCC from adenocarcinoma (CK7+, TTF-1+) and other carcinomas. In the lung, this distinction drives treatment choice — EGFR mutations and ALK rearrangements are rare in SCC.",
    category: "Oncology",
  },
  {
    id: 40,
    imageUrl: IMG.scc,
    question: "What is the clinical significance of tumour invasion through the basement membrane in SCC?",
    options: [
      "It indicates the tumour is well-differentiated and has better prognosis",
      "It defines invasive carcinoma — with access to lymphatics and vasculature, enabling metastasis",
      "It has no prognostic significance until lymph node involvement",
      "It only occurs in high-grade SCC",
    ],
    correctIndex: 1,
    explanation: "Breach of the basement membrane transforms in situ (pre-invasive) carcinoma into invasive carcinoma. Once invasive, tumour cells access lymphatic channels and blood vessels, enabling metastasis. This is the most critical pathological distinction — in situ disease is curable with local excision; invasive disease requires staging and systemic treatment consideration. Stage-for-stage, invasive SCC of any site carries worse prognosis than in situ disease.",
    category: "Oncology",
  },

  // ── Chronic Gastritis (extra) ─────────────────────────────────────────────
  {
    id: 41,
    imageUrl: IMG.gastritis,
    question: "H. pylori-associated chronic gastritis can progress through which sequence to gastric adenocarcinoma?",
    options: [
      "Acute gastritis → peptic ulcer → carcinoma",
      "Chronic gastritis → intestinal metaplasia → dysplasia → gastric adenocarcinoma (Correa cascade)",
      "Chronic gastritis → MALT lymphoma → adenocarcinoma",
      "Normal mucosa → adenoma → carcinoma",
    ],
    correctIndex: 1,
    explanation: "The Correa cascade describes the progression: Normal → Chronic superficial gastritis → Chronic atrophic gastritis → Intestinal metaplasia → Dysplasia → Intestinal-type gastric adenocarcinoma. H. pylori (WHO Group 1 carcinogen) drives early steps. Intestinal metaplasia (gastric mucosa replaced by intestinal-type glands) is a pre-malignant lesion requiring endoscopic surveillance. H. pylori eradication arrests early steps in the cascade.",
    category: "Gastroenterology",
  },
  {
    id: 42,
    imageUrl: IMG.gastritis,
    question: "What histological feature distinguishes chronic active gastritis from chronic inactive gastritis?",
    options: [
      "Presence of plasma cells",
      "Presence of neutrophils within glandular epithelium (cryptitis)",
      "Lymphocytic infiltration of the lamina propria",
      "Goblet cell metaplasia",
    ],
    correctIndex: 1,
    explanation: "Chronic gastritis = plasma cells + lymphocytes in the lamina propria. 'Active' means neutrophilic inflammation within the glandular epithelium (cryptitis or crypt abscess) on top of the chronic infiltrate. Activity implies ongoing mucosal injury — usually H. pylori. 'Inactive' means chronic inflammation without neutrophils, often seen after H. pylori eradication. Activity correlates with H. pylori density.",
    category: "Gastroenterology",
  },

  // ── UIP/IPF (extra) ───────────────────────────────────────────────────────
  {
    id: 43,
    imageUrl: IMG.uip,
    question: "What is 'temporal heterogeneity' in UIP/IPF and why is it diagnostically important?",
    options: [
      "The same patient has different radiological patterns over time",
      "Old and new fibrosis coexist in the same biopsy — distinguishing UIP from NSIP",
      "Fibrosis affects different lobes asymmetrically",
      "Fibroblastic foci appear at different depths in the lung",
    ],
    correctIndex: 1,
    explanation: "Temporal heterogeneity means areas of old dense fibrosis (collagen deposition, honeycombing) coexist with active new fibrosis (fibroblastic foci — immature myofibroblasts in pale myxoid stroma) in the SAME biopsy. This patchy, temporally mixed pattern defines UIP/IPF. NSIP (Non-specific Interstitial Pneumonia) shows uniform, temporally homogeneous fibrosis. This distinction changes treatment: NSIP responds to steroids; UIP/IPF does not, requiring antifibrotic agents (pirfenidone, nintedanib).",
    category: "Pulmonology",
  },
  {
    id: 44,
    imageUrl: IMG.uip,
    question: "In Masson Trichrome staining, what colour does collagen stain and what does muscle stain?",
    options: [
      "Collagen = red, muscle = blue",
      "Collagen = blue/green, muscle = red",
      "Collagen = purple, muscle = orange",
      "Both collagen and muscle stain pink",
    ],
    correctIndex: 1,
    explanation: "In Masson Trichrome: collagen stains blue or green (depending on the variant), muscle fibres stain red, nuclei stain black, and cytoplasm stains red/pink. This allows fibrosis (blue collagen) to be easily distinguished from viable muscle tissue. Dense blue areas in lung biopsies indicate significant fibrosis, as seen in IPF/UIP, hepatic cirrhosis, and cardiac fibrosis.",
    category: "Pulmonology",
  },

  // ── RPGN (extra) ──────────────────────────────────────────────────────────
  {
    id: 45,
    imageUrl: IMG.rpgn,
    question: "The three immunofluorescence patterns in RPGN correspond to which underlying diseases?",
    options: [
      "Linear IgG = anti-GBM (Goodpasture's); Granular = immune complex (lupus/IgA); Pauci-immune (no deposits) = ANCA vasculitis",
      "Linear IgG = ANCA vasculitis; Granular = anti-GBM; Pauci-immune = lupus",
      "All patterns are equivalent — biopsy type alone determines diagnosis",
      "Linear IgA = Henoch-Schönlein purpura; Granular IgG = anti-GBM; Pauci-immune = lupus",
    ],
    correctIndex: 0,
    explanation: "RPGN immunofluorescence patterns: (1) Linear IgG along the GBM = anti-GBM disease (Goodpasture's syndrome) — treat with plasmapheresis + cyclophosphamide; (2) Granular ('lumpy-bumpy') immune complex = lupus nephritis, post-streptococcal GN, IgA nephropathy; (3) Pauci-immune (little/no deposits) = ANCA-associated vasculitis (GPA, MPA) — treat with cyclophosphamide + steroids. Identifying the pattern drives therapy.",
    category: "Nephrology",
  },

  // ── IDC Breast (extra) ────────────────────────────────────────────────────
  {
    id: 46,
    imageUrl: IMG.idc,
    question: "Triple-negative breast cancer (TNBC) is defined as:",
    options: [
      "ER−, PR−, HER2− — carries the worst prognosis and is treated with chemotherapy only",
      "ER+, PR+, HER2+ — responds to all three targeted therapies",
      "HER2+ only, with ER/PR status irrelevant",
      "Ki-67 >30% regardless of receptor status",
    ],
    correctIndex: 0,
    explanation: "Triple-negative breast cancer (TNBC) lacks expression of ER, PR, and HER2, so it cannot be targeted with endocrine therapy or trastuzumab. It is the most aggressive subtype, with high Ki-67, early visceral metastasis, and poor 5-year survival. It is more common in BRCA1 mutation carriers, younger women, and women of African descent. Platinum-based chemotherapy ± PARP inhibitors (in BRCA-mutated cases) are used.",
    category: "Oncology",
  },

  // ── Pulmonary TB (extra) ──────────────────────────────────────────────────
  {
    id: 47,
    imageUrl: IMG.tb,
    question: "What is the defining cell of a granuloma and what are its characteristics?",
    options: [
      "Plasma cell — large, eccentric nucleus, clockface chromatin, cytoplasmic immunoglobulin",
      "Epithelioid histiocyte — activated macrophage with abundant pink cytoplasm and vesicular nucleus, lacking phagolysosomes",
      "Reed-Sternberg cell — binucleated with owl-eye nucleoli",
      "Type II pneumocyte — cuboidal cell lining alveoli",
    ],
    correctIndex: 1,
    explanation: "A granuloma is a collection of epithelioid histiocytes — activated macrophages that have transformed from a phagocytic form to a secretory form. They have abundant pale pink cytoplasm, vesicular nuclei, and indistinct cell borders. They may fuse to form Langhans giant cells (horseshoe nuclei) or foreign body giant cells. Granulomas form when the immune system cannot clear an antigen (TB, sarcoidosis, fungal, foreign body).",
    category: "Infectious Disease",
  },
  {
    id: 48,
    imageUrl: IMG.tb,
    question: "Non-caseating granulomas (without central necrosis) are the hallmark of which condition?",
    options: [
      "Tuberculosis",
      "Sarcoidosis",
      "Histoplasmosis",
      "Wegener's granulomatosis (GPA)",
    ],
    correctIndex: 1,
    explanation: "Sarcoidosis is the classic cause of non-caseating (non-necrotising) granulomas — compact, tight granulomas WITHOUT central caseation. TB causes caseating granulomas (cheesy necrosis centre). Sarcoidosis can affect any organ (lung, lymph nodes, skin, eye, heart). Diagnosis is one of exclusion — non-caseating granulomas + negative cultures for organisms + raised ACE levels. African and Caribbean patients have higher sarcoidosis prevalence.",
    category: "Infectious Disease",
  },

  // ── ZN Stain (extra) ──────────────────────────────────────────────────────
  {
    id: 49,
    imageUrl: IMG.zn,
    question: "Which organisms other than Mycobacterium tuberculosis are acid-fast on ZN staining?",
    options: [
      "Streptococcus pneumoniae and Staphylococcus aureus",
      "Nocardia (weakly acid-fast), Cryptosporidium oocysts, non-tuberculous mycobacteria (NTM)",
      "Candida species and Aspergillus",
      "Gram-negative enteric bacteria",
    ],
    correctIndex: 1,
    explanation: "Acid-fastness is not unique to M. tuberculosis. Other acid-fast organisms: NTM (M. avium-intracellulare in HIV patients, M. leprae); Nocardia (partially/weakly acid-fast with modified ZN); Cryptosporidium and Isospora oocysts (modified ZN in stool). This is clinically important — a positive ZN smear does not always mean TB, especially in immunocompromised patients where NTM disseminated infection is common.",
    category: "Infectious Disease",
  },
  {
    id: 50,
    imageUrl: IMG.zn,
    question: "GeneXpert MTB/RIF detects M. tuberculosis and rifampicin resistance. What does rifampicin resistance predict?",
    options: [
      "Susceptibility to all second-line TB drugs",
      "MDR-TB (multi-drug resistant TB) — also resistant to isoniazid in >90% of cases",
      "Resistance to ethambutol only",
      "Pre-XDR-TB requiring no further testing",
    ],
    correctIndex: 1,
    explanation: "Rifampicin resistance detected by GeneXpert is a proxy for MDR-TB because >90% of rifampicin-resistant isolates are also isoniazid-resistant. MDR-TB requires 18-24 months of second-line treatment (bedaquiline, linezolid, fluoroquinolones). XDR-TB (extensively drug-resistant) is additionally resistant to fluoroquinolones and injectable agents. Nigeria and South Africa have high MDR-TB burdens.",
    category: "Infectious Disease",
  },

  // ── Hodgkin Lymphoma (extra) ──────────────────────────────────────────────
  {
    id: 51,
    imageUrl: IMG.hodgkin,
    question: "What is the IHC profile of Reed-Sternberg cells in Classical Hodgkin Lymphoma?",
    options: [
      "CD20+, CD3−, BCL2+",
      "CD30+, CD15+, CD20−, PAX5 weak+",
      "CD3+, CD4+, CD8−",
      "CD10+, BCL6+, MUM1−",
    ],
    correctIndex: 1,
    explanation: "Reed-Sternberg cells in Classical Hodgkin Lymphoma are: CD30+ (strong membranous, marks activated lymphoid cells — target of brentuximab vedotin), CD15+ (myeloid/Reed-Sternberg marker), CD20− (distinguishes from B cell NHL), PAX5 weak+ (residual B cell identity). This IHC profile is essential to confirm diagnosis and separate from anaplastic large cell lymphoma (CD30+, ALK+, CD15−).",
    category: "Haematology",
  },
  {
    id: 52,
    imageUrl: IMG.hodgkin,
    question: "Which chemotherapy regimen is standard first-line treatment for Classical Hodgkin Lymphoma?",
    options: ["CHOP (cyclophosphamide, doxorubicin, vincristine, prednisolone)", "ABVD (adriamycin, bleomycin, vinblastine, dacarbazine)", "R-CHOP (rituximab + CHOP)", "BEP (bleomycin, etoposide, cisplatin)"],
    correctIndex: 1,
    explanation: "ABVD is the standard first-line regimen for Classical Hodgkin Lymphoma and achieves >85% cure rate in early-stage disease. Rituximab (R) is NOT added because RS cells are CD20−. R-CHOP is for B cell NHL (DLBCL, follicular lymphoma). BEP is for germ cell tumours. Hodgkin lymphoma is one of the most curable malignancies, even in advanced stage, making accurate histological diagnosis critical.",
    category: "Haematology",
  },

  // ── ccRCC (extra) ─────────────────────────────────────────────────────────
  {
    id: 53,
    imageUrl: IMG.ccrcc,
    question: "Loss of which gene is the molecular hallmark of clear cell renal cell carcinoma?",
    options: ["BRCA1", "VHL (Von Hippel-Lindau) on chromosome 3p", "RB1", "APC"],
    correctIndex: 1,
    explanation: "VHL gene loss/mutation occurs in ~90% of sporadic ccRCC. VHL protein normally targets HIF-1α for degradation. Without VHL, HIF-1α accumulates, driving VEGF and PDGF overexpression → angiogenesis. This explains the rich vascularity of ccRCC and the success of anti-VEGF therapy (sunitinib, pazopanib, sorafenib). Hereditary VHL disease predisposes to bilateral ccRCC, haemangioblastomas, and phaeochromocytoma.",
    category: "Nephrology",
  },
  {
    id: 54,
    imageUrl: IMG.ccrcc,
    question: "Which IHC markers are used to confirm renal cell carcinoma origin?",
    options: [
      "CK20+, CDX2+",
      "PAX8+, CD10+, RCC antigen+",
      "TTF-1+, Napsin A+",
      "HepPar-1+, Arginase-1+",
    ],
    correctIndex: 1,
    explanation: "RCC IHC panel: PAX8 (renal/Müllerian transcription factor — highly sensitive), CD10 (brush border proximal tubule marker), and RCC antigen. vimentin positivity and CK7 negativity support ccRCC. This panel distinguishes RCC from metastatic lung, colorectal, and hepatocellular carcinomas. PAX8 is also expressed in thyroid and Müllerian tumours but the clinical context usually resolves ambiguity.",
    category: "Nephrology",
  },

  // ── Chronic Hepatitis B (extra) ───────────────────────────────────────────
  {
    id: 55,
    imageUrl: IMG.hepB,
    question: "Which special stain confirms HBsAg accumulation in ground glass hepatocytes?",
    options: ["PAS (Periodic Acid-Schiff)", "Orcein or Shikata stain", "Ziehl-Neelsen", "Congo Red"],
    correctIndex: 1,
    explanation: "Orcein stain (or Shikata stain) selectively stains HBsAg-containing smooth ER in ground glass hepatocytes a dark brown colour. This is used when H&E shows ground glass appearance to confirm HBV. PAS stains glycogen and alpha-1 antitrypsin globules; ZN stains acid-fast bacteria; Congo Red stains amyloid (apple-green birefringence under polarised light).",
    category: "Hepatology",
  },
  {
    id: 56,
    imageUrl: IMG.hepB,
    question: "Chronic Hepatitis B is the leading cause of which malignancy worldwide?",
    options: [
      "Cholangiocarcinoma",
      "Hepatocellular carcinoma (HCC)",
      "Gastric adenocarcinoma",
      "Pancreatic ductal adenocarcinoma",
    ],
    correctIndex: 1,
    explanation: "Chronic HBV is the single largest cause of hepatocellular carcinoma (HCC) globally, accounting for ~50% of cases — predominantly via cirrhosis but also direct oncogenic mechanisms (HBx protein integration into host genome). Sub-Saharan Africa and East Asia have the highest HBV prevalence and HCC burden. HBV vaccination (given at birth) has dramatically reduced HCC incidence in vaccinated populations. Surveillance ultrasound + AFP every 6 months is recommended in chronic HBV.",
    category: "Hepatology",
  },

  // ── Colorectal Adenocarcinoma (extra) ─────────────────────────────────────
  {
    id: 57,
    imageUrl: IMG.crc,
    question: "Lynch syndrome (HNPCC) is caused by mutations in which genes?",
    options: [
      "APC and KRAS",
      "MLH1, MSH2, MSH6, PMS2 — DNA mismatch repair genes",
      "TP53 and BRCA1",
      "VHL and PTEN",
    ],
    correctIndex: 1,
    explanation: "Lynch syndrome is caused by germline mutations in DNA mismatch repair (MMR) genes — MLH1, MSH2, MSH6, PMS2. This leads to microsatellite instability (MSI-H), which can be tested by IHC (loss of MMR protein expression) or PCR. Lynch-associated colorectal cancers tend to be right-sided, mucinous, poorly differentiated, with heavy tumour-infiltrating lymphocytes. Importantly, MSI-H tumours have excellent responses to PD-1 checkpoint inhibitors (pembrolizumab).",
    category: "Gastroenterology",
  },
  {
    id: 58,
    imageUrl: IMG.crc,
    question: "The adenoma-carcinoma sequence in colorectal cancer begins with mutation of which gene?",
    options: ["KRAS", "TP53", "APC (adenomatous polyposis coli)", "SMAD4"],
    correctIndex: 2,
    explanation: "The Fearon-Vogelstein model of colorectal carcinogenesis begins with APC mutation (loss of tumour suppressor function → uncontrolled Wnt/β-catenin signalling → adenoma formation). Subsequent mutations accumulate: KRAS activation → SMAD4 loss → TP53 loss → invasive carcinoma. Familial adenomatous polyposis (FAP) results from germline APC mutation, causing hundreds of colonic polyps and near-certain CRC by age 40. APC testing is part of hereditary CRC workup.",
    category: "Gastroenterology",
  },

  // ── Myocardial Infarction ─────────────────────────────────────────────────
  {
    id: 59,
    imageUrl: IMG.mi,
    question: "At 48 hours post-infarction, which inflammatory cells predominate in the necrotic zone?",
    options: ["Lymphocytes", "Eosinophils", "Neutrophils (peak 24–72 hours)", "Macrophages"],
    correctIndex: 2,
    explanation: "Neutrophils peak at 24–72 hours. Timeline: 0–6 hrs — contraction bands, coagulative necrosis, no cellular infiltrate; 6–24 hrs — neutrophil invasion begins; 24–72 hrs — peak neutrophilia; day 3–7 — macrophages replace neutrophils; week 1–2 — granulation tissue; week 3+ — scar formation. The timing has forensic pathology implications for estimating time of death.",
    category: "Cardiology",
  },
  {
    id: 60,
    imageUrl: IMG.mi,
    question: "Coagulative necrosis in the myocardium means:",
    options: [
      "Complete dissolution of cell outlines by enzymatic lysis",
      "Cell outlines are preserved as 'ghost' outlines despite nuclear loss — architecture maintained",
      "Fat saponification with chalky white deposits",
      "Liquefaction with pus formation",
    ],
    correctIndex: 1,
    explanation: "Coagulative necrosis preserves the structural 'ghost' outlines of cardiomyocytes despite nuclear loss and cytoplasmic eosinophilia, because cardiac muscle proteins denature rather than undergo enzymatic dissolution. This is unique to ischaemic injury in the heart (and other organs except the brain). Brain ischaemia → liquefactive necrosis because of high enzyme content. The preserved architecture helps pathologists identify the infarcted zone days later.",
    category: "Cardiology",
  },

  // ── Atherosclerosis ───────────────────────────────────────────────────────
  {
    id: 61,
    imageUrl: IMG.atheroma,
    question: "Foam cells in an atherosclerotic plaque are derived from which cell type?",
    options: ["Endothelial cells", "Smooth muscle cells", "Macrophages that have ingested oxidised LDL", "Platelets"],
    correctIndex: 2,
    explanation: "Foam cells are lipid-laden macrophages. Endothelial injury allows LDL to enter the intima, where it is oxidised. Monocytes (recruited by MCP-1) differentiate into macrophages, ingest ox-LDL via scavenger receptors (SR-A, CD36), and become foam cells. This is the core of the fatty streak. Smooth muscle cells can also become foam cells in advanced plaques. The term 'foam' refers to their bubbly lipid-filled cytoplasm.",
    category: "Cardiology",
  },
  {
    id: 62,
    imageUrl: IMG.atheroma,
    question: "A vulnerable (unstable) atherosclerotic plaque is characterised by:",
    options: [
      "A thick fibrous cap with minimal lipid core",
      "A thin fibrous cap with a large lipid core and many inflammatory cells",
      "Dense calcification throughout the plaque",
      "Complete occlusion of the arterial lumen",
    ],
    correctIndex: 1,
    explanation: "Vulnerable plaques rupture to cause acute MI/stroke. Features of vulnerability: thin fibrous cap (<65 μm), large soft lipid core (>40% of plaque volume), abundant macrophages/foam cells releasing proteases (MMPs that digest the cap), few smooth muscle cells (which normally make collagen to strengthen the cap). Paradoxically, TIMI studies showed that most MIs occur from plaques causing <50% stenosis — vulnerable not flow-limiting plaques.",
    category: "Cardiology",
  },

  // ── Glioblastoma ──────────────────────────────────────────────────────────
  {
    id: 63,
    imageUrl: IMG.gbm,
    question: "Pseudopalisading necrosis in GBM involves tumour cells arranged in lines around central necrosis. What drives this pattern?",
    options: [
      "Random cell death from chemotherapy",
      "Tumour cells actively migrating away from a hypoxic necrotic centre",
      "Normal apoptosis of glial cells",
      "Inflammatory infiltrate destroying the tumour centre",
    ],
    correctIndex: 1,
    explanation: "Pseudopalisading represents dynamic tumour cell migration. The necrotic centre is hypoxic. Tumour cells upregulate HIF-1α → VEGF → angiogenesis, but also migrate away from the hypoxic zone. The 'palisade' is the advancing wave of migrating cells at the edge of necrosis. This is why GBM has chaotic vasculature and recurs at the margins — cells at the palisade are migrating INTO normal brain.",
    category: "Neuropathology",
  },
  {
    id: 64,
    imageUrl: IMG.gbm,
    question: "MGMT promoter methylation in GBM is clinically significant because it:",
    options: [
      "Causes chemotherapy resistance to temozolomide",
      "Predicts better response to temozolomide — MGMT is silenced, cannot repair DNA alkylation",
      "Indicates IDH mutation",
      "Is a target for immunotherapy",
    ],
    correctIndex: 1,
    explanation: "MGMT (O⁶-methylguanine-DNA methyltransferase) repairs alkylated DNA damage. Temozolomide alkylates DNA. If MGMT is active (unmethylated promoter), it repairs the damage → resistance. If MGMT promoter is methylated (silenced) → MGMT not produced → temozolomide works. ~40% of GBMs are MGMT-methylated and respond better to temozolomide + radiotherapy. Testing MGMT is now mandatory in every GBM.",
    category: "Neuropathology",
  },

  // ── Papillary Thyroid Carcinoma ────────────────────────────────────────────
  {
    id: 65,
    imageUrl: IMG.ptc,
    question: "The 'Orphan Annie eye' nuclei in PTC are caused by:",
    options: [
      "Mucin accumulation in the nucleus",
      "Chromatin margination to the nuclear membrane creating an optically clear centre",
      "Viral cytopathic inclusion bodies",
      "Glycogen deposition",
    ],
    correctIndex: 1,
    explanation: "Orphan Annie nuclei are the pathognomonic feature of PTC. Chromatin clears from the centre and marginalises to the nuclear membrane, creating a 'ground-glass' or empty appearance — named after the blank pupils in the comic strip character. This is a fixation-dependent artefact amplified in formalin-fixed tissue. Other PTC nuclear features: grooves (longitudinal folds), pseudo-inclusions (cytoplasm herniated into nucleus). All three together = diagnostic.",
    category: "Endocrinology",
  },
  {
    id: 66,
    imageUrl: IMG.ptc,
    question: "Which molecular alteration is found in ~60% of papillary thyroid carcinomas and is targetable?",
    options: ["RET/PTC rearrangement", "BRAF V600E point mutation", "RAS mutation", "PTEN deletion"],
    correctIndex: 1,
    explanation: "BRAF V600E is the most common mutation in PTC (~60%), causing constitutive MAPK pathway activation. RET/PTC rearrangements occur in ~20% (more in radiation-associated PTC). RAS mutations are more common in follicular variant PTC and follicular carcinoma. BRAF V600E can be detected on FNA cytology, helps risk-stratify patients. Dabrafenib + trametinib (BRAF + MEK inhibitors) are approved for radioiodine-refractory BRAF V600E-mutant thyroid cancer.",
    category: "Endocrinology",
  },

  // ── Melanoma ──────────────────────────────────────────────────────────────
  {
    id: 67,
    imageUrl: IMG.melanoma,
    question: "Breslow thickness determines melanoma staging. Which measurement below has the most significant prognostic impact?",
    options: [
      "0.5 mm — excellent prognosis, 5-year survival >95%",
      "2.5 mm — intermediate risk, sentinel node biopsy mandatory",
      "The Breslow depth alone is sufficient; other factors (ulceration, mitoses) are irrelevant",
      "Breslow thickness only matters above 4 mm",
    ],
    correctIndex: 1,
    explanation: "Breslow thickness is measured from the top of the granular layer to the deepest tumour cell. <1mm: T1, excellent prognosis. 1-2mm: T2, sentinel node biopsy. 2-4mm: T3, high risk. >4mm: T4, systemic spread common. BUT ulceration upstages the tumour (T1b, T2b), and mitotic rate >1/mm² in T1 tumours also upstages. The combination of Breslow + ulceration + mitoses + satellite lesions determines the final pT stage.",
    category: "Dermatology",
  },
  {
    id: 68,
    imageUrl: IMG.melanoma,
    question: "Malignant melanoma differs from a benign compound naevus histologically because:",
    options: [
      "It has more melanin pigment",
      "It shows lack of maturation with descent, pagetoid spread, and nuclear atypia with mitoses",
      "It involves only the epidermis",
      "It has fewer melanocytes than a naevus",
    ],
    correctIndex: 1,
    explanation: "Key malignant features: (1) Lack of maturation — naevus cells become smaller as they go deeper (mature); melanoma cells remain large/atypical throughout. (2) Pagetoid spread — single atypical melanocytes scattered through epidermis above the main tumour ('buckshot' pattern). (3) Cytological atypia — large nuclei, prominent eosinophilic nucleoli. (4) Mitoses in dermis — particularly at the base. (5) No sharp lateral demarcation.",
    category: "Dermatology",
  },

  // ── Basal Cell Carcinoma ──────────────────────────────────────────────────
  {
    id: 69,
    imageUrl: IMG.bcc,
    question: "Peripheral palisading in BCC means:",
    options: [
      "Tumour cells arranged in concentric whorls like meningioma",
      "The outermost row of basaloid cells in each nest aligns perpendicularly, resembling fence posts",
      "Central necrosis surrounded by rows of tumour cells",
      "Calcification at the periphery of nests",
    ],
    correctIndex: 1,
    explanation: "Peripheral nuclear palisading is the hallmark of BCC. The outermost cells of each tumour nest are vertically oriented with their long axis perpendicular to the nest edge — like the upright boards of a fence (palisade). This resembles the basal cell layer of normal epidermis from which BCC arises (hair follicle outer root sheath). Stromal retraction artefact (cleft between nest and stroma) is an additional characteristic feature of BCC.",
    category: "Dermatology",
  },

  // ── DCIS ──────────────────────────────────────────────────────────────────
  {
    id: 70,
    imageUrl: IMG.dcis,
    question: "Which single histological feature confirms DCIS is in situ (not invasive)?",
    options: [
      "Presence of mitotic figures",
      "Intact basement membrane with preserved myoepithelial cell layer surrounding ducts",
      "ER positivity",
      "Comedo necrosis within duct lumen",
    ],
    correctIndex: 1,
    explanation: "The defining feature of in situ carcinoma is an intact basement membrane — malignant cells have NOT breached it. The myoepithelial cell layer (p63+, SMA+, CK5/6+) surrounding each duct confirms basement membrane integrity. Loss of myoepithelium + basement membrane breach = invasion. Comedo necrosis indicates high-grade DCIS but is still in situ. IHC for p63 and SMA is routinely used on needle biopsies to confirm or exclude invasion.",
    category: "Oncology",
  },

  // ── Prostate Adenocarcinoma ────────────────────────────────────────────────
  {
    id: 71,
    imageUrl: IMG.prostate,
    question: "The Gleason grading system scores prostate cancer based on:",
    options: [
      "Nuclear size and chromatin pattern",
      "Glandular architecture patterns (1–5 per dominant and secondary pattern), summed as a score",
      "Mitotic count per 10 HPF",
      "Depth of invasion through the prostatic capsule",
    ],
    correctIndex: 1,
    explanation: "Gleason score = primary pattern + secondary pattern (each 1–5 based on glandular architecture). Pattern 3 = discrete well-formed glands. Pattern 4 = fused glands, cribriform. Pattern 5 = sheets/cords/single cells, no gland formation. Grade Group 1 = Gleason 6 (3+3), best. Grade Group 5 = Gleason 9-10, worst. The Gleason score has replaced individual patterns for reporting — always report as Grade Group 1-5.",
    category: "Urology",
  },
  {
    id: 72,
    imageUrl: IMG.prostate,
    question: "AMACR (P504S) IHC in prostate biopsies is used to:",
    options: [
      "Mark benign basal cells to confirm a gland is benign",
      "Confirm malignancy in atypical small acini — AMACR is positive in adenocarcinoma but negative in benign glands",
      "Grade the tumour by Gleason pattern",
      "Detect HER2 overexpression for targeted therapy",
    ],
    correctIndex: 1,
    explanation: "AMACR (alpha-methylacyl-CoA racemase, clone P504S) is an enzyme overexpressed in prostatic adenocarcinoma and high-grade PIN. It is used alongside p63 and CK903 (basal cell markers) in a triple IHC panel: AMACR+ / p63− / CK903− = adenocarcinoma (no basal cells + racemase expression). AMACR+ / p63+ = high-grade PIN. This panel resolves atypical small acinar proliferations (ASAP) on needle biopsy.",
    category: "Urology",
  },

  // ── Wilms Tumour ──────────────────────────────────────────────────────────
  {
    id: 73,
    imageUrl: IMG.wilms,
    question: "Which three histological components make Wilms tumour 'triphasic'?",
    options: [
      "Papillary + tubular + solid components",
      "Blastemal (small round blue cells) + stromal (spindle cells) + epithelial (primitive tubules)",
      "Squamous + glandular + neuroendocrine",
      "Chromophobe + clear cell + papillary",
    ],
    correctIndex: 1,
    explanation: "The classic triphasic pattern of nephroblastoma: (1) Blastemal — dense sheets of small round blue cells resembling embryonic metanephric blastema; (2) Stromal — loose myxoid or fibrous spindle cells (mesenchymal component); (3) Epithelial — abortive tubules and glomeruloid structures (recapitulating early nephrogenesis). Not all Wilms tumours are triphasic — monophasic variants occur. The presence of anaplasia (marked nuclear enlargement, atypical mitoses) is the most important adverse prognostic feature.",
    category: "Paediatric Pathology",
  },
  {
    id: 74,
    imageUrl: IMG.wilms,
    question: "Wilms tumour (nephroblastoma) is associated with which congenital syndromes?",
    options: [
      "Down syndrome (trisomy 21) and Turner syndrome",
      "WAGR syndrome (Wilms, Aniridia, GU anomalies, intellectual disability) and Beckwith-Wiedemann syndrome",
      "VHL syndrome and MEN2",
      "NF1 and NF2",
    ],
    correctIndex: 1,
    explanation: "WAGR syndrome: chromosome 11p13 deletion encompassing WT1 and PAX6 genes → Wilms tumour + aniridia + genitourinary anomalies + intellectual disability. Beckwith-Wiedemann syndrome: chromosome 11p15 imprinting defect → overgrowth, macroglossia, omphalocele, Wilms tumour (5% risk), hepatoblastoma. WT1 mutation also predisposes to Denys-Drash syndrome (male pseudohermaphroditism + diffuse mesangial sclerosis → Wilms). Genetic screening is recommended for all Wilms patients.",
    category: "Paediatric Pathology",
  },

  // ── Diabetic Nephropathy ──────────────────────────────────────────────────
  {
    id: 75,
    imageUrl: IMG.kw,
    question: "Kimmelstiel-Wilson nodules in diabetic nephropathy are:",
    options: [
      "Immune complex deposits identified by immunofluorescence",
      "Pathognomonic nodular mesangial matrix deposits of collagen and laminin in the glomerulus",
      "Inflammatory granulomas in the interstitium",
      "Calcium oxalate crystals in tubules",
    ],
    correctIndex: 1,
    explanation: "K-W nodules are the hallmark of nodular glomerulosclerosis in DM. They are ovoid PAS-positive nodules of laminin and type IV collagen in the glomerular mesangium, formed by excess extracellular matrix production driven by chronic hyperglycaemia → TGF-β activation → mesangial expansion. They are seen in ~15–20% of type 1 DM patients after years of poor control. Pathognomonic: NO other disease causes identical nodules (though light chain deposition disease can mimic).",
    category: "Nephrology",
  },

  // ── HCC ───────────────────────────────────────────────────────────────────
  {
    id: 76,
    imageUrl: IMG.hcc,
    question: "Which IHC marker is most specific for hepatocellular carcinoma?",
    options: ["AFP", "HepPar-1", "Arginase-1", "GPC3 (Glypican-3)"],
    correctIndex: 2,
    explanation: "Arginase-1 is the most specific IHC marker for hepatocellular differentiation, with ~96% specificity for HCC. HepPar-1 is commonly used but less specific (also positive in some gastric and lung tumours). GPC3 (Glypican-3) is positive in malignant but NOT benign hepatocytes — useful to distinguish HCC from dysplastic nodules. AFP is elevated in serum in ~70% of HCC but is not reliable for tissue diagnosis. The panel Arginase-1 + GPC3 + HepPar-1 covers most cases.",
    category: "Hepatology",
  },
  {
    id: 77,
    imageUrl: IMG.hcc,
    question: "Bile production (green pigment) within tumour cells in HCC is:",
    options: [
      "A non-specific finding in any liver disease",
      "Pathognomonic for hepatocellular differentiation — no other carcinoma makes bile",
      "Evidence of cholangiocarcinoma (bile duct origin)",
      "An artefact of formalin fixation",
    ],
    correctIndex: 1,
    explanation: "Bile (green or brown canalicular pigment) within tumour cells is the single most specific histological feature of HCC. Only hepatocytes make bile — no other carcinoma can. Finding intracellular or canalicular bile in a liver tumour confirms HCC even without IHC. Other supporting features: trabecular growth pattern (plates >3 cells wide), sinusoidal vasculature, pseudoglandular (acinar) pattern. Cholangiocarcinoma arises from bile duct epithelium → mucin production, not bile.",
    category: "Hepatology",
  },

  // ── DLBCL ─────────────────────────────────────────────────────────────────
  {
    id: 78,
    imageUrl: IMG.dlbcl,
    question: "The Hans classifier distinguishes GCB from non-GCB DLBCL using which IHC markers?",
    options: [
      "CD20, CD3, CD5",
      "CD10, BCL6, MUM1",
      "Ki-67, BCL2, MYC",
      "CD30, CD15, PAX5",
    ],
    correctIndex: 1,
    explanation: "Hans classifier: CD10+ → GCB. CD10− + BCL6+ + MUM1− → GCB. CD10− + BCL6− → non-GCB. CD10− + BCL6+ + MUM1+ → non-GCB. GCB (germinal centre B-cell) = better prognosis, BCL2 translocation common. Non-GCB (activated B-cell/ABC) = worse prognosis, NF-κB activation, ibrutinib-sensitive. This distinction influences clinical trial enrollment and emerging targeted therapy strategies. Always run the full Hans panel on DLBCL biopsies.",
    category: "Haematology",
  },

  // ── Multiple Myeloma ──────────────────────────────────────────────────────
  {
    id: 79,
    imageUrl: IMG.myeloma,
    question: "The CRAB criteria define symptomatic myeloma requiring treatment. What does CRAB stand for?",
    options: [
      "Coagulation abnormality, Renal calculi, Anaemia, Bone marrow failure",
      "hyperCalcaemia, Renal failure, Anaemia, Bone lesions (lytic)",
      "Cytopenia, Raised paraprotein, Amyloidosis, Bleeding",
      "Creatinine rise, Radicular pain, Alkalosis, Bone pain",
    ],
    correctIndex: 1,
    explanation: "CRAB = Calcium >2.75 mmol/L, Renal failure (creatinine >177 μmol/L), Anaemia (Hb <100 g/L), Bone lesions (lytic lesions, osteoporosis, fractures). ANY one CRAB criterion = symptomatic myeloma requiring systemic therapy. Modern 'SLiM-CRAB' also includes: 60% plasma cells, Light chain ratio >100, >1 focal lesion on MRI — treating earlier to prevent end-organ damage.",
    category: "Haematology",
  },

  // ── Osteosarcoma ─────────────────────────────────────────────────────────
  {
    id: 80,
    imageUrl: IMG.osteoSarc,
    question: "The diagnostic criterion for osteosarcoma is:",
    options: [
      "Cortical bone destruction on X-ray",
      "Direct production of osteoid (immature bone matrix) by malignant tumour cells",
      "Periosteal reaction (Codman's triangle or sunburst)",
      "Elevated serum alkaline phosphatase",
    ],
    correctIndex: 1,
    explanation: "Osteosarcoma = malignant tumour in which the neoplastic cells directly produce osteoid (unmineralised bone matrix). This is THE histological diagnostic criterion — confirmed by seeing pink woven osteoid laid down by pleomorphic malignant cells. This distinguishes it from: chondrosarcoma (produces cartilage), Ewing sarcoma (no matrix), giant cell tumour (no osteoid production by tumour cells). X-ray features (Codman's triangle, sunburst) are suggestive but not diagnostic — biopsy and histology are required.",
    category: "Musculoskeletal",
  },

  // ── Crohn's Disease ───────────────────────────────────────────────────────
  {
    id: 81,
    imageUrl: IMG.crohn,
    question: "Which feature on histology distinguishes Crohn's disease from ulcerative colitis?",
    options: [
      "Crypt distortion and chronic inflammation",
      "Transmural inflammation with non-caseating granulomas and submucosal lymphoid aggregates",
      "Surface erosions and goblet cell depletion",
      "Active cryptitis with crypt abscesses",
    ],
    correctIndex: 1,
    explanation: "Crohn's vs UC histologically: Crohn's = transmural (all layers), non-caseating granulomas (~60%), skip lesions, submucosal and subserosal lymphoid aggregates, fissuring ulcers, any GI segment. UC = mucosal only, no granulomas, continuous from rectum, crypt distortion, diffuse active cryptitis. In practice on biopsy, distinguishing them requires multiple level sections and correlation with endoscopy and radiology — ~10% are 'IBD unclassified'.",
    category: "Gastroenterology",
  },

  // ── CIN3 / Cervical ────────────────────────────────────────────────────────
  {
    id: 82,
    imageUrl: IMG.cin3,
    question: "p16 IHC shows strong block-positive staining in CIN3. What does this indicate?",
    options: [
      "Normal p16 expression indicating low-risk HPV",
      "Surrogate marker for high-risk HPV integration — E7 oncoprotein inactivates Rb, driving p16 overexpression",
      "Pre-existing p53 mutation",
      "Marker of squamous metaplasia",
    ],
    correctIndex: 1,
    explanation: "p16 (CDKN2A) is normally regulated by Rb. High-risk HPV E7 protein inactivates Rb → feedback causes p16 overexpression. Strong diffuse ('block') p16 positivity throughout the epithelium = high-risk HPV integration. p16 combined with Ki-67 (CINtec PLUS test) on cervical smears is more sensitive and specific than morphology alone for identifying CIN2+. Focal/weak p16 is non-specific. Block positivity = high-risk = treat.",
    category: "Gynaecology",
  },

  // ── Fibroadenoma ──────────────────────────────────────────────────────────
  {
    id: 83,
    imageUrl: IMG.fibroaden,
    question: "What distinguishes a fibroadenoma from a phyllodes tumour histologically?",
    options: [
      "Fibroadenoma has more epithelium; phyllodes has more stroma",
      "Phyllodes tumour has a hypercellular stroma, leaf-like fronds, stromal overgrowth, and mitoses; fibroadenoma has bland paucicellular stroma",
      "They are histologically identical — only clinical size differentiates them",
      "Phyllodes tumour lacks any epithelial component",
    ],
    correctIndex: 1,
    explanation: "The key distinguishing features of phyllodes tumour vs fibroadenoma: (1) Stromal hypercellularity — dense cellularity around ducts; (2) Leaf-like fronds projecting into dilated ducts; (3) Stromal overgrowth (any low-power field with stroma only, no epithelium); (4) Mitoses >4/10 HPF (borderline) or >10/10 HPF (malignant). Any large breast fibroepithelial lesion (>3cm) warrants excision to exclude phyllodes. Malignant phyllodes can metastasise via blood.",
    category: "Oncology",
  },

  // ── Rheumatic Heart Disease ───────────────────────────────────────────────
  {
    id: 84,
    imageUrl: IMG.rheumatic,
    question: "A 14-year-old Nigerian girl presents with fever, migratory polyarthritis, and a new cardiac murmur 3 weeks after a sore throat. This myocardial biopsy shows characteristic inflammatory nodules. What are these pathognomonic lesions called?",
    options: [
      "Aschoff bodies — granulomatous nodules with central fibrinoid necrosis and Anitschkow cells",
      "Granulomas — caseating, with central necrosis and Langhans giant cells",
      "Lewy bodies — eosinophilic intracytoplasmic inclusions in neurons",
      "Russell bodies — immunoglobulin aggregates in plasma cells",
    ],
    correctIndex: 0,
    explanation: "Aschoff bodies are the pathognomonic lesion of rheumatic fever (RF). They consist of central fibrinoid necrosis surrounded by Anitschkow cells (activated macrophages with caterpillar/owl-eye nuclei) and lymphocytes. RF is triggered by Group A Streptococcus (GAS) pharyngitis via molecular mimicry — streptococcal M protein mimics cardiac myosin, triggering autoimmune valve damage. The mitral valve is most commonly affected. Penicillin prophylaxis prevents recurrence.",
    category: "Cardiology",
  },
  {
    id: 85,
    imageUrl: IMG.rheumatic,
    question: "A 28-year-old woman with a history of rheumatic fever in childhood presents with progressive exertional dyspnoea and an opening snap with a mid-diastolic rumble at the apex. Which pathological process underlies her valvular disease?",
    options: [
      "Infective endocarditis — vegetation formation on the valve leaflets",
      "Fibrous thickening and fusion of mitral valve leaflets and chordae — causing mitral stenosis",
      "Calcific degeneration of the aortic valve — age-related wear",
      "Myxomatous degeneration — collagen replacement by proteoglycans",
    ],
    correctIndex: 1,
    explanation: "Chronic rheumatic heart disease causes fibrous thickening, fusion of commissures (leaflet edges), and shortening and thickening of chordae tendineae — producing the classic 'fish mouth' mitral orifice of mitral stenosis. The mid-diastolic rumble and opening snap are auscultatory hallmarks of MS. Mitral stenosis → left atrial enlargement → AF → thromboembolic stroke. Mitral valve is affected in >95% of rheumatic cases; tricuspid and aortic in fewer.",
    category: "Cardiology",
  },

  // ── Oesophageal Adenocarcinoma ────────────────────────────────────────────
  {
    id: 86,
    imageUrl: IMG.oesophageal,
    question: "A 58-year-old obese man with a 15-year history of GORD presents with progressive dysphagia, first to solids then liquids, and a 12 kg weight loss. Endoscopy reveals an ulcerated mass at the gastro-oesophageal junction. This biopsy shows irregular malignant glands in desmoplastic stroma adjacent to intestinal metaplasia. What is the precursor lesion?",
    options: [
      "Squamous dysplasia from chronic alcohol and smoking exposure",
      "Barrett's oesophagus — columnar intestinal metaplasia replacing normal squamous epithelium due to chronic acid reflux",
      "Helicobacter pylori-associated intestinal metaplasia of the gastric cardia",
      "Achalasia-related mucosal dysplasia from food stasis",
    ],
    correctIndex: 1,
    explanation: "Barrett's oesophagus is chronic GORD → columnar (intestinal) metaplasia of the lower oesophageal mucosa. The sequence: GORD → Barrett's → low-grade dysplasia → high-grade dysplasia → oesophageal adenocarcinoma (years to decades). Risk factors: obesity, GORD, white males. Goblet cells (intestinal metaplasia) adjacent to the tumour confirm Barrett's origin. HER2 testing is mandatory — trastuzumab improves survival in HER2+ metastatic disease.",
    category: "Gastroenterology",
  },
  {
    id: 87,
    imageUrl: IMG.oesophageal,
    question: "On IHC of this oesophageal adenocarcinoma biopsy, the tumour is CK7+, CDX2+, and HER2 3+ by IHC. What is the clinical significance of the HER2 result?",
    options: [
      "HER2 positivity confirms colorectal primary — no treatment implication",
      "HER2 3+ indicates eligibility for trastuzumab (anti-HER2) therapy in combination with chemotherapy, improving overall survival",
      "HER2 positivity means the tumour is hormone receptor-driven and should receive tamoxifen",
      "HER2 is not tested in oesophageal cancers — result is irrelevant",
    ],
    correctIndex: 1,
    explanation: "HER2 (ERBB2) is overexpressed in ~20% of oesophagogastric adenocarcinomas. The ToGA trial demonstrated that adding trastuzumab (anti-HER2 monoclonal antibody) to platinum/fluoropyrimidine chemotherapy significantly improved overall survival in HER2+ metastatic oesophagogastric adenocarcinoma. HER2 testing (IHC + FISH if equivocal) is now mandatory at diagnosis. Newer HER2-directed agents (trastuzumab deruxtecan) have shown dramatic responses even in HER2-low tumours.",
    category: "Gastroenterology",
  },

  // ── Giant Cell Tumour of Bone ─────────────────────────────────────────────
  {
    id: 88,
    imageUrl: IMG.gctBone,
    question: "A 28-year-old woman presents with knee pain and swelling for 4 months. Plain X-ray shows an eccentric lytic lesion in the distal femoral epiphysis extending to the articular surface, with a 'soap bubble' appearance. This biopsy is shown. What is the diagnosis?",
    options: [
      "Osteosarcoma — malignant with osteoid matrix production",
      "Giant cell tumour of bone (GCT) — mononuclear stromal cells with evenly distributed osteoclast-like giant cells",
      "Aneurysmal bone cyst — blood-filled spaces lined by giant cells",
      "Chondrosarcoma — malignant cartilaginous matrix",
    ],
    correctIndex: 1,
    explanation: "Giant cell tumour of bone (GCT) occurs in the EPIPHYSIS of long bones (distal femur, proximal tibia) in adults aged 20–45 — a distinctive location that helps diagnosis. Histologically: uniform mononuclear stromal cells (oval nuclei, indistinct nucleoli) plus evenly distributed osteoclast-like giant cells (>20 nuclei per cell). H3F3A G34W mutation is pathognomonic (detected by IHC). RANKL expression drives osteoclast recruitment — basis for denosumab therapy.",
    category: "Musculoskeletal",
  },
  {
    id: 89,
    imageUrl: IMG.gctBone,
    question: "This giant cell tumour of bone is resected with curettage and bone grafting. The patient's oncologist mentions a targeted therapy to reduce recurrence risk if the tumour involves an unresectable site. Which agent — and its target — is used?",
    options: [
      "Imatinib targeting BCR-ABL1 kinase",
      "Denosumab targeting RANKL — blocking osteoclast activation driven by GCT stromal cell RANKL expression",
      "Rituximab targeting CD20 on stromal cells",
      "Sunitinib targeting VEGFR to reduce tumour vascularity",
    ],
    correctIndex: 1,
    explanation: "GCT stromal cells overexpress RANKL (receptor activator of NF-κB ligand), which recruits and activates osteoclast-like giant cells, causing bone destruction. Denosumab is an anti-RANKL monoclonal antibody that blocks this signalling. In unresectable or recurrent GCT, denosumab reduces the giant cell population and promotes new bone formation, often converting unresectable disease to resectable. Recurrence after curettage is ~20–50%; wide resection offers lower recurrence but greater morbidity.",
    category: "Musculoskeletal",
  },

  // ── Normal Bone Marrow ────────────────────────────────────────────────────
  {
    id: 90,
    imageUrl: IMG.boneMarrow,
    question: "A 68-year-old man presents with fatigue, bone pain, and a serum protein electrophoresis showing a monoclonal IgG peak (M-protein). A posterior iliac crest trephine biopsy is performed. Compared to this normal bone marrow, what pattern would confirm multiple myeloma?",
    options: [
      "A hypocellular marrow with fatty replacement",
      "Sheets of plasma cells replacing >10% of marrow cellularity, with abnormal CD138+, CD56+ monotypic plasma cells on IHC",
      "A hypercellular marrow with predominantly erythroid precursors",
      "Granuloma formation with caseating necrosis",
    ],
    correctIndex: 1,
    explanation: "Normal bone marrow cellularity = ~(100 − age)%, with trilineage haematopoiesis (myeloid, erythroid, megakaryocytic). Plasma cells comprise <5% normally. Multiple myeloma is diagnosed when: ≥10% clonal plasma cells in marrow (or biopsy-proven plasmacytoma) + CRAB criteria (hyperCalcaemia, Renal failure, Anaemia, Bone lesions) or biomarkers. IHC: CD138+, CD38+, monotypic κ or λ light chain restriction (kappa:lambda ratio >4:1 or <1:2). Cytogenetics guide treatment choice.",
    category: "Haematology",
  },
  {
    id: 91,
    imageUrl: IMG.boneMarrow,
    question: "A haematology registrar estimates the cellularity of this trephine biopsy and notes it is approximately 70% cellular. The patient is 30 years old. What does this suggest?",
    options: [
      "Hypocellular marrow — concerning for aplastic anaemia in a 30-year-old",
      "Normal cellularity for age — the rule 'cellularity ≈ 100 minus age' applies",
      "Markedly hypercellular marrow — suggests leukaemic infiltration",
      "The cellularity cannot be estimated from a trephine biopsy",
    ],
    correctIndex: 1,
    explanation: "A useful approximation: normal marrow cellularity = 100 minus the patient's age (±10%). A 30-year-old normally has ~70% cellular marrow. Deviation from expected: >20% above normal = hypercellular (reactive, leukaemia, polycythaemia vera); >20% below normal = hypocellular (aplastic anaemia, chemotherapy effect). In aplastic anaemia, the marrow is replaced by fat with only scattered lymphocytes — treatment includes immunosuppression ± stem cell transplantation.",
    category: "Haematology",
  },
];

type QuizState = "intro" | "answering" | "result" | "review";
type TimerMode  = "none" | "session" | "per-question";

// Free / expired  → 5 taster questions
// Trial / premium → 20 full questions
const FREE_LIMIT    = 5;
const PREMIUM_LIMIT = 20;

interface QuizModeProps {
  user: User | null;
  isPremium: boolean;
  isTrialing: boolean;
  /** If set, only show questions that belong to these flashcard IDs */
  filterFlashcardIds?: string[];
  /** Data from a personal analysed slide — used to generate questions on the fly */
  personalSlideData?: SlideQuizData;
  onUpgrade?: () => void;
  /** Called when the user wants to drop the filter and run the full quiz */
  onStartFullQuiz?: () => void;
  /** Called when the user wants to leave the quiz and go back to the main menu */
  onBack?: () => void;
}

export default function QuizMode({
  user,
  isPremium,
  isTrialing,
  filterFlashcardIds,
  personalSlideData,
  onUpgrade,
  onStartFullQuiz,
  onBack,
}: QuizModeProps) {
  const hasFullAccess = isPremium || isTrialing;
  const sessionLimit  = hasFullAccess ? PREMIUM_LIMIT : FREE_LIMIT;

  // Build the pool to draw from
  const pool = useMemo(() => {
    // Personal slide with quiz data → generate questions on the fly
    if (
      personalSlideData &&
      filterFlashcardIds?.length === 1 &&
      filterFlashcardIds[0].startsWith("user-")
    ) {
      return generateQuestionsFromSlide(personalSlideData);
    }
    // Built-in flashcard filter → return matching bank questions
    if (filterFlashcardIds?.length) {
      return QUESTION_BANK.filter(q => {
        const fid = IMG_TO_FLASHCARD[q.imageUrl];
        return fid && filterFlashcardIds.includes(fid);
      });
    }
    // Full bank
    return QUESTION_BANK;
  }, [filterFlashcardIds, personalSlideData]);

  const [quizState, setQuizState] = useState<QuizState>("intro");
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(() =>
    shuffle(pool).slice(0, Math.min(sessionLimit, pool.length)).map(shuffleOptions)
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  // Size matches actual question count — safe when pool is empty
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    Array(Math.min(sessionLimit, pool.length)).fill(null)
  );
  const [showExplanation, setShowExplanation] = useState(false);
  const [timerMode, setTimerMode]               = useState<TimerMode>("none");
  const [sessionMins, setSessionMins]           = useState(10);
  const [perQuestionSecs, setPerQuestionSecs]   = useState(120);
  const [sessionTimeLeft, setSessionTimeLeft]   = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [timedOut, setTimedOut]                 = useState(false);
  const [imageReady, setImageReady]             = useState(false);
  const [imageError, setImageError]             = useState(false);
  // Weak flashcard IDs for targeted quiz suggestion
  const [weakCardIds, setWeakCardIds]           = useState<string[]>([]);

  // Reset image flags whenever question changes
  useEffect(() => {
    setImageReady(false);
    setImageError(false);
  }, [currentIdx]);

  // During intro: preload first few images so Q1 is instant when quiz starts
  useEffect(() => {
    if (quizState !== "intro") return;
    activeQuestions.slice(0, 5).forEach(q => {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.src = quizImgSrc(q.imageUrl);
    });
  }, [quizState, activeQuestions]);

  // Preload next question's image so it's already cached on advance
  useEffect(() => {
    if (quizState !== "answering") return;
    const next = activeQuestions[currentIdx + 1];
    if (!next) return;
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.src = quizImgSrc(next.imageUrl);
  }, [currentIdx, quizState, activeQuestions]);

  // Fetch weak-area card IDs (last_quality ≤ 3 = Again or Hard) on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("flashcard_reviews")
      .select("card_id, last_quality")
      .eq("user_id", user.id)
      .lte("last_quality", 3)
      .then(({ data }) => {
        if (!data) return;
        const ids = data
          .map(r => r.card_id as string)
          .filter(id => !id.startsWith("user-")); // built-in cards only (have bank questions)
        setWeakCardIds(ids);
      });
  }, [user]);

  // When filter or personal slide data changes (quick quiz from flashcard), reset to intro
  useEffect(() => {
    if (filterFlashcardIds?.length) {
      const q = shuffle(pool).slice(0, Math.min(sessionLimit, pool.length)).map(shuffleOptions);
      setActiveQuestions(q);
      setAnswers(Array(q.length).fill(null));
      setCurrentIdx(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setQuizState("intro");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFlashcardIds?.join(","), personalSlideData?.diagnosis]);

  // Paywall gate — hits after FREE_LIMIT questions for non-premium users (only when pool is non-empty)
  const hitPaywall = pool.length > 0 && !hasFullAccess && quizState === "answering" && currentIdx >= FREE_LIMIT;

  // Referral trigger: fires once whenever the user lands on the result screen
  useEffect(() => {
    if (quizState === "result") recordReferralTrigger("quiz");
  }, [quizState]);

  // Session countdown
  useEffect(() => {
    if (quizState !== "answering" || timerMode !== "session" || sessionTimeLeft <= 0) return;
    const t = setTimeout(() => setSessionTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [quizState, timerMode, sessionTimeLeft]);

  useEffect(() => {
    if (timerMode === "session" && quizState === "answering" && sessionTimeLeft === 0) {
      playTimeUpSound();
      setTimedOut(true);
      setQuizState("result");
    }
  }, [timerMode, quizState, sessionTimeLeft]);

  // Sound alerts — session timer
  useEffect(() => {
    if (timerMode !== "session" || quizState !== "answering") return;
    if (sessionTimeLeft === 30) playWarningBeep();
    if (sessionTimeLeft === 10) playUrgentBeep();
  }, [sessionTimeLeft, timerMode, quizState]);

  // Per-question countdown — reset when question changes
  useEffect(() => {
    if (timerMode !== "per-question" || quizState !== "answering") return;
    setQuestionTimeLeft(perQuestionSecs);
  }, [currentIdx, timerMode, quizState, perQuestionSecs]);

  useEffect(() => {
    if (quizState !== "answering" || timerMode !== "per-question" || questionTimeLeft <= 0) return;
    const t = setTimeout(() => setQuestionTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [quizState, timerMode, questionTimeLeft]);

  // Sound alerts — per-question timer
  useEffect(() => {
    if (timerMode !== "per-question" || quizState !== "answering") return;
    if (questionTimeLeft === 10) playWarningBeep();
    if (questionTimeLeft === 5)  playUrgentBeep();
    if (questionTimeLeft === 0)  playTimeUpSound();
  }, [questionTimeLeft, timerMode, quizState]);

  // Auto-advance when per-question timer hits 0
  useEffect(() => {
    if (quizState !== "answering" || timerMode !== "per-question" || questionTimeLeft !== 0 || perQuestionSecs === 0) return;
    // Record no answer (null stays) and advance
    if (currentIdx + 1 < activeQuestions.length) {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizState("result");
    }
  }, [quizState, timerMode, questionTimeLeft, perQuestionSecs, currentIdx]);

  const current = activeQuestions[currentIdx];
  const isAnswered = selectedAnswer !== null;
  const isCorrect = selectedAnswer === current?.correctIndex;
  // Use optional chaining — safe when activeQuestions is empty (e.g. user-slide with no bank questions)
  const score = answers.filter((a, i) => a !== null && a === activeQuestions[i]?.correctIndex).length;

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedAnswer(idx);
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIdx + 1 < activeQuestions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizState("result");
      signalEngagement(); // triggers iOS install prompt after enough sessions
    }
  };

  // Start a quiz targeted specifically at the user's weak flashcard areas
  const startWeakQuiz = () => {
    const weakPool = QUESTION_BANK.filter(q => {
      const fid = IMG_TO_FLASHCARD[q.imageUrl];
      return fid && weakCardIds.includes(fid);
    });
    if (weakPool.length === 0) return;
    const q = shuffle(weakPool).slice(0, Math.min(sessionLimit, weakPool.length)).map(shuffleOptions);
    setActiveQuestions(q);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setAnswers(Array(q.length).fill(null));
    setShowExplanation(false);
    setTimedOut(false);
    setQuizState("answering");
    if (timerMode === "session") setSessionTimeLeft(sessionMins * 60);
    if (timerMode === "per-question") setQuestionTimeLeft(perQuestionSecs);
  };

  const startQuiz = () => {
    // activeQuestions already shuffled at mount/restart — don't reshuffle so
    // intro preloads stay valid
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setAnswers(Array(activeQuestions.length).fill(null));
    setShowExplanation(false);
    setTimedOut(false);
    setQuizState("answering");
    if (timerMode === "session") setSessionTimeLeft(sessionMins * 60);
    if (timerMode === "per-question") setQuestionTimeLeft(perQuestionSecs);
  };

  const handleRestart = () => {
    const q = shuffle(pool).slice(0, Math.min(sessionLimit, pool.length)).map(shuffleOptions);
    setActiveQuestions(q);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setAnswers(Array(q.length).fill(null));
    setShowExplanation(false);
    setTimedOut(false);
    setQuizState("answering");
    if (timerMode === "session") setSessionTimeLeft(sessionMins * 60);
    if (timerMode === "per-question") setQuestionTimeLeft(perQuestionSecs);
  };

  // ── Empty pool guard — user slide has no matching questions yet ───────
  if (pool.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4">
        <p className="text-5xl mb-4">🔬</p>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          No quiz questions for this slide yet
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-1 leading-relaxed">
          MCQ questions only exist for the <strong>20 built-in slides</strong> in the library.
          Personal slides you upload don't have pre-written questions — that feature is coming soon!
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mb-8">
          In the meantime you can take the full quiz, which covers all 58 bank questions.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onStartFullQuiz && (
            <button onClick={onStartFullQuiz} className="btn-primary flex items-center justify-center gap-2">
              <Brain className="w-4 h-4" /> Start Full Quiz
            </button>
          )}
          <button onClick={() => window.history.back()} className="btn-secondary">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Intro ─────────────────────────────────────────────────────────────
  if (quizState === "intro") {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-primary-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          {personalSlideData ? "Your Slide Quiz" : "Quiz Mode"}
        </h1>

        {/* ── Personal slide preview ── */}
        {personalSlideData ? (
          <div className="mb-8 text-left">
            {/* Slide thumbnail + diagnosis banner */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-4">
              <div className="relative w-full h-40 bg-slate-900 overflow-hidden">
                <SlideImage
                  src={quizImgSrc(personalSlideData.imageUrl)}
                  alt="Your slide"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
                <p className="text-white/70 text-[10px] font-medium uppercase tracking-widest mb-0.5">Diagnosis</p>
                <p className="text-white font-bold text-base leading-tight">{personalSlideData.diagnosis}</p>
              </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 leading-relaxed">
              Questions are generated from your analysis — testing your recall of the diagnosis,
              key histological features, IHC markers, and stain used for this slide.
            </p>

            {/* Stats for personal quiz */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[
                { label: "Questions", value: pool.length },
                { label: "Category", value: personalSlideData.category },
                { label: "Stain", value: personalSlideData.stain || "H&E" },
              ].map(({ label, value }) => (
                <div key={label} className="card text-center py-3">
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 truncate">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              Test your histopathology skills — from normal tissue recognition to IHC markers and pathology.
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mb-8">
              {hasFullAccess
                ? `${sessionLimit} questions per session · randomly drawn from 100+-question bank · shuffled each attempt`
                : `${FREE_LIMIT} free questions · upgrade for ${PREMIUM_LIMIT} questions from 100+-question bank`}
            </p>

            {/* Free tier notice */}
            {!hasFullAccess && (
              <div className="mb-5 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 flex items-start gap-2 text-left">
                <Lock className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  You have access to <strong>{FREE_LIMIT} questions</strong>. Premium unlocks {PREMIUM_LIMIT} shuffled questions per session, timer modes, and flashcard quick-quizzes.
                  {onUpgrade && <button onClick={onUpgrade} className="ml-1 underline font-semibold">Upgrade →</button>}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Per session", value: sessionLimit },
                { label: "Total bank", value: "100+" },
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
              {Array.from(new Set(QUESTION_BANK.map((q) => q.category))).map((cat) => (
                <span key={cat} className="text-xs px-3 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-medium">
                  {cat}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Timer settings — hidden for personal slide quizzes, premium-gated otherwise */}
        <div className={clsx(
          "card mb-8 text-left",
          personalSlideData && "hidden",
          !hasFullAccess && "opacity-50 pointer-events-none select-none"
        )}>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Timer className="w-4 h-4 text-slate-500" /> Timer
            {!hasFullAccess && <span className="ml-auto text-xs text-violet-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Premium</span>}
          </p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {(["none", "session", "per-question"] as TimerMode[]).map(m => (
              <button
                key={m}
                onClick={() => setTimerMode(m)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                  timerMode === m
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary-300"
                )}
              >
                {m === "none" ? "No timer" : m === "session" ? "Session timer" : "Per question"}
              </button>
            ))}
          </div>
          {timerMode === "session" && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Session duration</p>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15, 30, 60].map(m => (
                  <button
                    key={m}
                    onClick={() => setSessionMins(m)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-sm border transition-all",
                      sessionMins === m
                        ? "bg-primary-100 text-primary-700 border-primary-300 font-semibold"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary-200"
                    )}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          )}
          {timerMode === "per-question" && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Time per question</p>
              <div className="flex gap-2 flex-wrap">
                {[30, 60, 120, 180].map(s => (
                  <button
                    key={s}
                    onClick={() => setPerQuestionSecs(s)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-sm border transition-all",
                      perQuestionSecs === s
                        ? "bg-primary-100 text-primary-700 border-primary-300 font-semibold"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary-200"
                    )}
                  >
                    {s < 60 ? `${s}s` : `${s / 60} min`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Weak-spot alert ── */}
        {weakCardIds.length > 0 && !filterFlashcardIds?.length && !personalSlideData && (
          <div className="w-full max-w-sm mx-auto bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {weakCardIds.length} weak area{weakCardIds.length > 1 ? "s" : ""} detected
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 mb-3">
                  You rated {weakCardIds.length === 1 ? "a slide" : "some slides"} as Again or Hard recently.
                  Train those specifically to build confidence.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={startWeakQuiz}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" /> Train weak areas
                  </button>
                  <button
                    onClick={startQuiz}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    Full quiz instead
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Normal start button — hidden when weak-spot banner shows its own buttons */}
        {!(weakCardIds.length > 0 && !filterFlashcardIds?.length && !personalSlideData) && (
          <button onClick={startQuiz} className="btn-primary text-base px-8 py-3">
            Start Quiz
          </button>
        )}
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────
  if (quizState === "result") {
    const pct = Math.round((score / activeQuestions.length) * 100);
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">{timedOut ? "Time's Up!" : "Quiz Complete!"}</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">{timedOut ? "Here's how far you got" : "Here's how you did"}</p>

        <div className="card mb-6">
          <div className="text-5xl font-bold text-primary-600 mb-1">{pct}%</div>
          <p className="text-slate-500 text-sm">{score} / {activeQuestions.length} correct</p>

          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-4">
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
          {activeQuestions.map((q, i) => {
            const correct = answers[i] === q.correctIndex;
            return (
              <div key={q.id} className={clsx("flex items-start gap-3 p-3 rounded-xl border text-sm",
                correct
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800"
                  : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800"
              )}>
                {correct
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{q.question}</p>
                  {!correct && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Your answer: <span className="text-red-600 dark:text-red-400">{q.options[answers[i] ?? 0]}</span>
                      {" · "}Correct: <span className="text-emerald-600 dark:text-emerald-400">{q.options[q.correctIndex]}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          {onBack && (
            <button onClick={onBack} className="btn-secondary flex items-center gap-2">
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Menu
            </button>
          )}
          <button onClick={handleRestart} className="btn-primary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Paywall (free users after FREE_LIMIT questions) ───────────────────
  if (hitPaywall) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-lg">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {user ? "Upgrade to continue" : "Sign in to continue"}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">
          {user
            ? `You've completed ${FREE_LIMIT} free questions. Upgrade to Premium to unlock all ${PREMIUM_LIMIT} questions per session, unlimited retries, and a shuffled bank of 100+ questions.`
            : `You've completed ${FREE_LIMIT} free questions. Create a free account to continue and unlock the full quiz experience.`}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          {[
            { label: "Questions per session", free: "5", premium: "20" },
            { label: "Question bank", free: "5 fixed", premium: "100+ shuffled" },
            { label: "Flashcard quick-quiz", free: "✗", premium: "✓" },
            { label: "Timer modes", free: "✗", premium: "✓" },
          ].map(row => (
            <div key={row.label} className="col-span-2 flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700 text-sm">
              <span className="text-slate-600 dark:text-slate-400">{row.label}</span>
              <div className="flex gap-6 text-xs">
                <span className="text-slate-400 w-16 text-right">{row.free}</span>
                <span className="text-violet-600 font-semibold w-20 text-right">{row.premium}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 text-xs text-slate-400 justify-end mb-6">
          <span>Free</span>
          <span className="text-violet-600 font-semibold">Premium</span>
        </div>

        <div className="flex flex-col gap-2">
          {onUpgrade && (
            <button onClick={onUpgrade} className="btn-primary py-3 text-base">
              Upgrade to Premium
            </button>
          )}
          <button onClick={handleRestart} className="btn-secondary flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Restart (free questions)
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
        <span className="flex items-center gap-2">
          Question {currentIdx + 1} of {activeQuestions.length}
          {currentIdx + 1 === activeQuestions.length && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Final question
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {timerMode === "session" && (
            <span className={clsx(
              "text-sm font-mono font-semibold px-2.5 py-0.5 rounded-lg flex items-center gap-1",
              sessionTimeLeft <= 60 ? "bg-red-50 text-red-600" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            )}>
              <Timer className="w-3.5 h-3.5" />
              {Math.floor(sessionTimeLeft / 60)}:{String(sessionTimeLeft % 60).padStart(2, "0")}
            </span>
          )}
          <span className="badge bg-primary-50 text-primary-700">{current.category}</span>
        </div>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-primary-500 transition-all duration-300"
          style={{ width: `${((currentIdx) / activeQuestions.length) * 100}%` }}
        />
      </div>

      {/* Per-question timer bar */}
      {timerMode === "per-question" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Timer className="w-3 h-3" />
              Time remaining
            </span>
            <span className={clsx("text-xs font-mono font-semibold",
              questionTimeLeft <= 10 ? "text-red-600" : "text-slate-500"
            )}>
              {questionTimeLeft}s
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
            <div
              className={clsx(
                "h-2 rounded-full transition-all duration-1000",
                questionTimeLeft / perQuestionSecs > 0.5 ? "bg-emerald-400"
                : questionTimeLeft / perQuestionSecs > 0.25 ? "bg-amber-400"
                : "bg-red-400"
              )}
              style={{ width: `${(questionTimeLeft / perQuestionSecs) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Slide image */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 h-72">
        <SlideImage
          key={currentIdx}
          src={quizImgSrc(current.imageUrl)}
          alt="Quiz slide"
          className="w-full h-full object-cover transition-opacity duration-300"
          loading="eager"
          onLoaded={() => { setImageReady(true); setImageError(false); }}
        />
      </div>

      {/* Question */}
      <div className="card">
        <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-5">{current.question}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {current.options.map((opt, i) => {
            let style = "border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-700 dark:text-slate-300";
            if (isAnswered) {
              if (i === current.correctIndex) style = "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300";
              else if (i === selectedAnswer) style = "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
              else style = "border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60";
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
                  isAnswered && i === current.correctIndex ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" :
                  isAnswered && i === selectedAnswer ? "border-red-400 text-red-500 dark:text-red-400" :
                  "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400"
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
            isCorrect
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800"
          )}>
            <div className="flex items-center gap-2 mb-2 font-semibold text-slate-800 dark:text-slate-200">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              {isCorrect ? "Correct! Here's why:" : "Not quite — here's the explanation:"}
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{current.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {isAnswered && (
          <button onClick={handleNext} className="btn-primary mt-5 flex items-center gap-2 ml-auto">
            {currentIdx + 1 < activeQuestions.length ? (
              <><ChevronRight className="w-4 h-4" /> Next Question</>
            ) : (
              <><Trophy className="w-4 h-4" /> Finish &amp; See Results</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
