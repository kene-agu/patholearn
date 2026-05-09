// Client-side PDF processing using pdfjs-dist
// Renders each page to canvas → extracts WebP images + text

import type { ExtractionProgress } from "@/types/smartLearn";
import { canvasToOptimizedBlobs } from "./imageOptimization";
import { supabase } from "./supabase";

export interface ExtractedPage {
  pageNumber: number;
  fullBlob: Blob;
  thumbBlob: Blob;
  text: string;
  fullPath: string;   // Supabase Storage path
  thumbPath: string;  // Supabase Storage path
}

/**
 * Full pipeline: PDF File → rendered pages → Supabase Storage paths.
 * Calls onProgress after each page so the UI can update.
 */
export async function extractAndUploadPDF(
  file: File,
  userId: string,
  pdfId: string,
  onProgress: (p: ExtractionProgress) => void
): Promise<ExtractedPage[]> {
  // Lazy-load pdfjs to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  onProgress({ stage: "reading", current: 0, total: 0, message: "Reading PDF…" });

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDoc.numPages;

  onProgress({ stage: "rendering", current: 0, total: numPages, message: `Extracting ${numPages} slides…` });

  const results: ExtractedPage[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);

    // Render at 2× scale for retina quality, but cap at 1280px wide
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1280 / baseViewport.width);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width  = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: canvas.getContext("2d") as object,
      viewport,
      canvas,
    } as Parameters<typeof page.render>[0]).promise;

    // Extract text
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    // Compress to WebP (full + thumbnail)
    const { fullBlob, thumbBlob } = await canvasToOptimizedBlobs(canvas, 1280, 0.82, 200);

    // Upload to Supabase Storage
    const base = `${userId}/${pdfId}/page-${String(i).padStart(3, "0")}`;
    const fullPath  = `${base}.webp`;
    const thumbPath = `${base}-thumb.webp`;

    onProgress({ stage: "uploading", current: i, total: numPages, message: `Uploading slide ${i}/${numPages}…` });

    const [fullUp, thumbUp] = await Promise.all([
      supabase.storage.from("pdf-slides").upload(fullPath,  fullBlob,  { contentType: "image/webp", upsert: true }),
      supabase.storage.from("pdf-slides").upload(thumbPath, thumbBlob, { contentType: "image/webp", upsert: true }),
    ]);

    if (fullUp.error)  console.error(`Full upload failed p${i}:`, fullUp.error);
    if (thumbUp.error) console.error(`Thumb upload failed p${i}:`, thumbUp.error);

    results.push({ pageNumber: i, fullBlob, thumbBlob, text, fullPath, thumbPath });

    onProgress({ stage: "rendering", current: i, total: numPages, message: `Extracted ${i}/${numPages} slides` });
  }

  onProgress({ stage: "done", current: numPages, total: numPages, message: "All slides extracted!" });
  return results;
}

/**
 * Extract just the text from a PDF (no rendering).
 * Used for the summary pipeline.
 */
export async function extractTextOnly(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(text);
  }

  return pages.join("\n\n--- PAGE BREAK ---\n\n");
}
