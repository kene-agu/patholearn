import { supabase } from "./supabase";
import { sm2, INITIAL_STATE, RATING_TO_QUALITY, type ReviewState } from "./sm2";

export interface FlashcardReview {
  card_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  last_quality: number | null;
  last_reviewed_at: string | null;
  next_review_at: string;
}

export type Rating = keyof typeof RATING_TO_QUALITY;

export async function fetchReviews(userId: string): Promise<FlashcardReview[]> {
  const { data, error } = await supabase
    .from("flashcard_reviews")
    .select("card_id, ease_factor, interval_days, repetitions, last_quality, last_reviewed_at, next_review_at")
    .eq("user_id", userId);
  if (error) {
    console.error("fetchReviews:", error);
    return [];
  }
  return data ?? [];
}

export async function recordRating(userId: string, cardId: string, rating: Rating, prev: FlashcardReview | null) {
  const prevState: ReviewState = prev
    ? { easeFactor: prev.ease_factor, intervalDays: prev.interval_days, repetitions: prev.repetitions }
    : INITIAL_STATE;

  const quality = RATING_TO_QUALITY[rating];
  const now = new Date();
  const next = sm2(prevState, quality, now);

  const { error } = await supabase.from("flashcard_reviews").upsert(
    {
      user_id: userId,
      card_id: cardId,
      ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      last_quality: quality,
      last_reviewed_at: now.toISOString(),
      next_review_at: next.nextReviewAt.toISOString(),
    },
    { onConflict: "user_id,card_id" }
  );

  if (error) console.error("recordRating:", error);
  return next;
}

export function isDue(review: FlashcardReview | undefined, now: Date = new Date()): boolean {
  if (!review) return true; // never seen → due
  return new Date(review.next_review_at).getTime() <= now.getTime();
}
