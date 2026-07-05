/**
 * CelebrationBurst — a one-shot confetti burst played when the user's vitality
 * crosses UP into the "green" (optimal) zone. Pure CSS particles (no library),
 * remounted per burst via a changing key. Skipped for reduced-motion users.
 *
 * Particle randomness is generated inside the effect (on fire) and kept in
 * state, so the render stays pure (react-hooks/purity).
 */
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./CelebrationBurst.module.css";

const COLORS = ["#34d399", "#22d3ee", "#a855f7", "#ec4899", "#fbbf24"];
const N = 30;

interface Piece {
  tx: string;
  ty: string;
  rot: string;
  bg: string;
  delay: string;
  size: string;
}

function makePieces(): Piece[] {
  return Array.from({ length: N }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / N + Math.random() * 0.4;
    const dist = 120 + Math.random() * 260;
    return {
      tx: `${(Math.cos(angle) * dist).toFixed(0)}px`,
      ty: `${(Math.sin(angle) * dist - 60).toFixed(0)}px`, // bias upward
      rot: `${(Math.random() * 720 - 360).toFixed(0)}deg`,
      bg: COLORS[i % COLORS.length],
      delay: `${(Math.random() * 90).toFixed(0)}ms`,
      size: `${(6 + Math.random() * 7).toFixed(0)}px`,
    };
  });
}

export default function CelebrationBurst({ status }: { status: string }) {
  const prev = useRef<string | null>(null);
  const [state, setState] = useState<{ key: number; pieces: Piece[] }>({ key: 0, pieces: [] });

  useEffect(() => {
    const fire = () => setState((s) => ({ key: s.key + 1, pieces: makePieces() }));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && prev.current && prev.current !== "green" && status === "green") {
      fire();
    }
    prev.current = status;
  }, [status]);

  if (state.key === 0) return null;

  return (
    <div className={styles.layer} key={state.key} aria-hidden="true">
      {state.pieces.map((p, i) => (
        <span
          key={i}
          className={styles.piece}
          style={
            {
              "--tx": p.tx,
              "--ty": p.ty,
              "--rot": p.rot,
              background: p.bg,
              animationDelay: p.delay,
              width: p.size,
              height: p.size,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
