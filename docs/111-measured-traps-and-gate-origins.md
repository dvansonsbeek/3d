---
docVersion: 1.0
modelVersion: v26.2
coefficients: sha256:f2387635a8f80374
status: current
---

# 111 — Measured traps and gate origins: the record behind CLAUDE.md

**Purpose.** CLAUDE.md states the project's rules in one line each. This
document carries the MEASUREMENTS those lines were learned from — the
numbers, the commits, the gates that pin each class — moved here verbatim
from CLAUDE.md at plan 13 B5 so the rules file stays readable and nothing
measured is lost. Each section is cited from CLAUDE.md by its number; a
rule without its measurement is a slogan, a measurement without its rule is
a diary — this file and CLAUDE.md are the matched pair.

Three kinds of record live here:

- **§1 Traps** — a bug class measured at least once here, its cause, its
  numbers and the gate that now pins it.
- **§2 The browser tier's gates** — what each `test:browser` /
  `test:snapshot` row guards and the owner report or regression it was born
  from.
- **§3 The falsification criterion, long form** — the three legs with
  their derivation history (the short form is in CLAUDE.md).

The planet-channel and era-device retirement record (the former CLAUDE.md
"integer-law retirement" paragraph) is doc 109 §23.

---

## 1. Traps

### 1.1 `Verify at J2000: 0.0000″` is a tautology

Not validation — it re-evaluates at the anchor it derived from. It read
clean while a shipped formula was 0.2247″ off across 335,318 rows. Real
gate: shipped coefficients against rows the fit never saw, decomposed as
`RMS² = bias² + scatter²`.

### 1.2 Errors can cancel

Two rectangle-vs-integral bugs were equal and opposite; fixing either alone
sent a fit from ~5.6 min to 1162 min. If a fix makes an unrelated gate go
red, suspect a second compensating error before suspecting the new code.

### 1.3 Stability and a small formal SE are not evidence of correctness

An ill-conditioned regressor returned a rock-stable, tiny-SE, completely
wrong amplitude of 5.06 against a true value of 1.0.

### 1.4 Declination is blind to a longitude error at the solstices

And maximally sensitive at the equinoxes — the fastest way to classify a
discrepancy.

### 1.5 Capture a baseline before touching shared machinery

Two minutes; it has caught a 583.7″ regression.

### 1.6 The solar-measurements check is the window CSV

Step 6a2 (`npm run fit:6a2` → `data/02-solar-measurements-window.csv`,
−4000…+4000, ~48k rows, gitignored) + `npm run check:csv-smoke` (bit-exact
window compare, fail-proven; tools/fit/README Step 6a2) — regenerate it
whenever the engine's frame of date moves. The full-period file
(`data/02-solar-measurements.csv`, 160 MB, one row per year of the anchor
unit) is RETIRED and deleted: it was the C-4b-era campaign record, stale
against every later movement arc (measured SS@−997 off 2.9 h), and no gate
or fitter reads it. The exporter can still write one on demand (2 h 24 m).

### 1.7 The deep-time alignment campaign is complete — and the matched-pair rule

