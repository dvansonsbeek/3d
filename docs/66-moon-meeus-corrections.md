# Moon Meeus Corrections -- Implementation Reference

**Status**: Complete (full Meeus Ch. 47: 60L+60B terms, RA+Dec override, JPL-verified)

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

2. **Meeus analytical corrections** (perturbative): Adds equation of center, solar
   perturbations (evection, variation, annual equation), and ecliptic latitude from
   Meeus "Astronomical Algorithms" Ch. 47. These shift the Moon's actual position
   away from its geometric circle.

The visual result: the orbit ring shows the unperturbed circular path, while the
Moon mesh shows the physically correct Meeus-corrected position -- making the
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
  drift with zero new constants — the drift was frame bookkeeping, not
  missing physics. Meter: "Meeus vs Integrator (lunar argument drift)".
  Two composite rates reduce to exact lattice identities (D2): A3 ≡ the
  Moon's SIDEREAL mean longitude rate = L′_tropical − p_H13 (0.003 ppm vs
  Meeus 481266.484 °/cy) and the A2 argument rate ≡ 2·L′_trop − M′rate −
  2·n_Jupiter (0.19 ppm vs 479264.290). Both are CHAIN-INTEGRATED at deep
  time through their identified content (A3 = A3₀ + 360·(N_trop − N_p13);
  A2 = A2₀ + 360·(N_trop + N_apsOfDate − 2·N_Jupiter), Jupiter via the
  Driver-2 chain) so they evolve with the tidal months, H(t) precession,
  and solar mass loss. The A1 rate (131.849 °/cy) is observationally
  defined by nature: it sits on the 18V−16E−M′ near-resonance where ppm in
  planetary years moves the beat by °/cy (hypersensitivity, experimentally
  demonstrated); its amplitude is gravity-sized (18-kyr lab: single line,
  124% of Meeus at the lab's own beat rate).
- **Element secular content — the phase-aware solar-eccentricity channel.**
  The Sun's mean perturbation on the lunar node and perigee scales as
  (1 − e_E²)^(−3/2). The perigee/node longitudes are computed as
  ϖ(T) = ϖ₀ + ϖ̇₀·(T + ∫₀ᵀ[(g(e_E(t))/g₀)^s − 1]dt) — the rate speeds up and
  slows down with the e_E phase; the older frozen-κ T²/T³ Taylor coefficients
  remain in the code as documented J2000 checks against Meeus. Sensitivities:
  s_Ω = 1.018 and a Clairaut-type s_ϖ = 2.407, constant across orders —
  both Meeus-effective and exact (the earlier s_Ω = 1 shipped under a
  "theory pins 1" rationale, with the 1.8% node gap read as the channel
  measuring ė; the v4 frame attribution superseded that reading — the 1.8%
  was the frame term hiding — so both exponents now carry the same
  convention). FRAME ATTRIBUTION (v4 campaign):
  these are frame-EFFECTIVE exponents — every of-date Meeus T² contains the
  IAU precession acceleration ṗ_A T² (+1.1054″/cy², IAU2006); removing that
  frame term gives physical exponents s_ϖ 2.479 / s_Ω 0.867, which the
  3-body laboratory reproduces from pure gravity at 100.3% / 101.5%
  (`tools/explore/v4-frame-audit.js`). The effective form is kept in the
  runtime (exact vs Meeus by construction); an explicit bounded frame
  carrier is the D4-companion follow-up.
- **e_E itself — fully derived (see "Framework-native e_E" below).** The
  channel's eccentricity history is the framework's own H/3 fluctuation;
  the observed J2000 eccentricity, its rate, and its curvature are
  PREDICTIONS of that line (−0.9%, +1.7%, and sign-correct respectively),
  not inputs. The astro-reference (e₀, ė₀, ë₀) values are retained as the
  documented Taylor-check anchors.
- **The sign paradox dissolved.** Brown's m²-scaling predicts apsidal
  precession ACCELERATING while Meeus's M′ T² says decelerating — the old
  "wrong sign" mystery. Resolution: the Lunar Precession Invariant governs
  the MEAN rate (tidal, slowly accelerating) while the eccentricity channel
  is a bounded zero-mean oscillation around it (currently in its decelerating
  phase because ė < 0). Both are true at once; the Meeus polynomial entangles
  them in single coefficients.
- **D and M — identity-composed from the real-time framework rates.** D and M
  carry no independent physics: Meeus's own coefficients satisfy
  D = L′ − L_sun (rate to 3e-6 °/cy, T² to 1e-7 °/cy²) and M = L_sun − ϖ_sun.
  The framework composes them literally — D = L′ − L_sun, M = L_sun − ϖ_sun —
  with Meeus J2000 anchors (Ls0 ≡ L′0 − D0 absorbs the Ch. 25/47 convention
  offset) and secular content from the closed-form integrals of the
  epoch-local year-length harmonics: the model's REAL-TIME axial and
  perihelion rates around their H/13 and H/16 means
  (`_fwSunSecularDeviations`). The equinox acceleration is 62% derived from
  the model's own rates (local a2 +0.000187 °/cy² vs Meeus's +0.0003032 —
  itself a local fit of an unbounded polynomial); the remainder is the
  framework's genuine prediction. Bounded ±5° over ±50 kyr where the Meeus
  D parabola reaches 82°; deviations ≤ 0.08°/0.11° (D/M) at −584, ~0 in the
  certification window. Zero new constants.

