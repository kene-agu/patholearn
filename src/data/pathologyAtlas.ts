/**
 * Pathology Atlas — curated entries grouped by organ system.
 * Each entry pairs a normal histology baseline with 3+ pathology variants
 * so students can appreciate subtle morphological differences.
 *
 * All Wikimedia Commons URLs verified via the imageinfo API.
 */

const W = "https://upload.wikimedia.org/wikipedia/commons";
export const wiki = (hash: string, fn: string) => `${W}/${hash}/${fn}`;
export const proxy = (url: string) => `/api/proxy-image?url=${encodeURIComponent(url)}`;

export type OrganSystem =
  | "GI & Liver"
  | "Lung & Respiratory"
  | "Kidney & Urinary"
  | "Breast"
  | "Female Reproductive"
  | "Endocrine"
  | "Hematolymphoid"
  | "CNS"
  | "Skin & Soft Tissue"
  | "Infectious";

export interface AtlasSlide {
  hash:        string;
  filename:    string;
  caption:     string;
  stain?:      string;
  magnification?: string;
  /** Override the parent entry's diagnosisHint when this specific slide is sent to AI */
  diagnosisHint?: string;
}

export interface PathologyEntry {
  id:          string;
  name:        string;
  organSystem: OrganSystem;
  description: string;
  keyFeatures: string[];
  clinicalContext: string;
  diagnosisHint:   string;
  normalSlide:     AtlasSlide;
  pathologySlides: AtlasSlide[];
}

export function slideImageUrl(s: AtlasSlide): string {
  return wiki(s.hash, s.filename);
}
export function slideAnalyzeUrl(s: AtlasSlide): string {
  return proxy(wiki(s.hash, s.filename));
}

