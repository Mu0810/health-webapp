/**
 * app/api/diet-plan/route.ts — Personalized 7-day meal plan via OpenRouter.
 * POST /api/diet-plan  →  { summary, weeklyPlan[], tips[], avoid[] }
 *
 * Uses free text models on OpenRouter with a fallback chain.
 */
import { NextRequest, NextResponse } from "next/server";
import type { UserProfile } from "@/components/PersonalProfile";
import {
  openRouterChat,
  extractJson,
  FREE_TEXT_MODELS,
  MissingApiKeyError,
} from "@/lib/openrouter";

// Allow up to 60s on Vercel for the model-fallback chain.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const profile: UserProfile = await req.json();

    const prompt = `You are a certified nutritionist and dietitian. Create a PERSONALIZED 7-day meal plan for this person:

PROFILE:
- Name: ${profile.name || "User"}
- Age: ${profile.age} years
- Gender: ${profile.gender}
- Weight: ${profile.weightKg} kg
- Height: ${profile.heightCm} cm
- BMI: ${profile.bmi} (Fat-Free Mass: ${profile.ffm} kg)
- BMR: ${profile.bmr} kcal/day
- TDEE: ${profile.tdee} kcal/day
- Goal: ${profile.goal === "lose" ? "FAT LOSS" : profile.goal === "gain" ? "MUSCLE GAIN" : "MAINTENANCE"}
- Activity Level: ${profile.activityLevel}
- Dietary Preference: ${profile.dietType}

DAILY TARGETS:
- Calories: ${profile.targetCalories} kcal
- Protein: ${profile.targetProtein}g
- Carbohydrates: ${profile.targetCarbs}g
- Fats: ${profile.targetFats}g

Return ONLY a valid JSON object (no markdown, no explanation) in this exact structure:
{
  "summary": "A 2-3 sentence personalised summary explaining this plan and why it suits their specific goal and body.",
  "weeklyPlan": [
    {
      "day": "Monday",
      "meals": [
        {
          "name": "Meal name",
          "time": "Breakfast",
          "calories": 450,
          "protein": 35,
          "carbs": 42,
          "fats": 12,
          "ingredients": ["100g oats", "2 whole eggs", "1 banana"],
          "notes": "Optional prep tip"
        }
      ],
      "totalCalories": ${profile.targetCalories},
      "totalProtein": ${profile.targetProtein}
    }
  ],
  "tips": ["3-5 specific actionable nutrition tips for this person's goal"],
  "avoid": ["3-4 specific foods or habits to avoid based on their goal and diet type"]
}

Rules (keep output COMPACT so the full week fits in one response):
- Exactly 4 meals per day: Breakfast, Lunch, Dinner, Snack
- Max 3 ingredients per meal; keep "notes" empty ("") to save space
- Total calories per day close to ${profile.targetCalories} kcal (±60 kcal)
- Total protein per day close to ${profile.targetProtein}g
- ${profile.dietType !== "none" ? `All meals MUST be ${profile.dietType} compliant` : "Include a variety of proteins"}
- ${profile.goal === "lose" ? "Prioritise high-volume, high-satiety foods" : profile.goal === "gain" ? "Prioritise calorie-dense, muscle-building foods" : "Prioritise whole foods and balance"}
- Realistic ingredients; Indian/Mediterranean/Asian variety welcome
- Output the complete compact JSON for all 7 days. Do not add any text outside the JSON.`;

    const { text } = await openRouterChat({
      models: FREE_TEXT_MODELS,
      maxTokens: 4500,
      temperature: 0.5,
      timeoutMs: 40000,
      totalTimeoutMs: 57000,
      reasoningEffort: "low",
      messages: [
        {
          role: "system",
          content:
            "You are a certified nutritionist that responds with a single strict JSON object only, no markdown.",
        },
        { role: "user", content: prompt },
      ],
    });

    const parsed = extractJson(text);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: "AI is not configured. Set OPENROUTER_API_KEY to enable diet plans." },
        { status: 503 }
      );
    }
    console.error("[DietPlan API] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate diet plan", detail: String(err) },
      { status: 500 }
    );
  }
}
