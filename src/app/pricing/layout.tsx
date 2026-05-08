import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free for 14 days — no credit card required. Upgrade to PathoLearn Premium for $3/month or $30/year. Unlimited AI slide analysis, full quiz bank, PDF export and more.",
  openGraph: {
    title: "PathoLearn Pricing — From $3/month",
    description:
      "Start free for 14 days. Unlimited AI slide analysis, full quiz bank, PDF export and more. From $3/month.",
    url: "/pricing",
  },
  twitter: {
    title: "PathoLearn Pricing — From $3/month",
    description:
      "Start free for 14 days. Unlimited AI slide analysis, full quiz bank and more. From $3/month.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
