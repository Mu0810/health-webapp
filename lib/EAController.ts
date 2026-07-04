/**
 * EAController.ts
 * Reactive controller for Energy Availability + biometric state management.
 * EA = (EI - EEE) / FFM
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getEAStatus, getVitalityStatus, type EAStatus } from "./ThemeConfig";
import { getDeviceId } from "./device";
import {
  loadTodayLogsLocal,
  saveTodayLogsLocal,
  loadDailyMetricsLocal,
  saveDailyMetricsLocal,
} from "./localStore";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BiometricState {
  glucose: number;        // mg/dL
  hrv: number;            // Heart Rate Variability in ms
  activeBurn: number;     // Active calories burned (EEE component)
  glucoseHistory: { timestamp: number; value: number }[];
}

export interface NutritionState {
  energyIntake: number;   // EI in kcal
  protein: number;
  carbs: number;
  fats: number;
  logs: FoodEntry[];
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  glycemicIndex?: number;
  timestamp: number;
}

export interface GravityState {
  biometrics: BiometricState;
  nutrition: NutritionState;
  ffm: number;            // Fat-Free Mass in kg
  ea: number;             // Energy Availability kcal/kg FFM/day
  eaStatus: EAStatus;
  vitalityScore: number;  // Composite score 0–10
  vitalityStatus: EAStatus;
  sleepHours: number;
}

// ─── Demo seed data ──────────────────────────────────────────────────────────

function seedGlucoseHistory() {
  const now = Date.now();
  return Array.from({ length: 12 }, (_, i) => ({
    timestamp: now - (11 - i) * 60 * 60 * 1000,
    value: 80 + Math.sin(i * 0.8) * 20 + Math.random() * 8,
  }));
}

// ─── EA Formula ──────────────────────────────────────────────────────────────

export function calcEA(ei: number, eee: number, ffm: number): number {
  if (ffm <= 0) return 0;
  return (ei - eee) / ffm;
}

export function calcVitalityScore(ea: number, sleepHours: number): number {
  // Composite 0–10: Energy Availability contributes up to 7 points (optimal
  // EA of 45 → the full 7), sleep contributes up to 3 (8h → the full 3).
  const eaNorm = Math.min(7, Math.max(0, (ea / 45) * 7));
  const sleepNorm = Math.min(3, Math.max(0, (sleepHours / 8) * 3));
  return Math.round((eaNorm + sleepNorm) * 10) / 10;
}

/** Sum a list of food entries into cumulative nutrition totals. */
function totalsFromLogs(logs: FoodEntry[]) {
  return logs.reduce(
    (acc, l) => ({
      energyIntake: acc.energyIntake + l.calories,
      protein: acc.protein + l.protein,
      carbs: acc.carbs + l.carbs,
      fats: acc.fats + l.fats,
    }),
    { energyIntake: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEFAULT_STATE: GravityState = {
  biometrics: {
    glucose: 92,
    hrv: 58,
    activeBurn: 0, // exercise energy (EEE) — user-entered; 0 until a workout is logged
    glucoseHistory: [],
  },
  // Nutrition starts empty and is hydrated from the database (today's logs).
  nutrition: {
    energyIntake: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    logs: [],
  },
  ffm: 62,
  ea: 0,
  eaStatus: "green",
  vitalityScore: 0,
  vitalityStatus: "green",
  sleepHours: 7.5, // user-entered; sensible default until set
};

export function useGravity() {
  const [state, setState] = useState<GravityState>(() => {
    const ea = calcEA(
      DEFAULT_STATE.nutrition.energyIntake,
      DEFAULT_STATE.biometrics.activeBurn,
      DEFAULT_STATE.ffm
    );
    const vs = calcVitalityScore(ea, DEFAULT_STATE.sleepHours);
    return {
      ...DEFAULT_STATE,
      biometrics: {
        ...DEFAULT_STATE.biometrics,
        glucoseHistory: seedGlucoseHistory(),
      },
      ea,
      eaStatus: getEAStatus(ea),
      vitalityScore: vs,
      vitalityStatus: getVitalityStatus(vs),
    };
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceIdRef = useRef<string>("");
  const logsRef = useRef<FoodEntry[]>([]);

  // Keep a ref of the current logs so logFood can persist without stale reads.
  useEffect(() => {
    logsRef.current = state.nutrition.logs;
  }, [state.nutrition.logs]);

  // Hydrate today's food logs: offline-first from localStorage, then sync from
  // the database if one is configured (server copy wins when present).
  useEffect(() => {
    const id = getDeviceId();
    deviceIdRef.current = id;
    let cancelled = false;

    const applyLogs = (logs: FoodEntry[]) => {
      setState((prev) => {
        const totals = totalsFromLogs(logs);
        const ea = calcEA(totals.energyIntake, prev.biometrics.activeBurn, prev.ffm);
        const vs = calcVitalityScore(ea, prev.sleepHours);
        return {
          ...prev,
          nutrition: { ...totals, logs },
          ea: Math.round(ea * 10) / 10,
          eaStatus: getEAStatus(ea),
          vitalityScore: vs,
          vitalityStatus: getVitalityStatus(vs),
        };
      });
    };

    // Apply today's user-entered metrics (sleep + exercise) via a local helper
    // so the setState stays inside a nested function (lint-safe).
    const applyMetrics = (m: { activeBurn: number; sleepHours: number }) => {
      setState((prev) => {
        const ea = calcEA(prev.nutrition.energyIntake, m.activeBurn, prev.ffm);
        const vs = calcVitalityScore(ea, m.sleepHours);
        return {
          ...prev,
          biometrics: { ...prev.biometrics, activeBurn: m.activeBurn },
          sleepHours: m.sleepHours,
          ea: Math.round(ea * 10) / 10,
          eaStatus: getEAStatus(ea),
          vitalityScore: vs,
          vitalityStatus: getVitalityStatus(vs),
        };
      });
    };

    // 1) Show locally-persisted logs + metrics immediately.
    const local = loadTodayLogsLocal();
    if (local.length) {
      logsRef.current = local;
      applyLogs(local);
    }
    const dm = loadDailyMetricsLocal();
    if (dm) applyMetrics(dm);

    // 2) Sync from the server when a DB is configured.
    if (id) {
      (async () => {
        try {
          const res = await fetch(`/api/logs?userId=${encodeURIComponent(id)}`);
          if (!res.ok) return;
          const { logs } = await res.json();
          if (cancelled || !Array.isArray(logs) || logs.length === 0) return;

          const mapped: FoodEntry[] = logs.map((l: Record<string, unknown>) => ({
            id: String(l.id),
            name: String(l.name),
            calories: Number(l.calories),
            protein: Number(l.protein),
            carbs: Number(l.carbs),
            fats: Number(l.fats),
            glycemicIndex: l.glycemicIndex == null ? undefined : Number(l.glycemicIndex),
            timestamp: new Date(String(l.timestamp)).getTime(),
          }));

          logsRef.current = mapped;
          saveTodayLogsLocal(mapped);
          applyLogs(mapped);
        } catch {
          // Offline / no DB — the localStorage copy already applied above.
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Simulate real-time biometric fluctuations.
  // The tick only runs while the tab is visible: a backgrounded tab gains
  // nothing from simulated glucose/HRV drift, and each tick forces a full
  // dashboard re-render — so pausing it saves CPU + battery and avoids
  // throttled-timer jank when the user returns.
  useEffect(() => {
    const tick = () => {
      setState((prev) => {
        const newGlucose = Math.max(
          65,
          Math.min(180, prev.biometrics.glucose + (Math.random() - 0.48) * 3)
        );
        const newHrv = Math.max(
          30,
          Math.min(100, prev.biometrics.hrv + (Math.random() - 0.5) * 1.5)
        );
        const now = Date.now();
        const glucoseHistory = [
          ...prev.biometrics.glucoseHistory.slice(-23),
          { timestamp: now, value: newGlucose },
        ];

        const ea = calcEA(prev.nutrition.energyIntake, prev.biometrics.activeBurn, prev.ffm);
        const vs = calcVitalityScore(ea, prev.sleepHours);

        return {
          ...prev,
          biometrics: { ...prev.biometrics, glucose: newGlucose, hrv: Math.round(newHrv), glucoseHistory },
          ea: Math.round(ea * 10) / 10,
          eaStatus: getEAStatus(ea),
          vitalityScore: vs,
          vitalityStatus: getVitalityStatus(vs),
        };
      });
    };

    const start = () => {
      if (intervalRef.current == null) {
        intervalRef.current = setInterval(tick, 3000);
      }
    };
    const stop = () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.hidden) stop();
      else start();
    };

    // Start only if visible; pause/resume on tab visibility changes.
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, []);

  const logFood = useCallback((entry: Omit<FoodEntry, "id" | "timestamp">) => {
    const newEntry: FoodEntry = {
      ...entry,
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
    };

    // Offline-first: persist to localStorage immediately.
    const nextLogs = [newEntry, ...logsRef.current];
    logsRef.current = nextLogs;
    saveTodayLogsLocal(nextLogs);

    // Write-through to the database when configured (fire-and-forget).
    const id = deviceIdRef.current || getDeviceId();
    if (id) {
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, ...entry }),
      }).catch(() => {
        /* offline / no DB — localStorage already holds the entry */
      });
    }

    setState((prev) => {
      const newEI = prev.nutrition.energyIntake + entry.calories;
      const ea = calcEA(newEI, prev.biometrics.activeBurn, prev.ffm);
      const vs = calcVitalityScore(ea, prev.sleepHours);
      return {
        ...prev,
        nutrition: {
          ...prev.nutrition,
          energyIntake: newEI,
          protein: prev.nutrition.protein + entry.protein,
          carbs: prev.nutrition.carbs + entry.carbs,
          fats: prev.nutrition.fats + entry.fats,
          logs: [newEntry, ...prev.nutrition.logs],
        },
        ea: Math.round(ea * 10) / 10,
        eaStatus: getEAStatus(ea),
        vitalityScore: vs,
        vitalityStatus: getVitalityStatus(vs),
      };
    });
  }, []);

  const updateBiometrics = useCallback((patch: Partial<BiometricState>) => {
    setState((prev) => {
      const merged = { ...prev.biometrics, ...patch };
      const ea = calcEA(prev.nutrition.energyIntake, merged.activeBurn, prev.ffm);
      const vs = calcVitalityScore(ea, prev.sleepHours);
      return {
        ...prev,
        biometrics: merged,
        ea: Math.round(ea * 10) / 10,
        eaStatus: getEAStatus(ea),
        vitalityScore: vs,
        vitalityStatus: getVitalityStatus(vs),
      };
    });
  }, []);

  // User-entered daily metrics: exercise burn (EEE) + sleep. These feed the
  // real EA/vitality math and persist offline-first (today-scoped).
  const setDailyMetrics = useCallback(
    (patch: { activeBurn?: number; sleepHours?: number }) => {
      setState((prev) => {
        const activeBurn = Math.max(0, patch.activeBurn ?? prev.biometrics.activeBurn);
        const sleepHours = Math.max(0, patch.sleepHours ?? prev.sleepHours);
        saveDailyMetricsLocal({ activeBurn, sleepHours });
        const ea = calcEA(prev.nutrition.energyIntake, activeBurn, prev.ffm);
        const vs = calcVitalityScore(ea, sleepHours);
        return {
          ...prev,
          biometrics: { ...prev.biometrics, activeBurn },
          sleepHours,
          ea: Math.round(ea * 10) / 10,
          eaStatus: getEAStatus(ea),
          vitalityScore: vs,
          vitalityStatus: getVitalityStatus(vs),
        };
      });
    },
    []
  );

  return { state, logFood, updateBiometrics, setDailyMetrics };
}
