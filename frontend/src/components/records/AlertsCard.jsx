import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { fmtDate } from "./RecordRow";

export const AlertsCard = ({ alerts, onPick }) => {
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
        {alerts.map((a) => <AlertItem key={a.id} a={a} onPick={onPick} />)}
      </div>
    </Card>
  );
};

const AlertItem = ({ a, onPick }) => {
  const isDrop = a.kind === "dropped";
  return (
    <button onClick={() => onPick(a)} data-testid={`sigma-alert-${a.id}`}
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
};
