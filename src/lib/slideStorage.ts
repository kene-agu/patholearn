// Helpers for uploading rendered slide images to Supabase Storage via
// server-issued signed URLs. Used by both pdfProcessor and docProcessor.

import { supabase } from "./supabase";

export interface SignedUploadSlot {
  path: string;
  token: string;
  signedUrl: string;
}

export type SignedUploadMap = Map<string, SignedUploadSlot>;

/**
 * Retry a network operation with exponential backoff. Browser `fetch` throws a
 * TypeError ("Failed to fetch") on transient connection drops, which are common
 * across the hundreds of requests a large deck makes — retrying turns those into
 * a brief hiccup instead of a failed upload.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  retries = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`${label} failed`);
}

/**
 * Ask the server for signed upload URLs for each storage path. The server
 * auto-creates the `pdf-slides` bucket on first use and uses its service-role
 * key to mint the tokens — so this works regardless of bucket RLS state.
 */
export async function fetchSignedUploadUrls(
  paths: string[],
  authToken: string
): Promise<SignedUploadMap> {
  const res = await withRetry(
    () =>
      fetch("/api/pdf/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ paths }),
      }),
    "prepare upload"
  );

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Failed to prepare upload" }));
    throw new Error(error ?? "Failed to prepare upload");
  }

  const { uploads } = (await res.json()) as {
    uploads: {
      path: string;
      token: string | null;
      signedUrl: string | null;
      error: string | null;
    }[];
  };

  const map: SignedUploadMap = new Map();
  for (const u of uploads) {
    if (u.token && u.signedUrl) {
      map.set(u.path, { path: u.path, token: u.token, signedUrl: u.signedUrl });
    } else if (u.error) {
      throw new Error(`Failed to sign upload for ${u.path}: ${u.error}`);
    }
  }
  return map;
}

/**
 * Upload a blob to its pre-signed path. Throws on failure so callers can
 * surface a real error instead of silently producing a placeholder slide.
 */
export async function uploadSlideBlob(
  signed: SignedUploadSlot,
  blob: Blob
): Promise<void> {
  await withRetry(async () => {
    const { error } = await supabase.storage
      .from("pdf-slides")
      .uploadToSignedUrl(signed.path, signed.token, blob, {
        contentType: "image/webp",
        upsert: true,
      });
    if (error) {
      throw new Error(`Storage upload failed for ${signed.path}: ${error.message}`);
    }
  }, `upload ${signed.path}`);
}
