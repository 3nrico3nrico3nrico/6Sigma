import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Trophy, Scale } from "lucide-react";
import { tierForSigma } from "@/lib/sigma";
import {
  CHART_MARGIN, AXIS_TICK, AXIS_STROKE, GRID_STROKE, LEGEND_STYLE, SIGMA_DOMAIN, SIGMA_REF,
} from "@/lib/chartStyles";
import { fmtShortDate } from "./Leaderboard";

export const COMPARE_COLORS = ["#0284c7", "#ea580c"];
const TIME_DOMAIN = ["dataMin", "dataMax"];
const DOTS = COMPARE_COLORS.map((c) => ({ r: 4, fill: c }));
const fmtSigma = (v) => [`${Number(v).toFixed(2)}σ`];

export const CompareChart = ({ analyte, stats }) => {
  const data = useMemo(() => {
    const points = [];
    stats.forEach((s, i) => s.rows.forEach((r) => points.push({ t: new Date(r.measured_at).getTime(), [`s${i}`]: r.sigma })));
    return points.sort((a, b) => a.t - b.t);
  }, [stats]);

  if (!data.length) return null;
  return (
    <Card className="p-6 shadow-sm" data-testid="compare-chart-card">
      <h3 className="font-display font-semibold text-lg text-slate-900 mb-1">Sigma over time — {analyte}</h3>
      <p className="text-sm text-slate-500 mb-4">Both instruments on one timeline. Dashed lines mark the 3σ floor and 6σ world-class goal.</p>
      <div className="w-full h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="t" type="number" domain={TIME_DOMAIN} scale="time" tickFormatter={fmtShortDate} tick={AXIS_TICK} stroke={AXIS_STROKE} />
            <YAxis domain={SIGMA_DOMAIN} tick={AXIS_TICK} stroke={AXIS_STROKE} />
            <Tooltip labelFormatter={fmtShortDate} formatter={fmtSigma} />
            <Legend wrapperStyle={LEGEND_STYLE} />
            <ReferenceLine y={SIGMA_REF.floor.y} stroke={SIGMA_REF.floor.stroke} strokeDasharray="4 4" />
            <ReferenceLine y={SIGMA_REF.world.y} stroke={SIGMA_REF.world.stroke} strokeDasharray="4 4" />
            {stats.map((s, i) => s.inst && (
              <Line key={s.inst} type="monotone" dataKey={`s${i}`} name={s.inst} stroke={COMPARE_COLORS[i]} strokeWidth={2.5}
                dot={DOTS[i]} connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export const StatCard = ({ s, side, best, tied }) => {
  const color = COMPARE_COLORS[side === "a" ? 0 : 1];
  const tier = s.n ? tierForSigma(s.sigma) : null;
  return (
    <Card className="p-5 shadow-sm border-t-4" style={{ borderTopColor: color }} data-testid={`compare-stats-${side}`}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Instrument {side.toUpperCase()}</div>
          <div className="font-display font-semibold text-slate-900">{s.inst || "—"}</div>
        </div>
        {best && (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50" data-testid={`compare-best-${side}`}>
            <Trophy className="w-3 h-3 mr-1" /> Higher mean σ
          </Badge>
        )}
        {tied && s.n > 0 && (
          <Badge className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100" data-testid={`compare-tied-${side}`}>
            <Scale className="w-3 h-3 mr-1" /> Tied
          </Badge>
        )}
      </div>
      {s.n === 0 ? (
        <p className="text-sm text-slate-400">No records.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Mean sigma" value={`${s.sigma.toFixed(2)}σ`} hex={tier.hex} />
          <Stat label="Mean CV" value={`${s.cv.toFixed(2)}%`} />
          <Stat label="Mean |Bias|" value={`${s.bias.toFixed(2)}%`} />
          <Stat label={`Last (${fmtShortDate(s.lastDate)})`} value={`${s.last.toFixed(2)}σ`} hex={tierForSigma(s.last).hex} />
        </div>
      )}
      {s.n > 0 && <div className="mt-3 text-[11px] text-slate-400">{s.n} record{s.n > 1 ? "s" : ""} · {tier.label}</div>}
    </Card>
  );
};

const Stat = ({ label, value, hex }) => (
  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
    <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
    <div className="font-mono-num text-lg font-semibold mt-0.5" style={hex ? { color: hex } : undefined}>{value}</div>
  </div>
);
