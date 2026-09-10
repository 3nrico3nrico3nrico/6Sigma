import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, Star } from "lucide-react";
import { tierForSigma } from "@/lib/sigma";

export const AnalyteRow = ({ a, level, isFav, onToggleFav, onUse }) => {
  const teaVal = a.detailed ? a.specs[level].tea : a.tea;
  return (
    <tr className="border-b border-slate-100 hover:bg-sky-50/40 transition-colors" data-testid={`bv-database-row-${a.slug}`}>
      <td className="px-3 py-3 text-center">
        <button onClick={() => onToggleFav(a.name)} title="Star for quick access" data-testid={`bv-fav-toggle-${a.slug}`} className="align-middle">
          <Star className={`w-4 h-4 transition-colors ${isFav ? "fill-amber-400 text-amber-400" : "text-slate-300 hover:text-amber-400"}`} />
        </button>
      </td>
      <td className="px-5 py-3">
        <div className="font-medium text-slate-900 flex items-center gap-1.5 flex-wrap">
          {a.name}
          <Badge variant="outline" className="font-normal text-[10px] px-1.5 py-0 text-slate-500" data-testid={`bv-matrix-badge-${a.slug}`}>{a.matrix}</Badge>
          {a.source && <span className={`text-[10px] font-semibold uppercase ${a.custom ? "text-sky-600" : "text-slate-400"}`}>{a.source}</span>}
        </div>
        <div className="text-[11px] text-slate-400">{a.category}</div>
      </td>
      <td className="px-3 py-3 text-slate-600">
        <Badge variant="secondary" className="font-normal text-[11px]">{a.matrix}</Badge>
      </td>
      <Num>{a.cvi ?? "—"}</Num>
      <Num>{a.cvg ?? "—"}</Num>
      <Num>{a.detailed ? a.specs[level].cv : "—"}</Num>
      <Num>{a.detailed ? a.specs[level].bias : "—"}</Num>
      <td className="px-3 py-3 text-right font-mono-num font-semibold text-slate-900">{teaVal != null ? teaVal : "—"}</td>
      <td className="px-3 py-3 text-right">
        {a.peer_sigma != null ? (
          <span className="inline-flex items-center gap-1 font-mono-num text-xs font-semibold" style={{ color: tierForSigma(a.peer_sigma).hex }}>
            <Users className="w-3 h-3" />{a.peer_sigma.toFixed(1)}
          </span>
        ) : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-5 py-3 text-right">
        <Button size="sm" variant="outline" className="h-8" disabled={teaVal == null} onClick={() => onUse(a, teaVal)}
          data-testid={`bv-database-use-btn-${a.slug}`}>
          Use <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </td>
    </tr>
  );
};

const Num = ({ children }) => <td className="px-3 py-3 text-right font-mono-num text-slate-700">{children}</td>;
