---
docVersion: 1.0
modelVersion: v27.2
coefficients: sha256:a1e5567e03d1936e
status: current
---

# The Derived Moon — the framework-native lunar theory in Meeus Ch. 47's form

**Status**: Complete (full Meeus Ch. 47: 60L+60B terms + the 46-term Σr distance column + the derived model extension tails, RA+Dec override, JPL-verified; Σr derived-validated at 100.0% weighted by the Stage-D1 laboratory)

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
   latitude from Meeus "Astronomical Algorithms" Ch. 47, and the model's own
   derived series tails. These shift the Moon's actual position away from its
   geometric circle.

The visual result: the orbit ring shows the unperturbed circular path, while the
Moon mesh shows the physically correct corrected position — making the
gravitational perturbation effects directly visible.

---

## 1. Full Meeus Ch. 47 Longitude + Latitude

Applied in `moveModel()` for the object with `lunarPerturbations`, always on.

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
replaces is either derived from model primitives or anchored to a single
classical constant:

- **Linear rates — the frame convention.** Meeus's argument rates differ from
  the model's star-referenced chain rates by exactly ± general precession. The
  general precession p — the IAU 2006 p_A input, 50.288″/yr — closes the ±1.4°/century M′/F
  drift with zero new constants — the drift is frame bookkeeping, not
  missing physics. Meter: "Meeus vs Integrator (lunar argument drift)".
  Two composite rates reduce to exact identities: A3 ≡ the Moon's
  SIDEREAL mean longitude rate (≡ 360°/sidereal month; Meeus
  481266.484 °/cy) and the A2 argument rate ≡ 2·L′_trop − M′rate −
  2·n_Jupiter (0.19 ppm vs 479264.290). Both are CHAIN-INTEGRATED at deep
  time through their identified content (A3 = A3₀ + 360·N_sid, the chain's
  sidereal-orbit count;
  A2 = A2₀ + 360·(N_trop + N_apsOfDate − 2·N_Jupiter), Jupiter via the
  Driver-2 chain) so they evolve with the tidal months, the composed
  precession T_p(t), and solar mass loss. The A1 rate (<!--v:a1RateDegPerCy-->131.849<!--/v--> °/cy) is observationally
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
  sensitivities come in two forms (ONE home, `moon/ecc-sensitivities.cjs`,
  plan 23): the Meeus-EFFECTIVE pair s_ϖ = <!--v:moonEccSensitivityPerigeeEffective-->2.407<!--/v--> /
  s_Ω = <!--v:moonEccSensitivityNodeEffective-->1.018<!--/v--> reproduces every
  of-date Meeus T² exactly — and each of those T² contains the equinox's own
  acceleration, the general precession's T² term
  (<!--v:moonEccSensitivityFrameT2ArcsecPerCy2-->1.11113<!--/v-->″/cy², Lieske
  1976, the frame ELP's polynomials embed), a bookkeeping share that has
  nothing to do with Earth's eccentricity. Removing it by the T² identity
  s_phys = (s_eff·Ẋ_of-date·κ/2 − T2_frame)/(Ẋ_ICRF·κ/2) gives the PHYSICAL
  pair s_ϖ <!--v:moonEccSensitivityPerigeePhysical-->2.480<!--/v--> /
  s_Ω <!--v:moonEccSensitivityNodePhysical-->0.866<!--/v--> — derived from the
  shipped constants, never typed — which the 3-body laboratory reproduces
  from pure gravity at 100.3% / 101.5% (`tools/explore/v4-frame-audit.js`).
  Since plan 23 the runtime carries the PHYSICAL pair in the channel on the
  ICRF rates, and the frame share rides separately as ONE term on every
  of-date longitude alike: the Meeus polynomial's p₀T + T2_frame·T² in the
  snapshot branch (Meeus-exact T² as before), the model's own precession of
  date (pFix, below) in the deep branch. The frame-free arguments
  M′ = L′ − ϖ and F = L′ − Ω therefore cancel it exactly at every epoch
  (the `create-model-parity` counterfactual: +1″/yr on the dynamical
  precession moves L′, ϖ and Ω and leaves M′ and F within 1e-3″ to −1 Myr).
- **e_E itself — the engine's own deep z-vector.** The lunar
  channel's eccentricity history is the ±10-Myr deep mode table
  (doc 109 §17, `moon/deep-ecc-channel.cjs`), anchored exactly at the JPL
  J2000 seed in VALUE and — since the Framework Verification Moon panels
  found the table's own J2000 slope 19 % steep (ė −5.00e-5/cy against the
  run's −4.24e-5, multiplied straight into the perigee and node
  curvature) — in SLOPE: the run's own J2000 z-rate, script-written into
  the embed from the banked series, through the arguments' secular-completion
  taper (`SECULAR_COMPLETION_TAPER_YEARS` = 27,943 yr, a recorded window — a
  bounded term of the same class as the constant remainder; doc 109 §17).
  It carries the 405-kyr-class deep spectrum a single line cannot. The astro-reference
  (e₀, ė₀, ë₀) values are the documented Taylor-check anchors.
