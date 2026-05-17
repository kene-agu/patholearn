// Word and PowerPoint document processing
// Extracts text and converts to canvas images for uniform pipeline

import type { ExtractionProgress } from "@/types/smartLearn";
import { canvasToOptimizedBlobs } from "./imageOptimization";
import {
  fetchSignedUploadUrls,
  uploadSlideBlob,
  type SignedUploadMap,
} from "./slideStorage";

export interface ExtractedPage {
  pageNumber: number;
  fullBlob: Blob;
  thumbBlob: Blob;
  text: string;
  fullPath: string;
  thumbPath: string;
}

// ── Slide-style rendering ─────────────────────────────────────────────────────
// We can't render the real PowerPoint visuals (that would need a server-side
// LibreOffice or a cloud conversion API), but we can at least lay out the text
// like a slide: cream background, prominent title, slide-number badge, arrow
// bullets. This is dramatically better than the previous "paragraph dump".

const SLIDE_W = 1280;
const SLIDE_H = 720;

interface SlideRenderInput {
  title: string;
  bullets: string[];   // each entry is one paragraph (= one bullet)
  pageNumber: number;
}

function renderSlideToCanvas({ title, bullets, pageNumber }: SlideRenderInput): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  // Cream background — closer to a typical lecture deck theme than blank white
  ctx.fillStyle = "#f5efe0";
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);

  // Subtle side accent so the slide doesn't look like a Word page
  ctx.fillStyle = "#e9e0c8";
  ctx.fillRect(0, 0, 8, SLIDE_H);

  // Slide-number banner (red chevron, like the deck shown)
  const badgeW = 96;
  const badgeH = 76;
  const badgeX = 80;
  const badgeY = 60;
  ctx.fillStyle = "#a63131";
  ctx.beginPath();
  ctx.moveTo(badgeX, badgeY);
  ctx.lineTo(badgeX + badgeW, badgeY);
  ctx.lineTo(badgeX + badgeW + 18, badgeY + badgeH / 2);
  ctx.lineTo(badgeX + badgeW, badgeY + badgeH);
  ctx.lineTo(badgeX, badgeY + badgeH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(String(pageNumber), badgeX + badgeW / 2, badgeY + badgeH / 2);
  ctx.textAlign = "left";

  // Title
  const titleX = badgeX + badgeW + 60;
  if (title) {
    ctx.fillStyle = "#3a3a3a";
    ctx.font = "bold 48px Georgia, serif";
    ctx.textBaseline = "middle";
    ctx.fillText(truncateForWidth(ctx, title, SLIDE_W - titleX - 60), titleX, badgeY + badgeH / 2);
  }

  // Bullets — red arrow markers, comfortable line height
  if (bullets.length > 0) {
    const bulletStartY = 200;
    const bulletX = 130;
    const textX = bulletX + 36;
    const maxWidth = SLIDE_W - textX - 60;

    ctx.fillStyle = "#2d2d2d";
    ctx.font = "26px Georgia, serif";
    ctx.textBaseline = "top";

    let y = bulletStartY;
    const lineHeight = 38;
    const paragraphGap = 18;

    for (const bullet of bullets) {
      if (y > SLIDE_H - 80) break;
      const wrapped = wrapText(ctx, bullet, maxWidth);
      if (wrapped.length === 0) continue;

      // Red arrow marker for the first line of each bullet
      ctx.fillStyle = "#a63131";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("▶", bulletX, y + 4);

      ctx.fillStyle = "#2d2d2d";
      ctx.font = "26px Georgia, serif";
      for (let i = 0; i < wrapped.length; i++) {
        if (y > SLIDE_H - 80) break;
        ctx.fillText(wrapped[i], textX, y);
        y += lineHeight;
      }
      y += paragraphGap;
    }
  }

  return canvas;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (!rawLine.trim()) { out.push(""); continue; }
    const words = rawLine.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function truncateForWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + "…").width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + "…";
}

function pagePaths(userId: string, docId: string, pageNumber: number) {
  const base = `${userId}/${docId}/page-${String(pageNumber).padStart(3, "0")}`;
  return { fullPath: `${base}.webp`, thumbPath: `${base}-thumb.webp` };
}

async function uploadPage(
  canvas: HTMLCanvasElement,
  text: string,
  pageNumber: number,
  userId: string,
  docId: string,
  signedMap: SignedUploadMap
): Promise<ExtractedPage> {
  const { fullBlob, thumbBlob } = await canvasToOptimizedBlobs(canvas, 1280, 0.82, 200);

  const { fullPath, thumbPath } = pagePaths(userId, docId, pageNumber);
  const fullSigned  = signedMap.get(fullPath);
  const thumbSigned = signedMap.get(thumbPath);
  if (!fullSigned || !thumbSigned) {
    throw new Error(`Missing signed upload URL for page ${pageNumber}`);
  }

  await Promise.all([
    uploadSlideBlob(fullSigned, fullBlob),
    uploadSlideBlob(thumbSigned, thumbBlob),
  ]);

  return { pageNumber, fullBlob, thumbBlob, text: text.substring(0, 5000), fullPath, thumbPath };
}

