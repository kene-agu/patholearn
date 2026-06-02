/**
 * Guard: every self-hosted slide must have a matching card thumbnail.
 *
 * The card grids (Slide Library, Pathology Atlas) render thumbnails from
 * /public/slides/thumbs/<name>.webp (see scripts/generate-thumbs.mjs). If a new
 * full-res slide is added without regenerating thumbnails, its card silently
 * falls back to the multi-MB original — which is exactly what made thumbnails go
 * blank on mobile. This check fails CI so that regression can't ship.
 *
 * Run: node scripts/check-slides.mjs
 */
import { readdir, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";

const SRC_DIR = "public/slides";
const THUMB_DIR = "public/slides/thumbs";
const WARN_THUMB_KB = 200; // thumbnails should stay small; flag if not

async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

async function main() {
  const entries = await readdir(SRC_DIR);
  const slides = entries.filter((f) => /\.(jpe?g|png)$/i.test(f));

  const missing = [];
  const oversizedThumbs = [];

  for (const file of slides) {
    const thumb = join(THUMB_DIR, `${basename(file, extname(file))}.webp`);
    if (!(await exists(thumb))) {
      missing.push(file);
      continue;
    }
    const kb = (await stat(thumb)).size / 1024;
    if (kb > WARN_THUMB_KB) oversizedThumbs.push(`${basename(thumb)} (${kb.toFixed(0)} KB)`);
  }

  console.log(`Checked ${slides.length} slides in ${SRC_DIR}/`);

  if (oversizedThumbs.length) {
    console.warn(`\n⚠️  Thumbnails larger than ${WARN_THUMB_KB} KB (consider re-running generate-thumbs):`);
    for (const t of oversizedThumbs) console.warn(`   - ${t}`);
  }

  if (missing.length) {
    console.error(`\n❌ ${missing.length} slide(s) have no thumbnail in ${THUMB_DIR}/:`);
    for (const f of missing) console.error(`   - ${f}`);
    console.error(`\nFix: run  node scripts/generate-thumbs.mjs  and commit public/slides/thumbs/`);
    process.exit(1);
  }

  console.log("✅ Every slide has a thumbnail.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
