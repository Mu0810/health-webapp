/**
 * app/api/coach/route.ts — AI nutrition coach chat.
 * POST /api/coach  { messages: {role,content}[], context } → { reply }
 *
 * Answers using the user's live profile, macros, and Energy Availability so
 * advice is personalized. Uses the shared OpenRouter client (fast model first,
 * free fallbacks).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  openRouterChat,
  FREE_TEXT_MODELS,
  MissingApiKeyError,
  type ChatMessage,
} from "@/lib/openrouter";

export const maxDuration = 60;

interface CoachContext {
  profile?: {
    name?: string;
    age?: number;
    gender?: string;
    weightKg?: number;
    heightCm?: number;
    goal?: string;
    dietType?: string;
    activityLevel?: string;
    bmi?: number;
    tdee?: number;
  } | null;
  nutrition?: { energyIntake?: number; protein?: number; carbs?: number; fats?: number };
  targets?: { calories?: number; protein?: number; carbs?: number; fats?: number };
  ea?: number;
  eaStatus?: string;
  vitalityScore?: number;
  vitalityStatus?: string;
  recentFoods?: string[];
}

function buildSystemPrompt(ctx: CoachContext): string {
  const p = ctx.profile;
  const n = ctx.nutrition ?? {};
  const t = ctx.targets ?? {};

  const profileLine = p
    ? `Profile: ${p.name || "user"}, ${p.age ?? "?"}y ${p.gender ?? ""}, ${p.weightKg ?? "?"}kg, ${p.heightCm ?? "?"}cm, BMI ${p.bmi ?? "?"}. Goal: ${p.goal ?? "maintain"}. Diet: ${p.dietType ?? "none"}. Activity: ${p.activityLevel ?? "?"}. TDEE ~${p.tdee ?? "?"} kcal.`
    : "Profile: not set yet — gently encourage the user to complete their profile for tailored advice.";

  const macroLine = `Today so far: ${Math.round(n.energyIntake ?? 0)}/${t.calories ?? "?"} kcal, protein ${Math.round(n.protein ?? 0)}/${t.protein ?? "?"}g, carbs ${Math.round(n.carbs ?? 0)}/${t.carbs ?? "?"}g, fat ${Math.round(n.fats ?? 0)}/${t.fats ?? "?"}g.`;

  const eaLine = `Energy Availability: ${ctx.ea ?? "?"} kcal/kg FFM (${ctx.eaStatus ?? "?"}). Vitality score: ${ctx.vitalityScore ?? "?"}/10 (${ctx.vitalityStatus ?? "?"}). Note: EA below 30 is a low-energy-availability risk zone; 45+ is optimal.`;

  const foodsLine =
    ctx.recentFoods && ctx.recentFoods.length
      ? `Recently logged: ${ctx.recentFoods.slice(0, 6).join(", ")}.`
      : "No food logged yet today.";

  return [
    "You are Vibe, the in-app AI nutrition & wellness coach for Healthvibe.",
    "Be warm, concise, and practical. Prefer short answers (2-5 sentences or a tight bullet list). Use the user's real data below to personalize every reply. Suggest specific foods/quantities when relevant.",
    "You are NOT a doctor: do not diagnose or give medical treatment. For symptoms or medical concerns, suggest consulting a professional. Keep advice to general nutrition, training fuel, and habits.",
    "",
    "=== USER CONTEXT (live) ===",
    profileLine,
    macroLine,
    eaLine,
    foodsLine,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const context: CoachContext = body?.context ?? {};
    const rawMessages: unknown = body?.messages;

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    // Sanitize + cap the conversation to keep payloads bounded.
    const history: ChatMessage[] = rawMessages
      .filter(
        (m): m is { role: string; content: string } =>
          !!m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .slice(-10)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content.slice(0, 1500),
      }));

    if (history.length === 0) {
      return NextResponse.json({ error: "no valid messages" }, { status: 400 });
    }

    const { text } = await openRouterChat({
      models: FREE_TEXT_MODELS,
      maxTokens: 600,
      temperature: 0.6,
      timeoutMs: 20000,
      totalTimeoutMs: 45000,
      messages: [{ role: "system", content: buildSystemPrompt(context) }, ...history],
    });

    return NextResponse.json({ reply: text.trim() });
  } catch (err: unknown) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: "AI coach is not configured. Set OPENROUTER_API_KEY to enable it." },
        { status: 503 }
      );
    }
    console.error("[Coach API] Error:", err);
    return NextResponse.json({ error: "The coach is unavailable right now." }, { status: 500 });
  }
}