- **The sign paradox, dissolved.** Brown's m²-scaling predicts apsidal
  precession ACCELERATING while Meeus's M′ T² says decelerating. Both are
  true at once: the inertial chain's Brown-m² mean governs the MEAN rate
  (tidal, slowly accelerating) while the eccentricity channel is a bounded
  zero-mean oscillation around it (currently in its decelerating phase
  because ė < 0). The Meeus polynomial entangles them in single
  coefficients.
- **D and M — identity-composed from the real-time model rates.** D and M
  carry no independent physics: Meeus's own coefficients satisfy
  D = L′ − L_sun (rate to 3e-6 °/cy, T² to 1e-7 °/cy²) and M = L_sun − ϖ_sun.
  The model composes them literally — D = L′ − L_sun, M = L_sun − ϖ_sun —
  with Meeus J2000 anchors (Ls0 ≡ L′0 − D0 absorbs the Ch. 25/47 convention
  offset) and the Sun of date injected from the ONE certified Sun (plan 09
  step 3): L_sun is its mean longitude, which integrates the one-family
  tropical year (`sunMeanLonDegAtJdTT`), and ϖ_sun its mean perihelion of
  date (`sunPerihelionLonDegAtJdTT`). D sits within 15″ of Meeus at −2000.
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
  `K_PL · ∫₀ᵀ (e_E²(t′) − e_E²(J2000)) dt′` along the deep e_E channel,
  with K_PL = −2332 °/cy per e² derived lazily from the budget — and
  `_fwLpObliquityCarrier` carries the figure+frame part (+1.30363″/cy²)
  along the model obliquity cycle, `C · ∫₀ᵀ (ε(t′) − ε₀) dt′` with
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
  note: the Meeus literal embodies the SECULAR-theory ë; a single-line ë of
  the wrong sign flips the channel T³.
  The always-chains deep branch carries the same secular-ë convention
  through a third carrier, `lpSecularCompletion`:
  `K_PL · ∫₀ᵀ [½·Δ(e²)″·t′² + ⅙·(e²)‴_sec·t′³] · env(t′) dt′` with
  Δ(e²)″ from existing constants (zero new values) and env a cos² taper
  of half-width `SECULAR_COMPLETION_TAPER_YEARS` (27,943 yr ≈ 279 cy ≈ the
  ~100-kyr eccentricity eigenbeat quarter, where the local secular Taylor
  decorrelates — a recorded window). Its
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
  in `fwArgsDeep`): (i) `pFix = ∫(p_dyn − p_kin) dy` on Lp, ϖ AND Ω alike
  (plan 23 — ONE equinox for the three of-date longitudes) — p_dyn the
  DYNAMICAL axial precession, the published precession period of date
  (the one-family beat inside its window, the composed clock beyond;
  epoch-valid at any age; exposed as
  `model.epoch.axialPrecessionYearsAtYear`); p_kin the beat of the deep
  chain's sidereal and tropical years the chains embed (one equinox turn per
  T_p(t)). Natively BOUNDED at deep time;
  two-tier cumulative table, frozen beyond ±1 Myr. Its in-window ṗΔ·T²/2
  (the model-native precession acceleration, self-measured as a secant over
  the ancient span: 1.069″/cy², 96% of Lieske's 1.111) is REMOVED from the
  obliquity-carrier normalization so the total Lp T² stays the certified,
  DE441-validated budget; for ϖ and Ω the same remainder (the Lieske share
  the physical exponents gave up minus pFix's in-window T²) rides the
  obliquity carrier's integrand as `frameRemainder`, so their T² stays
  Meeus-exact too and the frame term is the same function on all three. (ii)
  SELF-MEASURED residual rate anchors on all five of-date compositions
  (±25-yr central difference of the raw compositions vs the certified
  bundle rates at build), applied through the same cos² taper — full in
  the historical window, frozen ≤ ~0.9° at deep time. Before plan 23 pFix
  rode Lp only while the apsidal/nodal chains carried the frame share frozen
  inside the Meeus-effective exponents: in the window the two agreed to
  0.006″/cy², beyond it M′ and F inherited the whole equinox wobble
  uncancelled — measured 2.5° at ±10 kyr, 5° at ±20 kyr, 39° at −1 Myr
  (0.22° of lunar latitude at 10 kyr) — and ϖ/Ω carried a 3% share of the
  eccentricity channel's own excursion that was never theirs (tens of
  degrees at 25 kyr). The measured change in the window: M′ −6″ / F −9″
  around 0 AD, +76″ / +57″ at −3000 (≈ 8″ of lunar longitude, 16 s of
  eclipse time), zero on L′, D and M. Certified state of the completed deep branch:
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
  equinox-of-date partners (∓ one count per precession period T_p(t)).
  The frame term ṗ_A is itself derived: the composition
  (`tools/explore/v4-pdot-composer{,2,3}.js`) builds the general-precession
  acceleration from the lab's gravity-derived ecliptic-of-date pole track
  (π̇ 47.49″/cy vs IAU 46.998) + the model ε(T) + a luni-solar cone
  about the moving pole with the classical cos ε torque law + one rate
  anchor — which independently lands ψ̇₀ = 5039.15″/cy, 0.013% from the
  IAU luni-solar 5038.48 that was never an input — giving composed
  T² = +1.1496″/cy² = 104% of IAU2006. The equator-only composition
  yields 61%; the balance is the planetary χ-channel (the ecliptic
  tilting under the equator).

- **Deep-future validity.** The lunar chains span ±500 Myr symmetric
  (the chains are smooth and physical throughout: LOD 24→27.4 hr, month
  27.32→29.42 d at +500 Myr), and the Meeus-polynomial fallback clamps its
  T²/T³/T⁴ tails at |T| ≤ 100 cy — unclamped, the fitted T⁴ tail cancels
  the lunar mean motion at year ≈ 1,989,000 and reverses it beyond. The
  secular-ë completion carrier saturates at its taper edge (±28 kyr) to a
  frozen Lp offset of −17.5° (past) / +7.0° (future) — bounded by
  construction, so no polynomial reaches deep time and the bounded-harmonic
  claim is untouched. The rate completion is likewise bounded: the pFix
  table freezes beyond ±1 Myr, the five rate anchors freeze at the
  taper edge (≤ ~0.9°), and Mp and F are frame-free at every epoch (plan
  23: the same pFix on L′, ϖ and Ω cancels in them exactly).
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
bounded at every epoch on the deep channel's bounded e(t), where the Meeus
parabola is unbounded.

**How ė is pinned (the (ė, s) degeneracy).** Only the product s·ė enters
each element's T², but node and perigee share one ė: with the observed
ė₀ = −4.204e-5/cy the node requires s_Ω = 1.018 and the perigee ratio then
yields s_ϖ = 2.407 with no freedom — the Meeus-effective pair. First-principles status:
the laboratory derives the PHYSICAL exponents from pure gravity
(2.486/0.880) and the of-date record minus the frame acceleration
requires <!--v:moonEccSensitivityPerigeePhysical-->2.480<!--/v-->/<!--v:moonEccSensitivityNodePhysical-->0.866<!--/v-->
(derived in `moon/ecc-sensitivities.cjs` from the shipped pair, κ and the
Lieske T²) — agreement 100.3%/101.5%. The runtime carries the physical pair
and the frame term separately (plan 23): the sensitivities are attributed,
not fitted, and the frame is the model's own precession of date.

**The eclipse Sun's eccentricity.** The certified eclipse chain's Sun takes
its eccentricity from the banked N-body series plus the derived mean-element
offset (doc 110 chain 1.1); the lunar chain rides the DEEP e channel end to
end (moon/deep-ecc-channel.cjs — the model's own secular modes). Earth's
eccentricity of date is the N-body series on every path; no single-line law
sits beside it.

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
equation, E/E² terms) needs no layer: the model E-factor rides the
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
distance column from model constants alone: the top-12 Σr
amplitudes emerge at 99.5–100.1% (amplitude-weighted **100.0%**), and
the constant term itself emerges at **384,993 km — −19 ppm of Meeus's
385,000.56 km** — from the model's a_M = 384,399.07 km
input, demonstrating from first principles that Meeus's constant is the
time-averaged mean and the model's is the LLR/parallax mean
(the doc 24 taxonomy): the ~601 km offset between the two definitions
is gravity, not a discrepancy.

### 1.4 Post-hoc RA+Dec Override

The full ecliptic longitude (L' + Sigma_l, the derived series-extension tail
inside since plan 06 R3 item 1) and latitude (Sigma_b) are stored in
moveModel. In updatePositions, both RA and Dec are overridden with the
equatorial coordinates from the ecliptic-to-equatorial conversion — since R3
item 1 the override is ONLY that conversion: the rendered Moon is the
GEOMETRIC series Moon, on the same convention as the rendered Sun and
planets. This bypasses the hierarchy's RA entirely (the 5-layer precession
approximation alone would carry ~1.2° RA errors). The orbit ring still
shows the hierarchy path, while the Moon mesh shows the correct position.

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
in-sim anchoring meter). The stack's BASE is placed from the engine every
frame like the sun plane (`_applyEngineEarthFrame`, both twins): its root
container takes the ecliptic pole and true equinox of date, so the visible
ring's plane follows the ecliptic of date — 0.09–0.22° from the rendered Moon's
orbit plane at every epoch, where the device's flat J2000 base had read 0.54°
at −3 kyr, 3.8° at −30 kyr and 8.7° at −5 Myr (measured on the Node twin, the
plane normal of the raw ring track against the rendered track over a month).
The moon layer's in-plane clock is the arguments' own F = L′ − Ω — the SAME
lunar arguments the rendered Moon and the eclipse finders ride (the
draconitic-month cycle count it replaced lacked the arguments' L′ completion
and let the ring's Moon lag the rendered one by 1.7° at −3 kyr, 16° at
−10 kyr, 81° at −30 kyr) — and the rendered distance rides the recession
(the series' distance column carries the J2000 mean; × a(t)/a₀ from the
month chain, 1 at J2000: −77 m at −2 kyr, +3.7 km at +100 kyr). Measured on
the Node twin after both: the ring's Moon and the rendered Moon agree to
0.2–0.4° mean separation at every epoch — the periodic-terms floor, the
Meeus latitude series being the only thing the override still adds.
The Meeus latitude series (the full 60-term Ch. 47
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

Measured against JPL Horizons' APPARENT Moon (ecliptic longitude,
1970–2049, 10-day grid, TT; the model bridged by nutation and the 0.7″
relative light-time): the series with the derived extension reads
−1.0″ ± 1.5″, flat in elongation (every 30° bin −0.7..−1.3″; cos D
coefficient 0.00; a ~1.3″ cos M′ structure remains and no fitted value
replaces it).

