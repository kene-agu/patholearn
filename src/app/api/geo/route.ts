import { NextRequest, NextResponse } from "next/server";
import { currencyFromCountry } from "@/lib/pricing";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const country = req.headers.get("x-vercel-ip-country");
  const currency = currencyFromCountry(country);
  return NextResponse.json({ currency, country: country ?? null });
}
