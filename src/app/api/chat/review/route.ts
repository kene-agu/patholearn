import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { rating, text } = await request.json() as { rating: number; text: string };

    if (!rating || rating < 1 || rating > 5) {
      return new Response("Invalid rating", { status: 400 });
    }

    // Save review to database
    const { error } = await supabase
      .from("chatbot_reviews")
      .insert({
        rating,
        text: text || null,
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
