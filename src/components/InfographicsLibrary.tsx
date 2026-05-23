"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, X, ChevronRight, BookOpen, Lightbulb, Zap, Star, Filter, ChevronDown, ExternalLink } from "lucide-react";
import { clsx } from "clsx";

// ── Types ──────────────────────────────────────────────────────────────────

interface InfographicSection {
  heading: string;
  points: string[];
  color?: string; // optional accent color class
}

interface Infographic {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  tags: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  imageSlug?: string; // /public/slides/<imageSlug>.jpg
  keyFact: string;
  pearl: string;
  sections: InfographicSection[];
}

// ── Colour palette for section headings ───────────────────────────────────

const SECTION_COLORS = [
  "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
  "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300",
  "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300",
  "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
  "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300",
];

const CATEGORY_COLORS: Record<string, string> = {
  Oncology:     "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
  Nephrology:   "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  Hepatology:   "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  Pulmonology:  "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
  Cardiology:   "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  Gastroenterology: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  Neuropathology: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  Haematology:  "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  Endocrinology:"bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300",
  "Gynaecological Pathology": "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300",
  Dermatopathology: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  "Normal Histology": "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300",
  Immunopathology: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
  "Bone & Soft Tissue": "bg-stone-100 dark:bg-stone-800/50 text-stone-700 dark:text-stone-300",
  Infectious:   "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
};

const DIFFICULTY_COLOR = {
  Beginner:     "text-emerald-600 dark:text-emerald-400",
  Intermediate: "text-amber-600 dark:text-amber-400",
  Advanced:     "text-rose-600 dark:text-rose-400",
};

// ── Curated Infographic Library ────────────────────────────────────────────