Engine ≡ CSV bit-exact AS OF ITS ERA (the claim is historically scoped:
that CSV was the C-4b-era record and the later movement arcs moved the
engine; Step 6a2 + check:csv-smoke are the living check), all sixteen
R-items closed, the cardinal-point fit (now Step 6d; "6c" in campaign-era
docs) at 0.26–0.29 min over ±270 kyr (Earth-frame) via the §10 derived form
+ edge-trim + the §10g quadrature-locked joint sidebands. Coefficients and
runtime evaluation form are a MATCHED PAIR — never ship one without the
other (~1162-minute-class error), and the pair includes the NUMERICS (the
campaign's ∫1/H trapezoid table was part of its pair). The cardinal-point
fit, its sidebands and that table were deleted at plan 09 step 7a — the
cardinal instants are the certified Sun's crossings; the matched-pair rule
stands for every fitted family that remains. Both campaign plans are
archived in `docs/archive/old-documents/` (untracked).

### 1.8 The braid law's counter-rotating sign is physics, not convention

The seasonal-asymmetry structure is COUNTER-rotating against the perihelion
phase; the co-rotating sense captures nothing (measured on the cardinal
record — the sign experiment, doc 99 "braid law"). The fitted sidebands that
carried it were deleted at plan 09 step 7a; any future cardinal-structure
term must keep the sign.

### 1.9 A purity freeze needs its pure twin

Freezing a mutable-global read to a J2000 const without wiring in the
epoch-aware f(Y) replacement silently freezes deep time (the solar-day panel
read 86400.006 where the model says 86400.156). The epoch-consistency gate
now pins the invariant; extend it when adding f(Y) evaluators.

### 1.10 A cache that changes resolution is mutable state

The one-source movement's grown grid replaced its 100-yr tier with the
1000/5000-yr one after any deep-time probe; rates read through it (±0.5-yr
central differences) became grid-segment averages — the anomalistic year
read +2.6 s, visit-order dependent, and 18 browser goldens were recorded
contaminated (exposed by the early-recorded "Fresh" twin of the same JD).
Per-tier routing + the fail-proven `test:sampler-purity` gate pin the
class: values pure in `year`.

### 1.11 A displayed rate must name its window

The engine's ϖ̇ reads 11.544/11.616/11.624/11.696 ″/yr depending on
evaluator and stencil (100-kyr window mean / chain tangent / series
year-over-year / deep-mode tail); two panel surfaces showing different
windows of the same rate split 111,491 vs 111,570 yr. Surfaces quoting one
physical rate ride ONE family — the anomalistic takes the chain tangent the
Prec. cell shows (`computeApsidalSecularDegPerYr`, one home). Second
measured instance (C1): a mean motion FITTED over a window shorter than a
resonant inequality absorbs the inequality's local phase slope into the mean
term — the chain's 300-yr `windowElementRates` gave Neptune 164.71 yr where
the secular (2-kyr-boxcar) λ̇ matches JPL's 164.79; the period rows ride
the banked λ̇ channel, the split is banked as measurement
(`verdict.planetLamDot`).

### 1.12 Orbital quantities ride the μ-tier, spin quantities the H-tier

The retired device scaled planet periods by H(t)·mSY — mixing the recession
driver (Earth spin: precession, LOD) into an orbital quantity. The proper
deep-time stretch for ANY heliocentric period is the ONE Driver-2 solar-mass
law (planet-independence is exact at the two-body level), composed with the
body's own constant-GM N-body drift — Earth's D6 sidereal-year channel is
the pattern (`T(y) = massLossLaw(y)/lamDotRel(y)`, every factor ≡ 1 at
J2000).

### 1.13 The secular law is not the rate of date

The composed ψ̇(t) — leg 1's law, the clock T_p(t) — scales the J2000 rate
on the tidal history. The spin integration multiplies it by two factors of
date, both exactly 1 at J2000: the solar torque's (1 − e²)^(−3/2) at the
eccentricity OF DATE and J₂(t)/J₂₀ from the GIA channel (ONE home
`earth/deep-orbital-history` `alphaAtGeneral`; `climate/l1-orbital`
`j2RatioAt`). On the secular law alone the equinox lagged Vondrák 2011 by
27″ at −3000 — the Sun's whole ancient residual against Horizons — and the
obliquity drifted 80″ rms off La2004 over a million years: the solar-share
formula held e at J2000 (a purity freeze without its twin) and the
polar-moment channel was read on the length-of-day side only. The J₂ side
is scaled on the OBSERVED dJ₂/dt (`j2RateJ2000PerYr`), never through the
J₂→α factor of the length-of-day side. `tools/verify/equinox-vs-vondrak.js`
refuses to write if a factor is dropped.

### 1.14 The scene is the reference — and it needs its own instrument

Owner: "all calculations should match what we measure in the scene."
Sampling the Node scene twin at 16 epochs with the exporter's own event
definitions (2026-09) found three law-level slips the goldens could not see:
the tropical-year law read the equinox's PROJECTED J2000 longitude rate
where the mean longitude of date needs the general precession — the broken
angle through the node of the ecliptic of date (the literature's p_A; the
N-body L = Ω + ω + M is that angle) — equal at J2000 and parting with the
square of the ecliptic's tilt (0.05 s of year at ±4 kyr, ~1 s beyond
100 kyr, 5.9″ of Sun at −3000; `generalPrecessionLonDeg`); the precession
period was counted in TROPICAL years by the pair's beat and realised per
JULIAN year by the frame (26 ms of tropical year, 0.55 yr of period —
periods are now Julian years, and the year relations are rate-form with the
unit named); and the published anomalistic year rode the planet chain's
secular tangent where the scene's perihelion follows the series (3.3 s at
0 AD, 395 s at +25 kyr). The measurement discipline matters as much as the
finding: a per-event `dJD·360/(360 − dWA)` is not a sidereal year (±50 s of
equation-of-centre drift per cardinal type, ~150 s of lunar-equation timing
per event) — remove the planetary completion per event and read the
cumulative angle, four-cardinal mean, against TT. Gate:
`tools/verify/scene-year-lengths.js`. The inertial referee for the sidereal
law is DE441 in the fixed J2000 frame
(`tools/explore/sun-inertial-vs-de441.cjs`): the λ̇ channel's 2-kyr boxcar
of per-step rates telescoped to the osculating longitude's endpoint
difference and left 0.1–0.3 s of node noise, which the Sun's longitude
integrated to +18…28″ at 4000–6500 — now a least-squares quadratic slope
over 10 kyr (rms 5.4″ over ±9000 yr, was 18.9″).

