# Holistic Universe Model — simulator

Geocentric solar-system model and 3D simulator implementing the Expanding Solar
System Resonance Theory (ESSRT). The model is analytic and parametric, valid
across ±500 Myr. [Preprint](https://doi.org/10.21203/rs.3.rs-8758810/v4) ·
[Live demo](https://3d.holisticuniverse.com)

**Scale:** `src/script.js` ~60,000 lines · `tools/` ~240 tracked JS scripts
across 9 directories (~360 on disk with the untracked local archives) · ~245 Python files · 47 docs (24 retired-machinery docs archived out of the tree — `docs/retired-record.md` is the public record; `docs/archive/retired/`, gitignored, holds the files — and the strip-and-restructure pass merged five more into their live homes) · two web UIs (simulator, `dashboard/`).
**`npm run check` enforces a twenty-four-step gate chain; CI runs it plus a
headless-browser job and auto-deploys the simulator to GitHub Pages on
green main.**
Golden masters live in `packages/fixtures/`. Of the 29 scripts in `tools/verify/`,
only 4 can actually fail — see the Verification section.

---

## HARD RULES

**Editing.** Propose every repo-file change before applying it (file, old → new),
then use Edit/Write. Never python/sed/cat on repo files. `src/script.js` needs
explicit confirmation. Reading, analysis, and regenerating artifacts via the
authoritative tool are exempt.

**Worktrees.** Structural work spanning many files or commits — a migration
phase, a refactor that might need abandoning wholesale — runs in a git worktree
(`EnterWorktree`), not the main tree. Abandoning is then a `remove`, never a
`git checkout` over a dirty tree. Two gotchas: a worktree branches from
`origin/main`, so **uncommitted work does not come with it** — commit first; and
it contains tracked files only, so the gitignored 160 MB CSV and `docs/archive/`
are **absent** inside one.

**No polynomial corrections.** Motion-model corrections stay harmonic on
the correction bases' fixed divisors of the anchor unit (bounded Fourier
bases, plan 06 P3). No T/T²/T³ — they compound at deep time and destroy the
bounded-basis property. A fitted linear slope fixes the fit window and is 41 min wrong at
−400 Ma.

**Rate vs point value.** A quantity valid AT A POINT is not valid ACROSS A SPAN.
For a drifting rate, `rectangle = 2 × integral` exactly. Four bugs of this one
class in a single week. The tell: a formula multiplying something by an elapsed
span — check whether the multiplicand is constant. See the `numerical-methods`
skill in `.claude/skills/`.

**Naming.**

| rule | why |
|---|---|
| Unit always in the name — `…Seconds`, `…Days`, `…Degrees`, `…Radians` | SI days ≠ LOD days |
| `divisor` and `period` are never interchangeable | two engines disagreed: 643,653 s error |
| Epoch parameter is always `year`, always first | argument/scene-state mismatch |
| One verb: `compute*` for derived quantities, `get*` for lookups | — |
| Frame in the name where ambiguous: `Geocentric`, `Ecliptic`, `ICRF`, `OfDate` | Moon frame-convention bugs |
| `…AtEpoch` suffix when epoch-dependent; absence means J2000-fixed | the kinematic/deep-time axis |
| Files `kebab-case`, one exported concept per file | already consistent in `tools/` |

**Fitters write the SHIPPED divisor set, never the greedy search result.** The
greedy pass is a diagnostic. This trap was present in **all three** fitters and
would silently churn a structural claim for a rounding-level gain.

---

## Traps worth not re-learning

- **`Verify at J2000: 0.0000″` is a TAUTOLOGY**, not validation — it re-evaluates
  at the anchor it derived from. It read clean while a shipped formula was
  0.2247″ off across 335,318 rows. Real gate: shipped coefficients against rows
  the fit never saw, decomposed as `RMS² = bias² + scatter²`.
- **Errors can CANCEL.** Two rectangle-vs-integral bugs were equal and opposite;
  fixing either alone sent a fit from ~5.6 min to 1162 min. If a fix makes an
  unrelated gate go red, suspect a second compensating error before suspecting
  the new code.
- **Stability and a small formal SE are not evidence of correctness.** An
  ill-conditioned regressor returned a rock-stable, tiny-SE, completely wrong
  amplitude of 5.06 against a true value of 1.0.
- **A term can be negligible against the signal and dominant against the residual.**
- **Declination is blind to a longitude error at the solstices** and maximally
  sensitive at the equinoxes — fastest way to classify a discrepancy.
- **Agreement at the anchor with divergence away from it = stale coefficients**,
  not a formula bug.
- **Capture a baseline before touching shared machinery.** Two minutes; it has
  caught a 583.7″ regression.
- `data/02-solar-measurements.csv` is 160 MB and gitignored — no git recovery.
  Back it up before regenerating (2 h 24 m). It is the C-4b-era campaign
  record and KNOWN STALE vs the post-C-4b movement arcs (D4c/D4d-rev;
  measured SS@−997 off 2.9 h) — the LIVING check is Step 6a2
  (`npm run fit:6a2` → the ~48k-row window CSV) + `npm run check:csv-smoke`
  (bit-exact window compare, fail-proven; tools/fit/README Step 6a2).
- **The deep-time alignment campaign is COMPLETE** — engine ≡ CSV bit-exact
  AS OF ITS ERA (the claim is historically scoped: the CSV is the C-4b-era
  record and the post-C-4b movement arcs moved the engine — see the CSV
  bullet below; Step 6a2 + check:csv-smoke are the living check), all
  sixteen R-items closed, the cardinal-point fit (now Step 6d; "6c" in
  campaign-era docs) at 0.26–0.29 min over ±270 kyr (Earth-frame) via the §10
  derived form + edge-trim + the §10g quadrature-locked joint sidebands. Do
  not regenerate the full CSV outside a conscious campaign step (2 h 24 m,
  and it would NOT be an identical file anymore). Coefficients and
  runtime evaluation form are a MATCHED PAIR — never ship one without the
  other (~1162-minute-class error), and the pair includes the NUMERICS: the
  ∫1/H convention is the 10-kyr trapezoid table, built under the pinned
  lattice α. Both campaign plans are archived in
  `docs/archive/old-documents/` (untracked).
- **The §10g minus sign is load-bearing.** Joint sideband phase is
  order·λ_X − 2π·div·c, COUNTER-rotating; the co-rotating sense captures
  nothing (measured — the sign experiment, doc 99 "braid law"). Do not "fix"
  it, in any of the three runtimes.
- **A purity freeze needs its pure twin.** Freezing a mutable-global read to
  a J2000 const without wiring in the epoch-aware f(Y) replacement silently
  freezes deep time (the solar-day panel read 86400.006 where the model says
  86400.156). The epoch-consistency gate now pins the invariant; extend it
  when adding f(Y) evaluators.
- **A cache that changes resolution is mutable state.** The one-source
  movement's grown grid replaced its 100-yr tier with the 1000/5000-yr one
  after any deep-time probe; rates read through it (±0.5-yr central
  differences) became grid-segment averages — the anomalistic year read
  +2.6 s, visit-order dependent, and 18 browser goldens were recorded
  contaminated (exposed by the early-recorded "Fresh" twin of the same JD).
  Per-tier routing + the fail-proven `test:sampler-purity` gate pin the
  class: values pure in `year`.
- **A displayed rate must name its window.** The engine's ϖ̇ reads
  11.544/11.616/11.624/11.696 ″/yr depending on evaluator and stencil
  (100-kyr window mean / chain tangent / series year-over-year / deep-mode
  tail); two panel surfaces showing different windows of the same rate split
  111,491 vs 111,570 yr. Surfaces quoting one physical rate ride ONE family —
  the anomalistic takes the chain tangent the Prec. cell shows
  (`computeApsidalSecularDegPerYr`, one home). Second measured instance
  (C1): a mean motion FITTED over a window shorter than a resonant
  inequality absorbs the inequality's local phase slope into the mean
  term — the chain's 300-yr `windowElementRates` gave Neptune 164.71 yr
  where the secular (2-kyr-boxcar) λ̇ matches JPL's 164.79; the period
  rows ride the banked λ̇ channel, the split is banked as measurement
  (`verdict.planetLamDot`).
- **Orbital quantities ride the μ-tier, spin quantities the H-tier.** The
  retired device scaled planet periods by H(t)·mSY — mixing the recession
  driver (Earth spin: precession, LOD) into an orbital quantity. The
  proper deep-time stretch for ANY heliocentric period is the ONE Driver-2
  solar-mass law (planet-independence is exact at the two-body level),
  composed with the body's own constant-GM N-body drift — Earth's D6
  sidereal-year channel is the pattern (`T(y) = massLossLaw(y)/lamDotRel(y)`,
  every factor ≡ 1 at J2000).
- **A fit-window edge phase-locked to the lattice masquerades as physics.**
  The "e(t)-minimum residual peak" was window-edge divergence — both bracket
  ends sit at H/16 phase ≈ 0°. Check the edge/interior split before believing
  any phase-binned feature; the cardinal-point fitter (Step 6d) edge-trims
  8%/side for this reason.
- **A structural list has ONE home.** The L1 divisor list lived in
  `milankovitch_climate_formula.py` — and in twelve hard-coded copies (eight
  test scripts, the four variance-budget scripts) that a ledger-driven re-run
  could not see, plus a registry key whose note said "kept for the family
  table". When a structural set changes, grep for the **literal list**, not
  for imports; a registry key carrying a "kept for X" exception IS the stale
  value — fix the key, not its consumers.
- **A number a doc cannot reproduce from an artifact gets written BY the
  script**, not re-derived in a generator. Two guesses at the §4.7 f_ice
  recipe gave 0.70 and 0.73 against the documented 0.77; the script's own
  recipe (stored since) reproduces it exactly. Docs 92/97 result tables are
  now generated blocks (`npm run docs:tables`) for the same reason.

---

## Verification

`npm run check` is the enforced chain — lint (§4 boundaries), typecheck (JSDoc +
`checkJs`), `check:boundaries` (the §2h licensing invariant), purity,
`test:fixtures` (the `tools/lib` golden masters + the plan-06 baseline —
the H-carrying quantities on the ±26-kyr wander window and the deep-time
anchors, bit-exact across the lunisolar-clock restatement),
`test:vocabulary` (the retired-vocabulary RATCHET — plan 06 §7 D3 terms may
only leave presentation surfaces, never re-enter; `--report` prints the
sweep worklist, `--root DIR` adds the website's EN pages), `check:artifacts` (generated
campaign artifacts vs their recorded input hashes — fails naming the exact
regeneration command), `check:data` (every tracked dataset manifest-covered
in PROVENANCE.md), `values:package` (the published @essrt/model-values ≡
the live registry), `test:verify` (the model gates).
Every gate has been shown to **fail on a planted violation**, not merely to pass
on clean code — the two fixture gates on a 1-ULP change, ~1.6e-16 relative. Lint
and typecheck cover `packages/` and `test/`; `src/script.js` and `tools/` are
pre-migration and join as Phase 8 extracts.

**Scoped tiers** (measured: the full chain is ~8.6 min, and 96% of it is
`test:pipeline` re-running the fitter cores + `test:fixtures` recomputing the
golden masters — steps a docs/registry edit cannot affect). Pick by what the
change touches; CI runs the FULL chain on every push regardless, so the full
local run is only needed when the change touches what the heavy steps verify:

| changed | local gate | ~time |
|---|---|---|
| `tools/docs/`, `docs/*.md`, markers, the generated table blocks of docs 92/97/110 (`docs:tables`; doc 110 = the calculation map, values script-written) | `npm run check:docs` | ~20 s |
| `tools/lib/`, `packages/physics/` | `npm run check:engine` | ~2 min |
| ANY `public/input/*.json` (even a label — the constants hash embeds them wholesale), `packages/fitting/`, `src/script.js`, `tools/constants/` | full `npm run check` | ~9 min |

`npm run test:browser` runs the `src/script.js` golden masters in headless
Chromium — the only tier that guards Phase 8, which dissolves that file —
plus the epoch-consistency gate (pure f(Y) evaluators ≡ the epoch-anchor
chain at ±1/±5 Myr; the golden master cannot catch that class), plus
`test:perf` — the deep-time performance gate (RATIO thresholds, deep vs
in-table cost, runner-speed independent; born from four ungated ratio
regressions, one owner-bisected at 28×; fail-proven via
`ESSRT_PERF_TIGHTEN=0.01`).
`npm run test:transparency` is the Phase 6 acceptance gate — **green (84/84,
round-trip bit-exact) since Phase B** and required in CI; red there is a
regression of the Phase 6 exit criterion, not a tracked state.

`/gates` runs the standalone model checks. `tools/verify/` holds 29 scripts, and
**25 of them cannot fail** — no exit path, no assertion, so running them proves
nothing. `npm run test:verify:list` gives the classification: 4 gate · 3 liftable
· 12 narrative · 10 generator (the suite FAILS on any unclassified script). **Never
run a generator as a test** — `balance-search.js` rewrites the tracked
`data/balance-presets.json`, `nbody-secular.js` rewrites
`data/nbody-secular-frequencies.json`, `deep-secular-modes.js` rewrites
`data/nbody-deep-secular-modes.json`, `secular-series.js` rewrites
`data/nbody-secular-series.json`, `obliquity-hybrid.js` rewrites
`data/obliquity-hybrid-verdict.json`, `measure-rms-by-epoch.js` rewrites
`data/chain-vs-jpl-rms.json` under `--write` (a plain run only prints), and
the four campaign generators (cassini-results / lod-climate-correlation /
eclipse-audit / lunar-alignment) rewrite their `data/*.json` under
`--write` (the latter two REFUSE on divergence; `--rebaseline` is the
conscious re-measurement path).

**The integer-law retirement.** `verify-laws`, `dual-balance-optimizer` and
`config1-proof` are narrative class (kept as the record, no longer gates): the
structural claims they gated — exact eccentricity balance, the Saturn
e-prediction, Config #7 mirror uniqueness, the node integers — were
re-evaluated with the engine's own dynamical inputs
(`tools/explore/balance-with-dynamical-nodes.mjs`; doc 109 is the evidence
record) and retired. What survives as a documented observation: under the
retired integer weights the 8-planet eccentricity balance holds to ~98 % with the
engine's long-term mean eccentricities (99.8636 % was the tuned-inputs
figure). **The planet chains moved to engine-D elements (the P5 flip,
9aa91a6), and the legacy geometric planet path was EXCISED (K5,
c0399f6): the chain is the ONLY planet path** — the simulator renders
the seven planets, their orbit rings, traces, perihelion markers, panels
and the invariable-plane machinery (heights, mass gauge, Sun-SSB) from
the model's own N-body chain (`@essrt/physics/planets/keplerian-chain` +
the governed artifact). The fitted correction stack (parallax /
gravitation / elongation — keys, evaluators, fitters ex-Steps 2/5a-5b)
is deleted; docs/retired-record.md + git history carry its record. The Law-4/Law-5
constants (`K = 3.4143e-6`; base eccentricities from the balance
construction) survive only in the legacy scene scaffolding (device
anchors, the no-chain bodies Pluto/Halley/Eros, and the o.fib*
diagnostics). Earth, the Moon and the Sun stay on the engine-K
hierarchy — the two-engine interface; the historical gate suite is
calibrated on it.

