---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:bb6a03c877eedab8
status: current
---

# 109 — The model's own N-body: audit, engine, frequencies, and the lattice at its own quantity type

This record collects what the model established about the perihelion and
node rates once it integrated the solar system with **its own instruments**
— a 9-body Newtonian integrator seeded from the observed J2000 state,
later a Wisdom–Holman engine, and a frequency analysis — instead of quoting
secular theory. It grew out of the Mercury-anomaly work in doc 13 §1.8
(the projection identity, the transit test and the candidate slot stay
there); doc 108 asked the question this doc answers (a self-consistent
secular solution from the framework's own dynamics). Every comparison below
is labelled by what it is: **theory-vs-theory** (our integration against
another integration or against secular theory — agreement shows the
calculation is consistent, nothing more) or **theory-vs-observation**
(transits, ranging-constrained positions, the measured J2000 values). An
ephemeris is not an observation.

Instruments (all `tools/explore/`): `perihelion-observation-audit.mjs`,
`nbody-wh.mjs`, `lattice-long-window-test.mjs`, `naff-frequencies.mjs`,
`derived-earth-orbit-vector.mjs`, `lattice-beat-null-test.mjs`; the bound
campaign (§12): `nbody-forces.mjs` (the force plugins), `ebound-experiment.mjs`,
`ebound-shapes-run.mjs`, `pibound-experiment.mjs`, `pibound-strata-run.mjs`,
`zbound-experiment.mjs`, `zbound-l-projection.mjs`. Their headers carry the
measured numbers; this doc carries the reading.

## 1. Three quantities that get conflated

(A) an eigenfrequency or first-order secular *mean* — a ≥ 10⁵-yr average of
one mode; (B) the instantaneous secular rate at this epoch — what an N-body
integration gives now; (C) a short-window trend through an osculating
element (WebGeoCalc, 1800–2100). Saturn is the worked example: first-order
Laplace–Lagrange gives +1,867 ″/cy (A); the window trend is −1,600 (C); the
standard mean elements for 1800–2050 already read −1,508 (B). The theory
does not "assume prograde"; the first-order *approximation* does, and nobody
predicts with it. The lattice's 8H/N divisors are A-type claims and can only
be tested against A-type quantities.

Even C is not one number: the same DE series
(`public/input/wgc-perihelion-data.json`, its `windowRates` fields) fits
−1,599 over the full 300-yr window (15 cycles of the 19.9-yr Jupiter–Saturn
oscillation — the wiggle averages out, and the value agrees with the
mean-element B) but −3,337 / −3,669 / −3,094 over its three century-scale
sub-windows (1800–1900, 1900–2026, 2026–2100 — only 4–6 wiggle cycles each,
so the fit is dominated by the wiggle's edge phase). The site's reference
value ~−3,400 (`saturnObservedRateArcsecCy`) is the rounded representative
of that century-window family; the −1,600 used in §2 is the 300-yr fit.
Same data, different spans — a C-type number must state its window.

## 2. Observation-first audit — what is measured, what is integrated

`perihelion-observation-audit.mjs` puts B beside C for every planet using
the model's own 9-body Newtonian integrator (DE440 mass ratios, no
relativistic term), seeded from the J2000 state vectors of the JPL
ephemeris (Horizons). Two numerical traps were measured on the way and are
recorded in the script: seeding from Standish's *mean* elements loses the
phase of the 883-yr great-inequality term and mis-states Saturn by 1,300
″/cy; and RK4 at dt 0.5 d produces +85 ″/cy of purely numerical apsidal
drift for Mercury (0.05 d → 0.01 ″/cy).

What the C column is must be said exactly: the WebGeoCalc series is **not
an observation** — it is the JPL planetary ephemeris (NAIF kernel set 1, a
DE4xx integration *with* relativity, fitted to optical astrometry 1800–1970
and to ranging since; 2026–2100 is prediction) rendered as osculating
elements. So N-body − DE compares two integrations; for the outer planets
that is integrator against integrator and agreement is expected, and the
data content lies where the two differ in physics — Mercury — whose
raw-data statement is the transit record (doc 13 §1.8).

Result, same window, same estimator (N-body − DE, ″/cy): 1800–2100 —
Mercury **−43.0**, Earth −6.3, Mars −1.4, Jupiter −32, Saturn +23 (−1,577
vs −1,600, retrograde in both), Uranus +0.3; 1900–2026 — Mercury **−43.0**,
Earth −12.2, Mars −0.8, Jupiter −225, Saturn −153 (−3,822 vs −3,669),
Uranus +107; Venus and Neptune have ill-conditioned ϖ (e < 0.01). The outer
planets' window "rates" swing by thousands of ″/cy between the two windows
in *both* series (great inequality, 59-yr conjunction cycle): there is no
single rate for them on spans this short, and neither −1,600 nor −3,669 is
a Saturn observation. Mercury is −43.0 in both windows.

With the first post-Newtonian term switched on (`gr=1`) the Mercury
residual becomes −0.0 and no other row moves beyond the window scatter
(Mars −0.1, Venus +0.4, Earth −2.5): the single omitted term closes the
single open row.

**Masses cannot carry the 43** (the `scale=` and `elem=node` options). A
single perturber raised by the amount that gives Mercury +43 breaks Earth
and Mars (Venus ×1.155 → Earth +48; Jupiter ×1.28 → Mars +354). A joint
least-squares mass set exists that fits every perihelion row (Venus +18 %,
Earth −9 %, Mars −64 %, Jupiter +1 %, Saturn +2 %) but breaks the node
column by 10–65 ″/cy where the baseline masses reproduce every node rate to
0.1. The perihelia and the nodes are set by the same masses through
different geometry, and only Mercury's perihelion is off. Whatever supplies
the 43 must act on the apsidal line without touching the node, and
preferentially at Mercury — the constraint written into the candidate slot
of doc 13 §1.8.

## 3. The engine

`nbody-wh.mjs` is a Wisdom–Holman integrator in democratic-heliocentric
coordinates (exact universal-variable Kepler drifts, planet–planet kicks,
optional 1PN Sun–planet term, energy and angular-momentum diagnostics). It
is exact for the two-body problem at any step, reproduces the RK4 dt 0.05 d
reference to the digit at 1–2-day steps, holds |ΔE/E| at 10⁻⁹ and
|ΔL|/L at 10⁻¹⁴ over 1 Myr, and is twenty times faster (1 Myr in 13
minutes). A plain 4th-order Yoshida composition in Cartesian coordinates was
tried first and is a recorded negative result: worse than RK4 at equal cost
(−74 ″/cy at 0.25 d). The engine's physics content — the Sun and eight
planets as point masses with the Earth–Moon system as one body; not the
Moon separately, not the Sun's J₂, not asteroids, not Earth's spin — is
stated in the module header so that a run's scope is not overstated.
Beyond ~5 Myr a single trajectory is one realisation of a chaotic system:
frequencies and amplitudes are robust, phases are not.

## 4. The lattice at its own quantity type

`lattice-long-window-test.mjs` integrates ±500 kyr and takes each planet's
mean ϖ̇ and Ω̇ over the whole window — quantity A. The means come out as the
secular eigenfrequencies, as they must (Jupiter 426 ″/cy = g₅, Saturn
+2,824 = g₆ prograde, Mars 1,786 ≈ g₄); the RK4 and Wisdom–Holman runs
agree to 0.3 ″/cy.

| perihelion divisor | 1-Myr Newtonian mean | reading |
|---|---:|---|
| Mars 8H/36 = 1,739 | 1,786 | a mean (2.7 % low; today's rate is 1,599) |
| Mercury 8H/11 = 531.4 | 512.5 (Newton) / 559.9 (with 1PN) | the *present* Newtonian rate (529), neither mean |
| Jupiter 8H/39 = 1,884 | 426 | a window value |
| Saturn −8H/65 = −3,140 | +2,824 | a window value, wrong sign as a mean |
| Uranus 8H/24 = 1,160 | 697 | a window value |

| node divisor (invariable plane) | 1-Myr mean | reading |
|---|---:|---|
| Earth −8H/40 = −1,932 | −1,842 (≈ s₃) | within 5 % |
| Mercury −8H/9 = −435 | −549 (≈ s₁) | 22 % low |
| Mars −8H/64 = −3,092 | −1,928 | 60 % high |
| Jupiter, Saturn −8H/36 = −1,739 | −2,635 (= s₆) | 34 % low |
| Uranus −8H/11 = −531 | −299 (= s₇) | off |
| Neptune −8H/3 = −145 | −67 (= s₈) | off |

The outer planets' nodes librate in the J2000 ecliptic (their inclination
to the invariable plane is below the 1.58° ecliptic–invariable tilt), so the
node column must be read in the invariable plane, as above.

## 5. The frequencies

`naff-frequencies.mjs` (Laskar's NAFF on z = e·e^{iϖ} and ζ = sin(i/2)·e^{iΩ},
with a least-squares amplitude refit and a merge of frequencies closer than
the resolution) returns the secular frequencies of the solar system from the
model's own Newtonian system: Jupiter g₅ = 4.2562 ″/yr (Laskar 4.2575),
Saturn g₆ = 28.2453 (28.2455), Mars g₄ = 17.903 (17.916), s₆ = −26.3477
(−26.3475), s₇ = −3.000 (−2.993). With the 1PN term on, Mercury's g₁ moves
from 5.103 to 5.576 ″/yr (Laskar 5.5965): the omitted term raises Mercury's
long-term apsidal frequency by 0.473 ″/yr = 47 ″/cy — the 43 of the present
epoch seen at the quantity-A level. Theory-vs-theory throughout; the value
of this section is that the model's engine is now shown to be the standard
secular system, so anything it says next about the lattice is said by the
same engine.

The secular g/s are not on 8H/N integers (closest: Mercury's g₂ component
at 8H/16.00 and s₆ at −8H/54.5) — what doc 108 found from first-order
theory, now measured from the model's own engine at 1 Myr.

## 6. The beat correspondences with a null

`lattice-beat-null-test.mjs` forms every beat |fᵢ ± fⱼ| of the leading g's
and s's and counts those within a tolerance of some 8H/N, against a
structure-preserving null (each real frequency jittered by ±7 %). The first
version returned P = 0.0008 — a false positive, recorded in the script: the
ecliptic-frame node "frequencies" ≈ 0 (libration artefacts) made every X ± 0
count twice, and a log-uniform null lacks the clustering of real g/s sets.
Corrected, with the physical s-frequencies from the invariable plane: 1 %
rule, N ≤ 100 — 265 of 552 beats match, null 260 ± 8 (P 0.27); 0.5 % rule,
N ≤ 70 — 123 match, null 125 ± 8.5 (P 0.62). **The lattice's beat
correspondences are at the level any similar frequency set produces against
a dense 8H/N grid.** The beats doc 108 names are members of that
population.

## 7. A derived Earth orbit vector — what 1 Myr can and cannot do

Doc 108 §6 asked for a self-consistent secular solution for Earth's e and ϖ
from the framework's own dynamics. `derived-earth-orbit-vector.mjs` builds
z_E(t) from the NAFF mode table and tests it. From a 1-Myr table the
reconstruction fits its own window (La2004 corr 0.98–1.00, RMS ≤ 8e-4 over
250 kyr — theory-vs-theory) and reproduces the measured J2000 slope (ė
−4.18e-5/cy vs −4.20e-5 measured; the shipped H/3 law: −4.31e-5), but it
**does not extrapolate**: 0.5–2 Myr back it reads corr 0.14, RMS 1.7e-2 —
no better than the H/3 law — because g₃/g₄ and other close pairs are
unresolved at 1/span. A least-squares refit that keeps such pairs produces
large cancelling amplitudes (Earth's g₅ term read 0.078 against a physical
≈ 0.019) — an in-window fit, not a solution; the merge rule in NAFF prevents
it. A derived deep-time vector needs a ≥ 10–20 Myr integration, which the
engine can now provide; until it passes the out-of-window and the eclipse-
and cardinal-point tests, the H/3 line stays the model's local law.

What the eclipse chain can test is already sized
(`ecc-law-eclipse-sensitivity.mjs`). Both the shipped law and a derived
vector carry the measured J2000 value and slope of e; they differ in the
curvature: the H/3 line has ë = −3.8e-8/cy², the derived vector −2.6e-7,
and Simon et al. 1994's classical series −2.5e-7 — the shipped law's
curvature is about seven times too small against the secular dynamics.
Over the 21 centuries to Babylon −135 that is Δe ≈ 4.8e-5, i.e. ≈ 20″ in
the Sun's longitude. The test was then run: `createModel` gained a
research hook (`createModel(constants, { laws: { eccentricityAt,
eccentricityRateAt, perihelionLongitudeDegAt } })`; absent, the shipped
laws, bit-identical — engine gates green), and `eclipse-audit.js` a
probe-only override (`ECLIPSE_AUDIT_LAWS=curvature:<ë>`; `--write` is
refused under it). A control run with the H/3 line's own curvature
reproduces the recorded artifact exactly; the run with ë = −2.5e-7/cy²
moves Babylon −135 from 198 to 209 km (ΔUT and the framework UT unchanged
at the minute), Plutarch 71 from 34 to 23 km, Lu −708 from 106 to 90,
Nabonidus −556 from 74 to 81, Ibn Yunus 1004 from 90 to 66; the verdict
counts and the Stephenson lunar/solar residuals do not change. The reason
is a conversion error in the sizing: 20″ of solar longitude is 8 minutes
*at the Sun's rate* — the right conversion for cardinal points and
transits — but an eclipse instant is set by the Moon−Sun **relative**
motion (≈ 0.51″/s), so 20″ is ≈ 40 s ≈ 20 km, well inside the audit's
~100-km scatter. **The eclipse record cannot discriminate the e-law's
curvature**; the cardinal-point instants could (8 minutes at −135), but no
ancient equinox or solstice timing reaches that precision. So the
curvature of Earth's eccentricity law is, today, a theory-vs-theory
question — the H/3 line's −3.8e-8 against the secular dynamics' −2.5e-7 —
and the honest statement is that the shipped law disagrees with the
dynamics on a quantity no observation yet reaches. The hook stays: it is
the way any alternative Earth-orbit law is put through the eclipse and
cardinal chains without touching the shipped defaults.

## 8. What this leaves

- **Newton + measured masses is the model's dynamical floor**; its own
  engine reproduces the secular system and every observed rate except one.
- **The 43 at Mercury is a radial, node-neutral, Mercury-preferential term**
  that also raises g₁ by 0.47 ″/yr; the model derives it from its own
  constants; a lattice-native alternative must meet the same four
  constraints (doc 13 §1.8, candidate slot).
- **The lattice's divisor columns are not one quantity type**: Mars's
  perihelion and Earth's node divisors hold as means; Mercury's perihelion
  divisor is the present-epoch Newtonian rate; the others are window values;
  the beat correspondences are at chance level. What the divisor columns
  claim for those planets has to be restated (§9).
- Nothing here touches the model's eclipse, day-length, year-length or
  ice-age results, which do not rest on the perihelion or node divisors.

## 9. Divisor restatement — proposal

Each divisor keeps its number and gains a **type**, stated wherever it is
published (registry note, site table, paper table):

| divisor | type | statement |
|---|---|---|
| Mars perihelion 8H/36 | long-term mean | agrees with the 1-Myr Newtonian mean to 2.7 % (g₄) |
| Earth node −8H/40 = −H/5 | long-term mean | agrees with the 1-Myr mean to 5 % (s₃) |
| Mercury perihelion 8H/11 | present-epoch Newtonian rate | 531.4 vs 529 now; the long-term mean is 512 (Newton) / 560 (with the relativistic term) |
| Jupiter 8H/39, Saturn −8H/65, Uranus 8H/24 perihelion | window-epoch values | not means (426, +2,824, 697) and not present rates; retained only as descriptors of the 1800–2100 osculating trend, or retired |
| Mercury −8H/9, Mars −8H/64, Jupiter/Saturn −8H/36, Uranus −8H/11, Neptune −8H/3 nodes | window-epoch values | not means (s₁, s₄, s₆, s₇, s₈); same choice |

The choice for the last two rows — retain as typed descriptors or retire —
is the owner's; the model's eclipse, LOD and ice-age results are unaffected
either way. Until it is made, the public surfaces should not present those
divisors as predicted long-term periods.

## 10. Extending the list of forces — the plugin sandbox and what it shows

A recurring question was whether the N-body "only uses two-body gravity" and
could be *extended*. It was tested (`perihelion-observation-audit.mjs
interactions=sun`): with only the eight Sun–planet pairs acting, the
perihelia hardly move (Mercury −3.7 ″/cy, Mars +54, Earth −173, Saturn +374
against the observed 572 / 1,598 / 1,157 / −1,600); with all 36 pairs among
the nine bodies — what the engine always computes, at every step — they read
529 / 1,597 / 1,151 / −1,577. The secular motion of the perihelia *is* the
planet-on-planet gravity, solved numerically; "the three-body problem" means
no closed formula exists, not that physics is missing.

What can be extended is the list of forces, and `nbody-forces.mjs` makes any
candidate one function: `accel(r, v, t, GM) → km/s²`, applied by both engines
(`extra=` in the audit, `extraForces` in the Wisdom–Holman engine). Two
acceptance rules apply to any candidate meant to explain something: (1) after
adding it, every 1800–2100 perihelion and node rate must stay inside the
audit's scatter (nodes within 0.1 ″/cy), because those are ranging-constrained;
(2) it must then move what it is meant to move. Rule (1) is a 7-second run.

Reference candidates, measured: the Sun's oblateness (J₂ = 2.2×10⁻⁷) and the
asteroid belt (2×10⁻⁹ M☉ at 2.8 AU) change nothing visible. A Yukawa fifth
force a = −(GM/r²)·α(1 + r/λ)e^{−r/λ} is the interesting one: tuned to
Mercury's +43 at λ = 0.4 AU it overshoots Venus, Earth and Mars (+19, +10,
+4); at **λ = 0.2 AU, α = 2.9×10⁻⁷ it reproduces the present-epoch perihelion
residuals of all four inner planets** (Mercury −0.9, Venus +2.5, Earth −3.2,
Mars −1.1) with the nodes untouched. At this epoch, on the perihelia alone, a
short-range radial force is degenerate with the relativistic term — a
two-parameter fit to a four-number pattern that the 1PN term produces with
none. The discriminators lie elsewhere, and two are in the model's own
instruments: Icarus as a massless test particle (perihelion 0.19 AU) reads
+10.1 ″/cy with the 1PN term — GR's value to the digit — and +8.4 with the
Yukawa (measured ≈ 10 ± 2: leaning against it, marginal at that uncertainty);
and Kepler's third law: the Yukawa shifts the GM Mercury "feels" by +5×10⁻⁷
relative to the outer planets (Venus +1.4×10⁻⁷, Earth +5×10⁻⁸), whereas
ranging fits every planet with one GM to ~10⁻¹⁰ — excluded by three orders of
magnitude, theory-vs-observation.