export const PATHOLOGY_ATLAS: PathologyEntry[] = [
  // ═════════════════════════ HCC ════════════════════════════════════════
  {
    id:   "atlas-hcc",
    name: "Hepatocellular Carcinoma",
    organSystem: "GI & Liver",
    description: "The most common primary liver malignancy, typically arising in cirrhotic livers. Compare the orderly hepatic architecture in normal liver with the disorganised trabecular growth of HCC.",
    keyFeatures: [
      "Trabecular cords of malignant hepatocytes (>3 cells thick)",
      "Sinusoidal vasculature, no portal tracts",
      "Bile production by tumour cells (pathognomonic)",
      "Nuclear atypia, prominent nucleoli, increased N:C ratio",
      "HepPar-1, Arginase-1, Glypican-3 positive on IHC",
    ],
    clinicalContext: "Risk factors: chronic HBV/HCV, cirrhosis, aflatoxin, alcohol. Often presents with rising AFP and a mass on imaging in cirrhotic liver.",
    diagnosisHint: "Hepatocellular Carcinoma (HCC) — trabecular growth, sinusoidal vasculature, bile production, nuclear pleomorphism, HepPar-1+",
    normalSlide: {
      hash: "8/82", filename: "Histopathology_of_liver_zones.jpg",
      caption: "Normal liver — hepatocyte cords, portal tracts, central veins",
      stain: "H&E", magnification: "Low",
    },
    pathologySlides: [
      {
        hash: "8/80", filename: "Hepatocellular_carcinoma_low_mag.jpg",
        caption: "Low mag — trabecular pattern, loss of portal architecture",
        stain: "H&E", magnification: "Low",
      },
      {
        hash: "a/ab", filename: "Hepatocellular_carcinoma_histopathology_%281%29.jpg",
        caption: "Classic HCC — thick trabeculae, atypical hepatocytes",
        stain: "H&E", magnification: "Medium",
      },
      {
        hash: "8/8a", filename: "Hepatocellular_carcinoma_histopathology_%282%29_at_higher_magnification.jpg",
        caption: "High mag — nuclear pleomorphism, prominent nucleoli",
        stain: "H&E", magnification: "High",
      },
    ],
  },

  // ═════════════════════════ COLORECTAL ═════════════════════════════════
  {
    id:   "atlas-crc",
    name: "Colorectal Adenocarcinoma",
    organSystem: "GI & Liver",
    description: "Malignancy arising from colonic mucosa, usually progressing through the adenoma-carcinoma sequence. Compare the orderly straight crypts of normal colon with malignant glandular disarray.",
    keyFeatures: [
      "Irregular malignant glands with nuclear stratification",
      "Prominent nucleoli and increased mitotic activity",
      "Dirty (luminal) necrosis — characteristic intraluminal debris",
      "Desmoplastic stromal reaction",
      "Special variants: mucinous, signet-ring (worse prognosis)",
    ],
    clinicalContext: "Right-sided tumours bleed (iron-deficiency anaemia), left-sided cause obstruction. Screening: colonoscopy from age 45–50.",
    diagnosisHint: "Colorectal Adenocarcinoma — irregular malignant glands, nuclear stratification, prominent nucleoli, dirty luminal necrosis, invasive growth",
    normalSlide: {
      hash: "d/de", filename: "Large_intestine_histology.jpg",
      caption: "Normal colon — straight parallel crypts, abundant goblet cells",
      stain: "H&E", magnification: "Low",
    },
    pathologySlides: [
      {
        hash: "1/18", filename: "Adenocarcinoma_of_the_colon-histology.JPG",
        caption: "Invasive adenocarcinoma — back-to-back malignant glands",
        stain: "H&E", magnification: "Medium",
      },
      {
        hash: "a/a5", filename: "Colonic_Adenocarcinoma_ex_Villous_Adenoma.jpg",
        caption: "Adenocarcinoma arising in villous adenoma — adenoma-carcinoma sequence",
        stain: "H&E", magnification: "Low",
      },
      {
        hash: "4/40", filename: "Signet_Ring_Cells_%282202231656%29.jpg",
        caption: "Signet-ring variant — mucin pushes nucleus to side (poor prognosis)",
        stain: "H&E", magnification: "High",
      },
    ],
  },

  // ═════════════════════════ KIDNEY — ccRCC ═════════════════════════════
  {
    id:   "atlas-ccrcc",
    name: "Clear Cell Renal Cell Carcinoma",
    organSystem: "Kidney & Urinary",
    description: "Most common renal malignancy in adults, driven by VHL gene inactivation. Slides include comparators with other renal lesions to sharpen differential diagnosis skills.",
    keyFeatures: [
      "Nests/sheets of cells with optically clear cytoplasm",
      "Clear appearance from dissolved lipid and glycogen",
      "Delicate sinusoidal (\"chicken-wire\") vasculature",
      "Nuclear grading by Fuhrman/WHO-ISUP system",
      "PAX8+, CD10+, RCC marker positive",
    ],
    clinicalContext: "Classic triad (haematuria, flank pain, mass) is uncommon today — most found incidentally on imaging. Associated with VHL syndrome.",
    diagnosisHint: "Clear Cell Renal Cell Carcinoma (ccRCC) — nests of clear-cytoplasm cells, sinusoidal vasculature, VHL-driven, PAX8+/CD10+",
    normalSlide: {
      hash: "6/63", filename: "Histology-kidney.jpg",
      caption: "Normal renal cortex — glomeruli, Bowman's capsule, tubules",
      stain: "H&E", magnification: "Low",
    },
    pathologySlides: [
      {
        hash: "a/a1", filename: "Histopathology_of_clear_cell_renal_cell_carcinoma%2C_grade_1%2C_high_magnification.jpg",
        caption: "Grade 1 ccRCC — clear cytoplasm, low-grade nuclei, sinusoidal vessels",
        stain: "H&E", magnification: "High",
      },
      {
        hash: "2/2b", filename: "Wilms_Tumor_%28Nephroblastoma%29_%284882456062%29.jpg",
        caption: "Comparator — Wilms tumour (paediatric, triphasic blastema/stroma/epithelium)",
        stain: "H&E", magnification: "Medium",
      },
      {
        hash: "b/b9", filename: "Nodular_glomerulosclerosis.jpeg",
        caption: "Comparator — diabetic nephropathy (Kimmelstiel-Wilson nodules)",
        stain: "PAS", magnification: "High",
      },
    ],
  },

  // ═════════════════════════ BREAST — IDC ═══════════════════════════════
  {
    id:   "atlas-idc",
    name: "Invasive Ductal Carcinoma (Breast)",
    organSystem: "Breast",
    description: "The most common type of invasive breast cancer (~75%). Walk from normal lobular architecture, through pre-invasive DCIS, to frankly invasive carcinoma.",
    keyFeatures: [
      "Malignant ductal cells invading desmoplastic stroma",
      "Variable architecture: cords, nests, glands, single cells",
      "Nuclear pleomorphism, prominent nucleoli",
      "Mitotic activity (used for Nottingham grade)",
      "ER/PR/HER2 status guides therapy",
    ],
    clinicalContext: "Presents as a palpable mass or screening abnormality. Treatment depends on receptor status (hormone-responsive vs HER2+ vs triple-negative).",
    diagnosisHint: "Invasive Ductal Carcinoma of Breast — malignant glands invading stroma, nuclear pleomorphism, mitoses, desmoplastic reaction",
    normalSlide: {
      hash: "3/31", filename: "Breast_histology_interlobular.jpg",
      caption: "Normal breast — terminal duct lobular units (TDLU), interlobular stroma",
      stain: "H&E", magnification: "Low",
    },
    pathologySlides: [
      {
        hash: "f/f8", filename: "Micrograph_of_ductal_carcinoma_with_marked_nuclear_pleomorphism_and_increased_mitotic_rate.jpg",
        caption: "High-grade IDC — marked nuclear pleomorphism",
        stain: "H&E", magnification: "High",
      },
      {
        hash: "6/69", filename: "DCIS_-_Intraductal_carcinoma_of_the_breast.jpg",
        caption: "DCIS — pre-invasive lesion, basement membrane intact",
        stain: "H&E", magnification: "Medium",
      },
      {
        hash: "6/62", filename: "Fibroadenoma_20X.jpg",
        caption: "Comparator — fibroadenoma (benign biphasic, no atypia)",
        stain: "H&E", magnification: "Low",
      },
    ],
  },

  // ═════════════════════════ THYROID — PTC ══════════════════════════════
  {
    id:   "atlas-ptc",
    name: "Papillary Thyroid Carcinoma",
    organSystem: "Endocrine",
    description: "The most common thyroid malignancy. Diagnosis is based on nuclear features, NOT papillary architecture — three cases below let you appreciate the variable architecture but consistent nuclear changes.",
    keyFeatures: [
      "Orphan Annie eye nuclei (optically clear, ground-glass)",
      "Nuclear grooves (longitudinal folds)",
      "Intranuclear pseudo-inclusions",
      "Psammoma bodies (concentric calcifications)",
      "BRAF V600E mutation in ~60% of cases",
    ],
    clinicalContext: "Excellent prognosis (>95% 10-year survival). Spreads via lymphatics (cervical nodes). Treatment: thyroidectomy ± radioactive iodine.",
    diagnosisHint: "Papillary Thyroid Carcinoma (PTC) — Orphan Annie nuclei, nuclear grooves, pseudo-inclusions, psammoma bodies, BRAF V600E",
    normalSlide: {
      hash: "6/6a", filename: "Thyroid_gland_microscope.jpg",
      caption: "Normal thyroid — colloid-filled follicles, cuboidal cells",
      stain: "H&E", magnification: "Low",
    },
    pathologySlides: [
      {
        hash: "7/71", filename: "Papillary_thyroid_carcinoma_--_high_mag.jpg",
        caption: "High mag — diagnostic nuclear features visible",
        stain: "H&E", magnification: "High",
      },
      {
        hash: "0/09", filename: "Thyroid_papillary_carcinoma_5.jpg",
        caption: "Variant case — papillary architecture with classic nuclei",
        stain: "H&E", magnification: "Medium",
      },
      {
        hash: "9/99", filename: "Thyroid_papillary_carcinoma_9.jpg",
        caption: "Variant case — note Orphan Annie nuclei across cases",
        stain: "H&E", magnification: "High",
      },
    ],
  },

  // ═════════════════════════ CNS — GBM ══════════════════════════════════
  {
    id:   "atlas-gbm",
    name: "Glioblastoma Multiforme",
    organSystem: "CNS",
    description: "WHO Grade 4 astrocytoma — the most aggressive primary brain tumour in adults. Three different cases below illustrate the morphological heterogeneity (\"multiforme\") that defines this tumour.",
    keyFeatures: [
      "Pseudopalisading necrosis (cells lined up around hypoxic zones)",
      "Microvascular proliferation (glomeruloid vascular tufts)",
      "Marked nuclear pleomorphism, high mitotic activity",
      "Infiltrative growth (no clear margin)",
      "IDH-wildtype in most adult cases",
    ],
    clinicalContext: "Presents with seizures, focal deficits, raised ICP. \"Butterfly glioma\" if it crosses corpus callosum. Treatment: surgery + radiation + temozolomide.",
    diagnosisHint: "Glioblastoma Multiforme (GBM) WHO Grade 4 — pseudopalisading necrosis, microvascular proliferation, pleomorphism, IDH-wildtype",
    normalSlide: {
      hash: "e/e6", filename: "Histology-brain.jpg",
      caption: "Normal cerebral cortex — neurons, neuropil, glial cells",
      stain: "H&E", magnification: "Low",
    },
    pathologySlides: [
      {
        hash: "5/54", filename: "Glioblastoma_micro1.jpg",
        caption: "Classic GBM — pseudopalisading necrosis pattern",
        stain: "H&E", magnification: "Medium",
      },
      {
        hash: "6/67", filename: "Giant_cell_glioblastoma_HE_X200.jpg",
        caption: "Giant cell variant — bizarre multinucleated tumour cells",
        stain: "H&E", magnification: "High",
      },
      {
        hash: "0/02", filename: "Glioblastoma_mitotic_activity.jpg",
        caption: "High mitotic activity — abnormal mitoses, dense cellularity",
        stain: "H&E", magnification: "High",
      },
    ],
  },

  // ═════════════════════════ HODGKIN ═════════════════════════════════════
  {
    id:   "atlas-hodgkin",
    name: "Classical Hodgkin Lymphoma",
    organSystem: "Hematolymphoid",
    description: "B-cell-derived lymphoma defined by Reed-Sternberg cells in a reactive inflammatory background. Compare with two other lymphoid neoplasms to sharpen pattern recognition.",
    keyFeatures: [
      "Reed-Sternberg cells: large, binucleated, owl-eye nucleoli",
      "CD15+ and CD30+ on RS cells",
      "Mixed inflammatory background (lymphocytes, eosinophils, plasma cells)",
      "Subtypes: nodular sclerosis (most common), mixed cellularity",
      "Effaced nodal architecture",
    ],
    clinicalContext: "Painless cervical lymphadenopathy, B symptoms (fever, night sweats, weight loss). Highly curable with chemotherapy (ABVD).",
    diagnosisHint: "Classical Hodgkin Lymphoma — Reed-Sternberg cells (binucleated, owl-eye nucleoli, CD15+/CD30+) in mixed inflammatory background",
    normalSlide: {
      hash: "d/da", filename: "Lymph_node_histology.jpg",
      caption: "Normal lymph node — cortex, follicles, paracortex",
      stain: "H&E", magnification: "Low",
    },
    pathologySlides: [
      {
        hash: "3/33", filename: "Hodgkin_Disease%2C_Reed-Sternberg_Cell.jpg",
        caption: "Classic Reed-Sternberg cell — diagnostic for Hodgkin",
        stain: "H&E", magnification: "High",
      },
      {
        hash: "d/de", filename: "Diffuse_large_B-cell_lymphoma_%28DLBCL%29%2C_high_mag.jpg",
        caption: "Comparator — DLBCL (large transformed B-cells, diffuse, no RS)",
        stain: "H&E", magnification: "High",
        diagnosisHint: "Diffuse Large B-Cell Lymphoma (DLBCL) — diffuse sheets of large transformed B-cells with vesicular nuclei, prominent nucleoli, frequent mitoses, absence of Reed-Sternberg cells, CD20+/BCL6+, Ki67 high",
      },
      {
        hash: "2/21", filename: "Multiple_myeloma_%282%29_HE_stain.jpg",
        caption: "Comparator — multiple myeloma (sheets of plasma cells, clockface chromatin)",
        stain: "H&E", magnification: "High",
        diagnosisHint: "Multiple Myeloma — bone marrow infiltration by neoplastic plasma cells; eccentric nuclei, clock-face chromatin, perinuclear hof (Golgi zone), binucleate forms, CD138+/CD38+/MUM1+",
      },
    ],
  },

  // ═════════════════════════ TB ══════════════════════════════════════════
  {
    id:   "atlas-tb",
    name: "Pulmonary Tuberculosis",
    organSystem: "Infectious",
    description: "Granulomatous infection by Mycobacterium tuberculosis. The histological hallmark is the caseating granuloma — confirmed by acid-fast staining of the organisms.",
    keyFeatures: [
      "Caseating granuloma — central caseous (cheese-like) necrosis",
      "Epithelioid histiocytes (activated macrophages)",
      "Langhans giant cells (horseshoe nuclei)",
      "Lymphocytic cuff at granuloma periphery",
      "Acid-fast bacilli (red rods) on Ziehl-Neelsen stain",
    ],
    clinicalContext: "Presents with chronic cough, weight loss, night sweats, haemoptysis. Diagnosis: sputum AFB, GeneXpert, culture. Treatment: RIPE for 6 months.",
    diagnosisHint: "Pulmonary Tuberculosis — caseating granuloma with central necrosis, epithelioid histiocytes, Langhans giant cells, AFB+ on ZN",
    normalSlide: {
      hash: "a/ac", filename: "Normal_lung_%283660695207%29.jpg",
      caption: "Normal lung — thin alveolar walls, type I/II pneumocytes",
      stain: "H&E", magnification: "Low",
    },
    pathologySlides: [
      {
        hash: "3/37", filename: "Pulmonary_tuberculosis_-_Necrotizing_granuloma_%286545185917%29.jpg",
        caption: "Caseating granuloma with Langhans giant cells",
        stain: "H&E", magnification: "Medium",
      },
      {
        hash: "9/98", filename: "Mycobacterium_tuberculosis_Ziehl-Neelsen_stain.jpg",
        caption: "Ziehl-Neelsen — red acid-fast bacilli on blue background",
        stain: "ZN", magnification: "High",
      },
      {
        hash: "5/57", filename: "Granulomas_in_an_intestinal_lymph_node_in_Crohn%27s_disease%2C_HE_1.JPG",
        caption: "Comparator — non-caseating granuloma (Crohn's), no central necrosis",
        stain: "H&E", magnification: "Medium",
      },
    ],
  },

  // ═════════════════════════ MELANOMA ════════════════════════════════════
  {
    id:   "atlas-melanoma",
    name: "Malignant Melanoma",
    organSystem: "Skin & Soft Tissue",
    description: "Aggressive malignancy of melanocytes. Three magnifications of melanoma in situ let you trace the architectural pattern from low to high power.",
    keyFeatures: [
      "Atypical melanocytes with prominent eosinophilic nucleoli",
      "Pagetoid spread — single cells scattered through epidermis",
      "Lack of maturation with depth (cells stay large and atypical)",
      "Frequent mitoses, including deep dermal mitoses",
      "S100, SOX10, Melan-A, HMB-45 positive",
    ],
    clinicalContext: "ABCDE rule: Asymmetry, Border, Colour, Diameter >6mm, Evolving. Breslow depth and ulceration drive staging.",
    diagnosisHint: "Malignant Melanoma — atypical melanocytes with pagetoid spread, prominent eosinophilic nucleoli, no maturation with depth, S100/SOX10+",
    normalSlide: {
      hash: "b/b4", filename: "Normal_Epidermis_and_Dermis_with_Intradermal_Nevus_10x.JPG",
      caption: "Normal skin — epidermis layers, dermis, benign nevus reference",
      stain: "H&E", magnification: "Low",
    },
    pathologySlides: [
      {
        hash: "5/5e", filename: "Malignant_melanoma_in_situ_--_low_mag.jpg",
        caption: "Melanoma in situ — low mag, architectural overview",
        stain: "H&E", magnification: "Low",
      },
      {
        hash: "b/b2", filename: "Malignant_melanoma_in_situ_--_intermed_mag.jpg",
        caption: "Intermediate mag — confluent atypical melanocytes",
        stain: "H&E", magnification: "Medium",
      },
      {
        hash: "1/10", filename: "Malignant_melanoma_in_situ_--_high_mag.jpg",
        caption: "High mag — diagnostic nuclear atypia, pagetoid spread",
        stain: "H&E", magnification: "High",
      },
    ],
  },

  // ═════════════════════════ ENDOMETRIAL ═════════════════════════════════
  {
    id:   "atlas-endometrial",
    name: "Endometrial Adenocarcinoma",
    organSystem: "Female Reproductive",
    description: "Most common gynaecological malignancy in developed countries. Compare normal proliferative-phase endometrium with the architectural disarray of adenocarcinoma.",
    keyFeatures: [
      "Crowded back-to-back glands with cribriform architecture",
      "Loss of intervening stroma",
      "Stratified columnar cells with nuclear atypia",
      "Squamous metaplasia common in endometrioid type",
      "PTEN mutation in Type 1; TP53 in Type 2 serous",
    ],
    clinicalContext: "Postmenopausal bleeding is the cardinal symptom. Risk factors: obesity, unopposed oestrogen, Lynch syndrome. Diagnosis by endometrial biopsy.",
    diagnosisHint: "Endometrial Adenocarcinoma (Endometrioid) — crowded cribriform glands, no intervening stroma, nuclear atypia, squamous metaplasia, PTEN-mutated",
    normalSlide: {
      hash: "3/37", filename: "Proliferative_phase_endometrium_--_low_mag.jpg",
      caption: "Normal proliferative endometrium — straight tubular glands",
      stain: "H&E", magnification: "Low",
    },
    pathologySlides: [
      {
        hash: "7/71", filename: "Proliferative_phase_endometrium_--_high_mag.jpg",
        caption: "Normal high mag (for comparison) — orderly columnar epithelium",
        stain: "H&E", magnification: "High",
      },
      {
        hash: "e/e1", filename: "Endometrioid_endometrial_adenocarcinoma_high_mag.jpg",
        caption: "Endometrioid adenocarcinoma — cribriform crowded glands",
        stain: "H&E", magnification: "High",
      },
      {
        hash: "c/cb", filename: "Cervical_Intraepithelial_Neoplasia_HSIL_40X.jpg",
        caption: "Comparator — CIN3/HSIL (cervical pre-cancer for context)",
        stain: "H&E", magnification: "High",
      },
    ],
  },
];

export const ORGAN_SYSTEMS: OrganSystem[] = [
  "GI & Liver",
  "Kidney & Urinary",
  "Breast",
  "Female Reproductive",
  "Endocrine",
  "Hematolymphoid",
  "CNS",
  "Skin & Soft Tissue",
  "Infectious",
];
