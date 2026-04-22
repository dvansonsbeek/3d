# Formula Verification

## Overview

The **Formula Verification** panel is a modal in the Tools menu that compares the Holistic Universe Model's predictions against published analytical formulas from celestial-mechanics literature — Meeus, Chapront, Capitaine, Vondrák, Laskar, Berger, Peters, Harkness. For nine separate quantities (eccentricity, obliquity, inclination, ascending node, perihelion longitude, tropical year, sidereal year, solar day length, axial precession period) it plots the model and every available reference on a common time axis spanning **12,000 BC → 12,000 AD**, shows a residual chart of each reference minus the model, and a J2000 comparison table that reports every formula's value at J2000 and its delta from the model.

This is the analytical twin of the [WebGeoCalc Explorer](56-webgeocalc-explorer.md):

- WebGeoCalc Explorer → compares the model against **observed JPL data** (1900–2026).
- Formula Verification → compares the model against **published closed-form formulas** (±12 000 yr).

Together the two panels let you check the model from two independent directions: does it match what JPL *measures*, and does it match what textbook celestial mechanics *predicts*?

## The nine categories

Each category has: the quantity being plotted, the unit of the y-axis, a primary reference (highlighted on the J2000 table as the comparison baseline), and a list of secondary references. The model's curve is always drawn in amber (`#f0b040`) as the top layer; each reference gets its own colour.

| # | Category | Unit | Model formula | References |
|---|----------|------|---------------|------------|
| 1 | Eccentricity | — | `computeEccentricityEarth(year, ...)` | Meeus 1991 (primary), Berger 1978 (Milankovitch), La2004 (Laskar) |
| 2 | Obliquity | ° | `computeObliquityEarth(year)` | Chapront 2002 (primary), Laskar 1986, Capitaine 2006, Berger 1978, La2004 |
| 3 | Inclination to Invariable Plane | ° | `computeInclinationEarth(year, ...)` | La2010 (Laskar 2011) |
| 4 | Ascending Node on Invariable Plane | ° | `ascNodeModel(year)` (= −H/5 retrograde) | La2010 (Laskar 2011) |
| 5 | Longitude of Perihelion | ° | `calcEarthPerihelionPredictive(year)` | Meeus 1991 (based on Simon 1994), La2004 |
| 6 | Tropical Year | days | `computeLengthofsolarYear(year)` | Laskar 1986 |
| 7 | Solar Day Length | s | `meansiderealyearlengthinSeconds / computeLengthofsiderealYear(year)` | Peters 2010 |
| 8 | Sidereal Year | days | `computeLengthofsiderealYear(year)` | Chapront 2002 |
| 9 | Axial Precession Period | yr | `computeAxialPrecessionRealLOD(...)` | Capitaine 2003, Vondrák 2011 |

Each category also lists **J2000 observed reference values** separately — NASA/JPL, IAU, or Souami & Souchay (2012) for the invariable-plane quantities — shown in the J2000 table as "extras" (red, `#ef5350`) so the reader can see where observed reality sits relative to model and formulas.

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

- Default range: **−12 000 BC to +12 000 AD** (24 000 years). The same range applies to every category.
- Navigation: prev/next arrows ([`‹`] / [`›`]) to step through the 9 categories, or click the category name to open a dropdown for direct jump.
- Category order: eccentricity → obliquity → inclination → ascending node → perihelion → tropical year → solar day → sidereal year → axial precession.

The panel closes on "×" click, Escape, or overlay click.

## Export for paper

Two buttons in the header produce publication-grade SVG exports:

- **Export for Paper** — renders the current category to a clean SVG with the default `[−12 000, +12 000]` year range and the model + references, without the UI chrome. Uses the category's `paperRange`, `paperTitle`, `paperYRange`, and `paperYTicks` if defined.
- **Export Cycles** — only visible for categories that have a `paperAlt` block (eccentricity and obliquity). Renders a much longer-baseline plot (e.g. eccentricity: −248 000 BC to +102 000 AD) to show the model's long-term oscillation cycles against La2004. Excludes the polynomial references (Meeus, Chapront) that diverge badly outside the century-scale window, and overlays a mean-value reference line.

Exports are triggered by `exportVFPPaper()` and `exportVFPPaperAlt()`. They open in a new tab as an SVG data URL; the reader can right-click to save or screenshot.

