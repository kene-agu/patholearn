// Background pre-warm for slide analyses.
//
// Once a user opens a deck, kick off Gemini + Claude analysis for every
// slide that hasn't been analysed yet — bounded concurrency so we don't
// hammer the API or saturate the network. By the time the user navigates
// to a slide, the result is usually already in the DB and the UI is
// instant instead of waiting 8–10s for the LLM round-trip.

import type { PDFSlide, SlideAnalysis } from "@/types/smartLearn";

const CONCURRENCY = 2;

export interface PrewarmCallbacks {
  getToken: () => Promise<string>;
  onAnalyzed: (slideId: string, analysis: SlideAnalysis) => void;
  shouldAbort: () => boolean;
}

export async function prewarmAnalyses(
  slides: PDFSlide[],
  { getToken, onAnalyzed, shouldAbort }: PrewarmCallbacks
): Promise<void> {
  // Skip slides that are already analysed or have no fetchable image yet.
  const queue = slides.filter(
    (s) => !s.analysis_json && (s.thumbUrl || s.fullUrl)
  );
  if (queue.length === 0) return;

  const token = await getToken();
  if (!token) return;

  const runOne = async (slide: PDFSlide) => {
    if (shouldAbort()) return;
    const imgUrl = slide.fullUrl ?? slide.thumbUrl;
    if (!imgUrl) return;

    try {
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) return;
      const blob = await imgRes.blob();
      const base64 = await blobToBase64(blob);

      if (shouldAbort()) return;
      const res = await fetch(`/api/pdf/${slide.pdf_id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: blob.type,
          pageText: slide.page_text,
        }),
      });
      if (!res.ok) return;
      const { analysis } = (await res.json()) as { analysis?: SlideAnalysis };
      if (!analysis || shouldAbort()) return;

      onAnalyzed(slide.id, analysis);

      // Persist so subsequent visits skip the LLM round-trip entirely.
      void fetch(`/api/pdf/${slide.pdf_id}/slides`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slideId: slide.id, field: "analysis_json", value: analysis }),
      });
    } catch {
      // Best-effort — user can still trigger analysis on demand by navigating to the slide.
    }
  };

  // Simple worker pool: spin up CONCURRENCY consumers that drain the queue.
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0 && !shouldAbort()) {
      const slide = queue.shift();
      if (!slide) break;
      await runOne(slide);
    }
  });
  await Promise.all(workers);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
