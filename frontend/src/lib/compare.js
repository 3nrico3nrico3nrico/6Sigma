// Per-instrument statistics for one analyte, ranked by mean sigma (desc).
const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

export function instrumentStats(records, analyte) {
  const byInst = {};
  records.filter((r) => r.analyte === analyte).forEach((r) => { (byInst[r.instrument] ||= []).push(r); });
  return Object.entries(byInst)
    .map(([inst, rows]) => {
      rows.sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
      const last = rows[rows.length - 1];
      return {
        inst, n: rows.length, rows,
        sigma: mean(rows.map((r) => r.sigma)),
        cv: mean(rows.map((r) => r.cv)),
        bias: mean(rows.map((r) => Math.abs(r.bias))),
        last: last.sigma, lastDate: last.measured_at,
      };
    })
    .sort((a, b) => b.sigma - a.sigma);
}

// Analytes measured on 2+ instruments, each with its ranked stats.
export function multiInstrumentAnalytes(records) {
  const names = Array.from(new Set(records.map((r) => r.analyte))).sort();
  return names
    .map((name) => ({ name, stats: instrumentStats(records, name) }))
    .filter((a) => a.stats.length > 1);
}

// Sigma alerts: latest record per analyte+instrument below 3σ.
export function sigmaAlerts(records) {
  const groups = {};
  records.forEach((r) => { (groups[`${r.analyte}__${r.instrument}`] ||= []).push(r); });
  const alerts = [];
  Object.values(groups).forEach((rows) => {
    rows.sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
    const last = rows[rows.length - 1];
    const prev = rows[rows.length - 2];
    if (last.sigma >= 3) return;
    const dropped = !!prev && prev.sigma >= 3;
    alerts.push({
      id: last.id, analyte: last.analyte, instrument: last.instrument, matrix: last.matrix,
      sigma: last.sigma, prevSigma: prev ? prev.sigma : null, date: last.measured_at,
      kind: dropped ? "dropped" : "persistent",
    });
  });
  return alerts.sort((a, b) => (a.kind === b.kind ? a.sigma - b.sigma : a.kind === "dropped" ? -1 : 1));
}
