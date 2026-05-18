// POST /api/pdf/upload
// Registers a new PDF document and bulk-inserts slide rows after client-side extraction.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

export const maxDuration = 60;

const SIGNED_URL_EXPIRY = 7 * 24 * 3600; // 7 days — match the /slides GET route
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx"];
const MAX_TITLE_CHARS = 300;
const MAX_FILENAME_CHARS = 300;
const MAX_TOTAL_PAGES = 500;
const MAX_SLIDES = 500;

// Reject path traversal, absolute paths, and protocol-prefixed values. Storage
// paths are written by the server (`${user.id}/${fileName}`); slide paths come
// from the client after upload, so we sanity-check them here.
function isSafeStoragePath(p: unknown): p is string {
  if (typeof p !== "string" || p.length === 0 || p.length > 1024) return false;
  if (p.includes("..") || p.startsWith("/") || p.startsWith("\\")) return false;
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(p)) return false; // http://, file://, etc.
  return true;
}

export async function POST(request: NextRequest) {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.json();
  const { id, title, fileName, totalPages, extractedText, slides } = body as {
    id?: string;
    title: string;
    fileName: string;
    totalPages: number;
    extractedText: string;
    slides: {
      pageNumber: number;
      fullPath: string;
      thumbPath: string;
      pageText: string;
    }[];
  };

  if (!title || !fileName || !totalPages || !Array.isArray(slides)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof title !== "string" || title.length > MAX_TITLE_CHARS) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  if (typeof fileName !== "string" || fileName.length > MAX_FILENAME_CHARS) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  // Reject path-traversal characters in the file name (it becomes part of the storage path)
  if (fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  const lowerName = fileName.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext))) {
    return NextResponse.json(
      { error: `Only ${ALLOWED_EXTENSIONS.join(", ")} files are allowed` },
      { status: 400 }
    );
  }

  if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > MAX_TOTAL_PAGES) {
    return NextResponse.json(
      { error: `Invalid page count (1–${MAX_TOTAL_PAGES})` },
      { status: 400 }
    );
  }

  if (slides.length > MAX_SLIDES) {
    return NextResponse.json(
      { error: `Too many slides (max ${MAX_SLIDES})` },
      { status: 400 }
    );
  }

  for (const s of slides) {
    if (!Number.isInteger(s.pageNumber) || s.pageNumber < 1) {
      return NextResponse.json({ error: "Invalid slide page number" }, { status: 400 });
    }
    if (!isSafeStoragePath(s.fullPath) || !isSafeStoragePath(s.thumbPath)) {
      return NextResponse.json({ error: "Invalid slide storage path" }, { status: 400 });
    }
    // Each slide path must live under the user's own folder
    if (!s.fullPath.startsWith(`${user.id}/`) || !s.thumbPath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "Slide path outside user folder" }, { status: 400 });
    }
  }

  // Create the PDF document record. The client pre-generates a UUID so the
  // storage paths it just wrote line up with this row; fall back to a
  // server-generated UUID only for older clients.
  const insertRow: Record<string, unknown> = {
    user_id: user.id,
    title,
    file_name: fileName,
    storage_path: `${user.id}/${fileName}`,
    total_pages: totalPages,
    extracted_text: extractedText?.slice(0, 500_000) ?? null,
    status: "ready",
  };
  if (id && /^[0-9a-f-]{36}$/i.test(id)) insertRow.id = id;

  const { data: pdfDoc, error: pdfErr } = await db
    .from("pdf_documents")
    .insert(insertRow)
    .select()
    .single();

  if (pdfErr || !pdfDoc) {
    console.error("PDF insert error:", pdfErr);
    return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
  }

  // Bulk-insert slide rows
  const slideRows = slides.map((s) => ({
    pdf_id:      pdfDoc.id,
    user_id:     user.id,
    page_number: s.pageNumber,
    full_path:   s.fullPath,
    thumb_path:  s.thumbPath,
    page_text:   s.pageText?.slice(0, 50_000) ?? null,
  }));

  const { data: insertedSlides, error: slideErr } = await db
    .from("pdf_slides")
    .insert(slideRows)
    .select();

  if (slideErr) {
    console.error("Slide insert error:", slideErr);
    return NextResponse.json({ error: "Failed to create slide records" }, { status: 500 });
  }

  // Sign URLs for the freshly inserted slides so SlideExplorer can render the
  // previews immediately — otherwise every card shows "No preview" until the
  // user navigates away and back.
  const rows = insertedSlides ?? [];
  const thumbPaths = rows.map((s) => s.thumb_path).filter(Boolean) as string[];
  const fullPaths  = rows.map((s) => s.full_path).filter(Boolean) as string[];

  const [thumbSigned, fullSigned] = await Promise.all([
    thumbPaths.length
      ? db.storage.from("pdf-slides").createSignedUrls(thumbPaths, SIGNED_URL_EXPIRY)
      : { data: [], error: null },
    fullPaths.length
      ? db.storage.from("pdf-slides").createSignedUrls(fullPaths, SIGNED_URL_EXPIRY)
      : { data: [], error: null },
  ]);

  const thumbMap = new Map(
    (thumbSigned.data ?? []).map((s) => [s.path, s.signedUrl])
  );
  const fullMap = new Map(
    (fullSigned.data ?? []).map((s) => [s.path, s.signedUrl])
  );

  const slidesWithUrls = rows.map((s) => ({
    ...s,
    thumbUrl: s.thumb_path ? thumbMap.get(s.thumb_path) ?? null : null,
    fullUrl:  s.full_path  ? fullMap.get(s.full_path)   ?? null : null,
  }));

  return NextResponse.json({ pdfDoc, slides: slidesWithUrls });
}
