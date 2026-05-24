// POST /api/pdf/[pdfId]/chat
// AI tutor endpoint — conversational Q&A grounded in the current slide + PDF context.
// Persists messages to pdf_chat_messages. Uses Claude primary, Gemini fallback.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";
import type { SlideAnalysis } from "@/types/smartLearn";

export const maxDuration = 30;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const CLAUDE_MODEL      = "claude-haiku-4-5-20251001";
const CLAUDE_URL        = "https://api.anthropic.com/v1/messages";
const GEMINI_MODELS     = ["gemini-3.5-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
const geminiUrl         = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;

const TUTOR_SYSTEM = `You are PathoLearn AI Tutor — an expert histopathologist and medical educator in an interactive tutoring session.

You have been given the slide analysis and page text as context. Answer the student's question in two clear layers:

LAYER 1 — THIS SLIDE (always lead with this):
Ground your answer in the provided slide analysis. Use phrases like "In this slide…", "This case shows…", "The analysis confirms…".
If the student asks about something NOT present in this slide, say so clearly first.

LAYER 2 — GENERAL KNOWLEDGE (supplement, clearly labeled):
After addressing the slide specifically, you may add general medical knowledge. Label it: "In general…", "Typically in this condition…".

FORMAT:
- Use clear markdown headings
- Be concise but educational — a well-explained paragraph beats a wall of bullets
- Suitable for a 3rd-year medical student
- Do NOT wrap your main answer in JSON
- Write in plain markdown only — NEVER use LaTeX or math delimiters ($…$, \\(…\\), \\[…\\]) or backslash commands like \\ge, \\le, \\times, \\%. Use plain text and Unicode symbols instead (≥, ≤, ×, %, →). For example write "t(9;22)(q34;q11)" and "≥20%" directly, not "$t(9;22)$" or "$\\ge 20\\%$".

FOLLOW-UPS (always end with this):
After your answer, output a line containing exactly <<<FOLLOWUPS>>> on its own, then a JSON array of exactly 3 short follow-up questions (each under 70 characters) the student is most likely to ask next, grounded in this slide and what was just discussed. Output nothing after the array.`;

const FOLLOWUP_MARKER = "<<<FOLLOWUPS>>>";

function parseSuggestionList(tail: string): string[] {
  const cleaned = tail.replace(/```json/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}

// Split the model output into the displayed markdown answer and the trailing
// machine-readable follow-up suggestions. Keeping both in one generation avoids
// a second round-trip per turn.
function splitAnswerAndSuggestions(raw: string): { answer: string; suggestions: string[] } {
  const idx = raw.indexOf(FOLLOWUP_MARKER);
  if (idx === -1) return { answer: raw.trim(), suggestions: [] };
  const answer = raw.slice(0, idx).trim();
  const suggestions = parseSuggestionList(raw.slice(idx + FOLLOWUP_MARKER.length));
  return { answer: answer || raw.trim(), suggestions };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
) {
  try {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { question, slideId, slideAnalysis, pageText, history = [] } = await request.json() as {
    question: string;
    slideId?: string;
    slideAnalysis?: SlideAnalysis;
    pageText?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!question?.trim()) return NextResponse.json({ error: "No question provided" }, { status: 400 });

  // Build context block from slide analysis
  const cleanAnalysis = slideAnalysis
    ? {
        diagnosis: slideAnalysis.diagnosis,
        confidence: slideAnalysis.confidence,
        overview: slideAnalysis.overview,
        keyLearningPoints: slideAnalysis.keyLearningPoints,
        stain: slideAnalysis.stain,
        structures: slideAnalysis.structures,
        differentialDiagnosis: slideAnalysis.differentialDiagnosis,
        clinicalCorrelation: slideAnalysis.clinicalCorrelation,
        ihcMarkers: slideAnalysis.ihcMarkers,
        teachingClose: slideAnalysis.teachingClose,
        // Strip pixel coordinates — irrelevant for text chat
      }
    : null;

  const contextBlock = cleanAnalysis
    ? `SLIDE ANALYSIS CONTEXT:\n${JSON.stringify(cleanAnalysis, null, 2)}\n\nPAGE TEXT:\n${pageText?.slice(0, 12000) ?? "(none)"}\n\n`
    : pageText
    ? `PAGE TEXT CONTEXT:\n${pageText.slice(0, 12000)}\n\n`
    : "";

  const userMessage = `${contextBlock}Student question: ${question}`;

  // Build conversation history for multi-turn context (last 6 turns max)
  const recentHistory = history.slice(-6);
  const messages = [
    ...recentHistory.map(m => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  let answer = "";

  // Claude primary
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
          max_tokens: 2048,
          system: TUTOR_SYSTEM,
          messages,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        answer = data?.content?.[0]?.text?.trim() ?? "";
      } else {
        console.error(`[chat] Claude failed: ${res.status} ${await res.text().catch(() => "")}`);
      }
    } catch (e) {
      console.error("[chat] Claude threw:", e);
    }
  }

  // Gemini fallback
  if (!answer && GEMINI_API_KEY) {
    for (const model of GEMINI_MODELS) {
      try {
        const res = await fetch(geminiUrl(model), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: TUTOR_SYSTEM }] },
            contents: [{ role: "user", parts: [{ text: userMessage }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
          }),
        });
        if (!res.ok) {
          console.error(`[chat] Gemini ${model} failed: ${res.status} ${await res.text().catch(() => "")}`);
          continue;
        }
        const data = await res.json();
        answer = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? "").join("").trim();
        if (answer) break;
      } catch (e) {
        console.error(`[chat] Gemini ${model} threw:`, e);
      }
    }
  }

  if (!answer) return NextResponse.json({ error: "Tutor unavailable. Please try again." }, { status: 500 });

  const { answer: cleanAnswer, suggestions } = splitAnswerAndSuggestions(answer);

  // Persist messages asynchronously (don't block response)
  db.from("pdf_chat_messages").insert([
    { pdf_id: params.pdfId, slide_id: slideId ?? null, user_id: user.id, role: "user",      content: question },
    { pdf_id: params.pdfId, slide_id: slideId ?? null, user_id: user.id, role: "assistant", content: cleanAnswer },
  ]).then(({ error }) => { if (error) console.error("Chat persist error:", error); });

  return NextResponse.json({ answer: cleanAnswer, suggestions });
  } catch (e) {
    console.error("[chat] unhandled:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tutor failed" },
      { status: 500 }
    );
  }
}
