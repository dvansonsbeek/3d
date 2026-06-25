# Climate Formula Explorer

## Overview

The **Climate Formula Explorer** is a modal panel in the Tools menu that visualizes the canonical **L1+L2+L3 climate formula** (the orbital-forcing + carbon-cycle-thermostat + boundary-condition-step decomposition; see [doc 92](92-climate-formula.md)) overlaid on each of the four climate proxy records — **CenCO2PIP** (deep-time atmospheric CO₂, 0–66 Ma), **CENOGRID** (Cenozoic benthic δ¹⁸O / δ¹³C, 0–67 Ma), **LR04** (Pliocene-Pleistocene benthic δ¹⁸O, 0–5.3 Ma), and **EPICA Dome C** (atmospheric CO₂, 0–800 kyr). The modal exposes the same formula evaluated across 8 time windows from the deep-time 67-Myr CENOGRID record down to a forward projection of the next 250 kyr.

This is the panel that grounds the Holistic Universe Model's climate claims in *observation*. The 32-integer L1 lattice (orbital integer divisors of 8H = 2,682,536 yr at J2000), the 3-line L2 carbon thermostat family (405 / 202 / 135 kyr), and the 6-step L3 Heaviside boundary-condition transitions (PETM, EOT, Mi-1, MMCT, iNHG, MPT) are all fitted with sequential ridge regression per regime — see [doc 92 §9](92-climate-formula.md#9-the-canonical-climate-formula) for the canonical architecture.

> **Scope note (ESSRT).** The L1 lattice integer-divisor structure (n where T = 8H/n) is scale-invariant — the integers stay fixed at any epoch. The 8H = 2,682,536 yr literal value and the per-line periods (8H/n in kyr) are J2000-evaluated. Under [ESSRT](99-expanding-solar-system-resonance-theory.md), H(t) evolves at deep time via Drivers 1 (LOD growth) and 2 (Kepler) — sub-percent drift over the LR04 5.3-Myr window, ~0.04% over the 67-Myr CENOGRID window, and starts to matter for the 13H ≈ 4.36 Myr Boulila libration comparison covered in doc 92.

## Accessing the Explorer

1. Open the Tweakpane Tools folder.
2. Click **"Climate Formula Explorer"**.
3. Use the time-window tabs across the top to switch records.
4. Use the layer toggles (Total / L1 / L2 / L3) to add or remove formula layers.
5. On CENOGRID, use the δ¹⁸O / δ¹³C sub-toggle.

## Tab list (left → right)

| Tab label | Window | Data source | Eval routing | Tab note |
|---|---|---|---|---|
| **CenCO2PIP · 66M** | 0–66 Ma | `public/input/cenco2pip-data.json` | `cenco2pip` regime only | Deep-time atmospheric CO₂ (Bayesian multi-proxy synthesis) |
| **CENOGRID · 67M** | 0–67 Ma | `public/input/cenogrid-data.json` (δ¹⁸O / δ¹³C subtoggle) | δ¹⁸O: LR04 stitched for ≤ 5.3 Ma + cenogrid-d18o for > 5.3 Ma. δ¹³C: cenogrid-d13c only | Cenozoic benthic stack; L3 step terms dominate variance |
| **LR04 · 5.3M** | 0–5.3 Ma | `public/input/lr04-data.json` | LR04 stitched (3 regimes) | Three regimes visible; full LR04 record |
| **LR04 · 1.2M** | 0–1.2 Ma | LR04 | LR04 stitched, but only post-mpt + inhg-mpt inside window | Across the MPT transition (~1 Ma) |
| **EPICA · 800k** | 0–800 kyr | `public/input/epica-co2-data.json` | `epica-co2` regime only | Cross-proxy validation: same lattice fits atmospheric CO₂ |
| **LR04 · 700k** | 0–700 kyr | LR04 | `lr04-post-mpt` only | Post-MPT regime, the formula's best-fit window (R² = 0.87) |
| **LR04 · 200k** | 0–200 kyr | LR04 | `lr04-post-mpt` only | Current glacial cycle in detail |
| **LR04 · forward** | −250 → +250 kyr | LR04 (past only) + extrapolated formula | `lr04-post-mpt` only | Orbital-only projection; honest scope is post-MPT regime continues |

## Layer toggles (3 checkboxes)

| Toggle | Curve displayed | Meaning |
|---|---|---|
| **Total** (white) | baseline + L1 + L2 + L3 | The complete formula's prediction |
| **L1 alone** (yellow) | baseline + L1 + L3 | Orbital wiggles on top of the regime-defined baseline |
| **L2 alone** (green) | baseline + L2 + L3 | Carbon-thermostat (405-kyr beat + harmonics) on top of the regime baseline |

