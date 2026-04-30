import { supabase } from "@/lib/supabase";

/**
 * fetch() wrapper that attaches the current Supabase access token.
 * Use for any API route that calls verifyUser() server-side.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}
