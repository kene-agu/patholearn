// POST /api/pdf/[pdfId]/analyze
// Runs Gemini vision + Claude reasoning on a single slide image.
// Accepts a base64 image from the client (already compressed by imageOptimization.ts).

import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/userAuth";

export const maxDuration = 60;

const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
const CLAUDE_MODEL  = "claude-haiku-4-5-20251001";
const CLAUDE_URL    = "https://api.anthropic.com/v1/messages";
const geminiUrl     = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;

// ── Prompts ────────────────────────────────────────────────────────────────────

const GEMINI_SLIDE_VISION_SYSTEM = `You are a slide content extractor for educational PDFs.
Your job: describe EXACTLY what you see on this slide — text, diagrams, images, histology photos, charts, tables.
For any histopathology image: describe stain colours, tissue architecture, cell morphology, nuclear features.
For diagrams/charts: describe the key information shown.
For text slides: extract and summarise key points.
Return ONLY valid JSON — no markdown, no code fences.`;

const GEMINI_SLIDE_VISION_PROMPT = `Describe this educational slide completely. Return ONLY valid JSON:
{
  "slideType": "histopathology | diagram | text | mixed | table | graph",
  "hasImage": true,
  "textContent": "All text visible on the slide",
  "imageDescription": "If image present: stain type, tissue, architecture, cell morphology, nuclear features",
  "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "educationalValue": "What a medical student should learn from this slide",
  "stainType": "H&E | PAS | ZN | Trichrome | IHC | none",
  "tissueType": "organ/tissue type if histology, else null",
  "architecturalPattern": "if histology: pattern seen, else null"
}`;

const CLAUDE_SLIDE_ANALYSIS_SYSTEM = `You are PathoLearn, an expert histopathologist and medical educator.
You receive a description of an educational slide extracted from a PDF. Produce a structured educational analysis.
For histopathology slides: apply full diagnostic reasoning.
For text/diagram slides: extract and explain key educational concepts.
Return ONLY valid JSON — no markdown, no code fences.`;

const SLIDE_ANALYSIS_SCHEMA = `Return ONLY valid JSON:
{
  "diagnosis": "Primary diagnosis or main topic of this slide",
  "confidence": "High | Medium | Low",
  "overview": "2-3 sentence educational summary of this slide",
  "keyLearningPoints": ["Point 1", "Point 2", "Point 3", "Point 4"],
  "stain": { "type": "stain name or N/A", "reasoning": "why", "colorCharacteristics": "key colours" },
  "structures": [
    { "name": "structure name", "description": "what it shows", "normalOrAbnormal": "normal | abnormal", "educationalNote": "teaching point" }
  ],
  "differentialDiagnosis": [
    { "diagnosis": "differential", "distinguishingFeatures": "what separates it" }
  ],
  "clinicalCorrelation": "How this relates to clinical practice",
  "ihcMarkers": [
    { "marker": "marker name", "expectedResult": "positive | negative", "significance": "why important" }
  ],
  "annotations": [
    { "id": "annotation-1", "label": "Short label", "description": "What this shows", "xPercent": 25, "yPercent": 40 }
  ],
  "teachingClose": { "pearl": "Key teaching point", "pitfall": "Common student error" }
}`;

// ── Helpers ────────────────────────────────────────────────────────────────────

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

async function callGemini(system: string, parts: GeminiPart[]): Promise<string> {
  for (const model of GEMINI_MODELS) {
    const res = await fetch(geminiUrl(model), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) continue;
    const data = await res.json();
    return (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text ?? "")
      .join("")
      .trim();
  }
  return "";
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return JSON.parse(match ? match[1].trim() : text);
  } catch { return null; }
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params: _params }: { params: { pdfId: string } }
) {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageBase64, mediaType, pageText } = await request.json() as {
    imageBase64: string;
    mediaType: string;
    pageText?: string;
  };

  if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });
  if (!GEMINI_API_KEY) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });

  // Step 1 — Gemini: describe slide
  const visionParts: GeminiPart[] = [
    { inline_data: { mime_type: mediaType || "image/webp", data: imageBase64 } },
    { text: pageText ? `Slide text context:\n${pageText.slice(0, 2000)}\n\n${GEMINI_SLIDE_VISION_PROMPT}` : GEMINI_SLIDE_VISION_PROMPT },
  ];
  const visionText = await callGemini(GEMINI_SLIDE_VISION_SYSTEM, visionParts);
  const observations = parseJson(visionText);

  if (!observations) {
    return NextResponse.json({ error: "Slide description failed" }, { status: 500 });
  }

  // Step 2 — Claude: educational analysis
  if (ANTHROPIC_API_KEY) {
    const claudeRes = await fetch(CLAUDE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: CLAUDE_SLIDE_ANALYSIS_SYSTEM,
        messages: [{
          role: "user",
          content: `SLIDE OBSERVATIONS:\n${JSON.stringify(observations, null, 2)}\n\nPAGE TEXT:\n${pageText?.slice(0, 3000) ?? "(none)"}\n\n${SLIDE_ANALYSIS_SCHEMA}`,
        }],
      }),
    });

    if (claudeRes.ok) {
      const claudeData = await claudeRes.json();
      const analysis = parseJson(claudeData?.content?.[0]?.text ?? "");
      if (analysis) return NextResponse.json({ analysis, pipeline: "dual" });
    }
  }

  // Gemini-only fallback for analysis
  const fullParts: GeminiPart[] = [
    { inline_data: { mime_type: mediaType || "image/webp", data: imageBase64 } },
    { text: `${pageText ? `Slide text:\n${pageText.slice(0, 2000)}\n\n` : ""}${SLIDE_ANALYSIS_SCHEMA}` },
  ];

  const fullSystem = `You are PathoLearn, an expert histopathologist and medical educator.
Analyse this educational slide and return a full educational analysis as JSON.
For histopathology images apply diagnostic reasoning. For text slides summarise key concepts.`;

  const fullText = await callGemini(fullSystem, fullParts);
  const analysis = parseJson(fullText);
  if (analysis) return NextResponse.json({ analysis, pipeline: "single" });

  return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
}
