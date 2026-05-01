// Multi-currency pricing — single source of truth shared by the
// pricing page UI, the /api/subscribe route, and /api/verify-payment.
//
// Adding a currency: add an entry to PRICES + CURRENCY_META, then make sure
// Flutterwave supports it (most major currencies do).

export type Currency = "NGN" | "USD" | "GBP" | "EUR" | "KES" | "GHS" | "ZAR";
export type Plan = "monthly" | "annual";

export const PRICES: Record<Currency, Record<Plan, number>> = {
  NGN: { monthly: 5_000,  annual: 45_000 },
  USD: { monthly: 5,      annual: 45     },
  GBP: { monthly: 4,      annual: 36     },
  EUR: { monthly: 5,      annual: 45     },
  KES: { monthly: 650,    annual: 5_850  },
  GHS: { monthly: 60,     annual: 540    },
  ZAR: { monthly: 90,     annual: 810    },
};

export const CURRENCY_META: Record<Currency, { symbol: string; label: string; flag: string }> = {
  NGN: { symbol: "₦",  label: "Nigerian Naira",   flag: "🇳🇬" },
  USD: { symbol: "$",  label: "US Dollar",        flag: "🇺🇸" },
  GBP: { symbol: "£",  label: "British Pound",    flag: "🇬🇧" },
  EUR: { symbol: "€",  label: "Euro",             flag: "🇪🇺" },
  KES: { symbol: "KSh", label: "Kenyan Shilling", flag: "🇰🇪" },
  GHS: { symbol: "₵",  label: "Ghanaian Cedi",    flag: "🇬🇭" },
  ZAR: { symbol: "R",  label: "South African Rand", flag: "🇿🇦" },
};

// Map ISO country code → preferred currency. Anything not listed → USD.
const COUNTRY_TO_CURRENCY: Record<string, Currency> = {
  NG: "NGN",
  KE: "KES",
  GH: "GHS",
  ZA: "ZAR",
  GB: "GBP",
  IE: "EUR",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", BE: "EUR", AT: "EUR", PT: "EUR",
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
