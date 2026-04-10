/**
 * DietPlanGenerator.tsx — Displays AI-generated personalized meal plan
 */
"use client";

import { useState } from "react";
import type { UserProfile } from "./PersonalProfile";
import styles from "./DietPlanGenerator.module.css";

interface Meal {
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  notes?: string;
}

interface DayPlan {
  day: string;
  meals: Meal[];
  totalCalories: number;
  totalProtein: number;
}

interface DietPlanResponse {
  summary: string;
  weeklyPlan: DayPlan[];
  tips: string[];
  avoid: string[];
}

interface Props {
  profile: UserProfile;
}

export default function DietPlanGenerator({ profile }: Props) {
  const [plan, setPlan] = useState<DietPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diet-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: DietPlanResponse = await res.json();
      setPlan(data);
      setActiveDay(0);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const mealEmoji: Record<string, string> = {
    breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎", "pre-workout": "⚡", "post-workout": "💪",
  };
  const getMealEmoji = (time: string) => {
    const key = Object.keys(mealEmoji).find((k) => time.toLowerCase().includes(k));
    return key ? mealEmoji[key] : "🍽️";
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>🥗</span>
          <div>
            <h3 className={styles.title}>AI Diet Plan</h3>
            <p className={styles.subtitle}>
              {profile.targetCalories} kcal · {profile.targetProtein}g protein · {profile.targetCarbs}g carbs · {profile.targetFats}g fat
            </p>
          </div>
        </div>
        <button
          className={`${styles.generateBtn} ${loading ? styles.loading : ""}`}
          onClick={generatePlan}
          disabled={loading}
          id="generateDietPlanBtn"
        >
          {loading ? (
            <><span className={styles.spinner} /> Generating…</>
          ) : (
            <>{plan ? "🔄 Regenerate" : "✨ Generate My Plan"}</>
          )}
        </button>
      </div>

      {error && <p className={styles.error}>⚠ {error}</p>}

      {!plan && !loading && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🧬</div>
          <p className={styles.emptyText}>
            Personalised for <strong>{profile.name || "you"}</strong>: {profile.goal === "lose" ? "Fat loss" : profile.goal === "gain" ? "Muscle gain" : "Maintenance"} plan
          </p>
          <p className={styles.emptyHint}>
            {profile.dietType !== "none" ? `${profile.dietType} · ` : ""}{profile.targetCalories} kcal target
          </p>
          <p className={styles.emptyAction}>↑ Click "Generate My Plan"</p>
        </div>
      )}

      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.loadingRing} />
          <p>Gemini AI is crafting your personal nutrition plan…</p>
        </div>
      )}

      {plan && (
        <>
          {/* Summary */}
          <div className={styles.summary}>{plan.summary}</div>

          {/* Day tabs */}
          <div className={styles.dayTabs}>
            {plan.weeklyPlan.map((day, i) => (
              <button
                key={i}
                id={`dayTab-${i}`}
                className={`${styles.dayTab} ${activeDay === i ? styles.dayTabActive : ""}`}
                onClick={() => setActiveDay(i)}
              >
                {day.day.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Day plan */}
          {plan.weeklyPlan[activeDay] && (
            <div className={styles.dayPlan}>
              <div className={styles.dayStats}>
                <span className={styles.dayStat} style={{ color: "#f59e0b" }}>
                  {plan.weeklyPlan[activeDay].totalCalories} kcal
                </span>
                <span className={styles.dayStat} style={{ color: "#10b981" }}>
                  {plan.weeklyPlan[activeDay].totalProtein}g protein
                </span>
              </div>
              <div className={styles.meals}>
                {plan.weeklyPlan[activeDay].meals.map((meal, mi) => (
                  <MealCard key={mi} meal={meal} emoji={getMealEmoji(meal.time)} />
                ))}
              </div>
            </div>
          )}

          {/* Tips & Avoid */}
          <div className={styles.tipsGrid}>
            <div className={styles.tipsCard}>
              <p className={styles.tipsTitle}>✅ Pro Tips</p>
              <ul className={styles.tipsList}>
                {plan.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
            <div className={styles.avoidCard}>
              <p className={styles.avoidTitle}>🚫 Avoid</p>
              <ul className={styles.avoidList}>
                {plan.avoid.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MealCard({ meal, emoji }: { meal: Meal; emoji: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={styles.mealCard} onClick={() => setExpanded((e) => !e)}>
      <div className={styles.mealHeader}>
        <div className={styles.mealLeft}>
          <span className={styles.mealEmoji}>{emoji}</span>
          <div>
            <p className={styles.mealTime}>{meal.time}</p>
            <p className={styles.mealName}>{meal.name}</p>
          </div>
        </div>
        <div className={styles.mealMacros}>
          <span style={{ color: "#f59e0b" }}>{meal.calories} kcal</span>
          <span style={{ color: "#10b981" }}>{meal.protein}g P</span>
          <span style={{ color: "#3b82f6" }}>{meal.carbs}g C</span>
          <span style={{ color: "#ec4899" }}>{meal.fats}g F</span>
          <span className={styles.expandChevron}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div className={styles.mealDetails}>
          <p className={styles.ingredientsLabel}>Ingredients</p>
          <div className={styles.ingredients}>
            {meal.ingredients.map((ing, i) => (
              <span key={i} className={styles.ingredient}>{ing}</span>
            ))}
          </div>
          {meal.notes && <p className={styles.mealNotes}>💡 {meal.notes}</p>}
        </div>
      )}
    </div>
  );
}
