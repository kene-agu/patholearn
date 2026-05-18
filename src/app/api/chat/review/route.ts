import { createClient } from "@supabase/supabase-js";

const MAX_REVIEW_CHARS = 2_000;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { rating, text } = await request.json() as { rating: number; text: string };

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return new Response("Invalid rating", { status: 400 });
    }

    if (text != null && (typeof text !== "string" || text.length > MAX_REVIEW_CHARS)) {
      return new Response("Review too long", { status: 413 });
    }

    const { error } = await getAdmin()
      .from("chatbot_reviews")
      .insert({
        rating,
        text: text?.trim() || null,
      });

    if (error) throw error;

    console.log("[CHATBOT REVIEW SAVED]", { rating });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("[REVIEW ERROR]", error);
    return new Response(
      JSON.stringify({ error: "Failed to save review" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
