---
docVersion: 1.0
modelVersion: v12.0
coefficients: sha256:56d7365a511916d5
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
a dominance property, not a lattice property.

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

## Related documents

- [13-mercury-precession-breakdown.md](13-mercury-precession-breakdown.md) — §1.8: the projection identity, the transit test, the candidate slot
- [108-derived-earth-orbit-vector.md](108-derived-earth-orbit-vector.md) — the first-order derivation this doc supersedes with the model's own engine
- [55-solar-system-resonance-cycle-periods.md](55-solar-system-resonance-cycle-periods.md) — the 8H/N period table the restatement applies to
- [99-expanding-solar-system-resonance-theory.md](99-expanding-solar-system-resonance-theory.md) — ESSRT
