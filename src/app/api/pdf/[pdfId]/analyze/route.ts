// POST /api/pdf/[pdfId]/analyze
// Runs Gemini Flash analysis on a single slide image.
// Accepts a base64 image from the client (already compressed by imageOptimization.ts).

import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/userAuth";

export const maxDuration = 60;

const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
const geminiUrl     = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;

// ── Prompts ────────────────────────────────────────────────────────────────────

const GEMINI_SLIDE_SYSTEM = `You are PathoLearn, an expert histopathologist and medical educator analysing educational PDF slides.
Capture EVERYTHING on this slide — every bullet, heading, numbered item, and label. Do NOT summarise or collapse content.
For histopathology images: identify stain, tissue type, architecture, cell morphology, nuclear features, and apply full diagnostic reasoning.
For text/diagram slides: extract and explain every concept — completeness matters more than brevity.
Inside string values use plain text and Unicode symbols (≥, ≤, ×, %, →) — never LaTeX or math delimiters ($…$) or backslash commands like \\ge, \\times, \\%.
Return ONLY valid JSON — no markdown, no code fences.`;

const SLIDE_ANALYSIS_SCHEMA = `Return ONLY valid JSON. Cover ALL content on the slide — do not stop at four points.

{
  "diagnosis": "Primary diagnosis or main topic of this slide",
  "confidence": "High | Medium | Low",
  "overview": "2-3 sentence educational summary of this slide",
  "keyLearningPoints": [
    "ONE entry per concept/section/bullet on the slide — exhaustive, not a digest. A slide with 8 sections should produce 8+ entries. Do NOT cap at four."
  ],
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
    try {
      const res = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) {
        console.error(`[analyze] Gemini ${model} failed: ${res.status} ${await res.text().catch(() => "")}`);
        continue;
      }
      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts ?? [])
        .map((p: { text?: string }) => p?.text ?? "")
        .join("")
        .trim();
      if (text) return text;
    } catch (e) {
      console.error(`[analyze] Gemini ${model} threw:`, e);
    }
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
  try {
    const user = await verifyUser(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { imageBase64, mediaType, pageText } = await request.json() as {
      imageBase64: string;
      mediaType: string;
      pageText?: string;
    };

    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });
    if (!GEMINI_API_KEY) return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });

    const parts: GeminiPart[] = [
      { inline_data: { mime_type: mediaType || "image/webp", data: imageBase64 } },
      { text: `${pageText ? `FULL PAGE TEXT (authoritative — cover every section):\n${pageText.slice(0, 12000)}\n\n` : ""}${SLIDE_ANALYSIS_SCHEMA}` },
    ];

    const text = await callGemini(GEMINI_SLIDE_SYSTEM, parts);
    const analysis = parseJson(text);
    if (analysis) return NextResponse.json({ analysis, pipeline: "gemini", geminiModel: GEMINI_MODELS[0] });

    return NextResponse.json({ error: "Analysis failed" }, { status: 502 });
  } catch (e) {
    console.error("[analyze] unhandled:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
