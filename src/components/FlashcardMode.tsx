"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { RotateCcw, ChevronRight, ChevronLeft, Shuffle, RefreshCw, Layers, Trophy, Brain, CalendarClock, Timer } from "lucide-react";
import { clsx } from "clsx";
import type { User } from "@supabase/supabase-js";
import { fetchReviews, recordRating, isDue, type FlashcardReview, type Rating } from "@/lib/flashcardReviews";
import { supabase } from "@/lib/supabase";

const proxy = (url: string) => `/api/proxy-image?url=${encodeURIComponent(url)}`;

interface Flashcard {
  id: string;
  imageUrl: string;
  category: string;
  stain: string;
  type: "Normal Histology" | "Pathology";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  prompt: string;          // question shown on front
  questions: string[];     // structured study questions on front
  diagnosis: string;       // big answer on back
  keyFeatures: string[];   // bullet points on back
  ihcMarkers: string[];    // IHC short list on back
  clinicalPearl: string;   // memorable takeaway
}

const FLASHCARDS: Flashcard[] = [
  // ── Normal Histology ──────────────────────────────────────────────────────
  {
    id: "f-n1",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/8/82/Histopathology_of_liver_zones.jpg"),
    category: "Hepatology", stain: "H&E", type: "Normal Histology", difficulty: "Beginner",
    prompt: "Identify this organ and describe its normal histological architecture.",
    questions: [
      "What organ is this?",
      "Name the three components of a portal tract visible here",
      "Which IHC marker confirms hepatocyte origin?",
      "Which hepatic zone is most vulnerable to ischaemia and paracetamol toxicity?",
    ],
    diagnosis: "Normal Liver Histology",
    keyFeatures: [
      "Hepatocytes in cords (liver plates) radiating from central vein",
      "Portal tracts: portal vein + hepatic artery + bile duct",
      "Sinusoids lined by Kupffer cells (resident macrophages)",
      "Hepatocytes: polygonal, central nucleus, granular eosinophilic cytoplasm",
    ],
    ihcMarkers: ["HepPar-1 (+)", "AFP (−, normal)", "CK7 (bile ducts only)"],
    clinicalPearl: "Zone 3 (centrilobular) hepatocytes are most susceptible to ischaemia and toxins like paracetamol.",
  },
  {
    id: "f-n2",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/a/ac/Normal_lung_%283660695207%29.jpg"),
    category: "Pulmonology", stain: "H&E", type: "Normal Histology", difficulty: "Beginner",
    prompt: "Name the structures visible in this normal lung section.",
    questions: [
      "What organ and structure is shown here?",
      "What are the differences between Type I and Type II pneumocytes visible in this section?",
      "Which IHC markers identify Type II pneumocytes specifically?",
      "Why does surfactant deficiency in premature infants cause neonatal RDS?",
    ],
    diagnosis: "Normal Lung — Alveoli",
    keyFeatures: [
      "Alveoli: thin-walled air sacs for gas exchange",
      "Type I pneumocytes: flat, cover ~95% of alveolar surface",
      "Type II pneumocytes: cuboidal, produce surfactant, progenitor cells",
      "Alveolar macrophages ('dust cells') in alveolar spaces",
    ],
    ihcMarkers: ["TTF-1 (+, type II pneumocytes)", "Napsin A (+, type II)", "SP-A (+, surfactant)"],
    clinicalPearl: "Type II pneumocytes regenerate after lung injury. Surfactant deficiency in premature infants causes neonatal RDS.",
  },
  {
    id: "f-n3",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/63/Histology-kidney.jpg"),
    category: "Nephrology", stain: "H&E", type: "Normal Histology", difficulty: "Beginner",
    prompt: "Identify the structures in this normal kidney cortex section.",
    questions: [
      "What organ and region is this?",
      "How do you distinguish proximal from distal tubules on H&E?",
      "Which IHC marker is specific to podocytes in the glomerulus?",
      "Which disease causes foot process effacement only visible on EM — not on H&E?",
    ],
    diagnosis: "Normal Kidney Cortex",
    keyFeatures: [
      "Glomerulus: tuft of capillaries within Bowman's capsule",
      "Proximal tubule: brush border (microvilli), eosinophilic cytoplasm",
      "Distal tubule: no brush border, paler, smaller lumen",
      "Filtration barrier: endothelium + GBM + podocyte foot processes",
    ],
    ihcMarkers: ["CD10 (+, proximal tubule)", "PAX8 (+, renal epithelium)", "WT1 (+, podocytes)"],
    clinicalPearl: "Loss of podocyte foot processes (only visible on EM) is the hallmark of Minimal Change Disease — the commonest cause of nephrotic syndrome in children.",
  },
  {
    id: "f-n4",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/b/b4/Normal_Epidermis_and_Dermis_with_Intradermal_Nevus_10x.JPG"),
    category: "Dermatology", stain: "H&E", type: "Normal Histology", difficulty: "Beginner",
    prompt: "Name the skin layers visible and their key cell types.",
    questions: [
      "What tissue is this and name its two main layers?",
      "Name the epidermal layers deep to superficial and identify where melanocytes and Langerhans cells sit",
      "Which IHC marker identifies Langerhans cells in the epidermis?",
      "Why do people of different skin tones have similar keratinocyte melanin content?",
    ],
    diagnosis: "Normal Skin Histology",
    keyFeatures: [
      "Epidermis (deep→surface): Basale → Spinosum → Granulosum → Corneum",
      "Dermis: papillary (loose collagen) and reticular (dense collagen)",
      "Melanocytes: in stratum basale, produce melanin",
      "Langerhans cells: antigen-presenting cells in stratum spinosum",
    ],
    ihcMarkers: ["S100 (+, melanocytes & Langerhans)", "CK5/6 (+, epidermis)", "CD1a (+, Langerhans cells)"],
    clinicalPearl: "Melanocytes from neural crest cells migrate to skin. They transfer melanin via dendrites to keratinocytes — hence why everyone has similar keratinocyte melanin content regardless of race, but melanocyte activity differs.",
  },
  {
    id: "f-n5",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/d/de/Large_intestine_histology.jpg"),
    category: "Gastroenterology", stain: "H&E", type: "Normal Histology", difficulty: "Beginner",
    prompt: "Identify this part of the GI tract and its characteristic cell type.",
    questions: [
      "Which part of the GI tract is this — how do you know it is NOT small intestine?",
      "What is the dominant cell type and what do the submucosal and myenteric nerve plexuses do?",
      "Which IHC panel confirms colorectal origin?",
      "What histological feature distinguishes chronic IBD from infectious colitis?",
    ],
    diagnosis: "Normal Large Intestine (Colon)",
    keyFeatures: [
      "Straight parallel crypts (no villi unlike small intestine)",
      "Abundant goblet cells: mucin-secreting, distend crypts",
      "Muscularis mucosae: thin smooth muscle below mucosa",
      "Submucosal plexus (Meissner's) and myenteric plexus (Auerbach's)",
    ],
    ihcMarkers: ["CK20 (+)", "CDX2 (+)", "MUC2 (+, goblet cells)"],
    clinicalPearl: "Loss of straight crypt architecture (crypt distortion, branching) is the histological hallmark of chronic IBD, distinguishing it from infectious colitis.",
  },
  {
    id: "f-n6",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/6a/Thyroid_gland_microscope.jpg"),
    category: "Endocrinology", stain: "H&E", type: "Normal Histology", difficulty: "Beginner",
    prompt: "What is the pink material filling these follicles, and what does its appearance tell you?",
    questions: [
      "What organ is this and what does the pink material filling the follicles represent?",
      "How does follicular cell shape change between active and inactive states, and what does scalloping mean?",
      "Which IHC marker is positive only in parafollicular C cells?",
      "How does the histology differ in hypothyroidism vs. hyperthyroidism (Graves' disease)?",
    ],
    diagnosis: "Normal Thyroid Gland",
    keyFeatures: [
      "Follicles: spherical units filled with pink colloid (thyroglobulin)",
      "Follicular cells: cuboidal when active, flat when inactive",
      "Scalloping of colloid = active resorption/hormone production",
      "Parafollicular C cells: between follicles, produce calcitonin",
    ],
    ihcMarkers: ["TTF-1 (+)", "Thyroglobulin (+)", "Calcitonin (+, C cells only)"],
    clinicalPearl: "Full follicles + flat cells = hypothyroidism. Empty follicles + tall columnar cells + scalloping = hyperthyroidism (Graves' disease).",
  },
  {
    id: "f-n7",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/d/da/Lymph_node_histology.jpg"),
    category: "Haematology", stain: "H&E", type: "Normal Histology", difficulty: "Beginner",
    prompt: "Name the zones of a lymph node and which immune cells populate each.",
    questions: [
      "What organ is this and name its three main histological zones?",
      "Which zone contains B cell follicles and which contains T cells?",
      "Which IHC markers distinguish B cells, T cells, and macrophages in this node?",
      "What does complete effacement of nodal architecture indicate?",
    ],
    diagnosis: "Normal Lymph Node",
    keyFeatures: [
      "Cortex: B cell follicles (primary = resting; secondary = germinal centre)",
      "Paracortex: T cell zone, high endothelial venules (HEV)",
      "Medulla: medullary cords (plasma cells) + sinuses (macrophages)",
      "Subcapsular sinus: first line of lymph filtration",
    ],
    ihcMarkers: ["CD20 (+, B cells/follicles)", "CD3 (+, T cells/paracortex)", "CD68 (+, macrophages/sinuses)"],
    clinicalPearl: "Reactive hyperplasia = enlarged germinal centres (follicular pattern). Effacement of architecture = lymphoma until proven otherwise.",
  },
  {
    id: "f-n8",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/3/3d/Cardiac_muscle_histology_400x.jpg"),
    category: "Cardiology", stain: "H&E", type: "Normal Histology", difficulty: "Beginner",
    prompt: "What feature visible between these muscle cells is unique to cardiac muscle?",
    questions: [
      "What muscle type is this and what is the dark step-like structure between cells?",
      "How does cardiac muscle differ from skeletal in nucleus position and fibre branching?",
      "Which IHC marker within intercalated discs enables electrical synchrony?",
      "Why does cardiac troponin T appear in the bloodstream during myocardial infarction?",
    ],
    diagnosis: "Normal Cardiac Muscle",
    keyFeatures: [
      "Intercalated discs: step-like junctions between cardiomyocytes",
      "Gap junctions within discs: electrical syncytium for co-ordinated contraction",
      "Central single nucleus (cf. skeletal = peripheral, multi-nucleate)",
      "Branching fibres with cross-striations",
    ],
    ihcMarkers: ["Desmin (+)", "Cardiac troponin T (+)", "Connexin-43 (+, gap junctions)"],
    clinicalPearl: "Troponin T/I leaks into blood during myocardial infarction — the basis of the troponin blood test used to diagnose MI in A&E.",
  },
  {
    id: "f-n9",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/60/Histology_of_Spleen.jpg"),
    category: "Haematology", stain: "H&E", type: "Normal Histology", difficulty: "Beginner",
    prompt: "Identify the two functional compartments of the spleen and their roles.",
    questions: [
      "What organ is this and name its two main functional compartments?",
      "Which cells dominate the white pulp PALS vs. follicles, and what is the marginal zone?",
      "Which IHC markers identify the main cell types in white and red pulp?",
      "Which encapsulated bacteria does the spleen filter, and why do asplenic patients need vaccination?",
    ],
    diagnosis: "Normal Spleen",
    keyFeatures: [
      "White pulp: lymphoid tissue around central arteries (T cells) + follicles (B cells)",
      "Red pulp: venous sinusoids + splenic cords of Billroth (macrophages)",
      "Marginal zone: between white & red pulp; traps blood-borne antigens",
      "Trabecular arteries branch into central arteries within white pulp",
    ],
    ihcMarkers: ["CD3 (+, PALS/white pulp)", "CD20 (+, follicles)", "CD68 (+, red pulp macrophages)"],
    clinicalPearl: "The spleen filters encapsulated bacteria (pneumococcus, meningococcus, H. influenzae). Asplenic patients need vaccinations against these organisms.",
  },

  // ── Pathology ─────────────────────────────────────────────────────────────
  {
    id: "f-p1",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/f/f8/Micrograph_of_invasive_squamous_cell_carcinoma_-_150x.jpg"),
    category: "Oncology", stain: "H&E", type: "Pathology", difficulty: "Intermediate",
    prompt: "What is the diagnosis? Identify the key feature that distinguishes this from other carcinomas.",
    questions: [
      "What is the diagnosis?",
      "Name the pathognomonic squamous structure visible and describe two nuclear features of malignancy",
      "Which IHC markers confirm squamous origin and which marker is negative?",
      "How do you distinguish SCC from Seborrhoeic Keratosis histologically?",
    ],
    diagnosis: "Invasive Squamous Cell Carcinoma",
    keyFeatures: [
      "Keratin pearls: concentric whorls of keratinising squamous cells",
      "Nuclear atypia: enlarged hyperchromatic nuclei, irregular contours",
      "Individual cell keratinisation: pink glassy cytoplasm in single cells",
      "Stromal invasion with desmoplastic (fibrous) reaction",
    ],
    ihcMarkers: ["CK5/6 (+)", "p63 (+)", "p40 (+)", "CK7 (−)"],
    clinicalPearl: "SCC ≠ Seborrhoeic Keratosis. SK has pseudohorn cysts, no atypia, no invasion. SCC has true keratin pearls + nuclear atypia + stromal breach.",
  },
  {
    id: "f-p2",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/f/fc/Carcinoma_Stomach_10x.jpg"),
    category: "Gastroenterology", stain: "H&E", type: "Pathology", difficulty: "Intermediate",
    prompt: "What type of inflammatory infiltrate is seen in this gastric biopsy, and what does it indicate?",
    questions: [
      "What is the diagnosis?",
      "Which cells define chronic vs. active gastritis, and what long-term mucosal change do you see?",
      "Which IHC stain confirms H. pylori infection in the biopsy?",
      "What sequence of mucosal changes links H. pylori to gastric adenocarcinoma?",
    ],
    diagnosis: "Chronic Gastritis",
    keyFeatures: [
      "Lymphocytes and plasma cells in lamina propria (chronic infiltrate)",
      "Neutrophils in crypts = active gastritis superimposed on chronic",
      "Glandular atrophy and intestinal metaplasia in long-standing disease",
      "H. pylori curved bacilli may be seen on surface epithelium",
    ],
    ihcMarkers: ["H. pylori IHC (+, if infected)", "Ki-67 (elevated in active areas)"],
    clinicalPearl: "H. pylori → chronic gastritis → intestinal metaplasia → dysplasia → gastric adenocarcinoma. WHO classifies H. pylori as a Group 1 carcinogen.",
  },
  {
    id: "f-p3",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/5/55/Srifhistology3.jpg"),
    category: "Pulmonology", stain: "Masson Trichrome", type: "Pathology", difficulty: "Advanced",
    prompt: "What does the blue staining represent in this Masson Trichrome section, and what is the pattern called?",
    questions: [
      "What is the diagnosis and what does the blue staining represent?",
      "What is temporal heterogeneity — describe its three components visible in one section",
      "Which stain highlights fibroblastic foci (active fibrosis fronts)?",
      "How does the histological pattern of UIP differ from NSIP, and why does this distinction matter?",
    ],
    diagnosis: "Usual Interstitial Pneumonia (UIP) / IPF",
    keyFeatures: [
      "Dense blue collagen = fibrosis replacing lung parenchyma",
      "Temporal heterogeneity: fibrosis + normal lung + honeycombing in same section",
      "Fibroblastic foci: active fibrosis front (pale spindle cells)",
      "Subpleural and paraseptal distribution",
    ],
    ihcMarkers: ["Masson Trichrome (blue = collagen)", "α-SMA (+, myofibroblasts in fibroblastic foci)"],
    clinicalPearl: "Temporal heterogeneity (old + new fibrosis in one biopsy) = UIP. Temporally uniform fibrosis = NSIP. This distinction drives treatment choice.",
  },
  {
    id: "f-p4",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/6/6a/Crescentic_glomerulonephritis_HE_stain.JPEG"),
    category: "Nephrology", stain: "H&E", type: "Pathology", difficulty: "Advanced",
    prompt: "What structures are compressing the glomeruli, and what emergency condition does this represent?",
    questions: [
      "What is the diagnosis and what structures fill Bowman's space?",
      "Which two cell types form the crescent and what triggers it?",
      "Which immunofluorescence pattern distinguishes anti-GBM from immune complex GN?",
      "What percentage of crescents defines RPGN and what is the clinical urgency?",
    ],
    diagnosis: "Crescentic Glomerulonephritis (RPGN)",
    keyFeatures: [
      "Cellular crescents: parietal epithelial cells + monocytes fill Bowman's space",
      "Glomerular tuft compressed and distorted",
      "Fibrin deposition in Bowman's space triggers crescent formation",
      "Causes: anti-GBM (Goodpasture), ANCA vasculitis, immune complex GN",
    ],
    ihcMarkers: ["IgG linear (+, anti-GBM)", "C3 (+, immune complex)", "ANCA (pANCA/cANCA serum test)"],
    clinicalPearl: "RPGN = >50% of glomeruli with crescents = renal emergency. Can lose 50% renal function in weeks. Needs urgent renal biopsy + immunosuppression.",
  },
  {
    id: "f-p5",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/f/f8/Micrograph_of_ductal_carcinoma_with_marked_nuclear_pleomorphism_and_increased_mitotic_rate.jpg"),
    category: "Oncology", stain: "H&E", type: "Pathology", difficulty: "Advanced",
    prompt: "What features of malignancy are visible, and how does this differ from DCIS?",
    questions: [
      "What is the diagnosis?",
      "Which feature proves this is invasive (not DCIS) and name two nuclear features of malignancy",
      "Which four IHC markers are routinely tested and what treatment does each guide?",
      "What does triple-negative (ER−, PR−, HER2−) mean for treatment options?",
    ],
    diagnosis: "Invasive Ductal Carcinoma (IDC) — Breast",
    keyFeatures: [
      "Irregular malignant glands invading desmoplastic stroma",
      "Marked nuclear pleomorphism and prominent nucleoli",
      "Frequent mitotic figures",
      "Basement membrane breached (cf. DCIS = intact BM)",
    ],
    ihcMarkers: ["CK7 (+)", "ER/PR (variable)", "HER2 (variable — guides trastuzumab)", "Ki-67 (proliferation index)"],
    clinicalPearl: "Triple-negative (ER−, PR−, HER2−) = worst prognosis, chemotherapy only. ER+ = endocrine therapy. HER2+ = trastuzumab. Always test all three.",
  },
  {
    id: "f-p6",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/3/37/Pulmonary_tuberculosis_-_Necrotizing_granuloma_%286545185917%29.jpg"),
    category: "Infectious Disease", stain: "H&E", type: "Pathology", difficulty: "Intermediate",
    prompt: "What type of necrosis is seen here, and what cells form the ring around it?",
    questions: [
      "What is the diagnosis and what type of necrosis fills the centre?",
      "Describe the epithelioid histiocytes and the Langhans giant cell nuclear arrangement",
      "Which special stain confirms M. tuberculosis — what colour are the bacilli?",
      "How do you distinguish a TB granuloma from sarcoidosis on histology?",
    ],
    diagnosis: "Pulmonary TB — Caseating Granuloma",
    keyFeatures: [
      "Caseous necrosis: structureless pink 'cheesy' centre",
      "Epithelioid histiocytes: activated macrophages, elongated kidney-shaped nuclei",
      "Langhans giant cells: peripheral horseshoe arrangement of nuclei",
      "Peripheral lymphocytic cuff",
    ],
    ihcMarkers: ["ZN stain (red AFB +, confirms TB)", "CD68 (+, histiocytes)", "PCR / GeneXpert for M. tuberculosis"],
    clinicalPearl: "Caseous = TB. Non-caseating = sarcoidosis (or fungal). In Africa: TB is the #1 cause of caseating granulomas — always consider it first.",
  },
  {
    id: "f-p7",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/9/98/Mycobacterium_tuberculosis_Ziehl-Neelsen_stain.jpg"),
    category: "Infectious Disease", stain: "ZN", type: "Pathology", difficulty: "Intermediate",
    prompt: "What stain is this and why do these organisms retain the red dye?",
    questions: [
      "Name this stain and identify the organisms by their colour and morphology",
      "Why do mycobacteria retain the red dye when treated with acid-alcohol?",
      "What is the minimum bacilli count per 100 fields to call a smear positive?",
      "Why is GeneXpert preferred over ZN smear in high MDR-TB settings?",
    ],
    diagnosis: "Tuberculosis — Ziehl-Neelsen (ZN) Stain",
    keyFeatures: [
      "Red slender slightly curved bacilli (acid-fast) against blue background",
      "Mycolic acid in cell wall resists decolourisation with acid-alcohol",
      "Beaded pattern within organisms (characteristic of M. tuberculosis)",
      "Minimum 3+ bacilli/100 fields = smear positive",
    ],
    ihcMarkers: ["ZN stain (acid-fast bacilli +)", "Auramine-O fluorescence (more sensitive)", "GeneXpert MTB/RIF (molecular)"],
    clinicalPearl: "ZN smear has ~60% sensitivity. GeneXpert has ~90% sensitivity and simultaneously detects rifampicin resistance — crucial in Africa where MDR-TB is rising.",
  },
  {
    id: "f-p8",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/3/33/Hodgkin_Disease,_Reed-Sternberg_Cell.jpg"),
    category: "Haematology", stain: "H&E", type: "Pathology", difficulty: "Advanced",
    prompt: "Identify the pathognomonic cell type and describe its appearance.",
    questions: [
      "What is the diagnosis and name the pathognomonic cell type?",
      "Describe the background inflammatory cells surrounding the malignant cells",
      "Which markers are positive AND negative — state the classic IHC combination",
      "What is the cure rate and which therapy targets CD30 in relapsed disease?",
    ],
    diagnosis: "Classical Hodgkin Lymphoma",
    keyFeatures: [
      "Reed-Sternberg (RS) cell: large, binucleated, 'owl-eye' prominent nucleoli",
      "Background: lymphocytes, eosinophils, plasma cells, neutrophils",
      "RS cells are malignant B cells with aberrant NF-κB activation",
      "Mixed cellularity subtype most common in Africa and HIV+ patients",
    ],
    ihcMarkers: ["CD30 (+)", "CD15 (+)", "CD20 (−)", "CD45 (−)", "PAX5 (dim +)"],
    clinicalPearl: "Hodgkin lymphoma is one of the most curable cancers (>85% with ABVD). CD30 positivity also makes it a target for brentuximab vedotin in relapsed disease.",
  },
  {
    id: "f-p9",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/a/a1/Histopathology_of_clear_cell_renal_cell_carcinoma,_grade_1,_high_magnification.jpg"),
    category: "Nephrology", stain: "H&E", type: "Pathology", difficulty: "Advanced",
    prompt: "What causes the clear cytoplasm in these tumour cells, and what gene drives this?",
    questions: [
      "What is the diagnosis and what causes the clear cytoplasm?",
      "Describe the vascular architecture and what VHL deletion on chr 3p causes",
      "Which IHC marker is strongly/diffusely positive and distinguishes this from papillary RCC?",
      "How does VHL → HIF → VEGF drive this tumour, and which targeted therapies exploit this?",
    ],
    diagnosis: "Clear Cell Renal Cell Carcinoma (ccRCC)",
    keyFeatures: [
      "Clear cytoplasm: lipid + glycogen dissolved during processing",
      "Nests/sheets with thin-walled sinusoidal vasculature",
      "Fuhrman/WHO-ISUP nuclear grade determines prognosis",
      "VHL deletion (chr 3p) → HIF↑ → VEGF↑ → angiogenesis",
    ],
    ihcMarkers: ["CA-IX (+, strong/diffuse)", "CD10 (+)", "RCC antigen (+)", "CK7 (−, cf. papillary RCC CK7+)"],
    clinicalPearl: "VHL mutation = HIF → VEGF overproduction = highly vascular tumour. This is why sunitinib (anti-VEGF) and everolimus (mTOR inhibitor) work in metastatic ccRCC.",
  },
  {
    id: "f-p10",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/2/22/Ground_glass_hepatocytes_high_mag_2.jpg"),
    category: "Hepatology", stain: "H&E", type: "Pathology", difficulty: "Advanced",
    prompt: "What fills the cytoplasm of these hepatocytes and what viral infection does it indicate?",
    questions: [
      "What is the diagnosis and describe the hepatocyte cytoplasm appearance?",
      "What accumulates in the smooth ER to produce this 'ground glass' look?",
      "Which two IHC stains confirm HBV infection in liver tissue?",
      "Why does perinatal HBV infection carry a 90% risk of chronic disease and eventual HCC?",
    ],
    diagnosis: "Chronic Hepatitis B — Ground Glass Hepatocytes",
    keyFeatures: [
      "Pale finely granular cytoplasm = HBsAg-packed smooth ER",
      "Ground glass appearance: frosted, finely stippled",
      "Portal inflammation with interface hepatitis",
      "Fibrosis staging: F0–F4 (F4 = cirrhosis)",
    ],
    ihcMarkers: ["Orcein stain (+, ground glass cells)", "HBsAg IHC (+)", "HBcAg IHC (+/−)"],
    clinicalPearl: "HBV is the leading cause of HCC in Africa due to high perinatal transmission. HBsAg+ at birth → 90% risk of chronic infection → cirrhosis → HCC. Vaccination at birth is the prevention.",
  },
  {
    id: "f-p11",
    imageUrl: proxy("https://upload.wikimedia.org/wikipedia/commons/1/18/Adenocarcinoma_of_the_colon-histology.JPG"),
    category: "Gastroenterology", stain: "H&E", type: "Pathology", difficulty: "Intermediate",
    prompt: "What feature in the gland lumens helps identify this as colorectal rather than another adenocarcinoma?",
    questions: [
      "What is the diagnosis?",
      "What is 'dirty necrosis' and name the other three key features on this section",
      "Which IHC panel confirms colorectal origin and what does MMR testing detect?",
      "Which mutation must be checked before anti-EGFR therapy, and what does MSI-High status mean for immunotherapy?",
    ],
    diagnosis: "Colorectal Adenocarcinoma",
    keyFeatures: [
      "Irregular malignant glands invading muscularis propria",
      "Dirty (luminal) necrosis: necrotic debris in gland lumens",
      "Nuclear stratification and prominent nucleoli",
      "Desmoplastic stromal reaction",
    ],
    ihcMarkers: ["CK20 (+)", "CDX2 (+)", "CK7 (−)", "MLH1/MSH2/MSH6/PMS2 (MMR status — Lynch syndrome screen)"],
    clinicalPearl: "Always test MMR status. MSI-High (dMMR) tumours respond dramatically to pembrolizumab (PD-1 inhibitor). Also check for KRAS/NRAS mutations before anti-EGFR therapy.",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const difficultyColor: Record<string, string> = {
  Beginner:     "bg-emerald-50 text-emerald-700",
  Intermediate: "bg-amber-50 text-amber-700",
  Advanced:     "bg-red-50 text-red-700",
};
const typeColor: Record<string, string> = {
  "Normal Histology": "bg-sky-50 text-sky-700",
  "Pathology":        "bg-rose-50 text-rose-700",
};

type CardStatus = "unseen" | "known" | "practice";
type FilterMode = "Due" | "All" | "Normal Histology" | "Pathology" | "My Slides";
type TimerMode  = "none" | "session" | "per-card";

function historyToFlashcard(row: {
  id: string;
  diagnosis: string;
  image_url: string | null;
  analysis_json: Record<string, unknown> | null;
  analyzed_at?: string;
}): Flashcard {
  const a = row.analysis_json ?? {};
  const keyFeatures = (a.structures as { name: string; description: string }[] | undefined)
    ?.slice(0, 4).map(s => `${s.name}: ${s.description}`) ?? [];
  const ihcMarkers = (a.ihcMarkers as { marker: string; expectedResult: string }[] | undefined)
    ?.map(m => `${m.marker} (${m.expectedResult})`) ?? [];

  const stainType = (a.stain as { type?: string } | undefined)?.type ?? "H&E";
  const hasIhc = !!(a.ihcMarkers as unknown[] | undefined)?.length;
  const hasRisk = !!(a.riskFactors as string[] | undefined)?.length;
  const questions = [
    "What is the diagnosis based on the histological features you see?",
    `What stain is used here? (${stainType}) — how did you identify it?`,
    "Name at least 3 key histological structures or features visible",
    hasRisk ? "What are the main risk factors for this condition?" : "What are the main differential diagnoses?",
    hasIhc ? "Which IHC markers would you order to confirm this diagnosis?" : null,
  ].filter(Boolean) as string[];

  return {
    id: `user-${row.id}`,
    imageUrl: row.image_url ?? "https://placehold.co/600x300/0f172a/38bdf8?text=Slide",
    category: "My Slides",
    stain: stainType,
    type: "Pathology",
    difficulty: "Intermediate",
    prompt: "You analyzed this slide before — can you recall the diagnosis and key features?",
    questions,
    diagnosis: row.diagnosis,
    keyFeatures: keyFeatures.length ? keyFeatures : ["See full analysis in Analyze Slide tab"],
    ihcMarkers: ihcMarkers.length ? ihcMarkers : [],
    clinicalPearl: (a.clinicalCorrelation as string | undefined) ?? (a.keyLearningPoints as string[] | undefined)?.[0] ?? "",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FlashcardMode({ user }: { user: User | null }) {
  const [deck, setDeck]           = useState<Flashcard[]>(FLASHCARDS);
  const [userCards, setUserCards] = useState<Flashcard[]>([]);
  const [index, setIndex]         = useState(0);
  const [flipped, setFlipped]     = useState(false);
  const [statuses, setStatuses]   = useState<Record<string, CardStatus>>({});
  const [filter, setFilter]       = useState<FilterMode>(user ? "Due" : "All");
  const [started, setStarted]     = useState(false);
  const [finished, setFinished]   = useState(false);
  const [reviews, setReviews]     = useState<Record<string, FlashcardReview>>({});
  const [timerMode, setTimerMode]             = useState<TimerMode>("none");
  const [sessionMins, setSessionMins]         = useState(10);
  const [perCardSecs, setPerCardSecs]         = useState(120);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [cardTimeLeft, setCardTimeLeft]       = useState(0);
  const [timedOut, setTimedOut]               = useState(false);

  const allCards = useMemo(() => [...FLASHCARDS, ...userCards], [userCards]);

  const dueCount = useMemo(
    () => allCards.filter(c => isDue(reviews[c.id])).length,
    [allCards, reviews]
  );

  const filteredDeck = useMemo(() => {
    if (filter === "Due")               return allCards.filter(c => isDue(reviews[c.id]));
    if (filter === "Normal Histology")  return deck.filter(c => c.type === "Normal Histology");
    if (filter === "Pathology")         return deck.filter(c => c.type === "Pathology" && c.category !== "My Slides");
    if (filter === "My Slides")         return userCards;
    return allCards;
  }, [allCards, deck, userCards, filter, reviews]);

  // If "Due" returns empty (reviews still loading or all caught up), fall back to all cards
  const effectiveDeck = filter === "Due" && filteredDeck.length === 0 && started ? allCards : filteredDeck;
  const card = effectiveDeck[index];

  const knownCount = Object.values(statuses).filter(s => s === "known").length;

  // Load review records + user's analyzed slides on mount
  useEffect(() => {
    if (!user) { setReviews({}); setUserCards([]); return; }
    let cancelled = false;

    fetchReviews(user.id).then(rows => {
      if (cancelled) return;
      const map: Record<string, FlashcardReview> = {};
      for (const r of rows) map[r.card_id] = r;
      setReviews(map);
    });

    supabase
      .from("slide_history")
      .select("id, diagnosis, image_url, analysis_json, analyzed_at")
      .eq("user_id", user.id)
      .not("image_url", "is", null)
      .order("analyzed_at", { ascending: false })
      .limit(50)
      .then(({ data }: { data: { id: string; diagnosis: string; image_url: string | null; analysis_json: Record<string, unknown> | null; analyzed_at?: string }[] | null }) => {
        if (cancelled || !data) return;
        setUserCards(data.map(historyToFlashcard));
      });

    return () => { cancelled = true; };
  }, [user]);

  // Session countdown
  useEffect(() => {
    if (!started || finished || timerMode !== "session" || sessionTimeLeft <= 0) return;
    const t = setTimeout(() => setSessionTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, finished, timerMode, sessionTimeLeft]);

  useEffect(() => {
    if (timerMode === "session" && started && !finished && sessionTimeLeft === 0) {
      setTimedOut(true);
      setFinished(true);
    }
  }, [timerMode, started, finished, sessionTimeLeft]);

  // Per-card countdown — reset when card changes
  useEffect(() => {
    if (timerMode !== "per-card" || !started || finished) return;
    setCardTimeLeft(perCardSecs);
  }, [index, timerMode, started, finished, perCardSecs]);

  useEffect(() => {
    if (!started || finished || timerMode !== "per-card" || cardTimeLeft <= 0) return;
    const t = setTimeout(() => setCardTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, finished, timerMode, cardTimeLeft]);

  // Auto-advance when per-card timer hits 0
  useEffect(() => {
    if (!started || finished || timerMode !== "per-card" || cardTimeLeft !== 0 || perCardSecs === 0) return;
    setFlipped(false);
    const t = setTimeout(() => {
      if (index + 1 >= effectiveDeck.length) setFinished(true);
      else setIndex(i => i + 1);
    }, 300);
    return () => clearTimeout(t);
  }, [started, finished, timerMode, cardTimeLeft, perCardSecs, index, effectiveDeck.length]);

  const rateCard = useCallback(async (rating: Rating) => {
    if (!card) return;
    const status: CardStatus = rating === "again" || rating === "hard" ? "practice" : "known";
    setStatuses(prev => ({ ...prev, [card.id]: status }));

    if (user) {
      const prev = reviews[card.id] ?? null;
      const next = await recordRating(user.id, card.id, rating, prev);
      setReviews(r => ({
        ...r,
        [card.id]: {
          card_id: card.id,
          ease_factor: next.easeFactor,
          interval_days: next.intervalDays,
          repetitions: next.repetitions,
          last_quality: prev?.last_quality ?? null,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: next.nextReviewAt.toISOString(),
        },
      }));
    }

    setFlipped(false);
    setTimeout(() => {
      if (index + 1 >= effectiveDeck.length) setFinished(true);
      else setIndex(i => i + 1);
    }, 200);
  }, [card, index, effectiveDeck.length, user, reviews]);

  const resetTimers = () => {
    setTimedOut(false);
    if (timerMode === "session") setSessionTimeLeft(sessionMins * 60);
    if (timerMode === "per-card") setCardTimeLeft(perCardSecs);
  };

  const handleShuffle = () => {
    setDeck(shuffle(FLASHCARDS));
    setIndex(0);
    setFlipped(false);
    setStatuses({});
    setFinished(false);
    resetTimers();
  };

  const handleRestart = () => {
    setIndex(0);
    setFlipped(false);
    setStatuses({});
    setFinished(false);
    resetTimers();
  };

  const handleRestartPractice = () => {
    const practiceCards = effectiveDeck.filter(c => statuses[c.id] === "practice");
    if (practiceCards.length > 0) {
      setDeck(practiceCards);
      setIndex(0);
      setFlipped(false);
      setStatuses({});
      setFinished(false);
      resetTimers();
    }
  };

  const startDeck = () => {
    setIndex(0);
    setFlipped(false);
    setStatuses({});
    setFinished(false);
    setTimedOut(false);
    setStarted(true);
    if (timerMode === "session") setSessionTimeLeft(sessionMins * 60);
    if (timerMode === "per-card") setCardTimeLeft(perCardSecs);
  };

  // ── Intro ────────────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 px-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Layers className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Flashcard Mode</h1>
        <p className="text-slate-500 mb-8">
          Flip through histopathology slides, test your identification skills, and track what you know.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Total Cards", value: allCards.length },
            { label: "Built-in", value: FLASHCARDS.length },
            { label: "My Slides", value: userCards.length },
          ].map(({ label, value }) => (
            <div key={label} className="card text-center py-4">
              <p className="text-2xl font-bold text-indigo-600">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {user && (
          <div className="card flex items-center justify-center gap-2 py-3 mb-6 bg-indigo-50 border-indigo-100">
            <CalendarClock className="w-4 h-4 text-indigo-600" />
            <p className="text-sm text-slate-700">
              <span className="font-bold text-indigo-700">{dueCount}</span> card{dueCount === 1 ? "" : "s"} due for review today
            </p>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 justify-center mb-8 flex-wrap">
          {((user
            ? ["Due", "All", "My Slides", "Normal Histology", "Pathology"]
            : ["All", "Normal Histology", "Pathology"]) as FilterMode[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                filter === f
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Timer settings */}
        <div className="card mb-6 text-left">
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Timer className="w-4 h-4 text-slate-500" /> Timer
          </p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {(["none", "session", "per-card"] as TimerMode[]).map(m => (
              <button
                key={m}
                onClick={() => setTimerMode(m)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                  timerMode === m
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                )}
              >
                {m === "none" ? "No timer" : m === "session" ? "Session timer" : "Per card"}
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
                        ? "bg-indigo-100 text-indigo-700 border-indigo-300 font-semibold"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
                    )}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          )}
          {timerMode === "per-card" && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Time per card</p>
              <div className="flex gap-2 flex-wrap">
                {[30, 60, 120, 180].map(s => (
                  <button
                    key={s}
                    onClick={() => setPerCardSecs(s)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-sm border transition-all",
                      perCardSecs === s
                        ? "bg-indigo-100 text-indigo-700 border-indigo-300 font-semibold"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
                    )}
                  >
                    {s < 60 ? `${s}s` : `${s / 60} min`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={startDeck} className="btn-primary text-base px-10 py-3">
          Start Flashcards
        </button>
      </div>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────────
  if (finished) {
    const known    = effectiveDeck.filter(c => statuses[c.id] === "known").length;
    const practice = effectiveDeck.filter(c => statuses[c.id] === "practice").length;
    const pct      = Math.round((known / effectiveDeck.length) * 100);

    return (
      <div className="max-w-xl mx-auto text-center py-12 px-4">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-1">{timedOut ? "Time's Up!" : "Session Complete!"}</h2>
        <p className="text-slate-500 mb-8">{timedOut ? "Here's how far you got" : "Here's your result"}</p>

        <div className="card mb-6">
          <div className="text-5xl font-bold text-indigo-600 mb-1">{pct}%</div>
          <p className="text-slate-500 text-sm mb-4">Confidence score</p>

          <div className="w-full bg-slate-100 rounded-full h-2 mb-5">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <p className="text-2xl font-bold text-emerald-600">{known}</p>
              <p className="text-xs text-slate-500">I knew this ✓</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-2xl font-bold text-amber-600">{practice}</p>
              <p className="text-xs text-slate-500">Need more practice</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            {pct >= 80
              ? "🎉 Excellent! Strong histopathology foundations."
              : pct >= 60
              ? "👍 Good progress! Focus on the ones to practise."
              : "📚 Keep going — use the Slide Library to explore each case deeper."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={handleRestart} className="btn-secondary flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Restart All
          </button>
          {practice > 0 && (
            <button onClick={handleRestartPractice} className="btn-primary flex items-center gap-2">
              <Brain className="w-4 h-4" /> Practise {practice} cards again
            </button>
          )}
          <button onClick={handleShuffle} className="btn-ghost flex items-center gap-2">
            <Shuffle className="w-4 h-4" /> Shuffle & Restart
          </button>
        </div>
      </div>
    );
  }

  // ── Card view ─────────────────────────────────────────────────────────────
  if (!card) return (
    <div className="max-w-xl mx-auto text-center py-20 px-4">
      <p className="text-2xl mb-3">🎉</p>
      <h2 className="text-xl font-bold text-slate-800 mb-2">All caught up!</h2>
      <p className="text-slate-500 mb-6">No cards due in this filter. Try "All" to review everything.</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={() => { setFilter("All"); setIndex(0); }} className="btn-primary">View All Cards</button>
        <button onClick={() => { setStarted(false); setFilter(user ? "Due" : "All"); }} className="btn-secondary">Back to Menu</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Card <span className="font-semibold text-slate-700">{index + 1}</span> of <span className="font-semibold text-slate-700">{effectiveDeck.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {timerMode === "session" && (
            <span className={clsx(
              "text-sm font-mono font-semibold px-2.5 py-0.5 rounded-lg flex items-center gap-1",
              sessionTimeLeft <= 60 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
            )}>
              <Timer className="w-3.5 h-3.5" />
              {Math.floor(sessionTimeLeft / 60)}:{String(sessionTimeLeft % 60).padStart(2, "0")}
            </span>
          )}
          <span className="text-xs text-emerald-600 font-medium">{knownCount} known</span>
          <button onClick={handleShuffle} className="btn-ghost p-2" title="Shuffle deck">
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={handleRestart} className="btn-ghost p-2" title="Restart">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-300"
          style={{ width: `${((index) / effectiveDeck.length) * 100}%` }}
        />
      </div>

      {/* Per-card timer bar */}
      {timerMode === "per-card" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Timer className="w-3 h-3" /> Time per card</span>
            <span className={clsx("text-xs font-mono font-semibold", cardTimeLeft <= 10 ? "text-red-600" : "text-slate-500")}>
              {cardTimeLeft}s
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={clsx(
                "h-2 rounded-full transition-all duration-1000",
                cardTimeLeft / perCardSecs > 0.5 ? "bg-emerald-400"
                : cardTimeLeft / perCardSecs > 0.25 ? "bg-amber-400"
                : "bg-red-400"
              )}
              style={{ width: `${(cardTimeLeft / perCardSecs) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2">
        <span className={clsx("badge text-[10px]", typeColor[card.type])}>
          {card.type === "Normal Histology" ? "Normal" : "Pathology"}
        </span>
        <span className={clsx("badge text-[10px]", difficultyColor[card.difficulty])}>
          {card.difficulty}
        </span>
        <span className="badge bg-slate-100 text-slate-600 text-[10px]">{card.category}</span>
        <span className="badge bg-slate-100 text-slate-600 text-[10px]">{card.stain}</span>
        {statuses[card.id] && (
          <span className={clsx("badge text-[10px]",
            statuses[card.id] === "known" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          )}>
            {statuses[card.id] === "known" ? "✓ Known" : "↩ Practice"}
          </span>
        )}
      </div>

      {/* ── Flip card ── */}
      <div
        className="relative cursor-pointer"
        style={{ perspective: "1200px" }}
        onClick={() => setFlipped(f => !f)}
      >
        <div
          className="relative transition-all duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "560px",
          }}
        >
          {/* ── FRONT ── */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-lg"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Slide image */}
            <div className="relative h-72 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.imageUrl}
                alt="Flashcard slide"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/600x300/0f172a/38bdf8?text=Slide";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white font-semibold text-base leading-snug">{card.prompt}</p>
              </div>
            </div>

            {/* Study questions */}
            <div className="bg-white p-5">
              <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" /> Consider these before flipping
              </p>
              <ol className="space-y-2">
                {card.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center flex-shrink-0 text-[10px] mt-0.5">
                      {i + 1}
                    </span>
                    {q}
                  </li>
                ))}
              </ol>
              <p className="text-[11px] text-slate-300 mt-3 text-center">Tap the card to reveal the answer</p>
            </div>
          </div>

          {/* ── BACK ── */}
          <div
            className="absolute inset-0 bg-white rounded-2xl shadow-lg overflow-y-auto"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            {/* Diagnosis header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
              <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-0.5">Diagnosis</p>
              <h2 className="text-white font-bold text-lg leading-tight">{card.diagnosis}</h2>
            </div>

            <div className="p-5 space-y-4">
              {/* Key features */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Histological Features</p>
                <ul className="space-y-1.5">
                  {card.keyFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px] mt-0.5">{i + 1}</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* IHC markers */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">IHC Markers</p>
                <div className="flex flex-wrap gap-1.5">
                  {card.ihcMarkers.map((m, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono border border-slate-200">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Clinical pearl */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                  💡 Clinical Pearl
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">{card.clinicalPearl}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spaced-repetition rating buttons — only show after flipping */}
      {flipped && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => rateCard("again")}
              className="flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl border-2 border-red-300 bg-red-50 text-red-700 font-semibold text-xs hover:bg-red-100 transition-colors"
            >
              <span>Again</span>
              <span className="text-[10px] font-normal opacity-70">&lt;1 day</span>
            </button>
            <button
              onClick={() => rateCard("hard")}
              className="flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl border-2 border-amber-300 bg-amber-50 text-amber-700 font-semibold text-xs hover:bg-amber-100 transition-colors"
            >
              <span>Hard</span>
              <span className="text-[10px] font-normal opacity-70">1 day</span>
            </button>
            <button
              onClick={() => rateCard("good")}
              className="flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-xs hover:bg-emerald-100 transition-colors"
            >
              <span>Good</span>
              <span className="text-[10px] font-normal opacity-70">
                {reviews[card.id]?.repetitions ? `${Math.max(1, reviews[card.id].interval_days)}d` : "1 day"}
              </span>
            </button>
            <button
              onClick={() => rateCard("easy")}
              className="flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl border-2 border-sky-300 bg-sky-50 text-sky-700 font-semibold text-xs hover:bg-sky-100 transition-colors"
            >
              <span>Easy</span>
              <span className="text-[10px] font-normal opacity-70">6+ days</span>
            </button>
          </div>
          {!user && (
            <p className="text-[11px] text-center text-slate-400">
              Sign in to save your review schedule across sessions.
            </p>
          )}
        </div>
      )}

      {/* Navigation arrows */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => { setIndex(i => Math.max(0, i - 1)); setFlipped(false); }}
          disabled={index === 0}
          className="btn-ghost flex items-center gap-1 text-sm disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <span className="text-xs text-slate-400">Tap card to flip</span>
        <button
          onClick={() => {
            setFlipped(false);
            setTimeout(() => {
              if (index + 1 >= effectiveDeck.length) setFinished(true);
              else setIndex(i => i + 1);
            }, 150);
          }}
          className="btn-ghost flex items-center gap-1 text-sm"
        >
          Skip <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
