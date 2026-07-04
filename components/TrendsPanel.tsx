/**
 * TrendsPanel.tsx — day-over-day history view.
 * Reads the rolling daily snapshots from localStorage and charts the last ~14
 * days (Energy Availability, vitality, calories) plus a logging streak.
 */
"use client";

import { useState } from "react";
import { loadHistoryLocal, type DailySnapshot } from "@/lib/localStore";
import styles from "./TrendsPanel.module.css";

const WINDOW = 14;

function parseDate(stamp: string): Date {
  const [y, m, d] = stamp.split("-").map(Number);
  return new Date(y, m, d);
}

/** Trailing run of consecutive calendar days that have food logged. */
function computeStreak(history: DailySnapshot[]): number {
  const foodDays = history.filter((s) => s.energyIntake > 0);
  if (foodDays.length === 0) return 0;
  let streak = 1;
  for (let i = foodDays.length - 1; i > 0; i--) {
    const cur = parseDate(foodDays[i].date).getTime();
    const prev = parseDate(foodDays[i - 1].date).getTime();
    const diffDays = Math.round((cur - prev) / 86_400_000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

interface ChartProps {
  title: string;
  unit: string;
  values: number[];
  labels: string[];
  color: string;
  max?: number;
}

function MiniBars({ title, unit, values, labels, color, max }: ChartProps) {
  const peak = max ?? Math.max(1, ...values);
  const latest = values[values.length - 1] ?? 0;
  return (
    <div className={styles.chart}>
      <div className={styles.chartHead}>
        <span className={styles.chartTitle}>{title}</span>
        <span className={styles.chartLatest} style={{ color, textShadow: `0 0 14px ${color}` }}>
          {Math.round(latest)}
          <span className={styles.chartUnit}>{unit}</span>
        </span>
      </div>
      <div className={styles.bars}>
        {values.map((v, i) => (
          <div key={i} className={styles.barCol} title={`${labels[i]}: ${Math.round(v)}${unit}`}>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{
                  height: `${Math.max(3, Math.min(100, (v / peak) * 100))}%`,
                  background: color,
                  opacity: i === values.length - 1 ? 1 : 0.5,
                  boxShadow: i === values.length - 1 ? `0 0 12px ${color}` : "none",
                }}
              />
            </div>
            <span className={styles.barLabel}>{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrendsPanel() {
  // Client-only component (ssr:false) → safe to read localStorage at init.
  const [history] = useState<DailySnapshot[]>(() => loadHistoryLocal());

  const recent = history.slice(-WINDOW);
  const streak = computeStreak(history);
  const labels = recent.map((s) => s.label);

  if (recent.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyIcon}>📈</p>
        <p className={styles.emptyText}>Your trends build as you use Healthvibe.</p>
        <p className={styles.emptyHint}>Log a meal and set your sleep/exercise — come back tomorrow to see the streak grow.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Your Trends</h3>
          <p className={styles.sub}>Last {recent.length} day{recent.length > 1 ? "s" : ""} tracked</p>
        </div>
        <div className={styles.streak}>
          <span className={styles.streakNum}>🔥 {streak}</span>
          <span className={styles.streakLabel}>day streak</span>
        </div>
      </div>

      <MiniBars
        title="Energy Availability"
        unit=" kcal/kg"
        values={recent.map((s) => s.ea)}
        labels={labels}
        color="#5eead4"
        max={60}
      />
      <MiniBars
        title="Vitality"
        unit="/10"
        values={recent.map((s) => s.vitalityScore)}
        labels={labels}
        color="#818cf8"
        max={10}
      />
      <MiniBars
        title="Calories"
        unit=" kcal"
        values={recent.map((s) => s.energyIntake)}
        labels={labels}
        color="#f59e0b"
      />
      <MiniBars
        title="Protein"
        unit=" g"
        values={recent.map((s) => s.protein)}
        labels={labels}
        color="#10b981"
      />
    </div>
  );
}
