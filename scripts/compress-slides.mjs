/**
 * Compress the curated full-res slide originals in /public/slides so each one
 * is at most ~400 KB, while keeping histology detail crisp.
 *
 * Why: the images downloaded by scripts/download-slides.mjs are full Wikimedia
 * originals — up to ~13 MB each. On slow/mobile connections a single multi-MB
 * fetch blows past the analyzer's fetch timeout (SLIDE_FETCH_TIMEOUT_MS) and the
 * <img> load timeout (SlideImage.LOAD_TIMEOUT_MS), so slides fail to open. The
 * viewer/analyzer never need more than ~1600px anyway (the analyzer downsamples
 * to 768px before inference), so full-res is pure weight. This bakes the fetched
 * originals down to a web-appropriate size in place.
 *
 * Strategy: cap the longest edge (1600px), then step JPEG quality down until the
 * file is under the target. If the quality floor is reached and it's still too
 * big, shrink the max edge and retry. Lanczos resampling + mozjpeg/progressive
 * encoding preserves diagnostic detail.
 *
 * Run (after download-slides.mjs, before committing):
 *   node scripts/compress-slides.mjs
 * Then regenerate thumbnails and commit:
 *   node scripts/generate-thumbs.mjs && git add public/slides
 */
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC_DIR = "public/slides";
const TARGET = 400 * 1024; // ~400 KB hard cap
const MAX_EDGE_START = 1600;
const MAX_EDGE_FLOOR = 1100;
const MAX_EDGE_STEP = 150;
const Q_START = 85;
const Q_FLOOR = 60;
const Q_STEP = 5;

const fmt = (n) => `${(n / 1024).toFixed(0)} KB`;

// Encode at a given max edge, stepping quality down until under TARGET.
async function encode(inPath, maxEdge) {
  const base = sharp(inPath).rotate().resize({
    width: maxEdge,
    height: maxEdge,
    fit: "inside",
    withoutEnlargement: true,
  });
  let buf;
  for (let q = Q_START; q >= Q_FLOOR; q -= Q_STEP) {
    buf = await base
      .clone()
      .jpeg({ quality: q, progressive: true, mozjpeg: true })
      .toBuffer();
    if (buf.length <= TARGET) return { buf, q };
  }
  return { buf, q: Q_FLOOR }; // best effort at the floor
}

async function compress(inPath) {
  let maxEdge = MAX_EDGE_START;
  let result;
  for (;;) {
    result = await encode(inPath, maxEdge);
    if (result.buf.length <= TARGET || maxEdge <= MAX_EDGE_FLOOR) break;
    maxEdge -= MAX_EDGE_STEP;
  }
  await sharp(result.buf).toFile(inPath); // overwrite original in place
  return { size: result.buf.length, q: result.q };
}

async function main() {
  const entries = await readdir(SRC_DIR);
  const images = entries.filter((f) => /\.(jpe?g|png)$/i.test(f));

  let changed = 0;
  let before = 0;
  let after = 0;
  for (const file of images) {
    const inPath = join(SRC_DIR, file);
    const srcSize = (await stat(inPath)).size;
    if (srcSize <= TARGET) continue; // already small enough — leave untouched
    const { size, q } = await compress(inPath);
    before += srcSize;
    after += size;
    changed++;
    const flag = size <= TARGET ? "" : "  !! still over";
    console.log(`${file.padEnd(28)} ${fmt(srcSize).padStart(9)} → ${fmt(size).padStart(8)}  q${q}${flag}`);
  }
  console.log("─".repeat(56));
  console.log(`${changed} compressed   ${fmt(before)} → ${fmt(after)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
