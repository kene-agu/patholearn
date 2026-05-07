// Multi-currency pricing — single source of truth shared by the
// pricing page UI, the /api/subscribe route, and /api/verify-payment.
//
// Adding a currency: add an entry to PRICES + CURRENCY_META, then make sure
// Flutterwave supports it (most major currencies do).

export type Currency = "NGN" | "USD" | "GBP" | "EUR";
export type Plan = "monthly" | "annual";

export const PRICES: Record<Currency, Record<Plan, number>> = {
  NGN: { monthly: 5_000, annual: 45_000 },
  USD: { monthly: 9,     annual: 80     },
  GBP: { monthly: 7,     annual: 65     },
  EUR: { monthly: 8,     annual: 72     },
};

export const CURRENCY_META: Record<Currency, { symbol: string; label: string; flag: string }> = {
  NGN: { symbol: "₦", label: "Nigerian Naira", flag: "🇳🇬" },
  USD: { symbol: "$", label: "US Dollar",       flag: "🇺🇸" },
  GBP: { symbol: "£", label: "British Pound",   flag: "🇬🇧" },
  EUR: { symbol: "€", label: "Euro",            flag: "🇪🇺" },
};

// Map ISO country code → preferred currency. Anything not listed → USD.
const COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  NG: "NGN",
  GB: "GBP",
  // Eurozone
  IE: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", PT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
  SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", CY: "EUR",
  MT: "EUR", HR: "EUR",
};

export function currencyFromCountry(country: string | null | undefined): Currency {
  if (!country) return "USD";
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? "USD";
}

export function isValidCurrency(c: unknown): c is Currency {
  return typeof c === "string" && c in PRICES;
}

export function formatPrice(amount: number, currency: Currency): string {
  const meta = CURRENCY_META[currency];
  // No decimals for whole-amount currencies; locale formatting for separators
  return `${meta.symbol}${amount.toLocaleString()}`;
}

// Annual savings vs paying monthly for 12 months
export function annualSavings(currency: Currency): number {
  const m = PRICES[currency].monthly;
  const a = PRICES[currency].annual;
  return m * 12 - a;
}

export function annualPerMonth(currency: Currency): number {
  return Math.round(PRICES[currency].annual / 12);
}
