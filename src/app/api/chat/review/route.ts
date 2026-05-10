export async function POST(request: Request) {
  try {
    const { rating, text } = await request.json() as { rating: number; text: string };

    if (!rating || rating < 1 || rating > 5) {
      return new Response("Invalid rating", { status: 400 });
    }

    // Log review to console for now
    console.log("[CHATBOT REVIEW]", { rating, text, timestamp: new Date().toISOString() });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("[REVIEW ERROR]", error);
    return new Response(
      JSON.stringify({ error: "Failed to save review" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
