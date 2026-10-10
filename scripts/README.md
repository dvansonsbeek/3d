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

> **Shared library** (`constants_scripts.py`, `predictive_formula.py` — Earth's perihelion/ERD/obliquity helpers — and `planet_beats.py`) lives in [`tools/lib/python/`](../tools/lib/python/README.md). All scripts here load it via `sys.path` at startup.

Finished investigations leave this folder for `scripts/archive/` (gitignored; git history carries the files) together with their result files (`data/archive/`). A script stays here when a gate runs it, a governed artifact names it as generator, a live document cites it, or another script imports it.

---

## Quick Start

```bash
# The canonical climate formula fit — the governed generator of
# data/milankovitch-climate-formula.json
python3 milankovitch_climate_formula.py

# The deep-time chain cross-check at the Devonian (t = 380 Ma)
python3 devonian_cross_check.py
```

---

## Governed generators

These write artifacts that `npm run check` re-checks against their recorded input hashes (`check:artifacts`) or renders into the docs (`docs:tables`).

| Script | Produces |
|--------|----------|
| `milankovitch_climate_formula.py` | `data/milankovitch-climate-formula.json` — the canonical L1 + L2 + L3 climate formula, fit per regime with sequential ridge regression; the Earth Climate Analysis modal's coefficients |
| `l1_physical_lines.py` | `data/l1-physical-lines.json` — **the one home** of the climate formula's orbital line list (the beats of the engine's secular modes and the precession clock, plus the 405.6-kyr family) |
| `t1_beat_model_vs_comb.py` | `data/t1-beat-model-vs-comb.json` — pre-registered test T1: the L1 lattice against the physical beat model |
| `t5_dt_stack_lattice_null.py` | `data/t5-dt-stack-lattice-null.json` — pre-registered test T5: the ΔT-stack cycles against a random-comb null |
| `t7_fixed_phase_l1.py` | `data/t7-fixed-phase-l1.json`, `data/t7-model-orbital-histories.json` — pre-registered test T7: the fixed-phase L1 |
| `jupiter92_isolated_refit.py` | `data/jupiter92-isolated-refit.json` — the Jose-5 phase-isolation refit against the Stephenson ΔT residual |
| `generate_doc97_tables.py` | the generated table blocks of [doc 92](../docs/92-climate-formula.md) (`npm run docs:tables`; `--check` in the gate chain) |

---

## The climate formula — tests and diagnostics ([doc 92](../docs/92-climate-formula.md), [doc 94](../docs/94-insolation-null-test.md))

| Script | Description |
|--------|-------------|
| `milankovitch_8h_all_integer_mtm.py` | All-integer MTM F-test scan across the comb (doc 92 §2) |
| `milankovitch_8h_cheng_chronology_validation.py` | Independent-chronology validation on the Cheng 2016 speleothem record (doc 92 §4) |
| `fit_methodology_diagnostics.py` | Diagnostics on the L1 design matrix: collinearity, ridge path, per-regime conditioning (doc 92 §8) |
| `milankovitch_insolation_extension.py` | Does adding Berger insolation features to the formula buy cross-window-stable gain? (doc 94) |
| `milankovitch_insolation_laskar_check.py` | The same test hardened on La2004/La2010 orbital features (doc 94) |
| `milankovitch_insolation_stability.py` | Cross-window stability of the insolation extension (doc 94) |
| `extract_insolation_features.js` | Extracts the Berger insolation features at the LR04 sample times (`data/insolation-features.csv`) |
| `extract_insolation_features_deep.js` | The deep-source feature set — hybrid obliquity, deep orbital history, the physical climatic precession of date (`data/insolation-features-deep.csv`) |
| `milankovitch_l1_n24_attribution.py` | Attribution of the pre-iNHG eccentricity gain (doc 94) |
| `milankovitch_l1_divisor_audit.py` | Every shipped line on the same footing, per regime (doc 94) |
| `milankovitch_ecc_period_scan.py` | Which period the climate record prefers for Earth's eccentricity line (doc 94) |
| `climate_formula_mwp_check.py` | Does the formula coincidentally place a peak at the Medieval Warm Period? |

**The variance-budget record** — the comb-era decomposition that led to the physical line set (doc 92 §§1–8; its result files feed the registry and the doc 92 tables; the rest of the comb-era test ledger is in `scripts/archive/`): `milankovitch_8h_variance_budget.py` (Tier A) and `milankovitch_8h_variance_budget_tier_b.py`, `milankovitch_8h_variance_budget_tier_b_r2.py`, `milankovitch_8h_variance_budget_tier_b_r3.py` (Tier B rounds 1–3); `milankovitch_8h_cenogrid_spectral.py`, `milankovitch_8h_cenogrid_windowed.py` and `cenogrid_mtm_ftest.py` (the CENOGRID spectral evidence, [doc 106](../docs/106-deep-time-validation-dossier.md)).

