/**
 * app/api/logs/route.ts — persist / load a user's food logs for today.
 * GET    /api/logs?userId=…        → { logs: FoodLog[] } (today, newest first)
 * POST   /api/logs                 → { log } (create)
 * DELETE /api/logs?userId=…&id=…   → { ok: true }
 *
 * DB errors degrade gracefully (GET returns []) so the app keeps working
 * even if no database is configured yet.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Start of the current day (UTC) — the window for "today's" logs. */
function startOfTodayUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  try {
    const logs = await prisma.foodLog.findMany({
      where: { userId, timestamp: { gte: startOfTodayUTC() } },
      orderBy: { timestamp: "desc" },
      take: 50,
    });
    return NextResponse.json({ logs });
  } catch (err) {
    console.error("[logs GET]", err);
    return NextResponse.json({ logs: [], degraded: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name } = body;
    if (!userId || !name) {
      return NextResponse.json({ error: "userId and name required" }, { status: 400 });
    }

    await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId } });

    const log = await prisma.foodLog.create({
      data: {
        userId,
        name: String(name),
        calories: Number(body.calories) || 0,
        protein: Number(body.protein) || 0,
        carbs: Number(body.carbs) || 0,
        fats: Number(body.fats) || 0,
        glycemicIndex:
          body.glycemicIndex === null || body.glycemicIndex === undefined
            ? null
            : Number(body.glycemicIndex),
      },
    });

    return NextResponse.json({ log });
  } catch (err) {
    console.error("[logs POST]", err);
    return NextResponse.json({ error: "Failed to save food log" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const id = req.nextUrl.searchParams.get("id");
  if (!userId || !id) return NextResponse.json({ error: "userId and id required" }, { status: 400 });
  try {
    await prisma.foodLog.deleteMany({ where: { id, userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[logs DELETE]", err);
    return NextResponse.json({ error: "Failed to delete food log" }, { status: 500 });
  }
}
