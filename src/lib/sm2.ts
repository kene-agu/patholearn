// SuperMemo-2 spaced-repetition algorithm.
// Quality: 0–5. <3 resets the schedule; ≥3 advances it.

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewState {
  easeFactor: number;      // starts at 2.5
  intervalDays: number;    // days until next review
  repetitions: number;     // consecutive successful reviews
}

export interface NextReview extends ReviewState {
  nextReviewAt: Date;
}

export const INITIAL_STATE: ReviewState = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
};

export function sm2(prev: ReviewState, quality: ReviewQuality, now: Date = new Date()): NextReview {
  let { easeFactor, intervalDays, repetitions } = prev;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { easeFactor, intervalDays, repetitions, nextReviewAt };
}

// UI rating → SM-2 quality. Four buttons: Again / Hard / Good / Easy.
export const RATING_TO_QUALITY: Record<"again" | "hard" | "good" | "easy", ReviewQuality> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};
