# Holistic Universe Model — simulator

Geocentric solar-system model and 3D simulator implementing the Expanding Solar
System Resonance Theory (ESSRT). The model is analytic and parametric, valid
across ±500 Myr. [Preprint](https://doi.org/10.21203/rs.3.rs-8758810/v4) ·
[Live demo](https://3d.holisticuniverse.com)

**Scale:** `src/script.js` 64,673 lines · `tools/` 203 JS scripts across 7
directories · 237 Python files · 71 docs · two web UIs (simulator, `dashboard/`).
**`npm run check` enforces six gates; CI runs them plus a headless-browser job.**
Golden masters live in `packages/fixtures/`. Of the 17 scripts in `tools/verify/`,
only 2 can actually fail — see the Verification section.

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
- `data/02-solar-measurements.csv` is 160 MB and gitignored — no git recovery.
  Back it up before regenerating (2 h 24 m).
- **The engine and that CSV agree bit-exactly since Phase C** (R1–R4, R6
  restored), and **Phase D refit 6b/6d/6c against it** — cycle axis, event-row
  anchors, the §10 derived cardinal form, all sixteen R-items closed. Do not
  regenerate the CSV: 2 h 24 m for an identical file. Coefficients and runtime
  evaluation forms are a MATCHED PAIR — never ship one without the other
  (~1162-minute-class error). See
  `holisticuniverse/docs/plans/IP-deeptime-scene-graph-alignment_new.md` §5.

---

## Verification

`npm run check` is the enforced chain — lint (§4 boundaries), typecheck (JSDoc +
`checkJs`), `check:boundaries` (the §2h licensing invariant), purity,
`test:fixtures` (the `tools/lib` golden masters), `test:verify` (the model gates).
Every gate has been shown to **fail on a planted violation**, not merely to pass
on clean code — the two fixture gates on a 1-ULP change, ~1.6e-16 relative. Lint
and typecheck cover `packages/` and `test/`; `src/script.js` and `tools/` are
pre-migration and join as Phase 8 extracts.

`npm run test:browser` runs the `src/script.js` golden masters in headless
Chromium — the only tier that guards Phase 8, which dissolves that file.
`npm run test:transparency` is the Phase 6 acceptance gate — **green (84/84,
round-trip bit-exact) since Phase B** and required in CI; red there is a
regression of the Phase 6 exit criterion, not a tracked state.

`/gates` runs the standalone model checks. `tools/verify/` holds 17 scripts, and
**15 of them cannot fail** — no exit path, no assertion, so running them proves
nothing. `npm run test:verify:list` gives the classification: 2 gate · 4 liftable
· 10 narrative · 1 generator. **Never run `balance-search.js` as a test** — it
rewrites the tracked `data/balance-presets.json`. `verify-laws` is gated on its
check count (49/50, Saturn's Laplace–Lagrange bound the documented failure), not
its exit code, so an unexplained *improvement* fails too.

Reference values: Law 4 K = 3.4143e-6 · Law 5 balance = 99.8636% (use **base**
eccentricity, not J2000) · Saturn Law 5 = 0.05371910.

**The falsification criterion** (checks 46–50 of `verify-laws`). The model is one
configuration out of 7,558,272: Saturn antiphase, the rest in phase, all eight
mirror-paired. In `data/balance-presets.json` that is the *unique* deep-analysis
candidate with `mirror === true`. If a regenerated file no longer contains it,
the model is invalid. Do not confuse this with `allPass`: `allPassCount` is 0 and
Config 7 reports `allPass: false` — a stricter question about all four physical
constraints, and **not** what makes the model valid.

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
| `tools/fit/` | the fitting pipeline (Steps 6a–6d) |
| `tools/verify/` | 17 verification scripts |
| `tools/explore/` | 140 research one-offs — findings live in `docs/` |
| `public/input/fitted-coefficients.json` | single source of truth for fitted values |
| `docs/` | 71 numbered docs; `40-architecture`, `99-essrt` are cross-referenced |

## Working notes

Current state, active plans and work-in-progress live in the private
`holisticuniverse` repo under `docs/plans/` — not in this repo.

## Licence

AGPL-3.0 (see `LICENSE`). Derivative works must stay open and attributed; if you
run a modified version as a network service you must publish your source. A
commercial licence is available — dennis@holisticuniverse.com
