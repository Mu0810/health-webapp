import { describe, it, expect } from "vitest";
import { calcProfile, ACTIVITY_MULTIPLIER, type ProfileInput } from "@/lib/nutrition";

const base: ProfileInput = {
  name: "Test",
  age: 30,
  gender: "male",
  weightKg: 75,
  heightCm: 178,
  activityLevel: "moderate",
  goal: "maintain",
  dietType: "none",
};

describe("calcProfile", () => {
  it("computes BMI, BMR, TDEE and macros for a maintaining male", () => {
    const p = calcProfile(base);
    expect(p.bmi).toBe(23.7); // 75 / 1.78^2
    expect(p.bmr).toBe(1718); // Mifflin-St Jeor, male
    expect(p.tdee).toBe(2662); // 1717.5 * 1.55
    expect(p.targetCalories).toBe(2662); // maintain → no adjustment
    expect(p.ffm).toBe(61.5); // 75 * 0.82
    expect(p.targetProtein).toBe(111); // 61.5 * 1.8
    expect(p.targetFats).toBe(74); // 25% of kcal / 9
    expect(p.targetCarbs).toBe(388); // remainder / 4
  });

  it("applies a 500 kcal deficit for a losing female", () => {
    const p = calcProfile({
      ...base,
      age: 28,
      gender: "female",
      weightKg: 60,
      heightCm: 165,
      activityLevel: "sedentary",
      goal: "lose",
    });
    expect(p.bmi).toBe(22);
    expect(p.bmr).toBe(1330); // female formula
    expect(p.tdee).toBe(1596); // 1330.25 * 1.2
    expect(p.targetCalories).toBe(1096); // 1596 - 500
    expect(p.ffm).toBe(45); // 60 * 0.75
    expect(p.targetProtein).toBe(72); // 45 * 1.6 (lose)
  });

  it("adds a surplus and higher protein for a gaining goal", () => {
    const maintain = calcProfile(base);
    const gain = calcProfile({ ...base, goal: "gain" });
    expect(gain.targetCalories).toBe(maintain.tdee + 300);
    expect(gain.targetProtein).toBeGreaterThan(maintain.targetProtein); // 2.0 vs 1.8 g/kg FFM
  });

  it("never produces negative carb targets", () => {
    // Extreme low-calorie edge case
    const p = calcProfile({ ...base, weightKg: 45, heightCm: 150, goal: "lose", activityLevel: "sedentary" });
    expect(p.targetCarbs).toBeGreaterThanOrEqual(0);
  });

  it("has activity multipliers ordered from sedentary to very active", () => {
    expect(ACTIVITY_MULTIPLIER.sedentary).toBeLessThan(ACTIVITY_MULTIPLIER.moderate);
    expect(ACTIVITY_MULTIPLIER.moderate).toBeLessThan(ACTIVITY_MULTIPLIER.very_active);
  });
});