### 1.15 A term's amplitude is a function of the elements, not a constant

And a degenerate basis will "fit" the wrong physics inside any one window.
The Sun's 1,783-yr long inequality shipped as a constant row (I2) that held
inside ±3000 yr and drifted 3.7″ beyond: it is first order in the
eccentricities, so its composed amplitude and phase ride e_X(t)·e^{iϖ_X(t)}
of Earth, Mars and Jupiter (D'Alembert: Σk_λ + Σj_ϖ = 0, the argument's
Σk = −1 gives +ϖ_X). The first D'Alembert cut used θ − ϖ_X — the wrong
sign — and still fitted ±9 kyr to 0.3″ with three near-collinear columns
carrying thousands of ″/e; the ±3100-vs-±9100 window test and a
sliding-window phase track exposed it (the line's period read 1848 yr
against the 1781-yr carrier, the sign that ϖ enters with a plus). With the
right sign the same basis clears the band to 0.05″ over ±20 kyr with a
window-independent composed amplitude. Rules: derive over the window the
rows will be used in; test window independence on the COMPOSED function,
not the coefficients; and a term with Σk ≠ ±1 (the 239-yr 8V−13E, fifth
order, resonant) is a cluster of lines — no single-ϖ form holds; it stays a
constant row with its window named.
`tools/explore/i3-long-period-dalembert.mjs`.

### 1.16 A campaign recording hashes what it runs on, or it goes stale unseen

The deep-eccentricity slope anchor (e338d1bd) moved the lunar-alignment
recording — per-century medians by 100–500 s, identified events 228 → 244 —
and nothing flagged it for four days: the lunar chain's eccentricity
channel, its arguments and the model assembly were not in the inputs block.
After a model change, run the campaign generators plain (the reproduction
check) even when the freshness gate passes.

### 1.17 A fit-window edge phase-locked to the lattice masquerades as physics

The "e(t)-minimum residual peak" was window-edge divergence — both bracket
ends sat at the same perihelion-of-date phase. Check the edge/interior
split before believing any phase-binned feature; the former cardinal-point
fitter edge-trimmed 8%/side for this reason.

### 1.18 A structural list has one home

The L1 divisor list lived in `milankovitch_climate_formula.py` — and in
twelve hard-coded copies (eight test scripts, the four variance-budget
scripts) that a ledger-driven re-run could not see, plus a registry key
whose note said "kept for the family table". When a structural set changes,
grep for the **literal list**, not for imports; a registry key carrying a
"kept for X" exception IS the stale value — fix the key, not its consumers.

### 1.19 The records run on the embedded coefficients, not the JSON

Step 7c writes `data/deltaT-4flag-fit.json`; every createModel consumer
(eclipse-audit, lunar-alignment, Sun-vs-Horizons, the hybrid verdict, the
series verdict) reads `packages/physics/src/constants/coefficients.js`.
Measured (v23.0): records recorded between a 7c write and the next
`npm run constants:generate` sat 0.6 s off the shipped physics with the
freshness gate green (it hashes the JSON). After ANY fitter write:
`constants:generate` FIRST, then the records. `test:constants` catches the
stale embed; it does not catch a record recorded on it.

### 1.20 A comb on H-divisors cannot carry a secular drift — three instances

**First (plan 09 step 3, measured).** The lunar arguments built their Sun
from 360° per mean solar year plus the closed-form integrals of the
year-length combs; that Sun sat 0.2° behind the IAU mean Sun at −2000 (the
comb's curvature is 60 % of the tropical year's real drift, which the
one-family law reproduces to 0.1 s), and the Moon's elongation argument
carried it as tens of arcseconds of ancient residual. The arguments now read
the ONE certified Sun (`model.sun.meanLongitudeDegAt`, the series' unwrapped
perihelion) — D within 15″ of Meeus at −2000, was 656″. Rule: a timeline is
the integral of the published rate of date, never a comb; and when a fitted
chain agrees with the record while one of its inputs is wrong, the other
inputs are compensating — check each input against its own referee. Also
measured on the way: the J2000 day length ω₀ is the SI day (86,400 s, the
day the IAU year inputs are stated in); the retired H/13 identity's
86,399.99968 s put a +0.32 ms/day bias into the raw ΔT integrand that the
fitted stack had to absorb (Espenak RMS 13.4 → 12.45 s once removed).

