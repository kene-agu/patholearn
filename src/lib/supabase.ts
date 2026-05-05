import { createClient } from "@supabase/supabase-js";

// Fallback placeholders let the module evaluate cleanly during Next.js static
// prerender. Actual API calls only happen client-side inside useEffect, so the
// placeholder values are never used for real requests.
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "https://placeholder.supabase.co";
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnon);

// ── Types ──────────────────────────────────────────────────────────────────

export interface SlideHistoryRecord {
  id?:            string;
  user_id:        string;
  diagnosis:      string;
  slide_label:    string | null;
  image_source:   string | null;
  image_url:      string | null;
  analysis_json:  Record<string, unknown> | null;
  analyzed_at?:   string;
}
