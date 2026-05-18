import { createClient } from "@supabase/supabase-js";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { messages, userEmail } = await request.json() as { messages: Message[]; userEmail: string };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: "Conversation too long" }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    for (const m of messages) {
      if (m.role !== "user" && m.role !== "assistant") {
        return new Response(
          JSON.stringify({ error: "Invalid message role" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (typeof m.content !== "string" || m.content.length > MAX_MESSAGE_CHARS) {
        return new Response(
          JSON.stringify({ error: "Message too long" }),
          { status: 413, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // userEmail is optional ("anonymous" is allowed); when supplied it must be valid
    const normalizedEmail =
      userEmail && userEmail !== "anonymous"
        ? (EMAIL_RE.test(userEmail) ? userEmail.toLowerCase().trim() : null)
        : null;

    if (userEmail && userEmail !== "anonymous" && !normalizedEmail) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const conversationText = messages
      .map(m => `${m.role === "user" ? "User" : "Support"}: ${m.content}`)
      .join("\n\n");

    const { error } = await getAdmin()
      .from("support_escalations")
      .insert({
        conversation: conversationText,
        messages: messages,
        user_email: normalizedEmail,
      });

    if (error) throw error;

    console.log("[SUPPORT ESCALATION SAVED]", { userEmail: normalizedEmail ?? "anonymous" });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("[ESCALATION ERROR]", error);
    return new Response(
      JSON.stringify({ error: "Failed to process escalation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
