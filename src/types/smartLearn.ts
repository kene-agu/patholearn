// ── Smart Slide → Learn types ──────────────────────────────────────────────────

export interface PDFDocument {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  storage_path: string;
  total_pages: number;
  extracted_text: string | null;
  summary: string | null;
  status: "processing" | "ready" | "error";
  created_at: string;
  updated_at: string;
}

export interface PDFSlide {
  id: string;
  pdf_id: string;
  user_id: string;
  page_number: number;
  thumb_path: string | null;
  full_path: string | null;
  page_text: string | null;
  analysis_json: SlideAnalysis | null;
  quiz_json: SlideQuestion[] | null;
  flashcard_json: SlideFlashcard[] | null;
  analyzed_at: string | null;
  created_at: string;
  // runtime-only: signed URLs populated client-side
  thumbUrl?: string;
  fullUrl?: string;
}

export interface SlideAnalysis {
  diagnosis: string;
  confidence: "High" | "Medium" | "Low";
  overview: string;
  keyLearningPoints: string[];
  stain: { type: string; reasoning: string; colorCharacteristics: string };
  structures: { name: string; description: string; normalOrAbnormal: string; educationalNote: string }[];
  differentialDiagnosis: { diagnosis: string; distinguishingFeatures: string }[];
  clinicalCorrelation: string;
  ihcMarkers: { marker: string; expectedResult: string; significance: string }[];
  annotations: {
    id: string; label: string; description: string;
    xPercent: number; yPercent: number;
    extraPoints?: { xPercent: number; yPercent: number }[];
  }[];
  teachingClose: { pearl: string; pitfall: string };
}

export interface SlideQuestion {
  id: string;
  type: "mcq" | "true-false" | "feature-id";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  slidePageNumber?: number;
}

export interface SlideFlashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  keyPoints: string[];
  slidePageNumber?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// Extraction progress reported by pdfProcessor during client-side rendering
export interface ExtractionProgress {
  stage: "reading" | "rendering" | "uploading" | "registering" | "done" | "error";
  current: number;   // pages rendered so far
  total: number;     // total pages
  message: string;
}

// What the PDFUploader hands off to SlideExplorer
export interface ProcessedPDF {
  pdfDoc: PDFDocument;
  slides: PDFSlide[];
}
