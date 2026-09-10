import React, { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { GitCompareArrows, Trophy, Scale, Printer, Medal } from "lucide-react";
import { tierForSigma } from "@/lib/sigma";
import { instrumentStats } from "@/lib/compare";

const COLORS = ["#0284c7", "#ea580c"];
const fmtDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });

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

  const ranking = useMemo(() => instrumentStats(records, analyte), [records, analyte]);
  const instruments = useMemo(() => ranking.map((s) => s.inst), [ranking]);

  useEffect(() => {
    if (!analyte && analytes.length) setAnalyte(analytes[0].name);
  }, [analytes, analyte]);

  useEffect(() => {
    const a = instruments.includes(instA) ? instA : instruments[0] || "";
    const b = instruments.includes(instB) && instB !== a ? instB : instruments.find((i) => i !== a) || "";
    if (a !== instA) setInstA(a);
    if (b !== instB) setInstB(b);
  }, [instruments]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = [instA, instB].map((inst) => ranking.find((s) => s.inst === inst) || { inst, n: 0, rows: [] });

  const chartData = useMemo(() => {
    const points = [];
    stats.forEach((s, i) => s.rows.forEach((r) => points.push({ t: new Date(r.measured_at).getTime(), [`s${i}`]: r.sigma })));
    return points.sort((a, b) => a.t - b.t);
  }, [stats]);

  const both = stats[0].n > 0 && stats[1].n > 0;
  const tied = both && stats[0].sigma.toFixed(2) === stats[1].sigma.toFixed(2);
  const winner = both && !tied ? (stats[0].sigma > stats[1].sigma ? 0 : 1) : -1;

  return (
    <div className="space-y-6" data-testid="instrument-compare">
      <Card className="p-5 shadow-sm no-print">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="w-4 h-4 text-sky-600" />
            <h3 className="font-display font-semibold text-slate-900">Pick an analyte and two instruments</h3>
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800" size="sm" onClick={() => window.print()} disabled={!analyte}
            data-testid="compare-print-button">
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
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

      <div id="print-area" className="space-y-6">
        <div className="hidden print:block pb-3 border-b-2 border-slate-900">
          <h1 className="font-display text-xl font-bold text-slate-900">Instrument Comparison — {analyte}</h1>
          <p className="text-xs text-slate-500">SigmaLab QC · {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>

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
                  {stats.map((s, i) => s.inst && (
                    <Line key={s.inst} type="monotone" dataKey={`s${i}`} name={s.inst} stroke={COLORS[i]} strokeWidth={2.5}
                      dot={{ r: 4, fill: COLORS[i] }} connectNulls isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.map((s, i) => <StatCard key={i} s={s} color={COLORS[i]} best={winner === i} tied={tied} idx={i} />)}
        </div>

        {ranking.length > 0 && <Leaderboard analyte={analyte} ranking={ranking} />}
      </div>
    </div>
  );
};

const Picker = ({ label, value, onChange, options, testid, color }) => (
  <div>
    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
      {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}{label}
    </Label>
    <Select value={value ?? ""} onValueChange={onChange} disabled={!options.length}>
      <SelectTrigger className="mt-1.5" data-testid={testid}><SelectValue placeholder="—" /></SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

const StatCard = ({ s, color, best, tied, idx }) => {
  const tier = s.n ? tierForSigma(s.sigma) : null;
  const side = idx === 0 ? "a" : "b";
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

const RANK_STYLE = ["bg-amber-100 text-amber-800", "bg-slate-200 text-slate-700", "bg-orange-100 text-orange-800"];

export const Leaderboard = ({ analyte, ranking, compact }) => (
  <Card className="p-0 overflow-hidden shadow-sm" data-testid={`leaderboard-${compact ? analyte : "card"}`}>
    <div className="p-4 border-b border-slate-200 flex items-center gap-2">
      <Medal className="w-4 h-4 text-sky-600" />
      <h3 className="font-display font-semibold text-slate-900">{compact ? analyte : `Instrument Leaderboard — ${analyte}`}</h3>
      <Badge variant="secondary" className="ml-1 font-mono-num">{ranking.length}</Badge>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
            <th className="px-4 py-2.5 font-semibold w-12">#</th>
            <th className="px-3 py-2.5 font-semibold">Instrument</th>
            <th className="px-3 py-2.5 font-semibold text-right">Mean σ</th>
            <th className="px-3 py-2.5 font-semibold text-right">Mean CV%</th>
            <th className="px-3 py-2.5 font-semibold text-right">Mean |Bias|%</th>
            <th className="px-3 py-2.5 font-semibold text-right">Records</th>
            <th className="px-4 py-2.5 font-semibold text-right">Last σ</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((s, i) => {
            const tier = tierForSigma(s.sigma);
            return (
              <tr key={s.inst} className="border-b border-slate-100" data-testid={`leaderboard-row-${i + 1}`}>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${RANK_STYLE[i] || "bg-slate-50 text-slate-500"}`}>{i + 1}</span>
                </td>
                <td className="px-3 py-2.5 font-medium text-slate-900">{s.inst}</td>
                <td className="px-3 py-2.5 text-right font-mono-num font-semibold" style={{ color: tier.hex }}>{s.sigma.toFixed(2)}σ</td>
                <td className="px-3 py-2.5 text-right font-mono-num text-slate-700">{s.cv.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-mono-num text-slate-700">{s.bias.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-mono-num text-slate-700">{s.n}</td>
                <td className="px-4 py-2.5 text-right font-mono-num" style={{ color: tierForSigma(s.last).hex }}>{s.last.toFixed(2)}σ <span className="text-slate-400 text-xs">({fmtDate(s.lastDate)})</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </Card>
);
