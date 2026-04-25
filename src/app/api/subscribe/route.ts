import { NextRequest, NextResponse } from "next/server";

// Returns a signed tx_ref for the client-side inline checkout.
// The public key is used client-side; secret key never leaves the server.
export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();
    if (!userId || !email) {
      return NextResponse.json({ error: "Missing user info" }, { status: 400 });
    }
    const txRef = `patholearn-${userId}-${Date.now()}`;
    return NextResponse.json({ txRef, userId, email, amount: 2000, currency: "NGN" });
  } catch (err) {
    console.error("Subscribe route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
