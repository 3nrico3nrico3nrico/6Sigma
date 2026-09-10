import React from "react";
import { Card } from "@/components/ui/card";
import { Activity, Gauge as GaugeIcon, ShieldCheck } from "lucide-react";
import { SigmaGauge } from "@/components/SigmaGauge";

export const SigmaResults = ({ result }) => {
  const { hasInput, sigma, qgi, tier, rec, note } = result;
  return (
    <>
      <Card className="p-6 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <GaugeIcon className="w-5 h-5 text-sky-600" />
          <h3 className="font-display font-semibold text-lg text-slate-900">Sigma Metric</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <SigmaGauge sigma={sigma} />
          <div className="space-y-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${tier.badge}`}
              data-testid="result-sigma-badge">
              <span className={`w-2 h-2 rounded-full ${tier.dot}`} />
              {tier.label} · {tier.short}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Sigma = (TEa − |Bias|) / CV" value={hasInput ? sigma.toFixed(2) : "—"} />
              <Metric label="QGI = |Bias| / (1.5·CV)" value={hasInput ? qgi.toFixed(2) : "—"} testid="result-qgi-value" />
            </div>
            {hasInput && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${note.tone === "ok" ? tier.badge : "bg-amber-50 text-amber-800 border-amber-200"}`}
                data-testid="result-performance-note">
                <Activity className="w-3.5 h-3.5" />
                {note.label}
              </span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 shadow-sm" style={{ borderLeft: `4px solid ${tier.hex}` }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5" style={{ color: tier.hex }} />
          <h3 className="font-display font-semibold text-lg text-slate-900">Recommended Westgard QC Rules</h3>
        </div>
        <div className="font-mono-num text-2xl font-bold text-slate-900 mb-1" data-testid="result-westgard-rule">
          {hasInput ? rec.rules : "—"}
        </div>
        <p className="text-sm text-slate-600 mb-4">{hasInput ? rec.summary : "Enter TEa and CV to generate a QC design recommendation."}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Qc label="Controls (N)" value={hasInput ? rec.n : "—"} />
          <Qc label="Runs / day" value={hasInput ? rec.runs : "—"} />
          <Qc label="P(error det.)" value={hasInput ? rec.ped : "—"} />
          <Qc label="P(false rej.)" value={hasInput ? rec.pfr : "—"} />
        </div>
      </Card>
    </>
  );
};

const Metric = ({ label, value, testid }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</div>
    <div className="font-mono-num text-2xl font-bold text-slate-900 mt-1" data-testid={testid}>{value}</div>
  </div>
);

const Qc = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 p-3 text-center">
    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
    <div className="font-mono-num text-lg font-bold text-slate-900 mt-0.5">{value}</div>
  </div>
);
