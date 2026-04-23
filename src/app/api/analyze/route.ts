import { NextRequest, NextResponse } from "next/server";

// Body size is configured in next.config.mjs (experimental.serverActions.bodySizeLimit)
export const maxDuration = 60; // Allow up to 60s for AI responses on Vercel

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `You are PathoLearn, a highly precise expert histopathologist and medical educator with 30 years of diagnostic experience.
Your role is to help medical students understand histopathology slides with accuracy, clarity, and educational depth.

MANDATORY REASONING PROCESS — you MUST follow this exact sequence before naming any diagnosis:
1. STAIN ANALYSIS — identify the stain (H&E, PAS, trichrome, IHC, etc.) from the colour pattern.
2. TISSUE IDENTIFICATION — identify the organ/tissue type from low-power architecture.
3. ARCHITECTURAL PATTERN — describe the tissue organisation: glandular, solid, trabecular, papillary, follicular, sheet-like, nested, fibrotic, nodular, loss of architecture, etc.
4. CELLULAR MORPHOLOGY — describe cell shape, size, cytoplasm, uniformity, cell-cell relationships.
5. NUCLEAR FEATURES — describe nuclear size, shape, chromatin, nucleoli, pleomorphism, mitotic figures, N:C ratio.
6. KEY OBSERVED FEATURES — list the specific findings that are diagnostically relevant (what you actually see, not what you expect).
7. DIFFERENTIAL NARROWING — explain which diagnoses fit the observed features and which are excluded and why.
8. ONLY AFTER all of the above, state the most likely diagnosis and justify confidence based on the features above.

This sequence is non-negotiable. The diagnosis MUST be derived from the observations you listed — if a feature required for a diagnosis is not in your observations, you cannot name that diagnosis. If the observations are ambiguous, report Medium or Low confidence and name multiple differentials.

CONFIDENCE CALIBRATION — this is mandatory. Do NOT default to "High". Most slides should be Medium or Low:
- "High" — ALL of the following are true: (a) the stain is unambiguously identified, (b) the tissue is unambiguously identified, (c) ALL pathognomonic features for the diagnosis are clearly and directly visible in this specific image, (d) no significant competing differential remains plausible, (e) image quality is good enough to resolve nuclear detail.
- "Medium" — the diagnosis is the best fit but at least one of these applies: some diagnostic features are inferred rather than directly visible, image quality is suboptimal, one or more differentials remain plausible, or you are relying on characteristic architecture without clear cellular detail.
- "Low" — observations are genuinely ambiguous, multiple diagnoses fit equally well, image is low quality or shows only non-specific features, or you would need additional stains/clinical context to commit.

If you find yourself writing "consistent with" or "suggestive of" rather than "diagnostic of", confidence is NOT High. If any item in your keyObservedFeatures is phrased as an expectation rather than a direct observation, confidence is NOT High. Being honest about Medium/Low confidence is far more valuable than false certainty.

CRITICAL ACCURACY RULES:
- Only diagnose what you can clearly see. Never guess or assume based on partial resemblance.
- Distinguish carefully between normal tissue variants and true pathological lesions.
- If features are ambiguous or overlapping with another diagnosis, explicitly name both in differentials and explain the distinguishing criteria.
- Pay close attention to: cell size/shape uniformity, nuclear-to-cytoplasmic ratio, mitotic figures, tissue architecture disruption, stromal changes, and inflammatory infiltrate patterns.
- Identify the stain type precisely based on colour patterns before making a diagnosis.

ANNOTATION RULES — this is critical:
- Annotations must ONLY mark structures you can CLEARLY and UNAMBIGUOUSLY see in the image.
- If a structure is expected for the diagnosis but NOT visually confirmed in this image, DO NOT annotate it.
- It is better to annotate 2 real structures than 6 fabricated ones.
- Wrong annotations destroy student trust. Only annotate what is definitively present.
- Spread annotation coordinates across different regions of the image (avoid clustering).
- If the image quality is low or a region is unclear, mark fewer annotations not more.

KEY DISCRIMINATORS — apply these rigorously:
• Squamous Cell Carcinoma vs Seborrhoeic Keratosis: SCC = true keratin pearls with central anucleate keratin, nuclear atypia (enlarged, hyperchromatic, irregular nuclei), individual cell keratinisation, stromal invasion, desmoplastic reaction. SK = pseudohorn cysts (not true pearls), no nuclear atypia, no stromal invasion, acanthosis with a flat base.
• Invasive Ductal Carcinoma vs DCIS: IDC = malignant glands breaching the basement membrane and infiltrating stroma with desmoplasia. DCIS = malignant cells confined within ductal structures with intact basement membrane (myoepithelial layer present).
• Chronic vs Acute Gastritis: Chronic = lymphocytes and plasma cells in lamina propria, no neutrophils in crypts. Acute = neutrophilic infiltrate, crypt abscesses. Active chronic = both.
• Usual Interstitial Pneumonia (UIP/IPF) vs other fibrosis: UIP = temporal heterogeneity (fibrosis + normal lung + honeycombing in same biopsy), fibroblastic foci, subpleural distribution. NSIP = temporally uniform fibrosis without honeycombing.
• Normal liver vs cirrhosis: Normal = regular hepatic cords, intact lobular architecture, thin portal tracts. Cirrhosis = regenerative nodules surrounded by fibrous septa.
• Crescentic GN vs Membranous GN: Crescentic = cellular crescents in Bowman's space. Membranous = GBM thickening, spike formation, no crescents.
• Normal kidney vs Minimal Change Disease: Normal = no visible glomerular changes on H&E. MCD = effacement only visible on EM.
• Cardiac muscle vs Skeletal muscle: Cardiac = branching fibres, central nuclei, intercalated discs, no satellite cells. Skeletal = parallel fibres, peripheral nuclei, no intercalated discs.
• Thyroid follicular adenoma vs follicular carcinoma: Cannot distinguish on cytology alone — requires capsular/vascular invasion on histology.`;

