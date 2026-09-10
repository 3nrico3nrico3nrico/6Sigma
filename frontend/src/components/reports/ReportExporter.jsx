import React, { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Printer, FileSpreadsheet, Settings, Building2, Upload, Hexagon } from "lucide-react";
import { toast } from "sonner";
import { tierForSigma, TIERS, westgardRecommendation } from "@/lib/sigma";
import { multiInstrumentAnalytes } from "@/lib/compare";
import { Leaderboard } from "@/components/compare/InstrumentCompare";

const PROFILE_KEY = "sigmalab_lab_profile";
const defaultProfile = { name: "", address: "", director: "", accreditation: "", logo: "" };

function loadProfile() {
  try { return { ...defaultProfile, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") }; }
  catch { return { ...defaultProfile }; }
}

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

export const ReportExporter = ({ records }) => {
  const [profile, setProfile] = useState(loadProfile);
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
  const comparisons = useMemo(() => multiInstrumentAnalytes(records), [records]);
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
          <ProfileDialog profile={profile} onSave={setProfile} />
          <Button variant="outline" onClick={exportCSV} data-testid="export-csv-button">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={printPDF} data-testid="export-pdf-button">
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
        </div>
      </div>

      <div id="print-area">
        {/* Branded letterhead */}
        <div className="flex items-start justify-between gap-4 pb-5 mb-6 border-b-2 border-slate-900" data-testid="report-letterhead">
          <div className="flex items-center gap-4">
            {profile.logo ? (
              <img src={profile.logo} alt="Lab logo" className="h-14 w-auto max-w-[160px] object-contain" />
            ) : (
              <div className="relative">
                <Hexagon className="w-12 h-12 text-slate-900" strokeWidth={1.5} />
                <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-slate-900">σ</span>
              </div>
            )}
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900 leading-tight">
                {profile.name || "Your Laboratory Name"}
              </h1>
              {profile.address && <p className="text-xs text-slate-500 whitespace-pre-line leading-snug mt-0.5">{profile.address}</p>}
              {profile.accreditation && <p className="text-[11px] text-slate-400 mt-0.5">{profile.accreditation}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display font-semibold text-slate-900">Analytical Quality Report</div>
            <div className="text-xs text-slate-500">Six Sigma / Westgard QC</div>
            <div className="text-xs text-slate-400 mt-1 font-mono-num">{new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>
          </div>
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

        {comparisons.length > 0 && (
          <div className="mt-6 space-y-4" data-testid="report-instrument-comparison">
            <div>
              <h4 className="font-display font-semibold text-slate-900">Instrument Comparison</h4>
              <p className="text-xs text-slate-500">Analytes measured on two or more instruments, ranked by mean sigma across all records.</p>
            </div>
            {comparisons.map((c) => <Leaderboard key={c.name} analyte={c.name} ranking={c.stats} compact />)}
          </div>
        )}

        {/* Signature / sign-off */}
        <div className="grid grid-cols-2 gap-8 mt-10 pt-2" data-testid="report-signature">
          <div>
            <div className="border-t border-slate-400 pt-1.5 text-xs text-slate-500">Reviewed by (Laboratory Director)</div>
            <div className="text-sm font-medium text-slate-800 mt-1">{profile.director || "________________________"}</div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-1.5 text-xs text-slate-500">Date / Signature</div>
            <div className="text-sm text-slate-400 mt-1">________________________</div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-6">
          Generated by SigmaLab QC · Sigma = (TEa − |Bias|) / CV · Desirable/optimal/minimum specifications are illustrative — verify against the current EFLM Biological Variation Database for regulated use.
        </p>
      </div>
    </div>
  );
};

const ProfileDialog = ({ profile, onSave }) => {
  const [draft, setDraft] = useState(profile);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) setDraft(profile); }, [open, profile]);
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const onLogo = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return toast.error("Logo must be under 1 MB");
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(draft));
    onSave(draft);
    setOpen(false);
    toast.success("Report branding saved");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="report-settings-button">
          <Settings className="w-4 h-4 mr-2" /> Branding
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" data-testid="report-settings-dialog">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2"><Building2 className="w-5 h-5 text-sky-600" /> Report Branding</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase">Laboratory Name</Label>
            <Input className="mt-1" value={draft.name} onChange={set("name")} placeholder="e.g. Central Hospital Clinical Chemistry Lab" data-testid="brand-name-input" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase">Address</Label>
            <Textarea className="mt-1" rows={2} value={draft.address} onChange={set("address")} placeholder="Street, City, Postcode" data-testid="brand-address-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">Director / Sign-off</Label>
              <Input className="mt-1" value={draft.director} onChange={set("director")} placeholder="Dr. Jane Doe" data-testid="brand-director-input" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">Accreditation</Label>
              <Input className="mt-1" value={draft.accreditation} onChange={set("accreditation")} placeholder="ISO 15189:2022" data-testid="brand-accreditation-input" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase">Logo</Label>
            <div className="mt-1 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 text-sm cursor-pointer hover:border-slate-400">
                <Upload className="w-4 h-4" /> Upload
                <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="brand-logo-input" />
              </label>
              {draft.logo && <img src={draft.logo} alt="preview" className="h-10 w-auto max-w-[120px] object-contain border border-slate-200 rounded p-1" />}
              {draft.logo && (
                <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => setDraft((d) => ({ ...d, logo: "" }))}>Remove</Button>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={save} data-testid="brand-save-button">Save branding</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Kpi = ({ label, value, sub, accent }) => (
  <Card className="p-5 shadow-sm">
    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
    <div className="font-mono-num text-3xl font-bold mt-1" style={{ color: accent || "#0f172a" }}>{value}</div>
    <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
  </Card>
);
