import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-host Inter via next/font: eliminates the render-blocking
// @import to fonts.googleapis.com, removes the extra network round-trip,
// and prevents layout shift by supplying font metrics (display: swap).
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Healthvibe — Proactive Health & Nutrition",
  description:
    "Vision-First AI food logging with Energy Availability tracking, biometric wave monitoring, and contextual nudges to keep your body in the optimal zone.",
  openGraph: {
    title: "Healthvibe",
    description: "Proactive health tracking powered by AI vision and Energy Availability science.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* Living Organism: a breathing energy glow behind all content, driven
            by the user's real-time vitality state (see [data-vibe] in globals). */}
        <div className="vibe-pulse" aria-hidden="true" />
        {/* One-shot energy ripple played when vitality crosses a threshold. */}
        <div id="vibe-flash" className="vibe-flash" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