// ── Word ───────────────────────────────────────────────────────────────────────
export async function extractWordDocument(
  file: File,
  userId: string,
  docId: string,
  authToken: string,
  onProgress: (p: ExtractionProgress) => void
): Promise<ExtractedPage[]> {
  const mammoth = await import("mammoth");

  onProgress({ stage: "reading", current: 0, total: 0, message: "Reading Word document…" });

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;

  // Split the document into ~ one-screen chunks so each becomes its own slide
  const chunks = chunkText(text, 1400);
  const total = Math.max(1, chunks.length);

  onProgress({ stage: "uploading", current: 0, total, message: "Preparing upload…" });
  const allPaths: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const { fullPath, thumbPath } = pagePaths(userId, docId, i + 1);
    allPaths.push(fullPath, thumbPath);
  }
  const signedMap = await fetchSignedUploadUrls(allPaths, authToken);

  const pages: ExtractedPage[] = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress({ stage: "rendering", current: i, total, message: `Rendering page ${i + 1}/${total}…` });
    // Split each chunk on paragraph breaks so the rendered "slide" shows
    // separate bullets instead of one wall of text.
    const paragraphs = chunks[i].split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
    const canvas = renderSlideToCanvas({
      title: i === 0 ? file.name.replace(/\.[^.]+$/, "") : "",
      bullets: paragraphs,
      pageNumber: i + 1,
    });
    onProgress({ stage: "uploading", current: i, total, message: `Uploading page ${i + 1}/${total}…` });
    const page = await uploadPage(canvas, chunks[i], i + 1, userId, docId, signedMap);
    pages.push(page);
  }

  onProgress({ stage: "done", current: total, total, message: "Document extracted!" });
  return pages;
}

// ── PowerPoint ─────────────────────────────────────────────────────────────────
export async function extractPowerPoint(
  file: File,
  userId: string,
  docId: string,
  authToken: string,
  onProgress: (p: ExtractionProgress) => void
): Promise<ExtractedPage[]> {
  const JSZip = (await import("jszip")).default;

  onProgress({ stage: "reading", current: 0, total: 0, message: "Reading PowerPoint…" });

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // PPTX slides live at ppt/slides/slide{N}.xml
  const slideEntries = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] ?? "0", 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] ?? "0", 10);
      return na - nb;
    });

  if (slideEntries.length === 0) {
    throw new Error("No slides found in PowerPoint file");
  }

  const total = slideEntries.length;
  const pages: ExtractedPage[] = [];

  onProgress({ stage: "uploading", current: 0, total, message: "Preparing upload…" });
  const allPaths: string[] = [];
  for (let i = 0; i < total; i++) {
    const { fullPath, thumbPath } = pagePaths(userId, docId, i + 1);
    allPaths.push(fullPath, thumbPath);
  }
  const signedMap = await fetchSignedUploadUrls(allPaths, authToken);

  for (let i = 0; i < slideEntries.length; i++) {
    onProgress({ stage: "rendering", current: i, total, message: `Rendering slide ${i + 1}/${total}…` });

    const xml = await zip.files[slideEntries[i]].async("string");
    const { title, bullets } = extractTextFromSlideXml(xml);

    const canvas = renderSlideToCanvas({ title, bullets, pageNumber: i + 1 });

    onProgress({ stage: "uploading", current: i, total, message: `Uploading slide ${i + 1}/${total}…` });
    // Plain-text version for the AI pipeline — preserves bullet separation
    // so the LLM sees structured content, not a single run-on paragraph.
    const text = [title, ...bullets.map((b) => `• ${b}`)].filter(Boolean).join("\n");
    const page = await uploadPage(canvas, text, i + 1, userId, docId, signedMap);
    pages.push(page);
  }

  onProgress({ stage: "done", current: total, total, message: "Presentation extracted!" });
  return pages;
}

// Extract title + bullets from a single slide's XML.
// We walk shapes → paragraphs (<a:p>) → runs (<a:t>) so that each PowerPoint
// paragraph becomes a separate bullet, instead of every run in a shape getting
// mashed into one string.
function extractTextFromSlideXml(xml: string): { title: string; bullets: string[] } {
  const shapes = xml.match(/<p:sp[\s\S]*?<\/p:sp>/g) ?? [];

  // Each "block" is one shape's content as an array of paragraphs.
  const blocks: string[][] = [];

  for (const shape of shapes) {
    const paragraphs = shape.match(/<a:p\b[\s\S]*?<\/a:p>/g) ?? [];
    const paraTexts: string[] = [];
    for (const para of paragraphs) {
      const runs = Array.from(para.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g))
        .map((m) => decodeXmlEntities(m[1]));
      const text = runs.join("").replace(/\s+/g, " ").trim();
      if (text) paraTexts.push(text);
    }
    if (paraTexts.length > 0) blocks.push(paraTexts);
  }

  if (blocks.length === 0) return { title: "", bullets: [] };

  // Heuristic: the first single-paragraph short block is the title; everything
  // else is body bullets. Falls back to "no title" for slides that lead with
  // a long body.
  let title = "";
  let bodyBlocks = blocks;
  const first = blocks[0];
  if (first.length === 1 && first[0].length <= 120) {
    title = first[0];
    bodyBlocks = blocks.slice(1);
  }

  const bullets = bodyBlocks.flat();
  return { title, bullets };
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// Split long text into ~1400-char chunks at paragraph boundaries
function chunkText(text: string, target: number): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paragraphs) {
    if (!p.trim()) continue;
    if (cur.length + p.length + 2 > target && cur) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur}\n\n${p}` : p;
    }
  }
  if (cur) chunks.push(cur);
  return chunks.length > 0 ? chunks : [text];
}