- **L′ planetary remainder — the bounded e_E² carrier (derived).** Meeus's
  planetary T² content (T2_LP − T2_LP_TIDAL = +0.0020131 °/cy² = +7.25″/cy²)
  is the J2000 Taylor truncation of `K_PL · ∫₀ᵀ (e_E²(t′) − e_E²(J2000)) dt′`
  — the Moon's mean motion responding to the Sun's eccentricity as it moves
  along the derived H/3 channel (the Laplace/Adams planetary acceleration,
  reproduced in-framework). K_PL is derived lazily from the existing record
  remainder and the channel slope (record-normalized; zero new constants);
  the first-principles Sun–Earth–Moon 3-body laboratory
  (`tools/explore/derive-meeus-amplitudes.js` + `es-sensitivity-scan.js`,
  fixed-action Adams–Laplace scan) reproduces the coefficient independently
  at 95.1% (k = ∂n/∂e_S² = −2704 vs record-implied −2844 °/cy per unit e²)
  and numerically confirms the channel exponents (s_ϖ 2.486, s_Ω 0.880 —
  which the v4 frame audit identified as the PHYSICAL exponents, matching
  the frame-corrected record at 100.3%/101.5%) and the E-factor law (annual
  equation ∝ e_S^1.0007). v4 BUDGET CLOSURE: the record-implied −2844 is
  not a pure channel value — the remainder +7.247″/cy² decomposes with zero
  free parameters as true planetary +5.8665 (Chapront et al. 2002, the
  channel part) + Earth-figure J2 +0.1925 + frame ṗ_A +1.11113 (Lieske) +
  0.077 Meeus-era tidal-convention gap (Γ embedded −25.706 vs LLR −25.858);
  see `tools/explore/v4-kpl-budget.js` and astro-reference.json
  `elpW1T2Decomposition_arcsecPerCy2`. E5 RESOLVED: the lab-vs-ELP k gap
  (−2704 vs −2320) was a held-quantity protocol artifact — the
  convention-free adiabatic-ramp measurement (e_S slowly ramped inside one
  integration, the dynamics conserving the true invariant;
  `tools/explore/v4-e5-adiabatic-ramp.js`) gives k = −2370 ± 40 °/cy per e²,
  confirming the ELP planetary value at ~2%; holding mean osculating a
  instead of the action biases k by 15% (an m²-order difference — the same
  order as k itself). Direct planetary + J2 terms measured small
  (+0.47″/cy²; `v4-e5-direct-planetary.js`). The Adams–Laplace planetary
  acceleration is thereby derived in-framework at the percent level.
  D3 CLOSED (the Lp T³/T⁴ "tails"): the T³ = 1/538841 °/cy³ is DERIVED at
  98.8% with zero free parameters — Adams–Laplace channel curvature
  k·(e_S²)″/6 with the secular ë (+104.2%) + obliquity-carrier second order
  (−6.5%) + frame p_A T³ (+1.2%); the channel-only k in the observed-ė
  convention (−2350.3) sits dead-center of the adiabatic −2370 ± 40. The T⁴
  is 41% channel (quadratic secular e), remainder = higher-order secular
  content (0.004° at −584, clamped at deep time). Convention note: with the
  derived H/3 line's own ë (−3.7e-8) the channel T³ flips sign — the Meeus
  literal embodies the SECULAR-theory ë, the same documented divergence as
  the BCE drift-meter rows, now localized at the T³ level
  (`tools/explore/v4-d3-tails.js`). In-window the carrier is Taylor-identical to the old T²
  (−584: +0.017° difference ≈ 2 min); at deep time it stays bounded
  (≤ ~230°) where the T² parabola reached 7,892° at +200 kyr. The same
  laboratory derives the top-20 longitude amplitudes at 100.0 ± 0.1% and the
  apsidal/nodal precession periods from the sidereal month plus solar
  parameters alone — the three Moon inputs are not independent. (The early
  "0.036%/0.064% residuals" on those periods were later RESOLVED as a frame
  convention: the lab reproduces the true star-referenced periods, 3232.60 d
  apsidal / 6793.48 d nodal, at ±1‱ — full-system ±0.5‱/±0.3‱ — while the
  catalog inputs 3231.493/6798.38 are the equinox-of-date partners.)
  CARRIER SPLIT (shipped): the single record-normalized carrier is now TWO
  bounded per-law carriers — `_fwLpPlanetaryCarrier` carries the channel
  part only (planetary +5.8665″ + the 0.077″ Meeus-tidal gap; k = −2332,
  inside the adiabatic −2370 ± 40) and `_fwLpObliquityCarrier` (+ tools
  mirror) carries the figure+frame part (+1.30363″/cy²) along the framework
  obliquity cycle, Lp_obl = C·∫(ε(t)−ε₀)dt with C = 2·T2_OBL/ε̇₀ — bounded,
  zero new fitted values. This split IMPROVED the Babylonian corpus
  (−8/38/4-of-6 → −7/37/5-of-6). The frame part itself is now DERIVED: the
  ṗ_A composition experiment chain (`tools/explore/v4-pdot-composer{,2,3}.js`)
  composes the general-precession acceleration from the lab's gravity-derived
  ecliptic-of-date pole track (π̇ 47.49″/cy vs IAU 46.998) + the framework
  ε(T) + a luni-solar cone about the moving pole with the cos ε torque law +
  one rate anchor (which independently lands ψ̇₀ = 5039.15, 0.013% from
  IAU's 5038.48): composed T² = +1.1496″/cy² = 104% of IAU2006 — and the
  scene-only composition's missing 39% identified D4's "remaining 38%" as
  the planetary χ-channel (the ecliptic tilting UNDER the equator).

- **Deep-future validity.** The cumulative-H table spans ±500 Myr symmetric
  (the chains are smooth and physical throughout: LOD 24→27.4 hr, month
  27.32→29.42 d at +500 Myr), and the Meeus-polynomial fallback clamps its
  T²/T³/T⁴ tails at |T| ≤ 100 cy — unclamped, the fitted T⁴ tail cancels
  the lunar mean motion at year ≈ 1,989,000 and reverses it beyond. The
  scene Moon is prograde at every epoch out to ±1 Gyr by construction.

Certification of the framework-native default (fully-derived e_E line):
argument drift vs Meeus M′ +0.37° at −135 / +0.58° at −584 and F ≈ 0
(current meter values after the 8H-lattice/always-chains refit; the
pre-refit line read +0.221/+0.381 with F −0.025/−0.047) — this is the
predicted-ë-vs-secular-ë difference (minutes-class in eclipse timing), with
in-window rows at zero (legacy comparison: +1.4°/century); NASA-canon
recall 99.71% / tight-window 74.88% / type 98.84% at that stage (140 type
mismatches, all at the documented ±0.02 magnitude classification boundary).
Current certified reference after the 8H-lattice + always-chains +
bounded-carrier package (commit 8e131aa) and the D5/carrier-split batches:
full-canon recall 99.61 / tight 74.37 / type 98.75 (all mismatch samples
knife-edge at the γ ≈ 1.0/1.5 boundaries); 26-event historical audit split
1 confirmed · 11 off-peak · 7 regional · 0 ΔT-signal · 7 geographic;
timed Babylonian lunar corpus (Almagest records, reduced via local
astronomy only — no external ΔT, no eclipse canon): non-deep skeleton
mean +3 min / RMS 36 min (statistically identical to conventional secular
theory's +2/34), deep-chains branch **−7 min / 37 min / 5-of-6** (current
certified after the carrier split; the pre-split reference was −8/38/4-of-6
— the physically-attributed T³ shape moved −719 Mar into its ±30 band)
(tools/explore/timed-babylonian-lunar-eclipses.js; corpus encodings to be
verified against Stephenson 1997 Ch. 6 before publication).
Earlier D/M re-certification details: physical recall identical, tight
+13 events, model total exactly 12,064 = NASA's count, five type flips at
the boundary (129 vs 124 — accepted trade). At deep time the same channel
modulates the anchored precession chains as rate(t) = invariant mean ×
[g(t)/g₀]^s (the factored law, doc 99) — bounded at every epoch under the
derived line (e ∈ [0.0077, 0.0231]), where the Meeus parabola is unbounded.

**How ė is pinned (the (ė, s) degeneracy).** Only the product s·ė enters each
element's T², but node and perigee share one ė. (Historical rationale: node
theory was read as pinning s_Ω ≈ 1, so the node "measured" ė at 1.8%; the v4
frame attribution superseded this — the 1.8% was the ṗ_A frame term hiding,
the physical exponents are 0.867/2.479 from the lab at 101.5%/100.3%, and
both shipped values are now the Meeus-effective pair 1.018/2.407.) The
node-vs-perigee ratio structure still holds: one shared ė, and the
alternative — the H/16 perihelion law's ė at its current phase
(−0.84e-5/cy) — would force s_Ω = 5.1, excluded by theory (and was falsified
directly by the record; see the experiment log below). The shipped derived
line PREDICTS ė = −4.273e-5 (+1.7% of the measured value) with no anchor.
Falsification path — RESOLVED (v4 campaign): the first-principles derivation
exists, but for the PHYSICAL exponent, not the effective one. The 3-body
laboratory gives s_ϖ = 2.486 from pure gravity; the of-date record minus the
IAU frame acceleration ṗ_A requires 2.479 — agreement 100.3%. The shipped
2.407 is the frame-effective value (physical channel + ṗ_A absorbed), exact
vs Meeus by construction. The last anchored sensitivity is thereby
attributed, not fitted.

