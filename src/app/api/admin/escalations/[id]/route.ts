import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/adminAuth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const adminEmail = await verifyAdmin(request.headers.get("authorization"));
  if (!adminEmail) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { message } = await request.json() as { message: string };

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (message.length > 10_000) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 10,000 chars)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { error } = await admin
      .from("support_replies")
      .insert({
        escalation_id: params.id,
        message: message.trim(),
      });

    if (error) throw error;

    console.log("[ADMIN REPLY SAVED]", { escalation_id: params.id, by: adminEmail });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("[ADMIN REPLY ERROR]", error);
    return new Response(
      JSON.stringify({ error: "Failed to save reply" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