const LIBRARY: Infographic[] = [
  // ── Oncology ──────────────────────────────────────────────────────────────
  {
    id: "gbm-who4",
    title: "Glioblastoma, IDH-Wildtype (WHO Grade 4)",
    subtitle: "Most common primary malignant brain tumour in adults",
    category: "Neuropathology",
    tags: ["brain", "glioma", "WHO grade 4", "IDH wildtype", "EGFR", "TERT"],
    difficulty: "Advanced",
    imageSlug: "gbm",
    keyFact: "Median survival ~15 months despite maximal therapy; MGMT methylation predicts temozolomide response.",
    pearl: "Pseudopalisading necrosis + microvascular proliferation = diagnostic of GBM. Always order IDH, EGFR amp, TERT, and MGMT in adults.",
    sections: [
      {
        heading: "Histological Hallmarks",
        points: [
          "Pseudopalisading necrosis: tumour cells palisade around central necrotic foci — a defining WHO Grade 4 feature.",
          "Microvascular proliferation: glomeruloid vascular tufts reflecting VEGF-driven angiogenesis.",
          "Marked cellular pleomorphism with frequent atypical mitoses.",
          "Hypercellular glial neoplasm with nuclear hyperchromasia.",
        ],
      },
      {
        heading: "Molecular Profile",
        points: [
          "IDH-wildtype (by definition in adults ≥55 yrs): absence of IDH1/2 mutation confirms aggressive phenotype.",
          "EGFR amplification (~40–50%): drives proliferation; EGFR vIII variant highly specific for GBM.",
          "TERT promoter mutation (>80%): extends telomere length, sustains immortalisation.",
          "PTEN loss and CDKN2A/B deletion compound the proliferative advantage.",
        ],
      },
      {
        heading: "Pathogenesis",
        points: [
          "Driver mutations activate PI3K/AKT and RAS/MAPK pathways → uncontrolled glial proliferation.",
          "Vascular occlusion and rapid growth create hypoxic foci → HIF-1α upregulates VEGF → necrosis.",
          "Hypoxic cells migrate outward → pseudopalisading pattern; cells at periphery secrete pro-migratory signals.",
          "Immunosuppressive microenvironment: high TGF-β, IL-10; macrophage/microglia infiltration sustains tumour.",
        ],
      },
      {
        heading: "IHC Markers",
        points: [
          "GFAP (+): confirms glial origin in most tumour cells.",
          "IDH1 R132H immunostain NEGATIVE (wildtype).",
          "Ki-67 >20%: reflects high proliferative index.",
          "EGFR (+, amplified): detected by FISH or IHC overexpression.",
        ],
      },
      {
        heading: "Treatment & Prognosis",
        points: [
          "Stupp protocol: maximal safe resection → concurrent temozolomide + radiotherapy → adjuvant temozolomide.",
          "MGMT promoter methylation (~45%): epigenetic silencing improves temozolomide efficacy; best survival predictor.",
          "Bevacizumab (anti-VEGF): improves PFS but not OS; used for recurrent disease.",
          "Median OS ~15 months; MGMT-methylated patients may reach 20–24 months.",
        ],
      },
    ],
  },
  {
    id: "idc-breast",
    title: "Invasive Ductal Carcinoma of the Breast",
    subtitle: "NST — most common breast malignancy (~75% of cases)",
    category: "Oncology",
    tags: ["breast", "IDC", "NST", "ER", "PR", "HER2", "grade"],
    difficulty: "Intermediate",
    imageSlug: "idc",
    keyFact: "Grade 3 IDC with HER2 amplification: trastuzumab + pertuzumab + chemotherapy significantly improves OS.",
    pearl: "Always report Nottingham grade (tubule formation + nuclear pleomorphism + mitotic count), ER/PR, HER2, and Ki-67 — these drive treatment.",
    sections: [
      {
        heading: "Histology",
        points: [
          "Infiltrating nests, cords, trabeculae, or solid sheets of malignant ductal epithelial cells in desmoplastic stroma.",
          "Nottingham Grading: tubule formation (1–3) + nuclear pleomorphism (1–3) + mitotic count (1–3); total 3–9 → G1/G2/G3.",
          "Desmoplastic stroma: dense fibroblastic reaction; associated with firm, hard mass clinically ('scirrhous' carcinoma).",
          "Lymphovascular invasion (LVI): key prognostic feature; associated with nodal metastasis.",
        ],
      },
      {
        heading: "Molecular Subtypes",
        points: [
          "Luminal A (ER+/PR+, HER2−, Ki-67 low): best prognosis; endocrine therapy alone.",
          "Luminal B (ER+, HER2+ or high Ki-67): intermediate; chemo + endocrine ± anti-HER2.",
          "HER2-enriched (ER−/PR−, HER2+): anti-HER2 therapy essential (trastuzumab + pertuzumab).",
          "Triple-negative (ER−/PR−, HER2−): worst prognosis; chemotherapy ± immunotherapy (pembrolizumab).",
        ],
      },
      {
        heading: "Key IHC Panel",
        points: [
          "ER/PR (nuclear): Allred score ≥3 = positive; drives endocrine therapy eligibility.",
          "HER2: IHC 3+ or FISH amplification = positive; targets trastuzumab, pertuzumab, T-DM1.",
          "Ki-67 ≥20% = high proliferation → favours chemotherapy.",
          "CK5/6 + EGFR positivity in ER-negative tumours: supports basal-like/TNBC phenotype.",
        ],
      },
      {
        heading: "Prognostic Factors",
        points: [
          "Tumour size, nodal status, grade, and LVI are incorporated into Nottingham Prognostic Index (NPI).",
          "Oncotype DX (21-gene assay): guides chemo decision in ER+/HER2−/N0 patients; recurrence score >25 → add chemo.",
          "BRCA1/2 mutation: ~10% of breast cancers; PARP inhibitors (olaparib) now standard in BRCA-mutated HER2− metastatic disease.",
        ],
      },
    ],
  },
  {
    id: "crc",
    title: "Colorectal Adenocarcinoma",
    subtitle: "Arising from adenomatous polyps via chromosomal or microsatellite instability",
    category: "Gastroenterology",
    tags: ["colon", "CRC", "adenocarcinoma", "MSI", "CIN", "KRAS", "BRAF"],
    difficulty: "Intermediate",
    imageSlug: "crc",
    keyFact: "~15% of CRC is MSI-H; these patients respond to immune checkpoint inhibitors (pembrolizumab) regardless of line of therapy.",
    pearl: "KRAS/NRAS wild-type metastatic CRC → add cetuximab or panitumumab to FOLFOX/FOLFIRI. BRAF V600E mutation confers poor prognosis; add encorafenib.",
    sections: [
      {
        heading: "Morphology",
        points: [
          "Moderately differentiated gland-forming adenocarcinoma most common; back-to-back glands with dirty necrosis.",
          "Mucinous adenocarcinoma (>50% extracellular mucin): common in MSI-H tumours.",
          "Signet ring cell variant (<10% mucin in cytoplasm): poor prognosis, often diffusely infiltrating.",
          "Tumour budding (single cells or clusters ≤4 at invasive front): high-grade budding = adverse prognosis.",
        ],
      },
      {
        heading: "Molecular Pathways",
        points: [
          "Chromosomal Instability (CIN, ~80%): APC → KRAS → SMAD4 → TP53 mutations (Vogelstein sequence).",
          "Microsatellite Instability (MSI-H, ~15%): mismatch repair (MMR) deficiency → Lynch syndrome or MLH1 methylation (sporadic).",
          "CpG Island Methylator Phenotype (CIMP): epigenetic silencing; frequently BRAF V600E mutated.",
          "KRAS/NRAS mutation (~50%): activates RAS/MAPK, renders anti-EGFR therapy ineffective.",
        ],
      },
      {
        heading: "IHC & Biomarkers",
        points: [
          "MMR IHC (MLH1, MSH2, MSH6, PMS2): loss of nuclear staining = MMR deficient (dMMR/MSI-H) → IO eligibility.",
          "CDX2 (+): confirms colorectal origin in metastases.",
          "CK20+/CK7−: classic CRC IHC profile.",
          "BRAF V600E IHC: positive in ~10% of sporadic CRC (almost all MLH1-hypermethylated).",
        ],
      },
      {
        heading: "Staging & Treatment",
        points: [
          "TNM staging: T1–4 depth of invasion; N1–2 nodal involvement; M1 distant mets.",
          "Stage II–III: adjuvant FOLFOX (5-FU + oxaliplatin) for high-risk Stage II and all Stage III.",
          "Metastatic: FOLFOX or FOLFIRI ± bevacizumab (anti-VEGF) or cetuximab (RAS/RAF wildtype).",
          "MSI-H metastatic CRC: pembrolizumab first-line; median PFS doubled vs chemotherapy.",
        ],
      },
    ],
  },
  {
    id: "hcc",
    title: "Hepatocellular Carcinoma (HCC)",
    subtitle: "Arising in cirrhotic liver — third leading cause of cancer death worldwide",
    category: "Hepatology",
    tags: ["liver", "HCC", "cirrhosis", "HBV", "HCV", "AFP", "sorafenib"],
    difficulty: "Advanced",
    imageSlug: "hcc",
    keyFact: "HCC is one of the few cancers diagnosed radiologically (LI-RADS 5 on contrast CT/MRI) without mandatory biopsy.",
    pearl: "Arterial hyperenhancement + portal venous washout = characteristic HCC imaging hallmark. AFP >400 ng/mL is highly specific.",
    sections: [
      {
        heading: "Histology",
        points: [
          "Trabecular pattern most common: tumour cells in plates 3+ cells thick, traversed by sinusoidal vascular channels.",
          "Pseudoglandular/acinar pattern: bile canaliculi formation within trabeculae.",
          "Cytology: large polygonal cells, abundant eosinophilic cytoplasm, prominent nucleoli; bile pigment may be present.",
          "Fibro-lamellar variant: young patients, no cirrhosis, large cells with abundant mitochondria, dense lamellar fibrosis — better prognosis.",
        ],
      },
      {
        heading: "Aetiology & Risk Factors",
        points: [
          "Hepatitis B (HBsAg integration into host genome → HBx protein → TP53 inactivation) — major risk in Asia/Africa.",
          "Hepatitis C (viral proteins activate Wnt/β-catenin, inhibit RIG-I/IFN signalling) — major risk in the West.",
          "Aflatoxin B1 (Aspergillus-contaminated food): causes TP53 R249S hotspot mutation.",
          "Metabolic-associated steatohepatitis (MASH) and alcohol: increasing cause in Western countries.",
        ],
      },
      {
        heading: "Molecular Alterations",
        points: [
          "TERT promoter mutation (~60%): most common; activates telomerase.",
          "TP53 mutation (~30%): especially in HBV-related and aflatoxin-associated HCC.",
          "CTNNB1 (β-catenin, ~30%): Wnt pathway activation → glutamine synthetase overexpression (IHC marker).",
          "VEGFR, FGF, MET pathways: targetable by sorafenib, lenvatinib, and cabozantinib.",
        ],
      },
      {
        heading: "IHC Markers",
        points: [
          "HepPar-1 (+): hepatocyte-specific mitochondrial antigen; highly specific for HCC.",
          "Arginase-1 (+): more sensitive and specific than HepPar-1 for hepatocellular differentiation.",
          "Glypican-3 (GPC3, +): oncofetal antigen; positive in HCC, negative in normal liver.",
          "AFP (elevated in serum, variable IHC): >400 ng/mL highly specific for HCC.",
        ],
      },
      {
        heading: "Treatment by Stage",
        points: [
          "Very early/early (BCLC 0-A): curative — resection, liver transplant (Milan criteria), or ablation (RFA/MWA).",
          "Intermediate (BCLC B): trans-arterial chemoembolisation (TACE).",
          "Advanced (BCLC C): sorafenib or lenvatinib (first-line); atezolizumab + bevacizumab improved OS in IMbrave150.",
          "Immunotherapy: pembrolizumab, nivolumab ± ipilimumab for advanced/refractory HCC.",
        ],
      },
    ],
  },
  {
    id: "dlbcl",
    title: "Diffuse Large B-Cell Lymphoma (DLBCL)",
    subtitle: "Most common aggressive non-Hodgkin lymphoma in adults (~30% of NHL)",
    category: "Haematology",
    tags: ["lymphoma", "DLBCL", "NHL", "BCL2", "MYC", "CD20", "R-CHOP"],
    difficulty: "Advanced",
    imageSlug: "dlbcl",
    keyFact: "Double-hit DLBCL (MYC + BCL2/BCL6 rearrangement) = High-Grade B-Cell Lymphoma; requires DA-EPOCH-R not standard R-CHOP.",
    pearl: "GCB vs non-GCB subtype by Hans algorithm (CD10, BCL6, MUM1 IHC) predicts prognosis; non-GCB has worse OS with R-CHOP.",
    sections: [
      {
        heading: "Histology",
        points: [
          "Diffuse effacement of nodal architecture by large atypical lymphoid cells (nucleus ≥ 2× normal lymphocyte).",
          "Centroblastic variant: large cells with prominent peripheral nucleoli and moderate pale cytoplasm (most common).",
          "Immunoblastic variant: single central macronucleolus, abundant cytoplasm; more often non-GCB.",
          "Anaplastic variant: hallmark cells with horseshoe/wreath nuclei; must distinguish from ALCL — check ALK.",
        ],
      },
      {
        heading: "Cell of Origin (COO)",
        points: [
          "Germinal Centre B-cell (GCB): CD10+, BCL6+, MUM1−; better prognosis; BCL2 from t(14;18); standard R-CHOP appropriate.",
          "Activated B-cell (ABC/non-GCB): MYD88, CD79B mutations; NF-κB activation; worse OS with R-CHOP.",
          "Hans algorithm: CD10+ → GCB; CD10−, BCL6+, MUM1− → GCB; else → non-GCB.",
          "Gene expression profiling (Lymph2Cx) is gold standard for COO but IHC is routine clinical practice.",
        ],
      },
      {
        heading: "Key Molecular Events",
        points: [
          "BCL2 t(14;18) translocation: anti-apoptotic; present in ~30%; venetoclax targets BCL2.",
          "MYC rearrangement: ~10%; drives proliferation; combined with BCL2/BCL6 → 'double/triple-hit' = HGBCL.",
          "MYD88 L265P mutation: constitutive TLR/NF-κB signalling; characteristic of ABC-DLBCL and primary CNS lymphoma.",
          "CD79B mutation: co-occurs with MYD88 in ABC-DLBCL; both sensitise to ibrutinib/lenalidomide.",
        ],
      },
      {
        heading: "IHC Panel",
        points: [
          "CD20 (+): pan-B marker; target of rituximab; CD20-negative variants require alternative therapy.",
          "CD10, BCL6, MUM1/IRF4: determine cell of origin (Hans algorithm).",
          "BCL2, MYC protein IHC: 'double expressors' (BCL2 >50%, MYC >40%) have worse prognosis even without rearrangement.",
          "Ki-67 >90%: very high proliferative index; consider HGBCL or Burkitt vs DLBCL.",
        ],
      },
      {
        heading: "Treatment",
        points: [
          "Standard: R-CHOP (rituximab + cyclophosphamide + doxorubicin + vincristine + prednisone) × 6 cycles.",
          "Double-hit/HGBCL: DA-EPOCH-R (dose-adjusted); CNS prophylaxis indicated.",
          "Relapsed/refractory: CAR-T (axicabtagene ciloleucel, lisocabtagene maraleucel) if eligible.",
          "Polatuzumab vedotin (anti-CD79b ADC): approved in R/R; pola-BR is standard option.",
        ],
      },
    ],
  },
  {
    id: "ccrcc",
    title: "Clear Cell Renal Cell Carcinoma (ccRCC)",
    subtitle: "Most common renal malignancy (~75% of kidney cancers) — VHL-driven",
    category: "Nephrology",
    tags: ["kidney", "RCC", "ccRCC", "VHL", "HIF", "VEGF", "mTOR"],
    difficulty: "Intermediate",
    imageSlug: "ccrcc",
    keyFact: "VHL mutation/hypermethylation in >90% of sporadic ccRCC → HIF stabilisation → VEGF overproduction — explains sensitivity to anti-VEGF therapy.",
    pearl: "Clear cytoplasm = lipid and glycogen washed out during processing. Intratumoral vascularity and 'chicken-wire' sinusoidal pattern are characteristic.",
    sections: [
      {
        heading: "Histology",
        points: [
          "Clear cells: abundant cytoplasm optically clear due to dissolved lipid and glycogen (H&E artefact).",
          "Delicate 'chicken-wire' vasculature: thin-walled sinusoids separating nested or acinar cell groups.",
          "Fuhrman/WHO-ISUP nuclear grade 1–4: nucleolar prominence at 100× (G2), 400× (G3), macronucleoli (G3), pleomorphism/sarcomatoid (G4).",
          "Sarcomatoid/rhabdoid dedifferentiation: any grade → aggressive behaviour; poor prognosis.",
        ],
      },
      {
        heading: "Molecular Biology",
        points: [
          "VHL biallelic inactivation (mutation + LOH) in >90%: loss of VHL → HIF-1α/2α accumulate → VEGF, PDGF, EPO upregulation.",
          "SETD2, BAP1, PBRM1, KDM5C (chromatin remodellers): secondary mutations affect prognosis.",
          "BAP1 loss: worst prognosis in ccRCC; mutually exclusive with PBRM1 mutation.",
          "mTORC1 pathway activation via PIK3CA/PTEN: explains mTOR inhibitor (everolimus/temsirolimus) activity.",
        ],
      },
      {
        heading: "IHC Markers",
        points: [
          "CA-IX (carbonic anhydrase IX, +): HIF target; membranous 'box-like' staining; highly sensitive for ccRCC.",
          "PAX8 (+): renal lineage marker; helps identify metastatic origin.",
          "CD10 (+): proximal tubule brush border antigen.",
          "CK7 (−): distinguishes from chromophobe RCC (CK7 diffuse +) and papillary RCC (CK7 focal +).",
        ],
      },
      {
        heading: "Treatment",
        points: [
          "Localised: partial or radical nephrectomy; active surveillance for T1a <3cm.",
          "Metastatic first-line: ipilimumab + nivolumab (CheckMate 214) or pembrolizumab + axitinib (KEYNOTE-426) — both superior to sunitinib.",
          "Sunitinib/pazopanib: VEGFR TKIs; alternative in intermediate-risk or IO-ineligible patients.",
          "Second-line: cabozantinib or nivolumab; everolimus (mTOR inhibitor) in later lines.",
        ],
      },
    ],
  },
  {
    id: "melanoma",
    title: "Malignant Melanoma",
    subtitle: "Arising from melanocytes — deadliest skin cancer due to metastatic potential",
    category: "Dermatopathology",
    tags: ["skin", "melanoma", "BRAF", "Breslow", "sentinel", "immunotherapy"],
    difficulty: "Intermediate",
    imageSlug: "melanoma",
    keyFact: "Breslow thickness is the single most important prognostic factor — thickness >4 mm has ~50% 5-year survival vs >95% for <1 mm.",
    pearl: "BRAF V600E mutation in ~50% of cutaneous melanomas: vemurafenib + cobimetinib targets this; always test BRAF in unresectable/metastatic disease.",
    sections: [
      {
        heading: "Histological Features",
        points: [
          "Upward (pagetoid) spread of atypical melanocytes into the epidermis above the dermal-epidermal junction.",
          "Radial growth phase: intraepidermal/superficial dermal spread without metastatic potential.",
          "Vertical growth phase: deep dermal invasion → metastatic risk; Breslow thickness measured here.",
          "Cytological atypia: large nuclei, prominent eosinophilic 'cherry-red' nucleoli, mitoses in dermis.",
        ],
      },
      {
        heading: "Subtypes",
        points: [
          "Superficial spreading (~70%): most common; flat lesion with lateral growth before invasion; sun-exposed sites.",
          "Nodular (~15%): rapidly growing, ulcerated, vertical growth from onset; worst prognosis per equivalent thickness.",
          "Lentigo maligna: slow-growing on chronically sun-damaged skin (face) in elderly; good prognosis if caught early.",
          "Acral lentiginous (~5%): palms, soles, subungual; BRAF-low; CKIT mutations more common.",
        ],
      },
      {
        heading: "Molecular Targets",
        points: [
          "BRAF V600E/K (~50%): BRAF+MEK inhibitor combination (vemurafenib+cobimetinib, dabrafenib+trametinib) → rapid responses.",
          "NRAS mutation (~20%): activates RAS/MAPK; no targeted therapy; worse prognosis in BRAF-wildtype.",
          "KIT mutation/amplification (acral/mucosal ~15%): imatinib may be effective.",
          "High TMB: immunotherapy (PD-1 blockade) highly effective; ~40% durable response.",
        ],
      },
      {
        heading: "Staging & Prognosis",
        points: [
          "Breslow thickness (tumour depth from granular layer to deepest melanocyte): <1mm, 1–2mm, 2–4mm, >4mm.",
          "Clark level (I–V) less prognostically important than Breslow but useful in thin tumours.",
          "Ulceration and mitotic rate ≥1/mm²: upstage T1 lesions.",
          "Sentinel lymph node biopsy (SLNB): indicated for T1b and above; nodal positivity drives adjuvant therapy.",
        ],
      },
      {
        heading: "Treatment",
        points: [
          "Primary: wide local excision with margins based on Breslow thickness (1 cm for <1mm, 2 cm for >2mm).",
          "Adjuvant (Stage III): nivolumab, pembrolizumab, or dabrafenib+trametinib (BRAF-mutant).",
          "Metastatic: PD-1 ± CTLA-4 (nivolumab + ipilimumab) for high TMB; BRAF+MEK inhibitors for BRAF V600.",
          "Durable responses in ~40% with PD-1 monotherapy; combination IO improves response rate but increases toxicity.",
        ],
      },
    ],
  },
  // ── Nephrology ──────────────────────────────────────────────────────────
  {
    id: "rpgn",
    title: "Rapidly Progressive Glomerulonephritis (RPGN)",
    subtitle: "Crescentic GN — medical emergency requiring urgent immunosuppression",
    category: "Nephrology",
    tags: ["kidney", "GN", "crescents", "RPGN", "pauci-immune", "anti-GBM", "immune complex"],
    difficulty: "Advanced",
    imageSlug: "rpgn",
    keyFact: "Crescent formation in >50% of glomeruli = RPGN by definition. Untreated, >90% progress to ESRD within weeks.",
    pearl: "Classify RPGN by IF pattern first: linear IgG = anti-GBM (Goodpasture); granular = immune complex; negative/pauci = ANCA vasculitis. Treat ANCA with rituximab or cyclophosphamide + steroids.",
    sections: [
      {
        heading: "Pathology",
        points: [
          "Crescents: proliferating parietal epithelial cells (PECs) + infiltrating macrophages fill Bowman's space → compress glomerular tuft.",
          "Fibrocellular → fibrous progression: cellular crescents (acute, reversible) → fibrous (chronic, irreversible scarring).",
          "GBM disruption (breaches): fibrin/plasma proteins enter Bowman's space → crescent formation stimulus.",
          "Rapid loss of GFR correlates with percentage glomeruli with crescents.",
        ],
      },
      {
        heading: "Classification by Immunofluorescence",
        points: [
          "Type I — Anti-GBM (linear IgG): autoantibodies target α3 chain of type IV collagen; ± pulmonary haemorrhage (Goodpasture syndrome).",
          "Type II — Immune complex (granular IgG/C3): post-streptococcal, lupus nephritis class IV, IgA nephropathy, cryoglobulinaemia.",
          "Type III — Pauci-immune (no/scant Ig): ANCA-associated vasculitis (GPA, MPA, EGPA); MPO-ANCA or PR3-ANCA positive.",
          "Type IV — Combined anti-GBM + ANCA: ~30% of anti-GBM cases have concurrent ANCA; worst outcomes.",
        ],
      },
      {
        heading: "Investigations",
        points: [
          "Urine: nephritic sediment — dysmorphic RBCs, RBC casts, proteinuria.",
          "Serology: ANCA (PR3/MPO), anti-GBM antibody, ANA/dsDNA (lupus), complement (C3/C4 low in immune complex types).",
          "Renal biopsy: essential — LM, IF, EM for classification.",
          "CXR/CT thorax: pulmonary infiltrates in anti-GBM/Goodpasture or ANCA vasculitis.",
        ],
      },
      {
        heading: "Treatment",
        points: [
          "Type I (anti-GBM): plasma exchange (removes antibodies) + pulse cyclophosphamide + steroids; transplant only after antibody clearance.",
          "Type II (immune complex): treat underlying cause; steroids ± cyclophosphamide for severe lupus nephritis.",
          "Type III (ANCA): rituximab or cyclophosphamide + high-dose steroids; avacopan (C5aR inhibitor) reduces steroid burden.",
          "Dialysis support if oligoanuric; renal recovery depends on crescent maturity at biopsy.",
        ],
      },
    ],
  },
  // ── Cardiology ──────────────────────────────────────────────────────────
  {
    id: "ami",
    title: "Acute Myocardial Infarction — Histological Timeline",
    subtitle: "Morphological changes of ischaemic myocardium from 0–6 weeks post-MI",
    category: "Cardiology",
    tags: ["heart", "MI", "infarction", "coagulative necrosis", "neutrophils", "fibrosis"],
    difficulty: "Intermediate",
    imageSlug: "ami",
    keyFact: "Troponin rises in 4–6 hours but histology shows no changes in first 4–6 hours — myocardium appears normal on H&E in the first few hours despite ongoing ischaemia.",
    pearl: "Key exam question: neutrophils peak at 48–72 hours. Macrophages replace neutrophils by day 5–7. Fibrous scar complete by 6–8 weeks. Rupture risk highest at 3–5 days (neutrophil enzyme release).",
    sections: [
      {
        heading: "0–4 Hours (Reversible Injury)",
        points: [
          "H&E: essentially normal — no visible histological changes despite cell dysfunction.",
          "EM: mitochondrial swelling, glycogen depletion, relaxation of myofibrils.",
          "Wavy fibres (slight): elongated, undulating cardiomyocytes at the infarct border; earliest histological sign (~1–4 hrs).",
          "No inflammatory infiltrate yet.",
        ],
      },
      {
        heading: "4–24 Hours (Irreversible → Coagulative Necrosis)",
        points: [
          "Coagulative necrosis begins: myocytes eosinophilic, nuclear pyknosis/karyolysis, loss of striations.",
          "Contraction band necrosis: hypereosinophilic transverse bands in reperfused areas (STEMI post-PCI).",
          "Interstitial oedema, early neutrophil margination at borders.",
          "Macroscopic: pallor may begin to appear (if >6hr).",
        ],
      },
      {
        heading: "1–3 Days (Acute Inflammation)",
        points: [
          "Dense neutrophil infiltration: peak at 48–72 hours; marginating into necrotic zone.",
          "Neutrophil enzymes (MPO, elastase) dissolve necrotic debris — this is the 'softening' phase → rupture risk.",
          "Nuclear debris (karyorrhexis) visible within necrotic myocytes.",
          "Macroscopic: yellow-white necrotic centre, hyperaemic border.",
        ],
      },
      {
        heading: "5–10 Days (Organisation)",
        points: [
          "Neutrophils replaced by macrophages (phagocytosis of necrotic debris).",
          "Granulation tissue at margins: capillary ingrowth + fibroblast proliferation.",
          "Macrophages (CD68+): engulf lipid and cellular debris; key transition phase.",
          "Macroscopic: soft, yellow-tan central zone with vascularised red-pink border.",
        ],
      },
      {
        heading: "2–8 Weeks (Fibrosis & Remodelling)",
        points: [
          "Progressive collagen deposition (Types I and III): fibroblasts → myofibroblasts → mature scar.",
          "Scar complete at 6–8 weeks: dense hypocellular white fibrous tissue.",
          "Wall thinning and dilatation: infarct expansion precedes ventricular remodelling.",
          "Late complications: ventricular aneurysm, Dressler syndrome, chronic HF.",
        ],
      },
    ],
  },
  {
    id: "atherosclerosis",
    title: "Atherosclerosis — Pathogenesis & Plaque Biology",
    subtitle: "Chronic lipid-driven intimal disease underlying most cardiovascular events",
    category: "Cardiology",
    tags: ["atherosclerosis", "plaque", "foam cells", "lipid", "inflammation", "stenosis"],
    difficulty: "Intermediate",
    imageSlug: "atherosclerosis",
    keyFact: "Vulnerable plaque (thin fibrous cap + large necrotic core + macrophage infiltration) ruptures → thrombus → ACS; stenosis degree does NOT predict rupture risk.",
    pearl: "Only ~20% of acute MIs occur at severe stenoses. It's plaque composition (vulnerability), not luminal narrowing, that drives most acute events.",
    sections: [
      {
        heading: "Pathogenesis (Response-to-Injury)",
        points: [
          "Endothelial dysfunction: turbulent flow, hypertension, smoking, hyperglycaemia → oxidative stress → eNOS downregulation.",
          "LDL retention and oxidation in intima → oxLDL recognised by scavenger receptors on monocyte-derived macrophages.",
          "Foam cell formation: macrophages engulf oxLDL → lipid-laden foam cells (the 'fatty streak' — earliest lesion).",
          "VSMC migration from media: phenotypic switch to synthetic type → collagen production → fibrous cap.",
        ],
      },
      {
        heading: "Plaque Progression",
        points: [
          "Fatty streak: lipid-laden foam cells in intima; reversible; appears from childhood.",
          "Fibrous plaque: foam cells + smooth muscle cells + collagen cap; lipid core + necrotic centre; calcification may develop.",
          "Vulnerable plaque: thin fibrous cap (<65 µm) + large lipid necrotic core + macrophage/T-cell infiltration at shoulder.",
          "Stable plaque: thick cap, small lipid core, dense collagen; more likely to cause stable angina than ACS.",
        ],
      },
      {
        heading: "Plaque Rupture Mechanism",
        points: [
          "MMP release (MMP-1,-9) by macrophages degrades collagen in fibrous cap → cap thinning.",
          "Cap rupture exposes collagen and tissue factor → platelet aggregation + coagulation cascade → thrombus.",
          "Superficial erosion (no rupture): endothelial denudation → thrombus on intact cap; more common in women/young patients.",
          "Calcified nodule: nodule penetrates cap → thrombus; associated with heavily calcified plaques.",
        ],
      },
      {
        heading: "Risk Factors & Targets",
        points: [
          "Traditional modifiable: LDL-C (↓ with statins/PCSK9i), hypertension (↓ with ACE-i/ARB), smoking cessation, diabetes (↓ with GLP-1 RA).",
          "Statins: LDL-C reduction + pleiotropic effects (anti-inflammatory, plaque stabilisation via increased cap collagen).",
          "PCSK9 inhibitors (evolocumab, alirocumab): ↓ LDL-C by ~60%; FOURIER/ODYSSEY trials show ↓CV events beyond statins.",
          "Colchicine/canakinumab: target residual inflammatory risk (hsCRP); COLCOT/CANTOS trials.",
        ],
      },
    ],
  },
  // ── Pulmonology ─────────────────────────────────────────────────────────
  {
    id: "uip",
    title: "Usual Interstitial Pneumonia (UIP) / IPF",
    subtitle: "Idiopathic Pulmonary Fibrosis — progressive, fatal fibrotic lung disease",
    category: "Pulmonology",
    tags: ["lung", "UIP", "IPF", "fibrosis", "honeycomb", "fibroblastic foci"],
    difficulty: "Advanced",
    imageSlug: "uip",
    keyFact: "Median survival in IPF is only 3–5 years from diagnosis; nintedanib and pirfenidone slow decline but do not halt progression.",
    pearl: "UIP pattern = subpleural, basal-predominant honeycombing ± traction bronchiectasis on HRCT. Temporal heterogeneity (old fibrosis + active fibroblastic foci together) is the pathological hallmark.",
    sections: [
      {
        heading: "Histological Pattern",
        points: [
          "Temporal heterogeneity: areas of old dense fibrosis alongside active fibroblastic foci (new collagen deposition).",
          "Fibroblastic foci: small foci of proliferating fibroblasts/myofibroblasts beneath hyperplastic type II pneumocytes — key diagnostic feature.",
          "Honeycomb change: cystically dilated airspaces lined by bronchiolar epithelium in subpleural/basal zones; end-stage fibrosis.",
          "Patchy distribution: alternating areas of normal lung, mild fibrosis, and severe honeycombing.",
        ],
      },
      {
        heading: "Pathogenesis",
        points: [
          "Aberrant epithelial repair hypothesis: repeated micro-injuries → activated type II AECs → TGF-β, PDGF, CTGF release.",
          "Fibroblast → myofibroblast differentiation: TGF-β drives collagen I/III overproduction and inhibits apoptosis.",
          "Failed re-epithelialisation: impaired alveolar regeneration (reduced telomerase activity in surfactant protein mutations).",
          "Vascular remodelling: obliteration of microvasculature → further hypoxia and profibrotic signalling.",
        ],
      },
      {
        heading: "HRCT Features (UIP Pattern)",
        points: [
          "Subpleural, basal-predominant distribution: honeycombing in posterior lower lobes first.",
          "Honeycombing: stacked cystic airspaces (3–10 mm), thick walls — pathognomonic of UIP on HRCT.",
          "Traction bronchiectasis/bronchiolectasis: irreversible airway distortion in fibrotic regions.",
          "Minimal ground-glass opacity: if extensive GGO → consider NSIP or HP instead.",
        ],
      },
      {
        heading: "Diagnosis & Treatment",
        points: [
          "MDT diagnosis (clinician + radiologist + pathologist): HRCT alone sufficient if typical UIP pattern; biopsy for atypical/probable UIP.",
          "Exclude secondary causes: connective tissue disease (ANA, anti-Scl70, anti-Jo1), drugs, HP, occupational exposure.",
          "Antifibrotics: nintedanib (VEGFR/FGFR/PDGFR TKI) or pirfenidone (TGF-β inhibitor); both reduce FVC decline ~50%.",
          "Lung transplant: only curative option; listed early given poor prognosis and long wait times.",
        ],
      },
    ],
  },
  // ── Normal Histology ────────────────────────────────────────────────────
  {
    id: "liver-normal",
    title: "Normal Liver Histology",
    subtitle: "Structural organisation of the hepatic lobule and acinus",
    category: "Normal Histology",
    tags: ["liver", "normal", "hepatocyte", "portal tract", "central vein", "kupffer"],
    difficulty: "Beginner",
    imageSlug: "liver",
    keyFact: "Zone 3 (centrilobular) hepatocytes are most susceptible to ischaemia and drug toxicity (e.g., paracetamol, halothane) due to lowest oxygen tension.",
    pearl: "The hepatic acinus (Rappaport) divides the lobule into zones 1–3 based on proximity to portal tracts. Zone 1 = oxygen-rich, Zone 3 = oxygen-poor.",
    sections: [
      {
        heading: "Structural Organisation",
        points: [
          "Classic hepatic lobule: hexagonal unit centred on central vein, with portal tracts at periphery.",
          "Portal tract (triad): portal vein + hepatic artery + bile duct (± lymphatics) in connective tissue.",
          "Liver plates (cords): single-cell-thick hepatocyte rows radiating from central vein to portal tracts.",
          "Sinusoids: vascular channels between hepatocyte cords, lined by fenestrated endothelium + Kupffer cells.",
        ],
      },
      {
        heading: "Cell Types",
        points: [
          "Hepatocytes (80%): large polygonal cells, central round nucleus, granular eosinophilic cytoplasm, prominent nucleolus.",
          "Kupffer cells: fixed sinusoidal macrophages; phagocytose bacteria, aged RBCs; line sinusoidal walls (CD68+).",
          "Ito (stellate) cells: perisinusoidal fat-storing cells; activated → myofibroblasts → liver fibrosis.",
          "Cholangiocytes: bile duct epithelium; cuboidal, CK7/CK19+; forms biliary network in portal tracts.",
        ],
      },
      {
        heading: "Functional Zonation",
        points: [
          "Zone 1 (periportal): highest O₂ and nutrients; β-oxidation, glycogen synthesis, albumin production predominate.",
          "Zone 2 (mid-lobular): intermediate function; transitions between zones 1 and 3.",
          "Zone 3 (centrilobular): lowest O₂; CYP450 drug metabolism; glutamine synthesis (glutamine synthetase IHC marker); most susceptible to toxins.",
          "Cholestasis = bile accumulates in canaliculi; DILI and obstruction patterns localise to different zones.",
        ],
      },
      {
        heading: "Key IHC Markers",
        points: [
          "HepPar-1: hepatocyte mitochondrial antigen; confirms hepatocyte lineage.",
          "CK7/CK19: bile duct epithelium; negative in normal hepatocytes.",
          "CD68 (PGM1): Kupffer cells; useful in assessing macrophage infiltration (hepatitis, storage disease).",
          "Glutamine synthetase: zone 3 hepatocytes (IHC) — reversed in hepatic adenoma with β-catenin activation (diffuse).",
        ],
      },
    ],
  },
  // ── Endocrinology ───────────────────────────────────────────────────────
  {
    id: "ptc",
    title: "Papillary Thyroid Carcinoma (PTC)",
    subtitle: "Most common thyroid malignancy (~85% of thyroid cancers) — excellent prognosis",
    category: "Endocrinology",
    tags: ["thyroid", "PTC", "papillary", "BRAF", "RET/PTC", "Orphan Annie", "nuclear features"],
    difficulty: "Beginner",
    imageSlug: "ptc",
    keyFact: "10-year survival >95% for most PTC. Lymph node metastasis is common but does NOT worsen prognosis significantly in well-differentiated disease.",
    pearl: "Nuclear features are diagnostic, not papillary architecture! Orphan Annie nuclei (empty, ground-glass), nuclear grooves, and pseudoinclusions are pathognomonic.",
    sections: [
      {
        heading: "Diagnostic Nuclear Features",
        points: [
          "Orphan Annie nuclei (ground-glass nuclei): pale, empty-appearing nuclei due to powdery chromatin (dispersed) — must be present for diagnosis.",
          "Nuclear grooves: linear infolding of nuclear membrane; elongated grooves crossing the nucleus.",
          "Intranuclear cytoplasmic pseudoinclusions (INCP): round eosinophilic inclusions within nucleus (invaginated cytoplasm).",
          "Nuclear enlargement and crowding: overlapping nuclei, irregular membranes.",
        ],
      },
      {
        heading: "Architecture",
        points: [
          "Papillary growth: true papillae with fibrovascular cores lined by tumour cells.",
          "Psammoma bodies: concentric laminated calcifications (~50%); almost pathognomonic when present.",
          "Follicular variant PTC: follicular growth pattern but nuclear features of PTC; BRAF-wildtype, NTRK/RAS fusion common.",
          "Tall cell variant: ≥30% cells twice as tall as wide; more aggressive; BRAF V600E highly prevalent.",
        ],
      },
      {
        heading: "Molecular Alterations",
        points: [
          "BRAF V600E (~60% of classical PTC): activates MAPK/ERK pathway; associated with extrathyroidal extension, recurrence.",
          "RET/PTC rearrangements (~15–20%): RET fused to CCDC6 (RET/PTC1) or NCOA4 (RET/PTC3); radiation-associated PTC.",
          "RAS mutations (~10–15%): follicular variant PTC; lower metastatic risk.",
          "NTRK1/3 fusions: larotrectinib/entrectinib sensitive.",
        ],
      },
      {
        heading: "Management",
        points: [
          "Surgery: thyroidectomy (total or lobectomy depending on size/risk); central neck dissection if LN+ or high-risk features.",
          "Radioactive iodine (RAI, I-131): ablates remnant thyroid; uptake requires TSH stimulation (withhold T4 or rhTSH).",
          "TSH suppression: T4 therapy to keep TSH subnormal → reduces stimulation of residual/metastatic disease.",
          "BRAF-targeted therapy (vemurafenib/dabrafenib + trametinib): for RAI-refractory, BRAF V600E-mutant progressive disease.",
        ],
      },
    ],
  },
  // ── Gynaecological Pathology ─────────────────────────────────────────────
  {
    id: "cin3",
    title: "Cervical Intraepithelial Neoplasia Grade 3 (CIN 3 / CIS)",
    subtitle: "High-grade squamous intraepithelial lesion — precursor to invasive cervical carcinoma",
    category: "Gynaecological Pathology",
    tags: ["cervix", "CIN3", "HPV", "HSIL", "dysplasia", "p16", "Ki-67"],
    difficulty: "Intermediate",
    imageSlug: "cin3",
    keyFact: "CIN 3 progresses to invasive carcinoma in ~30–50% if untreated over 10–20 years; CIN 1 regresses spontaneously in ~90% within 2 years.",
    pearl: "p16 block positivity (diffuse basal-to-surface staining) = surrogate marker for high-risk HPV integration and E7-mediated Rb inactivation — use p16+Ki-67 to distinguish CIN 2/3 from mimics.",
    sections: [
      {
        heading: "Morphology",
        points: [
          "Full-thickness atypia: dysplastic cells extend through entire thickness of squamous epithelium to surface (unlike CIN 1 lower 1/3, CIN 2 lower 2/3).",
          "Loss of maturation: no progressive flattening/cornification toward surface — all layers show undifferentiated cells.",
          "Nuclear changes: enlarged hyperchromatic nuclei, irregular membranes, coarse chromatin, increased N:C ratio.",
          "Mitotic figures: present throughout all layers including upper third — abnormal mitoses in CIN 3.",
        ],
      },
      {
        heading: "HPV Pathogenesis",
        points: [
          "High-risk HPV (16, 18, 31, 33): infects basal squamous cells at transformation zone (squamocolumnar junction).",
          "Viral E6 protein: binds p53 → proteasomal degradation → loss of apoptosis.",
          "Viral E7 protein: binds Rb → releases E2F transcription factor → uncontrolled cell cycle entry (S-phase); upregulates p16.",
          "HPV 16 > HPV 18 for squamous carcinoma; HPV 18 more adenocarcinoma-associated.",
        ],
      },
      {
        heading: "IHC Markers",
        points: [
          "p16 (CDKN2A): diffuse block positivity (basal to surface) = high-risk HPV integration; any other pattern = negative for HSIL purpose.",
          "Ki-67: high proliferative index throughout all epithelial layers in CIN 3.",
          "p16 + Ki-67 dual stain: any co-positive cell = HSIL; reduces interobserver variability in CIN 2.",
          "ProExC (MCM2 + TOP2A): alternative biomarker; high sensitivity for HSIL.",
        ],
      },
      {
        heading: "Management",
        points: [
          "CIN 3: LLETZ (large loop excision of transformation zone) or cold-knife cone biopsy; margins must be clear.",
          "Follow-up: HPV co-testing and cytology at 6 months post-treatment × 2, then annually × 3.",
          "Prevention: HPV vaccination (Gardasil-9: HPV 6, 11, 16, 18, 31, 33, 45, 52, 58); most effective pre-sexual debut.",
          "Immunocompromised patients: higher recurrence risk; more intensive surveillance.",
        ],
      },
    ],
  },
  // ── Gastroenterology ────────────────────────────────────────────────────
  {
    id: "crohn",
    title: "Crohn's Disease",
    subtitle: "Transmural, granulomatous, skip-lesion IBD affecting any GI segment",
    category: "Gastroenterology",
    tags: ["IBD", "Crohn", "granuloma", "skip lesion", "transmural", "fistula", "NOD2"],
    difficulty: "Intermediate",
    imageSlug: "crohn",
    keyFact: "Non-caseating granulomas in the bowel wall (without infection) = pathognomonic of Crohn's disease; only present in ~50% of biopsies — their absence doesn't exclude Crohn's.",
    pearl: "Skip lesions + transmural inflammation + non-caseating granulomas = Crohn's. Continuous mucosal disease = Ulcerative Colitis. Distinguish by pattern, not just granulomas.",
    sections: [
      {
        heading: "Macroscopic Features",
        points: [
          "Skip lesions: segmental affected areas alternating with normal 'skip areas' — distinct from UC.",
          "Cobblestone mucosa: surviving mucosal islands between deep linear ulcers (rose-thorn/bear-claw fissures).",
          "Creeping fat: mesenteric fat wraps around serosa → 'fat wrapping'; marker of transmural disease.",
          "Fistulae and abscesses: transmural inflammation tracks through bowel wall → enterocutaneous, enteroenteric, rectovaginal fistulae.",
        ],
      },
      {
        heading: "Microscopic Features",
        points: [
          "Transmural inflammation: lymphoid aggregates throughout all layers (mucosa → serosa), not just mucosal.",
          "Non-caseating granulomas: epithelioid histiocytes ± Langhans giant cells without central necrosis; present in ~50% of biopsies.",
          "Architectural distortion: branched, irregular crypts; Paneth cell metaplasia in left colon (marker of chronic injury).",
          "Submucosal fibrosis: concentric fibrosis → stricture formation → obstructive symptoms.",
        ],
      },
      {
        heading: "Pathogenesis",
        points: [
          "NOD2/CARD15 mutation (30–40% of Crohn's): impaired recognition of muramyl dipeptide → defective Paneth cell α-defensin → dysbiosis.",
          "Dysbiosis: reduced Faecalibacterium prausnitzii; increased adherent-invasive E. coli (AIEC).",
          "Th1/Th17 skew: IFN-γ, TNF-α, IL-17 → macrophage activation, granuloma formation, barrier breakdown.",
          "Autophagy genes (ATG16L1, IRGM): defective clearance of intracellular bacteria; associated with ileal Crohn's.",
        ],
      },
      {
        heading: "Management",
        points: [
          "Induction: corticosteroids (prednisolone, budesonide for ileocolonic); 5-ASA insufficient for Crohn's (unlike UC).",
          "Maintenance: azathioprine/6-MP, methotrexate; anti-TNF (infliximab, adalimumab) for moderate-severe.",
          "Biological escalation: vedolizumab (anti-α4β7 integrin), ustekinumab (anti-IL-12/23), risankizumab (anti-IL-23).",
          "Surgery: resection for strictures, fistulae, abscess; not curative — high recurrence; setons for perianal fistulae.",
        ],
      },
    ],
  },
  // ── Haematology ─────────────────────────────────────────────────────────
  {
    id: "hodgkin",
    title: "Hodgkin Lymphoma — Classical Type",
    subtitle: "Characterised by rare Reed-Sternberg cells in an inflammatory background",
    category: "Haematology",
    tags: ["lymphoma", "Hodgkin", "Reed-Sternberg", "CD30", "CD15", "EBV", "ABVD"],
    difficulty: "Intermediate",
    imageSlug: "hodgkin",
    keyFact: "Cure rate >85% in early-stage classical HL with ABVD chemotherapy ± radiotherapy — one of the most curable cancers in young adults.",
    pearl: "RS cells = CD30+, CD15+, PAX5 weakly+, CD20−, CD45− — a B-cell that has lost its B-cell identity. Owl-eye nucleoli (two large eosinophilic nucleoli) are the morphological hallmark.",
    sections: [
      {
        heading: "Reed-Sternberg Cell Morphology",
        points: [
          "Large binucleate or multinucleate cells with prominent eosinophilic 'owl-eye' nucleoli (one per lobe).",
          "Lacunar variant RS cells: cytoplasm retracts during formalin fixation → cell sits in 'lacunar space'; nodular sclerosis subtype.",
          "Mononuclear Hodgkin cells: variant with single nucleus; as pathologically significant as RS cells.",
          "RS cells constitute <1–5% of the tumour mass; majority is reactive inflammatory infiltrate.",
        ],
      },
      {
        heading: "Histological Subtypes",
        points: [
          "Nodular Sclerosis (NS, ~70%): collagen bands create nodules; lacunar RS cells; young women; mediastinal mass common.",
          "Mixed Cellularity (MC, ~20%): abundant eosinophils, plasma cells, histiocytes; EBV+ in ~75%; older patients.",
          "Lymphocyte Rich (~5%): background small lymphocytes; rare RS cells; best prognosis.",
          "Lymphocyte Depleted (rare): many RS cells, few lymphocytes; advanced disease, poorest prognosis; EBV+ common.",
        ],
      },
      {
        heading: "IHC Profile",
        points: [
          "CD30 (+, strong, membranous + Golgi): universal in classical HL; target of brentuximab vedotin.",
          "CD15 (+, ~80%): leu-M1; Golgi-like or membranous; helps distinguish from NLPHL and ALCL.",
          "PAX5 (weakly +): residual B-cell transcription factor; dim vs strong positivity in B-cell lymphomas.",
          "CD45−, CD20− (classical HL): distinguishes from NLPHL (CD45+, CD20+, CD30−).",
        ],
      },
      {
        heading: "Treatment & Prognosis",
        points: [
          "Early stage (I-IIA, no bulky): 2–4 cycles ABVD + involved-site radiotherapy (ISRT); 10-yr OS >90%.",
          "Advanced stage (III-IV): 6 cycles ABVD or BrECADD (brentuximab + escalated BEACOPP).",
          "PET-adapted therapy: PET after cycle 2 guides intensification or de-escalation.",
          "Relapsed/refractory: brentuximab vedotin (anti-CD30 ADC) + salvage chemo → ASCT; checkpoint inhibitors (nivolumab, pembrolizumab) for R/R.",
        ],
      },
    ],
  },
  // ── Infectious ──────────────────────────────────────────────────────────
  {
    id: "tb",
    title: "Tuberculosis — Granulomatous Inflammation",
    subtitle: "Mycobacterium tuberculosis — caseous necrosis + Langhans giant cells",
    category: "Infectious",
    tags: ["TB", "granuloma", "caseation", "Langhans", "AFB", "Ziehl-Neelsen"],
    difficulty: "Beginner",
    imageSlug: "tb",
    keyFact: "TB is the world's leading infectious cause of death from a single pathogen. One-third of the world's population has latent TB infection.",
    pearl: "Caseating granuloma = central amorphous eosinophilic 'cheese-like' necrosis + Langhans giant cells + epithelioid macrophages + lymphocytes. Always do ZN stain and culture — AFBs seen in only 50–70% of TB granulomas.",
    sections: [
      {
        heading: "Granuloma Structure",
        points: [
          "Central caseous necrosis: amorphous eosinophilic debris (necrotic macrophages + bacilli); 'caseous' = cheese-like macroscopically.",
          "Epithelioid macrophages: activated macrophages with abundant eosinophilic cytoplasm surrounding necrotic centre.",
          "Langhans giant cells: multinucleated cells with nuclei arranged in horseshoe/peripheral ring pattern (≠ foreign body GCs with random nuclei).",
          "Peripheral lymphocytic cuff: T-lymphocytes (CD4+ Th1) recruited by IFN-γ; maintain granuloma integrity.",
        ],
      },
      {
        heading: "Pathogenesis",
        points: [
          "Droplet nuclei inhaled → alveolar macrophage phagocytosis: bacilli prevent phagolysosome fusion via Rab7 inhibition.",
          "CD4+ Th1 response: IFN-γ activates macrophages → TNF-α + IL-12 → granuloma formation to wall off organism.",
          "Caseation: central necrosis due to hypersensitivity reaction (Koch phenomenon) — tissue damage from immune response, not direct bacterial toxicity.",
          "Reactivation: latent TB (IGRA+, normal CXR) reactivates when immune surveillance drops (HIV, anti-TNF therapy, malnutrition).",
        ],
      },
      {
        heading: "Investigations",
        points: [
          "ZN (Ziehl-Neelsen) stain: acid-fast bacilli (AFB) — bright red rods on blue background; sensitivity ~50–70%.",
          "Auramine-rhodamine fluorescence: more sensitive than ZN; AFB appear bright yellow on dark background.",
          "Culture (Löwenstein-Jensen/BACTEC MGIT): gold standard; 2–6 weeks; essential for drug sensitivity testing.",
          "IGRA (interferon-gamma release assay) / Mantoux: detect latent TB; not active disease.",
        ],
      },
      {
        heading: "Treatment",
        points: [
          "Active TB: 2HRZE + 4HR (isoniazid + rifampicin + pyrazinamide + ethambutol for 2 months, then INH + RIF for 4 months).",
          "MDR-TB (resistance to INH + RIF): bedaquiline + pretomanid + linezolid (BPaL regimen); 6 months.",
          "Latent TB treatment: 9 months INH, or 3 months INH + rifapentine (3HP), or 4 months RIF.",
          "Anti-TNF therapy (infliximab, adalimumab) screening: mandatory TB screening (IGRA + CXR) before starting biologics.",
        ],
      },
    ],
  },
  // ── Immunopathology ─────────────────────────────────────────────────────
  {
    id: "sle-nephritis",
    title: "Lupus Nephritis — Classification & Pathology",
    subtitle: "Immune complex GN in SLE — a leading cause of morbidity and renal failure",
    category: "Immunopathology",
    tags: ["lupus", "SLE", "nephritis", "immune complex", "wire loop", "ISN/RPS", "class IV"],
    difficulty: "Advanced",
    imageSlug: "rpgn",
    keyFact: "Class IV (diffuse proliferative lupus nephritis) affects >50% of glomeruli and has the worst renal prognosis without aggressive immunosuppression.",
    pearl: "Full-house IF pattern (IgG, IgM, IgA, C3, C4, C1q all positive) = characteristic of lupus nephritis. No other GN gives all 5 immunoreactants simultaneously.",
    sections: [
      {
        heading: "ISN/RPS Classification (2003)",
        points: [
          "Class I (minimal mesangial): normal LM; immune deposits only on EM; no treatment needed.",
          "Class II (mesangial proliferative): mesangial hypercellularity; deposits confined to mesangium; mild disease.",
          "Class III (focal proliferative): <50% of glomeruli affected; segmental endocapillary proliferation; moderate risk.",
          "Class IV (diffuse proliferative): ≥50% glomeruli; global/segmental lesions (IVG or IVS); worst prognosis; treat with MMF or cyclophosphamide.",
        ],
      },
      {
        heading: "Class V & Mixed",
        points: [
          "Class V (membranous): diffuse subepithelial deposits; thickened GBM; nephrotic syndrome; may coexist with Class III/IV.",
          "Class VI (advanced sclerosing): ≥90% global glomerulosclerosis; no immunosuppression benefit; consider transplant.",
          "Class III/V or IV/V combination: manage most aggressive component; combined regimens.",
          "Activity vs Chronicity index: activity (fibrinoid necrosis, crescents, karyorrhexis) vs chronicity (sclerosis, tubular atrophy) guide prognosis.",
        ],
      },
      {
        heading: "Histological Hallmarks",
        points: [
          "Wire-loop lesion: hyaline thickening of capillary walls by massive subendothelial immune deposits; highly specific for LN.",
          "Hyaline thrombi: eosinophilic immune complex plugs in capillary lumina; indicate high disease activity.",
          "Subepithelial deposits (Class V): spikes and domes on silver stain; similar to membranous nephropathy.",
          "Interstitial nephritis: may accompany glomerular disease; indicates worse renal outcome.",
        ],
      },
      {
        heading: "Treatment",
        points: [
          "Class III/IV induction: high-dose steroids + MMF (mycophenolate mofetil) or low-dose cyclophosphamide (Euro-Lupus protocol).",
          "Maintenance: MMF or azathioprine + low-dose steroids for ≥3 years.",
          "Belimumab (anti-BLYS): add-on to standard therapy; reduces flares and renal outcomes in LN.",
          "Voclosporin (calcineurin inhibitor): combined with MMF+steroids; improves Class III/IV/V remission rates (AURORA trial).",
        ],
      },
    ],
  },
  {
    id: "dcis",
    title: "Ductal Carcinoma In Situ (DCIS)",
    subtitle: "Non-invasive breast carcinoma confined to ductal basement membrane",
    category: "Oncology",
    tags: ["breast", "DCIS", "in situ", "comedonecrosis", "ER", "HER2", "Van Nuys"],
    difficulty: "Intermediate",
    imageSlug: "dcis",
    keyFact: "DCIS does NOT metastasise. It carries a ~30% risk of progression to invasive carcinoma over 10 years if untreated, but low-grade DCIS may take decades.",
    pearl: "High-grade DCIS with comedo-necrosis (central necrosis with dystrophic calcification) = most aggressive variant; calcifies on mammography — key screening finding.",
    sections: [
      {
        heading: "Morphological Patterns",
        points: [
          "Comedo: large neoplastic cells with pleomorphic nuclei, central necrosis, dystrophic 'ghost' calcifications; high grade.",
          "Cribriform: punched-out round spaces (Roman arches); intermediate grade; most common non-comedo pattern.",
          "Micropapillary: club-shaped cellular projections without fibrovascular cores into ductal lumen.",
          "Solid: sheets of cells fill duct completely; variable grade.",
        ],
      },
      {
        heading: "Grading",
        points: [
          "Grade 1 (low): small uniform nuclei, 1–1.5 RBC diameter, inconspicuous nucleoli, no necrosis.",
          "Grade 2 (intermediate): intermediate nuclei (1.5–2 RBC); some necrosis may be present.",
          "Grade 3 (high): large pleomorphic nuclei (>2 RBC); prominent nucleoli; comedo necrosis; dystrophic calcification.",
          "Grade dictates recurrence risk and treatment intensity (radiation ± endocrine therapy decision).",
        ],
      },
      {
        heading: "IHC & Biomarkers",
        points: [
          "ER (+, ~70–80%): low-grade DCIS almost always ER+; drives endocrine therapy (tamoxifen/AI) recommendation.",
          "HER2 (+, ~40%): high-grade DCIS frequently HER2-amplified; correlates with comedo pattern.",
          "E-cadherin (+): positive in DCIS (ductal); negative in lobular carcinoma in situ (LCIS) — useful distinction.",
          "Ki-67: high in Grade 3; low in Grade 1; reflects proliferative activity.",
        ],
      },
      {
        heading: "Management",
        points: [
          "Breast-conserving surgery: wide local excision with clear margins (≥2mm); endocrine therapy and/or RT based on Van Nuys PI.",
          "Radiotherapy: reduces ipsilateral recurrence by ~50%; recommended for Grade 3 or large/close margins.",
          "Mastectomy: for extensive/multifocal DCIS, BRCA mutation, or patient preference.",
          "Endocrine therapy: tamoxifen (premenopausal) or AI (postmenopausal) for ER+ DCIS; reduces contralateral risk.",
        ],
      },
    ],
  },
  {
    id: "prostate-adca",
    title: "Prostatic Adenocarcinoma",
    subtitle: "Acinar adenocarcinoma — most common cancer in men",
    category: "Oncology",
    tags: ["prostate", "adenocarcinoma", "Gleason", "PSA", "ISUP", "AR", "PTEN"],
    difficulty: "Intermediate",
    imageSlug: "prostate",
    keyFact: "Gleason pattern 5 (cribriform/single cells/cords with no gland formation) carries the highest risk of lethal disease regardless of total score.",
    pearl: "Prostatic adenocarcinoma lacks a basal cell layer (negative CK5/6 and p63) — this distinguishes malignant glands from benign acini which retain basal cells.",
    sections: [
      {
        heading: "Gleason Grading (ISUP 2014)",
        points: [
          "Pattern 3: well-formed, separate, infiltrating glands; ISUP Grade Group 1 (score 3+3=6).",
          "Pattern 4: poorly formed glands, cribriform glands, fused/glomeruloid structures; GG 2 (3+4) or 3 (4+3).",
          "Pattern 5: no gland formation — sheets, cords, single cells, necrosis (comedo carcinoma); GG 4 (4+5 or 5+4) or 5 (5+5).",
          "Report primary + secondary pattern; tertiary pattern (if worst pattern <5%) noted separately.",
        ],
      },
      {
        heading: "Morphological Clues",
        points: [
          "Nuclear features: prominent nucleolus (diameter ≥1 µm, 'red dot' nucleus); nuclear enlargement.",
          "Intraluminal features: crystalloids (angular eosinophilic structures), blue-tinged mucinous secretions, pink amorphous secretions.",
          "Perineural invasion: malignant glands wrap around or between nerve fibres; pathognomonic of carcinoma (not just reactive).",
          "Extraprostatic extension (EPE): glands beyond prostatic pseudocapsule; key pT3 staging feature.",
        ],
      },
      {
        heading: "IHC Panel",
        points: [
          "AMACR (P504S) (+): alpha-methylacyl-CoA racemase; positive in carcinoma, negative in benign glands; most useful marker.",
          "Basal cell markers (CK5/6, p63, CK14) NEGATIVE: confirms absence of basal cell layer in carcinoma.",
          "PSA (+): confirms prostatic origin in metastases; may be negative in poorly differentiated tumour.",
          "PSMA (+): prostate-specific membrane antigen; target of lutetium-PSMA-617 radioligand therapy.",
        ],
      },
      {
        heading: "Treatment by Stage",
        points: [
          "Localised low-risk (GG1, PSA <10, cT1-T2a): active surveillance; radical prostatectomy or radiotherapy if treatment desired.",
          "Localised high-risk (GG3-5, PSA >20, cT3): radical prostatectomy ± LN dissection, or EBRT + 18–36 months ADT.",
          "Biochemical recurrence: salvage RT ± 6 months ADT if post-RP; ADT escalation if post-RT.",
          "Metastatic castration-sensitive: ADT + docetaxel or abiraterone or enzalutamide or darolutamide.",
        ],
      },
    ],
  },
];

