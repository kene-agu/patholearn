export type Plan = "monthly" | "annual";

export const PRICES: Record<Plan, number> = {
  monthly: 2.99,
  annual: 29.99,
};

export function formatPrice(amount: number): string {
  return `$${Number(amount.toFixed(2))}`;
}

export function annualSavings(): number {
  return Math.round((PRICES.monthly * 12 - PRICES.annual) * 100) / 100;
}

export function annualPerMonth(): number {
  return Math.round((PRICES.annual / 12) * 100) / 100;
}
