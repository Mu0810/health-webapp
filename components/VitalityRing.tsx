/**
 * VitalityRing — Central pulsing EA gauge
 */
"use client";

import { useMemo } from "react";
import type { EAStatus } from "@/lib/ThemeConfig";
import { StatusColor, StatusLabel } from "@/lib/ThemeConfig";
import styles from "./VitalityRing.module.css";

interface Props {
  score: number;        // 0–10
  ea: number;           // kcal/kg FFM/day
  status: EAStatus;
  eaStatus: EAStatus;
}

export default function VitalityRing({ score, ea, status, eaStatus }: Props) {
  const R = 70;
  const CX = 90;
  const CY = 90;
  const circumference = 2 * Math.PI * R;
  const progress = Math.min(1, Math.max(0, score / 10));
  const dash = progress * circumference;

  const color = StatusColor[status].primary;
  const glow = StatusColor[status].glow;
  const eaColor = StatusColor[eaStatus].primary;
  const label = StatusLabel[status];

  const trackColor = "rgba(255,255,255,0.06)";

  const rotation = -90; // start from top

  return (
    <div className={styles.wrapper}>
      <svg width="180" height="180" viewBox="0 0 180 180" className={styles.svg}>
        <defs>
          <filter id="ringGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle cx={CX} cy={CY} r={R + 12} fill="url(#bgGrad)" opacity="0.5" className={styles.ambientPulse} />

        {/* Track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={trackColor}
          strokeWidth="10"
        />

        {/* Progress arc */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(${rotation} ${CX} ${CY})`}
          filter="url(#ringGlow)"
          className={styles.arc}
        />

        {/* Center score */}
        <text x={CX} y={CY - 8} textAnchor="middle" className={styles.scoreText} fill={color}>
          {score.toFixed(1)}
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" className={styles.labelText} fill={color} opacity="0.7">
          {label}
        </text>
        <text x={CX} y={CY + 26} textAnchor="middle" className={styles.eaText} fill={eaColor} opacity="0.6">
          EA {ea} kcal
        </text>
      </svg>
      <p className={styles.caption}>Vitality Score</p>
    </div>
  );
}
