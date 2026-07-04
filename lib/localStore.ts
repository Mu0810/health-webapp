/**
 * lib/localStore.ts — Offline-first client persistence (localStorage).
 *
 * Works with zero infrastructure so profile + food logs survive refreshes even
 * when no database is configured. When a DB (Turso) IS configured, the app also
 * write-through-syncs to it via the API, and the server copy takes precedence
 * on load — so this doubles as an offline cache.
 */
"use client";

import type { UserProfile } from "@/components/PersonalProfile";
import type { FoodEntry } from "@/lib/EAController";

const PROFILE_KEY = "hv_profile";
const LOGS_KEY = "hv_logs";

function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota/private-mode — ignore */
  }
}

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ── Profile ──────────────────────────────────────────────────────────────
export function loadProfileLocal(): UserProfile | null {
  return safeGet<UserProfile>(PROFILE_KEY);
}

export function saveProfileLocal(profile: UserProfile): void {
  safeSet(PROFILE_KEY, profile);
}

// ── Food logs (today only) ───────────────────────────────────────────────
export function loadTodayLogsLocal(): FoodEntry[] {
  const all = safeGet<FoodEntry[]>(LOGS_KEY) ?? [];
  return all.filter((l) => isToday(l.timestamp)).sort((a, b) => b.timestamp - a.timestamp);
}

export function saveTodayLogsLocal(logs: FoodEntry[]): void {
  // Persist only today's entries to keep storage bounded.
  safeSet(LOGS_KEY, logs.filter((l) => isToday(l.timestamp)));
}

// ── Daily metrics: user-entered sleep + exercise burn (reset each day) ──────
const METRICS_KEY = "hv_daily_metrics";

export interface DailyMetrics {
  activeBurn: number; // exercise energy burned today (EEE), kcal
  sleepHours: number; // sleep last night, hours
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Returns today's saved metrics, or null if none were saved today. */
export function loadDailyMetricsLocal(): DailyMetrics | null {
  const raw = safeGet<{ date: string } & DailyMetrics>(METRICS_KEY);
  if (!raw || raw.date !== todayStamp()) return null;
  return { activeBurn: raw.activeBurn, sleepHours: raw.sleepHours };
}

export function saveDailyMetricsLocal(metrics: DailyMetrics): void {
  safeSet(METRICS_KEY, { date: todayStamp(), ...metrics });
}

// ── Day-over-day history (rolling snapshots for the Trends view) ────────────
const HISTORY_KEY = "hv_history";

export interface DailySnapshot {
  date: string; // YYYY-M-D
  label: string; // short human label e.g. "Jul 4"
  ea: number;
  vitalityScore: number;
  energyIntake: number;
  protein: number;
  sleepHours: number;
  activeBurn: number;
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function loadHistoryLocal(): DailySnapshot[] {
  return safeGet<DailySnapshot[]>(HISTORY_KEY) ?? [];
}

/**
 * Insert or update today's snapshot in the rolling history (keeps the last 30
 * days). Returns the updated history.
 */
export function recordSnapshotLocal(snap: Omit<DailySnapshot, "date" | "label">): DailySnapshot[] {
  const stamp = todayStamp();
  const entry: DailySnapshot = { date: stamp, label: todayLabel(), ...snap };
  const all = loadHistoryLocal().filter((s) => s.date !== stamp);
  all.push(entry);
  const trimmed = all.slice(-30);
  safeSet(HISTORY_KEY, trimmed);
  return trimmed;
}