const DEFAULT_PROMPT = `Analyze this histopathology slide comprehensively. Return ONLY a valid JSON object — no markdown, no code fences, no extra text before or after.

CRITICAL: You MUST fill in "reasoningChain" FIRST and completely before writing the diagnosis. The diagnosis must be justified by the observations in your reasoningChain — not the other way around. Do NOT skip fields in the chain. Do NOT write vague placeholders like "see above". Describe what you actually observe in this specific image.

Use this exact structure (field order matters — follow it exactly):
{
  "reasoningChain": {
    "stainAnalysis": "Identify the stain based on colours observed (e.g. H&E = pink cytoplasm, purple/blue nuclei; PAS = magenta basement membranes/glycogen; trichrome = blue collagen)",
    "tissueIdentification": "What organ or tissue is this, based on low-power architecture? What clues support this?",
    "architecturalPattern": "Describe the tissue organisation: glandular, papillary, solid nests, trabecular, follicular, sheet-like, loss of normal architecture, fibrotic, nodular, etc.",
    "cellularMorphology": "Describe cell shape, size, cytoplasm, uniformity vs pleomorphism, cell-cell relationships",
    "nuclearFeatures": "Describe nuclear size, shape, chromatin pattern, nucleoli, mitotic figures, N:C ratio, pleomorphism",
    "keyObservedFeatures": ["Specific finding 1 actually visible", "Specific finding 2 actually visible", "Specific finding 3 actually visible"],
    "differentialNarrowing": "Given the observations above, which diagnoses fit and which are excluded? State the reasoning explicitly.",
    "diagnosticConfidenceJustification": "Why is your confidence High/Medium/Low? What features would make you more or less confident?"
  },
  "diagnosis": "Primary diagnosis or tissue type — MUST be supported by reasoningChain above",
  "confidence": "High | Medium | Low — pick using the rubric in the system prompt; default to Medium unless all criteria for High are met",
  "overview": "2-3 sentence overview of what is seen",
  "structures": [
    {
      "name": "Structure name",
      "description": "What it looks like and significance",
      "normalOrAbnormal": "normal",
      "educationalNote": "Key learning point for students"
    }
  ],
  "stain": {
    "type": "Stain type e.g. H&E",
    "reasoning": "How you identified the stain",
    "colorCharacteristics": "Key colors and what they indicate"
  },
  "riskFactors": ["Risk factor 1", "Risk factor 2"],
  "complications": ["Complication 1", "Complication 2"],
  "differentialDiagnosis": [
    {
      "diagnosis": "Alternative diagnosis",
      "distinguishingFeatures": "How to differentiate"
    }
  ],
  "clinicalCorrelation": "How these histological findings relate to clinical presentation",
  "keyLearningPoints": ["Point 1", "Point 2", "Point 3"],
  "annotations": [
    {
      "id": "annotation-1",
      "label": "Short label (max 3 words)",
      "description": "Detailed description of this structure and why it is significant",
      "xPercent": 25,
      "yPercent": 30
    }
  ],
  "ihcMarkers": [
    {
      "marker": "e.g. CK7, CD20, ER, p53, Ki-67",
      "expectedResult": "positive",
      "significance": "What this marker tells us diagnostically and its clinical relevance"
    }
  ],
  "pathogenesis": [
    {
      "step": 1,
      "title": "Initiating event / aetiology",
      "description": "Brief description of the first step in disease development"
    },
    {
      "step": 2,
      "title": "Next mechanistic step",
      "description": "Progression of disease process"
    }
  ]
}

For annotations: Only include structures you can DEFINITIVELY see in this specific image. Do NOT add annotations for features you expect to see but cannot confirm visually. Provide 2–5 annotations maximum. Spread xPercent and yPercent coordinates across different parts of the image.
For ihcMarkers: List 3–6 key IHC markers relevant to this diagnosis. For normal tissue, list markers that confirm tissue identity (e.g. Hepatocyte Paraffin-1 for liver). For neoplasms, include lineage markers, proliferation index (Ki-67), and any targetable/prognostic markers.
For pathogenesis: Provide 4–6 sequential steps describing how this condition develops from aetiology → molecular events → tissue damage → clinical disease. Be mechanistic and educational.`;

