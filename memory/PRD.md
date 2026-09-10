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

## Implemented (2026-06 — iteration 6)
- Compare Export: "Print / PDF" in Compare tab (prints chart + stat cards + leaderboard); Reports tab gets an "Instrument Comparison" section (compact leaderboard per analyte on ≥2 instruments) inside the printable area.
- Tied badge when both instruments share the same mean σ (2-decimal).
- Instrument Leaderboard: all instruments for the chosen analyte ranked by mean σ (mean CV, |bias|, records, last σ).
- Sigma Alerts in Lab Records: card listing analyte+instrument pairs whose latest σ < 3 — "Dropped below 3σ" (prev ≥ 3, rose) vs "Below 3σ" (persistent, amber); click filters records; latest rows highlighted (`data-alert`).
- Shared helpers in `frontend/src/lib/compare.js`. Verified by testing agent (iteration_5: frontend 100%).

## Implemented (2026-06 — iteration 5)
- Analyte disambiguation: every analyte has a `source` (Ricos / EFLM / Imported); names shared across sources get a suffix ("Glucose (Ricos)", "Glucose (EFLM)"); residual same-source/different-matrix clashes get " · Matrix". Applied in `disambiguate()` at `GET /api/analytes` time (covers imports).
- Matrix badge next to analyte name in Database and Lab Records tables (+ source label in Database).
- Calculator performance note is a tier-coloured pill (World-class/Excellent/Good follow tier colours; QGI diagnoses amber).
- New **Compare** tab: analyte + two instruments → dual-line sigma timeline + per-instrument stats (mean σ, mean CV, mean |bias|, last) with "Higher mean σ" badge.
- Verified by testing agent (iteration_4: backend 100%, frontend 100%); 25/25 pytest.

## Implemented (2026-06 — iteration 4)
- Clinical panel categories (20), CVI/CVG enrichment, bulk Excel/CSV import (`POST /api/analytes/import`, `DELETE /api/analytes/custom`), favourites (localStorage `sigmalab_favourites`) — verified by testing agent (iteration_3: 100%/100%).
- Fix: calculator analyte Select used `name` as value → duplicate names (e.g. Potassium serum/urine) rendered twice in trigger. Now keyed by `slug`, label shows matrix.
- QGI note now sigma-tier aware: World-class / Excellent / Good performance (≥6 / ≥5 / ≥4σ).

## Implemented (2026-06 — iteration 3)
- Imported the full official Westgard/EFLM **TEa database (351 analytes)** from user-uploaded Excel files.
- Database now has **378 analytes**: 49 detailed (full CVI/CVG → optimal/desirable/minimum specs + peer benchmark) + 329 extended (official allowable TEa%, across Serum/Plasma/Urine/Whole Blood/Erythrocytes/etc.).
- Extended analytes are searchable, filterable by matrix category, and usable in the calculator (with manual CV/Bias entry); TEa-less entries have the Use button disabled.
- Data generated into `/app/backend/tea_extended.py` (no runtime dependency) and merged in `biological_variation.py`.

## Implemented (2026-06 — iteration 2)
- Spec Levels (optimal/desirable/minimum) toggle in the DB browser + level-aware TEa autofill.
- Lab-wide combined Sigma trend chart (one line per analyte).
- Peer-group benchmark comparison card in the calculator.
- Branded report (logo upload, lab name/address/accreditation, director signature) persisted in localStorage.
- Verified by testing agent (iteration_2: backend 100%, frontend 100%).

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
