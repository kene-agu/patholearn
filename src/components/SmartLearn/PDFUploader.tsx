"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X, ArrowLeft } from "lucide-react";
import clsx from "clsx";
import type { User } from "@supabase/supabase-js";
import type { ExtractionProgress, ProcessedPDF } from "@/types/smartLearn";
import { extractAndUploadPDF, extractTextOnly } from "@/lib/pdfProcessor";
import { extractWordDocument, extractPowerPoint } from "@/lib/docProcessor";
import { withRetry } from "@/lib/slideStorage";
import { supabase } from "@/lib/supabase";
import { isChunkError, reloadOnce } from "@/lib/chunkReload";

interface Props {
  user: User;
  onComplete: (result: ProcessedPDF) => void;
  onBack?: () => void;
}

const MAX_FILE_MB = 30;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export default function PDFUploader({ user, onComplete, onBack }: Props) {
  const [file, setFile]         = useState<File | null>(null);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setError(null);
    const f = accepted[0];
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setError(`File too large — max ${MAX_FILE_MB} MB.`);
      return;
    }
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-powerpoint": [".ppt"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  };

  const handleProcess = async () => {
    if (!file) return;
    setError(null);
    setIsProcessing(true);

    try {
      const fileType = file.name.split(".").pop()?.toLowerCase();
      let fullText = "";
      let extracted: Awaited<ReturnType<typeof extractAndUploadPDF>> = [];

      // Generate the real document UUID up front so the storage paths we write
      // match the document row we'll insert below. Previously this used the
      // literal string "pending", which made concurrent uploads from the same
      // user clobber each other's slide images.
      const docId = crypto.randomUUID();
      const token = await getAuthToken();
      if (!token) throw new Error("Not signed in");

      // 1. Extract based on file type
      if (fileType === "pdf") {
        setProgress({ stage: "reading", current: 0, total: 0, message: "Reading document…" });
        fullText = await extractTextOnly(file);
        extracted = await extractAndUploadPDF(file, user.id, docId, token, setProgress);
      } else if (fileType === "docx" || fileType === "doc") {
        fullText = "Word document";
        extracted = await extractWordDocument(file, user.id, docId, token, setProgress);
      } else if (fileType === "pptx" || fileType === "ppt") {
        fullText = "PowerPoint presentation";
        extracted = await extractPowerPoint(file, user.id, docId, token, setProgress);
      } else {
        throw new Error("Unsupported file format. Use PDF, Word (.docx) or PowerPoint (.pptx)");
      }

      // 2. Register document + slides in DB
      setProgress({ stage: "registering", current: 0, total: 0, message: "Saving to your library…" });

      const title = file.name.replace(/\.(pdf|docx?|pptx?)$/i, "").replace(/[-_]/g, " ");

      const body = JSON.stringify({
        id: docId,
        title,
        fileName: file.name,
        totalPages: extracted.length,
        extractedText: fullText,
        slides: extracted.map((p) => ({
          pageNumber: p.pageNumber,
          fullPath: p.fullPath,
          thumbPath: p.thumbPath,
          pageText: p.text,
        })),
      });

      const res = await withRetry(
        () =>
          fetch("/api/pdf/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body,
          }),
        "save to library"
      );

      if (!res.ok) {
        const { error: apiErr } = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(apiErr);
      }

      const { pdfDoc, slides } = await res.json();

      setProgress({ stage: "done", current: extracted.length, total: extracted.length, message: "Done!" });

      onComplete({ pdfDoc, slides });
    } catch (err) {
      if (isChunkError(err)) {
        setError("App was updated — refreshing…");
        reloadOnce();
        return;
      }
      const msg = err instanceof Error ? err.message : "Processing failed";
      setError(msg);
      setProgress(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : null;

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      {onBack && (
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 mb-4">
          <FileText className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Smart Slide → Learn</h2>
        <p className="text-slate-400 text-sm">
          Upload a document — lecture slides, notes, or textbook chapters — and turn it into an
          interactive quiz, flashcard deck, and AI tutor session.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={clsx(
          "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-violet-500 bg-violet-500/10"
            : "border-slate-600 hover:border-violet-500/60 hover:bg-slate-800/50",
          isProcessing && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        {file ? (
          <div>
            <p className="text-white font-medium">{file.name}</p>
            <p className="text-slate-400 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        ) : (
          <div>
            <p className="text-slate-300 font-medium">
              {isDragActive ? "Drop your file here" : "Drag & drop a document"}
            </p>
            <p className="text-slate-500 text-xs mt-2">PDF · DOCX · PPTX · Max {MAX_FILE_MB} MB</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2 text-red-400 bg-red-900/20 rounded-xl p-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => { setError(null); setFile(null); }} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Progress */}
      {isProcessing && progress && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            {progress.stage === "done"
              ? <CheckCircle className="w-4 h-4 text-green-400" />
              : <Loader2 className="w-4 h-4 animate-spin text-violet-400" />}
            <span>{progress.message}</span>
          </div>
          {progressPct !== null && (
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
          {progress.total > 0 && (
            <p className="text-xs text-slate-500 text-right">
              {progress.current}/{progress.total} slides
            </p>
          )}
        </div>
      )}

      {/* Process button */}
      {file && !isProcessing && (
        <button
          onClick={handleProcess}
          className="mt-6 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
        >
          Extract &amp; Start Learning
        </button>
      )}

      {/* Tips */}
      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        {[
          { emoji: "🔬", label: "Histology slides" },
          { emoji: "📖", label: "Lecture notes" },
          { emoji: "📚", label: "Textbook chapters" },
        ].map(({ emoji, label }) => (
          <div key={label} className="bg-slate-800/60 rounded-xl p-3">
            <span className="text-2xl">{emoji}</span>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