**Framework-native e_E: the fully-derived H/3 fluctuation.** The e_E behind
the rate channel, the E-factor, and the factored deep-time law is ONE
movement — the H/3 wobble cycle that also drives Earth's inclination —
expressed in eccentricity form with nothing solved and nothing fitted:

    e(t) = eccentricityBase · (1 + cos θ(t) / 2)
    θ(t) = 3 · (t − balancedYear) / H · 360° − 180°

Mean = Law 5's base, amplitude = base/2, and the phase is pure lattice
arithmetic: the inclination minimum falls exactly on the balanced year (the
System Reset convention), which fixes θ(J2000) = 81.178°. In anchor form
this is θ = ϖ_ICRF − 21.77°, and 21.77° is itself derived
(ϖ_ICRF(J2000) − 3·(2000 − balancedYear)/H·360° + 180° = 21.769°) — the
perihelion longitude cancels out of the channel phase entirely. Inputs:
base, balancedYear, H. Everything observational becomes a prediction:

- e(J2000) = 0.016566 (observed 0.0167102; −0.86%)
- ė(J2000) = −4.273e-5/cy (secular theory −4.204e-5; +1.7%)
- ë(J2000) = −3.7e-8/cy² (secular −2.5e-7; correct sign — the standing
  divergence, worth 0.2–0.4° of BCE argument drift, minutes of timing)
- E-factor at −135/−584: 1.0544/1.0657 (Meeus 1.0503/1.0601; 0.4–0.5%)
- bounded e ∈ [0.0077, 0.0231]; rate turning points at ≈ −23,200 and
  +32,700 (the ~±25-kyr boundedness emerges from the geometry); e-mean
  crossing ≈ 4739, locked to the inclination's own mean crossing.

