---
docVersion: 1.0
modelVersion: v27.12
coefficients: sha256:7c135a128a54451c
status: current
---

# Measured traps and gate origins: the record behind CLAUDE.md

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
class: values pure in `year`. Since plan 24 the gate's third block pins the
spin-axis checkpoint bank as a seat, not a value: the banked instance and the
continuous walk read bit-identical nodes at −3, −137 and −498 Myr in either
visit order, on the engine binding and the package model alike (§1.29).

### 1.11 A displayed rate must name its window

The engine's ϖ̇ reads 11.544/11.616/11.624/11.696 ″/yr depending on
evaluator and stencil (100-kyr window mean / chain tangent / series
year-over-year / deep-mode tail); two panel surfaces showing different
windows of the same rate split 111,491 vs 111,570 yr. Surfaces quoting one
physical rate ride ONE family — the anomalistic takes the chain tangent the
Prec. cell shows (`computeApsidalTangentDegPerYr` — the ±150-yr tangent; its former name `computeApsidalSecularDegPerYr` left the API at @essrt/physics 24.0.0 — one home). Second
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
(`tools/explore/sun-inertial-vs-de441.cjs`, on the DE441 vectors
`fetch-sun-inertial-de441.mjs` fetches): the λ̇ channel's 2-kyr boxcar
of per-step rates telescoped to the osculating longitude's endpoint
difference and left 0.1–0.3 s of node noise, which the Sun's longitude
integrated to +18…28″ at 4000–6500 — now a least-squares quadratic slope
over 10 kyr (rms 5.4″ over ±9000 yr, was 18.9″). The same referee read at
the channel's nine 2-kyr nodes (`lamdot-nodes-vs-de441.cjs`): banked minus
DE441-implied λ̇ within 13 ms rms, the implied values carrying the ~30 ms
long-period inequality residual.

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
model's own ε(t) over the LR04 window sits at <!--v:obliqCycleRealizedFitLr04Years-->~40,916<!--/v--> yr (La2004's series:
40,900; the two agree at every window), not at the J2000 beat 41,098: the
pole turned faster in the past (tidal spin +0.06 ″/yr over 5 Myr, lower
mean obliquity +0.05, higher mean eccentricity +0.015 — the three of-date
factors the spin integration already multiplies), and the window mean
<!--v:spinAxisInertialRateMeanLr04ArcsecPerYr-->50.519<!--/v--> predicts the fitted period to 0.02 % (<!--v:obliqCycleRealizedLr04Years-->~40,924<!--/v-->). The records'
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
they must sit in. The same holds for a visual that is NOT engine-placed and
rides a parent's pose: Earth's container quarter turn (the former
`whichSolsticeOrEquinox`, the wheel scaffold's 21-June start) was invisible
to every engine-placed frame — removing it moved 73 browser goldens at
≤ 1.2e-13 relative and nothing else — but the inclination-path loop under it
would have turned 90° with no gate noticing. The browser golden now pins that
group's local → world azimuth map (`inclPathWorldAzimuthDeg@local0/90`).

The converse trap (plan 27 step F, found by the perihelion-at-sun rows): a
WORLD rotation set against an ancestor's pose is valid only until that
ancestor moves. The planets' rotation axes were placed as world rotations in
the planet pass against their orbit container, and the container itself was
re-posed from the same elements of date AFTER that, in the loop's 10-Hz
block — in steady state the two agreed; on the frame the series landed the
container moved 6e-9 after the axis was placed, and with no frame following
(the step-F wake frames reordered the load) Saturn's pole read 1.3e-8 from
the channel's, and 7e-7 on the frame after every jump, until the next frame.
Pose ancestors first, in ONE pass, in dependency order
(`_chainPoseOrbitContainer` before `_chainPlacePlanetPole`); a 10-Hz updater
that moves a parent of an engine-placed child is the same bug waiting.

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

### 1.27 A mean series anchored on an osculating snapshot carries the wobble's phase as a constant — and a Cartesian boxcar of a rotating vector is biased at every node

(plan 21, measured) The eclipse Sun needed a measured constant pair over the
one-source series (+70.08″ in ϖ, +5.81e-6 in e, derived as a 220-yr window
mean of osculating − chain and validated on the JPL Sun, 3.23″ → 1.59″) and
the TODO carried it as "a constant standing in for the planetary long-period
movement — derive the movement". Measured on the model's own 1PN runs over
±3 kyr, the movement in the 12 yr … 2 kyr band is 12″-equivalent rms in the
e-vector — 0.4″ on the Sun, below the floor — and the constant was two biases
of the series itself: its J2000 join rotated the whole 1-kyr-boxcar history
onto the dump's t = 0 OSCULATING sample (a point inside the 263″ 11.9-yr
Jupiter term), and the Cartesian boxcar of a vector rotating at 1161 ″/cy
with ė = −4.2e-5/cy sits low by e·(ϖ̇W)²/24 = 2.2e-6 and ë·W²/24 = 1.1e-6
with its direction off by ė·ϖ̇·W²/(12e) = −24″ at every node (the J2000 mean
of the same dump read e +0.6e-6/ϖ −14″ over 220 yr, −2.4e-6/−33″ over 1 kyr,
−12.3e-6/−92″ over 2 kyr against its t = 0 sample: a "mean" that moves with
the window is a filter bias, not a mean). The series was Simon 1994's mean
element in rate (1160.9 vs 1161.2 ″/cy), curvature and ė, and not in its
constant term. Rules: a mean series is anchored on its OWN mean, never on a
snapshot; a moving average of a rotating, curving vector is taken in the
co-rotating frame as a local quadratic (exact for the secular motion inside
the window), blended back to the Cartesian mean where the window turns fast
(e passing near zero); and the swap gate is the external referee's sd on the
whole span — the 1-kyr Cartesian node as the Sun's anchor doubled the modern
window's sd (0.78 → 1.60″), the co-rotating mean left it 0.048″ wide (the
curvature term), the local quadratic improved the ±3-kyr all-phase sd
(2.2575 → 2.2554″) and the cardinal instants (1.0076 → 1.0057 min) while the
modern window gave up 0.018″ — measured in plan 22 as a 0.04″-rms shift of the
Sun's elements (Δϖ −1.8″, Δe +1.1e-7 in 1970–2049) correlated with the existing
residual, not the in-between band (plan 21 had read it as the band's J2000
value: wrong in magnitude — re-read a hand attribution in both directions).
Found on the way: a
comment-only edit of a file the GOVERNED ΔT fit hashes
(`precession-composed.cjs`) flags that fit for a by-hand re-close — price a
header edit by the cascade's dry run before making it.

The equinox residual decomposed (plan 21 step 2, `equinox-vs-vondrak.js`):
the planetary precession is not a factor one can switch off — the integration
generates it from the moving ecliptic n̂(t) — so the decomposition is a VARIANT
that runs the shipped integration on the referee's own ecliptic (Vondrák's
P_A/Q_A as the ζ series). At −3000 the −7.87″ residual is −8.23″ lunisolar
and +0.36″ planetary (the planetary part ≤ 0.4″ at every epoch of ±3 kyr):
the model's N-body ecliptic is not the cause. Inside ±1 kyr the model is
within 0.17″ of the IAU 2006 (P03) polynomials and the two referees agree to
0.06″; beyond it Vondrák is a fit to La93, which carries no secular J₂
change, joined to P03, whose J₂ rate is −3e-11/yr against the model's cited
−2.7e-11/yr (≈ 1.6″ of the 7.9″ over 5 kyr) — part of the curvature is the
referee's seam. Pre-registered reading "≤ 2″ planetary → lunisolar, no model
change" taken; the model stays on its cited J₂ rate. Rule: when the quantity
in question is generated by geometry rather than by a coefficient, decompose
by swapping the geometry's INPUT for the referee's, not by looking for a
switch.

The second look (plan 22) swapped two more inputs. P03's constant J₂ rate
(−3e-11/yr) in place of the GIA channel moves the −3000 residual to −7.01″
(0.86″) and makes the deep obliquity meaningless (La2004 rms 136″ over
−200..0 kyr, 1790″ over −1000..0 — a constant rate extrapolated a million
years); the composed torque period held at J2000 (the tidal and lunar factors
off) moves it to −8.12″ (0.25″) and costs 52″ of deep obliquity. The GIA J₂
factor is near-linear over ±3 kyr (1.28e-4 at −3000, 5.3e-5 at 0, −2.4e-5 at
+3000). With the planetary part at +0.36″ the whole J₂ history contributes
+16.4″ and the solar torque at the eccentricity of date +3.9″ (the record's
"ellipticity only" and "solar torque only" columns against the secular law's
−28.15″); the −7″ that remains is the difference between the model's J₂
history — anchored on the observed satellite J₂ rate, shaped by glacial
rebound, constrained through the LOD/ΔT record — and a referee whose
long-term part (La93) has no J₂ change and whose near part (P03) has a
constant rate: a doctrine gap of the same class as the J₂ term itself, and
no observation reaches the equinox at the 10″ level 3,000 years ago. Recorded
as a theory-vs-theory tension with its parts named. Three more follow-ups
closed by measurement in the same step with NO change: the ζ series on the
de-rotated quadratic worsens the equinox (−12.5″ at −3000, −4.4″ at 0 AD —
ζ passes through zero at J2000, where the Cartesian mean is right) though the
deep obliquity improves (14.8 → 11.9″ rms); the ζ anchor on the series' own
node moves the referees 0.01″; the planets' 4-kyr series on the quadratic
passes the 0.9–4.3-kyr inequalities the window suppresses (Uranus 1.6°,
Neptune 2.6° in ϖ) while the Cartesian filter's own bias is 1e-4 on
Mercury's e and ≤ 1e-6 elsewhere.

### 1.28 A frame term frozen inside a channel exponent rides the wrong carrier — and the frame-free arguments inherit whichever argument carries the frame alone

**Measured** (plan 23, 2026-10-27). The lunar perigee and node of date ride
the solar-eccentricity channel rate(t) = rate₀·[g(e_E)/g₀]^s with the
Meeus-effective exponents s_ϖ 2.407 / s_Ω 1.018 — the values that
reproduce Meeus's of-date T² exactly. Each of those T² contains the
equinox's own acceleration (the general precession's T² term, 1.111″/cy²
Lieske), so the effective exponents carry a frame share that has nothing to
do with Earth's eccentricity: ~3 % of s. The mean longitude L′ carried the
frame differently — the model's own precession of date, `pFix`, with the
obliquity carrier normalized to Lieske's total. Two consequences, neither
visible to a gate: (1) M′ = L′ − ϖ and F = L′ − Ω, frame-free by physics,
inherited L′'s pFix uncancelled beyond the window — 0.27° at ±3 kyr
(compensated in the window by the frame shares to 0.006″/cy²), 2.47° at
10 kyr, 4.6–5.0° at ±20 kyr, 9.3° at −200 kyr, 38.8° at −1 Myr: 0.22° of
lunar latitude at 10 kyr, 3° at 1 Myr, eclipse geometry wrong by half a
lunar diameter at 10 kyr — recorded in doc 66 as "display-class", which the
measurement contradicts; (2) ϖ and Ω carried 3 % of the eccentricity
channel's own excursion (hundreds of degrees over the 100-kyr e-cycle) as a
spurious frame wobble, tens of degrees at 25 kyr. The lunar campaign stack
is validated inside ±3 kyr and sees neither. **The rule:** a frame
bookkeeping term is attributed to the frame and carried by ONE function on
every of-date longitude alike; a difference of two of-date longitudes is a
physical quantity only when both carry the same frame term. **The
construction:** the physical pair derived from the effective one by the T²
identity (2.4798 / 0.8660 on the Lieske input; the lab's pure-gravity
values are 2.486 / 0.880), pFix on all three longitudes, and the remainder
(Lieske's share minus pFix's measured in-window T², 1.069″/cy²) on the
obliquity carrier as L′ already does, so every argument's T² stays
Meeus-exact. **The window change:** M′ −6″ / F −9″ around 0 AD, +76″ / +57″
at −3000 (8″ of lunar longitude, 16 s of eclipse time), zero on L′, D and
M; a first construction with the frame on the obliquity alone read −33″ at
−3000 — the carrier's curvature, not the exponents — and was dropped. The
gate: `create-model-parity`'s counterfactual (+1″/yr on the dynamical
precession moves L′, ϖ, Ω and leaves M′/F within 1e-3″ to −1 Myr — the
1e-3″ is two ULPs of a 1e8-degree composition) and the closed-form row on
the derived pair. Doc 66's "0.658″/cy², 60 % of Lieske's" for pFix's T² was
stale against the code (1.069, 96 %).

**The follow-up the panel found** (the owner's Node Regression reading, same
day): notches at every multiple of 2,000 years. The arguments' bounded
carriers were, inside ±250 kyr, a single Simpson from J2000 to T whose node
count stepped with the span, so the accumulated error jumped there — 0.3–6″
on the obliquity carrier, 10–15″ on the planetary one at ±6 and ±22 kyr —
invisible on L′'s rate and a 0.5-d notch on the node period once the
remainder rode Ω. **The rule it adds:** an integral read at many endpoints is
a cumulative table from the anchor with a fixed cell, never a whole-span
quadrature whose node count depends on the endpoint — the value may be
accurate at every T and its rate still jumps where N changes, and a
derivative-reading surface (a period panel, a rate gate) sees the jump the
value-reading surfaces hid. All three carriers now ride one table (100-yr
cells to ±250 kyr); the plotted span's 378 notches became none; L′ moved
≤ 1.2″ inside ±3 kyr and up to 42″ at −1 Myr (the removed kinks; doc 109
§23.5). The chain-cycle counts' own 1-kyr tier beyond ±250 kyr showed the
same class as a ±0.3-d sawtooth per cell on the node period — its linear
read made each count's rate piecewise constant, and the of-date node is a
SMALL difference of two large counts (13.4 − 13.37 cycles/yr), so a slope
step of 1e-6 of either count landed fully on it; that tier now reads a
3-point Simpson over the partial cell (three integrand evaluations per read;
`chain-cycles/index.cjs`), 102 kinks over −300…−240 kyr → none; the dense
10-yr grid's linear read, 100× smaller in step and below every reader, stays
byte-identical.

### 1.29 A step converged where it was measured is not converged where the period shrinks — and a walk that is pure in its state can be banked, never a walk that accumulates