**Second (step 5c).** The month chain's tropical month, the sidereal day of
date, the equinox-of-date month partners and the lunar series' A3 argument
all counted the equinox's turn as 13 per H(t) — the unit is 13.011
precession periods, so every one ran 0.086 % slow on the precession; the
chain's J2000 tropical month sat 5.85 ms above the IAU input, and one turn
per T_p(t) lands within 0.1 ms of it. The month chain's "cycles per H ∝ H²"
of-date law (doc 99's lunar precession invariant) was the counter's
definition, not dynamics — retired; the of-date perigee/node are the count
compositions of the inertial chain. Rule: `13/H`, `H/13`, `N·(H/H₀)²` in a
physics formula is a device identity standing in for 1/T_p(t) — read the
composed period directly.

**Third (step 5d).** The deep chain's tropical year of date was
T_sid·(1 − 13/H(t)) — 1.04 s/yr slow at J2000 — and it was BOTH the deep
JD↔year calendar's integrand AND the lunar chain-cycle integrator's
seconds-per-year weight, so every lunar count carried a 3.2e-8 J2000 bias
(15° of deep Moon per 100 kyr, absorbed inside the rate anchors' taper,
visible beyond). The epoch-consistency gate's 0.002-d tolerance hid the
1 s/yr gap between the anchor chain and the one-family law; on T_p(t) the
two agree to 1e-11 d. A tolerance wide enough to pass a known device gap is
a gate that cannot see the gap closing — note what a tolerance covers.

### 1.21 A number a doc cannot reproduce from an artifact gets written by the script

Not re-derived in a generator. Two guesses at the §4.7 f_ice recipe gave
0.70 and 0.73 against the documented 0.77; the script's own recipe (stored
since) reproduces it exactly. Docs 92/97 result tables are now generated
blocks (`npm run docs:tables`) for the same reason.

### 1.22 Two precession rates, two uses — name which one a line carries

The general precession in longitude p₀ (50.288 ″/yr, the equinox along the
ecliptic of date — the tropical year, the climatic-precession lines p + gᵢ)
and the spin axis's inertial rate ψ̇ᵢₙ (50.385 in the shipped series-driven
configuration: the general rate plus the planetary mean the N-body
ecliptic's motion carries, +0.097 ≡ IAU's ψ_A − p_A — the hybrid obliquity
integration's self-anchor, the obliquity lines p + sᵢ, the obliquity beat;
La2004's precession frequency 50.476 sits 0.09 above it). The climate lines
carried p₀ for both families; the records flagged it (every LR04 window
wanted +0.2…+0.3 ″/yr, all of it in the obliquity family), the engine's own
self-anchor said the same, and the fix moved ten obliquity periods 0.3 %
(41.22 → 41.10 kyr). TRAP measured on the way: a bare `createModel()` (the
18-mode table) anchors the spin axis 0.18 ″/yr above p₀ where the shipped
series-driven model anchors 0.097 — derive line rates from the shipped
configuration (pass `secularSeriesArtifact`), the g₂-gap trap in a new
coat. Also measured: a clock-of-date "gain" that is really a frequency
offset (test with a constant-offset scan before believing a drift), and a
0.3 % period shift compounding to a different α(t) phase a million years out
(the ΔT stack's GIA term by tens of percent at deep time; the stack
re-closed, Step 7c).

