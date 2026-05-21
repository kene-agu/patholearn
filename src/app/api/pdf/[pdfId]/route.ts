// DELETE /api/pdf/[pdfId] — delete a document and all its associated data.
// Removes storage files, then deletes the db row (cascades to slides/chat/progress).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
) {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { pdfId } = params;

  // Verify ownership and get storage path for the original PDF
  const { data: doc } = await db
    .from("pdf_documents")
    .select("id, user_id, storage_path")
    .eq("id", pdfId)
    .single();

  if (!doc || doc.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Collect slide storage paths before cascading delete removes them
  const { data: slides } = await db
    .from("pdf_slides")
    .select("thumb_path, full_path")
    .eq("pdf_id", pdfId);

  // Delete slide images from storage
  if (slides?.length) {
    const paths = slides.flatMap(s => [s.thumb_path, s.full_path]).filter(Boolean) as string[];
    if (paths.length) {
      await db.storage.from("pdf-slides").remove(paths);
    }
  }

  // Delete the original PDF from storage
  if (doc.storage_path) {
    await db.storage.from("pdf-documents").remove([doc.storage_path]);
  }

  // Delete the document row — cascades to pdf_slides, pdf_chat_messages, user_pdf_progress
  const { error } = await db
    .from("pdf_documents")
    .delete()
    .eq("id", pdfId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