**The falsification criterion.** The model stands falsifiable on three named,
pre-registered legs: (1) **the deep-time scaling split** — the axial
precession must follow the COMPOSED lunisolar rate
ψ̇(t) = [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³] (spin from the recession
history, the lunar torque growing on the Moon's distance; ONE home
`@essrt/physics/earth/precession-composed`; its J2000 anchor p₀ is the
model's ONE J2000 precession reading, the certified year laws' beat at 2000
= 25,771.4 yr ≈ IAU — plan 06 S5; **H(t) is the internal UNIT that scales
WITH this period but is NOT 13 of them** (H₀/T_p = 13.011: H₀ was fitted on
the perihelion-of-date beat, so H/13 = 25,793.6 was the fit anchor's
reading, 0.086 % slow, never a period; `hAtAge` in `deltat/deep-time.cjs`,
plan 06 D6/Phase 3/S5), **the obliquity band must follow the beat
2π/(ψ̇(t) − |s₃|)** (s₃ at its dynamical value under the measured
solar-mass history — degenerate today with the pure precession-scaling
reading "obliquity period ∝ T_p", roughly a factor two apart at 2.46 Ga;
registry keys `obliqBeat*Kyr` / `obliqH8Scaled*Kyr` (name kept), doc 109
§18). **Two named counters** (plan 06 D8): the FROZEN era clock, the
year-length comb family and the ∫dt/H phase table ride their own fitted
convention `eraClockHAtAge` = H₀·LOD/LOD₀ (pure spin scaling, the
pre-Phase-3 "H/13 identity", shipped with their coefficients as a device
constant — `docs/retired-record.md` carries the retired claim: it read
~35 % low against Lantink 2022 at 2.46 Ga); never call it H(t). The
long-eccentricity band stays at its modern class (scaled
only by the measured solar-mass history); every newly dated Precambrian
cyclostratigraphic section tests these halves (the precession side is
GATED at 1.4 and 2.46 Ga — paleo-anchors rows `xiamaling-prec-1400` /
`lantink-prec-2460`, which the structural clock fails; the deep obliquity
PERIOD is the pre-registered, not-yet-discriminated prediction), and a
section violating any half falsifies the corresponding tier. (2) **Historical-era exactness** — the fail-proven gate
suite: eclipses (`eclipse-audit`), the LOD/ΔT stack, cardinal points, the
41-anchor paleo bands (`paleo-anchors`, where an unexplained *improvement*
fails too). (3) **Two-expansions μ-consistency** — the rock-measured
long-eccentricity period must track 405.6 kyr / μ^1.153 (the engine-measured
beat response, W5; 1/μ is the first-order case) under the measured solar
mass history (currently μ(2.48 Ga) = 1.00 ± 0.07, quoted through the
conservative first-order slope). The former Config-#7
criterion (checks 46–50 of `verify-laws`, the mirror-unique configuration in
`data/balance-presets.json`) is retired with its record.

## Skills

`.claude/skills/` holds two sets, both loaded automatically:

- **6 project skills** — the domain rules L-GEVITY excludes, each built from
  measured bugs here: `numerical-methods`, `units-and-frames`,
  `scientific-validation`, `fitting-pipeline`, `provenance-reproducibility`,
  `improvement-evidence`. (`/gates` is a command, not a skill.)
- **19 from `l-gevity-skills`** (MIT, pinned in `l-gevity-skills.lock.json`) —
  generic architecture judgement, the A.L.C.H.E.M.Y. gates M→A→L→C→E→H→Y.
  Invoke a full pass with `/alchemy`; the `alchemy` skill owns the dispatch
  protocol, so it is not restated here.

Skills activate on description match — you never name them. Where the two sets
overlap, the generic one owns the method and the project one carries the
evidence: `continuous-improvement` is the protocol, `improvement-evidence` is
what actually made corrections stick here.

## Key paths

| path | what |
|---|---|
| `src/script.js` | browser scene + UI + formulas (monolith) |
| `tools/lib/` | Node engine — `scene-graph`, `orbital-engine`, `deep-time`, `constants` |
| `tools/fit/` | CLI shims for the fitting pipeline — implementations live in `packages/fitting/src` |
| `tools/verify/` | 29 scripts: 4 gate · 3 liftable · 12 narrative · 10 generator (`npm run test:verify:list`) |
| `packages/physics`, `packages/model-values` | the published npm packages (@essrt scope) — the website and world consume these; refits reach them via `values:package:write` + republish |
| `tools/explore/` | ~200 research one-offs — findings live in `docs/` |
| `public/input/fitted-coefficients.json` | single source of truth for fitted values |
| `docs/` | 75 numbered docs; `40-architecture`, `99-essrt` are cross-referenced |

The simulator at 3d.holisticuniverse.com auto-deploys from every green main
push (the Pages job in ci.yml) — nothing is hand-uploaded anywhere.

## Working notes

Current state, active plans and work-in-progress live in the private
`holisticuniverse` repo under `docs/plans/` — not in this repo.

## Licence

AGPL-3.0 (see `LICENSE`). Derivative works must stay open and attributed; if you
run a modified version as a network service you must publish your source. A
commercial licence is available — dennis@holisticuniverse.com
