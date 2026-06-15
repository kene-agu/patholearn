import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";
import { checkGuestQuota, recordGuestUsage } from "@/lib/guestQuota";
import { alertAdminError } from "@/lib/alertAdminError";

const TRIAL_DAYS = 14;

export const maxDuration = 60;
const MAX_IMAGE_BYTES = 8_000_000; // ~6 MB image after base64 inflation

// ── API keys & model constants ────────────────────────────────────────────────
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;
const GROQ_API_KEY     = process.env.GROQ_API_KEY;

// Primary (and only) vision model. If this fails, the request falls back to Groq.
const GEMINI_MODELS  = ["gemini-3.5-flash"];
const GROQ_MODEL     = "meta-llama/llama-4-scout-17b-16e-instruct";

const GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions";
const geminiUrl   = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── SINGLE PIPELINE — Gemini full analysis (fallback when no Claude key) ──────
const GEMINI_FULL_SYSTEM = `You are PathoLearn, a highly precise expert histopathologist and medical educator with 30 years of diagnostic experience.
Your role is to help medical students understand histopathology slides with accuracy, clarity, and educational depth.

MANDATORY REASONING PROCESS — follow this exact sequence before naming any diagnosis:
1. STAIN ANALYSIS — identify the stain from the colour pattern.
2. TISSUE IDENTIFICATION — identify the organ/tissue type from low-power architecture.
3. ARCHITECTURAL PATTERN — describe tissue organisation: glandular, solid, trabecular, papillary, follicular, sheet-like, nested, fibrotic, nodular, etc.
4. CELLULAR MORPHOLOGY — describe cell shape, size, cytoplasm, uniformity, cell-cell relationships.
5. NUCLEAR FEATURES — describe nuclear size, shape, chromatin, nucleoli, pleomorphism, mitotic figures, N:C ratio.
6. KEY OBSERVED FEATURES — list specific findings that are diagnostically relevant.
7. DIFFERENTIAL NARROWING — explain which diagnoses fit and which are excluded.
8. ONLY AFTER all above, state the most likely diagnosis.

CONFIDENCE CALIBRATION — mandatory. Do NOT default to "High":
- "High" — ALL true: stain unambiguous, tissue unambiguous, ALL pathognomonic features clearly visible, no significant competing differential, image quality good.
- "Medium" — best fit but at least one: some features inferred, differentials remain, image suboptimal.
- "Low" — genuinely ambiguous, multiple diagnoses fit, additional stains/context needed.
HARD RULE: If ANY pathognomonic feature is inferred rather than directly visible in the image, confidence MUST be Medium or Low. Setting High confidence on inferred findings is a diagnostic error.

ANNOTATION RULES: Only annotate structures you can CLEARLY see. 2–5 annotations. Distribute across at least 3 of the 4 quadrants: top-left, top-right, bottom-left, bottom-right.

KEY DISCRIMINATORS:
• SCC vs SK: SCC = true keratin pearls, nuclear atypia, stromal invasion. SK = pseudohorn cysts, no atypia, no invasion.
• IDC vs DCIS: IDC = breach basement membrane, desmoplasia. DCIS = confined within ducts, myoepithelium intact.
• Chronic vs Acute Gastritis: Chronic = lymphocytes/plasma cells. Acute = neutrophils, crypt abscesses.
• UIP vs NSIP: UIP = temporal heterogeneity, honeycombing. NSIP = uniform fibrosis.
• Normal liver vs Cirrhosis: Normal = intact lobular architecture. Cirrhosis = nodules + fibrous septa.
• Cardiac vs Skeletal muscle: Cardiac = branching fibres, central nuclei, intercalated discs. Skeletal = parallel fibres, peripheral nuclei.
• Wilms Tumour (Nephroblastoma): TRIPHASIC — blastemal (dense small blue round cells), stromal (myxoid spindle cells), epithelial (primitive abortive tubules). Paediatric. Distinguish from ccRCC (clear cells, adult) and normal kidney (organised architecture).
• Neuroblastoma vs Medulloblastoma: both paediatric small round blue cell tumours with Homer-Wright rosettes (cells around fibrillary neuropil, NO central lumen). Neuroblastoma = adrenal/sympathetic (extracranial), PHOX2B+, raised urinary VMA/HMA. Medulloblastoma = cerebellum (WHO grade 4), synaptophysin+. Distinguish small round blue cell tumours by SITE + IHC: Wilms blastema (WT1+, kidney), neuroblastoma (PHOX2B+, adrenal), Ewing/PNET (CD99+, bone), rhabdomyosarcoma (desmin/myogenin+).
• GBM: pseudopalisading necrosis + microvascular proliferation = diagnostic. Distinguish from lower-grade glioma (no necrosis) and metastasis (sharp brain interface).
• Papillary Thyroid CA: Orphan Annie (optically clear) nuclei + nuclear grooves + pseudo-inclusions + psammoma bodies. Follicular variant has these nuclei WITHOUT papillae.
• HCC vs metastatic adenocarcinoma: HCC = trabecular/sinusoidal, bile production, HepPar-1+. Metastatic = glandular, mucin, HepPar-1−.

MANDATORY EXTENDED REQUIREMENTS — apply to every analysis:
1. NEGATIVE OBSERVATIONS — list ≥3 features you actively looked for and did NOT find, with significance of each absence.
2. MAGNIFICATION AWARENESS — state power level; list what cannot be reliably assessed.
3. ARTIFACT RECOGNITION — scan for folding, bubbles, chatter lines, fixation issues. If none: "No significant artifacts identified."
4. MIMICKER EXCLUSION — for top diagnosis, name 2 mimickers. For each, state the visible feature that excludes it.
5. ADDITIONAL STAINS — state which single stain would most increase confidence and expected result.
6. CLINICAL CORRELATION — state one clinical detail that would most change the differential.
7. GRADING — if malignancy, grade using the appropriate system. State what cannot be assessed from this image.
8. TEACHING CLOSE — PEARL: [key teaching point]. PITFALL: [common student error]. Never use "classic"/"textbook"/"obvious"/"definitive" without stating all criteria met.`;