The general result of the sandbox is a bound. The 1800–2100 rates limit any
added force's effect on each planet's ϖ̇ to a few ″/cy and on each node to
0.1 ″/cy; the secular frequencies are the long-term averages of exactly those
rates, so no added force can move them by more than ~1 %. The outer-planet
8H/N values are 40–70 % away from the frequencies the engine finds. A force
that reached 8H/N at deep time while leaving the present rates alone would
have to be zero now and large later — which is a statement about H(t), not
about gravity, and returns the question to engine K's own domain (§9 and the
two-engine plan).

## 11. The founding observation with a null

The planetary divisors were read from J2000-era rates as "8H integers". Two
facts about that snapshot, measured (`j2000-lattice-snapshot-null.mjs`):
(a) apart from Mercury's perihelion (8H/11 vs the present Newtonian rate
8H/10.95, 0.5 %), the shipped divisors are *not* the present-epoch rates —
Mars 9 %, Jupiter 126–286 %, Saturn 18–99 %, Uranus 44 %, Venus and Neptune
of the wrong sign; nodes 18–106 % off — and not (§4) the long-term means
either; they were fixed by other constraints (the balance laws, inclination
trends, window choices). (b) The present rates themselves land within 1 %
of an integer N in 7 of 12 cases, against 5.4 ± 1.3 for jittered sets
(P 0.20; at 0.3 %: 2 of 12 vs 1.8 ± 1.2, P 0.56): a grid of spacing 1/N
guarantees near-integers for N ≳ 20. The "J2000 integers" carry no
information beyond the snapshot they were read from. What the perihelion
rate of a planet *is* — the phase rate of a sum of rotating vectors,
wandering continuously (Mercury 8H/10.6 → 8H/11.6 over its cycle, Saturn
from −8H/65 to +8H/58) — means no single integer can be attached to it in
the first place; the invariants that could carry a structural claim are the
g/s, and they are off the grid (§5–6).