**Second measurement (v23.0): a RECORD sees the pole rate's mean over its
own window, not the J2000 instant.** The dominant obliquity line of the
model's own ε(t) over the LR04 window sits at 40,922 yr (La2004's series:
40,900; the two agree at every window), not at the J2000 beat 41,098: the
pole turned faster in the past (tidal spin +0.06 ″/yr over 5 Myr, lower
mean obliquity +0.05, higher mean eccentricity +0.015 — the three of-date
factors the spin integration already multiplies), and the window mean
50.515 predicts the fitted period to 0.02 % (40,930). The records'
"+0.12…+0.20 ″/yr on the obliquity lines" was this mean. ONE home
`lunisolar.spinAxisInertialRateMeanArcsecPerYr` /
`obliquityPeriodRealizedYears`; the obliquity lines ride the LR04-window
mean (the stack's span is the window's one home); the J2000 beat stays as
the instantaneous limit; the hybrid verdict REFUSES if the ε(t) fit parts
from the window-mean prediction by 0.1 %. Compare like with like: a realized
period against a realized period (model vs La2004 0.05 %), never a J2000
beat against Laskar's long-window precession frequency 50.476. Measurement
discipline: a single-line periodogram or phase track inside a 1–2 Myr window
blends s₃ with its −18.30 ″/yr side line (Rayleigh) and reads 0.3 % short —
fit the full line set with ONE free p, and use ≥ 3 Myr. LOOP TRAP
(measured): the J₂(t)/J₂₀ factor is the ice-driven GIA channel, which rides
the climate formula's own post-MPT layer — a line rate that includes it
depends on its own fit (its window mean moved 1.4e-3 ″/yr across one refit,
a loop the freshness gate cannot close). The T1 exporter derives the LINE
rate with `ellipticity: false`; the published realized period and the
hybrid gate keep the full rate (1 yr of period apart).

### 1.23 Run a fitter at its own fit commit before blaming the engine

The banked regime block's note said plan 09 had moved the fitter under it;
`git archive` of the fit commit (node_modules wired, ~1 min) showed the
committed fitter had always produced today's candidate — the shipped block
came from an uncommitted same-day run, and its inputs had moved by parts per
billion. A fit's commit must carry the fitter, its seed and its bounds that
produced it (the matched pair includes the instrument). Plan 12 step 1.

### 1.24 A generator stopped between its two writes leaves a valid-looking artifact

(plan 12 option A, measured) `nbody-secular.js --write` writes the CORE
artifact first (the periodic-term pipeline bootstraps from it) and the
`periodicTerms` layer second, ~25 min later; stopped between the two,
`data/nbody-secular-frequencies.json` carried a fresh inputs block and no
periodic layer — `check:artifacts` PASSED, the cascade regenerated
secular-series, the constants embed, both eclipse records (REBASELINED on
it), the fixtures and the registry on the truncated chain, and only the API
gate's Mars ϖ(−3000) pin (313.23 → 312.92) caught it. After stopping ANY
generator, diff the artifact's KEYS against HEAD before running a cascade;
and never stop a generator to save a pass — generate the constants LAST and
run the cascade ONCE instead.

### 1.25 "Placed by the engine every frame" does not cover what was aligned once at init

Plan 11 step 4 deleted the scene scaffold's pose on the claim that every
frame of date is engine-placed — true for every per-frame reader, and the
star and constellation catalogs copied Earth's axis matrix once at module
init, before the first placement: the sky lost 23.44° of tilt and 68.23° of
equinox offset while every golden stayed bit-identical (goldens record
observables, which are frame-invariant). Before deleting a pose, grep the
top-level `matrixWorld` readers; gate the init-time alignments in the frame
they must sit in.

### 1.26 A precession constant is not a precession rate — and a seam kicks the pole through n̂, not through its mean plane

(plan 12 §8, measured) The composed lunisolar law scales the precession
CONSTANT α(t) — spin times the torque term. The RATE is α(t)·cos ε̄(t), and
the chain held cos ε̄ at its J2000 value at every epoch while the cited
history's own mean-obliquity column (23.25° at 0, 22.23° Devonian, 19.73° at
2.46 Ga) sat unread beside the distance it was reading. The factor is
1 − 2e-7 at 10 kyr and 1.0245 at 2.46 Ga: it closed the composed rate to
Farhat's own precession column (−2.0 % → +0.4 %) and moved every paleo
precession referee toward its source (the Mesoproterozoic gap −7.2 → −5.3 %,
halved, not closed). Rule: name which of the two a surface carries — the
hybrid obliquity integration and the realized pole-rate window mean take the
CONSTANT (their own ŝ·n̂ is the one cosine); T_p(t), the beat, the tropical
year of date and the referees take the RATE. Measured on the way: the
hybrid's ζ-mode tail beyond the series' ±10 Myr was anchored to the J2000
POINT and reached the span edges 1.6°/0.7° off the series; the mean
obliquity stepped +0.9°/+0.3° there and stayed stepped for 500 Myr. The
plan's hypothesis — anchor the tail on the series' MEAN plane — was tested
and is wrong for ε (step +0.74°/+0.57°): the pole follows n̂ adiabatically,
so a DISCONTINUITY in n̂ kicks ε permanently and the mean plane does not.
Joining the tail to the series at each seam (n̂ continuous) leaves
+0.09°/+0.13°. Test the hypothesis against the quantity that is wrong, not
against the quantity the hypothesis names.

