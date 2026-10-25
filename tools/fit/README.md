# Fitting & Derivation Scripts

The implementations live in **`packages/fitting/src/`** (`@essrt/fitting`);
every `tools/fit/*.js` is a one-line shim into the package (argv and env pass
through), so the paths below stay valid. `python/` holds the Node→Python
constants bridge. The verify suite is `tools/verify/` (gates and generators —
`npm run test:verify:list`); the artifact regeneration order is
`npm run regen:cascade`.

The pre-plan-14 README (822 lines: the deleted steps 0–5c and 7a–7e, the
frozen era clock, the retired cardinal conventions, the correction-stack
record) is archived verbatim as
`docs/archive/old-documents/fit-README-pre-plan14.md`; git history carries
every intermediate state.

## What is fitted today

Two things, and only two:

| fitted family | fitter | artifact | reaches the runtimes |
|---|---|---|---|
| the ΔT correction stack (Bond, Hallstatt, Jose5, Jose4) + the core-mantle swing amplitudes + the trend anchor `deltaTStart` | `dt-corrections-fit.js --joint --write` | `data/deltaT-4flag-fit.json` (coefficients, `optimum.deltaTStart`, the USNO closure), `data/core-mantle-resonator-stage1.json` | `npm run constants:generate` embeds them as `FIT.DT_STACK`, `FIT.DT_RESONATOR`, `FIT.DT_ANCHOR` |
| the climate formula (L1 lines on the engine's secular beats + L2 + L3, per regime) | `python3 scripts/milankovitch_climate_formula.py` (canonical) and `python3 scripts/export_climate_formula_browser.py` (the shipped browser coefficients) | `data/milankovitch-climate-formula.json`, `public/input/climate-formula-coefficients.json` | embedded as `FIT.CLIMATE_FORMULA_COEFFS` |

Everything else the registry quotes is DERIVED (the J2000 tropical year from
the IAU sidereal year and p_A; the year lengths, obliquity and perihelion of
date from the one-source movement; the planets from the N-body chain) or a
GOVERNED ARTIFACT with a recorded `inputs` block (`check:artifacts` names the
regeneration command when an input moved). The Earth–Moon distance history is
a CITED INPUT (`npm run import:astrogeo22 -- --fetch`), not a fit.

**The motion model carries NO fitted correction** (plan 09): any correction
ever added again to a scene-graph rotation (`moveModel`,
`tools/lib/scene-graph.js`) must be a BOUNDED harmonic basis on a named
physical period — never a polynomial in T. The failure case that set the rule:
a `+0.0003032·T²` term on the Sun's angle gave arcseconds at modern epochs and
83 rotations at ±10 Myr (CLAUDE.md, HARD RULES).

## Runtime conventions the fits are stated in

- **Days per year of date** are epoch-local, `T_tropical_s(t) / LOD_s(t)` (the
  day tracks the rotation period) — simulator `meanYearInDaysAtAge`, engine
  `deepLod.yearInDaysAtAge`, the website through the package. At J2000 both
  equal the IAU anchor; at ±100 Myr they differ from the SI `/86400` form by a
  few percent. `meanTropicalYearDaysAtAge` (SI days) exists for the
  Kepler-invariant scene JD and is not interchangeable with it.
- **The J2000 day is the SI day** (86,400 s), the day the IAU year inputs are
  stated in; the kinematic day of date is the Layer-0 tidal mean, exactly ω₀
  at J2000, and the ΔT joint fit closes on that same day (the
  `deltat-slope-basis` gate pins display ≡ integrand).
- **The sidereal year's J2000 anchor is the IAU value** 365.25636308 d in
  every runtime; the tropical year is derived from it and p_A.

## `--write` convention

Every fitter is a dry run by default (prints, writes nothing). `--write` ships
the artifact. After ANY fitter write: `npm run regen:cascade -- --run` — the
constants embed comes before the records, and the whole stale set regenerates
in order (CLAUDE.md: generate the constants LAST, run the cascade ONCE).

## Scripts

| script | produces | notes |
|---|---|---|
| `dt-corrections-fit.js` | `data/deltaT-4flag-fit.json`, `data/core-mantle-resonator-stage1.json` | `--joint` is THE fit: four flags + the swing in one equality-constrained solve (hard USNO closure row, amplitude caps, resonator phases locked as unit shapes, the free intercept = the trend anchor `deltaTStart`, shipped INSIDE this artifact). `DT_CORRECTIONS_DISABLED=1` is required for `--write` (the fit sees the absolute residual). Both artifacts carry an `inputs` block and are REQUIRED by `check:artifacts`; the cascade lists a stale fit as a by-hand step and never runs it — a re-close is a decision. The legacy single-shot cascade (`--write` without `--joint`) is a stage-wise diagnostic: never ship from it, and never judge a flag from its `fit_metrics.stage_*` (doc 105). |
| `validate-resonator.js` | `data/core-mantle-resonator-stage3-validation.json` | the OFF/ON validation sweep of the shipped world — run after every `--joint --write`: J2000 invariants, the USNO anchor, Stephenson/Espenak-window RMS, deep-time bit-identity ±200 Myr |
| `export-solar-measurements.js` (`npm run fit:6a2`) | `data/02-solar-measurements-window.csv` (gitignored) | the LIVING check artifact of the one-source movement: −4000…+4000, six events per year (the cardinal points, perihelion, aphelion), ~25 min. `npm run check:csv-smoke` recomputes the whole range into a scratch file and compares every row bit-exactly (local-only; fail-proven via `ESSRT_CSV_SMOKE_PLANT=1`). A mismatch means the movement changed: a bug, or an intended change → re-base with `fit:6a2` and say so in the commit. The full-period file (2 h 24 m) is retired; the exporter writes one on demand. |
| `sun-planetary-completion-fit.js` | nothing (read-only record) | the Step-0 companion against JPL Horizons (network; 20 h) — superseded by the DERIVED 70-term completion on the model's own carriers; its syzygy and centerline scoreboards remain valid verification. After any planet-record period change, re-run the N3 extraction chain (`tools/explore/n2-sun-framework-carriers.mjs` → `i2-sidereal-carrier-table.mjs`, `i2-long-inequality.mjs`) and re-embed the terms with `PAIRED_CARRIER_RATES_SHA256` in `eclipse/sun-planetary-completion.cjs` — the fingerprint gate fails until you do. |
| `../pipeline/import-astrogeo22.js` (`npm run import:astrogeo22`) | `data/astrogeo22-earth-moon.json` | the CITED Earth–Moon history (Farhat et al. 2022, AstroGeo22), verbatim with the source files' sha256; `--fetch` refreshes the gitignored cache. The distance column is the model's tidal history; the mean-obliquity column is its second read input. A new distributor solution is a MAJOR, never a side effect. |
| `../constants/generate.mjs` (`npm run constants:generate`) | `packages/physics/src/constants/*`, the embedded artifacts | the generated module `src/script.js` and the Node engine import; values verbatim, no rounding; `npm run test:constants` is the same generator in check mode |
| `run-pipeline.js` | — | the step runner (`--list`, `--from 6a2`): the live steps are 6a2, 7c, 7f, 7h, 7i, 8, 9; logs to `tools/results/pipeline.log` |
| `verify-pipeline.js` | — | pass/fail of the pipeline targets (the constants load, the scene graph, the planets' derived orientation, Earth's geometry) |
| `reclassify-tiers.js`, `fetch-jpl-data.js` | `data/reference-data.json` | the JPL reference-data tiers (Step 3's successor data path) |
| `python/_dump_constants.js`, `python/load_constants.py`, `python/artifact_inputs.py` | — | the Node→Python bridge (the Python scripts read the same constants as the Node tooling, no manual sync) and the Python inputs-block stamper |

## When a fit has to re-run

| what moved | what runs |
|---|---|
| a Bond / Hallstatt / Jose5 / Jose4 period (`period_yr`), the Stephenson 2016 polynomial (`public/input/stephenson-2016-deltaT-polynomial.json`), the tidal LOD physics, the GIA τ, the climate coefficients, the cited Earth–Moon history | the ΔT joint fit (`check:artifacts` names it: its inputs block hashes all of them), then the cascade |
| a planet record's period (`orbitalPeriodInputDays`, `moonSiderealMonthInput`, `yearLengthRef.siderealYear`) | the Sun-completion carriers ride these: the N3 extraction chain + the re-embed (fingerprint-gated) |
| the engine's frame of date (anything that moves the certified Sun's cardinal instants) | `npm run fit:6a2` + `npm run check:csv-smoke` |
| the L1 line set (`data/l1-physical-lines.json` — it moves with the pole rate's LR04-window mean, so with ANY change to the tidal history) | the climate chain: `l1_physical_lines.py --write` → `milankovitch_climate_formula.py` → `milankovitch_l1_line_audit.py` → `export_climate_formula_browser.py` — all cascade nodes since plan 13 |
| the Holocene taper (`_TAPER_*_HALFWIDTH_YR`) | nothing — applied at runtime, not in the fitted coefficients |

## The ΔT joint fit, end to end

```bash
DT_CORRECTIONS_DISABLED=1 node tools/fit/dt-corrections-fit.js --joint --write   # the fit + its anchors, stamped
node tools/fit/validate-resonator.js                                            # OFF/ON validation sweep
npm run regen:cascade -- --run      # constants LAST, then every stale record (eclipse-audit and lunar-alignment
                                    # REFUSE on divergence — `--write --rebaseline` is the conscious re-measurement)
npm run test:fixtures               # re-record ONLY if the change was intended, and say so in the commit
npm run values:package:write        # the registry → @essrt/model-values; then the version note and the publish (owner)
```

Diagnostic hooks — all refuse `--write`; with every one unset the output is
byte-identical to the shipped run:

| variable | effect |
|---|---|
| `DT_FIT_WINDOW="start:end[:step]"` | train on a sub-window; the held-out complement of −720…2017 is scored against an intercept-only baseline |
| `DT_FLAGS="bond,hallstatt,jose5,jose4"` | restrict the joint design matrix to a subset of flags |
| `DT_FIT_DUMP=<path>` | write the joint solution (coefficients, anchors, amplitudes) to a path |

Two traps with worked examples in [doc 105](../../docs/105-dt-stack-flag-audit.md):
never judge a flag from `fit_metrics.stage_*` (legacy cascade diagnostics that
rank the flags differently from `--joint`), and never judge Jose5 or Jose4
singly — they are a coupled pair; use leave-one-out.

The core-mantle swing's episode CONVENTION (T₀ ≈ 3,916 yr, Q = 1.8, kick
epochs −1600 / +1600, impulse-consistent shapes) is documented, not derived:
its evidence is `data/core-mantle-resonator-*.json` and doc 104; the amplitudes
refit automatically in the joint solve, the convention does not. The
stage-3 stability artifact says the kick epochs are not data-pinnable.

## Publishing to the website

The website carries no fitted tables of its own; it consumes two published
packages — `@essrt/physics` (the engine with the fitted coefficients embedded)
and `@essrt/model-values` (the rendered display keys the `<V k="…"/>` tags and
the paper macros read). A refit reaches it by regenerating and republishing,
never by file sync:

```bash
# 3d — after the fit and the cascade, gates green
npm run values:package:write                    # the registry → the package (and the doc stamps)
# bump the versions (two-axis contract, tools/verify/version-pinning.js), then
(cd packages/physics      && npm publish --access public --otp=…)
(cd packages/model-values && npm publish --access public --otp=…)
# holisticuniverse — consume
pnpm update @essrt/physics @essrt/model-values
npx tsx docs/paper/generate-tex-values.ts
```

`npm run values:package` (in `check`) fails naming any drifted key, and the
version-pinning gate refuses a model change without a paired version bump.

## Where things live

| what | where | who writes |
|---|---|---|
| the model's inputs | `public/input/astro-reference.json` (IAU / JPL / Meeus reference data, the LLR α₁, the GIA anchors, the scene epoch), `public/input/meeus-lunar-tables.json` | by hand, from the cited sources — the N-body node hashes astro-reference wholesale (a label edit costs its ~26-min re-stamp) |
| the fitted artifacts | `data/deltaT-4flag-fit.json`, `data/core-mantle-resonator-stage1.json`, `public/input/climate-formula-coefficients.json`; `data/deep-time-fitted.json` (the GIA τ only) | their fitters, `--write` |
| the cited history | `data/astrogeo22-earth-moon.json` | `npm run import:astrogeo22` |
| the generated constants | `packages/physics/src/constants/` + the embedded artifacts | `npm run constants:generate` |
| the window CSV | `data/02-solar-measurements-window.csv` (gitignored) | `npm run fit:6a2` |

## Related documentation

- [doc 105](../../docs/105-dt-stack-flag-audit.md) — the ΔT stack's flag audit (the two traps, worked)
- [doc 104](../../docs/104-millennial-rotation-swing.md) — the core-mantle swing
- [doc 92](../../docs/92-climate-formula.md) — the climate formula and its line set
- [doc 111](../../docs/111-measured-traps-and-gate-origins.md) — the measured traps behind every rule above
