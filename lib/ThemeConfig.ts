/**
 * ThemeConfig.ts
 * Global "Biological Dark Mode" design system — Traffic Light constants and glassmorphic tokens.
 */

export const Colors = {
  // Background
  bg: "#0d1117",
  bgGlass: "rgba(255, 255, 255, 0.04)",
  bgGlassHover: "rgba(255, 255, 255, 0.08)",

  // Borders
  borderGlass: "rgba(255, 255, 255, 0.10)",
  borderGlassStrong: "rgba(255, 255, 255, 0.18)",

  // Traffic Light System
  green: {
    primary: "#10b981",    // Emerald 500
    glow: "rgba(16, 185, 129, 0.35)",
    bg: "rgba(16, 185, 129, 0.12)",
    text: "#34d399",
  },
  amber: {
    primary: "#f59e0b",    // Amber 500
    glow: "rgba(245, 158, 11, 0.35)",
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#fbbf24",
  },
  red: {
    primary: "#ef4444",    // Red 500
    glow: "rgba(239, 68, 68, 0.35)",
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#f87171",
  },

  // Accent gradients
  gradientTeal: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
  gradientAmber: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
  gradientGreen: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
  gradientCrimson: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",

  // Text
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#475569",
} as const;

export const Glass = {
  card: {
    backdropFilter: "blur(12px) saturate(180%)",
    WebkitBackdropFilter: "blur(12px) saturate(180%)",
    background: Colors.bgGlass,
    borderRadius: "24px",
    border: `1px solid ${Colors.borderGlass}`,
  },
  cardStrong: {
    backdropFilter: "blur(20px) saturate(200%)",
    WebkitBackdropFilter: "blur(20px) saturate(200%)",
    background: "rgba(255,255,255,0.06)",
    borderRadius: "24px",
    border: `1px solid ${Colors.borderGlassStrong}`,
  },
} as const;

export type EAStatus = "green" | "amber" | "red";

/**
 * Determine traffic light status from EA score.
 * EA >= 45 kcal/kg FFM/day → Green (optimal)
 * EA 30–45 → Amber (moderate risk)
 * EA < 30  → Red (low energy availability)
 */
export function getEAStatus(ea: number): EAStatus {
  if (ea >= 45) return "green";
  if (ea >= 30) return "amber";
  return "red";
}

export function getVitalityStatus(score: number): EAStatus {
  if (score >= 7) return "green";
  if (score >= 4) return "amber";
  return "red";
}

export interface ColorSwatch {
  readonly primary: string;
  readonly glow: string;
  readonly bg: string;
  readonly text: string;
}

export const StatusColor: Record<EAStatus, ColorSwatch> = {
  green: Colors.green,
  amber: Colors.amber,
  red: Colors.red,
};

export const StatusLabel: Record<EAStatus, string> = {
  green: "Optimal",
  amber: "Monitor",
  red: "Critical",
};
