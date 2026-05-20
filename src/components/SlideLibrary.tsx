"use client";

import { useState } from "react";
import { Search, BookOpen, ArrowRight, FlaskConical, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import SlideImage from "@/components/SlideImage";

function SlideCard({ slide, onSelect }: { slide: Slide; onSelect: () => void }) {
  return (
    <div
      className="card p-0 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onSelect}
    >
      <div className="relative h-44 bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <SlideImage
          src={slide.imageUrl}
          alt={slide.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
          fallbackLabel={slide.title}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap">
          <span className="badge bg-black/40 text-white text-[10px]">{slide.stain}</span>
          <span className={clsx("badge text-[10px]", difficultyColors[slide.difficulty])}>{slide.difficulty}</span>
          <span className={clsx("badge text-[10px]", typeColors[slide.type])}>
            {slide.type === "Normal Histology" ? "Normal" : "Pathology"}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{slide.title}</h3>
            <p className="text-xs text-primary-600 font-medium mt-0.5">{slide.category}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 flex-shrink-0 mt-0.5 transition-colors" />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{slide.description}</p>
      </div>
    </div>
  );
}

interface Slide {
  id: string;
  title: string;
  category: string;
  stain: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  type: "Normal Histology" | "Pathology";
  imageUrl: string;
  analyzeUrl: string;
  description: string;
  diagnosisHint: string;
}

import { SLIDES } from "@/lib/slideImages";

// ── Normal histology slides ──────────────────────────────────────────────────
const NORMAL_SLIDES: Slide[] = [
  {
    id: "n1",
    title: "Normal Liver Histology",
    category: "Hepatology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl:    SLIDES.liver,
    analyzeUrl:  SLIDES.liver,
    description: "Normal hepatic parenchyma with portal tracts, central veins, and hepatocyte cords.",
    diagnosisHint: "Normal Liver Histology — hepatocytes in cords, portal tracts, central veins, sinusoids",
  },
  {
    id: "n2",
    title: "Normal Lung (Alveoli)",
    category: "Pulmonology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl:    SLIDES.lung,
    analyzeUrl:  SLIDES.lung,
    description: "Normal alveolar architecture with thin walls and type I/II pneumocytes.",
    diagnosisHint: "Normal Lung Histology — alveoli with thin walls, type I pneumocytes (flat), type II pneumocytes (cuboidal, surfactant-producing), alveolar macrophages",
  },
  {
    id: "n3",
    title: "Normal Kidney (Cortex)",
    category: "Nephrology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl:    SLIDES.kidney,
    analyzeUrl:  SLIDES.kidney,
    description: "Normal renal cortex with glomeruli, Bowman's capsule, and tubular profiles.",
    diagnosisHint: "Normal Kidney Cortex — glomeruli with Bowman's capsule, proximal convoluted tubules (brush border), distal convoluted tubules, no pathological changes",
  },
  {
    id: "n4",
    title: "Normal Skin",
    category: "Dermatology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl:    SLIDES.skin,
    analyzeUrl:  SLIDES.skin,
    description: "Normal skin showing epidermis layers, dermis, and adnexal structures.",
    diagnosisHint: "Normal Skin Histology — stratified squamous epithelium (stratum basale, spinosum, granulosum, corneum), papillary and reticular dermis, no dysplasia or invasion",
  },
  {
    id: "n5",
    title: "Normal Large Intestine",
    category: "Gastroenterology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl:    SLIDES.colon,
    analyzeUrl:  SLIDES.colon,
    description: "Normal colonic mucosa with straight crypts, goblet cells, and muscularis mucosae.",
    diagnosisHint: "Normal Large Intestine (Colon) Histology — straight parallel crypts, abundant goblet cells, no inflammatory infiltrate beyond normal, muscularis mucosae intact",
  },
  {
    id: "n6",
    title: "Normal Thyroid Gland",
    category: "Endocrinology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl:    SLIDES.thyroid,
    analyzeUrl:  SLIDES.thyroid,
    description: "Normal thyroid follicles filled with colloid, lined by cuboidal follicular cells.",
    diagnosisHint: "Normal Thyroid Histology — follicles of varying size filled with eosinophilic colloid, lined by cuboidal follicular cells, parafollicular C cells, no capsular invasion or nuclear atypia",
  },
  {
    id: "n7",
    title: "Normal Lymph Node",
    category: "Haematology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl:    SLIDES.lymphNode,
    analyzeUrl:  SLIDES.lymphNode,
    description: "Normal lymph node architecture with cortex, germinal centres, and medullary sinuses.",
    diagnosisHint: "Normal Lymph Node — intact capsule, cortex with primary/secondary follicles and germinal centres, paracortex (T cell zone), medullary sinuses, no effacement of architecture",
  },
  {
    id: "n8",
    title: "Cardiac Muscle",
    category: "Cardiology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl:    SLIDES.cardiac,
    analyzeUrl:  SLIDES.cardiac,
    description: "Normal cardiac myocytes with cross-striations and intercalated discs.",
    diagnosisHint: "Normal Cardiac Muscle — branching striated fibres with central nuclei, intercalated discs (step-like junctions between cells), no necrosis or inflammatory infiltrate",
  },
  {
    id: "n9",
    title: "Normal Spleen",
    category: "Haematology", stain: "H&E", difficulty: "Beginner", type: "Normal Histology",
    imageUrl:    SLIDES.spleen,
    analyzeUrl:  SLIDES.spleen,
    description: "Normal spleen showing white pulp (lymphoid follicles) and red pulp (sinusoids).",
    diagnosisHint: "Normal Spleen Histology — white pulp (periarteriolar lymphoid sheaths and follicles) and red pulp (venous sinusoids and splenic cords of Billroth), trabecular arteries",
  },
];

// ── Pathology slides ─────────────────────────────────────────────────────────
const PATHOLOGY_SLIDES: Slide[] = [
  // ── Oncology ────────────────────────────────────────────────────────────
  {
    id: "p1",
    title: "Squamous Cell Carcinoma",
    category: "Oncology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.scc,
    analyzeUrl:  SLIDES.scc,
    description: "Invasive squamous cell carcinoma with keratin pearl formation and stromal invasion.",
    diagnosisHint: "Invasive Squamous Cell Carcinoma — keratin pearls, nuclear atypia, stromal invasion, desmoplastic reaction",
  },
  {
    id: "p2",
    title: "Invasive Ductal Carcinoma",
    category: "Oncology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.idc,
    analyzeUrl:  SLIDES.idc,
    description: "Breast invasive ductal carcinoma with nuclear pleomorphism and desmoplastic stroma.",
    diagnosisHint: "Invasive Ductal Carcinoma of the Breast — malignant glands invading stroma, nuclear pleomorphism, mitotic figures, desmoplastic reaction",
  },
  {
    id: "p2b",
    title: "Ductal Carcinoma In Situ (DCIS)",
    category: "Oncology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.dcis,
    analyzeUrl:  SLIDES.dcis,
    description: "High-grade DCIS with comedo necrosis confined within ducts — basement membrane intact.",
    diagnosisHint: "Ductal Carcinoma In Situ (DCIS) — malignant cells confined within ducts with intact basement membrane and myoepithelium, comedo necrosis in high-grade, nuclear pleomorphism",
  },
  {
    id: "p2c",
    title: "Fibroadenoma — Breast",
    category: "Oncology", stain: "H&E", difficulty: "Beginner", type: "Pathology",
    imageUrl:    SLIDES.fibroadenoma,
    analyzeUrl:  SLIDES.fibroadenoma,
    description: "Benign fibroepithelial tumour with bland stroma and compressed ducts.",
    diagnosisHint: "Fibroadenoma — biphasic tumour with benign ductal epithelium and fibroblastic stroma, intracanalicular/pericanalicular growth patterns, no atypia, benign prognosis",
  },
  // ── Gastroenterology ────────────────────────────────────────────────────
  {
    id: "p3",
    title: "Chronic Gastritis",
    category: "Gastroenterology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.gastritis,
    analyzeUrl:  SLIDES.gastritis,
    description: "Gastric mucosa showing chronic lymphoplasmacytic inflammatory infiltrate.",
    diagnosisHint: "Chronic Gastritis — lymphoplasmacytic infiltrate in lamina propria, gastric mucosal changes, H. pylori association",
  },
  {
    id: "p3b",
    title: "Colorectal Adenocarcinoma",
    category: "Gastroenterology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.crc,
    analyzeUrl:  SLIDES.crc,
    description: "Malignant glandular structures with dirty necrosis invading the colonic wall.",
    diagnosisHint: "Colorectal Adenocarcinoma — irregular malignant glands with nuclear stratification, prominent nucleoli, dirty (luminal) necrosis, invasive growth through muscularis propria",
  },
  {
    id: "p3c",
    title: "Crohn's Disease",
    category: "Gastroenterology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.crohn,
    analyzeUrl:  SLIDES.crohn,
    description: "Transmural bowel inflammation with non-caseating granuloma formation.",
    diagnosisHint: "Crohn's Disease — transmural chronic inflammation, non-caseating granulomas, lymphoid aggregates, crypt architectural distortion, skip lesions",
  },
  {
    id: "p3d",
    title: "Oesophageal Adenocarcinoma",
    category: "Gastroenterology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.oesophageal,
    analyzeUrl:  SLIDES.oesophageal,
    description: "Barrett's oesophagus-associated adenocarcinoma with adjacent intestinal metaplasia.",
    diagnosisHint: "Oesophageal Adenocarcinoma (Barrett's-associated) — malignant glandular structures, intestinal metaplasia adjacent, invasive growth, mucin-secreting columnar cells, desmoplastic stroma",
  },
  // ── Nephrology ────────────────────────────────────────────────────────
  {
    id: "p4",
    title: "Crescentic Glomerulonephritis",
    category: "Nephrology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.rpgn,
    analyzeUrl:  SLIDES.rpgn,
    description: "Glomeruli with cellular crescents indicating rapidly progressive GN.",
    diagnosisHint: "Crescentic Glomerulonephritis (RPGN) — cellular crescents in Bowman's space, parietal epithelial cell proliferation, glomerular compression",
  },
  {
    id: "p4b",
    title: "Clear Cell Renal Cell Carcinoma",
    category: "Nephrology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.ccrcc,
    analyzeUrl:  SLIDES.ccrcc,
    description: "Nests of clear-cytoplasm tumour cells with delicate sinusoidal vasculature.",
    diagnosisHint: "Clear Cell Renal Cell Carcinoma (ccRCC) — nests of tumour cells with optically clear cytoplasm (dissolved lipid/glycogen), thin-walled sinusoidal vasculature, VHL mutation-driven",
  },
  {
    id: "p4c",
    title: "Wilms Tumour (Nephroblastoma)",
    category: "Nephrology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.wilms,
    analyzeUrl:  SLIDES.wilms,
    description: "Triphasic paediatric kidney tumour: blastemal, stromal, and epithelial components.",
    diagnosisHint: "Wilms Tumour (Nephroblastoma) — triphasic tumour with blastemal component (small round blue cells), stromal component (spindle cells), and epithelial component (primitive tubules/glomeruloid structures), paediatric",
  },
  {
    id: "p4d",
    title: "Diabetic Nephropathy (K-W Nodules)",
    category: "Nephrology", stain: "PAS", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.kwNodules,
    analyzeUrl:  SLIDES.kwNodules,
    description: "Pathognomonic Kimmelstiel-Wilson nodules in diabetic glomerulosclerosis.",
    diagnosisHint: "Diabetic Nephropathy — Kimmelstiel-Wilson nodules (PAS-positive mesangial matrix deposits), diffuse mesangial expansion, GBM thickening, arteriolar hyalinosis",
  },
  // ── Pulmonology ──────────────────────────────────────────────────────
  {
    id: "p5",
    title: "Pulmonary Fibrosis (UIP/IPF)",
    category: "Pulmonology", stain: "Masson Trichrome", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.uip,
    analyzeUrl:  SLIDES.uip,
    description: "Dense collagen deposition replacing normal lung parenchyma — UIP/IPF pattern.",
    diagnosisHint: "Usual Interstitial Pneumonia (UIP) / Idiopathic Pulmonary Fibrosis — dense collagen (blue on Masson Trichrome), temporal heterogeneity, fibroblastic foci, honeycombing",
  },
  // ── Infectious Disease ───────────────────────────────────────────────
  {
    id: "p6",
    title: "Pulmonary TB — Caseating Granuloma",
    category: "Infectious Disease", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.tb,
    analyzeUrl:  SLIDES.tb,
    description: "Necrotising granuloma with central caseous necrosis, epithelioid histiocytes, and Langhans giant cells.",
    diagnosisHint: "Pulmonary Tuberculosis — caseating granuloma with central caseous necrosis, epithelioid histiocytes, Langhans giant cells, lymphocytic cuff",
  },
  {
    id: "p7",
    title: "TB — Ziehl-Neelsen Stain",
    category: "Infectious Disease", stain: "ZN", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.tbZN,
    analyzeUrl:  SLIDES.tbZN,
    description: "Acid-fast bacilli (red rods) against blue background confirming M. tuberculosis.",
    diagnosisHint: "Mycobacterium tuberculosis — Ziehl-Neelsen stain showing red acid-fast bacilli (AFB) against blue counterstain. Slender beaded red rods confirm mycobacterial infection.",
  },
  // ── Haematology ──────────────────────────────────────────────────────
  {
    id: "p8",
    title: "Classical Hodgkin Lymphoma",
    category: "Haematology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.hodgkin,
    analyzeUrl:  SLIDES.hodgkin,
    description: "Reed-Sternberg cells with owl-eye nucleoli in a mixed inflammatory background.",
    diagnosisHint: "Classical Hodgkin Lymphoma — Reed-Sternberg cells (large binucleated cells with prominent owl-eye nucleoli, CD15+, CD30+) in a background of lymphocytes, eosinophils, plasma cells",
  },
  {
    id: "p8b",
    title: "Diffuse Large B-Cell Lymphoma",
    category: "Haematology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.dlbcl,
    analyzeUrl:  SLIDES.dlbcl,
    description: "Large transformed B-lymphocytes effacing nodal architecture — high-grade NHL.",
    diagnosisHint: "Diffuse Large B-Cell Lymphoma (DLBCL) — large transformed lymphoid cells with vesicular nuclei and prominent nucleoli, diffuse growth pattern effacing architecture, high Ki-67, CD20+",
  },
  {
    id: "p8c",
    title: "Multiple Myeloma — Bone Marrow",
    category: "Haematology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.myeloma,
    analyzeUrl:  SLIDES.myeloma,
    description: "Sheets of plasma cells with clockface chromatin replacing normal marrow.",
    diagnosisHint: "Multiple Myeloma — sheets of plasma cells with clockface/cartwheel chromatin, perinuclear hof, CD138+, monoclonal light chain restriction, replacing normal bone marrow haematopoiesis",
  },
  // ── Hepatology ────────────────────────────────────────────────────────
  {
    id: "p9",
    title: "Hepatitis B — Ground Glass Hepatocytes",
    category: "Hepatology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.hepB,
    analyzeUrl:  SLIDES.hepB,
    description: "Hepatocytes with finely granular 'ground glass' cytoplasm packed with HBsAg.",
    diagnosisHint: "Chronic Hepatitis B — ground glass hepatocytes with pale finely granular eosinophilic cytoplasm (HBsAg accumulation in smooth ER), portal inflammation, interface hepatitis",
  },
  {
    id: "p9b",
    title: "Hepatocellular Carcinoma",
    category: "Hepatology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.hcc,
    analyzeUrl:  SLIDES.hcc,
    description: "Trabecular cords of malignant hepatocytes with bile production and sinusoidal vasculature.",
    diagnosisHint: "Hepatocellular Carcinoma (HCC) — trabecular growth pattern with thick liver cell plates, sinusoidal vasculature, bile production by tumour cells, nuclear pleomorphism, HepPar-1 positive",
  },
  // ── Cardiology ────────────────────────────────────────────────────────
  {
    id: "p10",
    title: "Acute Myocardial Infarction",
    category: "Cardiology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.ami,
    analyzeUrl:  SLIDES.ami,
    description: "Coagulative necrosis of cardiomyocytes with preserved ghost outlines.",
    diagnosisHint: "Acute Myocardial Infarction — coagulative necrosis with preserved cardiomyocyte ghost outlines, contraction band necrosis, neutrophilic infiltrate (24-72 hrs), loss of nuclear staining",
  },
  {
    id: "p10b",
    title: "Atherosclerosis",
    category: "Cardiology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.atherosclerosis,
    analyzeUrl:  SLIDES.atherosclerosis,
    description: "Coronary artery with atherosclerotic plaque — fibrous cap and lipid core.",
    diagnosisHint: "Atherosclerosis — intimal plaque with fibrous cap (smooth muscle cells, collagen), lipid-necrotic core, foam cells (lipid-laden macrophages), cholesterol clefts, possible calcification, luminal narrowing",
  },
  // ── Neuropathology ────────────────────────────────────────────────────
  {
    id: "p11",
    title: "Glioblastoma Multiforme (GBM)",
    category: "Neuropathology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.gbm,
    analyzeUrl:  SLIDES.gbm,
    description: "WHO grade 4 glioma with pseudopalisading necrosis and microvascular proliferation.",
    diagnosisHint: "Glioblastoma Multiforme (GBM) WHO Grade 4 — pseudopalisading necrosis (tumour cells lining up around hypoxic necrotic zones), microvascular proliferation (glomeruloid vascular tufts), high nuclear pleomorphism, IDH wildtype",
  },
  {
    id: "p11b",
    title: "Meningioma",
    category: "Neuropathology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.meningioma,
    analyzeUrl:  SLIDES.meningioma,
    description: "Meningothelial whorls with psammoma bodies — classic meningioma pattern.",
    diagnosisHint: "Meningioma — whorling pattern of meningothelial cells, psammoma bodies (concentric calcified laminated spherules), syncytial growth, EMA+, PR+, extra-axial location",
  },
  // ── Endocrinology ─────────────────────────────────────────────────────
  {
    id: "p12",
    title: "Papillary Thyroid Carcinoma",
    category: "Endocrinology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.ptc,
    analyzeUrl:  SLIDES.ptc,
    description: "Papillary architecture with Orphan Annie nuclei, nuclear grooves, and psammoma bodies.",
    diagnosisHint: "Papillary Thyroid Carcinoma (PTC) — Orphan Annie (optically clear) nuclei, nuclear grooves, intranuclear pseudo-inclusions, psammoma bodies, papillary architecture, BRAF V600E mutation",
  },
  {
    id: "p12b",
    title: "Phaeochromocytoma",
    category: "Endocrinology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.phaeochromocytoma,
    analyzeUrl:  SLIDES.phaeochromocytoma,
    description: "Adrenal medullary tumour with Zellballen nesting pattern of chromaffin cells.",
    diagnosisHint: "Phaeochromocytoma — Zellballen architecture (nests of large polygonal cells with granular cytoplasm surrounded by sustentacular cells), chromaffin cells, chromogranin A+, synaptophysin+, catecholamine-secreting",
  },
  // ── Dermatology ───────────────────────────────────────────────────────
  {
    id: "p13",
    title: "Malignant Melanoma",
    category: "Dermatology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.melanoma,
    analyzeUrl:  SLIDES.melanoma,
    description: "Atypical melanocytes invading the dermis with pagetoid epidermal spread.",
    diagnosisHint: "Malignant Melanoma — atypical melanocytes with pagetoid spread, dermal invasion without maturation, nuclear pleomorphism with prominent eosinophilic nucleoli, frequent mitoses including deep dermal mitoses",
  },
  {
    id: "p13b",
    title: "Basal Cell Carcinoma",
    category: "Dermatology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.bcc,
    analyzeUrl:  SLIDES.bcc,
    description: "Basaloid nests with peripheral palisading and stromal retraction artefact.",
    diagnosisHint: "Basal Cell Carcinoma (BCC) — basaloid tumour nests with peripheral nuclear palisading, stromal retraction artefact (cleft between tumour and stroma), mucinous stroma, Hedgehog pathway-driven",
  },
  // ── Gynaecology ───────────────────────────────────────────────────────
  {
    id: "p14",
    title: "Cervical Intraepithelial Neoplasia (CIN3)",
    category: "Gynaecology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.cin3,
    analyzeUrl:  SLIDES.cin3,
    description: "Full-thickness cervical squamous dysplasia with koilocytes — high-grade pre-cancer.",
    diagnosisHint: "CIN3 / High-Grade Squamous Intraepithelial Lesion (HSIL) — full-thickness dysplasia with loss of maturation, koilocytes (HPV cytopathic effect), increased mitoses including abnormal forms, p16 block positive",
  },
  {
    id: "p14b",
    title: "Endometrial Adenocarcinoma",
    category: "Gynaecology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.endometrial,
    analyzeUrl:  SLIDES.endometrial,
    description: "Crowded back-to-back glands with cribriform architecture invading the endometrium.",
    diagnosisHint: "Endometrial Adenocarcinoma (Endometrioid type) — crowded glands with cribriform architecture, no intervening stroma, stratified columnar cells with nuclear atypia, squamous metaplasia possible, PTEN mutation",
  },
  // ── Urology ───────────────────────────────────────────────────────────
  {
    id: "p15",
    title: "Prostatic Adenocarcinoma",
    category: "Urology", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.prostate,
    analyzeUrl:  SLIDES.prostate,
    description: "Small infiltrative glands lacking basal cells with prominent nucleoli — Gleason pattern 3.",
    diagnosisHint: "Prostatic Adenocarcinoma — small infiltrative glands with single layer of malignant cells, absent basal cell layer, prominent nucleoli, AMACR positive, Gleason grading by architectural pattern",
  },
  // ── Musculoskeletal ───────────────────────────────────────────────────
  {
    id: "p16",
    title: "Osteosarcoma",
    category: "Musculoskeletal", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.osteosarcoma,
    analyzeUrl:  SLIDES.osteosarcoma,
    description: "Malignant cells directly producing osteoid — pathognomonic for osteosarcoma.",
    diagnosisHint: "Osteosarcoma — high-grade malignant tumour with direct osteoid (pink woven bone matrix) production by pleomorphic tumour cells, nuclear pleomorphism, mitoses, most common in metaphysis of long bones in adolescents",
  },
  {
    id: "p16b",
    title: "Giant Cell Tumour of Bone",
    category: "Musculoskeletal", stain: "H&E", difficulty: "Intermediate", type: "Pathology",
    imageUrl:    SLIDES.gctBone,
    analyzeUrl:  SLIDES.gctBone,
    description: "Mononuclear stromal cells and evenly distributed osteoclast-like giant cells.",
    diagnosisHint: "Giant Cell Tumour of Bone (GCT) — mononuclear stromal cells with evenly distributed multinucleated giant cells (>20 nuclei), osteoclast-like appearance, H3.3 G34W mutation, epiphyseal location",
  },
  // ── Paediatric Pathology ─────────────────────────────────────────────
  {
    id: "p17",
    title: "Wilms Tumour (Nephroblastoma)",
    category: "Paediatric Pathology", stain: "H&E", difficulty: "Advanced", type: "Pathology",
    imageUrl:    SLIDES.wilms,
    analyzeUrl:  SLIDES.wilms,
    description: "Triphasic paediatric kidney tumour — blastemal, stromal, and epithelial components.",
    diagnosisHint: "Wilms Tumour (Nephroblastoma) — triphasic tumour with blastemal (small round blue cells), stromal (loose spindle cells), and epithelial (primitive tubules) components, WT1 mutation, paediatric (peak age 3-4 years)",
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
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [slideType, setSlideType]   = useState("All");

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
        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Slide Library</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Browse curated histopathology cases — click any slide to analyze</p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All Slides",       count: ALL_SLIDES.length, value: "All",              activeClass: "bg-slate-800 text-white border-slate-800" },
          { label: "Normal Histology", count: normalCount,        value: "Normal Histology", activeClass: "bg-sky-600 text-white border-sky-600" },
          { label: "Pathology",        count: pathologyCount,     value: "Pathology",        activeClass: "bg-rose-600 text-white border-rose-600" },
        ].map(({ label, count, value, activeClass }) => (
          <button
            key={value}
            onClick={() => setSlideType(value)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150",
              slideType === value
                ? activeClass
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {label}
            <span className={clsx(
              "text-xs font-bold px-1.5 py-0.5 rounded-full",
              slideType === value ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
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
              <SlideCard
                key={slide.id}
                slide={slide}
                onSelect={() => onSelect(slide.analyzeUrl, slide.diagnosisHint)}
              />
            ))}
          </div>

          <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
            <p>Click any slide to open it in the AI Analyzer for a full diagnosis, IHC markers, pathogenesis walkthrough, and follow-up questions.</p>
          </div>
        </>
      )}
    </div>
  );
}