Cross-checks: freely solving the line from the observed (e, ė) with the mean
held at base returns θ = 79.96° and A = 0.4936·base — the data reproduce the
derived structure unprompted. The certified predecessor line (same H/3
period, phase fitted at 78.6°, all three anchors consumed) is hereby derived
to ~1–2°. Frame interlock: read on the equinox clock instead of ICRF
(16 = 13 + 3), the same anchor construction gives an H/16-period line whose
rate-solved amplitude is eccentricityAmplitude × 1.046 and whose predicted ë
is best-in-class (−1.96e-7); it is retained as a research note — exact frame
equivalence would require base/amp = 32/3 (actual 11.35, a 6.4% gap).

Experiment log (what the record rejected before this form was found):
(a) the H/16 perihelion law itself in the channel (e-max 1246; today's slope
−0.84e-5, 5× under observed) — canon fell to 96.77/44.07/88.98, the
26-event audit acquired systematic BCE timing offsets (+26…+76 min), and
the timed Babylonian corpus rejected it (mean −26 / RMS 59 min) while,
notably, its BCE paths landed closest-ever to Babylon (303 km) and the
Halys region (122 km) — recorded as the T²-attribution clue; (b) a fixed
κ/5 rate — same failure class; (c) a value-exact amplitude 0.561·base —
+14% on ė, tablet RMS 42 min, and rejected structurally: the channel
quantity is not the osculating eccentricity (the H/16 orbit law owns the
observed J2000 value; the two curves crossed near year 1605 and meet again
only after tens of millennia), so anchoring the channel to today's value
would privilege our epoch.

Rationale for the single-line form: the framework's own L1 climate fit
carries NO Earth.Ecc line (the "eccentricity" 100-kyr band is attributed to
compound planet beats; the 405-kyr is absent in LR04), so geology does not
pin e_E — the lunar perigee channel is the e_E instrument. Divergent
framework prediction: deep-time e_max ≈ 0.023 (conventional secular theory:
≈ 0.067) — falsifiable. The earlier Laskar-band composite (equality-
constrained ridge fit, 21 coefficients, 405-kyr g₂−g₅ labeled OFF-lattice)
is SUPERSEDED and retained in code for A/B research only.

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

### 1.3 Post-hoc RA+Dec Override

