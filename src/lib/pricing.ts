export type Plan = "monthly" | "annual";

export const PRICES: Record<Plan, number> = {
  monthly: 2.99,
  annual: 29.99,
};

export function formatPrice(amount: number): string {
  return `$${amount}`;
}

export function annualSavings(): number {
  return PRICES.monthly * 12 - PRICES.annual;
}

export function annualPerMonth(): number {
  return Math.round(PRICES.annual / 12);
}
