import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free for 14 days — no credit card required. Upgrade to PathoLearn Premium for ₦4,500/month or ₦45,000/year. Unlimited AI slide analysis, full quiz bank, PDF export and more.",
  openGraph: {
    title: "PathoLearn Pricing — From ₦4,500/month",
    description:
      "Start free for 14 days. Unlimited AI slide analysis, full quiz bank, PDF export and more. From ₦4,500/month.",
    url: "/pricing",
  },
  twitter: {
    title: "PathoLearn Pricing — From ₦4,500/month",
    description:
      "Start free for 14 days. Unlimited AI slide analysis, full quiz bank and more. From ₦4,500/month.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
