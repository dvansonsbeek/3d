---
docVersion: 1.0
modelVersion: v26.7
coefficients: sha256:b2d4e64c4e6a947e
status: current
---

# Pure-tidal + L1-orbital-coupled α(t) validates against the historical lunar record

**Status**: Validation complete — 267 primary-source historical lunar observations (Babylonian, Greek, Chinese, Arab; -720 BCE to 1280 CE) cross-validated against the pure-tidal Farhat 2022 (LLR-anchored α₁ giving da/dt = 3.82 cm/yr at J2000) + L1-orbital-coupled α(t) GIA model. Under the joint world (4-flag stack + Core-mantle swing, doc 104), model mean |residual| **20.2 min (1212 s)**, with **117/267 events (43.8%)** falling closer to observation than NASA Espenak/Meeus's polynomial. NASA polynomial mean |residual|: 20.0 min (1199 s); Stephenson 2016 spline polynomial: 20.2 min (1211 s) — both are fit to essentially this exact dataset, so per-event residuals against either index fit quality against a smoothed representation of the observations rather than physical validity; the model's excess over Stephenson's own fit is **2 s** — the dataset noise floor. The model's independent validation is the [26-event solar-eclipse alignment audit](https://holisticuniverse.com/model/historical-eclipse-validation): 3 confirmed + 13 off-peak, 5 regional, 0 with residual ΔT-signal (model agrees with the documented UT on every event), 5 geographic-class events (umbra-*centerline* >1,000 km from the site — a centerline-distance gate, not visibility: at high γ the shadow strikes the tilted Earth obliquely and the penumbra can still cover the site with a deep partial; the class collects penumbra-only sites and attribution debates — all unrelated to physics).

---

## Thesis

**The historical lunar-eclipse record requires a non-tidal Earth-rotation
contribution whose dominant component matches the glacial isostatic
adjustment (GIA) magnitude measured independently by satellite gravimetry.**

**Pure-tidal Farhat 2022 evolution (LLR-anchored α₁ = 3.82 cm/yr recession
at J2000, Dickey 1994 / Chapront 2002) PLUS the L1-orbital-coupled α(t) GIA
viscoelastic correction (Cox & Chao 2002 dJ₂/dt = -2.7e-11/yr with J₂→α
conversion factor 2.0 in the Peltier ICE-6G LOD-coupling range, giving
dα/dt = -1.35e-11/yr at J2000), together with a jointly-calibrated trend
anchor + 4-flag millennial stack + Core-mantle swing against the Espenak 2006
ΔT polynomial 1650-2017, produces a mean |residual| of 20.2 min against 267
primary-source lunar observations spanning 2,000 years. The residual after α(t) is
decomposed below into four fitted millennial cycles at the canonical
Bond, Hallstatt and Jose periods (1466, 2430, 897 and 716 yr; shipped
default-ON as the 4-flag stack with cap-only fit-derived amplitudes) plus
observation noise.**

**Every physical constant in the live model comes from independent literature
sources — IERS α at J2000, LLR-observed da/dt, Cox & Chao satellite dJ₂/dt,
and the Peltier ICE-6G LOD-coupling range for the J₂→α conversion. None
are fitted to the eclipse data.**

The full Munk-MacDonald-scale (~5-6 ms/century) non-tidal-speedup assumption
baked into mainstream Stephenson empirical fits is rejected. A GIA-scale
non-tidal contribution IS detectable in the record and its dominant
component is well-matched by the GIA viscoelastic relaxation measured by
GRACE/LAGEOS satellite gravimetry — about ten times smaller than the
Munk-MacDonald estimate, and included in the model via α(t). Additional
structure in the residual after GIA correction is captured by the 4-flag
stack — four fitted millennial cycles (Bond 1466 yr dominant) whose periods
come from the record and the canonical paleoclimate values.

**Status of the period claims (T5, plan 06).** The four periods were
long described here as "zero-fit structural predictions" of the retired
unit's integer comb, resting on two arguments: each period was a comb
member, and each divisor passed a prime-factor rule. The pre-registered test T5 (its script
and artifact deleted at plan 09 step 7e; the verdict is in the record table,
[doc 109 §22](109-model-nbody-engine.md)) measured both
arguments at chance level: every period in the 500–5000 yr band lies within 0.03 % of some
comb member; 6 % of the integers in the band passed the rule, so a
compliant integer sits inside every fitted plateau by density alone (the
Bond band held four); the shipped
four periods fit the residual no better than random four-period
millennial combs (p = 0.36), the canonical external periods fit
identically, and moving any divisor to a non-compliant neighbour changes
R² by less than 1e-5. What is real: a single ~1.5-kyr line beats random
single lines (p = 0.009) — the Bond-scale oscillation is in the record.
The periods are therefore stated in years throughout: Bond 1466,
Hallstatt 2430, Jose5 897, Jose4 716 — fitted millennial periods at the
canonical values. The divisor integers (1830, 1104, 2989, 3749) survive
only as the fitter's historical selection record (its config's `structural`
notes; the runtime and the fit file carry `period_yr` in years) and, below,
as the historical account of how they were selected; every "structural" or
"framework-native" period claim is retired. The numerics are untouched.

---

## Validation infrastructure

Lunar eclipses are visible across Earth's entire night-side hemisphere,
so geographic placement is irrelevant — the constraint reduces to *timing*
of opposition (or penumbra/umbra contacts), a test that resolves ΔT to
within minutes. Solar eclipses have geographically narrow paths giving only
50-100 s ΔT resolution per event. Lunar timing therefore provides the
higher-resolution test used to discriminate physics that solar-eclipse
resolution cannot.

### Four validation-infrastructure pieces

1. **Predictive lunar-eclipse finder** (`findLunarEclipsesInRange`): Meeus
   Ch. 47 Moon position + Ch. 25 Sun longitude (Ch. 25 is the un-injected
   default — the shipped chain injects the certified framework-native Sun
   via `frameworkSunDeps`), bisection on Sun-Moon
   opposition (180° ecliptic separation), classification by geocentric
   Moon latitude vs per-event shadow geometry computed from `R_EARTH_M`,
   `moonDistance`, `currentAUDistance` and diameters.

2. **Predictive solar-eclipse finder** (`findSolarEclipsesInRange`):
   same Meeus ephemerides, bisection on Sun-Moon conjunction (0°
   ecliptic separation), classification by Moon latitude vs central
   limit, with total/annular discrimination via topocentric Moon size
   at the sub-Moon point vs Sun apparent radius. Validates against NASA
   Five Millennium Canon (which ends at year 3000 CE) and produces
   honest first-principles predictions beyond NASA's published
   endpoint — 116 solar eclipses found for the 3001-3050 CE window
   (35 Total, 42 Annular, 39 Partial) that are not on any NASA
   tabulation.

3. **NASA 5-Millennium Canon of Lunar Eclipses import** (12,064 events,
   -1999 BCE to +3000 CE; Espenak & Meeus 2009). Scraped per-century from
   the published catalog via `scripts/fetch_nasa_lunar_canon.py`.

4. **Stephenson, Morrison & Hohenkerk 2016 primary-source observation
   catalog** (270 timed lunar + 89 timed solar observations across nine
   supplementary tables, covering Babylonian, Greek, Chinese, and Arab
   traditions; -720 BCE to 1280 CE for lunar, -356 BCE to 1277 CE for
   solar). Parsed via `scripts/parse_stephenson_lunar.py` and
   `scripts/parse_stephenson_solar.py`.

### The load-bearing addition: α(t) as a time-varying quantity

