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
