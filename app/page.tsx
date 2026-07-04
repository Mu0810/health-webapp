/**
 * app/page.tsx — Root Bento Grid Layout (App.ag / Root.tsx equivalent)
 * Healthvibe main dashboard
 */
"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useGravity } from "@/lib/EAController";
import { getDeviceId } from "@/lib/device";
import { loadProfileLocal, saveProfileLocal } from "@/lib/localStore";
import { StatusColor, StatusLabel, Colors } from "@/lib/ThemeConfig";
import type { UserProfile } from "@/components/PersonalProfile";
import styles from "./page.module.css";

/** Map a persisted DB profile row onto the client UserProfile type. */
function dbToProfile(p: Record<string, unknown>): UserProfile {
  return {
    name: String(p.name ?? ""),
    age: Number(p.age),
    gender: p.gender as UserProfile["gender"],
    weightKg: Number(p.weightKg),
    heightCm: Number(p.heightCm),
    activityLevel: p.activityLevel as UserProfile["activityLevel"],
    goal: p.goal as UserProfile["goal"],
    dietType: p.dietType as UserProfile["dietType"],
    bmi: Number(p.bmi),
    bmr: Number(p.bmr),
    tdee: Number(p.tdee),
    targetCalories: Number(p.targetCalories),
    targetProtein: Number(p.targetProtein),
    targetCarbs: Number(p.targetCarbs),
    targetFats: Number(p.targetFats),
    ffm: Number(p.ffm),
  };
}

// Shimmer placeholder shown while a lazy widget loads (avoids blank-card flash).
const CardSkeleton = () => <div className="skeleton" aria-hidden="true" />;

// Dynamic imports with SSR disabled for client-heavy widgets
const VisionLogger    = dynamic(() => import("@/components/VisionLogger"),       { ssr: false, loading: CardSkeleton });
const BiometricWave   = dynamic(() => import("@/components/BiometricWave"),      { ssr: false, loading: CardSkeleton });
const VitalityRing    = dynamic(() => import("@/components/VitalityRing"),       { ssr: false, loading: CardSkeleton });
const SmartMenu       = dynamic(() => import("@/components/SmartMenu"),          { ssr: false, loading: CardSkeleton });
const ContextualNudge = dynamic(() => import("@/components/ContextualNudge"),    { ssr: false });
const PersonalProfile = dynamic(() => import("@/components/PersonalProfile"),    { ssr: false, loading: CardSkeleton });
const DietPlanGenerator = dynamic(() => import("@/components/DietPlanGenerator"), { ssr: false, loading: CardSkeleton });
const CoachChat       = dynamic(() => import("@/components/CoachChat"),          { ssr: false, loading: CardSkeleton });
const EnergyTank      = dynamic(() => import("@/components/EnergyTank"),         { ssr: false });

