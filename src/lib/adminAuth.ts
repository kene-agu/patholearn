import { createClient } from "@supabase/supabase-js";

export async function verifyAdmin(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const adminEmails = (process.env.ADMIN_EMAIL ?? "").split(",").map(e => e.trim()).filter(Boolean);
  if (!adminEmails.includes(user.email!)) return null;

  return user.email;
}
