import React from "react";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

export const PeerBenchmark = ({ peer, sigma, hasInput, tierHex }) => {
  const { value, delta, analyte } = peer;
  const up = delta != null && delta >= 0;
  return (
    <Card className="p-6 shadow-sm" data-testid="peer-benchmark-card">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-sky-600" />
        <h3 className="font-display font-semibold text-lg text-slate-900">Peer-Group Benchmark</h3>
      </div>
      {value == null ? (
        <p className="text-sm text-slate-500">
          Select a database analyte to compare against the typical peer-group sigma for that measurand.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 items-center">
          <Box label="Your Sigma" testid="peer-your-sigma" style={{ color: tierHex }}>{hasInput ? sigma.toFixed(2) : "—"}</Box>
          <Box label="Peer Median" testid="peer-median-sigma" className="text-slate-700">{value.toFixed(1)}</Box>
          <Box label="vs Peers" testid="peer-delta" className={up ? "text-emerald-600" : "text-rose-600"}
            boxStyle={{ borderColor: up ? "#a7f3d0" : "#fecaca", background: up ? "#ecfdf5" : "#fef2f2" }}>
            {delta == null ? "—" : `${up ? "+" : ""}${delta.toFixed(2)}σ`}
          </Box>
        </div>
      )}
      {value != null && hasInput && (
        <p className={`text-xs font-medium mt-3 ${up ? "text-emerald-600" : "text-rose-600"}`}>
          {up
            ? `Outperforming the typical peer group for ${analyte.name} by ${delta.toFixed(2)} sigma.`
            : `Below the typical peer group for ${analyte.name} by ${Math.abs(delta).toFixed(2)} sigma — review method.`}
        </p>
      )}
      <p className="text-[11px] text-slate-400 mt-2">Peer benchmark is an illustrative typical-performance estimate, not live survey data.</p>
    </Card>
  );
};

const Box = ({ label, testid, className = "", style, boxStyle, children }) => (
  <div className="rounded-lg border border-slate-200 p-3 text-center" style={boxStyle}>
    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
    <div className={`font-mono-num text-2xl font-bold ${className}`} style={style} data-testid={testid}>{children}</div>
  </div>
);
