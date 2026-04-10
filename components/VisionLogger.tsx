/**
 * VisionLogger — Upload food photo → laser-scan animation → AI nutrition result
 */
"use client";

import { useState, useRef, useCallback } from "react";
import type { FoodEntry } from "@/lib/EAController";
import styles from "./VisionLogger.module.css";

interface Props {
  onFoodLogged: (entry: Omit<FoodEntry, "id" | "timestamp">) => void;
}

interface VisionResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  glycemic_index: number | null;
  confidence: "high" | "medium" | "low";
}

export default function VisionLogger({ onFoodLogged }: Props) {
  const [phase, setPhase] = useState<"idle" | "preview" | "scanning" | "result">("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    fileRef.current = file;
    setImageUrl(URL.createObjectURL(file));
    setPhase("preview");
    setResult(null);
    setError(null);
  }, []);

  const handleScan = useCallback(async () => {
    if (!fileRef.current) return;
    setPhase("scanning");
    setError(null);

    const fd = new FormData();
    fd.append("image", fileRef.current);

    try {
      const res = await fetch("/api/vision", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data: VisionResult = await res.json();
      setResult(data);
      setPhase("result");
    } catch (err) {
      setError(String(err));
      setPhase("preview");
    }
  }, []);

  const handleLog = useCallback(() => {
    if (!result) return;
    onFoodLogged({
      name: result.name,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fats: result.fats,
      glycemicIndex: result.glycemic_index ?? undefined,
    });
    setPhase("idle");
    setImageUrl(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [result, onFoodLogged]);

  const handleReset = () => {
    setPhase("idle");
    setImageUrl(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const confidenceColor = {
    high: "#10b981",
    medium: "#f59e0b",
    low: "#ef4444",
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>🔬</span>
        <div>
          <h3 className={styles.title}>Vision Logger</h3>
          <p className={styles.subtitle}>AI-powered food recognition</p>
        </div>
      </div>

      {phase === "idle" && (
        <label className={styles.dropzone} htmlFor="foodImageInput">
          <div className={styles.dropzoneInner}>
            <div className={styles.dropzoneIcon}>📸</div>
            <p className={styles.dropzoneText}>Drop a food photo or tap to capture</p>
            <p className={styles.dropzoneHint}>Gemini Vision analyses macros instantly</p>
          </div>
          <input
            id="foodImageInput"
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className={styles.hiddenInput}
            onChange={handleFileChange}
          />
        </label>
      )}

      {(phase === "preview" || phase === "scanning" || phase === "result") && imageUrl && (
        <div className={styles.imageWrapper}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Food preview" className={styles.foodImage} />

          {phase === "scanning" && (
            <div className={styles.scanOverlay}>
              <div className={styles.laserBeam} />
              <div className={styles.scanText}>Analysing with Gemini Vision…</div>
            </div>
          )}
        </div>
      )}

      {error && <p className={styles.error}>⚠ {error}</p>}

      {phase === "result" && result && (
        <div className={styles.result}>
          <div className={styles.resultHeader}>
            <span className={styles.resultName}>{result.name}</span>
            <span
              className={styles.confidence}
              style={{ color: confidenceColor[result.confidence] }}
            >
              {result.confidence} confidence
            </span>
          </div>
          <div className={styles.macros}>
            <MacroChip label="Calories" value={`${result.calories}`} unit="kcal" color="#f59e0b" />
            <MacroChip label="Protein" value={`${result.protein}g`} unit="" color="#10b981" />
            <MacroChip label="Carbs" value={`${result.carbs}g`} unit="" color="#3b82f6" />
            <MacroChip label="Fat" value={`${result.fats}g`} unit="" color="#ec4899" />
            {result.glycemic_index !== null && (
              <MacroChip label="GI" value={`${result.glycemic_index}`} unit="" color="#8b5cf6" />
            )}
          </div>
          <div className={styles.actions}>
            <button className={styles.btnLog} onClick={handleLog} id="visionLogBtn">
              ✓ Log Meal
            </button>
            <button className={styles.btnReset} onClick={handleReset} id="visionResetBtn">
              Retake
            </button>
          </div>
        </div>
      )}

      {phase === "preview" && (
        <div className={styles.actions}>
          <button className={styles.btnScan} onClick={handleScan} id="visionScanBtn">
            ⚡ Scan with AI
          </button>
          <button className={styles.btnReset} onClick={handleReset} id="visionCancelBtn">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function MacroChip({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className={styles.macroChip} style={{ borderColor: `${color}40` }}>
      <span className={styles.macroLabel}>{label}</span>
      <span className={styles.macroValue} style={{ color }}>
        {value}
        {unit && <span className={styles.macroUnit}>{unit}</span>}
      </span>
    </div>
  );
}
