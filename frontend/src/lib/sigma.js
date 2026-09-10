// Six Sigma calculation, performance tiers, and Westgard QC rule engine.

export function computeSigma(tea, cv, bias) {
  const b = Math.abs(Number(bias));
  const c = Number(cv);
  if (!c || c <= 0) return 0;
  return (Number(tea) - b) / c;
}

export function computeQGI(cv, bias) {
  const b = Math.abs(Number(bias));
  const c = Number(cv);
  if (!c || c <= 0) return 0;
  return b / (1.5 * c);
}

// QGI interpretation: <0.8 imprecision problem, 0.8-1.2 both, >1.2 bias problem
export function qgiInterpretation(sigma, qgi) {
  if (sigma >= 4) return { label: "Acceptable performance", tone: "ok" };
  if (qgi < 0.8) return { label: "Imprecision problem — improve CV", tone: "warn" };
  if (qgi > 1.2) return { label: "Inaccuracy problem — reduce bias", tone: "warn" };
  return { label: "Both imprecision & bias contribute", tone: "warn" };
}

export const TIERS = {
  world_class: {
    key: "world_class", label: "World Class", short: "≥ 6.0σ",
    hex: "#059669", badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500", text: "text-emerald-600",
  },
  excellent: {
    key: "excellent", label: "Excellent", short: "5.0–5.9σ",
    hex: "#2563eb", badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500", text: "text-blue-600",
  },
  good: {
    key: "good", label: "Good", short: "4.0–4.9σ",
    hex: "#d97706", badge: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500", text: "text-amber-600",
  },
  marginal: {
    key: "marginal", label: "Marginal", short: "3.0–3.9σ",
    hex: "#ea580c", badge: "bg-orange-50 text-orange-800 border-orange-200",
    dot: "bg-orange-500", text: "text-orange-600",
  },
  poor: {
    key: "poor", label: "Unacceptable", short: "< 3.0σ",
    hex: "#dc2626", badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500", text: "text-rose-600",
  },
};

export function tierForSigma(sigma) {
  if (sigma >= 6) return TIERS.world_class;
  if (sigma >= 5) return TIERS.excellent;
  if (sigma >= 4) return TIERS.good;
  if (sigma >= 3) return TIERS.marginal;
  return TIERS.poor;
}

// Westgard QC rule recommendation based on sigma metric.
export function westgardRecommendation(sigma) {
  if (sigma >= 6) {
    return {
      rules: "1₃ₛ", rulesPlain: "1_3s",
      n: 2, runs: 1, ped: "> 0.95", pfr: "< 0.01",
      summary: "Single-rule QC is sufficient. Minimal controls, minimal false rejections.",
    };
  }
  if (sigma >= 5) {
    return {
      rules: "1₃ₛ / 2₂ₛ / R₄ₛ", rulesPlain: "1_3s / 2_2s / R_4s",
      n: 2, runs: 1, ped: "0.90–0.95", pfr: "~ 0.01",
      summary: "Multirule with N=2 provides strong error detection with low false rejection.",
    };
  }
  if (sigma >= 4) {
    return {
      rules: "1₃ₛ / 2₂ₛ / R₄ₛ / 4₁ₛ", rulesPlain: "1_3s / 2_2s / R_4s / 4_1s",
      n: 4, runs: 1, ped: "0.85–0.90", pfr: "~ 0.03",
      summary: "Expanded multirule with N=4 (or 2 levels × 2 runs) needed to maintain quality.",
    };
  }
  if (sigma >= 3) {
    return {
      rules: "1₃ₛ / 2₂ₛ / R₄ₛ / 4₁ₛ / 8ₓ", rulesPlain: "1_3s / 2_2s / R_4s / 4_1s / 8_x",
      n: 6, runs: 2, ped: "0.75–0.85", pfr: "> 0.05",
      summary: "Maximum multirule with high N (4–6) and multiple runs. Borderline — monitor closely.",
    };
  }
  return {
    rules: "Method unacceptable", rulesPlain: "N/A",
    n: 8, runs: 4, ped: "Insufficient", pfr: "High",
    summary: "Sigma below 3 cannot be controlled reliably. Redesign method, recalibrate, or troubleshoot reagents.",
  };
}

export function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const INSTRUMENTS = [
  "Roche Cobas c502", "Roche Cobas e801", "Abbott Alinity c", "Abbott Alinity i",
  "Beckman DxC 700", "Beckman DxI 800", "Siemens Atellica CH", "Siemens Atellica IM",
  "Tosoh G8", "Sysmex XN-1000", "Ortho Vitros XT", "Other",
];
