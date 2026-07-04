import { describe, it, expect } from "vitest";
import { calcEA, calcVitalityScore } from "@/lib/EAController";
import { getEAStatus, getVitalityStatus } from "@/lib/ThemeConfig";

describe("calcEA", () => {
  it("computes (intake - exercise) / fat-free mass", () => {
    expect(calcEA(2000, 400, 62)).toBeCloseTo(25.806, 2);
  });

  it("returns 0 when fat-free mass is 0 (no divide-by-zero)", () => {
    expect(calcEA(2000, 400, 0)).toBe(0);
  });

  it("hits exactly 45 at the optimal boundary", () => {
    expect(calcEA(2790, 0, 62)).toBeCloseTo(45, 5);
  });
});

describe("getEAStatus", () => {
  it("classifies by the 45 / 30 thresholds", () => {
    expect(getEAStatus(45)).toBe("green");
    expect(getEAStatus(44.9)).toBe("amber");
    expect(getEAStatus(30)).toBe("amber");
    expect(getEAStatus(29.9)).toBe("red");
  });
});

describe("calcVitalityScore", () => {
  it("is 10 at optimal EA and 8h sleep", () => {
    expect(calcVitalityScore(45, 8)).toBe(10);
  });

  it("is 0 with no energy and no sleep", () => {
    expect(calcVitalityScore(0, 0)).toBe(0);
  });

  it("caps the EA contribution at 7 points", () => {
    // Very high EA still contributes at most 7; 0 sleep → total 7
    expect(calcVitalityScore(200, 0)).toBe(7);
  });

  it("never exceeds the 0–10 range, even at high EA + sleep", () => {
    for (const ea of [0, 30, 45, 65, 120, 500]) {
      for (const sleep of [0, 4, 8, 12]) {
        const score = calcVitalityScore(ea, sleep);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe("getVitalityStatus", () => {
  it("classifies by the 7 / 4 thresholds", () => {
    expect(getVitalityStatus(7)).toBe("green");
    expect(getVitalityStatus(6.9)).toBe("amber");
    expect(getVitalityStatus(4)).toBe("amber");
    expect(getVitalityStatus(3.9)).toBe("red");
  });
});
