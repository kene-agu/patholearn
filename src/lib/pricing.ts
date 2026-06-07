export type Plan = "monthly" | "annual";

export const PRICES: Record<Plan, number> = {
  monthly: 3000,
  annual: 30000,
};

export function formatPrice(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

export function annualSavings(): number {
  return PRICES.monthly * 12 - PRICES.annual;
}

export function annualPerMonth(): number {
  return Math.round(PRICES.annual / 12);
}