**Geometric, not astrometric.** The astrometric place is a bookkeeping
intermediate: light-time in the barycentric frame WITHOUT the observer's
aberration, and for a body co-moving with the observer those two effects
are equal and opposite up to the relative light-time (≈0.7″), so the
astrometric Moon sits ~20″·cos D from BOTH the geometric and the apparent
Moon. The scene is an orrery of where the bodies are (geometric; Earth's
shadow is cast by the geometric Sun and the Moon enters it at its geometric
place), and the conversion to a reference's convention belongs to the
comparison instrument (the Standard-Model overlay compares the Moon
geometric against MPP02 geometric). The override is the frame conversion
alone — no aberration layer, no fitted patch (doc 111 §1 records the
measured 52″-at-new-moon class a patch validated against the astrometric
place had introduced).

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
balanced against the model's of-date node regression. Inputs: three
documented observed constants of the lunar gravity field
(J₂ = <!--v:moonJ2Grail-->203.305<!--/v-->e-6, C₂₂ = <!--v:moonC22Grail-->22.4261<!--/v-->e-6, C/MR² = <!--v:moonCMR2-->0.392728<!--/v--> — GRAIL+LLR,
Williams et al. 2014) plus model rates (sidereal month, of-date nodal
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
physics, not model physics. What is claimed: the model's own month,
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

## 4. The ring's phases — engine-placed

The orbit ring carries no fitted start angle. Its five stack layers are
ENGINE-PLACED every frame from the lunar arguments — apsidal θ = ϖ − 90°,
canceller −θ, the inert pair 0, nodal θ = Ω − 180°, with ϖ = L′ − M′ and
Ω = L′ − F at the scene's TT — the same arguments that place the rendered
Moon and the Apsidal/Nodal markers, so ring ≡ markers ≡ Moon at every epoch,
in both twins (`_applyEngineEarthFrame`). The stack's conventions: a layer
angle θ carries the longitude 90° + θ, the apsidal arm points at the apogee,
the Moon def's fixed tilt puts the ascending node at 180° under zero stack
rotation. The anchoring meter's node-rate row (the world-frame regression
−19.3551°/yr, the of-date −19.3411°/yr plus the equinox precession) reads
the placed ring.

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

