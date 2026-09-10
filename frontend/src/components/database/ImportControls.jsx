import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Info, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importAnalytes, clearCustomAnalytes } from "@/lib/api";

export const InfoDialog = () => (
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
          <Formula>Desirable Imprecision (I) = 0.50 × CVI</Formula>
          <Formula>Desirable Bias (B) = 0.25 × √(CVI² + CVG²)</Formula>
          <Formula>Desirable TEa = 1.65 × I + B</Formula>
        </ul>
        <p className="text-xs text-slate-500">Values are illustrative desirable-level specifications. Verify against the current EFLM Biological Variation Database for regulated use.</p>
      </div>
    </DialogContent>
  </Dialog>
);

const Formula = ({ children }) => (
  <li className="rounded-lg bg-slate-50 border border-slate-200 p-3">
    <span className="font-mono-num font-semibold text-slate-900">{children}</span>
  </li>
);

export const ImportControls = ({ onImported }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn, okMsg, errMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(okMsg(res));
      onImported && onImported();
      return true;
    } catch {
      toast.error(errMsg);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const doImport = async () => {
    if (!file) return toast.error("Choose a file first");
    const ok = await run(() => importAnalytes(file), (r) => `Imported ${r.imported} analytes`, "Import failed — check the file format");
    if (ok) { setFile(null); setOpen(false); }
  };

  const doClear = () => run(clearCustomAnalytes, (r) => `Removed ${r.deleted} imported analytes`, "Could not clear imported analytes");

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
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={doImport} disabled={busy || !file} data-testid="bv-import-submit-button">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</> : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
