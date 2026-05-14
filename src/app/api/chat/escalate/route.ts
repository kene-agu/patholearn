import { createClient } from "@supabase/supabase-js";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Lazy-init so the build step doesn't fail when env vars are absent.
// Service-role client bypasses RLS so inserts can't be silently blocked.
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { messages, userEmail } = await request.json() as { messages: Message[]; userEmail: string };

    const conversationText = messages
      .map(m => `${m.role === "user" ? "User" : "Support"}: ${m.content}`)
      .join("\n\n");

    const { error } = await getAdmin()
      .from("support_escalations")
      .insert({
        conversation: conversationText,
        messages: messages,
        user_email: userEmail,
      });

    if (error) throw error;

    console.log("[SUPPORT ESCALATION SAVED]", { userEmail });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("[ESCALATION ERROR]", error);
    return new Response(
      JSON.stringify({ error: "Failed to process escalation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
