---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:b8b18424a3435e20
status: current
---

# Formula Verification

## Overview

The **Formula Verification** panel is a modal in the Tools menu that compares the Holistic Universe Model's predictions against published analytical formulas from celestial-mechanics literature — Meeus, Chapront, Capitaine, Vondrák, Laskar, Berger, Bills & Ray. For eleven separate quantities (eccentricity, obliquity, inclination, ascending node, perihelion longitude, tropical year, cardinal year lengths, solar day length, sidereal year, axial precession period, ΔT) it plots the model and every available reference on a common time axis spanning **12,000 BC → 12,000 AD** (the Cardinal Year Lengths chart spans ±30,000 yr), shows a residual chart of each reference minus the model, and a J2000 comparison table that reports every formula's value at J2000 and its delta from the model.

This is the analytical twin of the [WebGeoCalc Explorer](56-webgeocalc-explorer.md):

- WebGeoCalc Explorer → compares the model against **observed JPL data** (1900–2026).
- Formula Verification → compares the model against **published closed-form formulas** (±12 000 yr).

Together the two panels let you check the model from two independent directions: does it match what JPL *measures*, and does it match what textbook celestial mechanics *predicts*?

> **Scope note (ESSRT).** The default ±12,000 yr comparison range is modern-era for ESSRT purposes — H(t) drift over this span is sub-ppm and well below the noise floor of the published polynomial and trigonometric formulas being compared. The Export Cycles long-baseline plots (−248,000 BC to +102,000 AD, ~350 kyr) push into the regime where ESSRT scaling becomes marginally non-negligible (~0.04% H drift over 250 kyr per Drivers 1 and 2 — see [doc 99](99-expanding-solar-system-resonance-theory.md)), but Laskar's La2004/La2010 N-body integrations the model is compared against also do not incorporate this drift, so any discrepancy at long range reflects framework differences rather than ESSRT scaling. The model formulas under test are bounded harmonic corrections on the anchor unit's fixed divisors (plan 06 P3); the comparison tests their bounded form, not a lattice claim.

## The eleven categories

Each category has: the quantity being plotted, the unit of the y-axis, a primary reference (highlighted on the J2000 table as the comparison baseline), and a list of secondary references — except Cardinal Year Lengths, which is the model's own decomposition and carries no external comparison. The model's curve is always drawn in amber (`#f0b040`) as the top layer; each reference gets its own colour.

| # | Category | Unit | Model curve | References |
|---|----------|------|---------------|------------|
| 1 | Eccentricity | — | one-source scene target (`_sceneEccTargetAt`) | Meeus 1991 (primary), Berger 1978 (Milankovitch), La2004 (Laskar) |
| 2 | Obliquity | ° | one-source scene target (`_sceneEpsTargetDeg`) | Chapront 2002 (primary), Laskar 1986, Capitaine 2006, Berger 1978, La2004 |
| 3 | Inclination to Invariable Plane | ° | `inclInvPlaneModel(year)` | La2010 (Laskar 2011) |
| 4 | Ascending Node on Invariable Plane | ° | `ascNodeInvPlaneModel(year)` (S&S/La2010 node origin, derived) | La2010 (Laskar 2011) |
| 5 | Longitude of Perihelion | ° | one-source perihelion of date (hybrid-spin aware) | La2004 (primary), Meeus 1991 (based on Simon 1994) |
| 6 | Tropical Year | days | one-source tropical year of date (`createYearLengths` family) | Laskar 1986 |
| 7 | Cardinal Year Lengths | min past 365 d 5 h | the model's own four cardinal-point year lengths + their of-date mean | — (own decomposition, no comparison rows) |
| 8 | Solar Day Length | s | model solar day + dashed long-term-mean line | Bills & Ray 1999 |
| 9 | Sidereal Year | days | one-source sidereal year of date | Chapront 2002 |
| 10 | Axial Precession Period | yr | one-source precession period of date | Capitaine 2003, Vondrák 2011 |
| 11 | ΔT (TT − UT1) | s | calibrated ΔT trend (deltaTStart + Layer-2 integral + H/5 LOD + cycle stack) | Espenak & Meeus history (1650–2017) |

