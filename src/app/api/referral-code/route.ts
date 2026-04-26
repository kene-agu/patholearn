import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  return Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    let code = profile?.referral_code as string | null;

    if (!code) {
      for (let i = 0; i < 10; i++) {
        const candidate = generateCode();
        const { data: taken } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("referral_code", candidate)
          .maybeSingle();

        if (!taken) {
          await supabaseAdmin
            .from("profiles")
            .update({ referral_code: candidate })
            .eq("id", user.id);
          code = candidate;
          break;
        }
      }
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://patholearn-six.vercel.app";

    // Count completed referrals for this user
    const { count } = await supabaseAdmin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", user.id)
      .eq("status", "completed");

    return NextResponse.json({
      code,
      referralLink: `${APP_URL}?ref=${code}`,
      referralCount: count ?? 0,
    });
  } catch (err) {
    console.error("Referral code error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
