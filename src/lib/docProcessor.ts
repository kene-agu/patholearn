// Word and PowerPoint document processing
// Extracts text and converts to canvas images for uniform pipeline

import type { ExtractionProgress } from "@/types/smartLearn";
import { canvasToOptimizedBlobs } from "./imageOptimization";
import { supabase } from "./supabase";

export interface ExtractedPage {
  pageNumber: number;
  fullBlob: Blob;
  thumbBlob: Blob;
  text: string;
  fullPath: string;
  thumbPath: string;
}

export async function extractWordDocument(
  file: File,
  userId: string,
  docId: string,
  onProgress: (p: ExtractionProgress) => void
): Promise<ExtractedPage[]> {
  const mammoth = await import("mammoth");

  onProgress({ stage: "reading", current: 0, total: 0, message: "Reading Word document…" });

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  // For Word docs, treat as single page
  const text = result.value;

  // Create canvas with text content
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.font = "16px sans-serif";
  ctx.textBaseline = "top";

  const lines = text.split("\n");
  let y = 20;
  const lineHeight = 24;

  for (const line of lines) {
    if (y > canvas.height - 20) break;
    const trimmed = line.substring(0, 80);
    ctx.fillText(trimmed, 20, y);
    y += lineHeight;
  }

  onProgress({ stage: "rendering", current: 0, total: 1, message: "Converting document…" });

  const { fullBlob, thumbBlob } = await canvasToOptimizedBlobs(canvas, 1280, 0.82, 200);

  const base = `${userId}/${docId}/page-001`;
  const fullPath = `${base}.webp`;
  const thumbPath = `${base}-thumb.webp`;

  onProgress({ stage: "uploading", current: 1, total: 1, message: "Uploading document…" });

  const [fullUp, thumbUp] = await Promise.all([
    supabase.storage.from("pdf-slides").upload(fullPath, fullBlob, { contentType: "image/webp", upsert: true }),
    supabase.storage.from("pdf-slides").upload(thumbPath, thumbBlob, { contentType: "image/webp", upsert: true }),
  ]);

  if (fullUp.error) console.error("Full upload failed:", fullUp.error);
  if (thumbUp.error) console.error("Thumb upload failed:", thumbUp.error);

  onProgress({ stage: "done", current: 1, total: 1, message: "Document extracted!" });

  return [{
    pageNumber: 1,
    fullBlob,
    thumbBlob,
    text: text.substring(0, 5000),
    fullPath,
    thumbPath,
  }];
}

export async function extractPowerPoint(
  file: File,
  userId: string,
  pptId: string,
  onProgress: (p: ExtractionProgress) => void
): Promise<ExtractedPage[]> {
  const pptxjs = await import("pptxjs");

  onProgress({ stage: "reading", current: 0, total: 0, message: "Reading PowerPoint…" });

  const arrayBuffer = await file.arrayBuffer();
  const prs = new pptxjs.Presentation();

  await prs.load(arrayBuffer);
  const numSlides = prs.slides.length;

  onProgress({ stage: "rendering", current: 0, total: numSlides, message: `Extracting ${numSlides} slides…` });

  const results: ExtractedPage[] = [];

  for (let i = 0; i < numSlides; i++) {
    const slide = prs.slides[i];

    // Extract text from shapes
    let slideText = "";
    if (slide.shapes) {
      for (const shape of slide.shapes) {
        if (shape.text) slideText += shape.text + " ";
      }
    }

    // Create canvas from slide thumbnail
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    // Fill with light background
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render text
    ctx.fillStyle = "#333333";
    ctx.font = "bold 24px sans-serif";
    ctx.textBaseline = "top";

    const lines = slideText.substring(0, 200).split("\n");
    let y = 40;

    for (const line of lines) {
      if (y > canvas.height - 40) break;
      ctx.fillText(line.substring(0, 60), 40, y);
      y += 40;
    }

    const { fullBlob, thumbBlob } = await canvasToOptimizedBlobs(canvas, 1280, 0.82, 200);

    const base = `${userId}/${pptId}/page-${String(i + 1).padStart(3, "0")}`;
    const fullPath = `${base}.webp`;
    const thumbPath = `${base}-thumb.webp`;

    onProgress({ stage: "uploading", current: i + 1, total: numSlides, message: `Uploading slide ${i + 1}/${numSlides}…` });

    const [fullUp, thumbUp] = await Promise.all([
      supabase.storage.from("pdf-slides").upload(fullPath, fullBlob, { contentType: "image/webp", upsert: true }),
      supabase.storage.from("pdf-slides").upload(thumbPath, thumbBlob, { contentType: "image/webp", upsert: true }),
    ]);

    if (fullUp.error) console.error(`Full upload failed slide ${i + 1}:`, fullUp.error);
    if (thumbUp.error) console.error(`Thumb upload failed slide ${i + 1}:`, thumbUp.error);

    results.push({
      pageNumber: i + 1,
      fullBlob,
      thumbBlob,
      text: slideText.substring(0, 5000),
      fullPath,
      thumbPath,
    });
  }

  onProgress({ stage: "done", current: numSlides, total: numSlides, message: "All slides extracted!" });

  return results;
}