// ── Helper ─────────────────────────────────────────────────────────────────

function getCategories(): string[] {
  const seen = new Set<string>();
  const cats: string[] = [];
  for (const inf of LIBRARY) {
    if (!seen.has(inf.category)) { seen.add(inf.category); cats.push(inf.category); }
  }
  return cats.sort();
}

// ── Card Grid Item ─────────────────────────────────────────────────────────

function InfographicCard({
  inf,
  onClick,
}: {
  inf: Infographic;
  onClick: () => void;
}) {
  const catColor = CATEGORY_COLORS[inf.category] ?? "bg-slate-100 text-slate-600";

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
    >
      {/* Slide thumbnail */}
      {inf.imageSlug && (
        <div className="relative h-36 bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <img
            src={`/slides/${inf.imageSlug}.jpg`}
            alt={inf.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
          <span className={clsx("absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full", catColor)}>
            {inf.category}
          </span>
          <span className={clsx("absolute top-2 right-2 text-[10px] font-semibold", DIFFICULTY_COLOR[inf.difficulty])}>
            {inf.difficulty}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {inf.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 flex-1">{inf.subtitle}</p>

        {/* Key fact pill */}
        <div className="flex items-start gap-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5 mt-1">
          <Star className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 line-clamp-2 leading-snug">{inf.keyFact}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1 flex-wrap">
            {inf.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-1.5 py-0.5">
                {tag}
              </span>
            ))}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors flex-shrink-0" />
        </div>
      </div>
    </button>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────────────

function InfographicModal({ inf, onClose }: { inf: Infographic; onClose: () => void }) {
  const catColor = CATEGORY_COLORS[inf.category] ?? "bg-slate-100 text-slate-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          {inf.imageSlug ? (
            <div className="h-48 overflow-hidden">
              <img
                src={`/slides/${inf.imageSlug}.jpg`}
                alt={inf.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent" />
            </div>
          ) : (
            <div className="h-24 bg-gradient-to-r from-primary-600 to-patho-purple" />
          )}

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={clsx("text-[11px] font-bold px-2 py-0.5 rounded-full", catColor)}>
                {inf.category}
              </span>
              <span className={clsx("text-xs font-semibold", DIFFICULTY_COLOR[inf.difficulty])}>
                {inf.difficulty}
              </span>
            </div>
            <h2 className="font-bold text-white text-lg sm:text-xl leading-tight">{inf.title}</h2>
            <p className="text-sm text-slate-200 mt-0.5">{inf.subtitle}</p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-slate-900/50 hover:bg-slate-900/70 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Key Fact + Pearl */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3.5">
              <Star className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Key Fact</p>
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{inf.keyFact}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl p-3.5">
              <Lightbulb className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Clinical Pearl</p>
                <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed">{inf.pearl}</p>
              </div>
            </div>
          </div>

          {/* Sections */}
          {inf.sections.map((section, sIdx) => (
            <div
              key={sIdx}
              className={clsx(
                "rounded-xl border p-4",
                SECTION_COLORS[sIdx % SECTION_COLORS.length],
              )}
            >
              <h3 className="font-semibold text-sm mb-2.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                {section.heading}
              </h3>
              <ul className="space-y-1.5">
                {section.points.map((pt, pIdx) => (
                  <li key={pIdx} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-60" />
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {inf.tags.map(tag => (
              <span key={tag} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full px-2.5 py-1">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function InfographicsLibrary() {
  const [query,           setQuery]           = useState("");
  const [selectedCat,     setSelectedCat]     = useState<string>("All");
  const [selectedDiff,    setSelectedDiff]    = useState<string>("All");
  const [activeInfographic, setActiveInfographic] = useState<Infographic | null>(null);
  const [catOpen,         setCatOpen]         = useState(false);

  const categories = useMemo(() => ["All", ...getCategories()], []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return LIBRARY.filter(inf => {
      const matchesCat  = selectedCat  === "All" || inf.category === selectedCat;
      const matchesDiff = selectedDiff === "All" || inf.difficulty === selectedDiff;
      const matchesQ    = !q
        || inf.title.toLowerCase().includes(q)
        || inf.subtitle.toLowerCase().includes(q)
        || inf.tags.some(t => t.toLowerCase().includes(q))
        || inf.category.toLowerCase().includes(q)
        || inf.keyFact.toLowerCase().includes(q)
        || inf.pearl.toLowerCase().includes(q);
      return matchesCat && matchesDiff && matchesQ;
    });
  }, [query, selectedCat, selectedDiff]);

  const handleClose = useCallback(() => setActiveInfographic(null), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Infographics Library</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {LIBRARY.length} curated visual study guides covering key pathology topics — click any card to open the full infographic.
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by diagnosis, keyword, or tag…"
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category dropdown */}
        <div className="relative">
          <button
            onClick={() => setCatOpen(v => !v)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors whitespace-nowrap"
          >
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {selectedCat === "All" ? "All Categories" : selectedCat}
            <ChevronDown className={clsx("w-3.5 h-3.5 text-slate-400 transition-transform", catOpen && "rotate-180")} />
          </button>
          {catOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-lg z-20 py-1 max-h-72 overflow-y-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCat(cat); setCatOpen(false); }}
                  className={clsx(
                    "w-full text-left px-4 py-2 text-sm transition-colors",
                    selectedCat === cat
                      ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 font-medium"
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
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-1.5 py-1">
          {["All", "Beginner", "Intermediate", "Advanced"].map(d => (
            <button
              key={d}
              onClick={() => setSelectedDiff(d)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                selectedDiff === d
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {filtered.length === LIBRARY.length
            ? `${LIBRARY.length} infographics`
            : `${filtered.length} of ${LIBRARY.length} infographics`}
        </span>
        {(selectedCat !== "All" || selectedDiff !== "All" || query) && (
          <button
            onClick={() => { setSelectedCat("All"); setSelectedDiff("All"); setQuery(""); }}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No infographics found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try a different search term or clear the filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(inf => (
            <InfographicCard
              key={inf.id}
              inf={inf}
              onClick={() => setActiveInfographic(inf)}
            />
          ))}
        </div>
      )}

      {/* "Generate from your slides" CTA */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-patho-purple p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
            <Zap className="w-4 h-4 text-white" />
            <span className="font-bold text-white">Generate your own infographic</span>
          </div>
          <p className="text-sm text-primary-100">
            Upload any histopathology slide in the Analyze tab and hit "Generate Infographic" to create a personalised study card from the AI analysis.
          </p>
        </div>
        <a
          href="#"
          onClick={e => { e.preventDefault(); (document.querySelector('[data-tab="analyze"]') as HTMLButtonElement | null)?.click(); }}
          className="flex-shrink-0 flex items-center gap-2 bg-white text-primary-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-primary-50 transition-colors shadow-md"
        >
          <ExternalLink className="w-4 h-4" />
          Go to Analyze
        </a>
      </div>

      {/* Modal */}
      {activeInfographic && (
        <InfographicModal inf={activeInfographic} onClose={handleClose} />
      )}
    </div>
  );
}