1. **Planetary aberration, each body its own** (plan 06 R3 item 1;
   formerly "annual aberration, both bodies — cancels at syzygy", the
   wrong physics): the Sun's derived κ = 2π a/(c T_sid √(1−e²)) (≈20.5″,
   the light-time of a source at rest in the barycentric frame) and the
   Moon's RELATIVE light-time (its geocentric motion during dist/c,
   ≈0.7″). For a body co-moving with the observer the stellar aberration
   cancels against its barycentric light-time displacement, so Horizons'
   apparent Moon is the geometric Moon to 0.7″ — aberrating the Moon by
   κ had held it 20.5″ from its apparent place, and the fitted
   `moonMeeusLpCorrection` (+32.75″ = κ + the Sun's then-missing long
   inequality + the trend-ΔT offset) absorbed it. The anchor is retired
   (0); the package besselian applies κ to the Sun and the light-time to
   the Moon (`eclipse/besselian.cjs`). The remaining centerline residual
   on NASA's UT instants (2–5″ in 1999–2026) is the model's trend ΔT
   against the observed one (9.5 s below IERS at 2000, 2.9 s at 2024, ×
   the Moon's 0.55″/s) — a ΔT-convention floor, never fitted here.
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
   the accuracy carrier). Since plan 06 R3 item 2 the scene clock IS true
   TT — UT + deltaTStart + curve, the published ΔT surface, the same bridge
   the Besselian tier and the registry instruments apply; the curve-only
   axis is the eclipse FINDERS' certified convention and had leaked into the
   scene (the scene Moon 30″ west at true UT, the Sun 2.2″, the retired
   moonMeeusLpCorrection compensating it). The scene ground track matches
   the scaffold-free Besselian tier to ~20 km at the −135 instant.