**Measured** (plan 24, 2026-10-27). The spin-axis walk's RK4 step was a fixed
250 yr, chosen when the hybrid was banked over ±1 Myr and converged there.
The torque period it integrates shortens from 25,772 yr at J2000 to 21,029
at 500 Ma, 12,036 at 2.5 Ga, 4,903 at 3.5 Ga and 598 yr at 4.4 Ga, so the
same step went from a hundred samples per cycle to two. Against a 50-yr walk
of the identical law the obliquity parted by 0.8″ at 5 Ma, 6.3″ at 25 Ma,
318″ at 100 Ma, 440″ at 500 Ma, 1,159″ at 1 Ga, 7,121″ at 2.46 Ga, and at
4 Ga the axis had collapsed onto the orbit normal (ε 0.07°); the equinox
phase by 101″ at 5 Ma, 1° at 25 Ma, 9° at 100 Ma. No gate saw it: the verdict
scores ±1 Myr, the paleo anchors read the precession RATE (the composed law,
not the walk), and the 2.46-Ga obliquity-period fork is a pre-registered
prediction with no datum yet. The 50-yr walk is converged (0.10″ / 10″ at
100 Ma against 10 yr). **The rule:** an integration step is chosen against
the shortest period IN THE DOMAIN, not at the anchor — state the steps per
period at the far edge, and gate the schedule against a finer walk at the
deep ages, not where the record happens to be. **The construction:** the
step schedule in one home (5 yr inside ±50 kyr; beyond, the largest divisor
of 1,000 up to 50 yr with ≥ 100 steps per period, per 1,000-yr cell), which
makes the walk to genesis 88 million steps (~15 min) — affordable once, not
per jump. Hence the bank: the walk is pure in (ŝ, t) (a node from the state
alone, nothing accumulates, the J2000 anchor an exact state), so its state
every 250 kyr is a seat a runtime resumes from and reaches the SAME nodes
bit-exactly — proven on the record (seat-and-resume per 20th checkpoint) and
on both Node twins (`test:sampler-purity` bank row, −3/−137/−498 Myr, with
and without the bank, both visit orders). The tell for whether a walk can be
banked: does a stored state plus the step rule reproduce the next stored
state bit-for-bit? A walk that carries an accumulator, a cached rate or a
grid-dependent phase cannot be (doc 111 §1.10's class), and banking it would
ship two models. The first ε read at −400 Myr: ~200 s from J2000 in the
browser at the converged step, ≤ 2 s seated (`test:perf`'s absolute row —
absolute, because a missing bank would hide behind the ratio form). **What
the seat does NOT buy, measured:** the full scene jump to −400 Myr still
takes ~220 s headless (84 s in Node) with the bank landed — the lunar
cumulative tables (the chain-cycle counts' 1-kyr coarse tier, the three
carriers) integrate from J2000 to the target and read ε/e at every cell, so
the sampler needs nodes over the WHOLE span and the walk is paid anyway; a
seat helps a point read, never a cumulative integral. The remedy is the
TODO's original clause — bank the cumulative sums beside the spin states, so
a deep table starts at the nearest checkpoint's value — with its own
question (a seeded running sum is not bit-identical to the contiguous one;
the deep lunar phase is a 1e-11 quantity in any case). The rule: price a
"the jump is now fast" claim on the FULL jump, not on the quantity the bank
holds, and gate the one the bank guarantees.

**The cumulative-integral corollary (plan 25).** A seat helps a point read,
never a cumulative integral: the lunar tables integrate from J2000 and read
the integrand at every cell, so with the spin bank seated a deep lunar read
still cost 0.21 s per Myr (84 s at −400 Myr). Banking a cumulative sum has
its own identity question — a seeded running sum is a DIFFERENT association
of the same cells and not bit-identical to the contiguous one. **The rule:**
give the table a segmented association in BOTH paths (within-segment sums
from zero, segment prefixes kept apart, a value = prefix + partial), so the
bank supplies exactly the prefixes the runtime would compute itself and
bank and no-bank are bit-identical by construction; price the one-time
association change (here 1–2 ULP of the cycle count beyond ±250 kyr, 0.016″
of lunar longitude at −3 Myr, nothing inside the dense tier) and record it,
rather than gating a tolerance between two paths that would then be two
models. Measured after: 84 s → 2.9 s at −400 Myr in Node (the dense
±250-kyr grid build, ~1.9 s, is the pre-existing floor of every deep read).
**Its cross-runtime corollary:** "bit-identical" holds within one runtime; a
seat's sanity check that compares a banked value with the runtime's own
must be a relative one, because the browser's V8 and Node's differ at the
last bit (the cross-engine finding above) — the first browser run with both
banks landed still took 215 s at −400 Myr, every lunar seat silently refused
by a bit-exact check of the dense-edge value; at a 1e-9 bound the five chain
counts and the planetary carrier seated (their edges agree to the last bit)
and the obliquity carrier still did not (2.4e-9: its integrand is a
difference of nearly equal obliquities, which amplifies ε's last-bit split),
116 s. The bound is 1e-7 (a counterfactual's class is ≥ 1e-6) and the perf
gate now asserts that every seat TOOK, by name — a refused seat is a
full-span walk and must fail loudly, not hide in a time. The browser tier's
profiler, not a gate, found the first case: the perf row read the number,
the CPU profile named the walk under `computeObliquityEarth`; the seat
diagnostic (`lunarSeatStatus`) named the table. The third case needed an
UNMINIFIED bundle to name its caller: with every seat taking, a 102-s walk
still ran AFTER the jump, in the render loop's lighting update, through the
browser's eclipse finders — which held the `frameworkSunDeps` of the model
instance alive when they were created and were never rebuilt when a bank
landed (the tier model was). **The rule it adds:** every holder of a model
instance's surface is rebuilt on an artifact landing, not only the instance;
grep the captures (`_tierUmbraModel.`) when adding a landing handler. And the
Sun's mean-longitude table (100-yr cells over the whole span) was the next
10 s — seated the same way (plan 26).

**The second measurement the bank made possible — convergence is not
prediction.** Two bank runs in one cascade, on the two sides of the climate
refit the converged walk itself caused (the obliquity-band L1 periods moved
0.6–1.2 ppm, so the GIA J₂(t)/J₂₀ differs by 1.4e-6 at 100 Ma between the
sets), differ by 135″ in ε at 100 Ma, 401″ at 500 Ma, 1.8° at 2.46 Ga and
127° of equinox phase there — a thousand times the step's convergence. **The
rule:** a converged integration of a given α(t) is not a converged VALUE;
state the sensitivity of the deep quantity to its inputs' class (here 1e-6 in
the precession constant → 135″ at 100 Ma) beside the step convergence, and
say beyond which age the input class dominates (~10 Myr here, where the
sensitivity passes 1″). The two runs are the measurement; a single run would
have shipped the bit-exact gates and never seen it.

**Three latent defects the same change exposed, all measured and fixed in
it.** (i) A seat exactly AT a checkpoint that is also a grid node took no
step, so the seat's node was never stored and `at()` threw "outside the
built range" — test bank code at ALIGNED epochs. (ii) The package slice
mapped the engine year to an age with `startmodelYear` (2000.5) where its
own `yearToTMa`, tools/lib and the browser use 2000 — a 1e-6″ twin split in ε
at −100 kyr, invisible until the bank walked by one twin had to seat the
other bit-exactly (`test:sampler-purity` block 3). (iii) The cross-engine
gate's in-era solstice rows (2 ULP of the JD) read 1.5–11.5 ULP apart at
−4000/−2000 once the constants moved: the hybrid's K_LUNI self-anchor divides
a one-year equinox-longitude difference (0.0139°) by itself, amplifying the
runtimes' last-bit Math differences (7 of 120 canaries differ between
HeadlessChrome 151 and Node 22) to a ~1e-12 relative rate, which 84° of
walked precession at −4000 turns into 1e-10 d; the row's tolerance now names
it (16 ULP), the mechanism being pre-plan-06 and the constants' move merely
re-rolling the roundings.

---

### 1.30 A fitted line cluster is never extrapolated beyond its window — and a baseline is referenced to TODAY's state, not to a window mean

**Measured** (plan 26, 2026-10-28). The GIA channel read the post-MPT L1 set
(28 lines fitted on 0–1,000 kyr of LR04, R² 0.785 there) at every epoch.
Scored on the other LR04 windows with each window's own mean removed: R²
−26.1 and −26.3, rms 1.5 ‰ against a 0.3-‰ record — the closely spaced lines
(29.0/29.6/29.8 kyr; 94.9–105 kyr) fit the window by cancellation and
de-phase beyond it; the channel's J₂ excursion read 1.7·10⁻⁴ inside the
window and 6.9–7.5·10⁻⁴ beyond, at random phase. The other regimes behave
the same way outside theirs (iNHG–MPT: 0.48 at home, −3.2 / −6.9 away). **The
rule:** a fitted harmonic set is a description of its window; applied
elsewhere it is noise with the record's units, however bounded it looks
inside — window it (C¹ joins), and where no proxy exists carry no orbital
term. **The second finding, the same change:** the deep baseline was first
written as "the inventory's metres below ZERO", and zero was the regime's
window mean, not today's interglacial ice state — the Antarctic-only era read
as MORE ice than today (−7.8·10⁻⁶ instead of +2.0·10⁻⁵). A baseline relative
to the present is referenced to the present's value of the oscillation it
joins (`todayPermil`), so that the deep state is "today's ice minus what was
absent". **Measured consequences:** the era moves 3·10⁻⁹ (the 405-kyr line,
not ice, left the proxy: 24 m/‰ against ~67 for every orbital band), the
Quaternary ≤ 1.7·10⁻⁶, the deep state sits at +1.74·10⁻⁴ before the
Antarctic glaciation and +2.0·10⁻⁵ after it; the deep obliquity's VALUE
moves by degrees (its sensitivity, 450″ per 10⁻⁶ at 100 Ma, is the reason it
is served as a band — §1.29).

### 1.31 A clock has ONE age axis — a third one hides from every gate that rides it

**Measured** (the A-section review, 2026-11-01). The scene-year-lengths gate,
run at ±100 kyr and ±1 Myr instead of its −4000/+10,000, found every level
exact (RA ≤ 0.23″, the solstice declination against ε 10⁻⁸″, e 2·10⁻⁷, the
perihelion 1.5″, the published cardinal instants ≤ 6 s) and all three measured
years — sidereal, tropical AND anomalistic — long by ONE common amount:
+0.18 s at −1 Myr, +0.05 at −100 kyr, +0.005 at −25 kyr, +0.08 at +1 Myr.
Three years with different physics sharing one offset is the time axis, not
the orbit. Ruled out by measurement: the Sun's mean-longitude table (≡ the
law to 3 ms at every epoch), the gate's own age mapping (0.03 s), every
bridge's rate (the scene's, the package's `jdTTFromUT`, the epoch section —
all within 1 ms/yr of each other). Synthetic crossings pinned it: events of
the mean-longitude table matched the laws everywhere; events of the eclipse
tier's longitude reproduced the gate exactly. **The cause:** the eclipse
tier's ΔT (`frameworkDeltaTSecondsAtJD`, the clock of the certified Sun the
scene displays and the finders search on) read its age off a LINEAR count of
365.2422-d years from the model start, while the Moon, the frame, the
besselian tier and the scene bridge read the CALENDAR decimal year — 365.25-d
years before 1582. Two age axes 2.14·10⁻⁵ apart: 0.04 yr at −3000, 21 yr at
−1 Myr, 9,000 yr at −400 Myr, times the ΔT rate — the certified Sun sat 1.2 s
of TT from the Moon at −3000, 108 s (4.4″) at −25 kyr, 1.9 d (1.9°) at −1 Myr,
850 yr at −400 Myr. In the era below every referee (the canon floor is 20 min);
at depth a Sun on its own clock against the Moon and the planets, and a deep
eclipse list searched with it. **Why no gate saw it:** every deep Sun check
was a tautology on that axis — the published cardinal instants, the RA at the
cardinals and the perihelion level compare the eclipse tier's Sun with itself
or with the frame its longitude is defined in; the era rows of the one gate
that measures against the LAWS sit where the gap is a millisecond. **The
fix:** one ΔT — `frameworkDeltaTSecondsAtJD` computed directly on the
calendar age, and the UT→TT bridge, the finders and the besselian dependency
all read it (never recovered as a JD difference: two JDs near 2.4 million
subtract to 1e-5 s of round-off, which broke the bit-exact parity pin on the
first cut), the audit's referee reads the model's bridge, and the gate
carries the deep rows (±100 kyr, ±1 Myr; the
four-cardinal estimator's floor of ~0.04 s at e = 0.05 named in its
tolerance). The Node twin `frameworkDeltaT` keeps the snapshot's linear count
— `tools/lib/deep-time.js` is a hashed input of the N-body series — and is no
longer a finder axis anywhere. **The rule:** a model has as many clocks as it
has age mappings; name the axis of every bridge at the boundary (the three
year axes of plan 06 — calendar, engine, SI-tropical count — are three
CLOCKS when a ΔT reads them), and gate a tier's clock against another tier's
events, never against its own.