---

## 2. The browser tier's gates and their origins

`npm run test:browser` runs the `src/script.js` golden masters in headless
Chromium — the only tier that guards Phase 8, which dissolves that file —
plus the epoch-consistency gate (pure f(Y) evaluators ≡ the epoch-anchor
chain at ±1/±5 Myr; the golden master cannot catch that class), plus
`test:perf` — the deep-time performance gate (RATIO thresholds, deep vs
in-table cost, runner-speed independent; born from four ungated ratio
regressions, one owner-bisected at 28×; plus two travel-speed rows the
steady-state rows cannot see — the orbit-ring resample against the per-JD
route and the Play-start delay on a fresh page, both bisected from the
owner's "waiting time before Play / stutter at 1000 yr/s"; plus the
paused-idle row — a paused, untouched page must leave the render loop's
idle check in place (Tweakpane's readonly rows re-emit `change` on every
poll tick and the pane-wide handler woke every frame: a full update + a
GPU frame at the display rate, forever; the pre-guard build reads 1.0
against the 0.05 limit); plus the monitor-polling row — the pane's ~319
readonly rows are LOOP-DRIVEN (tickers disposed after setupGUI, the
visible rows re-read on the 5-Hz DOM tick), so a paused page emits ~0 pane
change events where the polling build emitted ~4,800 in 3 s (limit 5), and
a visible monitor must still change while playing; fail-proven via
`ESSRT_PERF_TIGHTEN=0.01` and on the pre-fix builds).

The `test:snapshot` chain also carries:

- **`chart-export`** — the Tools panels' paper-SVG → PNG rasterizer behind
  every Export button (exact pixel size, independent decode, byte floor;
  fail-proven via `ESSRT_CHART_EXPORT_PLANT=1`) and the export STANDARD on
  all fourteen forms (title + legend row above, the plot, one credit strip
  below, no caption text — doc 57; fail-proven via `=2`).
- **`tools-panels`** — every Tools button opens its panel with no page
  error, three clicks within a frame leave ONE panel, and it closes again
  (born from a ReferenceError on open and the double-build race;
  fail-proven via `ESSRT_TOOLS_PLANT=1`).
- **`perihelion-at-sun`** — the Show/Hide grid: the chain planets'
  "Perihelion at Sun" marker sits at a(1−e) in the orbit plane at the
  chain's ϖ, the Moon's "Apsidal/Nodal Precession" markers (the perigee at
  F − M′, the nodes at L′ − F) and the "Sun barycenter" marker (≡ the Sun
  panel's Sun-SSB sum) are placed as stated, and every group's chip list is
  exact — no device-wheel chips (born from the "Real Perihelion" wheel ~90°
  off the chain and three chips that showed nothing; fail-proven via
  `ESSRT_PERI_SUN_PLANT=1`).
- **The star and constellation containers** (J2000 RA/Dec catalogs, aligned
  ONCE at module init) sit on the J2000 equatorial frame through R (born
  from the owner's "the Sun is at 160° against the constellations where it
  was at 90°" after plan 11 step 4: the axis's rest pose became 0 and the
  engine places it only at the first update, after the alignment — 23.44°
  of tilt and 68.23° of equinox offset missing from the sky, invisible to
  goldens that record observables; fail-proven on that build).
- **The focused chain planet's orbit-plane grid** passes through the
  rendered Sun with its normal along the chain's orbit normal of date (born
  from the owner's "the tilt of Mercury's path floats above the Sun": the
  grid hung on the scaffold's inert PerihelionFromEarth →
  RealPerihelionAtSun wheels, whose annual wheel lost the engine-placed
  Sun's wheel zero a quarter turn in the plan 07/09 arc — 1.36 AU from the
  Sun and 19.8° off the normal on the pre-fix build; it is a scene child
  placed from the engine every frame now, and the RealPerihelionAtSun /
  FixedPerihelionAtSun layers are DELETED in both twins — the planet
  containers hang on the barycenter beside their Perihelion-at-Earth marker
  layer).
- **The Planet Info eye** ("Hide helper objects") governs the focused
  planet's helper visuals too — its elements-of-date label and its
  orbit-plane grid, not only Earth's two markers (born from the owner:
  "zooming into a planet shows extra information; for Earth the eye hides
  it, for the planets it should too" — the toggle had covered Earth's
  markers only since plan 07 R6 deleted the planets' wobble centres;
  fail-proven on the pre-fix build).
