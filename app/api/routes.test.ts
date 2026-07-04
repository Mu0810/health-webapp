/**
 * API route contract tests — validation + error-handling paths.
 *
 * These exercise the request-handling contract without any network or DB:
 * every assertion here hits a code path that returns *before* the route calls
 * OpenRouter or Prisma (bad input → 4xx; valid AI input with no key → 503).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { POST as coachPOST } from "@/app/api/coach/route";
import { POST as visionPOST } from "@/app/api/vision/route";
import { POST as dietPOST } from "@/app/api/diet-plan/route";
import { GET as profileGET } from "@/app/api/profile/route";
import { GET as logsGET, POST as logsPOST } from "@/app/api/logs/route";

// Ensure the AI key is unset so the missing-key path is deterministic offline.
beforeAll(() => {
  process.env.OPENROUTER_API_KEY = "";
});

// Minimal request stubs matching only what each handler reads.
type AnyReq = Parameters<typeof coachPOST>[0];
const jsonReq = (body: unknown) => ({ json: async () => body }) as unknown as AnyReq;
const urlReq = (url: string) => ({ nextUrl: new URL(url) }) as unknown as Parameters<typeof profileGET>[0];
const formReq = (fd: FormData) => ({ formData: async () => fd }) as unknown as Parameters<typeof visionPOST>[0];

describe("/api/coach", () => {
  it("400s when messages are missing or empty", async () => {
    expect((await coachPOST(jsonReq({}))).status).toBe(400);
    expect((await coachPOST(jsonReq({ messages: [] }))).status).toBe(400);
  });

  it("400s when no message has a valid role/content", async () => {
    const res = await coachPOST(jsonReq({ messages: [{ role: "system", content: 5 }] }));
    expect(res.status).toBe(400);
  });

  it("503s on valid input when no API key is configured", async () => {
    const res = await coachPOST(jsonReq({ messages: [{ role: "user", content: "hi" }] }));
    expect(res.status).toBe(503);
  });
});

describe("/api/vision", () => {
  it("400s when no image is provided", async () => {
    const res = await visionPOST(formReq(new FormData()));
    expect(res.status).toBe(400);
  });

  it("400s when the uploaded file is not an image", async () => {
    const fd = new FormData();
    fd.append("image", new File(["hello"], "notes.txt", { type: "text/plain" }));
    const res = await visionPOST(formReq(fd));
    expect(res.status).toBe(400);
  });

  it("413s when the image exceeds the size cap", async () => {
    const fd = new FormData();
    const big = new File([new Uint8Array(9 * 1024 * 1024)], "big.png", { type: "image/png" });
    fd.append("image", big);
    const res = await visionPOST(formReq(fd));
    expect(res.status).toBe(413);
  });

  it("503s for a valid small image when no API key is configured", async () => {
    const fd = new FormData();
    fd.append("image", new File([new Uint8Array([1, 2, 3])], "food.png", { type: "image/png" }));
    const res = await visionPOST(formReq(fd));
    expect(res.status).toBe(503);
  });
});

describe("/api/diet-plan", () => {
  it("503s when no API key is configured", async () => {
    const res = await dietPOST(jsonReq({ name: "A", targetCalories: 2000, targetProtein: 150 }));
    expect(res.status).toBe(503);
  });
});

describe("/api/profile & /api/logs validation", () => {
  it("profile GET 400s without a userId", async () => {
    expect((await profileGET(urlReq("http://test/api/profile"))).status).toBe(400);
  });

  it("logs GET 400s without a userId", async () => {
    expect((await logsGET(urlReq("http://test/api/logs"))).status).toBe(400);
  });

  it("logs POST 400s without userId or name", async () => {
    expect((await logsPOST(jsonReq({ userId: "", name: "" }))).status).toBe(400);
    expect((await logsPOST(jsonReq({ userId: "dev-1" }))).status).toBe(400);
  });
});