The centerline scoreboard is machine-owned, not prose: the `centerlines`
section of `data/eclipse-audit-summary.json` (generated by
`tools/verify/eclipse-audit.js` from the cross-checked reference points in
`public/input/solar-eclipse-centerlines-nasa.json` — see its `_meta` for
the NASA limit-column trap) records all
<!--v:centerlinesPoints-->42<!--/v--> fixed-UT points
(<!--v:centerlinesEvents-->14<!--/v--> events) under the exact-reproduction
convention — current mean **<!--v:centerlinesMeanArcsec-->6.2<!--/v-->″** /
max **<!--v:centerlinesMaxArcsec-->10.7<!--/v-->″** shadow-plane (the VECTOR
projection of the surface chord onto the plane perpendicular to the sun
direction — exact for oblique geometry where `ground × sin alt` is not),
with the ≤12″ api gate holding per point (restated from 8″ at plan 06 R3
item 1: the former 1.3–2″ class of the modern events was the retired Moon
anchor compensating the tier's mean Sun and the trend-ΔT offset; the
physical floor on NASA's UT instants is that ΔT convention plus the
series' syzygy scatter — 2001 Jun 21 reads 11.1″, the 9.5-s ΔT gap of
that era). The in-sim test button
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
belongs to the model's own ϖ(t)/e(t) laws), read analytically as a
70-term table: main synodic tones plus eccentricity-modulation sidebands
(main ± modulator anomaly, main ± M_E — the largest single terms ARE
sidebands: 2(E−J)−M_E 8.3″, E−M−M_Ma 7.5″, invisible to
constant-amplitude fitting), plus the LONG-PERIOD rows (plan 06 I2 → I3):
the Earth–Mars–Jupiter long inequality 4λ_E − 8λ_Ma + 3λ_J (≈1783 yr, 6.9″
at J2000) in D'Alembert form — a sum over Earth, Mars and Jupiter of
e_X(t)·[a cos(θ + ϖ_X(t)) + b sin(θ + ϖ_X(t))] on the e-vectors OF DATE
(the embedded 1-kyr grid from the banked series), derived on the model's
own Wisdom–Holman engine over ±20,000 yr (the same Horizons J2000 seed and
DE440 masses as the chain artifact) — and the Venus–Earth term 8λ_V −
13λ_E (≈239 yr, 1.8″) as a constant row derived over ±3100 yr. The I2
constant long-inequality row (derived over −5100..+1100 yr) was exact
inside ±3000 yr and 3.7″ off outside, because the inequality is first order
in the eccentricities and its composed amplitude rides the perihelia of
date — the model's own run shows the line growing from 3.2″ at −18 kyr to
9.0″ at +14 kyr; the D'Alembert row reproduces that to 0.05″ in band. The
Venus–Earth term is formally fifth order and resonant (a cluster of lines
beating on ~20 kyr), so no single-ϖ form holds and its row is a local
description of the historical era. These
are terms a 200-yr extraction window folds into its secular basis, and the
reason the certified Sun carried a 6″ ripple against Horizons over ±3000
yr. The planetary mean-longitude RATES and the Moon-elongation rate are
framework-native carriers injected by `model/sun-and-eclipses.js`: since I3 the planets'
carriers are the model's own banked J2000 sidereal mean motions (the
embedded artifact; the former record-based carriers sat 4.1″/yr off for
Venus — 83° of the Venus–Earth argument at ±9000 yr), Earth the model
sidereal year, the elongation from the sidereal month/year identity, and
the lunar equation's argument is the model's own Moon elongation of
date (ṅ included; the constant-rate carrier ran ~29° off it at ±9000 yr): a
perturbation argument is inertial, and on of-date carriers every
argument whose multipliers do not sum to zero drifted with precession —
42..52° at −3000 for the table's Σk = −1 rows, the dominant ancient
scatter of the Sun against Horizons (6.4 → 4.4″ at −3000). The 70 N3
literals are extracted on the of-date carriers and kept: the two carrier
sets share the J2000 anchors and part by ≤1.4°·|Σk| at the window's
edges, where the re-extraction reproduces the composed function (0.61″
table-vs-signal fidelity either way; the J2000 phase anchors
ARG_L0/PERI/D0 remain declared epoch constants). The Earth-around-EMB
wobble amplitude is the DERIVED
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
modern window 1970–2049, full nutation bridge on the cache's UT instants
(verified by re-query, plan 06 I1), mean removed): certified
<!--v:frameworkSunVsJplRms-->1.03<!--/v-->″ vs the Meeus Ch. 25 basis with
the same completion <!--v:meeusCh25SunVsJplRms-->1.02<!--/v-->″ (bare
Meeus 10.07″). The former era-clock Sun read 0.80″ here — the modern-window
cost of the physical year (plan 06 R1).