- **A chip click WAKES the paused render loop** (the class the monitor
  guard exposed: a UI path that changes scene state without setting
  `positionChanged` — now every user interaction wakes the loop for one
  frame; the pre-fix build reads 0 active frames after the click).
- **The wobble-centre gate** also pins the Tracing "Wobble" fill (a trace
  needs its parameters set in `updateAllTracesForEpoch`, the ONE place; a
  missing object traces nothing).

`npm run test:transparency` is the Phase 6 acceptance gate — **green
(84/84, round-trip bit-exact) since Phase B** and required in CI; red there
is a regression of the Phase 6 exit criterion, not a tracked state.

The model gates' origins: `values:package` carries PLAUSIBILITY rows — a
published value against the reference it is published beside — born from
model-values 16.0.0 shipping `periLongModel2000AD` 167° off through a
private copy of the perihelion convention that missed the R10 re-origin,
while every page's hand-typed "+0.010°" delta column still read agreement
(the deltas are registry keys now, `periLongDelta*AD`; fail-proven via
`ESSRT_VALUES_PLANT=1`). `test:py-smoke` — every `.py` parses, the bridge
`tools/lib/python/constants_scripts.py` imports, and every `scripts/*.py`
imports as a module — was born from the bridge sitting UNIMPORTABLE for
months on a KeyError that no gate ran into (plan 07 §9f/§9k; stage C needs
numpy/scipy and reports SKIP on CI's runner; fail-proven via
`ESSRT_PY_SMOKE_PLANT=1`). `test:vocabulary` is the retired-vocabulary
RATCHET — plan 06 §7 D3 terms may only leave presentation surfaces, never
re-enter; `--report` prints the sweep worklist, `--root DIR` adds the
website's EN pages. `test:fixtures` carries the `tools/lib` golden masters
+ the plan-06 baseline — the clock-carrying quantities on the ±26-kyr
wander window and the deep-time anchors, bit-exact across the
lunisolar-clock restatement. The fifth model gate, `scene-year-lengths.js`,
samples the Node scene twin at −4000 and +10,000 with the solar-measurements
exporter's own event definitions and pins the measured sidereal, tropical
and anomalistic years of date to the one-family laws within 30 ms
(fail-proven via `ESSRT_SCENE_YEARS_PLANT=1`).

---

## 3. The falsification criterion — the long form

The model stands falsifiable on three named, pre-registered legs.

