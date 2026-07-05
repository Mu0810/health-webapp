/**
 * TiltCard — a drop-in wrapper that gives a card an interactive 3D tilt that
 * follows the pointer. It only sets the --rx / --ry CSS variables the
 * .glass-card transform already reads, so layout is untouched and the effect
 * is inert (0deg) until hovered. Pointer-driven only → no effect on touch or
 * for reduced-motion users (the CSS transition is neutralised there).
 */
"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";

interface Props {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
  /** Max tilt in degrees. */
  max?: number;
}

export default function TiltCard({ className, children, style, max = 7 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${(px * max).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-py * max).toFixed(2)}deg`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      {children}
    </div>
  );
}
