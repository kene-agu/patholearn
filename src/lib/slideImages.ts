/**
 * Single source of truth for all curated histopathology slide images.
 *
 * Images are self-hosted in /public/slides/ — downloaded from Wikimedia once
 * via scripts/download-slides.mjs and committed to the repo. They are served
 * from Vercel's global CDN with no external dependency.
 *
 * For user-uploaded slides, use Supabase Storage instead (see personal quiz flow).
 *
 * Adding a new slide:
 *  1. Add its key here (local path + source URL below)
 *  2. Run: node scripts/download-slides.mjs
 *  3. Commit the downloaded image in public/slides/
 */

export const SLIDES = {
  // ── Normal histology ──────────────────────────────────────────────────────
  liver:             "/slides/liver.jpg",
  lung:              "/slides/lung.jpg",
  kidney:            "/slides/kidney.jpg",
  skin:              "https://upload.wikimedia.org/wikipedia/commons/b/b4/Normal_Epidermis_and_Dermis_with_Intradermal_Nevus_10x.JPG",
  colon:             "/slides/colon.jpg",
  thyroid:           "/slides/thyroid.jpg",
  lymphNode:         "/slides/lymph-node.jpg",
  cardiac:           "/slides/cardiac.jpg",
  spleen:            "/slides/spleen.jpg",
  boneMarrow:        "/slides/bone-marrow.jpg",
  // ── Oncology ──────────────────────────────────────────────────────────────
  scc:               "/slides/scc.jpg",
  idc:               "/slides/idc.jpg",
  dcis:              "/slides/dcis.jpg",
  fibroadenoma:      "https://upload.wikimedia.org/wikipedia/commons/6/62/Fibroadenoma_20X.jpg",
  // ── Gastroenterology ──────────────────────────────────────────────────────
  gastritis:         "/slides/gastritis.jpg",
  crc:               "/slides/crc.jpg",
  crohn:             "/slides/crohn.jpg",
  oesophageal:       "/slides/oesophageal.jpg",
  // ── Nephrology ────────────────────────────────────────────────────────────
  rpgn:              "/slides/rpgn.jpg",
  ccrcc:             "/slides/ccrcc.jpg",
  wilms:             "https://upload.wikimedia.org/wikipedia/commons/2/2b/Wilms_Tumor_%28Nephroblastoma%29_%284882456062%29.jpg",
  kwNodules:         "/slides/kw-nodules.jpg",
  // ── Pulmonology ───────────────────────────────────────────────────────────
  uip:               "/slides/uip.jpg",
  // ── Infectious disease ────────────────────────────────────────────────────
  tb:                "/slides/tb.jpg",
  tbZN:              "/slides/tb-zn.jpg",
  // ── Haematology ───────────────────────────────────────────────────────────
  hodgkin:           "/slides/hodgkin.jpg",
  dlbcl:             "/slides/dlbcl.jpg",
  myeloma:           "/slides/myeloma.jpg",
  aml:               "/slides/aml.jpg",
  all:               "/slides/all.jpg",
  cml:               "/slides/cml.jpg",
  cll:               "/slides/cll.jpg",
  // ── Hepatology ────────────────────────────────────────────────────────────
  hepB:              "/slides/hep-b.jpg",
  hcc:               "/slides/hcc.jpg",
  // ── Cardiology ────────────────────────────────────────────────────────────
  ami:               "/slides/ami.jpg",
  atherosclerosis:   "/slides/atherosclerosis.jpg",
  rheumatic:         "/slides/rheumatic.jpg",
  // ── Neuropathology ────────────────────────────────────────────────────────
  gbm:               "/slides/gbm.jpg",
  meningioma:        "/slides/meningioma.jpg",
  // ── Endocrinology ─────────────────────────────────────────────────────────
  ptc:               "/slides/ptc.jpg",
  phaeochromocytoma: "/slides/phaeochromocytoma.jpg",
  // ── Dermatology ───────────────────────────────────────────────────────────
  melanoma:          "/slides/melanoma.jpg",
  bcc:               "/slides/bcc.jpg",
  // ── Gynaecology ───────────────────────────────────────────────────────────
  cin3:              "/slides/cin3.jpg",
  endometrial:       "/slides/endometrial.jpg",
  // ── Urology ───────────────────────────────────────────────────────────────
  prostate:          "/slides/prostate.jpg",
  // ── Musculoskeletal ───────────────────────────────────────────────────────
  osteosarcoma:      "/slides/osteosarcoma.jpg",
  gctBone:           "https://upload.wikimedia.org/wikipedia/commons/b/bd/Giant_cell_tumour_of_bone_-_high_mag.jpg",
} as const;

export type SlideKey = keyof typeof SLIDES;

