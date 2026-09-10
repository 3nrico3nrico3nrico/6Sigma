import React from "react";
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

const TREND_DOT = { r: 4, fill: "#0284c7" };

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

export const SigmaTrendChart = ({ data }) => (
  <Card className="p-6 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <History className="w-5 h-5 text-sky-600" />
      <h3 className="font-display font-semibold text-lg text-slate-900">Sigma Trend Over Time</h3>
    </div>
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="date" tick={AXIS_TICK} stroke={AXIS_STROKE} />
          <YAxis domain={SIGMA_DOMAIN} tick={AXIS_TICK} stroke={AXIS_STROKE} />
          <Tooltip />
          <ReferenceLine y={SIGMA_REF.world.y} stroke={SIGMA_REF.world.stroke} strokeDasharray="4 4" label={REF_LABEL_6} />
          <ReferenceLine y={SIGMA_REF.floor.y} stroke={SIGMA_REF.floor.stroke} strokeDasharray="4 4" label={REF_LABEL_3} />
          <Line type="monotone" dataKey="sigma" stroke="#0284c7" strokeWidth={2.5} dot={TREND_DOT} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </Card>
);
