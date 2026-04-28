/**
 * Lightweight engagement tracker for the iOS PWA install prompt.
 * Call signalEngagement() whenever a user completes a meaningful action.
 * After THRESHOLD completions the prompt becomes eligible to show.
 */

const KEY       = "pwa_engage_count";
const THRESHOLD = 2; // show after 2 completed sessions (quiz or flashcard)

export function signalEngagement(): void {
  if (typeof window === "undefined") return;
  const count = Number(localStorage.getItem(KEY) ?? "0") + 1;
  localStorage.setItem(KEY, String(count));
  if (count >= THRESHOLD) {
    window.dispatchEvent(new CustomEvent("patholearn:prompt-install"));
  }
}

export function getEngagementCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(KEY) ?? "0");
}
