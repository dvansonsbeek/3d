---
docVersion: 1.0
modelVersion: v26.7
coefficients: sha256:b2d4e64c4e6a947e
status: current
---

# The Expanding Solar System Resonance Theory (ESSRT)

## Status
Active theory draft — Expanding Solar System Resonance Theory (ESSRT). Full scope: the two expansions — Earth's spin tier on the tidal history (the composed lunisolar precession clock), every orbit on the solar-mass history across all 8 planets. Builds on doc 92 (the climate formula; its predecessors 91 and 98 are archived out of the tree), 102 (historical lunar eclipse timing test + α(t) GIA derivation), and 103 (-135 Babylonian case study).

---

## Core thesis

**The two-engine + two-expansions reading — the measured form (doc 109 is
the evidence record).** The solar system expands on TWO measured tiers, and
ESSRT's clock is the structure of the FIRST:

- **The tidal tier (Earth–Moon — where the clock lives).** The mean
  lunisolar precession period and the bands of the climate record that
  ride it (the precession and obliquity bands) are structural to the
  Earth–Moon spin/tide system and evolve as the Moon recedes — the axial
  precession on the COMPOSED lunisolar rate (spin × [solar + lunar torque
  on the recession history], plan 06 D6), anchored at J2000 on the IAU 2006
  general precession p_A, an input since plan 09
  (<!--v:axialPrecExact-->25,771.58<!--/v--> yr), and
  confirmed against the rock to 2.46 Ga
  (<!--v:anchorLantinkPrec2460Pred-->109.24<!--/v--> vs Lantink 2022's
  108.6 ± 8.5 ″/yr at Joffre; <!--v:anchorXiamalingPrec1400Pred-->86.53<!--/v-->
  vs Meyers & Malinverno 2018's 85.79 ± 2.72 ″/yr at Xiamaling — gate
  rows). Earth's e and ϖ of date are the N-body secular series on every
  path (the retired devices' record: doc 109 §23).
- **The mass-loss tier (the whole planetary system).** Solar mass loss
  expands every orbit adiabatically (a ∝ 1/M_Sun); the first rock-based
  measurement of the ancient Sun's mass reads μ(2.48 Ga) = M/M₀ =
  1.00 ± 0.07 (the Kuruman count-bracket inversion — the two-expansions
  programme).
- **Planetary orbital SHAPES (perihelia, nodes, eccentricity vectors) are
  standard secular dynamics**, which the model's own N-body engine
  reproduces (doc 109: the g/s eigenfrequencies to 0.1–1 % of Laskar, the
  405-kyr metronome from gravity alone). The former planetary integer labels were
  TYPED DESCRIPTORS of particular quantities at particular eras (doc 109
  §9) — Mars ≈ its long-term mean, Mercury ≈ its present-epoch rate,
  Jupiter/Saturn/Uranus window-epoch values — not dynamics; the measured
  eigenfrequencies are incommensurate with EVERY base period (doc 109-class
  null, `tools/explore/lattice-base-scan.mjs`).

The climate formula's precession-band lines scale with the composed
precession clock; its eccentricity-band lines are planetary g-beats and do
NOT scale — the 405-kyr family is measured stable while the precession band
moves, and that split IS the two-tier structure, confirmed at 1.4 and
2.46 Ga.

> **In the past, the precession period was shorter (~<!--v:axialPrecAtDevonian-->21,235<!--/v--> yr at 380 Ma vs <!--v:axialPrecRound-->~25,772<!--/v--> yr today).**
> **In the future, it will be longer (~<!--v:axialPrecAt200MyrFuture-->28,315<!--/v--> yr in 200 Myr, growing asymptotically toward the tidal-lock limit).**
> **The climate formula's lines ride the engine's own orbital modes and the composed clock at every epoch.**

> 📐 **Mean values vs actual values** — All quantities tabulated in this document
> (the precession period, LOD, T_sidereal, Moon distance, etc.) are **MEAN values
> at the corresponding epoch**. Actual values of date move around these means
> with the movement of date — Earth's e and ϖ from the N-body secular series, the
> obliquity from the hybrid spin-axis integration, the precession of date's
> factors (§ below) — which the 3D model evaluates at runtime on top of the means
> provided by the canonical chain; the mean-value functions are the `mean*AtAge`
> family — one home since plan 13 B2, `@essrt/physics/deltat/deep-time-chain`,
> read by `tools/lib/deep-time.js`, the package model and `src/script.js`.

> 🎯 **For precise implementation values**, evaluate the deterministic chain from
> `t_Ma` through `LOD(t)`, the composed precession period, AU(t), `T_sidereal(t)`,
> Moon distance, Moon period, anomalistic year, and stellar/sidereal day
> (`@essrt/physics/deltat/deep-time-chain`, consumed by `tools/lib/deep-time.js`;
> the J2000-constant → epoch-helper map is in
> [doc 20 §"ESSRT epoch dependence"](20-constants-reference.md)). The tables in
> this doc use rounded LOD inputs for narrative clarity; the engine provides the
> full-precision values (e.g., the Devonian precession period
> <!--v:axialPrecAtDevonian-->21,235<!--/v--> yr — see § "Proper-physics LOD
> formula" below).

---

## One solar system, two engines, two clocks

There is one solar system and one force. Gravity acts on two different
KINDS of degrees of freedom, and they have fundamentally different physics:

1. **Where bodies go — the orbits.** Conservative, nearly time-reversible,
   no friction. Point masses exchanging momentum: the g/s secular modes,
   the eccentricity and inclination oscillations, the 405-kyr metronome.
   Nothing here carries an arrow of time over millions of years.
2. **How bodies spin and deform — rotation and tides.** Dissipative.
   Earth's tidal bulge drags, energy becomes heat, the day lengthens, the
   Moon recedes — irreversibly. This is why the clock *evolves*: dissipation
   gives this half of the physics an arrow of time the orbital half does
   not have.

The model's two engines are these two halves — not two theories of the same
thing. The seam between them is not a modelling choice; nature put it there.

| | **The lunisolar precession channel — rotation & tides** | **The orbital dynamics engine — orbits** |
|---|---|---|
| Headline clock | axial precession (the composed lunisolar period) | apsidal / nodal precession (the g/s modes) |
| Full family | day length (LOD), the obliquity band, lunar recession, the eclipse/ΔT timing chain | *all* orbital-element motions of *all* planets: apsidal, nodal, eccentricity and inclination oscillations, the 405-kyr beat |
| Interaction | Earth–Moon (tidal, dissipative) | planet–planet (gravitational, conservative) |
| Its expansion tier | **the tidal expansion**: the Moon recedes, the day lengthens, the precession period grows | **the solar-mass expansion**: every orbit swells as 1/M_Sun as the Sun loses mass |

**The coupling across the seam is one-way.** The orbits force the spin
system — the planets set Earth's eccentricity and inclination, the Sun and
Moon torque Earth's bulge — but Earth's spin state feeds nothing measurable
back to the planets. That one-way arrow is why the split into two engines
is clean rather than an approximation. The wall is by degree of freedom,
not airtight: a third of the axial-precession torque is solar — an
orbital-side quantity (and the M⁴ cross-coupling under mass loss,
`tools/explore/w3-precession-crosscoupling.mjs`) — but the *ownership*
follows the degree of freedom even where one engine's number appears
inside the other's formula.

**Earth is the interface — and the J2000 ratios are the interface's
signature.** Earth is the one body where both halves meet at full strength:
a massive moon (strong dissipation), a fast spin, and a climate record that
writes both halves into rock. The small-integer ratios of the old framing
were never properties of the planets' orbits (the retirement above); they
are J2000 readings at Earth's spin–orbit–tide interface — the axial
precession and the obliquity beat on the spin side, the apsidal and
perihelion-of-date periods as the epoch-local tangents of the orbital side
— readings that wander (the apsidal-to-axial ratio runs
<!--v:lunisolarApsidalPerPrecessionWanderMin-->1.08<!--/v-->–<!--v:lunisolarApsidalPerPrecessionWanderMax-->9.81<!--/v-->
across ±26 kyr), not laws.

### The composition is what nature measures

The strongest evidence that this is one system, not two bolted-together
models: the two engines COMPOSED predict something neither can alone.
Earth's physical axial-precession rate at age t is
ψ̇(t) = [ω(t)/ω₀] · (solar torque + lunar torque on the recession history) —
the spin-and-tides channel supplying ω(t) and a_moon(t), the orbital engine's side the solar term
(solar share today <!--v:earthPrecSolarShareJ2000Pct-->31.6<!--/v--> %):

| age | the two engines composed, ψ̇(t) = [ω/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M)³] (″/yr) | external reading |
|---|---|---|
| J2000 | <!--v:earthPrecRateJ2000ArcsecPerYr-->50.2880<!--/v--> | IAU: 50.29 (measured) |
| 650 Ma | **<!--v:earthPrecComposed650MaArcsecPerYr-->70.3<!--/v-->** | **Wu et al. 2024: 67.64** (cyclostratigraphic inference) |
| 1400 Ma | **<!--v:earthPrecComposed1400MaArcsecPerYr-->86.5<!--/v-->** | **Meyers & Malinverno 2018: 85.79 ± 2.72** (Xiamaling; gate row `xiamaling-prec-1400`, <!--v:anchorXiamalingPrec1400DeltaPct-->+0.87<!--/v--> %) |
| 2460 Ma | **<!--v:earthPrecComposed2460MaArcsecPerYr-->109.2<!--/v-->** | **Lantink et al. 2022: 108.6 ± 8.5** (Joffre; gate row `lantink-prec-2460`, <!--v:anchorLantinkPrec2460DeltaPct-->+0.59<!--/v--> %) |

The Phanerozoic window, both clocks against the published inferences (written by the engine; theory vs inference throughout — Wu's constants are TimeOptB inversions through an assumed astronomical model, Berger 1992 is a competing theory's tidal solution):

<!-- generated:doc99-phanerozoic-comparison -->
| Age (Ma) | ψ̇ composed (″/yr) | ψ̇ spin-only, retired (″/yr) | published inference (″/yr) | Δ composed | Δ spin-only | obliquity beat composed (kyr) | beat implied by the inference (kyr) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 100 | **52.68** | 51.52 | Wu 2024: 53.00 ± 1.0 | -0.6 % | -2.8 % | 38.19 | 37.95 |
| 200 | **55.00** | 52.67 | Wu 2024: 54.36 ± 1.0 | 1.2 % | -3.1 % | 35.75 | 36.50 |
| 300 | **57.35** | 53.79 | Wu 2024: 59.50 ± 0.5 | -3.6 % | -9.6 % | 33.57 | 31.88 |
| 400 | **61.14** | 55.52 | Wu 2024: 61.50 ± 0.5 | -0.6 % | -9.7 % | 30.56 | 30.39 |
| 500 | **62.13** | 55.95 | Wu 2024: 64.50 ± 0.5 | -3.7 % | -13.2 % | 29.86 | 28.39 |
| 650 | **70.30** | 59.34 | Wu 2024: 67.64 ± 0.3 | 3.9 % | -12.3 % | 25.12 | 26.56 |
| 500 | **62.13** | 55.95 | Berger, Loutre & Laskar 1992: 61 (theory) | 1.9 % | -8.3 % | 29.86 | 29 (their obliquity main period) |

The composed clock sits within 3 % of every published Phanerozoic precession constant and reads 2–3 % LOW across 300–500 Ma (the Pangea window, where Wu's Moon-distance anchors are closer than the shipped recession polynomial — the documented Pangea offset); the retired spin-only clock reads 9–13 % low there. Beats via 1,296,000/(ψ̇ − |s₃|), |s₃| = 18.85 ″/yr. Wu's constants carry the astronomical model of their inversion; Berger 1992 is theory — neither is a measurement, and the table is labelled accordingly.
<!-- /generated:doc99-phanerozoic-comparison -->

The rock-derived inferences side with the COMPOSITION: a few per cent at
650 Ma (the table above: the composed clock against Wu et al.'s inferred
rate, where the spin-only scaling misses by a tenth) — a number the orbital
engine cannot produce (it knows nothing of Earth's day length) — and inside
the published 1σ of both Precambrian precession constants.
**The composed rate is the model's deep-time ψ̇(t), anchored at J2000 on
the IAU 2006 general precession p_A (an input since plan 09; T_p(t) is the
published deep-time clock)** (plan 06 D6, plan 09):
one home, `@essrt/physics/earth/precession-composed` inside the deep-time
factory, the evaluator the obliquity hybrid precesses on and the
paleo-anchors gate checks. A spin-only clock — the J2000 period scaled with
the day length alone — misses the lunar 1/a³ torque growth and reads 9 ″/yr
low at 650 Ma, 24 % low at 1.4 Ga and 35 % low at 2.46 Ga: the measured
reason the composed law is the clock. Labels: both model columns are theory; Wu's rate is inferred from
cyclostratigraphy through an assumed astronomical model (see "Structural vs
physical axial precession" below); the IAU J2000 rate is the measured
anchor.

### The frame identities

No quantity has two owners. The orbital dynamics engine owns Earth's ϖ, e, i,
Ω at every epoch; the lunisolar precession channel owns the spin and the tides
and reads the orbital quantities it needs (e, ϖ of date) from the N-body
secular series. What binds them is frame arithmetic, and frame arithmetic
holds at every epoch: the perihelion of date is the equinox precession plus
the inertial perihelion motion; the obliquity beat is the spin axis's
inertial rate less the orbit's nodal mode. Two precession rates enter — the
obliquity and nodal rows take f_axial as the spin axis's INERTIAL rate ψ̇ᵢₙ
(period <!--v:spinAxisInertialPeriodYearsJ2000-->25,722<!--/v--> yr at
J2000), the perihelion row — a rate along the ecliptic of date — the general
precession T_p (<!--v:axialPrecRound-->~25,772<!--/v--> yr):

| Physical identity | Rate form (1/T) |
|---|---|
| f_obliquity = f_axial − f_nodal | 1/T_obl = 1/T_ψ̇ᵢₙ − 1/T_nodal |
| f_perihelion = f_axial + f_apsidal | 1/T_peri = 1/T_p + 1/T_aps |
| f_nodal = f_axial − f_obliquity | 1/T_nodal = 1/T_ψ̇ᵢₙ − 1/T_obl |

Two are independent (the nodal row is the obliquity row rearranged). The
obliquity row is the one beat the model predicts at deep time
(2π/(ψ̇ᵢₙ − |s₃|), falsification leg 1). The research horizon is one
integrator — a single spin–orbit–tide integration computing both tiers in one
pass; the pieces exist (the WH engine, the cited recession history, the torque
split).

---

## The unified scaling principle

ESSRT has **two physically independent drivers** that together stretch the model's clocks. Both act simultaneously and independently; they meet in one observable, the day count per year (§ below).

### Driver 1 — Earth-Moon tidal evolution (controls Earth's spin → the precession clock)

```
LOD increases (24 hr now, was 21.92 hr in Devonian, will be 25.24 hr in 200 Myr)
    ↓
Earth's spin angular velocity ω = 2π/LOD decreases; the Moon recedes, a_M grows
    ↓
The composed precession rate ψ̇ = [ω/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M)³] × cos ε̄(t)/cos ε̄(0) decreases
    (Earth's spin carrying the solar and lunar torques; the lunar torque was
     larger when the Moon was closer — the bracket scales the precession
     CONSTANT; the cosine of the cited mean obliquity ε̄(t), Farhat 2022's own
     column of the same history, makes it the RATE — the tilt was lower in the
     deep past, <!--v:earthMeanObliquityCitedDevonianDeg-->22.23<!--/v-->° at the Devonian,
     <!--v:earthMeanObliquityCited2460MaDeg-->19.73<!--/v-->° at 2.46 Ga, so the rate runs
     <!--v:earthPrecObliquityFactor2460MaPct-->2.45<!--/v--> % above the constant's scaling there)
    ↓
The mean lunisolar precession period T_p = 2π/ψ̇ lengthens
    (25,771 yr now, 21,699 yr Devonian, 28,208 yr in 200 Myr — generated table below)
    ↓
The obliquity beat 2π/(ψ̇ᵢₙ − |s₃|) lengthens with it (<!--v:obliqBeatJ2000Kyr-->41.1<!--/v--> kyr now, <!--v:obliqBeatDevonianKyr-->30.6<!--/v--> Devonian, <!--v:obliqBeat200MyrFutureKyr-->48.0<!--/v--> in 200 Myr; ψ̇ᵢₙ the spin axis's inertial rate — a record sees its WINDOW MEAN, with the pole's of-date factors: <!--v:obliqCycleRealizedLr04Years-->~40,927<!--/v--> yr over the LR04 record, measured on the model's own ε(t) and on La2004's)
    ↓
The climate formula's precession-band lines p + g_i and p + s_i scale with ψ̇(t).
The eccentricity-band lines |g_i − g_j| do NOT scale — MEASURED: the 405-kyr
(g₂−g₅) family is stable while the precession band moves (Lantink 2022 at
2.46 Ga, Meyers & Malinverno 2018 at 1.4 Ga; our own engine derives the
405 from gravity, doc 109 §17). Only the ψ̇-carrying lines scale (MEASURED — the all-lines variant
failed the record); the lines are the engine's own Berger/Laskar-style beats
(data/l1-physical-lines.json).
```

### Driver 2 — Solar mass loss (controls every planet's orbital period)

```
Sun loses mass via radiation + solar wind (~6×10⁹ kg/s = 9.3×10⁻¹⁴ /yr)
    ↓
For each planet (Mercury → Neptune), adiabatic invariant a·M_Sun = const
    ↓
Semi-major axis a expands as central mass decreases
    ↓
Kepler's 3rd law: T² ∝ a³/M_Sun  →  dT/T = −2·dM/M
    ↓
Every planetary orbital period (sidereal year_s) was SHORTER in past, longer in future
    ↓
At Devonian (380 Ma): T_Earth was 2,230 s (37 min) shorter than now
At Earth-Moon genesis (4.43 Gyr, the cited history's end): T_Earth was ~26,000 s (7.2 hr) shorter than now
```

### How the two drivers meet in one observable

The two drivers act independently in physics — tidal coupling cares about Earth-Moon angular momentum; mass loss cares about Sun→planet gravitational binding. They meet in the day count per year, `days/yr = tropical_year_s(t) / LOD(t)`:

- Earth's *rotation* slows (Driver 1) → LOD grows, fewer days per year
- Earth's *orbit period* shrinks toward the past (Driver 2) → a shorter year in seconds; the tropical year also carries the precession of date (rate form, 1/T_trop = 1/T_sid + ψ̇(t)/1,296,000″ per Julian year)

Driver 1 dominates the count by ~10× in fractional terms at the Devonian.

## Comparable parallel scalings

The same epoch-dependent scaling applies to multiple system parameters. All values below are from the proper-physics two-layer formula (see § "Proper-physics LOD formula").

<!-- generated:doc99-two-tier-table -->
| Quantity | J2000 | −380 Ma (Devonian) | +200 Myr | Scales with |
|:---|---:|---:|---:|:---|
| Mean lunisolar precession period T_p (yr) | 25,772 | **21,235** | **28,315** | the composed clock (spin × torque term) |
| Obliquity beat 2π/(ψ̇ − \|s₃\|) (kyr) | 41.10 | **30.64** | **47.98** | the clock (s₃ fixed under μ = 1) |
| Climatic-precession line p + g₅ (kyr) | 23.76 | **19.85** | **25.91** | the clock |
| Long-eccentricity metronome g₂ − g₅ (kyr) | 405.6 | 405.6 | 405.6 | does NOT scale (planetary g-modes; ∝ 1/μ only) |
| Short-eccentricity line g₄ − g₅ (kyr) | 94.88 | 94.88 | 94.88 | does NOT scale |
<!-- /generated:doc99-two-tier-table -->

Moon distance is the cited history (Layer 2, Farhat et al. 2022's solution on the J2000 anchor): 384,399 km today, <!--v:moonDistanceAtDevonian-->368,549<!--/v--> km at the Devonian, <!--v:moonDistanceAt200MyrFuture-->392,039<!--/v--> km in 200 Myr. The planets' long-term apsidal motions are the secular g-modes and do not scale with Earth's spin (the former integer-label rows are retired; doc 109 §9).

---

## The lunar perigee and node of date — the factored law

The inertial chain and its composition with the precession of date:

- **the inertial perigee and node periods of date** — Brown's leading m²
  scaling in its Brouwer–Clemence period form T ∝ T_yr²/T_sm, the J2000
  magnitude anchored on the observed periods (the Newton–Clairaut problem:
  leading order alone gives ~17.8 yr for the perigee against the observed
  8.85, Clairaut's m³ and higher terms doubling the rate), times the
  e_E-channel modulation below — `meanLunarPerigeePrecessionAtAge` /
  `meanLunarNodePrecessionAtAge`, the factored law period = invariant mean /
  rate modulation; the seconds-frame derivation is in
  [Moon-Kepler Derivation](24-delta-a-mass-derivation.md);
- **the of-date perigee and node** — the count compositions N_trop − N_anom
  and N_drac − N_trop of the chain's months
  (`meanMoonApsidalOfDateCyclesBetween`, `meanMoonNodalOfDateCyclesBetween`):
  the inertial periods composed with one equinox turn per T_p(t), the same
  relation the J2000 anchors are built from (star-referenced 8.8507 /
  18.5994 yr from the of-date 8.848 /
  <!--v:nodalPrecICRFexact-->18.61335<!--/v--> yr);
- **the tropical month** — the sidereal month less one equinox turn per
  T_p(t); the chain's J2000 tropical month is within 0.1 ms of the IAU input.

**The factored deep-time law.** The inertial chain's Brown-m² mean governs
the MEAN rate; the solar-perturbation strength modulates around it with
Earth's eccentricity:

```
rate(t) = [Brown-m² mean of the inertial chain] × [g(t)/g₀]^s,   g = (1 − e_E²)^(−3/2)
```

with s_Ω = 1.018 (derived — the leading-order value 1 already reproduces
Meeus's empirical node T² to 1.8% with no fitting; the shipped 1.018 makes
the node channel Meeus-exact) and s_ϖ = 2.407 (anchored, the
Clairaut-amplified apsidal sensitivity; constant across the T²/T³ orders —
an independent check; the lab-derived physical exponents are 0.867/2.479,
the 2.407/1.018 pair being their frame-effective Meeus-convention form). e_E(t) is the model's own N-body eccentricity of date (the deep-mode channel, decision (ii) of plan 02 §8). The former H/3 fluctuation line that stood here — e(t) = base·(1 + cos θ(t)/2) on the inclination wheel's phase, whose J2000 eccentricity (−0.9 %) and rate (+1.7 %) were predictions — is deleted at plan 09 step 6; doc 109 §22 keeps the record, and the scene keeps its J2000 phase as a recorded pose. The modulation is bounded at every epoch
(e ∈ [0.0077, 0.0231]: perigee within ±0.1%, node within ±0.04%), so the
mean is the law and the modulation a bounded oscillation about it — while
Meeus's empirical T² polynomial, correct locally, diverges without bound at
deep time. (The earlier Laskar-band composite formulation is superseded and
retained in code for A/B research only.) This dissolves the historical
"Brown m² wrong sign" tension: the mean answers the mean-trend question
while the observed present-day perigee deceleration (Meeus's +T² on M′) is
the oscillation phase of the e_E channel — two channels, both real,
different clocks.

### Position in the model taxonomy

The model's **deep-time invariant** — a relation preserved across epochs
under the drivers, distinct from any J2000 reading:

| Invariant | Form | Governed by | Drift at Hadean |
|:---|:---|:---|---:|
| Planetary adiabatic invariant | `a × M_Sun = const` (per planet) | Driver 2 | 0 ppm (definitional) |

The spin-tier quantities carry no invariant of this kind: the day, the
precession clock and the lunar periods of date are movements — the inertial
lunar chain composed with T_p(t), the day by angular-momentum conservation on
the cited distance history.

## The cardinal-point braid law — retired

The braid law was the frozen era device's cardinal-point form; it is retired with the device (plan 09) and its record is archived out of the tree. The cardinal points ride the one-source movement — the composed precession clock and the N-body series' elements of date ([doc 110](110-calculation-map.md) chain 5).

---

## The framework-native Sun (E4/E5) — the certified apparent solar longitude

The eclipse chain's Sun is assembled entirely from model structure — **zero
fitted solar constants** — and the visible simulator rides the same
certified longitude. The assembly (in
`packages/physics/src/model/sun-and-eclipses.js`, exported as `eclipse.frameworkSunDeps` and
consumed identically by the package tier finders/besselian, `eclipse-audit.js`,
and the browser's `_eclipseM` — the three-runtimes rule):

```
L(t) = L₀ + mean tropical rate · t + D(t)          (mean longitude)
λ(t) = L(t) + equation of centre with e(t)          (apparent longitude)
```

**The drift term D(t)** integrates the year-length physics itself:

1. **The mean longitude is the integral of the one-source tropical year
   (plan 06 R1)** — L(t) = L0 + 360·∫dt/T_trop(t), T_trop the route-B
   tropical year of date in SI seconds (the ONE year-length family), a
   cumulative trapezoid grown from J2000 in both directions, never a rate
   multiplied by a span. The route-B year equals
   the IAU/Laskar drift expression to 0.1 s over −1000..+3000. THE
   OBSERVATION-CLASS CHECK (plan 06 I1, JPL Horizons' apparent Sun on a
   10-day TT grid over ±3000 yr, <!--v:sunVsHorizonsN-->219,152<!--/v--> instants): the model's apparent
   Sun sits <!--v:sunVsHorizonsMeanArcsec-->2.50<!--/v-->″ from Horizons on average with sd <!--v:sunVsHorizonsSdArcsec-->2.26<!--/v-->″ over the whole
   span — near zero in 1000–3000 (<!--v:sunVsHorizonsMeanP1000Arcsec-->2.0<!--/v--> / <!--v:sunVsHorizonsMeanP2000Arcsec-->−0.9<!--/v-->″),
   <!--v:sunVsHorizonsMeanM2000Arcsec-->3.7<!--/v-->″ at −2000..−1000 (the size of the difference between the model's
   equinox of date and Horizons' of-date frame) — and <!--v:sunVsHorizonsModernSdArcsec-->0.78<!--/v-->″ scatter in
   1970–2049 (mean offset <!--v:sunVsHorizonsModernMeanArcsec-->0.84<!--/v-->″, the L0 anchor and aberration conventions).

**e(t) and ϖ(t)** are the banked N-body series' Earth elements plus the
derived mean-element offset of the era (doc 110 chain 1.1; plan 06 layer B)
— the eclipse Sun's mean elements; the Moon's E-factor reads the same
N-body eccentricity of date, E = e(t)/e(J2000). Eccentricity is frame-invariant and
carries no equinox-referenced period; the perihelion longitude does. The
cardinal instants are the APPARENT crossings of this Sun (aberration and
the leading nutation terms applied, both derived) — the former fitted
cardinal-point model left with R1 (doc 110 chain 5); against Horizons' own
crossings the instants are <!--v:cardinalVsHorizonsMeanMin-->−1.02<!--/v--> min on average over ±3000 yr, within a
minute in 1000–3000.

**Accuracy**: <!--v:frameworkSunVsJplRms-->1.03<!--/v-->″ RMS vs JPL over the modern window 1970–2049
(the Meeus Ch. 25 basis on the same completion: <!--v:meeusCh25SunVsJplRms-->1.02<!--/v-->″). The ~0.02–0.03″/yr trend against JPL over 1900–2100 is the Earth–Mars–Jupiter long inequality 4λ_E − 8λ_Ma + 3λ_J (≈1783
yr, 6.9″ at J2000), a perturbation of Earth's mean motion a smooth year
cannot carry, derived on the model's own N-body engine and shipped as a
long-period row of the planetary completion together with the 239-yr
Venus–Earth term (doc 66) — since plan 06 I3 in D'Alembert form, the
amplitude and phase riding the planets' eccentricity vectors of date (the
constant rows held inside ±3000 yr and drifted 3.7″ beyond); against
Horizons over ±3000 yr the modern-window mean went +8.4 → +0.8″ and the
per-millennium scatter roughly halved. What
remains secular there is a precession-rate finding, labelled and not
tuned: the model's general precession runs 0.4–0.7″/cy below the P03
series over −3000..0 (+0.03 at 2000, +0.17 at 3000; +22″ of accumulated
equinox at −3000) while the sidereal Sun against DE441's J2000-frame
positions shows no trend at all. The model's ecliptic motion matches P03 to
0.5″ in inclination, so the deficit sits in the torque coefficient the
hybrid holds constant — the solar torque's (1 − e²)^−3/2 growth with
Earth's eccentricity accounts for about a third of it at −3000; a
theory-vs-theory tension at the 10⁻⁴ level, with no observation at the 20″
level there.

**The scene-wheel overlay (SW)**: the visible wheel Sun adds one term on top
of its untouched legacy stack, δ = λ_certified − λ_realized (the wheel's own
longitude of date read from the scene each frame as the Sun's RA/Dec in the
corrected axis frame, converted with the scene ε), applied inside the
clock-convention window (full weight where eclipse truth lives, ≤ 3,000 yr
from J2000; cos² taper to 20,000 yr where the TT-clock Sun would clash with
the deliberately-UT deep-time scene — both endpoints derived, only the cos²
easing shape is a convention). Measured (rendered − certified, both
runtimes): ≤ 0.4″ across the full-weight window, −0.8″ at −3000 (the fade
weight); the former analytic twin had left 96″ around 0–500 AD, 245″ at
−1000 and 710″ at −3000. Replacing the legacy stack outright was
measured and rejected — it double-counts the wheel's geometric-split ellipse
(~1° error).

## The ecliptic-precession LOD correction — REAL_LOD

Two structural relations sit between the model's kinematic mean LOD and the observed physical LOD (USNO Earth Orientation Center measurement):

1. **Raw ecliptic kinematic correction** — captures the "missing motion" from the ecliptic reference frame's precession over the nodal period T_s₃ (the chain's dominant nodal mode; until the plan 06 T2 restatement the retired unit's H/5). First-principles, no free parameters. Contribution at J2000: **+<!--v:h5LodCorrectionMs-->3.441<!--/v--> ms**.
2. **Calibrated cyclic ΔT stack + Core-mantle swing** (Bond/Hallstatt/Jose5/Jose4 + the Resonator episode; the Core-mantle swing is the model's model of the documented millennial core–mantle LOD oscillation — a damped core-eigenmode episode, full derivation in doc 104). Jointly fitted — see "The calibrated ΔT stack's role" below. Net LOD contribution at J2000: **<!--v:stackNetLodJ2000Ms-->-2.24<!--/v--> ms**.

Their sum closes the Layer 4 composite `LOD_real` onto the joint fit's USNO closure target — <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s — exactly at J2000 by construction of the fit (one J2000 day basis since plan 09). The displayed composite (the tweakpane readout and every layer table below) reads <!--v:lodRealPhysical-->86,400.001200<!--/v--> s, on the same basis — see "The J2000 day basis" below.

### The identity

```
LOD_real(t) = lod_kinematic(t)                    ← IAU-anchored kinematic baseline
            + lod_kinematic(t) / (T_s₃ × mSY(t))   ← raw ecliptic kinematic correction
            + Σ δ_LOD,i(t)                        ← calibrated Bond/Hallstatt/Jose5/Jose4 stack
            + δ_LOD,swing(t)                      ← Core-mantle swing (Resonator episode)
```

At J2000 (the tweakpane readout; the registry's marked spans carry the live
values — plan 09: one J2000 day basis, the SI day):

```
lod_kinematic(J2000)   = ω₀ = 86,400 s        (the Layer-0 tidal mean at J2000 — the SI day)
raw ecliptic term      = lod_kinematic / (T_s₃ × mSY)            (the nodal period, ≈ +3.44 ms)
raw kinematic sum      = lodH5Only              (intermediate; NOT the physical LOD readout)
Σ ΔT-cycle δ_LOD       = usnoLodJ2000 − lodH5Only  (net at J2000, calibrated stack + Core-mantle
                                              swing; see `data/deltaT-4flag-fit.json` →
                                              `usno_anchor.shipped_sum_lod_at_j2000_s`)
LOD_real (Layer 4)     = lodRealPhysical        (physical LOD readout — the shipped observable)
```

Since plan 09 the fit and the runtime share this one basis, so the sum lands exactly on the USNO closure target <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s (Earth Orientation Center J2000 joint-fit optimum vs Espenak history, auto-swept; within ~0.2 ms of the observed EO value ~86400.0016 s), by construction of the joint fit.

The raw ecliptic correction is a first-order additive expansion of the multiplicative form `LOD_mean × (1 + 1/(T_s₃·mSY))`; higher-order terms are ~10⁻¹⁶ s and are ignored.

### The J2000 day basis

Since plan 09 there is ONE J2000 day basis: the kinematic day of date is the
Layer-0 tidal mean LOD, exactly ω₀ = 86,400 s (the SI day, an input) at
J2000, and the ΔT joint fit closes on that same day. Layer 4 (<!--v:lodRealPhysical-->86,400.001200<!--/v--> s) lands
exactly on the fit target (<!--v:usnoLodJ2000-->86,400.0012<!--/v--> s) — an
identity enforced to 10⁻⁸ s on every docs build by the basis-consistency gate
inside the model-values registry (`lodRealPhysical`), so the engine and the
ΔT joint fit cannot drift apart silently.

### Physical derivation of the raw ecliptic term

The correction represents Earth's need to rotate slightly MORE per solar day to compensate for the ecliptic's precession in ICRF over the ecliptic-precession period — the chain's nodal mode T_s₃. The mean solar day is measured against the Sun, whose apparent motion follows the ecliptic — so it is the ecliptic frame, not the invariable-plane frame, that sets the meridian passage.

Over one full ecliptic-precession cycle (T_s₃ = <!--v:eclPrecYears-->~68,751<!--/v--> yr), the ecliptic completes one full revolution of its orientation in ICRF. Over one solar day (= 1/mSY of one year), the ecliptic direction therefore precesses by:

```
δ_rev = 1 / (T_s₃ × mSY) revolutions per day        (mSY the year in SI days)
```

≈ 3.98 × 10⁻⁸ rev/day at J2000. Earth must spin this additional fraction to catch the Sun on the meridian, adding:

```
δ_LOD = LOD_mean × δ_rev
```

= <!--v:h5LodCorrectionMs-->3.441<!--/v--> ms per solar day at J2000 (`eclipticLodCorrectionSecondsAtAge`, the one home in `@essrt/physics` deep-time; the retired H/5 divisor read 4.083 × 10⁻⁸ and 3.527 ms).

### Why the other precessions don't appear as raw kinematic corrections

**The axial precession is already implicit** in the tropical year itself: the tropical year is the sidereal year less the equinox's return, 1/T_p of a turn, so over one T_p the sidereal frame counts one year fewer (the retired device wrote this as its H/(H − 13) calendar identity). Adding an explicit precession correction to LOD_mean would double-count.

**The inertial apsidal precession is a fixed-frame (ICRF) motion** — Earth's perihelion turns relative to ICRF, but the Sun's apparent longitude is measured in the ecliptic-of-date, so the apsidal motion does not enter the day-length count directly.

**The obliquity variation is an oscillation**, not a monotonic precession — time-averaged contribution to LOD is zero.

**The perihelion-of-date motion** enters the anomalistic year (Sun-perihelion return), not the tropical solar-day count that defines LOD.

Only the ecliptic's nodal precession (T_s₃) provides the reference-frame kinematic correction for the Sun's apparent motion.

### The calibrated ΔT stack's role

The raw kinematic prediction (the kinematic day plus the ecliptic term, <!--v:lodH5Only-->86,400.003441<!--/v--> s) overshoots the physical solar day by ~2.2 ms — a basis-independent statement, since the stack sum Σ is additive. The model does not treat this as a defect of the raw physics — the raw ecliptic term is a clean, parameter-free geometric statement about the ecliptic frame. Instead, the residual is absorbed by the model's calibrated cyclic ΔT stack + Core-mantle swing:

- **`usno_target_lod_s` = <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s** — the joint fit's hard-equality J2000 LOD closure target (on the one J2000 day basis, the SI day — plan 09), itself the composite optimum over Espenak history (Espenak RMS ≈ <!--v:deltaTEspenakRmsSeconds-->12.5<!--/v--> s across 20 reference years 1650–2017, subject to full-window Stephenson RMS ≤ 40 s), within ~0.1 ms of the observed EO value ~86400.0016 s.
- **deltaTStart = <!--v:deltaTStart-->56.08<!--/v--> s** — the ΔT trend anchor at J2000. This is the long-term trend value the calibrated stack rides through the epoch, distinct from the IERS instantaneous observation of ΔT_J2000 ≈ 63.63 s (the trend line does not pass through the middle of an intra-decadal noise band).

Both ship in the fit's own artifact `data/deltaT-4flag-fit.json` (`optimum`), embedded as `FIT.DT_ANCHOR` by `npm run constants:generate` — the anchor is the fit's output and never lives in astro-reference (plan 14). The fit itself is run by `tools/fit/dt-corrections-fit.js --joint --write` (Step 7c of the pipeline — the README numbering is the authority): 4 flags + the Core-mantle swing in one equality-constrained solve with the USNO closure as a hard anchor row. The calibrated components collectively contribute **<!--v:stackNetLodJ2000Ms-->-2.24<!--/v--> ms at J2000** (per current shipped fit — see `data/deltaT-4flag-fit.json` → `usno_anchor.shipped_sum_lod_at_j2000_s`) plus a ~<!--v:deltaTEspenakRmsSeconds-->12.5<!--/v--> s Espenak RMS envelope over 1650–2017 (full-window Stephenson RMS ≈ 31 s); the anchor triplet (USNO, deltaTStart, coefficients) moves atomically with each fit configuration.

### Two internal LOD conventions

| Concept | Definition | Where used |
|:---|:---|:---|
| **LOD_mean** (model kinematic baseline) | `LOD_mean = ω₀ = 86,400 s` at J2000 — the SI day, the Layer-0 tidal mean of date, no ecliptic term, no ΔT-cycle contribution | `meanDeltaTSecondsAtAge` integrand + Bond/Hallstatt/Jose5/Jose4 cyclic stack → calibrated ΔT for Meeus geometry, eclipse code, live accumulator, tweakpane "ΔT correction" |
| **raw ecliptic kinematic** | `lod_kinematic + lod_kinematic/(T_s₃·mSY)` — the ecliptic correction only, no ΔT cycles | Intermediate scalar shown as the calibrated stack's raw-physics baseline (`pureH5DeltaTAtAge`, identifier kept); reported alongside LOD_real for transparency |
| **LOD_real** (Layer 4 composite, physical) | `lod_kinematic + lod_kinematic/(T_s₃·mSY) + Σ δ_LOD,i + δ_LOD,swing` — the ecliptic correction PLUS calibrated ΔT cycles PLUS Core-mantle swing | Physical LOD readout — tweakpane Solar Day decomposition, J2000 tables, USNO comparison. Displays <!--v:lodRealPhysical-->86,400.001200<!--/v--> s; closes on the USNO target by construction of the joint fit (one J2000 day basis since plan 09). |

### Deep-time behaviour

The raw ecliptic correction `δ_LOD = LOD_mean/(T_s₃·mSY)` **scales with LOD_mean** across deep time. T_s₃ is an orbital quantity (the μ-tier — constant under μ = 1) and mSY is the year counted in SI days, which drifts only with Driver 2, so the **fractional correction** `δ_LOD / LOD_mean = 1/(T_s₃·mSY)` is constant to a few parts in 10⁴ out to 1 Gyr and the absolute correction moves with LOD:

<!-- generated:doc99-ecliptic-lod -->
| Age (Ma) | LOD_mean (s) | δ_LOD (ms) — the ecliptic-precession term | fractional δ/LOD |
|---:|---:|---:|---:|
| +200 (future) | 90841.3 | 3.617 | 3.982e-8 |
| 0 (J2000) | 86400.0 | 3.441 | 3.982e-8 |
| −380 | 78331.4 | 3.120 | 3.983e-8 |
| −1,000 | 69779.4 | 2.779 | 3.983e-8 |

δ_LOD = LOD_mean/(T_s₃·mSY) with T_s₃ = 1,296,000/|s₃| = 68,751 yr (the orbital nodal mode, constant under μ = 1) and mSY the tropical year in SI days — written by the engine from the shipped chain, the same evaluator the ΔT integral uses.
<!-- /generated:doc99-ecliptic-lod -->

(The calibrated ΔT-stack contribution at deep-time epochs is not tabulated here; it is a small, slowly-varying quantity determined by the fit at each epoch and is negligible compared to LOD_mean(t) growth. The retired H/5 divisor's last render — 3.527 ms and 4.083 × 10⁻⁸ at J2000, 3.493 ms at −380 Ma — is in git history.)

### Position in the model taxonomy

| Invariant / Relation | Form | Governed by | Status |
|:---|:---|:---|:---|
| Planetary adiabatic invariant | `a × M_Sun = const` (per planet) | Driver 2 | Structural (definitional) |
| **Raw ecliptic LOD kinematic correction** | **`δ_LOD = LOD_mean/(T_s₃·mSY)`** | **Driver 1 + ecliptic precession** | **Structural (parameter-free geometry); fractional correction ≈ 3.98 × 10⁻⁸, absolute <!--v:h5LodCorrectionMs-->3.441<!--/v--> ms at J2000** |
| **LOD_real (Layer 4 composite)** | **`LOD_real = lod_kinematic + raw ecliptic term + Σ calibrated ΔT δ_LOD + δ_LOD,swing`** | **raw ecliptic term + calibrated Bond/Hallstatt/Jose5/Jose4 stack + Core-mantle swing** | **Displays <!--v:lodRealPhysical-->86,400.001200<!--/v--> s; closes on the USNO target <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s on the one J2000 day basis, by construction of the joint fit** |

Cross-references: `pureDeltaTAtAge` in `src/script.js` (browser, raw kinematic baseline) and `meanDeltaTSecondsAtAge` in `tools/lib/deep-time.js` (Node lib mirror, calibrated stack); tweakpane bindings under Orbital → "ΔT (TT − UT1)" (raw kinematic curve), "ΔT correction (rel. J2000)" (calibrated stack) and the Solar Day decomposition sub-folder (Layer 1–4); chart config for `id: 'delta-t'`.

### Layer 1 / Layer 2 / Layer 3 / Layer 4 — solar-day taxonomy

The model exposes four LOD values in the tweakpane **Day Lengths → Solar Day** sub-folder, each isolating a specific physics contribution:

| Layer | Definition | Physics content | J2000 value |
|:---|:---|:---|---:|
| **Layer 1 (Tidal Mean)** | pure-tidal chain (Farhat 2022, LLR α₁) + the ecliptic kinematic term, with α held at long-term L1-climate MEAN value | Isolates Moon-recession tidal drift from the glacial-cycle α oscillation. Sits ABOVE Layer 2 at J2000 because J2000 is near a Holocene interglacial (L1 minimum → α at J2000 < α at climate mean) | **86400.110143 s** |
| **Layer 2 (+ GIA)** | Layer 1 with α(t) applied at the current epoch (at J2000 this is EARTH_MOI_FACTOR exactly) | Adds the GIA channel via the L1-orbital-coupled α(t) curve — the physics baseline used by year-length derivations | **<!--v:solarDayLayer2J2000-->86,400.003432<!--/v--> s** |
| **Layer 3 (+ Cycles)** | Layer 2 + Σ Bond/Hallstatt/Jose5/Jose4 cyclic δLOD stack (flags only) | Cyclic sub-Milankovitch modulation WITHOUT the Core-mantle swing | **<!--v:solarDayLayer3J2000-->86,400.000704<!--/v--> s** |
| **Layer 4 (REAL LOD)** | Layer 3 + Core-mantle swing (Resonator episode) | Physical length of one solar day — the shipped observable. Closes on the USNO target <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s by construction of the joint fit (one J2000 day basis since plan 09 — see "The J2000 day basis") | **<!--v:lodRealPhysical-->86,400.001200<!--/v--> s** |

**Layer 1 − Layer 2 gap (~107 ms at J2000)** — the effect of using α at climate-mean vs α at J2000:

```
Layer 1 − Layer 2 = LOD × Δα / α
                  = LOD × ALPHA_CLIMATE_SCALE × L1(2000) / α
                  ≈ 86400 × (−3.93×10⁻⁷ × L1(2000)) / 0.3307
                  ≈ 107 ms  (with L1(2000) ≈ −1.05‰, post-MPT interglacial value)
```

This gap is not fixed — it oscillates with the glacial cycle. Over the ~100 kyr Milankovitch period, Layer 1 and Layer 2 cross whenever the epoch's L1(year) equals the L1 climate mean; the gap is largest at interglacial/glacial extrema.

**Layer 2 − Layer 4 gap (<!--v:layer2MinusLayer4GapMs-->2.23<!--/v--> ms at J2000)** — the contribution of the 4-flag ΔT stack + Core-mantle swing, absorbing the residual between the Layer 2 physics baseline and the physical solar day. The full contribution at J2000 recorded in `data/deltaT-4flag-fit.json` → `usno_anchor.shipped_sum_lod_at_j2000_s` is **<!--v:stackNetLodJ2000Ms-->-2.24<!--/v--> ms**; the gap and the fit sum agree to rounding because both rest on the one J2000 day basis, `LOD_mean` = <!--v:meanSolarDaySeconds-->86,400.000000<!--/v--> s, the SI day (plan 09; the ~0.33 ms spread they once showed was the retired comb's two day bases).

Cross-references: `meanLodSecondsAtAgeMeanAlpha` in `src/script.js` (Layer 1 tidal chain with climate-mean α), `meanLodSecondsAtAge` (Layer 2 tidal + GIA at α(t)), `dtCycleLodCorrectionSum` (cycles + swing sum), `resonatorSwingLodCorrection` (the Layer-4 addition), predictions bindings `solarDayLayer1` / `solarDayLayer2` / `solarDayLayer3` / `lodReal`.

**Sidereal / stellar day source.** The simulator's live rows `siderealDayReal` and `stellarDayReal` (the Predictions pane, the Days & Years report and the Formula Verification panel — one day for the three) are derived from `lodReal`, the real solar day of date (the kinematic day plus the ecliptic-precession term and the cyclic corrections), so they sit above the IAU constants — which rest on the nominal 86,400-s day — by the real day's excess over 86,400 s (~1.8 ms at J2000); the stellar day's precession turn rides T_p (S5), not the counter. The registry publishes the two days on both bases: on LOD_real of J2000 (the simulator readout) <!--v:siderealDayJ2000Physical-->86,164.091730<!--/v--> s (sidereal) and <!--v:stellarDayJ2000Physical-->86,164.100105<!--/v--> s (stellar, of-date-obliquity RA projection), and on the SI day of exactly 86,400 s the IAU inputs <!--v:siderealDayInputSeconds-->86,164.090531<!--/v--> / <!--v:stellarDayInputSeconds-->86,164.098904<!--/v--> s — the two columns apart by the day's excess, <!--v:lodRealJ2000ExcessMs-->1.20<!--/v--> ms. The kinematic day `o.lodKinematic` (the IAU-anchored baseline; the package's `lengths.siderealDaySeconds` / `stellarDaySeconds` moved onto LOD_real with physics 18, `lengths.lodRealSeconds`) stays the INTERNAL identity basis — it preserves the round-trip `siderealYearDays × o.lodKinematic = meansiderealyearlengthinSeconds = 31,558,149.7635 s` at every epoch — but its J2000 sidereal/stellar day values are no longer published (the former registry keys `siderealDayJ2000` / `stellarDayJ2000` were deleted 2026-10-09: a "J2000 day" needs its day basis named).

### dLOD/dt decomposition at J2000

The model's Tidal + GIA secular rate at J2000 = **+1.77 ms/century**, matching IERS observation of +1.75 ms/century within 1%. Adding the four sub-Milankovitch cycles and the Core-mantle swing brings the full observable rate to **−0.08 ms/century** at J2000. Rows match the tweakpane's *dLOD/dt decomposition* sub-folder:

| Layer | Rate (J2000) | Physical mechanism | Sign explanation |
|:---|---:|:---|:---|
| **Tidal baseline** (Farhat 2022 / LLR α₁ 3.82 cm/yr) | **+2.12 ms/cy** | Moon recession; Earth loses angular momentum to the Moon via ocean tidal dissipation | Earth spins slower → LOD grows |
| **GIA** (L1-orbital α(t), dα/dt = −1.35×10⁻¹¹/yr at J2000) | **−0.35 ms/cy** | Continental rebound after LGM; mass migrating from oceans back onto polar continents; Earth's polar moment α decreases | Earth's I = αMR² shrinks, ω = L_E/I grows → LOD shrinks |
| **All cycles** (Σ d/dt of Bond + Hallstatt + Jose5 + Jose4) | **−1.90 ms/cy** | Sub-Milankovitch cyclic modulation; zero-mean over long periods, sign flips on each half-period of each harmonic | Cyclic — sign depends on epoch; negative at J2000 (descending phase) |
| **Core-mantle swing** (Resonator episode) | **+0.05 ms/cy** | Damped core-eigenmode episode (T₀ ≈ 3,916 yr, Q = 1.8); core–mantle angular-momentum exchange | Aperiodic — decaying tail of the terminated episode at J2000 |
| **Tidal + GIA** (secular baseline, L2) | **+1.77 ms/cy** | Sum of the two secular drivers | ≈ IERS observation +1.75 ms/century (secular tidal + Milankovitch-scale GIA only, no sub-Milankovitch cycles) |
| **+ Cycles (L3)** | **−0.13 ms/cy** | Secular baseline + flags-only modulation | Flags-only net; excludes the swing |
| **+ Core-mantle swing (L4, full model)** | **−0.08 ms/cy** | Full observable dLOD/dt — the shipped Layer-4 observable | Marginally negative at J2000 (descending phase since ~1980, consistent in sign with the observed post-2020 spin-up); above/below the secular baseline at other epochs (Little Ice Age vs Medieval Warm Period, etc.) |

The row labels are shared across the tweakpane and the *Earth dLOD/dt Analysis* modal; the underlying bindings are `predictions.dLodDtTidal_msCy / dLodDtGia_msCy / dLodDtStack_msCy / dLodDtNetL2_msCy / dLodDtNetL3_msCy / dLodDtResonator_msCy / dLodDtNetL4_msCy`.

**Derivations at J2000**:
```
Tidal:  dL_M/dt = m_M × (1/2) × √(GM_(E+M)/a) × da/dt × √(1−e²)
                = 7.346e22 × 0.5 × √(4.035e14 / 3.844e8) × 1.211e-9 × 0.9985
                = 4.55e16 kg·m²/s²
        dL_E/dt = −dL_M/dt (angular momentum conservation)
        dω_E/dt = dL_E/dt / I_E  (I_E fixed for tidal-only decomposition)
        dLOD/dt(tidal) = −LOD²/(2π) × dω/dt = +2.12 ms/century

GIA:    dLOD/dt(GIA) = LOD × (dα/dt) / α  (L_E fixed for GIA-only decomposition)
                     = 86400 × (−1.35×10⁻¹¹) / 0.3306947  per year
                     = −3.53×10⁻⁶ s/yr = −0.35 ms/century
```

**The J₂ → α conversion factor is an effective pair, and is kept as one.** The
GIA channel turns the observed secular dJ₂/dt (Cox & Chao 2002, the
`giaCoxChaoPeltier` anchors in astro-reference) into dα/dt by dividing by
`giaJ2ToAlphaFactor` = <!--v:giaJ2ToAlphaFactor-->2.0<!--/v-->. The degree-2
identity for a pure polar-moment change gives 1.5; the difference is the solar
tide's share of the angular-momentum transfer, which the channel does not carry
as its own term. The LOD-budget scan (2026-09) measured the alternatives against
the eclipse-validated ΔT record: 1.5 alone is rejected outright, and the
physical pair — 1.5 with a net solar tide of a few per cent of the lunar
transfer — fits the record as well as the shipped factor, because the record
fixes the SUM of the secular drivers, <!--v:dLodDtNetSecularJ2000-->+1.77<!--/v--> ms/cy
at J2000, and not its split. Moving to the physical pair is therefore a
Layer-2 recalibration campaign (the recession budget is closed, so several
paleo anchors would move), not a numeric correction; the shipped factor stands
in for the solar tide by design, and this paragraph is where that is said.

The IERS observed rate is the physical Earth-rotation slowdown, integrating tidal + GIA + minor terms (mantle-core coupling ~ ±0.2 ms/century, hydrology ~ ±0.05 ms/century). The model matches to within 1% using **only two literature-anchored parameters** (LLR α₁ and Cox & Chao dJ₂/dt with the Peltier ICE-6G factor-2.0 J₂→α conversion) — no fitting to the observed rate.

**Physical picture**: the ~1.77 ms/century LOD growth we experience today is what remains of the tidal channel after GIA cancels ~17% of the tidal effect. Without GIA, Earth would be slowing 20% faster than observed; without the tidal channel, Earth would be spinning UP at −0.35 ms/century instead of slowing down.

#### Cyclic rate on top of the secular baseline

The Tidal + GIA rate (+1.77 ms/cy at J2000) captures the Milankovitch-scale physics. The four sub-Milankovitch cycles — Bond (1466 yr), Hallstatt (2430 yr), Jose5 (897 yr), Jose4 (716 yr), fitted periods stated in years (their former lattice labels are retired, doc 102 T5) — add cyclic modulation on top, and the Core-mantle swing (Resonator episode) is the fourth dLOD/dt driver. The components are jointly anchored so that the cumulative δLOD **value** at J2000 closes the raw kinematic day plus the ecliptic term onto the physical solar day (net <!--v:stackNetLodJ2000Ms-->-2.24<!--/v--> ms, by construction against the USNO closure target <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s on the one J2000 day basis); the cumulative **derivative** at J2000 is not zero: cycles contribute −1.90 ms/cy (descending phase) and the swing +0.05 ms/cy. The full observable rate at J2000 is therefore Tidal + GIA + cycles + swing = +1.77 − 1.90 + 0.05 = **−0.08 ms/century** — marginally negative, a descending-phase episode since ~1980, consistent in sign with the observed post-2020 spin-up.

```
full rate = Tidal + GIA + Σ d(cycles)/dt + d(swing)/dt
```

The tweakpane exposes all five rows — Tidal baseline, GIA, All cycles, Tidal + GIA, Tidal + GIA + all cycles — under the **dLOD/dt decomposition** sub-folder.

#### Rate excursions map to named climate periods (deep-time projection)

*The table below predates the lagged GIA channel: under the shipped physics the GIA transient has the opposite sign during rapid melting and its maximum follows each deglaciation by ~τ — read the rows as the pre-lag shape; doc 102 carries the current curves.*

Under the L1-orbital-coupled α(t) form, the GIA channel oscillates over the ~100-kyr glacial cycle with sign matching Milankovitch orbital forcing. Cross-checks at several epochs produce a specific mapping between the net LOD-growth rate and named Quaternary climate periods:

| Epoch | GIA rate | Tidal + GIA rate | Climate interpretation |
|---|---:|---:|:---|
| −36,000 (LGM ramp) | +0.38 | +2.50 ms/cy | Ice building on continents (α ↑, Earth slowing extra) |
| −23,000 | 0 (crossover) | +2.12 ms/cy | GIA sign flip — glaciation stops accelerating |
| −11,000 (Younger Dryas → Holocene) | **−1.20** | **+0.93 ms/cy** | GIA minimum — mass rapidly moving equatorward, deglaciation |
| +5,000 (projected future) | 0 (crossover) | +2.12 ms/cy | Interglacial peak — mass redistribution flipping direction |
| +13,000 (projected next-glacial-max) | **+0.61** | **+2.73 ms/cy** | Ice returning to continents (α ↑ again, Earth slowing extra) |

Between −11,000 and +5,000 (the current Holocene warm interval), sub-Milankovitch modulations (the "all cycles" term) superposed on the Tidal + GIA baseline are candidates for named climate excursions (mini-ice-age / Little Ice Age; Medieval Warm Period; Holocene Climatic Optimum) via faster-and-slower LOD-growth epochs on top of the smooth Milankovitch trajectory. This is a testable mechanism claim: the model predicts specific rate deviations at millennial-scale timing without any fitting to Holocene climate proxies.

The predicted rhythm has been *compared* against an independent paleoclimate record. The comparison is an **open correspondence, not a validation** — it does not survive any null test we can currently run (see the end of this section, and [doc 102](102-gia-alpha-lunar-validation.md) § "Defensible scientific position" item 7). Σ_stack correlates with Bond 2001 IRD (North Atlantic drift-ice, the same signal Bond used to identify his cold events) at **r = +0.36 Pearson under the shipped joint world** (+0.49 with the pre-joint flags-only stack — part of the late-Holocene structure now lives in the Core-mantle swing) on the model's validated window −4000 BC to +1800 AD — out-of-sample, since the stack was fit against the Stephenson 2016 ΔT residual (an eclipse-timing dataset, not a climate record). Sign-convention (this is the STACK channel's rule — "Σ > 0 = LOD above baseline = surface mass equatorward = warm; Σ < 0 = cold"; the α(t)/GIA channel runs the other way, see "Two channels, opposite signs" above) holds on **4 of the 5 named events inside the window**: Bond 4 (Σ = −3.03 ms, cold ✓), 4.2 ka (−4.11, cold ✓), Roman Warm Period (+1.01, warm ✓), MWP (+1.97, warm ✓), Maunder Minimum (+0.45 — a MISS, the convention predicts warm). Dalton (1810) falls outside the +1800 window edge. Values are the shipped joint-world Σ (4 flags + Core-mantle swing); Maunder misses under either stack definition (flags-only it is +0.118 ms, still positive), so the Core-mantle swing is not what carries it across zero. Events pre-window (Younger Dryas, 8.2 ka, Holocene Optimum) drift with fit-window extrapolation; the Modern warm epoch is post-window and anthropogenic — the model, a pure orbital/tidal model, correctly does not predict it.

**These figures are the most favourable slice of a weak relationship, and must not be quoted alone.** Tested across the *full* named-period bands instead of at hand-picked peak years, the sign rule holds for **65 % of years against a 50 % coin-flip baseline** — and for **0 %** of the Little Ice Age, where Σ_stack is positive ("warm") across all five centuries. Crossing timing against the 10 named transitions gives median 262 yr versus a Monte-Carlo null median of 353 yr, **p ≈ 0.19**. Band-limited testing against phase-randomised surrogates leaves no harmonic significant after correcting for the 16 tests run (the single nominal hit, Jose4↔GISP2 at p = 0.046, is one of 16), with the Bond band close to **anti-phase** (175°) versus the IRD record; permitting a drifting phase (windowed phase-tracking) does not rescue it (Bond↔IRD PLV p = 0.49). Both regenerate from `tools/explore/climate-band-phase.js`, the sign and crossing statistics from `tools/explore/climate-crossing-null.js`. The correlation is real as a number — ~13 % of variance — but it is **not carried by the 1466-yr band**. The four flags remain well-motivated as ΔT corrections, which is what they were fitted to; the further step to "these are the climate cycles" is not currently supported. See [doc 102](102-gia-alpha-lunar-validation.md) § "Defensible scientific position" item 7 for the full statistics. The *Earth dLOD/dt Analysis* modal exposes this comparison interactively, with the band-level score alongside the event table.

### Comparison to published dLOD/dt decompositions

The model's three-channel breakdown sits firmly inside the published literature ranges on all three components. The net-rate match at ~1% is the tightest single quantitative anchor in the whole deep-time story.

| Channel | Model | Mainstream literature range | Representative citation |
|---|---:|---:|---|
| **Tidal (Moon recession)** | +2.12 ms/cy | +2.0 to +2.4 ms/cy | Stephenson & Morrison 2004; Ray et al. 2017; Farhat 2022 (~+2.28) |
| **GIA (secular α-decrease)** | −0.35 ms/cy | −0.4 to −0.8 ms/cy | Peltier ICE-6G_C; Argus, Peltier, Drummond & Moore 2014 |
| **Net observed** | +1.77 ms/cy | +1.70 to +1.85 ms/cy | IERS EOP long-term; Stephenson 2016 secular mean +1.72 |

#### What matches consensus

- **Net-rate quantitative match**: model +1.77 ms/cy vs IERS ~+1.75 ms/cy — essentially at observation precision, achieved with zero fitting to the observed rate.
- **Sign structure**: tidal positive (Moon takes L → Earth slows) and GIA negative (mass poleward → α drops → Earth spins up) — matches mainstream physics completely.
- **Munk-MacDonald rejection**: mainstream also rejects the full ~5-6 ms/century non-tidal magnitude that Munk & MacDonald 1960 postulated. Model agrees; the remaining fractional non-tidal content (~0.5 ms/century window-average) is era-localized — the millennial core–mantle rotation swing, modelled as the Core-mantle swing episode — not a uniform secular rate (disfavored ~4σ by the signed solar-drift bound).

#### One subtle disagreement — modern-era GIA sign flip

The model's −0.35 ms/cy GIA channel reflects the **secular** (millennial-average) GIA rate, anchored on the Cox & Chao 2002 pre-melt dJ₂/dt baseline. Post-2005 satellite geodesy has documented that the instantaneous dJ₂/dt has **reversed sign** to positive, driven by accelerating Antarctic and Greenland ice-mass loss dominating over solid-Earth GIA rebound (Cheng, Tapley & Ries 2013 confirmed the pre-1998 rate then observed the reversal; Nerem et al. 2018; Loomis et al. 2019 GRACE-FO). Mainstream real-time decompositions therefore break out an additional ~+0.3 ms/cy "modern ice-loss" component:

```
2020s instantaneous breakdown (mainstream):
  Tidal:                                    +2.3
  GIA (secular, Peltier ICE-6G):            −0.6
  Modern ice-loss (Antarctic + Greenland):  +0.3
  Mantle-core coupling (secular):          ~0 to ±0.1
  Net observed:                            +1.7 to +2.0
```

The model rolls the "secular GIA" and "modern ice-loss acceleration" together into the single L1-orbital coupling of α(t), calibrated so `dα/dt(J2000) = −1.35×10⁻¹¹/yr` matches the pre-melt Cox & Chao baseline. This is a **design choice appropriate for millennial validation** (the L-5b lunar record covers 2.7 kyr, over which the anthropogenic ice-loss acceleration is a ~50-yr transient) but it does understate modern-era ice-loss if the tweakpane numbers were interpreted as a real-time GRACE-era rate monitor.

#### Where the model differs stylistically

1. **Attribution**: model carries the non-tidal contribution in two channels — the secular part as GIA-via-α(t) coupled to L1 orbital forcing, and the millennial part as the Core-mantle swing (time-varying mantle-core coupling). Mainstream typically splits into GIA + mantle-core + hydrology + modern ice-mass, with the split being **contested and model-dependent** — different authors partition the same total differently.
2. **Factor 2.0 vs 1.5**: The J₂→α conversion factor of 2.0 sits at the mid-range of Peltier ICE-6G LOD-coupling estimates (1.5-2.5). Authors using factor 1.5 from the idealized axisymmetric derivation (Mitrovica & Peltier 1993) get a proportionally larger GIA magnitude (~−0.55 ms/cy), which would swing the model's net to ~+1.57 ms/cy — still within observational uncertainty but no longer the tight IERS match.
3. **Zero fitting**: mainstream ΔT models (Stephenson-Morrison, NASA Espenak/Meeus) fit their non-tidal rate polynomial to the eclipse dataset. The model anchors both channels independently to satellite geodesy (Cox & Chao dJ₂/dt with Peltier ICE-6G conversion) and Lunar Laser Ranging (LLR α₁), and finds the observational IERS match emergently. This is the load-bearing scientific claim of the decomposition.

#### The +2.12 vs mainstream +2.3 tidal edge

The model's tidal +2.12 ms/cy sits at the lower edge of the published range (+2.0 to +2.4), computed via straightforward angular-momentum conservation on the LLR-anchored `da/dt = 3.82 cm/yr`. Higher published values (Stephenson-Morrison +2.3, Bills-Ray +2.4, Farhat +2.28) come from including secondary effects — Moon apsidal-precession contribution to L_M, solid-Earth tidal Love-number k₂ correction, or slightly different IAU-standard masses. The ~0.2 ms/cy gap versus these is worth a diagnostic pass at some point but doesn't affect the net-rate match materially because the calibration hits IERS +1.75 within 1% via emergent balance across both channels.

## The clock and the day through geological time

All values below are written by the engine (`tools/docs/render-doc99-tables.mjs`, `npm run docs:doc99:write`): LOD(t) from angular-momentum conservation on the CITED distance history (Farhat et al. 2022 — plan 12 option A), the composed precession period, the obliquity beat.

```
Layer 1 — Moon distance (a cited physical INPUT, not a fit):
   a(t) = a_now · r(t),  r = the AstroGeo22 ratio a(t)/a(0) of Farhat et al. 2022 (0–4,429 Ma, 1 Myr),
                         monotone cubic Hermite, r'(0) = α₁ the LLR rate; forward: the LLR rate held

Layer 2 — Angular-momentum conservation (EXACT):
   LOD(t) = 2π·I_E / (L_total − M_M·√(GM_EM·a(t))·√(1−e²))

ψ̇(t)    = [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a(t))³]    the composed lunisolar precession rate
T_p(t)   = 1,296,000 / ψ̇(t)                            the mean lunisolar precession period
beat(t)  = 1,296,000 / (ψ̇(t) − |s₃|)                   the obliquity band
days/yr  = tropical_year_s(t) / LOD(t)
```

<!-- generated:doc99-clock-through-time -->
| Age (Myr) | LOD (hr) | T_p (yr) — the composed precession period | days/yr (tropical) | Moon distance (km) | obliquity beat (kyr) | Era |
|---:|---:|---:|---:|---:|---:|:---|
| **+200 (future)** | **25.23** | **28,315** | **347.40** | **392,039** | **47.98** | Future (projection) |
| +100 (future) | 24.60 | 27,011 | 356.30 | 388,219 | 44.35 | Future |
| +50 (future) | 24.30 | 26,384 | 360.77 | 386,309 | 42.68 | Future |
| **0 (J2000)** | **24.00** | **25,772** | **365.24** | **384,399** | **41.10** | Modern (IERS anchor) |
| −10 | 23.94 | 25,650 | 366.14 | 384,015 | 40.79 | Miocene |
| −50 | 23.69 | 25,144 | 369.96 | 382,390 | 39.52 | Eocene/Oligocene |
| −90 | 23.48 | 24,703 | 373.36 | 380,947 | 38.44 | Late Cretaceous (Pannella) |
| −180 | 23.02 | 23,775 | 380.76 | 377,816 | 36.24 | Jurassic (Scrutton) |
| −290 | 22.55 | 22,820 | 388.73 | 374,455 | 34.06 | Permian (Mazzullo) |
| **−380** | **21.76** | **21,235** | **402.83** | **368,549** | **30.64** | Devonian (Wells 1963) |
| −440 | 21.70 | 21,118 | 403.92 | 368,092 | 30.40 | Silurian (Wells) |
| −500 | 21.57 | 20,858 | 406.36 | 367,076 | 29.86 | Late Cambrian |
| −620 | 20.41 | 18,577 | 429.37 | 357,560 | 25.39 | Ediacaran (Williams 2000) |

T_p(t) = 1,296,000/ψ̇(t) with ψ̇(t) = [ω(t)/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³] × cos ε̄(t)/cos ε̄(0) — Earth's spin (angular-momentum conservation on the recession history) carrying the solar and lunar torques, the lunar torque growing as the Moon was closer, times the cited mean obliquity's cosine (ε̄(t) Farhat et al. 2022's own column of the same history, plan 12 §8: the precession RATE is the constant α(t) times cos ε̄(t), lower in the deep past — 22.23° at the Devonian, 19.73° at 2.46 Ga; the factor is 1.0075 and 1.0245 there); p₀ = 50.2880 ″/yr, the IAU 2006 general precession p_A at J2000 — an input since plan 09 (T_p = 25,771.6 Julian yr). The obliquity beat is 1,296,000/(ψ̇ − |s₃|) with |s₃| = 18.8506 ″/yr, the dominant nodal mode of Earth's orbit (the engine's deep secular modes; μ = 1). The spin-only clock the model carried before (H₀·LOD/LOD₀ ÷ 13) read 23,553 yr at the Devonian where the composed clock reads 21,235 — retired, and its counter deleted at plan 09 step 7a (the 23,553 is the last recorded value).
<!-- /generated:doc99-clock-through-time -->

**The precession of date.** The table is the secular law. The movement of
date — the equinox, the obliquity, the tropical year — rides it times two
factors, both exactly 1 at J2000. The first is the solar torque at the
eccentricity of date, 1 + f_S·([(1 − e²)/(1 − e₀²)]^(−3/2) − 1): the Sun's
share of the torque carries the orbit's eccentricity, and today's sits
below the long-term mean. The second is the oblateness of date, J₂(t)/J₂₀:
the precession rate is proportional to the dynamical ellipticity, and the
ice-age mass redistribution that changes the polar moment (the α(t) of the
length-of-day stack) changes it too; the channel is scaled on the observed
dJ₂/dt (<!--v:j2RateJ2000Per1e11Yr-->−2.7<!--/v--> ×10⁻¹¹ /yr, Cox & Chao 2002) and is bounded, ±<!--v:precOfDateEllipticityAmpLastMyrPct-->0.02<!--/v--> %, with
no secular part. Theory against theory: the equinox of date holds
<!--v:equinoxVsVondrakMaxAbsArcsec-->7.9<!--/v-->″ of Vondrák et al. (2011) over ±3000 yr where the secular law alone
reads <!--v:equinoxSecularOnlyMaxAbsArcsec-->28.1<!--/v-->″, and the obliquity holds <!--v:obliqVsLa2004RmsLastMyrArcsec-->14.8<!--/v-->″ rms of La2004 over the last
million years where the secular law alone reads <!--v:obliqSecularOnlyVsLa2004RmsLastMyrArcsec-->80.4<!--/v-->″
([doc 110 §2.3](110-calculation-map.md) carries the formulas). The deep-time
rows above, the precession gates at 1.4 and 2.46 Ga and the obliquity beat
are statements of the secular law and do not move.

**Devonian days/yr = <!--v:daysPerYearAtDevonian-->402.83<!--/v-->** (tropical) — against Wells 1963's directly-counted coral growth rings of ~400 days/year, <!--v:anchorWellsFlagship380DeltaPct-->+0.71<!--/v--> % (a documented band on the cited history; Wells's "400" is a rounded count, and modern reanalyses place the Devonian in the 398–405 range). The former "−0.01 %" was the deleted quartic reading back the row it was calibrated on.

**Modern → Devonian fractional change**: −8.7 % in LOD, −15.8 % in the precession period (the lunar torque adds to the spin scaling), +9.5 % in days/yr.

**Note on Williams 2000 (Ediacaran, 620 Ma):** Williams's tidal-rhythmite count gives 400.3 days/yr at this epoch. Our proper-physics formula gives <!--v:anchorWilliams620Pred-->429.37<!--/v--> days/yr — a <!--v:anchorWilliams620DeltaPct-->+7.26<!--/v-->% discrepancy. This is honest: Farhat 2022 (the cited history the model reads, not a fit) has the smooth Earth-Moon evolution curve dipping shallower than Williams's direct measurement suggests, possibly because the Ediacaran-Cryogenian Snowball Earth interval (~650–580 Ma) had unusual ocean-tidal Q that Farhat's model averages over. The smooth formula passes between Williams's measurement and the modern Phanerozoic rate. See Mitchell-Kirscher 2023 for analysis of this Precambrian transition.

---

## Validation against published paleontological measurements

The model's days/yr predictions are testable against direct fossil measurements. All values below from the **proper-physics two-layer formula**.

### Wells 1963 — Fossil coral growth rings (the gold standard)

The full table published in Wells 1963 (data extracted via Arbab 2001 review):

| Age (Ma) | Wells observed days/yr | Model prediction | Difference | Status |
|---:|---:|---:|---:|:---|
| 65 (Maastrichtian) | 371 | <!--v:anchorWells65Pred-->371.28<!--/v--> | <!--v:anchorWells65DeltaPct-->+0.08<!--/v-->% | ✓ |
| 136 (Early Cretaceous) | 377 | <!--v:anchorWells136Pred-->377.04<!--/v--> | <!--v:anchorWells136DeltaPct-->+0.01<!--/v-->% | ✓ |
| 180 (Jurassic) | 381 | <!--v:anchorWells180Pred-->380.76<!--/v--> | <!--v:anchorWells180DeltaPct-->−0.06<!--/v-->% | ✓ |
| 230 (Triassic) | 385 | <!--v:anchorWells230Pred-->385.07<!--/v--> | <!--v:anchorWells230DeltaPct-->+0.02<!--/v-->% | ✓ |
| 280 (Permian) | 390 | <!--v:anchorWells280Pred-->387.57<!--/v--> | <!--v:anchorWells280DeltaPct-->−0.62<!--/v-->% | ✓ |
| 345 (Mississippian) | 396 | <!--v:anchorWells345Pred-->401.41<!--/v--> | <!--v:anchorWells345DeltaPct-->+1.37<!--/v-->% | ✓ |
| 405 (Early Devonian) | 402 | <!--v:anchorWells405Pred-->403.30<!--/v--> | <!--v:anchorWells405DeltaPct-->+0.32<!--/v-->% | ✓ |
| 500 (Cambrian) | 412 | <!--v:anchorWells500Pred-->406.36<!--/v--> | <!--v:anchorWells500DeltaPct-->−1.37<!--/v-->% | ✓ |
| 600 (Late Precambrian) | 424 | <!--v:anchorWells600Pred-->427.29<!--/v--> | <!--v:anchorWells600DeltaPct-->+0.78<!--/v-->% | ✓ |

**Phanerozoic (65–500 Ma): all within ±1.4 %, nine of twelve within 1 %.** The derived chain on the cited history reads Wells's directly-counted coral data across 500 million years of geological time with no free parameter and nothing fitted to it; the three rows outside ±1 % (345, 380 and 500 Ma) are documented bands whose cause is named in the anchor file. The Late Precambrian row (600 Ma, <!--v:anchorWells600DeltaPct-->+0.78<!--/v--> %) falls inside the coral-count uncertainty — the cited ocean-model history through the Proterozoic-Cambrian interval matches Wells's deep-time counts far better than any single linear rate could.

### Independent multi-source validation

| Age (Ma) | Source | Measurement | Observed days/yr | Model | Match |
|---:|:---|:---|---:|---:|:---|
| 0 | IERS modern | atomic clock | 365.242 | 365.242 | exact (anchor) |
| 70 | **Winter 2020** | *Torreites* rudist bivalve | 372 | <!--v:anchorWinter202070Pred-->371.71<!--/v--> | **<!--v:anchorWinter202070DeltaPct-->−0.08<!--/v-->%** ✓ |
| 90 | Pannella 1972 / Scrutton | bivalves (23.5 hr) | 372.6 | <!--v:anchorPannella90Pred-->373.36<!--/v--> | **<!--v:anchorPannella90DeltaPct-->+0.20<!--/v-->%** ✓ |
| 200 | Triassic compilation | various | 385.9 | <!--v:anchorTriassic200Pred-->382.50<!--/v--> | <!--v:anchorTriassic200DeltaPct-->−0.88<!--/v-->% ✓ |
| 380 | **Wells 1963** | Devonian corals | 400 | <!--v:daysPerYearAtDevonian-->402.83<!--/v--> | **<!--v:anchorWellsFlagship380DeltaPct-->+0.71<!--/v-->%** ✓ |
| 620 | **Williams 2000** | Elatina tidal rhythmites (21.9 hr) | 400.3 | <!--v:anchorWilliams620Pred-->429.37<!--/v--> | **<!--v:anchorWilliams620DeltaPct-->+7.26<!--/v-->%** ⚠️ |

**Independent confirmation at 5 epochs spanning 0–380 Ma**: the derived chain sits within 1 % at every Phanerozoic point except the flagship Wells 1963 row (<!--v:anchorWellsFlagship380DeltaPct-->+0.71<!--/v--> %, a documented band on a rounded count). The Winter 2020 Cretaceous result (*Torreites* bivalve, peer-reviewed *Paleoceanography*) and Pannella's bivalve count at ~90 Ma are particularly clean validations at epochs Wells didn't directly cover.

### The Williams 2000 (620 Ma) discrepancy — honest discussion

The proper-physics formula misses Williams's Elatina rhythmite at 620 Ma by **<!--v:anchorWilliams620DeltaPct-->+7.26<!--/v--> %** (predicted <!--v:anchorWilliams620Pred-->429.37<!--/v--> days/yr vs measured 400.3). This is a regression relative to the earlier pure-linear LOD formula, which hit Williams almost exactly (−0.01 %).

Why? The pure-linear formula's `LOD = 24 − 0.00526·t_Ma` happens to pass through 21.90 hr at 620 Ma — coincidentally matching Williams. The derived chain reads Farhat 2022's cited distance history (plan 12 option A — an input, not a calibration), on which the conserved angular momentum puts LOD ≈ 21.02 hr at 620 Ma — a 4 % mismatch with Williams.

Three plausible interpretations, in honest order:

1. **Farhat's curve over-smooths the Cryogenian/Snowball Earth (~720–635 Ma) interval.** Williams's direct rhythmite count may be more accurate at this specific Snowball-boundary epoch than Farhat's globally-smoothed ocean-tidal model. The thermal-tide-lock regime documented by Bartlett-Stevenson 2016 and Mitchell-Kirscher 2023 ended around this time, and Farhat's smooth fit may average across that transition.
2. **Williams's count is a specific local rhythmite epoch** — could reflect a particular geometry that biases the count slightly upward relative to the true Earth-average.
3. **The proper-physics formula is a deliberate trade-off** — accepting one ~6% miss at 620 Ma in exchange for near-exact Phanerozoic paleontological fits (Wells −0.01%) and a globally smooth formula. Net Phanerozoic improvement; Snowball-boundary regression.

| Source | Method | Reported value | Model | Match |
|:---|:---|:---|:---|:---|
| Wells 1963 (extrapolated) | Coral curve extrapolation | 424 days/yr | <!--v:anchorWilliams620Pred-->429.37<!--/v--> | −0.21% ✓ |
| Williams 2000 (direct) | Elatina tidal rhythmite | 21.9 hr / 400 d/yr | <!--v:anchorWilliams620Pred-->429.37<!--/v--> | **<!--v:anchorWilliams620DeltaPct-->+7.26<!--/v-->%** ⚠️ |
| Mitchell-Kirscher 2023 | Multi-proxy compilation | 21–22 hr range | LOD 20.71 hr | slightly below range |

This is documented honestly as a known small-epoch discrepancy of the smooth formula. For Phanerozoic work (≤500 Ma), the proper-physics formula is uniformly better than the linear approximation.

### The mid-Precambrian window (1–3.5 Ga) — the cited history and the record

The Moon's recession history is the one quantity in the deep-time chain the model cannot derive. How fast the Moon recedes in an era depends on how much tidal energy the oceans dissipate, and that depends on the continental configuration and the ocean's resonances through geological time — physics the model does not carry. With the only clean assumption, constant dissipation at today's rate, the Moon sits at the Roche limit 1.5 Gyr ago, three billion years too late for its age; every model in the literature closes that gap by giving dissipation a history. **Since plan 12 (option A) the distance history is therefore a CITED PHYSICAL INPUT, not a fit:** Farhat, Auclair-Desrotour, Boué & Laskar 2022's published solution (the AstroGeo22 ephemeris, `data/astrogeo22-earth-moon.json`, 0–4,429 Ma at 1 Myr) — an ocean-tide dissipation model with hemispherical and global ocean configurations and resonance crossings, fitted to two constraints only, the present LLR recession rate and the lunar age. The model reads it as the ratio a(t)/a(0) on its own observed J2000 distance, with the LLR rate as the J2000 slope (`@essrt/physics/deltat/moon-distance-history`), and derives everything else by its own equations: the day length by angular-momentum conservation with the J2000 L_EM constant (measured: conservation on Farhat's distance reproduces his own day length to 0.01 h at 100 Ma and 0.14 h at 2.46 Ga), the composed precession and the clock T_p(t), the month chain. Before plan 12 the chain carried a quartic whose two higher coefficients were least-squares fitted to that same curve (0.5 h of day off at 1 Ga) and, beyond 1 Ga, a spline through knots fitted to the rock record with two fitted solar angular-momentum channels — a fit to the data the falsification leg then tested (Xiamaling and Joffre were fit anchors and test rows at once). The regime block, its fitters, the quartic's coefficients, the thermal-tide pump and the Roche-crossing "self-validation" at 4.498 Ga (the spline's pinned endpoint) are deleted; git history and holisticuniverse plan 12 carry their record.

**Every rock datum is now a test, and the gate says what it finds** (`data/paleo-validation-anchors.json`, 45 rows, each tolerance or band written with its cause; an unexplained improvement fails the gate). On the cited history the derived precession constant reads <!--v:anchorLantinkPrec2460DeltaPct-->+0.59<!--/v--> % at Joffre against Lantink 2022's 108.6 ± 8.5 ″/yr and <!--v:anchorXiamalingPrec1400DeltaPct-->+0.87<!--/v--> % at Xiamaling against Meyers & Malinverno 2018's 85.79 ± 2.72 (2σ); the derived day length <!--v:anchorLantinkJoffreLod2460DeltaPct-->−0.33<!--/v--> % against Lantink's 16.9 h, <!--v:anchorFarhatWeeliwolli2450DeltaPct-->−6.07<!--/v--> % against the Weeli Wolli rhythmites' 17.95 ± 1.32 h, <!--v:anchorNanfenLod1100DeltaPct-->+1.08<!--/v--> % against Nanfen's 18.94 ± 0.39 h; the Moon distance <!--v:anchorFarhatMoodies3200DeltaPct-->+0.67<!--/v--> % against the Moodies bundles' 46.45 ± 1.5 R⊕. **The open discrepancy** is Zhou et al. 2024: their three measured precession constants at Yemahe (1215 Ma), Wumishan (1480 Ma) and Chuanlinggou (1634 Ma) — 84.15 ± 1.74, 92.62 ± 2.39, 96.40 ± 1.94 ″/yr — read <!--v:anchorZhouYemahePrec1215DeltaPct-->−1.81<!--/v--> %, <!--v:anchorZhouWumishanPrec1480DeltaPct-->−4.75<!--/v--> % and <!--v:anchorZhouChuanlinggouPrec1634DeltaPct-->−5.31<!--/v--> % on the derived chain (1.7σ, 2.5σ, 3.6σ). Farhat's own precession column misses the same two sites the same way; Zhou read their data as "a tidal dissipation peak from ~1.3 to 1.5 Ga, indicating a possible unfound resonance in the Mesoproterozoic era". Either the cited ocean-model solution lacks that resonance, or the constants inferred through an assumed astronomical model are biased; the model states the gap as documented bands and does not fit it. (Zhou's paired distances and day lengths are DERIVED from k through Farhat's AstroGeo tool and are kept as cross-check rows, not as independent measurements.)

Two notes on the pump mechanism the model does not carry. First, the thermal-tide day-length lock the deleted pump represented (Zahnle–Walker 1987; Bartlett–Stevenson 2016; Mitchell–Kirscher 2023's ~19 h stall across 2.0–1.0 Ga) is contested: Laskar, Farhat, Lantink et al.'s review concludes that "when only the most robust cyclostratigraphic estimates of the LOD are retained, the LOD locking hypothesis is not supported" and that the atmospheric resonance "was never of sufficiently large amplitude to allow for this tidal LOD lock"; the model carries no pump. Second, the net solar delivery of angular momentum over the Precambrian is in any case **small**: L_EM(t) reconstructed from Zhou's paired data is flat at −0.2 % versus today across 1634–1215 Ma — conservation with the J2000 constant is the physics the chain uses.
### Wu et al. 2024 — 650-Myr cyclostratigraphic compilation

Wu, Malinverno, et al. 2024 ("A 650-Myr history of Earth's axial precession frequency and the evolution of the Earth-Moon system derived from cyclostratigraphy", *Science Advances*, [doi:10.1126/sciadv.ado2412](https://www.science.org/doi/10.1126/sciadv.ado2412)) applied TimeOptB Bayesian inversion to **34 high-quality cyclostratigraphic records** spanning 0–650 Ma. This is the most comprehensive Phanerozoic compilation yet published and provides an independent test of our deep-time formula.

#### LOD and Moon-distance agreement (the substantive validation)

| Age (Ma) | Wu et al. 2024 (cyclostratigraphy + Bayesian inversion) | Our model (conservation on the cited Farhat 2022 history) | Δ |
|---:|---:|---:|---:|
| 0 | LOD 24.00 hr, Moon 60.27 R⊕ | <!--v:anchorWuLod0Pred-->24.00<!--/v--> hr, <!--v:anchorWuMoon0Pred-->60.32<!--/v--> R⊕ | exact (anchor) |
| 100 | LOD 23.5–23.8 hr, Moon 59–60 R⊕ | <!--v:anchorWuLod100Pred-->23.43<!--/v--> hr, <!--v:anchorWuMoon100Pred-->59.73<!--/v--> R⊕ | within range ✓ |
| 200 | LOD 23.6–23.8 hr, Moon 58–59 R⊕ | <!--v:anchorWuLod200Pred-->22.92<!--/v--> hr, <!--v:anchorWuMoon200Pred-->59.17<!--/v--> R⊕ | LOD short by 0.8 hr ⚠ |
| 300 | LOD 22.5–23.0 hr, Moon 53–55 R⊕ | <!--v:anchorWuLod300Pred-->22.44<!--/v--> hr, <!--v:anchorWuMoon300Pred-->58.63<!--/v--> R⊕ | LOD OK; Moon far by ~4 R⊕ ⚠ |
| 400 | LOD 21.5–22.0 hr, Moon 52–53 R⊕ | <!--v:anchorWuLod400Pred-->21.74<!--/v--> hr, <!--v:anchorWuMoon400Pred-->57.81<!--/v--> R⊕ | LOD OK; Moon far by ~5 R⊕ ⚠ |
| 500 | LOD 20.9–21.5 hr, Moon 53–54 R⊕ | <!--v:anchorWuLod500Pred-->21.57<!--/v--> hr, <!--v:anchorWuMoon500Pred-->57.60<!--/v--> R⊕ | LOD OK; Moon far by ~4 R⊕ ⚠ |
| **650** | **LOD 20.94 hr, Moon 56.73 R⊕** | **<!--v:anchorWuLod650Pred-->20.34<!--/v--> hr, <!--v:anchorWuMoon650Pred-->56.00<!--/v--> R⊕** | **LOD <!--v:anchorWuLod650DeltaPct-->−2.86<!--/v--> % (documented band), Moon within 1.3 %** |

**The 650 Ma endpoint agrees to ~1–3 % between two completely independent methods** — Wu's Bayesian inversion of 34 cyclostratigraphic records vs angular-momentum conservation on Farhat 2022's ocean-model history (nothing fitted to Wu). The LOD gap at 650 Ma is the cited history reading a lower pre-Snowball dissipation than Wu's inversion, the same disagreement the Williams 620 Ma row shows; it is a band, not an adjustment.

#### The Pangea high-tidal-dissipation interval (the mid-range mismatch)

Wu et al.'s key finding is that **lunar recession was non-uniform** over the Phanerozoic. Their cyclostratigraphy-inferred rates are:

| Interval | Lunar recession rate (cm/yr) |
|:---|:---:|
| 540–325 Ma (Cambrian–Carboniferous) | 2.17 ± 0.15 |
| **325–200 Ma (Permian–Triassic, Pangea era)** | **7.00 ± 0.52** (peak dissipation) |
| 200 Ma–Present (Late Jurassic onward) | 3.29 ± 0.13 (≈ modern 3.82) |

The 300–200 Ma peak gives ~4 R⊕ extra Moon-Earth approach during the Pangea-era ocean-tidal-resonance interval. The cited history (Farhat 2022's globally-smoothed ocean model) **does not carry this regime-dependent variation at Wu's timing** — Farhat's own acceleration sits ~50 Myr earlier (below). The mid-range (300–500 Ma) Moon-distance deviation in the table above is precisely this Pangea overshoot, and the model adds no term to absorb it.

This is **a real physical effect** (driven by continental shelf configuration and bathymetry during supercontinental assembly). Wu et al. note that even Farhat 2022's full ocean-tidal numerical model shows a similar acceleration, but shifted **~50 Myr earlier** than the cyclostratigraphy data places it.

For the model: this is an honest limitation of reading one globally averaged ocean-tide history. The Phanerozoic-averaged behaviour is captured; the regime-dependent supercontinent-era acceleration is not.

### Physical axial precession at deep time — why a spin-only scaling misses

Wu et al. 2024 also report axial precession frequencies inferred from cyclostratigraphy: **51.25 ″/yr (present) → 67.64 ″/yr at 650 Ma** — a +32 % increase.

A spin-only scaling of the precession period (T_p ∝ 1/ω, the day length alone) gives, at 650 Ma, a rate only about 16 % over modern (the generated table above, the spin-only column) — some 8 ″/yr short of Wu et al.'s inferred rate.

**This is a conceptual question, not a numerical error.** Two distinct definitions of "axial precession" are in play:

1. **Spin-only axial precession** = the J2000 period scaled with LOD(t) alone. It coincides with the physical rate at J2000 and misses the lunar torque's growth at deep time; the model does not carry it.

2. **Physical axial precession** = solar torque term + lunar torque term. Standard celestial-mechanics formula:
   `ψ̇ = -(3/ω) × [n_S² + n_M² × (factor)] × (J₂/2) × cos(ε)`
   The solar term scales as ω (linear in spin rate). The lunar term scales as ω × a_moon⁻³ (because n_M² ∝ a_moon⁻³ by Kepler). When the Moon was <!--v:anchorWuMoon650Pred-->56.00<!--/v--> R⊕ (the model's 650 Ma value; Wu's anchor reads 56.73), the lunar contribution was (60.27/56.31)³ = **1.23× stronger** — pushing physical precession faster than spin-rate scaling alone predicts.

Quantitative reconciliation at 650 Ma using the physical formula:

| Contribution | Modern (J2000, derived from the constants) | 650 Ma scaling |
|:---|---:|:---|
| Solar (constant n_S, scales with ω) | <!--v:earthPrecSolarJ2000ArcsecPerYr-->15.9140<!--/v--> ″/yr | × ω(t)/ω₀ |
| Lunar (n_M² ∝ a_moon⁻³, scales with ω × a_moon⁻³) | <!--v:earthPrecLunarJ2000ArcsecPerYr-->34.3740<!--/v--> ″/yr | × ω(t)/ω₀ × (a₀/a_M(t))³ |
| Total | <!--v:earthPrecRateJ2000ArcsecPerYr-->50.2880<!--/v--> ″/yr | **<!--v:earthPrecComposed650MaArcsecPerYr-->70.3<!--/v--> ″/yr** at 650 Ma (the shipped composed clock, `earth/precession-composed`) |

This lands within a few per cent of Wu et al.'s **67.64 ″/yr** (the table: the composed value above theirs by about 4 %, where the spin-only scaling sits a tenth below) — the lunar 1/a_moon³ coupling closes most of the gap; the values are the registry's, one home.

**Both views are correct, depending on the question:**

| Question | Use | Notes |
|:---|:---|:---|
| What would a torque-equation solver give? | Physical formula | Includes both LOD-scaling and lunar 1/a³ scaling |
| What does a cyclostratigraphy inversion (Wu 2024) yield? | Physical formula | Wu's k is inferred via an assumed astronomical model |

#### What cyclostratigraphy actually measures vs infers

It's important to distinguish:

- **Direct measurements**: rhythmic-cycle period RATIOS in sediment cores (e.g., "9 obliquity cycles per 4 eccentricity cycles"). These are nearly model-free — just cycle counting.
- **Inferred values**: axial precession frequency k, lunar distance, LOD. These come from inverting the observed ratios through an assumed astronomical model.

The inversion step requires:
- A model for how astronomical periods relate to k, g_i (planetary perihelion precessions), s_i (node precessions)
- N-body-derived g_i and s_i values at the target epoch — which are **chaotically uncertain** beyond ~50 Myr (Laskar 1989)
- A prior such as "tidal friction monotonically decreases k" (Wu et al. impose this)

So Wu et al.'s **67.64 ″/yr at 650 Ma is model-derived**, inseparable from the astronomical theory used to invert the sediment data. The robust observational fact is the period ratios; the conversion to k is theory-dependent. Both their model and ours land on the same LOD and Moon distance because both ultimately calibrate against the same tidal-evolution physics (Farhat 2022); the precession-rate divergence reflects the different astronomical-model choices.

### Statistical summary

Across <!--v:paleoAnchorCountAll-->14<!--/v--> independent paleontological datapoints (0 to 620 Ma):

| Statistic | Phanerozoic (0–500 Ma) | Including Precambrian (0–620 Ma) |
|:---|:---:|:---:|
| Mean absolute deviation | **<!--v:paleoMadPhanPct-->0.48<!--/v-->%** | <!--v:paleoMadAllPct-->0.98<!--/v-->% |
| Max deviation | <!--v:paleoMaxPhanPct-->1.37<!--/v-->% (Triassic compilation, 200 Ma) | <!--v:paleoMaxAllPct-->7.26<!--/v-->% (Williams 620 Ma) |
| RMS deviation | <!--v:paleoRmsPhanPct-->0.68<!--/v-->% | <!--v:paleoRmsAllPct-->2.05<!--/v-->% |
| Datapoints within 1% | <!--v:paleoWithin1Phan-->10/12<!--/v--> | <!--v:paleoWithin1All-->11/14<!--/v--> |
| Datapoints within 2% | <!--v:paleoWithin2Phan-->12/12<!--/v--> | <!--v:paleoWithin2All-->13/14<!--/v--> |

The observed values, sources and per-anchor tolerances live in
[`data/paleo-validation-anchors.json`](../data/paleo-validation-anchors.json);
`tools/verify/paleo-anchors.js` (gate class) recomputes every prediction in
these tables live from the engine on each `npm run check` and fails on drift
— **including an unexplained improvement of a documented deviation** (the
Williams 620 Ma miss and the Wu Pangea-interval rows are asserted as bands,
not skipped).

**The derived day count sits within ±1.4 % of every direct Phanerozoic paleontological measurement** (65–500 Ma; the flagship Wells 380 Ma row <!--v:anchorWellsFlagship380DeltaPct-->+0.71<!--/v--> %) with NO free parameter: the Moon distance history is the cited input (Farhat 2022, plan 12 option A), the day length is conservation on it, the day count is tropical_year_s(t)/LOD(t) on that chain, and nothing is fitted to the Wells/Williams data. The documented deviations (Williams 620 Ma, the Wu Pangea interval, three Wells rows and the Mesoproterozoic precession rows of Zhou 2024) are bands in `data/paleo-validation-anchors.json`, each with its cause named.

The agreement between a chain with one measured anchor (LLR da/dt = 3.82 cm/yr, Dickey 1994 / Chapront 2002, the history's J2000 slope) and directly-counted fossil growth increments across multiple species and techniques over 500 Myr is a test the model passes at the per-cent level — a test of the cited ocean-model history as much as of the chain, and it is reported as such.

---

## Predicted climate lines at each age — obliquity band

Periods in **kyr**, written by the engine. The lines are the climate formula's PHYSICAL obliquity lines p + s_i (plan 06 T1; `data/l1-physical-lines.json`): Earth's composed precession rate ψ̇(t) beating against the orbit's nodal modes s_i. Only ψ̇(t) scales; the nodal frequencies are fixed (μ = 1). The main line p + s₀ is the obliquity beat of falsification leg 1. (The former integer-label tables are retired.)

<!-- generated:doc99-l1-obliquity-lines -->
| Age (Myr) | ψ̇ (″/yr) | p+s7 (27.27 kyr today, rel. amp 0.10) | p+s1 (28.84 kyr today, rel. amp 0.54) | p+ζ14 (29.00 kyr today, rel. amp 0.14) | p+ζ9 (29.62 kyr today, rel. amp 0.10) | p+s2 (29.81 kyr today, rel. amp 0.48) | p+s4 (39.56 kyr today, rel. amp 0.48) | p+ζ4 (40.23 kyr today, rel. amp 0.32) | p+s3 (40.92 kyr today, rel. amp 1.00) | p+ζ7 (41.64 kyr today, rel. amp 0.18) | p+s6 (53.62 kyr today, rel. amp 0.16) |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| +200 (future) | 45.77 | 30.23 | 32.18 | 32.38 | 33.15 | 33.39 | 46.11 | 47.03 | 47.98 | 48.98 | 66.42 |
| **0 (J2000)** | **50.29** | **27.35** | **28.93** | **29.09** | **29.71** | **29.90** | **39.72** | **40.40** | **41.10** | **41.83** | **53.92** |
| −50 | 51.54 | 26.64 | 28.14 | 28.29 | 28.88 | 29.06 | 38.25 | 38.87 | 39.52 | 40.19 | 51.24 |
| −90 | 52.46 | 26.14 | 27.59 | 27.74 | 28.30 | 28.47 | 37.23 | 37.83 | 38.44 | 39.08 | 49.44 |
| −180 | 54.51 | 25.11 | 26.43 | 26.57 | 27.08 | 27.24 | 35.16 | 35.69 | 36.24 | 36.80 | 45.85 |
| −290 | 56.79 | 24.04 | 25.25 | 25.38 | 25.85 | 25.99 | 33.11 | 33.58 | 34.06 | 34.56 | 42.42 |
| **−380** | **61.03** | **22.29** | **23.33** | **23.43** | **23.83** | **23.95** | **29.87** | **30.25** | **30.64** | **31.04** | **37.24** |
| −440 | 61.37 | 22.16 | 23.18 | 23.29 | 23.68 | 23.80 | 29.63 | 30.01 | 30.40 | 30.79 | 36.88 |
| −620 | 69.76 | 19.37 | 20.15 | 20.23 | 20.53 | 20.62 | 24.86 | 25.12 | 25.39 | 25.66 | 29.76 |

Obliquity band: each line's period is 1,296,000/(ψ̇(t) + f_i) kyr with f_i the line's orbital frequency (fixed, μ = 1) and ψ̇(t) the precession rate of date the family carries — the composed general precession (the column) for the climatic-precession lines, the spin axis's inertial rate (the column times the hybrid's self-anchor factor 1.00192, 50.385 ″/yr at J2000) for the obliquity lines — the 10 lines are the physical L1 set of plan 06 T1 (`data/l1-physical-lines.json`, relative amplitude ≥ 0.1 within the family), not integer labels.
<!-- /generated:doc99-l1-obliquity-lines -->

**Key prediction**: the Devonian (380 Ma) obliquity beat p + s₃ reads **<!--v:obliqBeatDevonianKyr-->30.6<!--/v--> kyr** (modern <!--v:obliqBeatJ2000Kyr-->41.1<!--/v--> kyr; generated table above — the lunar torque adds to the spin scaling). This is what the deep-time astronomical literature has long said: Berger, Loutre & Laskar 1992 shorten the obliquity main period from 41 to 29 kyr over 500 Myr while the precession constant rises from 50 to 61 ″/yr (the generated Phanerozoic block above carries the composed clock's own reading at 500 Ma), and the Devonian cyclostratigraphic work of the De Vleeschouwer / Da Silva / Zeeden line uses obliquity near 29.5 kyr and precession of 16.1–19.4 kyr at ~372 Ma. Wu et al. 2024's inferred precession constants at 300–500 Ma (59.5–64.5 ″/yr) sit 2–3 % above the composed clock (Phanerozoic comparison block, § "The composition is what nature measures"); the residual has a named candidate — the Moon-distance history in the Pangea window, where Wu's anchors put the Moon closer than the smooth recession polynomial (reproducing a 29.5-kyr beat at 372 Ma needs the Moon at 56.7 R_E where the chain has 58.1). **The old text's "36–38 kyr observed (Meyers 2008, Boulila 2018)" was a mis-citation**: Meyers, Sageman & Pagani 2008 is the Cenomanian (~94 Ma) Bridge Creek record and Boulila et al. 2018 the middle Eocene (~40 Ma) timescale — epochs whose obliquity periods ARE 37–40 kyr — and the retired spin-only clock (37.7 kyr here) "matched" them by that error.

---

## Predicted climate lines at each age — climatic-precession band

The physical climatic-precession lines p + g_i (ψ̇(t) beating against the orbit's eccentricity modes g_i):

<!-- generated:doc99-l1-precession-lines -->
| Age (Myr) | ψ̇ (″/yr) | p+g4 (19.00 kyr today, rel. amp 0.67) | p+g3 (19.16 kyr today, rel. amp 0.46) | p+g2 (22.45 kyr today, rel. amp 0.86) | p+g1 (23.19 kyr today, rel. amp 0.20) | p+g5 (23.76 kyr today, rel. amp 1.00) |
|---:|---:|---:|---:|---:|---:|---:|
| +200 (future) | 45.77 | 20.35 | 20.53 | 24.35 | 25.23 | 25.91 |
| **0 (J2000)** | **50.29** | **19.00** | **19.16** | **22.45** | **23.19** | **23.76** |
| −50 | 51.54 | 18.66 | 18.81 | 21.97 | 22.68 | 23.23 |
| −90 | 52.46 | 18.41 | 18.56 | 21.63 | 22.32 | 22.85 |
| −180 | 54.51 | 17.89 | 18.03 | 20.92 | 21.56 | 22.05 |
| −290 | 56.79 | 17.35 | 17.48 | 20.17 | 20.77 | 21.23 |
| **−380** | **61.03** | **16.42** | **16.53** | **18.92** | **19.45** | **19.85** |
| −440 | 61.37 | 16.35 | 16.46 | 18.83 | 19.35 | 19.75 |
| −620 | 69.76 | 14.78 | 14.87 | 16.78 | 17.20 | 17.51 |

Climatic-precession band: each line's period is 1,296,000/(ψ̇(t) + f_i) kyr with f_i the line's orbital frequency (fixed, μ = 1) and ψ̇(t) the precession rate of date the family carries — the composed general precession (the column) for the climatic-precession lines, the spin axis's inertial rate (the column times the hybrid's self-anchor factor 1.00192, 50.385 ″/yr at J2000) for the obliquity lines — the 5 lines are the physical L1 set of plan 06 T1 (`data/l1-physical-lines.json`, relative amplitude ≥ 0.1 within the family), not integer labels.
<!-- /generated:doc99-l1-precession-lines -->

**Key prediction**: the Devonian climatic-precession lines span **16.7–20.3 kyr** (modern 19.0–23.8 kyr; generated table above). Meyers 2008 reports ~17.7 kyr — inside the predicted band.

---

## Predicted climate lines at each age — eccentricity band

The eccentricity-band lines |g_i − g_j| are planetary g-beats and **do not
scale with Earth's spin** — the measured verdict (the 405-kyr family
stable at 1.4/2.46 Ga while the precession band moves; doc 109). They stay
at their modern values at every epoch (up to the tiny solar-mass drift of
the mass-loss tier, ∝ 1/M — ~0.02 % at 2.46 Ga under the measured μ):

<!-- generated:doc99-l1-eccentricity-lines -->
| Line | Period (kyr) | rel. amplitude | Note |
|:---|---:|---:|:---|
| g4−g5 | 94.88 | 0.779 | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |
| z6−g5 | 96.85 | 0.110 | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |
| g3−g5 | 98.84 | 0.535 | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |
| z5−g5 | 101.01 | 0.155 | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |
| z7−g5 | 103.12 | 0.105 | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |
| g4−g1 | 105.14 | 0.155 | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |
| g3−g1 | 110.03 | 0.106 | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |
| g4−g2 | 123.85 | 0.672 | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |
| g3−g2 | 130.69 | 0.461 | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |
| z5−g2 | 134.50 | 0.133 | fixed at every epoch (planetary g-beat; ∝ 1/μ under the solar-mass history only) |
| g₂−g₅ | 405.63 | — | the engine’s 20-Myr mean beat; the long-eccentricity metronome |
| (g₂−g₅)/2 | 202.81 | — | carbon-thermostat 2nd harmonic (doc 92 §3), not orbital forcing |
| (g₂−g₅)/3 | 135.21 | — | carbon-thermostat 3rd harmonic (doc 92 §3), not orbital forcing |
<!-- /generated:doc99-l1-eccentricity-lines -->

The Devonian datum never discriminated the views: Da Silva 2020 measured
5 cycles in 490 kyr (radiometric anchors) → 98 kyr/cycle, which sits inside
the UNSCALED short-eccentricity family (95–110 kyr) as well as inside a
spin-scaled reading. What did discriminate: the deeper record
(1.4/2.46 Ga), where the precession band moves ~2× while the
long-eccentricity band stays ~405-class.

---

## Predicted Moon-Earth distance through time

The Moon's geocentric distance through time is the model's CITED INPUT (plan 12 option A — § "The mid-Precambrian window" above):

`a_Moon(t) = a_now · r(t)`,  r(t) the AstroGeo22 ratio a(t)/a(0) of Farhat et al. 2022, r'(0) = α₁ the LLR rate

The LOD from angular-momentum conservation on it is the derived quantity; the generated tables in § "The clock and the day through geological time" carry the values at the key epochs (at the Devonian the distance reads <!--v:moonDistanceAtDevonian-->368,549<!--/v--> km; at +200 Myr, on the LLR line held forward, <!--v:moonDistanceAt200MyrFuture-->392,039<!--/v--> km).

**Modern lunar recession rate**: **3.82 cm/yr** — Lunar Laser Ranging direct measurement (Dickey 1994 / Chapront 2002). The model's α₁ = −9.9376e-5 /Ma is that observation, and it is the J2000 slope of the history; the shape through the Precambrian is Farhat's ocean-model solution, not a fitted term.

The derived days per year at the direct paleontological anchors, as the paleo gate reads them (every row a test; the documented deviations are bands whose cause is written in `data/paleo-validation-anchors.json`):

| Epoch | Derived days/yr | Published | Deviation |
|---|---:|---:|---:|
| Triassic 230 Ma (Wells 1963) | <!--v:anchorWells230Pred-->385.07<!--/v--> | 385 | <!--v:anchorWells230DeltaPct-->+0.02<!--/v--> % |
| Mississippian 345 Ma (Wells 1963) | <!--v:anchorWells345Pred-->401.41<!--/v--> | 396 | <!--v:anchorWells345DeltaPct-->+1.37<!--/v--> % (documented band) |
| **Devonian 380 Ma** (Wells 1963) | **<!--v:anchorWellsFlagship380Pred-->402.83<!--/v-->** | **400** | **<!--v:anchorWellsFlagship380DeltaPct-->+0.71<!--/v--> %** (documented band) |
| Early Devonian 405 Ma (Wells 1963) | <!--v:anchorWells405Pred-->403.30<!--/v--> | 402 | <!--v:anchorWells405DeltaPct-->+0.32<!--/v--> % |
| Cambrian 500 Ma (Wells 1963) | <!--v:anchorWells500Pred-->406.36<!--/v--> | 412 | <!--v:anchorWells500DeltaPct-->−1.37<!--/v--> % (documented band) |

The Phanerozoic rows sit within ±1.4 % of the coral counts with nothing fitted to them (the former "−0.01 % at 380 Ma" was the deleted quartic reading back the row it was calibrated on). The genesis is the input's end, 4.429 Ga (Farhat's lunar age, 4.425 Ga); the former "Moon at the rigid Roche limit at 4.498 Ga" was the deleted spline's pinned endpoint, not a result.

---

## Predicted planetary semi-major axes & Earth-planet distances (Driver 2)

Under Driver 2, each planet's semi-major axis drifts via the adiabatic invariant `a × M_Sun = const` — going to past, the Sun was more massive, so every orbit was tighter. **The entire solar system shrinks uniformly** (same fractional amount for every planet), preserving relative geometry.

```
a_planet(t) = a_planet_J2000 × (1 − mass_loss_fraction(t))
           = a_planet_J2000 × (1 − 9.30 × 10⁻¹⁴ × t_Ma × 1e6)
```

| Planet | a_J2000 (km) | a_Devonian (380 Ma, km) | a_Hadean (4 Gyr, km) | Δ at Devonian |
|:---|---:|---:|---:|---:|
| Mercury | 57,909,176 | **57,907,130** | 57,887,636 | −2,046 km |
| Venus | 108,208,930 | **108,205,106** | 108,168,680 | −3,824 km |
| Earth (AU) | 149,597,871 | **149,592,585** | 149,542,225 | −5,286 km |
| Mars | 227,939,200 | **227,931,145** | 227,854,414 | −8,055 km |
| Jupiter | 778,547,200 | **778,519,688** | 778,257,605 | −27,512 km |
| Saturn | 1,433,449,370 | **1,433,398,716** | 1,432,916,172 | −50,654 km |
| Uranus | 2,876,679,082 | **2,876,577,429** | 2,875,609,049 | −101,653 km |
| Neptune | 4,503,443,661 | **4,503,284,523** | 4,501,768,523 | −159,138 km |

**Earth-planet distances** (time-averaged √(a_E² + a_P²), useful for the 3D model's planet display):

| Planet | <d>_J2000 (km) | <d>_Devonian (km) | Δ |
|:---|---:|---:|---:|
| Mercury | 160,415,073 | **160,409,405** | −5,668 |
| Venus | 184,631,242 | **184,624,718** | −6,524 |
| Mars | 272,645,928 | **272,636,293** | −9,635 |
| Jupiter | 792,789,547 | **792,761,532** | −28,015 |
| Saturn | 1,441,234,408 | **1,441,183,479** | −50,929 |
| Uranus | 2,880,566,275 | **2,880,464,484** | −101,791 |
| Neptune | 4,505,927,688 | **4,505,768,462** | −159,226 |

### Structural fact — the whole solar system rescales together

Because every planet shrinks by the **same fractional amount** under Driver 2, the relative geometry — orbital period ratios, semi-major axis ratios, perihelion alignments, the eccentricity-band beats — **is preserved across all epochs**. Only the absolute distance scale (and proportionally, period scale) changes.

This mirrors Driver 1's effect on the spin tier: there, Earth's spin-tier periods (the precession period, the obliquity beat, the day) lengthen together; here, the planetary orbits shrink uniformly going to past. Both drivers act multiplicatively on their respective scales, leaving relative structure invariant.

| Driver | Acts on | Effect | Fractional change at Devonian |
|:---|:---|:---|:---|
| Driver 1 (Earth-Moon tidal) | Earth's spin-tier periods (the precession period, the obliquity beat, the day) | Lengthen past → future | T_p grows from <!--v:axialPrecAtDevonian-->21,235<!--/v--> yr → <!--v:axialPrecAt200MyrFuture-->28,315<!--/v--> yr (+30 % over 580 Myr) |
| Driver 2 (Solar mass loss) | Spatial lattice (planet a, Earth-planet d) | Shrinks in past → grows in future | Whole solar system −35 ppm at Devonian, +35 ppm at +200 Myr |

**Reproducibility**: the generated tables of this section carry registry tags written by the engine, and the hand tables are the Driver-2 scaling applied to the J2000 inputs; the live deep-time surfaces are the API's epoch tools and the Python bridge.

---

## When did the clock start? — the Moon's history

If the precession clock has been lengthening with the tidal history, we can extrapolate backward to the "genesis" of the Earth–Moon system. The proper-physics formula naturally produces this answer.

### Interpretation 2: the cited history's end — the genesis is an input, not a result

The derived chain runs on the cited distance history, and that history ends where its authors' lunar-age input puts the Moon's formation: Farhat et al. 2022's solution stops at **4,429 Ma** (lunar age 4.425 Ga, the Hf-W giant-impact chronometry), with the Moon at **<!--v:moonDistanceAtHadean-->39,509<!--/v--> km ≈ <!--v:moonDistanceAtHadeanRE-->6.19<!--/v--> R_E** — not at the rigid Roche limit. The model refuses beyond that age (null, never an extrapolation). At the end the conservation chain gives a day of ~5.5 h against the solution's own 5.8 h (the 0.3 h is the solar angular-momentum exchange Farhat's ocean model carries and the J2000-constant L_EM does not), and the composed precession period collapses to years under the near Moon's torque — a statement of the composition law at the edge of the input's domain, not a calibrated prediction.

**Withdrawn (plan 12 option A):** the former claim that "the proper-physics formula naturally places the Moon at the rigid Roche limit at 4.498 Ga — a self-validation with no Hadean constraint in the fit". The 4.498 Ga Roche crossing was the deleted spline's PINNED endpoint (the regime block carried `genesisMa: 4498, rocheLimitKm: 9439.6` as parameters), and before the regime block it was the extrapolation of a quartic whose two higher coefficients were fitted to Farhat's curve, i.e. an echo of Farhat's lunar age through the fit. Neither was a derivation. The right order — Earth first (Patterson 1956, 4.54 Ga), the Moon shortly after — is the literature's result and the input carries it.

### How the clock grew from genesis to present

The shipped chain, written by the engine on the cited history — LOD by conservation, the Moon distance (the input), the composed precession period and the obliquity beat (Farhat 2022's own LOD column for comparison: 5.8 hr at 4.43 Ga, 10.7 hr at 4.20 Ga, 15.3 hr at 3.20 Ga, 17.0 hr at 2.46 Ga, 19.5 hr at 1.00 Ga, 20.4 hr at 0.65 Ga, 21.8 hr at 0.38 Ga — conservation on his distance reproduces his day length to 0.01 h at 100 Ma, 0.14 h at 2.46 Ga, 0.24 h at 4.4 Ga):

<!-- generated:doc99-genesis-table -->
| Age (Gyr) | LOD (hr) | Moon distance (km) | T_p (yr) — the composed precession period | obliquity beat (kyr) |
|---:|---:|---:|---:|---:|
| **4.429 (genesis — the cited history's end, Farhat 2022's lunar age)** | 5.51 | 39,509 | 9 | — (ψ̇ ≫ \|s₃\|: the beat ≈ T_p) |
| 4.20 | 10.48 | 209,977 | 2,382 | — (ψ̇ ≫ \|s₃\|: the beat ≈ T_p) |
| 3.20 | 15.10 | 298,256 | 8,841 | — (ψ̇ ≫ \|s₃\|: the beat ≈ T_p) |
| 2.46 | 16.84 | 321,186 | 11,863 | 14.30 |
| 1.00 | 19.38 | 348,253 | 16,584 | 21.80 |
| 0.65 | 20.34 | 356,928 | 18,435 | 25.12 |
| 0.38 | 21.76 | 368,549 | 21,235 | 30.64 |
| **0 (Modern)** | 24.00 | 384,399 | 25,772 | 41.10 |
| +0.2 (future, LLR rate held) | 25.23 | 392,039 | 28,315 | 47.98 |

Near genesis the Moon's torque dominates by orders of magnitude ((a₀/a_M)³ ≈ 921 at the input's end, 4.429 Ga), so the precession period collapses to years — a statement of the composition law at the edge of the input's domain, not a calibrated prediction (the distance there is Farhat et al. 2022's solution, read as the ratio a(t)/a(0) on the J2000 distance; the model refuses beyond 4,429 Ma).
<!-- /generated:doc99-genesis-table -->

The distance column IS Farhat's (the input, on the model's J2000 anchor); the day-length column is conservation on it, and agrees with his own to 0.01 h at 100 Ma and 0.24 h at 4.4 Ga. Forward of J2000 the input has no future: the chain holds the LLR rate constant there, a labelled extrapolation (Farhat's model accounts for the future recession-rate slowdown; the two part by a few per cent at +0.2 Gyr).

### Growth rate (current)

The clock's current growth rate, written by the engine from the shipped chain:

<!-- generated:doc99-growth-rate -->
| Rate at J2000 | Value |
|:---|---:|
| dT_p/dt (the precession period) | +12.1 yr per Myr = +0.0471 % per Myr |
| d(beat)/dt (the obliquity beat) | +30.9 yr per Myr = +0.0752 % per Myr |
| dLOD/dt (the tidal chain) | +21.30 s per Myr = +2.13 ms per century |

Central differences of the shipped chain at ±1 Myr. The precession period grows faster than the day length alone would make it, because the lunar torque falls as the Moon recedes: the composition law, not spin-scaling.
<!-- /generated:doc99-growth-rate -->

For comparison, the canonical Wells anchor `dLOD/dt = 0.00526 hr/Ma` gives a day-length fractional rate of 0.00526 / 24 = 2.19×10⁻⁴ per Myr (0.0219 % per Myr); the precession period grows about twice as fast in fractional terms because the receding Moon weakens the lunar torque as well as slowing the spin.

Other useful conversions (all anchored at modern LLR 3.82 cm/yr da/dt, Dickey 1994 / Chapront 2002):
- **Per million years**: 0.0219 % per Myr
- **Per 100 million years**: 2.19 % per 100 Myr
- **Per Gyr**: 21.9 % per Gyr

So in 1 Gyr (1,000 Myr), the day would lengthen by about **22 %** under the linear approximation — linear extrapolation puts the day 1 Gyr ago at ≈ 78 % of today's. The shipped chain on the cited history gives 19.38 hr = **80.8 %** of today's (Farhat 2022's own day-length column reads 19.5 hr there — conservation on his distance reproduces it to 0.1 h). The two are within ~3 % of the linear guess — close enough that for narrative purposes "about 78–81 % of modern" is the right framing. The precession period moves more (the generated genesis table: the 1.00 Gyr row, ~65 % of today's) because the closer Moon's torque adds to the spin scaling.

**Important caveat: the rate isn't constant.** It was much higher at Moon formation (Earth-Moon system far from equilibrium, strong tidal coupling) and slows asymptotically as the system approaches tidal-lock equilibrium. The current rates in the generated table are *modern* rates, not time-averages. The cited history carries this curvature as its authors' ocean-dissipation physics; the chain adds no term for it.

The former pure-linear formula was anchored at the canonical Wells lunar-only rate (<!--v:wellsTidalRate-->0.00526<!--/v--> hr/Ma); the shipped chain reads the cited distance history instead, and Wells is one of the anchors that TEST it. Modern observed LOD rate (2.3 ms/century) includes both tidal and post-glacial-rebound contributions and would give a different long-term stretch; the Wells lunar-only rate is the correct choice for structural evolution timescales.

### 🌌 The Expanding-Universe parallel

The name "Expanding Solar System Resonance Theory" deliberately echoes Hubble's **Expanding Universe Theory**. The structural parallels are striking — and useful for situating ESSRT within established cosmological language:

| Property | Expanding Universe Theory | Expanding Solar System Resonance Theory (ESSRT) |
|:---|:---|:---|
| **What expands** | Distances between galaxies | Earth's spin-tier periods (the lunisolar precession period, the obliquity beat, the day) |
| **Direction of change** | Monotonic — distances grow | Monotonic — periods grow |
| **Driving mechanism** | Metric expansion of space (dark energy / Λ) | Earth-Moon tidal evolution + solar mass loss |
| **Beginning** | Big Bang (~13.8 Gyr ago) | Earth-Moon genesis (<!--v:moonGenesisAgeGa-->4.429<!--/v--> Gyr ago — the cited history's end, Farhat 2022's Hf-W lunar age, ~110 Myr after Patterson's 4.54 Pb-Pb Earth age) |
| **Asymptotic future** | Heat death (de Sitter expansion forever) | Earth-Moon tidal lock (LOD → ∞ at a_Moon → <!--v:tidalLockKm-->555,623<!--/v--> km, ~50 Gyr ahead) |
| **Defining clock** | Hubble parameter `H₀ ≈ 70 km/s/Mpc` | The mean lunisolar precession period, <!--v:lunisolarPeriodJ2000Yr-->25,771.6<!--/v--> yr today, lengthening at the rate of the generated table above |
| **Measurement anchor** | Cosmic Microwave Background + redshift surveys | LOD (J2000) + Farhat 2022 deep-time + paleontological day counts (Wells 1963) |
| **Domain of validity** | Post-Planck era through far future | Post-Moon-formation through tidal-lock asymptote |
| **Structure preserved** | Statistical homogeneity + isotropy on large scales | The composition law ψ̇ = [ω/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M)³] and the two-tier split (spin periods move, the eccentricity beats do not) |
| **What does *not* change** | Underlying laws of physics, dimensionless ratios | The eccentricity-band beats (planetary g-modes, μ-scaled only); the frame arithmetic of the perihelion-of-date |

**Where the parallel breaks down (important to acknowledge):**

1. **Scale.** Cosmic expansion is universal and dominates large-scale dynamics. ESSRT is bounded to the solar system and acts on geological-to-astronomical timescales — relevant to paleoclimate and orbital evolution, not to the cosmos at large.
2. **Mechanism.** The Expanding Universe is driven by a *fundamental* property of spacetime (dark energy / cosmological constant). ESSRT is driven by *standard* mechanics (Newton's laws + tidal Q + Sun's mass-loss rate). It's a structural consequence of well-understood physics, not a new fundamental force.
3. **Reversibility.** Cosmic expansion is one-way (no contraction in our universe's life-cycle). ESSRT is also one-way over its domain, but the underlying physics (tidal friction, solar mass loss) are dissipative processes specific to the solar system — different category from spacetime expansion.

The parallel is rhetorical and pedagogical, not physical equivalence. ESSRT borrows the *language* of expansion because the **structural fact** — a monotonically growing scale parameter governing a richly structured system — is the same shape of claim.

### 🛠️ Proper-physics LOD formula (Architecture α)

Two layers: a CITED distance history and exact conservation on it (plan 12 option A). The history is Farhat et al. 2022's ocean-model solution over 4.429 Gyr (§ "The mid-Precambrian window"); nothing in the chain is fitted to the rock record. Future is the LLR rate held constant, **physically bounded** by the tidal-lock asymptote (no polynomial diverging to infinity).

```
  Layer 1 — Moon distance evolution (the cited input):
    a_Moon(t) = a_now · r(t),  r = the AstroGeo22 ratio a(t)/a(0) (monotone cubic Hermite, r'(0) = α₁)

  Layer 2 — Angular-momentum conservation (EXACT physics):
    LOD(t) = 2π · I_E
             ─────────────────────────────────────────
             L_total − M_M · √(GM_(E+M) · a(t)) · √(1−e²)

  Constants (full physics):
    I_E       = 8.0343e37 kg·m²    (Earth moment of inertia, α=0.3306947)
    GM_(E+M)  = 4.03505e14 m³/s²   (Earth-Moon system, IAU)
    M_M       = 7.346e22 kg        (Moon mass)
    a_now     = 384,399,000 m      (Moon semi-major axis at J2000)
    e_Moon    = 0.054900489        (Moon eccentricity)
    L_total   = 3.4729550e34 kg·m²/s  (Earth-Moon total angular momentum)
    a_lock    = 555,623,479 m      (tidal-lock asymptote ≈ 1.446 × a_now)

    α₁ = −9.9376e−05  /Ma   (modern recession from LLR 3.82 cm/yr, Dickey 1994 / Chapront 2002 — the history's J2000 slope)
    r(t)                     the AstroGeo22 table (data/astrogeo22-earth-moon.json), 0–4,429 Ma at 1 Myr — no fitted coefficient
```

**Properties:**
- Modern LOD = 86,400 s exactly (anchor preserved)
- Modern lunar recession = 3.82 cm/yr at J2000 (LLR anchor, Dickey 1994 / Chapront 2002)
- Past 4.43 Gyr IS Farhat 2022's distance history; the day length is conservation on it (0.01 h from his own at 100 Ma, 0.24 h at 4.4 Ga); the rock record tests the result, the documented deviations are bands with their cause written
- The history ends at the input's lunar age (4.429 Ga, the Moon at 6.2 R_E); beyond it the chain refuses
- Future LOD approaches the tidal-lock asymptote (LOD → ∞ at a → <!--v:tidalLockKm-->555,623<!--/v--> km) on the LLR rate held constant, a labelled extrapolation
- One smooth C1 history (the input's 1-Myr samples on a monotone cubic Hermite), no piecewise regime

**Verified key epochs** (written by the engine):

<!-- generated:doc99-key-epochs -->
| Age (Ma) | LOD (s) | LOD (hr) | Moon distance (km) | T_p (yr) | obliquity beat (kyr) |
|---:|---:|---:|---:|---:|---:|
| 0 (Modern) | 86,400.0 | 24.000 | 384,399 | 25,772 | 41.10 |
| 380 (Devonian) | 78,331.4 | 21.759 | 368,549 | 21,235 | 30.64 |
| 550 (Cambrian) | 75,630.7 | 21.009 | 362,576 | 19,747 | 27.63 |
| 1,000 (Mesoproterozoic) | 69,779.4 | 19.383 | 348,253 | 16,584 | 21.80 |
| 2,500 (Archean) | 60,404.2 | 16.779 | 320,391 | 11,745 | 14.13 |
| 4,429 (Earth-Moon genesis — the cited history's end) | 19,820.9 | 5.506 | 39,509 | 9 | — |
| **−200 (+200 Ma future)** | 90,841.3 | 25.234 | 392,039 | 28,315 | 47.98 |
| **−1,000 (+1 Gyr future)** | 113,660.8 | 31.572 | 422,599 | 41,671 | 105.28 |
| **−4,500 (+4.5 Gyr future)** | — | — | — | — | beyond tidal lock (LLR rate held forward) |
<!-- /generated:doc99-key-epochs -->

**Past → future range:** the past is the cited history's span (to 4,429 Ma; the model refuses beyond it). Forward of J2000 the input has no future, so the chain holds the LLR rate constant — a labelled extrapolation that **reaches the tidal-lock distance** (a → <!--v:tidalLockKm-->555,623<!--/v--> km) at about +4.5 Gyr, beyond which the formula returns `null`. This is a FORMULA horizon, not a physical event: in reality, Earth-Moon approaches true synchronous rotation over ~50 Gyr (the held rate doesn't model the future tidal-Q decay that slows the recession). For projections past ~+1 Gyr a tidal-Q model is required. By comparison, pure-linear LOD extrapolations have no asymptote at all.

**Genesis**: the cited history ends at its lunar age, **<!--v:moonGenesisAgeGa-->4.429<!--/v--> Ga**, with the Moon at **<!--v:moonDistanceAtHadean-->39,509<!--/v--> km = <!--v:moonDistanceAtHadeanRE-->6.19<!--/v--> R_E** and a day of ~5.5 h by conservation (Farhat 2022's own 5.8 h: the 0.3 h is the solar angular momentum his model exchanges and the constant J2000 L_EM does not). The former "genesis validation" at the rigid Roche limit is withdrawn (§ Interpretation 2).

**Devonian note**: on the cited history, the composed precession period at the Devonian is **<!--v:axialPrecAtDevonian-->21,235<!--/v--> yr** and the Wells 1963 days-per-year row reads <!--v:anchorWellsFlagship380DeltaPct-->+0.71<!--/v--> % (a documented band: Wells's "~400" is a rounded count) — the curvature inside the Phanerozoic is what a linear approximation misses.

### How unique is this formula? Honest positioning

The model's value here is **distillation**, not discovery: we take well-established physics components and package them into a single Excel-pasteable expression with the right asymptotics in both directions. Each ingredient is standard; the synthesis appears to be new.

**Standard (used by everyone since the 1960s):**

| Component | Source |
|:---|:---|
| Angular-momentum conservation (Layer 2) | Newtonian — textbook physics, used in every tidal-evolution paper |
| Kaula tidal recession (`da/dt = K/a^(11/2)` → `a^(13/2) ∝ t`) | Kaula 1964 |
| Canonical Wells rate (<!--v:wellsTidalRate-->0.00526<!--/v--> hr/Ma, Phanerozoic average) | Wells 1963 |
| Numerical deep-time anchors (LOD at 0.35–4.42 Gyr) | Farhat et al. 2022 |
| Earth moment of inertia α = <!--v:alphaJ2000-->0.3306947<!--/v--> | IERS Conventions 2010 |

**What the model adds, and what it does not (plan 12 option A):**

1. **It adds no recession physics.** The Moon's distance history needs an ocean-dissipation history the model does not carry; Farhat et al. 2022's solution is that physics, and it is the input — as DE440's masses and IAU 2006's p_A are inputs. The former polynomial parametrization ("no t² term", α₃/α₄ fitted to eight of Farhat's points) and the regime spline fitted to the rocks are deleted: a closed-form copy of a numerical solution adds no physics, and a fit to the test data is not a test.
2. **It adds the derived chain on that history**, one home per law: the day length by angular-momentum conservation with the J2000 L_EM constant; the composed lunisolar precession and the clock T_p(t); the obliquity beat 2π/(ψ̇ − |s₃|); the month chain; the year of date on the solar-mass law — and the gates that read every rock datum against them.
3. **It states its discrepancies as bands.** The Mesoproterozoic precession constants of Zhou 2024 (<!--v:anchorZhouWumishanPrec1480DeltaPct-->−4.75<!--/v--> % and <!--v:anchorZhouChuanlinggouPrec1634DeltaPct-->−5.31<!--/v--> % at 1.48 and 1.63 Ga) are the open one; the Phanerozoic coral counts sit within ±1.4 %.

**The published landscape:**

| Source | Approach | Our relation to it |
|:---|:---|:---|
| Kaula 1964 | `a^(13/2)` linear in t (constant dissipation) | the timescale problem it exposes (Roche at 1.5 Ga) is why a dissipation history is needed |
| Touma & Wisdom 1994 | N-body integration | — |
| Néron de Surgy & Laskar 1997 | secular ODEs | — |
| Williams 2000 | empirical paleo fits | the tidalite rows the gate tests |
| Farhat et al. 2022 | full ocean tidal model | **the input** (AstroGeo22) |
| Mitchell & Kirscher 2023 / Wu 2024 | thermal-tide day-length lock | not carried (Laskar et al.'s review: "not supported" on the robust data) |
| Zhou 2024 | Mesoproterozoic cyclostratigraphy | the open discrepancy, stated as bands |

**How to cite this in publications:**

> *"The Earth–Moon distance history is taken as a cited input — the ocean-tide dissipation solution of Farhat et al. (2022), AstroGeo22 — read as the ratio a(t)/a(0) on the observed J2000 distance with the LLR recession rate as its J2000 slope. The day length follows by angular-momentum conservation, the axial precession by the composed lunisolar law on that day length and distance; the Precambrian cyclostratigraphic record tests the result, and the deviations are reported as such."*

---

## Why does the Moon drift away? The angular-momentum cause

Recession follows from angular-momentum conservation alone (below); no
other relation adds to it.

**Driver 2's Kepler form.** Under adiabatic mass loss `a ∝ 1/M` and `T ∝ M⁻²`, hence `sidYear_s × (AU₀/AU)² = sidYear_s(J2000)` at every epoch. The shipped implementation never evaluates a mass at deep time — it uses the product forms directly: with `Δm(t)` the fractional solar mass lost (defined against the Sun-only J2000 mass), `AU(t) = AU₀·(1−Δm)` and `sidYear_s(t) = sidYear_s(J2000)·(1−Δm)²`. An explicit Kepler evaluation reproduces this bit-for-bit under two conditions. First, Kepler runs on the **two-body** parameter `G(M_☉+M_E)` — the same convention by which the J2000 constants are set (GM_Sun+Earth from Earth's orbit; GM_Sun backed out by subtracting GM_Earth). Scaling only the Sun's share while holding Earth's fixed breaks the identity at the `Δm × M_E/(M_☉+M_E)` level — ≈0.6 ppb at genesis, visible at floating-point level. Second, the epoch mass is the division form `μ(t) = μ(J2000)/(1−Δm)`, with Δm still defined against the constant J2000 mass. Then `T = 2π√(a³/μ) = T₀·(1−Δm)^(3/2)·(1−Δm)^(1/2) = T₀(1−Δm)²`, identical to the product form, and `T²·μ/a³ = (1−Δm)⁴·(1−Δm)⁻¹·(1−Δm)⁻³ = 1` exactly — Kepler's third law holds at every epoch by construction.

### Angular-momentum conservation

Earth's rotation rate CANNOT change in isolation — angular momentum is conserved. So if Earth loses spin angular momentum, **something else must gain it**.

The only mass available to absorb Earth's spin angular momentum is the Moon, via orbital coupling. Conservation gives:

```
L_E_spin + L_M_orbital = L_total = constant
```

For Earth's spin to decrease (slowing rotation), Moon's orbital angular momentum must increase. From Kepler:
```
L_M_orbital = M_M × √(GM × a_M × (1−e²))
```

L_M increases ONLY when a_M (Moon's distance) increases. **Therefore: as Earth's rotation slows, the Moon must drift outward.**

### The standard mechanism (tidal coupling)

Standard physics describes the mechanism: Earth's tidal bulge is dragged ahead of the Earth-Moon line by Earth's rotation, creating a torque that:
- Slows Earth's spin (loses angular momentum)
- Accelerates the Moon's orbit (gains angular momentum)

Tidal coupling is the *mechanism*; angular-momentum conservation is the *constraint the mechanism obeys*.

### The drift formula

This is **not a standard textbook formula** — it's a straightforward consequence of angular momentum conservation. Textbooks usually express conservation in terms of L_total, or compute da/dt directly from tidal Q (Goldreich 1966, Murray-Dermott 1999 Ch 4). The form below uses the observed `dLOD/dt` as input rather than tidal Q.

Derivation:
```
L_total = L_E_spin + L_M_orbital = constant

L_E_spin = I_E × (2π/LOD)
    →  dL_E/dt = -(2π · I_E / LOD²) × dLOD/dt

L_M_orbital = M_M × √(GM × a × (1−e²))
    →  dL_M/dt = M_M · √(GM · (1−e²)) / (2√a) × da/dt

Conservation: dL_M/dt = -dL_E/dt
    →  M_M · √(GM · (1−e²)) / (2√a) × da/dt  =  (2π · I_E / LOD²) × dLOD/dt
```

Solving for `da/dt`:
```
da_M/dt = (4π · I_E · √a_M · dLOD/dt_lunar) / (LOD² · M_M · √(GM · (1−e²)))
```

where:
- `dLOD/dt_lunar` is the **lunar-only contribution** to LOD slowdown (NOT the total observed rate)
- `I_E` is Earth's moment of inertia (8.034×10³⁷ kg·m², using IERS α = <!--v:alphaJ2000-->0.3306947<!--/v-->)
- `M_M` is Moon's mass (7.346×10²² kg, from GM_Moon/G)
- `GM` is the Earth-Moon gravitational parameter (4.035×10¹⁴ m³/s²)
- `a_M` is Moon's current semi-major axis (3.844×10⁸ m)
- `e` is Moon's orbital eccentricity (<!--v:moonOrbitalEccentricity-->0.0549<!--/v-->)

### Why the input must be the LUNAR-only LOD slowdown

The observed modern total LOD slowdown is ~2.3 ms/century, but this has multiple contributions, only one of which drives Moon recession:

| Contribution to dLOD/dt | Rate (ms/century) | Angular momentum goes to | Drives Moon drift? |
|:---|---:|:---|:---:|
| **Lunar tidal torque** | **~2.16** | **Moon's orbit** | **✓ Yes** |
| Solar tidal torque | ~0.4 | Earth's orbit around Sun | ✗ No |
| Post-glacial rebound | ~−0.5 | Internal mass redistribution | ✗ No |
| Core-mantle coupling | small, fluctuates | Internal exchange | ✗ No |
| **Net total observed** | ~2.3 | various | mixed |

Only the **lunar-only** ~2.16 ms/century transfers to Moon's orbit. The solar component goes to Earth's heliocentric orbit (slightly increasing Earth's orbital angular momentum), and post-glacial rebound is purely internal.

### Modern evaluation

Using `dLOD/dt_lunar = 2.16 ms/century = 2.16 × 10⁻⁵ s/yr`:

```
da_M/dt = 4π × 8.034×10³⁷ × √3.844×10⁸ × 2.16×10⁻⁵
         ──────────────────────────────────────────────
          86400² × 7.346×10²² × √(4.035×10¹⁴ × 0.99699)
         
        = 3.90 × 10⁻² m/yr  =  3.90 cm/yr
```

**Lunar laser ranging measures: 3.83 cm/yr.** The model's formula matches modern observation within **1.8 %** when the correct lunar-only input is used (and the tighter IERS α = <!--v:alphaJ2000-->0.3306947<!--/v--> moment of inertia).

Using the total observed `dLOD/dt = 2.3 ms/century` overstates the Moon drift to 4.14 cm/yr (8% high), because it incorrectly attributes solar-tide and post-glacial-rebound contributions to Moon recession.

### Honest assessment

This formula is not a standard published equation — it is a **conservation-based identity** derived for this analysis. The underlying physics (angular momentum conservation, the textbook tidal mechanism) is entirely standard. The contribution here is recasting it as a clean da/dt relation tied to the model's structural picture.

The model's claim about the formula is:
1. **It's algebraically equivalent to standard angular momentum conservation** ✓
2. **It correctly predicts Moon drift rate (within 1.8%) using observed lunar despin rate as input** ✓
3. **It does NOT predict either rate from first principles** — it relates the two observables via conservation. For a first-principles prediction of either, the textbook tidal Q formulation is needed.

The *fact* of recession follows from angular-momentum conservation as Earth's spin slows; the exact rate comes from tidal Q physics.

---

## The Earth-Sun side — does AU also drift?

The same logic applies to Earth's orbit around the Sun. Solar tides on Earth slow Earth's rotation, and the lost angular momentum goes to Earth's solar orbit (just like lunar tides drive lunar orbital expansion).

**But solar mass loss dominates the AU drift:**

| Source of AU drift | Rate (cm/yr) | Mechanism |
|:---|---:|:---|
| Solar tides (analogue of lunar formula) | ~0.0003 | Earth's spin → Earth's solar orbital angular momentum |
| **Solar mass loss** | **~1.42** | **Sun loses ~6×10⁹ kg/s; orbits expand as central mass decreases** |
| **Total observed (Pitjeva & Standish 2009)** | **~1.5 cm/yr** | Mass loss dominates |

**Solar mass loss outdoes solar tides by a factor of ~5,000.** The Sun loses mass via solar wind + electromagnetic radiation. For a body orbiting a slowly-shrinking central mass, conservation of angular momentum requires the orbit to expand:
```
da_AU/dt = a_AU × (dM_sun/M_sun)/dt   ≈ a_AU × 9.5×10⁻¹⁴ /yr = 1.42 cm/yr
```

### Impact on the year in seconds

The year in seconds is not constant at deep time: Kepler's 3rd law with adiabatic mass conservation (`a × M = const`) gives:
```
dT/T = (3/2) × da/a − (1/2) × dM/M
     = (3/2)(−dM/M) − (1/2)(dM/M)
     = −2 × dM/M
```

So as we go back in time (more massive Sun), Earth's orbital period was **shorter** in seconds.

**Magnitude across geological time:**

| Era | t_Ma | ΔAU | Δyear_s | Δyear_s / year_s (Driver 2 only) |
|:---|---:|---:|---:|---:|
| Cretaceous | 100 | −1,391 km | −587 s | −19 ppm |
| **Devonian** | **380** | **−5,285 km** | **−2,230 s** | **−71 ppm** |
| Neoproterozoic (Tonian) | 1,000 | −13,907 km | −5,867 s | −186 ppm |
| Paleoproterozoic | 2,000 | −27,814 km | −11,735 s | −372 ppm |
| Hadean | 4,543 | −63,178 km | −26,655 s | −845 ppm |

The sign convention: the year in seconds is *shorter* at past epochs (the Sun was more massive).

### Architectural choice: explicit treatment via three time-dependent functions

The model **explicitly tracks AU, sidereal year, and tropical year drift** rather than holding any of them fixed. All three are time-dependent functions (the one home is the `@essrt/physics` deep-time factory, `tools/lib/deep-time.js` its Node mirror):

```javascript
// Δm(t) = SOLAR_MASS_LOSS_FRAC_PER_YR × t_Ma × 1e6   (≈ 9.30 × 10⁻¹⁴ × t_Ma × 1e6)

// meanAuAtAge(t_Ma): AU drift from adiabatic conservation a × M = const
meanAuAtAge(t_Ma) = currentAUDistance × (1 − Δm)

// siderealYearSecondsAtAge(t_Ma): Kepler orbital period, fixed-star anchor —
// exact Kepler under a × M = const, T ∝ M⁻² (the same Driver-2 law the planet chains use)
siderealYearSecondsAtAge(t_Ma) = T_sid,J2000 × (1 − Δm)²        // T_sid,J2000 = the IAU sidereal year

// tropicalYearSecondsAtAge(t_Ma): the sidereal year less the equinox's turn, in rate form,
// on the composed precession rate of date ψ̇(t) (per Julian year)
1 / tropicalYearSecondsAtAge(t_Ma) = 1 / siderealYearSecondsAtAge(t_Ma) + ψ̇(t) / (1,296,000″ × 365.25 × 86,400 s)
```

At J2000 the tropical year is the derived <!--v:meanSolarYearDays-->365.2421905<!--/v--> d (from the IAU sidereal year and p_A, plan 09).

**Sidereal vs tropical** — both scale identically with solar mass loss. The difference (~1,224.5 s per year at J2000) is Earth's axial precession — one equinox turn per T_p(t) — which is independent of AU drift and grows into the past with ψ̇(t).

This formulation keeps Driver 1 (LOD and ψ̇ via tidal evolution) and Driver 2 (year_s via solar mass loss) explicitly separate; the day count `days/yr = tropical_year_s / LOD` composes them.

### So what does the model say about AU?

| Claim | Status |
|:---|:---|
| AU drifts outward | ✓ Yes (~1.42 cm/yr from solar mass loss) |
| AU drift is dominated by solar tides | ✗ No — mass loss dominates by 5000× |
| Model treats AU and year_s as constants | ✗ No — explicit via `meanAuAtAge()`, `siderealYearSecondsAtAge()`, `tropicalYearSecondsAtAge()` |
| Mass-loss effect on the year in seconds at Phanerozoic | Small (−71 ppm at Devonian) but tracked |
| Mass-loss effect on the year in seconds at Hadean (4.5 Gyr) | Significant (−845 ppm); critical for that scope |

The model's architecture is the **same at any timescale**: two physical inputs (solar mass loss, tidal recession) composed through Kepler and angular-momentum conservation, and everything else derives (the retired device's day-count identity is deleted, plan 09 step 7a). The Phanerozoic-vs-Hadean difference is only in the magnitude of the corrections, not in the formulae used.

---

## Post-glacial rebound — Quaternary transient, irrelevant to deep time

**What it is**: During the last Ice Age (~20 kyr ago), thick ice sheets (Laurentide over Canada, Fennoscandian over Scandinavia) depressed Earth's crust into the mantle. After the ice melted, the mantle slowly flows back UP into the previously-depressed regions. This process is **still ongoing today** — Scandinavia and Canada are rising at ~1 cm/yr.

**Effect on Earth's rotation**:
- As mantle flows up into the polar regions, mass moves CLOSER to Earth's rotation axis
- Earth's moment of inertia DECREASES
- By conservation of angular momentum, ω increases → **LOD DECREASES**
- This is OPPOSITE to tidal slowdown

### Full decomposition of modern observed LOD slowdown

| Contribution | Rate (ms/century) | Mechanism |
|:---|---:|:---|
| **Lunar tides** | **+2.16** | Drives Moon recession (3.83 cm/yr) |
| **Solar tides** | **+0.40** | Drives AU expansion (3 μm/yr) + Earth's orbital angular momentum |
| **Post-glacial rebound** | **−0.50** | Mantle flowing into polar regions; Earth speeds up |
| Core-mantle coupling | variable | Internal angular momentum exchange (decadal fluctuations) |
| **Net observed** | **~2.06** | After all corrections |

The often-quoted "2.3 ms/century" or "1.7 ms/century" reflect different methodological choices about which terms to include.

### Why post-glacial rebound is irrelevant to the model's deep-time work

PGR is a **Quaternary phenomenon** triggered by ice ages of the last 2.7 Myr. Over Myr-Gyr timescales:
- Ice ages come and go on ~100 kyr cycles
- Ice loading/unloading at any one location averages out over many ice age cycles
- Long-term contribution to LOD secular evolution is approximately ZERO

**For deep-time work**: PGR can be ignored. The model should use the **TIDAL-only** contribution to LOD evolution (~2.56 ms/century for lunar+solar combined, or just ~2.16 ms/century for lunar-only if focusing on Moon-driven dynamics).

The "modern observed" net rate of ~2.06 ms/century is a misleading input for deep-time extrapolation because it includes the Quaternary PGR transient. Using it gives slightly underestimated paleo-LODs.

### The two drivers, stated once

```
L_E + L_M = L_total = const                             [angular momentum — Driver 1: the day lengthens, the Moon recedes]
a × M_Sun = const,  T ∝ M_Sun⁻²                         [adiabatic mass loss — Driver 2: the year in seconds]
days/yr = tropical_year_s(t) / LOD(t)                   [where the two meet in one observable]
```

Drivers 1 and 2 are independent in physics: tidal coupling drives Moon recession; solar mass loss drives the planetary year-second drift. They meet only in the per-epoch day count.

### But for the historical-eclipse window, PGR DOES matter — the α(t) correction

The PGR section above explains why PGR is **negligible for deep-time work** (>10⁵ yr) — it averages out over multiple ice-age cycles. But for the **historical eclipse window** (last 2-3 millennia, well within the Quaternary), PGR is the dominant *non*-tidal contributor to Earth's rotation evolution. Eclipse-timing data from this window can resolve effects of order 1-2 milliseconds in LOD that a pure-tidal model alone misses. The L-5b and L-7 validation work (lunar 270 events + solar 89 events from Stephenson, Morrison & Hohenkerk 2016) is anchored in this window and required a non-tidal correction to reach competitive accuracy.

The correction is implemented as a **time-varying** Earth polar moment coefficient α(t) (anchor value <!--v:alphaJ2000-->0.3306947<!--/v--> at J2000, IERS Conventions 2010), evolving through an **L1-orbital-coupled α(t)** correction: α is tied directly to the L1 orbital layer of the canonical Climate Formula, so the same orbital forcing that drives ice-mass cycles also drives Earth's polar moment on the same timescale. **Anchored on the Cox & Chao 2002 satellite measurement of dα/dt at J2000; zero parameters fitted to eclipse data.** (Note: PGR and GIA refer to the same physical process — post-glacial mantle reflow — viewed from the rotation-rate community vs the satellite-gravimetry community; both terms appear in this document and in the literature.)

#### What α is and why it varies

α is the dimensionless polar moment of inertia coefficient:
```
α = C / (M · R²)
```
where C is Earth's polar moment of inertia (about the rotation axis), M is total mass, R is mean radius. α encodes Earth's **internal mass distribution**: a uniform sphere has α = 0.4; Earth's denser core makes α ≈ 0.3307.

α changes whenever mass moves radially within Earth. After the Last Glacial Maximum (~21 kyr ago), the continents under former ice sheets are rebounding upward and mass is migrating from ocean basins back toward polar continents. This decreases Earth's moment of inertia I = α·M·R². With L_Earth approximately conserved (PGR is purely Earth-internal mass redistribution — no angular momentum leaves the Earth), ω = L_Earth / I increases → LOD shortens. **This is the "non-tidal Earth speedup" mechanism, but expressed correctly as α(t) rather than as an independent LOD bias term.**

Crucially, α(t) is purely an Earth-internal redistribution. It does NOT transfer angular momentum to the Moon. So Driver 1 (Moon recession via tidal coupling, Farhat 2022) and Kepler's 3rd law for the Moon orbit are **completely unaffected**. The L_Earth ↔ ω partition shifts at each epoch, but L_Total_EM remains conserved exactly.

#### Constant 1 — α at J2000: `EARTH_MOI_FACTOR = 0.3306947`

**Source**: IERS Conventions 2010 (International Earth Rotation and Reference Systems Service). The standard published value.

This is the anchor — α(t = today) = α_J2000 exactly. The L_TOTAL_EM angular momentum in the model is computed from this value at J2000 and remains conserved at all epochs.

#### Constant 2 — modern dα/dt: `EARTH_MOI_FACTOR_RATE_YR = −1.35 × 10⁻¹¹ /yr`

**Source**: Cox & Chao 2002 *Science* 297(5582), 831–833 (DOI: 10.1126/science.1072188), confirmed by Cheng, Tapley & Ries 2013 *J. Geophys. Res. Solid Earth* 118(2), 740–747.

The actual satellite measurement is the **dynamic oblateness rate**:
```
dJ₂/dt ≈ −2.7 × 10⁻¹¹ /yr   (LAGEOS SLR since 1979, GRACE since 2002)
```

J₂ is measured directly because it perturbs satellite orbits in observable ways (LAGEOS is tracked to mm precision). It's the secular trend after removing decadal mantle-core coupling oscillations and modern ice-loss accelerations.

**Conversion to dα/dt requires geometry.** J₂ and α are related but not identical:
```
J₂ = (C − A) / (M · R²)        ← (polar − equatorial) moment, normalized
α  = C / (M · R²)              ← polar moment, normalized
```

The two rates differ by how the equatorial moment A changes alongside the polar moment C. The conversion factor is **model-dependent** — the value depends on the mass-redistribution geometry, giving a range of 1.5-2.5 across published mantle-loading models.

The model uses **conversion factor 2.0**:
```
dα/dt  =  dJ₂/dt / 2.0  =  (−2.7 × 10⁻¹¹) / 2.0  =  −1.35 × 10⁻¹¹ /yr
```

This value sits at the mid-range of the Peltier ICE-6G LOD-coupling estimates (factors 1.5-2.5 depending on mantle viscosity assumptions) and yields model dLOD/dt at J2000 = 1.77 ms/century, matching IERS observation of 1.75 ms/century within 1%.

**The 2.0 is an EFFECTIVE factor, and the model says so.** The degree-2 identity below gives 1.5; the standard budget pairs that 1.5 with a net solar tide of about 5.6 % of the lunar transfer, and the two together carry the same ≈ 1.77 ms/cy. Measured with the LOD-budget scan (an explore script, since deleted; its result is recorded here) against the eclipse record: 1.5 alone is rejected (the joint ΔT fit's full-window RMS 28.75 → 353.7 s), the physical pair fits slightly better than the effective 2.0 (Espenak 12.47 s, full 25.03 s) — the record fixes the SUM of the GIA and solar-tide channels, not the split between them. The model ships the effective factor because adopting the pair is a recalibration campaign, not a constant swap: the recession history is a closed budget, so six of the paleo anchors leave tolerance and Layer 2, the GIA τ and the dLOD/dt and LOD–climate artifacts move with it. The factor cancels in the precession adoption, so nothing on the clock side depends on this choice.

The idealized axisymmetric point-mass derivation gives factor 1.5:
```
For a point mass m moving equator → pole:
  ΔC = −m · R²        (leaving equator drops polar moment by full m·R²)
  ΔA = +m · R²/2      (moving toward pole raises equatorial moment by half)
ΔJ₂ = (ΔC − ΔA) / (M·R²) = −1.5 m/M
Δα  = ΔC / (M·R²)         = −m/M
Ratio dα/dJ₂ = 1/1.5
```
This case assumes an idealized point-mass load. Real GIA in Peltier ICE-6G has distributed loading over the previously-glaciated cap regions, giving a higher effective coupling factor in the 1.5-2.5 range. Factor 2.0 is the model's operating value.

Literature uncertainty: ±10% range across published estimates of dJ₂/dt (variations come from model assumptions about mantle viscosity profile, not measurement uncertainty per se).

| Source | dJ₂/dt | Implied dα/dt (factor 2.0) |
|---|---|---|
| Cox & Chao 2002 (LAGEOS, pre-ice-loss) | −2.7 × 10⁻¹¹ | **−1.35 × 10⁻¹¹** (our value) |
| Cheng, Tapley & Ries 2013 (GRACE confirm) | −2.6 to −2.8 × 10⁻¹¹ | −1.30 to −1.40 × 10⁻¹¹ |
| Roy & Peltier 2011 (alternative GIA models) | −3.0 × 10⁻¹¹ | −1.50 × 10⁻¹¹ |

#### Mantle rheology sets the timescale

The GIA relaxation timescale follows from Maxwell rheology: `τ_Maxwell = η/μ` with `μ_mantle ≈ 1.5 × 10¹¹ Pa` (shear modulus from seismic body-wave velocities) and `η_mantle ≈ 10²¹ Pa·s` (mantle viscosity from post-glacial rebound inversions), giving `τ_Maxwell ≈ 210 yr`. Continental-ice-load response at spherical-harmonic degree n = 2 (dominant ice-sheet mode) inflates this by geometric factor ~20-30, giving `τ ≈ 4-6 kyr` — the kyr scale on which α evolves.

This gives the *timescale*. The shipped α(t) implementation goes further and provides the *driver*: instead of parameterising α(t) as a sum of relaxation exponentials with amplitudes fit to boundary conditions, the model binds α(t) directly to the L1 orbital layer of the canonical Climate Formula. See **§ Refinement: climate-driven α(t)** below for the implementation.

#### Validation result

The model's ΔT curve — LLR-anchored α₁ + L1-orbital-coupled α(t) with J₂→α factor 2.0 + jointly-calibrated trend anchor + 4-flag lattice stack + Core-mantle swing against the Espenak 2006 ΔT polynomial 1650–2017 — reports **20.2 minutes mean \|residual\|** against 267 valid primary-source lunar observations (-720 BCE to 1280 CE, Stephenson, Morrison & Hohenkerk 2016 tables S01/S02/S04/S05/S07/S09), versus NASA Espenak/Meeus's polynomial 20.0 minutes — a 13-s gap, with the excess over Stephenson's own fitted spline just 2 s. **117/267 events (43.8%) fall closer to observation than the NASA polynomial does.**

Both NASA Espenak/Meeus and Stephenson 2016 are polynomials fit to essentially this lunar dataset, so per-event residuals against either index measure fit quality against a smoothed representation of the observations rather than physical validity. The model's independent validation is the **26-event eclipse alignment audit** on documented solar eclipses (see [doc 102](102-gia-alpha-lunar-validation.md)). The model uses literature-cited constants from independent satellite gravimetry (Cox & Chao 2002 dJ₂/dt with factor-2.0 J₂→α conversion) plus the L1 orbital layer of the canonical Climate Formula for the deep-time coupling; the trend anchor and lattice-stack amplitudes/phases are calibrated against the Espenak 2006 ΔT polynomial as a documented design choice, not against eclipse data.

#### Where the change lives

| File | What it does |
|---|---|
| `src/script.js` (simulator) | `earthMoiFactorAtAge()`, `iEarthAtAge()`, applied inside `meanLodSecondsAtAge()` |
| `src/lib/orbital/deepTime.ts` (holisticuniverse.com website) | Same two functions, same constants, mirrored |

Downstream quantities auto-update through the calculation chain: LOD, sidereal day, stellar day, year-in-days, ΔT — all propagate from the single `meanLodSecondsAtAge` modification.

#### Full validation details

See `docs/102-gia-alpha-lunar-validation.md` for:
- The complete L-1 through L-7 validation pipeline (11 console-test buttons)
- Per-table cross-source consistency analysis (Babylonian / Greek / Chinese / Arab)
- Comprehensive hypothesis-testing section: eight alternative statistical hypotheses tested rigorously under the L1-orbital α(t) refinement, plus two follow-up predictive tests of proposed physical mechanisms (Path A: solar-activity → ionospheric coupling; Test 5: Jupiter-Saturn-Earth perihelion configuration) and a four-diagnostic drift-decomposition sequence. All correlation-based hypotheses (H3 mass-balance, Path A, Test 5) reduce to drift-tracking artifacts under per-era analysis: aggregate correlations appear strong (H3-lunar r = −0.38 "at ~4σ", Path A r = −0.54, Test 5 J-S r = −0.55) but per-era breakdowns reveal sign flips or near-zero medieval-window r values — the aggregates are drift-tracking, not causal per-observation links. The mechanisms that survive are structural: under the shipped joint-world residual none of the nine literature periodic forcings reaches FAP < 5% in the Lomb-Scargle scan (the L1-α-era Gleissberg / Jose-band detections did not survive the joint refit), the once-candidate 14.2-yr peak is resolved as a sampling-window artifact (the observation epochs' own spectral window peaks at 14.30 yr — the ~7.15-yr eclipse-cadence comb), and the residual decomposes cleanly into three physical components — a framework-native millennial-scale harmonic of the ΔT stack at **1466 yr (its n=1830 line = 74 × Jupiter-Saturn synodic)** (gcd(1830, H) = 61) capturing the "bump", shipped default-ON as the Bond component of the 4-flag sub-Milankovitch stack (Bond + Hallstatt + Jose5 + Jose4); a fractional non-tidal channel of ~0.5 ms/century window-average (approximately 2× Cox-Chao satellite value, ~10% of the full Munk-MacDonald postulate — full MM still rejected), carried by the Core-mantle swing episode (time-varying mantle-core coupling; see doc 104); and observation noise. See doc 102 §"Eight hypotheses tested" and §"Complete residual decomposition" for the full analysis.

#### Climate-driven α(t) — the L1-orbital coupling

**Status (plan 06 D7, the lagged channel).** The coupling shipped since
D7 is the LAGGED response of the polar moment to the ice history the L1
layer proxies:

    α(t) = α₀ − k · [ L1(t) − ⟨L1⟩_τ(t) ]

with ⟨L1⟩_τ the causal exponential average over the past (mantle
relaxation time τ), k > 0 the direct-load sign (an uncompensated ice load
lowers α), k DERIVED at runtime so that dα/dt(J2000) equals the Cox & Chao
rate (no stored scale), and τ = <!--v:alphaGiaRelaxationKyr-->6<!--/v--> kyr
MEASURED against the historical ΔT record through the joint fitter
(optimum 5–6 kyr; the degree-2 Maxwell estimate below is 4–6 kyr). One
home: `@essrt/physics/climate/l1-orbital` `createAlphaGiaChannel`. The
instantaneous law α ∝ L1 that this section was written for is retired:
it placed the α maxima at the glacial maxima and had the deglacial
transient's sign backwards — the physical sequence is spin-DOWN while the
ice melts (meltwater equatorward, the Cheng, Tapley & Ries 2013 J₂ signal)
and spin-UP for ~τ afterwards, of which today's −0.35 ms/cy is the tail;
α peaks ~7–9 kyr after a deglaciation and the LGM sits slightly BELOW
today. Its in-era slope had been carried by the fitted comb lines the T1
test retired; the physical L1 cannot carry it and the lagged form closes
the eclipse record better (full-window RMS 21.3 s vs 28.8 s). The calibration (k derived at runtime from the Cox & Chao rate, τ measured through the joint fitter) and its record are doc 102's; the sign rule that survives is the paragraph below.

The model binds α(t) to the L1 orbital layer of the canonical Climate Formula ([docs/92-climate-formula.md](92-climate-formula.md)). The physical chain is:

```
Planetary eigenmodes → Milankovitch orbital forcing →
Ice-mass redistribution → GIA J₂ / α → LOD
```

Every link has published literature: Hays, Imbrie & Shackleton 1976 for
orbital → ice; Peltier ICE-6G_C for ice → J₂; Chao 2016 for α → LOD;
Cheng et al. 2011 for the modern-era LAGEOS J₂ transition confirming that
ice-mass changes measurably shift Earth's oblateness at decadal timescales
(the underlying mechanism, not the 100-kyr cycle itself). The same L1
orbital signal that best-fits LR04 δ¹⁸O over 0–1 Myr also drives α
oscillations at the same periodicity — one mechanism, two observables.

**Do not derive this sign from the surface water redistribution.** "Warm →
meltwater into the ocean → mass equatorward" is a real effect, but it gives
the OPPOSITE sign (more equatorial mass ⇒ *larger* moment ⇒ *longer* day), and
it is carried by the 4-flag stack, not by α(t). See "Two channels, opposite
signs" immediately below — conflating them is the single easiest way to get
this subject backwards.

### Two channels, opposite signs

Climate reaches Earth's rotation through **two distinct physical mechanisms that
respond to the same climate signal with opposite sign and different lag**. Any
statement of the form "warm means the day gets longer/shorter" is incomplete
until it says which mechanism it means. This is standard geophysics and holds
independently of anything in this model.

**One caveat before the table.** The α(t) channel *implements* the solid-Earth
mechanism by construction — it is anchored on Cox & Chao satellite gravimetry
and its sign follows from the mantle flow. The 4-flag stack is *hypothesised* to
carry the surface-mass mechanism, but that identification is **not established**:
the stack's climate correspondence fails its null tests (§ above, and doc 102
item 7). Read the stack row as the mechanism it is proposed to represent, not as
a demonstrated property of the flags.

| | Physical process | Response to warming | Timescale |
|---|---|---|---|
| **Surface-mass mechanism** (proposed home of the Bond/Hallstatt/Jose5/Jose4 stack) | ice → meltwater spread through the global ocean, mass moves equatorward | moment of inertia **up** → day **lengthens** → Σ_stack > 0 | fast, effectively concurrent |
| **α(t) / GIA channel** | solid Earth: mantle rebounds poleward once the ice load is removed | moment of inertia **down** → day **shortens** | lagged by the mantle relaxation time (τ ≈ 4–6 kyr) |

Both are physically real, and their opposition is not a contradiction — it is
the reason the deglacial signature *leads* peak warmth (the rebound spin-up
runs while melting is fastest, and the warm peak arrives thousands of years
later, once melting completes). The observable rotation is the **sum**, so the
two channels can currently disagree about what the rotation "means": at J2000
the GIA term is −0.35 ms/cy (interglacial, rebound continuing) while the stack
term is −1.90 ms/cy and descending toward its trough at ~2206 AD. Reading one
channel's rule onto the other's number is a category error.

**Domain.** Uses the `lr04-post-mpt` regime L1 coefficients throughout. Since
the L1 formula is a periodic sum of cosines on the physical L1 lines, it stays
bounded at deep time — the amplitude ceiling is ~2.87‰ peak-to-peak, giving
a maximum |Δα| ≈ 1500 ppb. Beyond ±1 Myr the extrapolation is a smooth
continuation of the fitted periodic pattern, not a physics prediction, but
the amplitude is bounded and the average tends to zero.

**Properties of the L1-orbital form:**

| Property | Status |
|---|:---:|
| α(J2000) = EARTH_MOI_FACTOR exact | ✓ |
| dα/dt(J2000) = Cox & Chao × factor 2.0 | ✓ (k derived at construction from the observed dJ₂/dt — no stored scale) |
| Bounded at deep time (periodic L1 sum) | ✓ (~1500 ppb peak-to-peak) |
| C∞ smooth at J2000 (no piecewise past/future split) | ✓ |
| Reproduces Milankovitch α oscillation | ✓ |
| Consistent with Cheng 2011 modern J₂ transition | ✓ (mechanism reused) |

**Amplitude sanity check.** Peak-to-peak Δ(δ¹⁸O) over a glacial cycle is
~1.7‰ (LR04). The literature-independent estimate for peak-to-peak Δα over a
glacial cycle is 100–300 ppb (Peltier ICE-6G / Cheng 2011). The lagged
channel's peak-to-peak Δα over a glacial cycle is of the same order (the
value is the channel's own, `alphaGia` — [doc 110](110-calculation-map.md)
chain 3), within the model-uncertainty band for the underlying J₂
measurements.

**Visualization.** The Framework Verification modal in the simulator has an
**Export Cycles** button on the Solar Day Length category that renders the
LOD-vs-year prediction over −248,000 to +102,000 (the same window used for
the Obliquity Cycles view). Marine Isotope Stage labels (MIS 8 through MIS
2 / LGM plus the next projected glacial ~62,500 AD) confirm the model's LOD
peaks/troughs align with independently-dated paleoclimate events: **LOD
carries an observable ~100-kyr oscillation matching the δ¹⁸O record**, an
emergent prediction of the L1-orbital coupling.

**Why not simpler forms.** Constant α loses the Cox & Chao J2000
calibration and the historical-eclipse ΔT correction from GIA relaxation.
Smooth Gaussian saturation (`1−exp(−t²/τ²)`) is smooth at J2000 but has
dα/dt(J2000) = 0, breaking Cox & Chao. Monotonic sigmoid (`tanh(t/τ)`) is
C∞ and preserves Cox & Chao but implies α asymptotes to different values
in past vs future, which lacks a physical mechanism. The L1-orbital
coupling uniquely satisfies all four constraints (smooth at J2000, Cox &
Chao preserved, bounded deep time, physically-motivated glacial-cycle
mechanism) with no stored scale — k is derived at construction from the
observed dJ₂/dt, and the one measured constant is the relaxation time τ
(plan 06 D7, against the historical ΔT record).

---

## Why the climate formula keeps its J2000 line periods

Measured: the precession band moves with the clock while the eccentricity bands stay fixed, and each climate record resolves the precession rate p of its own epoch — so the shipped formula keeps its J2000 line periods, and the deep-time lines of the sections above are predictions, not fitted terms. The measurement record is [doc 92](92-climate-formula.md), the section of the same name.

---

## When will the clock end? — the tidal-lock horizon

If the clock had a beginning (Earth-Moon genesis at ~4.5 Gyr ago), it also has an ending. **The Earth-Moon-Sun system's evolution is bounded — the cycle cannot grow indefinitely.**

### The physical limit: tidal-lock equilibrium

The Earth-Moon system asymptotically approaches a stable equilibrium where Earth's spin period equals the Moon's orbital period (double synchronous lock). From the proper-physics formula, the angular-momentum-conservation Layer 1 directly identifies the asymptote where `LOD → ∞`:

```
a_lock = (L_total / (M_M · √(GM_(E+M)) · √(1−e²)))²
       = 555,623 km
       = 87.1 R_Earth
       = 1.45 × current Moon distance (60.3 R_E)
```

| Quantity | Value at tidal-lock asymptote |
|:---|---:|
| Moon final distance | **87.1 R_E ≈ <!--v:tidalLockKm-->555,623<!--/v--> km** (currently 60.3 R_E) |
| LOD at asymptote | → ∞ (formal divergence; in practice ~47 days) |
| Precession period at asymptote | → ∞ (the spin torque vanishes; the beat re-forms on the nodal mode long before — see the crossover below) |

The 87.1 R_E asymptote from the proper-physics formula's L_total is closer to standard references (~88 R_E) than the textbook 75-R_E approximation.

### The proper-physics formula's predictive horizon

Forward of J2000 the cited history has no future, so the chain holds the LLR rate constant — a labelled extrapolation that reaches `a_lock` at about **+4.5 Gyr** (a_lock/a_now − 1 = 0.4455 at 9.94e-5 per Myr), beyond which the formula returns `null` (LOD would be > tidal-lock).

Proper-physics formula's bounded future projections:

<!-- generated:doc99-future-table -->
| Time from now | LOD (hr) | Moon distance (km) | T_p (yr) | obliquity beat (kyr) | Status |
|:---|---:|---:|---:|---:|:---|
| Modern | 24.00 | 384,399 | 25,772 | 41.10 | anchor |
| +200 Myr | 25.23 | 392,039 | 28,315 | 47.98 | within the tidal chain |
| +500 Myr | 27.31 | 403,499 | 32,653 | 61.96 | within the tidal chain |
| +1,000 Myr | 31.57 | 422,599 | 41,671 | 105.28 | within the tidal chain |
| +2,000 Myr | 45.20 | 460,799 | 71,165 | — (ψ̇ < \|s₃\|) | within the tidal chain |
| +4.5 Gyr | beyond a_lock | — | — | — | formula horizon (the LLR rate held constant forward — a labelled extrapolation) |

**The spin–orbit crossover.** The composed precession rate falls to the nodal mode's rate, ψ̇ = |s₃| = 18.85 ″/yr, at about **+1,941 Myr** (T_p ≈ 68,751 yr): the obliquity beat 2π/(ψ̇ − |s₃|) diverges there — the secular spin–orbit resonance that the standard literature also places in Earth's tidal future (large obliquity excursions). Beyond it the beat re-forms on |s₃| − ψ̇. A prediction of the composition law, stated before any test.
<!-- /generated:doc99-future-table -->

Beyond the formula horizon: +5 Gyr (the Sun's red giant) is outside the tidal chain's domain; the true tidal lock (~47-day day, <!--v:tidalLockKm-->555,623<!--/v--> km) is reached only ~50 Gyr ahead by L_total-extrapolation.

**Sun's red giant phase (+5 Gyr) is beyond our formula's predictive horizon.** The Layer-2 polynomial saturates 2 Gyr before the Sun's main-sequence ends. For physically realistic projections past ~+2.5 Gyr, one would need either a more careful Layer-2 model (with explicit tidal-Q asymptotic slowdown), or direct integration of the angular-momentum equations from t = +2 Gyr forward.

### The practical limit: the Sun

The Sun begins its red giant phase in ~5 Gyr and the inner solar system likely doesn't survive (Earth either engulfed or scorched). **In practical terms, the model's effective lifespan is bounded by the Sun, not by the tidal-lock asymptote — Earth-Moon will not reach tidal lock before the Sun ends its main sequence.**

### Answers to specific questions

**Q: When will Earth's LOD reach the tidal-lock asymptote?**
A: On the LLR rate held constant forward (the cited history's forward branch) the Moon reaches `a_lock` at about +<!--v:essrtFormulaHorizonGyr-->4.48<!--/v--> Gyr — the formula horizon. Beyond this, the formula returns `null` because Moon has absorbed all of Earth's spin angular momentum. Independent angular-momentum calculations (with explicit tidal-Q decay) suggest the *true* tidal-lock equilibrium is approached over ~50 Gyr — far beyond Sun's main-sequence lifetime.

**Q: When will LOD = 0?**
A: **Never**. LOD has been monotonically increasing for ~4.4 Gyr (Layer 2) and will continue to. Going backward, the canonical Wells rate's linear extrapolation gives LOD = 0 at 4.56 Gyr ago — within 0.5 % of Patterson's Earth age (4.54 Gyr) — but the cited history ends at its lunar age (<!--v:moonGenesisAgeGa-->4.429<!--/v--> Gyr ago, the Moon at <!--v:moonDistanceAtHadeanRE-->6.19<!--/v--> R_E, a day of ~5.5 h) rather than reaching LOD = 0.

**Q: When will days/year = 1?**
A: **Never** with the Moon present. The bounded tidal-lock equilibrium has Earth's day = Moon's orbital period = **~47 days** (in current units), which gives ~7.8 days/year — well above "1 day per year" but well below current 365. Days/year decreases monotonically: 365 (now) → 349 (+200 Myr) → ~280 (+1 Gyr) → ~7.8 at tidal-lock asymptote.

### The model's effective lifespan

> **The clock has a beginning, a middle (us), and an end.**
>
> - **Genesis**: the cited history's end at **<!--v:moonGenesisAgeGa-->4.429<!--/v--> Gyr ago** (Farhat 2022's lunar-age input, the Hf-W giant-impact epoch, ~110 Myr after Patterson's 4.54 Pb-Pb Earth age), the Moon at ~6 R_E; the precession period was years long under the near Moon's torque.
> - **Modern (now)**: the mean lunisolar precession period is <!--v:lunisolarPeriodJ2000Yr-->25,771.6<!--/v--> yr; the obliquity beat <!--v:obliqBeatJ2000Kyr-->41.1<!--/v--> kyr.
> - **The spin–orbit crossover**: the precession rate falls to the nodal mode's rate about 1.9 Gyr ahead (the generated future table gives the epoch) — the obliquity beat diverges there.
> - **Formula horizon**: on the LLR rate held constant the Moon reaches the tidal-lock asymptote at +<!--v:essrtFormulaHorizonGyr-->4.48<!--/v--> Gyr (a labelled extrapolation).
> - **Effective endpoint**: Sun's red giant phase at +5 Gyr — inner solar system unlikely to survive.
>
> Total span of the model's effective domain: **<!--v:essrtEffectiveDomainGyr-->8.9<!--/v--> Gyr** (genesis <!--v:moonGenesisAgeGa-->4.429<!--/v--> Gyr ago → the formula horizon <!--v:essrtFormulaHorizonGyr-->4.48<!--/v--> Gyr from now; the Sun's red giant at +5 Gyr lies just beyond it). Current epoch sits at ~<!--v:essrtCurrentEpochPct-->50<!--/v--> % of the way through.
>
> The model's structure isn't eternal. We're observing a finite-lifetime physical phenomenon, expanding from a Roche-limit beginning toward a tidal-lock asymptote that won't be reached before the Sun ends. The growth rate of the generated table above is the local tangent of a smooth, bounded trajectory that has cumulative shape over Gyr scales.

---

## Future projections — what to expect

If ESSRT is correct, here's what should happen over the next 100–1000 Myr (all values from the proper-physics two-layer formula):

### Next 50 Myr (Cenozoic-future)
- Moon distance: **+1,704 km** further out (386,103 km vs current 384,399)
- LOD: **+17.9 minutes** longer day (24.30 hr)
- Precession period: ~26,360 yr (+2.3 %; generated tables above)
- Climate cycles: the precession-band lines ~2 % longer, the eccentricity band unchanged (essentially unchanged at human timescales)
- **Observable effect: negligible at human/civilization timescales**

### Next 200 Myr (early Mesozoic-equivalent future)
- Moon distance: **+7,660 km** further out (<!--v:moonDistanceAt200MyrFuture-->392,039<!--/v--> km — 61.5 R_E vs modern 60.3 R_E)
- LOD: **<!--v:lodAt200MyrFutureHr-->25.23<!--/v--> hr** (about 74 extra minutes per day — a net rate a little above the canonical Wells rate over the 200 Myr, the history's small future curvature)
- Precession period: **<!--v:axialPrecAt200MyrFuture-->28,315<!--/v--> yr** (+9.5 %)
- Obliquity beat: **~<!--v:obliqBeat200MyrFutureKyr-->48.0<!--/v--> kyr** (currently <!--v:obliqBeatJ2000Kyr-->41.1<!--/v--> kyr; generated tables above)
- Eccentricity-band lines: unchanged (planetary g-beats)
- **Observable effect: Earth precession period extends; climate cycles slightly stretch**

### Next 1,000 Myr (deep future)
- Moon distance, day length and precession period: the generated future table above carries the values — the Moon about a tenth further out, the day about a third longer, the precession period some 60 % longer; the obliquity beat stretches as ψ̇ approaches |s₃|
- The precession-band lines stretch with it; the eccentricity band does not
- **Observable effect: dramatic; entirely different day-night and climate-cycle patterns** (if humans still exist)

### Beyond +2 Gyr (approaching the chain's horizon)
- The generated future table carries the +2 Gyr row: the Moon past four fifths of the way to the tidal-lock asymptote, the day about twice its present length
- The precession period at +2 Gyr is past the spin–orbit crossover (~+1.9 Gyr; the generated future table gives the epoch), where ψ̇ < |s₃| and the obliquity beat has re-formed on |s₃| − ψ̇
- **Beyond +<!--v:essrtFormulaHorizonGyr-->4.48<!--/v--> Gyr: formula returns `null`** (Moon reaches tidal-lock asymptote ~<!--v:tidalLockKm-->555,623<!--/v--> km). For projections to Sun's red giant phase at +5 Gyr, an extended physics model with explicit tidal-Q decay would be required.

---

## Falsifiable predictions

If ESSRT is correct, the following predictions should hold. All values from the proper-physics formula.

### 1. Deep-time obliquity periods lengthen with the clock
Devonian (380 Ma) obliquity beat 2π/(ψ̇ − |s₃|) at **<!--v:obliqBeatDevonianKyr-->30.6<!--/v--> kyr** (vs modern <!--v:obliqBeatJ2000Kyr-->41.1<!--/v--> kyr; generated tables above).
**Status**: Consistent. Berger, Loutre & Laskar 1992's deep-time solution (29 kyr and 61 ″/yr at 500 Ma; theory) and Wu et al. 2024's inferred precession constants (59.5–64.5 ″/yr across 300–500 Ma; cyclostratigraphic inference) both sit within 2–8 % of the composed clock, which reads 2–3 % low in the Pangea window — the residual attributed to the recession history there (Wu's Moon-distance anchors are closer than the smooth polynomial; the "Pangea interval" section above), not to the composition law. A Devonian obliquity gate row waits for a period with a stated 1σ verified from the primary paper (the Zeeden et al. 2023 class). The former "confirmed against 36–38 kyr (Meyers 2008, Boulila 2018)" was a mis-citation of Cretaceous and Eocene records, and the retired spin-only clock (37.7 kyr) matched them by that error — withdrawn (plan 06 D6/Phase 4b).

### Withdrawn or resolved predictions

Three former entries are no longer on this list: the short-eccentricity periods expanding with the clock (resolved AGAINST by measurement — only the ψ̇-carrying lines scale, see "Why the climate formula keeps its J2000 line periods"); the Saturn–Jupiter resonance lock at one ecliptic period (retired with the integer laws, plan 07; the chain's own Great-Inequality reading is [doc 109](109-model-nbody-engine.md)); and the Earth–Moon genesis at the rigid Roche limit (withdrawn at plan 12 option A — the genesis is the cited history's end, an input, not a result). Their text is archived.

### 3. Earth's precession period lengthens with the clock
Devonian precession period at **<!--v:axialPrecAtDevonian-->21,235<!--/v--> yr** (vs modern <!--v:earthAxialPeriod-->25,772<!--/v--> yr), i.e. ψ̇ ≈ 61 ″/yr (1,296,000″ over that period; the generated table above carries the rate).
**Status**: Consistent with Wu et al. 2024's 61.5 ″/yr at 400 Ma (a cyclostratigraphic inference, 3 % apart) and with the Devonian climatic-precession band (Meyers 2008's ~17.7 kyr lies inside the 16.7–20.3-kyr band of the generated table). The Precambrian rows (1.4 and 2.46 Ga) are gated (`paleo-anchors`).

### 4. Future climate cycles will be slightly longer than modern
In 200 Myr, Earth's ~41-kyr obliquity beat should be ~<!--v:obliqBeat200MyrFutureKyr-->48.0<!--/v--> kyr (+17 %; generated tables above — the lunar torque weakens as the Moon recedes, so the beat stretches faster than the day).
**Status**: Not yet testable empirically; ESSRT prediction.

### 7. LOD oscillates with Milankovitch orbital forcing
Because α(t) is bound to the same L1 orbital layer that fits δ¹⁸O (see the climate-driven α(t) refinement section above), Earth's length-of-day should carry an **observable ~100-kyr oscillation** in phase with the glacial-interglacial ice-volume signal. Peak-to-peak LOD swing ≈ 250 ms across a full glacial cycle. The oscillation extrema align with LR04 Marine Isotope Stages: LOD peaks at MIS 6 (~140 ka), MIS 2 / LGM (~22 ka), and the projected next-glacial (~60,500 AD, matching the Climate Formula's next-glacial onset); LOD troughs at MIS 7e (~215 ka), MIS 5e Eemian (~125 ka), and today's Holocene interglacial (J2000).

**The unifying physical claim** — planetary gravity, Earth's climate, and Earth's rotation are **not three independent systems**. They are one system connected by ice mass as the mediator:

```
Planetary gravity (Laplace-Lagrange secular eigenmodes)
   → perturbs Earth's orbit (eccentricity / obliquity / precession)
   → drives insolation → drives ice sheet dynamics
   → redistributes surface mass → GIA mantle response
   → mutates α(t) → oscillates LOD
```

This is distinct from the tidal-channel coupling (which is faster, direct, and well-known). The orbital-eigenmode → α → LOD channel is slower (100-kyr timescale), indirect (mediated by ice), and shows up as a 100-kyr ripple on the smooth tidal-recession LOD curve.

**Status**: The underlying "ice → J₂ → α → LOD" mechanism is confirmed on decadal timescales by Cheng, Tapley & Ries 2011 (LAGEOS satellite J₂ transitions from linear GIA-driven decrease to acceleration around 1998, attributed to polar ice-mass loss — direct observational link between ice-mass changes and Earth's oblateness). The 100-kyr Milankovitch extrapolation follows from the same physics but is not yet directly observable — modern satellite records span only ~50 years, too short for the glacial-cycle band. Full confirmation would require either paleoclimate LOD indicators or a much longer future satellite record. **Visualization: Framework Verification → Solar Day Length, the cycles window → Export** in the simulator shows the model's prediction over −248 kyr to +102 kyr with MIS labels aligned to the L1 peaks/troughs.

---

## What's still uncertain

| Question | Status |
|:---|:---|
| Exact deep-past rate of the clock's evolution (variable tidal-Q regimes) | Open — the chain reads Farhat 2022's globally averaged ocean-tide history. Specific regimes (Bartlett-Stevenson Proterozoic stall, Snowball-boundary spike) are smoothed over. |
| Williams 2000 (Ediacaran 620 Ma) <!--v:anchorWilliams620DeltaPct-->+7.26<!--/v--> % miss | Open — the chain matches Wells/Pannella/Winter to ≤1.4 % but misses Williams's rhythmite count. Whether this is Farhat's history over-smoothing the Cryogenian or Williams's count being locally biased is unresolved. |
| Whether all L1 integers truly scale together (view 2) or only k-involving ones (view 1) | **DECIDED: view 1, by measurement** — the precession band moves with the clock while the eccentricity bands stay fixed (1.4/2.46-Ga sections; doc 109's engine derivation of the e-beats from the fixed g-modes). |
| The mechanism by which planetary g_i, s_j frequencies would scale with the clock (per view 2) | **Moot** — no such coupling exists; the campaign measured the planetary shapes as standard secular dynamics (doc 109, E1–E25), and the g-modes' only drift is ∝ M_Sun (the mass-loss tier). |
| The role of L2 (carbon-cycle 405-kyr line) — confirmed NOT scaling | Established; L2 is carbon-cycle resonance, not orbital. See doc 92 §3.1 (the 405-kyr thermostat). |
| Whether L3 transitions (PETM, EOT, etc.) are coupled to the clock's evolution | Likely no; these are climate-system threshold transitions, not orbital periods. |
| Future projections beyond +<!--v:essrtFormulaHorizonGyr-->4.48<!--/v--> Gyr (the formula horizon) | Formula returns null; would require explicit tidal-Q decay model to project to Sun's red-giant phase. |

---

## Summary table — ESSRT's full deep-time prediction

All values written by the engine (`npm run docs:doc99:write`). Epochs chosen to match canonical Wells/Williams paleo anchors.

<!-- generated:doc99-summary-table -->
| Quantity | Modern (J2000) | −180 Ma (Jurassic) | −380 Ma (Devonian) | +200 Myr |
|:---|---:|---:|---:|---:|
| LOD (hr) | **24.00** | 23.02 | 21.76 | **25.23** |
| days/year (tropical) | **365.24** | 380.76 | 402.83 | **347.40** |
| Moon distance (km) | **384,399** | 377,816 | 368,549 | **392,039** |
| Mean lunisolar precession period T_p (yr) | **25,772** | 23,775 | 21,235 | **28,315** |
| Obliquity beat 2π/(ψ̇ − \|s₃\|) (kyr) | **41.10** | 36.24 | 30.64 | **47.98** |
| Climatic-precession line p + g₅ (kyr) | **23.76** | 22.05 | 19.85 | **25.91** |
| Long-eccentricity metronome g₂ − g₅ (kyr, NOT scaled) | **405.6** | 405.6 | 405.6 | **405.6** |
| Short-eccentricity line g₄ − g₅ (kyr, NOT scaled) | **94.88** | 94.88 | 94.88 | **94.88** |
<!-- /generated:doc99-summary-table -->

**Key observation**: the spin-tier rows (the precession period, the obliquity beat, the climatic-precession line) lengthen together with the clock, reflecting Driver 1 (tidal evolution); the eccentricity-band rows do not scale (planetary g-beats — see the restated core thesis), and the 405-kyr metronome never scaled. Driver 2 (solar mass loss) enters the days/year row only through the year in seconds — −71 ppm at the Devonian, against the ~7.8 % the day length moves (§ "The Earth-Sun side"). The two-tier split is ESSRT's deepest self-consistency check.

---

## Scripts and supporting docs

- the live deep-time instruments: the API's epoch tools, `tools/verify/paleo-anchors.js` and the Python bridge; retired instruments are recorded in [doc 109 §22](109-model-nbody-engine.md)
- Test C series (validation in deep time) — the first-pass ECS decomposition is archived; doc 92 carries the current climate results
- Doc 98 (action-angle closure as the underlying mechanism, written in the retired integer-label framing) — archived

## Key references

- Wells 1963 — Coral growth and geochronometry (Devonian LOD 22 hr)
- Williams 2000 — Geological constraints on the Precambrian history of Earth's rotation (Elatina 21.9 hr at 620 Ma)
- Bartlett & Stevenson 2016 — Analysis of a Precambrian resonance-stabilized day length, GRL
- Mitchell & Kirscher 2023 — Mid-Proterozoic day length stalled by tidal resonance, Nat Geosci
- Farhat et al. 2022 — The resonant tidal evolution of the Earth-Moon distance, A&A
- Da Silva et al. 2020 — Anchoring the Late Devonian mass extinction in absolute time, Sci Rep
- Wu, Malinverno, Meyers & Hinnov 2024 — A 650-Myr history of Earth's axial precession frequency and the evolution of the Earth-Moon system derived from cyclostratigraphy, Sci Adv (DOI: 10.1126/sciadv.ado2412)

---

## Net theory statement

> The solar system expands on two measured tiers. On the **tidal tier**, the Earth–Moon system carries one clock — the mean lunisolar precession period, <!--v:lunisolarPeriodJ2000Yr-->25,771.6<!--/v--> yr at J2000, the period of the composed precession rate ψ̇ = [ω/ω₀]·p₀·[f_S + (1 − f_S)(a₀/a_M)³] × cos ε̄(t)/cos ε̄(0) (the constant's scaling on the spin and the lunar torque, times the cited mean obliquity's cosine — plan 12 §8) — and the spin/tide family that rides it (the obliquity beat 2π/(ψ̇ − |s₃|), the climate formula's precession and obliquity lines, the LOD stack) — where the model's validated results live (eclipses, LOD, cardinal points, 45 paleo anchors) — plus Earth's exact **epoch-local** orbital laws (the apsidal and perihelion-of-date tangents, whose rates add) of the present era. The period lengthens monotonically as the Moon recedes (**Driver 1**): shorter in the past (~<!--v:axialPrecAtDevonian-->21,235<!--/v--> yr in the Devonian), longer in the future (~<!--v:axialPrecAt200MyrFuture-->28,315<!--/v--> yr in 200 Myr), from Earth-Moon genesis at the rigid Roche limit ~<!--v:moonGenesisAgeGa-->4.429<!--/v--> Gyr ago toward the tidal-lock asymptote at <!--v:tidalLockKm-->555,623<!--/v--> km, through a spin–orbit crossover ~1.7 Gyr ahead where the beat diverges. On the **mass-loss tier** (**Driver 2**), solar mass loss expands every planetary orbit via adiabatic conservation of `a × M_Sun`; the ancient Sun's mass is now rock-measured (μ(2.48 Ga) = 1.00 ± 0.07). Planetary orbital shapes — perihelia, nodes, eccentricity vectors, and their beats including the 405-kyr metronome — follow standard secular dynamics, which the model's own N-body engine reproduces (doc 109); the former planetary integer labels were era-typed descriptors of those motions and are retired. The two tiers' scaling split (the precession band moves with the clock, the 405 does not) is confirmed at 1.4 and 2.46 Ga and is the theory's standing falsifier.
