"use client";

import { useState, useEffect, useMemo } from "react";
import { Brain, CheckCircle, XCircle, RotateCcw, Trophy, ChevronRight, Lightbulb, Timer, Lock } from "lucide-react";
import { clsx } from "clsx";
import type { User } from "@supabase/supabase-js";
import { playWarningBeep, playUrgentBeep, playTimeUpSound } from "@/lib/timerSound";
import { signalEngagement } from "@/lib/pwaEngagement";

const proxy = (url: string) => `/api/proxy-image?url=${encodeURIComponent(url)}`;

// ── Images (centralised so preloading is easy) ────────────────────────────────
const IMG = {
  liver:     proxy("https://upload.wikimedia.org/wikipedia/commons/8/82/Histopathology_of_liver_zones.jpg"),
  lung:      proxy("https://upload.wikimedia.org/wikipedia/commons/a/ac/Normal_lung_%283660695207%29.jpg"),
  kidney:    proxy("https://upload.wikimedia.org/wikipedia/commons/6/63/Histology-kidney.jpg"),
  skin:      proxy("https://upload.wikimedia.org/wikipedia/commons/b/b4/Normal_Epidermis_and_Dermis_with_Intradermal_Nevus_10x.JPG"),
  colon:     proxy("https://upload.wikimedia.org/wikipedia/commons/d/de/Large_intestine_histology.jpg"),
  thyroid:   proxy("https://upload.wikimedia.org/wikipedia/commons/6/6a/Thyroid_gland_microscope.jpg"),
  lymphNode: proxy("https://upload.wikimedia.org/wikipedia/commons/d/da/Lymph_node_histology.jpg"),
  cardiac:   proxy("https://upload.wikimedia.org/wikipedia/commons/3/3d/Cardiac_muscle_histology_400x.jpg"),
  spleen:    proxy("https://upload.wikimedia.org/wikipedia/commons/6/60/Histology_of_Spleen.jpg"),
  scc:       proxy("https://upload.wikimedia.org/wikipedia/commons/f/f8/Micrograph_of_invasive_squamous_cell_carcinoma_-_150x.jpg"),
  gastritis: proxy("https://upload.wikimedia.org/wikipedia/commons/f/fc/Carcinoma_Stomach_10x.jpg"),
  uip:       proxy("https://upload.wikimedia.org/wikipedia/commons/5/55/Srifhistology3.jpg"),
  rpgn:      proxy("https://upload.wikimedia.org/wikipedia/commons/6/6a/Crescentic_glomerulonephritis_HE_stain.JPEG"),
  idc:       proxy("https://upload.wikimedia.org/wikipedia/commons/f/f8/Micrograph_of_ductal_carcinoma_with_marked_nuclear_pleomorphism_and_increased_mitotic_rate.jpg"),
  tb:        proxy("https://upload.wikimedia.org/wikipedia/commons/3/37/Pulmonary_tuberculosis_-_Necrotizing_granuloma_%286545185917%29.jpg"),
  zn:        proxy("https://upload.wikimedia.org/wikipedia/commons/9/98/Mycobacterium_tuberculosis_Ziehl-Neelsen_stain.jpg"),
  hodgkin:   proxy("https://upload.wikimedia.org/wikipedia/commons/3/33/Hodgkin_Disease,_Reed-Sternberg_Cell.jpg"),
  ccrcc:     proxy("https://upload.wikimedia.org/wikipedia/commons/a/a1/Histopathology_of_clear_cell_renal_cell_carcinoma,_grade_1,_high_magnification.jpg"),
  hepB:      proxy("https://upload.wikimedia.org/wikipedia/commons/2/22/Ground_glass_hepatocytes_high_mag_2.jpg"),
  crc:       proxy("https://upload.wikimedia.org/wikipedia/commons/1/18/Adenocarcinoma_of_the_colon-histology.JPG"),
};

// Maps each proxy image URL → the flashcard ID it belongs to.
// Used to filter quiz questions by flashcard when "Quick Quiz" is triggered.
const IMG_TO_FLASHCARD: Record<string, string> = {
  [IMG.liver]:     "f-n1",
  [IMG.lung]:      "f-n2",
  [IMG.kidney]:    "f-n3",
  [IMG.skin]:      "f-n4",
  [IMG.colon]:     "f-n5",
  [IMG.thyroid]:   "f-n6",
  [IMG.lymphNode]: "f-n7",
  [IMG.cardiac]:   "f-n8",
  [IMG.spleen]:    "f-n9",
  [IMG.scc]:       "f-p1",
  [IMG.gastritis]: "f-p2",
  [IMG.uip]:       "f-p3",
  [IMG.rpgn]:      "f-p4",
  [IMG.idc]:       "f-p5",
  [IMG.tb]:        "f-p6",
  [IMG.zn]:        "f-p7",
  [IMG.hodgkin]:   "f-p8",
  [IMG.ccrcc]:     "f-p9",
  [IMG.hepB]:      "f-p10",
  [IMG.crc]:       "f-p11",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
  onUpgrade?: () => void;
  /** Called when the user wants to drop the filter and run the full quiz */
  onStartFullQuiz?: () => void;
}