## 12. The bound experiments — three universes, measured

§10 closed the static-force route: no added force reaches the 8H/N values
while leaving the present rates alone. The owner's next question — can the
model's laws be *imposed* on the dynamics? — opened a different mechanism
class: **work-free feedback forces** (steering, never driving — each force
is ⊥ v, changes no orbital energy), built as plugins in `nbody-forces.mjs`
(`ebound`, `eboundpair`, `eboundlaw5`, `pibound`, `zbound`) and always run
against a free control. Every bound is **gated**: the force is exactly zero
through the observed era, so all in-window observables are bit-identical to
Newton + 1PN by construction. Everything beyond the gate is theory-vs-theory
— with one exception, marked, where a measurement referees.

**The e-bound (Earth's e on the H/3 line).** Holds e at 0.0075 against the
law's 0.0078 floor through the +26-kyr origin-pass where the free dynamics
reads e ≈ 0.003. Even ungated its
present-epoch force is ≈ 0 (the H/3 line is tangent to the free motion now
— the 1800–2100 audit is bit-identical with it on). It needs an external
angular-momentum reservoir; delivering the counter-torque through the
Law-5 weight √m·a^{3/2}/√d closes the ledger to the integrator's own noise
and puts 99.9 % of the load on the four giants at a cost of Δe ≤ 3·10⁻⁵
each — the balance law working as a mechanism. Side effect: a bounded Earth
rewrites Venus and Mars at the 10⁻² level within 160 kyr.

**The rate bound (the window divisors made permanent).** All eight
perihelia can be held on the lattice+projection lines (the §9 window
divisors with their equatorial-projection terms: Jupiter 8H/39 = 1,884 ″/cy
− 137.7 → 1,746.5 ″/cy = 17.465 ″/yr, Saturn −3,140 − 282 → −3,421.9) to a
few ″/cy — but three results close this reading: (a) ungated, the required
force (≈ e·v·Δϖ̇/2 ≈ 10⁻¹⁰ m/s² on Saturn) acts in the ranging era and is
excluded by orders of magnitude; (b) Earth's ϖ-line is unholdable without
its e-law (e → 0 leaves no controllable apse) — the model's two Earth laws
need each other, measured; (c) Jupiter's held line at 17.465 ″/yr sits
between g₃ (17.37) and g₄ (17.92) and resonantly pumps the terrestrial
eccentricities: Mars reaches e ≈ 0.99 and **the system destroys itself at
462 kyr**. Fixed rates are not a viable architecture.

**The comb universe (every shape on the lattice).** The stable form: each
planet's z held on its own free-fitted epicycle *sum* with every frequency
snapped to the nearest comb line 2πN/8H (detunings 0–4 %; Earth's dominant
term — the Jupiter-forced epicycle — sits on 8H/9 at 0.0 %). Ran 4.3 Myr without incident; exactly 8H-periodic,
so every mean perihelion period is exactly 8H/N (integer windings — a
closure theorem); ΔL is not a leak but a bounded 3.4·10⁻⁴ *breathing* of
the targets' own total L_z over the 8H cycle (three compensators each made
it worse — the exchange is legitimate); spectra match the free dynamics to
~5 % at 800 kyr. Its one fingerprint is arithmetic: beats of comb lines are
comb lines, so the eccentricity metronome must be 8H/6 = 447 kyr — 405 is
not expressible. Measured over 4.3 Myr (joint two-frequency fit): free
1.04·10⁻² at 405 / comb 1.35·10⁻² at 447 and only 2.6·10⁻⁴ at 405. Against
the **measured** Mesozoic metronome (405.6 ± 2.4 kyr, phase-stable
> 200 Myr — the one theory-vs-observation row in this section), the comb
is excluded as the deep-time law. Stability itself obeys a corridor rule:
the bound inherits stability from the free system and only holds *beside*
the free eigenfrequencies; assignments that stray re-enter the rate-bound
failure mode.

