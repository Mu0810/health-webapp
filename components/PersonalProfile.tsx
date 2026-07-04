/**
 * PersonalProfile.tsx
 * Collects user biometrics → calculates BMI, BMR, TDEE, macro targets.
 * Stores results and passes them to the diet plan generator.
 */
"use client";

import { useState } from "react";
import { calcProfile } from "@/lib/nutrition";
import styles from "./PersonalProfile.module.css";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";
export type Gender = "male" | "female";
export type DietType = "none" | "vegetarian" | "vegan" | "keto" | "mediterranean" | "paleo";

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  dietType: DietType;
  // Computed
  bmi: number;
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  ffm: number;
}

interface Props {
  onProfileSaved: (profile: UserProfile) => void;
  savedProfile: UserProfile | null;
}

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   "Sedentary (desk job, no exercise)",
  light:       "Light (1–2 days/week)",
  moderate:    "Moderate (3–5 days/week)",
  active:      "Active (6–7 days/week)",
  very_active: "Very Active (2× per day)",
};

const GOAL_LABELS: Record<Goal, string> = {
  lose:     "🔥 Lose Fat",
  maintain: "⚖️ Maintain",
  gain:     "💪 Gain Muscle",
};

const DIET_LABELS: Record<DietType, string> = {
  none:          "No Preference",
  vegetarian:    "🥦 Vegetarian",
  vegan:         "🌱 Vegan",
  keto:          "🥑 Keto",
  mediterranean: "🫒 Mediterranean",
  paleo:         "🍖 Paleo",
};

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: "#3b82f6" };
  if (bmi < 25)   return { label: "Normal",      color: "#10b981" };
  if (bmi < 30)   return { label: "Overweight",  color: "#f59e0b" };
  return               { label: "Obese",         color: "#ef4444" };
}

export default function PersonalProfile({ onProfileSaved, savedProfile }: Props) {
  const [open, setOpen] = useState(!savedProfile);
  const [form, setForm] = useState({
    name:          savedProfile?.name          ?? "",
    age:           savedProfile?.age           ?? 28,
    gender:        (savedProfile?.gender       ?? "male") as Gender,
    weightKg:      savedProfile?.weightKg      ?? 72,
    heightCm:      savedProfile?.heightCm      ?? 175,
    activityLevel: (savedProfile?.activityLevel ?? "moderate") as ActivityLevel,
    goal:          (savedProfile?.goal         ?? "maintain") as Goal,
    dietType:      (savedProfile?.dietType     ?? "none") as DietType,
  });

  const preview = calcProfile(form);
  const bmiCat  = bmiCategory(preview.bmi);

  const handleSave = () => {
    onProfileSaved(preview);
    setOpen(false);
  };

  if (!open && savedProfile) {
    return (
      <div className={styles.saved} onClick={() => setOpen(true)} id="profileEditBtn" role="button" tabIndex={0}>
        <div className={styles.savedLeft}>
          <div className={styles.avatarRing}>
            <div className={styles.avatar}>{savedProfile.name ? savedProfile.name[0].toUpperCase() : "?"}</div>
          </div>
          <div>
            <p className={styles.savedName}>{savedProfile.name || "Your Profile"}</p>
            <p className={styles.savedSub}>
              {savedProfile.age}y · {savedProfile.weightKg}kg · {savedProfile.heightCm}cm · BMI {savedProfile.bmi}
            </p>
          </div>
        </div>
        <span className={styles.editBtn}>✏ Edit</span>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <div className={styles.formHeader}>
        <span className={styles.formIcon}>🧬</span>
        <div>
          <h3 className={styles.formTitle}>Your Profile</h3>
          <p className={styles.formSub}>We calculate your personal targets</p>
        </div>
      </div>

      <div className={styles.fields}>
        {/* Name */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="profileName">Name</label>
          <input
            id="profileName"
            className={styles.input}
            value={form.name}
            placeholder="Your name"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        {/* Age + Gender row */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profileAge">Age</label>
            <input id="profileAge" type="number" min="10" max="100" className={styles.input}
              value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: Number(e.target.value) }))} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Gender</label>
            <div className={styles.toggle}>
              {(["male","female"] as Gender[]).map((g) => (
                <button key={g} id={`gender-${g}`} type="button" aria-pressed={form.gender === g}
                  className={`${styles.toggleBtn} ${form.gender === g ? styles.toggleActive : ""}`}
                  onClick={() => setForm((f) => ({ ...f, gender: g }))}>
                  {g === "male" ? "♂ Male" : "♀ Female"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Weight + Height */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profileWeight">Weight (kg)</label>
            <input id="profileWeight" type="number" min="30" max="250" className={styles.input}
              value={form.weightKg} onChange={(e) => setForm((f) => ({ ...f, weightKg: Number(e.target.value) }))} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profileHeight">Height (cm)</label>
            <input id="profileHeight" type="number" min="100" max="250" className={styles.input}
              value={form.heightCm} onChange={(e) => setForm((f) => ({ ...f, heightCm: Number(e.target.value) }))} />
          </div>
        </div>

        {/* Activity Level */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="profileActivity">Activity Level</label>
          <select id="profileActivity" className={styles.select}
            value={form.activityLevel}
            onChange={(e) => setForm((f) => ({ ...f, activityLevel: e.target.value as ActivityLevel }))}>
            {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Goal */}
        <div className={styles.field}>
          <label className={styles.label}>Goal</label>
          <div className={styles.goalRow}>
            {(["lose","maintain","gain"] as Goal[]).map((g) => (
              <button key={g} id={`goal-${g}`} type="button" aria-pressed={form.goal === g}
                className={`${styles.goalBtn} ${form.goal === g ? styles.goalActive : ""}`}
                onClick={() => setForm((f) => ({ ...f, goal: g }))}>
                {GOAL_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        {/* Diet type */}
        <div className={styles.field}>
          <label className={styles.label}>Dietary Preference</label>
          <div className={styles.dietRow}>
            {(Object.entries(DIET_LABELS) as [DietType, string][]).map(([k, v]) => (
              <button key={k} id={`diet-${k}`} type="button" aria-pressed={form.dietType === k}
                className={`${styles.dietBtn} ${form.dietType === k ? styles.dietActive : ""}`}
                onClick={() => setForm((f) => ({ ...f, dietType: k }))}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className={styles.preview}>
        <div className={styles.previewItem}>
          <span className={styles.previewLabel}>BMI</span>
          <span className={styles.previewValue} style={{ color: bmiCat.color }}>
            {preview.bmi} <span className={styles.previewSub}>{bmiCat.label}</span>
          </span>
        </div>
        <div className={styles.previewItem}>
          <span className={styles.previewLabel}>BMR</span>
          <span className={styles.previewValue}>{preview.bmr} <span className={styles.previewSub}>kcal/day</span></span>
        </div>
        <div className={styles.previewItem}>
          <span className={styles.previewLabel}>TDEE</span>
          <span className={styles.previewValue}>{preview.tdee} <span className={styles.previewSub}>kcal/day</span></span>
        </div>
        <div className={styles.previewItem}>
          <span className={styles.previewLabel}>Target</span>
          <span className={styles.previewValue} style={{ color: "#10b981" }}>
            {preview.targetCalories} <span className={styles.previewSub}>kcal/day</span>
          </span>
        </div>
      </div>

      <button className={styles.saveBtn} onClick={handleSave} id="profileSaveBtn">
        ✓ Save & Calculate My Plan
      </button>
    </div>
  );
}
