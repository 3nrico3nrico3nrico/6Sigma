import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FlaskConical, Filter, History } from "lucide-react";
import { toast } from "sonner";
import { sigmaAlerts } from "@/lib/compare";
import { deleteRecord } from "@/lib/api";
import { RecordRow } from "./RecordRow";
import { AlertsCard } from "./AlertsCard";
import { EditRecordDialog } from "./EditRecordDialog";
import { CombinedTrendChart, SigmaTrendChart } from "./RecordCharts";
import { ClearRecordsDialog, ReloadDemoButton } from "./ClearRecordsDialog";

const byDateAsc = (a, b) => new Date(a.measured_at) - new Date(b.measured_at);
const monthKey = (iso) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

// Pivot all records by month with one column per analyte (lab-wide trend).
function combinedTrend(records) {
  const names = Array.from(new Set(records.map((r) => r.analyte)));
  const map = {};
  records.slice().sort(byDateAsc).forEach((r) => {
    const key = monthKey(r.measured_at);
    if (!map[key]) map[key] = { month: key, _sort: new Date(r.measured_at).getTime() };
    map[key][r.analyte] = r.sigma;
  });
  return { rows: Object.values(map).sort((a, b) => a._sort - b._sort), names };
}

export const LabRecordsManager = ({ records, onChanged }) => {
  const [instrument, setInstrument] = useState("all");
  const [analyte, setAnalyte] = useState("all");
  const [editing, setEditing] = useState(null);

  const instruments = useMemo(() => ["all", ...new Set(records.map((r) => r.instrument))], [records]);
  const analytes = useMemo(() => ["all", ...new Set(records.map((r) => r.analyte))], [records]);

  const filtered = useMemo(() => records
    .filter((r) => (instrument === "all" || r.instrument === instrument) && (analyte === "all" || r.analyte === analyte))
    .sort((a, b) => byDateAsc(b, a)), [records, instrument, analyte]);

  const trendSeries = useMemo(() => {
    if (analyte === "all") return [];
    const byInst = {};
    filtered.forEach((r) => { (byInst[r.instrument] ||= []).push(r); });
    return Object.entries(byInst).map(([inst, rows]) => ({ inst, rows: rows.slice().sort(byDateAsc) }));
  }, [filtered, analyte]);
  const trendPoints = trendSeries.reduce((n, s) => n + s.rows.length, 0);

  const combined = useMemo(() => combinedTrend(records), [records]);
  const alerts = useMemo(() => sigmaAlerts(records), [records]);
  const alertById = useMemo(() => new Map(alerts.map((a) => [a.id, a])), [alerts]);

  const remove = async (id) => {
    try { await deleteRecord(id); toast.success("Record deleted"); onChanged && onChanged(); }
    catch { toast.error("Delete failed"); }
  };

  return (
    <div className="space-y-6">
      {alerts.length > 0 && <AlertsCard alerts={alerts} onPick={(a) => { setInstrument(a.instrument); setAnalyte(a.analyte); }} />}

      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-sky-600" />
          <h3 className="font-display font-semibold text-slate-900">Filter Records</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <FilterSelect label="Instrument" value={instrument} onChange={setInstrument} options={instruments}
            allLabel="All instruments" testid="records-instrument-filter" />
          <FilterSelect label="Analyte" value={analyte} onChange={setAnalyte} options={analytes}
            allLabel="All analytes" testid="records-analyte-filter" />
        </div>
      </Card>

      {combined.rows.length > 1 && combined.names.length > 0 && <CombinedTrendChart rows={combined.rows} names={combined.names} />}
      {trendPoints > 1 && <SigmaTrendChart analyte={analyte} series={trendSeries} />}
      {analyte === "all" && records.length > 1 && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5" data-testid="sigma-trend-hint">
          <History className="w-3.5 h-3.5" /> Pick an analyte above to see its sigma trend over time (one line per instrument).
        </p>
      )}

      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-sky-600" />
          <h3 className="font-display font-semibold text-lg text-slate-900">Lab Records</h3>
          <Badge variant="secondary" className="ml-1 font-mono-num">{filtered.length}</Badge>
          <div className="ml-auto flex items-center gap-2">
            {records.length === 0 && <ReloadDemoButton onChanged={onChanged} />}
            <ClearRecordsDialog filtered={filtered} total={records.length} instrument={instrument} analyte={analyte} onChanged={onChanged} />
          </div>
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
              {filtered.map((r) => <RecordRow key={r.id} r={r} alert={alertById.get(r.id)} onEdit={setEditing} onDelete={remove} />)}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">No records. Add one from the Calculator tab.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <EditRecordDialog record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged && onChanged(); }} />
      )}
    </div>
  );
};

const FilterSelect = ({ label, value, onChange, options, allLabel, testid }) => (
  <div>
    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-1.5" data-testid={testid}><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => <SelectItem key={o} value={o}>{o === "all" ? allLabel : o}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);
