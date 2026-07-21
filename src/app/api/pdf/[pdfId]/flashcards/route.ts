// POST /api/pdf/[pdfId]/flashcards
// Generate Anki-style flashcards from a slide's analysis + page text.

import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/userAuth";
import type { SlideAnalysis, SlideFlashcard } from "@/types/smartLearn";

export const maxDuration = 30;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const CLAUDE_MODEL      = "claude-haiku-4-5-20251001";
const CLAUDE_URL        = "https://api.anthropic.com/v1/messages";
const GEMINI_MODELS     = ["gemini-3.6-flash", "gemini-3.6-flash", "gemini-2.5-flash"];
const geminiUrl         = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;

const FLASHCARD_SYSTEM = `You are PathoLearn, an expert medical educator creating Anki-style flashcards.
You will receive raw slide text (and optionally a prior AI analysis of the slide).
Treat the slide text as the SOURCE OF TRUTH — generate one card per distinct concept or
fact the slide actually contains. Do not invent content that isn't in the slide.
Cover every section / numbered item / bullet. A slide with 8 sub-concepts produces 8+ cards.
Each card has a clear clinical question on the front and a concise, memorable answer on the back.
Inside string values use plain text and Unicode symbols (≥, ≤, ×, %, →) — never LaTeX or math delimiters ($…$) or backslash commands like \\ge, \\times, \\%.
Return ONLY valid JSON — no markdown, no code fences.`;

function buildFlashcardPrompt(analysis: SlideAnalysis | null, pageText: string): string {
  const analysisBlock = analysis
    ? `\n\nPRIOR ANALYSIS (supplemental — the slide text above is authoritative):\n${JSON.stringify({
        diagnosis: analysis.diagnosis,
        keyLearningPoints: analysis.keyLearningPoints,
        stain: analysis.stain,
        structures: analysis.structures,
        ihcMarkers: analysis.ihcMarkers,
        clinicalCorrelation: analysis.clinicalCorrelation,
        teachingClose: analysis.teachingClose,
      }, null, 2)}`
    : "";

  return `
Create exam-quality flashcards covering EVERY concept on this slide. Number of cards should match the
slide's content depth — a one-line intro slide produces 2-3 cards; a slide listing 8 sections produces
8+ cards. Do NOT cap arbitrarily and do NOT duplicate facts across cards.

SLIDE TEXT (source of truth — generate one card per concept here):
${pageText?.slice(0, 12000) || "(no text extracted — rely on analysis)"}
${analysisBlock}

Return ONLY valid JSON array:
[
  {
    "id": "fc1",
    "front": "Clinical question or stem (concise, direct)",
    "back": "Concise answer with key facts",
    "category": "Diagnosis | Features | Stain | IHC | Clinical | Mechanism | Pearl | Definition | Anatomy",
    "keyPoints": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
  }
]

Rules:
- One card per distinct concept on the slide. Cover every section, definition, mechanism, and clinical fact.
- Front reads like an exam question or stem
- Back is memorable and specific — include exact numbers / acronyms where the slide gives them
- keyPoints: 2-4 supporting bullets that supplement the main answer
- Never invent facts not on the slide
`;
}

function parseJsonArray(text: string): SlideFlashcard[] | null {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = JSON.parse(match ? match[1].trim() : text);
    return Array.isArray(raw) ? raw : null;
  } catch { return null; }
}

export async function POST(
  request: NextRequest,
  { params: _params }: { params: { pdfId: string } }
) {
  try {
    const user = await verifyUser(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { analysis, pageText } = await request.json() as {
      analysis?: SlideAnalysis | null;
      pageText?: string;
    };

    if (!analysis && !pageText?.trim()) {
      return NextResponse.json({ error: "No slide content provided" }, { status: 400 });
    }

    const prompt = buildFlashcardPrompt(analysis ?? null, pageText ?? "");

    let flashcards: SlideFlashcard[] | null = null;

    if (ANTHROPIC_API_KEY) {
      try {
        const res = await fetch(CLAUDE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 4096,
            system: FLASHCARD_SYSTEM,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          flashcards = parseJsonArray(data?.content?.[0]?.text ?? "");
        } else {
          console.error(`[flashcards] Claude failed: ${res.status} ${await res.text().catch(() => "")}`);
        }
      } catch (e) {
        console.error("[flashcards] Claude threw:", e);
      }
    }

    if (!flashcards && GEMINI_API_KEY) {
      for (const model of GEMINI_MODELS) {
        try {
          const res = await fetch(geminiUrl(model), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: FLASHCARD_SYSTEM }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json" },
            }),
          });
          if (!res.ok) {
            console.error(`[flashcards] Gemini ${model} failed: ${res.status} ${await res.text().catch(() => "")}`);
            continue;
          }
          const data = await res.json();
          const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? "").join("").trim();
          flashcards = parseJsonArray(text);
          if (flashcards) break;
        } catch (e) {
          console.error(`[flashcards] Gemini ${model} threw:`, e);
        }
      }
    }

    if (!flashcards) {
      return NextResponse.json({ error: "Flashcard generation failed — try again" }, { status: 502 });
    }

    return NextResponse.json({ flashcards });
  } catch (e) {
    console.error("[flashcards] unhandled:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Flashcard generation failed" },
      { status: 500 }
    );
  }
}
