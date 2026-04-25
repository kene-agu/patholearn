import { NextRequest, NextResponse } from "next/server";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY!;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || "https://patholearn-six.vercel.app";

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();
    if (!userId || !email) {
      return NextResponse.json({ error: "Missing user info" }, { status: 400 });
    }

    const txRef = `patholearn-${userId}-${Date.now()}`;

    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FLW_SECRET}`,
      },
      body: JSON.stringify({
        tx_ref:       txRef,
        amount:       2000,
        currency:     "NGN",
        redirect_url: `${APP_URL}/payment/success`,
        customer:     { email, name: "PathoLearn User" },
        customizations: {
          title:       "PathoLearn Premium",
          description: "Monthly subscription — unlimited AI slide analysis",
        },
        meta: { user_id: userId },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.status !== "success") {
      console.error("Flutterwave error:", data);
      return NextResponse.json({ error: "Failed to create payment link" }, { status: 500 });
    }

    return NextResponse.json({ paymentLink: data.data.link });
  } catch (err) {
    console.error("Subscribe route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
