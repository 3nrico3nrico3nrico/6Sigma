import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  computeSigma, computeQGI, tierForSigma, westgardRecommendation, qgiInterpretation,
} from "@/lib/sigma";
import { createRecord } from "@/lib/api";

const emptyForm = {
  analyte: "", category: "Custom", matrix: "Serum",
  tea: "", cv: "", bias: "", instrument: "Roche Cobas c502", lot: "", notes: "",
};

export function useSigmaForm({ analytes, prefill, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefill) setForm((f) => ({ ...f, ...prefill }));
  }, [prefill]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const selectAnalyte = (slug) => {
    const a = analytes.find((x) => x.slug === slug);
    if (a) {
      setForm((f) => ({
        ...f, analyte: a.name, category: a.category, matrix: a.matrix,
        tea: a.tea != null ? String(a.tea) : "",
      }));
    }
  };

  const selectedSlug = useMemo(() => {
    const byName = analytes.filter((a) => a.name === form.analyte);
    if (!byName.length) return undefined;
    const exact = byName.find((a) => a.matrix === form.matrix);
    return (exact || byName[0]).slug;
  }, [analytes, form.analyte, form.matrix]);

  const tea = parseFloat(form.tea) || 0;
  const cv = parseFloat(form.cv) || 0;
  const bias = parseFloat(form.bias) || 0;
  const hasInput = tea > 0 && cv > 0;

  const sigma = hasInput ? computeSigma(tea, cv, bias) : 0;
  const qgi = hasInput ? computeQGI(cv, bias) : 0;

  const dbAnalyte = useMemo(
    () => analytes.find((a) => a.name.toLowerCase() === form.analyte.trim().toLowerCase()),
    [analytes, form.analyte]
  );
  const peer = dbAnalyte ? dbAnalyte.peer_sigma : null;

  const save = async () => {
    if (!form.analyte.trim()) return toast.error("Enter an analyte name");
    if (!hasInput) return toast.error("Enter TEa and CV (> 0)");
    setSaving(true);
    try {
      await createRecord({
        analyte: form.analyte.trim(), category: form.category, matrix: form.matrix,
        instrument: form.instrument, lot: form.lot, notes: form.notes,
        tea, cv, bias, measured_at: new Date().toISOString(),
      });
      toast.success(`Saved ${form.analyte} — ${sigma.toFixed(2)}σ`);
      onSaved && onSaved();
    } catch (e) {
      toast.error("Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  return {
    form, set, saving, save, selectAnalyte, selectedSlug,
    result: {
      hasInput, sigma, qgi,
      tier: tierForSigma(sigma),
      rec: westgardRecommendation(sigma),
      note: qgiInterpretation(sigma, qgi),
    },
    peer: { value: peer, delta: peer != null && hasInput ? sigma - peer : null, analyte: dbAnalyte },
  };
}
