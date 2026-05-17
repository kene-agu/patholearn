// GET /api/pdf/[pdfId]/slides — list slides with signed URLs
// POST /api/pdf/[pdfId]/slides — upsert slide analysis/quiz/flashcard data

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

// 7-day signed URLs so the same URL is reused across sessions, letting the
// browser and Supabase's edge CDN cache the image bytes instead of fetching
// fresh on every page load.
const SIGNED_URL_EXPIRY = 7 * 24 * 3600;

export async function GET(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
) {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: slides, error } = await db
    .from("pdf_slides")
    .select("*")
    .eq("pdf_id", params.pdfId)
    .order("page_number");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!slides?.length) return NextResponse.json({ slides: [] });

  // Generate signed URLs for thumb + full images
  const thumbPaths = slides.map((s) => s.thumb_path).filter(Boolean) as string[];
  const fullPaths  = slides.map((s) => s.full_path).filter(Boolean) as string[];

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

  const slidesWithUrls = slides.map((s) => ({
    ...s,
    thumbUrl: s.thumb_path ? thumbMap.get(s.thumb_path) ?? null : null,
    fullUrl:  s.full_path  ? fullMap.get(s.full_path)   ?? null : null,
  }));

  return NextResponse.json({ slides: slidesWithUrls });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { pdfId: string } }
) {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { slideId, field, value } = await request.json() as {
    slideId: string;
    field: "analysis_json" | "quiz_json" | "flashcard_json";
    value: unknown;
  };

  const allowedFields = ["analysis_json", "quiz_json", "flashcard_json"];
  if (!allowedFields.includes(field)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  const update: Record<string, unknown> = { [field]: value };
  if (field === "analysis_json") update.analyzed_at = new Date().toISOString();

  const { error } = await db
    .from("pdf_slides")
    .update(update)
    .eq("id", slideId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
