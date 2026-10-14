# Analysis Scripts — Investigation & Verification

Python (and a few JavaScript) scripts for investigating, verifying, and reproducing the results of the [Expanding Solar System Resonance Theory (ESSRT)](https://www.holisticuniverse.com): the climate formula and its tests, the ΔT/LOD stack, the eclipse data pipeline, the deep-time cross-check and the browser-modal exports. Every script imports the model through the §2f bridge below, and `npm run test:py-smoke` imports each one so the collection cannot rot unseen.

> **§2f — analysis only, and it is enforced.** Python here may **read** the
> model: import from [`tools/lib/python/constants_scripts.py`](../tools/lib/python/constants_scripts.py),
> which loads `public/input/*.json`. It must never **define** model physics.
> With JS and Python side by side there is no compiler keeping the two in
> step, so the boundary is checked rather than trusted:
> [`tools/check-python-physics.mjs`](../tools/check-python-physics.mjs)
> runs in `npm run check` and in CI.
>
> A *frozen* analysis may pin the value it ran at — that is provenance, not a
> fork — but the pin goes on the gate's ledger, and the gate then asserts the
> pin still matches the live model. Nine scripts currently pin the anchor;
> the day it is recalibrated they all go red at once, which is the intended
> behaviour. New work should import from `constants_scripts` rather than add
> a ledger entry.

> **Shared library** (`constants_scripts.py`) lives in [`tools/lib/python/`](../tools/lib/python/README.md). All scripts here load it via `sys.path` at startup.

Finished investigations leave this folder for `scripts/archive/` (gitignored; git history carries the files) together with their result files (`data/archive/`). A script stays here when a gate runs it, a governed artifact names it as generator, a live document cites it, or another script imports it.

---

## Quick Start

```bash
# The canonical climate formula fit — the governed generator of
# data/milankovitch-climate-formula.json
python3 milankovitch_climate_formula.py
```

---

## Governed generators

These write artifacts that `npm run check` re-checks against their recorded input hashes (`check:artifacts`) or renders into the docs (`docs:tables`).

| Script | Produces |
|--------|----------|
| `milankovitch_climate_formula.py` | `data/milankovitch-climate-formula.json` — the canonical L1 + L2 + L3 climate formula, fit per regime with sequential ridge regression; the Earth Climate Analysis modal's coefficients |
| `l1_physical_lines.py` | `data/l1-physical-lines.json` — **the one home** of the climate formula's orbital line list (the beats of the engine's secular modes and its precession rates, plus the 405.6-kyr family). Two rates, two families: the climatic-precession lines p + gᵢ carry the general precession in longitude at J2000; the obliquity lines p + sᵢ carry the pole rate's mean over the LR04 window on the orbital forcing alone (v23.0 — a record sees the window mean, not the J2000 instant; the T1 exporter `tools/explore/t1-export-engine-frequencies.mjs` writes both) |
| `t7_fixed_phase_l1.py` | `data/t7-fixed-phase-l1.json`, `data/t7-model-orbital-histories.json` — pre-registered test T7: the fixed-phase L1 |
| `generate_doc97_tables.py` | the generated table blocks of [doc 92](../docs/92-climate-formula.md) (`npm run docs:tables`; `--check` in the gate chain) |

---

## The climate formula — tests and diagnostics ([doc 92](../docs/92-climate-formula.md), [doc 94](../docs/94-insolation-null-test.md))

| Script | Description |
|--------|-------------|
| `fit_methodology_diagnostics.py` | Diagnostics on the L1 design matrix of the shipped lines: conditioning, Rayleigh groups, VIF, forward-projection growth, the OLS / ridge / thinned ladder (doc 92 §9.5; `data/fit-methodology-diagnostics.json`) |
| `milankovitch_insolation_extension.py` | Does adding Berger insolation features to the formula buy cross-window-stable gain? (doc 94) |
| `milankovitch_insolation_laskar_check.py` | The same test hardened on La2004/La2010 orbital features (doc 94) |
| `milankovitch_insolation_stability.py` | Cross-window stability of the insolation extension (doc 94) |
| `extract_insolation_features.js` | Extracts the Berger insolation features at the LR04 sample times (`data/insolation-features.csv`) |
| `extract_insolation_features_deep.js` | The deep-source feature set — hybrid obliquity, deep orbital history, the physical climatic precession of date (`data/insolation-features-deep.csv`) |
| `milankovitch_l1_line_audit.py` | Every shipped line on the same footing, per regime (doc 94 §9.1) |
| `milankovitch_ecc_period_scan.py` | Which period the climate record prefers in the ~100-kyr band, against the shipped lines (doc 94 §9.2) |
| `climate_formula_mwp_check.py` | Does the formula coincidentally place a peak at the Medieval Warm Period? |

**The comb-era research scripts are gone.** The variance-budget decomposition that led to the physical line set, the Laskar-eigenmode and invariant-manifold comparisons, the cross-domain and paleo comb tests and the pre-registered comb tests T1 and T5 were deleted with their result files at plan 09 step 7e — git history carries them, and [doc 109 §22](../docs/109-model-nbody-engine-and-lattice-test.md) records each script's headline numbers. What stays: `nbody_50myr_backward.py` (the backward N-body ground truth; needs `rebound`, see [data/PROVENANCE.md](../data/PROVENANCE.md)) and `test_evolving_clock_climate_formula.py` (the p-carrying lines on the composed clock of date, with the warp-scale, sign and frequency-offset controls — [doc 99](../docs/99-expanding-solar-system-resonance-theory.md)).

