"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronRight, Lightbulb, Zap, Star, Filter, ChevronDown, BookOpen, ArrowLeft } from "lucide-react";
import { clsx } from "clsx";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LibrarySection {
  heading: string;
  points: string[];
}

export interface LibraryInfographic {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  tags: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  imageSlug?: string;
  keyFact: string;
  pearl: string;
  sections: LibrarySection[];
}

// ── Colour maps ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Oncology:        "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
  Nephrology:      "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  Hepatology:      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  Pulmonology:     "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
  Cardiology:      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  Gastroenterology:"bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  Neuropathology:  "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  Haematology:     "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  Endocrinology:   "bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300",
  "Gynaecological Pathology": "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
  Dermatopathology:"bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  "Normal Histology":"bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300",
  Immunopathology: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  Infectious:      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
};

const DIFFICULTY_COLOR = {
  Beginner:     "text-emerald-500 dark:text-emerald-400",
  Intermediate: "text-amber-500 dark:text-amber-400",
  Advanced:     "text-rose-500 dark:text-rose-400",
};

const SECTION_PALETTES = [
  { card: "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800",       heading: "text-sky-800 dark:text-sky-200",       dot: "bg-sky-400" },
  { card: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800", heading: "text-violet-800 dark:text-violet-200", dot: "bg-violet-400" },
  { card: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800", heading: "text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-400" },
  { card: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", heading: "text-amber-800 dark:text-amber-200",   dot: "bg-amber-400" },
  { card: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",   heading: "text-rose-800 dark:text-rose-200",     dot: "bg-rose-400" },
];

// ── Curated content ────────────────────────────────────────────────────────

const LIBRARY: LibraryInfographic[] = [
  {
    id: "gbm-who4",
    title: "Glioblastoma, IDH-Wildtype (WHO Grade 4)",
    subtitle: "Most common primary malignant brain tumour in adults",
    category: "Neuropathology", tags: ["brain", "glioma", "WHO grade 4", "EGFR", "TERT"],
    difficulty: "Advanced", imageSlug: "gbm",
    keyFact: "Median survival ~15 months despite maximal therapy; MGMT methylation predicts temozolomide response.",
    pearl: "Pseudopalisading necrosis + microvascular proliferation = diagnostic of GBM. Always order IDH, EGFR amp, TERT, and MGMT.",
    sections: [
      { heading: "Histological Hallmarks", points: ["Pseudopalisading necrosis: tumour cells palisade around central necrotic foci — a defining WHO Grade 4 feature.", "Microvascular proliferation: glomeruloid vascular tufts reflecting VEGF-driven angiogenesis.", "Marked cellular pleomorphism with frequent atypical mitoses.", "Hypercellular glial neoplasm with nuclear hyperchromasia."] },
      { heading: "Molecular Profile", points: ["IDH-wildtype (by definition in adults ≥55 yrs): absence of IDH1/2 mutation confirms aggressive phenotype.", "EGFR amplification (~40–50%): drives proliferation; EGFR vIII variant highly specific for GBM.", "TERT promoter mutation (>80%): extends telomere length, sustains immortalisation.", "PTEN loss and CDKN2A/B deletion compound the proliferative advantage."] },
      { heading: "Pathogenesis", points: ["Driver mutations activate PI3K/AKT and RAS/MAPK pathways → uncontrolled glial proliferation.", "Vascular occlusion and rapid growth create hypoxic foci → HIF-1α upregulates VEGF → necrosis.", "Hypoxic cells migrate outward → pseudopalisading; cells at periphery secrete pro-migratory signals.", "Immunosuppressive microenvironment: high TGF-β, IL-10; macrophage/microglia infiltration sustains tumour."] },
      { heading: "IHC Markers", points: ["GFAP (+): confirms glial origin.", "IDH1 R132H immunostain NEGATIVE (wildtype).", "Ki-67 >20%: reflects high proliferative index.", "EGFR (+, amplified): detected by FISH or IHC overexpression."] },
      { heading: "Treatment & Prognosis", points: ["Stupp protocol: maximal safe resection → concurrent temozolomide + radiotherapy → adjuvant temozolomide.", "MGMT promoter methylation (~45%): best survival predictor; improves temozolomide efficacy.", "Bevacizumab (anti-VEGF): used for recurrent disease.", "Median OS ~15 months; MGMT-methylated patients may reach 20–24 months."] },
    ],
  },
  {
    id: "idc-breast",
    title: "Invasive Ductal Carcinoma (NST)",
    subtitle: "Most common breast malignancy (~75% of cases)",
    category: "Oncology", tags: ["breast", "IDC", "NST", "ER", "PR", "HER2", "grade"],
    difficulty: "Intermediate", imageSlug: "idc",
    keyFact: "Grade 3 IDC with HER2 amplification: trastuzumab + pertuzumab + chemotherapy significantly improves OS.",
    pearl: "Always report Nottingham grade (tubule + nuclear pleomorphism + mitotic count), ER/PR, HER2, and Ki-67 — these four drive all treatment decisions.",
    sections: [
      { heading: "Histology", points: ["Infiltrating nests, cords, trabeculae, or solid sheets of malignant ductal epithelial cells in desmoplastic stroma.", "Nottingham Grading: tubule (1–3) + nuclear pleomorphism (1–3) + mitotic count (1–3); total → G1/G2/G3.", "Desmoplastic stroma: dense fibroblastic reaction; associated with firm 'scirrhous' mass clinically.", "Lymphovascular invasion (LVI): key prognostic feature; associated with nodal metastasis."] },
      { heading: "Molecular Subtypes", points: ["Luminal A (ER+/PR+, HER2−, low Ki-67): best prognosis; endocrine therapy alone.", "Luminal B (ER+, HER2+ or high Ki-67): intermediate; chemo + endocrine ± anti-HER2.", "HER2-enriched (ER−/PR−, HER2+): anti-HER2 therapy essential (trastuzumab + pertuzumab).", "Triple-negative (ER−/PR−, HER2−): chemotherapy ± immunotherapy (pembrolizumab)."] },
      { heading: "Key IHC Panel", points: ["ER/PR (nuclear): Allred score ≥3 = positive; drives endocrine therapy eligibility.", "HER2: IHC 3+ or FISH amplification = positive; targets trastuzumab, pertuzumab, T-DM1.", "Ki-67 ≥20% = high proliferation → favours chemotherapy.", "CK5/6 + EGFR positivity in ER-negative tumours: supports basal-like/TNBC phenotype."] },
      { heading: "Prognostic Tools", points: ["Nottingham Prognostic Index (NPI): size + grade + nodal status.", "Oncotype DX (21-gene): guides chemo in ER+/HER2−/N0; recurrence score >25 → add chemo.", "BRCA1/2 mutation (~10%): PARP inhibitors (olaparib) in BRCA-mutated metastatic HER2− disease."] },
    ],
  },
  {
    id: "crc",
    title: "Colorectal Adenocarcinoma",
    subtitle: "Arising via chromosomal or microsatellite instability pathways",
    category: "Gastroenterology", tags: ["colon", "CRC", "MSI", "CIN", "KRAS", "BRAF"],
    difficulty: "Intermediate", imageSlug: "crc",
    keyFact: "~15% of CRC is MSI-H — these respond to pembrolizumab regardless of line of therapy.",
    pearl: "KRAS/NRAS wild-type metastatic CRC → add cetuximab. BRAF V600E → encorafenib. Always test MMR IHC first.",
    sections: [
      { heading: "Morphology", points: ["Moderately differentiated gland-forming adenocarcinoma most common; back-to-back glands with dirty necrosis.", "Mucinous adenocarcinoma (>50% extracellular mucin): common in MSI-H tumours.", "Signet ring cell variant: worst prognosis; diffusely infiltrating.", "Tumour budding at invasive front: high-grade = adverse prognosis."] },
      { heading: "Molecular Pathways", points: ["CIN (~80%): APC → KRAS → SMAD4 → TP53 (Vogelstein sequence).", "MSI-H (~15%): MMR deficiency → Lynch syndrome or MLH1 methylation (sporadic).", "KRAS/NRAS mutation (~50%): activates RAS/MAPK; anti-EGFR therapy ineffective.", "BRAF V600E (~10%): almost all MLH1-hypermethylated; poor prognosis."] },
      { heading: "IHC & Biomarkers", points: ["MMR IHC (MLH1/MSH2/MSH6/PMS2): loss = dMMR/MSI-H → IO eligibility.", "CDX2 (+): confirms colorectal origin in metastases.", "CK20+/CK7−: classic CRC IHC profile.", "BRAF V600E IHC: positive in ~10% of sporadic CRC."] },
      { heading: "Staging & Treatment", points: ["Adjuvant FOLFOX for high-risk Stage II and all Stage III.", "Metastatic: FOLFOX/FOLFIRI ± bevacizumab or cetuximab (RAS/RAF wildtype).", "MSI-H metastatic CRC: pembrolizumab first-line; doubled median PFS vs chemotherapy."] },
    ],
  },
  {
    id: "hcc",
    title: "Hepatocellular Carcinoma (HCC)",
    subtitle: "Third leading cause of cancer death worldwide — arises in cirrhosis",
    category: "Hepatology", tags: ["liver", "HCC", "cirrhosis", "HBV", "HCV", "AFP"],
    difficulty: "Advanced", imageSlug: "hcc",
    keyFact: "HCC is diagnosed radiologically (LI-RADS 5) without mandatory biopsy. AFP >400 ng/mL is highly specific.",
    pearl: "Arterial hyperenhancement + portal venous washout = imaging hallmark. Arginase-1 is now the most sensitive/specific hepatocellular IHC marker.",
    sections: [
      { heading: "Histology", points: ["Trabecular pattern: tumour cells in thick plates (≥3 cells) traversed by sinusoidal channels.", "Pseudoglandular/acinar: bile canaliculi formation; bile pigment in lumina.", "Cytology: large polygonal cells, eosinophilic cytoplasm, prominent nucleoli.", "Fibro-lamellar variant: young patients, no cirrhosis, lamellar fibrosis — better prognosis."] },
      { heading: "Aetiology", points: ["HBV (HBsAg integration → HBx → TP53 inactivation): major risk in Asia/Africa.", "HCV (viral proteins activate Wnt/β-catenin): major risk in the West.", "Aflatoxin B1: causes TP53 R249S hotspot mutation.", "MASH and alcohol: increasing cause in Western countries."] },
      { heading: "IHC Markers", points: ["HepPar-1 (+): hepatocyte-specific mitochondrial antigen.", "Arginase-1 (+): more sensitive and specific than HepPar-1.", "Glypican-3 (GPC3 +): oncofetal antigen; negative in normal liver.", "Glutamine synthetase (diffuse +): β-catenin-activated HCC."] },
      { heading: "Treatment by Stage", points: ["Very early/early (BCLC 0-A): resection, transplant (Milan criteria), or RFA/MWA.", "Intermediate (BCLC B): TACE.", "Advanced (BCLC C): atezolizumab + bevacizumab (IMbrave150 — superior to sorafenib).", "Second-line: cabozantinib, nivolumab ± ipilimumab."] },
    ],
  },
  {
    id: "dlbcl",
    title: "Diffuse Large B-Cell Lymphoma (DLBCL)",
    subtitle: "Most common aggressive non-Hodgkin lymphoma — 30% of NHL",
    category: "Haematology", tags: ["lymphoma", "DLBCL", "NHL", "BCL2", "MYC", "CD20", "R-CHOP"],
    difficulty: "Advanced", imageSlug: "dlbcl",
    keyFact: "Double-hit DLBCL (MYC + BCL2/BCL6 rearrangement) = HGBCL; requires DA-EPOCH-R, not standard R-CHOP.",
    pearl: "GCB vs non-GCB by Hans algorithm (CD10, BCL6, MUM1): non-GCB has worse OS with R-CHOP. Always report COO.",
    sections: [
      { heading: "Histology", points: ["Diffuse effacement of nodal architecture by large atypical lymphoid cells (nucleus ≥ 2× lymphocyte).", "Centroblastic: large cells with peripheral nucleoli (most common).", "Immunoblastic: single central macronucleolus, more often non-GCB.", "Anaplastic variant: distinguish from ALCL — check ALK."] },
      { heading: "Cell of Origin (Hans)", points: ["GCB: CD10+ → GCB; or CD10−, BCL6+, MUM1− → GCB; better prognosis.", "Non-GCB: MYD88, CD79B mutations; NF-κB activation; worse OS.", "Double expressors (BCL2 >50%, MYC >40% by IHC): worse prognosis even without rearrangement.", "FISH: MYC + BCL2/BCL6 rearrangement → HGBCL ('double-hit')."] },
      { heading: "IHC Panel", points: ["CD20 (+): pan-B marker; target of rituximab.", "CD10, BCL6, MUM1/IRF4: determine COO (Hans algorithm).", "BCL2, MYC protein: double expressors → worse outcomes.", "Ki-67 >90%: consider HGBCL or Burkitt vs DLBCL."] },
      { heading: "Treatment", points: ["Standard: R-CHOP × 6 cycles.", "Double-hit/HGBCL: DA-EPOCH-R + CNS prophylaxis.", "Relapsed/refractory: CAR-T (axicabtagene, lisocabtagene).", "Polatuzumab vedotin (anti-CD79b ADC): pola-BR for R/R."] },
    ],
  },
  {
    id: "ccrcc",
    title: "Clear Cell Renal Cell Carcinoma (ccRCC)",
    subtitle: "Most common renal malignancy — VHL-driven",
    category: "Nephrology", tags: ["kidney", "ccRCC", "VHL", "HIF", "VEGF", "mTOR"],
    difficulty: "Intermediate", imageSlug: "ccrcc",
    keyFact: "VHL mutation in >90% → HIF stabilisation → VEGF overproduction — explains anti-VEGF therapy sensitivity.",
    pearl: "Clear cytoplasm = lipid and glycogen dissolved in processing. 'Chicken-wire' sinusoidal pattern + CA-IX box-like staining = characteristic.",
    sections: [
      { heading: "Histology", points: ["Clear cells: abundant cytoplasm optically clear due to dissolved lipid and glycogen.", "Delicate 'chicken-wire' vasculature: thin-walled sinusoids separating nested cells.", "WHO-ISUP nuclear grade 1–4: nucleolar prominence at 100× (G2), 400× (G3), macronucleoli (G3+).", "Sarcomatoid/rhabdoid dedifferentiation: any grade → aggressive; poor prognosis."] },
      { heading: "Molecular Biology", points: ["VHL biallelic inactivation (>90%): HIF-1α/2α accumulate → VEGF, PDGF, EPO upregulation.", "SETD2, BAP1, PBRM1 (chromatin remodellers): secondary mutations affect prognosis.", "BAP1 loss: worst prognosis; mutually exclusive with PBRM1.", "mTORC1 activation via PIK3CA/PTEN: explains everolimus/temsirolimus activity."] },
      { heading: "IHC Markers", points: ["CA-IX (+, membranous 'box-like'): HIF target; highly sensitive for ccRCC.", "PAX8 (+): renal lineage marker.", "CD10 (+): proximal tubule brush border antigen.", "CK7 (−): distinguishes from chromophobe (CK7 diffuse +) and papillary (focal +) RCC."] },
      { heading: "Treatment", points: ["Localised: partial/radical nephrectomy.", "Metastatic 1st-line: ipilimumab + nivolumab or pembrolizumab + axitinib (both superior to sunitinib).", "Sunitinib/pazopanib: alternative in IO-ineligible patients.", "2nd-line: cabozantinib or nivolumab; everolimus in later lines."] },
    ],
  },
  {
    id: "melanoma",
    title: "Malignant Melanoma",
    subtitle: "Deadliest skin cancer — Breslow thickness drives prognosis",
    category: "Dermatopathology", tags: ["skin", "melanoma", "BRAF", "Breslow", "immunotherapy"],
    difficulty: "Intermediate", imageSlug: "melanoma",
    keyFact: "Breslow >4 mm: ~50% 5-year survival. Breslow <1 mm: >95%. It is the single most important prognostic measurement.",
    pearl: "BRAF V600E in ~50%: vemurafenib + cobimetinib OR dabrafenib + trametinib. Always test BRAF before starting systemic therapy.",
    sections: [
      { heading: "Histological Features", points: ["Upward (pagetoid) spread of atypical melanocytes into epidermis above DEJ.", "Radial growth phase: intraepidermal spread — no metastatic potential.", "Vertical growth phase: deep dermal invasion → metastatic risk; Breslow measured here.", "Cytological atypia: large nuclei, 'cherry-red' eosinophilic nucleoli, dermal mitoses."] },
      { heading: "Subtypes", points: ["Superficial spreading (~70%): most common; flat with lateral growth before invasion.", "Nodular (~15%): rapidly growing, ulcerated, vertical growth from onset; worst per thickness.", "Lentigo maligna: chronic sun-damaged skin (face); elderly patients.", "Acral lentiginous (~5%): palms/soles/subungual; BRAF-low, KIT mutations more common."] },
      { heading: "Molecular Targets", points: ["BRAF V600E/K (~50%): BRAF+MEK inhibitor combination → rapid responses.", "NRAS mutation (~20%): no targeted therapy; worse prognosis.", "KIT (acral/mucosal ~15%): imatinib may be effective.", "High TMB: PD-1 blockade highly effective; ~40% durable response."] },
      { heading: "Staging & Treatment", points: ["Breslow + ulceration + mitotic rate → T stage. SLNB for T1b and above.", "Adjuvant (Stage III): nivolumab, pembrolizumab, or dabrafenib+trametinib (BRAF-mutant).", "Metastatic: PD-1 ± CTLA-4 (nivo + ipi) for high TMB; BRAF+MEK for BRAF V600."] },
    ],
  },
  {
    id: "rpgn",
    title: "Rapidly Progressive Glomerulonephritis",
    subtitle: "Crescentic GN — medical emergency requiring urgent immunosuppression",
    category: "Nephrology", tags: ["kidney", "RPGN", "crescents", "ANCA", "anti-GBM"],
    difficulty: "Advanced", imageSlug: "rpgn",
    keyFact: "Crescent formation in >50% of glomeruli = RPGN. Untreated, >90% progress to ESRD within weeks.",
    pearl: "Classify by IF first: linear IgG = anti-GBM (Goodpasture); granular = immune complex; negative/pauci = ANCA vasculitis. Treat ANCA with rituximab or cyclophosphamide.",
    sections: [
      { heading: "Pathology", points: ["Crescents: proliferating parietal epithelial cells + infiltrating macrophages fill Bowman's space.", "Fibrocellular → fibrous progression: cellular (acute, reversible) → fibrous (irreversible).", "GBM disruption allows fibrin/plasma proteins into Bowman's space → crescent stimulus.", "% glomeruli with crescents correlates directly with GFR loss."] },
      { heading: "Classification by IF", points: ["Type I — Anti-GBM (linear IgG): α3-type IV collagen autoantibody; ± pulmonary haemorrhage (Goodpasture).", "Type II — Immune complex (granular): post-strep, lupus IV, IgA nephropathy, cryoglobulinaemia.", "Type III — Pauci-immune: ANCA-associated vasculitis (GPA, MPA, EGPA); MPO or PR3-ANCA.", "Type IV — Combined anti-GBM + ANCA: ~30% of anti-GBM; worst outcomes."] },
      { heading: "Investigations", points: ["Urine: dysmorphic RBCs, RBC casts, proteinuria.", "Serology: ANCA (PR3/MPO), anti-GBM, ANA/dsDNA, C3/C4.", "Renal biopsy: LM + IF + EM essential for classification.", "CXR/CT thorax: pulmonary infiltrates in anti-GBM or ANCA vasculitis."] },
      { heading: "Treatment", points: ["Type I: plasma exchange + cyclophosphamide + steroids; transplant only after antibody clearance.", "Type II: treat underlying cause; steroids ± cyclophosphamide for severe lupus.", "Type III: rituximab or cyclophosphamide + steroids; avacopan reduces steroid burden.", "Dialysis if oliguric; recovery depends on crescent maturity."] },
    ],
  },
  {
    id: "ami",
    title: "Acute Myocardial Infarction — Histological Timeline",
    subtitle: "Morphological evolution of ischaemic myocardium from 0–8 weeks",
    category: "Cardiology", tags: ["heart", "MI", "infarction", "coagulative necrosis", "fibrosis"],
    difficulty: "Intermediate", imageSlug: "ami",
    keyFact: "H&E appears NORMAL in the first 4–6 hours post-MI despite ongoing ischaemia — troponin rises before histological change.",
    pearl: "Neutrophils peak at 48–72 hrs. Rupture risk highest at 3–5 days (peak neutrophil enzyme release). Fibrous scar complete by 6–8 weeks.",
    sections: [
      { heading: "0–4 Hours", points: ["H&E essentially normal — no visible histological changes.", "EM: mitochondrial swelling, glycogen depletion.", "Wavy fibres at infarct border: earliest histological sign (~1–4 hrs).", "No inflammatory infiltrate yet."] },
      { heading: "4–24 Hours", points: ["Coagulative necrosis begins: eosinophilic myocytes, nuclear pyknosis, loss of striations.", "Contraction band necrosis: hypereosinophilic transverse bands in reperfused areas.", "Interstitial oedema; early neutrophil margination at borders."] },
      { heading: "1–3 Days", points: ["Dense neutrophil infiltration: peaks at 48–72 hours.", "Neutrophil enzymes (MPO, elastase) dissolve debris → 'softening' phase → rupture risk.", "Nuclear debris (karyorrhexis) within necrotic myocytes."] },
      { heading: "5 Days–8 Weeks", points: ["Day 5–10: macrophages replace neutrophils (phagocytosis); granulation tissue at margins.", "Week 2–4: progressive collagen (Types I + III) by fibroblasts → myofibroblasts.", "6–8 weeks: dense hypocellular white fibrous scar; wall thinning + ventricular remodelling."] },
    ],
  },
  {
    id: "atherosclerosis",
    title: "Atherosclerosis — Plaque Biology",
    subtitle: "Lipid-driven intimal disease underlying most cardiovascular events",
    category: "Cardiology", tags: ["atherosclerosis", "plaque", "foam cells", "lipid", "LDL"],
    difficulty: "Intermediate", imageSlug: "atherosclerosis",
    keyFact: "~80% of acute MIs occur at non-severely stenotic plaques — plaque composition (vulnerability), not luminal narrowing, drives most events.",
    pearl: "Vulnerable plaque = thin fibrous cap (<65 µm) + large necrotic core + shoulder macrophages. MMP release degrades cap collagen → rupture → thrombus → ACS.",
    sections: [
      { heading: "Pathogenesis", points: ["Endothelial dysfunction: turbulent flow, hypertension, smoking → oxidative stress → eNOS downregulation.", "LDL retention and oxidation in intima → oxLDL → scavenger receptor uptake by macrophages.", "Foam cell formation: lipid-laden macrophages → fatty streak (earliest, reversible lesion).", "VSMC migration from media: phenotypic switch → collagen production → fibrous cap."] },
      { heading: "Plaque Types", points: ["Fatty streak: foam cells in intima; appears from childhood.", "Fibrous plaque: foam cells + SMCs + collagen cap; lipid core + calcification.", "Vulnerable plaque: thin cap, large lipid core, macrophage infiltration at shoulder.", "Stable plaque: thick cap, small lipid core — more likely to cause stable angina."] },
      { heading: "Rupture Mechanism", points: ["MMP-1/-9 from macrophages degrades cap collagen → thinning → rupture.", "Cap rupture exposes collagen + tissue factor → platelet aggregation + thrombus.", "Superficial erosion (no rupture): more common in women/young; thrombus on intact cap.", "Calcified nodule penetrates cap → thrombus."] },
      { heading: "Treatment Targets", points: ["Statins: LDL-C reduction + plaque stabilisation (↑ collagen, ↓ macrophages).", "PCSK9 inhibitors: ↓ LDL-C ~60%; FOURIER/ODYSSEY trials → ↓ CV events beyond statins.", "Colchicine/canakinumab: target residual inflammatory risk (COLCOT/CANTOS trials)."] },
    ],
  },
  {
    id: "uip",
    title: "Usual Interstitial Pneumonia / IPF",
    subtitle: "Progressive, fatal fibrotic lung disease — median survival 3–5 years",
    category: "Pulmonology", tags: ["lung", "UIP", "IPF", "fibrosis", "honeycomb"],
    difficulty: "Advanced", imageSlug: "uip",
    keyFact: "Nintedanib and pirfenidone slow FVC decline ~50% but do not halt or reverse progression.",
    pearl: "Temporal heterogeneity (old fibrosis + active fibroblastic foci in the same biopsy) is the pathological hallmark of UIP — distinguishes it from all other IIPs.",
    sections: [
      { heading: "Histological Pattern", points: ["Temporal heterogeneity: areas of old dense fibrosis alongside active fibroblastic foci.", "Fibroblastic foci: proliferating fibroblasts/myofibroblasts beneath hyperplastic type II AECs — key diagnostic feature.", "Honeycomb change: cystically dilated airspaces lined by bronchiolar epithelium; end-stage.", "Patchy subpleural/basal distribution: alternating normal lung, mild fibrosis, honeycombing."] },
      { heading: "Pathogenesis", points: ["Aberrant epithelial repair: repeated micro-injuries → type II AECs → TGF-β, PDGF, CTGF release.", "Fibroblast → myofibroblast: TGF-β drives collagen I/III overproduction; inhibits apoptosis.", "Failed re-epithelialisation: reduced telomerase (surfactant protein mutations).", "Vascular obliteration → further hypoxia and profibrotic signalling."] },
      { heading: "HRCT Features", points: ["Subpleural, basal-predominant: honeycombing in posterior lower lobes first.", "Honeycombing: stacked cystic airspaces (3–10 mm), thick walls — pathognomonic of UIP.", "Traction bronchiectasis: irreversible airway distortion in fibrotic regions.", "Minimal GGO: if extensive → consider NSIP or HP."] },
      { heading: "Diagnosis & Treatment", points: ["MDT diagnosis: HRCT alone sufficient for typical UIP; biopsy for atypical pattern.", "Exclude secondary causes: CTD, drugs, HP, occupational.", "Antifibrotics: nintedanib (VEGFR/FGFR/PDGFR TKI) or pirfenidone (TGF-β inhibitor).", "Lung transplant: only curative option; listed early given poor prognosis."] },
    ],
  },
  {
    id: "liver-normal",
    title: "Normal Liver Histology",
    subtitle: "Hepatic lobule organisation and functional zonation",
    category: "Normal Histology", tags: ["liver", "normal", "hepatocyte", "portal tract", "kupffer"],
    difficulty: "Beginner", imageSlug: "liver",
    keyFact: "Zone 3 (centrilobular) hepatocytes are most susceptible to ischaemia and toxins (paracetamol, halothane) due to lowest oxygen tension.",
    pearl: "The hepatic acinus (Rappaport) divides the lobule into zones 1–3 based on proximity to portal tracts: Zone 1 = oxygen-rich, Zone 3 = oxygen-poor.",
    sections: [
      { heading: "Structural Organisation", points: ["Classic hepatic lobule: hexagonal unit centred on central vein, portal tracts at periphery.", "Portal tract (triad): portal vein + hepatic artery + bile duct ± lymphatics.", "Liver plates: single-cell-thick hepatocyte rows radiating from central vein.", "Sinusoids: vascular channels lined by fenestrated endothelium + Kupffer cells."] },
      { heading: "Cell Types", points: ["Hepatocytes (80%): polygonal, central round nucleus, granular eosinophilic cytoplasm, prominent nucleolus.", "Kupffer cells: fixed sinusoidal macrophages (CD68+); phagocytose bacteria, aged RBCs.", "Ito (stellate) cells: perisinusoidal fat-storing; activated → myofibroblasts → fibrosis.", "Cholangiocytes: bile duct epithelium (CK7/CK19+)."] },
      { heading: "Functional Zonation", points: ["Zone 1 (periportal): β-oxidation, glycogen synthesis, albumin production — highest O₂.", "Zone 2 (mid-lobular): intermediate function.", "Zone 3 (centrilobular): CYP450 drug metabolism; glutamine synthesis; most toxin-vulnerable.", "Cholestasis localisation: biliary obstruction → zone 1; ischaemia → zone 3."] },
      { heading: "Key IHC", points: ["HepPar-1: hepatocyte mitochondrial antigen; confirms hepatocyte lineage.", "CK7/CK19: bile duct epithelium; negative in normal hepatocytes.", "CD68 (PGM1): Kupffer cells.", "Glutamine synthetase: zone 3 hepatocytes (IHC); diffuse = β-catenin activated adenoma."] },
    ],
  },
  {
    id: "ptc",
    title: "Papillary Thyroid Carcinoma",
    subtitle: "Most common thyroid malignancy (~85%) — excellent prognosis",
    category: "Endocrinology", tags: ["thyroid", "PTC", "BRAF", "Orphan Annie", "psammoma"],
    difficulty: "Beginner", imageSlug: "ptc",
    keyFact: "10-year survival >95%. Lymph node metastasis is common but does NOT significantly worsen prognosis in well-differentiated disease.",
    pearl: "Nuclear features are diagnostic, NOT papillary architecture. Orphan Annie nuclei (ground-glass) + nuclear grooves + pseudoinclusions = pathognomonic triad.",
    sections: [
      { heading: "Diagnostic Nuclear Features", points: ["Orphan Annie nuclei: pale, empty, powdery chromatin — must be present for diagnosis.", "Nuclear grooves: linear infolding of nuclear membrane.", "Intranuclear cytoplasmic pseudoinclusions (INCP): round eosinophilic inclusions within nucleus.", "Nuclear enlargement, crowding, and irregular membranes."] },
      { heading: "Architecture & Variants", points: ["Papillae with fibrovascular cores; psammoma bodies (~50%).", "Follicular variant PTC: follicular growth + nuclear features; BRAF-wildtype, NTRK/RAS common.", "Tall cell variant (≥30% cells twice as tall as wide): aggressive; BRAF V600E highly prevalent.", "Diffuse sclerosing: RET/PTC rearrangements; young patients; heavy lymphocytic infiltrate."] },
      { heading: "Molecular Alterations", points: ["BRAF V600E (~60% of classical PTC): associated with extrathyroidal extension, recurrence.", "RET/PTC rearrangements (~15–20%): radiation-associated PTC.", "RAS mutations (~10–15%): follicular variant; lower metastatic risk.", "NTRK1/3 fusions: larotrectinib/entrectinib sensitive."] },
      { heading: "Management", points: ["Surgery: total thyroidectomy or lobectomy based on size/risk.", "RAI (I-131): ablates remnant; TSH stimulation required.", "TSH suppression: T4 to keep TSH subnormal → reduces residual disease stimulation.", "BRAF-targeted therapy: for RAI-refractory, BRAF V600E progressive disease."] },
    ],
  },
  {
    id: "cin3",
    title: "Cervical Intraepithelial Neoplasia (CIN 3)",
    subtitle: "High-grade squamous precursor — 30–50% risk of invasion if untreated over 20 years",
    category: "Gynaecological Pathology", tags: ["cervix", "CIN3", "HPV", "HSIL", "p16", "Ki-67"],
    difficulty: "Intermediate", imageSlug: "cin3",
    keyFact: "CIN 3 progresses to invasive carcinoma in ~30–50% if untreated. CIN 1 regresses spontaneously in ~90% within 2 years.",
    pearl: "p16 block positivity (diffuse basal-to-surface) = surrogate for high-risk HPV integration and E7-mediated Rb inactivation. Use p16+Ki-67 dual stain to resolve CIN 2 ambiguity.",
    sections: [
      { heading: "Morphology", points: ["Full-thickness atypia: dysplastic cells throughout entire squamous epithelium to surface.", "Loss of maturation: no progressive flattening toward surface — all layers undifferentiated.", "Nuclear changes: enlarged hyperchromatic nuclei, coarse chromatin, high N:C ratio.", "Mitotic figures throughout all layers including upper third."] },
      { heading: "HPV Pathogenesis", points: ["High-risk HPV (16, 18): infects basal squamous cells at transformation zone.", "E6 protein: binds p53 → proteasomal degradation → loss of apoptosis.", "E7 protein: binds Rb → releases E2F → uncontrolled cell cycle entry → upregulates p16.", "HPV 16 > HPV 18 for squamous carcinoma; HPV 18 more adenocarcinoma-associated."] },
      { heading: "IHC Markers", points: ["p16 (CDKN2A): diffuse block positivity = high-risk HPV integration; any other pattern = negative.", "Ki-67: high proliferative index throughout all epithelial layers in CIN 3.", "p16 + Ki-67 dual stain: any co-positive cell = HSIL; reduces interobserver variability.", "ProExC (MCM2 + TOP2A): alternative biomarker; high sensitivity for HSIL."] },
      { heading: "Management", points: ["CIN 3: LLETZ or cold-knife cone with clear margins (≥2mm).", "Follow-up: HPV co-testing + cytology at 6 months post-treatment × 2, then annually × 3.", "Prevention: HPV vaccination (Gardasil-9: 6, 11, 16, 18, 31, 33, 45, 52, 58).", "Immunocompromised: higher recurrence risk; intensive surveillance."] },
    ],
  },
  {
    id: "crohn",
    title: "Crohn's Disease",
    subtitle: "Transmural, granulomatous, skip-lesion IBD affecting any GI segment",
    category: "Gastroenterology", tags: ["IBD", "Crohn", "granuloma", "skip lesion", "NOD2"],
    difficulty: "Intermediate", imageSlug: "crohn",
    keyFact: "Non-caseating granulomas in the bowel wall = pathognomonic of Crohn's, but present in only ~50% of biopsies — absence does NOT exclude it.",
    pearl: "Skip lesions + transmural inflammation + non-caseating granulomas = Crohn's. Continuous mucosal disease = UC. Distinguish by pattern, not just granulomas.",
    sections: [
      { heading: "Macroscopic Features", points: ["Skip lesions: segmental disease alternating with normal 'skip areas' — distinct from UC.", "Cobblestone mucosa: surviving islands between deep linear/rose-thorn ulcers.", "Creeping fat: mesenteric fat wraps around serosa — marker of transmural disease.", "Fistulae + abscesses: transmural inflammation tracks through bowel wall."] },
      { heading: "Microscopic Features", points: ["Transmural inflammation: lymphoid aggregates from mucosa through to serosa.", "Non-caseating granulomas: epithelioid histiocytes ± Langhans giant cells; ~50% of biopsies.", "Architectural distortion: branched, irregular crypts; Paneth cell metaplasia in left colon.", "Submucosal fibrosis → stricture formation → obstructive symptoms."] },
      { heading: "Pathogenesis", points: ["NOD2/CARD15 (30–40%): impaired muramyl dipeptide recognition → dysbiosis.", "Dysbiosis: ↓ Faecalibacterium prausnitzii; ↑ adherent-invasive E. coli (AIEC).", "Th1/Th17 skew: IFN-γ, TNF-α, IL-17 → macrophage activation, granuloma formation.", "Autophagy genes (ATG16L1, IRGM): defective intracellular bacterial clearance."] },
      { heading: "Management", points: ["Induction: corticosteroids (prednisolone, budesonide for ileocolonic).", "Maintenance: azathioprine/6-MP or methotrexate; anti-TNF for moderate-severe.", "Biological escalation: vedolizumab (anti-α4β7), ustekinumab/risankizumab (anti-IL-23).", "Surgery: resection for strictures/fistulae; not curative — setons for perianal fistulae."] },
    ],
  },
  {
    id: "hodgkin",
    title: "Hodgkin Lymphoma — Classical Type",
    subtitle: "Rare Reed-Sternberg cells in a reactive inflammatory background",
    category: "Haematology", tags: ["lymphoma", "Hodgkin", "Reed-Sternberg", "CD30", "CD15", "ABVD"],
    difficulty: "Intermediate", imageSlug: "hodgkin",
    keyFact: "Cure rate >85% in early-stage classical HL with ABVD ± radiotherapy — one of the most curable cancers in young adults.",
    pearl: "RS cells = CD30+, CD15+, PAX5 weakly+, CD20−, CD45−. Owl-eye nucleoli (two large eosinophilic nucleoli) are the morphological hallmark.",
    sections: [
      { heading: "Reed-Sternberg Morphology", points: ["Large binucleate/multinucleate cells with prominent eosinophilic 'owl-eye' nucleoli.", "Lacunar variant: cytoplasm retracts during fixation → sits in lacunar space; nodular sclerosis.", "Mononuclear Hodgkin cells: equally significant as classic RS cells.", "RS cells <1–5% of tumour mass; majority is reactive inflammatory stroma."] },
      { heading: "Histological Subtypes", points: ["Nodular Sclerosis (NS, ~70%): collagen bands + nodules; lacunar RS cells; young women; mediastinal mass.", "Mixed Cellularity (MC, ~20%): eosinophils, plasma cells, histiocytes; EBV+ ~75%; older patients.", "Lymphocyte Rich (~5%): small lymphocyte background; rare RS cells; best prognosis.", "Lymphocyte Depleted (rare): many RS cells, few lymphocytes; advanced disease."] },
      { heading: "IHC Profile", points: ["CD30 (+, strong membranous + Golgi): universal; target of brentuximab vedotin.", "CD15 (+, ~80%): helps distinguish from NLPHL (CD45+, CD20+, CD30−) and ALCL.", "PAX5 (weakly +): residual B-cell transcription factor; dim vs strong in B-cell lymphomas.", "CD45−, CD20−: distinguishes classical HL from NLPHL."] },
      { heading: "Treatment", points: ["Early (I-IIA, no bulky): 2–4 cycles ABVD + ISRT; 10-yr OS >90%.", "Advanced (III-IV): 6 cycles ABVD or BrECADD; PET-adapted de-escalation.", "Relapsed/refractory: brentuximab vedotin + salvage → ASCT; nivolumab/pembrolizumab for R/R.", "Late toxicity concern: cardiotoxicity (doxorubicin, radiotherapy) and second malignancies."] },
    ],
  },
  {
    id: "tb",
    title: "Tuberculosis — Granulomatous Inflammation",
    subtitle: "Mycobacterium tuberculosis — caseous necrosis + Langhans giant cells",
    category: "Infectious", tags: ["TB", "granuloma", "caseation", "Langhans", "ZN", "AFB"],
    difficulty: "Beginner", imageSlug: "tb",
    keyFact: "TB is the world's leading infectious cause of death from a single pathogen — one-third of humanity has latent infection.",
    pearl: "Always do ZN stain AND culture — AFBs seen in only 50–70% of TB granulomas. Culture is gold standard and essential for drug sensitivity testing.",
    sections: [
      { heading: "Granuloma Structure", points: ["Central caseous necrosis: amorphous eosinophilic 'cheese-like' debris (necrotic macrophages + bacilli).", "Epithelioid macrophages: activated macrophages with abundant eosinophilic cytoplasm.", "Langhans giant cells: nuclei arranged in horseshoe/peripheral ring (≠ foreign body GCs).", "Peripheral lymphocytic cuff: CD4+ Th1 cells; IFN-γ maintains granuloma integrity."] },
      { heading: "Pathogenesis", points: ["Droplet nuclei → alveolar macrophage phagocytosis; bacilli prevent phagolysosome fusion via Rab7.", "CD4+ Th1 response: IFN-γ activates macrophages → TNF-α + IL-12 → granuloma formation.", "Caseation: Koch phenomenon — tissue damage from immune response, not bacterial toxicity.", "Reactivation: latent TB (IGRA+) reactivates when CD4 counts drop (HIV, anti-TNF therapy)."] },
      { heading: "Investigations", points: ["ZN (Ziehl-Neelsen): AFBs appear bright red on blue background; sensitivity ~50–70%.", "Auramine-rhodamine fluorescence: more sensitive than ZN; AFBs bright yellow on dark.", "Culture (BACTEC MGIT): gold standard; 2–6 weeks; essential for drug sensitivity.", "IGRA / Mantoux: detect latent TB only — not active disease."] },
      { heading: "Treatment", points: ["Active TB: 2HRZE + 4HR (isoniazid + rifampicin + pyrazinamide + ethambutol → INH + RIF).", "MDR-TB: bedaquiline + pretomanid + linezolid (BPaL) × 6 months.", "Latent: 9 months INH, or 3HP (INH + rifapentine × 3 months), or 4 months RIF.", "Biologics: mandatory TB screening (IGRA + CXR) before starting anti-TNF agents."] },
    ],
  },
  {
    id: "dcis",
    title: "Ductal Carcinoma In Situ (DCIS)",
    subtitle: "Non-invasive breast carcinoma confined to ductal basement membrane",
    category: "Oncology", tags: ["breast", "DCIS", "in situ", "comedonecrosis", "ER", "HER2"],
    difficulty: "Intermediate", imageSlug: "dcis",
    keyFact: "DCIS does NOT metastasise. ~30% risk of progression to invasive carcinoma over 10 years if untreated — but low-grade may take decades.",
    pearl: "High-grade DCIS with comedo-necrosis: central necrosis + dystrophic calcification → detected on mammography. Most aggressive variant — highest recurrence risk post-excision.",
    sections: [
      { heading: "Morphological Patterns", points: ["Comedo: large pleomorphic cells, central necrosis, dystrophic 'ghost' calcifications; high grade.", "Cribriform: punched-out round spaces (Roman arches); intermediate grade; most common non-comedo.", "Micropapillary: club-shaped projections without fibrovascular cores.", "Solid: sheets of cells fill duct completely; variable grade."] },
      { heading: "Grading", points: ["Grade 1 (low): small uniform nuclei (1–1.5 RBC diameter), no necrosis.", "Grade 2 (intermediate): 1.5–2 RBC nuclei; some necrosis may be present.", "Grade 3 (high): >2 RBC nuclei; prominent nucleoli; comedo necrosis; dystrophic calcification.", "Grade drives recurrence risk and treatment intensity (radiotherapy ± endocrine decision)."] },
      { heading: "IHC", points: ["ER (+, ~70–80%): low-grade DCIS almost always ER+; drives endocrine therapy recommendation.", "HER2 (+, ~40%): high-grade DCIS frequently HER2-amplified; correlates with comedo.", "E-cadherin (+): positive in DCIS; NEGATIVE in LCIS — key distinction.", "Ki-67: high in Grade 3; correlates with comedo pattern."] },
      { heading: "Management", points: ["BCS: wide local excision with ≥2mm clear margins.", "Radiotherapy: reduces ipsilateral recurrence ~50%; recommended for Grade 3 or close margins.", "Mastectomy: extensive/multifocal DCIS, BRCA mutation, or patient preference.", "Endocrine therapy: tamoxifen (premenopausal) or AI (postmenopausal) for ER+ DCIS."] },
    ],
  },
  {
    id: "prostate-adca",
    title: "Prostatic Adenocarcinoma",
    subtitle: "Acinar adenocarcinoma — most common cancer in men",
    category: "Oncology", tags: ["prostate", "Gleason", "PSA", "AMACR", "PSMA"],
    difficulty: "Intermediate", imageSlug: "prostate",
    keyFact: "Gleason pattern 5 (no gland formation — sheets, cords, single cells) carries the highest risk of lethal disease, regardless of total score.",
    pearl: "Prostatic adenocarcinoma lacks a basal cell layer (CK5/6 and p63 negative). AMACR (P504S) confirms malignancy in equivocal glands.",
    sections: [
      { heading: "Gleason Grading (ISUP 2014)", points: ["Pattern 3: well-formed, separate, infiltrating glands → ISUP Grade Group 1 (3+3=6).", "Pattern 4: poorly formed/cribriform/glomeruloid → GG 2 (3+4) or 3 (4+3).", "Pattern 5: no gland formation — sheets, cords, single cells, comedo necrosis → GG 4–5.", "Report primary + secondary pattern; tertiary worst pattern noted separately."] },
      { heading: "Morphological Clues", points: ["Prominent nucleolus (≥1 µm 'red dot'); nuclear enlargement.", "Intraluminal: crystalloids (angular eosinophilic), blue mucinous secretions.", "Perineural invasion: glands wrap around nerve fibres — pathognomonic of carcinoma.", "Extraprostatic extension (EPE): glands beyond pseudocapsule → pT3 staging."] },
      { heading: "IHC Panel", points: ["AMACR (P504S +): α-methylacyl-CoA racemase; positive in carcinoma, negative in benign.", "Basal markers (CK5/6, p63) NEGATIVE: confirms absence of basal cell layer.", "PSA (+): confirms prostatic origin; may be negative in high-grade.", "PSMA (+): target of ¹⁷⁷Lu-PSMA-617 radioligand therapy."] },
      { heading: "Treatment by Stage", points: ["Low-risk localised (GG1): active surveillance.", "High-risk localised (GG3–5): radical prostatectomy ± LN dissection, or EBRT + 18–36 months ADT.", "Metastatic CSPC: ADT + docetaxel or abiraterone or enzalutamide (TITAN/ARASENS).", "mCRPC: enzalutamide, abiraterone, ¹⁷⁷Lu-PSMA-617, olaparib (BRCA-mutated)."] },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function getCategories(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const inf of LIBRARY) {
    if (!seen.has(inf.category)) { seen.add(inf.category); out.push(inf.category); }
  }
  return out.sort();
}

// ── Grid card ──────────────────────────────────────────────────────────────

function LibraryCard({ inf, onClick }: { inf: LibraryInfographic; onClick: () => void }) {
  const catColor = CATEGORY_COLORS[inf.category] ?? "bg-slate-100 text-slate-600";

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
    >
      {inf.imageSlug && (
        <div className="relative h-28 bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
          <img
            src={`/slides/${inf.imageSlug}.jpg`}
            alt={inf.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
          <span className={clsx("absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full", catColor)}>
            {inf.category}
          </span>
          <span className={clsx("absolute top-2 right-2 text-[10px] font-semibold", DIFFICULTY_COLOR[inf.difficulty])}>
            {inf.difficulty}
          </span>
        </div>
      )}
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs leading-snug line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {inf.title}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 flex-1">{inf.subtitle}</p>
        <div className="flex items-center justify-between mt-0.5">
          <div className="flex items-start gap-1 bg-amber-50 dark:bg-amber-900/20 rounded px-1.5 py-1 flex-1 mr-2">
            <Star className="w-2.5 h-2.5 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-amber-700 dark:text-amber-300 line-clamp-2 leading-snug">{inf.keyFact}</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-500 flex-shrink-0" />
        </div>
      </div>
    </button>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────────

function DetailPanel({ inf, onBack }: { inf: LibraryInfographic; onBack: () => void }) {
  const catColor = CATEGORY_COLORS[inf.category] ?? "bg-slate-100 text-slate-600";

  return (
    <div className="flex flex-col h-full">
      {/* Hero header — matches InfographicView style */}
      <div className="relative overflow-hidden flex-shrink-0">
        {inf.imageSlug ? (
          <>
            <div className="h-36 overflow-hidden">
              <img src={`/slides/${inf.imageSlug}.jpg`} alt={inf.title} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-transparent" />
          </>
        ) : (
          <div className="h-24 bg-gradient-to-br from-primary-600 via-violet-600 to-primary-700" />
        )}

        {/* Overlay content */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-2">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-white/80 hover:text-white text-xs font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Library
            </button>
            <span className="text-white/40 text-xs">/</span>
            <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-full", catColor)}>
              {inf.category}
            </span>
            <span className={clsx("text-[10px] font-semibold ml-auto", DIFFICULTY_COLOR[inf.difficulty])}>
              {inf.difficulty}
            </span>
          </div>
          <h2 className="font-bold text-white text-base sm:text-lg leading-tight">{inf.title}</h2>
          <p className="text-xs text-slate-200 mt-0.5 line-clamp-1">{inf.subtitle}</p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
        {/* Key Fact + Pearl */}
        <div className="grid sm:grid-cols-2 gap-2.5">
          <div className="flex items-start gap-2.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-0.5">Key Fact</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{inf.keyFact}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-0.5">Clinical Pearl</p>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug italic">{inf.pearl}</p>
            </div>
          </div>
        </div>

        {/* Sections grid — mirrors InfographicView */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {inf.sections.map((section, i) => {
            const palette = SECTION_PALETTES[i % SECTION_PALETTES.length];
            return (
              <motion.div
                key={section.heading}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={clsx("rounded-xl border p-3.5", palette.card)}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className={clsx("w-3 h-3 flex-shrink-0", palette.heading)} />
                  <h3 className={clsx("text-[11px] font-bold uppercase tracking-wide leading-tight", palette.heading)}>
                    {section.heading}
                  </h3>
                </div>
                <ul className="space-y-1.5">
                  {section.points.map((pt, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5", palette.dot)} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {inf.tags.map(tag => (
            <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2 py-0.5">#{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main modal component ───────────────────────────────────────────────────

interface InfographicsLibraryProps {
  onClose: () => void;
}

export default function InfographicsLibrary({ onClose }: InfographicsLibraryProps) {
  const [query,       setQuery]       = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [selectedDiff,setSelectedDiff]= useState("All");
  const [catOpen,     setCatOpen]     = useState(false);
  const [detail,      setDetail]      = useState<LibraryInfographic | null>(null);

  const categories = useMemo(() => ["All", ...getCategories()], []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return LIBRARY.filter(inf => {
      if (selectedCat  !== "All" && inf.category   !== selectedCat)  return false;
      if (selectedDiff !== "All" && inf.difficulty  !== selectedDiff) return false;
      if (q && ![inf.title, inf.subtitle, inf.category, inf.keyFact, inf.pearl, ...inf.tags]
          .some(s => s.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [query, selectedCat, selectedDiff]);

  const handleOpen  = useCallback((inf: LibraryInfographic) => setDetail(inf), []);
  const handleBack  = useCallback(() => setDetail(null), []);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal shell — same shape as InfographicView */}
        <motion.div
          className="relative bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-4xl flex flex-col"
          style={{ maxHeight: "92dvh" }}
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
        >
          {detail ? (
            /* ── Detail view ─────────────────────────────── */
            <DetailPanel inf={detail} onBack={handleBack} />
          ) : (
            /* ── Library grid ────────────────────────────── */
            <>
              {/* Header — gradient matching InfographicView */}
              <div className="relative overflow-hidden rounded-t-3xl sm:rounded-t-3xl flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-violet-600 to-primary-700" />
                <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
                <div className="relative px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 bg-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" /> PathoLearn Infographics Library
                    </span>
                    <button
                      onClick={onClose}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      aria-label="Close library"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mb-0.5">
                    {LIBRARY.length} Curated Study Guides
                  </h1>
                  <p className="text-sm text-white/70">Browse visual summaries across pathology specialties</p>

                  {/* Search + filters inside header */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 pointer-events-none" />
                      <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search diagnosis, keyword, tag…"
                        className="w-full pl-8 pr-8 py-2 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                      {query && (
                        <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Category dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setCatOpen(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white hover:bg-white/20 transition-colors whitespace-nowrap"
                      >
                        <Filter className="w-3.5 h-3.5 text-white/60" />
                        {selectedCat === "All" ? "All Categories" : selectedCat}
                        <ChevronDown className={clsx("w-3.5 h-3.5 text-white/60 transition-transform", catOpen && "rotate-180")} />
                      </button>
                      {catOpen && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 max-h-60 overflow-y-auto">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => { setSelectedCat(cat); setCatOpen(false); }}
                              className={clsx(
                                "w-full text-left px-3 py-1.5 text-xs transition-colors",
                                selectedCat === cat
                                  ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 font-semibold"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700",
                              )}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Difficulty pills */}
                    <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-xl px-1.5 py-1">
                      {["All", "Beginner", "Intermediate", "Advanced"].map(d => (
                        <button
                          key={d}
                          onClick={() => setSelectedDiff(d)}
                          className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                            selectedDiff === d ? "bg-white text-primary-700 shadow-sm" : "text-white/70 hover:text-white",
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Results count */}
              <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {filtered.length === LIBRARY.length
                    ? `${LIBRARY.length} infographics`
                    : `${filtered.length} of ${LIBRARY.length} matching`}
                </span>
                {(selectedCat !== "All" || selectedDiff !== "All" || query) && (
                  <button
                    onClick={() => { setSelectedCat("All"); setSelectedDiff("All"); setQuery(""); }}
                    className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4">
                {filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">No infographics found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try a different search term or clear the filters.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filtered.map(inf => (
                      <LibraryCard key={inf.id} inf={inf} onClick={() => handleOpen(inf)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer — matches InfographicView footer */}
              <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700 px-4 py-3 sm:px-5 flex items-center justify-between bg-white dark:bg-slate-900 rounded-b-3xl">
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  AI-generated educational content — not for clinical use
                </p>
                <button
                  onClick={onClose}
                  className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-3 py-1.5"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
