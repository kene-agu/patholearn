import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

const TRIAL_DAYS = 14;

export const maxDuration = 60;
const MAX_IMAGE_BYTES = 8_000_000; // ~6 MB image after base64 inflation

// ── API keys & model constants ────────────────────────────────────────────────
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GROQ_API_KEY     = process.env.GROQ_API_KEY;

// Best → fastest → fallback. 2.5 Flash first (highest quality), 2.0 Flash second
// (unlimited RPD at Tier 1), 2.5 Flash Lite third (unlimited RPD, lighter).
const GEMINI_MODELS  = ["gemini-2.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite-preview-06-17", "gemini-1.5-flash"];
const CLAUDE_MODEL   = "claude-haiku-4-5-20251001";
const GROQ_MODEL     = "meta-llama/llama-4-scout-17b-16e-instruct"; // Only vision model on Groq

const GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions";
const CLAUDE_URL  = "https://api.anthropic.com/v1/messages";
const geminiUrl   = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── DUAL PIPELINE — Step 1: Gemini visual extraction ─────────────────────────
// Gemini only describes what it sees — no diagnosis, no reasoning.
const GEMINI_VISION_SYSTEM = `You are a visual feature extractor for histopathology images.
Your ONLY job is to describe exactly what you can see — stain colours, tissue architecture, cell morphology, nuclear features, artifacts, and magnification level.
Do NOT diagnose. Do NOT speculate. Only report direct visual observations as precisely as possible.
Return ONLY valid JSON — no markdown, no code fences.`;

const GEMINI_VISION_PROMPT = `Extract all visual observations from this histopathology image. Return ONLY valid JSON:
{
  "imageValidation": {
    "isHistopathology": true,
    "imageType": "histopathology slide | radiology | photograph | diagram | other",
    "reason": "Brief reason — what visual evidence confirms or denies this is a histopathology slide"
  },
  "stainType": "Stain identified from colours e.g. H&E, PAS, trichrome, IHC",
  "stainReasoning": "How you identified the stain from the colour pattern",
  "stainColors": "Key colours and what structures they highlight",
  "tissueType": "Organ/tissue type identified from architecture",
  "tissueClues": "Architectural clues that identify this tissue",
  "architecturalPattern": "Tissue organisation: glandular, solid, papillary, follicular, sheet-like, trabecular, fibrotic, nodular, etc.",
  "cellularMorphology": "Cell shape, size, cytoplasm character, uniformity vs pleomorphism, cell-cell relationships",
  "nuclearFeatures": "Nuclear size, shape, chromatin pattern, nucleoli prominence, mitotic figures count/quality, N:C ratio, pleomorphism degree",
  "keyVisibleFeatures": ["Specific feature directly visible 1", "Specific feature 2", "Specific feature 3", "Specific feature 4"],
  "magnificationEstimate": "low | medium | high",
  "magnificationClues": "Visual clues indicating this magnification level",
  "artifactsPresent": false,
  "artifactDetails": "No significant artifacts identified. OR: describe artifact type and how it differs from genuine pathology.",
  "notFoundFeatures": [
    { "feature": "Feature actively looked for but absent", "significance": "What its absence indicates diagnostically" },
    { "feature": "Second absent feature", "significance": "Diagnostic significance" },
    { "feature": "Third absent feature", "significance": "Diagnostic significance" }
  ],
  "suggestedAnnotations": [
    { "label": "Short label for structure", "description": "What this structure shows", "xPercent": 25, "yPercent": 30, "extraPoints": [{"xPercent": 65, "yPercent": 50}] },
    { "label": "Second structure label", "description": "What this structure shows", "xPercent": 60, "yPercent": 55 },
    { "label": "Third structure label", "description": "What this structure shows", "xPercent": 40, "yPercent": 75 }
  ]
}
NOTE on extraPoints: When the same feature appears in multiple locations (e.g. several keratin pearls, multiple plasma cells, repeated granulomas), add 1-2 extraPoints at those additional locations so students can compare instances of the same feature visually. extraPoints is optional — only add it when it genuinely helps comparison.
NOTE on annotation spread: Distribute annotations across at least 3 of the 4 image quadrants (top-left, top-right, bottom-left, bottom-right). Do not cluster all annotations in one region.`;

