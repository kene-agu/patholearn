interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages, userEmail } = await request.json() as { messages: Message[]; userEmail: string };

    const conversationText = messages
      .map(m => `${m.role === "user" ? "User" : "Support"}: ${m.content}`)
      .join("\n\n");

    // Log escalation with user email for manual follow-up
    console.log("[SUPPORT ESCALATION]", {
      userEmail,
      timestamp: new Date().toISOString(),
      conversation: conversationText,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("[ESCALATION ERROR]", error);
    return new Response(
      JSON.stringify({ error: "Failed to process escalation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