---

## Climate sensitivity (ECS) — record

Charney-ECS decomposition across paleoclimate eras on the L1 lines, cross-validated on LR04, EPICA, Snyder GAST and boron-isotope CO₂ reconstructions. The write-up is archived; the datasets and their rows stay in [data/PROVENANCE.md](../data/PROVENANCE.md).

`climate_ecs_tight.py` (the entry point: frequency-dependent ice fraction, regime-conditional kernels), `climate_ecs_cross_proxy.py`, `climate_ecs_boron.py`, `climate_ecs_full_forcing.py`, `climate_ecs_monte_carlo.py`, `climate_ecs_per_regime.py`, `climate_ecs_snyder.py`, `climate_ecs_phase_lag.py`.

---

## The ΔT / LOD stack ([doc 102](../docs/102-gia-alpha-lunar-validation.md), [doc 104](../docs/104-millennial-rotation-swing.md), [doc 105](../docs/105-dt-stack-flag-audit.md))

| Script | Description |
|--------|-------------|
| `stephenson_observation_density.py` | Observation-density analysis across the Stephenson 2016 tables — which centuries are well observed |
| `parse_stephenson_deltaT_polynomial.py` | Parses the Stephenson 2016 piecewise ΔT polynomial → `public/input/stephenson-2016-deltaT-polynomial.json` |

---

## Eclipse data pipeline ([doc 102](../docs/102-gia-alpha-lunar-validation.md), [doc 103](../docs/103-135-babylonian-case-study.md))

| Script | Description |
|--------|-------------|
| `fetch_nasa_lunar_canon.py` | Scrapes NASA's 5-Millennium Canon of Lunar Eclipses (12,064 events) → `public/input/lunar-eclipses-nasa.json` |
| `fetch_nasa_historical_lunar.py` | Parses NASA's "Lunar Eclipses of Historical Interest" |
| `parse_stephenson_lunar.py` | Parses the Stephenson, Morrison & Hohenkerk 2016 timed-lunar tables → `public/input/lunar-eclipses-stephenson-2016.json` |
| `parse_stephenson_solar.py` | Parses the Stephenson 2016 timed-solar tables → `public/input/solar-eclipses-stephenson-2016.json` |

---

## Browser-modal data exports

One-shot utilities that prepare data for the in-app modals. Outputs are committed under `public/input/`; no re-runs expected unless source data updates.

| Script | Description |
|--------|-------------|
| `export_climate_formula_browser.py` | Climate-formula coefficients → `public/input/climate-formula-data.json` (the Earth Climate Analysis modal) |
| `export_cenogrid_browser.py` | Westerhold 2020 CENOGRID (δ¹⁸O + δ¹³C, 67 Myr) → `public/input/cenogrid-data.json` |
| `export_cenco2pip_browser.py` | CenCO2PIP atmospheric CO₂ proxy → `public/input/cenco2pip-data.json` |
| `export_epica_browser.py` | EPICA Dome C CO₂ (Bereiter 2015) → `public/input/epica-co2-data.json` |
| `process_climate_proxy.js` | The LR04 climate proxy → `public/input/climate-proxy.json` |

---

## Utilities

(`test_phase0_inline.js`, the deep-time chain's cumulative-integral validator against its own mirrored copies, left with the era device's counters at plan 09 step 5c.)

---

## Data Files

| File | Description |
|------|-------------|
| [`../data/lr04-stack.txt`](../data/lr04-stack.txt) | LR04 benthic δ¹⁸O stack (Lisiecki & Raymo 2005, *Paleoceanography* 20, PA1003) — 5.3 Myr orbitally-tuned marine climate record. |
| [`../data/cheng2016-speleothem.txt`](../data/cheng2016-speleothem.txt) | Cheng 2016 U-Th-dated Asian Monsoon speleothem record (*Science* 352, 343) — 640-kyr non-tuned chronology bias control. |
| [`../data/epica-co2-bereiter2015.txt`](../data/epica-co2-bereiter2015.txt) | Bereiter et al. 2015 (*GRL* 42, 542) EPICA Dome C composite atmospheric CO₂ record — 0–800 kyr BP, Antarctic ice cores. |
| [`../data/westerhold2020-cenogrid.tab`](../data/westerhold2020-cenogrid.tab) | Westerhold et al. 2020 (*Science* 369, 1383) CENOGRID — 67-Myr astronomically tuned benthic δ¹⁸O+δ¹³C reference splice. |

Every dataset's source, citation and licence is in [data/PROVENANCE.md](../data/PROVENANCE.md); two datasets are not ours to redistribute and must be fetched separately (the download steps are there).

---

## Dependencies

- **Python** 3.8+
- **numpy**, **scipy** — numerical computations
- **pandas** — data manipulation
- **openpyxl** — Excel file reading
- **astropy** — where a script converts calendar dates

`pip install -r requirements.txt` in the repository root installs them.

---

## Related Resources

- [Interactive 3D Simulation](https://3d.holisticuniverse.com)
- [Model Documentation](https://www.holisticuniverse.com)
- [Fitting Pipeline](../tools/fit/README.md)

---

## License

These scripts are part of the [Interactive 3D Solar System Simulation](https://github.com/dvansonsbeek/3d) project and are released under the [GNU Affero General Public License v3.0](../LICENSE).
