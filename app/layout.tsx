import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
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
