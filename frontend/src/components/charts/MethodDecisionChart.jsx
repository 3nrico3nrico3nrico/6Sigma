import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Label as RLabel,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { computeSigma, tierForSigma, TIERS } from "@/lib/sigma";

const CONTOURS = [
  { key: "s6", sigma: 6, color: "#059669" },
  { key: "s5", sigma: 5, color: "#2563eb" },
  { key: "s4", sigma: 4, color: "#d97706" },
  { key: "s3", sigma: 3, color: "#ea580c" },
  { key: "s2", sigma: 2, color: "#dc2626" },
];

export const MethodDecisionChart = ({ records, current }) => {
  const lineData = useMemo(() => {
    const arr = [];
    for (let x = 0; x <= 50; x += 1) {
      const row = { x };
      CONTOURS.forEach((c) => {
        const y = 100 - c.sigma * x;
        row[c.key] = y >= 0 ? y : null;
      });
      arr.push(row);
    }
    return arr;
  }, []);

  const points = useMemo(() => {
    const pts = records
      .filter((r) => r.tea > 0)
      .map((r) => {
        const sigma = computeSigma(r.tea, r.cv, r.bias);
        return {
          x: +((r.cv / r.tea) * 100).toFixed(2),
          y: +((Math.abs(r.bias) / r.tea) * 100).toFixed(2),
          sigma, name: r.analyte, instrument: r.instrument,
          fill: tierForSigma(sigma).hex,
        };
      });
    if (current && current.tea > 0 && current.cv > 0) {
      const sigma = computeSigma(current.tea, current.cv, current.bias);
      pts.push({
        x: +((current.cv / current.tea) * 100).toFixed(2),
        y: +((Math.abs(current.bias) / current.tea) * 100).toFixed(2),
        sigma, name: current.analyte || "Current", instrument: current.instrument || "—",
        fill: "#0f172a", isCurrent: true,
      });
    }
    return pts;
  }, [records, current]);

  return (
    <Card className="p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-sky-600" />
        <h3 className="font-display font-semibold text-lg text-slate-900">Normalized Method Decision Chart</h3>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        Operating points plotted as % of TEa. Diagonal lines are Six Sigma contours (y = 100 − σ·x). Points below/left of a line meet that sigma level.
      </p>

      <div className="w-full h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={lineData} margin={{ top: 10, right: 24, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" dataKey="x" domain={[0, 50]} tick={{ fontSize: 11, fill: "#64748b" }}
              tickCount={11} stroke="#cbd5e1">
              <RLabel value="Imprecision (CV as % of TEa)" position="bottom" offset={12}
                style={{ fontSize: 12, fill: "#475569", fontWeight: 600 }} />
            </XAxis>
            <YAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} stroke="#cbd5e1">
              <RLabel value="Inaccuracy (Bias as % of TEa)" angle={-90} position="insideLeft" offset={0}
                style={{ fontSize: 12, fill: "#475569", fontWeight: 600, textAnchor: "middle" }} />
            </YAxis>
            <Tooltip content={<ChartTooltip />} />
            {CONTOURS.map((c) => (
              <Line key={c.key} type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={1.5}
                dot={false} isAnimationActive={false} connectNulls name={`${c.sigma}σ`} />
            ))}
            <Scatter data={points} isAnimationActive={false} name="Operating points">
              {points.map((p, i) => (
                <Cell key={i} fill={p.fill} stroke={p.isCurrent ? "#0ea5e9" : "#fff"} strokeWidth={p.isCurrent ? 3 : 1.5} r={p.isCurrent ? 9 : 6} />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        {Object.values(TIERS).map((t) => (
          <div key={t.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-3 h-3 rounded-full" style={{ background: t.hex }} />
            {t.label} <span className="text-slate-400 font-mono-num">{t.short}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload.find((x) => x.payload && x.payload.name);
  if (!p) return null;
  const d = p.payload;
  const tier = tierForSigma(d.sigma);
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-lg p-3 text-xs">
      <div className="font-semibold text-slate-900">{d.name}</div>
      <div className="text-slate-500">{d.instrument}</div>
      <div className="mt-1 font-mono-num" style={{ color: tier.hex }}>
        {d.sigma.toFixed(2)}σ · {tier.label}
      </div>
      <div className="text-slate-500 font-mono-num">CV {d.x}% · Bias {d.y}% of TEa</div>
    </div>
  );
};
