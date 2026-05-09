import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SUPPORT_CHATBOT_SYSTEM_PROMPT } from "@/lib/chatbotSystemPrompt";

export const maxDuration = 60;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const { messages } = await request.json() as { messages: Message[] };

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid request", { status: 400 });
    }

    const result = await streamText({
      model: google("gemini-2.0-flash"),
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
