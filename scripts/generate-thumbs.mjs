/**
 * Generate small WebP thumbnails for the curated slide images.
 *
 * The card grids (Slide Library, Pathology Atlas) display images in boxes only
 * a few hundred pixels wide, but the originals in /public/slides are full-res
 * (up to ~13 MB each). On mobile, pulling ~110 MB of originals at once leaves
 * the thumbnails blank. These WebP thumbnails are a few tens of KB each, so the
 * grid loads instantly. The full-res originals are kept for the analyzer/viewer
 * where zoom detail matters — so there is no loss of diagnostic quality.
 *
 * Run: node scripts/generate-thumbs.mjs
 * Commit the generated files in public/slides/thumbs/.
 */
import { readdir, mkdir, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import sharp from "sharp";

const SRC_DIR = "public/slides";
const OUT_DIR = "public/slides/thumbs";
const WIDTH = 640; // retina-sharp for cards up to ~320px wide
const QUALITY = 80;

const fmt = (n) => `${(n / 1024).toFixed(0)} KB`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const entries = await readdir(SRC_DIR);
  const images = entries.filter((f) => /\.(jpe?g|png)$/i.test(f));

  let before = 0;
  let after = 0;
  for (const file of images) {
    const inPath = join(SRC_DIR, file);
    const outPath = join(OUT_DIR, `${basename(file, extname(file))}.webp`);
    const srcSize = (await stat(inPath)).size;
    await sharp(inPath)
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outPath);
    const outSize = (await stat(outPath)).size;
    before += srcSize;
    after += outSize;
    console.log(`${file.padEnd(28)} ${fmt(srcSize).padStart(9)} → ${fmt(outSize).padStart(8)}`);
  }
  console.log("─".repeat(52));
  console.log(`${String(images.length).padStart(3)} thumbs   ${fmt(before)} → ${fmt(after)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
