/**
 * ContextualNudge — monitors Vitality Score and surfaces push-style alerts
 */
"use client";

import { useEffect, useRef, useState } from "react";
import type { EAStatus } from "@/lib/ThemeConfig";
import styles from "./ContextualNudge.module.css";

interface Nudge {
  id: string;
  message: string;
  status: EAStatus;
  timestamp: number;
}

interface Props {
  vitalityScore: number;
  vitalityStatus: EAStatus;
  ea: number;
  eaStatus: EAStatus;
}

const MESSAGES: Record<string, string[]> = {
  red: [
    "⚠ Energy Availability is critically low. Eat a balanced snack now.",
    "🔴 Vitality Score dropped below 4 — consider a protein-rich meal.",
    "🩸 Low EA detected. Your body may enter a catabolic state.",
  ],
  amber: [
    "🟡 EA is moderate. Stay hydrated and watch your next meal's macros.",
    "💛 Vitality trending down. A 20-min walk could help balance burn.",
  ],
};

export default function ContextualNudge({ vitalityScore, vitalityStatus, eaStatus }: Props) {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const prevStatusRef = useRef<EAStatus>(vitalityStatus);
  const sentAtRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const shouldAlert =
      (vitalityStatus === "red" || vitalityStatus === "amber") &&
      (prevStatusRef.current !== vitalityStatus || now - sentAtRef.current > 30_000);

    if (shouldAlert) {
      const pool = MESSAGES[vitalityStatus] ?? [];
      const message = pool[Math.floor(Math.random() * pool.length)];
      const nudge: Nudge = {
        id: Math.random().toString(36).slice(2),
        message,
        status: vitalityStatus,
        timestamp: now,
      };
      setNudges((prev) => [nudge, ...prev].slice(0, 3));
      sentAtRef.current = now;
    }
    prevStatusRef.current = vitalityStatus;
  }, [vitalityScore, vitalityStatus, eaStatus]);

  const dismiss = (id: string) => setNudges((prev) => prev.filter((n) => n.id !== id));

  if (nudges.length === 0) return null;

  return (
    <div className={styles.container} aria-live="polite" role="alert">
      {nudges.map((nudge) => (
        <div
          key={nudge.id}
          className={`${styles.nudge} ${styles[nudge.status]}`}
        >
          <p className={styles.message}>{nudge.message}</p>
          <button
            className={styles.dismiss}
            onClick={() => dismiss(nudge.id)}
            aria-label="Dismiss notification"
            id={`nudgeDismiss-${nudge.id}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
