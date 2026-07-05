/**
 * useCountUp — animate a number from its previous value to a new target with
 * an easeOutCubic ramp (requestAnimationFrame). Honours prefers-reduced-motion
 * by snapping straight to the target. setState is only ever called from nested
 * helpers, keeping clear of the React 19 set-state-in-effect rule.
 */
"use client";

import { useEffect, useRef, useState } from "react";

interface Options {
  duration?: number; // ms
  decimals?: number;
}

export function useCountUp(target: number, { duration = 750, decimals = 0 }: Options = {}): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const snap = () => {
      setValue(to);
      fromRef.current = to;
    };

    if (reduce || from === to || !Number.isFinite(to)) {
      snap();
      return;
    }

    const factor = Math.pow(10, decimals);
    let raf = 0;
    let start = 0;

    const step = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setValue(Math.round(current * factor) / factor);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, decimals]);

  return value;
}
