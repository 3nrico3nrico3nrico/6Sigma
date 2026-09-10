import React from "react";
import { tierForSigma } from "@/lib/sigma";

const SCALE = 7;
const CX = 130, CY = 120, R = 100;

function polar(angleDeg, radius = R) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY - radius * Math.sin(a) };
}

function arcPath(a1, a2, radius = R) {
  const p1 = polar(a1, radius);
  const p2 = polar(a2, radius);
  const largeArc = Math.abs(a1 - a2) > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
}

// map sigma value -> angle (180 left .. 0 right)
const valToAngle = (v) => 180 - (Math.max(0, Math.min(SCALE, v)) / SCALE) * 180;

const SEGMENTS = [
  { from: 0, to: 3, color: "#dc2626" },
  { from: 3, to: 4, color: "#ea580c" },
  { from: 4, to: 5, color: "#d97706" },
  { from: 5, to: 6, color: "#2563eb" },
  { from: 6, to: 7, color: "#059669" },
];

export const SigmaGauge = ({ sigma = 0 }) => {
  const tier = tierForSigma(sigma);
  const needleAngle = valToAngle(sigma);
  const tip = polar(needleAngle, R - 14);

  return (
    <div className="flex flex-col items-center" data-testid="sigma-gauge">
      <svg viewBox="0 0 260 150" className="w-full max-w-[320px]">
        {SEGMENTS.map((s) => (
          <path
            key={s.from}
            d={arcPath(valToAngle(s.from), valToAngle(s.to))}
            fill="none"
            stroke={s.color}
            strokeWidth="16"
            strokeLinecap="butt"
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => {
          const p = polar(valToAngle(t), R - 26);
          return (
            <text key={t} x={p.x} y={p.y} fontSize="10" fill="#64748b"
              textAnchor="middle" dominantBaseline="middle" className="font-mono-num">
              {t}
            </text>
          );
        })}
        <line x1={CX} y1={CY} x2={tip.x} y2={tip.y}
          stroke={tier.hex} strokeWidth="4" strokeLinecap="round" />
        <circle cx={CX} cy={CY} r="7" fill={tier.hex} />
        <circle cx={CX} cy={CY} r="3" fill="#fff" />
      </svg>
      <div className="text-center -mt-2">
        <div className="font-mono-num text-4xl font-bold" style={{ color: tier.hex }}
          data-testid="result-sigma-value">
          {sigma.toFixed(2)}σ
        </div>
      </div>
    </div>
  );
};