Most categories also list **J2000 observed reference values** separately — NASA/JPL, IAU, or Souami & Souchay (2012) for the invariable-plane quantities — shown in the J2000 table as "extras" (red, `#ef5350`) so the reader can see where observed reality sits relative to model and formulas.

## Chart layout

Each category opens a three-section pane:

### 1. Main chart (upper, 300 px)

`x`-axis: year from −12 000 to +12 000. `y`-axis: the quantity in its natural unit (see table above). All curves plotted together:

- **Amber** — the model (top layer, slightly thicker)
- **Blue, purple, orange, green, red** — each reference formula
- **Dashed dark grey vertical line** at year 2000 (J2000 epoch marker)

A legend above the chart lists each curve with its colour swatch. Reference polynomials become unreliable outside their stated validity window — a note under the chart reminds the reader of this (many polynomial formulas are valid for a few thousand years around J2000 only).

### 2. Residual chart (lower, 140 px)

Same x-axis as the main chart. `y`-axis: `(reference − model)` in the category's residual unit (arcseconds, seconds, milliseconds, degrees, or AU depending on the quantity). The dark grey zero-line makes it immediately visible where a reference agrees with the model and where they diverge.

A "Max difference" line underneath the residual chart reports the actual gap at year −12 000 BC and +12 000 AD between the model and the primary reference, in both the residual unit and the base unit — so the reader can judge "is this a 3-second disagreement or a 3-million-year disagreement?" at a glance.

### 3. J2000 comparison table

A small table with three columns: **Formula name** (with an arrow-link to the published source if available), **Value at J2000** in the category's base unit, and **Δ vs Model**. The model is the first row and always has Δ = 0 by convention; every other row shows how much that formula differs from the model at J2000.

## Time range and navigation

- Default range: **−12 000 BC to +12 000 AD** (24 000 years); the Cardinal Year Lengths category widens its chart to ±30 000 yr.
- Navigation: prev/next arrows ([`‹`] / [`›`]) to step through the 11 categories, or click the category name to open a dropdown for direct jump.
- Category order: eccentricity → obliquity → inclination → ascending node → perihelion → tropical year → cardinal year lengths → solar day → sidereal year → axial precession → ΔT.

The panel closes on "×" click, Escape, or overlay click.

## Export for paper

Three buttons in the header produce publication-grade SVG exports:

- **Export for Paper** — renders the current category to a clean SVG with the default `[−12 000, +12 000]` year range and the model + references, without the UI chrome. Uses the category's `paperRange`, `paperTitle`, `paperYRange`, and `paperYTicks` if defined.
- **Export Cycles** — only visible for categories that have a `paperAlt` block (seven of the eleven: eccentricity, obliquity, tropical year, cardinal year lengths, solar day, sidereal year, axial precession). Renders a much longer-baseline plot (−248 000 BC to +102 000 AD) to show the model's long-term oscillation cycles — against La2004 where an N-body reference exists. Excludes the polynomial references (Meeus, Chapront) that diverge badly outside the century-scale window, and overlays a mean-value reference line. The solar-day cycles view also marks the Marine Isotope Stage peaks (LR04) against the model's LOD extrema.
- **Export Recent** — only visible for categories that have a `paperRecent` block (currently: ΔT). Renders a zoomed 1650-2050 SVG so short-scale features (e.g. the 1900 ΔT dip) are readable. Same curves as the main chart, plus a dashed reference baseline (ΔT = 0) for visual grounding.

Exports are triggered by `exportVFPPaper()`, `exportVFPPaperAlt()`, and `exportVFPPaperRecent()`. All three call the same `renderVFPPaperChartAlt(category, altConfig)` renderer with different config blocks — the "Recent" and "Cycles" variants pass `paperRecent` / `paperAlt` respectively. They open in a new tab as an SVG data URL; the reader can right-click to save or screenshot.

### Charts consistency

