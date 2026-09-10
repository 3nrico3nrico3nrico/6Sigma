import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { tierForSigma, TIERS, westgardRecommendation } from "@/lib/sigma";

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

export const ReportExporter = ({ records }) => {
  // Latest record per analyte+instrument for the summary
  const latest = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      const key = `${r.analyte}__${r.instrument}`;
      const prev = map.get(key);
      if (!prev || new Date(r.measured_at) > new Date(prev.measured_at)) map.set(key, r);
    });
    return Array.from(map.values()).sort((a, b) => b.sigma - a.sigma);
  }, [records]);

  const counts = useMemo(() => {
    const c = { world_class: 0, excellent: 0, good: 0, marginal: 0, poor: 0 };
    latest.forEach((r) => { c[tierForSigma(r.sigma).key] += 1; });
    return c;
  }, [latest]);

  const total = latest.length;
  const worldPct = total ? Math.round((counts.world_class / total) * 100) : 0;
  const actionCount = counts.marginal + counts.poor;

  const exportCSV = () => {
    if (!records.length) return toast.error("No records to export");
    const headers = ["Analyte", "Category", "Matrix", "Instrument", "Lot", "Date", "TEa%", "CV%", "Bias%", "Sigma", "QGI", "Westgard Rules", "Performance"];
    const rows = records.map((r) => {
      const tier = tierForSigma(r.sigma);
      const rec = westgardRecommendation(r.sigma);
      return [r.analyte, r.category, r.matrix, r.instrument, r.lot || "", fmtDate(r.measured_at),
        r.tea, r.cv, r.bias, r.sigma, r.qgi, rec.rulesPlain, tier.label];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sigmalab-qc-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const printPDF = () => window.print();

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h3 className="font-display font-semibold text-lg text-slate-900">Quality Report Generator</h3>
          <p className="text-sm text-slate-500">Executive summary of the latest QC performance per method.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} data-testid="export-csv-button">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={printPDF} data-testid="export-pdf-button">
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
        </div>
      </div>

      <div id="print-area">
        <div className="hidden print:block mb-6">
          <h1 className="font-display text-2xl font-bold text-slate-900">SigmaLab QC — Analytical Quality Report</h1>
          <p className="text-sm text-slate-500">Generated {new Date().toLocaleString("en-GB")}</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Methods evaluated" value={total} sub="latest QC per method" />
          <Kpi label="World Class (≥6σ)" value={`${worldPct}%`} sub={`${counts.world_class} methods`} accent="#059669" />
          <Kpi label="Needs action (<4σ)" value={actionCount} sub="marginal + unacceptable" accent={actionCount ? "#dc2626" : "#059669"} />
          <Kpi label="Total records" value={records.length} sub="all history points" />
        </div>

        {/* Distribution */}
        <Card className="p-6 shadow-sm mb-6">
          <h4 className="font-display font-semibold text-slate-900 mb-4">Performance Distribution</h4>
          <div className="space-y-3">
            {Object.values(TIERS).map((t) => {
              const n = counts[t.key];
              const pct = total ? Math.round((n / total) * 100) : 0;
              return (
                <div key={t.key} className="flex items-center gap-3">
                  <div className="w-36 text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.hex }} />
                    {t.label}
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: t.hex }} />
                  </div>
                  <div className="w-20 text-right font-mono-num text-sm text-slate-700">{n} · {pct}%</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Table */}
        <Card className="p-0 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200"><h4 className="font-display font-semibold text-slate-900">Method Summary (latest QC)</h4></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                  <th className="px-4 py-3">Analyte</th>
                  <th className="px-3 py-3">Instrument</th>
                  <th className="px-3 py-3 text-right">CV%</th>
                  <th className="px-3 py-3 text-right">Bias%</th>
                  <th className="px-3 py-3 text-right">Sigma</th>
                  <th className="px-4 py-3">Recommended Rules</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((r) => {
                  const tier = tierForSigma(r.sigma);
                  const rec = westgardRecommendation(r.sigma);
                  return (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{r.analyte}</td>
                      <td className="px-3 py-2.5 text-slate-600">{r.instrument}</td>
                      <td className="px-3 py-2.5 text-right font-mono-num">{r.cv}</td>
                      <td className="px-3 py-2.5 text-right font-mono-num">{r.bias}</td>
                      <td className="px-3 py-2.5 text-right font-mono-num font-semibold" style={{ color: tier.hex }}>{r.sigma.toFixed(2)}σ</td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono-num text-xs">{rec.rulesPlain}</td>
                    </tr>
                  );
                })}
                {latest.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No records available.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

const Kpi = ({ label, value, sub, accent }) => (
  <Card className="p-5 shadow-sm">
    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
    <div className="font-mono-num text-3xl font-bold mt-1" style={{ color: accent || "#0f172a" }}>{value}</div>
    <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
  </Card>
);