**The hybrid (Earth on the model's law, the rest on the comb).** The e-law
e = base′(1 + cos ψ/2), with both the modulation phase ψ and the apse
running on the H/3 period, is *exactly* three comb lines (N0 + N24 + N48,
amplitudes base′/4, base′, base′/4). Earth
tracks the full vector; the seven neighbours barely respond (Earth is too
light to matter); and the integration reproduces the law's own constants —
the z-spectrum line at N24 reads base′ to 0.2 %, the e-line at 111.8 kyr
reads base′/2. The deep-time spectrum is a single H/3 line: the 405 (and
the 447) vanish, so the same referee excludes it as the deep-time law.

**The dominance rule** (why some planets ride their means): a planet's own
epicycle amplitude over the sum of the borrowed ones — Mercury 2.9,
Jupiter 2.4, Mars 1.9 stay near their means; Venus 0.6 and Earth 0.55 are
borrowers whose instantaneous rate carries no structural information
(Earth today runs 31 % *above* its long-term mean). "Moves at its mean" is
a dominance property, not a lattice property. (The per-planet z-plane
shape plates — each planet's full-mode trace, the two-vector shape, and
the J2000 arrows — are generated by
`tools/explore/eccentricity-shapes.mjs` from the engine's own NAFF mode
table; Saturn's window retrograde reads there as the epicycle far side
plus the 883-yr GI wiggle, not a secular direction.)

**What §12 leaves.** The lattice *can* host a stable, observationally
invisible solar system — but only in the corridor beside the Newtonian
eigenfrequencies, and both lattice-native deep-time laws for Earth's
eccentricity fail the same measured referee, the 405-kyr record, which the
free dynamics reproduces from gravity alone. The surviving position is the
one §8–9 already point to: the H/3 law is the **epoch-local tangent** of
Earth's free eccentricity vector — identical to observation throughout the
tested window, silent about deep time — and the planetary secular system
belongs to the free dynamics, while the model's spin-family results
(precession, LOD, eclipses, ice ages) are untouched by any of this.

## 13. The 13:3 permanence question — closed on every doorway

The 13:3 ratio (axial precession H/13 against inclination/perihelion
precession H/3) is exact at J2000 and generated H itself. Whether anything
makes it MORE than the J2000 reading — a permanent structure — was pursued
to exhaustion. The doorway list, each measured:

- **Frames, masses, projection** (§10-class + the E22 round): the diagonal
  mass theorem, frame-rotation cancellation and the cross-frame projection
  close the candidate reinterpretations of the rates.
- **Held universes** (§12): any Earth held permanently on the H/3 law
  loses the 405-kyr line the strata demand, and the minimal held
  configuration pumps Venus to e ≈ 0.17 through the g₂′ near-resonance.
- **Any-base lattice scan** (`lattice-base-scan.mjs`): no base period
  hosts the g-frequencies — the best base anywhere performs at the
  random-null median (P ≈ 0.5); 8H sits in the bottom 15 %.
- **Mechanism, lock-onset and snap-epoch hunts**: no lock mechanism found;
  nothing special at any candidate onset epoch; the epoch where the free
  dynamics touches the lattice line **is** J2000.
- **Added forces** (§10): capped at ~1 % reach on secular frequencies and
  excluded by Kepler-III consistency.
- **Secular spin–orbit capture** (the Saturn-locked-to-s₈ class): capture
  locks a spin precession to a FIXED eigenfrequency, never to a
  superposition wandering on 20-kyr scales against Myr-class libration;
  the literature's future precession-resonance crossings give obliquity
  chaos, not capture (Néron de Surgy & Laskar 1997).
- **The statistical mode** (`pomega-rate-distribution.mjs` — the last
  doorway): even without a lock, H/3 could have labeled the system's
  TYPICAL state if 11.59 ″/yr were the mode of Earth's wandering inertial
  ϖ̇. Measured on the ±500-kyr 1PN run (36,452 sliding 2-kyr rates): the
  mode is ≈ 8 ″/yr (14 % bin share), the median 7.9, and the H/3 line
  sits at the **75th percentile**; time within ±5 % of H/3 is 5.8 %
  against a 4.8 % uniform-null. Not the mode; barely above chance.
  (Theory-vs-theory: the referee is the model's own engine D.)

Structurally, permanence was never available across the seam: engine-K
frequencies scale with 1/H(t) (the tidal clock, ~10 % per 380 Myr) while
engine-D frequencies scale with M_Sun (the mass clock, ~0.003 % over the
same span) — five orders of magnitude apart. A permanent cross-seam
integer ratio would require the tidal clock enslaved to the mass clock,
which nothing measured supports.

**What survives, permanently:** the addition identities' FORM — perihelion
-of-date = equinox precession + inertial perihelion motion (16 = 13 + 3)
and 8 = 5 + 3 are frame arithmetic, true at every epoch by construction;
what is epoch-local is only that the addends land on H/13 and H/3. The
spin family's H(t)-scaling is rock-confirmed, and the composed two-engine
precession matches the deep-time inferences (doc 99, "One solar system").
The longest-lived Fibonacci touch is Earth's own **nodal mean ≈ −H/5**
(the one A-type lattice match, anchored on the s₃ eigenfrequency — it
stands for tens of Myr, though H's growth eventually walks away from it
too). Of all epochs, the one where the free dynamics kisses the Fibonacci
lattice is the one with observers in it; selection mechanisms were tested
and none found, so the model claims no structure — and no one gets to call
it understood, either.

## 14. The mass-scaling of the secular modes — measured beyond first order (W5)

The two-expansions programme's scaling law — every Newtonian secular
frequency ∝ M☉ under adiabatic solar mass loss, hence the 405-kyr g₂−g₅
metronome period ∝ 1/M☉ — is exact **at first order** (it is the
Laplace–Lagrange result; `tools/explore/solar-mass-scaling.mjs` measures
exponent 1.000 on every L-L slot *by construction*, and the same
first-order matrix puts the beat period at 347 kyr against the true
405.6 — a 17 % miss that is entirely g₅'s missing second-order content).
W5 measured the response of the **real** system: time-varying GM☉ in the
WH engine (`nbody-wh.mjs` `gmSunOfT`, slow-ramp approximation, constant
path bit-identical), a 1 % mass step between two 4-Myr constant-mass
windows, NAFF per window, and a constant-mass twin whose window-to-window
ratio removes the system's natural frequency wander
(`tools/explore/w5-gm-ramp.mjs`; full tables in its RESULT header).

Measured, controlled (twin-referenced), reproduced at δ = 1 % and 0.5 %:

- **Adiabat exact in flight**: windowed-mean a·M invariant to 1e-9
  (inner planets) across the ramp; e untouched.
- **The planets' own modes scale**: g₁ +125/+65 ppm, g₂ +38/+21,
  g₄ +91/+43 off the exact-∝M prediction — first-order law confirmed
  dynamically at the 1e-4 level.
- **The giant modes under-scale**: g₅ (read identically through Earth,
  Jupiter and Uranus) has a mass-independent share s = 11.7 %; g₆
  s = 10.1 % — O((m/M)²) secular content, Great-Inequality-amplified,
  scaling as M⁰ (n·(m/M)² → λ²·λ⁻²), matching the Brouwer–van Woerkom
  second-order magnitude for g₅ (~13 %) and the L-L-vs-true gap above.
- **The 405-kyr ruler**: the g₂−g₅ beat responds as
  **M^(1.153 ± 0.002)** (exponents 1.154 and 1.152 at the two step
  sizes), i.e. P₄₀₅ ∝ M^−1.153 at the J2000 configuration — ~15 % more
  mass-sensitive than the first-order 1/M statement. Spalding 2018's
  published 1/M relation is the first-order case, quoted at a precision
  (~1 significant figure) that cannot resolve the correction.

**The analytic bracket** (engine-independent inputs: Laskar 2004's true
g's; the first-order L-L values cross-checkable against the published
Brouwer–van Woerkom linear theory): the total second-order content of g₅
is the L-L gap, 1 − 3.685/4.2575 = 13.4 %. If ALL of it were
mass-independent the beat exponent would be
1 + 0.134·g₅/(g₂−g₅) − 0.005·g₂/(g₂−g₅) ≈ **1.167** — the upper bound.
The measured 1.153 says 87 % of the gap is the M⁰ part; the remaining
13 % of the gap carries mass-dependence. That the gap and the share are
NOT the same thing in general is proven by g₆: its L-L gap is ~22 %
(linear g₆ ≈ 22.0 vs true 28.25 — the famously large GI correction)
while its measured M⁰ share is 10.1 %. So the analytic route brackets
(1.000 < exponent ≤ 1.167) and the dynamical measurement places the
value inside the bracket; it cannot replace the measurement.

**Status**: single-source at full precision (this engine), analytically
bracketed (above); the μ(2.48 Ga) = 1.00 ± 0.07 bound stays quoted
through the conservative first-order slope (the measured exponent would
tighten it to ±0.061). Full adoption awaits a true independent leg — a
from-scratch second-order derivation, or an external integration at
better than 1-significant-figure precision.

## 15. The mass counterfactual — the causal chain closed, measured (K6)

The two-engine restatement's central claim is causal: the planets the
simulator renders hang off the governed artifact, the artifact hangs off
the N-body engine, and the engine hangs off the constants — so changing
one planet's mass must propagate to every other planet's element drifts.
DE440 is a fit and La2010 is someone else's integration; neither can
answer "what if Jupiter were 1 % heavier". K6 measured this model's
answer (`tools/explore/k6-mass-counterfactual.mjs`, ~2 s, re-runnable;
the probe imports the one-home integrator and seed and carries an
independent window-rate readout — no pipeline file involved):

```
GM_Jupiter × 1.01 — two fresh 1800–2100 window runs (WH o2, dt 2 d, 1PN):

planet    banked gr   baseline    Δ(closure)   counterfactual   RESPONSE Δϖ̇
mercury      572.0      572.0        0.00          573.6  +   1.536 ″/cy
venus         22.7       22.7       -0.07           29.2  +   6.526
earth       1154.4     1154.4        0.00         1161.5  +   7.048
mars        1597.8     1597.8       -0.01         1610.4  +  12.647
jupiter      488.5      488.3       -0.20          492.8  +   4.429
saturn     -1576.6    -1576.0        0.63        -1588.2   -12.151
uranus       806.6      806.7        0.11          806.8  +   0.080
neptune     9101.7     9103.5        1.79         9214.0  + 110.510
```

Three readings, each labelled:

- **The closure (theory ≡ its own artifact).** The baseline reproduces
  the banked window rates (worst Neptune 1.79 ″/cy on a 9,100 ″/cy rate
  — 0.02 % relative, the near-stationary-apse readout class). The
  scene's elements are exactly what a fresh integration of the constants
  gives; no hidden layer intervenes.
- **The response (theory-vs-theory, and it lands on L-L's doorstep).**
  Mercury answers +1.536 ″/cy against the first-order Laplace–Lagrange
  expectation of ≈ +1.54 (1 % of Jupiter's ≈ 153.6 ″/cy share — an
  external reference label, never an input). Saturn responds NEGATIVE
  (a heavier Jupiter deepens its retrograde window — the GI pair);
  Uranus barely moves (it rides Jupiter's own g₅, which shifts with
  its carrier); Neptune's +110 is the near-stationary-apse
  hypersensitivity, not a large physical precession change.
- **The gate.** `test:counterfactual` now carries a planet-chain
  injection tier (perturbed artifact ⇒ changed elements; untouched
  planets bit-identical; reproducible; fail-proven on a no-op) — the
  plumbing half is enforced on every `npm run check`, the physics half
  is this section's measured record.

Measured the same day, same class (`tools/explore/k5c-invplane-probe.mjs`
and the inline comparison recorded in plan 02): Earth's inclination to
the invariable plane from the model's own 1-Myr WH run agrees with
La2010 to **RMS 0.003° / max 0.011° over −500 kyr → 0** (theory-vs-theory
— two independent integrations from nothing but the J2000 seed and DE440
masses). The runtime chart's visible gap against La2010 is the 8-mode
ζ-skeleton compression of our own engine (0.204° RMS, chain-vs-engine ≈
chain-vs-La2010 to the fourth decimal), not a physics difference.

## 16. The rendered planets vs JPL — the published comparison (K7)

With the K5 legacy-chain excision the seven rendered planets ARE the
engine-D element chain — zero observation-fitted terms — so the
scene-vs-JPL measurement is the chain's published accuracy. Per the K2
doctrine it is model content either way it falls: agreement and
divergence are both reported, and nothing is tuned to the comparison.

The instrument is `tools/verify/measure-rms-by-epoch.js` (joint RA+Dec
RMS, of-date frame, the verify-pipeline Step-10 metric, ~108k JPL
Horizons cache samples); `--write` banks the century-bucket summary as
the governed artifact `data/chain-vs-jpl-rms.json` (inputs-stamped —
the freshness gate re-hashes the cache, the scene, the evaluator and
the embedded artifact on every check). The registry keys
`<planet>ChainVsJplRms2000sArcsec` / `…EarliestArcsec` /
`…EarliestWindow` and `moonVsJplRms2000sArcsec` read the artifact — the
website binds to those keys. **Read the live values from the artifact
or the keys, never from this paragraph.**

The shape of the record at banking time: reference-century (2000–2099)
RMS ≈ 20–41″ across the seven planets (Mercury ≈ 26″, the giants
≈ 19–25″), degrading gently toward the cache edges (the earliest full
centuries sit at ≈ 16–100″; Venus is the widest, the giants barely
move) — the raw dynamics extrapolate instead of unravelling, which was
the K4 observational verdict's inner-planet finding now made a standing,
gate-guarded exhibit. The Moon row (engine-K lunar series) sits at ≈ 4″
in the reference century.

## 17. The deep-time metronome from the engine's own gravity (Stage B, T5c)

The pre-registered P6 run (Wisdom–Holman order 2, dt 2 d, 1PN, ±10 Myr
from the JPL J2000 seed, DE440 masses — zero observation-fitted terms)
was executed and its NAFF mode table extracted at 18 terms. The
registered T5c criterion — the one the single epoch-local H/3 line can
never meet — asked whether the engine's OWN dynamics carry the deep
e-spectrum the rock record shows: the ~405-kyr long-eccentricity
metronome as the STRONGEST line, with the ~124 and ~95-kyr companions
present. **It does** — the strongest beat of the derived Earth z lands
inside the registered 395–415 window with both companions present and
correctly ranked (confirmed by an independent spectral cross-check).

The instrument is `tools/verify/deep-secular-modes.js` (generator
class): `--write` re-extracts from the ±10-Myr dump (the 3.4-h run
command is in its header) and banks the mode tables plus the verdict as
the governed artifact `data/nbody-deep-secular-modes.json`. The registry
keys `earthDeepBeatPeriodKyr`, `earthDeepBeatLa2004PeriodKyr`,
`earthDeepBeatRockKyr`, `earthDeepBeatCompanion124Kyr` /
`…95Kyr`, `earthDeepG5ArcsecPerYr` / `earthDeepG2ArcsecPerYr`,
`deepRunSpanYears` and `deepRunConservationMaxDE` read the artifact.
**Read the live values from the artifact or the keys, never from this
paragraph.**

Anatomy of the residual gap to the rock value (measured, plan 02 §8
Stage-B record): the engine's g5 matches La2004 to 0.0002 ″/yr; the
whole beat gap is g2 sitting ≈ 0.4 % low, which decomposes into the
deliberately minimal ingredient list (the Earth–Moon pair merged into
its barycenter, no asteroids — the measured sensitivity class: 1PN
alone moves g1 by +0.47 ″/yr) plus g2's own chaotic diffusion (measured
in our own data as a 0.027 ″/yr shift between the 1-Myr and 20-Myr
window estimates — the size of the entire gap). The attribution
experiment (Moon as a tenth body + the big-four asteroids, each
ingredient's shift measured separately) is queued as a research
follow-up. Two standing readings: the falsification criterion keeps
using the ROCK metronome, never the engine's reproduction of it; and
per the registered two-tier decision the 1-Myr era-local table remains
the in-window evaluator — this deep table owns deep time.

Its T5d-(d) gate ran and the owner adopted decision (ii): **the entire
lunar chain rides this table's e** (E-factor, perigee/node modulation
and the integrated cycle counts, the argument Δe² and of-date rates —
`moon/deep-ecc-channel.cjs`, one factory across all three runtimes),
while the Sun/clock machinery (eclipse Sun equation of centre,
besselian Sun distance, cardinal braid) stays on the H/3 line — a
certification split, not a physics one (the two agree within 4.2e-5
across the historical era; the H/3 line keeps its E18 epoch-local-
tangent role). Acceptance, measured and rebaselined: all 41 paleo
anchors in bands; the ancient-eclipse dense-target χ² IMPROVED
(full stack 44.7 → 32.9, Phase-C 5.4 → 4.7, ablation ordering
preserved) — explained, not tuned: this e is La2004-corroborated
in-era, 3× closer than the H/3 line; audit-26 3/12/5/0/6 (the one
mover is −430 Athens/Thucydides crossing the geographic boundary at
1043 km); Babylon −135 inside its 16-min UT window (12 min); the
ΔT-band comparison bit-identical; cross-engine 157/157 bit-exact.

## 18. The obliquity hybrid — the spin family meets the chain (Stage C)

The two engines produce Earth's obliquity history jointly, from one
averaged precession equation and zero fitted constants: the spin axis
integrated under ds/dt = α (ŝ·n̂)(ŝ×n̂), with the orbit normal n̂(t)
from ENGINE D (the deep ζ-modes of `data/nbody-deep-secular-modes.json`,
anchored at the JPL J2000 seed) and a single ENGINE-K anchor,
α = (H/13 rate)/cos ε₀. Nothing else enters.

Three results, banked as the governed artifact
`data/obliquity-hybrid-verdict.json` by `tools/verify/obliquity-hybrid.js`
(generator class; it runs the one-home lab
`tools/explore/stage-c-obliquity-hybrid.mjs`). The registry keys
`epsHybridRateJ2000ArcsecCy` / `epsHybridIauRateArcsecCy`,
`epsHybridAlphaArcsecPerYr`, `epsHybridBeatKyr`,
`epsHybridEraRms13KyrArcsec` / `epsFittedLawRms13KyrArcsec` and
`epsHybridDeepRms1MyrArcsec` / `epsHybridDeepCorr1Myr` read the
artifact. **Read the live values from the artifact or the keys, never
from this paragraph.**

First, **an input becomes an output**: the scene machinery *solves* its
tilt amplitude against the IAU obliquity rate; the hybrid *derives*
that rate from the engine's own node modes plus the H/13 anchor, to a
quarter-percent. Second, **the H/8 identity is derived, not asserted**:
the dominant obliquity beat emerges as |ψ̇| − |s₃| ≈ 41 kyr — the
lattice's spin-side reading produced natively by the dynamics. Third,
**the fidelity ladder** (vs La2004, a theory reference): the era
ζ-slice beats the shipped 16-harmonic fitted law by an order of
magnitude in the 13-kyr insolation window, and the full deep ζ-table
holds a flat ~0.1° error profile with correlation ≈ 0.99 across the
entire megayear, where the fitted law decorrelates beyond ~50 kyr. The
two-tier structure (era slice vs deep table) is the same measured
era-local/deep-global tension the eccentricity story showed, resolved
the same way. Also derived en route, from shared constants alone: the
solar fraction of the precession torque, f_S ≈ 0.316 (the literature
value). The convention catch worth recording: the J2000 celestial pole
sits at ecliptic longitude +90°; the −90° choice produces a perfect
ANTI-correlation — the instant tell.

The shipping design (whether this replaces the fitted ε law and
dissolves the scene's amplitude-solve) is the registered Stage-C arc in
the plan; until it lands, the fitted law remains the certified basis
and this section is evidence content.

**The deep-time statement — the sharpened falsification leg 1
(owner-adopted; plan 06 D6 fixed WHICH ψ̇(t)).** At deep time the
hybrid's two sides scale on the two measured tiers: the spin precession
ψ̇(t) is the COMPOSED lunisolar rate — [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)
(a₀/a_M(t))³], the spin from the recession history carrying both
torques and the lunar torque growing with the Moon's approach (engine
K's chain, ONE home `@essrt/physics/earth/precession-composed`; the
hybrid precesses on exactly this evaluator) — while s₃ is a
DYNAMICAL-tier frequency, scaled only by the measured solar-mass
history (μ(2.48 Ga) = 1.00 ± 0.07 — effectively fixed). The obliquity
band therefore follows the BEAT, **2π/(ψ̇(t) − |s₃|)**. Since Phase 3
the unit H(t) IS 13 composed precession periods at every epoch, so the
tidal-mean year pair's beat, H(t)/13 and the composed period are one
quantity, and the rock reads it directly: the composed rate matches the
Precambrian precession constants
(<!--v:anchorXiamalingPrec1400Pred-->86.60<!--/v--> vs Meyers &
Malinverno 2018's 85.79 ± 2.72 ″/yr at 1.4 Ga,
<!--v:anchorLantinkPrec2460Pred-->104.60<!--/v--> vs Lantink et al.
2022's 108.6 ± 8.5 ″/yr at 2.46 Ga — both paleo-anchors gate rows). The
model's earlier deep-time reading, the spin-only clock
13·1,296,000/(H₀·LOD/LOD₀), fails both rows (24 % and 35 % low) and is
retired to `docs/retired-record.md`; it survives only as the frozen era
clock's named phase convention. The registry keys `obliqBeat*Kyr` (the
beat) / `obliqH8Scaled*Kyr` (name kept: the pure precession-scaling
reading "obliquity period ∝ T_p" — the J2000 beat held proportional to
T_p(t); plan 06 S5 retired its former T_p·13/8 form) carry the fork at J2000, 1.4
and 2.46 Ga: today the readings are degenerate (ψ̇ ≫ s₃ — which is why
"H/8" has always fit), while at 2.46 Ga the beat reads
<!--v:obliqBeat2460MaKyr-->15.1<!--/v--> kyr against
<!--v:obliqH8Scaled2460MaKyr-->19.8<!--/v--> for period ∝ T_p — a level
cyclostratigraphy can discriminate. The existing 1.4/2.46-Ga
confirmations are precession-rate/LOD anchors; the deep-time obliquity
PERIOD itself is undiscriminated, so this is a pre-registered prediction
awaiting a precisely dated Precambrian obliquity band, stated before any
such measurement is compared. **Read the live fork values from the keys,
never this paragraph.**

## 19. The solar-system spin landscape on the engine's own node lines (C-4)

**What is and is not claimed.** The individual mechanisms below are
established literature — Saturn's s8 resonance capture (Ward &
Hamilton 2004, AJ 128, 2501), Jupiter's approach to the s7 resonance
(Saillenfest, Lari & Courtot 2020, A&A 640, A11), Mars's chaotic
obliquity and the Moon's stabilization of Earth (Laskar & Robutel
1993; Laskar, Joutel & Robutel 1993), Mercury's Cassini lock (Margot
et al. 2007, Science 316, 710). What is the model's own content is
that **the entire landscape hangs on OUR OWN s-lines** — the nodal
eigenfrequencies of the same zero-fitted-constant N-body chain, seeded
once at J2000, that already carries the 405-kyr metronome (§17) and
the obliquity band (§18). One engine, one seed: the deep-time climate
pacemakers AND the solar system's spin-stability map are the same
frequency table read twice.

