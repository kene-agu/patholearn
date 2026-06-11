export type Plan = "monthly" | "annual";

export const PRICES: Record<Plan, number> = {
  monthly: 3000,
  annual: 30000,
};

export function formatPrice(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function annualSavings(): number {
  return Math.round((PRICES.monthly * 12 - PRICES.annual) * 100) / 100;
}

export function annualPerMonth(): number {
  return Math.round((PRICES.annual / 12) * 100) / 100;
}
