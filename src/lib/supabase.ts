import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
