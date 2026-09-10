import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Search, ArrowRight, Info, Database, Users, Star, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SPEC_LEVELS, tierForSigma } from "@/lib/sigma";
import { importAnalytes, clearCustomAnalytes } from "@/lib/api";

export const BiologicalVariationTable = ({ analytes, onUse, favourites, onImported }) => {
  const { isFav, toggle } = favourites;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [level, setLevel] = useState("desirable");

  const detailedCount = useMemo(() => analytes.filter((a) => a.detailed).length, [analytes]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(analytes.map((a) => a.category)))],
    [analytes]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = analytes.filter((a) => {
      const matchQ = !term || a.name.toLowerCase().includes(term) || a.matrix.toLowerCase().includes(term);
      const matchC = cat === "all" || a.category === cat;
      return matchQ && matchC;
    });
    // Favourites first, then original order.
    return list
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
            <button
              key={l.key}
              onClick={() => setLevel(l.key)}
              title={l.hint}
              data-testid={`bv-level-${l.key}`}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                level === l.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
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
              <th className="px-3 py-3 font-semibold w-10"></th>
              <th className="px-5 py-3 font-semibold">Analyte</th>
              <th className="px-3 py-3 font-semibold">Matrix</th>
              <th className="px-3 py-3 font-semibold text-right">CVI %</th>
              <th className="px-3 py-3 font-semibold text-right">CVG %</th>
              <th className="px-3 py-3 font-semibold text-right">CV %</th>
              <th className="px-3 py-3 font-semibold text-right">Bias %</th>
              <th className="px-3 py-3 font-semibold text-right">TEa %</th>
              <th className="px-3 py-3 font-semibold text-right">Peer σ</th>
              <th className="px-5 py-3 font-semibold text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const teaVal = a.detailed ? a.specs[level].tea : a.tea;
              return (
              <tr key={a.slug} className="border-b border-slate-100 hover:bg-sky-50/40 transition-colors"
                data-testid={`bv-database-row-${a.slug}`}>
                <td className="px-3 py-3 text-center">
                  <button onClick={() => toggle(a.name)} title="Star for quick access"
                    data-testid={`bv-fav-toggle-${a.slug}`} className="align-middle">
                    <Star className={`w-4 h-4 transition-colors ${isFav(a.name) ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-400"}`} />
                  </button>
                </td>
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900 flex items-center gap-1.5 flex-wrap">
                    {a.name}
                    <Badge variant="outline" className="font-normal text-[10px] px-1.5 py-0 text-slate-500" data-testid={`bv-matrix-badge-${a.slug}`}>{a.matrix}</Badge>
                    {a.source && <span className={`text-[10px] font-semibold uppercase ${a.custom ? "text-sky-600" : "text-slate-400"}`}>{a.source}</span>}
                  </div>
                  <div className="text-[11px] text-slate-400">{a.category}</div>
                </td>
                <td className="px-3 py-3 text-slate-600">
                  <Badge variant="secondary" className="font-normal text-[11px]">{a.matrix}</Badge>
                </td>
                <td className="px-3 py-3 text-right font-mono-num text-slate-700">{a.cvi ?? "—"}</td>
                <td className="px-3 py-3 text-right font-mono-num text-slate-700">{a.cvg ?? "—"}</td>
                <td className="px-3 py-3 text-right font-mono-num text-slate-700">{a.detailed ? a.specs[level].cv : "—"}</td>
                <td className="px-3 py-3 text-right font-mono-num text-slate-700">{a.detailed ? a.specs[level].bias : "—"}</td>
                <td className="px-3 py-3 text-right font-mono-num font-semibold text-slate-900">{teaVal != null ? teaVal : "—"}</td>
                <td className="px-3 py-3 text-right">
                  {a.peer_sigma != null ? (
                    <span className="inline-flex items-center gap-1 font-mono-num text-xs font-semibold" style={{ color: tierForSigma(a.peer_sigma).hex }}>
                      <Users className="w-3 h-3" />{a.peer_sigma.toFixed(1)}
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" variant="outline" className="h-8" disabled={teaVal == null}
                    onClick={() => onUse(a, teaVal)}
                    data-testid={`bv-database-use-btn-${a.slug}`}>
                    Use <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-5 py-10 text-center text-slate-400">No analytes match your filters.</td></tr>
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


const ImportControls = ({ onImported }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const doImport = async () => {
    if (!file) return toast.error("Choose a file first");
    setBusy(true);
    try {
      const res = await importAnalytes(file);
      toast.success(`Imported ${res.imported} analytes`);
      setFile(null);
      setOpen(false);
      onImported && onImported();
    } catch (e) {
      toast.error("Import failed — check the file format");
    } finally {
      setBusy(false);
    }
  };

  const doClear = async () => {
    setBusy(true);
    try {
      const res = await clearCustomAnalytes();
      toast.success(`Removed ${res.deleted} imported analytes`);
      onImported && onImported();
    } catch {
      toast.error("Could not clear imported analytes");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-rose-600" onClick={doClear} disabled={busy}
        data-testid="bv-clear-imported-button" title="Remove all imported analytes">
        <Trash2 className="w-4 h-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" data-testid="bv-import-button">
            <Upload className="w-4 h-4 mr-2" /> Import
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md" data-testid="bv-import-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Import Analytes</DialogTitle>
            <DialogDescription>Upload an Excel (.xlsx) or CSV file to add your own analytes and TEa specifications.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
              Expected columns: <strong>Matrix</strong>, <strong>Analyte</strong>, <strong>TEa%</strong>. Optional <strong>CVI%</strong> and <strong>CVG%</strong> columns unlock full optimal/desirable/minimum goals. Headers are auto-detected.
            </div>
            <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:border-sky-400 transition-colors">
              <Upload className="w-6 h-6 text-slate-400" />
              <span className="text-sm text-slate-600">{file ? file.name : "Click to choose a .xlsx or .csv file"}</span>
              <input type="file" accept=".xlsx,.csv" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="bv-import-file-input" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={doImport} disabled={busy || !file}
              data-testid="bv-import-submit-button">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</> : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
