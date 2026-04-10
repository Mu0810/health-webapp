/**
 * BiometricWave — Organic SVG line chart for blood glucose vs food timestamps
 */
"use client";

import { useMemo } from "react";
import styles from "./BiometricWave.module.css";

interface DataPoint {
  timestamp: number;
  value: number;
}

interface FoodMark {
  timestamp: number;
  name: string;
}

interface Props {
  data: DataPoint[];
  foodMarks?: FoodMark[];
  height?: number;
}

const GLUCOSE_MIN = 60;
const GLUCOSE_MAX = 180;
const GREEN_ZONE = { min: 70, max: 140 };

function normalise(v: number, min: number, max: number, h: number): number {
  return h - ((v - min) / (max - min)) * h;
}

export default function BiometricWave({ data, foodMarks = [], height = 140 }: Props) {
  const W = 560;
  const H = height;
  const PAD = { x: 8, y: 8 };

  const { pathD, areaD, points } = useMemo(() => {
    if (data.length < 2) return { pathD: "", areaD: "", points: [] };

    const minT = data[0].timestamp;
    const maxT = data[data.length - 1].timestamp;
    const rangeT = maxT - minT || 1;

    const pts = data.map((d) => ({
      x: PAD.x + ((d.timestamp - minT) / rangeT) * (W - PAD.x * 2),
      y: PAD.y + normalise(d.value, GLUCOSE_MIN, GLUCOSE_MAX, H - PAD.y * 2),
      value: d.value,
      timestamp: d.timestamp,
    }));

    // Catmull-Rom spline
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const area =
      path +
      ` L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

    return { pathD: path, areaD: area, points: pts };
  }, [data, H]);

  const greenTop = PAD.y + normalise(GREEN_ZONE.max, GLUCOSE_MIN, GLUCOSE_MAX, H - PAD.y * 2);
  const greenBottom = PAD.y + normalise(GREEN_ZONE.min, GLUCOSE_MIN, GLUCOSE_MAX, H - PAD.y * 2);
  const lastPoint = points[points.length - 1];

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>Blood Glucose</span>
        <span className={styles.live}>
          <span className={styles.dot} />
          Live
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className={styles.svg}
        aria-label="Blood glucose chart"
      >
        <defs>
          <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Green zone band */}
        <rect
          x={PAD.x}
          y={greenTop}
          width={W - PAD.x * 2}
          height={greenBottom - greenTop}
          fill="rgba(16,185,129,0.07)"
          rx="4"
        />
        <line
          x1={PAD.x} y1={greenTop} x2={W - PAD.x} y2={greenTop}
          stroke="#10b981" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4"
        />
        <line
          x1={PAD.x} y1={greenBottom} x2={W - PAD.x} y2={greenBottom}
          stroke="#10b981" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4"
        />

        {/* Area fill */}
        {areaD && (
          <path d={areaD} fill="url(#waveGrad)" className={styles.area} />
        )}

        {/* Main wave */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#0d9488"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#glow)"
            className={styles.wave}
          />
        )}

        {/* Food markers */}
        {foodMarks.map((fm, i) => {
          if (data.length < 2) return null;
          const minT = data[0].timestamp;
          const maxT = data[data.length - 1].timestamp;
          const rangeT = maxT - minT || 1;
          if (fm.timestamp < minT || fm.timestamp > maxT) return null;
          const x = PAD.x + ((fm.timestamp - minT) / rangeT) * (W - PAD.x * 2);
          return (
            <g key={i}>
              <line x1={x} y1={PAD.y} x2={x} y2={H - PAD.y} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <circle cx={x} cy={H - PAD.y - 4} r="3" fill="#f59e0b" opacity="0.9" />
            </g>
          );
        })}

        {/* Current value indicator */}
        {lastPoint && (
          <g>
            <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="#0d9488" opacity="0.3" className={styles.pulse} />
            <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill="#0d9488" />
          </g>
        )}
      </svg>

      <div className={styles.footer}>
        <span className={styles.footerLabel}>
          {lastPoint ? `${Math.round(lastPoint.value)} mg/dL` : "—"}
        </span>
        <span className={styles.footerZone}>Target: 70–140 mg/dL</span>
      </div>
    </div>
  );
}