export default function Home() {
  const { state, logFood } = useGravity();
  const { biometrics, nutrition, ea, eaStatus, vitalityScore, vitalityStatus, sleepHours } = state;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "profile" | "dietplan" | "coach">("dashboard");

  // Load a saved profile: offline-first from localStorage, then sync from the
  // database if one is configured (server copy wins when present).
  useEffect(() => {
    const id = getDeviceId();
    let cancelled = false;
    (async () => {
      // Apply the locally-cached profile first for an instant load.
      const local = loadProfileLocal();
      if (!cancelled && local) setProfile(local);
      if (!id) return;
      try {
        const res = await fetch(`/api/profile?userId=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const { profile: saved } = await res.json();
        if (!cancelled && saved) {
          const mapped = dbToProfile(saved);
          setProfile(mapped);
          saveProfileLocal(mapped);
        }
      } catch {
        /* offline / no DB — the localStorage copy already applied above */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Living Organism: reflect real-time vitality onto the entire UI. The whole
  // app breathes faster/brighter when energetic and dims/slows when depleted.
  const prevVibeRef = useRef<string | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-vibe", vitalityStatus);

    const energy = Math.max(0, Math.min(1, vitalityScore / 10));
    root.style.setProperty("--vibe-energy", String(energy));
    // Continuous breathing pace: ~4.5s when fully energised → ~10.5s when depleted.
    root.style.setProperty("--vibe-breathe", `${(10.5 - energy * 6).toFixed(2)}s`);

    // Threshold crossing → replay a one-shot energy ripple (skip first mount).
    if (prevVibeRef.current && prevVibeRef.current !== vitalityStatus) {
      const el = document.getElementById("vibe-flash");
      if (el) {
        el.classList.remove("flash");
        void el.offsetWidth; // force reflow to restart the animation
        el.classList.add("flash");
      }
    }
    prevVibeRef.current = vitalityStatus;
  }, [vitalityStatus, vitalityScore]);

  // Persist the profile whenever the user saves it (localStorage + DB).
  const handleProfileSaved = (p: UserProfile) => {
    setProfile(p);
    setActiveTab("dietplan");
    saveProfileLocal(p);
    const id = getDeviceId();
    if (id) {
      fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id, ...p }),
      }).catch(() => {
        /* offline / no DB — localStorage already holds the profile */
      });
    }
  };

  // Use profile targets if a profile is saved, otherwise fall back to defaults
  const targets = {
    calories: profile?.targetCalories ?? 2400,
    protein:  profile?.targetProtein  ?? 180,
    carbs:    profile?.targetCarbs    ?? 280,
    fats:     profile?.targetFats     ?? 80,
  };

  const eaColor      = StatusColor[eaStatus].primary;
  const vitalityColor = StatusColor[vitalityStatus].primary;
  const vitalityGlow  = StatusColor[vitalityStatus].glow;

  const proteinPct = Math.min(100, (nutrition.protein       / targets.protein)  * 100);
  const carbsPct   = Math.min(100, (nutrition.carbs         / targets.carbs)    * 100);
  const fatsPct    = Math.min(100, (nutrition.fats          / targets.fats)     * 100);
  const calPct     = Math.min(100, (nutrition.energyIntake  / targets.calories) * 100);

  const remainingCal     = Math.max(0, targets.calories - nutrition.energyIntake);
  const remainingProtein = Math.max(0, targets.protein  - nutrition.protein);
  const foodMarks        = nutrition.logs.map((l) => ({ timestamp: l.timestamp, name: l.name }));

  return (
    <main className={styles.main}>
      {/* Nudge layer */}
      <ContextualNudge
        vitalityScore={vitalityScore}
        vitalityStatus={vitalityStatus}
        ea={ea}
        eaStatus={eaStatus}
      />

      {/* ── Nav ── */}
      <header className={styles.nav}>
        <div className={styles.navBrand}>
          <span className={styles.navLogo}>⚡</span>
          <span className={styles.navTitle}>Healthvibe</span>
        </div>

        {/* Tab navigation */}
        <nav className={styles.navTabs}>
          <button id="tabDashboard" className={`${styles.navTab} ${activeTab === "dashboard" ? styles.navTabActive : ""}`}
            onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button id="tabProfile" className={`${styles.navTab} ${activeTab === "profile" ? styles.navTabActive : ""}`}
            onClick={() => setActiveTab("profile")}>
            {profile ? `👤 ${profile.name || "Profile"}` : "👤 My Profile"}
          </button>
          <button id="tabDietPlan" className={`${styles.navTab} ${activeTab === "dietplan" ? styles.navTabActive : ""}`}
            onClick={() => setActiveTab("dietplan")}>
            🥗 Diet Plan {!profile && <span className={styles.navBadge}>Set profile first</span>}
          </button>
          <button id="tabCoach" className={`${styles.navTab} ${activeTab === "coach" ? styles.navTabActive : ""}`}
            onClick={() => setActiveTab("coach")}>
            🤖 Coach
          </button>
        </nav>

        <div className={styles.navRight}>
          <span className={styles.navStatus} style={{ color: vitalityColor, boxShadow: `0 0 12px ${vitalityGlow}` }}>
            ● {StatusLabel[vitalityStatus]}
          </span>
          <div className={styles.navAvatar}>
            {profile?.name ? profile.name[0].toUpperCase() : "HV"}
          </div>
        </div>
      </header>

      {/* ── Profile Tab ── */}
      {activeTab === "profile" && (
        <div className={styles.tabPage}>
          <div className={styles.profilePage}>
            <div className={`glass-card ${styles.profileFormCard}`}>
              <PersonalProfile
                onProfileSaved={handleProfileSaved}
                savedProfile={profile}
              />
            </div>

            {profile && (
              <div className={styles.profileStats}>
                <div className={`glass-card ${styles.statCard}`}>
                  <p className={styles.statCardLabel}>BMI</p>
                  <p className={styles.statCardValue} style={{ color: profile.bmi < 18.5 ? "#3b82f6" : profile.bmi < 25 ? "#10b981" : profile.bmi < 30 ? "#f59e0b" : "#ef4444" }}>
                    {profile.bmi}
                  </p>
                  <p className={styles.statCardSub}>{profile.bmi < 18.5 ? "Underweight" : profile.bmi < 25 ? "Normal" : profile.bmi < 30 ? "Overweight" : "Obese"}</p>
                </div>
                <div className={`glass-card ${styles.statCard}`}>
                  <p className={styles.statCardLabel}>BMR</p>
                  <p className={styles.statCardValue} style={{ color: "#818cf8" }}>{profile.bmr}</p>
                  <p className={styles.statCardSub}>kcal/day at rest</p>
                </div>
                <div className={`glass-card ${styles.statCard}`}>
                  <p className={styles.statCardLabel}>TDEE</p>
                  <p className={styles.statCardValue} style={{ color: "#f59e0b" }}>{profile.tdee}</p>
                  <p className={styles.statCardSub}>kcal/day active</p>
                </div>
                <div className={`glass-card ${styles.statCard}`}>
                  <p className={styles.statCardLabel}>Target</p>
                  <p className={styles.statCardValue} style={{ color: "#10b981" }}>{profile.targetCalories}</p>
                  <p className={styles.statCardSub}>kcal/day goal</p>
                </div>
                <div className={`glass-card ${styles.statCard}`}>
                  <p className={styles.statCardLabel}>Fat-Free Mass</p>
                  <p className={styles.statCardValue} style={{ color: "#0d9488" }}>{profile.ffm}kg</p>
                  <p className={styles.statCardSub}>muscle + bone</p>
                </div>
                <div className={`glass-card ${styles.statCard}`}>
                  <p className={styles.statCardLabel}>Protein Target</p>
                  <p className={styles.statCardValue} style={{ color: "#10b981" }}>{profile.targetProtein}g</p>
                  <p className={styles.statCardSub}>{(profile.targetProtein / profile.ffm).toFixed(1)}g / kg FFM</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Diet Plan Tab ── */}
      {activeTab === "dietplan" && (
        <div className={styles.tabPage}>
          {!profile ? (
            <div className={styles.noProfile}>
              <p className={styles.noProfileIcon}>🧬</p>
              <p className={styles.noProfileText}>Complete your profile first to generate a personalised diet plan.</p>
              <button className={styles.goProfileBtn} onClick={() => setActiveTab("profile")} id="goToProfileBtn">
                → Set Up My Profile
              </button>
            </div>
          ) : (
            <div className={`glass-card ${styles.dietPlanCard}`}>
              <DietPlanGenerator profile={profile} />
            </div>
          )}
        </div>
      )}

      {/* ── Coach Tab ── */}
      {activeTab === "coach" && (
        <div className={styles.tabPage}>
          <div className={`glass-card ${styles.dietPlanCard}`}>
            <CoachChat
              context={{
                profile: profile
                  ? {
                      name: profile.name,
                      age: profile.age,
                      gender: profile.gender,
                      weightKg: profile.weightKg,
                      heightCm: profile.heightCm,
                      goal: profile.goal,
                      dietType: profile.dietType,
                      activityLevel: profile.activityLevel,
                      bmi: profile.bmi,
                      tdee: profile.tdee,
                    }
                  : null,
                nutrition: {
                  energyIntake: nutrition.energyIntake,
                  protein: nutrition.protein,
                  carbs: nutrition.carbs,
                  fats: nutrition.fats,
                },
                targets,
                ea,
                eaStatus,
                vitalityScore,
                vitalityStatus,
                recentFoods: nutrition.logs.map((l) => l.name).slice(0, 6),
              }}
            />
          </div>
        </div>
      )}

      {/* ── Dashboard Tab (default) ── */}
      {activeTab === "dashboard" && (
        <div className="bento-grid">

          {/* 1. Vitality Ring */}
          <div className={`glass-card ${styles.bentoVitality}`}>
            <VitalityRing score={vitalityScore} ea={ea} status={vitalityStatus} eaStatus={eaStatus} />
            <div className={styles.vitalityMeta}>
              <StatRow label="EA Score"  value={`${ea} kcal/kg`}              color={eaColor} />
              <StatRow label="Sleep"     value={`${sleepHours}h`}             color={Colors.textSecondary} />
              <StatRow label="HRV"       value={`${Math.round(biometrics.hrv)} ms`} color="#818cf8" />
              {profile && <>
                <div className="sep" />
                <StatRow label="BMI"     value={String(profile.bmi)}          color={profile.bmi < 25 ? "#10b981" : "#f59e0b"} />
                <StatRow label="TDEE"    value={`${profile.tdee} kcal`}       color="#f59e0b" />
              </>}
            </div>
            {!profile && (
              <button className={styles.profileCta} onClick={() => setActiveTab("profile")} id="ctaProfileBtn">
                🧬 Set Up Profile
              </button>
            )}
          </div>

          {/* 2. Biometric Wave */}
          <div className={`glass-card ${styles.bentoBiowave}`}>
            <BiometricWave data={biometrics.glucoseHistory} foodMarks={foodMarks} />
            <div className={styles.bentoStatRow}>
              <MiniStat label="Glucose"     value={`${Math.round(biometrics.glucose)}`}    unit="mg/dL" alert={biometrics.glucose > 140} />
              <MiniStat label="Active Burn" value={`${Math.round(biometrics.activeBurn)}`} unit="kcal" />
              <MiniStat label="HRV"         value={`${Math.round(biometrics.hrv)}`}        unit="ms" />
            </div>
          </div>

          {/* 3. Vision Logger */}
          <div className={`glass-card ${styles.bentoVision}`}>
            <VisionLogger onFoodLogged={logFood} />
          </div>

          {/* 4. Macro Tracker */}
          <div className={`glass-card ${styles.bentoMacros}`}>
            <h3 className={styles.cardTitle}>Daily Macros</h3>
            <div className={styles.macroList}>
              <MacroBar label="Calories" current={nutrition.energyIntake} target={targets.calories} pct={calPct}     unit="kcal" color="#f59e0b" />
              <MacroBar label="Protein"  current={nutrition.protein}      target={targets.protein}  pct={proteinPct} unit="g"    color="#10b981" />
              <MacroBar label="Carbs"    current={nutrition.carbs}        target={targets.carbs}    pct={carbsPct}   unit="g"    color="#3b82f6" />
              <MacroBar label="Fat"      current={nutrition.fats}         target={targets.fats}    pct={fatsPct}    unit="g"    color="#ec4899" />
            </div>
            {nutrition.logs.length > 0 && (
              <>
                <div className="sep" />
                <div className={styles.foodLog}>
                  <p className={styles.sectionLabel}>Today&apos;s Log</p>
                  {nutrition.logs.slice(0, 4).map((entry) => (
                    <div key={entry.id} className={styles.foodEntry}>
                      <span className={styles.foodName}>{entry.name}</span>
                      <span className={styles.foodCal}>{entry.calories} kcal</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 5. EA Formula */}
          <div className={`glass-card ${styles.bentoEA}`}>
            <h3 className={styles.cardTitle}>Energy Availability</h3>
            <div className={styles.eaBody}>
              <EnergyTank ea={ea} status={eaStatus} />
              <div className={styles.eaInfo}>
                <div className={styles.eaFormula}>
                  <div className={styles.eaFraction}>
                    <span className={styles.eaNumerator}>EI − EEE</span>
                    <div className={styles.eaDivider} />
                    <span className={styles.eaDenominator}>FFM</span>
                  </div>
                  <span className={styles.eaEquals}>= </span>
                  <span className={styles.eaResult} style={{ color: eaColor }}>
                    {ea}<span className={styles.eaUnit}> kcal/kg/d</span>
                  </span>
                </div>
                <div className={styles.eaComponents}>
                  <EAComponent label="Energy Intake (EI)"   value={`${nutrition.energyIntake} kcal`} />
                  <EAComponent label="Exercise Energy (EEE)" value={`${biometrics.activeBurn} kcal`} />
                  <EAComponent label="Fat-Free Mass (FFM)"   value={`${profile?.ffm ?? state.ffm} kg`} />
                </div>
                <div className={styles.eaStatusBadge} style={{ background: StatusColor[eaStatus].bg, borderColor: StatusColor[eaStatus].primary + "50" }}>
                  <span style={{ color: StatusColor[eaStatus].text }}>
                    {StatusLabel[eaStatus]} — {eaStatus === "green" ? "≥45" : eaStatus === "amber" ? "30–44" : "<30"} kcal/kg/d
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Smart Menu */}
          <div className={`glass-card ${styles.bentoMenu}`}>
            <SmartMenu remainingCalories={remainingCal} remainingProtein={remainingProtein} />
          </div>

        </div>
      )}
    </main>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: Colors.textMuted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, unit, alert }: { label: string; value: string; unit: string; alert?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: alert ? "#ef4444" : "#f1f5f9" }}>
        {value}<span style={{ fontSize: 11, color: "#475569", marginLeft: 2 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MacroBar({ label, current, target, pct, unit, color }: {
  label: string; current: number; target: number; pct: number; unit: string; color: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>
          {Math.round(current)}<span style={{ color: "#475569", fontWeight: 400 }}>/{target}{unit}</span>
        </span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill"
          style={{ width: `${pct}%`, background: color, boxShadow: pct > 95 ? `0 0 8px ${color}` : "none" }} />
      </div>
    </div>
  );
}

function EAComponent({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>{value}</span>
    </div>
  );
}
