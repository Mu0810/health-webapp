/**
 * lib/nutrition.ts — Pure health/nutrition math (no React, no I/O).
 *
 * Extracted from PersonalProfile so the BMI / BMR / TDEE / macro-target logic
 * that drives a user's real goals can be unit-tested in isolation.
 */
import type {
  ActivityLevel,
  DietType,
  Gender,
  Goal,
  UserProfile,
} from "@/components/PersonalProfile";

/** Activity multipliers applied to BMR to estimate TDEE. */
export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface ProfileInput {
  name: string;
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  dietType: DietType;
}

/**
 * Compute BMI, BMR (Mifflin-St Jeor), TDEE, fat-free mass, and macro targets
 * from a user's inputs and goal.
 */
export function calcProfile(form: ProfileInput): UserProfile {
  const { age, gender, weightKg, heightCm, activityLevel, goal } = form;

  // BMI
  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;

  // BMR — Mifflin-St Jeor
  const bmr =
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  // TDEE
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIER[activityLevel]);

  // Target calories by goal
  const calAdj = goal === "lose" ? -500 : goal === "gain" ? 300 : 0;
  const targetCalories = Math.round(tdee + calAdj);

  // Fat-free mass estimate (rough: body weight minus estimated fat mass)
  const fatPct = gender === "male" ? 0.18 : 0.25;
  const ffm = Math.round(weightKg * (1 - fatPct) * 10) / 10;

  // Macros
  // Protein: 2g/kg FFM for muscle, 1.8g for maintain, 1.6g for lose
  const proteinPerKg = goal === "gain" ? 2.0 : goal === "maintain" ? 1.8 : 1.6;
  const targetProtein = Math.round(ffm * proteinPerKg);
  const proteinCal = targetProtein * 4;

  // Fat: 25% of target calories
  const fatCal = Math.round(targetCalories * 0.25);
  const targetFats = Math.round(fatCal / 9);

  // Carbs: remainder
  const carbCal = targetCalories - proteinCal - fatCal;
  const targetCarbs = Math.round(Math.max(0, carbCal) / 4);

  return {
    ...form,
    bmi,
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFats,
    ffm,
  };
}