## Reference formula catalogue

The panel implements the following closed-form formulas as JavaScript functions. Polynomial coefficients and trigonometric series are hard-coded from the cited sources:

### Polynomial formulas (valid ~±5 000 yr around J2000)

| Function | Source | Quantity |
|----------|--------|----------|
| `eccHarkness(year)` | Harkness 1891 | Earth eccentricity |
| `eccMeeus(year)` | Meeus 1991 eq. 25.4 | Earth eccentricity |
| `obliquityChapront2002(year)` | Chapront 2002 | Earth obliquity |
| `perihelionMeeus(year)` | Meeus 1991 | Earth perihelion longitude |
| `perihelionMeeusEarth(year)` | Meeus 1991 Table 31.A / Simon 1994 | Earth perihelion longitude |
| `tropicalYearLaskar(year)` | Laskar 1986 | Tropical year length |
| `solarDayPeters(year)` | Peters 2010 | Solar day length |
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
- **100-kyr-scale (Export Cycles)** — the model's Fibonacci eccentricity and obliquity cycles are compared directly against Laskar's full N-body integration over several glacial cycles. This is where Milankovitch features appear.

## Why this panel matters for the model's claims

The Holistic Universe Model is a geometric/Fibonacci framework, not a derivation from Newtonian secular theory. A natural skeptical question is: "how does a pure Fibonacci model compare with the polynomial and N-body formulas that the astronomy community already uses?" This panel answers that question visually, quantitatively, and for nine independent quantities at once.

Cases where the model *disagrees* with a reference are also documented in the panel — rather than hidden. The residual chart and J2000 table make the gaps numerical and reproducible. Together with WebGeoCalc (the observational comparison), this panel is the second leg of the model's validation.

## Scope and limitations

1. **Earth only.** All nine categories describe Earth quantities (Earth's orbit + Earth's spin axis). Planet-specific perihelion motion lives in the WebGeoCalc Explorer.
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
- [Grand Holistic Octave Periods](55-grand-holistic-octave-periods.md) — the eight-planet cycle table; uses the same model functions.
- [Planets Precession Cycles](37-planets-precession-cycles.md) — per-planet observed and model rates, with WebGeoCalc and Laskar references.
- [Perihelion Precession](12-perihelion-precession.md) — the three internal computation methods used by the simulation for ϖ, one of which (`calcEarthPerihelionPredictive`) is what this panel plots for category 5.
- [Mercury Precession Breakdown](13-mercury-precession-breakdown.md) — reference-frame discussion (ecliptic vs ICRF) that applies to category 4's ascending-node comparison and category 5's perihelion.
- [Orbital Formulas Reference](21-orbital-formulas-reference.md) — the `OrbitalFormulas` library referenced by the model formulas.

## Code Location

| Component | Location |
|-----------|----------|
| Panel modal (build + open/close) | `createVerificationPanel()` / `openVerificationPanel()` / `closeVerificationPanel()` in `src/script.js` |
| Category data (9 entries) | `VFP_CATEGORIES` array in `src/script.js` |
| Main chart + residual renderer | `renderVFPChart(category, currentYear)` in `src/script.js` |
| Paper-export renderers | `exportVFPPaper()` / `exportVFPPaperAlt()` in `src/script.js` |
| Year→JD helper | `yearToJDApprox(year)` in `src/script.js` |
| Reference formulas (polynomial) | `eccMeeus`, `eccHarkness`, `obliquityChapront2002`, `perihelionMeeus`, `perihelionMeeusEarth`, `tropicalYearLaskar`, `solarDayPeters`, `siderealYearChapront`, `axialPrecessionCapitaine2009` in `src/script.js` |
| Reference formulas (trig series) | `eccBerger1978`, `obliquityBerger1978`, `axialPrecessionVondrak2011` in `src/script.js` |
| Reference formulas (N-body tables) | `eccLa2004`, `obliquityLa2004`, `perihelionLa2004`, `inclinationLa2010`, `ascNodeLa2010` in `src/script.js` (data arrays `_LA2004`, `_LA2010`) |
| Tools-menu button | "Formula Verification" in Tweakpane Tools folder (`src/script.js` near line 26231) |
| CSS | `.vfp-*` classes in `src/style.css` |