export default function QuizMode({
  user,
  isPremium,
  isTrialing,
  filterFlashcardIds,
  onUpgrade,
  onStartFullQuiz,
}: QuizModeProps) {
  const hasFullAccess = isPremium || isTrialing;
  const sessionLimit  = hasFullAccess ? PREMIUM_LIMIT : FREE_LIMIT;

  // Build the pool to draw from (full bank or filtered subset)
  const pool = useMemo(() => {
    if (!filterFlashcardIds?.length) return QUESTION_BANK;
    return QUESTION_BANK.filter(q => {
      const fid = IMG_TO_FLASHCARD[q.imageUrl];
      return fid && filterFlashcardIds.includes(fid);
    });
  }, [filterFlashcardIds]);

  const [quizState, setQuizState] = useState<QuizState>("intro");
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(() =>
    shuffle(pool).slice(0, Math.min(sessionLimit, pool.length))
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

  // When filter changes (quick quiz from flashcard), reset to intro
  useEffect(() => {
    if (filterFlashcardIds?.length) {
      const q = shuffle(pool).slice(0, Math.min(sessionLimit, pool.length));
      setActiveQuestions(q);
      setAnswers(Array(q.length).fill(null));
      setCurrentIdx(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setQuizState("intro");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterFlashcardIds?.join(",")]);

  // Paywall gate — hits after FREE_LIMIT questions for non-premium users (only when pool is non-empty)
  const hitPaywall = pool.length > 0 && !hasFullAccess && quizState === "answering" && currentIdx >= FREE_LIMIT;

  // Preload next question's image while answering current
  useEffect(() => {
    if (quizState !== "answering") return;
    const next = activeQuestions[currentIdx + 1];
    if (!next) return;
    const img = new Image();
    img.src = next.imageUrl;
  }, [currentIdx, quizState, activeQuestions]);

  // Reset imageReady whenever the question changes so the spinner shows
  useEffect(() => {
    setImageReady(false);
  }, [currentIdx]);

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
    if (quizState !== "answering" || timerMode !== "per-question" || questionTimeLeft <= 0 || !imageReady) return;
    const t = setTimeout(() => setQuestionTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [quizState, timerMode, questionTimeLeft, imageReady]);

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

  const startQuiz = () => {
    const q = shuffle(pool).slice(0, Math.min(sessionLimit, pool.length));
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

  const handleRestart = () => {
    const q = shuffle(pool).slice(0, Math.min(sessionLimit, pool.length));
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
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">Quiz Mode</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-2">
          Test your histopathology skills — from normal tissue recognition to IHC markers and pathology.
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-sm mb-8">
          {hasFullAccess
            ? `${sessionLimit} questions per session · randomly drawn from ${QUESTION_BANK.length}-question bank · shuffled each attempt`
            : `${FREE_LIMIT} free questions · upgrade for ${PREMIUM_LIMIT} questions from ${QUESTION_BANK.length}-question bank`}
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
            { label: "Total bank", value: QUESTION_BANK.length },
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

        {/* Timer settings — premium only */}
        <div className={clsx("card mb-8 text-left", !hasFullAccess && "opacity-50 pointer-events-none select-none")}>
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

        <button onClick={startQuiz} className="btn-primary text-base px-8 py-3">
          Start Quiz
        </button>
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

        <div className="flex gap-3 justify-center">
          <button onClick={handleRestart} className="btn-secondary flex items-center gap-2">
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
            ? `You've completed ${FREE_LIMIT} free questions. Upgrade to Premium to unlock all ${PREMIUM_LIMIT} questions per session, unlimited retries, and a shuffled bank of ${QUESTION_BANK.length} questions.`
            : `You've completed ${FREE_LIMIT} free questions. Create a free account to continue and unlock the full quiz experience.`}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          {[
            { label: "Questions per session", free: "5", premium: "20" },
            { label: "Question bank", free: "5 fixed", premium: `${QUESTION_BANK.length} shuffled` },
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
        <span>Question {currentIdx + 1} of {activeQuestions.length}</span>
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
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Timer className="w-3 h-3" /> Time remaining</span>
            <span className={clsx("text-xs font-mono font-semibold", questionTimeLeft <= 10 ? "text-red-600" : "text-slate-500")}>
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

      {/* Slide image — spinner shows until onLoad fires so timer waits */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 h-72">
        {!imageReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 z-10">
            <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-primary-400 animate-spin" />
            <p className="text-xs text-slate-500">Loading slide…</p>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.imageUrl}
          alt="Quiz slide"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className={clsx(
            "w-full h-72 object-cover transition-opacity duration-300",
            imageReady ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageReady(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/800x300/0f172a/38bdf8?text=Slide+Image";
            setImageReady(true);
          }}
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
              <><Trophy className="w-4 h-4" /> See Results</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