/** Wikimedia source URLs — consumed only by scripts/download-slides.mjs */
const W = "https://upload.wikimedia.org/wikipedia/commons";
export const SLIDE_SOURCES: Record<SlideKey, string> = {
  liver:             `${W}/8/82/Histopathology_of_liver_zones.jpg`,
  lung:              `${W}/a/ac/Normal_lung_%283660695207%29.jpg`,
  kidney:            `${W}/6/63/Histology-kidney.jpg`,
  skin:              `${W}/c/c7/Skinlayerses.PNG`,
  colon:             `${W}/d/de/Large_intestine_histology.jpg`,
  thyroid:           `${W}/6/6a/Thyroid_gland_microscope.jpg`,
  lymphNode:         `${W}/d/da/Lymph_node_histology.jpg`,
  cardiac:           `${W}/3/3d/Cardiac_muscle_histology_400x.jpg`,
  spleen:            `${W}/6/60/Histology_of_Spleen.jpg`,
  boneMarrow:        `${W}/b/be/Bone_marrow_core_biopsy_microscopy_%28trephine%29_H%26E_panorama_by_gabriel_caponetti.jpg`,
  scc:               `${W}/f/f8/Micrograph_of_invasive_squamous_cell_carcinoma_-_150x.jpg`,
  idc:               `${W}/f/f8/Micrograph_of_ductal_carcinoma_with_marked_nuclear_pleomorphism_and_increased_mitotic_rate.jpg`,
  dcis:              `${W}/6/69/DCIS_-_Intraductal_carcinoma_of_the_breast.jpg`,
  fibroadenoma:      `${W}/e/e2/Breast_fibroadenoma_%282%29.jpg`,
  gastritis:         `${W}/f/fc/Carcinoma_Stomach_10x.jpg`,
  crc:               `${W}/1/18/Adenocarcinoma_of_the_colon-histology.JPG`,
  crohn:             `${W}/5/57/Granulomas_in_an_intestinal_lymph_node_in_Crohn%27s_disease%2C_HE_1.JPG`,
  oesophageal:       `${W}/3/3e/Esophageal_adenocarcinoma_-_low_mag.jpg`,
  rpgn:              `${W}/6/6a/Crescentic_glomerulonephritis_HE_stain.JPEG`,
  ccrcc:             `${W}/a/a1/Histopathology_of_clear_cell_renal_cell_carcinoma%2C_grade_1%2C_high_magnification.jpg`,
  wilms:             `${W}/7/77/Wilms_tumor_-_very_high_mag.jpg`,
  kwNodules:         `${W}/b/b9/Nodular_glomerulosclerosis.jpeg`,
  uip:               `${W}/5/55/Srifhistology3.jpg`,
  tb:                `${W}/3/37/Pulmonary_tuberculosis_-_Necrotizing_granuloma_%286545185917%29.jpg`,
  tbZN:              `${W}/9/98/Mycobacterium_tuberculosis_Ziehl-Neelsen_stain.jpg`,
  hodgkin:           `${W}/3/33/Hodgkin_Disease%2C_Reed-Sternberg_Cell.jpg`,
  dlbcl:             `${W}/d/de/Diffuse_large_B-cell_lymphoma_%28DLBCL%29%2C_high_mag.jpg`,
  myeloma:           `${W}/2/21/Multiple_myeloma_%282%29_HE_stain.jpg`,
  aml:               `${W}/5/53/Myeloblast_with_Auer_Rod_smear_2009-11-23.JPG`,
  all:               `${W}/0/0e/Acute_leukemia-ALL.jpg`,
  cml:               `${W}/f/fc/Chronic_Myeloid_Leukemia_smear_2009-04-09.JPG`,
  cll:               `${W}/f/f9/Chronic_lymphocytic_leukemia.jpg`,
  hepB:              `${W}/2/22/Ground_glass_hepatocytes_high_mag_2.jpg`,
  hcc:               `${W}/8/80/Hepatocellular_carcinoma_low_mag.jpg`,
  ami:               `${W}/0/08/HE_myocardial_infarct_with_neutrophils_infiltration.jpg`,
  atherosclerosis:   `${W}/a/a3/Atherosclerosis%2C_HE_1.JPG`,
  rheumatic:         `${W}/e/e4/Rheumatic_heart_disease_-_high_mag.jpg`,
  gbm:               `${W}/5/54/Glioblastoma_micro1.jpg`,
  meningioma:        `${W}/2/2b/Meningioma_high_mag.jpg`,
  ptc:               `${W}/7/71/Papillary_thyroid_carcinoma_--_high_mag.jpg`,
  phaeochromocytoma: `${W}/7/7f/Histopathology_of_pheochromocytoma_%28original%29.jpg`,
  melanoma:          `${W}/1/10/Malignant_melanoma_in_situ_--_high_mag.jpg`,
  bcc:               `${W}/e/e5/Basal_cell_carcinoma_histology.jpg`,
  cin3:              `${W}/c/cb/Cervical_Intraepithelial_Neoplasia_HSIL_40X.jpg`,
  endometrial:       `${W}/e/e1/Endometrioid_endometrial_adenocarcinoma_high_mag.jpg`,
  prostate:          `${W}/f/f8/Micrograph_of_prostate_cancer_with_Gleason_pattern_7_%283%2B4%29.jpg`,
  osteosarcoma:      `${W}/a/ab/Osteosarcoma_-_very_high_mag.jpg`,
  gctBone:           `${W}/d/d4/Giant_cell_tumor_of_bone_-_intermed_mag.jpg`,
};
