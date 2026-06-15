import type { AnalysisResult } from "@/types/analysis";
import type { Suggestion } from "@/components/Combobox";

/**
 * Builds the searchable question suggestions for the slide chat.
 *
 * Two layers:
 *  1. Diagnosis-aware questions — templated with the slide's actual diagnosis
 *     (and its differentials) so the suggestions read like a real assistant.
 *  2. A general histopathology question bank — always available, filters as you
 *     type even before/without a confident diagnosis.
 */

const GENERAL_QUESTIONS: string[] = [
  "What are the key histological features in this slide?",
  "What stain was used and what does each colour represent?",
  "What are the major risk factors for this condition?",
  "What are the key differential diagnoses and how do I tell them apart?",
  "Which IHC markers would confirm this diagnosis?",
  "Walk me through the pathogenesis step by step.",
  "How does this finding correlate with the clinical presentation?",
  "What are the potential complications and long-term consequences?",
  "What grading or staging system applies, and where does this slide fit?",
  "What are the main treatment options?",
  "What is the prognosis and which features influence it most?",
  "Are there targetable molecular alterations or mutations?",
  "What is the epidemiology — who typically gets this?",
  "How is this diagnosis confirmed on biopsy?",
  "What are common pitfalls when diagnosing this?",
];

/** A diagnosis string we shouldn't template on (non-committal / non-histopath). */
function isUsableDiagnosis(dx: string | undefined): dx is string {
  if (!dx) return false;
  const d = dx.trim();
  if (d.length < 3) return false;
  return !/(unknown|uncertain|indeterminate|not\s+histopath|non[-\s]?histopath|cannot|n\/a)/i.test(d);
}

export function buildSlideSuggestions(analysis: AnalysisResult | undefined): Suggestion[] {
  const labels: string[] = [];
  const dx = analysis?.diagnosis?.trim();

  if (isUsableDiagnosis(dx)) {
    labels.push(
      `Which IHC markers confirm ${dx}?`,
      `What is the prognosis of ${dx}?`,
      `What are the diagnostic histological features of ${dx}?`,
      `What is the pathogenesis of ${dx}?`,
      `How is ${dx} graded or staged?`,
      `What molecular alterations are associated with ${dx}?`,
      `What are the treatment options for ${dx}?`,
      `What are the risk factors for ${dx}?`,
      `What is the epidemiology of ${dx}?`,
    );
    // "How do I distinguish X from <differential>?" using the AI's own differentials
    (analysis?.differentialDiagnosis ?? [])
      .map((d) => d?.diagnosis?.trim())
      .filter((name): name is string => !!name && name.toLowerCase() !== dx.toLowerCase())
      .slice(0, 4)
      .forEach((name) => labels.push(`How do I distinguish ${dx} from ${name}?`));
  }

  labels.push(...GENERAL_QUESTIONS);

  // De-duplicate (case-insensitive), preserving order, and map to Suggestions.
  const seen = new Set<string>();
  return labels
    .filter((q) => {
      const key = q.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((label, i) => ({ id: `q-${i}`, label }));
}