The instruments are the two Stage-C-4 labs
(`tools/explore/stage-c4-cassini-landscape.mjs`,
`…-cassini-response.mjs`); the observed spin constants are CITATION
targets in the astro-reference `planetSpinObserved` block (sources in
its `_description` — never model inputs), and the registry keys
`deepNodeS8ArcsecPerYr` / `deepNodeS7ArcsecPerYr` /
`deepNodeS1ArcsecPerYr` beside `marsSpinPrecObsArcsecPerYr`,
`jupiterSpinPrecObsArcsecPerYr` and
`saturnSpinPrecLongTermArcsecPerYr` carry the comparison pairs. **Read
the live values from the keys, never from this paragraph.**

The landscape, measured: Mercury and the Moon are Cassini-LOCKED (the
Moon closed by this model's own v4 Euler campaign — two observational
anchors). Mars's observed spin rate sits INSIDE the engine's dense
inner s-multiplet — the chaotic-obliquity regime as a property of our
mode spread; the response lab integrating Mars's spin on OUR plane
history reproduces the Laskar-class ±6° band. Jupiter's rate sits
adjacent to OUR s7; Saturn's long-term rate sits on OUR s8 to ~4% —
and the response lab shows the Ward–Hamilton structure on our modes:
started at the observed 26.73° the high-obliquity state HOLDS, started
low it is never entered with a static rate (capture needs migration).
Earth's spin precession sits 1.9× ABOVE the engine's highest s-line —
no spin-node resonance is reachable — and the control experiment
(α reduced to its solar third, the Moon removed) drops Earth into the
band and doubles the obliquity envelope: the Moon-stabilization
result, restated as a property of the engine's own frequency table.
A documented limit: the quasi-periodic mode tables show enlarged
response near resonances, never true chaotic diffusion — the full
Laskar–Robutel wandering is a statement about the class, not
reproduced pointwise.

