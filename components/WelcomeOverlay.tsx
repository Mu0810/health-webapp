/**
 * WelcomeOverlay — First-run welcome / onboarding modal.
 *
 * Shown once (persisted via lib/localStore `hv_onboarded`) to orient new users:
 * explains what Healthvibe measures and the 3-step path to real data, so the
 * dashboard's simulated demo sensors don't read as "the app is broken / fake".
 *
 * Accessibility: role=dialog + aria-modal, labelled by its heading, closes on
 * Escape and backdrop click, and moves focus to the primary action on mount.
 */
"use client";

import { useEffect, useRef } from "react";
import styles from "./WelcomeOverlay.module.css";

interface Props {
  /** Dismiss without navigating (user chose "Explore first"). */
  onDismiss: () => void;
  /** Dismiss and jump straight into profile setup (primary path). */
  onSetupProfile: () => void;
}

const STEPS = [
  {
    icon: "🧬",
    title: "Set up your profile",
    body: "Age, weight, height and goal — we compute your BMR, TDEE and macro targets instantly.",
  },
  {
    icon: "📸",
    title: "Snap or log your meals",
    body: "Point the camera at your plate and AI estimates calories and macros, or add them by hand.",
  },
  {
    icon: "⚡",
    title: "Watch your Energy Availability",
    body: "The whole app breathes with your vitality — stay in the optimal zone (EA ≥ 45 kcal/kg).",
  },
];

export default function WelcomeOverlay({ onDismiss, onSetupProfile }: Props) {
  const primaryRef = useRef<HTMLButtonElement | null>(null);

  // Move focus to the primary CTA and close on Escape.
  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className={styles.backdrop}
      onClick={onDismiss}
      role="presentation"
    >
      <div
        className={`glass-card ${styles.card}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcomeTitle"
        aria-describedby="welcomeIntro"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onDismiss}
          aria-label="Close welcome"
        >
          ✕
        </button>

        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true">⚡</span>
          <span className={styles.brandName}>Healthvibe</span>
        </div>

        <h2 id="welcomeTitle" className={styles.title}>
          Welcome — let&apos;s get your vitals live
        </h2>
        <p id="welcomeIntro" className={styles.intro}>
          Healthvibe tracks your <strong>Energy Availability</strong> — the fuel left for
          your body after exercise. Here&apos;s how to make the numbers yours in three steps.
        </p>

        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={i} className={styles.step}>
              <span className={styles.stepIcon} aria-hidden="true">{s.icon}</span>
              <span className={styles.stepText}>
                <span className={styles.stepTitle}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  {s.title}
                </span>
                <span className={styles.stepBody}>{s.body}</span>
              </span>
            </li>
          ))}
        </ol>

        <p className={styles.note}>
          ◦ Glucose &amp; HRV start as simulated demo sensors — connect a wearable or CGM to make them real.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            ref={primaryRef}
            className={styles.primary}
            onClick={onSetupProfile}
          >
            🧬 Set up my profile
          </button>
          <button type="button" className={styles.secondary} onClick={onDismiss}>
            Explore first
          </button>
        </div>
      </div>
    </div>
  );
}
