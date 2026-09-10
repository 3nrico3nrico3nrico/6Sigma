import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Medal } from "lucide-react";
import { tierForSigma } from "@/lib/sigma";

export const fmtShortDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });

const RANK_STYLE = ["bg-amber-100 text-amber-800", "bg-slate-200 text-slate-700", "bg-orange-100 text-orange-800"];

export const Leaderboard = ({ analyte, ranking, compact }) => (
  <Card className="p-0 overflow-hidden shadow-sm" data-testid={`leaderboard-${compact ? analyte : "card"}`}>
    <div className="p-4 border-b border-slate-200 flex items-center gap-2">
      <Medal className="w-4 h-4 text-sky-600" />
      <h3 className="font-display font-semibold text-slate-900">{compact ? analyte : `Instrument Leaderboard — ${analyte}`}</h3>
      <Badge variant="secondary" className="ml-1 font-mono-num">{ranking.length}</Badge>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
            <th className="px-4 py-2.5 font-semibold w-12">#</th>
            <th className="px-3 py-2.5 font-semibold">Instrument</th>
            <th className="px-3 py-2.5 font-semibold text-right">Mean σ</th>
            <th className="px-3 py-2.5 font-semibold text-right">Mean CV%</th>
            <th className="px-3 py-2.5 font-semibold text-right">Mean |Bias|%</th>
            <th className="px-3 py-2.5 font-semibold text-right">Records</th>
            <th className="px-4 py-2.5 font-semibold text-right">Last σ</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((s, i) => <LeaderboardRow key={s.inst} s={s} rank={i + 1} />)}
        </tbody>
      </table>
    </div>
  </Card>
);

const LeaderboardRow = ({ s, rank }) => (
  <tr className="border-b border-slate-100" data-testid={`leaderboard-row-${rank}`}>
    <td className="px-4 py-2.5">
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${RANK_STYLE[rank - 1] || "bg-slate-50 text-slate-500"}`}>{rank}</span>
    </td>
    <td className="px-3 py-2.5 font-medium text-slate-900">{s.inst}</td>
    <td className="px-3 py-2.5 text-right font-mono-num font-semibold" style={{ color: tierForSigma(s.sigma).hex }}>{s.sigma.toFixed(2)}σ</td>
    <td className="px-3 py-2.5 text-right font-mono-num text-slate-700">{s.cv.toFixed(2)}</td>
    <td className="px-3 py-2.5 text-right font-mono-num text-slate-700">{s.bias.toFixed(2)}</td>
    <td className="px-3 py-2.5 text-right font-mono-num text-slate-700">{s.n}</td>
    <td className="px-4 py-2.5 text-right font-mono-num" style={{ color: tierForSigma(s.last).hex }}>
      {s.last.toFixed(2)}σ <span className="text-slate-400 text-xs">({fmtShortDate(s.lastDate)})</span>
    </td>
  </tr>
);
