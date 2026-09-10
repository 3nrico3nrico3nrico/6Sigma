import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { INSTRUMENTS } from "@/lib/sigma";
import { updateRecord } from "@/lib/api";

const LABEL = "text-xs font-semibold text-slate-500 uppercase";

export const EditRecordDialog = ({ record, onClose, onSaved }) => {
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
            <Label className={LABEL}>Analyte</Label>
            <Input className="mt-1" value={form.analyte} onChange={set("analyte")} data-testid="edit-analyte-input" />
          </div>
          <div>
            <Label className={LABEL}>Instrument</Label>
            <Select value={form.instrument} onValueChange={set("instrument")}>
              <SelectTrigger className="mt-1" data-testid="edit-instrument-input"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">{INSTRUMENTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="TEa %" value={form.tea} onChange={set("tea")} testid="edit-tea-input" />
            <NumField label="CV %" value={form.cv} onChange={set("cv")} testid="edit-cv-input" />
            <NumField label="Bias %" value={form.bias} onChange={set("bias")} testid="edit-bias-input" />
          </div>
          <div><Label className={LABEL}>Reagent Lot</Label>
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

const NumField = ({ label, value, onChange, testid }) => (
  <div>
    <Label className={LABEL}>{label}</Label>
    <Input className="mt-1 font-mono-num" type="number" step="0.01" value={value} onChange={onChange} data-testid={testid} />
  </div>
);