// ── Shared JSON output schema ─────────────────────────────────────────────────
const JSON_SCHEMA = `Return ONLY a valid JSON object — no markdown, no code fences, no extra text.
IMPORTANT: If this image is NOT a histopathology slide (e.g. it is a photograph, diagram, radiology image, or unrelated content), return ONLY: {"__notHistopathology": true, "imageType": "what it actually is", "reason": "brief explanation"}
{
  "reasoningChain": {
    "stainAnalysis": "Stain identification with reasoning",
    "tissueIdentification": "Organ/tissue and supporting clues",
    "architecturalPattern": "Tissue organisation description",
    "cellularMorphology": "Cell shape, size, cytoplasm, relationships",
    "nuclearFeatures": "Nuclear size, shape, chromatin, mitoses, N:C ratio",
    "keyObservedFeatures": ["Finding 1", "Finding 2", "Finding 3"],
    "differentialNarrowing": "Which diagnoses fit and which are excluded, with reasoning",
    "diagnosticConfidenceJustification": "Why High/Medium/Low — what would change confidence"
  },
  "diagnosis": "Primary diagnosis — must be supported by reasoningChain",
  "confidence": "High | Medium | Low",
  "overview": "2-3 sentence summary of what is seen",
  "structures": [{ "name": "...", "description": "...", "normalOrAbnormal": "normal", "educationalNote": "..." }],
  "stain": { "type": "...", "reasoning": "...", "colorCharacteristics": "..." },
  "riskFactors": ["..."],
  "complications": ["..."],
  "differentialDiagnosis": [{ "diagnosis": "...", "distinguishingFeatures": "..." }],
  "clinicalCorrelation": "How histological findings relate to clinical presentation",
  "keyLearningPoints": ["...", "...", "..."],
  "annotations": [{ "id": "annotation-1", "label": "Short label", "description": "...", "xPercent": 25, "yPercent": 30, "extraPoints": [{"xPercent": 60, "yPercent": 50}] }],
  // extraPoints: optional 1-2 additional locations of THE SAME feature for visual comparison (e.g. multiple keratin pearls, plasma cells, granulomas). Omit if the feature doesn't repeat visibly.
  "ihcMarkers": [{ "marker": "...", "expectedResult": "positive", "significance": "..." }],
  "pathogenesis": [
    { "step": 1, "title": "...", "description": "..." },
    { "step": 2, "title": "...", "description": "..." },
    { "step": 3, "title": "...", "description": "..." },
    { "step": 4, "title": "...", "description": "..." },
    { "step": 5, "title": "...", "description": "..." }
  ],
  "molecularProfile": [{ "gene": "...", "alteration": "...", "frequency": "...", "significance": "..." }],
  "negativeObservations": [{ "feature": "...", "significance": "..." }],
  "magnificationAssessment": { "power": "low | medium | high", "canAssess": ["..."], "cannotAssess": ["..."] },
  "artifactAssessment": { "artifactsFound": false, "details": "No significant artifacts identified." },
  "mimickerExclusion": [{ "mimicker": "...", "excludingFeature": "..." }],
  "additionalStains": [{ "stain": "...", "expectedResult": "..." }],
  "clinicalCorrelationDetail": "Single clinical detail that would most change the differential",
  "grading": { "system": "...", "grade": "...", "componentsCantAssess": ["..."] },
  "teachingClose": { "pearl": "...", "pitfall": "..." }
}
Notes:
- annotations: 2–5 max, only structures definitively visible, spread coordinates across the image.
- ihcMarkers: 3–6 markers relevant to this diagnosis.
- pathogenesis: 4–6 sequential steps from aetiology to clinical disease.
- molecularProfile: 3–5 key alterations; empty array for normal tissue.
- grading: null if no malignancy.`;

