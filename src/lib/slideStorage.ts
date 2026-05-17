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
 * Ask the server for signed upload URLs for each storage path. The server
 * auto-creates the `pdf-slides` bucket on first use and uses its service-role
 * key to mint the tokens — so this works regardless of bucket RLS state.
 */
export async function fetchSignedUploadUrls(
  paths: string[],
  authToken: string
): Promise<SignedUploadMap> {
  const res = await fetch("/api/pdf/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ paths }),
  });

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
  const { error } = await supabase.storage
    .from("pdf-slides")
    .uploadToSignedUrl(signed.path, signed.token, blob, {
      contentType: "image/webp",
      upsert: true,
    });
  if (error) {
    throw new Error(`Storage upload failed for ${signed.path}: ${error.message}`);
  }
}
