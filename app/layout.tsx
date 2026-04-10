import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Healthvibe — Proactive Health & Nutrition",
  description:
    "Vision-First AI food logging with Energy Availability tracking, biometric wave monitoring, and contextual nudges to keep your body in the optimal zone.",
  openGraph: {
    title: "Healthvibe",
    description: "Proactive health tracking powered by Gemini Vision and Energy Availability science.",
  },
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