## 20. The invariable-plane node origin — derived, not fitted (K5c closure)

Two longitude origins live on the engine's own invariable plane. The K5c
evaluator outputs node longitudes in the **s-frame** (origin = the equinox
projected into the banked plane — the NAFF extraction convention). The
external references measure from a different point on the same plane:
**the invariable plane's ascending node on the ICRF equator**. The gap
read as a per-planet "offset" of 1.7–10.2° against Souami & Souchay
(2012) and a measured ≈3.4° constant against La2010 — both convention
class, and the standing rule said: never subtract the measured constant
(a fitted alignment); derive the origin and apply the exact conversion.

The derivation (`packages/physics/src/planets/inv-plane-frame.cjs`):
from nothing but the banked plane orientation and the J2000 mean
obliquity, the equator-node direction and its s-frame longitude follow
exactly — zero fitted constants. Verification, all measured:

- the derived node's RA reproduces S&S's published 3°51′9.4″ to 0.4 mdeg;
- converting the eight J2000 s-frame nodes collapses the apparent offsets
  to the element-class residual (chain elements-of-date vs S&S *mean*
  elements), max |ΔΩ|·sin(i_inv) = 0.038° — inside the same ≤0.05°
  pole-class band the K5c i_inv probe already gates (a node offset is a
  pole offset divided by sin i_inv, which is why Jupiter's small i_inv
  showed the largest raw ΔΩ);
