# Expanding Solar System Resonance Theory (ESSRT) — simulator

Geocentric solar-system model and 3D simulator implementing the Expanding Solar
System Resonance Theory (ESSRT). The model is analytic and parametric, valid
across ±500 Myr. [Preprint](https://doi.org/10.21203/rs.3.rs-8758810/v4) ·
[Live demo](https://3d.holisticuniverse.com)

**Scale:** `src/script.js` ~37,000 lines (the console-test folder, 13,000 lines, retired in plan 18 — its checks are gates; plan 20 took ~2,600 lines of dead code out) · `tools/` ~185 tracked scripts
across 12 directories (plus the untracked local archives) · ~40 Python files · 31 docs (the retired docs and the record sections cut from the live ones are archived out of the tree to `docs/archive/retired/`, gitignored — git history carries their diffs) · one web UI (the simulator; the Data Explorer dashboard is retired).
**`npm run check` is the enforced gate chain — the ONE list in package.json;
CI runs it plus a headless-browser job and auto-deploys the simulator to
GitHub Pages on green main.** Golden masters live in `packages/fixtures/`.
`tools/verify/` holds gates and generators only (`npm run test:verify:list`
for the classification and counts).

**The measurements behind every rule below live in [doc 111](docs/111-measured-traps-and-gate-origins.md)**
(traps §1, the browser tier's gates §2, the falsification criterion's long
form §3) and [doc 109 §23](docs/109-model-nbody-engine.md)
(the planet-channel and era-device retirements). This file carries the rules;
doc 111 carries the numbers — they are a matched pair: move a rule and its
measurement together.

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
it contains tracked files only, so the gitignored window CSV, the ±10-Myr dump
and `docs/archive/` are **absent** inside one (symlink the dump from main
before a cascade).

**No polynomial corrections.** The motion model carries no fitted correction
since plan 09 (the frozen era device — its unit, counters and combs — is
deleted; the movements are the composed precession clock and the N-body
series). Any future correction stays a BOUNDED harmonic basis on a named
physical period. No T/T²/T³ — they compound at deep time and destroy the
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
| Epoch-dependent quantities say so: `…AtYear(year)` (decimal year, the engine year) or `…AtAge(tMa)` (age in Myr before J2000, `tMa` the one spelling); a name without either is a J2000 constant (`…J2000…`) | the kinematic/deep-time axis — the practice the code settled on (`…AtAge` 111, `…AtYear` 40, `…AtEpoch` 4 names) |
| Files `kebab-case`, one exported concept per file | already consistent in `tools/` |

**Fitters write the SHIPPED term set, never the greedy search result.** The
greedy pass is a diagnostic. This trap was present in **all three** fitters and
would silently churn a structural claim for a rounding-level gain.

**One home.** A formula, a structural list or a constant lives in ONE module
and every twin reads it (plan 13 B1–B3: `@essrt/physics` `time/calendar`,
`math/angles`, `earth/mass-chain`, `constants/units`, `deltat/deep-time-chain`;
`tools/lib/constants.js` keeps its export NAMES and re-sources them). When a
structural set changes, grep for the **literal**, not for imports (doc 111 §1.18).

**Generate the constants LAST and run the cascade ONCE.** After any input,
fitter or generator change: `npm run regen:cascade` (`--run`) regenerates every
stale artifact in order with the constants module in its place; never stop a
running generator to save a pass (doc 111 §1.24); after ANY fitter write the
constants embed comes before the records (doc 111 §1.19).

---

## Traps worth not re-learning

Each line names the rule; doc 111 §1.n carries the measurement.

- **`Verify at J2000: 0.0000″` is a TAUTOLOGY**, not validation — it re-evaluates
  at the anchor it derived from. Real gate: shipped coefficients against rows
  the fit never saw, decomposed as `RMS² = bias² + scatter²`. (§1.1)
- **Errors can CANCEL.** If a fix makes an unrelated gate go red, suspect a
  second compensating error before suspecting the new code. (§1.2)
- **Stability and a small formal SE are not evidence of correctness.** (§1.3)
- **A term can be negligible against the signal and dominant against the residual.**
- **Declination is blind to a longitude error at the solstices** and maximally
  sensitive at the equinoxes — fastest way to classify a discrepancy. (§1.4)
- **Agreement at the anchor with divergence away from it = stale coefficients**,
  not a formula bug.
- **Capture a baseline before touching shared machinery.** (§1.5)
- **The solar-measurements check is the WINDOW CSV** — `npm run fit:6a2` +
  `npm run check:csv-smoke`, regenerated whenever the engine's frame of date
  moves; the 160 MB full-period file is retired. (§1.6)
- **Coefficients, runtime evaluation form AND numerics are a MATCHED PAIR** —
  never ship one without the other (~1162-minute-class error). (§1.7)
- **The braid law's counter-rotating sign is physics, not convention.** (§1.8)
- **A purity freeze needs its pure twin** — a J2000 const without its
  epoch-aware f(Y) replacement silently freezes deep time; the
  epoch-consistency gate pins it. (§1.9)
- **A cache that changes resolution is mutable state** — values pure in `year`;
  `test:sampler-purity`. (§1.10)
- **A displayed rate must name its window** — surfaces quoting one physical
  rate ride ONE family; a mean motion fitted over a window shorter than a
  resonant inequality absorbs its phase slope. (§1.11)
- **Orbital quantities ride the μ-tier, spin quantities the H-tier** — the deep-
  time stretch of ANY heliocentric period is the ONE solar-mass law composed
  with the body's constant-GM N-body drift. (§1.12)
- **The secular law is not the rate of date** — the spin integration multiplies
  the composed ψ̇(t) by the eccentricity-of-date torque factor and J₂(t)/J₂₀,
  both 1 at J2000; `equinox-vs-vondrak.js` refuses to write if one is dropped. (§1.13)
- **The scene is the reference — and it needs its own instrument** — sample the
  scene twin with the exporter's own event definitions and read cumulative
  angles against TT; gate `scene-year-lengths.js`. (§1.14)
- **A term's amplitude is a function of the elements, not a constant** — derive
  over the window the rows are used in; test window independence on the
  COMPOSED function; a term with Σk ≠ ±1 stays a constant row with its window
  named. (§1.15)
- **A campaign recording hashes what it RUNS ON, or it goes stale unseen** —
  after a model change run the campaign generators plain even when the
  freshness gate passes. (§1.16)
- **A fit-window edge phase-locked to the lattice masquerades as physics** —
  check the edge/interior split before believing a phase-binned feature. (§1.17)
- **A structural list has ONE home** — grep for the literal list; a registry key
  carrying a "kept for X" exception IS the stale value. (§1.18)
- **The records run on the EMBEDDED coefficients, not the JSON** — after ANY
  fitter write: `constants:generate` FIRST, then the records. (§1.19)
- **A comb on H-divisors cannot carry a secular drift** — a timeline is the
  integral of the published rate of date, never a comb; `13/H`, `H/13`,
  `N·(H/H₀)²` in a physics formula stand in for 1/T_p(t); a tolerance wide
  enough to pass a known gap cannot see it closing. (§1.20)
- **A number a doc cannot reproduce from an artifact gets written BY the
  script** (`npm run docs:tables`). (§1.21)
- **Two precession rates, two uses — name which one a line carries** (p₀ for
  the tropical year and the climatic-precession lines, ψ̇ᵢₙ for the obliquity
  family); a RECORD sees the pole rate's WINDOW MEAN, not the J2000 instant;
  derive line rates from the shipped configuration. (§1.22)
- **Run a fitter at its own fit commit before blaming the engine** — a fit's
  commit carries the fitter, its seed and its bounds. (§1.23)
- **A generator stopped between its two writes leaves a VALID-LOOKING artifact**
  the freshness gate cannot see — diff the artifact's KEYS against HEAD before a
  cascade. (§1.24)
- **"Placed by the engine every frame" does not cover what was aligned ONCE at
  init** — grep the top-level `matrixWorld` readers before deleting a pose. (§1.25)
- **A precession CONSTANT is not a precession RATE** — the composed law scales
  the constant α(t); the rate is α(t)·cos ε̄(t) on the cited mean obliquity of
  date; and at a series seam the pole continues through n̂, never through its
  mean plane. (§1.26)
- **A mean series is anchored on its OWN mean, never on an osculating snapshot**
  — the snapshot's wobble phase comes back out as a "measured constant"; and a
  moving average of a rotating, curving vector is taken in the co-rotating
  frame as a local quadratic — a Cartesian boxcar is biased at every node
  (2.2e-6 + 1.1e-6 in e, −24″ in ϖ at 1 kyr). The swap gate is the external
  referee's sd on the whole span. (§1.27)

---

## Verification

`npm run check` is the enforced chain — lint, typecheck, `check:boundaries`
(the §2h licensing invariant), purity, `test:calendar` (the one-home
calendar/angle helpers against the legacy bodies), the layer gates
(`test:layer0`, `test:cited-history`, `test:layer1`), `test:constants` (the
embed ≡ its sources), `test:counterfactual` (a changed input gives a changed,
reproducible result with its own hash), `test:planet-model` and `test:model`
(the planet model and `createModel()` ≡ the shipped Node derivation,
bit-exact), `test:sampler-purity` (values pure in `year`, visit-order
independent), `test:spin-channel`, `test:api` and `test:mcp` (the published
API and MCP server end to end), `test:fixtures` (the `tools/lib`
golden masters + the plan-06 baseline), `test:literals` (script.js literals vs
the JSON source of truth; the retired-input ratchet), `test:vocabulary` (the
retired-vocabulary RATCHET — the docs and READMEs, and since plan 16 the
code's comments and label strings; counts may only fall), `test:docs-fresh`, `check:artifacts` (generated
artifacts vs their recorded input hashes — fails naming the exact regeneration
command), `check:data` (every tracked dataset manifest-covered in
PROVENANCE.md), `docs:values` / `docs:tables` (the script-written numbers in
docs), `values:package` (the published @essrt/model-values ≡ the live
registry, plus PLAUSIBILITY rows), `test:verify` (the model gates),
`test:py-physics` (no Python defines model physics outside the ledger),
`test:py-smoke`, `test:pipeline`. Every gate has been shown to **fail on a
planted violation**, not merely to pass on clean code — the fixture gates on a
1-ULP change (~1.6e-16 relative); the plant variables are listed per gate in
doc 111 §2. Lint covers `packages/`, `test/` and — since plan 20, with the
recommended correctness set (`no-undef` found two ReferenceErrors on live UI
paths no gate saw, `no-unused-vars` 274 dead symbols) — `src/script.js`;
typecheck covers `packages/` and `test/`; `tools/` is pre-migration and joins
when `tools/lib` collapses to adapters.

**Scoped tiers** (measured step by step, plan 18 step 0: the full chain
4.4 min, of which `test:fixtures` 2.0 min — 1.8 of it the plan-06 baseline's
four deep-time rows — and `test:verify` 1.1 min — 56 s of it the
scene-sampled `scene-year-lengths` gate; the browser tier 2.5 min with no
single hotspot). Pick by what the change touches; CI runs `npm run check`
itself on every push:

| changed | local gate | ~time |
|---|---|---|
| `tools/docs/`, `docs/*.md`, markers, the generated table blocks of docs 92/110 (`docs:tables`; doc 110 = the calculation map, values script-written) | `npm run check:docs` | ~40 s |
| `tools/lib/`, `packages/physics/` | the full `npm run check` (the former `check:engine` tier, once it carried every gate that reads the package — `test:model`, the calendar, API, MCP and Python gates it had omitted — cost as much as the chain and was dropped in plan 18) | ~4.4 min |
| ANY `public/input/*.json` (even a label — the constants hash embeds them wholesale and the N-body node re-stamps, ~30 min), `packages/fitting/`, `src/script.js`, `tools/constants/` | `npm run regen:cascade -- --run` (the `--` is required: without it npm keeps the flag and the script prints a DRY RUN), then full `npm run check` | ~4.4 min + the cascade |

`npm run test:browser` runs the `src/script.js` golden masters in headless
Chromium — the only tier that guards Phase 8 — plus the epoch-consistency
gate, `test:perf` (ratio thresholds, travel-speed, paused-idle and
monitor-polling rows) and the `test:snapshot` chain (`chart-export`,
`tools-panels` — every Tools panel and every Framework Verification
category —, `reports-export` — the three Reports exporters headless on a
stubbed SheetJS —, `perihelion-at-sun`, the star-field init alignment, the
orbit-plane grid at the Sun, the Planet Info eye, the chip-click wake, the
wobble-centre trace). What each row guards and the owner report it was born
from: doc 111 §2. `npm run test:transparency` is the Phase 6 acceptance gate
(green 84/84 since Phase B, required in CI).

`/gates` runs the standalone model checks. **Never run a generator as a
test** — every script in `tools/verify/` either FAILS or WRITES: the N-body
trio (`nbody-secular.js`, `deep-secular-modes.js`, `secular-series.js`),
`obliquity-hybrid.js` (REFUSES if the realized obliquity period parts from the
window-mean prediction), `measure-rms-by-epoch.js` and `equinox-vs-vondrak.js`
(write under `--write`; the latter REFUSES if a precession-of-date factor is
missing), the five campaign generators (cassini-results /
lod-climate-correlation / eclipse-audit / lunar-alignment /
lunar-canon-recall — the latter three REFUSE on divergence; `--write
--rebaseline` is the conscious re-measurement path), the Horizons
comparison (`sun-vs-horizons.js` — the Sun tier's swap gate) and the
panel's osculating-orbit exhibit table (`earth-osculating-wobble.js` —
REFUSES if the lab's mean parts from the series'). `npm run regen:cascade`
lists the stale generators in regeneration order; `npm run
test:verify:list` the full classification (13 generators, 6 gates).

**The planet-channel and era-device retirements** (plans 07, 09, 11: the
integer laws, the ψ/K device, the combs, the K-device pose, the
`windowAffine` bound, the chain as the ONLY planet path) are recorded in
doc 109 §23. Earth, the Moon and the Sun stay on the engine-K hierarchy — the
two-engine interface; the historical gate suite is calibrated on it.

**The falsification criterion.** Three named, pre-registered legs (long form,
derivation history and the retired fourth leg: doc 111 §3):

1. **The deep-time scaling split** — the axial precession follows the COMPOSED
   lunisolar rate ψ̇(t) = [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³] ×
   cos ε̄(t)/cos ε̄(0) on the CITED Earth–Moon history (Farhat et al. 2022: the
   distance, plan 12 option A, and the mean obliquity ε̄(t), plan 12 §8 (a) —
   the bracket is the precession CONSTANT's scaling, which the hybrid obliquity
   integration takes; the cosine makes it the RATE; ONE home
   `@essrt/physics/earth/precession-composed`; p₀ the IAU 2006 p_A,
   T_p(t) the published deep-time clock); the obliquity band follows the beat
   2π/(ψ̇ᵢₙ(t) − |s₃|) with ψ̇ᵢₙ the spin axis's INERTIAL rate (a record sees
   its WINDOW MEAN); the long-eccentricity band stays at its modern class,
   scaled only by the measured solar-mass history. Gated at 1.4 and 2.46 Ga
   (`paleo-anchors` rows `xiamaling-prec-1400` / `lantink-prec-2460`); the
   deep obliquity PERIOD is the pre-registered, not-yet-discriminated
   prediction. A Precambrian section violating either half falsifies its tier.
2. **Historical-era exactness** — the fail-proven gate suite: eclipses, the
   LOD/ΔT stack, cardinal points, the 45-anchor paleo bands (an unexplained
   *improvement* fails too; the Mesoproterozoic 2.5–3.6σ gap to Zhou 2024's
   precession constants is the stated open discrepancy).
3. **Two-expansions μ-consistency** — the rock-measured long-eccentricity
   period tracks 405.6 kyr / μ^1.153 under the measured solar-mass history
   (μ(2.48 Ga) = 1.00 ± 0.07).

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
| `tools/lib/` | Node engine — `scene-graph`, `orbital-engine`, `deep-time` (a thin consumer of the package's `deltat/deep-time-chain` since plan 13 B2), `constants` (export names fixed; re-sourced from the package's one-home helpers) |
| `tools/fit/` | CLI shims for the fitting pipeline — implementations live in `packages/fitting/src` |
| `tools/verify/` | the gates and the artifact generators — every script fails or writes (`npm run test:verify:list` for the counts; `npm run regen:cascade` for the stale set in order) |
| `packages/physics`, `packages/model-values` | the published npm packages (@essrt scope) — the website and world consume these; refits reach them via `values:package:write` + republish. One-home helpers (plan 13 B1–B3): `time/calendar`, `math/angles`, `earth/mass-chain`, `constants/units`, `deltat/deep-time-chain`. `src/model.js` is a COMPOSER: `createModel()`'s assembly runs the named slices of `src/model/` in dependency order on one shared context (plan 15 — a quantity is found by its slice's filename: `one-source-movement`, `lunar-theory`, `sun-and-eclipses`, `surface`, …; the seven forward bindings are the typed `late` set in `model/context.js`). The five generators that run on the model hash the composer AND every slice (`modelSourceFiles()` in `tools/lib/artifact-inputs.js`) |
| `tools/explore/` | frozen research one-offs (and the print-only scripts that left `tools/verify/`) — findings live in `docs/`; a script stays only while something names it (its README states the rule) |
| `data/deltaT-4flag-fit.json`, `data/core-mantle-resonator-stage1.json`, `public/input/climate-formula-coefficients.json`, `data/deep-time-fitted.json` | the shipped fitted artifacts, each its fitter's (the last holds the GIA τ only since plan 12) — embedded by `generate.mjs`. The ΔT pair is GOVERNED (plan 12 §1b close-out): the joint `--write` stamps an `inputs` block, `check:artifacts` fails when the physics it was fitted on moves, and `regen:cascade` lists the stale fit as a by-hand step — a re-close is a decision, never an automatic regeneration. The anchor `deltaTStart` ships INSIDE the fit artifact (`FIT.DT_ANCHOR`), never in astro-reference — a re-close no longer re-stamps the N-body node |
| `data/astrogeo22-earth-moon.json` | the CITED Earth–Moon distance history (Farhat et al. 2022, AstroGeo22; `npm run import:astrogeo22`) — embedded as `deltat/moon-distance-artifact.cjs`, read by `deltat/moon-distance-history.cjs` (plan 12 option A) |
| `docs/` | the numbered docs (`00-readme` is the index); `40-architecture`, `99-essrt`, `110-calculation-map`, `111-measured-traps-and-gate-origins` are cross-referenced |

The simulator at 3d.holisticuniverse.com auto-deploys from every green main
push (the Pages job in ci.yml) — nothing is hand-uploaded anywhere.

## Working notes

Current state, active plans and work-in-progress live in the private
`holisticuniverse` repo under `docs/plans/` — not in this repo.

## Licence

AGPL-3.0 (see `LICENSE`). Derivative works must stay open and attributed; if you
run a modified version as a network service you must publish your source. A
commercial licence is available — dennis@holisticuniverse.com
