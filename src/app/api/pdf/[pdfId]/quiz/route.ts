// POST /api/pdf/[pdfId]/quiz
// Generate 5-10 MCQ questions from a slide's analysis + page text.
// Uses Claude for structured question generation.

import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/userAuth";
import type { SlideAnalysis, SlideQuestion } from "@/types/smartLearn";

export const maxDuration = 30;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const CLAUDE_MODEL      = "claude-haiku-4-5-20251001";
const CLAUDE_URL        = "https://api.anthropic.com/v1/messages";
const GEMINI_MODELS     = ["gemini-3.6-flash", "gemini-3.6-flash", "gemini-2.5-flash"];
const geminiUrl         = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;

const QUIZ_SYSTEM = `You are PathoLearn, an expert medical educator creating high-quality exam-style questions.
Generate challenging, clinically relevant questions that test genuine understanding — not rote recall.
Question types: MCQ (4 options), true/false, feature identification.
All distractors must be plausible. Explanations must be educational and specific.
Spread the correct answer across different positions from question to question — do NOT default to the first option. Keep all options similar in length, detail, and specificity so the correct one cannot be guessed from wording alone.
Inside string values use plain text and Unicode symbols (≥, ≤, ×, %, →) — never LaTeX or math delimiters ($…$) or backslash commands like \\ge, \\times, \\%.
Return ONLY valid JSON — no markdown, no code fences.`;

function buildQuizPrompt(
  analysis: SlideAnalysis | null,
  pageText: string,
  count: number
): string {
  const analysisBlock = analysis
    ? `\n\nPRIOR ANALYSIS (supplemental — slide text is authoritative):\n${JSON.stringify({
        diagnosis: analysis.diagnosis,
        keyLearningPoints: analysis.keyLearningPoints,
        stain: analysis.stain,
        structures: analysis.structures,
        ihcMarkers: analysis.ihcMarkers,
        differentialDiagnosis: analysis.differentialDiagnosis,
        clinicalCorrelation: analysis.clinicalCorrelation,
        teachingClose: analysis.teachingClose,
      }, null, 2)}`
    : "";

  return `
Generate ${count} exam-style questions grounded in this slide's content.
Each question must test a DIFFERENT concept (diagnosis, features, stain, IHC, clinical, mechanism, definition).
Use the slide text as the source of truth — do NOT invent facts not on the slide.

SLIDE TEXT:
${pageText?.slice(0, 12000) || "(no extracted text — rely on analysis)"}
${analysisBlock}

Return ONLY valid JSON array:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why A is correct and why B/C/D are wrong. Educational and specific."
  },
  {
    "id": "q2",
    "type": "true-false",
    "question": "Statement to evaluate (True or False)?",
    "options": ["True", "False"],
    "correctIndex": 0,
    "explanation": "Educational explanation of the correct answer."
  }
]

Rules:
- No two questions about the same concept
- Distractors must be clinically plausible, not obviously wrong
- Explanations reference specific slide features where possible
- Questions should challenge a 3rd-year medical student
`;
}

async function generateWithClaude(prompt: string): Promise<SlideQuestion[] | null> {
  if (!ANTHROPIC_API_KEY) return null;
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
        system: QUIZ_SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error(`[quiz] Claude failed: ${res.status} ${await res.text().catch(() => "")}`);
      return null;
    }
    const data = await res.json();
    return parseJsonArray(data?.content?.[0]?.text ?? "");
  } catch (e) {
    console.error("[quiz] Claude threw:", e);
    return null;
  }
}

async function generateWithGemini(prompt: string): Promise<SlideQuestion[] | null> {
  if (!GEMINI_API_KEY) return null;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: QUIZ_SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) {
        console.error(`[quiz] Gemini ${model} failed: ${res.status} ${await res.text().catch(() => "")}`);
        continue;
      }
      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? "").join("").trim();
      const result = parseJsonArray(text);
      if (result) return result;
    } catch (e) {
      console.error(`[quiz] Gemini ${model} threw:`, e);
    }
  }
  return null;
}

function parseJsonArray(text: string): SlideQuestion[] | null {
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
  // Top-level try so we ALWAYS respond with JSON. Without this, an unhandled
  // throw (network blip, malformed upstream response, etc.) makes Next.js
  // serve its plaintext "An error occurred..." page, which the client tries
  // to JSON.parse and crashes with "Unexpected token 'A'".
  try {
    const user = await verifyUser(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { analysis, pageText, count = 6 } = await request.json() as {
      analysis?: SlideAnalysis | null;
      pageText?: string;
      count?: number;
    };

    if (!analysis && !pageText?.trim()) {
      return NextResponse.json({ error: "No slide content provided" }, { status: 400 });
    }

    const prompt = buildQuizPrompt(analysis ?? null, pageText ?? "", Math.min(count, 10));

    // Try Gemini first — typically 3-6s vs Claude Haiku ~10-15s for this prompt.
    // Fall back to Claude if Gemini fails or returns nothing parseable.
    const questions = (await generateWithGemini(prompt)) ?? (await generateWithClaude(prompt));

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "Quiz generation failed — the model didn't return valid questions. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ questions });
  } catch (e) {
    console.error("[quiz] unhandled:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Quiz generation failed" },
      { status: 500 }
    );
  }
}
