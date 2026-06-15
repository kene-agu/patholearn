import { NextRequest, NextResponse } from "next/server";

// Whitelist of domains the proxy is allowed to fetch from.
// Without this, the endpoint is an SSRF vector — attackers could make the
// server fetch internal IPs (AWS metadata, localhost services, etc.) or
// use it as an anonymous proxy.
const ALLOWED_HOSTS = new Set([
  "upload.wikimedia.org",
  "commons.wikimedia.org",
]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  let target: URL;
  try {
    // `url` is already decoded once by searchParams.get(). Callers pass
    // encodeURIComponent(fullUrl), so decoding again here would turn the
    // percent-encoded characters inside Wikimedia filenames (e.g. %28 %29 %2C)
    // into literal "(", ")", "," and 404 the upstream request. Parse as-is.
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Protocol not allowed" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json(
      { error: `Domain not allowed: ${target.hostname}` },
      { status: 403 }
    );
  }

  try {
    const res = await fetch(target.toString(), {
      redirect: "follow",
      headers: {
        // Wikimedia's User-Agent policy requires a descriptive UA with contact
        // info; generic browser UAs from datacenter IPs are more likely to be
        // throttled. https://meta.wikimedia.org/wiki/User-Agent_policy
        "User-Agent":
          "PathoLearnBot/1.0 (https://getpatholearn.com; hello@getpatholearn.com)",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://en.wikipedia.org/",
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
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
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
