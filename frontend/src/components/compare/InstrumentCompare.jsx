import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GitCompareArrows, Printer } from "lucide-react";
import { instrumentStats } from "@/lib/compare";
import { Leaderboard } from "./Leaderboard";
import { CompareChart, StatCard, COMPARE_COLORS } from "./CompareChart";

const EMPTY_STAT = (inst) => ({ inst, n: 0, rows: [] });

// Resolve the effective A/B instruments from user picks, falling back to the ranking order.
function resolvePair(instruments, pickA, pickB) {
  const a = instruments.includes(pickA) ? pickA : instruments[0] || "";
  const b = instruments.includes(pickB) && pickB !== a ? pickB : instruments.find((i) => i !== a) || "";
  return [a, b];
}

export const InstrumentCompare = ({ records }) => {
  const [pickAnalyte, setPickAnalyte] = useState("");
  const [pickA, setPickA] = useState("");
  const [pickB, setPickB] = useState("");

  const analytes = useMemo(() => {
    const byName = {};
    records.forEach((r) => { (byName[r.analyte] ||= new Set()).add(r.instrument); });
    return Object.entries(byName)
      .sort((x, y) => y[1].size - x[1].size || x[0].localeCompare(y[0]))
      .map(([name, set]) => ({ name, count: set.size }));
  }, [records]);

  const analyte = analytes.some((a) => a.name === pickAnalyte) ? pickAnalyte : (analytes[0]?.name || "");
  const ranking = useMemo(() => instrumentStats(records, analyte), [records, analyte]);
  const instruments = ranking.map((s) => s.inst);
  const [instA, instB] = resolvePair(instruments, pickA, pickB);

  const stats = [instA, instB].map((inst) => ranking.find((s) => s.inst === inst) || EMPTY_STAT(inst));
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
          <Picker label="Analyte" value={analyte} onChange={setPickAnalyte} testid="compare-analyte-select"
            options={analytes.map((a) => ({ value: a.name, label: `${a.name} · ${a.count} instrument${a.count > 1 ? "s" : ""}` }))} />
          <Picker label="Instrument A" value={instA} onChange={setPickA} testid="compare-instrument-a-select"
            options={instruments.map((i) => ({ value: i, label: i }))} color={COMPARE_COLORS[0]} />
          <Picker label="Instrument B" value={instB} onChange={setPickB} testid="compare-instrument-b-select"
            options={instruments.filter((i) => i !== instA).map((i) => ({ value: i, label: i }))} color={COMPARE_COLORS[1]} />
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

        <CompareChart analyte={analyte} stats={stats} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard s={stats[0]} side="a" best={winner === 0} tied={tied} />
          <StatCard s={stats[1]} side="b" best={winner === 1} tied={tied} />
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
