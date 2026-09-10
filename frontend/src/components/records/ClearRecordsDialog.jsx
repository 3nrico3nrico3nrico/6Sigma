import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, FileSpreadsheet, Loader2, DatabaseBackup } from "lucide-react";
import { toast } from "sonner";
import { deleteRecords, reloadDemoRecords } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";

export const ClearRecordsDialog = ({ filtered, total, instrument, analyte, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const scoped = instrument !== "all" || analyte !== "all";
  const scopeLabel = scoped
    ? [instrument !== "all" && instrument, analyte !== "all" && analyte].filter(Boolean).join(" · ")
    : "all instruments and analytes";

  const clear = async () => {
    setBusy(true);
    try {
      const params = {};
      if (instrument !== "all") params.instrument = instrument;
      if (analyte !== "all") params.analyte = analyte;
      const res = await deleteRecords(params);
      toast.success(`Deleted ${res.deleted} record${res.deleted === 1 ? "" : "s"}`);
      setOpen(false);
      onChanged && onChanged();
    } catch {
      toast.error("Could not delete records");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        onClick={() => setOpen(true)} disabled={!filtered.length} data-testid="records-clear-button">
        <Trash2 className="w-4 h-4 mr-2" /> {scoped ? "Clear filtered" : "Clear all"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-testid="records-clear-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Delete {scoped ? "filtered" : "all"} records?</DialogTitle>
            <DialogDescription>
              This permanently removes <strong data-testid="records-clear-count">{filtered.length}</strong> of {total} records ({scopeLabel}). Demo data will not be recreated.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-center justify-between gap-3">
            <span>Keep a copy before deleting.</span>
            <Button size="sm" variant="outline" className="bg-white" onClick={() => downloadCsv(filtered, "sigmalab-records-backup")}
              data-testid="records-clear-export-button">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV first
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} data-testid="records-clear-cancel-button">Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={clear} disabled={busy} data-testid="records-clear-confirm-button">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting…</> : `Delete ${filtered.length} record${filtered.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const ReloadDemoButton = ({ onChanged }) => {
  const [busy, setBusy] = useState(false);
  const reload = async () => {
    setBusy(true);
    try {
      const res = await reloadDemoRecords();
      toast.success(`Demo data loaded — ${res.records} records`);
      onChanged && onChanged();
    } catch {
      toast.error("Could not load demo data");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={reload} disabled={busy} data-testid="records-reload-demo-button">
      <DatabaseBackup className="w-4 h-4 mr-2" /> {busy ? "Loading…" : "Load demo data"}
    </Button>
  );
};