- **Tropical year modal** shows SI 86400-s days — never epoch-local LOD-days — evaluated of date from the one-source `createYearLengths` family, the same implementation that serves the planet panel, the year-analysis report and the API.
- **Axial precession modal** is cross-consistent with the tropical-year and sidereal-year modals: all source their year lengths from the same one-source family, so the charts cannot drift apart. None of these charts depends on the sim's current epoch.
- **ΔT modal** — the model curve is the calibrated *trend* (H/5 physics + Bond/Hallstatt/Jose5/Jose4 stack), fit against Espenak history ~12 s RMS across 1650-2017. Reads ~57.5 s at J2000 (trend value passing through J2000), distinct from the IERS instantaneous observation of ~63.6 s.

## Reference formula catalogue

The panel implements the following closed-form formulas as JavaScript functions. Polynomial coefficients and trigonometric series are hard-coded from the cited sources:

### Polynomial formulas (valid ~±5 000 yr around J2000)

| Function | Source | Quantity |
|----------|--------|----------|
| `eccMeeus(year)` | Meeus 1991 eq. 25.4 | Earth eccentricity |
| `obliquityChapront2002(year)` | Chapront 2002 | Earth obliquity |
| `perihelionMeeus(year)` | Meeus 1991 | Earth perihelion longitude |
| `perihelionMeeusEarth(year)` | Meeus 1991 Table 31.A / Simon 1994 | Earth perihelion longitude |
| `tropicalYearLaskar(year)` | Laskar 1986 | Tropical year length |
| `solarDayPeters(year)` | Bills & Ray 1999 (linear tidal recession) | Solar day length |
| `siderealYearChapront(year)` | Chapront 2002 | Sidereal year length |
| `axialPrecessionCapitaine2009(year)` | Capitaine 2003 / IAU 2006 | Axial precession period |

### Trigonometric series (valid for ~±250 000 yr)

| Function | Source | Quantity |
|----------|--------|----------|
| `eccBerger1978(year)` | Berger 1978 Table 4 (19 terms) | Earth eccentricity |
| `obliquityBerger1978(year)` | Berger 1978 Table 1 (47 terms) | Earth obliquity |
| `axialPrecessionVondrak2011(year)` | Vondrák+ 2011 Table 3 (10 periodic terms) | Axial precession |

### Tabulated N-body integrations (interpolated)

| Function | Source | Baseline | Interval | Cols |
|----------|--------|----------|----------|------|
| `eccLa2004(year)` | Laskar et al. 2004 | −250 k to +100 k yr | 1 000 yr | ecc |
| `obliquityLa2004(year)` | Laskar et al. 2004 | −250 k to +100 k yr | 1 000 yr | obliq |
| `perihelionLa2004(year)` | Laskar et al. 2004 | −250 k to +100 k yr | 1 000 yr | perihelion (wrap-aware) |
| `inclinationLa2010(year)` | Laskar et al. 2011 | −500 k to 0 yr | 2 000 yr | inv-plane incl. |
| `ascNodeLa2010(year)` | Laskar et al. 2011 | −500 k to 0 yr | 2 000 yr | inv-plane node (wrap-aware) |

The La2004 and La2010 tables are embedded directly in `src/script.js` (arrays `_LA2004` and `_LA2010`); interpolation is linear between grid points with 360°-wrap handling for angular quantities.

## What a user sees

At any point the panel answers: *"Does our model agree with published celestial mechanics?"* The honest reading is:

- **Century-scale (±100 yr)** — the model agrees with Meeus, Chapront, Capitaine polynomials at the J2000-value level to a few arcseconds or sub-second time units; all curves are essentially indistinguishable in the main chart, and the residual chart shows deviations at the noise floor of the polynomial fits.
- **Millennial-scale (±5 000 yr)** — the model still tracks the polynomial references closely; residuals grow but stay within the polynomials' stated validity.
- **Ten-kyr-scale (±12 000 yr)** — polynomial references start to diverge (they were fit for a narrow window); the model tracks Laskar's La2004/La2010 N-body integrations instead, which are the only references valid at this range.
- **100-kyr-scale (Export Cycles)** — the model's Earth eccentricity and obliquity laws are compared directly against Laskar's full N-body integration over several glacial cycles. This is where Milankovitch features appear.

## Why this panel matters for the model's claims

The Holistic Universe Model is an analytic framework — harmonic bases on a fitted anchor for Earth's spin and time — with its own N-body chain for the planets — not a restatement of standard secular theory. A natural skeptical question is: "how does such a model compare with the polynomial and N-body formulas that the astronomy community already uses?" This panel answers that question visually, quantitatively, and for eleven independent quantities at once.

