import { supabase } from "@/lib/supabase";

export async function track(
  eventName: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("events").insert({
      user_id:    user.id,
      event_name: eventName,
      properties,
    });
    if (error) console.error("[track]", eventName, error.message);
  } catch (e) {
    console.error("[track]", eventName, e);
  }
}
