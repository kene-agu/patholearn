// POST /api/pdf/upload/sign
// Ensures the `pdf-slides` bucket exists and returns signed upload URLs
// for each requested path. Signed URLs bypass RLS, so the client can PUT
// blobs directly to storage without depending on bucket policies being
// configured by hand.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

export const maxDuration = 60;

const BUCKET = "pdf-slides";
const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB

// Supabase Storage has no batch "sign upload URL" call, so a large deck means
// one request per slide image. Firing all of them at once (e.g. 374 for a
// 187-slide PDF) exhausts connections and trips rate limits, leaving the upload
// stuck at "Preparing upload…". Cap the fan-out and retry transient failures.
const SIGN_CONCURRENCY = 10;
const SIGN_RETRIES = 2;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest) {
  const user = await verifyUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Auto-create the bucket on first use. Service role bypasses RLS so this
  // works even when policies haven't been set up via the dashboard.
  const { data: buckets, error: listErr } = await db.storage.listBuckets();
  if (listErr) {
    return NextResponse.json(
      { error: `Failed to list buckets: ${listErr.message}` },
      { status: 500 }
    );
  }
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: createErr } = await db.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: FILE_SIZE_LIMIT,
    });
    // Race-safe: ignore "already exists" if another request just created it.
    if (createErr && !/already exists/i.test(createErr.message)) {
      return NextResponse.json(
        { error: `Failed to create bucket: ${createErr.message}` },
        { status: 500 }
      );
    }
  }

  const { paths } = (await request.json()) as { paths: string[] };
  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: "Missing paths" }, { status: 400 });
  }

  // Hard-require every path to live under the caller's user folder so a
  // signed URL can't be used to overwrite someone else's slides.
  const userPrefix = `${user.id}/`;
  if (paths.some((p) => typeof p !== "string" || !p.startsWith(userPrefix))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const signed = await mapWithConcurrency(paths, SIGN_CONCURRENCY, async (p) => {
    let lastErr: string | null = null;
    for (let attempt = 0; attempt <= SIGN_RETRIES; attempt++) {
      const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(p);
      if (data) return { data, error: null };
      lastErr = error?.message ?? "Failed to sign upload";
    }
    return { data: null, error: lastErr };
  });

  const uploads = signed.map((s, i) => ({
    path: paths[i],
    token: s.data?.token ?? null,
    signedUrl: s.data?.signedUrl ?? null,
    error: s.error ?? null,
  }));

  return NextResponse.json({ uploads });
}