// ── DUAL PIPELINE — Step 2: Claude reasoning ──────────────────────────────────
// Claude receives Gemini's visual observations as text and applies expert reasoning.
const CLAUDE_REASONING_SYSTEM = `You are PathoLearn, a highly precise expert histopathologist and medical educator with 30 years of diagnostic experience.
You will receive structured visual observations extracted from a histopathology image by a vision model. You did NOT see the image directly — reason only from the observations provided. Your job is to apply expert medical reasoning to produce a complete, accurate educational analysis.

MANDATORY REASONING SEQUENCE — follow this order before naming any diagnosis:
1. Review the stain identification from the observations.
2. Confirm tissue type from the architectural observations.
3. Interpret the architectural pattern in diagnostic context.
4. Assess cellular and nuclear features for normality vs pathology.
5. List which diagnoses fit the observed features and which are excluded.
6. Only after the above, state the most likely diagnosis.

CONFIDENCE CALIBRATION — mandatory. Do NOT default to "High":
- "High" — ALL true: stain unambiguous, tissue unambiguous, ALL pathognomonic features directly reported, no significant competing differential, nuclear detail sufficient.
- "Medium" — best fit but: some features inferred, one or more differentials remain plausible, image quality suboptimal.
- "Low" — observations genuinely ambiguous, multiple diagnoses fit equally, additional stains/context needed.
HARD RULE: If ANY pathognomonic feature is inferred rather than explicitly present in the visual observations, confidence MUST be Medium or Low. Inferring = assuming a feature is present because it "should be" rather than because it was directly observed. Violating this rule is a diagnostic error.

KEY DISCRIMINATORS — apply rigorously:
• SCC vs Seborrhoeic Keratosis: SCC = true keratin pearls, nuclear atypia, stromal invasion, desmoplasia. SK = pseudohorn cysts, no atypia, no invasion, flat base.
• IDC vs DCIS: IDC = malignant glands breaching basement membrane, stromal desmoplasia. DCIS = malignant cells within intact ducts, myoepithelium present.
• Chronic vs Acute Gastritis: Chronic = lymphocytes/plasma cells, no neutrophils in crypts. Acute = neutrophils, crypt abscesses.
• UIP vs NSIP: UIP = temporal heterogeneity, fibroblastic foci, honeycombing. NSIP = uniform fibrosis, no honeycombing.
• Normal liver vs Cirrhosis: Normal = regular hepatic cords, intact lobular architecture. Cirrhosis = regenerative nodules, fibrous septa.
• Crescentic GN vs Membranous GN: Crescentic = cellular crescents in Bowman's space. Membranous = GBM thickening, spikes.
• Cardiac vs Skeletal muscle: Cardiac = branching fibres, central nuclei, intercalated discs. Skeletal = parallel fibres, peripheral nuclei.
• Follicular adenoma vs carcinoma: Cannot distinguish without capsular/vascular invasion.
• Wilms Tumour (Nephroblastoma) vs Normal Kidney vs ccRCC: Wilms = TRIPHASIC (blastemal component = small dense blue round cells in sheets; stromal component = loose myxoid spindle cells; epithelial component = primitive abortive tubules/glomeruloid structures), disorganised architecture, paediatric. ccRCC = clear lipid-rich cytoplasm, sinusoidal vasculature, adult. Normal kidney = organised glomeruli and tubules, no blastemal cells.
• GBM vs Lower-grade Glioma vs Metastasis: GBM = pseudopalisading necrosis + microvascular proliferation + nuclear pleomorphism, IDH wildtype. Lower-grade astrocytoma = no necrosis, IDH mutant. Metastasis = sharp tumour-brain interface, no infiltrating margin, unknown primary.
• Papillary Thyroid CA vs Follicular Thyroid CA vs Normal Thyroid: PTC = optically clear nuclei (Orphan Annie eyes), nuclear grooves, pseudo-inclusions, psammoma bodies, papillary architecture. FTC = follicular pattern, capsular/vascular invasion required for diagnosis, lacks PTC nuclei. Normal = regular follicles, homogeneous colloid, flat epithelium.
• Meningioma vs Schwannoma: Meningioma = whorls, psammoma bodies, EMA+, PR+. Schwannoma = Antoni A (palisading = Verocay bodies) + Antoni B (loose), S100+.
• Hepatocellular Carcinoma vs Metastatic Adenocarcinoma: HCC = trabecular/sinusoidal pattern, bile production, HepPar-1+, AFP variable. Metastatic adenocarcinoma = glandular pattern, mucin, CK7+ or CK20+, HepPar-1−.

MANDATORY EXTENDED REQUIREMENTS — apply to every analysis:
1. NEGATIVE OBSERVATIONS — list at least 3 features from the observations that were NOT found, with diagnostic significance of each absence.
2. MAGNIFICATION AWARENESS — state power level; list features that cannot be reliably assessed at this magnification.
3. ARTIFACT RECOGNITION — based on the artifact observations provided, note any artifacts and distinguish from pathology. If none: "No significant artifacts identified."
4. MIMICKER EXCLUSION — for your top diagnosis, name 2 conditions it could be confused with. For each, state the specific observation that excludes it.
5. ADDITIONAL STAINS — state which single ancillary stain would most increase diagnostic confidence and what result you expect.
6. CLINICAL CORRELATION — state one clinical detail that would most change your differential.
7. GRADING — if malignancy suggested, grade using the appropriate system. State which components cannot be assessed from the observations alone.
8. TEACHING CLOSE — end with: PEARL: [most important teaching point]. PITFALL: [most common student error]. FORBIDDEN: never use "classic", "textbook", "obvious", or "definitive" without stating all criteria met.

ANNOTATION RULES: Only annotate structures explicitly confirmed in the visual observations. 2–5 annotations maximum. Spread coordinates across the image.`;

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
): Promise<{ text: string; error: { status: number; message: string } | null }> {
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
        return { text, error: null };
      }

      const errData = await res.json().catch(() => ({}));
      const status = res.status;
      const message = errData?.error?.message ?? `HTTP ${status}`;
      lastErr = { status, message };
      console.error(`Gemini [${model} attempt ${attempt + 1}]:`, status, message);

      // Billing / auth failures affect ALL models — skip straight to fallback
      if (status === 402 || status === 401 || status === 403) {
        console.warn("Gemini billing/auth error — skipping all models");
        return { text: "", error: lastErr };
      }
      if (status === 503 && attempt < 1) { await sleep(750); continue; }
      break;
    }
  }

  return { text: "", error: lastErr };
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Auth — every analyze call must come from a signed-in user.
    // Prevents unauthenticated abuse that would burn AI tokens.
    const user = await verifyUser(request.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Sign in to analyze slides." }, { status: 401 });
    }

    // Subscription gate — block expired users at the API level.
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

      // Try Claude first (text only — no image tokens)
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
            max_tokens: 2048,
            system: followUpSystem,
            messages: [{ role: "user", content: `${analysisBlock}Student question: ${question}` }],
          }),
        });

        if (claudeRes.ok) {
          const claudeData = await claudeRes.json();
          const claudeText = claudeData?.content?.[0]?.text?.trim() ?? "";
          if (claudeText) return NextResponse.json({ raw: claudeText, usedFallback: false, pipeline: "claude" });
        }
      }

      // Claude unavailable — try Gemini with image
      const parts: GeminiPart[] = [
        { inline_data: { mime_type: mediaType || "image/jpeg", data: imageBase64 } },
        { text: `${analysisBlock}Student question: ${question}\n\nAnswer with two clear layers: (1) what is actually visible in this slide, (2) general medical knowledge labeled as such. If something isn't in the slide, say so first.` },
      ];
      const { text, error } = await callGemini(GEMINI_FULL_SYSTEM, parts, false);
      if (text) return NextResponse.json({ raw: text, usedFallback: false, pipeline: "gemini" });

      // Groq last resort
      if (GROQ_API_KEY) {
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

    // ── Main analysis: dual pipeline (Gemini vision → Claude reasoning) ────
    if (ANTHROPIC_API_KEY) {
      const result = await runDualPipeline({ imageBase64, mediaType, tiles, hasTiles, diagnosisContext, contextPrefix });
      if (result?.__notHistopathology) {
        return NextResponse.json(
          { error: `This doesn't appear to be a histopathology slide. Detected: ${result.imageType}. Please upload a microscopy slide image.` },
          { status: 422 }
        );
      }
      if (result) return NextResponse.json({ analysis: result, usedFallback: false, pipeline: "dual" });
      // Dual pipeline failed — fall through to single pipeline
      console.warn("Dual pipeline failed — falling back to single Gemini");
    }

    // ── Single pipeline: Gemini full analysis ──────────────────────────────
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

    const { text: geminiText, error: geminiErr } = await callGemini(GEMINI_FULL_SYSTEM, imageParts, true);

    if (geminiText) {
      const analysis = parseJson(geminiText);
      if (analysis?.__notHistopathology) {
        return NextResponse.json(
          { error: `This doesn't appear to be a histopathology slide. Detected: ${analysis.imageType}. Please upload a microscopy slide image.` },
          { status: 422 }
        );
      }
      if (analysis) return NextResponse.json({ analysis, usedFallback: false, pipeline: "single" });
    }

    // ── Groq fallback ──────────────────────────────────────────────────────
    if (GROQ_API_KEY) {
      console.log("Gemini exhausted — falling back to Groq");
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
        if (analysis) return NextResponse.json({ analysis, usedFallback: true, pipeline: "groq" });
      } else {
        const groqErr = await groqRes.json().catch(() => ({}));
        console.error("Groq fallback failed:", groqRes.status, groqErr);
      }
    }

    return NextResponse.json({ error: friendlyError(geminiErr) }, { status: 500 });

  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}

