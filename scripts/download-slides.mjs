#!/usr/bin/env node
/**
 * One-time script to download all curated slide images from Wikimedia
 * and save them to public/slides/ for self-hosted serving.
 *
 * Usage:  node scripts/download-slides.mjs
 *
 * After running, commit the images:
 *   git add public/slides && git commit -m "Add self-hosted slide images"
 *
 * To add a new slide later:
 *  1. Add an entry to src/lib/slideImages.ts (SLIDES + SLIDE_SOURCES)
 *  2. Re-run this script — it skips already-downloaded files
 *  3. Commit the new image
 */

import https from "https";
import http from "http";
import { createWriteStream, mkdirSync, existsSync, unlinkSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "../public/slides");

mkdirSync(OUTPUT_DIR, { recursive: true });

const W = "https://upload.wikimedia.org/wikipedia/commons";

const IMAGES = {
  // Normal histology
  "liver.jpg":             `${W}/8/82/Histopathology_of_liver_zones.jpg`,
  "lung.jpg":              `${W}/a/ac/Normal_lung_%283660695207%29.jpg`,
  "kidney.jpg":            `${W}/6/63/Histology-kidney.jpg`,
  "skin.jpg":              `${W}/b/b4/Normal_Epidermis_and_Dermis_with_Intradermal_Nevus_10x.JPG`,
  "colon.jpg":             `${W}/d/de/Large_intestine_histology.jpg`,
  "thyroid.jpg":           `${W}/6/6a/Thyroid_gland_microscope.jpg`,
  "lymph-node.jpg":        `${W}/d/da/Lymph_node_histology.jpg`,
  "cardiac.jpg":           `${W}/3/3d/Cardiac_muscle_histology_400x.jpg`,
  "spleen.jpg":            `${W}/6/60/Histology_of_Spleen.jpg`,
  "bone-marrow.jpg":       `${W}/b/be/Bone_marrow_core_biopsy_microscopy_%28trephine%29_H%26E_panorama_by_gabriel_caponetti.jpg`,
  // Oncology
  "scc.jpg":               `${W}/f/f8/Micrograph_of_invasive_squamous_cell_carcinoma_-_150x.jpg`,
  "idc.jpg":               `${W}/f/f8/Micrograph_of_ductal_carcinoma_with_marked_nuclear_pleomorphism_and_increased_mitotic_rate.jpg`,
  "dcis.jpg":              `${W}/6/69/DCIS_-_Intraductal_carcinoma_of_the_breast.jpg`,
  "fibroadenoma.jpg":      `${W}/6/62/Fibroadenoma_20X.jpg`,
  // Gastroenterology
  "gastritis.jpg":         `${W}/f/fc/Carcinoma_Stomach_10x.jpg`,
  "crc.jpg":               `${W}/1/18/Adenocarcinoma_of_the_colon-histology.JPG`,
  "crohn.jpg":             `${W}/5/57/Granulomas_in_an_intestinal_lymph_node_in_Crohn%27s_disease%2C_HE_1.JPG`,
  "oesophageal.jpg":       `${W}/3/3e/Esophageal_adenocarcinoma_-_low_mag.jpg`,
  // Nephrology
  "rpgn.jpg":              `${W}/6/6a/Crescentic_glomerulonephritis_HE_stain.JPEG`,
  "ccrcc.jpg":             `${W}/a/a1/Histopathology_of_clear_cell_renal_cell_carcinoma%2C_grade_1%2C_high_magnification.jpg`,
  "wilms.jpg":             `${W}/2/2b/Wilms_Tumor_%28Nephroblastoma%29_%284882456062%29.jpg`,
  "kw-nodules.jpg":        `${W}/b/b9/Nodular_glomerulosclerosis.jpeg`,
  // Pulmonology
  "uip.jpg":               `${W}/5/55/Srifhistology3.jpg`,
  // Infectious disease
  "tb.jpg":                `${W}/3/37/Pulmonary_tuberculosis_-_Necrotizing_granuloma_%286545185917%29.jpg`,
  "tb-zn.jpg":             `${W}/9/98/Mycobacterium_tuberculosis_Ziehl-Neelsen_stain.jpg`,
  // Haematology
  "hodgkin.jpg":           `${W}/3/33/Hodgkin_Disease%2C_Reed-Sternberg_Cell.jpg`,
  "dlbcl.jpg":             `${W}/d/de/Diffuse_large_B-cell_lymphoma_%28DLBCL%29%2C_high_mag.jpg`,
  "myeloma.jpg":           `${W}/2/21/Multiple_myeloma_%282%29_HE_stain.jpg`,
  "aml.jpg":               `${W}/c/c0/Myeloblast_with_Auer_Rod_smear_2009-11-23.JPG`,
  "all.jpg":               `${W}/0/0e/Acute_leukemia-ALL.jpg`,
  "cml.jpg":               `${W}/f/fc/Chronic_Myeloid_Leukemia_smear_2009-04-09.JPG`,
  "cll.jpg":               `${W}/0/0d/Chronic_lymphocytic_leukemia.jpg`,
  // Hepatology
  "hep-b.jpg":             `${W}/2/22/Ground_glass_hepatocytes_high_mag_2.jpg`,
  "hcc.jpg":               `${W}/8/80/Hepatocellular_carcinoma_low_mag.jpg`,
  // Cardiology
  "ami.jpg":               `${W}/0/08/HE_myocardial_infarct_with_neutrophils_infiltration.jpg`,
  "atherosclerosis.jpg":   `${W}/a/a3/Atherosclerosis%2C_HE_1.JPG`,
  "rheumatic.jpg":         `${W}/e/e4/Rheumatic_heart_disease_-_high_mag.jpg`,
  // Neuropathology
  "gbm.jpg":               `${W}/5/54/Glioblastoma_micro1.jpg`,
  "meningioma.jpg":        `${W}/2/2b/Meningioma_high_mag.jpg`,
  // Endocrinology
  "ptc.jpg":               `${W}/7/71/Papillary_thyroid_carcinoma_--_high_mag.jpg`,
  "phaeochromocytoma.jpg": `${W}/7/7f/Histopathology_of_pheochromocytoma_%28original%29.jpg`,
  // Dermatology
  "melanoma.jpg":          `${W}/1/10/Malignant_melanoma_in_situ_--_high_mag.jpg`,
  "bcc.jpg":               `${W}/e/e5/Basal_cell_carcinoma_histology.jpg`,
  // Gynaecology
  "cin3.jpg":              `${W}/c/cb/Cervical_Intraepithelial_Neoplasia_HSIL_40X.jpg`,
  "endometrial.jpg":       `${W}/e/e1/Endometrioid_endometrial_adenocarcinoma_high_mag.jpg`,
  // Urology
  "prostate.jpg":          `${W}/f/f8/Micrograph_of_prostate_cancer_with_Gleason_pattern_7_%283%2B4%29.jpg`,
  // Musculoskeletal
  "osteosarcoma.jpg":      `${W}/a/ab/Osteosarcoma_-_very_high_mag.jpg`,
  "gct-bone.jpg":          `${W}/b/bd/Giant_cell_tumour_of_bone_-_high_mag.jpg`,
  // Reproductive
  "ovary.jpg":             `${W}/2/20/Human_Ovary_with_Fully_Developed_Corpus_Luteum.jpg`,
  // Paediatric
  "neuroblastoma.jpg":     `${W}/9/96/HE_Neuroblastoma_Homer-Wright_rosettes.jpg`,
  "medulloblastoma.jpg":   `${W}/b/bc/Medulloblastoma_with_rosettes.jpg`,
  "adrenal.jpg":           `${W}/c/cd/Adrenal_gland_%28zona_reticularis%29.JPG`,
  "wilms-intermed.jpg":    `${W}/f/fa/Wilms_tumour_-_intermed_mag.jpg`,
};