- the legacy Appendix-C "calibrated" nodes independently agree with the
  converted values (mostly ≤1°) — the old calibration was unknowingly
  compensating for exactly this origin difference;
- La2010's node origin is the SAME axis: the converted chain node lands
  on La2010's J2000 value to 0.0001°, and the former −3.42° constant
  offset over −500 kyr → 0 becomes a +0.04° mean over 251 rows — gone,
  derived not fitted. The remaining 4.3° rms is the ζ-skeleton node
  wander (zero-mean element class).

Published surfaces (simulator panels, the report export, the VFP node
chart, the website ELEMENTS tab) now speak the S&S/La2010 convention via
this conversion; the s-frame stays the internal machinery convention.
The registry carries the derived origin (`invPlaneNodeOriginSFrameDeg`)
and the converted J2000 nodes (`<planet>ChainAscNodeInvSSJ2000Deg`)
alongside the s-frame keys; the per-planet `<planet>OmegaDelta` keys now
read chain-converted minus S&S. **Read the live values from the keys,
never from this paragraph.** The gate is
`tools/explore/k5c-invplane-probe.mjs` — both its node gates are
fail-proven (a silent frame swap trips the pole-class gate; a
pole-sign bug trips the origin-RA gate).

## 21. The planets' mean motions of date — and the model measuring its own resonances (C1/C2)

