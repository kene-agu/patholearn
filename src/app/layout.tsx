import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PathoLearn — Histopathology Learning Platform",
  description:
    "Master histopathology slides with AI-powered visual analysis, smart annotations, and interactive learning modules.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
