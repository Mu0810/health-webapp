/**
 * lib/openrouter.ts — Thin OpenAI-compatible client for OpenRouter.
 *
 * Free models on OpenRouter are rate-limited rather than credit-limited, so a
 * single free model will frequently return 429 / be briefly unavailable. To
 * stay reliable we try a *chain* of free models in order and return the first
 * successful completion. Model lists are overridable via env so they can be
 * tuned without a redeploy.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Parse a comma-separated env override into a clean string[] (or fall back). */
function modelsFromEnv(envValue: string | undefined, fallback: string[]): string[] {
  if (!envValue) return fallback;
  const parsed = envValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

/** Free, image-capable models (food-photo analysis), in preference order. */
export const FREE_VISION_MODELS = modelsFromEnv(process.env.OPENROUTER_VISION_MODELS, [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
]);

/** Free, text-only models (diet-plan generation), in preference order. */
export const FREE_TEXT_MODELS = modelsFromEnv(process.env.OPENROUTER_TEXT_MODELS, [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-120b:free",
]);

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
export type MessageContent = string | Array<TextPart | ImagePart>;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: MessageContent;
}

export interface ChatArgs {
  models: string[];
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

/** Raised when OPENROUTER_API_KEY is not set — surfaced as a 503 by callers. */
export class MissingApiKeyError extends Error {
  constructor() {
    super("OPENROUTER_API_KEY is not configured on the server.");
    this.name = "MissingApiKeyError";
  }
}

/**
 * Call OpenRouter, walking the provided model chain until one succeeds.
 * Returns the assistant message text. Throws if every model fails.
 */
export async function openRouterChat({
  models,
  messages,
  maxTokens = 1200,
  temperature = 0.4,
}: ChatArgs): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    // Optional attribution headers used by OpenRouter for ranking.
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://health-webapp-three.vercel.app",
    "X-Title": "Healthvibe",
  };

  let lastError: unknown = null;

  for (const model of models) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });

      if (!res.ok) {
        const detail = await res.text();
        lastError = new Error(`[${model}] ${res.status} ${res.statusText}: ${detail.slice(0, 300)}`);
        // Rate-limited, unavailable, or not found → try the next model in the chain.
        continue;
      }

      const data = await res.json();
      const content: unknown = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim().length > 0) {
        return { text: content, model };
      }
      lastError = new Error(`[${model}] returned an empty completion`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("All OpenRouter models failed");
}

/**
 * Extract a JSON object/array from a model response that may include prose,
 * markdown code fences, or reasoning preamble. Throws if no JSON is found.
 */
export function extractJson<T = unknown>(raw: string): T {
  let s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Prefer the outermost {...} or [...] block if surrounded by other text.
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);

  if (start > 0) s = s.slice(start);

  const lastBrace = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (lastBrace !== -1) s = s.slice(0, lastBrace + 1);

  return JSON.parse(s) as T;
}
