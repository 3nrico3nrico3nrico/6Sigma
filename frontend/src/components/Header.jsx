import React from "react";
import { Hexagon } from "lucide-react";

export const Header = ({ tabs, activeTab, onTab, recordCount }) => {
  return (
    <header className="no-print sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Hexagon className="w-9 h-9 text-slate-900" strokeWidth={1.5} />
              <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-slate-900 text-sm">σ</span>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sky-500 border-2 border-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-slate-900 text-lg leading-none tracking-tight">SigmaLab QC</h1>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Clinical Six Sigma & Biological Variation Suite</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-600 font-mono-num">{recordCount} records tracked</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 mt-3 overflow-x-auto pb-0.5">
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                data-testid={`nav-tab-${t.id}`}
                onClick={() => onTab(t.id)}
                className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
