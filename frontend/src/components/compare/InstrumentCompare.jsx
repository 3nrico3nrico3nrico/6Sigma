import React, { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { GitCompareArrows, Trophy } from "lucide-react";
import { tierForSigma } from "@/lib/sigma";

const COLORS = ["#0284c7", "#ea580c"];
const fmtDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

export const InstrumentCompare = ({ records }) => {
  const [analyte, setAnalyte] = useState("");
  const [instA, setInstA] = useState("");
  const [instB, setInstB] = useState("");

  const analytes = useMemo(() => {
    const byName = {};
    records.forEach((r) => { (byName[r.analyte] ||= new Set()).add(r.instrument); });
    return Object.entries(byName)
      .sort((x, y) => y[1].size - x[1].size || x[0].localeCompare(y[0]))
      .map(([name, set]) => ({ name, count: set.size }));
  }, [records]);

  const instruments = useMemo(
    () => Array.from(new Set(records.filter((r) => r.analyte === analyte).map((r) => r.instrument))),
    [records, analyte]
  );

  useEffect(() => {
    if (!analyte && analytes.length) setAnalyte(analytes[0].name);
  }, [analytes, analyte]);

  useEffect(() => {
    if (!instruments.includes(instA)) setInstA(instruments[0] || "");
    if (!instruments.includes(instB) || instB === instA) setInstB(instruments.find((i) => i !== (instruments.includes(instA) ? instA : instruments[0])) || "");
  }, [instruments]); // eslint-disable-line react-hooks/exhaustive-deps

  const series = useMemo(() => {
    const pick = (inst) => records
      .filter((r) => r.analyte === analyte && r.instrument === inst)
      .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
    return [instA, instB].map((inst) => ({ inst, rows: inst ? pick(inst) : [] }));
  }, [records, analyte, instA, instB]);

  const chartData = useMemo(() => {
    const points = [];
    series.forEach((s, i) => s.rows.forEach((r) => points.push({ t: new Date(r.measured_at).getTime(), [`s${i}`]: r.sigma })));
    return points.sort((a, b) => a.t - b.t);
  }, [series]);

  const stats = series.map((s) => {
    const sig = s.rows.map((r) => r.sigma);
    const last = s.rows[s.rows.length - 1];
    return {
      inst: s.inst, n: s.rows.length,
      sigma: mean(sig), cv: mean(s.rows.map((r) => r.cv)), bias: mean(s.rows.map((r) => Math.abs(r.bias))),
      last: last ? last.sigma : null, lastDate: last ? last.measured_at : null,
    };
  });
  const winner = stats[0].sigma != null && stats[1].sigma != null
    ? (stats[0].sigma === stats[1].sigma ? -1 : (stats[0].sigma > stats[1].sigma ? 0 : 1)) : -1;

  return (
    <div className="space-y-6" data-testid="instrument-compare">
      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <GitCompareArrows className="w-4 h-4 text-sky-600" />
          <h3 className="font-display font-semibold text-slate-900">Pick an analyte and two instruments</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Picker label="Analyte" value={analyte} onChange={setAnalyte} testid="compare-analyte-select"
            options={analytes.map((a) => ({ value: a.name, label: `${a.name} · ${a.count} instrument${a.count > 1 ? "s" : ""}` }))} />
          <Picker label="Instrument A" value={instA} onChange={setInstA} testid="compare-instrument-a-select"
            options={instruments.map((i) => ({ value: i, label: i }))} color={COLORS[0]} />
          <Picker label="Instrument B" value={instB} onChange={setInstB} testid="compare-instrument-b-select"
            options={instruments.filter((i) => i !== instA).map((i) => ({ value: i, label: i }))} color={COLORS[1]} />
        </div>
        {instruments.length < 2 && analyte && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2" data-testid="compare-single-instrument-hint">
            Only one instrument has records for {analyte}. Save a record for this analyte on another instrument to compare.
          </p>
        )}
      </Card>

      {chartData.length > 0 && (
        <Card className="p-6 shadow-sm" data-testid="compare-chart-card">
          <h3 className="font-display font-semibold text-lg text-slate-900 mb-1">Sigma over time — {analyte}</h3>
          <p className="text-sm text-slate-500 mb-4">Both instruments on one timeline. Dashed lines mark the 3σ floor and 6σ world-class goal.</p>
          <div className="w-full h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: "#64748b" }} stroke="#cbd5e1" />
                <YAxis domain={[0, 8]} tick={{ fontSize: 11, fill: "#64748b" }} stroke="#cbd5e1" />
                <Tooltip labelFormatter={fmtDate} formatter={(v) => [`${Number(v).toFixed(2)}σ`]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={3} stroke="#dc2626" strokeDasharray="4 4" />
                <ReferenceLine y={6} stroke="#059669" strokeDasharray="4 4" />
                {series.map((s, i) => s.inst && (
                  <Line key={s.inst} type="monotone" dataKey={`s${i}`} name={s.inst} stroke={COLORS[i]} strokeWidth={2.5}
                    dot={{ r: 4, fill: COLORS[i] }} connectNulls isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((s, i) => <StatCard key={i} s={s} color={COLORS[i]} best={winner === i} idx={i} />)}
      </div>
    </div>
  );
};

const Picker = ({ label, value, onChange, options, testid, color }) => (
  <div>
    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
      {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}{label}
    </Label>
    <Select value={value || undefined} onValueChange={onChange} disabled={!options.length}>
      <SelectTrigger className="mt-1.5" data-testid={testid}><SelectValue placeholder="—" /></SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

const StatCard = ({ s, color, best, idx }) => {
  const tier = s.sigma != null ? tierForSigma(s.sigma) : null;
  return (
    <Card className="p-5 shadow-sm border-t-4" style={{ borderTopColor: color }} data-testid={`compare-stats-${idx === 0 ? "a" : "b"}`}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Instrument {idx === 0 ? "A" : "B"}</div>
          <div className="font-display font-semibold text-slate-900">{s.inst || "—"}</div>
        </div>
        {best && (
          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50" data-testid={`compare-best-${idx === 0 ? "a" : "b"}`}>
            <Trophy className="w-3 h-3 mr-1" /> Higher mean σ
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
          <Stat label={`Last (${fmtDate(s.lastDate)})`} value={`${s.last.toFixed(2)}σ`} hex={tierForSigma(s.last).hex} />
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