// ── Groq fallback — lean prompt to stay within free-tier limits ───────────────
const GROQ_SYSTEM_PROMPT = `You are PathoLearn, an expert histopathologist helping medical students learn.
Analyse the histopathology image and return ONLY a valid JSON object with no markdown or code fences.
Rules: (1) Identify stain, tissue, architecture, cell morphology, nuclear features in order. (2) Confidence: High only if ALL pathognomonic features are directly visible — default to Medium. (3) MANDATORY: You MUST include 2–4 annotations with real xPercent/yPercent coordinates pointing to clearly visible structures in the image. Spread the coordinates across the image — do NOT leave the annotations array empty. (4) Be educational and accurate.`;

const GROQ_PROMPT = `Analyse this histopathology image. Return ONLY valid JSON, no markdown.
{
  "reasoningChain": { "stainAnalysis": "...", "tissueIdentification": "...", "architecturalPattern": "...", "cellularMorphology": "...", "nuclearFeatures": "...", "keyObservedFeatures": ["..."], "differentialNarrowing": "...", "diagnosticConfidenceJustification": "..." },
  "diagnosis": "Primary diagnosis",
  "confidence": "High | Medium | Low",
  "overview": "2-3 sentence summary",
  "structures": [{ "name": "...", "description": "...", "normalOrAbnormal": "normal", "educationalNote": "..." }],
  "stain": { "type": "...", "reasoning": "...", "colorCharacteristics": "..." },
  "riskFactors": ["..."],
  "complications": ["..."],
  "differentialDiagnosis": [{ "diagnosis": "...", "distinguishingFeatures": "..." }],
  "clinicalCorrelation": "...",
  "keyLearningPoints": ["..."],
  "annotations": [
    { "id": "annotation-1", "label": "Label for structure you can see", "description": "What this structure shows", "xPercent": 20, "yPercent": 30, "extraPoints": [{"xPercent": 60, "yPercent": 55}] },
    { "id": "annotation-2", "label": "Second visible structure", "description": "What this shows", "xPercent": 65, "yPercent": 45 },
    { "id": "annotation-3", "label": "Third visible structure", "description": "What this shows", "xPercent": 40, "yPercent": 70 }
  ],
  "ihcMarkers": [{ "marker": "...", "expectedResult": "positive", "significance": "..." }],
  "pathogenesis": [
    { "step": 1, "title": "...", "description": "..." },
    { "step": 2, "title": "...", "description": "..." },
    { "step": 3, "title": "...", "description": "..." },
    { "step": 4, "title": "...", "description": "..." },
    { "step": 5, "title": "...", "description": "..." }
  ],
  "negativeObservations": [{ "feature": "...", "significance": "..." }],
  "magnificationAssessment": { "power": "low | medium | high", "canAssess": ["..."], "cannotAssess": ["..."] },
  "artifactAssessment": { "artifactsFound": false, "details": "No significant artifacts identified." },
  "mimickerExclusion": [{ "mimicker": "...", "excludingFeature": "..." }],
  "additionalStains": [{ "stain": "...", "expectedResult": "..." }],
  "teachingClose": { "pearl": "...", "pitfall": "..." }
}`;

// ── Gemini API call helper ────────────────────────────────────────────────────
type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