const HEADERS = {
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept":          "image/webp,image/apng,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer":         "https://en.wikipedia.org/",
};

function download(url, destPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) { reject(new Error("Too many redirects")); return; }

    const dest = createWriteStream(destPath);
    const client = url.startsWith("https") ? https : http;

    const req = client.get(url, { headers: HEADERS }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        dest.close();
        try { unlinkSync(destPath); } catch {}
        download(res.headers.location, destPath, redirectCount + 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        dest.close();
        try { unlinkSync(destPath); } catch {}
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(dest);
      dest.on("finish", () => { dest.close(); resolve(); });
      dest.on("error", (e) => { try { unlinkSync(destPath); } catch {} reject(e); });
    });
    req.on("error", (e) => { dest.close(); try { unlinkSync(destPath); } catch {} reject(e); });
  });
}

// Retry transient failures (HTTP 429 rate-limits, 5xx, dropped sockets) with
// exponential backoff so one throttled file doesn't sink the whole run.
async function downloadWithRetry(url, destPath, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try {
      await download(url, destPath);
      return;
    } catch (e) {
      const transient = /HTTP (429|5\d\d)/.test(e.message) || /ECONNRESET|ETIMEDOUT|socket|timeout/i.test(e.message);
      if (i === attempts - 1 || !transient) throw e;
      const backoff = 5000 * 2 ** i; // 5s, 10s, 20s, 40s
      process.stdout.write(`(${e.message} — retry in ${backoff / 1000}s) `);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

const entries = Object.entries(IMAGES);
let ok = 0, skipped = 0, failed = 0;

console.log(`\nDownloading ${entries.length} slide images to public/slides/\n`);

for (const [filename, url] of entries) {
  const dest = join(OUTPUT_DIR, filename);

  if (existsSync(dest) && statSync(dest).size > 1000) {
    console.log(`  ✓ skip   ${filename}`);
    skipped++;
    continue;
  }

  process.stdout.write(`  ↓ fetch  ${filename} ... `);
  try {
    await downloadWithRetry(url, dest);
    const kb = Math.round(statSync(dest).size / 1024);
    console.log(`done (${kb} KB)`);
    ok++;
  } catch (e) {
    console.log(`FAILED — ${e.message}`);
    failed++;
  }

  // Delay to avoid rate-limiting by Wikimedia (429)
  await new Promise(r => setTimeout(r, 4000));
}

console.log(`\nDone: ${ok} downloaded, ${skipped} skipped, ${failed} failed\n`);
if (failed > 0) process.exit(1);