// ── Dual pipeline ─────────────────────────────────────────────────────────────
async function runDualPipeline({
  imageBase64, mediaType, tiles, hasTiles, diagnosisContext, contextPrefix,
}: {
  imageBase64: string;
  mediaType: string;
  tiles: string[];
  hasTiles: boolean;
  diagnosisContext: string | null;
  contextPrefix: string;
}): Promise<Record<string, unknown> | null> {
  try {
    // Step 1 — Gemini: visual extraction (overview image only — tiles would
    // double the payload and latency; Claude's reasoning compensates for detail).
    const visionParts: GeminiPart[] = [
      { inline_data: { mime_type: mediaType || "image/jpeg", data: imageBase64 } },
      { text: GEMINI_VISION_PROMPT },
    ];

    // 2048 tokens is plenty for the visual JSON; keeps this step fast.
    const { text: visionText, error: visionErr } = await callGemini(GEMINI_VISION_SYSTEM, visionParts, true, 2048);
    if (!visionText) {
      console.warn("Gemini vision step failed:", visionErr);
      return null;
    }

    // Parse Gemini's visual observations
    const observations = parseJson(visionText);
    if (!observations) {
      console.warn("Gemini vision step returned unparseable JSON");
      return null;
    }

    // Graceful failure — reject non-histopathology images early
    if (observations.imageValidation?.isHistopathology === false) {
      return {
        __notHistopathology: true,
        imageType: observations.imageValidation?.imageType ?? "unknown",
        reason: observations.imageValidation?.reason ?? "",
      };
    }

    // Step 2 — Claude: reasoning on Gemini's observations
    const diagnosisNote = diagnosisContext
      ? `\nNOTE: This is a verified educational specimen of "${diagnosisContext}". Set "diagnosis" to "${diagnosisContext}" and "confidence" to "High". Focus on explaining the features that confirm this diagnosis.\n`
      : "";

    const claudeUserMessage = `${diagnosisNote}
VISUAL OBSERVATIONS FROM GEMINI IMAGE ANALYSIS:
${JSON.stringify(observations, null, 2)}

IMPORTANT — ANNOTATIONS: Gemini has suggested annotation coordinates above in "suggestedAnnotations". Use those exact xPercent/yPercent values for your annotations array. Assign each an "id" like "annotation-1", "annotation-2", etc. Do not invent new coordinates.

Based solely on these visual observations, apply expert histopathological reasoning to produce the full educational analysis.

${JSON_SCHEMA}`;

    const claudeRes = await fetch(CLAUDE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 8192,
        system: CLAUDE_REASONING_SYSTEM,
        messages: [{ role: "user", content: claudeUserMessage }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json().catch(() => ({}));
      console.warn("Claude reasoning step failed:", claudeRes.status, err);
      return null;
    }

    const claudeData = await claudeRes.json();
    const claudeText = claudeData?.content?.[0]?.text?.trim() ?? "";
    const analysis = parseJson(claudeText);
    if (!analysis) {
      console.warn("Claude returned unparseable JSON");
      return null;
    }

    return analysis;
  } catch (err) {
    console.error("Dual pipeline threw:", err);
    return null;
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

function friendlyError(err: { status: number; message: string } | null): string {
  if (!err) return "Analysis failed. Please try again.";
  const { status, message } = err;
  if (/prepayment|credit|billing|payment/i.test(message)) return "Analysis is temporarily unavailable. Please try again in a moment.";
  if (status === 429) return "AI service quota reached. Please try again in a moment.";
  if (status === 503) return "AI vision service is temporarily overloaded. Please try again in a moment.";
  if (status === 400 && /API key/i.test(message)) return "Invalid API key. Please check your GEMINI_API_KEY.";
  return "Analysis failed. Please try again.";
}
