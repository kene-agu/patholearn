import { createClient } from "@supabase/supabase-js";

/**
 * Verify a Supabase access token from an Authorization header.
 * Returns the user object on success, or null if missing/invalid/expired.
 *
 * Usage in API routes:
 *   const user = await verifyUser(request.headers.get("authorization"));
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function verifyUser(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
