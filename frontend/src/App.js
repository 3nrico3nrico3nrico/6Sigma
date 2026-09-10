import { useEffect, useState, useCallback } from "react";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";
import { Calculator, Database, TrendingUp, FlaskConical, FileText } from "lucide-react";
import { Header } from "@/components/Header";
import { SigmaCalculator } from "@/components/calculator/SigmaCalculator";
import { BiologicalVariationTable } from "@/components/database/BiologicalVariationTable";
import { MethodDecisionChart } from "@/components/charts/MethodDecisionChart";
import { LabRecordsManager } from "@/components/records/LabRecordsManager";
import { ReportExporter } from "@/components/reports/ReportExporter";
import { getAnalytes, getRecords } from "@/lib/api";
import { useFavourites } from "@/lib/favourites";

const TABS = [
  { id: "calculator", label: "Calculator", icon: Calculator },
  { id: "database", label: "Biological Variation DB", icon: Database },
  { id: "chart", label: "Method Decision Chart", icon: TrendingUp },
  { id: "records", label: "Lab Records", icon: FlaskConical },
  { id: "reports", label: "Reports", icon: FileText },
];

function App() {
  const [activeTab, setActiveTab] = useState("calculator");
  const [analytes, setAnalytes] = useState([]);
  const [records, setRecords] = useState([]);
  const [prefill, setPrefill] = useState(null);
  const favourites = useFavourites();

  const loadAnalytes = useCallback(() => {
    getAnalytes().then(setAnalytes).catch(() => {});
  }, []);

  const loadRecords = useCallback(() => {
    getRecords().then(setRecords).catch(() => {});
  }, []);

  useEffect(() => {
    loadAnalytes();
    loadRecords();
  }, [loadAnalytes, loadRecords]);

  const useAnalyte = (a, tea) => {
    setPrefill({
      analyte: a.name, category: a.category, matrix: a.matrix,
      tea: String(tea != null ? tea : a.tea),
      _ts: Date.now(),
    });
    setActiveTab("calculator");
  };

  return (
    <div className="App min-h-screen bg-slate-50">
      <Toaster position="top-right" richColors />
      <Header tabs={TABS} activeTab={activeTab} onTab={setActiveTab} recordCount={records.length} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8">
        {activeTab === "calculator" && (
          <div data-testid="tab-panel-calculator">
            <PageTitle title="Six Sigma Calculator & QC Design"
              subtitle="Compute the sigma metric and get automatic Westgard rule recommendations." />
            <SigmaCalculator analytes={analytes} prefill={prefill} onSaved={loadRecords} favourites={favourites} />
          </div>
        )}
        {activeTab === "database" && (
          <div data-testid="tab-panel-database">
            <PageTitle title="Desirable Biological Variation Database"
              subtitle="Ricos/EFLM specifications. Click Use to load an analyte's TEa into the calculator." />
            <BiologicalVariationTable analytes={analytes} onUse={useAnalyte} favourites={favourites} onImported={loadAnalytes} />
          </div>
        )}
        {activeTab === "chart" && (
          <div data-testid="tab-panel-chart">
            <PageTitle title="Normalized Method Decision Chart"
              subtitle="Visualize every method's operating point against Six Sigma contours." />
            <MethodDecisionChart records={records} />
          </div>
        )}
        {activeTab === "records" && (
          <div data-testid="tab-panel-records">
            <PageTitle title="Lab Records & History"
              subtitle="Track measured CV% and Bias% over time per instrument and analyte." />
            <LabRecordsManager records={records} onChanged={loadRecords} />
          </div>
        )}
        {activeTab === "reports" && (
          <div data-testid="tab-panel-reports">
            <PageTitle title="Quality Reports"
              subtitle="Executive summary with CSV and printable PDF export." />
            <ReportExporter records={records} />
          </div>
        )}
      </main>

      <footer className="no-print border-t border-slate-200 py-6 mt-8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 text-xs text-slate-400">
          SigmaLab QC · Sigma = (TEa − |Bias|) / CV · Desirable specifications are illustrative — verify against the current EFLM Biological Variation Database for regulated use.
        </div>
      </footer>
    </div>
  );
}

const PageTitle = ({ title, subtitle }) => (
  <div className="no-print mb-6">
    <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
    <p className="text-sm sm:text-base text-slate-500 mt-1">{subtitle}</p>
  </div>
);

export default App;