**One eccentricity law for Sun and Moon.** Eccentricity is FRAME-INVARIANT
(e = |z|, z = e·e^{iϖ}) and may carry only fixed-frame lattice content
(the apsidal period, the eccentricity-band beats); the perihelion-of-date
period — the apsidal rotation seen from the moving equinox — belongs to
ϖ_of-date, not to e. Accordingly the Sun's eccentricity is the banked N-body
series — the mean element of date, the same function the published Earth
eccentricity serves — on every clock-side path — the eclipse Sun's equation
of centre, the besselian Sun distance and the cardinal braid
(`eccentricityAt` ≡ `sunEccentricityAt`; plan 21). *Record:* the eclipse Sun rode the
J2000-anchored single-line law (the Moon's own law) until plan 06 layer B,
and the cardinal-point path and the besselian distance rode the retired
perihelion law until plan 09; while they shipped, over 250 kyr none of the
model's e-laws tracked La2004 (`fq7s-orbit-vector-vs-laskar.mjs`), which
the N-body series that replaced them does by construction of its secular
modes. Two modern local-slope tensions are recorded as
prediction-level tensions, not tuned: the chain's ė and ϖ̇ vs the
JPL-class linear laws (both pass the 1246 perihelion–solstice anchor —
a decade-wide plateau that cannot discriminate — and the 26-event corpus
test leaves 0.187 min event-to-event, under the ~0.2-min discriminating
power).

#### The derived series extensions (the model's own tails)

Both location-tier tails are DERIVED from the model's own
integrations, with external references in protocol roles only (MPP02
discovery-only, JPL out-of-sample-only); every shipped amplitude is read
from the model integration, and rows the lab does not fully produce
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
NASA centerlines mean <!--v:centerlinesMeanArcsec-->6.2<!--/v-->″ / max
<!--v:centerlinesMaxArcsec-->10.7<!--/v-->″; audit verdicts 3/13/5/0/5;
Babylon −135 BestGap <!--v:babylon135BestGapKm-->154<!--/v--> km
(doc 103). What remains is genuinely floor: the ~0.8″ λ post-census
residual (sub-0.04″ deep dust + beyond-3-body), the doctrine-blocked
~5e-5 parameter class (the three biggest Meeus head amplitudes off by
fractional ~5e-5 vs MPP02's DE-fitted constants — closeable only as
declared-fitted values, REJECTED by owner decision: the chain keeps
"every constant derived"), and the flat ~4″ analytic-vs-DE441
representational gap that MPP02 and ELP82B share to 0.03″. The external
ELP/MPP02 series lift was ANALYZED AND REJECTED on the same principle:
it would buy ~2″, but ELP/MPP02 is a fitted external model, and this
chain stays fully derived and explained. Extending the model's OWN
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

The deep-time Moon model (doc 99) reads the Earth–Moon distance history as a
CITED PHYSICAL INPUT (plan 12 option A): Farhat et al. 2022's published
solution (the AstroGeo22 ephemeris), as the ratio a(t)/a(0) on the observed
J2000 distance, with the LLR rate α₁ as the J2000 slope —

```
a_Moon(t_Ma) = a_now × r_Farhat(t_Ma),   r'(0) = α₁ (LLR)
```

(the former quartic, calibrated to deep-time anchors, is deleted) and is
independent of the Meeus formulas. The two are physically consistent at J2000:

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

Measured on the Framework Verification Moon panels (§8), the month and
precession rates of the framework-native arguments against the Meeus
Ch. 47 rates over 1000 → 2500: sidereal, synodic, tropical and draconic
months within 0.00–0.02 s rms, the anomalistic within 0.01 s; the perigee
cycle within 0.0015 d and the node cycle within 0.0010 d, with the same
secular slope — the of-date perigee curvature −37.4″/cy² against Meeus's
−37.15″/cy² once the deep channel's slope anchor landed (before it, the
chain's Kepler month alone lengthened at the tidal rate, 2.3× the observed
slope, and the perigee curvature read −44″/cy²: the two findings the
panels were built to expose). Beyond the canon's −2000 → 3000 the Meeus
rates are a J2000-centred polynomial and the two part, as they must.

