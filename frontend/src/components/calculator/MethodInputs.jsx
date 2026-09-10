import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Save, Calculator as CalcIcon, Star } from "lucide-react";
import { INSTRUMENTS } from "@/lib/sigma";

const LABEL = "text-xs font-semibold text-slate-500 uppercase tracking-wide";

export const MethodInputs = ({ analytes, favourites, form, set, selectedSlug, onSelectAnalyte, onSave, saving }) => {
  const { isFav } = favourites;
  const sortedAnalytes = useMemo(() => analytes
    .map((a, i) => [a, i])
    .sort((x, y) => (Number(isFav(y[0].name)) - Number(isFav(x[0].name))) || (x[1] - y[1]))
    .map((p) => p[0]), [analytes, isFav]);

  return (
    <Card className="lg:col-span-5 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <CalcIcon className="w-5 h-5 text-sky-600" />
        <h3 className="font-display font-semibold text-lg text-slate-900">Method Inputs</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label className={LABEL}>Analyte (autofill TEa from database)</Label>
          <Select value={selectedSlug ?? ""} onValueChange={onSelectAnalyte}>
            <SelectTrigger className="mt-1.5" data-testid="calculator-analyte-select">
              <SelectValue placeholder="Select from Biological Variation DB…" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {sortedAnalytes.map((a) => (
                <SelectItem key={a.slug} value={a.slug}>
                  <span className="inline-flex items-center gap-1.5">
                    {isFav(a.name) && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                    {a.name}
                    <span className="text-slate-400 ml-1">· {a.matrix} · TEa {a.tea != null ? a.tea : "—"}%</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className={LABEL}>Analyte name (or type custom)</Label>
          <Input className="mt-1.5" value={form.analyte} onChange={set("analyte")}
            placeholder="e.g. Glucose" data-testid="calculator-analyte-name-input" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <NumField label="TEa %" value={form.tea} onChange={set("tea")} placeholder="e.g. 6.96" testid="calculator-tea-input" />
          <NumField label="CV %" value={form.cv} onChange={set("cv")} placeholder="e.g. 1.40" testid="calculator-cv-input" />
          <NumField label="Bias %" value={form.bias} onChange={set("bias")} placeholder="e.g. 1.10" testid="calculator-bias-input" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className={LABEL}>Instrument</Label>
            <Select value={form.instrument} onValueChange={set("instrument")}>
              <SelectTrigger className="mt-1.5" data-testid="calculator-instrument-input"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {INSTRUMENTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={LABEL}>Reagent Lot</Label>
            <Input className="mt-1.5 font-mono-num" value={form.lot} onChange={set("lot")}
              placeholder="LOT-2401" data-testid="calculator-lot-input" />
          </div>
        </div>

        <div>
          <Label className={LABEL}>Notes</Label>
          <Textarea className="mt-1.5" rows={2} value={form.notes} onChange={set("notes")}
            placeholder="Optional QC comment…" data-testid="calculator-notes-input" />
        </div>

        <Button onClick={onSave} disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800"
          data-testid="calculator-save-record-button">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving…" : "Save to Lab Records"}
        </Button>
      </div>
    </Card>
  );
};

const NumField = ({ label, value, onChange, placeholder, testid }) => (
  <div>
    <Label className={LABEL}>{label}</Label>
    <Input className="mt-1.5 font-mono-num" type="number" step="0.01" value={value}
      onChange={onChange} placeholder={placeholder} data-testid={testid} />
  </div>
);