A fourth clock surfaced in plan 27 step F, from a screenshot: the Moon beside
a focused Earth lit from a direction unrelated to the Sun at the genesis,
while the Earth's own shader (the rendered Sun's direction every frame) was
right and a focused Moon was right. The directional light's Earth-focused
rebuild (the shadow map's in-era precision: `updateSunlightForPlanet`) reads
the Sun's longitude through the browser's eclipse finders, whose `_eclDeltaT`
still read `meanDeltaTSecondsAtAge` at the age of the UT day's CIVIL label —
the clock every other browser read had left for the bridge. Measured, the
light against the true Sun → Earth direction: ≤ 0.003° to year 1000, 0.017°
at −100 kyr, 167.6° at −10 Myr, 25.3° at −100 Myr, 107.9° at −1 Gyr, 80.5° at
the genesis — a sub-year error in the longitude's argument is a random
direction. `_eclDeltaT` now reads the scene's one bridge
(`_sceneDeltaTSeconds`, the function `_sceneJdTT` is built on): ≤ 0.006° at
every epoch; in the era the two clocks part by milliseconds, so 74 browser
golden rows moved at ≤ 4e-7 relative (the `dtFw@` rows by −4.7 ms, the
ancient eclipse magnitudes by 4e-7, the umbra ground points by 4e-6°) and
were re-recorded with this reason.

A fifth, from the next screenshot (the first eclipse after the genesis): the
certified umbra ring 49° (5,485 km) from the Moon's rendered shadow, labelled
partial where the rendered geometry is central. The lunar series' distance of
date (`moon/series.cjs fullDistanceKm` — the finders, the shadow radii, the
besselian ground point, the API's `distanceKmAtJD`) read the cited Earth–Moon
history at an age on the SI-LINEAR axis, 365.2422-d years from the model
start, while the navigable domain, the bridge and every other physics read run
on the ENGINE age (Julian years from J2000.0 on the TT instant). The two part
by 2.14e-5 of the span — 95 kyr at the genesis — so the series' age crossed
the history's end inside the navigable domain (which stops 15 kyr before it on
the engine axis): the history refused, and the getter's fallback answered with
the J2000 constant in the package (the eclipse tier's Moon at 366,681 km
where the rendered one sat at 37,834) and with the epoch-mutable global in the
browser — right by accident, which is why the browser's own finder read the
right distance and only the package-placed ring was off. The three getters
(package, browser, tools-lib — the matched triple) now read the history at the
engine age with bit-identical arithmetic; measured after: the tier's Moon
37,834 km, the umbra 1,560 km, the penumbra 1,916 km, γ 0.08. In the era the
age moves by 0.47 yr at J2000 (the chain's 2000.0 anchor against the former
2000.5 model start) and 2.14e-5 of the span beyond: 1.8 cm of Moon distance at
J2000, 2.4 mm at −3000 — the certified instants at their microsecond floor,
re-baselined with this reason. The rule holds its shape: a fallback that
answers a refused age with a CONSTANT hides the refusal; inside the domain a
refusal must not be reachable, and beyond it the answer must say so.

A sixth, the same day, from the Predictions panel's cardinal rows at the
genesis: the panel seeded the finder with the displayed year's calendar
midpoint handed over as a UT instant. Beyond the label seam that calendar JD
is the TT instant, 2.3 Gyr of days from the scene's UT axis, and the bridge
maps it as a UT label to 3.35 Ga — so the rows showed that epoch's crossings
(157 UT days apart, a 633-day "year"), the next-year seed was +365.2422 days
where a UT day is a solar day of date (1,430 in the genesis year), and the
Date rows printed the civil date of the UT count. The scene-year → engine-year
map, the Orbit Analysis paper's cardinal dates and month longitudes and the
report/analemma date strings carried the same pattern. The rule in its third
form: a CALENDAR JD is a UT instant only inside the seam; every seed and every
label goes through the one mapping the Date field uses. Still open in the
finder itself: its Newton step is the J2000 rate per UT day, 3.7× too large at
the genesis (0.2° of residual after 20 steps) — the slope of date, with the
next model-slice edit.

### 1.32 An artifact that reads the coefficients it feeds is a loop — cut it at the source, never declare it

**Measured** (the vocabulary cascade, 2026-11-01, first read as a run-to-run
non-reproducibility). The T1 export's realized pole rate over the LR04
window — the rate the obliquity lines carry — was recorded at three values
across three cascades on identical declared inputs: 50.519061940870934,
…87394, …87398 ″/yr. Every link proved deterministic: three Node processes
reproduce the mean bit-for-bit; the Python climate export reproduces itself
bit-for-bit on a fixed thread count. **The cause:** the forcing-only mean
reads the climate formula's coefficients — through the GIA α(t) channel in
the LOD of date that scales the composed torque rate (the ellipticity switch
leaves the J₂ factor out of the PRODUCT, not α(t) out of ω(t)) — and those
coefficients are what the lines it feeds come back as, through the embed.
Each recorded value was computed on a different embed; the artifact was
fresh by hash and stale by value, because the coefficients are not in its
inputs block. The loop's gain, measured on the scratchpad twins: 3·10⁻¹² ″/yr
into the rate moves 698 coefficients by at most 1.7·10⁻¹³ (linearly: 10⁻⁹ →
7.4·10⁻¹¹, 10⁻⁶ → 7.4·10⁻⁸), which comes back as 4·10⁻¹⁴ in the rate — 0.013
per pass, convergent, but each pass is a by-hand ΔT re-close (deltaTStart by
a few µs) and a campaign re-baseline for nothing physical. A second hazard
found on the way: the export's ridge solve is BLAS-thread-count dependent —
one thread against sixteen moves 109 coefficients at 10⁻¹⁴ relative on
identical inputs, so a regeneration on another machine moved the governed
hash while every input hash stayed fresh. **Why not declare the
dependency:** the freshness gate hashes whole file bytes; an artifact
declaring the coefficients it feeds is re-stamped after every export,
re-stales the lines, re-stales the export, and never settles. **The fix:**
the rate is recorded at its physical precision — one 500-yr step of window
edge is worth 8·10⁻⁶ ″/yr, the step itself 7·10⁻⁶, the loop ≤ 3·10⁻¹²; 10⁻⁹
sits between, so one cascade reaches the fixed point by construction (the
exporter prints the raw value and its distance to the nearest rounding
boundary, and says so when that distance is within the loop's jitter); and
the two climate scripts pin ONE BLAS thread before numpy loads. **The rule:**
a governed artifact's inputs are what it READS, including the embed it reads
through `createModel`; when what it reads is what it feeds, the loop is cut
at the source by recording the quantity at its physical precision, never by
declaring the input and never by a tolerance downstream.

### 1.33 A scene has ONE navigable domain — three tables with three edges, and a line–sphere root without its sign

**Measured** (the owner's lunar-eclipse view at −2 Gyr, 2026-11-01, reproduced
headlessly). One screenshot, four defects:

1. **The umbra ground point had no side check.** `eclipse/besselian.cjs
   umbraGroundAt` intersects the Sun→Moon line with the ellipsoid and took the
   near root unconditionally; at a lunar eclipse the Earth lies BEFORE the Moon
   on that line, both roots are negative and the near one is the sunlit face.
   The always-on umbra disc and its halo drew the Moon's umbra there at every
   lunar eclipse, era included (2025-09-07 total: 8°S 101°W; the owner's
   event: 42°N 126°W) — the "penumbra" ring in the picture. The scene's
   closest-approach twin (`umbraNASAConventionAtJd`) had the same blind spot.
   Fix: a negative root is no hit (`s < 0` → null; `t_closest < 0` → null).
   The scene re-learned it once: the footprint shader's fallback (the near
   intersection while the tier refuses, meant for γ at 1) took the root
   without its sign and painted a solar umbra on the sunlit face 1.3 days
   after a total lunar eclipse at the genesis (the owner, JD
   −2469702431722.98); `updateUmbraDisc` now hides the cap unless the axis's
   foot lies ahead of the Moon, and the browser golden pins the cap's state
   at two full Moons and two solar eclipses (`umbraCap.visible@*`).
   No solar event moves; the audit re-stamps.
2. **Two clocks beyond ±500 Myr.** The engines' cumulative position tables
   (JD ↔ scene position, 10-kyr cells) spanned ±500 Myr. Beyond the edge
   `posFromJD` ran its within-cell Newton solve off the grid (one trapezoid
   from the edge cell) while `jdFromPos` fell back to a linear J2000-year
   count: the scene sat 44 kyr off at −700 Myr and 817 kyr off at −2 Gyr
   (requested JD −730,229,465,119.25, panel −729,931,065,878.58). A jump "to
   an eclipse" beyond ±500 Myr showed a random lunar phase — the big soft
   dark disc in the picture is the Moon's shadow-map penumbra at that random,
   near-new-moon instant, not an eclipse feature.
3. **The rendered Moon carried a(t)/a₀ twice.** `moon/series.cjs
   fullDistanceKm` scales the two-term distance by the recession at the
   series' TT date (the one home); both scene twins multiplied by a(t)/a₀
   again (`_meeusDistKm = _sr.distKm * _aRatio`). Measured identity: scene =
   series × a(t)/a₀ to 1 km at −5.34 Myr and 3 km at −400 Myr; the series'
   own 60-day mean at −400 Myr is 370,040 km against the cited 368,396.
   Invisible in the era (0.05 % at −5 Myr), 4.3 % at −400 Myr, 14 % at −2 Gyr;
   no gate read the Moon's distance at depth.
4. **The jump was the unbanked carriers.** With both banks seated at −2 Gyr the
   spin walk cost 0.02 s and the Moon's longitude 298 s in Node, 490 s in
   Chromium: the lunar cumulative bank stopped at ±600 Myr and the two bounded
   Lp carriers (`moon/arguments.cjs makeDeepCarrier`) integrated ε over the
   remaining 1.4 Gyr at 0.21 s per Myr (the chains' Simpson fallback is cheap);
   a second model instance of that walk ran Node out of heap.

**The cause behind 2 and 4:** three tables had three edges — the position
tables ±500 Myr, the lunar bank ±600 Myr, the spin bank −4,425/+1,000 Myr —
and nothing named the one domain the scene can be taken to. **The fix:** ONE
home, `@essrt/physics time/navigable-domain` (−4,425 Myr, the last spin
checkpoint inside the cited Earth–Moon history; +1,000 Myr, the charts'
range), read by both position tables, the chain and carrier caps, the lunar
bank generator (now asymmetric, like the domain) and the spin bank generator.
The Node twin's table over the whole domain builds in 0.38 s and closes the
round trip to 1e-7 yr at −4.4 Gyr. The MODEL's validity stays ±500 Myr: the
domain is where the scene can be looked at, not where the model is certified
(the deep lunar phase is reproducible, not converged; the deep obliquity is a
band). **The rule:** every table a deep jump reads is built or banked to the
SAME named domain; beyond a table's edge the two directions of a round trip
must share one extrapolation or refuse; and a screenshot's feature is
attributed by reproduction (the headless harness, `__test__.jumpJD`), never by
eye — the ring was a solar umbra, the disc a shadow map, and neither was the
eclipse.

### 1.34 A drawn body and its certified ground point share ONE rotation angle — two conventions agree only where both were calibrated

**The observation.** At a solar eclipse near −2 Gyr (JD −730,229,465,078.06)
the certified umbra ring sat about 90° of longitude east of the Moon's
rendered shadow. The lunar-eclipse view of §1.33 had just been fixed; this was
a different defect.

**The measurement.** The scene spun the Earth by the scaffold rule
`rotation.y = rotationSpeed × pos + phase` — a fixed number of sidereal turns
per TROPICAL YEAR OF DATE (`pos` counts the year-of-date integral) plus a
fitted half-day phase anchor — about the engine-placed pole of date, from the
equinox of date. The certified umbra (and the observer tier, the eclipse
audit, the API) maps its hit vector to a longitude with the tier's
`computeGmstDeg(jdUT)` — linear in UT days plus the IAU T² term. Two Earth
rotation angles, read against each other in Node (the Node twin's `posFromJD`
is the browser's, gate-identical):

| epoch | scene − tier | of which the IAU T² term | of which the year-of-date axis |
|---|---|---|---|
| 2024-04-08 (the eclipse) | +0.008° | 0 | +0.008° |
| −3000 | −1.28° | 0.97° | −0.31° |
| −100 kyr | −162° | 28° | −134° |
| −1 Myr | −57° | 273° | −144° |
| −400 Myr | −13° | 240° | −133° |
| −2 Gyr (the owner's JD) | +95° | 270° | +6° |

Two drifts, both random-phase beyond ~100 kyr: the tier's T² term (the IAU
precession-in-RA polynomial — 0.97° at −3000, inside the audit's ground-km
calibration, 270° at −2 Gyr where it means nothing) and the scene's
turns-per-year rule against the tier's turns-per-UT-day (the year of date
holds a different number of days: 7.8 % at the Devonian). The era's 0.008°
(2 s of rotation) was the phase anchor's residual — calibrated at six modern
eclipses and gated nowhere beyond them.

**A false lead, measured on the way.** The scene-relative diagnostic
`umbraNASAConventionAtJd` projects the shadow axis's CLOSEST-APPROACH point
radially to the surface; at γ = 0.34 that is 60°N 163°E where the axis
PIERCES the surface at 25°N 104°W (NASA's greatest-eclipse coordinates are
the piercing point). Its γ is right; its latitude/longitude are a different
point, 93° from the shadow at the 2024 eclipse — not a frame error, a
definition. The snapshot goldens pin it as a scene-chain regression probe,
nothing reads it as a position.

**The fix.** ONE home: the scene's Earth spin IS the tier's GMST at the scene's
UT JD (`createModel().eclipse.gmstDegAtJD`, `GMST = 270° + rotation.y` under
the chart Greenwich-at-−X in the axis basis [ŝ×ĝ, ŝ, ĝ]); the scaffold rate,
the phase anchor and the J2000 sidereal-day constant are deleted. The drawn
Earth and the certified ground point now agree by construction at every JD;
in the era the scene moved by its 0.008° residual (the snapshot goldens'
scene-chain rows re-recorded). The epoch-consistency gate reads the spin
through the frame probe after a jump and pins it to the tier's GMST at the
2024 eclipse and at −700 Myr (1e-9°). **Open, recorded:** the T² term is a
polynomial in deep time; its bounded replacement is the model's own
accumulated precession in right ascension (the integral of ψ̇(t) cos ε(t) −
χ̇(t) from J2000, banked with the spin walk), which must reproduce the IAU
quadratic inside the audit's window before it can ship — a B entry.
**The rule:** a body drawn from one convention and a point placed on it from
another are aligned only where both were calibrated; the angle that maps a
hit vector to a longitude has ONE home, and the gate reads it at an epoch the
calibration never saw.

### 1.35 The Earth–Moon genesis is not where the label says — the scene's deep clock, a tier span that overshot its bank, and a finder stepping the wrong month

**The request.** Show the first solar eclipse after the Earth–Moon genesis
(the cited history's end, 4,429 Ma) from the eclipse panel, with its umbra and
penumbra. The search from the navigable domain's edge found nothing, and
measuring why found three things.

**(a) The scene's deep clock is split.** The scene's Julian Day is UT (the
calendar date, the Earth's spin, the finders' axis); its position table counts
that UT day count in SI-day years (`meanTropicalYearDaysAtAge`), and so does
every label the position feeds (the Date, the Predictions panel's age). Every
physics read adds ΔT and runs on TT. In the era ΔT is seconds; at deep time it
is the accumulated difference between solar days and SI days, itself
geological:

| labelled epoch (UT axis) | ΔT | TT age the physics draws |
|---|---|---|
| −1 Myr | 123 yr | 1.000 Ma |
| −2 Gyr (the owner's eclipse) | 341 Myr | 1.66 Ga |
| −4.425 Gyr (the position table's edge) | 1.34 Gyr | 3.08 Ga |

Confirmed on the Moon: at the −2 Gyr label the rendered Moon's 61-day mean
distance is 335,614 km — the cited history at 1.66 Ga (335,222), not at 2.0 Ga
(329,626) — while the Predictions row reads the labelled age. At the position
edge the scene shows the 3.08-Ga system; the genesis (TT 4,425 Ma) lies beyond
the navigable domain. A second symptom follows from the same mislabel: the
ΔT bridge takes the LABELLED age (`_sceneJdTT` reads the calendar year of the
UT JD), whose LOD is the 4.4-Ga one, so one Julian Day of the scene advances
0.27 day of physics at the edge — the Sun moves 0.3°/d, the Moon 5.5°/d, and
a search of 400 scene days covers 108 physical days. **Open, a design
decision:** the position table integrates the year in solar days of date
(`meanYearInDaysAtAge` — the Predictions panel's own "LOD days" row), so the
UT day count's year equals the TT age; the era is unchanged to 1e-8; beyond it
every position-labelled surface relabels by ΔT and the deep goldens re-record;
a gate pins the scene's labelled age against the age the Moon series reads.
Until then the deep labels are stated as UT-axis labels, not ages.

**(b) A tier span that overshot its bank — the deep jump's slow half.** The
scene's deep sampler walked the one-source movement to its TIER span,
`_hybridTierSpan(need)` = 1.25 × a need already 1.25 × |t|: for every query
beyond |t| = 2.83 Gyr that span passed the spin bank's deepest checkpoint
(−4,425 Myr) and the walk ran unseated from there (the package's own rule
walks to two grid nodes past the query). Measured on a fresh page (the hook
`earthObliquityHybridAt`): 0.06 s at −2.8 Gyr, 63 s at −2.9 Gyr, 33 s more at
−3.0 Gyr, 130 s for the first jump near the position edge — with the bank
complete and seated, Node reading the same ages in 0.03 s. The fix is the
package's rule; the values are bit-identical (23.3075929° at −2.9 Gyr before
and after); the reads are 0.06 s, the edge jump 0.8 s, the −2 Gyr jump 2.1 s.
The perf gate's row 0b′ reads ε at −4.4 Gyr on a fresh page (≤ 5 s absolute,
the 63-s class far above it). **The rule:** a walk that seats on a bank is
only as cheap as the farthest point it is asked for — a tier's growth factor
is a request for that point; gate the DEEP end of every seat, not only the
first bank epoch.

**(c) A finder stepping the wrong month.** `findSolarEclipsesInRange` steps a
60th of the J2000 synodic month; at the genesis the month is 0.9 days. The
finder takes an optional step (`opts.stepDays`), every era caller unchanged
and bit-identical; `eclipse.firstSolarEclipseAfterJD(jdStart)` scans with the
synodic month OF DATE from the deep-time chain, and
`eclipse.shadowRadiiAtJD` gives the Besselian l₁/l₂ on the fundamental plane
(2024-04-08: umbra 65 km, penumbra 3,418 km; at the 3.08-Ga system the
position edge shows: umbra 267 km, penumbra 3,215 km, the Moon at 321,469 km).
The genesis search itself waits on (a): a first eclipse found "after the
edge" today is the first eclipse of the 3.08-Ga system, 445 scene days in.

### 1.36 One deep clock — the UT clock counts solar days, and a bridge solved on the label is a bridge solved on the wrong instant

**What plan 27 step A measured first (A1).** The chain's deep ΔT is a Simpson
integral of the LOD history whose integrand was `(86400 − LOD) × yearS / 86400`
— SI days per year. The UT clock counts SOLAR days: a year of date holds
`yearS / LOD` of them, and ΔT grows by `86400 − LOD` per solar day, so the
integrand is `(86400 − LOD) × yearS / LOD`. The two are one in the era and
part at depth exactly as 86400/LOD does; the node cap (1,024 Simpson nodes)
costs nothing — the capped and a 1-kyr Simpson of the same integrand agree to
five digits at every age:

| age | shipped ΔT (yr) | exact integral (yr) | exact / shipped |
|---|---|---|---|
| 1 Ma | 123.39 | 123.40 | 1.0002 |
| 400 Ma | 1.874e7 | 2.003e7 | 1.069 |
| 2 Ga | 3.414e8 | 4.313e8 | 1.263 |
| 3.08 Ga | 6.720e8 | 9.097e8 | 1.354 |
| 4.425 Ga (the genesis) | 1.345e9 | 2.321e9 | 1.726 |

The position table rebuilt on solar days of date (§1.35 (a)'s candidate)
reproduces the exact integral to four digits — the two are the same integral.
The era differs by 2e-8 (the LOD day is 86,400.002 s).

**The design, and what the measurements rejected on the way.** The scene's
coordinate stays a tropical-year count of date (every scaffold motion is
`speed × pos` per tropical year). Its TT instant is the position table (SI days
per tropical year of date — the former twins' table, now ONE home in
`phase/deep-calendar`, normalised, analytic partial cell, built and read under
the SHIPPED α: the α-reference pin (`withLatticeAlpha`) moves the J2000 day by 3.7 ms and the era's UT
count by 32 s in 24 years; the former twins built unpinned, 1.65 d apart from a
pinned build at −400 Myr). The UT Julian Day — the solar-day count the UT clock
keeps, the day the scene navigates and labels by — is that instant minus the
engine's FULL ΔT, and a UT→year read solves that bridge implicitly. A second
table of solar days per year, measured and rejected: it counts the MEAN day, so
its UT axis parts from the civil one by the fitted era corrections (24 s in 24
years, 1.3 h at −3000). The bridge has TWO ages, named: the raw integral is a
function of the physical (TT) age the UT count has reached; the fitted era
corrections (the Bond/Hallstatt/Jose cycles, the resonator) were fitted on the
civil calendar year of the UT count and keep it (`meanDeltaTSecondsAtAges(tMaRaw,
tMaCorrections)`); the raw age is read on the civil axis too (the proleptic
Julian count before 1582, the engine's Julian-year axis to a constant 12.5 days
— 1 s of raw integral at −3000 if read on the other, nothing at depth). The
implicit solve is a Newton step with slope 86,400/LOD (solar days per SI day of
date): the fixed point diverges where the UT clock outruns TT by more than 2×,
beyond ~1 Gyr (−8e6 yr at −2 Gyr, +4e9 yr at the edge), and the inverse slope
overshoots (measured both); it starts from the civil label's reading inside the
era and from the table's deepest instant beyond it, where the label's age is
outside the chain's domain (the UT count of 4.4 Ga of TT reads 6.7 Ga).

**The raw integral itself.** A Newton solve calls the raw integral a dozen
times per bridge read, and the chain's per-call Simpson cost 26 ms at the edge
(1,024 nodes over 4.4 Gyr of LOD history, each node an α(t) read): the first
gate run with it sat 18 minutes in one deep jump's finder scans. Its accuracy
was uneven too — the node count `max(32, 10·T)` put 31-kyr nodes on a megayear:
4e-5 of ΔT (two days) at −1 Myr, 3e-6 (6 kyr) at the genesis, while the era
read 1e-10. The raw integral is now a lazily grown cumulative table: 100-yr
cells to ±1 Myr, 10-kyr cells beyond, per-cell Simpson with its midpoint,
read in O(1) with a Simpson over the partial cell — 3e-9 of ΔT at 24 yr
(80 ns), 3e-8 at 300 yr, ≤ 1e-9 everywhere beyond, against a 1-yr/1-kyr
Simpson; 0.04–0.08 ms per bridge call at any depth, the table to the genesis
built in 0.3 s. One 10-kyr cell everywhere was measured first and rejected: the
GIA channel's 20-kyr lines modulate the integrand, and a single quadratic over
10 kyr read 341 s at −10 kyr (1e-3). The difference of the two position tables
(SI days minus solar days) was measured and rejected as the integral's home
too: two trapezoid tables' residues do not cancel (1.9 s at 24 yr, 2e4 s by
10 kyr). The governed ΔT fit, re-closed on the new raw integral, moved its
coefficients inside their 1e-6 noise (deltaTStart by 51 µs). The era
campaigns, which refuse on any divergence, were re-baselined at the bridge's
floor and nowhere else: the eclipse audit's full-precision mean residuals by
18 µs (lunar, on 1,214 s) and 23 µs (solar, on 664 s) with every rounded row,
count and centerline reproduced; the lunar alignment's canon geometry by 4 and
5 µs; the canon recall by one event of ~12,000 across the tight threshold
(9,868 → 9,869) and one era's signed median by 0.01 min — the bridge's 72 ms
at −3000 rounding through a boundary. The N-body series re-stamped
bit-identically.

**The result.** The era bridge moves by 4e-7 s today, 5 ms at −135, 72 ms at
−3000 — the label's own ΔT, the §1.31 class at its floor. The deep labels now
mean the age the physics draws: the −2 Gyr label renders the 2.0-Ga system,
the edge the 4.42-Ga one; round trips close to the double's resolution at
every depth; the scene's Earth makes the year's own number of turns per year
of date. The Date and Time beyond ±3,000 yr of J2000 were put on the civil
date and time of the position's TT instant (the Julian Day field staying the
UT count) — a second clock on the panel, ΔT(3 kyr) = 7 h from the first at
the seam, replaced by the count form on the one UT clock in §1.40. The
epoch-consistency gate reads, at −1 Myr,
−400 Myr, −2 Gyr and the edge: the scene's year of date ≡ the civil year of
the model's bridged TT instant (two runtimes, 1e-6 yr), the TT instant of the
position ≡ the UT JD plus the model's bridge, the Moon's ring ≡ the cited
distance at the labelled age and the placed Moon within the eccentricity of
its ring, the browser's navigable range ≡ the twin's, and a jump past either
edge lands on it. **The rule:** a clock's bridge is solved on the instant it
lands on, never on the label it starts from; the integrand's day is the day
the clock counts; and a quantity with two fitted axes names both
(`…AtAges(tMaRaw, tMaCorrections)`).

**A year COUNT is not an age.** The first deep label wrote the position's
tropical-year count of date as a season date, and the epoch anchors read
that count as the age: the owner's screenshot at the −4.42 Gyr label showed
the Moon well outside its ring. The two axes — the count of tropical years of
date and the civil year of the TT instant (the chain's age, the spin bank's
edges) — part by the year-length history: 0.055 % at the genesis, 2.4 Myr,
over which the cited Moon history moves 20 % (111,384 km at the TT age of
that label against 95,833 km at its count; the gate's edge row had printed a
placed Moon of 98,315 km against a ring of 77,318 and passed, reading only
the ring). The same split put the scene's edge at a TT age of 4,422.57 Ma
while the engine's domain ends at 4,425.0 Ma, so the "first day" read 1,268
solar days per sidereal year where the chain's edge gives 1,360 (the genesis
chart's 1,591 is the cited history's last point at 4,429 Ma, 4 Myr past the
spin bank). The navigable domain is the ENGINE's: the position table
carries a 0.2 % margin in whole cells (the grid inside the former domain is
bit-identical — the build runs outward from J2000), `navigableYearRange` is
the engine edges' image on the position axis, the bridge's deep start is the
engine's edge instant (the table's own edge lies past the history's end,
where the LOD is null), and every label beyond the seam is the TT instant's
civil date and time. One day before the genesis the readers had fallen back
to a linear count (630 solar days per year): the scene now lands on the edge
from every entry (the Julian Day field, the Date/Time fields, a jump, Play —
which stops there), the first bullet of plan 27 step B. The owner's review
then found the step buttons walking past an edge a jump had landed on: the
clamp has ONE home — the render loop clamps every writer of the position once
per frame — and the one clamp function raises a non-modal notice naming the
edge, shown by the loop AFTER the landing: a timer started inside a first
landing (seconds of blocking work) expired before the first paint, so the
first notice never showed (the golden steps 1 Myr back at the edge and pins
the position and the notice). The rule: a label that feeds a physics read is
the engine's own year; a count of years of date is a coordinate, never an
age.

**The edge is the history's end, less the integrators' margin.** The spin
bank had stopped at 4,425 Myr (the lunar-age constraint Farhat et al. fit
to), 4 Myr short of the cited history's last sample at 4,429 Ma: the scene's
"first day" read 1,360 solar days per sidereal year where the Genesis chart's
last point read 1,591. Measured first, and the first measurement was blind:
a convergence test started from the walk's own state at −4,428.75 Myr found
every step from 1 yr to 1/64 yr agreeing to 0.0000″ — because that state
had already collapsed onto the orbit normal, a fixed point for any step.
Started from the −4,425 Myr checkpoint instead (ε 23.157° against the orbit
normal of date) and read at −4,426/−4,427/−4,428 Myr and the edge, the 1-yr
floor collapsed ε to 23.04°, 21.39°, 0.98°, 0.0001°; 0.5 yr to 0.05° at the
edge; 0.25 yr to 20.56°; 1/8 yr read 23.074°, 1/16 23.152°, 1/32 23.154°
(converged, 5.4 µs per step). RK4 damps the component perpendicular to n̂ by
~θ⁶/72 per step — 1e-3 at 9 steps per cycle — and the cone angle the
equation conserves adiabatically is lost to the integrator: the bank's "ε at
the edge" was that collapse, not a band. And from the −4,420 Myr checkpoint
the 100-step integer tier itself (1–2-yr steps at T_p 82–280 yr) still
damped ε by 30″ against a 1/64-yr walk to the edge — the band's own size, an
integrator's artefact. The schedule's rule is now 300 steps per torque
period wherever T_p is under 1,000 yr (the last ~50 Myr before the history's
end), on candidates continuing in binary fractions to 1/32 yr; at T_p ≥
1,000 yr the 100-step rule on the integer candidates is unchanged
(bit-identical checkpoints there); the fallback is the smallest step, never
1 yr; the generator's edge row gates the schedule against a 1/64-yr walk. **A convergence test
starts from a state the integrator has not already destroyed.** The first
form of that edge row then REFUSED: Δε 234″ and Δlon 4,256″ between the
1/32-yr schedule and the 1/64-yr walk over the last 235 kyr. Both are the
precession PHASE: the row measured ε against the J2000 pole, which mixes the
phase in, and the stretch holds 24,700 precession cycles (T_p 9.5 yr) — the
rate is α·cos ε, so a 0.17″ difference in the damped cone angle moves the
rate by 1.6e-7 and that is 1.4° of phase after the stretch. The phase after
25,000 cycles is not a certifiable quantity at any affordable step; the cone
angle against the orbit normal of date (the quantity the equation conserves)
and the mean rate are. The rows now read Δε as that cone angle (the factory
exposes `orbitNormalAt`) and the edge row gates the mean rate (5e-7
relative) while recording the phase; the three era rows keep their 60″ on
the phase (400 cycles at 2.46 Ga). Measured on the physical form: Δε(cone)
−0.17″, the rate 1.6e-7, ε at the edge 23.154°. **A sub-year step needs a
denser seat.** Between 250-kyr checkpoints at 1/32-yr steps one segment is
8 million RK4 steps (~45 s), and a panel row that scans ±10 Myr around the
epoch would have walked 320 million — the owner's "filling in the date
takes a long time" at the genesis, and with the old 1-yr floor already 40
segments of 1.3 s. Where the schedule steps at 2 yr or less (the last
~50 Myr) the bank now also records the state at every 5-kyr grid node of the
deep tier (about 10,000 checkpoints, +1 MB) and at the edge itself, and the
seat is the nearest recorded state by binary search: a node there is a seat
with no walk. The
domain's past edge is now the last sample minus 15 kyr — the sampler's deep
tier walks two 5-kyr nodes past a query, each node's rate is a ±2.5-yr
central difference, and the engine year 2000 − N sits 0.5 yr before the
chain's age N — on the 5-kyr grid (`time/navigable-domain`, one home). The
bank records the edge itself off the 250-kyr grid and the seat is the nearest
checkpoint on the near side by binary search (the former search tried only
spacing multiples: a landing at the edge would have walked 235 kyr unseated,
~25 s), and the generator's convergence gate has an edge row. The Genesis
chart's deep end is the same edge, so the scene's first day and the chart's
last point are one age and one number: a = 6.2 R⊕, a 5.51-h day, 1,590 solar
days per sidereal year. Farhat's own day at the last sample is 5.79 h (1,513
days; their interval 5.25–5.95 h), the conservation day 0.28 h shorter, inside
their band; their best-fit impact is 2 Myr earlier still (4.431 Ga).

**Two costs found by the gate at the edge.** (a) The spin sampler's reads were
unclamped: a windowed display row sampling ±10 Myr around the navigable edge
asked the spin walk for ages beyond the bank's deepest checkpoint, where it
runs UNSEATED into physics the inputs no longer define — 3.4 s per read at
−4,425.5 Myr, 15 s at −4,431 Myr, ε reading 0.8°. The jump itself returned in
17 s; the next trivial call waited 22 minutes behind those frames, and the
first gate run read as hung. The one-source movement's `sampleAt` and the
browser's `_hybridSeriesSampleAt` now clamp the year to the navigable domain
(`time/navigable-domain`, ONE home): beyond the edge a read is the edge's
value in 0 ms. (b) The perihelion calendar — a scaffold display convention
(year 0 at the perihelion–solstice alignment epoch, a Revised-Julian leap
rule) reachable only through its test hooks — converted a JD by a year-by-year
walk: 13 ms per Myr, 90 s of a first jump to the genesis. Retired with its
gate; `perihelionalignmentJD`/`Year` stay as model constants. A first jump to
the genesis on a fresh page is now the seats and the tables (17 s), the
second 0.07 s. **The rule:** a sampler asked for an age outside the domain
answers at the edge, never by walking there.

**The gate's own third clock.** `scene-year-lengths.js` converted each scene
event's UT instant to TT with a clock of its own — ΔT at the civil-label age,
the convention this section retires — and its four deep rows, the ones that
found the certified Sun's third clock (§1.31), now read the gate's: at ±1 Myr
the label is 123 yr short of the TT age, so the gate's ΔT sat 8.8 days off and
its slope was wrong by ΔT′² — 0.011″ on the solstice-ε row and −2.9 s on
every year row at ±1 Myr, nothing at the era rows (ΔT′² is 1e-12 there). The
gate reads the one bridge now; the §1.31 rule extends to the instrument: a
gate converts the axis it samples with the SAME bridge the tier under test
reads, and tests the motion, never a second conversion.

**The price of a comment in a hashed file.** `deep-time-chain.js` is a
recorded input of both banks and of the governed ΔT fit; a one-word comment
change there (the vocabulary ratchet's finding) re-staled the banks directly
(2.2 hours of bit-identical regeneration) and left the fit's input stamp
stale, which the by-hand re-close moved with every coefficient reproduced;
the constants embed came out byte-identical, so the stamp cost only the four
campaigns' re-stamp (12 minutes), not a second bank run. A comment in a
bank- or fit-hashed file is edited together with a physics change, never
alone (plan 22's header-edit lesson, now measured on the banks).

**A bank's limit is measured from the anchor, and a segment keeps the cells
before the first undefined one.** The three banked tables — the five chain
counts (`chain-cycles/index.cjs`), the two carriers (`moon/arguments.cjs`) and
the Sun's mean longitude (`model/sun-and-eclipses.js`) — recorded "K = the
whole segments inside the limit from the fine edge", so with the domain's
past edge passed as the limit each asked for one segment past the domain. At
the genesis edge, 15 kyr before the cited history's last sample, that
segment's last cell ends 500 yr past the history (the chain integrator's age
anchor is 2000.5), the four lunar chains' integrand is null there, and the
generator's 2.9-hour unseated walk ended in `REFUSING: chain draconic is
undefined inside the limit` with nothing written; the former 4,425-Myr limit
had 4 Myr of slack and never saw it. Reproduced in 2.7 s on a model seated on
the previous bank (the record then walks only the last 15 segments) — the
cheap reproduction of a generator's refusal is the seated model, never a
second unseated walk. The one rule now in all three tables: K = the segments
whose END lies inside the limit measured from J2000. The second finding sat
in the chain tier's segment builder: one undefined cell set a sticky "side
undefined" flag and returned the whole segment null, so a read at the domain
edge — inside the segment the history ends in — would have fallen to the
adaptive Simpson path AND taken every later coarse read of that side with
it, a visit-order dependence `test:sampler-purity` sees only if it visits the
edge. A segment now keeps the cells before its first undefined one, chains no
P[k+1], and a read lands null only beyond its last defined cell. Measured
after the fix on the seated model: every table reaches the domain with finite
prefixes (17,715 past, 4,000 future), the Moon's longitude at the edge is the
same read first or after a −3 Myr read, and a read 20 kyr past the history
leaves the −3 Myr value unchanged.

**An integral called per read is re-integrated per read.** With both banks
written and seated — the first spin read at the edge 1 ms, every lunar seat
taken — a landing on the genesis edge still read 21 s on a fresh page and
11.5 s on a repeat, with 23–26 s of display frames after each; the gate mirror
and the perf rows (the spin read, the −400 Myr jump) had not measured a full
edge landing. A CPU profile put 34.7 of 35 s in one function: the deep
eccentricity channel's rate integral `channelIntegral(T, s)`
(`moon/deep-ecc-channel.cjs`), a composite Simpson from J2000 to T at a 4-kyr
step, recomputed on every call — 1.1 M evaluations of the 18-mode series per
call at the edge, two calls (perigee, node) per Moon read, ~1 s per read, and
a landing is 30–40 reads. The era form is certified and stays verbatim inside
|T| ≤ 2,500 cy (the carriers' fine range); beyond it the same 4-kyr Simpson
cells ride the segmented cumulative association the lunar tables use (64
cells per segment, grown on demand per s, pure in T — `test:sampler-purity`
Twin 5 pins the edge first-vs-last and the visit order), a one-time walk of
~2.2 M evaluations and three per read after. The perf gate's row 0d measures
a REPEAT landing on the edge, absolute; the values beyond the window move at
the association's rounding level (the deep goldens re-recorded with this
reason), the in-era values not at all.

### 1.37 An integrand's year is its axis's year — three more axes inside the one deep clock, and a tolerance per cell that added up

§1.36 put the scene on one deep clock. Checking the year length at the genesis
on that clock (the Predictions panel's cardinal year read 1,317 UT days where
the chain says 1,430 solar days per tropical year of date) showed that the
clock's three functions of one position — the TT instant, the UT instant, the
count — each still read "the age" off an axis that was not the age. All three
were invisible to every gate that read the clock against itself; they show
the moment the clock is read against the CHAIN (the baseline, at eighteen
positions, differences over ±50 count years):

| finding | what read the wrong axis | size |
|---|---|---|
| J1 | the raw ΔT integrand multiplied (86,400 − LOD)/LOD by the TROPICAL year of date, on an age axis of JULIAN years (`year = 2000 − t_Ma·1e6`, the bridge's own `(jdTT − J2000)/365.25`) | low by T_trop(date)/365.25: 2.14e-5 of the raw ΔT in the era — 0.04 s at AD 1000, 0.53 s at −1000, 1.6 s at −3000, 6.8 s at −8000; the UT day (the bridge's dTT/dUT) against the chain's LOD: 1.0e-6 at 100 Ma, 9.8e-6 at 400 Ma, 4.4e-5 at 1 Ga, 5.8e-4 at 4 Ga, 5.1e-3 at 4,425 Ma, 8.3 % at the genesis edge (21,510 s where the history's day is 19,854 s: 5.98 h against 5.51 h) |
| J2 | the position table read its integrand, the tropical year of date, at the COUNT as if the count were the age | the count runs 0.055 % ahead of the TT age (2.59 Myr at the genesis), so the integrand was read 2.4 Myr too deep inside the cited history and on its fallback past the history's end for the last 4.6 Myr of count: 364.94 SI days per count year at the edge where the tropical year of date is 328.74 (11 %), 360.28 against 362.66 at 4,425 Ma, 8.5e-5 at 4.4 Ga; under 2 ms on any instant of the historical window |
| J3 | the UT↔TT bridge read the raw integral's age off the CIVIL decimal year | proleptic Julian before 1582 — the engine's axis to a constant 12.5 days, the fitted convention, unchanged; GREGORIAN ahead of today — 2.05e-5 of the span ahead of the engine year: 20.5 yr at +1 Myr, 2,053 yr at +100 Myr, 20,329 yr at +990 Myr; the UT day 1.2e-6 off at +100 Myr, 1.5e-5 at +990 Myr |

**The fixes.** J1: the integrand counts on its axis's own year
(`SECONDS_PER_JULIAN_YEAR`; the ecliptic missing-motion term keeps its year
of date). J2: the table solves dJD/dcount = D(age(JD)) — each cell the
implicit trapezoid T₁ = T₀ + ½·(D(age(T₀)) + D(age(T₁)))·Δcount by fixed
point, the partial-cell read the same equation from the cell's lower node, and
the inverse in CLOSED FORM (the age of the target instant is known). J3: ahead
of the scene epoch the raw integral's age is Julian years of TT; the past
keeps the civil year the fitted convention reads. After them the UT day equals
the chain's LOD to 2.9e-8 at 1 Ga, 4.0e-7 at 4 Ga and 1.2e-5 at the edge, and
to 7e-10 at +990 Myr; the count year equals the tropical year of date to 1e-8
inside 4,425 Ma and 3.3e-7 at the edge (1,430.50 UT days per count year
against the chain's 1,430.52). J3 was found by the GATE's design, not by the
plan: the residual left after J1 grew with depth on the future side, and a
tolerance wide enough to pass it would have hidden it (§1.20).

**The governed ΔT pair re-closed by hand** on the new raw integral: the trend
anchor `deltaTStart` 56.076420 → 56.076924 s, the Bond amplitude 368.780 →
368.792 s, the phases by ≤ 0.009°, the Espenak-window RMS 12.4532 → 12.4528 s,
the USNO closure unchanged; the caps and the resonator's shape as before. The
climate chain upstream of the fit came out value-identical. The three eclipse
campaigns refused and were re-baselined as conscious re-measurements, every
move explained by the ΔT: the eclipse audit's mean absolute residuals 1213.7955
→ 1213.7963 s (lunar) and 664.00005 → 664.00026 s (solar), 39 rows reproduced;
the lunar alignment's canon mean 8.517816 → 8.517801 min and RMS 9.823798 →
9.823778 min; the canon recall's oldest era (−2000…−1501, outside the fit's
window, where nothing absorbs J1) signed median −6.42 → −6.40 min, two of
12,064 eclipses across the 15-minute tight limit (81.81 → 81.79 %), the
overall recall unchanged.

**The gate** `tools/verify/deep-clock-axes.js` (in the suite): at ten positions
from +990 Myr to 20 kyr inside the genesis edge, |UT day / LOD_real − 1| and
|SI days per count year / tropical year of date − 1| against tolerances that
are the measured residuals with a margin, by depth (the day 2e-7 to 1 Ga,
2e-6 to 4 Ga, 5e-5 beyond; the year 5e-8, 1e-7 at 4,425 Ma, 2e-6 at the edge)
— the residual is the ΔT table's partial-cell quadrature on the cited
history's interpolation, and the table's own 10-kyr trapezoid where the year
changes fast. Fail-proven: `ESSRT_DEEP_CLOCK_PLANT=1` puts J1's year unit back
into the measured day (9 of 10 rows fail), `=2` stretches the count year by
1e-6 (9 of 10).

**Three traps on the way.**

*A difference of Julian Days needs room.* The first baseline differenced the
table over ±0.5 count years: Julian Days of 10¹⁰ carry 10⁻⁵ d of granularity,
and the day ratio read ±1e-5 of noise at 10–100 Ma — larger than J1 there and
of alternating sign, which looked like a fourth finding. Over ±50 years the
ratio equals J1's prediction at every age.

*A tolerance per cell adds up.* The J2 march first accepted a cell when its
trapezoid image lay within a few units in the last place of the iterate
(`4e-16·|T|`, meant as the double's own floor). With a predictor from the
previous cell's slope — one evaluation per cell — the accepted residual is
SYSTEMATIC, and over the table's 443,000 cells it added up to 0.9 days at the
genesis against the converged form. The test is now below ONE unit in the last
place at depth (1e-9 d in the era), i.e. an exact fixed point: the predictor
form reproduces the converged form bit for bit at all eighteen positions, at
500 ms where the converged form took 765 ms (347 ms before J2).

*A gate's check must exercise what it names.* The lunar bank's
seat-and-resume loop seeded the new channel section with as many prefixes as
the tables (k + 1). The channel's segments are 256 kyr against the tables' 250,
so those prefixes already covered the limit and the seeded side resumed
nothing — the check compared the bank with itself. A trial of the generator on
a ±6-Myr span (a patched copy in the scratchpad, minutes) refused on its own
counter ("no side resumed"); found there, not at the end of the 2-hour run.
The channel is seeded one prefix short of what the limit requires.

**The first landing on the genesis edge (K).** By table, in Node on one model
(`scratchpad/first-landing-steps.mjs`): 8.1 s, of which 6.4 s the Moon's first
read — the eccentricity channel's one-time walk of its two exponents (perigee,
node; 2.2 M evaluations each per direction) —, 0.35 s the position table and
0.5 s the raw ΔT table; the browser builds two models. Two levers taken, one
trimmed: (1) the channel's segment prefixes ride the lunar bank (its `channel`
section: 17,300 past + 3,906 future prefixes per exponent, 0.8 MB; the
carriers' relative seat check) — on the channel alone twelve reads at six ages
take 3.7 ms seated against 5.0 s walking, bit-identical, a truncated seat
resumes every recorded prefix exactly, a bank with another window-edge
integral seats nothing; (2) the one-source sampler's deep tier walked two grid
nodes past the query, and at the clamped edge that was 10 kyr at the 1/32-yr
step — 320,000 RK4 steps beyond a state the spin bank holds; the span has ONE
home (`deepTierWalkSpanYears`, time/navigable-domain) for the package's
sampler and the scene's twin and never passes the edge; (3) the raw ΔT table
evaluated each cell edge twice — once per cell now, the same sum to the bit
(513 → 416 ms). Measured after the bank was regenerated: 2.0 s in Node on one
model (the position table 0.46 s, the ΔT table 0.40 s, the Moon's first read
0.78 s), and headless on a fresh page 7.3 s for the entry where it read ~23 s
(the Origin tour's first card 7.5 s for 24.6 s), 135 ms for the three frames
after it, 32 ms for a repeat landing; every channel side seated (17,300 +
3,906 prefixes, the scene's chain and the tier model alike). The perf gate's
row 0e times the first landing in its sequence, absolute, and its seat row
names an unseated channel. What is left is the two models' position and ΔT
tables, built once each.

**A hole in the freshness gate (§1.16's class).** No generator hashed
`phase/deep-calendar.cjs`, the UT↔TT bridge, and the three eclipse campaigns
did not hash `deltat/deep-time.cjs` either: an edit to the bridge alone would
have moved their recorded numbers with `check:artifacts` green. The three
campaigns and the lunar bank list both files now.

### 1.38 A measured family is shown only inside its window — the one-source years beyond ±2 Myr

The one-source year lengths (the tropical, anomalistic and cardinal years and
every beat made of them) are MEASURED on the sampled movement, and the
package publishes them only inside ±2 Myr of J2000 (`ONE_FAMILY_WINDOW_YEARS`,
`model/published-periods.js`: the deep chain's law beyond). The scene's
Predictions panel never made that switch — `predictions.solarYearSeconds` read
the one-source sampler at every age — and every row derived from it inherited
the measured route: the axial precession (the beat of the two years), the
obliquity beat, the climatic-precession beat, the perihelion timing rows, the
Moon table's "19 Solar years". Inside the window the two routes agree (the
beat parts from the sampler's own period form by 1.4e-7 today); beyond it the
sampler is not resolved, and where the precession period is a few years the
±2.5-yr rate difference on a wrapped angle aliases outright. Measured by plan
30's instrument (the panel rows against `createModel()` at the same engine
year, plan 30 §0a):

| row | 400 Ma | 2.46 Ga | 4.4 Ga | the genesis |
|---|---|---|---|---|
| tropical year, scene vs law | −19 s | +43 s | +2,700 s | 384.6 vs 328.2 SI days |
| axial precession, scene vs law | 20,927 vs 21,196 yr | 12,061 vs 11,863 | 595 vs 566 | −19.57 vs 8.92 yr |
| obliquity beat, scene vs law | 30,002 vs 30,558 | 14,593 vs 14,304 | 599 vs 570 | −20 vs 8.9 |

Beside it the Planet Info panel's LEFT "mean" columns, which read the deep
chain, matched the package to 1e-13 at every epoch — the same screen carried
the law and the aliased measurement side by side under one label.

**The fix** (plan 30 item A): the scene's year evaluator carries the package's
window rule in ONE place (`_cardinalYearSeconds`: the one-source family inside
±2 Myr, the deep chain's tropical year beyond, NaN for the anomalistic and
cardinal years — the apsidal line and the cardinal structure are not resolved
there); the axial row beyond the window IS the composed lunisolar period (the
beat of the chain's two years reproduces it only to four digits); a windowed
row outside its window reads "—" with the window named in its hover, never a
number (the planets' spin rows beyond ±10 Myr the same). **The gate**: the
epoch-consistency rows at −400 Myr, −2 Gyr and inside the genesis edge read
the panel's live fields against the Node model's `epoch.tropicalYearSecondsAtYear`,
`siderealYearSecondsAtYear` and `axialPrecessionYearsAtYear` at the same engine
year (1e-9 relative), and assert the anomalistic field is NaN there.

**The unit words on the same screen** (plan 30 item B, the same instrument):
the panel's sidereal and stellar day divided by the year in SI days where the
solar-day count of date belongs (20 s short at 400 Ma, 38 s at the genesis,
96 s long at +990 Myr — the Planet Info "mean" column beside it had the right
form); the Moon's mean speed multiplied a month in solar days of date by 24
hours (−9 % at 400 Ma, −77 % at the genesis: 2,635 km/h for 11,479); the
Metonic and Callippic solar-year rows stood in SI days beside months in solar
days of date; Earth's "Orbital period (P)" divided the year in SI days by the
year in solar days of date — the day ratio LOD/86,400 (0.906 at 400 Ma)
labelled a period; the anomalistic "mean" column multiplied the J2000 day
count by the day of date (84 SI days at the genesis). Every period cell now
carries one of five unit words from ONE home (`UNIT_SI_DAYS`,
`UNIT_SOLAR_DAYS_OF_DATE`, …), the Moon's month rows carry the same month in
hours in their hover (3.94 solar days of date = 21.70 h at the genesis; the
cell holds the unit word alone — a cell with both did not fit), and the gate's
day rows read the panel's sidereal and stellar day against the package's at
the deep positions (1e-8).

**A pane that shows the previous landing** (plan 30 item D). The same dump
read the Predictions "Length of AU" one landing behind (today's AU at
−400 Myr, the −400 Myr AU at the genesis) and the cardinal-point rows of the
genesis at +990 Myr for more than a minute. Attributed by probe, not by eye
(§1.33): the live fields were current after every landing — the loop's epoch
sync precedes the update in the same frame — and two different things lagged.
The pane's VIEW of a monitor in a collapsed folder: the loop-driven monitors
(the replacement of 319 poll timers) are re-read only while visible, so a
collapsed folder kept the whole-pane refresh the entry path makes BEFORE the
update, and opening the folder did not wake the idle loop. And the cardinal
rows' LIVE values: a hold added for Play (10× the last solve's cost) blocked
the one update a paused landing gets, and an idle page never updates again.
Opening a folder or selecting a tab now wakes one frame (`_wakeOnReveal`,
one home beside the monitor conversion); the hold is Play's only, and a
paused landing's rows are solved on a timer right after its frame — never
inside it, since the perf gate times the landing. The gate's "pane shows
this landing" rows read the pane's view against the live field with the
folders open and time the rows' arrival (1.7 s at −1 Myr, 4.5 s at the edge;
limit 15 s). The lesson is §1.25's for a panel: "refreshed by the loop" does
not cover what the loop only refreshes while someone is looking.

**A finder seeded on the civil year** (plan 30 item E). The cardinal-point
year-length row took the crossing nearest the NEXT CIVIL MIDPOINT, 365.25 SI
days on; at the genesis the tropical year is 328 SI days, so for the vernal
equinox that was the second crossing and the row read 2,854 solar days where
the three other points read 1,430 (§1.35's class: a step is the period OF
DATE). The next event is now the crossing nearest one tropical year of date
after this one, on the UT axis; the gate's row reads every cardinal year
length against the tropical year of date at the four positions (5e-3; the
single-year wobble is 8e-6 today and 1.5e-3 at the edge, a skipped year 1.0).

**A hover that qualifies a moving value with its epoch** (plan 30 item C).
Forty-two Planet Info rows whose value moves with the epoch carried
"(at J2000)" as if it qualified the value — "q = a(1−e) ≈ 363,296 km (at
J2000)" beside a Moon at 39,700 km, the five month rows called "IAU inputs
(at J2000)" while showing 3.94 solar days of date. Each now says OF DATE,
names what it rides (the semi-major axis of date, the Moon's distance, the
day of date, the month chain at the epoch) and keeps today's figure as the
reference — the tour's pattern; 67 more hovers that name J2000 as the ANCHOR
beside an of-date statement stay as they are. The literal is a code-surface
vocabulary-ratchet term since (one hit left, a constant's; the count may only
fall), so the phrase cannot return unseen.

**A retired convention's bookkeeping shown as a second observable** (plan 30
item L). The Moon's table carried a "Full Moon cycle (equinox-frame partner)"
and a "Draconic year (precession-frame partner)" beside the observed rows:
the frame-free conjunction frequencies with the equinox's rate 1/T_p added or
subtracted — the frozen clock's count per anchor interval in the
equinox-co-rotating frame, a device retired in plan 09. The arithmetic was
right and the hovers said "not a directly-observed period"; the LABEL said
there were two Full Moon cycles, 0.018 days apart today and 160 solar days
apart at the genesis (1,595.7 observed, 1,434.4 "partner"). A conjunction has
no frame, so the rows are gone; the "↳ years" sub-rows keep their tropical
years of date and name the Julian-year figure in their hover, since the
Predictions panel's periods are in Julian years (9.61 vs 8.63 for the of-date
apsidal period at the genesis — one quantity, two year units).

**A step sized in the position's year count** (plan 30 item I; the owner:
"1 hour" moved 54 minutes at the genesis). The time-step dropdown captured its
options at load as fractions of the position's tropical-year count — 1/8,760
of a count year per "hour" — and the position counts tropical years OF DATE,
327.8 SI days at the genesis: the hour was 60 × 327.8/365.2422 = 53.9 min
there, the "day" 0.90 SI days, every sub-year step short by the ratio of the
tropical year of date to today's (doc 11's 1/T_trop = 1/T_sid + 1/T_p(t):
0.8975 at the edge). A step is now converted to the epoch's position units at
use (`stepPosOfDate`: the captured step × sDay(t)/sDay(J2000)), so every
option is the SI duration its label names at every epoch and the whole-year
steps move the civil date as before; the gate's row steps one "day" at the
four positions and reads one SI day of TT (2e-3; the count-year form read
0.8975 at the edge).

**The lesson**: a surface that quotes a measured quantity carries the window
it was measured in, and switches to the law at the window's edge exactly
where the package does — the "A displayed rate must name its window" rule
(§1.11) applied to the whole family, not to one row. A row that reads a
correct value through an era convention is a surface defect the model gates
cannot see; the instrument that finds it is the panel dumped beside the package.

### 1.39 The lunar arguments read the month history at the tick's year — a Moon at 39,700 km orbiting in 27 SI days

Found by the owner's eye after plan 30 had made the Moon's month rows honest:
at the genesis the sidereal-month row read 3.94 solar days of date (21.7 h,
Kepler at 39,700 km), and one visible round of the rendered Moon took 121.15
solar days of date (JD −2470620550205.87 → −2470620550084.72). Measured
(`probe-moon-rate-genesis.mjs`, `probe-moon-edge-zone2.mjs`): the rendered
Moon's series longitude and the package's `moon.lonDegAtJD` alike advanced
2.7–3.4° per solar day of date everywhere within ~80,000 count-years of the
past edge — the J2000 mean motion, 13.18° per SI day on the TT axis — and 360°
per month of date everywhere else (ratio 1.005 at 100 kyr inside, 0.98 at
400 Ma, 0.9–1.1 at the future edge, the orbit's own wobble).

**The mechanism** is §1.31's axis once more, one layer down. The lunar
arguments build the Moon's mean longitude from the cumulative count of months
of date (`createMoonArguments`, `tropicalOrbitsBetween(argsY0, y)` with
`y = jdToSIyear(jdTT)` — the SI-linear year: 365.2422-day ticks from the scene
start). As the integrator's TIME variable the tick is right — the counts are
cycles per SI year over SI years. As the AGE at which the chain-cycle
integrator read the month history (`tMa = (ageAnchorYear − y)/1e6`, three
sites) it treated a tick as a Julian year: 2.14e-5 of the age ahead — 8.6 kyr
at 400 Ma, 21 kyr at +1 Gyr, 94.7 kyr at the genesis edge, where the cited
history's last sample lies only 15 kyr beyond the edge. Within the last
~80 kyr the integrand was undefined, the counts read null, `fwArgsDeep`
returned null and `fwArgs` fell back to the certified polynomial skeleton at
the J2000 rate. §1.31 had found the same offset in the lunar DISTANCE read
("95 kyr past the engine age at the genesis") and fixed that getter; the
arguments' integrand kept the axis, and the Genesis button lands exactly in
the zone. The finder's "first solar eclipse after the genesis" (the registry's
`genesisFirstSolarEclipse*`, the tour card's "about ninety of those short
days later") was found on that Moon.

**The fix**: ONE conversion in the integrator (`ageMaAtTick`: the tick count
× the SI year over the Julian year, used by the dense table, the coarse cells
and the Simpson fallback alike); the lunar cumulative bank regenerated on it,
the genesis eclipse re-found, the campaigns run plain (none hashes the
integrator — §1.16) and re-baselined where they refused. **The gate**: the
epoch-consistency row "Moon's mean motion / 360° per sidereal month of date"
reads the rendered Moon's series longitude one solar day of date on, against
the package's month of date, at −1 Myr, −400 Myr, −2 Gyr and inside the
genesis edge (15 %: the orbit's wobble is ≤ 10 %, the fallback 0.035).

**The lesson**, §1.31's sharpened: a cumulative integral has TWO axes — the
time it counts over and the age it reads its integrand at — and a tick that is
not a Julian year names both. A fallback that keeps a surface plausible (a
Moon still moving, still eclipsing) hides the refusal better than a dash
would; the month row beside it, made honest by plan 30, is what exposed it.

### 1.40 One clock for the label — a civil year on a deep day count is a day count in disguise, and a seam between two clocks is a step of ΔT

**What the owner saw (2026-11-05).** Typing −999-06-21 and then −1000-06-21
turned the globe 106.3° — ΔT(−1000) = 25,503 s = 7.08 h × 15°/h; every other
one-year step is a fraction of a degree. It was §1.36's label seam working as
designed: inside ±3,000 yr of the scene epoch the Date and Time were the civil
date of the UT Julian Day, beyond it the civil date of the position's TT
instant — two clocks on one panel, handed over silently, mid-year, by two
different predicates (the civil year of the typed label in the parser, the
position count in the writers). Measured on the keystroke route (plan 29
step 0, the pane's inputs): the landing right at every typed date; the future
band 5000-06-21…07-02 a LABEL mismatch of ΔT = 9.31 h (09:18:55 shown for a
typed 00:00:00, the position test saying "beyond" where the civil test said
"inside"); under one-day steps the globe continuous and the label jumping
7.08 h back at the past seam and 9.31 h forward at the future one; and two
more: `posToTime` had no day carry (24:00:00 under the previous date, and the
field round trip then landed a day early), and the `__test__.enterDateTime`
hook bypassed the entry guard, so its `refresh()` re-entered with the TT label
parsed as UT — every hook-typed measurement in the band carried a second ΔT
(18:37:50 for 09:18:55, the globe 140° further).

**Why a UT label failed before, and why that was not UT's fault.** Plan 27
step F had rejected a UT label at depth because the civil date of the UT count
is ΔT from the age drawn (341 Myr at −2 Gyr). The fault is the CALENDAR, not
the clock: it attaches 365.25 of TODAY's days to a year, while a year of date
holds 403 solar days at 400 Ma and 1,430 at the genesis, so a civil year on
the deep day count is a day count in disguise — 6.76 "Gyr" at the 4.43-Ga
edge, 53 % over the age. Measured (Simpson on the deep-time chain beside the
one bridge, plan 29 §3 H): the orbit count — the position's own tropical-year
count — is the TT age to 2.1e-5 out to 100 Myr (the Julian/tropical
difference), 6.3e-5 at 400 Ma, 5.9e-4 at the edge (2.6 Myr of 4.43 Gyr: the
tropical year shortens to 328 SI days there); the 365.25-day "UT years" are
5.0 % over at 400 Ma, 24.9 % at 2.46 Ga, 52.7 % at the edge.

**The design (option H, the owner's decision 2026-11-08: "there cannot be two
clocks; UT is the correct movement of the Earth").** ONE clock, UT, at every
position — and, after the owner's review of the first build, ONE format: the
Date field is the civil calendar on the UT day count everywhere (a calendar
year is 365.25 of today's days, so far back it counts days, not orbits — −6.76
billion at the 4.43-Ga edge, said so in its hover), and a new editable **Year
of date** field beside it counts the orbits: the tropical years of date from
the calendar year 2000 (year 2000 · day 1 is 2000-01-01, so the two fields
agree in the era and part by a day per ~3,300 yr today, 7.8 days per
millennium under the Julian calendar) and the solar day of date within the
current one — `−399998000 · day 217/403`, the edge `−4431580253 · day 1288/1430`;
typing `Y`, `Y d217` or `Y · day 217/403` lands on it at the Time shown, and
the orbit count is the age in uniform time to 0.06 % at the genesis. The
first build had written the orbit count INTO the Date field beyond ±3,000 yr
as `Y dD/N` — a format seam; the owner found the one field in two forms less
clear, not more, and saw the Earth move differently across −1000: the
whole-year Step there added N years of POSITION, 100 tropical years of date
being 36,524.22 solar days, so the 0.22 day turned the globe 79° per 100-yr
step while the civil step inside the seam keeps the time of day and the globe
still. The step is the civil one everywhere now — N calendar years at the
same time of day, a whole number of solar days — and the Date, Time and Year
of date are read off ONE UT instant rounded to the second, or where that is
coarser to a power of two covering both the UT count's ulp and the POSITION's
resolution in solar days of date (one ulp of a 4.4e9-yr position is 1,430 d ×
9.5e-7 yr = 1.4e-3 d): the Time field's quantum at depth — 5 s at 400 Ma, 42 s
at −2 Gyr, 5.6 min of the 5.5-h day at the edge — so a typed midnight stays a
grid point (a typed day 172 00:00 had read back as day 171 23:59 at −2.46 Gyr
and −4.4 Gyr). The parsers take one Newton step on the forward UT map
(`_refinePosToUTJD`), so a typed label lands on the position whose displayed
label it is — the bridge's inverse carries its own tolerance, 2.8 ulps of the
position at the edge. The entry functions hold their own guard, a guarded
refresh serves the preset jumps (the genesis button had re-landed 126 s off
its own label), and the step rewrites its strings itself (two clicks inside
one 20-Hz frame had stepped the same Date twice; the first build's buttons
had stuck at −1000, where the count form gave `addYears` no date to move). The
ENGINE-facing scene year (`o.currentYear`) is untouched — the physics, the
epoch sync and every engine-year reader are bit-identical; beyond ±3,000 yr
the per-year solves (`_sceneLabelYear`: the cardinal rows, the perihelion-date
rows — whose seed had read the TT civil year's calendar JD as a UT day, ΔT
off, the +990 Myr instability of plan 30's dump — and the Orbit Analysis
paper) run in the ORBIT year, where a calendar year of 365.25 UT days holds
0.9 orbits at 400 Ma and may hold a cardinal point twice or not at all. TT is
a read-only row ("Engine age (TT)") and the hovers, and the registry carries
the triple (`genesisEdgeAgeTTGyr` 4.429, `genesisEdgeOrbitsG` 4.432,
`genesisEdgeSolarDaysT` 2.471, `genesisEdgeUtCalendarYearsG` 6.76 — the last
written once, as a day count). Measured after the build: typed ≡ displayed on
the keystroke route through the Date/Time fields AND the Year of date field at
both former seams ± 20 d and at −1 Myr, −400 Myr, −2 Gyr and inside the edge,
to the Time field's half second plus the double's grain of the UT count plus
the POSITION's resolution in UT days (through the Date: 6e-8 d at the seam,
0 at −2 Gyr, 2.9e-3 d inside the edge, the position's resolution — the plan's
defect 8, a first row having read 0 there only because the typed value was
the table's own forward image; through the Year of date: 0 at every depth,
the orbit year being the table's own axis), the strings identical both ways;
one-day walks across both former seams with
the parsed instant advancing one solar day per step and the Year of date's
day with it; the Step buttons ten whole years out and back across each
former seam, every step 1.00 yr of position.

**The gate** (epoch-consistency, §2): the typed-back rows through both
routes; the two walks; the orbit year's day 1 (`Y d1`, `Y` alone and `Y · day
1/N` the same midnight) at −1001, 5001, −399,998,000 and −2 Gyr; the era
agreement (the Year of date is the calendar year, its day the calendar's
day-of-year within one); the Step buttons; the honest edge through the Year
of date field (−5,000,000,000 orbits) and through a Date beyond the edge's
UT count (−9,000,000,000); and the Engine-age row at the past edge against
`genesisEdgeAgeTTGyr`. The surface golden's deep epochs are typed through the
Year of date field and the snapshot's tour dates re-recorded with this reason.

**The lesson.** A label is written on ONE clock, and its year unit is a unit
OF DATE: a calendar that fixes the day count per year prints a day count, not
an age, wherever the day has changed. A seam between two clocks is a step of
ΔT at the seam, and ΔT is never small where records exist (it crosses zero
only near 1900). And a test hook takes the same guard as the handler it
stands in for, or it measures itself.

### 1.41 A residual's SPECTRUM is a gate the tolerances cannot replace — three things the spectra found inside the instruments, and one under them

**What plan 32 did (doc 112 is the record, `data/residual-spectrum-sweep.json`
the artifact).** Every residual series the model produces against an external
record — ΔT against Espenak & Meeus and against Stephenson, Morrison &
Hohenkerk's observations and spline; LR04 against the climate formula per
regime; the 45 paleo anchors; the certified Sun and its cardinal instants
against JPL Horizons; the lunar canon's 12,064 timings; the Earth's e, ε, ϖ
against La2004 — through one harness (a weighted Lomb–Scargle with AR(1) and
white surrogate floors on the maximum over the grid, the edge/interior and
two-halves splits) with a pre-registered rule: a line with no external physics
standing in two independent series reopens the theory. None did. Every line
that stands is known physics (the LR04 residual's 73-kyr tone is the obliquity
minus the 97-kyr eccentricity line — the state-dependent response's mixing
product; the La2004 residuals are one precession-rate history 4 parts in 10⁴
apart over 10 Myr) — or an INSTRUMENT, or, in ONE series, a named difference
between the model and the ephemeris that the instrument's term had covered
(d). Three were inside the instruments:

**(a) A referee read through the gate's own interpolation.** The Horizons
swap gate (`sun-vs-horizons.js`) finds each cardinal crossing with a Lagrange
cubic through four 10-day rows of Horizons' longitude, which carries the
6.44″ barycentre wobble at 29.53 d; a cubic across 30 days follows that
wobble to a few arcseconds, in step with the Moon's phase, and the Moon's
elongation advances 12.368 cycles a year — so every cardinal series carried a
0.5-min line at 2.715 yr and a 6.40-yr doublet, stable over six millennia,
that the apparent Sun's own residual does not hold (its barycentre term is
right to 0.03″). Removing the wobble before interpolating takes the line from
0.53 to 0.07 min and the doublet to 0.007; the gate's cardinal rms is 1.24 min,
not 1.32. The cardinal tier's own part of the residual is 2 s rms. Rule: when a
referee is sampled, the interpolation across its own short-period content is
part of the comparison; take the known oscillation out before interpolating,
or sample the referee densely at the crossings.

**(b) An event's DEFINITION is part of a comparison.** The lunar canon's
dynamical-time residual (canon TD − model TT, free of both ΔT conventions)
carried one line of 7 min at 3.617 yr, ninety times the floor, in both halves
alike. No combination of the lunar arguments to |k| ≤ 8 matched it; its
frequency is 8 cycles per 358 lunations — the twelfth harmonic of F under
full-moon sampling, which is no perturbation but the sawtooth an eclipse's
node distance traces from season to season: a residual LINEAR in that
distance. Regressed on it: r = −0.91, −0.86 min per degree (±19 min at the
window's ±22° edge; gamma alone r = 0.00, its sign flipping between the
nodes), the sd 10.1 → 4.1 min. The source says why: `findLunarEclipsesInRange`
returns the opposition in longitude, bisected to a second, where the canon
times GREATEST ECLIPSE — the solar finder refines to minimum γ, the lunar
finder does not. The canon-recall gate's "tight" count (9,868 of 12,064
within 15 min) carried the offset from the day it was written. Rule: name the
event convention on both sides of a comparison before reading its residual;
a residual that is a smooth function of a sampled argument shows up as a
HIGH HARMONIC of that argument, not as the argument itself.

*Fixed in the follow-up.* The lunar finder now refines each opposition to
the Moon's least distance from the shadow axis (a 1-min scan over ±45 min
and a parabola, the solar finder's `refineMinGamma` on σ) and classifies by
that distance; the opposition instant stays on the event as `jdOpposition`,
so the sweep's record of the definition term stays reproducible. The
re-measurement exposed a SECOND cancellation (§1.2): the shadow radii carried
Chauvenet's 1/50 enlargement (Meeus Ch. 54's ×1.02) where the canon uses
Danjon's rule (the Earth's radius + 1/85). With the opposition's |β| — 0.5 %
larger than the least distance — the oversized shadow had been hidden:
99.49 % type agreement either way; on the least distance alone the ×1.02 read
99.32 % with 135 model-only grazers, Danjon 99.49 % with 26, so the canon's
own rule ships. Measured: tight recall 81.8 → 97.85 %; the alignment gate's
dynamical-time residual over 1600–2200 rms 9.82 → 0.88 min (max 19.3 → 1.9);
recall 100.00 → 99.92 % (10 penumbral grazers at the limit, against 26
model-only — the scatter is now two-sided where 83 model-only and 0 missed
was one-sided); the Babylon −746 partial 1.3 min; the 2024 pair 2.5 and
2.3 min from NASA's instants (the constant mean-Sun offset). What the
remainder holds is the model's M′ against the ephemeris's — (d).

**(c) A windowed argument outside its window.** The certified Sun's residual
against Horizons at the named planetary arguments, fitted directly in three
300-yr windows: every Venus and Jupiter term keeps a constant phase and grows
linearly with the distance from J2000 (2V − 3E: 0.14″ at 1850, 0.67″ at −250,
1.20″ at −2350), and the growth sorts by the sum of the coefficients — the
frame-free arguments (V − E, 2V − 2E) drift 2.7° per unit at −2350, the
Σk ≠ 0 ones (2V − 3E, 3V − 4E, J) share one extra 22° (0.51° per century).
§1.15's rule, "a term with Σk ≠ ±1 stays a constant row with its window
named", measured outside the window: the constant row's phase is the
window's. Beside it two terms the Sun does not carry at all, the barycentre
term's elliptic sidebands D − M′ (0.43″) and D + M′ (0.18″), the same at every
epoch. Both are bounded harmonics on named periods (the whitelist's rule), a
refit when the owner calls for one.

**(d) Under the instrument's term, the model's lunar perigee against the
ephemeris's.** The remainder after (b)'s node term was declared "nothing
above a minute" by a probe whose frequency grid stopped at 0.82 of the
Nyquist rate — short of the full-moon cycle's 0.887 cycles per year. The
generator's grid reached it: a 4.9-min line at 1.127 yr, 280 times the floor.
Two faults in the reading, one finding under them. The one-term regression
was BIASED: under eclipse sampling sin 2F correlates with sin M′ (r −0.32),
so the node slope came out −25.9 min where the shadow geometry predicts
−29.6 (−i²Ḟ/2λ̇²) and the five-term fit measures −29.4, with a cos M′
modulation of −0.144 against the speed of date's −0.128 — and a DIRECT
anomaly pair of 5.0 min the geometry puts at zero. The pair was two things,
told apart only by timing the finder at greatest eclipse: its sin M′ part
(4.7 min) was the definition offset's own form beyond the five regressors
and vanished with the instant (0.05 min left); its cos M′ part (1.7 min)
stayed. A cos M′ term in a timing is a phase of M′, and a third instrument
placed it: Meeus Ch. 49's full-moon instants on the ephemeris's own
arguments (both sides oppositions — the finder's instant does not enter). The canon against Meeus
carries the pure definition term in every era and no anomaly term (the
canon's M′ is the polynomial's); the model against Meeus is 0.3 min in the
fit window and grows a cos M′ term into the past, −0.5 / −2.0 / −5.7 min per
millennium before 1000 — the model's M′ 0.05°, 0.20°, 0.55° ahead. Read
directly (the composer's `moonArgs` against `pureMeeusArgs`): the model's ϖ
and Ω match the Meeus polynomials in T² (plan 23's construction) and carry
0.13 and 0.20 of their T³ + T⁴ tails at −1500. The lunar theory's record
had named it (doc 66: "the predicted-ë-vs-secular-ë difference"): ϖ and Ω
ride the deep eccentricity channel on the model's own e(t), whose J2000
curvature is about a seventh of the secular-theory ë that ELP's T³
embodies; L′ carries the secular convention through `lpSecularCompletion`
(derived at 98.8 %, DE441-confirmed), ϖ and Ω have no such carrier — and the
doc's drift row (+0.37° at −135 / +0.58° at −584) was a hand-written number
from an earlier state; it is script-written now. The Moon's longitude error
is EoC · δM′ · cos M′: ~100″ at −750, 650″ at −3000, inside the ancient ΔT
scatter, invisible to every tolerance gate. By the rule it is one series
with its physics named — the completion L′ has, extended to ϖ and Ω, never
a polynomial.

*Fixed in the follow-up.* The open question was whether ELP's ϖ/Ω cubic is
the secular-ë convention alone; the bundle's own documented check answered
it — the secular Taylor on the shipped e₀, ė, ë (`bundle.T3_W`) reproduces
Meeus's ϖ T³ at 96.6 % and Ω's at 113 % of a 4″ term. To first order in
Δ(e²) the channel factor is s · (3/2) · Δ(e²)/(1 − e₀²), so the two
completions are L′'s carrier scaled by K_W/K_PL and K_N/K_PL with
K = rate_ICRF · s_phys · 3/(2(1 − e₀²)) — `apsidalNodalSecularCompletion`,
one carrier, three scalings, no new constant, zero through T², bounded at
the taper edge (the frozen offsets beyond it are L′'s scaled: ≈ −6.5× on ϖ,
≈ +1.1× on Ω — doc 66 carries them script-written). The scaled carrier
predicted the measured drift at 103–108 % before it shipped; live, the
model's M′ sits −124″ from the polynomial at −1500 (was +1,935″), −150″ at
−3000 (was +5,965″), ϖ within 0.05° and Ω within 25″ over ±3,000 yr. Rules:
a documented Taylor check that is "not consumed" is a prediction waiting
to be read against a measurement — read it before building; and a
correction that exists for one of-date longitude is owed to the others
riding the same channel. Rules of the finding: a probe's null names the grid's extent beside it (a line
outside the grid is not absent); a regressor shared with the sampling is
fitted JOINTLY with the terms it correlates with, and its coefficient is
read against the prediction; and a residual term the geometry puts at zero
is a model-vs-reference term — hand it a third instrument on the reference's
own arguments before attributing it.

**The sweep's own lessons** (doc 112 §1): a series is put in TIME ORDER before
its lag-one correlation is read (LR04 arrives by age; the estimator stepping
backwards read ρ = 0, the "red-noise" floor was the white one and eight lines
"stood"); the surrogate floor's trigonometry is computed once per frequency,
not once per surrogate (14 min → seconds per series); a smooth residual at a
dense cadence has ρ ≈ 1 and its AR(1) floor near the whole variance — the
statement is "1.5 cycles seen", never a significance; and a bare
`createModel()` has no banked series (its hybrid domain is null), so a
comparison of the published elements passes the three banked artifacts in.
The gate: `check:artifacts` on the governed artifact; `docs:tables` on doc
112's blocks; the registry's `residualSweep*` keys.

---

## 2. The browser tier's gates and their origins

`npm run test:browser` runs the `src/script.js` golden masters in headless
Chromium — the only tier that guards Phase 8, which dissolves that file —
plus the epoch-consistency gate (pure f(Y) evaluators ≡ the epoch-anchor
chain at ±1/±5 Myr; the golden master cannot catch that class — and, since
the Predictions panel grew its "Model (LOD days)" rows, the panel's solar-day
count of date ≡ the engine's `meanYearInDaysAtAge` at the same epochs: the
unit pin, SI days ≠ LOD days, born from the owner reading 365.23 "days" at
195 Ma where the day of date gives 382; and since §1.33 the navigable-domain
rows: the Node twin's JD ↔ position round trip at the domain's edges, the
browser's position at −700 Myr ≡ the twin's, and the scene Moon's distance at
−400/−700 Myr ≡ the series' — born from the owner's lunar-eclipse view at
−2 Gyr, where the scene sat 817 kyr off its instant and the Moon 14 % too
close, with no row reading either; and since §1.34 the Earth-spin rows: the
scene's spin after a jump, read through the frame probe, ≡ the tier's GMST at
the same UT JD at the 2024 eclipse and at −700 Myr — born from the owner's
solar-eclipse view at −2 Gyr, the umbra ring 95° of longitude from the Moon's
shadow; and since §1.36 the one-deep-clock rows at −1 Myr, −400 Myr, −2 Gyr
and the navigable edge: the scene's year of date ≡ the model's year of the UT
count, the TT instant of the position ≡ the UT JD plus the model's bridge, the
Moon's ring ≡ the cited distance at the labelled age (each read after a
rendered frame — the ring is the render loop's), and the browser's navigable
range ≡ the twin's — born from the Earth–Moon genesis search landing on the
3.08-Ga system; and since §1.40 the one-clock label rows: the displayed Date
and Time, and the displayed Year of date, typed back through the pane's
inputs land on the same UT instant at both former seams ± 20 d and at the
four deep positions, one-day walks across each former seam advance the
parsed instant one solar day per step and the Year of date's day with it,
the orbit year's day 1 is the midnight of the year's first day, the Year of
date equals the calendar year in the era, the Step buttons cross each former
seam by whole years and return, and the Engine-age row at the past edge
reads the registry's TT age — born from the owner's globe turning 106° on a
one-year typed step at −1000, and from the first build's Step buttons
sticking there and turning the globe 79° per 100-yr step beyond), plus
`test:perf` — the deep-time performance gate (RATIO thresholds, deep vs
in-table cost, runner-speed independent; born from four ungated ratio
regressions, one owner-bisected at 28×; since §1.35 the deep-edge spin read —
the first one-source ε at −4.4 Gyr on a fresh page, absolute ≤ 5 s, born from
the scene's tier span overshooting the bank's deepest checkpoint (63 s at
−2.9 Gyr where the seated read is 0.06 s); plus two travel-speed rows the
steady-state rows cannot see — the orbit-ring resample against the per-JD
route and the Play-start delay on a fresh page — Play → the first frame that
advances the scene (it first watched the day-granular date string, which at
one week per second and a 100-ms headless frame could only change after the
second active frame: 3–5× by construction against the 5× limit) — both bisected from the
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
`ESSRT_PERF_TIGHTEN=0.01` and on the pre-fix builds; plus, since plan 24,
the one ABSOLUTE row — the first one-source ε at −400 Myr on a fresh page
with the spin-axis checkpoint bank landed must take ≤ 2 s, where the walk
from J2000 at the converged step takes ~200 s: a ratio row would let a
missing bank hide behind a slow near read, §1.29. The row was first written
on the FULL scene jump and read 220 s with the bank seated — which is how the
lunar cumulative tables' whole-span walk was found; since plan 25's seat the
full jump is gated again, ≤ 15 s, behind a row that asserts EVERY bank seat
took in the browser — the scene's seven tables and the package model's eight,
both directions — because a silently refused seat is a full-span walk that
would only show as a slow number).

The `test:snapshot` chain also carries:

- **`chart-export`** — the Tools panels' paper-SVG → PNG rasterizer behind
  every Export button (exact pixel size, independent decode, byte floor;
  fail-proven via `ESSRT_CHART_EXPORT_PLANT=1`) and the export STANDARD on
  all fourteen forms (title + legend row above, the plot, one credit strip
  below, no caption text — doc 57; fail-proven via `=2`). The twelve
  Framework Images pass the same standard with their records loaded, and a
  numbers row per figure re-reads each printed value from the model surface,
  formats it as the figure does and requires that string on the page
  (fail-proven via `=3`: one unit in the last decimal of the Days and years
  figure's sidereal day turns its row red). Born with the panel: a figure
  prints what the model computes, so a model move that does not reach a
  figure is a stale reader, not a stale picture.
- **`surface-rows`** (plan 30 §3 (1), §1.38) — the SURFACE golden: every
  Planet Info row of every body (776) and 22 live fields of the Predictions
  panel at seven epochs (today, −3000, −400 Myr, −2.46 Ga, −4.4 Ga, the
  genesis edge, +990 Myr), pinned as the visitor reads them — the rendered
  `value | unit` string per epoch and each row's CLASS: whether it moves with
  the epoch (614 do), whether it is ever "—" (29: the planets' spin rows beyond
  ±10 Myr, the anomalistic and climatic-precession rows beyond ±2 Myr), whether
  its hover still says "(at J2000)" on a moving row (0). Born from plan 30's
  dump, which found the measured year family shown beyond its window, mixed day
  units in one table, pane rows a landing behind, a finder a year long and 42
  hovers calling a moving value "(at J2000)" — none visible to a gate that reads
  the model. A class that changes fails by name; `--write` re-records for a
  change the commit explains.
- **`tools-panels`** — every Tools button opens its panel with no page
  error, three clicks within a frame leave ONE panel, and it closes again
  (born from a ReferenceError on open and the double-build race;
  fail-proven via `ESSRT_TOOLS_PLANT=1`). Since plan 20 the gate also
  renders EVERY Framework Verification category once (born from the
  Anomalistic Year category's only reference curve calling a function
  deleted at plan 18 — a ReferenceError on open that the default-open
  category hid for weeks; the row fails on that build). Since plan 22 the
  category set includes the two exhibit categories "Perihelion / Eccentricity
  — osculating vs mean" on their own windows (1990–2030 … 1000–2500), whose
  reference curve is the fetch-loaded table `data/earth-osculating-wobble.json`
  (the generator `earth-osculating-wobble.js`: the model's own nine-body
  integration with the 1PN term and the lunar quadrupole, 1000–2500, 20-day
  grid; its `--write` REFUSES if the window mean of osculating − mean leaves
  3″ / 5e-7 — the series IS the mean element, measured +0.39″ / 1.8e-7 over
  the whole span, −0.44″ / 1.0e-7 over 1800–2200); the golden pins the table
  at 1200 / 1950 / 2000 / 2024 and its null outside the span (`oscWobble.*`),
  waited for after the main pass so the wait cannot move the timing of any
  other row. The hover snaps by 1, 5 or 10 years with the window's span
  (≤ 60, ≤ 200, beyond) — the standard windows keep their 10-yr step.
- **`reports-export`** — the three Reports exporters ("Days, Years &
  Precession", the RA test, "Solstices & Equinoxes") run headlessly against
  a stubbed SheetJS: each completes without a page error and yields its
  sheets, and the RA test's cells are all finite at a sub-year step (born
  from two crashes no gate could see: the year-analysis export read a name
  deleted at plan 09 after the whole cardinal scan had run, and the RA
  test's perihelion-rate stencil ran on FLOORED years, so neighbours in one
  calendar year divided by zero and every rate cell read Infinity;
  fail-proven via `ESSRT_REPORTS_PLANT=1`).
- **`perihelion-at-sun`** — the Show/Hide grid: the chain planets'
  "Perihelion at Sun" marker sits at a(1−e) in the orbit plane at the
  chain's ϖ, the Moon's "Apsidal/Nodal Precession" markers (the perigee at
  F − M′, the nodes at L′ − F) and the "Sun barycenter" marker (≡ the Sun
  panel's Sun-SSB sum) are placed as stated, and every group's chip list is
  exact — no device-wheel chips (born from the "Real Perihelion" wheel ~90°
  off the chain and three chips that showed nothing; fail-proven via
  `ESSRT_PERI_SUN_PLANT=1`). Since plan 20 the gate also carries the
  deep-epoch and jumped-state rows, each measured before its fix: at
  −100 Ma the Moon stack's geometry follows a(t) — the apsidal arm a(t)·e
  and the drawn ring's radius a(t) (createPlanet froze both at build and
  moveModel read the frozen value, so the epoch updater's write reached
  nothing: at −400 Ma the arm read 0.014107 against 0.013520 and the ring
  0.25695 against 0.24627 while the placed Moon sat at 0.24854); the trace
  path's perihelion-marker radius is the rendered marker's a·e of date (it
  read the container's build offset — Jupiter 24.02 against 30.02 units at
  −400 Ma, 24.02 against 25.37 even at J2000, Mercury 6.60 against 7.96);
  the Moon's distance row reads the placed mesh on the first frame after a
  jump (the pre-override position was 440 km off); and a synchronous jump
  with the Tracing button on leaves the scene posed at the jump — the old
  `forceSceneUpdate` traced AFTER `moveModel`, so every synchronous reader
  saw the trace's last sample (the Sun's RA 8.6° off, the ring's perigee
  190° off after a year-1000 → J2000 jump). The same plant breaks the two
  geometry rows; the jump row's limit becomes unreachable under it. The
  perihelion-date rows ride the certified Sun (the Meeus Ch. 25 polynomial
  they solved before was a 1000–2500 AD form fed a UT day, arbitrary at deep
  time): at J2000, year 1000 and the deep epoch the Sun's longitude at the
  solved instant is ϖ + 180° to a microdegree — or to eight ulps of the
  Julian day in solar motion where that is coarser (−100 Ma: |JD| ~3.7e10 d,
  ulp ~8e-6 d ≈ 1e-5° of longitude, the solve's floating-point floor) — and
  the plant shifts the target.
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
website's EN pages. Since plan 16 it ratchets a second surface, the code's
comments and label strings (the Node tools, the packages, the tests —
keyed `code:<path>`; the terms are the retired constructions: H-divisor
labels, the era device and its combs, deletion narratives, plan-step
prefixes; `src/script.js` included since plan 16 tier 6, `tools/explore`
excluded by name), born from
the census that found ~1,900 such mentions after the docs sweeps — the
API's derivations table still shipped `latticeDivisor` and "RETIRED"
formulas, the registry two frozen values of retired laws. Fail-proven via
`ESSRT_VOCAB_PLANT=2` (one phantom code hit). `test:fixtures` carries the `tools/lib` golden masters
+ the plan-06 baseline — the clock-carrying quantities on the ±26-kyr
wander window and the deep-time anchors, bit-exact across the
lunisolar-clock restatement. The fifth model gate, `scene-year-lengths.js`,
samples the Node scene twin at −4000 and +10,000 — and, since the A-section
review, at ±100 kyr and ±1 Myr — with the solar-measurements exporter's own
event definitions and pins the measured sidereal, tropical and anomalistic
years of date to the one-family laws within 30 ms in the era and 50 ms on the
deep rows (the four-cardinal estimator's ~0.04-s floor at e = 0.05; the deep
rows are the ones that saw the certified Sun's third clock, §1.31 — +0.18 s
at −1 Myr where the era rows read a millisecond; fail-proven via
`ESSRT_SCENE_YEARS_PLANT=1`).

**The plant variables, one per fail-proven gate** (the list CLAUDE.md
points to; each gate's header states its own plant in full):

| variable | gate | what it plants |
|---|---|---|
| `ESSRT_CAL_PLANT=1` | `test/browser/calendar-conversion.test.mjs` | one expected calendar golden perturbed |
| `ESSRT_CHART_EXPORT_PLANT=1/2/3` | `test/browser/chart-export.test.mjs` | the PNG width by one pixel / a caption line / one printed figure number |
| `ESSRT_CSV_SMOKE_PLANT=1` | `test/csv-window-smoke.test.mjs` | one expected window-CSV row |
| `ESSRT_DT_SLOPE_PLANT=1` | `tools/verify/deltat-slope-basis.js` | +0.43 ms/day on the implied ΔT slope (the historical two-bases split) |
| `ESSRT_LITERALS_PLANT=1` | `tools/constants/check-literals.mjs` | a retired-input file re-entering |
| `ESSRT_OBLIQ_REALIZED_PLANT=1` | `tools/verify/obliquity-hybrid.js` | the predicted realized obliquity period × 1.005 |
| `ESSRT_PERI_SUN_PLANT=1` | `test/browser/perihelion-at-sun.test.mjs` | the expected marker distance shifted by 1 % |
| `ESSRT_PLAN06_PLANT=1` | `tools/fixtures/record-plan06-baseline.mjs` | one fixture value by 1 ULP |
| `ESSRT_PY_SMOKE_PLANT=1` | `tools/check-python-smoke.mjs` | one fake stage-C failure |
| `ESSRT_REPORTS_PLANT=1` | `test/browser/reports-export.test.mjs` | one Infinity cell recorded in every exported sheet |
| `ESSRT_SCENE_YEARS_PLANT=1` | `tools/verify/scene-year-lengths.js` | the compared sidereal law shifted by 0.1 s (the tolerance is 30 ms) |
| `ESSRT_TOOLS_PLANT=1` | `test/browser/tools-panels.test.mjs` | one expected panel id renamed |
| `ESSRT_SURFACE_PLANT=1` | `test/browser/surface-rows.test.mjs` | one row's class (moves) flipped in the measured set |
| `ESSRT_VALUES_PLANT=1` | `tools/docs/export-model-values-package.mjs` | the 16.0.0 offset (167.048°) re-injected on the first plausibility row |
| `ESSRT_VOCAB_PLANT=1/2` | `tools/check-vocabulary.mjs` | one phantom docs hit (`=1`) / one phantom code hit (`=2`) |
| `ESSRT_WOBBLE_PLANT=1` | `test/browser/wobble-center.test.mjs` | the tolerances tightened 10,000× |

(`test:perf` is tightened with `ESSRT_PERF_TIGHTEN=0.01`, above; the
`tools/lib` golden masters fail on any 1-ULP change without a plant.)

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
7 ppm faster — a precession-anchor reading, closed by the p_A input; the
sidereal year itself is right: the model's geometric Sun against DE441 in the
fixed J2000 frame (no precession theory on the reference side,
`tools/explore/sun-inertial-vs-de441.cjs`) shows no sidereal slope over
±9 kyr, ±50 ms per 500-yr bin with no sign, rms 3.46″ (plan 21 §0.3; the two
referees that disagree on the equinox, Vondrák and Horizons of date, both carry
a precession theory). **T_p(t) is the published deep-time clock**
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
40,927 over the LR04 record, the climate formula's p+s₃ line on the orbital
forcing alone 40,924, La2004's own series 40,900 on the same window; the
general rate read 41,224) — s₃ at its dynamical value under the measured
solar-mass history — degenerate today with the pure precession-scaling
reading "obliquity period ∝ T_p", roughly a factor two apart at 2.46 Ga;
registry keys `obliqBeat*Kyr` / `obliqPrecScaled*Kyr`, doc 109
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
cause, the Mesoproterozoic 1.8–2.6σ gap to Zhou 2024's precession constants
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
- [109-model-nbody-engine.md](109-model-nbody-engine.md) — the re-evaluation record; §18 the obliquity hybrid; §23 the planet-channel and era-device retirements
- [110-calculation-map.md](110-calculation-map.md) — every published quantity traced to its formula, code and live value
- [40-architecture.md](40-architecture.md) — the two-engine architecture and the gate chain
