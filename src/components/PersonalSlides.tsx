"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  Upload, Microscope, Trash2, Brain, Clock,
  ImagePlus, AlertCircle, X, CheckCircle2,
} from "lucide-react";
import { clsx } from "clsx";
import SlideImage from "@/components/SlideImage";

interface PersonalSlide {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
}

interface Props {
  user: User;
  onAnalyze: (imageUrl: string, title: string) => void;
}

const MAX_MB = 10;
const BUCKET = "slide-images";

function resizeToBlob(file: File, maxPx = 1600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("Canvas export failed")), "image/jpeg", 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PersonalSlides({ user, onAnalyze }: Props) {
  const [slides, setSlides]           = useState<PersonalSlide[]>([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [uploadPct, setUploadPct]     = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragging, setDragging]       = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("personal_slides")
      .select("id, title, image_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setSlides((data as PersonalSlide[]) ?? []); setLoading(false); });
  }, [user.id]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (JPEG, PNG, TIFF, etc.)");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setUploadError(`File is too large — maximum size is ${MAX_MB} MB`);
      return;
    }

    setUploadError(null);
    setUploading(true);
    setUploadPct(10);

    try {
      const blob = await resizeToBlob(file);
      setUploadPct(35);

      const ext = "jpg";
      const path = `personal/${user.id}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
      setUploadPct(70);

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
      const imageUrl = urlData.publicUrl;

      const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      const { data: row, error: insertErr } = await supabase
        .from("personal_slides")
        .insert({ user_id: user.id, title, image_url: imageUrl })
        .select("id, title, image_url, created_at")
        .single();

      if (insertErr) throw new Error(`Save failed: ${insertErr.message}`);
      setUploadPct(100);
      setSlides(prev => [row as PersonalSlide, ...prev]);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [user.id]);

  const handleDelete = async (slide: PersonalSlide) => {
    setDeleting(slide.id);
    // Delete from storage
    const path = new URL(slide.image_url).pathname.split("/object/public/slide-images/")[1];
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    // Delete from DB
    await supabase.from("personal_slides").delete().eq("id", slide.id).eq("user_id", user.id);
    setSlides(prev => prev.filter(s => s.id !== slide.id));
    setDeleting(null);
    setConfirmDelete(null);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Upload zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={clsx(
          "relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer",
          dragging
            ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20 scale-[1.01]"
            : uploading
            ? "border-slate-200 dark:border-slate-700 cursor-default"
            : "border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
          {uploadSuccess ? (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Slide uploaded!</p>
            </>
          ) : uploading ? (
            <>
              <div className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                <Upload className="w-7 h-7 text-primary-500 animate-bounce" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Uploading…</p>
              <div className="w-48 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className={clsx(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                dragging
                  ? "bg-primary-500 scale-110"
                  : "bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30"
              )}>
                <ImagePlus className={clsx("w-7 h-7 transition-colors", dragging ? "text-white" : "text-primary-600 dark:text-primary-400")} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {dragging ? "Drop to upload" : "Upload a slide"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Drag & drop or click · JPEG, PNG, TIFF · up to {MAX_MB} MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Empty state */}
      {slides.length === 0 && !uploading && (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">
          <Microscope className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No slides uploaded yet</p>
          <p className="text-xs mt-1">Upload histology slides from your lectures or practicals to study them here</p>
        </div>
      )}

      {/* Slides grid */}
      {slides.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slides.map(slide => (
            <div
              key={slide.id}
              className="group card p-0 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="relative h-44 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <SlideImage
                  src={slide.image_url}
                  alt={slide.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  fallbackLabel={slide.title}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />
                <span className="absolute bottom-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/80 text-white">
                  Personal
                </span>

                {/* Delete button */}
                {confirmDelete === slide.id ? (
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-white/90 text-slate-700 font-medium hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(slide)}
                      disabled={deleting === slide.id}
                      className="text-[10px] px-2 py-1 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600"
                    >
                      {deleting === slide.id ? "…" : "Delete"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(slide.id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Card body */}
              <div className="p-3">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{slide.title}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {timeAgo(slide.created_at)}
                </p>

                {/* Actions */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onAnalyze(slide.image_url, slide.title)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                  >
                    <Microscope className="w-3.5 h-3.5" />
                    Analyze
                  </button>
                  <button
                    onClick={() => onAnalyze(slide.image_url, slide.title)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 text-xs font-semibold hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    Study
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        Analyze a slide to unlock quiz questions and flashcards based on its diagnosis
      </p>
    </div>
  );
}
