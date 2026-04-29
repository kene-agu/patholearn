import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Calculates the current study streak (consecutive days with ≥1 flashcard review)
 * directly from the flashcard_reviews table. Lightweight — runs once on mount.
 */
export function useStreak(user: User | null): number {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) { setStreak(0); return; }

    supabase
      .from("flashcard_reviews")
      .select("last_reviewed_at")
      .eq("user_id", user.id)
      .not("last_reviewed_at", "is", null)
      .then(({ data }) => {
        if (!data || data.length === 0) { setStreak(0); return; }

        const reviewedDates = new Set(
          data
            .filter(r => r.last_reviewed_at)
            .map(r => new Date(r.last_reviewed_at as string).toDateString())
        );

        let s = 0;
        const cursor = new Date();
        while (reviewedDates.has(cursor.toDateString())) {
          s++;
          cursor.setDate(cursor.getDate() - 1);
        }
        setStreak(s);
      });
  }, [user]);

  return streak;
}
