/**
 * app/api/diet-plan/route.ts
 * Gemini AI personalized diet plan generator
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { UserProfile } from "@/components/PersonalProfile";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function POST(req: NextRequest) {
  try {
    const profile: UserProfile = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

Rules:
- Each day must have 4-5 meals (breakfast, lunch, dinner, 1-2 snacks)
- Total calories per day must be close to ${profile.targetCalories} kcal (±50 kcal)
- Total protein per day must be close to ${profile.targetProtein}g
- ${profile.dietType !== "none" ? `All meals MUST be ${profile.dietType} compliant` : "Include a variety of proteins"}
- ${profile.goal === "lose" ? "Focus on high-volume, high-satiety foods" : profile.goal === "gain" ? "Include calorie-dense, muscle-building foods" : "Focus on whole foods and balance"}
- Use realistic, practical ingredients available in most stores
- Indian, Mediterranean and Asian options are welcome for variety`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("[DietPlan API] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate diet plan", detail: String(err) },
      { status: 500 }
    );
  }
}