**Framework vs Laskar and N-body** — `l1_vs_laskar_eigenmodes.py` (do the lines correspond to Laskar 2004 eigenmode beats — the module the attribution scripts import), `l1_vs_laskar_50myr.py` and `l1_vs_laskar_published_50myr.py` (the match across −50 Myr, forward-integrated and published LA2004), `nbody_50myr_backward.py` (the backward N-body ground truth; needs `rebound`, see [data/PROVENANCE.md](../data/PROVENANCE.md)), `l1_invariant_test.py` and `equilibrium_libration_test.py` (invariant-manifold and libration hypotheses), `h8_subband_scan.py` and `l1_fibonacci_stability_test.py` (sub-band and stability scans read by the doc 92 tables), `solar_8H_lattice_test.py` (the cross-domain test in solar-activity records), `eight_h_history.py`, `paleo_l1_renumbering.py` and `test_evolving_8h_climate_formula.py` (the lines under the evolving clock — [doc 99](../docs/99-expanding-solar-system-resonance-theory.md); the last is a NULL result at the Phanerozoic).

---

## Climate sensitivity (ECS) — record

Charney-ECS decomposition across paleoclimate eras on the L1 lines, cross-validated on LR04, EPICA, Snyder GAST and boron-isotope CO₂ reconstructions. The write-up is archived; the datasets and their rows stay in [data/PROVENANCE.md](../data/PROVENANCE.md).

`climate_ecs_tight.py` (the entry point: frequency-dependent ice fraction, regime-conditional kernels), `climate_ecs_cross_proxy.py`, `climate_ecs_boron.py`, `climate_ecs_full_forcing.py`, `climate_ecs_monte_carlo.py`, `climate_ecs_per_regime.py`, `climate_ecs_snyder.py`, `climate_ecs_phase_lag.py`.

---

## The ΔT / LOD stack ([doc 102](../docs/102-gia-alpha-lunar-validation.md), [doc 104](../docs/104-millennial-rotation-swing.md), [doc 105](../docs/105-dt-stack-flag-audit.md))

| Script | Description |
|--------|-------------|
| `lattice_harmonic_scan.py` | Universal harmonic-divisor scan across the paleoclimate and solar archives — the companion of the ΔT fitter `tools/fit/dt-corrections-fit.js` (`data/lattice-scan-*.json`) |
| `lod_residual_lattice_fit.py` | Sub-kyr harmonic fit to the Stephenson ΔT residual — the module the residual scripts import |
| `lod_residual_lattice_cv.py` | Out-of-sample cross-validation of that fit |
| `lod_residual_shipped_stack_cv.py` | Out-of-sample cross-validation of the SHIPPED 4-flag ΔT stack (doc 105) |
| `lod_residual_divisor_scan_jse.py` | Full divisor scan against the residual with the Jose cycles |
| `lod_residual_quad_fit.py`, `lod_residual_triple_bond_hallstatt_jose5.py`, `lod_residual_bond_plus_hallstatt.py`, `lod_residual_1851_refit.py` | The joint-fit variants whose results are `data/deltaT-*-fit.json` |
| `export_bond_cycle_residual_fit.py` | Exports the validated Bond-cycle fit to the residual (`data/deltaT-bond-cycle-residual-fit.json`) |
| `hallstatt_cheng_speleothem.py`, `hallstatt_epica_co2.py`, `hallstatt_steinhilber_amplitude.py` | The Hallstatt-cycle tests on the Cheng 2016, EPICA CO₂ and Steinhilber archives (`data/hallstatt-*-fit.json`) |
| `paleo_lod_comparison.py` | Paleo-LOD evidence: the framework's length-of-day history against the mainstream reconstructions (doc 99) |
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

## Deep time ([doc 99](../docs/99-expanding-solar-system-resonance-theory.md))

| Script | Description |
|--------|-------------|
| `devonian_cross_check.py` | The deep-time chain verified at the Devonian (t = 380 Ma): J2000 values against IAU, then the predicted day length, Moon distance, months, years and planet periods at depth |

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

`test_phase0_inline.js` — validates the deep-time chain's cumulative-integral implementation against its own mirrored copies.

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
