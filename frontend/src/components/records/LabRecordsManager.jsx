import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Pencil, Trash2, FlaskConical, History, Filter, Layers, AlertTriangle, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { tierForSigma, INSTRUMENTS, TREND_PALETTE } from "@/lib/sigma";
import { sigmaAlerts } from "@/lib/compare";
import { updateRecord, deleteRecord } from "@/lib/api";

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

export const LabRecordsManager = ({ records, onChanged }) => {
  const [instrument, setInstrument] = useState("all");
  const [analyte, setAnalyte] = useState("all");
  const [editing, setEditing] = useState(null);

  const instruments = useMemo(() => ["all", ...Array.from(new Set(records.map((r) => r.instrument)))], [records]);
  const analytes = useMemo(() => ["all", ...Array.from(new Set(records.map((r) => r.analyte)))], [records]);

  const filtered = useMemo(() => {
    return records
      .filter((r) => (instrument === "all" || r.instrument === instrument) && (analyte === "all" || r.analyte === analyte))
      .slice()
      .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at));
  }, [records, instrument, analyte]);

  const trend = useMemo(() => {
    return filtered
      .slice()
      .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))
      .map((r) => ({ date: fmtDate(r.measured_at), sigma: r.sigma, analyte: r.analyte }));
  }, [filtered]);

  // Lab-wide combined trend: one line per analyte, pivoted by month, across ALL records.
  const combined = useMemo(() => {
    const monthKey = (iso) => {
      const d = new Date(iso);
      return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    };
    const names = Array.from(new Set(records.map((r) => r.analyte)));
    const map = {};
    records
      .slice()
      .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))
      .forEach((r) => {
        const key = monthKey(r.measured_at);
        if (!map[key]) map[key] = { month: key, _sort: new Date(r.measured_at).getTime() };
        map[key][r.analyte] = r.sigma;
      });
    const rows = Object.values(map).sort((a, b) => a._sort - b._sort);
    return { rows, names };
  }, [records]);

  const remove = async (id) => {
    try { await deleteRecord(id); toast.success("Record deleted"); onChanged && onChanged(); }
    catch { toast.error("Delete failed"); }
  };

  const alerts = useMemo(() => sigmaAlerts(records), [records]);
  const alertById = useMemo(() => new Map(alerts.map((a) => [a.id, a])), [alerts]);

  return (
    <div className="space-y-6">
      {alerts.length > 0 && <AlertsCard alerts={alerts} onPick={(a) => { setInstrument(a.instrument); setAnalyte(a.analyte); }} />}
      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-sky-600" />
          <h3 className="font-display font-semibold text-slate-900">Filter Records</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Instrument</Label>
            <Select value={instrument} onValueChange={setInstrument}>
              <SelectTrigger className="mt-1.5" data-testid="records-instrument-filter"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {instruments.map((i) => <SelectItem key={i} value={i}>{i === "all" ? "All instruments" : i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Analyte</Label>
            <Select value={analyte} onValueChange={setAnalyte}>
              <SelectTrigger className="mt-1.5" data-testid="records-analyte-filter"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {analytes.map((a) => <SelectItem key={a} value={a}>{a === "all" ? "All analytes" : a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {combined.rows.length > 1 && combined.names.length > 0 && (
        <Card className="p-6 shadow-sm" data-testid="combined-trend-card">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-sky-600" />
            <h3 className="font-display font-semibold text-lg text-slate-900">Lab-wide Sigma Trend</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Every analyte's sigma over time on one chart — spot lab-wide drift at a glance.</p>
          <div className="w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combined.rows} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} stroke="#cbd5e1" />
                <YAxis domain={[0, 8]} tick={{ fontSize: 11, fill: "#64748b" }} stroke="#cbd5e1" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={3} stroke="#dc2626" strokeDasharray="4 4" />
                <ReferenceLine y={6} stroke="#059669" strokeDasharray="4 4" />
                {combined.names.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name}
                    stroke={TREND_PALETTE[i % TREND_PALETTE.length]} strokeWidth={2}
                    dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {trend.length > 1 && (
        <Card className="p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-sky-600" />
            <h3 className="font-display font-semibold text-lg text-slate-900">Sigma Trend Over Time</h3>
          </div>
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} stroke="#cbd5e1" />
                <YAxis domain={[0, 8]} tick={{ fontSize: 11, fill: "#64748b" }} stroke="#cbd5e1" />
                <Tooltip />
                <ReferenceLine y={6} stroke="#059669" strokeDasharray="4 4" label={{ value: "6σ", fontSize: 10, fill: "#059669" }} />
                <ReferenceLine y={3} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "3σ", fontSize: 10, fill: "#dc2626" }} />
                <Line type="monotone" dataKey="sigma" stroke="#0284c7" strokeWidth={2.5}
                  dot={{ r: 4, fill: "#0284c7" }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-sky-600" />
          <h3 className="font-display font-semibold text-lg text-slate-900">Lab Records</h3>
          <Badge variant="secondary" className="ml-1 font-mono-num">{filtered.length}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="px-5 py-3 font-semibold">Analyte</th>
                <th className="px-3 py-3 font-semibold">Instrument</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold text-right">TEa</th>
                <th className="px-3 py-3 font-semibold text-right">CV</th>
                <th className="px-3 py-3 font-semibold text-right">Bias</th>
                <th className="px-3 py-3 font-semibold text-right">Sigma</th>
                <th className="px-5 py-3 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const tier = tierForSigma(r.sigma);
                const alert = alertById.get(r.id);
                return (
                  <tr key={r.id} className={`border-b border-slate-100 hover:bg-slate-50/60 ${alert ? (alert.kind === "dropped" ? "bg-rose-50/60 border-l-4 border-l-rose-500" : "bg-amber-50/50 border-l-4 border-l-amber-400") : ""}`}
                    data-testid={`lab-record-item-${r.id}`} data-alert={alert ? alert.kind : undefined}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900 flex items-center gap-1.5 flex-wrap">
                        {alert && <AlertTriangle className={`w-3.5 h-3.5 ${alert.kind === "dropped" ? "text-rose-600" : "text-amber-500"}`} data-testid={`lab-record-alert-icon-${r.id}`} />}
                        {r.analyte}
                        {r.matrix && <Badge variant="outline" className="font-normal text-[10px] px-1.5 py-0 text-slate-500" data-testid={`record-matrix-badge-${r.id}`}>{r.matrix}</Badge>}
                      </div>
                      <div className="text-[11px] text-slate-400">Lot {r.lot || "—"}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{r.instrument}</td>
                    <td className="px-3 py-3 text-slate-600 font-mono-num">{fmtDate(r.measured_at)}</td>
                    <td className="px-3 py-3 text-right font-mono-num text-slate-700">{r.tea}</td>
                    <td className="px-3 py-3 text-right font-mono-num text-slate-700">{r.cv}</td>
                    <td className="px-3 py-3 text-right font-mono-num text-slate-700">{r.bias}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${tier.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
                        {r.sigma.toFixed(2)}σ
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(r)}
                        data-testid={`lab-record-edit-${r.id}`}>
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`lab-record-delete-${r.id}`}>
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
                            <AlertDialogDescription>{r.analyte} on {r.instrument} ({fmtDate(r.measured_at)}) will be permanently removed.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => remove(r.id)}
                              data-testid={`lab-record-confirm-delete-${r.id}`}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No records. Add one from the Calculator tab.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <EditDialog record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged && onChanged(); }} />
      )}
    </div>
  );
};

const AlertsCard = ({ alerts, onPick }) => {
  const dropped = alerts.filter((a) => a.kind === "dropped").length;
  return (
    <Card className="p-5 shadow-sm border-l-4 border-l-rose-500" data-testid="sigma-alerts-card">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-5 h-5 text-rose-600" />
        <h3 className="font-display font-semibold text-lg text-slate-900">Sigma Alerts</h3>
        <Badge className="ml-1 bg-rose-600 hover:bg-rose-600 font-mono-num" data-testid="sigma-alerts-count">{alerts.length}</Badge>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Methods whose latest QC is below the 3σ floor — {dropped} just dropped below the threshold, {alerts.length - dropped} persistently low. Click one to filter the records.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {alerts.map((a) => {
          const isDrop = a.kind === "dropped";
          return (
            <button key={a.id} onClick={() => onPick(a)} data-testid={`sigma-alert-${a.id}`}
              className={`text-left rounded-lg border p-3 transition-colors hover:shadow-sm ${isDrop ? "bg-rose-50 border-rose-200 hover:border-rose-400" : "bg-amber-50 border-amber-200 hover:border-amber-400"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900 text-sm">{a.analyte}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${isDrop ? "text-rose-700" : "text-amber-700"}`}>
                  {isDrop ? <TrendingDown className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {isDrop ? "Dropped below 3σ" : "Below 3σ"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{a.instrument} · {fmtDate(a.date)}</div>
              <div className="font-mono-num text-sm mt-1.5">
                {a.prevSigma != null && <span className="text-slate-500">{a.prevSigma.toFixed(2)}σ → </span>}
                <span className={`font-semibold ${isDrop ? "text-rose-700" : "text-amber-800"}`}>{a.sigma.toFixed(2)}σ</span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};

const EditDialog = ({ record, onClose, onSaved }) => {
  const [form, setForm] = useState({
    ...record, tea: String(record.tea), cv: String(record.cv), bias: String(record.bias),
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const save = async () => {
    setSaving(true);
    try {
      await updateRecord(record.id, {
        analyte: form.analyte, category: form.category, matrix: form.matrix,
        instrument: form.instrument, lot: form.lot, notes: form.notes,
        tea: parseFloat(form.tea) || 0, cv: parseFloat(form.cv) || 0, bias: parseFloat(form.bias) || 0,
        measured_at: record.measured_at,
      });
      toast.success("Record updated");
      onSaved();
    } catch { toast.error("Update failed"); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="record-edit-dialog">
        <DialogHeader><DialogTitle className="font-display">Edit Record — {record.analyte}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase">Analyte</Label>
            <Input className="mt-1" value={form.analyte} onChange={set("analyte")} data-testid="edit-analyte-input" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase">Instrument</Label>
            <Select value={form.instrument} onValueChange={set("instrument")}>
              <SelectTrigger className="mt-1" data-testid="edit-instrument-input"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">{INSTRUMENTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs font-semibold text-slate-500 uppercase">TEa %</Label>
              <Input className="mt-1 font-mono-num" type="number" step="0.01" value={form.tea} onChange={set("tea")} data-testid="edit-tea-input" /></div>
            <div><Label className="text-xs font-semibold text-slate-500 uppercase">CV %</Label>
              <Input className="mt-1 font-mono-num" type="number" step="0.01" value={form.cv} onChange={set("cv")} data-testid="edit-cv-input" /></div>
            <div><Label className="text-xs font-semibold text-slate-500 uppercase">Bias %</Label>
              <Input className="mt-1 font-mono-num" type="number" step="0.01" value={form.bias} onChange={set("bias")} data-testid="edit-bias-input" /></div>
          </div>
          <div><Label className="text-xs font-semibold text-slate-500 uppercase">Reagent Lot</Label>
            <Input className="mt-1 font-mono-num" value={form.lot || ""} onChange={set("lot")} data-testid="edit-lot-input" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={save} disabled={saving} data-testid="edit-save-button">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
