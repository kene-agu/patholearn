// AI models occasionally wrap notation in LaTeX (e.g. $t(8;14)$, $\ge 20\%$)
// even when told not to, and older cached content already contains it. The chat
// bubbles and summaries render plain markdown with no math plugin, so the raw $
// and backslash commands show literally. Strip the markup at render time so it
// displays as plain text — this fixes both new and already-cached content.

const LATEX_COMMANDS: [RegExp, string][] = [
  [/\\geq?(?![a-zA-Z])/g, "≥"],
  [/\\leq?(?![a-zA-Z])/g, "≤"],
  [/\\times(?![a-zA-Z])/g, "×"],
  [/\\div(?![a-zA-Z])/g, "÷"],
  [/\\pm(?![a-zA-Z])/g, "±"],
  [/\\rightarrow(?![a-zA-Z])/g, "→"],
  [/\\leftarrow(?![a-zA-Z])/g, "←"],
  [/\\to(?![a-zA-Z])/g, "→"],
  [/\\approx(?![a-zA-Z])/g, "≈"],
  [/\\neq(?![a-zA-Z])/g, "≠"],
  [/\\mu(?![a-zA-Z])/g, "µ"],
  [/\\alpha(?![a-zA-Z])/g, "α"],
  [/\\beta(?![a-zA-Z])/g, "β"],
  [/\\degree(?![a-zA-Z])/g, "°"],
  [/\\%/g, "%"],
  [/\\,/g, " "],
  [/\\ /g, " "],
];

export function stripMathMarkup(input: string): string {
  if (!input || (!input.includes("$") && !input.includes("\\"))) return input;

  let s = input;

  // Display math: $$…$$, \[…\], \(…\) → keep inner content
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, "$1");
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, "$1");

  // Inline $…$ → inner content. Require the opening $ to be followed by a
  // non-space and the closing $ preceded by a non-space (matched-pair heuristic),
  // and leave purely numeric/currency-like spans alone so "$5-$10" survives.
  s = s.replace(/\$(?!\s)([^$\n]*?)(?<!\s)\$/g, (m, inner: string) =>
    /^[\d\s.,:\-+/()]+$/.test(inner) ? m : inner
  );

  // \text{…}, \mathrm{…} etc. → inner content
  s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname)\{([^}]*)\}/g, "$1");

  for (const [re, rep] of LATEX_COMMANDS) s = s.replace(re, rep);

  // Drop any leftover lone backslash before a letter (e.g. an unmapped command)
  s = s.replace(/\\(?=[A-Za-z])/g, "");

  return s;
}
