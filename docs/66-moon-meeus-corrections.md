---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:78f99d98186e50d9
status: current
---

# Moon Meeus Corrections — Implementation Reference

**Status**: Complete (full Meeus Ch. 47: 60L+60B terms + the 46-term Σr distance column + the derived framework extension tails, RA+Dec override, JPL-verified; Σr derived-validated at 100.0% weighted by the Stage-D1 laboratory)

**Public capstone**: the derivation program documented here is presented as the
website document **"The Derived Moon" (DLT-1)** — a framework-native lunar
theory in Meeus Ch. 47's form with every constant derived, attributed,
observationally-defined, or anchored by design
(`src/content/en/reference/the-derived-moon.mdx` in the website repo). This
file remains the complete technical record behind it.

---

## Overview

The Moon's position in the model is determined by two systems working together:

1. **5-layer precession hierarchy** (geometric): Handles the Moon's orbital period,
   apsidal precession, nodal precession, and their interactions using nested rotating
   containers in Three.js. This produces the orbital circle visible in the scene.

2. **Meeus analytical corrections + derived extensions** (perturbative): the equation
   of center, solar perturbations (evection, variation, annual equation), ecliptic
   latitude from Meeus "Astronomical Algorithms" Ch. 47, and the framework's own
   derived series tails. These shift the Moon's actual position away from its
   geometric circle.

The visual result: the orbit ring shows the unperturbed circular path, while the
Moon mesh shows the physically correct corrected position — making the
gravitational perturbation effects directly visible.

---

## 1. Full Meeus Ch. 47 Longitude + Latitude

Applied in `moveModel()` when `useVariableSpeed && obj.lunarPerturbations`.

### Fundamental Arguments — Meeus reference form (polynomial in T = centuries from J2000)

```
d  = (startmodelJD - 2451545.0) + pos * meanSolarYearDays
T  = d / 36525
L' = 218.3164 + 481267.8812*T + ...  (Moon mean longitude)
D  = 297.8502 + 445267.1114*T + ...  (mean elongation)
M  = 357.5291 + 35999.0503*T + ...   (Sun mean anomaly)
M' = 134.9634 + 477198.8675*T + ...  (Moon mean anomaly)
F  = 93.2721  + 483202.0175*T + ...  (argument of latitude)
E  = 1 - 0.002516*T                  (Earth eccentricity correction)
```

### Fundamental Arguments — framework-native form (shipped default)

The polynomials above are the A/B reference. The shipped default
(`MOON_ARGS_FRAMEWORK_NATIVE = true`, declared in the toggle block at the top
of script.js) computes the same five arguments framework-natively in
`_fwMoonArgs()`, dispatched through `_moonArgsAt()`. Every Meeus quantity it
replaces is either derived from framework primitives or anchored to a single
classical constant:

