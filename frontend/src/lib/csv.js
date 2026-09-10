import { tierForSigma, westgardRecommendation } from "@/lib/sigma";

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

const HEADERS = ["Analyte", "Category", "Matrix", "Instrument", "Lot", "Date", "TEa%", "CV%", "Bias%", "Sigma", "QGI", "Westgard Rules", "Performance"];

export function recordsToCsv(records) {
  const rows = records.map((r) => [
    r.analyte, r.category, r.matrix, r.instrument, r.lot || "", fmtDate(r.measured_at),
    r.tea, r.cv, r.bias, r.sigma, r.qgi, westgardRecommendation(r.sigma).rulesPlain, tierForSigma(r.sigma).label,
  ]);
  return [HEADERS, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadCsv(records, prefix = "sigmalab-qc-report") {
  const blob = new Blob([recordsToCsv(records)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