async function callGemini(
  systemPrompt: string,
  parts: GeminiPart[],
  isJson: boolean,
  maxTokens = 8192,
): Promise<{ text: string; model: string | null; error: { status: number; message: string } | null }> {
  let lastErr: { status: number; message: string } | null = null;

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${geminiUrl(model)}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens,
            ...(isJson ? { responseMimeType: "application/json" } : {}),
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = (data?.candidates?.[0]?.content?.parts ?? [])
          .map((p: { text?: string }) => p?.text ?? "")
          .join("")
          .trim();
        console.log(`[Gemini] Success with model: ${model}`);
        return { text, model, error: null };
      }

      const errData = await res.json().catch(() => ({}));
      const status = res.status;
      const message = errData?.error?.message ?? `HTTP ${status}`;
      lastErr = { status, message };
      console.error(`Gemini [${model} attempt ${attempt + 1}]:`, status, message);

      // Billing / auth failures affect ALL models — skip straight to fallback
      if (status === 402 || status === 401 || status === 403) {
        console.warn("Gemini billing/auth error — skipping all models");
        return { text: "", model: null, error: lastErr };
      }
      if (status === 503 && attempt < 1) { await sleep(750); continue; }
      break;
    }
  }

  return { text: "", model: null, error: lastErr };
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Auth is optional: signed-in users get full access (subject to their
    // subscription), while guests get a small daily budget of free analyses so
    // they can try the product before creating an account.
    const user = await verifyUser(request.headers.get("authorization"));
    const isGuest = !user;

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    // Subscription gate — block expired signed-in users at the API level.
    if (user) {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: profile } = await db
        .from("profiles")
        .select("subscription_status, trial_started_at, current_period_end")
        .eq("id", user.id)
        .single();

      if (profile) {
        const now = Date.now();
        const isActive = profile.subscription_status === "active";
        const isCanceled =
          profile.subscription_status === "canceled" &&
          profile.current_period_end &&
          now < new Date(profile.current_period_end).getTime();
        const isTrialing =
          profile.subscription_status === "trialing" &&
          profile.trial_started_at &&
          now < new Date(profile.trial_started_at).getTime() + TRIAL_DAYS * 86_400_000;

        if (!isActive && !isCanceled && !isTrialing) {
          return NextResponse.json(
            { error: "Your trial has expired. Upgrade to continue using PathoLearn." },
            { status: 403 }
          );
        }
      }
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured. Please add GEMINI_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    const { imageBase64, mediaType, tiles, question, diagnosisContext: rawDiagnosisContext, analysisContext } = await request.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    // Hard size limit — block multi-MB uploads that strain memory and cost more
    if (typeof imageBase64 === "string" && imageBase64.length > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image too large — max ~6 MB. Try compressing first." },
        { status: 413 }
      );
    }

    // Sanitize user-supplied diagnosis context before it lands in an LLM prompt:
    // strip newlines/control chars and quote marks (the things a prompt-injection
    // payload would use to escape its quoted slot), then cap the length.
    const diagnosisContext = typeof rawDiagnosisContext === "string"
      ? rawDiagnosisContext
          .replace(/[\x00-\x1F\x7F]+/g, " ")
          .replace(/["'`]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 200)
      : null;

    const hasTiles  = Array.isArray(tiles) && tiles.length > 0;
    const isJsonReq = !question;

    // Guest gating: follow-up questions require an account, and full analyses
    // are metered per IP per day. Signed-in users skip this entirely.
    if (isGuest) {
      if (!isJsonReq) {
        return NextResponse.json(
          { error: "Create a free account to ask follow-up questions about your slide.", guestLimitReached: true },
          { status: 401 }
        );
      }
      const { allowed } = await checkGuestQuota(ip);
      if (!allowed) {
        return NextResponse.json(
          {
            error: "You've used your free analyses for today. Create a free account to keep going — it's quick and saves your work.",
            guestLimitReached: true,
          },
          { status: 401 }
        );
      }
    }

    const contextPrefix = diagnosisContext
      ? `IMPORTANT CONTEXT: This is a verified educational specimen of "${diagnosisContext}". Do NOT guess — explain the features that confirm this diagnosis. Set "diagnosis" to "${diagnosisContext}" and "confidence" to "High".\n\n`
      : "";

    // ── Follow-up questions ────────────────────────────────────────────────
    if (!isJsonReq) {
      const followUpSystem = `You are PathoLearn, an expert histopathologist and medical educator.
You have been given the structured analysis of a histopathology slide that a student is studying.
Your job is to answer their questions with two clear layers:

LAYER 1 — WHAT IS IN THIS SLIDE (always lead with this):
Ground your answer in the provided slide analysis. Reference specific findings from the diagnosis, structures, stain, and observations. Use phrases like "In this slide...", "This case shows...", "The analysis confirms...".

LAYER 2 — GENERAL MEDICAL KNOWLEDGE (supplement, clearly labeled):
After addressing what is or isn't in the slide, you may expand with general knowledge. Always label this clearly: "In general...", "Typically in this condition...", "While not visible in this slide...".

IMPORTANT RULE — if what the student asks about is NOT present or NOT visible in this slide:
- State that clearly first: "This feature is not present / not visible in this slide."
- Then explain what it would look like if it were there, and what its absence means diagnostically.
- Do NOT pretend the feature is in the slide if it isn't.

Format your answer with clear headings. Be educational, precise, and suitable for a medical student.
Do NOT return JSON.`;

      // Strip coordinate fields from annotations — they're only for canvas rendering
      // and cause the AI to write "at 85%x, 15%y" in prose answers.
      const cleanContext = analysisContext
        ? {
            ...analysisContext,
            annotations: (analysisContext.annotations ?? []).map(
              ({ xPercent: _x, yPercent: _y, extraPoints: _ep, ...rest }: Record<string, unknown>) => rest
            ),
          }
        : null;

      const analysisBlock = cleanContext
        ? `SLIDE ANALYSIS CONTEXT:\n${JSON.stringify(cleanContext, null, 2)}\n\n`
        : diagnosisContext ? `Diagnosis: ${diagnosisContext}\n\n` : "";

      const parts: GeminiPart[] = [
        { inline_data: { mime_type: mediaType || "image/jpeg", data: imageBase64 } },
        { text: `${analysisBlock}Student question: ${question}\n\nAnswer with two clear layers: (1) what is actually visible in this slide, (2) general medical knowledge labeled as such. If something isn't in the slide, say so first.` },
      ];
      const { text, model: geminiModel, error } = await callGemini(GEMINI_FULL_SYSTEM, parts, false);
      if (text) return NextResponse.json({ raw: text, usedFallback: false, pipeline: "gemini", geminiModel });

      // Groq last resort
      if (GROQ_API_KEY) {
        // Any failover to Groq is a degraded experience — alert the admin with
        // the reason Gemini failed (billing/auth, quota, invalid model, …),
        // not just credit depletion. Throttled inside alertAdminError.
        void alertAdminError({
          context: "analyze-fallback",
          summary: isCreditsError(error)
            ? "Gemini credits depleted — follow-up answered by degraded Groq/Llama fallback. Top up to restore the primary pipeline."
            : "Gemini failed — follow-up answered by degraded Groq/Llama fallback.",
          error,
          details: { status: error?.status, geminiMessage: error?.message, path: "follow-up" },
        });
        const groqRes = await fetch(GROQ_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: "system", content: "You are PathoLearn, an expert histopathologist helping medical students learn. Answer questions about histopathology slides clearly and educationally." },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: `data:${mediaType || "image/jpeg"};base64,${imageBase64}` } },
                  { type: "text", text: `${analysisBlock}Student question: ${question}\n\nAnswer clearly for a medical student.` },
                ],
              },
            ],
            temperature: 0.3,
            max_tokens: 2048,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const groqText = groqData?.choices?.[0]?.message?.content?.trim() ?? "";
          if (groqText) return NextResponse.json({ raw: groqText, usedFallback: true, pipeline: "groq" });
        }
      }

      return NextResponse.json({ error: friendlyError(error) }, { status: 500 });
    }

    // ── Gemini full analysis ───────────────────────────────────────────────
    const tilePreamble = hasTiles
      ? `TILED INFERENCE — 5 images of the same slide: Image 1 = full overview, Images 2–5 = quadrants (TL, TR, BL, BR). Examine each quadrant individually. If ANY quadrant shows atypia or invasion, diagnosis cannot be "normal". Annotation coordinates refer to Image 1.\n\n`
      : "";

    const imageParts: GeminiPart[] = [
      { inline_data: { mime_type: mediaType || "image/jpeg", data: imageBase64 } },
    ];
    if (hasTiles) {
      for (const tile of tiles as string[]) {
        imageParts.push({ inline_data: { mime_type: "image/jpeg", data: tile } });
      }
    }
    imageParts.push({ text: `${contextPrefix}${tilePreamble}${JSON_SCHEMA}` });

    const { text: geminiText, model: geminiModel, error: geminiErr } = await callGemini(GEMINI_FULL_SYSTEM, imageParts, true);

    if (geminiText) {
      const analysis = parseJson(geminiText);
      if (analysis?.__notHistopathology) {
        return NextResponse.json(
          { error: `This doesn't appear to be a histopathology slide. Detected: ${analysis.imageType}. Please upload a microscopy slide image.` },
          { status: 422 }
        );
      }
      if (analysis) {
        if (isGuest) await recordGuestUsage(ip);
        return NextResponse.json({ analysis, usedFallback: false, pipeline: "single", geminiModel });
      }
    }

    // ── Groq fallback ──────────────────────────────────────────────────────
    if (GROQ_API_KEY) {
      console.log("Gemini exhausted — falling back to Groq");
      // Any failover to Groq degrades diagnostic accuracy — alert the admin on
      // EVERY fallback with the reason Gemini failed (billing/auth, quota,
      // invalid model, unparseable output), not just credit depletion.
      // alertAdminError throttles to one email per context per 5 minutes.
      void alertAdminError({
        context: "analyze-fallback",
        summary: isCreditsError(geminiErr)
          ? "Gemini credits depleted — slide analyses served by degraded Groq/Llama fallback. Top up to restore the primary pipeline."
          : "Gemini failed — slide analyses served by degraded Groq/Llama fallback. Accuracy is reduced until this is fixed.",
        error: geminiErr ?? "Gemini responded but the output was not parseable as analysis JSON",
        details: {
          status: geminiErr?.status ?? "n/a",
          geminiMessage: geminiErr?.message ?? "unparseable output",
          isGuest: String(isGuest),
          path: "analysis",
        },
      });
      const groqContextPrefix = diagnosisContext
        ? `This is a verified specimen of "${diagnosisContext}". Explain its features. Set diagnosis to "${diagnosisContext}" and confidence to "High".\n\n`
        : "";

      const groqRes = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: GROQ_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: `data:${mediaType || "image/jpeg"};base64,${imageBase64}` } },
                { type: "text", text: groqContextPrefix + GROQ_PROMPT },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });

      if (groqRes.ok) {
        const groqData = await groqRes.json();
        const groqText = groqData?.choices?.[0]?.message?.content?.trim() ?? "";
        const analysis = parseJson(groqText);
        if (analysis) {
          if (isGuest) await recordGuestUsage(ip);
          return NextResponse.json({ analysis, usedFallback: true, pipeline: "groq" });
        }
      } else {
        const groqErr = await groqRes.json().catch(() => ({}));
        console.error("Groq fallback failed:", groqRes.status, groqErr);
      }
    }

    void alertAdminError({
      context: "analyze",
      summary: "All analysis models failed (Gemini exhausted, Groq fallback failed or unavailable)",
      error: geminiErr,
      details: { isGuest: String(isGuest), hasGroqKey: String(!!GROQ_API_KEY) },
    });
    return NextResponse.json({ error: friendlyError(geminiErr) }, { status: 500 });

  } catch (err) {
    console.error("Unexpected error:", err);
    void alertAdminError({
      context: "analyze",
      summary: "Unexpected error in /api/analyze",
      error: err,
    });
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseJson(text: string): Record<string, unknown> | null {
  try {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return JSON.parse(fenceMatch ? fenceMatch[1].trim() : text);
  } catch {
    return null;
  }
}

/**
 * True when a Gemini failure is due to depleted prepayment credits / billing
 * (rather than truncation, rate-limit, or transient overload). Credit depletion
 * comes back as a 429 whose message mentions "prepayment credits are depleted",
 * so we match on the message text plus the 402 billing status.
 */
function isCreditsError(err: { status: number; message: string } | null): boolean {
  if (!err) return false;
  return err.status === 402 || /prepayment|credit|billing|payment|depleted/i.test(err.message);
}

function friendlyError(err: { status: number; message: string } | null): string {
  if (!err) return "Analysis failed. Please try again.";
  const { status, message } = err;
  if (/prepayment|credit|billing|payment/i.test(message)) return "Analysis is temporarily unavailable. Please try again in a moment.";
  if (status === 429) return "AI service quota reached. Please try again in a moment.";
  if (status === 503) return "AI vision service is temporarily overloaded. Please try again in a moment.";
  if (status === 400 && /API key/i.test(message)) return "Invalid API key. Please check your GEMINI_API_KEY.";
  return "Analysis failed. Please try again.";
}