**(1) The deep-time scaling split.** The axial precession must follow the
COMPOSED lunisolar rate
ψ̇(t) = [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³] × cos ε̄(t)/cos ε̄(0) (spin
from the recession history, the lunar torque growing on the Moon's distance —
the bracket scales the precession CONSTANT; the cosine of the cited mean
obliquity ε̄(t), the same history's second column (plan 12 §8 option (a)),
makes it the RATE — the chain held cos ε̄ at J2000 before, 2.5 % of rate at
2.46 Ga, and the Mesoproterozoic discrepancy halved when it moved; since plan 12
option A the distance history a_M(t) is a CITED INPUT — Farhat et al. 2022's
published solution, `data/astrogeo22-earth-moon.json`, read as a shape on
the observed J2000 distance with the LLR rate as its J2000 slope — so the
leg tests the model's physics on it and nothing in the chain is fitted to
the rocks; the quartic's α₃/α₄, the rock-fitted regime knots, the solar
channels and the Roche-crossing "self-validation" are DELETED; ONE home
`@essrt/physics/earth/precession-composed`; its J2000 anchor p₀ is the
model's ONE J2000 precession reading — since plan 09 the IAU 2006 general
precession p_A = 50.28796195 ″/yr, an INPUT (astro-reference
`generalPrecessionJ2000_arcsecPerYr`, T_p = 25,771.575 yr); before plan 09
it was the retired year combs' beat at 2000, 25,771.395 yr (plan 06 S5),
8 ppm faster, and that 8 ppm was absorbing a sidereal-year-input mismatch
against DE441 (Sun vs Horizons gained +1″ per millennium on p_A) — a
sidereal-year finding, parked. **T_p(t) is the published deep-time clock**
(the retired unit H(t) scaled with it but was not 13 of them — H₀/T_p =
13.011, H₀ fitted on the perihelion-of-date beat, so H/13 = 25,793.6 was the
fit anchor's reading, 0.086 % slow, never a period; the unit function
`hAtAge` left the physics at plan 09 step 7b; plan 06 D6/Phase 3/S5).
**The obliquity band must follow the beat 2π/(ψ̇ᵢₙ(t) − |s₃|)** — ψ̇ᵢₙ the
spin axis's INERTIAL rate, the composed rate × the hybrid's self-anchor
factor (model v22.0: 50.385 ″/yr at J2000 in the shipped series-driven
configuration, where the general precession p₀ reads 50.288 — the +0.097 is
IAU's planetary precession ψ_A − p_A; the beat 41,098 yr the instantaneous
limit; a record sees the WINDOW MEAN of ψ̇ᵢₙ with its of-date factors —
40,927 over the LR04 record, the climate formula's p+s₀ line on the orbital
forcing alone 40,924, La2004's own series 40,900 on the same window; the
general rate read 41,224) — s₃ at its dynamical value under the measured
solar-mass history — degenerate today with the pure precession-scaling
reading "obliquity period ∝ T_p", roughly a factor two apart at 2.46 Ga;
registry keys `obliqBeat*Kyr` / `obliqH8Scaled*Kyr` (name kept), doc 109
§18.

**Two named counters** (plan 06 D8) — the second DELETED at plan 09 step
7a: the FROZEN era clock (the combs and the ∫dt/H phase table) rode its own
fitted convention `eraClockHAtAge` = H₀·LOD/LOD₀ (pure spin scaling, the
pre-Phase-3 "H/13 identity", shipped with the coefficients as a device
constant — as a precession claim retired: it read ~35 % low against Lantink
2022 at 2.46 Ga); plan 09 deleted the combs family by family (steps 2–6)
and then the counter itself (`createPhaseMachinery`, `cyclesBetweenYears`,
`eraClockHAtAge`, the cardinal record evaluator, the CSV `Cycle` column);
the unit itself (`hAtAge`, the API's `epoch.h`, the `hAt*` registry keys)
left at step 7b, and its INPUTS (`holisticyearLength`, `stepYears`, the
device's rounded tropical-year input `inputmeanlengthsolaryearindays`, the
planets' `ascendingNodeCyclesIn8H`) with every remaining H reader and
registry key at step 7c — the K-device scaffold's wheels then rode the
recorded `kDeviceWheelPeriodYears` pose block (keyed by wheel index;
numerically the retired unit's 335,317/N, a pose, not a law) until plan 11
step 4 deleted the wheels and the block, the deep-eccentricity E-factor and
the browser's sidereal day read the Julian and the DERIVED year, and the
literals gate fails if any input returns.

The long-eccentricity band stays at its modern class (scaled only by the
measured solar-mass history); every newly dated Precambrian
cyclostratigraphic section tests these halves (the precession side is GATED
at 1.4 and 2.46 Ga — paleo-anchors rows `xiamaling-prec-1400` /
`lantink-prec-2460`, which the structural clock fails; the deep obliquity
PERIOD is the pre-registered, not-yet-discriminated prediction), and a
section violating any half falsifies the corresponding tier.

**(2) Historical-era exactness** — the fail-proven gate suite: eclipses
(`eclipse-audit`), the LOD/ΔT stack, cardinal points, the 45-anchor paleo
bands (`paleo-anchors`, where an unexplained *improvement* fails too —
every row a test on the cited history; the documented bands name their
cause, the Mesoproterozoic 2.5–3.6σ gap to Zhou 2024's precession constants
being the stated open discrepancy).

**(3) Two-expansions μ-consistency** — the rock-measured long-eccentricity
period must track 405.6 kyr / μ^1.153 (the engine-measured beat response,
W5; 1/μ is the first-order case) under the measured solar mass history
(currently μ(2.48 Ga) = 1.00 ± 0.07, quoted through the conservative
first-order slope).

The former Config-#7 criterion (checks 46–50 of the deleted `verify-laws`,
the mirror-unique configuration in `data/balance-presets.json`) is retired
with its record (doc 109 §23).

## Related documents

- [99-expanding-solar-system-resonance-theory.md](99-expanding-solar-system-resonance-theory.md) — the theory, the braid law, the deep-time predictions
- [109-model-nbody-engine-and-lattice-test.md](109-model-nbody-engine-and-lattice-test.md) — the re-evaluation record; §18 the obliquity hybrid; §23 the planet-channel and era-device retirements
- [110-calculation-map.md](110-calculation-map.md) — every published quantity traced to its formula, code and live value
- [40-architecture.md](40-architecture.md) — the two-engine architecture and the gate chain
