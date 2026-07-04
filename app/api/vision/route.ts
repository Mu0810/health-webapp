/**
 * app/api/vision/route.ts — Food-photo nutrition analysis via OpenRouter.
 * POST /api/vision  →  { name, calories, protein, carbs, fats, glycemic_index, confidence }
 *
 * Uses free, image-capable models on OpenRouter with a fallback chain.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  openRouterChat,
  extractJson,
  FREE_VISION_MODELS,
  MissingApiKeyError,
} from "@/lib/openrouter";

// Allow up to 60s on Vercel for the model-fallback chain.
export const maxDuration = 60;

const PROMPT = `You are a precise nutritionist AI. Analyze this food photo and return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Validate before reading into memory: reject non-images and oversized files.
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Uploaded file must be an image." }, { status: 400 });
    }
    const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Please use an image under 8MB." },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const { text } = await openRouterChat({
      models: FREE_VISION_MODELS,
      maxTokens: 700,
      temperature: 0.2,
      timeoutMs: 18000,
      totalTimeoutMs: 45000,
      messages: [
        {
          role: "system",
          content: "You are a precise nutritionist AI that responds with strict JSON only.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const parsed = extractJson(text);
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: "AI is not configured. Set OPENROUTER_API_KEY to enable food scanning." },
        { status: 503 }
      );
    }
    console.error("[VisionAPI] Error:", err);
    return NextResponse.json(
      { error: "Failed to analyze image", detail: String(err) },
      { status: 500 }
    );
  }
}
