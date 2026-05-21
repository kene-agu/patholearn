import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/userAuth";

export const maxDuration = 30;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const INFOGRAPHIC_SYSTEM = `You are an expert medical educator who creates clear, visually-structured educational infographics.
Your job is to restructure complex medical analyses into a concise, student-friendly visual layout.
Return ONLY valid JSON — no markdown, no code fences, no extra text.`;

const buildInfographicPrompt = (analysis: unknown) => `
You have received a structured medical/histopathology analysis. Restructure it into a flexible visual infographic.

RULES:
- Choose 3–5 relevant section headings based on the CONTENT (don't assume fixed histopath sections — adapt to whatever subject this is).
- For each section give a heading and 2–4 concise bullet points. Each bullet should be a complete, informative sentence — not a single word.
- Give a compelling title (the diagnosis or main topic), a short subtitle (1 line of context), one key fact (a memorable statistic or hallmark feature), and one clinical/practical pearl (the most important takeaway for a student).
- The infographic should read like a polished study card — precise, educational, and memorable.
- Avoid redundancy across sections.

Return ONLY this JSON structure:
{
  "title": "Primary diagnosis or main topic",
  "subtitle": "One-line context (tissue type, stain, or clinical setting)",
  "keyFact": "A single memorable fact, statistic, or hallmark feature a student must know",
  "pearl": "The single most important clinical or practical takeaway",
  "sections": [
    {
      "heading": "Section heading",
      "points": ["Bullet point 1 — complete sentence", "Bullet point 2 — complete sentence"]
    }
  ]
}

ANALYSIS TO RESTRUCTURE:
${JSON.stringify(analysis, null, 2)}
`.trim();

export async function POST(request: NextRequest) {
  try {
    // Auth check — consistent with all other PathoLearn API routes
    const user = await verifyUser(request.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Sign in to generate infographics." }, { status: 401 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { analysis } = body;

    if (!analysis || typeof analysis !== "object") {
      return NextResponse.json(
        { error: "No analysis provided." },
        { status: 400 }
      );
    }

    // Strip very large fields that aren't useful for the infographic
    // (e.g. raw base64 that somehow slipped in) to keep the prompt lean
    const sanitizedAnalysis = JSON.parse(JSON.stringify(analysis));
    delete sanitizedAnalysis.rawImageData;

    const prompt = buildInfographicPrompt(sanitizedAnalysis);

    const res = await fetch(`${geminiUrl}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: INFOGRAPHIC_SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const message = errData?.error?.message ?? `HTTP ${res.status}`;
      console.error("[infographic] Gemini error:", res.status, message);
      return NextResponse.json(
        { error: "Failed to generate infographic. Please try again." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const rawText: string = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text ?? "")
      .join("")
      .trim();

    if (!rawText) {
      return NextResponse.json(
        { error: "Empty response from AI. Please try again." },
        { status: 502 }
      );
    }

    // Parse — handle potential code fences defensively even with responseMimeType set
    let infographic: unknown;
    try {
      const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      infographic = JSON.parse(fenceMatch ? fenceMatch[1].trim() : rawText);
    } catch {
      console.error("[infographic] Failed to parse Gemini JSON:", rawText.slice(0, 200));
      return NextResponse.json(
        { error: "Failed to parse infographic data. Please try again." },
        { status: 502 }
      );
    }

    // Basic shape validation
    const inf = infographic as Record<string, unknown>;
    if (!inf.title || !Array.isArray(inf.sections) || inf.sections.length === 0) {
      return NextResponse.json(
        { error: "Infographic data is incomplete. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ infographic });
  } catch (err) {
    console.error("[infographic] Unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
