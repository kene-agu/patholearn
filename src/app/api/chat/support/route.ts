import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SUPPORT_CHATBOT_SYSTEM_PROMPT } from "@/lib/chatbotSystemPrompt";

export const maxDuration = 60;

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4_000;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json() as { messages: Message[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Invalid request", { status: 400 });
    }

    if (messages.length > MAX_MESSAGES) {
      return new Response("Conversation too long", { status: 413 });
    }

    for (const m of messages) {
      if (m.role !== "user" && m.role !== "assistant") {
        return new Response("Invalid message role", { status: 400 });
      }
      if (typeof m.content !== "string" || m.content.length > MAX_MESSAGE_CHARS) {
        return new Response("Message too long", { status: 413 });
      }
    }

    const result = await streamText({
      model: google("gemini-3.6-flash"),
      system: SUPPORT_CHATBOT_SYSTEM_PROMPT,
      messages: messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[SUPPORT CHAT ERROR]", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
