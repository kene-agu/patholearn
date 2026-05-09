import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import ThemeProvider from "@/components/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { FloatingChatWidget } from "@/components/SupportChatbot";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.getpatholearn.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "PathoLearn — AI Histopathology Learning Platform",
    template: "%s | PathoLearn",
  },
  description:
    "Master histopathology with AI-powered slide analysis, smart annotations, interactive quizzes and flashcards. Built for medical students preparing for OSCE and finals.",
  keywords: [
    "histopathology", "pathology slides", "AI slide analysis", "medical education",
    "OSCE preparation", "histology learning", "pathology quiz", "medical student",
    "histopathology flashcards", "histopathology AI",
  ],
  openGraph: {
    type: "website",
    siteName: "PathoLearn",
    title: "PathoLearn — AI Histopathology Learning Platform",
    description:
      "Master histopathology with AI-powered slide analysis, smart annotations, interactive quizzes and flashcards.",
    url: APP_URL,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "PathoLearn logo" }],
  },
  twitter: {
    card: "summary",
    title: "PathoLearn — AI Histopathology Learning Platform",
    description:
      "Master histopathology with AI-powered slide analysis, smart annotations, interactive quizzes and flashcards.",
    images: ["/icon-512.png"],
  },
  verification: {
    google: "Yk_1QR4clth9tO2Y25YEQKb56hmiPcv-St7MRhm0YFM",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PathoLearn",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PathoLearn",
  url: APP_URL,
  description:
    "AI-powered histopathology learning platform for medical students. Includes slide analysis, quizzes, flashcards, and OSCE preparation tools.",
  applicationCategory: "EducationApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "3",
    priceCurrency: "USD",
    description: "Premium monthly plan",
  },
  featureList: [
    "AI-powered histopathology slide analysis",
    "Interactive quiz and flashcard modes",
    "Spaced repetition learning",
    "OSCE timer simulation",
    "PDF export of analyses",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <FloatingChatWidget />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