Cases where the model *disagrees* with a reference are also documented in the panel — rather than hidden. The residual chart and J2000 table make the gaps numerical and reproducible. Together with WebGeoCalc (the observational comparison), this panel is the second leg of the model's validation.

## Scope and limitations

1. **Earth only.** All eleven categories describe Earth quantities (Earth's orbit + Earth's spin axis + Earth's rotation clock ΔT). Planet-specific perihelion motion lives in the WebGeoCalc Explorer.
2. **No interactive year slider.** The charts are plotted over a fixed range (−12 000 to +12 000). To inspect values at a specific year, read the J2000 table or advance the simulation's date and re-open the panel.
3. **Reference formulas go stale outside their range.** A polynomial fit to ±2 000 years *will* give nonsense at year −10 000. The panel plots them anyway (with the range note) so the reader can see the divergence — useful for understanding *why* N-body solutions are needed at long range.
4. **Paper-export is SVG-only.** No PNG / PDF export. Use browser screenshot or an external SVG-to-PDF converter.
5. **Read-only.** The panel has no "edit model parameters" feature. To re-run with different model parameters, edit the constants in `src/script.js` (or `public/input/model-parameters.json` via the pipeline) and reload the simulation.

## Colour coding

- **Amber `#f0b040`** — the model (always first in the legend)
- **Blue `#4fc3f7`** — primary reference (Meeus, La2004 in several categories)
- **Purple `#ce93d8`** — Berger 1978
- **Orange `#ff8a65`** — La2004
- **Green `#81c784`** — Capitaine, Vondrák
- **Red `#e53935`** / `#ef5350` — secondary Laskar series / observed J2000 extras
- **Dashed grey** — the J2000 vertical gridline, and "mean" reference lines in long-baseline plots

## Related documentation

- [WebGeoCalc Explorer](56-webgeocalc-explorer.md) — the observational complement of this panel (model vs JPL data, 1900–2026).
- [Perihelion Precession](13-mercury-precession-breakdown.md) — the internal computation methods used by the simulation for ϖ (the panel's category-5 model line is the one-source perihelion of date), and the reference-frame discussion (ecliptic vs ICRF) that applies to category 4's ascending-node comparison.
- [Orbital Formulas Reference](21-orbital-formulas-reference.md) — the `OrbitalFormulas` library referenced by the model formulas.
- [Expanding Solar System Resonance Theory](99-expanding-solar-system-resonance-theory.md) — Deep-time scaling of H(t); becomes marginally relevant at the Export Cycles 350-kyr baseline.

## Code Location

| Component | Location |
|-----------|----------|
| Panel modal (build + open/close) | `createVerificationPanel()` / `openVerificationPanel()` / `closeVerificationPanel()` in `src/script.js` |
| Category data (10 entries) | `VFP_CATEGORIES` array in `src/script.js` |
| Main chart + residual renderer | `renderVFPChart(category, currentYear)` in `src/script.js` |
| Paper-export renderers | `exportVFPPaper()` / `exportVFPPaperAlt()` / `exportVFPPaperRecent()` in `src/script.js` |
| Year→JD helper | `yearToJDApprox(year)` in `src/script.js` |
| Reference formulas (polynomial) | `eccMeeus`, `eccHarkness`, `obliquityChapront2002`, `perihelionMeeus`, `perihelionMeeusEarth`, `tropicalYearLaskar`, `solarDayPeters`, `siderealYearChapront`, `axialPrecessionCapitaine2009` in `src/script.js` |
| Reference formulas (trig series) | `eccBerger1978`, `obliquityBerger1978`, `axialPrecessionVondrak2011` in `src/script.js` |
| Reference formulas (N-body tables) | `eccLa2004`, `obliquityLa2004`, `perihelionLa2004`, `inclinationLa2010`, `ascNodeLa2010` in `src/script.js` (data arrays `_LA2004`, `_LA2010`) |
| Tools-menu button | "Formula Verification" in Tweakpane Tools folder (`src/script.js`) |
| CSS | `.vfp-*` classes in `src/style.css` |
