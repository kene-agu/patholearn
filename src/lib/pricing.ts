export type Plan = "monthly" | "annual";

export const PRICES: Record<Plan, number> = {
  monthly: 3,
  annual: 30,
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