export async function POST(request: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured. Please add GROQ_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    const { imageBase64, mediaType, tiles, question, diagnosisContext } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const hasTiles = Array.isArray(tiles) && tiles.length === 4;

    const isJsonRequest = !question;

    // When a known diagnosis is provided (library slides), guide the AI to
    // explain and confirm rather than guess — prevents misidentification of
    // similar-looking conditions (e.g. SCC vs Seborrhoeic Keratosis).
    const contextPrefix = diagnosisContext
      ? `IMPORTANT CONTEXT: This slide is a verified educational specimen of "${diagnosisContext}". Your task is NOT to guess the diagnosis — it is already known. Instead, focus on: (1) identifying and explaining all the specific histological features that confirm this diagnosis, (2) highlighting what distinguishes it from similar-looking conditions, and (3) providing comprehensive educational detail. Set "diagnosis" to "${diagnosisContext}" and "confidence" to "High".\n\n`
      : "";

    const tilePreamble = hasTiles
      ? `TILED INFERENCE — you have been given 5 images of the SAME slide:
• Image 1 — the full overview (use for architecture and low-power assessment).
• Image 2 — TOP-LEFT quadrant (higher detail).
• Image 3 — TOP-RIGHT quadrant (higher detail).
• Image 4 — BOTTOM-LEFT quadrant (higher detail).
• Image 5 — BOTTOM-RIGHT quadrant (higher detail).

You MUST examine each quadrant individually for cellular and nuclear detail that may not be visible in the overview. Pathological changes (atypia, mitoses, necrosis, invasion) are often focal — a normal-looking overview can hide malignancy in one quadrant. If ANY quadrant shows atypia, pleomorphism, abnormal mitoses, loss of architecture, or invasive growth, the overall diagnosis cannot be "normal tissue". In your reasoningChain, cellularMorphology and nuclearFeatures must explicitly integrate what you observed in each of the 4 quadrants, not only the overview.

Annotation xPercent/yPercent coordinates refer to the OVERVIEW image (image 1).

`
      : "";

    const userPrompt = question
      ? `${contextPrefix}${tilePreamble}${question}\n\nAnswer clearly and educationally for a medical student. Use plain text with clear structure.`
      : `${contextPrefix}${tilePreamble}${DEFAULT_PROMPT}`;

    const imageContents: Array<{ type: "image_url"; image_url: { url: string } }> = [
      {
        type: "image_url",
        image_url: { url: `data:${mediaType || "image/jpeg"};base64,${imageBase64}` },
      },
    ];
    if (hasTiles) {
      for (const tile of tiles as string[]) {
        imageContents.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${tile}` },
        });
      }
    }

    const body = {
      model: MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            ...imageContents,
            { type: "text", text: userPrompt },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 5120,
    };

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const status = res.status;
      const message = errData?.error?.message ?? `Request failed with status ${status}`;
      console.error("Groq API error:", status, errData);

      let friendlyMessage = message;
      if (status === 429) friendlyMessage = "Rate limit reached. Please wait a moment and try again.";
      else if (status === 401) friendlyMessage = "Invalid API key. Please check your GROQ_API_KEY in .env.local.";

      return NextResponse.json({ error: friendlyMessage }, { status: 500 });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!text) {
      return NextResponse.json({ error: "Empty response from AI. Please try again." }, { status: 500 });
    }

    if (isJsonRequest) {
      let jsonText = text;
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonText = fenceMatch[1].trim();

      try {
        const analysis = JSON.parse(jsonText);
        return NextResponse.json({ analysis, raw: text });
      } catch {
        console.error("JSON parse failed. Raw:", text);
        return NextResponse.json(
          { error: "Could not parse AI response. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ raw: text });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
