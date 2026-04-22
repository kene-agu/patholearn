import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnon);

// ── Types ──────────────────────────────────────────────────────────────────

export interface SlideHistoryRecord {
  id?:            string;
  user_id:        string;
  diagnosis:      string;
  slide_label:    string | null;   // what the user typed on the label field
  image_source:   string | null;   // "upload" | slide name from library
  analyzed_at?:   string;
}
