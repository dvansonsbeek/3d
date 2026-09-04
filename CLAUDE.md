# Holistic Universe Model — simulator

Geocentric solar-system model and 3D simulator implementing the Expanding Solar
System Resonance Theory (ESSRT). The model is analytic and parametric, valid
across ±500 Myr. [Preprint](https://doi.org/10.21203/rs.3.rs-8758810/v4) ·
[Live demo](https://3d.holisticuniverse.com)

**Scale:** `src/script.js` ~59,900 lines · `tools/` ~300 JS scripts across 10
directories · ~245 Python files · 74 docs · two web UIs (simulator, `dashboard/`).
**`npm run check` enforces a twenty-two-step gate chain; CI runs it plus a
headless-browser job and auto-deploys the simulator to GitHub Pages on
green main.**
Golden masters live in `packages/fixtures/`. Of the 26 scripts in `tools/verify/`,
only 5 can actually fail — see the Verification section.

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
it contains tracked files only, so the gitignored 166 MB CSV and `docs/archive/`
are **absent** inside one.

**No polynomial corrections.** Motion-model corrections stay harmonic on
H-lattice divisors. No T/T²/T³ — they compound at deep time and destroy the
lattice claim. A fitted linear slope fixes the fit window and is 41 min wrong at
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
- `data/02-solar-measurements.csv` is 166 MB and gitignored — no git recovery.
  Back it up before regenerating (2 h 24 m).
- **The deep-time alignment campaign is COMPLETE** — engine ≡ CSV bit-exact,
  all sixteen R-items closed, the cardinal-point fit (now Step 6d; "6c" in
  campaign-era docs) at 0.26–0.29 min over ±270 kyr (Earth-frame) via the §10
  derived form + edge-trim + the §10g quadrature-locked joint sidebands. Do
  not regenerate the CSV: 2 h 24 m for an identical file. Coefficients and
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
`test:fixtures` (the `tools/lib` golden masters), `check:artifacts` (generated
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
| `tools/docs/`, `docs/*.md`, markers, the generated table blocks of docs 92/97 (`docs:tables`) | `npm run check:docs` | ~20 s |
| `tools/lib/`, `packages/physics/` | `npm run check:engine` | ~2 min |
| ANY `public/input/*.json` (even a label — the constants hash embeds them wholesale), `packages/fitting/`, `src/script.js`, `tools/constants/` | full `npm run check` | ~9 min |

`npm run test:browser` runs the `src/script.js` golden masters in headless
Chromium — the only tier that guards Phase 8, which dissolves that file —
plus the epoch-consistency gate (pure f(Y) evaluators ≡ the epoch-anchor
chain at ±1/±5 Myr; the golden master cannot catch that class).
`npm run test:transparency` is the Phase 6 acceptance gate — **green (84/84,
round-trip bit-exact) since Phase B** and required in CI; red there is a
regression of the Phase 6 exit criterion, not a tracked state.

`/gates` runs the standalone model checks. `tools/verify/` holds 26 scripts, and
**21 of them cannot fail** — no exit path, no assertion, so running them proves
nothing. `npm run test:verify:list` gives the classification: 5 gate · 3 liftable
· 13 narrative · 5 generator (the suite FAILS on any unclassified script). **Never
run a generator as a test** — `balance-search.js` rewrites the tracked
`data/balance-presets.json`, and the four campaign generators
(cassini-results / lod-climate-correlation / eclipse-audit / lunar-alignment)
rewrite their `data/*.json` under `--write` (the latter two REFUSE on
divergence; `--rebaseline` is the conscious re-measurement path).

**The Fibonacci-law retirement.** `verify-laws`, `dual-balance-optimizer` and
`config1-proof` are narrative class (kept as the record, no longer gates): the
structural claims they gated — exact eccentricity balance, the Saturn
e-prediction, Config #7 mirror uniqueness, the node integers — were
re-evaluated with the engine's own dynamical inputs
(`tools/explore/balance-with-dynamical-nodes.mjs`; doc 109 is the evidence
record) and retired. What survives as a documented observation: under the
Fibonacci weights the 8-planet eccentricity balance holds to ~98 % with the
engine's long-term mean eccentricities (99.8636 % was the tuned-inputs
figure). The Law-4/Law-5 constants remain scene-implementation parameters
(`K = 3.4143e-6`; base eccentricities from the balance construction) until
the planet chains move to engine-D elements.

**The falsification criterion.** The model stands falsifiable on three named,
pre-registered legs: (1) **the deep-time scaling split** — the spin-family
periods (axial precession, obliquity band) must scale with H(t) per the
recession history while the long-eccentricity band stays at its modern class
(scaled only by the measured solar-mass history); every newly dated
Precambrian cyclostratigraphic section tests both halves (confirmed so far
at 1.4 and 2.46 Ga), and a section violating either half falsifies the
corresponding tier. (2) **Historical-era exactness** — the fail-proven gate
suite: eclipses (`eclipse-audit`), the LOD/ΔT stack, cardinal points, the
41-anchor paleo bands (`paleo-anchors`, where an unexplained *improvement*
fails too). (3) **Two-expansions μ-consistency** — the rock-measured
long-eccentricity period must track 405.6 kyr / μ under the measured solar
mass history (currently μ(2.48 Ga) = 1.00 ± 0.07). The former Config-#7
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
| `tools/verify/` | 26 scripts: 5 gate · 3 liftable · 13 narrative · 5 generator (`npm run test:verify:list`) |
| `packages/physics`, `packages/model-values` | the published npm packages (@essrt scope) — the website and world consume these; refits reach them via `values:package:write` + republish |
| `tools/explore/` | 140 research one-offs — findings live in `docs/` |
| `public/input/fitted-coefficients.json` | single source of truth for fitted values |
| `docs/` | 74 numbered docs; `40-architecture`, `99-essrt` are cross-referenced |

The simulator at 3d.holisticuniverse.com auto-deploys from every green main
push (the Pages job in ci.yml) — nothing is hand-uploaded anywhere.

## Working notes

Current state, active plans and work-in-progress live in the private
`holisticuniverse` repo under `docs/plans/` — not in this repo.

## Licence

AGPL-3.0 (see `LICENSE`). Derivative works must stay open and attributed; if you
run a modified version as a network service you must publish your source. A
commercial licence is available — dennis@holisticuniverse.com
