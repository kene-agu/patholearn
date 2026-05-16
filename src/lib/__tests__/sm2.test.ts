import { describe, it, expect } from "vitest";
import { sm2, INITIAL_STATE, RATING_TO_QUALITY } from "../sm2";

const NOW = new Date("2025-01-01T00:00:00Z");

describe("sm2", () => {
  describe("failed review (quality < 3)", () => {
    it("resets repetitions to 0", () => {
      const prev = { easeFactor: 2.5, intervalDays: 10, repetitions: 5 };
      const result = sm2(prev, 1, NOW);
      expect(result.repetitions).toBe(0);
    });

    it("resets interval to 1 day", () => {
      const prev = { easeFactor: 2.5, intervalDays: 10, repetitions: 5 };
      const result = sm2(prev, 0, NOW);
      expect(result.intervalDays).toBe(1);
    });

    it("schedules next review in 1 day", () => {
      const result = sm2(INITIAL_STATE, 1, NOW);
      const expected = new Date(NOW.getTime() + 24 * 60 * 60 * 1000);
      expect(result.nextReviewAt).toEqual(expected);
    });

    it("decreases ease factor on quality=0", () => {
      const result = sm2(INITIAL_STATE, 0, NOW);
      expect(result.easeFactor).toBeLessThan(INITIAL_STATE.easeFactor);
    });
  });

  describe("successful review (quality >= 3)", () => {
    it("first successful review: interval = 1 day", () => {
      const result = sm2(INITIAL_STATE, 4, NOW);
      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
    });

    it("second successful review: interval = 6 days", () => {
      const afterFirst = sm2(INITIAL_STATE, 4, NOW);
      const result = sm2(afterFirst, 4, NOW);
      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
    });

    it("third successful review: interval = previous * easeFactor", () => {
      const s1 = sm2(INITIAL_STATE, 4, NOW);
      const s2 = sm2(s1, 4, NOW);
      const s3 = sm2(s2, 4, NOW);
      expect(s3.intervalDays).toBe(Math.round(6 * s2.easeFactor));
      expect(s3.repetitions).toBe(3);
    });

    it("increases ease factor on quality=5", () => {
      const result = sm2(INITIAL_STATE, 5, NOW);
      expect(result.easeFactor).toBeGreaterThan(INITIAL_STATE.easeFactor);
    });
  });

  describe("ease factor bounds", () => {
    it("never drops below 1.3", () => {
      let state = INITIAL_STATE;
      for (let i = 0; i < 20; i++) {
        state = sm2(state, 0, NOW);
      }
      expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
    });
  });

  describe("nextReviewAt", () => {
    it("is set to now + intervalDays", () => {
      const result = sm2(INITIAL_STATE, 4, NOW);
      const expectedMs = NOW.getTime() + result.intervalDays * 24 * 60 * 60 * 1000;
      expect(result.nextReviewAt.getTime()).toBe(expectedMs);
    });

    it("defaults to current time when now is omitted", () => {
      const before = Date.now();
      const result = sm2(INITIAL_STATE, 4);
      const after = Date.now();
      const reviewMs = result.nextReviewAt.getTime();
      expect(reviewMs).toBeGreaterThanOrEqual(before + result.intervalDays * 24 * 60 * 60 * 1000);
      expect(reviewMs).toBeLessThanOrEqual(after + result.intervalDays * 24 * 60 * 60 * 1000);
    });
  });

  describe("RATING_TO_QUALITY mapping", () => {
    it("maps again → quality 1", () => {
      const result = sm2(INITIAL_STATE, RATING_TO_QUALITY.again, NOW);
      expect(result.repetitions).toBe(0); // quality 1 = fail
    });

    it("maps hard → quality 3", () => {
      const result = sm2(INITIAL_STATE, RATING_TO_QUALITY.hard, NOW);
      expect(result.repetitions).toBe(1); // quality 3 = pass
    });

    it("maps easy → quality 5", () => {
      const result = sm2(INITIAL_STATE, RATING_TO_QUALITY.easy, NOW);
      expect(result.easeFactor).toBeGreaterThan(INITIAL_STATE.easeFactor);
    });
  });
});
