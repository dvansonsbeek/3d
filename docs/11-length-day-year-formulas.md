---
docVersion: 1.0
modelVersion: v23.0
coefficients: sha256:3cfb8d04a94ddc3a
status: current
---

# Year and Day Length Formulas

> **Status — the frozen era clock.** The Fourier-harmonic laws in this document are the **certified, IAU-anchored era device** (see `tools/fit/README.md` §"The frozen era clock"): their coefficients are frozen, their fitters archived, and re-fitting them against a one-source export is a cross-family error (measured: interior RMS blows up 0.23–0.37 min → 8.8–16 min). The **displayed and served of-date values** (tweakpane year rows, Framework Verification model lines, the report's Physics columns, the API) come from the **one-source movement family** — `createYearLengths` in `@essrt/physics` (equinox-rate tropical mean, the λ̇-channel sidereal, the cardinal-structure anomalistic, and their precession beats). The harmonic laws remain the internal kinematic family (the `o.*` chain, `lodKinematic`, the scene frame), the `?hybridSpin=0` opt-out display, and the era-certification record.

> **Scope.** This document describes the **modern-era / within-H Fourier-harmonic picture** — the means derived from `inputmeanlengthsolaryearindays = 365.2422` and the fitted timing anchor `H = 335,317 yr` (the frozen era clock's unit), with Fourier oscillations fitted across one full anchor interval. At deep-time / Phanerozoic / Hadean epochs the **mean values themselves shift** per the [Expanding Solar System Resonance Theory (Doc 99)](99-expanding-solar-system-resonance-theory.md): H(t) grows under Driver 1 (Earth-Moon tidal evolution → LOD grows) while the sidereal year in seconds shifts under Driver 2 (solar mass loss → Kepler `dT/T = −2 dM/M`). For deep-time work use the epoch-dependent helpers (`meanLodSecondsAtAge`, `meanSiderealYearSecondsAtAge`, `meanHAtAge`, `meanTropicalYearSecondsAtAge`) — see [Doc 20 §"ESSRT epoch dependence"](20-constants-reference.md#essrt-epoch-dependence--most-tabulated-values-are-j2000-anchored) for the J2000-constant → helper map.

## Architecture

All year and day lengths are derived from a single input constant plus Fourier harmonic corrections. The means are **derived**, not fitted — only the harmonic coefficients are empirical.

```
inputmeanlengthsolaryearindays = 365.2422
        │
        ▼
  ┌─────────────────────────────────────────────────────┐
  │ meanSolarYear = round(input × H/8) / (H/8)         │  Tropical year mean
  │ meanSiderealYear = meanSolarYear × H / (H − 13)    │  Sidereal year mean
  │ meanAnomalisticYear = meanSolarYear × H / (H − 16) │  Anomalistic year mean
  └─────────────────────────────────────────────────────┘
        │
        ├──► Tropical year (runtime):
        │    Mean of 4 cardinal point derivatives
        │    (CARDINAL_POINT_HARMONICS, 23 harmonics per
        │    type + ECC/JOINT/DERIVED term families)
        │    Measured at solstices (max/min dec) and
        │    equinoxes (dec=0 crossing)
        │
        ├──► Sidereal year: Fourier harmonics (6 terms)
        │    Y(t) = mean + Σ [sᵢ·sin(2πt/Tᵢ) + cᵢ·cos(2πt/Tᵢ)]
        │
        └──► Anomalistic year: Fourier harmonics (8 terms)
             where t = year − 2000 (plan 07 R10: the phase origin is J2000)
        │
        ▼  Derived quantities
  ┌─────────────────────────────────────────────────────┐
  │ dayLength = siderealYearSeconds / siderealYear(days)│
  │ solarYearSec = solarYear(days) × dayLength          │
  │ anomYearSec = anomYear(days) × dayLength            │
  │ siderealDay = solarYearSec / (solarYearSec/86400+1)│
  └─────────────────────────────────────────────────────┘
```

### Key Principle

The **sidereal year in SI seconds is derived** from the IAU sidereal year reference:

```
meansiderealyearlengthinSeconds = siderealYearJ2000 × 86400
```

where `siderealYearJ2000 = 365.25636301` days (from `astro-reference.json`). As orbital elements change over millennia, the sidereal year in *days* changes (via Fourier harmonics), which means the *day length* changes, which in turn affects how many seconds are in a tropical year.


## Mean Year Lengths (Inputs)

The three J2000 mean year lengths are the IAU inputs of `astro-reference.json` (plan 09). The retired era device derived them from the input mean solar year and its unit H — the tropical mean rounded onto 1/(H/8), the sidereal mean × H/(H − 13), the anomalistic × H/(H − 16), the device's calendar identities — and those readings sat 1.2 s (tropical), 0.1 s (sidereal) and 0.3 s (anomalistic) from the inputs:

| Year type | Input | Mean (days) |
|-----------|-------|-------------|
| Tropical | derived: the beat of the IAU sidereal year and p_A (`computeMeanTropicalYearJ2000Days`) | <!--v:meanSolarYearDaysFull-->365.242190469006<!--/v--> |
| Sidereal | `yearLengthRef.siderealYear` | <!--v:meanSiderealYearDaysFull-->365.256363004<!--/v--> |
| Anomalistic | derived: the law of date at 2000 (the sidereal year and the series' own apsidal rate; Simon 1994's mean element is a citation) | <!--v:anomalisticYearDaysFull-->365.259634985<!--/v--> |

The coin rotation paradox relates the three through the precession periods:
- In one axial precession cycle (T_p), there is exactly **1 fewer sidereal year than tropical years** — the precessing equinox "absorbs" one full orbit
- In one turn of the perihelion of date, there is exactly **1 fewer anomalistic year than tropical years** — the precessing perihelion "absorbs" one full orbit
- In one turn of the apsidal line against the stars, there is exactly **1 fewer anomalistic year than sidereal years**

The of-date laws (next section) are anchored on the sidereal input and the IAU general precession p_A, so the tropical year of date at 2000 reads the tropical input to 0.04 s — the inputs' own internal consistency, not a fit.


## Year Lengths of Date

The year lengths of date are the one-source family (`createYearLengths` in `@essrt/physics`; doc 110 chain 3): the sidereal year rides the solar-mass law composed with the banked N-body mean-longitude drift (the D6 channel), the tropical year is the sidereal year less the equinox's return on the general precession of date, the anomalistic year is the sidereal year on the chain's apsidal tangent. In days of the epoch each is divided by the kinematic day of date — the Layer-0 tidal mean length of day, exactly the SI day at J2000 (`siderealYearDaysOfDate`, `tropicalYearDaysOfDate`, `anomalisticYearDaysOfDate` in the browser and `tools/lib/deep-time.js`; `lengths.siderealYearDays` / `lengths.anomalisticYearDays` in the package).

The three year-length Fourier combs of the retired era device (TROPICAL/SIDEREAL/ANOMALISTIC_YEAR_HARMONICS — 12/6/8 terms on divisors of H, fitted to the 335,318-row full-period export, frozen since the D4 flip) are deleted at plan 09. Their record: a comb on the unit's divisors carries no secular drift (the tropical comb read +1.09 s at J2000 and flat where the physical year drifts −0.53 s/cy — the plan 06 R1 record, the reason the cardinal instants and the Sun's mean longitude had already moved to the one-source family), and the sidereal comb wrote the λ̇ ripple as a day-length ripple. The retired fitters are in git history (commit 16d7c87f); the window CSV (Step 6a2) remains the measurement export.

### Tropical Year

The tropical year is measured at the actual solstices and equinoxes (declination extrema and zero-crossings), NOT at RA crossings. The mean tropical year is the average of 4 cardinal point intervals: SS-to-SS, WS-to-WS, VE-to-VE, AE-to-AE — `computeSolarYearDaysFromCardinals(year)`, the intervals between successive APPARENT crossings of the one certified Sun (`createModel().cardinal.yearLengthDays`, whose mean longitude integrates the one-source tropical year; plan 06 R1 — the fitted cardinal-point harmonic formula, CARDINAL_POINT_* with 23 harmonics per type plus the ECC/JOINT/DERIVED families, left the runtime; doc 14 is its record). Kept for chart consistency in `charts/report` code paths that already display cardinal-point data.

### Sidereal Year

The sidereal year is measured by tracking the Sun's **world angle** (ICRF) at each cardinal point event, then computing:

```
siderealYear = JD_interval × 360 / (360 − dWA)
```

where `dWA` is the world-angle advancement over one tropical year interval (single-year step). For multi-year spans (stepYears > 1), use `step × 360 − dWA` in the denominator. The retired year-length fitter used the same estimator.

**Limits of that estimator (measured 2026-09).** Per cardinal type it is not the sidereal year: the world angle is read at the event, where the Sun's speed differs from the mean by up to 2e, so the missing arc `dWA` (≈50″) is traversed at the local speed — a ±50 s offset that drifts with the equation of centre as the perihelion moves against the equinox (VE-to-VE −54 → +35 s across −4000…+4000, SS-to-SS −6 → −52 → −32 s). The four cardinal types averaged cancel it through the third harmonic. Event to event it also carries the Sun's periodic terms — the 6.44″ lunar equation alone is ~150 s of event timing — so even a 200-year baseline resolves only ~1 s. The clean reading is the cumulative sidereal angle (one turn per event minus the world-angle advance), the four-cardinal mean, with the planetary completion removed per event (`sunLonDegAtJD − sunLonCompletedDegAtJD`), against TT: then a ±100-year window resolves milliseconds, and the scene reproduces the one-family sidereal, tropical and anomalistic years of date to a few ms at every epoch sampled (`tools/verify/scene-year-lengths.js`, the gate; `tools/explore/scene-sample-events.cjs` + `scene-sample-check.cjs`, the instruments).

Sidereal year variations are much smaller than tropical — the orbital period is nearly constant, with only tiny perturbations from planetary gravitational interactions (the D6 λ̇ channel: about −0.1 s per millennium, `earth/sidereal-year-channel.cjs`).

### Anomalistic Year

The anomalistic year is measured from perihelion-to-perihelion and aphelion-to-aphelion intervals, averaged. The published value of date is the secular mean-element construction on the chain's apsidal tangent (λ̇-corrected), the rate family the Precession Periods panel shows, inside the one-family window (±2 Myr); beyond it no anomalistic year of date is published — the apsidal line has no resolved period there.


## Derived Day and Year Quantities

Given the three year lengths from above, all other time quantities are derived. The derivation chain starts from the sidereal year in SI seconds:

```
siderealYearSeconds = siderealYearJ2000 × 86400
        │
        ▼  ÷ siderealYear(days, IAU)
  ┌──────────────────────────────────────────────────────────────┐
  │ LOD_mean = ω₀ = 86,400 s at J2000 — the SI day               │
  │  (plan 09: ONE J2000 day basis; the retired device's H/13    │
  │   identity read 86,399.999676 s and the year comb's measured │
  │   day 86,400.00011 s)                                        │
  │  ← the baseline of the sidereal↔tropical conversion chain    │
  │    and the calibrated ΔT stack                               │
  └──────────────────────────────────────────────────────────────┘
        │
        ▼  × year lengths in days
  ┌─────────────────────────────────────────────────────┐
  │ solarYearSec = solarYear(days) × LOD_mean           │
  │ anomYearSec  = anomYear(days) × LOD_mean            │
  └─────────────────────────────────────────────────────┘
        │
        ▼  Derived day types
  ┌─────────────────────────────────────────────────────┐
  │ siderealDay = solarYearSec / (solarYearSec/86400+1) │
  │ stellarDay  = siderealDay + precession·cos(ε)       │
  │   (cos ε projects the T_p ecliptic rate onto the    │
  │    equator — see § "Stellar−Sidereal Offset")       │
  └─────────────────────────────────────────────────────┘

Separately (physical/USNO branch — does NOT feed the derivation chain above):
  ┌──────────────────────────────────────────────────────────┐
  │ LOD_real = lod_kinematic × (1 + 1/(T_s₃·mSY))            │
  │            + Σ DT cycles + swing                         │
  │  ← closes on the joint fit's USNO target exactly at      │
  │    J2000 (joint optimum vs Espenak;                      │
  │    tools/fit/dt-corrections-fit.js --joint) — ONE J2000  │
  │    day basis since plan 09, the SI day ω₀ (doc 99 § "The │
  │    J2000 day basis")                                     │
  │    (used in Predictions panel LOD readout, pure-physics  │
  │     ΔT V-curve, physical display — see § "The ecliptic   │
  │     missing-motion LOD                                   │
  │     Correction")                                         │
  └──────────────────────────────────────────────────────────┘
```

### Day Types

**Solar day** — the time for the Sun to return to the same local meridian (noon to noon). The solar day varies throughout the year due to orbital eccentricity and obliquity (equation of time). The framework maintains **two mean-LOD values**:

- **LOD_mean** = ω₀, the SI day, <!--v:meanSolarDaySeconds-->86,400.000000<!--/v--> s at J2000 (plan 09: ONE J2000 day basis) — the baseline inside all sidereal↔tropical conversions and the calibrated ΔT correction stack; of date it is the Layer-0 tidal mean length of day (`o.lodKinematic`).
- **LOD_real** = lod_kinematic + lod_kinematic/(T_s₃ × mSY) + DT cycle sum = <!--v:lodRealPhysical-->86,400.001200<!--/v--> s at J2000 — Layer 4: adds the ecliptic missing-motion correction on the nodal period (~<!--v:h5LodCorrectionMs-->3.441<!--/v--> ms) + the Bond/Hallstatt/Jose5/Jose4 cyclic δLOD (Layer 3) + the Core-mantle swing. Closes on the USNO target <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s on the same basis (doc 99 § "The J2000 day basis"). Used in the user-facing physical LOD display.

Both fluctuate over millennia as the sidereal year in days changes. See § "The ecliptic missing-motion LOD Correction" below.

**The scene day basis.** The scene's measured year lengths — the tweakpane *days* rows, the window CSV — are counted in the SI day ω₀ (plan 09; the comb era counted them in a "measured mean solar day" derived from the Step-6c sidereal anchor, 86,400.00032 s, and five day bases coexisted). The `lodRealPhysical` basis-consistency gate ties the ΔT joint fit to the same basis. The day quantities that coexist and must not be conflated:

| basis | J2000 value | role |
|---|---|---|
| SI day — ω₀, LOD_mean | 86,400 s exactly | the JD axis, all IAU references, the kinematic day at J2000 (<!--v:meanSolarDaySeconds-->86,400.000000<!--/v--> s), the scene's day basis (<!--v:measuredMeanSolarDayJ2000Seconds-->86,400.000000<!--/v--> s) and `o.lodKinematic` at J2000 (<!--v:lodKinematicFourierJ2000Seconds-->86,400.000000<!--/v--> s; the key name is historical) — ONE basis |
| kinematic day of date | the Layer-0 tidal mean length of day | the year-length denominators of date; ≡ ω₀ at J2000 |
| LOD_real (physical observable) | <!--v:lodRealPhysical-->86,400.001200<!--/v--> s | Layer-4 display (adds the ecliptic term + ΔT cycles + swing) |

The three J2000 year lengths are inputs on the same day (the IAU values on the 86,400-s day), so no per-type closing day exists any more: the comb era's "one day basis cannot close all three year types" residuals were the device's own year means against IAU, retired with the device.

**Sidereal day** — the time for Earth to rotate 360° relative to the vernal equinox. Shorter than the solar day because Earth's orbital motion means the Sun drifts ~1°/day eastward, requiring extra rotation to reach the next noon. Formula:

```
siderealDay = solarYearSec / (solarYearSec / 86400 + 1)
```

**Stellar day** — the time for Earth to rotate 360° relative to fixed stars (ICRF). Slightly *longer* than the sidereal day because the vernal equinox precesses westward, so Earth needs less rotation to "catch" the moving equinox than to return to the same fixed star. The precession correction adds ~8.37 ms to the sidereal day.

The rate that matters here is precession in **right ascension** (along the equator, m ≈ 4612″/cy), not precession in **longitude** (along the ecliptic, p ≈ 5029″/cy — the axial precession, one turn per T_p(t), the composed lunisolar period whose J2000 anchor is <!--v:axialPrecRound-->~25,772<!--/v--> yr). The two are related by m = p·cos ε, so the precession rate carries `STELLAR_DAY_RA_PROJECTION = cos ε`. Without it the offset comes out ~9.12 ms, overshooting the IAU value of 8.373 ms by 1/cos ε. See § "Stellar−Sidereal Offset" below.

### J2000 Day-Length Values

| Quantity | Model value | Reference |
|----------|-------------|-----------|
| Mean solar day — **LOD_mean** (the SI day ω₀, plan 09) | <!--v:meanSolarDaySeconds-->86,400.000000<!--/v--> s | the SI day (input) |
| Mean solar day — **LOD_real** (Layer 4: + the ecliptic term + DT cycles + swing, physical) | <!--v:lodRealPhysical-->86,400.001200<!--/v--> s | USNO joint-optimum target <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s (the same day basis) |
| Sidereal day — on LOD_real of J2000 (the simulator readout) | <!--v:siderealDayJ2000Physical-->86,164.091730<!--/v--> s | <!--v:siderealDayInputSeconds-->86,164.090531<!--/v--> s (IAU, on the 86,400-s day — the two differ by the day's excess, <!--v:lodRealJ2000ExcessMs-->1.20<!--/v--> ms) |
| Stellar day — on LOD_real of J2000 | <!--v:stellarDayJ2000Physical-->86,164.100105<!--/v--> s | <!--v:stellarDayInputSeconds-->86,164.098904<!--/v--> s (IAU 2000A, on the 86,400-s day) |

See § "The ecliptic missing-motion LOD Correction" below for the distinction between the two mean solar day values.

### The ecliptic missing-motion LOD Correction (Kinematic vs Physical)

The framework maintains two distinct LOD values that differ by a small correction on the nodal period of Earth's orbit plane (formerly written on the anchor's H/5 — plan 06 T2 item, see below):

**LOD_mean** — the kinematic baseline, the SI day (plan 09; the retired era
device anchored it on its H/13 identity, siderealYearSeconds / (mSY × H/(H−13))
= 86,399.99968 s):
```
LOD_mean = ω₀ = 86,400 s at J2000 (yearLengthRef.solarDay)
```

**LOD_real** (Layer 4) — the physical LOD, three-part construction:
```
LOD_real = o.lodKinematic + h5Correction(year) + dtCycleLodCorrectionSum(year)

where:
  o.lodKinematic     = the Layer-0 tidal mean LOD of date = ω₀ = 86,400 s at J2000
  h5Correction(year) = LOD_mean / (T_s₃ × mSY)        ≈ <!--v:h5LodCorrectionMs-->3.441<!--/v--> ms
                       (T_s₃ = the nodal period 1,296,000/|s₃| = <!--v:eclPrecYears-->~68,751<!--/v--> yr;
                        the identifier keeps its historical H/5 name)
  dtCycleLodCorrectionSum = Bond/Hallstatt/Jose5/Jose4 cyclic δLOD + Core-mantle
                            swing (≈ −1.85 ms at J2000)
```

The correction represents Earth's need to rotate slightly MORE per solar day to catch the Sun on the meridian, because the Sun's apparent motion follows the ecliptic — whose plane turns on the invariable plane once per nodal period T_s₃ (the dominant nodal mode s₃ of Earth's orbit from the model's own N-body secular modes, <!--v:eclPrecYears-->~68,751<!--/v--> yr). Over one solar day (= 1/mSY of one year), the ecliptic advances by 1/(T_s₃·mSY) revolutions — requiring that many extra revolutions of Earth rotation:

```
δ_rev = 1 / (T_s₃ × mSY)                                 ≈ 3.98 × 10⁻⁸ rev/day
δ_LOD = LOD_mean × δ_rev = LOD_mean / (T_s₃ × mSY)       ≈ <!--v:h5LodCorrectionMs-->3.441<!--/v--> ms per solar day
```

**Why the nodal period (not the apsidal one, and not the anchor's H/5):** the correction's reference frame must be the Sun's apparent motion, which follows the ecliptic; the ecliptic's turn on the invariable plane is the nodal mode s₃ — an ORBITAL quantity, constant at every epoch (μ-tier). The apsidal precession is a fixed-frame (ICRF) construction, not the ecliptic-of-date reference used for the solar-day counting. Until the plan 06 T2 restatement the divisor was the anchor's H(t)/5 (67,063 yr at J2000, 2.5 % short of the nodal period) and it scaled with Earth's SPIN at deep time — the wrong tier for an orbital reference. Measured on the change (plan 06 record): the term moved 3.527 → 3.441 ms, the joint ΔT-stack re-closed at USNO 86400.0021 (measured-day basis; the display-basis LOD_real moved from 86400.001580 to 86400.001693 s, toward the observed 86400.0017), the eclipse record stayed flat (lunar mean residual 1213 → 1211 s, events beating NASA 119 → 121; solar 665 → 669 s), while the closeness to the Espenak/Stephenson polynomials — theory references, not observations — loosened (Espenak-window RMS 11.9 → 13.4 s, full window 21.0 → 27.0 s).

**Where each is used:**

| LOD used | Purpose | Code path |
|----------|---------|-----------|
| **LOD_mean** | sidereal↔tropical conversions (day-count identity), calibrated ΔT correction integrand (Bond/Hallstatt/Jose4/5 stack expects this baseline), Meeus JD_UT → JD_TT, eclipse code, live accumulator | `meanDeltaTSecondsAtAge`, `updateDeltaT` |
| **LOD_real** (Layer 4) | User-facing "physical" LOD display, pure-physics ΔT V-curve | `pureH5DeltaTAtAge`, Predictions panel LOD binding |

**Why no other explicit corrections appear:** the axial precession is ALREADY implicit in the tropical year itself — the tropical year is the sidereal year less the equinox's return, 1/T_p of a turn, so over one T_p the sidereal frame counts one year fewer. Adding an explicit precession correction to the day count would double-count. The obliquity cycle is oscillatory (mean zero). The perihelion's motion contributes to the anomalistic year, not to the tropical-day counting relative to the Sun. Only the ecliptic's own turn (the nodal mode s₃) gives the correct reference for the Sun's apparent motion.


## Precession Periods (Coin Rotation Paradox)

All precession periods emerge from ratios of year lengths:

| Precession | Formula | Mean period |
|------------|---------|-------------|
| Axial | `Y_sid / (Y_sid − Y_trop)` | T_p = <!--v:earthAxialPeriod-->25,772<!--/v--> yr |
| Perihelion | `Y_anom(s) / (Y_anom(s) − Y_trop(s))` | H/16 ≈ <!--v:earthPeriPeriod-->20,938<!--/v--> yr |
| Inclination | `Y_anom(s) / (Y_anom(s) − Y_sid(s))` | H/3 ≈ <!--v:earthPeriPeriodICRF-->111,635<!--/v--> yr |
| Obliquity | the beat of the spin axis's inertial precession against the nodal mode: 1/(1/T_ψ̇ᵢₙ − 1/T_s₃) with T_ψ̇ᵢₙ = <!--v:spinAxisInertialPeriodYearsJ2000-->25,722<!--/v--> yr (the pole's period, 0.097 ″/yr above the equinox clock T_p — IAU's planetary precession; the retired label H/8 read <!--v:hDiv8-->41,915<!--/v--> yr). A record sees the window mean of the pole rate, not the J2000 instant: <!--v:obliqCycleRealizedLr04Years-->~40,928<!--/v--> yr over the LR04 record | <!--v:obliqCycleYears-->~41,099<!--/v--> yr at J2000 |
| Ecliptic (nodal) | the N-body chain's dominant nodal mode s₃: 1,296,000/\|s₃\| (the retired label H/5 read <!--v:hDiv5-->67,063<!--/v--> yr) | <!--v:eclPrecYears-->~68,751<!--/v--> yr |

These are time-varying — each uses the instantaneous year lengths at the given epoch, so precession periods themselves oscillate slightly.

The coin rotation paradox manifests at every timescale:

| Timescale | Precession | Cycle absorbed | Offset per cycle |
|-----------|------------|---------------|-----------------|
| Years | Axial (T_p) | 1 fewer sidereal year than tropical years | ~20 min/year |
| Years | Perihelion (one turn of the perihelion of date) | 1 fewer anomalistic year than tropical years | ~15 min/year |
| Days | Orbital (1 year) | 1 fewer solar day than sidereal days | ~3m 56s/day |
| Days | Axial (T_p) | 1 fewer sidereal day than stellar days | ~9.1 ms/day |


## J2000 Reference Values

| Quantity | Model value | Reference |
|----------|-------------|-----------|
| Tropical year | 365.242190 days | 365.242190 days (IAU) |
| Sidereal year | 365.256363 days | 365.256363 days (IAU) |
| Anomalistic year | 365.259633 days | <!--v:anomalisticYearSimon1994Days-->365.259636<!--/v--> days (Simon 1994 mean element; the model's law of date at 2000: <!--v:anomalisticYearJ2000Days-->365.2596350<!--/v-->) |
| LOD_mean (kinematic, the SI day ω₀) | <!--v:meanSolarDaySeconds-->86,400.000000<!--/v--> s | — |
| LOD_real (Layer 4: physical, + the ecliptic term + DT cycles + swing) | <!--v:lodRealPhysical-->86,400.001200<!--/v--> s | USNO joint-optimum target <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s (fit's measured-day basis) |
| Sidereal day — on LOD_real of J2000 (the simulator readout) | <!--v:siderealDayJ2000Physical-->86,164.091730<!--/v--> s | <!--v:siderealDayInputSeconds-->86,164.090531<!--/v--> s (IAU, on the 86,400-s day — the two differ by the day's excess, <!--v:lodRealJ2000ExcessMs-->1.20<!--/v--> ms) |
| Stellar day — on LOD_real of J2000 | <!--v:stellarDayJ2000Physical-->86,164.100105<!--/v--> s | <!--v:stellarDayInputSeconds-->86,164.098904<!--/v--> s (IAU 2000A, on the 86,400-s day) |
| Axial precession | <!--v:axialPrecJ2000-->25,772<!--/v--> yr | <!--v:axialPrecJ2000-->25,772<!--/v--> yr (instantaneous J2000 rate) |


## Physical Insights

### Why Each Harmonic Dominates Its Year Type

| Year type | Dominant harmonic | Physical reason |
|-----------|-------------------|-----------------|
| Tropical | H/8 (obliquity) | Measures solstice/equinox-to-same — steeper ecliptic angle (higher obliquity) means faster equator crossing → shorter tropical year |
| Sidereal | H/8 + H/3 (tiny) | Measures full orbit — nearly constant, with only tiny perturbations from planetary gravitational interactions |
| Anomalistic | H/18 (with H/19, H/17, H/24 close behind) | Measures perihelion-to-perihelion — sensitive to the interplay between inclination and obliquity cycles |

### Cardinal Point Tropical Year Variation (J2000)

The tropical year length depends on *which* cardinal point is used to measure it. At J2000 (perihelion in early January):

| Cardinal point | Year length | Relative to mean | Reason |
|----------------|-------------|-------------------|--------|
| Summer Solstice | 365.241617 days | −51 s (shortest) | Aphelion nearby → fast orbital speed |
| Vernal Equinox | 365.242336 days | +12 s | Transition |
| Autumnal Equinox | 365.242056 days | −13 s | Transition |
| Winter Solstice | 365.242749 days | +47 s (longest) | Perihelion nearby → slow orbital speed |

This pattern reverses when perihelion precesses to July. The *mean* of all four cardinal points cancels this effect and gives the true mean tropical year.

### Self-Consistency of the Derivation Chain

The formulas are self-consistent by construction. The identity

```
siderealYear(seconds) = siderealYear(days) × dayLength
                      = siderealYear(days) × (siderealYearSeconds / siderealYear(days))
                      = siderealYearSeconds  ✓
```

holds at every epoch — it is algebraically tautological. **Within the modern era** the sidereal year in SI seconds is treated as the calibration anchor (`siderealYearJ2000 × 86400`); the within-H Fourier harmonics describe oscillations of the day-count quantities around their means with the anchor held fixed.

**At deep time**, both terms on the right-hand side scale: Driver 1 (Earth-Moon tidal evolution) changes `dayLength`; Driver 2 (solar mass loss) changes the sidereal year in seconds via Kepler's 3rd law (`dT/T = −2 dM/M`). The identity is preserved at every epoch, but neither factor is constant. See [Doc 99 — ESSRT](99-expanding-solar-system-resonance-theory.md) for the two-driver derivation and [Doc 20 §"ESSRT epoch dependence"](20-constants-reference.md#essrt-epoch-dependence--most-tabulated-values-are-j2000-anchored) for the epoch-dependent helpers (`meanSiderealYearSecondsAtAge`, `meanLodSecondsAtAge`).

### Stellar−Sidereal Offset, and the Axial Coin Rotation

These are **two different quantities** that happen to share a formula. Before the equator projection was applied they read the same number, which is why earlier revisions of this document treated them as one.

**Axial coin rotation — <!--v:axialCoinRotationMs-->9.13<!--/v--> ms, on the ecliptic.** Axial precession accumulates exactly one extra sidereal day per precession period T_p (<!--v:axialPrecExact-->25,771.58<!--/v--> yr at J2000, 1,296,000/p_A on the IAU 2006 general precession input):

```
axialCoinRotationMs × 366.24 sidereal days/year × T_p years = 1.0000 sidereal days
```

This is a count on the ecliptic and is deliberately **not** projected. `axialCoinRotationMs` uses the unprojected rate. Substituting 8.37 ms into the identity gives 0.917 days, not 1.000.

**Stellar−sidereal day offset — 8.37 ms, on the equator.** The physical difference between the two day lengths depends on how fast the equinox moves *along the equator* (precession in right ascension, m), not along the ecliptic (precession in longitude, p — one turn per T_p(t), the composed precession period, <!--v:axialPrecRound-->~25,772<!--/v--> yr at J2000). Since m = p·cos ε, the stellar day carries `STELLAR_DAY_RA_PROJECTION = cos ε`:

```
stellarDay = siderealDay × (1 + cos(ε) / (T_p(t) × rotationsPerYear))
           → 8.37 ms above the sidereal day, vs the IAU value of 8.373 ms
```

T_p is the physical period in both identities, not the frozen clock's counter (the anchor interval's thirteenth, 0.086 % longer): on the counter the offset read 7 µs low and the coin rotation 8 µs low, and the counting identity closed only against the counter's own period.

**This was confirmed by measurement, not asserted.** The "Analyze Stellar Day" tool's Method D tracks Earth's rotation about its own spin axis against ICRF — using no precession period at all, since the spin axis precesses on the precession cone and the projection plane tilts with it — and reproduces the IAU stellar day to ~0.02 ms. Methods A and B, which reference the ecliptic normal instead of the spin axis, overshoot by ~0.79 and ~0.47 ms respectively; that ~23.44° of axis difference *is* the cos ε.

The obliquity used follows the family of the sidereal day it is applied to: the IAU J2000 obliquity input for the mean values, the hybrid obliquity of date (`_sceneEpsTargetDeg(year)`) for epoch-specific ones. At J2000 the choice is worth 0.0008 ms, but across the deep-time obliquity range (~22.0°–24.5°) the offset runs 8.46 → 8.30 ms.


### The retired RA day offset (plan 09 step 5b)

The model used to publish a "measured solar day" = the mean solar day plus an
"RA day offset" — a fitted comb (`RA_DAY_OFFSET_MS`: mean −14.194 ms/day and
two lines on the retired unit's H/16 and H/8), reproducing the Framework
Verification instrument's 65-epoch measurement (R² 0.994, RMS 0.32 ms). It is
deleted, because the quantity is a property of the instrument's window, not of
the sky. The instrument counts 365 solar noons from the June solstice; 365 days
end 0.2422 d short of the tropical year, so the equation of time has not
returned to its start value and the mean noon-to-noon interval differs from the
mean solar day by −(0.2422/365)·dEoT/dt at the solstice. The first-order
equation of time, −2e·sin M + tan²(ε/2)·sin 2λ, gives at the solstice (λ = 90°,
M = 90° − ϖ) exactly the comb's two lines: the e·cos(90° − ϖ) term on the
perihelion-of-date cycle (5.2 ms first-order against the fitted 5.6) and the
tan²(ε/2) term on the obliquity cycle (1.4 against 1.7), with the mean of the
same order (first-order 18.6 ms against the fitted 14.2; the exact value depends
on the window's first-noon convention). The physical day of date is the mean
solar day (`dayLengthSeconds`); the equation of time is the certified Sun's; an
observer who counts noons over an integer-day window measures this term and can
derive it from both.

## Implementation

### JavaScript (`script.js`)

The tropical year of date in days of the epoch is the published SI law over the kinematic day of date (plan 09; the frozen-clock comb `computeSolarYearDaysDirect` is deleted):

```javascript
function tropicalYearDaysOfDate(year) {
  const s = _hybridSpinActive() && Math.abs(year - 2000) <= 2000000
    ? _yearLengthsM().tropicalYearSecondsAtYear(year)          // the one-source family
    : meanTropicalYearSecondsAtAge((J2000_CALENDAR_YEAR - year) / 1e6);   // the tidal-chain mean before the series lands
  return s / _lodKinematicSecondsOfDate(year);                 // the Layer-0 tidal mean day, ω₀ at J2000
}
```

A secondary derivation via the cardinal-point intervals is kept for chart consistency:

```javascript
function computeSolarYearDaysFromCardinals(currentYear) {
  return (computeSolsticeYearLength(currentYear, 'SS') +
          computeSolsticeYearLength(currentYear, 'WS') +
          computeSolsticeYearLength(currentYear, 'VE') +
          computeSolsticeYearLength(currentYear, 'AE')) / 4;
}
```

The sidereal and anomalistic years take the same form (`siderealYearDaysOfDate`, `anomalisticYearDaysOfDate` — the latter NaN beyond the one-family window, where no anomalistic year of date is published).

### Source Files

| File | Role |
|------|------|
| `src/script.js` | Runtime formulas |
| `tools/lib/constants.js` | Pipeline constants (reads from JSON) |
| `public/input/fitted-coefficients.json` | Fitted coefficients (the ΔT stack, the Sun's harmonic completion — the year combs are gone) |
| `public/input/astro-reference.json` | IAU reference values — the J2000 year lengths, the SI day, the general precession |


## Updating Coefficients

The year lengths carry no fitted coefficients since plan 09: the J2000 values are the IAU inputs (`astro-reference.json`), the of-date laws are the one-source family on the banked N-body series. The retired year-length fitters (git history commit 16d7c87f; README §"The frozen era clock") are not to be re-run — a comb re-fit against a one-source export was measured as a cross-family error (the C-4b adjudication). The exporter (`export-solar-measurements.js`) remains the measurement export over the −4000…+4000 window (Step 6a2); the full-period file (one row per year of the retired unit, the frozen fits' basis) is retired — the kept artifact is the window CSV, `data/02-solar-measurements-window.csv`.

## Related

- **Solar Day Report** (browser: Reports > Solar Day) — measures 365 noon-to-noon intervals from 6 starting points, visualizes the analemma and equation-of-time bias by starting angle