L3 step terms are included on every line so each curve follows the per-period regime baseline. The lines do not visually sum to Total (each carries the baseline once); the R² panel shows per-layer variance contributions.

## Y-axis conventions

| Proxy | Y-axis | Orientation | Top label | Bottom label |
|---|---|---|---|---|
| δ¹⁸O (LR04 / CENOGRID δ¹⁸O) | ‰ | Inverted (paleoclimate convention) | ↑ warmer | ↓ colder |
| δ¹³C (CENOGRID δ¹³C) | ‰ | Inverted | ↑ carbon released | ↓ carbon stored |
| CO₂ (EPICA / CenCO2PIP) | ppm | Standard (non-inverted), floor clamped at 0 | ↑ high CO₂ (warm) | ↓ low CO₂ (glacial) |

## R² breakdown panel

Collapsed by default, exposes a `<details>` block below the chart:

- **Single-regime tabs** (LR04 700k, LR04 200k, EPICA, CenCO2PIP, CENOGRID δ¹³C): per-layer cumulative R² + ΔR² for L1, L2, L3 of that regime.
- **Stitched tabs** (Full LR04, Post-MPT ext, CENOGRID δ¹⁸O): stitched curve R² computed against actual data + per-regime breakdown for each segment crossed.

## Forward projection markers

On the forward tab, glacial maxima and interglacial peaks are auto-detected at render time:

- Algorithm: `cfmFindExtrema(t, vals, type='max'|'min', prominence=0.3, halfWidth=32)`
- Halfwidth = 32 samples (≈ 20 kyr at the forward tab's grid resolution) — wide enough to resolve 100-kyr glacial-cycle peaks.
- Absolute thresholds: glacial requires δ¹⁸O ≥ 4.5 ‰; interglacial requires δ¹⁸O ≤ 3.7 ‰. Mid-cycle wobbles (4.0–4.4 ‰) are not labeled.
- Glacial markers (blue) anchored at the bottom of the plot; interglacial markers (orange) at the top.

## Cross-proxy comparison tables

Two tabs render additional collapsible tables below the R² panel:

- **CENOGRID** tab → "L3 step amplitudes: ice (δ¹⁸O) vs carbon (δ¹³C)" — per-transition raw-‰ jumps for both proxies side-by-side, with interpretive notes.
- **EPICA** tab → "L1 carbon-amplification ratio (EPICA / LR04 post-MPT)" — per-line ratio sorted descending; identifies which lattice members manifest primarily through carbon-cycle dynamics (see [doc 92 §10.3](92-climate-formula.md)).

## Forward-projection note

The forward tab carries an explicit caveat addressing the CO₂-causality debate:

> *Orbital-only projection. Natural orbital + carbon-cycle + boundary terms only; no anthropogenic CO₂ forcing. Glacial / interglacial markers auto-detected from the curve. Under natural forcing the curve shows glacial inception in the next 20–30 kyr (next peak at ~58 kyr). Whether anthropogenic CO₂ alters this depends on CO₂'s causal role in glacial cycles — itself contested. If CO₂ drives temperature (Ganopolski et al. 2016), present cumulative emissions delay inception ~50 kyr (high-emission scenarios ~100 kyr). If CO₂ lags as a feedback (ice-core record, Caillon et al. 2003), the orbital projection largely holds. Honest scope: post-MPT regime continues.*

This framing addresses the Ganopolski-vs-Caillon debate without endorsing either causal direction — the framework treats CO₂ as a feedback (L2 silicate-weathering thermostat is the natural carbon response), but the modal's forward projection is orbital-only and lets the reader decide which CO₂ view to overlay.

## Data pipeline

```
data/lr04-stack.txt
data/westerhold2020-cenogrid.tab
data/epica-co2-bereiter2015.txt
data/cenco2pip-100kyr-bayesian.csv
       │
       ▼  scripts/milankovitch_climate_formula.py     (fit + report)
       │
       ▼  data/milankovitch-climate-formula.json      (canonical research output)
       │
       ▼  scripts/export_climate_formula_browser.py   (browser-ready coefficients)
       │
       ▼  public/input/climate-formula-coefficients.json   (8 regimes, ~44 KB)
       │
       ▼  scripts/export_cenogrid_browser.py          → public/input/cenogrid-data.json
       ▼  scripts/export_epica_browser.py             → public/input/epica-co2-data.json
       ▼  scripts/export_cenco2pip_browser.py         → public/input/cenco2pip-data.json
       │
       ▼  node tools/fit/export-to-script.js --write  (sync coefficients into bundle)
       │
       ▼  src/script.js                               (CLIMATE_FORMULA_COEFFS const, ~22 KB embedded)
       │
       ▼  Climate Formula Explorer modal renders the 8 tabs
```

Re-running scripts only needed after dataset updates or refit changes — see [doc 92 §14](92-climate-formula.md#14-reproducing-the-canonical-formula-pipeline-browser--modal) for the regeneration recipe and tooling.

## Code locations

| Component | Location |
|-----------|----------|
| Panel modal | `createClimateFormulaPanel()` / `openClimateFormulaPanel()` / `closeClimateFormulaPanel()` in `src/script.js` |
| Per-tab content + layer toggles | `cfmRender()` in `src/script.js` |
| Per-line evaluator | `cfmEvalFormula(time_kyr, regime, layers)` in `src/script.js` |
| Coefficient block | `CLIMATE_FORMULA_COEFFS` (embedded in bundle from `public/input/climate-formula-coefficients.json`) |
| Lazy proxy-data loaders | `loadCfmLR04Data()`, `loadCenogridData()`, `loadEpicaData()`, `loadCenco2pipData()` |
| Extrema detection (forward tab) | `cfmFindExtrema()` in `src/script.js` |
| Tools-menu button | "Climate Formula Explorer" in Tweakpane Tools folder |
| CSS | `.cfm-*` classes in `src/style.css` |

## Scope and limitations

1. **Earth only.** All proxies measure Earth's climate state (δ¹⁸O temperature proxy, δ¹³C carbon proxy, CO₂ atmospheric concentration). Per-planet contributions to the L1 lattice are documented in [doc 91 §3](91-milankovitch-evidence.md) and [doc 93](93-l1-attribution-reference.md), not in this modal.
2. **Regime-aware fits, not free-floating.** The formula has different L1 amplitudes in each of the 6 regimes (`pre-iNHG`, `iNHG-MPT`, `lr04-post-mpt`, `epica-co2`, `cenogrid-d18o`, `cenogrid-d13c`, `cenco2pip`) — they are not the same global coefficients. The modal handles regime stitching automatically. **Forward prediction across regime boundaries fails catastrophically** (R² = −0.87 across the MPT in Tier B Round 3 R3-3 of doc 92); the framework is descriptive within regimes, not predictive across boundary-condition shifts.
3. **L1 31 integers + 1 (n=141 Berger-quintet completion) = 32 total.** Component list catalogued in [doc 92 §2.3](92-climate-formula.md#23-the-32-lattice-integers--per-line-identities) with per-line identities and Berger / Holistic dual attribution ([doc 93](93-l1-attribution-reference.md)).
4. **Read-only.** The modal has no "edit formula" feature; coefficients are baked at bundle time from the Python fit pipeline.
5. **Coefficient updates require re-running the pipeline.** See the data-pipeline section above.

## Related documentation

- [doc 90 — Milankovitch language](90-milankovitch-language.md) — terminology primer (g_j, s_j, k, eigenmode beats)
- [doc 91 — Milankovitch evidence](91-milankovitch-evidence.md) — empirical 32-integer L1 fit, per-planet contributions, 14 hypothesis tests, 405-kyr off-lattice characterization
- [doc 92 — Climate Formula architecture](92-climate-formula.md) — complete L1+L2+L3 derivation, per-regime ridge-fit R² values, variance-decomposition Tier A / B analyses, forward-projection limits
- [doc 93 — L1 attribution reference](93-l1-attribution-reference.md) — per-integer Berger vs Holistic top-1 attribution
- [doc 94 — Insolation null test](94-insolation-null-test.md) — empirical anchor for the "lattice subsumes Berger insolation" claim (ΔR² ≈ 0)
- [doc 95 — Climate summary](95-climate-summary.md) — the synthesis statement the modal visualizes
- [doc 99 — Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) — deep-time scaling of H(t) for the literal 8H value
- [doc 59 — ESSRT Explorer](59-essrt-explorer.md) — sibling Tools-menu modal for deep-time H/LOD/year evolution
- [doc 57 — Formula Verification](57-formula-verification.md) — sibling Tools-menu modal comparing model vs published celestial-mechanics formulas
- [doc 56 — WebGeoCalc Explorer](56-webgeocalc-explorer.md) — sibling Tools-menu modal showing observed perihelion-precession history
