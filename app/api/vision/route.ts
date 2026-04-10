/**
 * VisionAPI.ts — Server-side route for Gemini multimodal food analysis.
 * POST /api/vision  →  { calories, protein, carbs, fats, glycemic_index }
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a precise nutritionist AI. Analyze this food photo and return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{
  "name": "<dish name>",
  "calories": <number>,
  "protein": <grams as number>,
  "carbs": <grams as number>,
  "fats": <grams as number>,
  "glycemic_index": <0-100 number or null>,
  "confidence": <"high"|"medium"|"low">
}
Base estimates on a standard portion size visible in the image.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64,
          mimeType,
        },
      },
    ]);

    const text = result.response.text();

    // Strip any markdown fences if present
    const jsonStr = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("[VisionAPI] Error:", err);
    return NextResponse.json(
      { error: "Failed to analyze image", detail: String(err) },
      { status: 500 }
    );
  }
}
