import type { AnalysisResult } from "@/types/analysis";

// Dynamically imported to avoid SSR issues
async function getJsPDF() {
  const { jsPDF } = await import("jspdf");
  return jsPDF;
}

const PRIMARY  = [37, 99, 235]  as [number, number, number]; // blue-600
const PURPLE   = [124, 58, 237] as [number, number, number]; // violet-600
const SLATE900 = [15, 23, 42]   as [number, number, number];
const SLATE600 = [71, 85, 105]  as [number, number, number];
const SLATE400 = [148, 163, 184] as [number, number, number];
const WHITE    = [255, 255, 255] as [number, number, number];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

export async function exportAnalysisPdf(
  analysis: AnalysisResult,
  imageUrl: string | null,
  slideLabel: string | null,
  analyzedAt?: string,
) {
  const JsPDF = await getJsPDF();
  const doc = new JsPDF({ unit: "mm", format: "a4" });

  let y = 0;

  const addPage = () => { doc.addPage(); y = MARGIN; };

  const checkY = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) addPage();
  };

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, PAGE_W, 28, "F");

  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PathoLearn", MARGIN, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("AI-Powered Histopathology Analysis", MARGIN, 18);

  const dateStr = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.text(dateStr, PAGE_W - MARGIN, 18, { align: "right" });

  y = 36;

  // ── Slide image ──────────────────────────────────────────────────────────
  if (imageUrl) {
    try {
      const imgData = await fetchImageAsDataUrl(imageUrl);
      const imgH = 55;
      doc.addImage(imgData, "JPEG", MARGIN, y, CONTENT_W, imgH, undefined, "MEDIUM");
      y += imgH + 4;
    } catch {
      // image load failed — skip
    }
  }

  // ── Diagnosis block ──────────────────────────────────────────────────────
  const confColor: Record<string, [number, number, number]> = {
    High:   [5, 150, 105],
    Medium: [217, 119, 6],
    Low:    [220, 38, 38],
  };
  const conf = analysis.confidence ?? "Medium";

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN, y, CONTENT_W, 22, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...SLATE900);
  doc.text(analysis.diagnosis, MARGIN + 4, y + 8);

  // Confidence badge
  const badgeColor = confColor[conf] ?? confColor.Medium;
  doc.setFillColor(...badgeColor);
  doc.roundedRect(PAGE_W - MARGIN - 26, y + 3, 26, 7, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(`${conf} confidence`, PAGE_W - MARGIN - 13, y + 7.8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE600);
  const overviewLines = doc.splitTextToSize(analysis.overview, CONTENT_W - 8) as string[];
  doc.text(overviewLines, MARGIN + 4, y + 14);
  y += 26 + overviewLines.length * 1.5;

  if (slideLabel) {
    doc.setFontSize(8);
    doc.setTextColor(...SLATE400);
    doc.text(`Slide label: ${slideLabel}`, MARGIN, y);
    y += 5;
  }

  y += 3;

  // ── Sections ─────────────────────────────────────────────────────────────

  const sectionHeader = (title: string, color: [number, number, number] = PRIMARY) => {
    checkY(10);
    doc.setFillColor(...color);
    doc.rect(MARGIN, y, 3, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...color);
    doc.text(title, MARGIN + 6, y + 4.5);
    y += 9;
  };

  const bodyText = (text: string, indent = 0) => {
    const lines = doc.splitTextToSize(text, CONTENT_W - indent) as string[];
    checkY(lines.length * 4.5 + 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE600);
    doc.text(lines, MARGIN + indent, y);
    y += lines.length * 4.5 + 1;
  };

  const bullet = (text: string) => {
    checkY(6);
    doc.setFillColor(...SLATE400);
    doc.circle(MARGIN + 3, y - 0.5, 0.8, "F");
    bodyText(text, 7);
  };

  // Annotated Structures
  if (analysis.structures?.length) {
    sectionHeader("Annotated Structures");
    analysis.structures.forEach(s => {
      checkY(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...SLATE900);
      const tag = s.normalOrAbnormal === "abnormal" ? " ▲ ABNORMAL" : "";
      doc.text(`${s.name}${tag}`, MARGIN + 3, y);
      y += 4.5;
      bodyText(s.description, 3);
      if (s.educationalNote) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(...SLATE400);
        const noteLines = doc.splitTextToSize(s.educationalNote, CONTENT_W - 6) as string[];
        doc.text(noteLines, MARGIN + 3, y);
        y += noteLines.length * 4 + 2;
      }
    });
    y += 2;
  }

  // IHC Markers
  if (analysis.ihcMarkers?.length) {
    sectionHeader("IHC Markers");
    analysis.ihcMarkers.forEach(m => {
      checkY(10);
      const resultColor: Record<string, [number,number,number]> = {
        positive: [5, 150, 105], negative: [220, 38, 38], variable: [217, 119, 6],
      };
      const rc = resultColor[m.expectedResult] ?? SLATE600;
      doc.setFillColor(...rc);
      doc.roundedRect(MARGIN + 3, y - 3.5, 18, 5, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...WHITE);
      doc.text(m.marker, MARGIN + 12, y, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...SLATE600);
      const sigLines = doc.splitTextToSize(m.significance, CONTENT_W - 26) as string[];
      doc.text(sigLines, MARGIN + 24, y);
      y += Math.max(sigLines.length * 4, 5) + 2;
    });
    y += 2;
  }

  // Molecular Profile
  if (analysis.molecularProfile?.length) {
    sectionHeader("Molecular Profile", PURPLE);
    analysis.molecularProfile.forEach(m => {
      checkY(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...SLATE900);
      doc.text(`${m.gene}  `, MARGIN + 3, y);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...SLATE400);
      doc.text(`${m.alteration}  ·  ${m.frequency}`, MARGIN + 3 + doc.getTextWidth(`${m.gene}  `), y);
      y += 5;
      bodyText(m.significance, 3);
      y += 1;
    });
    y += 2;
  }

  // Pathogenesis
  if (analysis.pathogenesis?.length) {
    sectionHeader("Pathogenesis");
    analysis.pathogenesis.forEach(step => {
      checkY(12);
      doc.setFillColor(...PRIMARY);
      doc.circle(MARGIN + 3.5, y - 1, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...WHITE);
      doc.text(String(step.step), MARGIN + 3.5, y, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...SLATE900);
      doc.text(step.title, MARGIN + 9, y);
      y += 5;
      bodyText(step.description, 9);
      y += 1;
    });
    y += 2;
  }

  // Risk Factors
  if (analysis.riskFactors?.length) {
    sectionHeader("Risk Factors");
    analysis.riskFactors.forEach(r => bullet(r));
    y += 3;
  }

  // Complications
  if (analysis.complications?.length) {
    sectionHeader("Complications");
    analysis.complications.forEach(c => bullet(c));
    y += 3;
  }

  // Differential Diagnoses
  if (analysis.differentialDiagnosis?.length) {
    sectionHeader("Differential Diagnoses");
    analysis.differentialDiagnosis.forEach(d => {
      checkY(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...SLATE900);
      doc.text(d.diagnosis, MARGIN + 3, y);
      y += 4.5;
      bodyText(d.distinguishingFeatures, 3);
    });
    y += 2;
  }

  // Clinical Correlation
  if (analysis.clinicalCorrelation) {
    sectionHeader("Clinical Correlation");
    bodyText(analysis.clinicalCorrelation);
    y += 2;
  }

  // Key Learning Points
  if (analysis.keyLearningPoints?.length) {
    sectionHeader("Key Learning Points");
    analysis.keyLearningPoints.forEach(p => bullet(p));
    y += 3;
  }

  // ── Footer on every page ─────────────────────────────────────────────────
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SLATE400);
    doc.text("Generated by PathoLearn · AI-assisted analysis, not for clinical use", MARGIN, PAGE_H - 4);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
  }

  doc.save(`PathoLearn_${analysis.diagnosis.replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
