// POST /api/pdf/upload
// Registers a new PDF document and bulk-inserts slide rows after client-side extraction.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.json();
  const { title, fileName, totalPages, extractedText, slides } = body as {
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

  // Create the PDF document record
  const { data: pdfDoc, error: pdfErr } = await db
    .from("pdf_documents")
    .insert({
      user_id: user.id,
      title,
      file_name: fileName,
      storage_path: `${user.id}/${fileName}`,
      total_pages: totalPages,
      extracted_text: extractedText?.slice(0, 500_000) ?? null, // guard against huge docs
      status: "ready",
    })
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

  return NextResponse.json({ pdfDoc, slides: insertedSlides });
}