- **Linear rates — the frame convention.** Meeus's argument rates differ from
  the framework's star-referenced chain rates by exactly ± general precession. The
  framework's own p = 360·13/H = 50.24″/yr closes the ±1.4°/century M′/F
  drift with zero new constants — the drift is frame bookkeeping, not
  missing physics. Meter: "Meeus vs Integrator (lunar argument drift)".
  Two composite rates reduce to exact lattice identities: A3 ≡ the
  Moon's SIDEREAL mean longitude rate = L′_tropical − p_H13 (0.003 ppm vs
  Meeus 481266.484 °/cy) and the A2 argument rate ≡ 2·L′_trop − M′rate −
  2·n_Jupiter (0.19 ppm vs 479264.290). Both are CHAIN-INTEGRATED at deep
  time through their identified content (A3 = A3₀ + 360·(N_trop − N_p13);
  A2 = A2₀ + 360·(N_trop + N_apsOfDate − 2·N_Jupiter), Jupiter via the
  Driver-2 chain) so they evolve with the tidal months, H(t) precession,
  and solar mass loss. The A1 rate (<!--v:a1RateDegPerCy-->131.849<!--/v--> °/cy) is observationally
  defined by nature: it sits on the 18V−16E−M′ near-resonance where ppm in
  planetary years moves the beat by °/cy (hypersensitivity, experimentally
  demonstrated); its amplitude is gravity-sized (18-kyr lab: single line,
  124% of Meeus at the lab's own beat rate).
- **Element secular content — the phase-aware solar-eccentricity channel.**
  The Sun's mean perturbation on the lunar node and perigee scales as
  (1 − e_E²)^(−3/2). The perigee/node longitudes are computed as
  ϖ(T) = ϖ₀ + ϖ̇₀·(T + ∫₀ᵀ[(g(e_E(t))/g₀)^s − 1]dt) — the rate speeds up and
  slows down with the e_E phase; the frozen-κ T²/T³ Taylor coefficients
  remain in the code as documented J2000 checks against Meeus. The
  sensitivities s_ϖ = 2.407 and s_Ω = 1.018, constant across orders, are
  the Meeus-EFFECTIVE pair: every of-date Meeus T² contains the IAU
  precession acceleration ṗ_A T² (+1.1054″/cy², IAU2006), and removing that
  frame term gives the PHYSICAL exponents s_ϖ 2.479 / s_Ω 0.867 — which
  the 3-body laboratory reproduces from pure gravity at 100.3% / 101.5%
  (`tools/explore/v4-frame-audit.js`). The effective form runs in the
  runtime (exact vs Meeus by construction).
- **e_E itself — the engine's own deep z-vector.** The lunar
  channel's eccentricity history is the ±10-Myr deep mode table
  (doc 109 §17, `moon/deep-ecc-channel.cjs`), anchored exactly at the JPL
  J2000 seed — it carries the 405-kyr-class deep spectrum a single line
  cannot. The derived H/3 line (below) remains its epoch-local tangent and
  the clock-side basis (eclipse Sun equation of centre, cardinal braid);
  the two agree within 4.2e-5 across the historical era. The
  astro-reference (e₀, ė₀, ë₀) values are the documented Taylor-check
  anchors.
- **The sign paradox, dissolved.** Brown's m²-scaling predicts apsidal
  precession ACCELERATING while Meeus's M′ T² says decelerating. Both are
  true at once: the Lunar Precession Invariant governs the MEAN rate
  (tidal, slowly accelerating) while the eccentricity channel is a bounded
  zero-mean oscillation around it (currently in its decelerating phase
  because ė < 0). The Meeus polynomial entangles them in single
  coefficients.
- **D and M — identity-composed from the real-time framework rates.** D and M
  carry no independent physics: Meeus's own coefficients satisfy
  D = L′ − L_sun (rate to 3e-6 °/cy, T² to 1e-7 °/cy²) and M = L_sun − ϖ_sun.
  The framework composes them literally — D = L′ − L_sun, M = L_sun − ϖ_sun —
  with Meeus J2000 anchors (Ls0 ≡ L′0 − D0 absorbs the Ch. 25/47 convention
  offset) and secular content from the closed-form integrals of the
  epoch-local year-length harmonics: the model's REAL-TIME axial and
  perihelion rates around their H/13 and H/16 means
  (`_fwSunSecularDeviations`). The equinox acceleration is ~62% derived
  from the model's own rates; the remaining ~38% is the planetary
  χ-channel — the ecliptic-of-date motion absent from the equator-only
  composition — derived at 104% by the ṗ_A composition (the L′ bullet).
  Bounded ±5° over ±50 kyr where the Meeus D parabola reaches 82°;
  deviations ≤ 0.08°/0.11° (D/M) at −584, ~0 in the certification window.
  Zero new constants.

- **L′ planetary remainder — the closed budget, carried by bounded
  carriers (derived).** Meeus's non-tidal T² content
  (T2_LP − T2_LP_TIDAL = +7.247″/cy²) decomposes against primary sources
  with zero free parameters (astro-reference
  `elpW1T2Decomposition_arcsecPerCy2`; runnable:
  `tools/explore/v4-kpl-budget.js`): true planetary +5.8665″ (Chapront et
  al. 2002 — the Laplace/Adams solar-eccentricity channel) + Earth-figure
  J2 +0.1925″ + frame ṗ_A +1.11113″ (Lieske) + 0.077″ tidal-convention gap
  (the Γ embedded in Meeus's polynomial is −25.706″/cy² vs LLR −25.858).
  The runtime replaces the T² polynomial with two bounded carriers:
  `_fwLpPlanetaryCarrier` carries the channel part —
  `K_PL · ∫₀ᵀ (e_E²(t′) − e_E²(J2000)) dt′` along the derived H/3 line,
  with K_PL = −2332 °/cy per e² derived lazily from the budget — and
  `_fwLpObliquityCarrier` carries the figure+frame part (+1.30363″/cy²)
  along the framework obliquity cycle, `C · ∫₀ᵀ (ε(t′) − ε₀) dt′` with
  C = 2·T2_OBL/ε̇₀ (tools mirrors of both in scene-graph.js). In-window
  the carriers are Taylor-identical to the polynomial (−584:
  +0.017° ≈ 2 min); at deep time they stay bounded (≤ ~230°) where the T²
  parabola reaches 7,892° at +200 kyr. The channel sensitivity is verified
  convention-free by an adiabatic-ramp measurement
  (`tools/explore/v4-e5-adiabatic-ramp.js`): k = −2370 ± 40 °/cy per e²,
  containing the budget value. The Lp T³ (1/538841 °/cy³) is likewise
  derived at 98.8% with zero free parameters — Adams–Laplace channel
  curvature with the secular ë + obliquity-carrier second order + frame
  ṗ_A T³ (`tools/explore/v4-d3-tails.js`); the T⁴ is 41% channel with the
  remainder documented (0.004° at −584, clamped at deep time). Convention
  note: with the derived H/3 line's own ë (−3.7e-8) the channel T³ flips
  sign — the Meeus literal embodies the SECULAR-theory ë.
  The always-chains deep branch carries the same secular-ë convention
  through a third carrier, `lpSecularCompletion`:
  `K_PL · ∫₀ᵀ [½·Δ(e²)″·t′² + ⅙·(e²)‴_sec·t′³] · env(t′) dt′` with
  Δ(e²)″ from existing constants (zero new values) and env a cos² taper
  on the H/12 quarter period (≈ 279 cy ≈ the ~100-kyr eccentricity
  eigenbeat quarter, where the local secular Taylor decorrelates). Its
  content is measured against the certified snapshot (+0.68 tail + 0.22
  channel curvature + 0.03 integrator convention closes the +0.91″/cy²
  Lp secular gap; `tools/explore/u2-args-branch-isolation.mjs`,
  `u2-lp-decomposition.mjs`) and against DE441 (a 300-epoch fit with
  periodic regressors reads canon−DE441 2c = +0.11 ± 0.13″/cy²,
  `u2-dense-de441.mjs`). Zero through T² by construction (modern era:
  ULP-class), saturating beyond the taper — the frozen offset is the
  honest statement of the multi-mode e(t) divergence, not a claim of
  zero.
  The of-date RATES are completed the same way (the rate-completion pair
  in `fwArgsDeep`): (i) `pFix = ∫(p_dyn − p_kin) dy` on Lp — p_dyn the
  DYNAMICAL axial precession, the day-form beat of the sidereal/solar
  year evaluators (25,771.1 yr at J2000 ≈ IAU, epoch-valid at any age;
  exposed as `model.epoch.axialPrecessionYearsAtYear`); p_kin the
  kinematic pair's beat the chains embed (≡ the H/13 lattice mean by
  construction, Δp = 0.044″/yr at J2000). Natively BOUNDED at deep time;
  two-tier cumulative table, frozen beyond ±1 Myr. Its in-window ṗΔ·T²/2
  (the model-native precession acceleration, 0.658″/cy² — 60% of
  Lieske's) is REMOVED from the obliquity-carrier normalization so the
  total Lp T² stays the certified, DE441-validated budget. (ii)
  SELF-MEASURED residual rate anchors on all five of-date compositions
  (±25-yr central difference of the raw compositions vs the certified
  bundle rates at build), applied through the H/12 cos² taper — full in
  the historical window, frozen ≤ ~0.9° at deep time. ϖ/Ω deliberately
  do NOT carry pFix: their chains' own curvature is already
  certified-consistent, and pFix there double-counts the acceleration
  (measured −1.5″/cy²). Certified state of the completed deep branch:
  ≤0.06″/cy linears and ≤0.18″/cy² quadratics on ALL five arguments;
  dense-DE441 reads deep ≡ canon in const/linear/quadratic; at the −135
  eclipse instant deep−canon = +8.9″, with the residual vs DE441 there
  being the certified skeleton's OWN periodic scatter class.
  The same laboratory derives the top-20 longitude amplitudes at
  100.0 ± 0.1% and the apsidal/nodal precession periods from the sidereal
  month plus solar parameters alone — the three Moon inputs are not
  independent. The emergent periods are the true star-referenced ones
  (3232.60 d apsidal / 6793.48 d nodal, reproduced at ±0.5‱/±0.3‱ in the
  full system); the catalog inputs <!--v:moonApsidalPrecessionDaysInput-->3,231.493<!--/v-->/<!--v:moonNodalPrecessionDaysInput-->6,798.38<!--/v--> are their
  equinox-of-date partners (∓13 counts per H).
  The frame term ṗ_A is itself derived: the composition
  (`tools/explore/v4-pdot-composer{,2,3}.js`) builds the general-precession
  acceleration from the lab's gravity-derived ecliptic-of-date pole track
  (π̇ 47.49″/cy vs IAU 46.998) + the framework ε(T) + a luni-solar cone
  about the moving pole with the classical cos ε torque law + one rate
  anchor — which independently lands ψ̇₀ = 5039.15″/cy, 0.013% from the
  IAU luni-solar 5038.48 that was never an input — giving composed
  T² = +1.1496″/cy² = 104% of IAU2006. The equator-only composition
  yields 61%; the balance is the planetary χ-channel (the ecliptic
  tilting under the equator).

- **Deep-future validity.** The cumulative-H table spans ±500 Myr symmetric
  (the chains are smooth and physical throughout: LOD 24→27.4 hr, month
  27.32→29.42 d at +500 Myr), and the Meeus-polynomial fallback clamps its
  T²/T³/T⁴ tails at |T| ≤ 100 cy — unclamped, the fitted T⁴ tail cancels
  the lunar mean motion at year ≈ 1,989,000 and reverses it beyond. The
  secular-ë completion carrier saturates at its taper edge (±28 kyr) to a
  frozen Lp offset of −17.5° (past) / +7.0° (future) — bounded by
  construction, so no polynomial reaches deep time and the bounded-harmonic
  claim is untouched. The rate completion is likewise bounded: the pFix
  table freezes beyond ±1 Myr, the five rate anchors freeze at the H/12
  taper edge (≤ ~0.9°), and Mp/F inherit Lp's bounded pFix oscillation
  uncancelled at deep time (physically p-free arguments; display-class).
  The scene Moon is prograde at every epoch out to ±1 Gyr by construction.

Certified references of the framework-native default: argument drift vs
Meeus M′ +0.37° at −135 / +0.58° at −584 with F ≈ 0 — the
predicted-ë-vs-secular-ë difference (minutes-class in eclipse timing),
with in-window rows at zero (a pure-ICRF comparison drifts
+1.4°/century). NASA full-canon recall 99.58 / tight-window 74.62 / type
98.66 (model event total 12,070 vs NASA's 12,064; all mismatch samples
knife-edge at the γ ≈ 1.0/1.5 boundaries); 26-event historical audit
split 3 confirmed · 13 off-peak · 5 regional · 0 ΔT-signal · 5 geographic
(an umbra-centerline distance class, not visibility — the penumbra can
still cover these sites; the entire first-hand ancient corpus is
confirmed/off-peak class — doc 103); timed Babylonian lunar corpus
(Almagest records, reduced via local astronomy only — no external ΔT, no
eclipse canon): non-deep skeleton mean +3 min / RMS 36 min (statistically
identical to conventional secular theory's +2/34), deep-chains branch
**−7 min / 37 min / 5-of-6 in band**
(tools/explore/timed-babylonian-lunar-eclipses.js; corpus encodings to be
verified against Stephenson 1997 Ch. 6 before publication). At deep time
the same channel modulates the anchored precession chains as
rate(t) = invariant mean × [g(t)/g₀]^s (the factored law, doc 99) —
bounded at every epoch under the derived line (e ∈ [0.0077, 0.0231]),
where the Meeus parabola is unbounded.

**How ė is pinned (the (ė, s) degeneracy).** Only the product s·ė enters
each element's T², but node and perigee share one ė: with the observed
ė₀ = −4.204e-5/cy the node requires s_Ω = 1.018 and the perigee ratio then
yields s_ϖ = 2.407 with no freedom — the Meeus-effective pair. The
alternative — the H/16 perihelion law's ė at its current phase
(−0.84e-5/cy) — would force s_Ω = 5.1, excluded by theory and falsified
directly by the record. The derived H/3 line PREDICTS ė = −4.273e-5
(+1.7% of the measured value) with no anchor. First-principles status:
the laboratory derives the PHYSICAL exponents from pure gravity
(2.486/0.880) and the of-date record minus the IAU frame acceleration
requires 2.479/0.867 — agreement 100.3%/101.5%. The runtime's effective
pair absorbs the frame term and is exact vs Meeus by construction: the
sensitivities are attributed, not fitted.

**Framework-native e_E: the fully-derived H/3 fluctuation.** The clock-side
e_E — the epoch-local tangent of the deep channel, and the line the eclipse
Sun's equation of centre and the cardinal braid ride — is ONE movement, the
H/3 wobble cycle that also drives Earth's inclination, expressed in
eccentricity form with nothing solved and nothing fitted:

    e(t) = eccentricityBase · (1 + cos θ(t) / 2)
    θ(t) = 3 · (t − balancedYear) / H · 360° − 180°

Mean = Law 5's base, amplitude = base/2, and the phase is pure lattice
arithmetic: the inclination minimum falls exactly on the balanced year (the
System Reset convention), which fixes θ(J2000) = 81.178°. In anchor form
this is θ = ϖ_ICRF − 21.77°, and 21.77° is itself derived — the perihelion
longitude cancels out of the channel phase entirely. Inputs: base,
balancedYear, H. Everything observational becomes a prediction:

- e(J2000) = 0.016566 (observed 0.0167102; −0.86%)
- ė(J2000) = −4.273e-5/cy (secular theory −4.204e-5; +1.7%)
- ë(J2000) = −3.7e-8/cy² (secular −2.5e-7; correct sign — the standing
  divergence, worth 0.2–0.4° of BCE argument drift, minutes of timing)
- E-factor at −135/−584: 1.0544/1.0657 (Meeus 1.0503/1.0601; 0.4–0.5%)
- bounded e ∈ [0.0077, 0.0231]; rate turning points at ≈ −23,200 and
  +32,700; e-mean crossing ≈ 4739, locked to the inclination's own mean
  crossing.

Cross-checks: freely solving the line from the observed (e, ė) with the
mean held at base returns θ = 79.96° and A = 0.4936·base — the data
reproduce the derived structure unprompted. Alternatives are excluded by
the record: the H/16 perihelion law in the channel and a fixed-κ rate both
fail the canon, the 26-event audit and the timed Babylonian corpus; a
value-exact amplitude is rejected structurally (the channel quantity is
not the osculating eccentricity — the H/16 orbit law owns the observed
J2000 value — so anchoring the channel to today's value would privilege
our epoch). Rationale for the single-line form: the framework's own L1
climate fit carries NO Earth.Ecc line, so geology does not pin e_E — the
lunar perigee channel is the e_E instrument. Divergent framework
prediction: deep-time e_max ≈ 0.023 along the line (conventional secular
theory: ≈ 0.067) — falsifiable; the deep z-vector channel carries the
multi-mode spectrum where it applies.

**The osculating decomposition.** The Sun's osculating
e(t) = the H/16 orbit law + THIS movement's coupling imprint:
e₁₆(t) − (base/2)·(cos φ₃(t) − cos φ₃(J2000)) on the integrated H/3
phase — the J2000-anchored difference form keeps the H/16 law the owner
of today's value, so no epoch is privileged. That assembled e(t),
together with the f(Y) year-harmonic rate drift in the mean longitude
plus the derived cos-ε torque term, is the certified eclipse chain's Sun
in all three runtimes — zero fitted sun constants
([doc 103](103-135-babylonian-case-study.md)). Since the FQ-7-Sun
one-eccentricity-law landing (below) the eclipse Sun's eccentricity was
the J2000-anchored H/3 line alone; since plan 06 layer B it is the banked
series plus the derived mean-element offset (doc 110 chain 1.1 — the H/3
line left the physics package). The lunar chain rides the DEEP e
channel end to end (moon/deep-ecc-channel.cjs — the model's own secular
modes, decision (ii)); the H/3 line is its epoch-local tangent, and the
two agree within 4.2e-5 wherever the domains overlap — a certification
split, not a physics one.

Open research item — the 1.2° azimuthal family: three independent ~1.2°
tensions live in the node/phase sector while all magnitudes are stiff:
(1) reconciling the RAW Souami & Souchay planetary nodes with JPL ecliptic
inclinations moves Earth's invariable-plane node by −1.23° (i_E moves only
+3″); (2) the channel's value-exact phase sits at 80.09° vs the derived
81.18°; (3) equivalently, the inclination minimum displaced +339 yr from
the balanced year. Same size, same sector — possibly one cause. If it
resolves structurally, the channel's e(J2000) prediction snaps exact.

### 1.1 Longitude Series (Table 47.A, 60 terms + 3 additional)

Table-driven summation of 60 periodic terms, each with argument D*a + M*b + M'*c + F*d.
Terms involving M are multiplied by E (or E^2 for |M|=2).
Additional corrections: A1 (Venus), A2 (Jupiter), L'-F (flattening).

The equation-of-center portion (6288774*sin(M') + 213618*sin(2M')) is partially
subtracted because the off-center orbit geometry already provides half.

### 1.2 Latitude Series (Table 47.B, 60 terms + 6 additional)

Same table-driven approach for ecliptic latitude (beta).
Additional corrections: -2235*sin(L'), A3, and Venus/flattening terms.

### 1.3 Distance Series (Table 47.A Σr column, 46 non-zero terms)

The geocentric distance is the full Meeus Ch. 47 Σr series:

```
r = [385,000.56 km + Σr·10⁻³] × (a_M(t) / a_M(J2000))
```

Same table-driven summation as Σl but with **cosine** of the argument
(the Σr convention) and the same E/E² factors on |M|=1/2 terms; the
framework-native arguments are shared with the longitude/latitude
evaluation, and the trailing ratio carries the Driver-1 deep-time
scaling. Source: `public/input/meeus-lunar-tables.json → distanceTerms`,
single-sourced to all three runtimes through the constants generator.
The full series is load-bearing at syzygy — the 2D-family terms
(evection, variation, …) all peak there; the series lands 0.1 km from
JPL at the 2024 Apr 8 eclipse, and the lunar-canon gate reads 1450/1450
matched with 99.8% type agreement on it.

**Deep-time completeness.** (i) The Driver-1 ratio is evaluated AT THE
EVALUATED EPOCH in all three runtimes (the series threads the evaluation
jdTT to the distance getter; each runtime answers with its pure a_M(t)
evaluator under bit-identical age arithmetic). (ii) The AMPLITUDE scaling
study: the Σ-series amplitudes are J2000-frozen, but classical lunar
theory scales the m-family terms with the month/year ratio (evection ∝ m,
variation and parallactic inequality ∝ m²), which evolves under Driver 1.
Measured against the model's own m(t): the frozen-amplitude error is
< 0.5″ within ±1 Myr, ≈ 9″ at ±10 Myr, ≈ 1.5′ at ±100 Myr and ≈ 4′ at
−300 Myr — an amplitude-scaling layer is BANKED until a deep-time lunar
consumer needs the ≥10 Myr range. The eccentricity-family scaling (annual
equation, E/E² terms) needs no layer: the framework E-factor rides the
derived e(t) channel, so it is epoch-aware in-chain. Two documented
limits: the ratio scales all amplitudes linearly with a_M(t) (the
second-order m(t)-dependence is not modeled — negligible against the
modern floor, relevant only to Myr-scale eclipse work); and the
tools/lib engine's series pins the ratio at 1 — correct for every
historical-era gate it serves, but the epoch-aware getter must be wired
there before any deep-time eclipse work runs through that path.

**Derivation status
(`tools/explore/derive-meeus-distance-amplitudes.js`).** The same 3-body
laboratory that derives the Σl amplitudes at 100.0 ± 0.1% derives the
distance column from framework constants alone: the top-12 Σr
amplitudes emerge at 99.5–100.1% (amplitude-weighted **100.0%**), and
the constant term itself emerges at **384,993 km — −19 ppm of Meeus's
385,000.56 km** — from the framework's a_M = 384,399.07 km
input, demonstrating from first principles that Meeus's constant is the
time-averaged mean and the framework's is the LLR/parallax mean
(the doc 24 taxonomy): the ~601 km offset between the two definitions
is gravity, not a discrepancy.

### 1.4 Post-hoc RA+Dec Override

The full Meeus ecliptic longitude (L' + Sigma_l) and latitude (Sigma_b) are
stored in moveModel. In updatePositions, both RA and Dec are overridden with
the Meeus-derived equatorial coordinates using ecliptic-to-equatorial
conversion. This bypasses the hierarchy's RA entirely (the 5-layer
precession approximation alone would carry ~1.2° RA errors). The orbit ring
still shows the hierarchy path, while the Moon mesh shows the correct
position.

---

## 2. Ecliptic Latitude and the Scene Geometry

### The scene composition

The geometry is correct natively: the 5.14° inclination tilt lives on the
moon container (below the nodal layer's spin), the nodal layer regresses the
plane at the of-date 18.6132-yr period, the moon layer runs on the draconitic
(nodal-month) clock 27.2122209 d, and the layer sum equals the tropical month
by the exact integer identity N_drac = N_trop + N_nodI. The apsidal layer and
its canceller run at the of-date perigee rate (8.8476 yr — the same frame
choice as the nodal layer; count identity N_apsI = N_trop − N_anom), so the
visible ring's perigee tracks the Meeus perigee across epochs; the pair
cancels exactly, leaving the tropical-month sum untouched. The startPos values
are J2000-element anchored (Ω = 125.0446°, ϖ = 83.3532°, Δ = 0.0000° via the
in-sim anchoring meter). The Meeus latitude series (the full 60-term Ch. 47
table plus the derived extension tails) is the source of the PERIODIC
perturbation terms and drives the displayed position; the secular geometry
does not depend on it.

### Application: Two-Stage Correction

The correction is applied in `updatePositions()` (not `moveModel()`) because
it needs the world matrices to be current.

**Stage 1 — RA/Dec readout correction (post-hoc)**:

```
1. Compute ecliptic longitude lambda = L' + Sigma_l (stored in moveModel)
2. Compute ecliptic latitude beta = Sigma_b (stored in moveModel)
3. Convert ecliptic → equatorial:
   RA  = atan2(sin(lam)*cos(eps) - tan(bet)*sin(eps), cos(lam))
   Dec = asin(sin(bet)*cos(eps) + cos(bet)*sin(eps)*sin(lam))
4. Override both obj.ra and obj.dec
```

Current baseline: RMS 0.0009° RA / 0.0008° Dec over 6,088 JPL reference
points, 2000–2050.

**Derived optics — the aberration decomposition.** The post-Meeus correction
content was decomposed (`tools/explore/derive-moon-correction-content.js`):
98–102% of the former fitted `MOON_CORRECTION` is ANNUAL ABERRATION — the
model frames carry apparent-Sun content while the JPL reference is
astrometric (Horizons QUANTITIES='1'). The framework-native default
subtracts the aberration ANALYTICALLY (`_moonAberrationRaDec` + tools
mirror: u′ = normalize(u − v_E/c), with the Sun vector itself
framework-native) plus the small residual `MOON_CORRECTION_RESIDUAL`
(source of truth fitted-coefficients.json; dominated by raCosMp
−0.001421° = 5.1″ — the ONE genuinely fitted value left; everything
aberration-shaped ≤ 0.13″). A weighted refit against the full 6,088-point
baseline reproduces the shipped residual to 0.12″ — already optimal.
J2000 witness reference: RA 222.45959 / Dec −10.90333.

**The 5.1″ term — attributed by decomposition.** Measured in ONE
convention (X − Meeus at raCosMp, same 6,088 reference points, same basis,
J2000 frame; `tools/explore/residual-attribution-elp.js` on the full
ELP-2000/82B series, `residual-attribution-mpp02.js` on MPP02):

| quantity | raCosMp |
|---|---:|
| JPL (DE441) − Meeus-60 | **+5.15″** |
| ELP-2000/82B − Meeus-60 (named truncation) | +1.13″ |
| ELP/MPP02 − Meeus-60 | +1.10″ |
| **JPL − MPP02 (the real gap)** | **+4.05″** |

The shipped patch is `Meeus − JPL`, reproducing the measured −5.15″ to
0.03″. Its content is **−1.13″ named truncation** (almost entirely the
planetary family — Meeus compresses ELP's ~14,000-term planetary series
into 3 additive terms; the main-problem 60-term cut itself contributes
only −0.04″) **− 4.05″ analytic-theory vs JPL numerical ephemeris**.
MPP02 and ELP82B agree to 0.03″ on this term and 0.30″ RMS in longitude
over 2000–2050 — both analytic theories sit together, and JPL sits ~4″
from both, time-flat (3.81–4.21″ across 2000–2051): a fixed
representational difference between the analytic theories and DE441, with
no series-term decomposition in any analytic theory. Classification:
attributed by CAUSE (both halves measured), not by term. Not free
physics. All other basis coefficients are dust (≤ 0.13″).

**The inclination convention.** The input `moonEclipticInclinationJ2000`
is the Moon's DYNAMICAL mean osculating inclination **<!--v:moonEclipticInclination-->5.1573<!--/v-->°** (measured
from the theory itself: h-vector over 2 node cycles; oscillation range
[4.98°, 5.30°]); the Brown/ELP THEORY CONSTANT <!--v:moonInclinationConstantBrownELP-->5.1453964<!--/v-->° (the latitude
sinF-coefficient normalization, 5.128122/0.99665) is kept as the documented
partner `moonInclinationConstantBrownELP`. Pure gravity maps between the two
at 0.01% (compression 0.9944). With the D1 lab calibrated on the dynamical
value, the latitude family closes: sinF 100.02% of Meeus (base3), full
system 99.96%. Caution note: the compact formula "1 − m²" reproduces the
compression to 1″ at the real Moon and is disproved as a theorem by m-scaling
(`tools/explore/v4-i-theorem.js`) — a parameter coincidence
((3/2)e_M² + sin²i/8 ≈ m² at our Moon); the analytic theorem needs a
leakage-clean estimator (open research).

**The Cassini axial tilt — ε_ecl derived.** The Moon's obliquity to the
ecliptic (measured ε_ecl = <!--v:moonObliquityEcliptic-->1.5424<!--/v-->° — the only independently measured member
of the catalog composition moonTilt <!--v:moonAxialTilt-->6.687<!--/v-->° = i + ε) is derived as the
equilibrium of Cassini state 2 (`tools/explore/cassini-moontilt.js`):
numerical gravity-gradient torque averaging over the locked triaxial figure
balanced against the framework's of-date node regression. Inputs: three
documented observed constants of the lunar gravity field
(J₂ = <!--v:moonJ2Grail-->203.305<!--/v-->e-6, C₂₂ = <!--v:moonC22Grail-->22.4261<!--/v-->e-6, C/MR² = <!--v:moonCMR2-->0.392728<!--/v--> — GRAIL+LLR,
Williams et al. 2014) plus framework rates (sidereal month, of-date nodal
period 6798.3303 d, sidereal year, mass ratio; the Earth-only torque mass
fraction M_E/(M_E+M_M) is a 1.2% term first-order treatments miss).

The averaged balance — a body spinning uniformly about a fixed axis — gives
**ε = <!--v:cassiniObliquityDerived-->1.5528<!--/v-->°** at the Brown-convention i (100.7% of measured;
∂ε/∂i ≈ 0.295 makes the convention worth 13″), and the whole-orbit coupled
average over the real ELP-2000/82B orbit gives
**ε = <!--v:cassiniObliquityCoupled-->1.5551<!--/v-->° (<!--v:cassiniObliquityCoupledPct-->100.83<!--/v-->%)**. No input can absorb the remaining
gap (it would require C/MR² wrong by 0.8% — known to 3×10⁻⁵ — or the node
period wrong by 56 days); every named physical channel measures 5–10× too
small (fluid-core CMB torque ~176× too small; the node-rate inertial-frame
convention −5.2″, real and adopted; Sun-coherent orbit orientation −6.5″;
the ⟨r⁻³⟩ radial content +20″, wrong sign). The answer is the **averaging
assumption itself**: the real Moon obeys the coupled Euler equations, in
which the pole orientation and the physical librations evolve together —
standard practice in modern lunar rotation theory, which integrates rather
than averages. Integrating the full rigid-body rotation (3-DOF Euler
equations, torque from Earth and the Sun over the real ELP-2000/82B orbit,
RK4, no averaging; `tools/explore/moon-euler-rotation.js`):

| | ε | vs measured |
|---|---:|---:|
| averaged balance, fixed axis | <!--v:cassiniObliquityCoupled-->1.5551<!--/v-->° | +45.7″ |
| **full Euler rotation** | **<!--v:cassiniObliquityEuler-->1.5470<!--/v-->°** | **+16.5″** |
| measured | <!--v:moonObliquityEcliptic-->1.5424<!--/v-->° | — |

The libration–pole coupling is worth −29.3″ (64% of the gap). Verification:
the integrated mean is independent of the starting obliquity to 0.6″ and
unchanged at half the step size; the free modes (libration ~1057 d, free
precession ~81 yr) are oscillatory about the forced state and average out
over the 250-yr span.

**Status: ε_ecl is classified derived to 0.30%.** The residual 16.5″ is the
size of the known channels the rigid treatment omits — elastic (k₂)
moments, degree-3 gravity, a two-layer mantle+core solution — and is left
**named rather than absorbed**; chasing it further is lunar interior
physics, not framework physics. What is claimed: the framework's own month,
node rate and mass ratio, plus three published gravity coefficients and
Newtonian gravity, reproduce a lunar constant the model previously adopted,
with nothing fitted.

Reading notes for re-derivers: the circular locked-orbit average is
analytically closed
(`⟨(r̂ × I·r̂)_y⟩ = sinψ·[−A/2 + (C/2)cosψ + (1−cosψ)((3/8)A + (1/8)B)]`,
ψ = i + ε; the lab reproduces it to 1.00000 as a permanent self-test) and
is NOT the textbook first-order `(C−A)/2·sinψ` — the near-total
cancellation of large terms means the naive form overstates the torque by
0.62%, the size of the effect under study. And the ⟨r⁻³⟩ enhancement of
0.276% over the Keplerian ellipse is the torque-problem face of the same
m²-class solar modification behind the "which a" question (two-body Kepler
384,748 km vs three-body <!--v:moonKeplerEffectiveDistance-->386,321<!--/v--> km — doc 24).

Scene composition (shipped): the mesh tilt composes
`moonEclipticInclinationJ2000 + moonObliquityEclipticJ2000` (6.6997° in
the scene's own convention) so the rendered spin-to-ecliptic obliquity
equals the measured <!--v:moonObliquityEcliptic-->1.5424<!--/v-->°;
`moonObliquityEclipticJ2000` lives in astro-reference.json with tools
mirrors.

**Stage 2 — Visual 3D position correction**:

The Moon's `pivotObj.position` is updated to match the corrected RA/Dec, so the
Moon mesh appears at the physically correct position in the 3D scene:

```
1. Build corrected position from corrected spherical (same radius and RA, new Dec)
2. Transform: Earth equatorial local -> world (via earth.rotationAxis.matrixWorld)
3. Transform: world -> orbitObj local (via inverse of pivotObj.parent.matrixWorld)
4. Set pivotObj.position and rotationAxis.position to the result
```

Uses pre-allocated Vector3 and Matrix4 objects; the renderer's auto matrix
update propagates the change before drawing.

### Visual Effect

The orbit ring (child of orbitObj, sibling of pivotObj) shows the geometric
circular path dictated by the 5-layer hierarchy. The Moon mesh (child of
pivotObj) shows the corrected position. The difference between the ring and
the Moon makes the gravitational perturbation effects visible.

---

## 3. Constants

Stored in `ASTRO_REFERENCE` in both `src/script.js` and `tools/lib/constants.js`:

| Constant | Value | Unit | Source |
|----------|-------|------|--------|
| moonMeanAnomalyJ2000_deg | <!--v:moonMeanAnomalyJ2000Deg-->134.9634<!--/v--> | deg | Meeus Ch. 47 |
| moonMeanAnomalyRate_degPerDay | <!--v:moonMeanAnomalyRateDegPerDay-->13.06499295<!--/v--> | deg/day | Meeus Ch. 47 |
| moonMeanElongationJ2000_deg | <!--v:moonMeanElongationJ2000Deg-->297.8502<!--/v--> | deg | Meeus Ch. 47 |
| moonMeanElongationRate_degPerDay | <!--v:moonMeanElongationRateDegPerDay-->12.19074912<!--/v--> | deg/day | Meeus Ch. 47 |
| sunMeanAnomalyJ2000_deg | <!--v:sunMeanAnomalyJ2000Deg-->357.5291<!--/v--> | deg | Meeus Ch. 25 |
| sunMeanAnomalyRate_degPerDay | <!--v:sunMeanAnomalyRateDegPerDay-->0.98560028<!--/v--> | deg/day | Meeus Ch. 25 |
| moonArgLatJ2000_deg | <!--v:moonArgLatJ2000Deg-->93.2720993<!--/v--> | deg | Meeus Ch. 47 |
| moonArgLatRate_degPerCentury | <!--v:moonArgLatRateDegPerCentury-->483202.0175273<!--/v--> | deg/century | Meeus Ch. 47 |
| moonMeanElongationJ2000Full_deg | <!--v:moonMeanElongationJ2000FullDeg-->297.8502042<!--/v--> | deg | Meeus Ch. 47 |
| moonMeanElongationRate_degPerCentury | <!--v:moonMeanElongationRateDegPerCentury-->445267.1115168<!--/v--> | deg/century | Meeus Ch. 47 |

Note: Two sets of mean elongation constants exist. The per-day rates are used
for the longitude perturbations (computed from `d`). The per-century rates are
used for the latitude correction (computed from `T = d/36525`).

---

## 4. StartPos Values

Provenance: **J2000-element anchored** — the scene's node and perigee
longitudes are set to the Meeus J2000 elements (Ω = 125.0446°, ϖ = 83.3532°)
to Δ = 0.0000° via the in-sim anchoring meter. Verified against the Step-5c
eclipse RMS (0.8086° — that metric is Meeus-override-framed).

| Parameter | Value (J2000-anchored) |
|-----------|--------------------------|
| moonStartposApsidal | <!--v:moonStartposApsidalDeg-->347.5476<!--/v--> |
| moonStartposNodal | <!--v:moonStartposNodalDeg-->64.0435<!--/v--> |
| moonStartposMoon | <!--v:moonStartposMoonDeg-->67.8443<!--/v--> (in-plane anchor via the unmask meter, mean Δlon ≈ 0; the anchoring meter's L row reads the Meeus-overridden *true* Moon, so its ~3° Δ against the mean-longitude target is the equation-of-center reading, not an anchor error) |

The apsidal/nodal values carry a micro-recalibration for the eight-interval count layer (a device of the lunar chain)
rates. The anchoring meter's node-rate row reads the **world frame**: the
nodal layer spins at the of-date period (6798.33 d, −19.3411°/yr) in its
local frame, and Earth's axial-precession parent adds the equinox precession
(~0.0140°/yr, both retrograde), so the measured world-frame regression is
the star-referenced −19.3551°/yr.

---

## 5. Accuracy

### Eclipse accuracy (frame-independent ground truth)
- 58 solar eclipses 2000-2025 (NASA GSFC catalog)
- RMS Moon-Sun separation: **0.81 degrees** (geocentric)
- 25 eclipses within 0.5 degrees; best match 2020-Jun-21 annular at 0.11°

### The umbra tier (one implementation)

Every certified umbra consumer — the eclipse-audit generator (audit-26,
Babylon −135, the NASA centerlines), the browser audit and eclipse buttons,
and the always-on umbra disc's position — rides ONE implementation:
`@essrt/physics` `eclipse/besselian.cjs`
(`createModel().eclipse.umbraGroundAtJD`), the api-gate-certified chain
(derived Sun planetary completion + derived Moon tails + exact
axis∩ellipsoid ground mapping on WGS84 — the sphere-intersection shortcut
is measured as a latitude/sun-altitude-correlated phantom error of up to
~6″ at extreme geometry, so the ground mapping is the exact ellipsoid
piercing with geodetic output). The browser's `umbraFromSceneAtJd` is a
thin delegation to it; the scene-side correction stack below serves only
the scene-relative NASA-convention γ diagnostic
(`umbraNASAConventionAtJd`).

**The scene-side apparent-place stack** (the corrections that make the
scene chain match the tier):

1. **Annual aberration, BOTH bodies** —
   `Δλ = −(κ/r)·cos(λ_body − λ_sun)/cos β` about the ecliptic pole
   (κ = 20.4955″, `astro-reference.json`); for the Sun this reduces to the
   κ/r term. The observer-velocity (v/c) shift is DISTANCE-INDEPENDENT and
   hits the Moon at the same ~20.5″; at syzygy Sun and Moon share a
   direction, so the shift is common-mode and CANCELS in the elongation —
   aberrating only the Sun breaks the relative geometry by exactly κ.
   Moon light-time (~0.7″) stays unmodeled; the Δβ component vanishes at
   syzygy.
2. **The sidereal-phase anchor** — `earth.rotationPhase =
   −π/tropical-year-days` (118.3 s of rotation): the startmodelJD midnight
   anchor carries a noon-convention initial orientation (EoT-independent;
   EoT(anchor) excluded by 15 s).
3. **Geodetic output latitude** — the sphere piercing yields geocentric
   latitude; NASA paths are geodetic on WGS84 (0.19°·sin 2φ ≈ 20 km at
   mid-latitudes). One attributed constant
   (`earthFlatteningInverseWGS84`).
4. **The series-injected Sun** — the symmetric cure to the Moon override:
   the geocentric sun vector is rebuilt from the certified of-date sun
   longitude (the shared finders' evaluator, the same one the Besselian
   tier rides) in the rotationAxis equatorial frame, placed exactly like
   the Moon override (dec = asin(sin ε sin λ), ra = atan2(cos ε sin λ,
   cos λ); distance keeps the scaffold value — the shadow DIRECTION is
   the accuracy carrier; NOT bridged by deltaTStart: the scene rides the
   raw-curve clock). The scene ground track matches the scaffold-free
   Besselian tier to ~20 km at the −135 instant.

The centerline scoreboard is machine-owned, not prose: the `centerlines`
section of `data/eclipse-audit-summary.json` (generated by
`tools/verify/eclipse-audit.js` from the cross-checked reference points in
`public/input/solar-eclipse-centerlines-nasa.json` — see its `_meta` for
the NASA limit-column trap) records all
<!--v:centerlinesPoints-->42<!--/v--> fixed-UT points
(<!--v:centerlinesEvents-->14<!--/v--> events) under the exact-reproduction
convention — current mean **<!--v:centerlinesMeanArcsec-->2.4<!--/v-->″** /
max **<!--v:centerlinesMaxArcsec-->5.8<!--/v-->″** shadow-plane (the VECTOR
projection of the surface chord onto the plane perpendicular to the sun
direction — exact for oblique geometry where `ground × sin alt` is not),
with the ≤8″ api gate holding per point. The in-sim test button
"Centerlines: shadow-plane vs NASA path tables" prints the same table from
the live scene. The 2021 Antarctica crossing stays in the set as the
extreme-geometry stressor (highest latitude, lowest sun); the largest
tracked residuals (2001 Atlantic class) have a verified closure anatomy —
JPL elongation/β errors at those instants predict the shadow-plane gap to
0.05″ — i.e. series-tail content, not geometry.

#### The fresh-load heal (the init-vs-epoch-chain split)

The scene's object literals and the deep-time epoch updaters are two
hand-maintained copies of the same parameters. The startup heal (module
tail, before the first `requestAnimationFrame`) runs the epoch recompute
cascade once at J2000, making fresh-load state ≡ chain state by
construction — `resetEpochToJ2000` cannot do this (it early-returns at
epoch 0). Gated: the browser golden master's FIRST recorded key is a
fresh-state umbra pin (`ecl.umbraSceneFresh@…`, probed before any epoch
call) that must equal the healed value bit-for-bit — fail-proven.

#### The Sun planetary completion (package location tier)

The package location tier additionally carries the **Sun planetary
completion** (`eclipse/sun-planetary-completion.cjs`): the finder Sun
omits the classical planetary perturbations of the geocentric Sun
(measured as 10.0″ RMS of all-phase longitude scatter against JPL
Horizons). The completion is DERIVED from twin epoch-phased 8-body
integrations (planet phases from the engine scene graph, full-vs-base3
differential, the EMB secular-perihelion channel projected out — it
belongs to the framework's own ϖ(t)/e(t) laws), read analytically as a
70-term table: main synodic tones plus eccentricity-modulation sidebands
(main ± modulator anomaly, main ± M_E — the largest single terms ARE
sidebands: 2(E−J)−M_E 8.3″, E−M−M_Ma 7.5″, invisible to
constant-amplitude fitting). The planetary mean-longitude RATES and the
Moon-elongation rate are framework-native carriers injected by
`model.js` — computed live from the framework's own planet records (one
revolution per the record's tropical period; Earth from the framework
mean solar year; the elongation from the sidereal month/year identity) —
and the table is extracted on those carriers (0.61″ table-vs-signal
fidelity; the J2000 phase anchors ARG_L0/PERI/D0 remain declared epoch
constants). The Earth-around-EMB wobble amplitude is the DERIVED
parallactic a_M·μ/AU (6.4399″, computed live from package constants). The
table ships **without a constant term** (the all-phase fit attributes the
constant to the tier's existing anchors — at new moon the EMB argument
locks near D ≈ 0 and its cos component becomes a constant, the trap that
kills eclipse-sample fits of the same terms), and **with zero fitted
constants**: nutation is a frame rotation common to Sun and Moon and the
chain keeps both mean-of-date, so no Sun-only nutation term belongs in an
elongation chain. Terms that fail the half-sample era-stability test or
lack a unique two-planet argument at the window's frequency resolution
(~1.5″ RSS) are deliberately unshipped. The finders stay on the bare
Sun — their fitted anchors and certified canon statistics were produced
on it, and elongation-class timing absorbs the omission into the fitted
phases.

Registry Sun metric (instrument-owned, `fq7s-sun-registry-metric.mjs`:
modern window 1970–2049, full nutation bridge, mean removed): certified
<!--v:frameworkSunVsJplRms-->0.80<!--/v-->″ vs the Meeus Ch. 25 basis with
the same completion <!--v:meeusCh25SunVsJplRms-->1.22<!--/v-->″ (bare
Meeus 10.06″).

**One eccentricity law for Sun and Moon.** Eccentricity is FRAME-INVARIANT
(e = |z|, z = e·e^{iϖ}) and may carry only fixed-frame lattice content
(the apsidal period, the eccentricity-band beats); the perihelion-of-date period is the OF-DATE perihelion period — the apsidal
apsidal rotation seen from the H/13 equinox (13 + 3 = 16) — and belongs to
ϖ_of-date, not to e. Accordingly the eclipse Sun's eccentricity was the
J2000-anchored H/3 line (the H/16 law's J2000 value + the H/3 variable
part — the Moon's own law) until plan 06 layer B moved it to the banked
series plus the derived mean-element offset, while the cardinal-point path keeps the H/16
law (`eccentricityAt`) unchanged. Two recorded, not-landed notes: the
besselian Sun DISTANCE still rides the H/16 law (1e-4-relative, ~0.1″ of
solar radius); and over 250 kyr NONE of the model's e-laws track La2004
(`fq7s-orbit-vector-vs-laskar.mjs`) — the frame-invariant
lattice-modes-with-Laskar-class-amplitudes reading ("option C-large") is
research-class, to be tested against the cardinal-point fit and the paleo
record, not JPL alone. Two modern local-slope tensions are recorded as
prediction-level tensions, not tuned: the chain's ė and ϖ̇ vs the
JPL-class linear laws (both pass the 1246 perihelion–solstice anchor —
a decade-wide plateau that cannot discriminate — and the 26-event corpus
test leaves 0.187 min event-to-event, under the ~0.2-min discriminating
power).

#### The derived series extensions (the framework's own tails)

Both location-tier tails are DERIVED from the framework's own
integrations, with external references in protocol roles only (MPP02
discovery-only, JPL out-of-sample-only); every shipped amplitude is read
from the framework integration, and rows the lab does not fully produce
stay unshipped even where "fitting" them would improve the gates
(stop-gate: derive or don't ship).

**Moon** (`moon/series-extension.cjs`), four derived families:

- the Stage-D1 3-body lab joint-fit tail — 47 longitude + 30 latitude
  terms beyond the Meeus head (2.02″/0.80″ RMS content, dt-halving drift
  0.000″; the lab reproduces the shipped head at 100.00–100.03%), with
  JPL out-of-sample confirming the lab's own predictions and the
  sign-flipped control degrading;
- the direct planetary tail — 15 λ terms (0.896″ content) from
  epoch-phased twin 8-body integrations, cross-validated against the
  independent JPL fit (V−E +0.849″ vs +0.85; E−J −0.681″ vs −0.69);
- the round-2 Delaunay tail — five dt-halving-converged terms led by
  [6,0,−2,0], extracted at 0.572″ where the independent MPP02 comparison
  demanded 0.57″;
- the J2 node family — the Ω node family (arguments Mp±Ω, 2F+Ω, 2D+Ω,
  F−Ω; period 16.9 yr), which is not on the integer Delaunay lattice and
  is invisible to lattice-catalog fits. The physical channel is Earth's
  oblateness: a twin 3-body integration with the J2 torque on/off
  isolates the family, and the two documented J2-class Meeus head terms
  (λ +1962e-6 sin(Lp−F), β −2235e-6 sin(Lp)) are reproduced at ratio
  1.028 / 0.971, certifying the amplitude scale at ±3%. Shipped rows:
  λ −0.544 sin(Mp−Ω) + 0.546 sin(Mp+Ω) + 0.371 sin(2F+Ω)
  + 0.103 sin(2D+Ω); β −0.375 sin(F−Ω) — dt-halving-converged ≤ 0.003″;
- the main-problem dust — 43 λ + 33 β pure-Delaunay sine rows
  (0.670″/0.464″ content) below the Meeus Table 47 ~0.4″ truncation
  cutoff, in argument classes no earlier catalog enumerated (odd kD,
  |kM| = 3, |kF| = 4); dense-JPL arbitration measures every trusted
  leader REAL at ratio 0.9–1.1, the labels bit-match MPP02 main-problem
  catalog rows (0.001–0.002″), and the D1 lab derives them (head
  fidelity 0.51%/0.07%, lab/census ratio 0.95–1.04, lab signs matching
  the catalog row for row). The dust census runs secular-guarded (cubic
  detrend plus T/T² quadrature absorbers — without the guard, the
  doctrine-blocked T-modulated parameter class masquerades as fake
  184-yr sideband families; measured).

**Current gates** (all pre-registered, never a subset): official
all-phase JPL λ **<!--v:moonSeriesLonVsJplRms-->2.84<!--/v-->″** /
β **<!--v:moonSeriesLatVsJplRms-->0.35<!--/v-->″** — the β endpoint AT
the measured MPP02-vs-JPL comparison floor (~0.33″); dense 2-day JPL
arbiter λ 2.22″ / β 0.38″; the 179-syzygy fleet Δ-instrument improving;
NASA centerlines mean <!--v:centerlinesMeanArcsec-->2.4<!--/v-->″ / max
<!--v:centerlinesMaxArcsec-->5.8<!--/v-->″; audit verdicts 3/13/5/0/5;
Babylon −135 BestGap <!--v:babylon135BestGapKm-->376<!--/v--> km
(doc 103). What remains is genuinely floor: the ~0.8″ λ post-census
residual (sub-0.04″ deep dust + beyond-3-body), the doctrine-blocked
~5e-5 parameter class (the three biggest Meeus head amplitudes off by
fractional ~5e-5 vs MPP02's DE-fitted constants — closeable only as
declared-fitted values, REJECTED by owner decision: the chain keeps
"every constant derived"), and the flat ~4″ analytic-vs-DE441
representational gap that MPP02 and ELP82B share to 0.03″. The external
ELP/MPP02 series lift was ANALYZED AND REJECTED on the same principle:
it would buy ~2″, but ELP/MPP02 is a fitted external model, and this
chain stays fully derived and explained. Extending the framework's OWN
series remains the only sanctioned path lower. The chain is thereby
measured to sit AT the analytic limit of derived lunar theory.

Instruments: `tools/explore/d2-*.mjs`, `m20h-*.mjs`, `fq7-*.mjs`,
`fq7s-*.mjs`, `n2/n3-*.mjs`; their `.local.json` working data is
gitignored and regenerates from the instruments themselves.

### Geocentric parallax limit
- The 0.81-degree RMS is the **theoretical best** for geocentric coordinates.
- Solar eclipses are topocentric events. The Moon's parallax (~0.95 degrees)
  means the geocentric Moon-Sun separation at eclipse time is approximately
  |gamma| x 0.95 degrees, where gamma is the eclipse shadow offset.
- Pearson r(|gamma|, geocentric_sep) = <!--v:meeusPearsonR-->0.9945<!--/v--> (r^2 = 0.989)
- Residual RMS after subtracting expected parallax: **0.04 degrees**
- Improving beyond 0.81 degrees requires topocentric correction (the
  local-circumstance chain does exactly that where it matters).

### JPL Horizons comparison (with IAU precession correction)
- RMS Total: **0.0012 degrees** (RA 0.0009 / Dec 0.0008) — the certified
  baseline under the derived-optics implementation
- Entries: 6088 weighted reference points, 2000–2050

### Historical eclipse accuracy by era

Raw geocentric separations at catalog JDs (`tools/explore/moon-ancient-eclipses.js`,
without the production ΔT machinery — the authoritative deep-time accuracy
statement is the 26-event eclipse alignment audit, doc 103):

| Era | Sep RMS° | Residual RMS° | ≤1.5° |
|-----|----------|---------------|-------|
| Modern (2000-2024) | ~0.8 | ~0.04 | 5/5 |
| 20th century (1900-1999) | ~1.0 | ~0.6 | 8/9 |
| 19th century (1806-1868) | ~1.5 | ~1.2 | 3/4 |
| 18th century (1706-1780) | ~2.5 | ~2.0 | 2/4 |
| 17th-15th century | ~3.5 | ~3.0 | 1/4 |
| Medieval (632-1261) | ~5+ | ~5+ | 1/5 |
| Ancient (584 BCE-484 CE) | ~8+ | ~8+ | 1/8 |

Degradation before ~1900 is expected and shared by all analytical lunar
theories at raw catalog JDs.

### Consistency with the deep-time Moon model

The deep-time Moon model (doc 99) uses a Farhat 2022 polynomial for Moon
orbital evolution:

```
a_Moon(t_Ma) = a_now × (1 + α₁·t_Ma + α₃·t_Ma³ + α₄·t_Ma⁴)
```

calibrated to deep-time anchors (Wells 1963 Devonian corals, Wu et al. 2024
cyclostratigraphy 0–650 Ma, modern lunar laser ranging) and independent of
the Meeus formulas. The two are physically consistent at J2000:

```
da/dt|_J2000 = a_now × α₁ / 1e6 = +3.82 cm/yr    (LLR direct anchor)
dn/dt|_J2000 = −1.5 × n × (1/a) × da/dt
n̈ (tidal) ≈ −25.8 arcsec/cy²    vs LLR (Chapront 2002): −25.86
```

The match to LLR is by construction (α₁ is LLR-anchored); the Kepler chain
closing to ~0.2% confirms the α₁ → da/dt → n̈ conversion is implemented
consistently. Meeus's L′ T² coefficient (−5.68 ″/cy²) is NOT the tidal
acceleration directly: it is the sum of the tidal secular term
(n̈/2 ≈ −12.9 ″/cy²) and the planetary secular term (≈ +7.2 ″/cy²) — the
entanglement the framework-native fundamental arguments resolve (the Lunar
Precession Invariant carries the tidal MEAN rate; the bounded
solar-eccentricity channel carries the oscillatory part; §1).

The deep-time Moon distance (`meanMoonDistanceMetresAtAge`), LOD evolution,
and Moon sidereal period are exposed via the calculator and the ESSRT
modal. The 3D simulation's Moon orbit position uses the J2000-anchored
series with the framework-native argument completions — correct for the
simulation's operational range, deep-bounded by construction.

---

## 6. NASA GSFC Eclipse Catalog: Computed, Not Observed

### The catalog is numerically computed

The NASA GSFC Five Millennium Canon of Solar Eclipses (-1999 to +3000) is
**entirely numerically computed**, not based on historical observations:
Sun from VSOP87 (Bretagnon & Francou 1988), Moon from ELP-2000/82
(Chapront-Touzé & Chapront 1983, with later corrections), Earth rotation
from Stephenson & Morrison ΔT extrapolation, Besselian elements computed
from the above. The catalog predicts where eclipses *should* have occurred
according to these theories; it does not incorporate historical
observations to verify or correct its predictions.

### Three layers of uncertainty for ancient eclipses

**Layer 1: ELP-2000/82 lunar theory accuracy (NASA's polynomial)**

| Era | T (centuries) | Longitude precision |
|-----|---------------|---------------------|
| 2000 CE | 0 | ~0.5 arcsec |
| 1000 CE | -10 | ~2-5 arcsec |
| 0 CE | -20 | ~10-30 arcsec |
| 1000 BCE | -30 | ~1-3 arcmin |
| 2000 BCE | -40 | ~5-10 arcmin |

The polynomial terms (T², T³, T⁴) in the fundamental arguments accumulate
errors for large |T|; the theory was designed for high accuracy near the
present epoch.

**Layer 1b: Meeus Ch. 47 (the framework's series) — empirical accuracy at deep time**

The framework's series is a truncated form of ELP-2000/82 (plus the derived
framework tails), so its residual at deep time can in principle exceed the
Layer 1 floor at specific JDs. Empirically, the -135 case study (doc 103)
tested this directly: Meeus Ch. 47, ELP-2000/82 (truncated and full), and
ELP/MPP02 (DE-fit and LLR-fit) all converge to β ≈ 0.706° at the -135
conjunction — within 0.001°, consistent with NASA's γ = 0.7119. **The Moon
series is not the source of the -135 residual** — the audited BestGap
(<!--v:babylon135BestGapKm-->376<!--/v--> km, off-peak verdict, UT within
9 minutes; see
[Historical Solar Eclipse Validation](https://holisticuniverse.com/model/historical-eclipse-validation)
and [doc 103](103-135-babylonian-case-study.md)) is a *where* residual
carried by Sun-side longitude, GMST convention, and umbra geometry, not a
*when* residual and not a Moon-series error. The Babylonian-era Meeus
residual sweep of adjacent events (-584 Thales, -309 Sicily, -762
Bur-Sagale) shows β differences ≤ 0.12° against the same references.

A one-time DE441 A/B of the 26-event audit (JPL DE441 lunar positions
injected in place of the framework series) found mean Δ ≈ 0 with a clean
epoch pattern — modern era slightly worse under DE441 (the framework
series is tightly calibrated at present), late-ancient worse, deep-ancient
(−556…−762) better by up to ~1000 km — quantifying the truncation
degradation past the calibration horizon at the few-hundred-km class, and
showing the Cairo 977–985 cluster moves < 120 km under DE441 (NOT a Moon
problem — misidentification/partial-zone/Sun-side; doc 107).

The framework-native fundamental arguments are the shipped default (§1):
the Meeus M′/F T²⁺ polynomial physics is expressed through the framework's
own channels, and the "Meeus vs Integrator (lunar argument drift)" test
button confirms closure (M′ ≤ 0.015° at −584, versus the ≈ +1.4°/century
drift of the raw ICRF-rate comparison). Framework-native D/M is likewise
shipped (identity-composed with real-time secular integrals; all five
fundamental arguments bounded, zero new constants) — the D/M substitution
probe measures the secular-integral contribution at ≲ 0.007° TT-eval
(≲ 0.017° UT-eval) at the ancient epochs.

**Layer 2: Delta-T (Earth rotation) uncertainty**

| Era | Delta-T uncertainty | Geographic shift |
|-----|--------------------|--------------------|
| 2000 CE | < 1 second | negligible |
| 1900 CE | ~1 second | ~0.4 km |
| 1000 CE | ~300-600 seconds | ~200+ km |
| 0 CE | ~1200-1800 seconds | ~500+ km |
| 1000 BCE | ~3000-5000 seconds | ~1000+ km |

Before ~700 BCE there are no direct Delta-T measurements at all; values are
extrapolated using tidal deceleration models with large uncertainties.

**Layer 3: Combined effect**

For ancient eclipses, the NASA catalog's predictions are the output of
theories extrapolated far beyond their validated range, using a Delta-T
model with large uncertainties. Disagreement with the catalog for ancient
dates does not necessarily mean the model is wrong — it may equally mean
the catalog's extrapolations are unreliable.

### Verified historical observations

Only a small number of ancient eclipses have **independent historical
documentation** that can serve as genuine ground truth:

- **Babylonian records** (~750 BCE onward): Clay tablets with dated eclipse
  observations. About 40 reliable solar eclipse records, providing the primary
  source for Delta-T calibration before telescopic observations.
- **Chinese records** (~720 BCE onward): Court astronomer records in dynastic
  histories. Generally give date and sometimes time of day.
- **Greek/Roman records**: Scattered literary references (Thales ~585 BCE,
  Thucydides ~431 BCE, Ennius ~189 BCE). Often imprecise about timing.

These observations constrain *that* an eclipse occurred on a given date,
but rarely provide precise timing: the Moon moves ~0.5° per hour, so ±3 h
of timing uncertainty is ±1.5° of position. [Doc 107](107-ancient-record-review.md)
is the adjudication record of the audit's ancient rows.

---

## 7. Files Modified

| File | Changes |
|------|---------|
| `src/script.js` (constants block) | ASTRO_REFERENCE constants |
| `src/script.js` (Moon object definition) | `lunarPerturbations: true` on Moon object |
| `src/script.js` (`moveModel`) | Longitude perturbations + Meeus latitude in moveModel |
| `src/script.js` (`updatePositions`) | Post-hoc Dec correction + visual position correction in updatePositions |
| `tools/lib/constants.js` | ASTRO_REFERENCE constants |
| `tools/lib/scene-graph.js` (moonDef) | `lunarPerturbations: true` on moonDef |
| `tools/lib/scene-graph.js` (`moveModel`) | Longitude perturbations + Meeus latitude storage |
| `tools/lib/scene-graph.js` (`computePlanetPosition`) | Post-hoc Dec correction in computePlanetPosition |

---

## 8. Validation Tools

`tools/explore/moon-ancient-eclipses.js` — Tests Moon-Sun separation at
historical and ancient solar eclipses from 584 BCE to 2024 CE, organized by
era. Shows how accuracy degrades with time distance from J2000.

`tools/explore/moon-parallax-analysis.js` — Proves the 0.81° RMS at modern
eclipses is the geocentric parallax limit. Correlates Moon-Sun separation with
NASA gamma parameter (Pearson r=<!--v:meeusPearsonR-->0.9945<!--/v-->). Shows residual RMS of 0.04° after
subtracting expected parallax.
