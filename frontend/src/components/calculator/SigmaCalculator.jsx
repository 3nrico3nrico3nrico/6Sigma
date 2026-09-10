import React from "react";
import { useSigmaForm } from "./useSigmaForm";
import { MethodInputs } from "./MethodInputs";
import { SigmaResults } from "./SigmaResults";
import { PeerBenchmark } from "./PeerBenchmark";

export const SigmaCalculator = ({ analytes, prefill, onSaved, favourites }) => {
  const { form, set, saving, save, selectAnalyte, selectedSlug, result, peer } = useSigmaForm({ analytes, prefill, onSaved });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <MethodInputs analytes={analytes} favourites={favourites} form={form} set={set}
        selectedSlug={selectedSlug} onSelectAnalyte={selectAnalyte} onSave={save} saving={saving} />
      <div className="lg:col-span-7 space-y-6">
        <SigmaResults result={result} />
        <PeerBenchmark peer={peer} sigma={result.sigma} hasInput={result.hasInput} tierHex={result.tier.hex} />
      </div>
    </div>
  );
};
