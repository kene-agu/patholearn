import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  try {
    const res = await fetch(decodeURIComponent(url), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Referer: "https://en.wikipedia.org/",
        Origin: "https://en.wikipedia.org",
      },
    });

    console.log(`[proxy] ${url.slice(0, 60)}... → ${res.status} ${res.headers.get("content-type")}`);

    if (!res.ok) {
      console.error(`[proxy] Upstream failed: ${res.status} for ${url}`);
      return NextResponse.json(
        { error: `Upstream error: ${res.status}` },
        { status: 502 }
      );
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[proxy] Fetch error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
