import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, Calculator as CalcIcon, Activity, Gauge as GaugeIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { SigmaGauge } from "@/components/SigmaGauge";
import {
  computeSigma, computeQGI, tierForSigma, westgardRecommendation,
  qgiInterpretation, INSTRUMENTS,
} from "@/lib/sigma";
import { createRecord } from "@/lib/api";

const emptyForm = {
  analyte: "", category: "Custom", matrix: "Serum",
  tea: "", cv: "", bias: "", instrument: "Roche Cobas c502", lot: "", notes: "",
};

export const SigmaCalculator = ({ analytes, prefill, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefill) setForm((f) => ({ ...f, ...prefill }));
  }, [prefill]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const onSelectAnalyte = (name) => {
    const a = analytes.find((x) => x.name === name);
    if (a) {
      setForm((f) => ({
        ...f, analyte: a.name, category: a.category, matrix: a.matrix, tea: String(a.tea),
      }));
    }
  };

  const tea = parseFloat(form.tea) || 0;
  const cv = parseFloat(form.cv) || 0;
  const bias = parseFloat(form.bias) || 0;
  const hasInput = tea > 0 && cv > 0;

  const sigma = useMemo(() => (hasInput ? computeSigma(tea, cv, bias) : 0), [tea, cv, bias, hasInput]);
  const qgi = useMemo(() => (hasInput ? computeQGI(cv, bias) : 0), [cv, bias, hasInput]);
  const tier = tierForSigma(sigma);
  const rec = westgardRecommendation(sigma);
  const qgiNote = qgiInterpretation(sigma, qgi);

  const save = async () => {
    if (!form.analyte.trim()) return toast.error("Enter an analyte name");
    if (!hasInput) return toast.error("Enter TEa and CV (> 0)");
    setSaving(true);
    try {
      await createRecord({
        analyte: form.analyte.trim(), category: form.category, matrix: form.matrix,
        instrument: form.instrument, lot: form.lot, notes: form.notes,
        tea, cv, bias, measured_at: new Date().toISOString(),
      });
      toast.success(`Saved ${form.analyte} — ${sigma.toFixed(2)}σ`);
      onSaved && onSaved();
    } catch (e) {
      toast.error("Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Inputs */}
      <Card className="lg:col-span-5 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <CalcIcon className="w-5 h-5 text-sky-600" />
          <h3 className="font-display font-semibold text-lg text-slate-900">Method Inputs</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Analyte (autofill TEa from database)</Label>
            <Select value={analytes.some((a) => a.name === form.analyte) ? form.analyte : undefined} onValueChange={onSelectAnalyte}>
              <SelectTrigger className="mt-1.5" data-testid="calculator-analyte-select">
                <SelectValue placeholder="Select from Biological Variation DB…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {analytes.map((a) => (
                  <SelectItem key={a.slug} value={a.name}>
                    {a.name} <span className="text-slate-400">· TEa {a.tea}%</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Analyte name (or type custom)</Label>
            <Input className="mt-1.5" value={form.analyte} onChange={set("analyte")}
              placeholder="e.g. Glucose" data-testid="calculator-analyte-name-input" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">TEa %</Label>
              <Input className="mt-1.5 font-mono-num" type="number" step="0.01" value={form.tea}
                onChange={set("tea")} placeholder="e.g. 6.96" data-testid="calculator-tea-input" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CV %</Label>
              <Input className="mt-1.5 font-mono-num" type="number" step="0.01" value={form.cv}
                onChange={set("cv")} placeholder="e.g. 1.40" data-testid="calculator-cv-input" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bias %</Label>
              <Input className="mt-1.5 font-mono-num" type="number" step="0.01" value={form.bias}
                onChange={set("bias")} placeholder="e.g. 1.10" data-testid="calculator-bias-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Instrument</Label>
              <Select value={form.instrument} onValueChange={set("instrument")}>
                <SelectTrigger className="mt-1.5" data-testid="calculator-instrument-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {INSTRUMENTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reagent Lot</Label>
              <Input className="mt-1.5 font-mono-num" value={form.lot} onChange={set("lot")}
                placeholder="LOT-2401" data-testid="calculator-lot-input" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</Label>
            <Textarea className="mt-1.5" rows={2} value={form.notes} onChange={set("notes")}
              placeholder="Optional QC comment…" data-testid="calculator-notes-input" />
          </div>

          <Button onClick={save} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800"
            data-testid="calculator-save-record-button">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving…" : "Save to Lab Records"}
          </Button>
        </div>
      </Card>

      {/* Results */}
      <div className="lg:col-span-7 space-y-6">
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
                <p className={`text-xs font-medium ${qgiNote.tone === "ok" ? "text-emerald-600" : "text-amber-600"}`}>
                  <Activity className="w-3.5 h-3.5 inline mr-1" />
                  {qgiNote.label}
                </p>
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
      </div>
    </div>
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
