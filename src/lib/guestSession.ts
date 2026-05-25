// Client-side guest analysis metering. This is for UX only (showing how many
// free runs remain and when to surface the sign-up prompt). The authoritative
// limit is enforced server-side per IP in src/lib/guestQuota.ts — keep the
// numbers here in sync with GUEST_DAILY_ANALYSES there.
export const GUEST_FREE_ANALYSES = 3;

const KEY = "pl_guest_analyses";

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC, matches server)
}

export function getGuestAnalysesUsed(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const { date, used } = JSON.parse(raw) as { date: string; used: number };
    return date === today() ? used : 0;
  } catch {
    return 0;
  }
}

export function getGuestAnalysesLeft(): number {
  return Math.max(0, GUEST_FREE_ANALYSES - getGuestAnalysesUsed());
}

export function incrementGuestAnalysesUsed(): void {
  if (typeof window === "undefined") return;
  try {
    const used = getGuestAnalysesUsed() + 1;
    localStorage.setItem(KEY, JSON.stringify({ date: today(), used }));
  } catch {
    // localStorage unavailable (private mode) — server still enforces the cap.
  }
}