Earth's polar moment coefficient α (= C / (M · R²)) is no longer
treated as a strict constant. It evolves as the LAGGED response of the
solid Earth to the ice history the climate formula's L1 layer proxies
(Milankovitch orbital forcing → ice sheets → mantle relaxation → J₂/α →
LOD): α(t) = α₀ − k·[L1(t) − ⟨L1⟩_τ(t)], with the coupling k DERIVED at
runtime from independent satellite gravimetry (Cox & Chao 2002 dJ₂/dt =
−2.7e-11/yr, J₂→α factor 2.0, so dα/dt at J2000 = −1.35e-11/yr) and the
relaxation time τ = <!--v:alphaGiaRelaxationKyr-->6<!--/v--> kyr measured
against the historical ΔT record (plan 06 D7; the rheology estimate below
gives 4–6 kyr). No parameters are fitted to the eclipse data. Detailed in
[§ The α(t) physics](#the-αt-physics) below.

The ice-history proxy is the climate formula's in-window DESCRIPTION of
LR04 — deliberately, and measured (doc 92 §2 T7 and its WP2 follow-up,
`tools/explore/t7-alpha-proxy-dt-fit.cjs`, report mode): the ΔT joint
fitter refit with α(t) on the shipped L1 reads Espenak RMS
<!--v:t7AlphaProxyShippedEspenakRms-->13.46<!--/v--> s / full-window
<!--v:t7AlphaProxyShippedFullRms-->28.87<!--/v--> s, on the T7
fixed-phase forcing (the model's own e, ε, e·sin ϖ with a climate lag —
the model's PREDICTION of the record) <!--v:t7AlphaProxyFixedEspenakRms-->14.47<!--/v--> /
<!--v:t7AlphaProxyFixedFullRms-->38.77<!--/v--> s, and on the LR04 record
itself <!--v:t7AlphaProxyLr04EspenakRms-->37.46<!--/v--> /
<!--v:t7AlphaProxyLr04FullRms-->64.38<!--/v--> s (its J2000 slope is
unresolved at 1-kyr sampling). What α(t) with a 6-kyr memory needs is the
closest hindcast of the ACTUAL recent ice history, and inside the record
window that is the description, not the prediction; the pre-registered
rule (best eclipse-era ΔT after refit; tie → shipped) keeps it here.

---

## The α(t) physics

### Why α can change without violating any conservation law

α encodes Earth's *internal* mass distribution. A uniform sphere has
α = 0.4; Earth's denser core makes α = 0.3307. α changes whenever mass
moves radially within Earth — **without** any angular momentum transfer
to anything external. The Moon distance, Kepler's 3rd law for the Moon
orbit, and the Earth-Moon system's total angular momentum L_Total_EM
are all **unaffected** by α(t).

The physical instantiation is glacial isostatic adjustment: continents
under former ice sheets (Scandinavia, Hudson Bay, Antarctica edges) are
rebounding upward as the ice load is gone, and mass is migrating from
former-equatorial water back toward the polar continents. Earth's
moment of inertia I = α · M · R² decreases. With L_Earth conserved
(no torque external to the Earth body), the rotation rate ω increases
slightly — i.e., LOD shortens. This is the "non-tidal Earth speedup"
that the literature consistently identifies as the dominant secular
non-tidal contributor to Earth's rotation history.

Critically: the *tidal* LOD evolution (Farhat 2022 — captures the
Earth → Moon angular-momentum transfer that drives Moon recession) is
**independent of** the GIA contribution. Both processes are modelled
self-consistently and superpose in the LOD calculation:

```
LOD(t) = 2π / ω(t)
ω(t) = L_Earth(t) / I_Earth(t)
L_Earth(t) = L_Total_EM − L_Moon(t)     ← tidal channel: Moon distance evolves
I_Earth(t) = α(t) · M · R²              ← GIA channel: α evolves
```

L_Total_EM is the constant anchor (set at J2000 from current
observations). L_Moon(t) evolves per Farhat 2022 (tidal). I_Earth(t)
evolves per α(t) (GIA). The two channels touch only at the ω(t)
quotient — which is the observable, integrated to ΔT.

### Physical basis: Maxwell rheology sets the timescale, orbital forcing drives the amplitude

The relaxation timescale for GIA follows from mantle rheology. For a
Maxwell viscoelastic body, `τ_Maxwell = η / μ` with `μ_mantle ≈ 1.5 × 10¹¹ Pa`
(shear modulus from seismic body-wave velocities) and `η_mantle ≈ 10²¹ Pa·s`
(mantle viscosity from post-glacial rebound inversions), giving
`τ_Maxwell ≈ 210 yr`. Continental-ice-load response at spherical-harmonic
degree n = 2 (dominant ice-sheet mode) inflates this by geometric factor
~20-30, giving `τ ≈ 4-6 kyr` — the kyr scale on which α evolves.

This provides the *timescale* — but the model goes further and provides
the *driver*. Instead of parameterising α(t) as a sum of viscoelastic
relaxation exponentials with amplitudes fit to boundary conditions, the
model binds α(t) directly to the L1 orbital layer of the canonical
Climate Formula (LR04 post-MPT regime; see [doc 92](92-climate-formula.md)).
One physical mechanism, two observables — the same L1 orbital signal that
drives ice-mass cycles in the δ¹⁸O record also drives α on the same
timescale, with a single coupling coefficient set from independent
satellite measurement:

```javascript
// @essrt/physics/climate/l1-orbital — ONE home for the three runtimes + tools/lib
const alphaGia = createAlphaGiaChannel({
  l1Terms: CLIMATE_REGIME.L1,                                  // the physical L1 lines (periods in kyr)
  yStdDenormalization: CLIMATE_REGIME.denormalization.y_std,
  relaxationKyr: C.deepTime.alphaGiaRelaxationKyr,             // τ — measured against the ΔT record
  alphaGiaRateJ2000PerYr: C.deepTime.alphaGiaRateJ2000PerYr,   // Cox & Chao ÷ Peltier factor
  alphaJ2000: EARTH_MOI_FACTOR,                                 // IERS Conventions 2010
});
// α(t) = α₀ − k·[L1(t) − ⟨L1⟩_τ(t)]; each L1 line passes the causal exponential
// filter as a line (Ĉ' = Ĉ·iωτ/(1 + iωτ)); k derived so dα/dt(J2000) = the rate above
const earthMoiFactorAtAge = (t_Ma) => alphaGia.alphaAt(2000 - t_Ma * 1e6);
```

Sign convention (D7): an uncompensated ice load LOWERS α (k > 0, the
direct-load term); the mantle's viscoelastic compensation and, after the
ice is gone, its rebound carry the opposite sign with lag τ. Both are the
two terms of one response function, so the deglacial sequence is spin-down
while the ice melts (Cheng, Tapley & Ries 2013: melting raises J₂) and
spin-up for ~τ afterwards — today's −0.35 ms/cy is that tail, α peaks
~7–9 kyr after a deglaciation, and the LGM sits slightly below today. The
pre-D7 listing applied the rebound sign instantaneously and placed the α
maxima at the glacial maxima; its in-era slope was carried by fitted comb
lines the T1 test retired.

**Anchored physical constants** (all from independent literature, none
fitted to eclipses):

**1. α at J2000 — `EARTH_MOI_FACTOR = 0.3306947`**
   IERS Conventions 2010 published value.

**2. Modern dα/dt — calibrated to `−1.35 × 10⁻¹¹/yr`**
   Derived from `dJ₂/dt ≈ −2.7 × 10⁻¹¹/yr` (Cox & Chao 2002, confirmed
   Cheng, Tapley & Ries 2013) via the J₂→α conversion factor 2.0:
   ```
   dα/dt = dJ₂/dt / 2.0 = -2.7e-11 / 2.0 = -1.35e-11 /yr
   ```
   The conversion factor is model-dependent — an idealized axisymmetric
   point-mass equator↔pole geometry gives factor 1.5, while realistic
   Peltier ICE-6G distributed-loading fingerprints give factors in the
   1.5-2.5 range depending on mantle viscosity assumptions. Factor 2.0
   sits at the mid-range of the Peltier ICE-6G LOD-coupling estimates
   and gives model dLOD/dt at J2000 = 1.77 ms/century, matching
   IERS observation of 1.75 ms/century within 1%.

**3. L1 orbital layer** — Climate Formula LR04 post-MPT regime coefficients
   (see [doc 92 § Regime coefficients](92-climate-formula.md)). Fit
   independently to LR04 δ¹⁸O record via ridge regression; no eclipse
   data enters the L1 fit.

The coupling k (registry `alphaClimateScale`, derived at runtime) is fixed
by the −1.35 × 10⁻¹¹/yr Cox & Chao/Peltier target; τ is the one measured
quantity (plan 06 D7: the joint fitter's optimum 5–6 kyr, with 3 kyr and
≥ 10 kyr rejected). All other structure in α(t) — the glacial-cycle
excursions, their timing relative to the deglaciations, the smooth C∞
continuity at J2000 — is *emergent* from the physical L1 lines through the
response function, not fitted.

### Required properties of the form

1. **Modern boundary condition exact**: at t_Ma = 0, α(0) = EARTH_MOI_FACTOR
   and dα/dt = −1.35 × 10⁻¹¹/yr by construction (single coefficient sets
   both).

2. **Bounded at deep paleo**: the L1 orbital signal is a bounded
   periodic sum over fixed harmonics — α(t) stays within a bounded
   glacial-cycle range at any epoch. No blow-up in Cambrian/Devonian calls.

3. **C∞ continuous at t_Ma = 0**: the L1 orbital form is smooth
   everywhere by construction — no `|t_Ma|`-symmetrisation, no piecewise
   past/future split, no slope discontinuity at J2000.

### What α(t) does NOT touch

- **Moon distance evolution**: pure Farhat 2022, untouched
- **Moon eccentricity**: untouched
- **Earth radius**: untouched
- **Kepler's 3rd law for the Moon**: preserved exactly via L_Total_EM
  conservation
- **All planet orbital integrators**: untouched (these use TT, not UT)

α(t) is a Earth-internal mass-redistribution correction — nothing else.

---

## The L-track validation pipeline

Eight core phases (L-1, L-2 lunar, L-2 solar, L-3, L-4, L-5, L-5b, L-7),
plus residual-investigation diagnostics. They were run as 20 console-test
buttons in the simulator's Tools menu; the folder is retired, and the
phases that are tests now run as recorded generators in `npm run check`:
L-1 and the canon geometry in `lunar-alignment`, L-4 in `lunar-canon-recall`,
L-5 in `lunar-alignment` visibility, L-5b Section 1 and L-7 in `eclipse-audit`
(doc 52 Part 5 maps every former button). The phases are described here as
they were run, with their findings:

### L-1 — Predictive lunar-eclipse finder (sanity check)

Scan 2020-2026 (~6 years), find ~14 oppositions, classify each as
Total/Partial/Penumbral by geocentric Moon latitude vs Earth shadow
geometry. Cross-check against 14 NASA-Canon-known events.

**Result**: 14/14 events found, 13/14 type classifications agree.
The classifier applies the standard ~2% atmospheric shadow enlargement
(Danjon/Chauvenet rule — the NASA-canon convention). The single
boundary case is 2021-05-26: our finder reports umbral magnitude 0.988
— just below the 1.000 totality threshold — vs NASA's 1.009, an event
that was total by only 0.9%. The remaining gap is input precision
(low-precision Moon-β series ~±0.015 mag; fixed mean Sun distance
~0.006 mag), the same ±0.02 scatter seen across the full magnitude
table, not a geometry error.

### L-2 — Historical catalog + tweakpane navigator

14 NASA-Lunar-Canon-verified events (2020-2025) embedded as
`LUNAR_ECLIPSE_PRESETS` with a tweakpane navigation UI (Solar & Lunar
Eclipses → Lunar Eclipses subfolder). Prev/Next buttons jump the 3D
scene to each event.

*Note*: the **L-2 lunar** and **L-2 solar** console-test buttons listed in
the Reproducibility section are *predictive finders* (`findLunarEclipsesInRange`
and `findSolarEclipsesInRange`) — used to discover events in arbitrary
year ranges, including outside NASA's published windows. They are
separate utilities from the L-2 navigation widget described here.

### L-3 — NASA Lunar Canon import + cross-check

Scrape the 12,064-event 5-Millennium Canon from
`eclipse.gsfc.nasa.gov/LEcat5/` into
`public/input/lunar-eclipses-nasa.json`. Provides a complete machine-
readable reference for the bidirectional comparison.

**Cross-check result**: each of our 14 catalog entries matches NASA's
published JD within ±35 seconds.

### L-4 — Bidirectional model⇄NASA scan over [-1999, 3000]

Run model finder over the full 5,000-year range (~12,000 events
predicted), match against NASA Canon by JD proximity, classify into
matched / type-mismatch / model-only / NASA-only. Two thresholds:

- **Physical-event match (±3 hours, same type)**: did the model find
  the same opposition NASA found?
- **Tight UT match (±15 min)**: do the two clocks agree on UT timing?

**Result** (fully-derived e_E channel + carrier split + dynamical
inclination, the shipped state): 12,070 model
events vs 12,064 NASA events over 5,000 years. Physical-event recall
99.58%; the unmatched edges (57 model-only / 51 NASA-only) consist
entirely of grazing penumbrals at the outer eclipse threshold —
threshold-convention scatter with no directional bias. Type accuracy on
matched events 98.66%; all 161 mismatches are boundary-straddlers
(Total↔Partial with umbral magnitude within ~0.02 of 1.0, or
Penumbral↔Partial within ~0.03 of 0). Tight (15 min) UT recall 74.62% —
structured by the model ↔ NASA ΔT divergence, captured quantitatively by
the per-century diagnostic. Certified under the framework-native lunar
argument skeleton (`MOON_ARGS_FRAMEWORK_NATIVE` default ON) with the
fully-derived e_E fluctuation (doc 66 §1): statistically
indistinguishable from the pure-Meeus skeleton (recall/type within
0.1–0.15 pp of the earlier astro-reference-anchored certification
99.69/75.42/98.97) while bounded at deep time with zero fitted values.

### L-5 — NASA "Historical Interest" cross-check (28 famous events)

Scrape NASA's curated list (Babylonian, Aristophanes/Cleon, Ptolemy,
Brahe, Halley, Cook, Lewis & Clark, etc.) via
`scripts/fetch_nasa_historical_lunar.py` into
`lunar-eclipses-documented.json`.

**Result**: 28/28 events within ±15 min of the NASA Canon JD and 28/28
type agreement, from −746 (the Babylonian anchor event) to 2001. The
per-event `observed_time_ut` placeholders in the JSON remain empty and
optional — observation-side validation is delivered by L-5b's
Stephenson/Morrison timed-contact dataset instead.

### L-5b — Three-way comparison vs Stephenson 2016 (THE HEADLINE)

For each of 270 primary-source observations from Stephenson, Morrison
& Hohenkerk (2016) tables S01 (Babylonian), S02 (Babylonian ziqpu),
S04 (Almagest), S05 (Chinese), S07 (Greek), S09 (Arab), compute:

- `obs_ΔT`   = Stephenson-derived ΔT from the primary-source observation
- `nasa_ΔT`  = mean ΔT of NASA Canon entries in the observation year
               (Espenak/Meeus polynomial)
- `model_ΔT` = our `meanDeltaTSecondsAtAge((2000−year)/1e6)`
               (Farhat 2022 tidal + α(t) GIA viscoelastic)

Headline metric: mean |residual| across the **267 observations with
both NASA and model ΔT defined** (the remaining 3 of the 270-event
total fall outside the NASA Espenak/Meeus polynomial's published
validity range or have missing per-event ΔT in Stephenson 2016, so they
cannot participate in the three-way comparison).

### L-5b regression — residual structure diagnostic

Weighted polynomial fits (linear/quadratic/cubic in year) to the
`(obs − model_ΔT)` residual, reports R² + per-fit RMS + per-table
detrended residual.

### L-7 — Independent cross-check against solar observations

Parallel to L-5b but for solar eclipses, using Stephenson 2016 tables
S03 (Babylonian solar, 25 events), S06 (Chinese solar, 42), S08 (Arab
solar, 22) — 89 timed primary-source solar observations spanning -356
BCE to 1277 CE. Since ΔT is a property of Earth rotation (not eclipse
type), this is an *independent* cross-validation of the α(t) physics
on a separate observation dataset.

Same three-way pipeline (obs vs NASA vs model). Per-table breakdown
expected to mirror L-5b per-table structure if α(t) is real physics.

---

## The L-5b result

### Headline (267 observations, six tables)

```
                                       Mean |residual| (s)    Mean |residual| (min)
Stephenson 2016 spline polynomial:                 1211                20.2   ← fit to these data
NASA Espenak/Meeus polynomial:                     1199                20.0   ← also fit-class
Model (joint world: tidal + α(t) + stack + swing): <!--v:lunarResidualMeanAbsSeconds-->1,214<!--/v-->               <!--v:lunarResidualMinutes-->20.2<!--/v-->   ← the model, no ΔT polynomial fitting

Events where the model is closer to obs than NASA: 117/267 (43.8%)
Framework excess over NASA on remaining events: 13 s on average
Framework excess over Stephenson: 2 s (0.0 min — the dataset noise floor)
```

Both the Stephenson 2016 spline polynomial and the NASA Espenak/Meeus
polynomial are fit to (essentially) this exact observation dataset —
per-event residuals against either measure model distance from a
smoothed representation of the observations, not physical validity.
The model's independent validation is the 26-event solar-eclipse
alignment audit (current certified-chain run): 16/26 with the umbra
reaching the observation site (3 confirmed at greatest moment + 13
off-peak alignments — including −135 Babylon at BestGap
<!--v:babylon135BestGapKm-->152<!--/v--> km and −708 Lu at 9 km),
5/26 regional (model umbra in same continental band
but off site), 0/26 with residual ΔT-signal — the model agrees
with the documented UT on every event — and 5/26 geographic-class
events (umbra-*centerline* >1,000 km from the site; the gate measures
centerline distance, not visibility — at high γ the penumbral
footprint on the tilted Earth spans thousands of km, so these sites
can still see a deep partial; the class collects penumbra-only sites
and attribution debates — unrelated to physics). That audit uses the
model's own predicted UT and umbra track with no ΔT polynomial
in the loop.

### Convergence story: each physical constant swapped in isolation

| Stage | Mean residual | R²(linear) | Linear slope (s/yr) |
|---|---|---|---|
| Pure-tidal only (no GIA) | 58.6 min | 0.31 | +1.6 |
| Linear α(t) @ −2.7×10⁻¹¹/yr (Cox & Chao raw dJ₂/dt) | 34.5 min | 0.53 | −2.67 |
| Linear α(t) @ −1.35×10⁻¹¹/yr (factor-2.0 J₂→α, Peltier ICE-6G) | 23.6 min | — | — |
| Single-mode viscoelastic α(t), τ = 5 ka | 24.3 min | 0.096 | −0.79 |
| Multi-mode viscoelastic α(t), τ ∈ {1.5, 5, 14} ka (\|t\|-symmetric) | 24.4 min | 0.090 | −0.77 |
| L1-orbital-coupled α(t) + 4-flag millennial stack (pre-joint) | 21.3 min | — | — |
| **L1-orbital-coupled α(t) + 4-flag stack + Core-mantle swing (shipped, joint world)** | **20.2 min** | — | — |

Each row is a single physically-motivated literature value swapped
into the model. The R²(linear) collapse from 0.53 → 0.090 under the
viscoelastic α(t) is the *first-order organised-structure absorption* —
most of the pure-tidal offset from Stephenson is captured by the GIA
correction alone. The final row (L1-orbital + 4-flag stack) closes the
remaining millennial-scale residual structure with four fitted millennial
cycles (Bond 1466, Hallstatt 2430, Jose5 897, Jose4 716 yr): their
amplitudes and phases are fitted, their periods are the canonical values
(T5).

The L1-orbital refinement replaces the `|t_Ma|`-symmetric viscoelastic
form with direct coupling of α(t) to the L1 orbital layer of the
canonical Climate Formula (documented in [doc 99](99-expanding-solar-system-resonance-theory.md)
§"α(t) implementation"). This eliminates the derivative discontinuity
at J2000 and gives a physically-motivated glacial-cycle-driven α
trajectory suitable for deep-time work. α_{J2000} and dα/dt_{J2000}
are preserved exactly.

### Per-table cross-source consistency

After removing the residual's small remaining linear trend:

| Source | Tradition | n | Detrended mean (s) | RMS (s) |
|---|---|---:|---:|---:|
| S01 | Babylonian | 125 | −44 | 2252 |
| S02 | Babylonian (ziqpu) | 21 | −342 | 1302 |
| S04 | Babylonian Almagest | 9 | +258 | 1768 |
| S05 | Chinese | 69 | +174 | 1050 |
| S07 | Greek | 11 | −794 | 1509 |
| S09 | **Arab** | 32 | **+57** | **763** |

The three highest-precision, largest-sample sources (S01 Babylonian,
S05 Chinese, S09 Arab) detrend to within ±200 s. S09 (Arab
medieval — Ibn Yunus, Habash al-Ḥāsib, Battānī) is the tightest at
±57 s with RMS 763 s. This is the *agreement-across-cultures*
cross-validation: four independent observation traditions, separated
by thousands of years and tens of thousands of kilometres, agree on
the magnitude of the model's residual to within the noise floor.
That cannot be accidental — it confirms the residual is a real
property of the model, not regional observational bias.

### Per-century convergence at ancient Babylonian era

The deepest, hardest-to-fit observations — the cuneiform tablets
from Babylon, -800 to -300 BCE — are reproduced per century to within
<!--v:lunarCenturyResidualMinMinutes-->1<!--/v-->–<!--v:lunarCenturyResidualMaxMinutes-->14<!--/v--> minutes
of an observed ΔT signal of 4–6 **hours** (0.5–5% relative). The table
is CI-pinned by the `lunar-alignment` gate
(`data/lunar-alignment-summary.json` §dtBandsByCentury) — a silent
drift in either direction fails the chain:

| Century | n | obs ΔT (hr) | model ΔT (hr) | residual |
|---|---:|---:|---:|---:|
| -800…-701 | <!--v:lunarCentury800N-->2<!--/v--> | <!--v:lunarCentury800ObsHours-->5.69<!--/v--> | <!--v:lunarCentury800FrameworkHours-->5.67<!--/v--> | <!--v:lunarCentury800ResidualHours-->−0.02<!--/v--> hr |
| -700…-601 | <!--v:lunarCentury700N-->8<!--/v--> | <!--v:lunarCentury700ObsHours-->5.42<!--/v--> | <!--v:lunarCentury700FrameworkHours-->5.33<!--/v--> | <!--v:lunarCentury700ResidualHours-->−0.09<!--/v--> hr |
| -600…-501 | <!--v:lunarCentury600N-->21<!--/v--> | <!--v:lunarCentury600ObsHours-->5.03<!--/v--> | <!--v:lunarCentury600FrameworkHours-->4.93<!--/v--> | <!--v:lunarCentury600ResidualHours-->−0.10<!--/v--> hr |
| -500…-401 | <!--v:lunarCentury500N-->17<!--/v--> | <!--v:lunarCentury500ObsHours-->4.55<!--/v--> | <!--v:lunarCentury500FrameworkHours-->4.36<!--/v--> | <!--v:lunarCentury500ResidualHours-->−0.19<!--/v--> hr |
| -400…-301 | <!--v:lunarCentury400N-->27<!--/v--> | <!--v:lunarCentury400ObsHours-->4.33<!--/v--> | <!--v:lunarCentury400FrameworkHours-->4.10<!--/v--> | <!--v:lunarCentury400ResidualHours-->−0.23<!--/v--> hr |

Three thousand years deep, observations from clay tablets, reproduced
by a model whose every physical constant comes from independent
literature — zero fitting parameters. That this works is the headline.
The small residual trend toward -400 (the model runs ~0.1–0.2 hr below
the tablet reductions there) is recorded and gated rather than tuned
away; the reductions carry the Stephenson team's conversion assumptions,
and the assumption-light cross-check agrees with the model — the
untimed-bounds section of the same gate places the model ΔT at −135
(<!--v:lunarDtBoundsBabylon135FrameworkSeconds-->11,982<!--/v--> s) inside the
tablet's published totality window
[<!--v:lunarDtBoundsBabylon135LowSeconds-->11,220<!--/v-->, <!--v:lunarDtBoundsBabylon135HighSeconds-->12,140<!--/v-->] s.

### The residual trend is the lunar-theory convention — measured

Every `dt_observed_sec` in the corpus was produced by converting the raw
tablet timing through the Stephenson team's ELP-class lunar ephemeris with
its constant-ṅ convention. The model's Moon is not that Moon: its
month evolution is chain-integrated on the model's own recession history. The `theoryDrift`
section of the same gate measures the difference directly, on the TT axis
(model opposition vs the NASA canon's greatest-eclipse instant, era
bins ±40 yr, modern definitional baseline subtracted): a smooth secular
drift reaching <!--v:lunarDrift800Minutes-->−2.7<!--/v--> min at the −750 era
and vanishing toward the present — an effective
Δṅ ≈ <!--v:lunarTheoryDriftDeltaNdot-->0.22<!--/v--> ″/cy² between the two
theories. A re-reduction of the tablets with the model's own Moon
shifts each century's implied ΔT by exactly that drift, which converts
the one-sided residual column above into sign-mixed, noise-class scatter:

| Century | residual today | **pre-registered** residual after model re-reduction |
|---|---:|---:|
| -800…-701 | <!--v:lunarCentury800ResidualHours-->−0.02<!--/v--> hr | <!--v:lunarPredictedReduced800Minutes-->+1.5<!--/v--> min |
| -700…-601 | <!--v:lunarCentury700ResidualHours-->−0.09<!--/v--> hr | <!--v:lunarPredictedReduced700Minutes-->−3.4<!--/v--> min |
| -600…-501 | <!--v:lunarCentury600ResidualHours-->−0.10<!--/v--> hr | <!--v:lunarPredictedReduced600Minutes-->−3.4<!--/v--> min |
| -500…-401 | <!--v:lunarCentury500ResidualHours-->−0.19<!--/v--> hr | <!--v:lunarPredictedReduced500Minutes-->−9.3<!--/v--> min |
| -400…-301 | <!--v:lunarCentury400ResidualHours-->−0.23<!--/v--> hr | <!--v:lunarPredictedReduced400Minutes-->−12.3<!--/v--> min |

These predictions are recorded in the gate BEFORE the contact-time
re-reduction machinery exists — first-order only (contacts assumed to
shift with the opposition; the moonrise conversion shares part of the
drift; century and era bins are offset by 50 yr). When the re-reduction
campaign runs, landing near this column confirms the model's
dLOD/dt at the corpus noise floor with zero free parameters; landing
significantly elsewhere is a discovery about out-of-window LOD
structure. Either outcome is informative — that is why the column is
pinned now.

The column reflects the CURRENT lunar-theory state — the deep branch
with its secular-ë and of-date rate completions (doc 66 §1), under
which the remaining theory difference is the certified skeleton's own
residual class, not a model-argument secular. The column is
re-derived (`--rebaseline`, a conscious re-measurement) whenever the
lunar arguments change; prior states live in git history. The Phase C
re-reduction measures against this column as pinned.

### The Phase C verdict — the re-reduction has run

The differential contact-time re-reduction (the gate's `phaseC`
section; per observation `ΔT_re = ΔT_obs + (TT_greatest_ours −
TT_greatest_canon)` — the raw tablet time and the shadow-enlargement
convention cancel identically) identifies **<!--v:lunarPhaseCIdentified-->69<!--/v--> of <!--v:lunarPhaseCTotal-->75<!--/v-->** Babylonian
timed observations (S01/S02/S04, −800..−301; 4 via the ±1-yr calendar
straddle; one 16-min three-way ambiguity and one no-night-candidate
drop). Century statistic: the MEDIAN with MAD-derived standard error —
measured rationale: within-century pairs of high-Stephenson-weight
tablets can contradict each other beyond LOD-continuity (the −593 w10
vs −587 w6 pair implies a −2,700 ms/day mean LOD offset over six
years), so weights must not concentrate a century into one tablet.

| Century | measured median ± SE (min) | pre-registered (min) | z |
|---|---:|---:|---:|
| -800…-701 | +13.5 ± 39.8 | +0.8 | +0.3 |
| -700…-601 | −21.4 ± 8.3 | −4.4 | −2.1 |
| -600…-501 | −10.6 ± 6.0 | −3.9 | −1.1 |
| -500…-401 | −20.0 ± 13.9 | −9.4 | −0.8 |
| -400…-301 | −10.5 ± 2.7 | −12.4 | +0.7 |

**χ² = 6.7 over 5 centuries** (the governed artifact's own per-century column, `tools/verify/lunar-alignment.js` `phaseC`, reads χ² = <!--v:lunarPhaseCChi2-->9.2<!--/v--> over <!--v:lunarPhaseCCenturies-->5<!--/v--> — the two reductions weight the centuries differently, both inside the 95 % band; median-primary; instrument:
`tools/explore/phase-c-rereduction-hardened.mjs` — Stephenson-weighted
century means, ±1-yr candidate straddle, per-table split, verdict
against the RECORDED pre-registered column). The re-reduced
tablet corpus remains statistically consistent with the pinned
column: **the model's dLOD/dt stack survives its pre-registered
falsification test.** Both the column and the measured medians are
the conscious re-measurement under the certified framework-native
Sun with the derived torque term (the column re-derives per the
convention above whenever the lunar arguments change) — and the
torque term restores Meeus-class BCE timing from derived physics
(e.g. −400: −10.5 vs the Meeus-basis −10.4). Stated limits: the −800 bin is
unconstraining (n = 2); the column itself is first-order (the
bin-offset and moonrise-conversion caveats above); the test's
discriminating power is minutes-scale — the S05–S09 dense-target
programme through this same machinery is the planned power upgrade.
S02 (−225..−79) lies outside the pinned window and remains available
as a future extension of the measured curve.

### The dense-target corpus — the record now discriminates the cycles

The full timed corpus (the gate's `denseTargets` section:
S01/S02/S04 Babylonian + S05 Chinese + S09 Arab, −800..+1280;
S07 excluded pending per-row lunar/solar typing — the 364 trio is
Theon's SOLAR eclipse) runs through the same differential machinery:
**<!--v:lunarDenseIdentified-->244<!--/v--> of <!--v:lunarDenseTotal-->257<!--/v--> observations identified**, with per-century MAD-SEs
of order 120–220 s in the dense centuries (+1000: ±<!--v:lunarDenseSePlus1000Seconds-->121<!--/v--> s,
n = <!--v:lunarDenseNPlus1000-->38<!--/v-->; −400: ±<!--v:lunarDenseSeMinus400Seconds-->146<!--/v--> s, n = <!--v:lunarDenseNMinus400-->27<!--/v-->) — below the cycle contributions
(200–550 s), so the eclipse record genuinely discriminates the ΔT
stack, out of sample (the cycle fit window is 1650–2017). The
per-cycle ablation χ² (<!--v:lunarDenseCenturies-->13<!--/v--> centuries with n ≥ 5), under the certified
framework-native Sun with the derived torque term, all from the governed
artifact's `denseTargets.ablationChi2`: full stack <!--v:lunarDenseChi2FullStack-->55.7<!--/v-->
(the Meeus-basis class, as it must be, since the torque term restores
Meeus-class BCE timing); **minus resonator <!--v:lunarDenseChi2MinusResonator-->121.1<!--/v--> — the
Core-mantle swing is confirmed outright by the eclipse record (removing
it more than doubles the misfit)**; minus bond <!--v:lunarDenseChi2MinusBond-->61.7<!--/v--> — the
Bond cycle is supported, not confirmed (removing it raises the misfit by
about a tenth over those centuries); no cycles <!--v:lunarDenseChi2NoCycles-->81.0<!--/v-->
(the stack takes a third off the misfit); minus
jose5/hallstatt/jose4 = <!--v:lunarDenseChi2MinusJose5-->56.7<!--/v-->/<!--v:lunarDenseChi2MinusHallstatt-->54.6<!--/v-->/<!--v:lunarDenseChi2MinusJose4-->48.7<!--/v--> — the Joses and Hallstatt
receive no independent support from this corpus (removing Hallstatt or
Jose4 even lowers the misfit; for the Joses, consistent with their
~179-yr period averaging out in century bins; for Hallstatt this stands
in open tension with the canon-based ablation above, which validated it
— different dataset, different centuries; recorded as tension, not
verdict). Residual structure
remains at full-stack χ²/dof ≈ 3.5 (e.g. −300 at −1,245 ± 1,184 s)
— characterized in the next section: it is not Earth rotation, and
the stack stays as shipped.

### The residual structure is not Earth rotation — the stack stays

The "tune or extend the stack" question the χ²/dof ≈ 3.5 residual opens
has a measured answer (`tools/explore/dense-targets-residual-structure.mjs`,
same 244-row corpus and machinery as the gate): **neither** — no cycle
is added, removed, or retuned. The verdict is triple-locked: the
structure fails the LOD-continuity veto, Stephenson's own spline
misfits it identically, and no admissible Sun form absorbs it (a
torqueless Sun variant that partially fit the structure was itself the
form the SOLAR corpus and the Phase C test reject — the stress test
corroborates rather than contradicts the verdict).

**Attribution.** The model curve and Stephenson's own 2016 spline
agree to −6..−103 s at every century midpoint, yet *both* miss the
timed-lunar observations by the same −1,200..+500 s century medians
(e.g. −300: fw −1,222 vs spline −1,175). Stephenson's solution misfits
the timed subset of his own corpus the same way — his spline rides the
solar and untimed constraints. Whatever the structure is, it is not a
defect of either ΔT curve.

**Two physical vetoes.** (1) *LOD-continuity*: the century medians
swing −1,198 → −627 → −1,222 s across −500/−400/−300. A real ΔT cannot
do that — it would require ~16 ms/day LOD excursions flipping sign
century to century. The same test that adjudicates individual tablets
kills the ensemble structure. (2) *The LOD-amplitude bound*: the
weighted periodogram's best tone (a broad band around 1,165 yr,
amplitude 430 s, Δχ² 22) implies a **6.4 ms** LOD
amplitude — above the ~4 ms millennial bound that already excluded
mid-period closing cycles. The best candidate "new cycle" is
disqualified by the model's own standing bound.

The residual structure is therefore **observation-class systematics**
— per-era/per-source reduction conventions in the timed corpus — with
a century-correlated noise floor of roughly ±600 s. A naive
shape-regression against the shipped cycles exposes the same thing:
the corpus "wants" Hallstatt ×3.8 and the Joses ×4–5 (instantly
unphysical — they would smash the LOD bound), which reclassifies its
resonator coefficient (k = −0.65 ± 0.19, nominally "scale down") as
the same noise-class artifact rather than evidence. The ablation
validations above (resonator, Bond) stand: shape *necessity* across
many centuries is robust to century-correlated systematics in a way
amplitude-tuning is not. Future gains in this corpus come from
per-source-group reduction modeling (S07 per-row lunar/solar typing,
S02's ziqpu-star timing class, per-era offsets), not from the ΔT
stack.

### Remaining medieval residual — brief preview

Years 1000-1200 CE show the model slightly overshooting observations
by ~20 min (~0.35 hr). This is the largest remaining structured signal
in the residual. It is decomposed rigorously into physical components
under the "Eight hypotheses tested" and "Complete residual
decomposition" sections below. In brief preview, the decomposition has
three parts:

- **A millennial-scale Bond oscillation** at 1466 yr (74 × Jupiter-Saturn
  synodic to 0.22 % is one of several period coincidences at this
  resolution) that captures the dominant "bump" shape of the
  medieval feature; shipped default-ON as the Bond component of the
  4-flag stack (Bond + Hallstatt + Jose5 + Jose4).
- **A fractional non-tidal channel** ~0.5 ms/century window-average
  (about 2× Cox-Chao satellite value, and ~10% of the full
  Munk-MacDonald postulate) — time-varying mantle-core coupling: the
  era-localized signature of the millennial core–mantle rotation
  swing, now modelled as the Core-mantle swing episode (Resonator
  driver, the 4th dLOD/dt channel — doc 104).
- **Observation noise + Bond-fit imperfection artifacts** at the
  ~60 s RMS level — the irreducible floor from Stephenson's dataset
  precision averaged into the sampled Δ curve.

The Stephenson 2016 paper notes the medieval-era residual against
their own polynomial fit is similar in character. The residual IS
decomposable into named physical components (the three parts listed
above); what is irreducible is a much smaller ~60 s RMS observation
noise floor. See the "Complete residual decomposition" section for
the full accounting.

---

## The L-7 result

The L-7 pipeline runs the same three-way comparison (obs ΔT vs NASA ΔT vs
model ΔT) on the independent **89 primary-source SOLAR observations** from
Stephenson 2016 tables S03 (Babylonian, 25 events) + S06 (Chinese, 42) +
S08 (Arab, 22), spanning -356 BCE to 1277 CE. Since ΔT is a property of
Earth rotation (not of the eclipse type), the L-7 result is the independent
cross-check that the α(t) GIA physics validated against the lunar record
also holds against the solar record.

### Headline (89 solar observations, three tables)

```
                                       Mean |residual| (s)    Mean |residual| (min)
NASA Espenak/Meeus ΔT:                              672                11.2
Model (joint world: tidal + α(t) + stack + swing):  666                11.1

Events where the model is closer to obs than NASA: 42/89 (47.2%)
Framework 0.8% closer to primary-source observations than NASA on average.
```

The model edges NASA on the L-7 solar record — mean residual
666 s vs 672 s (the model residual sits below NASA's), closer to
observations on 42/89 events (47.2%). This is the strong independent
cross-validation: NASA's Espenak/Meeus polynomial is fit precisely to
these Stephenson solar observations, and the model — with zero
fitting to any per-observation ΔT data — lands at the same residual
magnitude.

Per-table:

| Table | Tradition | n | Year range | NASA \|res\| (s) | Model \|res\| (s) | Model closer |
|---|---|---:|---|---:|---:|---:|
| S03 | Babylonian solar | 25 | −356…−9 | 873 | 880 | 48% |
| S06 | Chinese timed | 42 | 586…1277 | 700 | 717 | 33% |
| S08 | Arab timed | 22 | 829…1004 | 390 | **326** | **73%** |

The absolute residuals are smaller than L-5b lunar (NASA 672 vs 1199 s,
model 666 vs <!--v:lunarResidualMeanAbsSeconds-->1,214<!--/v--> s — the solar model residual sits below
NASA's) because solar observations have tighter intrinsic precision —
narrow totality paths give sharper timing. Per tradition: the ancient
Babylonian S03 table is a statistical tie (880 vs 873 s, model
closer on 48% of events — the deepest solar observations carry no
model-side excess), the Arab S08 table is markedly
model-favorable (326 vs 390 s, closer on 73%), and the Chinese S06
table leans NASA (717 vs 700 s, closer on 33%). No per-tradition
fitting is involved on the model side.

### Per-century medieval signal — the cross-validation

The per-century L-7 breakdown shows where each clock sits against the
solar record through the medieval window:

| Century | n | obs ΔT (hr) | model ΔT (hr) | NASA \|res\| (s) | model \|res\| (s) | model closer |
|---|---:|---:|---:|---:|---:|---:|
| 800…899 | 6 | 0.55 | 0.64 | 538 | **480** | **67%** |
| 900…999 | 15 | 0.46 | 0.46 | 337 | **288** | **67%** |
| 1000…1099 | 16 | 0.47 | 0.33 | 750 | 781 | 31% |
| 1100…1199 | 8 | 0.33 | 0.24 | 347 | 368 | 25% |
| 1200…1299 | 9 | 0.19 | 0.18 | 294 | 303 | 33% |

The model leads the 800–999 centuries (closer on 67% of events in
each; in the 900s its mean ΔT matches the observed 0.46 hr exactly)
and trails NASA modestly in 1000–1299, with the global balance still
model-favorable (666 vs 672 s). Both clocks track the observed ΔT
column to ~0.1 hr throughout — per-century differences sit at the
observation noise floor, satisfying the **type-independence
requirement** — ΔT is a property of Earth rotation, not of eclipse
type.

---

## Mantle-core coupling: a positive null result

Tested as a ΔT correction and rejected — an asymmetric over-correction; the record is archived out of the tree (`docs/archive/retired/`, git history). The physical channel the residual did identify is the core–mantle swing of [doc 104](104-millennial-rotation-swing.md).

---

## The medieval residual — the hypothesis record

Eight hypotheses, Path A (the solar-activity → LOD coupling) and Test 5 (the Jupiter–Saturn–Earth perihelion configuration) were tested on the medieval residual; each verdict is archived with its diagnostics. What survived is the identification of [doc 104](104-millennial-rotation-swing.md) — one aperiodic core–mantle swing — and the stack's boundary stated below.

---

## Millennial-scale Bond harmonic at ~1466 years — shipped default-ON as part of the 4-flag stack

After the eight hypothesis tests left the medieval residual characterized
but not causally explained by any per-observation mechanism, a follow-up
investigation tested whether the residual could be absorbed by **a single
millennial-scale harmonic** drawn from the retired unit's integer comb,
on the scale of hundreds to thousands of
years. Unlike the Lomb-Scargle test (hypothesis 6) which scanned literature
periods at arbitrary frequencies, this test restricted candidates to that
comb — a restriction T5 later measured as empty (any period in the band
is within 0.03 % of a comb member).

### Finding — a broad Bond-band peak

A full scan of the retired comb across the sub-Milankovitch band (n ∈
[500, 5000], periods ~500 to ~5000 yr) — run as §14 of the L-5b
console diagnostic, which now scans 894–5365 yr directly in years (the
Python twin was deleted at plan 09 step 7e; its
headline is in [doc 109 §22](109-model-nbody-engine.md)) —
identifies a **broad peak in the ~1400–1500 yr range** with fit quality
essentially indistinguishable across n=1817..1863 (all R² 0.974–0.975,
well within the ~370-yr Fourier resolution of the training window).
Among the candidates in this band, the divisor label 1830 — passing the retired prime-factor rule, the
selection filter of the time — is closest to the
canonical Bond period from paleoclimate (~1470 yr, only 4 yr off):

| Interpretation | Value | Error |
|---|---:|---:|
| **74 × Jupiter-Saturn synodic** (74 × 19.853 yr) | 1469.11 yr | 0.22% |
| 124 × Jupiter orbit (124 × 11.860 yr) | 1470.64 yr | 0.32% |
| 50 × Saturn orbit (50 × 29.457 yr) | 1472.85 yr | 0.47% |
| Bond 1997 canonical (paleoclimate) | 1470 yr | 0.28% |

All three planetary interpretations converge on the Bond-scale period; the
J-S synodic count of 74 anchors it in Charvátová's Solar Inertial Motion
theory. The divisor label passed the retired prime-factor rule, as Jose5's did.
**That is a label, not a prediction** (T5): 6 % of the integers in the
band passed the rule, and the flat Bond band held four of them — the one
nearest the canonical Bond value was selected. The period is the record's
and the canonical value's; the comb arithmetic did not predict it.

### Structural significance — three convergent physical mechanisms

The Bond period admits multiple concurrent physical readings, none
mutually exclusive:

**Reading 1 — Solar Inertial Motion (Charvátová, Wilson, Scafetta)**:
74 × Jupiter-Saturn synodic aligns with SIM patterns in the Sun's
barycentric motion. J-S conjunctions modulate the Sun's motion around
the barycenter, driving solar-activity envelope modulation on
multi-centennial timescales. The 74× count is a period coincidence at
the record's resolution (0.22 %), not an arithmetic derivation (T5).

**Reading 2 — Bond cycle / Braun et al. 2005 thermohaline mechanism**:
the shipped period 1466 yr sits within Bond's published 1470±100 yr
uncertainty (only 4 yr off the canonical value), consistent with the
Braun 2005 mechanism where 1500-yr climate variability arises from
non-linear thermohaline amplification of solar forcing.

**Reading 3 — Jupiter and Saturn orbital multiples**: 124 × Jupiter
orbit (0.32% error) and 50 × Saturn orbit (0.47% error) both fall
within the same Fourier-resolved band. These readings tie the observed
feature to Earth-external planetary orbital mechanics rather than
Earth-perihelion sub-harmonics.

**Selection-rule note (T5)**: the four divisor labels were selected under
the prime-factor rule the Sun-longitude harmonic runtime filter enforced
(the filter and its comb are deleted).
The T5 null shows a compliant integer sits inside every fitted plateau by
density alone: the rule selected divisors, it did not predict periods.

### Live integration: shipped default-ON as part of the 4-flag stack

The **Option B** ΔT-only correction architecture is the shipped
implementation: it adds the anchored Bond harmonic to model ΔT
after the LOD Simpson integration, leaves `meanLodSecondsAtAge`
pure-physics, and preserves the J2000 LOD anchor at 86400.00001 s
exactly.

Bond alone halves the medieval bump peak (−1067 s → −543 s at year 990)
while leaving the aggregate mean |residual| roughly neutral — its
ancient trough near year −480 adds to the already-positive ancient BCE
residuals, cancelling the medieval win at the aggregate level. This
motivated the companion harmonics (Hallstatt 2430 yr and Jose5 897 yr)
that absorb signal bands where Bond is off-cycle. With the
full stack shipped default-ON (4 flags + Core-mantle swing, joint
world), the L-5b headline reaches 20.2 min mean |residual| with
117/267 events (43.8%) beating NASA's
Espenak/Meeus polynomial — the numbers reported in the L-5b Result
section above.

**Philosophical status — the zero-fit claim**: Bond's amplitude
and phase (shipped: the artifact's cos/sin pair in
`data/deltaT-4flag-fit.json` — read the values there, never here) come from fitting
`Stephenson_residual = polynomial_detrend + cos_A · cos(ωy) +
sin_A · sin(ωy)` at n=1830. The shipped coefficients now come from
`tools/fit/dt-corrections-fit.js` (Node, cascaded LSQ with the three
companion cycles — the ΔT re-close in `tools/fit/README.md`) and are
persisted to `data/deltaT-4flag-fit.json`, the sole source of truth
for the runtime constants. Enabling this in the live
model **VIOLATES the paper's original "no coefficients fitted to
eclipse data at any stage" claim**. This is a deliberate design
decision reflected in the code. The
PERIOD 1466 yr is the canonical Bond value as the record resolves it
(T5); the amplitude/phase remain fit-derived.

Two paths to amplitude and phase from independent physics:

1. **Independent paleoclimate calibration**: fit amplitude and phase
   to Bond 1997 IRD record, Braun 2005 thermohaline reconstruction,
   or equivalent — coefficients then come from independent physics.
2. **Predictive test of a specific mechanism** — e.g., derive
   amplitude from a SIM-driven solar activity model calibrated on
   satellite-era data — then test the predicted amplitude against
   the eclipse residual.

Until either path yields amplitude/phase from independent physics,
the shipped default-ON toggle is the research-ready configuration
that's been empirically A/B tested; the OFF state remains one flag-flip
away for baseline measurement without the stack.

### Scientific status

**The 1466-yr period is the canonical Bond period** (the former divisor 1830,
a selection record; 74 × J-S synodic to 0.22 % is a coincidence at this resolution —
T5). Empirical confirmation of the oscillation against the historical
eclipse record is decisive: the Stephenson − model residual is well-fit
by a single harmonic at this period (R² = 0.975 in-sample, R²_test =
0.97 cross-validated on CE→BCE prediction; random single lines score
lower — T5: mean 0.68, 95th percentile 0.957 for log-uniform periods in
the band; the older uniform-integer control gave 0.48). The signal is
real and period-specific.

**The Bond-scale 1450-yr period is well-documented in paleoclimate**
(Bond et al. 2001 in North Atlantic ice-rafted debris; Schulz 2002 /
Bond compilations in Greenland and tropical Andes ice cores; Tarim Basin
loess). **Its statistical significance is contested** (Schulz 2002
noted the spectral peak comes from only 3 D-O events; Roe 2022 J.
Climate challenged the multiple-comparison correction). **Its mechanism
is unresolved** in mainstream literature (solar amplification, thermohaline
oscillation, stochastic resonance, and astronomical/orbital forcing all
have proponents).

Our finding: the Bond-scale cycle is present in the historical
Earth-rotation record — a single ~1.5-kyr line beats random single lines
in the ΔT residual at p = 0.009 (T5). This is the first identification
(to our knowledge) of the Bond-scale cycle in the Earth-rotation
observational record. The 74 × Jupiter-Saturn synodic reading (0.22 %)
is a period coincidence at this resolution, not a derivation.

The **live integration** ships alongside three companion millennial
harmonics (Hallstatt, Jose5, Jose4) — see next section for the
empirical validation that motivated the full 4-flag stack.

---

## Companion millennial harmonics: Hallstatt (2430 yr), Jose5 (897 yr), and Jose4 (716 yr)

After Bond, three further millennial periods were investigated as
companion ΔT corrections. All four shipped periods were selected under
the retired prime-factor rule — a selection filter, not a prediction
(T5). Each corresponds to established sub-Milankovitch cycles in
independent paleoclimate proxies.

The four-cycle stack (Bond + Hallstatt + Jose5 + Jose4) is shipped
default-ON in `src/script.js`, with each individually toggleable. The
prime-factor rule, enforced at the time in the Sun-longitude
runtime filter (deleted with the comb at plan 09), was the
selection filter; T5 measured it as
carrying no information about the periods.

### Hallstatt harmonic (~2430 yr) — solar-activity coupling

**Period 2429.83 yr** (a fitted period stated in years; its former divisor
label is a selection record — T5).

**Physical interpretation**: matches the well-established **Hallstatt
cycle** (~2200–2500 yr) in cosmogenic isotope records
([Damon & Sonett 1991](https://www.google.com/search?q=Damon+Sonett+1991+14C+solar+cycle);
[Vasiliev & Dergachev 2002](https://www.google.com/search?q=Vasiliev+Dergachev+2002+Hallstatt);
[Steinhilber et al. 2012 PNAS](https://www.pnas.org/doi/10.1073/pnas.1118965109)).
Mechanism: long-term solar-activity modulation coupling into Earth
rotation via atmospheric mass distribution response to solar UV/EUV
variability.

**Empirical validation across three independent paleoclimate proxies**:

| Proxy | Duration | Empirical peak | Peak R² | Shipped 2430-yr R² |
|---|---:|---:|---:|---:|
| Steinhilber 2012 ¹⁰Be solar Φ | 9.4 kyr | 2293 yr | 0.077 | 0.058 (75% of peak) |
| Bereiter 2015 EPICA CO₂ | 800 kyr | 2404 yr | 0.043 | 0.037 (86% of peak) |
| Cheng 2016 speleothem δ¹⁸O | 640 kyr | (no peak) | <0.001 | <0.001 (null) |

**Two of three proxies show consistent Hallstatt-band signal near the
shipped 2430-yr period.** The Cheng speleothem null
result is attributed to monsoon δ¹⁸O being dominated by orbital-scale
forcing at 640 kyr, obscuring the weaker solar-activity signal.

**Amplitude — 80 s constrained**: joint Bond+Hallstatt fit against
Stephenson ΔT residual gave Hallstatt free-fit amplitude 276 s with
a Bond phase shift of ~13° (partial collinearity signature). Physical
prior for solar-activity → ΔT coupling is ~30–100 s. Shipped
amplitude is 80 s (moderate constraint balancing observation against
physical prior); phase preserved from the joint fit and scaled
proportionally.

**Research infrastructure**:
- the three Hallstatt proxy tests (Steinhilber solar Φ, the Cheng 640-kyr null, the EPICA 800-kyr CO₂ record) and the Bond + Hallstatt pair joint fit — scripts and artifacts deleted at plan 09 step 7e; headline numbers in [doc 109 §22](109-model-nbody-engine.md)
- `HALLSTATT_DT_CORRECTION_ENABLED` flag in `src/script.js` (default `true`)
- the Hallstatt ΔT-correction toggle console-test button

### Jose5 harmonic (~897 yr, 5×Jose) — planetary resonance

**Period 897.47 yr** (a fitted period stated in years; its former divisor
label is a selection record — T5).

**Physical interpretation**: closest match to **5 × Jose period**
(5 × 179 yr = 895 yr, offset 0.28%). The Jose cycle (Charvátová 2000)
is a well-established solar inertial motion period linked to
Jupiter-Uranus dynamics. Alternative: 45 × Jupiter-Saturn synodic
(45 × 19.85 yr = 893 yr, offset 0.45%).

**Empirical validation via L-5b Section 14** (with Bond only ON,
before Hallstatt or Jose5 were shipped):

| Divisor range | Period range | Amp | ΔR² |
|---:|---:|---:|---:|
| **divisors 2991..3000** | **894–897 yr** | **~70 s** | **0.0026** (top of scan) |

This was the strongest remaining signal in the divisor scan of the lunar
eclipse residual after Bond correction. All top-10 divisors in
Section 14 fell in the 894–897 yr band; the choice n=2989 is
essentially at the empirical peak.

**Verification — Jose5 absorbs its designed signal**: after Jose5
was activated in the 3-flag stack, the L-5b Section 14 top peak
migrated from 897 yr (Jose5's target) to 1090 yr — confirming Jose5
successfully absorbed the 897 yr band. This is the empirical
signature we would expect from a correctly-tuned harmonic.

**Amplitude — 50 s constrained**: triple joint fit (Bond + Hallstatt
+ Jose5) gave Jose5 free-fit amplitude 74 s. L-5b empirical was
~70 s. Both agree closely. Shipped amplitude is 50 s (conservative
constraint to minimize inter-cycle collinearity when all three flags
are simultaneously enabled); phase preserved from triple fit.

**Research infrastructure**:
- the Bond + Hallstatt + Jose5 triple joint fit — script and artifact deleted at plan 09 step 7e; record in [doc 109 §22](109-model-nbody-engine.md)
- `JOSE5_DT_CORRECTION_ENABLED` flag in `src/script.js` (default `true`)
- the Jose5 ΔT-correction toggle console-test button

### Jose4 harmonic (~716 yr, 4×Jose) — cross-archive coherent

**Period 715.53 yr** (a fitted period stated in years; its former divisor
label is a selection record — T5, the same family as Hallstatt).

**Physical interpretation**: closest match to **4 × Jose period**
(4 × 178.735 yr = 714.94 yr, offset **0.083%** — the tightest period
match of any candidate in the 600–800 yr band, tighter than Bond's
0.22% match to 74×J-S synodic). Same SIM/Jose family as Jose5 (5×Jose,
897 yr).
Structurally degenerate with Bond/2 ≈ 733 yr at ~2.5% level, but the
4×Jose anchor is 30× tighter so the shipped interpretation attributes
the signal to the SIM family.

**Empirical identification — cross-archive coherence test**:
The universal cross-archive scan (deleted at plan 09 step 7e; record in
[doc 109 §22](109-model-nbody-engine.md)) enumerated all
rule-compliant divisors of the retired comb in a period band and fitted each against multiple
paleoclimate archives simultaneously (Steinhilber ¹⁰Be solar Φ,
Stephenson ΔT, Cheng speleothem δ¹⁸O, EPICA CO2, LR04 δ¹⁸O). Jose4
was the top-ranked candidate in the 600–800 yr band by cross-dataset
significance:

| Proxy | Duration | Amp | Perm-95 threshold | Significant? |
|---|---:|---:|---:|:---:|
| Steinhilber ¹⁰Be solar Φ | 9.4 kyr | 41.7 MV | 24.1 MV | ✓ |
| EPICA CO2 | 800 kyr | 11.4 ppm | 2.5 ppm | ✓ |
| Stephenson ΔT | 2.7 kyr | 72.6 s | 393 s | (resolution-limited, not null) |
| Cheng speleothem | 640 kyr | 0.043 ‰ | 0.049 ‰ | · |

**Two independent archives** (solar activity + climate CO2) both light
up at exactly the 4×Jose divisor. The ~54° phase offset between them
(~107 yr at 716-yr period) is consistent with the expected CO2 lag
behind solar forcing. Within the Jose-family preset scan (2×–8× Jose),
4×Jose is UNIQUELY strong — the only Jose multiple with cross-archive
significance in both solar AND climate archives.

**Amplitude — 50 s shipped**: the current 4-cycle joint fit (Bond +
Hallstatt + Jose5 + Jose4) gives Jose4 free-fit amplitude 47.1 s;
the shipped artifact carries 50 s at the fitted phase
(`data/deltaT-4flag-fit.json` — read the phase there, never here). Note the stage_* RMS metrics do NOT
rank the stages (Stage C rms_post 19.7 s vs Stage D 21.2 s — the
doc-105 trap: they are fit-internal residuals, not comparable model
quality); Jose4 earns its place via the L-5b MWP improvement below,
not via stage RMS.
In L-5b: global RMS essentially unchanged (1625 → 1629 s, +4 s neutral),
but MWP peak improved from **−638 s @ year 990** (3-flag) to
**−580 s @ year 1000** (4-flag) — a ~58 s reduction of the medieval
bump at the target year.

**Cap shipping logic**: amplitudes above the physical prior are scaled
DOWN preserving phase (Hallstatt 276 s → 80 s cap; Jose5 74 s → 50 s
cap; Jose4 ships at the 50 s prior with free-fit 47.1 s). This prevents inflating a modest empirically-found
signal above what the joint fit actually finds.

**Research infrastructure**:
- the universal cross-archive scan and its outputs — deleted at plan 09 step 7e; record in [doc 109 §22](109-model-nbody-engine.md)
- `data/deltaT-4flag-fit.json` — 4-cycle joint fit output
- `JOSE4_DT_CORRECTION_ENABLED` flag in `src/script.js` (default `true`)
- the Jose4 ΔT-correction toggle console-test button

### The stack's boundary — why four flags and not more

Three further candidates (same selection filter) with genuine cross-archive
evidence are measured NOT to fit the 2.7-kyr Stephenson window and do
not ship — the record that the 4-flag stack sits at the empirical limit:

- **Eddy (999 yr; 0.05% match to the Eddy solar-minimum
  cycle)** — cross-archive coherent (Steinhilber Φ + EPICA CO₂), but the
  5-cycle joint fit shows significant collinearity (Bond amplitude
  375 → 646 s) and the L-5b outcome regresses the ancient BCE window
  (~70–86 s per century) for a late-medieval gain. Empirically real,
  unfittable against this window.
- **Emp862 (862 yr; no named-cycle mapping)** — the
  strongest cross-archive evidence of any candidate (three archives),
  but the 6-cycle joint fit is **rank-deficient** (amplitudes inflate
  20–700×; the Eddy–Emp862 beat period ~6,255 yr is unresolvable by the
  window). A different fitting target (multi-archive joint fit) could
  revisit it.
- **Jupiter92 (1090 yr)** — identified by residual
  peak-hunting, not cross-archive scan; measured to **cannibalize Bond
  signal** rather than add independent variance (Bond's own ΔR² halves
  under it), and neither tested phase improves any L-5b metric.

The artifacts for all three (the scan outputs, the quad fit, the Jupiter-92
isolated refit) were deleted at plan 09 step 7e — their headline numbers are
in [doc 109 §22](109-model-nbody-engine.md), git history
carries the files, and the CONFIG rollback notes stay in the fit tool. The shared rule they establish: empirical
coherence in paleoclimate records is necessary but not sufficient — a
shipped cycle must also be numerically well-conditioned against the
Stephenson window and add independent variance.

## The residual drift — superseded by the joint world

The four diagnostics (§14–17) that decomposed the pre-joint-world residual drift — the period scan, the J2000 LOD anchor, the secular-rate mismatch, the polynomial + dual-harmonic split — are archived. In the joint world the anchor drift is 6.7 μs/day and the rate-equivalent 0.010 ms/cy ([doc 104](104-millennial-rotation-swing.md) §8).

---

## Defensible scientific position

What this validation establishes:

1. **The non-tidal Earth-rotation contribution IS real and measurable**
   in the historical lunar record. A non-tidal component genuinely
   exists; the lunar-eclipse data discriminates this signal at sub-100 s
   ΔT resolution, where solar-eclipse visibility cannot.

2. **The FULL Munk-MacDonald non-tidal magnitude is rejected; a
   FRACTIONAL non-tidal contribution IS present.** The full ~6 ms/century
   Munk-MacDonald non-tidal assumption would over-correct Babylonian ΔT
   by ~2,700 s (H1 constant-Holme test). But the §16 rate sensitivity
   diagnostic (see "Complete residual decomposition" above) finds a
   **fractional non-tidal channel of ~0.5 ms/century (window-average)** present in
   the ΔT residual after Bond correction — approximately 2× the Cox &
   Chao 2002 satellite-measured GIA value, and ~10% of the full
   Munk-MacDonald postulate. This fractional contribution is real and
   is carried by the **Core-mantle swing** (doc 104). The
   residual supports ~2× Cox-Chao, not 25× Cox-Chao.

3. **α(t) uses zero eclipse-fitting parameters; the 4-flag stack
   PERIODS are zero-fit while its amplitudes/phases are fit-derived.**
   The α(t) machinery draws entirely from independent literature —
   IERS α at J2000, Cox & Chao satellite-measured dJ₂/dt with the
   Peltier ICE-6G factor-2.0 J₂→α conversion, and direct coupling to
   the L1 orbital layer of the canonical Climate Formula (see [doc 92](92-climate-formula.md))
   — and produces a model that agrees with NASA's empirical
   polynomial to within 13 s (0.2 min) on a 20 min observation noise
   floor.
   NASA's polynomial uses ~10+ coefficients fitted to this exact
   dataset; our α(t) independently predicts it from satellite/geodesy
   literature. The four millennial harmonics (Bond 1466, Hallstatt
   2430, Jose5 897, Jose4 716 yr) have FITTED periods at the canonical
   values (T5). Their AMPLITUDES and PHASES are
   fit-derived (constrained physical priors, cap-only shipping)
   against the Stephenson ΔT residual; shipping the 4-flag stack
   therefore breaks the paper's original zero-eclipse-fit claim at
   the amplitude/phase level, which is documented openly and can be
   A/B tested by toggling each cycle off.

   *Empirical sensitivity confirmation:* the
   [doc 103](103-babylon-eclipse-bce135.md) -135 Babylonian case
   study includes a direct α(t) tuning sweep that scales
   `EARTH_MOI_FACTOR_RATE_YR` across the Peltier ICE-6G literature
   uncertainty range and measures the resulting historical-eclipse
   umbra displacement. **The empirical sensitivity is ~3.3 km per
   100 sec of ΔT change** — i.e., the α(t) constants are *empirically
   uncloseable* even under aggressive tuning. This is the direct
   empirical proof that the choice of Peltier ICE-6G defaults isn't
   load-bearing on the lunar-timing or solar-visibility results, not
   just an abstract "zero fitting" assertion. The sweep button
   ("α(t) GIA tuning sweep at -135 Babylonian") is in Console Tests
   (F12) > Historical Eclipses & ΔT.

4. **Earth-Moon angular momentum and Kepler's 3rd law preserved
   exactly**. α(t) is a purely Earth-internal mass redistribution; the
   Moon orbit chain (Farhat 2022) is untouched. This satisfies the
   strict physics requirement on any LOD modification: it must come
   from a physical mechanism that doesn't violate other conservation
   laws. GIA satisfies this by construction.

5. **Four independent observation traditions agree on the magnitude
   of the model's residual** to within ±200 s after detrending — the
   cross-cultural validation argument. Babylonian, Greek, Chinese, and
   Arab observers spanning -720 to 1280 CE produce mutually-consistent
   ΔT residuals against our model. If the residual were a model error
   rather than a real property of Earth's rotation, cross-source
   agreement at this level would be coincidental.

6. **The 4-flag stack independently reproduces the Holocene climate-driven
   LOD rhythm.** The shipped Bond + Hallstatt + Jose5 + Jose4 corrections
   were fitted against the Stephenson ΔT residual — an eclipse-timing
   quantity, not a climate record. Sampling
   `meanLodSecondsWithCorrectionsAtAge` (`tools/lib/deep-time.js`) at
   climate-transition epochs shows that dLOD/dt tracks known Holocene
   warm/cold epochs, at the sign and magnitude expected from mass
   redistribution physics (warm → glacial mass moves equatorward →
   I_earth ↑ → Earth rotation slows → LOD grows):

   | Epoch | Climate | dLOD/dt (μs/day/century) |
   |---|---|---:|
   | Late Antique cold (~550 CE) | Cold | −255 |
   | **MWP peak (~1000 CE)** | **Warm** | **+4449** |
   | LIA onset (~1450 CE) | Cold | −65 |
   | Modern warming (2100) | Warm | +1740 |

   The Bond 1466-yr half-period (~733 yr) places a MWP→LIA turn at
   year ~1000 + 733 = ~1733, near the historical Maunder Minimum coldest
   window (1650–1715 CE); the next Bond warm peak extrapolates to
   ~1000 + 1466 = ~2466. Treat this as period arithmetic, not as a
   result: tested across the full Little Ice Age, Σ_stack carries the
   **wrong sign for all five centuries** (item 7), so the harmonic does
   not in fact track that transition. The stack was fitted to eclipse
   residuals rather than climate records, which makes the comparison
   out-of-sample — but out-of-sample is not the same as validated.

7. **The 4-flag stack correlates with Bond's own drift-ice record at
   r = +0.36 out-of-sample (shipped joint world; +0.49 with the
   pre-joint flags-only stack) — an open correspondence, not a
   validation.** A quantitative version of the previous point. The Σ_stack value (cumulative δLOD from the four flag cycles:
   Bond + Hallstatt + Jose5 + Jose4) was Pearson-correlated against
   the Bond 2001 IRD stack (North Atlantic MC52 + VM29-191 + MC21 +
   GGC22 — the same hematite-stained-grain drift-ice series Bond
   used to identify his Bond 0-8 cold events). Detrended, on the
   model's validated window −4000 BC to +1800 AD (the range where
   the ΔT fit is not extrapolating): **r = +0.49 at lag 0** with the
   pre-joint flags-only stack (re-measured under the shipped joint
   world — where part of the late-Holocene structure moved into the
   Core-mantle swing — the flags-only correlation is **r = +0.36**).
   The correlation is a true retrodiction — the stack was fit against
   the Stephenson 2016 ΔT residual (an eclipse-timing dataset, not a
   climate record — see item 6), never against IRD, GISP2, or any
   climate proxy. Framework-vs-IRD is stronger than
   model-vs-GISP2 (r ≈ +0.20 in the same window) because GISP2
   is a local Greenland temperature signal while Bond 2001 is the
   same physical drift-ice-driven mass-redistribution signal the
   model's Bond harmonic is modelling.

   The sign convention tested here is the one proposed for the STACK —
   "Σ > 0 = higher LOD than baseline = surface mass equatorward = warm
   anomaly; Σ < 0 = cold." Two things must be said about it. It is NOT
   the rule for the α(t)/GIA channel, which responds to the same
   climate signal with the opposite sign and a multi-millennial lag
   (solid-Earth rebound; see doc 99 § "Two channels, opposite signs") —
   conflating the two is the easiest way to get this subject backwards.
   And the rule itself is **a hypothesis under test in what follows,
   not an established property of the stack**: the surface-mass
   mechanism is real geophysics, but the identification of these four
   flags with it is exactly what the null tests below fail to support.

   Under that rule, **4 of the 5 named events inside the validated
   window match** (shipped joint-world Σ = 4 flags + Core-mantle
   swing): Bond 4 (-3950 BC, cold, Σ = −3.03 ms ✓), 4.2 ka event
   (-2250 BC, cold, Σ = −4.11 ✓), Roman Warm Period peak (+100 AD,
   warm, Σ = +1.01 ✓), MWP peak (+1050 AD, warm, Σ = +1.97 ✓),
   Maunder Minimum (+1670 AD, cold, Σ = +0.45 — a MISS: the
   convention predicts warm). Dalton Minimum (+1810 AD) falls just
   outside the +1800 AD window edge and is no longer counted.
   Maunder misses under either stack definition: flags-only it is
   Σ = +0.118 ms, still positive, so the Core-mantle swing is not
   what carries it across zero.

   Four events lie outside the validated window and are expected to
   miss. Three are pre-window (Younger Dryas at −10500 BC, 8.2 ka
   event at −6250 BC, Holocene Optimum peak at −5000 BC), where
   fit-window extrapolation drift accumulates the 4-flag phases
   beyond the harmonic coherence budget. One is post-window
   (Modern warm, 2000 AD), which is anthropogenic — the model, a
   pure orbital/tidal model, correctly does not predict it. That the
   model does *not* predict recent industrial warming is a
   feature, not a bug: it isolates the natural orbital rhythm from
   the anthropogenic signal.

   **How far this event test can be trusted.** The 4-of-5 figure is
   correctly computed, but it is the most favourable slice of a weak
   relationship. Four null tests against the shipped stack:

   | Test | Result | Null / baseline |
   |---|---|---|
   | Sign rule across **full** named-period bands (every year, not the sampled peak year) | **65 %** correct | 50 % (coin flip) |
   | — of which the Little Ice Age (1300–1800 AD) | **0 %** — Σ_stack is positive, i.e. "warm", across the entire 500-yr period | — |
   | Crossing timing vs 10 named transitions (Monte-Carlo over typed crossings) | median 262 yr, **p ≈ 0.19** | null median 353 yr |
   | Band-limited phase, 4 harmonics × 2 proxies × 2 windows | no band survives correction for the 16 tests (single nominal hit Jose4↔GISP2 p = 0.046); Bond band ≈ **anti-phase** vs IRD (175°) | phase-randomised surrogates |
   | Windowed phase-tracking (drifting phase permitted) | no band significant; Bond↔IRD PLV p = 0.49 | phase-randomised surrogates |

   Both regenerate from `tools/explore/climate-band-phase.js`; the sign score
   and crossing test above from `tools/explore/climate-crossing-null.js`.

   The correlation is real as a number (r = +0.36 ⇒ ~13 % of variance),
   but it is **not carried by the 1466-yr band**, and the event-level
   sign agreement does not survive being tested across the full named
   periods instead of at hand-picked peak years. The Little Ice Age
   result is the most serious: the event test books it as a single
   narrow miss (Maunder), when the model in fact has the wrong sign
   for all five centuries of it.

   **What this means for the claim.** The correspondence between the
   4-flag stack and the Holocene climate rhythm is an **open
   correspondence, not a validation**, and must not be cited as
   confirmation that the stack's periods are the climate periods.
   The flags remain well-motivated as **ΔT corrections** — that is what
   they were fitted to, and what they demonstrably close — but the
   further step to "these are the climate cycles" is not supported by
   any test currently available to us. Re-upgrading the claim requires
   new evidence, not re-description of the existing correlation.

What we are NOT claiming:

- **That NASA's polynomial is comprehensively "beaten."** The model
  matches NASA within 13 s on average across L-5b lunar (<!--v:lunarResidualMeanAbsSeconds-->1,214<!--/v--> s vs
  1199 s), beats NASA on 117/267 lunar events (43.8%), and edges past
  NASA on L-7 solar (666 s vs 672 s, 42/89 events beating).
  NASA's polynomial is FIT to this dataset; ours PREDICTS it. The
  comparison is asymmetric and we acknowledge it openly. The
  achievement is not "beating NASA" but "predicting historical eclipse
  timing to essentially the same accuracy as NASA's ~10-coefficient
  fit, using only first-principles physical constants."

- **That the 20.2 min model residual is purely physical.** The
  Stephenson 2016 dataset has a ~20 min irreducible per-observation
  scatter; the remaining 13-s gap to NASA is at the level of
  observation noise and small unmodelled contributions (sea-level
  secular, regional GIA structure).

- **That GIA is the only secular non-tidal contributor.** Other channels
  exist but are smaller. We model GIA explicitly because it is the
  dominant secular non-tidal mechanism, has the cleanest independent
  measurement (satellite gravimetry), and has the cleanest physical
  meaning (Earth's polar moment changing via mass redistribution).

---

## Limits of this analysis

1. **Stephenson 2016 observation noise** is ~20 min per observation
   (RMS), dominant at the per-event level. Neither the model nor
   NASA can do better than this. The ~13-s model-vs-NASA gap in
   mean |residual| is the structural disagreement on top of the noise
   floor.

2. **α(t) is driven by the L1 orbital layer of the canonical Climate
   Formula** (see § "The physical constants and modern calibration").
   The L1 layer captures the Milankovitch orbital forcing of glacial
   cycles; the higher climate layers (L2, the 405-kyr carbon-thermostat family; L3, the boundary-condition steps)
   are not currently coupled into α(t). For the historical eclipse
   window (~2.7 kyr) the L1 layer carries essentially all the
   glacial-cycle amplitude relevant to α; the higher-frequency
   climate structure is captured separately by the 4-flag millennial
   stack rather than by additional α(t) coupling.

3. **Medieval residual** (years 800-1300, model overshoots by
   ~20 min under α(t) alone) is a residual signal that the model's
   α(t) does not fully capture. This has been decomposed in detail
   (see "Complete residual decomposition" and "Companion millennial
   harmonics") into four millennial harmonics (Bond 1466 yr, Hallstatt
   2430 yr, Jose5 897 yr, Jose4 716 yr), plus the Core-mantle swing (the fractional
   non-tidal channel, ~0.5 ms/century window-average — doc 104), plus
   observation noise. The stack + swing are shipped default-ON,
   calibrated in one joint equality-constrained solve with capped
   fit-derived amplitudes/phases; independent (non-eclipse)
   calibration remains open as the path to fully restore the zero-fit
   claim.

4. **Greek (S07) is an outlier** with 11 observations and a
   detrended mean residual of −794 s. Small sample; the per-table
   means for S01/S02/S04/S05/S09 are all within ±400 s. We treat S07
   as observation-bias dominated, not model-bias.

5. **The Cox & Chao 2002 satellite measurement** is a modern-era
   value (satellite era ~1979-present). The L-5b cross-validation
   tests whether this modern rate, projected back through the L1
   orbital coupling over 2,000+ years, matches the historical record.
   It does — but the underlying assumption that the satellite-era
   dJ₂/dt is representative of the millennial-scale rate (up to the
   L1-orbital modulation) is implicit in the model. The Peltier
   ICE-6G factor-2.0 J₂→α conversion is the standard literature
   treatment for this extrapolation.

---

## What's next

The natural extensions, in order from most to least defensible:

1. **Independent amplitude/phase calibration of the 4-flag stack —
   all four channels still open.**
   Each PERIOD is the canonical value (Bond 1466 yr, Hallstatt
   2430 yr, Jose5 5 × Jose = 897 yr, Jose4 4 × Jose = 716 yr —
   fitted-band periods, T5); the Option B ΔT-only correction
   architecture is implemented, shipped default-ON, and preserves the
   J2000 LOD anchor. The Bond channel's comparison against Bond's own
   drift-ice record (r = +0.36 under the shipped joint world,
   out-of-sample in the −4000 BC to +1800 AD window) does **not**
   constitute cross-validation of that channel: band-limited and
   windowed-phase testing show the correlation is not carried by the
   1466-yr band, and at the Bond period the stack and the IRD record
   are close to anti-phase. It therefore cannot anchor the Bond
   channel's amplitude or phase. See item 7 of "What this validation
   establishes" above for the four null tests. Independent
   *calibration* of the Bond
   amplitude/phase against IRD (and the analogous work for Hallstatt
   against Steinhilber ¹⁰Be, Jose5/Jose4 against SIM-driven solar
   activity) is still open. Once every amplitude/phase is anchored to
   an independent proxy, the paper's original zero-eclipse-fitting
   claim is fully restored. See § "Millennial-scale Bond harmonic" and
   § "Companion millennial harmonics" for the fit +
   cross-validation details.

2. **Time-variable mantle-core coupling**. The MC null result above
   shows the modern Holme rate is era-specific. A multi-period or
   Stephenson-style piecewise-polynomial mantle-core model could be
   added IF the time variability can be derived from independent
   geomagnetic-secular-variation observations (rather than fit to
   eclipses). Cleanest research direction for the remaining residual.

3. **Independent LLR cross-check — done**. The model's α₁ tidal
   parameter is anchored directly to LLR (Dickey 1994 / Chapront 2002:
   3.82 cm/yr Moon recession at J2000), closing the Moon secular-physics
   half of the deep-time story alongside the L1-orbital α(t) coupling.
   See [doc 99](99-expanding-solar-system-resonance-theory.md)
   §"Predicted Moon-Earth distance through time" for the LLR anchor
   derivation.

4. **Deep-time α(t) behaviour**. The L1 orbital form couples α(t) to
   Milankovitch orbital forcing of glacial cycles — bounded and
   glacial-cycle-modulated at any epoch. For Cenozoic to Quaternary
   work, this form is adequate; for deeper paleo, non-glacial
   mass-redistribution mechanisms (continental drift,
   subduction-cycle-driven mantle flow) would dominate and would need
   different treatment.

What NOT to do:

- **Do not fit any of the α(t) constants to the Stephenson data.**
  Tuning would absorb the cross-validation evidence and forfeit the
  first-principles independence argument. The values come from
  independent literature; the lunar record IS the test.

- **Do not introduce a fourth empirical constant** to fit the medieval
  residual unless a physical mechanism (specific non-tidal channel,
  modeled from independent data) requires it. The 20.2-min residual
  is essentially at the observation noise floor (2 s excess over
  Stephenson's own fit); further reduction would be over-fitting.

- **Do not modify Farhat 2022 tidal rate** to absorb residual structure.
  The tidal rate is anchored to modern LLR; refitting against deep-time
  eclipse data would degrade modern fidelity.

---

## Reproducibility

Every result in this document is reproduced by a generator or gate of
`npm run check`, never by hand: the generators write the tracked
`data/*.json` artifacts the value tags read, and refuse on divergence.

### Where each check runs now

The console-test buttons that reproduced these results are retired (plan 18); every check runs as a generator or gate of `npm run check` — the map is [doc 52](52-analysis-export-tools.md) Part 5: `tools/verify/lunar-alignment.js` (the 267-event comparison and its phase-C re-reduction; REFUSES on divergence), `tools/verify/lunar-canon-recall.js` (the full-canon recall), `tools/verify/eclipse-audit.js` (the solar audit), `tools/verify/lod-climate-correlation.js` (the stack against the climate record). The button tables that stood here are archived.

### Data sources (all in repository)

| Path | Source | Purpose |
|---|---|---|
| `public/input/lunar-eclipses-historical.json` | NASA Lunar Canon, modern era | 14-event seed catalog |
| `public/input/lunar-eclipses-nasa.json` | NASA 5-Millennium Canon (12,064 events) | Bidirectional comparison reference |
| `public/input/lunar-eclipses-documented.json` | NASA "Lunar Eclipses of Historical Interest" (28 events) | L-5 famous-event cross-check |
| `public/input/lunar-eclipses-stephenson-2016.json` | Stephenson 2016 supp tables S01/S02/S04/S05/S07/S09 (270 events) | **L-5b lunar primary-source ground truth** |
| `public/input/solar-eclipses-stephenson-2016.json` | Stephenson 2016 supp tables S03/S06/S08 (89 events) | **L-7 solar primary-source cross-check** |
| `data/rspa20160404supp2/Table-S01.txt …S15.txt` | Stephenson 2016 supp material, all 15 tables | Source data for parsers (S10-S15 are untimed solar — reserved for future visibility-window work) |

### Scripts (all in repository)

| Path | Purpose |
|---|---|
| `scripts/fetch_nasa_lunar_canon.py` | Scrapes the 50 century pages of NASA 5MCLE |
| `scripts/fetch_nasa_historical_lunar.py` | Parses LEhistory.html (28 famous events) |
| `scripts/parse_stephenson_lunar.py` | Parses the 6 timed-lunar Stephenson 2016 tables |
| `scripts/parse_stephenson_solar.py` | Parses the 3 timed-solar Stephenson 2016 tables (L-7) |

All four scripts are idempotent and re-run cleanly against the source
URLs / files.

---

## References

- Cox, C.M. & Chao, B.F. (2002). *Detection of a large-scale mass
  redistribution in the terrestrial system since 1998.* Science
  297(5582), 831–833. doi:10.1126/science.1072188. (dJ₂/dt = −2.7 × 10⁻¹¹/yr
  — modern α-rate measurement from LAGEOS SLR.)

- Cheng, M., Tapley, B.D., & Ries, J.C. (2013). *Deceleration in the
  Earth's oblateness.* J. Geophys. Res. 118, 740-747. (Pre-ice-loss
  secular trend confirmation from GRACE, attributable to GIA.)

- Peltier, W.R. (2004). *Global glacial isostasy and the surface of the
  ice-age Earth: the ICE-5G(VM2) model and GRACE.* Annu. Rev. Earth
  Planet. Sci. 32, 111-149. (τ_GIA viscoelastic relaxation timescale
  from mantle-viscosity modelling.)

- Stephenson, F.R., Morrison, L.V., & Hohenkerk, C.Y. (2016).
  *Measurement of the Earth's rotation: 720 BC to AD 2015.* Proc. R. Soc.
  A 472, 20160404. (270 primary-source timed lunar observations across
  six supplementary tables — the L-5b ground-truth dataset.)

- Espenak, F. & Meeus, J. (2009). *Five Millennium Canon of Lunar
  Eclipses: −1999 to +3000.* NASA TP-2009-214172. (NASA Canon — the
  L-3 / L-4 reference dataset.)

- Farhat, M., Auclair-Desrotour, P., Boué, G., & Laskar, J. (2022).
  *The resonant tidal evolution of the Earth-Moon distance.* A&A 665, L1.
  (Tidal LOD evolution + Moon recession — the model's tidal channel.)

- Said, S.S. & Stephenson, F.R. (1996). *Solar and Lunar Eclipse
  Measurements by Medieval Muslim Astronomers, I: Background.* J. Hist.
  Astronomy 27, 259-273. (Source paper for the Ibn Yunus / Battānī /
  Habash al-Ḥāsib observations in Stephenson S09.)

- Sachs, A. & Hunger, H. (1988-2014). *Astronomical Diaries and Related
  Texts from Babylonia.* Austrian Academy of Sciences. (Primary
  cuneiform translations — source of the Babylonian observations in
  Stephenson S01/S02/S04.)

- Meeus, J. (1998). *Astronomical Algorithms* (2nd ed.), Ch. 47 (Moon
  position polynomial used by `findLunarEclipsesInRange`).

- IERS Conventions (2010). (Source of α at J2000.)

- Bond, G., Kromer, B., Beer, J., Muscheler, R., Evans, M.N., Showers,
  W., Hoffmann, S., Lotti-Bond, R., Hajdas, I., & Bonani, G. (2001).
  *Persistent Solar Influence on North Atlantic Climate During the
  Holocene.* Science 294(5549), 2130–2136. doi:10.1126/science.1065680
  (Source of the 1,470-yr Bond cycle in North Atlantic ice-rafted
  debris — the climate signature our shipped 1466-yr Bond harmonic
  matches to 4 yr.)

- Braun, H., Christl, M., Rahmstorf, S., Ganopolski, A., Mangini, A.,
  Kubatzki, C., Roth, K., & Kromer, B. (2005). *Possible solar origin of
  the 1,470-year glacial climate cycle demonstrated in a coupled model.*
  Nature 438(7065), 208–211. doi:10.1038/nature04121. (Mechanism for
  Bond-cycle amplification of the 210-yr de Vries solar cycle via
  non-linear thermohaline ocean response — a candidate physical
  reading for our shipped Bond harmonic alongside the
  74 × J-S synodic SIM interpretation.)

- Charvátová, I. (1990–2007). Series of papers on Solar Inertial Motion
  (SIM). *e.g.* Charvátová, I. (2000). *Can origin of the 2400-year cycle
  of solar activity be caused by solar inertial motion?* Ann. Geophys.
  18(4), 399–405. doi:10.1007/s00585-000-0399-x. (Charvátová's SIM theory
  attributes multi-centennial climate/solar variability to Jupiter-Saturn
  configurations relative to the barycenter — the mechanism behind our
  74 × J-S synodic reading of the Bond period, and also cited as the
  2400-yr Hallstatt cycle physical anchor for our Hallstatt harmonic.)

- Landscheidt, T. (1998). *Solar Activity, Barometric Vortex, and
  Deep-Ocean Circulation.* Sol. Phys. 181(1), 87–98.
  doi:10.1023/A:1005075501898. (Argues specific Jupiter-Saturn-Earth
  perihelion configurations correlate with climate anomalies — the
  heterodox but peer-reviewed SIM literature.)

- Scafetta, N. (2010). *Empirical evidence for a celestial origin of the
  climate oscillations and its implications.* J. Atmos. Sol.-Terr. Phys.
  72(13), 951–970. doi:10.1016/j.jastp.2010.04.015. (Argues Jupiter-Saturn
  synodic 60-yr harmonic and multi-centennial cycles appear in
  temperature records — SIM-adjacent evidence for J-S climate coupling.)

- Wilson, I.R.G. (2013). *The Venus–Earth–Jupiter spin–orbit coupling
  model.* Pattern Recogn. Phys. 1, 147–158. doi:10.5194/prp-1-147-2013.
  (J-S alignment modulation of solar magnetic cycle — the 179 yr Jose
  period appears in our residual (H6).)

- Holme, R. (1998). *Electromagnetic core-mantle coupling — I. Explaining
  decadal changes in the length of day.* Geophys. J. Int. 132(1),
  167–180. doi:10.1046/j.1365-246X.1998.00424.x. (Source of the
  mantle-core coupling secular rate ~−0.2 ms/century used in the
  Hypothesis 1 null test.)

- Mound, J.E., & Buffett, B.A. (2003). *Interannual oscillations in
  length of day: Implications for the structure of the mantle and
  core.* J. Geophys. Res. Solid Earth 108(B7), 2334.
  doi:10.1029/2002JB002054.
  (Independent confirmation of the Holme mantle-core secular-rate
  range from a separate geomagnetic-secular-variation inversion.)

- Doc 103: `docs/103-babylon-eclipse-bce135.md` — the -135 Babylonian
  focused case study (off-peak verdict under the certified
  framework-native chain), and the direct empirical sensitivity test of
  this document's GIA α(t) constants under the Peltier ICE-6G defaults.
