// POST /api/pdf/[pdfId]/summary
// Generate a structured summary for the entire PDF from its extracted text.
// Persists result back to pdf_documents.summary.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

export const maxDuration = 60;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY    = process.env.GEMINI_API_KEY;
const CLAUDE_MODEL      = "claude-haiku-4-5-20251001";
const CLAUDE_URL        = "https://api.anthropic.com/v1/messages";
const GEMINI_MODELS     = ["gemini-3.5-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
const geminiUrl         = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GEMINI_API_KEY}`;

const SUMMARY_SYSTEM = `You are PathoLearn, an expert medical educator.
Produce a structured study summary of this educational document for a medical student.
Be educational, concise, and clinically relevant.
Write in plain markdown only — NEVER use LaTeX or math delimiters ($…$) or backslash commands like \\ge, \\times, \\%. Use plain text and Unicode symbols (≥, ≤, ×, %, →); e.g. write "t(8;14)" and "≥20%", not "$t(8;14)$" or "$\\ge 20\\%$".`;

function buildSummaryPrompt(text: string, title: string): string {
  // Truncate text to ~12k chars to stay within token limits
  const truncated = text.length > 12_000
    ? text.slice(0, 12_000) + "\n\n[... document continues ...]"
    : text;

  return `Document title: "${title}"

EXTRACTED TEXT:
${truncated}

Produce a structured study summary in clear markdown with these sections:
## Overview
(2-3 sentences describing what this document covers)

## Key Topics Covered
(bullet list of main topics)

## High-Yield Facts
(5-10 bullet points a student must know)

## Clinical Pearls
(3-5 practice-relevant takeaways)

## Suggested Study Focus
(what to prioritise when reviewing this material)

Be concise and use medical terminology appropriately for a 3rd-year medical student.`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
) {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch PDF document (verify ownership)
  const { data: pdfDoc, error: fetchErr } = await db
    .from("pdf_documents")
    .select("id, title, extracted_text, summary")
    .eq("id", params.pdfId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !pdfDoc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Return cached summary if already generated
  if (pdfDoc.summary) return NextResponse.json({ summary: pdfDoc.summary });

  if (!pdfDoc.extracted_text) return NextResponse.json({ error: "No text extracted from this PDF" }, { status: 400 });

  const prompt = buildSummaryPrompt(pdfDoc.extracted_text, pdfDoc.title);
  let summary = "";

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
        max_tokens: 2048,
        system: SUMMARY_SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      summary = data?.content?.[0]?.text?.trim() ?? "";
    }
  }

  if (!summary && GEMINI_API_KEY) {
    for (const model of GEMINI_MODELS) {
      const res = await fetch(geminiUrl(model), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SUMMARY_SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      summary = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p?.text ?? "").join("").trim();
      if (summary) break;
    }
  }

  if (!summary) return NextResponse.json({ error: "Summary generation failed" }, { status: 500 });

  // Persist summary
  await db.from("pdf_documents").update({ summary }).eq("id", params.pdfId);

  return NextResponse.json({ summary });
}
