import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const VALID_KINDS = ["welcome", "paid", "cancelled"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { kind: string } }
) {
  if (!await verifyAdmin(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!VALID_KINDS.includes(params.kind as typeof VALID_KINDS[number])) {
    return NextResponse.json({ error: "Unknown template kind" }, { status: 400 });
  }

  const { subject, html } = await request.json();
  if (typeof subject !== "string" || typeof html !== "string" || !subject.trim() || !html.trim()) {
    return NextResponse.json({ error: "Subject and html are required" }, { status: 400 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await db
    .from("email_templates")
    .update({ subject, html, updated_at: new Date().toISOString() })
    .eq("kind", params.kind)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: data });
}