The panel period rows for the seven chain planets ride a per-planet λ̇
channel banked from the ±10 Myr run — the Earth D6 sidereal-year
recipe mirrored verbatim (wrap-counted mean-longitude rate, 2-kyr
boxcar, banked as a ratio ≡ 1 at the J2000 node;
`bodies.<planet>.lamDotRel` in `data/nbody-secular-series.json`). The
displayed composition is three named tiers, each ≡ 1 at J2000:

    n_p(y) = λ̇₀ · lamDotRel_p(y) / massLossRatio(y)

λ̇₀ is the run's secular J2000 rate; `lamDotRel` the planet's own
constant-GM drift (clamped beyond the span — never extrapolated);
`massLossRatio` the ONE Driver-2 solar-mass law shared by every
heliocentric orbit — planet-independence of the μ-response is exact at
the two-body level, and the browser probe reproduces the adiabatic
μ⁻² response to the physical mass-loss rate numerically (1−1.9e-7 at
±1 Myr). The retired device's H·mSY scaling is gone: it mixed the
recession driver (an Earth-spin quantity) into an orbital one — the
driver-separation rule now in the project doctrine.

Two window findings came out of the construction, both measured:

- **A fitted window rate is not a secular rate.** The chain's 300-yr
  `windowElementRates` fit absorbs the local phase slope of any
  inequality longer than the window into its mean-motion term. Like
  for like (unwrapped-longitude mean over the same 1800–2100 window)
  the dump and the chain agree at ≤0.2 ppm for Mercury/Venus/Mars and
  2.8 ppm for Jupiter; Saturn splits 37 ppm (the great inequality at
  ~⅓ cycle per window) and Neptune −497 ppm (the U–N near-2:1 at ~7%
  of a cycle per window). The split is banked per planet
  (`verdict.planetLamDot.rows[].vsChainWinNPpm`), and the panel
  periods anchor on the channel — Neptune's displayed period moved
  164.71 → 164.79 yr, into the JPL class. A wrap-sanity gate guards
  the construction; the split itself is a measurement, not an error.
- **The beats are banked as predictions and measured as oscillations.**
  From the banked J2000 rates: the Jupiter–Saturn great inequality
  360/(5n_S−2n_J) and the Uranus–Neptune near-2:1 360/(n_U−2n_N) —
  read the live values from `verdict.planetLamDot`
  (`greatInequalityYr`, `uranusNeptuneBeatYr`), never from prose. The
  instrument `tools/explore/planet-lamdot-instruments.mjs` then
  measures the oscillations actually present in the raw per-planet λ̇
  (±50 kyr slice, autocorrelation): the GI dominant period reads the
  ~910–940 yr class on both Jupiter and Saturn (literature ~880–900),
  with Saturn's amplitude ~7× Jupiter's (the mass asymmetry), and the
  U–N oscillation reads the ~4,050 yr class on Neptune at
  autocorrelation 0.99 — the same oscillation whose 100-yr-aliased
  osculating scatter is visible around the secular curves on the
  Formula-Verification eccentricity panel, now with the model's own
  measured name and period. The instrument also reports a per-planet
  Kepler-III closure n²a³ (max drift 2e-6 Mercury … 4e-3 Uranus over
  ±10 Myr at 2-kyr smoothing): at constant GM the residual **is** the
  real inequality energy exchange between planets, sitting beside the
  run's banked global conservation (dE ~1e-8).

The era leg stays validated where a reference exists: Earth's channel
reproduces the Chapront sidereal-year slope to ~0.1 s over ±12 kyr
(the generator's banked refuse-gate). For the other planets no
published deep-time λ̇ series exists — the banked channels are the
reference the model itself provides, with the JPL-era cross-checks
(window splits above) as the external anchor.

## Related documents

- [13-mercury-precession-breakdown.md](13-mercury-precession-breakdown.md) — §1.8: the projection identity, the transit test, the candidate slot
- [108-derived-earth-orbit-vector.md](108-derived-earth-orbit-vector.md) — the first-order derivation this doc supersedes with the model's own engine
- the 8H/N period table the restatement applies to is archived ([retired record](retired-record.md))
- [99-expanding-solar-system-resonance-theory.md](99-expanding-solar-system-resonance-theory.md) — ESSRT
