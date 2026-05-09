// DELETE /api/pdf/slides/[slideId]
// Delete a single slide from the database.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slideId: string } }
) {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const slideId = params.slideId;

  // Verify the slide belongs to the user before deleting
  const { data: slide } = await db
    .from("pdf_slides")
    .select("pdf_documents(user_id)")
    .eq("id", slideId)
    .single();

  if (!slide || (slide.pdf_documents as any)?.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await db
    .from("pdf_slides")
    .delete()
    .eq("id", slideId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
