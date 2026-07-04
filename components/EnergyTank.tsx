/**
 * EnergyTank.tsx — Fuel-gauge visualization of Energy Availability.
 * Renders EA as a glowing liquid tank with a wavy surface, zone markers
 * (30 = low-EA risk, 45 = optimal), and an optimal-zone band. The liquid
 * height + colour reflect the current EA/status, tying into the Living
 * Organism theme.
 */
"use client";

import { StatusColor, type EAStatus } from "@/lib/ThemeConfig";
import styles from "./EnergyTank.module.css";

interface Props {
  ea: number;
  status: EAStatus;
}

const MAX = 60; // scale ceiling (kcal/kg FFM/day) — 45 is optimal, 30 is the risk line

export default function EnergyTank({ ea, status }: Props) {
  const color = StatusColor[status].primary;
  const fill = Math.max(2, Math.min(100, (ea / MAX) * 100));
  const zone30 = (30 / MAX) * 100;
  const zone45 = (45 / MAX) * 100;

  return (
    <div className={styles.wrap} aria-label={`Energy availability ${ea} kilocalories per kilogram`}>
      <div className={styles.tank}>
        {/* optimal zone band (45 → top) */}
        <div className={styles.optimalBand} style={{ height: `${100 - zone45}%` }} />

        {/* liquid fill */}
        <div
          className={styles.liquid}
          style={{
            height: `${fill}%`,
            // stack two translucent layers of the status colour
            background: `linear-gradient(180deg, ${color}f2, ${color}b0)`,
            boxShadow: `0 0 26px ${color}, inset 0 2px 8px rgba(255,255,255,0.25)`,
          }}
        >
          <div className={styles.wave} style={{ background: color }} />
          <div className={styles.wave2} style={{ background: color }} />
        </div>

        {/* threshold markers */}
        <div className={styles.marker} style={{ bottom: `${zone45}%` }}>
          <span className={styles.markerLabel}>45</span>
        </div>
        <div className={styles.marker} style={{ bottom: `${zone30}%` }}>
          <span className={styles.markerLabel}>30</span>
        </div>
      </div>
    </div>
  );
}
