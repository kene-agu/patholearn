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

// ── Render a chunk of text to a 1280x720 canvas ───────────────────────────────
function renderTextToCanvas(title: string, body: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  if (title) {
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 28px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(title.substring(0, 80), 40, 30);
  }

  // Body
  ctx.fillStyle = "#1e293b";
  ctx.font = "16px sans-serif";
  ctx.textBaseline = "top";

  const startY = title ? 90 : 30;
  const lineHeight = 22;
  const maxWidth = canvas.width - 80;
  const lines = wrapText(ctx, body, maxWidth);

  let y = startY;
  for (const line of lines) {
    if (y > canvas.height - 30) break;
    ctx.fillText(line, 40, y);
    y += lineHeight;
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
    const canvas = renderTextToCanvas(i === 0 ? file.name.replace(/\.[^.]+$/, "") : "", chunks[i]);
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
    const { title, body } = extractTextFromSlideXml(xml);

    const canvas = renderTextToCanvas(title, body);

    onProgress({ stage: "uploading", current: i, total, message: `Uploading slide ${i + 1}/${total}…` });
    const text = title ? `${title}\n\n${body}` : body;
    const page = await uploadPage(canvas, text, i + 1, userId, docId, signedMap);
    pages.push(page);
  }

  onProgress({ stage: "done", current: total, total, message: "Presentation extracted!" });
  return pages;
}

// Pull all <a:t> text runs from a slide XML; treat the first text frame as the title.
function extractTextFromSlideXml(xml: string): { title: string; body: string } {
  // Match each shape (<p:sp>…</p:sp>); each shape contains text runs <a:t>…</a:t>
  const shapes = xml.match(/<p:sp[\s\S]*?<\/p:sp>/g) ?? [];
  const blocks: string[] = [];
  for (const shape of shapes) {
    const runs = Array.from(shape.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map(m => decodeXmlEntities(m[1]));
    if (runs.length === 0) continue;
    const text = runs.join("").trim();
    if (text) blocks.push(text);
  }

  if (blocks.length === 0) return { title: "", body: "" };
  const title = blocks[0].length <= 120 ? blocks[0] : "";
  const body = (title ? blocks.slice(1) : blocks).join("\n• ");
  return { title, body: body ? `• ${body}` : blocks.join("\n") };
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
