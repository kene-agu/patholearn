import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
  );
  const data = await res.json();
  const names = data?.models?.map((m: { name: string; supportedGenerationMethods?: string[] }) => ({
    name: m.name,
    methods: m.supportedGenerationMethods,
  }));
  return NextResponse.json({ status: res.status, models: names, raw: data });
}
