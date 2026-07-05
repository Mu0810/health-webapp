/**
 * CountUp — renders a number that animates from its previous value to the
 * current one whenever `value` changes. Thin wrapper over useCountUp.
 */
"use client";

import { useCountUp } from "@/lib/useCountUp";

interface Props {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
}

export default function CountUp({ value, decimals = 0, duration, suffix = "" }: Props) {
  const v = useCountUp(value, { decimals, duration });
  return <>{v.toFixed(decimals)}{suffix}</>;
}
