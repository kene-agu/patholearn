// POST /api/pdf/[pdfId]/analyze
// Runs Gemini vision + Claude reasoning on a single slide image.
// Accepts a base64 image from the client (already compressed by imageOptimization.ts).

import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/userAuth";

export const maxDuration = 60;

const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
const CLAUDE_MODEL  = "claude-haiku-4-5-20251001";
const CLAUDE_URL    = "https://api.anthropic.com/v1/messages";
const geminiUrl     = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;

// ── Prompts ────────────────────────────────────────────────────────────────────

const GEMINI_SLIDE_VISION_SYSTEM = `You are a slide content extractor for educational PDFs.
Your job: capture EVERYTHING on this slide — every bullet, every heading, every numbered item, every label.
Do NOT summarise. Do NOT collapse multiple bullets into one. Do NOT skip sections that look repetitive.
The student needs the full content to study from, not a digest.
For any histopathology image: describe stain colours, tissue architecture, cell morphology, nuclear features.
For diagrams/charts: describe the key information shown.
For text slides: enumerate every section, sub-section, and bullet — exhaustively.
If pageText is provided, treat it as authoritative for text content (the image may be low contrast).
Return ONLY valid JSON — no markdown, no code fences.`;

const GEMINI_SLIDE_VISION_PROMPT = `Describe this educational slide EXHAUSTIVELY. Return ONLY valid JSON:
{
  "slideType": "histopathology | diagram | text | mixed | table | graph",
  "hasImage": true,
  "textContent": "EVERY line of text on the slide — preserve numbering (I, II, III...) and bullets. Do not abbreviate or summarise.",
  "imageDescription": "If image present: stain type, tissue, architecture, cell morphology, nuclear features",
  "keyTopics": ["Every distinct topic/section on the slide — one per section, list all"],
  "educationalValue": "What a medical student should learn from this slide",
  "stainType": "H&E | PAS | ZN | Trichrome | IHC | none",
  "tissueType": "organ/tissue type if histology, else null",
  "architecturalPattern": "if histology: pattern seen, else null"
}`;

const CLAUDE_SLIDE_ANALYSIS_SYSTEM = `You are PathoLearn, an expert histopathologist and medical educator.
You receive a description of an educational slide extracted from a PDF. Produce a structured educational analysis
that captures EVERYTHING on the slide — every section, every bullet, every named concept.
The student is going to study from this analysis instead of the slide, so completeness matters more than brevity.
For histopathology slides: apply full diagnostic reasoning.
For text/diagram slides: extract and explain every concept the slide covers — do not collapse sections.
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

    const visionParts: GeminiPart[] = [
      { inline_data: { mime_type: mediaType || "image/webp", data: imageBase64 } },
      { text: pageText ? `Slide text context (authoritative — image may have low contrast):\n${pageText.slice(0, 12000)}\n\n${GEMINI_SLIDE_VISION_PROMPT}` : GEMINI_SLIDE_VISION_PROMPT },
    ];
    const visionText = await callGemini(GEMINI_SLIDE_VISION_SYSTEM, visionParts);
    const observations = parseJson(visionText);

    if (!observations) {
      return NextResponse.json({ error: "Slide description failed" }, { status: 502 });
    }

    if (ANTHROPIC_API_KEY) {
      try {
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
              content: `SLIDE OBSERVATIONS:\n${JSON.stringify(observations, null, 2)}\n\nFULL PAGE TEXT (use this as the ground truth for everything on the slide):\n${pageText?.slice(0, 15000) ?? "(none)"}\n\n${SLIDE_ANALYSIS_SCHEMA}`,
            }],
          }),
        });

        if (claudeRes.ok) {
          const claudeData = await claudeRes.json();
          const analysis = parseJson(claudeData?.content?.[0]?.text ?? "");
          if (analysis) return NextResponse.json({ analysis, pipeline: "dual" });
        } else {
          console.error(`[analyze] Claude failed: ${claudeRes.status} ${await claudeRes.text().catch(() => "")}`);
        }
      } catch (e) {
        console.error("[analyze] Claude threw:", e);
      }
    }

    const fullParts: GeminiPart[] = [
      { inline_data: { mime_type: mediaType || "image/webp", data: imageBase64 } },
      { text: `${pageText ? `FULL PAGE TEXT (authoritative — cover every section):\n${pageText.slice(0, 12000)}\n\n` : ""}${SLIDE_ANALYSIS_SCHEMA}` },
    ];

    const fullSystem = `You are PathoLearn, an expert histopathologist and medical educator.
Analyse this educational slide and return a full educational analysis as JSON.
For histopathology images apply diagnostic reasoning. For text slides summarise key concepts.`;

    const fullText = await callGemini(fullSystem, fullParts);
    const analysis = parseJson(fullText);
    if (analysis) return NextResponse.json({ analysis, pipeline: "single" });

    return NextResponse.json({ error: "Analysis failed" }, { status: 502 });
  } catch (e) {
    console.error("[analyze] unhandled:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