The full Meeus ecliptic longitude (L' + Sigma_l) and latitude (Sigma_b) are
stored in moveModel. In updatePositions, both RA and Dec are overridden with
the Meeus-derived equatorial coordinates using ecliptic-to-equatorial conversion.

This bypasses the hierarchy's RA entirely, fixing the ~1.2-degree RA errors
that arose from the 5-layer precession approximation. The orbit ring still
shows the hierarchy path, while the Moon mesh shows the correct Meeus position.

---

## 2. Ecliptic Latitude Correction (Meeus Ch. 47)

### The Problem (historical) and the Stage-4b geometric fix

Historically the 5-layer hierarchy carried the 5.14° inclination tilt on the
nodal layer itself. In the scene's transform structure a layer's own Y-spin
cannot rotate its own tilt (tilts are static on `containerObj`; the animated
spin runs inside it), so the orbit PLANE followed only the parent rotations —
the node phase drifted against reality, the Moon's ecliptic latitude was wrong
by up to ~5°, and solar eclipses were invisible in the 3D scene. (An earlier
version of this doc attributed this to "a draconitic month of ~30.9 days"; the
measured effective value was the sidereal month, 27.32 d — same root cause,
different number.)

In the current scene composition the geometry is correct natively: the tilt lives on the
moon container (below the nodal layer's spin), the nodal layer regresses the
plane at the of-date 18.6132-yr period, the moon layer runs on the draconitic
(nodal-month) clock 27.2122209 d, and the layer sum equals the tropical month
by the exact integer identity N_drac = N_trop + N_nodI. The apsidal layer and
its canceller run at the of-date perigee rate (8.8476 yr — the same frame
choice as the nodal layer; count identity N_apsI = N_trop − N_anom), so the
visible ring's perigee tracks the Meeus perigee across epochs; the pair
cancels exactly, leaving the tropical-month sum untouched. The startPos values
are J2000-element anchored (Ω = 125.0446°, ϖ = 83.3532°, Δ = 0.0000° via the
in-sim anchoring meter). The Meeus latitude series below remains in place as
the source of the PERIODIC perturbation terms and continues to drive the
displayed position; the secular geometry no longer depends on it.

### The Solution (periodic terms via Meeus)

The Moon's ecliptic latitude beta is computed analytically using Meeus Ch. 47's
13-term Fourier series, using the argument of latitude F:

```
T = d / 36525    (centuries from J2000)
F = 93.2720993 + 483202.0175273 * T    (argument of latitude, degrees)
D' = 297.8502042 + 445267.1115168 * T  (mean elongation, per-century rate)

beta = (
  5128122 * sin(F)
+  280602 * sin(M' + F)
+  277693 * sin(M' - F)
+  173237 * sin(2D' - F)
+   55413 * sin(2D' - M' + F)
+   46271 * sin(2D' - M' - F)
+   32573 * sin(2D' + F)
+   17198 * sin(2M' + F)
+    9266 * sin(2D' + M' - F)
+    8822 * sin(2M' - F)
+    8216 * sin(2D' - M_sun - F)
+    4324 * sin(2D' - 2M' - F)
+    4200 * sin(2D' + M' + F)
) * 1e-6 degrees
```

The main term `5.128 * sin(F)` represents the basic 5.14-degree orbital
inclination. The remaining terms capture perturbations from the Sun's gravity.

### Application: Two-Stage Correction

The correction is applied in `updatePositions()` (not `moveModel()`) because
it needs the world matrices to be current.

**Stage 1 -- RA/Dec readout correction (post-hoc)**:

After computing the Moon's RA/Dec from its 3D world position, both RA and Dec
are replaced with the full Meeus values:

```
1. Compute ecliptic longitude lambda = L' + Sigma_l (stored in moveModel)
2. Compute ecliptic latitude beta = Sigma_b (stored in moveModel)
3. Convert ecliptic → equatorial:
   RA  = atan2(sin(lam)*cos(eps) - tan(bet)*sin(eps), cos(lam))
   Dec = asin(sin(bet)*cos(eps) + cos(bet)*sin(eps)*sin(lam))
4. Override both obj.ra and obj.dec
```

This gives accurate RA/Dec numbers (current baseline: RMS 0.0009° RA /
0.0008° Dec over 6,088 JPL reference points, 2000–2050).
The RA override eliminates the ~1.2-degree errors from the 5-layer hierarchy.

**Derived optics (D5).** The post-Meeus fitted correction `MOON_CORRECTION`
was decomposed (`tools/explore/derive-moon-correction-content.js`): 98–102%
of it is ANNUAL ABERRATION — the model frames carry apparent-Sun content
while the JPL reference is astrometric (Horizons QUANTITIES='1'). The
framework-native default now subtracts the aberration ANALYTICALLY
(`_moonAberrationRaDec` + tools mirror: u′ = normalize(u − v_E/c), with the
Sun vector itself framework-native — rates from the framework year + H/16
perihelion, equation-of-center from the Kepler identity) plus the small
residual `MOON_CORRECTION_RESIDUAL` (source of truth
fitted-coefficients.json; dominated by raCosMp −0.001421° = 5.1″, the
Meeus-vs-DE440 series-truncation class — the ONE genuinely fitted value
left; everything aberration-shaped ≤ 0.13″). A weighted refit against the
full 6,088-point baseline reproduces the shipped residual to 0.12″ —
already optimal. J2000 witness reference: RA 222.45959 / Dec −10.90333.

**Inclination convention (E3c).** The input `moonEclipticInclinationJ2000`
is the Moon's DYNAMICAL mean osculating inclination **5.1573°** (measured
from the theory itself: h-vector over 2 node cycles; oscillation range
[4.98°, 5.30°]); the Brown/ELP THEORY CONSTANT 5.1453964° (the latitude
sinF-coefficient normalization, 5.128122/0.99665) is kept as the documented
partner `moonInclinationConstantBrownELP`. Pure gravity maps between the two
at 0.01% (compression 0.9944). With the D1 lab calibrated on the dynamical
value, the latitude family closes: sinF 100.02% of Meeus (base3), full
system 99.96%. Caution note: the compact formula "1 − m²" reproduces the
compression to 1″ at the real Moon and was REFUTED as a theorem by m-scaling
(`tools/explore/v4-i-theorem.js`) — a parameter coincidence
((3/2)e_M² + sin²i/8 ≈ m² at our Moon); the analytic theorem needs a
leakage-clean estimator (open research).

**Stage 2 -- Visual 3D position correction**:

The Moon's `pivotObj.position` is updated to match the corrected RA/Dec, so the
Moon mesh appears at the physically correct position in the 3D scene:

```
1. Build corrected position from corrected spherical (same radius and RA, new Dec)
2. Transform: Earth equatorial local -> world (via earth.rotationAxis.matrixWorld)
3. Transform: world -> orbitObj local (via inverse of pivotObj.parent.matrixWorld)
4. Set pivotObj.position and rotationAxis.position to the result
```

Uses pre-allocated Vector3 and Matrix4 objects. No extra `updateWorldMatrix`
calls -- uses matrices already computed at the top of `updatePositions()`.
The renderer's auto matrix update propagates the change before drawing.

### Visual Effect

The orbit ring (child of orbitObj, sibling of pivotObj) shows the geometric
circular path dictated by the 5-layer hierarchy. The Moon mesh (child of
pivotObj) shows the Meeus-corrected position. The difference between the
ring and the Moon makes the gravitational perturbation effects visible --
the Moon's actual path deviates from its geometric orbit due to solar gravity.

---

## 3. Constants

Stored in `ASTRO_REFERENCE` in both `src/script.js` and `tools/lib/constants.js`:

| Constant | Value | Unit | Source |
|----------|-------|------|--------|
| moonMeanAnomalyJ2000_deg | 134.9634 | deg | Meeus Ch. 47 |
| moonMeanAnomalyRate_degPerDay | 13.06499295 | deg/day | Meeus Ch. 47 |
| moonMeanElongationJ2000_deg | 297.8502 | deg | Meeus Ch. 47 |
| moonMeanElongationRate_degPerDay | 12.19074912 | deg/day | Meeus Ch. 47 |
| sunMeanAnomalyJ2000_deg | 357.5291 | deg | Meeus Ch. 25 |
| sunMeanAnomalyRate_degPerDay | 0.98560028 | deg/day | Meeus Ch. 25 |
| moonArgLatJ2000_deg | 93.2720993 | deg | Meeus Ch. 47 |
| moonArgLatRate_degPerCentury | 483202.0175273 | deg/century | Meeus Ch. 47 |
| moonMeanElongationJ2000Full_deg | 297.8502042 | deg | Meeus Ch. 47 |
| moonMeanElongationRate_degPerCentury | 445267.1115168 | deg/century | Meeus Ch. 47 |

Note: Two sets of mean elongation constants exist. The per-day rates are used
for the longitude perturbations (computed from `d`). The per-century rates are
used for the latitude correction (computed from `T = d/36525`).

---

## 4. StartPos Values

Provenance: **J2000-element anchored** — the scene's node
and perigee longitudes are set to the Meeus J2000 elements (Ω = 125.0446°,
ϖ = 83.3532°) to Δ = 0.0000° via the in-sim anchoring meter, replacing the
earlier eclipse-optimizer compromise values (which were tuned under the
pre-Stage-4b geometry). Verified against the Step-5c eclipse RMS (0.8086°,
unchanged — that metric is Meeus-override-framed).

| Parameter | Legacy (optimizer-tuned) | Current (J2000-anchored) |
|-----------|--------------------------|--------------------------|
| moonStartposApsidal | 347.622 | 347.5544 |
| moonStartposNodal | -83.630 | 64.0436 |
| moonStartposMoon | 131.930 | 131.93 (deferred — the anchoring meter's L row reads the Meeus-overridden Moon, so this phase affects only the pre-override in-plane geometry) |

---

## 5. Accuracy

### Eclipse accuracy (frame-independent ground truth)
- 58 solar eclipses 2000-2025 (NASA GSFC catalog)
- RMS Moon-Sun separation: **0.81 degrees** (geocentric)
- 25 eclipses within 0.5 degrees
- Best match: 2020-Jun-21 annular eclipse at 0.11 degrees

### Geocentric parallax limit
- The 0.81-degree RMS is the **theoretical best** for geocentric coordinates.
- Solar eclipses are topocentric events. The Moon's parallax (~0.95 degrees)
  means the geocentric Moon-Sun separation at eclipse time is approximately
  |gamma| x 0.95 degrees, where gamma is the eclipse shadow offset.
- Pearson r(|gamma|, geocentric_sep) = 0.9945 (r^2 = 0.989)
- Residual RMS after subtracting expected parallax: **0.04 degrees**
- To improve beyond 0.81 degrees would require topocentric correction
  (accounting for the observer's location on Earth).

### JPL Horizons comparison (with IAU precession correction)
- RMS Total: **0.0012 degrees** (RA 0.0009 / Dec 0.0008) — current certified
  baseline after the D5 derived-optics implementation
- Entries: 6088 weighted reference points, 2000–2050

### Historical eclipse accuracy by era

Tested against solar eclipses from 584 BCE to 2024 CE using
`tools/explore/moon-ancient-eclipses.js`. Results:

| Era | Sep RMS° | Residual RMS° | ≤1.5° |
|-----|----------|---------------|-------|
| Modern (2000-2024) | ~0.8 | ~0.04 | 5/5 |
| 20th century (1900-1999) | ~1.0 | ~0.6 | 8/9 |
| 19th century (1806-1868) | ~1.5 | ~1.2 | 3/4 |
| 18th century (1706-1780) | ~2.5 | ~2.0 | 2/4 |
| 17th-15th century | ~3.5 | ~3.0 | 1/4 |
| Medieval (632-1261) | ~5+ | ~5+ | 1/5 |
| Ancient (584 BCE-484 CE) | ~8+ | ~8+ | 1/8 |

Accuracy degrades significantly before ~1900. This is expected given the
combined uncertainties described below. (These are raw geocentric
separations at catalog JDs from the exploration tool, without the
production ΔT machinery; the current authoritative deep-time accuracy
statement is the 26-event eclipse alignment audit — doc 103.)

### Consistency with Architecture α deep-time Moon model

The deep-time Moon model (Architecture α; see doc 99 and `docs/hidden/old-documents/IP-deep-time-extension.md`)
adds a Farhat 2022 polynomial for Moon orbital evolution:

```
a_Moon(t_Ma) = a_now × (1 + α₁·t_Ma + α₃·t_Ma³ + α₄·t_Ma⁴)
```

This polynomial is calibrated to deep-time anchors (Wells 1963 Devonian corals,
Wu et al. 2024 cyclostratigraphy 0–650 Ma, modern lunar laser ranging) and is
independent of the Meeus formulas. **The two are nevertheless physically
consistent at J2000** — the tidal component of the Meeus T² coefficient on
Moon mean longitude encodes the same lunar tidal acceleration that the Farhat
polynomial expresses analytically.

**Derivation from Farhat at J2000** (shipped LLR-anchored α₁):

```
da/dt|_J2000  = a_now × α₁ / 1e6
             = 384,399 km × (−9.9376e−5 /Ma) / 1e6
             = +3.82 cm/yr                    (LLR direct anchor, Dickey 1994 / Chapront 2002)

dn/dt|_J2000 = −1.5 × n × (1/a) × da/dt
             = −1.5 × 4,812.7 deg/yr × (3.82e-5 km/yr / 384,399 km)
             = −7.17e−7 deg/yr per year

n̈ (tidal) over 1 century² ≈ −25.8 arcsec/cy²
```

**Comparison with the LLR-observed tidal acceleration:**

| Source | n̈ (tidal) |
|--------|-----------|
| Framework chain (α₁ → Kepler) | ≈ −25.8 arcsec/cy² |
| LLR observation (Chapront 2002) | −25.86 arcsec/cy² |

The match to LLR is by construction — α₁ is anchored to the LLR recession —
but the Kepler chain closing to ~0.2% confirms the α₁ → da/dt → n̈ conversion
is implemented consistently.

**Comparison with Meeus's T² coefficient** — a different quantity:

```
Meeus L' = 218.3164 + 481267.88123·T − 0.0015786·T² + …
c (T² coefficient) = −0.0015786 deg/cy² = −5.68 arcsec/cy²
```

Meeus's c is NOT the tidal acceleration directly. ELP's mean-longitude T²
term is the sum of the tidal secular term (n̈/2 ≈ −12.9 arcsec/cy²) and the
planetary (non-tidal) secular term (≈ +7.2 arcsec/cy²), netting ≈ −5.7
arcsec/cy² — which is Meeus's coefficient. The Farhat chain and the Meeus
polynomial therefore agree through the *tidal component* of Meeus's T², with
the planetary term on top. The entanglement of the two in a single T²
coefficient is exactly what the framework-native fundamental arguments
resolve: the Lunar Precession Invariant carries the tidal MEAN rate, and the
bounded solar-eccentricity channel carries the oscillatory part (see §1,
framework-native form).

**Implication.** No refit of Meeus rates is needed for modern-era Moon position;
the two formulations are equivalent in their overlap domain (~modern era ±10
millennia). The Meeus polynomial is the better representation within this
window (it includes the full perturbation series, T³ and T⁴ refinements —
themselves now derived, see §1 — and matches JPL Horizons to 0.0012°). The Farhat polynomial extends the same physics
to deep time (Phanerozoic and beyond), where the Meeus polynomial loses physical
meaning. For deep-time Moon orbital position (Devonian, Hadean), replacing the
Meeus L' polynomial with `meanMoonMeanLongitudeAtAge(t_Ma)` from integrated
Farhat-derived mean motion would be required — but this is a future research
project, not a refit of the existing modern-era model.

**Status of integration.** The deep-time Moon distance (`meanMoonDistanceMetresAtAge`),
LOD evolution, and Moon sidereal period are exposed via the calculator and the
ESSRT modal. The 3D simulation's Moon orbit position still uses the J2000-anchored
Meeus polynomial, which is correct for the simulation's operational range.

---

## 6. NASA GSFC Eclipse Catalog: Computed, Not Observed

### The catalog is numerically computed

The NASA GSFC Five Millennium Canon of Solar Eclipses (-1999 to +3000) is
**entirely numerically computed**, not based on historical observations.

Sources used in the computation:
- **Sun position**: VSOP87 theory (Bretagnon & Francou, 1988)
- **Moon position**: ELP-2000/82 theory (Chapront-Touzé & Chapront, 1983),
  with some later corrections from ELP-2000/85
- **Earth rotation**: Delta-T extrapolation from historical records and
  models (Stephenson & Morrison, Morrison & Stephenson)
- **Besselian elements**: Computed from the above to predict shadow paths

The catalog predicts where eclipses *should* have occurred according to these
theories. It does not incorporate historical observations to verify or correct
its predictions.

### Three layers of uncertainty for ancient eclipses

**Layer 1: ELP-2000/82 lunar theory accuracy (NASA's polynomial)**

ELP-2000/82 is a semi-analytical theory fitted to the DE200 numerical
ephemeris. Its internal precision degrades with time distance from J2000:

| Era | T (centuries) | Longitude precision |
|-----|---------------|---------------------|
| 2000 CE | 0 | ~0.5 arcsec |
| 1000 CE | -10 | ~2-5 arcsec |
| 0 CE | -20 | ~10-30 arcsec |
| 1000 BCE | -30 | ~1-3 arcmin |
| 2000 BCE | -40 | ~5-10 arcmin |

The polynomial terms (T², T³, T⁴) in the fundamental arguments accumulate
errors for large |T|. The theory was designed for high accuracy near the
present epoch, not for millennia-scale extrapolation.

**Layer 1b: Meeus Ch. 47 (the framework's polynomial) — empirical accuracy at deep time**

The framework uses Meeus Ch. 47 (a truncated ~60-term form of ELP-2000/82)
via the `_eclMoonLon`, `_eclMoonBeta`, `_eclMoonDistance` helpers. Because
this is a truncation of the full ~37,000-term ELP-2000/82, its residual at
deep time can in principle exceed the Layer 1 floor at specific JDs.

Empirically, the -135 Babylonian case study (doc 103) tested this directly:
Meeus Ch. 47, ELP-2000/82 (both a 3,402-term truncation and the full
37,863-term series), and ELP/MPP02 (both DE-fit and LLR-fit variants) all
converge to β ≈ 0.706° at the -135 conjunction — within 0.001° of each
other, and consistent with NASA's γ = 0.7119. **The Moon polynomial is not
the source of the -135 residual.** Under the current 26-event eclipse
alignment audit (see
[Historical Solar Eclipse Validation](https://holisticuniverse.com/model/historical-eclipse-validation)
and [doc 103](103-135-babylonian-case-study.md)), -135 reports BestGap
BestGap 1221 km (geographic verdict, at the regional boundary; audit
history: 949 km legacy arguments → 1032 → 1088 → 1221 across the
certified batches) with the framework's predicted UT within 16 minutes of
the documented UT — a *where* residual carried by Sun-side longitude, GMST
convention, and umbra geometry, primarily not a *when* residual and
not a Moon-series error. The Babylonian-era Meeus residual sweep of
adjacent events (-584 Thales, -309 Sicily, -762 Bur-Sagale) shows β
differences ≤ 0.12° against the same references.

**DE441 A/B result (historical, infrastructure since removed):** a full A/B
of the 26-event audit with JPL DE441 lunar positions injected in place of
the framework Meeus series (session notes archived at
`docs/hidden/old-documents/session-2026-07-19-jup1740-de441-h-tuning.md`)
found mean Δ = −7 km ("unchanged") with a clean epoch pattern: modern era
slightly worse under DE441 (the framework Meeus is tightly calibrated at
present), late-ancient (+71…−430) worse by +206…+1133 km (framework ΔT
convention closer to observation), deep-ancient (−556…−762) better by
−253…−1139 km (e.g. −762 Nineveh 386 → 92 km; −584 Thales 1402 → 306 km) —
quantifying the Meeus-truncation degradation past its calibration horizon
at the few-hundred-km class. The Cairo 977–985 cluster moved < 120 km
under DE441 — NOT a Moon problem (misidentification/partial-zone/Sun-side).
(Numbers are from the pre-D5 audit references; the qualitative pattern is
the durable finding.)

**Forward path:** the full ELP-2000/82 series
([`docs/hidden/old-documents/IP-elp2000-moon-polynomial.md`](hidden/old-documents/IP-elp2000-moon-polynomial.md))
remains available as a general deep-time precision option, but the -135
test shows all modern lunar theories agree at the audited epochs, so it is
not blocking and fixes no audited event. The framework-native fundamental
arguments are the shipped default (§1): the Meeus M′/F T²⁺ polynomial physics
is expressed through the framework's own channels, and the "Meeus vs
Integrator (lunar argument drift)" test button confirms closure (M′ ≤ 0.015°
at −584, versus the ≈ +1.4°/century drift of the raw ICRF-rate comparison).
The remaining argument-level item is framework-native D/M (tracked in TODO).

**Layer 2: Delta-T (Earth rotation) uncertainty**

Delta-T = TT - UT1, the difference between uniform atomic time and Earth's
variable rotation. It directly affects *where* on Earth an eclipse is visible
and slightly affects *when* the eclipse occurs.

| Era | Delta-T uncertainty | Geographic shift |
|-----|--------------------|--------------------|
| 2000 CE | < 1 second | negligible |
| 1900 CE | ~1 second | ~0.4 km |
| 1000 CE | ~300-600 seconds | ~200+ km |
| 0 CE | ~1200-1800 seconds | ~500+ km |
| 1000 BCE | ~3000-5000 seconds | ~1000+ km |

Before ~700 BCE, there are no direct Delta-T measurements at all. Values are
extrapolated using tidal deceleration models with large uncertainties.

**Layer 3: Combined effect**

For ancient eclipses, the NASA catalog's predictions are the output of theories
extrapolated far beyond their validated range, using a Delta-T model with
large uncertainties. The fact that our model disagrees with the catalog for
ancient dates does not necessarily mean our model is wrong -- it may equally
mean the catalog's extrapolations are unreliable.

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

Key insight: these observations constrain *that* an eclipse occurred on a given
date, but rarely provide precise timing (to hours). Since the Moon moves ~0.5°
per hour, timing uncertainty of ±3 hours translates to ±1.5° position error.

### Implications for this model

1. **Modern era (2000-2025)**: Our 0.04° residual RMS confirms the Meeus
   Ch. 47 implementation is correct. The 0.81° raw RMS equals the theoretical
   geocentric parallax limit.

2. **Historical era (before ~1900)**: Degraded accuracy is expected and shared
   by all analytical lunar theories. Our model uses Meeus Ch. 47 (based on
   ELP-2000/82), so it inherits the same limitations as the NASA catalog.

3. **Opportunity**: A tool like this model, with its interactive 3D
   visualization and fast computation, could help lunar scientists develop and
   validate improved perturbation series. The table-driven architecture
   (60 longitude + 60 latitude terms) makes it straightforward to test
   alternative coefficient sets or additional terms.

---

## 7. Files Modified

| File | Changes |
|------|---------|
| `src/script.js` ~line 881 | ASTRO_REFERENCE constants |
| `src/script.js` ~line 2606 | `lunarPerturbations: true` on Moon object |
| `src/script.js` ~line 29259 | Longitude perturbations + Meeus latitude in moveModel |
| `src/script.js` ~line 29008 | Post-hoc Dec correction + visual position correction in updatePositions |
| `tools/lib/constants.js` ~line 218 | ASTRO_REFERENCE constants |
| `tools/lib/scene-graph.js` ~line 458 | `lunarPerturbations: true` on moonDef |
| `tools/lib/scene-graph.js` ~line 555 | Longitude perturbations + Meeus latitude storage |
| `tools/lib/scene-graph.js` ~line 715 | Post-hoc Dec correction in computePlanetPosition |

---

## 8. Eclipse Validation Tool

`tools/explore/moon-eclipse-optimizer.js` -- Computes Moon-Sun separation at 58
known solar eclipses (2000-2025) and optionally optimizes startPos values to
minimize the RMS separation. Eclipse JD values from NASA GSFC eclipse catalog.

`tools/explore/moon-error-analysis.js` -- Compares Moon position against JPL
Horizons with 7-day sampling over 2 years.

`tools/explore/moon-ancient-eclipses.js` -- Tests Moon-Sun separation at
historical and ancient solar eclipses from 584 BCE to 2024 CE, organized by
era (Modern, 20th century, 19th century, 18th century, 17th-15th century,
Medieval, Ancient). Shows how accuracy degrades with time distance from J2000.

`tools/explore/moon-parallax-analysis.js` -- Proves the 0.81° RMS at modern
eclipses is the geocentric parallax limit. Correlates Moon-Sun separation with
NASA gamma parameter (Pearson r=0.9945). Shows residual RMS of 0.04° after
subtracting expected parallax.

`tools/explore/moon-full-meeus-test.js` -- Standalone test comparing 3
configurations (current model, full Meeus Moon + model Sun, full Meeus
standalone) to confirm the 0.81° RMS is configuration-independent.