The deep-time Moon distance (`meanMoonDistanceMetresAtAge`), LOD evolution,
and Moon sidereal period are exposed via the calculator and the ESSRT
modal. The 3D simulation's Moon orbit position uses the J2000-anchored
series with the framework-native argument completions — correct for the
simulation's operational range, deep-bounded by construction.

---

## 6. The NASA eclipse catalog — computed, not observed

The Five Millennium Canon is a numerical computation on Espenak & Meeus's ΔT polynomial, not an observation set; the three layers of uncertainty that carries for ancient eclipses, and the list of verified historical observations, are archived. The live comparisons are `tools/verify/lunar-canon-recall.js` (the full-canon recall, [doc 52](52-analysis-export-tools.md) Part 5) and the primary-source record of [doc 102](102-gia-alpha-lunar-validation.md).

---

## 8. Validation Tools

**Framework Verification · Moon group (live, in the simulator; doc 50).**
Three panels read the framework-native arguments against the Meeus
Ch. 47 rates on the four standard windows, each with hover, residual and
export: **Month Lengths** (the five months of date as strips, sidereal
and synodic on by default — each 360° over the one-year rate of the
model's own L′, D, M′ and F, the sidereal month with the model's axial
precession removed), **Perigee Precession** (ϖ = L′ − M′, the apsidal
precession) and **Node Regression** (Ω = L′ − F, the nodal precession),
the last two with the chain's dynamical Brouwer–Clemence route bridged to
date as a clickable second line so the two deep-time tiers stay
comparable. They are the surfaces that found the orbit-size-vs-mean-
longitude split and the deep channel's slope error (§5).

`tools/explore/moon-ancient-eclipses.js` — Tests Moon-Sun separation at
historical and ancient solar eclipses from 584 BCE to 2024 CE, organized by
era. Shows how accuracy degrades with time distance from J2000.

`tools/explore/moon-parallax-analysis.js` — Proves the 0.81° RMS at modern
eclipses is the geocentric parallax limit. Correlates Moon-Sun separation with
NASA gamma parameter (Pearson r=<!--v:meeusPearsonR-->0.9945<!--/v-->). Shows residual RMS of 0.04° after
subtracting expected parallax.
