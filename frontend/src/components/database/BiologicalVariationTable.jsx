import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Database } from "lucide-react";
import { SPEC_LEVELS } from "@/lib/sigma";
import { AnalyteRow } from "./AnalyteRow";
import { InfoDialog, ImportControls } from "./ImportControls";

const COLUMNS = [
  ["", "px-3 w-10"], ["Analyte", "px-5"], ["Matrix", "px-3"], ["CVI %", "px-3 text-right"], ["CVG %", "px-3 text-right"],
  ["CV %", "px-3 text-right"], ["Bias %", "px-3 text-right"], ["TEa %", "px-3 text-right"], ["Peer σ", "px-3 text-right"], ["", "px-5 text-right"],
];

export const BiologicalVariationTable = ({ analytes, onUse, favourites, onImported }) => {
  const { isFav, toggle } = favourites;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [level, setLevel] = useState("desirable");

  const detailedCount = useMemo(() => analytes.filter((a) => a.detailed).length, [analytes]);
  const categories = useMemo(() => ["all", ...new Set(analytes.map((a) => a.category))], [analytes]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return analytes
      .filter((a) => (!term || a.name.toLowerCase().includes(term) || a.matrix.toLowerCase().includes(term)) && (cat === "all" || a.category === cat))
      .map((a, i) => [a, i])
      .sort((x, y) => (Number(isFav(y[0].name)) - Number(isFav(x[0].name))) || (x[1] - y[1]))
      .map((p) => p[0]);
  }, [analytes, q, cat, isFav]);

  return (
    <Card className="p-0 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-200 bg-slate-50/60">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-600" />
            <h3 className="font-display font-semibold text-lg text-slate-900">Desirable Biological Variation Database</h3>
            <InfoDialog />
          </div>
          <ImportControls onImported={onImported} />
        </div>
        <p className="text-sm text-slate-500 mb-4">
          {analytes.length} analytes · {detailedCount} with full biological-variation specs (level toggle applies) and {analytes.length - detailedCount} with official Westgard/EFLM allowable total error (TEa). Selected goal: <strong className="text-slate-700 capitalize">{level}</strong>.
        </p>
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Performance goal:</span>
          {SPEC_LEVELS.map((l) => (
            <button key={l.key} onClick={() => setLevel(l.key)} title={l.hint} data-testid={`bv-level-${l.key}`}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                level === l.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search analyte or matrix…"
              className="pl-9" data-testid="bv-database-search-input" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-full sm:w-56" data-testid="bv-database-category-filter"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {categories.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
              {COLUMNS.map(([label, cls], i) => <th key={i} className={`py-3 font-semibold ${cls}`}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <AnalyteRow key={a.slug} a={a} level={level} isFav={isFav(a.name)} onToggleFav={toggle} onUse={onUse} />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-5 py-10 text-center text-slate-400">No analytes match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
