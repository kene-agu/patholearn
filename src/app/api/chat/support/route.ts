import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SUPPORT_CHATBOT_SYSTEM_PROMPT } from "@/lib/chatbotSystemPrompt";

export const maxDuration = 60;

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface LogComplaintInput {
  issue: string;
  category: "bug" | "feature_request" | "feedback" | "other";
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
      tools: {
        log_complaint: {
          description: "Log a user complaint, bug report, or feature request",
          parameters: {
            type: "object" as const,
            properties: {
              issue: {
                type: "string",
                description: "Description of the issue or feedback",
              },
              category: {
                type: "string",
                enum: ["bug", "feature_request", "feedback", "other"],
                description: "Category of the complaint",
              },
            },
            required: ["issue", "category"],
          },
          execute: async (params: LogComplaintInput) => {
            console.log("[SUPPORT CHATBOT LOG]", {
              timestamp: new Date().toISOString(),
              category: params.category,
              issue: params.issue,
            });
            return `Logged: ${params.category} - "${params.issue.slice(0, 100)}"`;
          },
        },
      },
      toolChoice: "auto",
      temperature: 0.7,
      maxTokens: 1024,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[SUPPORT CHAT ERROR]", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
