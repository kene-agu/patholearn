// POST /api/pdf/upload/sign
// Ensures the `pdf-slides` bucket exists and returns signed upload URLs
// for each requested path. Signed URLs bypass RLS, so the client can PUT
// blobs directly to storage without depending on bucket policies being
// configured by hand.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

const BUCKET = "pdf-slides";
const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB

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

  const signed = await Promise.all(
    paths.map((p) => db.storage.from(BUCKET).createSignedUploadUrl(p))
  );

  const uploads = signed.map((s, i) => ({
    path: paths[i],
    token: s.data?.token ?? null,
    signedUrl: s.data?.signedUrl ?? null,
    error: s.error?.message ?? null,
  }));

  return NextResponse.json({ uploads });
}
