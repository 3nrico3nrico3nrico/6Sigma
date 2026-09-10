import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";
import { tierForSigma } from "@/lib/sigma";

export const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

const ROW_ALERT = {
  dropped: "bg-rose-50/60 border-l-4 border-l-rose-500",
  persistent: "bg-amber-50/50 border-l-4 border-l-amber-400",
};

export const RecordRow = ({ r, alert, onEdit, onDelete }) => {
  const tier = tierForSigma(r.sigma);
  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50/60 ${alert ? ROW_ALERT[alert.kind] : ""}`}
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
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(r)} data-testid={`lab-record-edit-${r.id}`}>
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
              <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => onDelete(r.id)}
                data-testid={`lab-record-confirm-delete-${r.id}`}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
};
