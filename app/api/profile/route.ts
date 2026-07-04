/**
 * app/api/profile/route.ts — persist / load a user's computed profile.
 * GET  /api/profile?userId=…   → { profile: Profile | null }
 * POST /api/profile            → { profile } (upsert)
 *
 * DB errors degrade gracefully (GET returns null) so the app keeps working
 * even if no database is configured yet.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  try {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[profile GET]", err);
    return NextResponse.json({ profile: null, degraded: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const data = {
      name: String(body.name ?? ""),
      age: Number(body.age) || 0,
      gender: String(body.gender ?? "male"),
      weightKg: Number(body.weightKg) || 0,
      heightCm: Number(body.heightCm) || 0,
      activityLevel: String(body.activityLevel ?? "moderate"),
      goal: String(body.goal ?? "maintain"),
      dietType: String(body.dietType ?? "none"),
      bmi: Number(body.bmi) || 0,
      bmr: Number(body.bmr) || 0,
      tdee: Number(body.tdee) || 0,
      targetCalories: Number(body.targetCalories) || 0,
      targetProtein: Number(body.targetProtein) || 0,
      targetCarbs: Number(body.targetCarbs) || 0,
      targetFats: Number(body.targetFats) || 0,
      ffm: Number(body.ffm) || 0,
    };

    await prisma.user.upsert({
      where: { id: userId },
      update: { name: data.name || null },
      create: { id: userId, name: data.name || null },
    });

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[profile POST]", err);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
