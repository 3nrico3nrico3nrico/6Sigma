import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Search, ArrowRight, Info, Database } from "lucide-react";

export const BiologicalVariationTable = ({ analytes, onUse }) => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(analytes.map((a) => a.category)))],
    [analytes]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return analytes.filter((a) => {
      const matchQ = !term || a.name.toLowerCase().includes(term) || a.matrix.toLowerCase().includes(term);
      const matchC = cat === "all" || a.category === cat;
      return matchQ && matchC;
    });
  }, [analytes, q, cat]);

  return (
    <Card className="p-0 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-200 bg-slate-50/60">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-sky-600" />
          <h3 className="font-display font-semibold text-lg text-slate-900">Desirable Biological Variation Database</h3>
          <InfoDialog />
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Ricos/EFLM desirable specifications · {analytes.length} analytes. I = 0.5·CVI, Bias = 0.25·√(CVI²+CVG²), TEa = 1.65·I + Bias.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search analyte or matrix…"
              className="pl-9" data-testid="bv-database-search-input" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-full sm:w-56" data-testid="bv-database-category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <th className="px-5 py-3 font-semibold">Analyte</th>
              <th className="px-3 py-3 font-semibold">Matrix</th>
              <th className="px-3 py-3 font-semibold text-right">CVI %</th>
              <th className="px-3 py-3 font-semibold text-right">CVG %</th>
              <th className="px-3 py-3 font-semibold text-right">Des. CV %</th>
              <th className="px-3 py-3 font-semibold text-right">Des. Bias %</th>
              <th className="px-3 py-3 font-semibold text-right">TEa %</th>
              <th className="px-5 py-3 font-semibold text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.slug} className="border-b border-slate-100 hover:bg-sky-50/40 transition-colors"
                data-testid={`bv-database-row-${a.slug}`}>
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900">{a.name}</div>
                  <div className="text-[11px] text-slate-400">{a.category}</div>
                </td>
                <td className="px-3 py-3 text-slate-600">
                  <Badge variant="secondary" className="font-normal text-[11px]">{a.matrix}</Badge>
                </td>
                <td className="px-3 py-3 text-right font-mono-num text-slate-700">{a.cvi}</td>
                <td className="px-3 py-3 text-right font-mono-num text-slate-700">{a.cvg}</td>
                <td className="px-3 py-3 text-right font-mono-num text-slate-700">{a.desirable_cv}</td>
                <td className="px-3 py-3 text-right font-mono-num text-slate-700">{a.desirable_bias}</td>
                <td className="px-3 py-3 text-right font-mono-num font-semibold text-slate-900">{a.tea}</td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="outline" className="h-8"
                    onClick={() => onUse(a)}
                    data-testid={`bv-database-use-btn-${a.slug}`}>
                    Use <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No analytes match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const InfoDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button className="ml-1 text-slate-400 hover:text-sky-600 transition-colors" data-testid="bv-info-button">
        <Info className="w-4 h-4" />
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display">EFLM Milan Hierarchy & Desirable Specifications</DialogTitle>
        <DialogDescription>How analytical performance goals are derived</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-sm text-slate-600">
        <p>The EFLM (formerly Ricos et al.) database defines analytical quality goals from biological variation components: within-subject (CVI) and between-subject (CVG).</p>
        <ul className="space-y-2">
          <li className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <span className="font-mono-num font-semibold text-slate-900">Desirable Imprecision (I) = 0.50 × CVI</span>
          </li>
          <li className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <span className="font-mono-num font-semibold text-slate-900">Desirable Bias (B) = 0.25 × √(CVI² + CVG²)</span>
          </li>
          <li className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <span className="font-mono-num font-semibold text-slate-900">Desirable TEa = 1.65 × I + B</span>
          </li>
        </ul>
        <p className="text-xs text-slate-500">Values are illustrative desirable-level specifications. Verify against the current EFLM Biological Variation Database for regulated use.</p>
      </div>
    </DialogContent>
  </Dialog>
);
