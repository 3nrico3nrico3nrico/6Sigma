# SigmaLab QC — Product Requirements Document

## Original Problem Statement
"Una app completa per il calcolo del SIX SIGMA in laboratorio analisi attingendo per i dati richiesti al Desirable Biological Variation Database specifications di Westgard o simili."
(A complete app to calculate Six Sigma in a clinical analysis laboratory, drawing required specs from the Desirable Biological Variation Database — Westgard/EFLM/Ricos style.)

## User Choices
- Interface language: **English**
- Scope: **Six Sigma metric + QC design (Westgard rules) + exportable reports (PDF/Excel)**
- Specifications source: **preloaded biological variation database + manual entry**
- Persistence: **save lab data (CV%/Bias%) over time, history & management per instrument/analyte**
- Auth: **none (open app)**
- Style: professional/clinical (Swiss high-contrast, Space Grotesk + IBM Plex Sans)

## Architecture
- **Frontend**: React 19 + Tailwind + shadcn/ui + recharts + sonner. Tabbed SPA (App.js).
- **Backend**: FastAPI, MongoDB (motor). All routes under `/api`.
- **Data model**: LabRecord (analyte, category, matrix, instrument, lot, tea, cv, bias, sigma, qgi, measured_at, notes).
- **Sigma**: `sigma = (TEa - |Bias|) / CV`, `QGI = |Bias| / (1.5·CV)`.
- Biological Variation DB (49 analytes) generated in `biological_variation.py` from CVI/CVG.

## User Personas
- Clinical laboratory quality manager / biomedical scientist evaluating analytical method performance and designing QC.

## Core Requirements (static)
1. Compute Six Sigma metric per analyte with color-coded performance tiers.
2. Recommend Westgard QC rules based on sigma.
3. Browse/search preloaded Desirable Biological Variation specifications.
4. Manual entry + database autofill of TEa.
5. Save/track lab records over time per instrument/analyte with history trend.
6. Normalized Method Decision Chart.
7. Export reports (CSV + printable PDF).

## Implemented (2026-06 — iteration 1)
- Six Sigma Calculator with live gauge, QGI, tier badge, Westgard rule engine.
- Biological Variation Database (49 analytes) browser with search + category filter + "Use in Calculator".
- Normalized Method Decision Chart (recharts) with sigma contours + operating points.
- Lab Records manager: full CRUD, instrument/analyte filters, sigma trend chart, auto-seeded 40 demo records.
- Reports: executive KPIs, performance distribution, CSV export, print-to-PDF.
- Verified end-to-end by testing agent (backend 100%, frontend 100%).

## Backlog / Remaining
- P1: Optimal & Minimum specification levels (currently desirable only).
- P1: Multi-line trend chart across analytes simultaneously.
- P2: Server-side pagination for records at scale.
- P2: OPSpecs chart variant with power-function graphs.
- P2: Lifespan context manager instead of deprecated on_event.

## Next Tasks
- Await user feedback; prioritize optimal/minimum spec levels and richer trend analytics.
