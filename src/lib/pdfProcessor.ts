// Client-side PDF processing using pdfjs-dist
// Renders each page to canvas → extracts WebP images + text

import type { ExtractionProgress } from "@/types/smartLearn";
import { canvasToOptimizedBlobs } from "./imageOptimization";
import { fetchSignedUploadUrls, uploadSlideBlob, type SignedUploadSlot } from "./slideStorage";

// Max slide image uploads kept in flight while rendering continues.
const UPLOAD_CONCURRENCY = 6;

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
  authToken: string,
  onProgress: (p: ExtractionProgress) => void
): Promise<ExtractedPage[]> {
  // Lazy-load pdfjs to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  onProgress({ stage: "reading", current: 0, total: 0, message: "Reading PDF…" });

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDoc.numPages;

  // Pre-allocate every storage path so we can sign them all in one round-trip.
  const paths: { fullPath: string; thumbPath: string }[] = [];
  for (let i = 1; i <= numPages; i++) {
    const base = `${userId}/${pdfId}/page-${String(i).padStart(3, "0")}`;
    paths.push({ fullPath: `${base}.webp`, thumbPath: `${base}-thumb.webp` });
  }

  onProgress({ stage: "uploading", current: 0, total: numPages, message: "Preparing upload…" });
  const signedMap = await fetchSignedUploadUrls(
    paths.flatMap((p) => [p.fullPath, p.thumbPath]),
    authToken
  );

  onProgress({ stage: "rendering", current: 0, total: numPages, message: `Extracting ${numPages} slides…` });

  const results: ExtractedPage[] = [];

  // pdfjs rendering is CPU-bound and single-threaded; uploads are network-bound.
  // Render sequentially but let uploads run in the background with a bounded
  // number in flight, so the next page renders while earlier ones upload.
  // This roughly halves wall-clock time on large decks vs. awaiting each upload.
  const inFlight = new Set<Promise<void>>();
  let uploaded = 0;

  const queueUpload = (page: ExtractedPage, fullSigned: SignedUploadSlot, thumbSigned: SignedUploadSlot) => {
    const task = Promise.all([
      uploadSlideBlob(fullSigned, page.fullBlob),
      uploadSlideBlob(thumbSigned, page.thumbBlob),
    ]).then(() => {
      uploaded++;
      onProgress({ stage: "uploading", current: uploaded, total: numPages, message: `Uploaded ${uploaded}/${numPages} slides…` });
    });
    const tracked = task.finally(() => inFlight.delete(tracked));
    inFlight.add(tracked);
    return tracked;
  };

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

    const { fullPath, thumbPath } = paths[i - 1];
    const fullSigned  = signedMap.get(fullPath);
    const thumbSigned = signedMap.get(thumbPath);
    if (!fullSigned || !thumbSigned) {
      throw new Error(`Missing signed upload URL for page ${i}`);
    }

    const extractedPage: ExtractedPage = { pageNumber: i, fullBlob, thumbBlob, text, fullPath, thumbPath };
    results.push(extractedPage);
    queueUpload(extractedPage, fullSigned, thumbSigned);

    onProgress({ stage: "rendering", current: i, total: numPages, message: `Extracted ${i}/${numPages} slides` });

    // Backpressure: don't let memory balloon while uploads catch up.
    while (inFlight.size >= UPLOAD_CONCURRENCY) {
      await Promise.race(inFlight);
    }
  }

  // Drain any remaining uploads before we report done.
  await Promise.all(inFlight);

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
