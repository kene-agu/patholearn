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
const GEMINI_MODELS     = ["gemini-2.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
const geminiUrl         = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;

const FLASHCARD_SYSTEM = `You are PathoLearn, an expert medical educator creating Anki-style flashcards.
Each card should have a clear clinical question on the front and a concise, memorable answer on the back.
Focus on high-yield, exam-relevant facts. Avoid trivial details.
Return ONLY valid JSON — no markdown, no code fences.`;

function buildFlashcardPrompt(analysis: SlideAnalysis, pageText: string): string {
  return `
Create 5-8 Anki-style flashcards from this slide. Cover different aspects: diagnosis, features, stain, IHC, mechanism, clinical pearl.

SLIDE ANALYSIS:
${JSON.stringify({
  diagnosis: analysis.diagnosis,
  keyLearningPoints: analysis.keyLearningPoints,
  stain: analysis.stain,
  structures: analysis.structures?.slice(0, 4),
  ihcMarkers: analysis.ihcMarkers?.slice(0, 4),
  clinicalCorrelation: analysis.clinicalCorrelation,
  teachingClose: analysis.teachingClose,
}, null, 2)}

PAGE TEXT:
${pageText?.slice(0, 2000) ?? "(none)"}

Return ONLY valid JSON array:
[
  {
    "id": "fc1",
    "front": "Clinical question or stem (concise, direct)",
    "back": "Concise answer with key facts",
    "category": "Diagnosis | Features | Stain | IHC | Clinical | Mechanism | Pearl",
    "keyPoints": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
  }
]

Rules:
- Front should read like an exam question or clinical stem
- Back should be memorable and specific — mention quantitative data where relevant
- keyPoints: 2-4 supporting bullets that supplement the main answer
- Avoid cards that duplicate the same fact
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
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { analysis, pageText } = await request.json() as {
    analysis: SlideAnalysis;
    pageText?: string;
  };

  if (!analysis) return NextResponse.json({ error: "No analysis provided" }, { status: 400 });

  const prompt = buildFlashcardPrompt(analysis, pageText ?? "");

  // Try Claude first, fall back to Gemini
  let flashcards: SlideFlashcard[] | null = null;

  if (ANTHROPIC_API_KEY) {
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
    }
  }

  if (!flashcards && GEMINI_API_KEY) {
    for (const model of GEMINI_MODELS) {
      const res = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: FLASHCARD_SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? "").join("").trim();
      flashcards = parseJsonArray(text);
      if (flashcards) break;
    }
  }

  if (!flashcards) return NextResponse.json({ error: "Flashcard generation failed" }, { status: 500 });

  return NextResponse.json({ flashcards });
}
