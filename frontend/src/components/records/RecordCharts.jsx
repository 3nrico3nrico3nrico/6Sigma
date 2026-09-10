import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { History, Layers } from "lucide-react";
import { TREND_PALETTE } from "@/lib/sigma";
import {
  CHART_MARGIN, AXIS_TICK, AXIS_STROKE, GRID_STROKE, LEGEND_STYLE, SIGMA_DOMAIN, DOT_SM, SIGMA_REF,
  REF_LABEL_3, REF_LABEL_6,
} from "@/lib/chartStyles";

export const CombinedTrendChart = ({ rows, names }) => (
  <Card className="p-6 shadow-sm" data-testid="combined-trend-card">
    <div className="flex items-center gap-2 mb-1">
      <Layers className="w-5 h-5 text-sky-600" />
      <h3 className="font-display font-semibold text-lg text-slate-900">Lab-wide Sigma Trend</h3>
    </div>
    <p className="text-sm text-slate-500 mb-4">Every analyte's sigma over time on one chart — spot lab-wide drift at a glance.</p>
    <div className="w-full h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="month" tick={AXIS_TICK} stroke={AXIS_STROKE} />
          <YAxis domain={SIGMA_DOMAIN} tick={AXIS_TICK} stroke={AXIS_STROKE} />
          <Tooltip />
          <Legend wrapperStyle={LEGEND_STYLE} />
          <ReferenceLine y={SIGMA_REF.floor.y} stroke={SIGMA_REF.floor.stroke} strokeDasharray="4 4" />
          <ReferenceLine y={SIGMA_REF.world.y} stroke={SIGMA_REF.world.stroke} strokeDasharray="4 4" />
          {names.map((name, i) => (
            <Line key={name} type="monotone" dataKey={name} stroke={TREND_PALETTE[i % TREND_PALETTE.length]}
              strokeWidth={2} dot={DOT_SM} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  </Card>
);

export const SigmaTrendChart = ({ analyte, series }) => {
  const data = useMemo(() => {
    const byT = {};
    series.forEach((s) => s.rows.forEach((r) => {
      const t = new Date(r.measured_at).getTime();
      const row = (byT[t] ||= { t, meta: {} });
      row[s.inst] = r.sigma;
      row.meta[s.inst] = r;
    }));
    return Object.values(byT).sort((a, b) => a.t - b.t);
  }, [series]);

  return (
    <Card className="p-6 shadow-sm" data-testid="sigma-trend-card">
      <div className="flex items-center gap-2 mb-1">
        <History className="w-5 h-5 text-sky-600" />
        <h3 className="font-display font-semibold text-lg text-slate-900">Sigma Trend Over Time — {analyte}</h3>
      </div>
      <p className="text-sm text-slate-500 mb-4">{series.length > 1 ? "One line per instrument." : series[0]?.inst} · {data.length} time points</p>
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="t" type="number" domain={TIME_DOMAIN} scale="time" tickFormatter={fmtAxisDate} tick={AXIS_TICK} stroke={AXIS_STROKE} />
            <YAxis domain={TREND_Y_DOMAIN} tick={AXIS_TICK} stroke={AXIS_STROKE} />
            <Tooltip content={<TrendTooltip />} />
            {series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
            <ReferenceLine y={SIGMA_REF.world.y} stroke={SIGMA_REF.world.stroke} strokeDasharray="4 4" label={REF_LABEL_6} />
            <ReferenceLine y={SIGMA_REF.floor.y} stroke={SIGMA_REF.floor.stroke} strokeDasharray="4 4" label={REF_LABEL_3} />
            {series.map((s, i) => (
              <Line key={s.inst} type="monotone" dataKey={s.inst} name={s.inst} stroke={TREND_PALETTE[i % TREND_PALETTE.length]}
                strokeWidth={2.5} dot={TREND_DOTS[i % TREND_DOTS.length]} connectNulls isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

const TIME_DOMAIN = ["dataMin", "dataMax"];
const TREND_Y_DOMAIN = [0, (max) => Math.max(8, Math.ceil(max))];
const TREND_DOTS = TREND_PALETTE.map((c) => ({ r: 4, fill: c }));
const fmtAxisDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
const fmtFullDate = (t) => new Date(t).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const TrendTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-md px-3 py-2 text-xs" data-testid="sigma-trend-tooltip">
      <div className="font-semibold text-slate-900 mb-1">{fmtFullDate(row.t)}</div>
      {payload.map((p) => {
        const r = row.meta[p.dataKey];
        return (
          <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600">{p.dataKey}</span>
            <span className="font-mono-num font-semibold ml-auto" data-testid="sigma-trend-tooltip-sigma">{Number(p.value).toFixed(2)}σ</span>
            {r && <span className="text-slate-400 font-mono-num">CV {r.cv} · Bias {r.bias}{r.lot ? ` · ${r.lot}` : ""}</span>}
          </div>
        );
      })}
    </div>
  );
};
