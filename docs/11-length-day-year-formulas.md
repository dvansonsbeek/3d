---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:78f99d98186e50d9
status: current
---

# Year and Day Length Formulas

> **Status — the frozen era clock.** The Fourier-harmonic laws in this document are the **certified, IAU-anchored era device** (see `tools/fit/README.md` §"The frozen era clock"): their coefficients are frozen, their fitters archived, and re-fitting them against a one-source export is a cross-family error (measured: interior RMS blows up 0.23–0.37 min → 8.8–16 min). The **displayed and served of-date values** (tweakpane year rows, Formula Verification model lines, the report's Physics columns, the API) come from the **one-source movement family** — `createYearLengths` in `@essrt/physics` (equinox-rate tropical mean, the λ̇-channel sidereal, the cardinal-structure anomalistic, and their precession beats). The harmonic laws remain the internal kinematic family (the `o.*` chain, `lodKinematic`, the scene frame), the `?hybridSpin=0` opt-out display, and the era-certification record.

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
             where t = year − balancedYear
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


## Mean Year Lengths (Derived)

All three mean year lengths derive from `inputmeanlengthsolaryearindays` and the fitted timing anchor `H = 335,317` (the frozen era clock's unit — device identities, plan 06 D8):

| Year type | Formula | Mean (days) |
|-----------|---------|-------------|
| Tropical | `round(input × H/8) / (H/8)` | <!--v:meanSolarYearDaysFull-->365.242203646102<!--/v--> |
| Sidereal | `tropical × H / (H − 13)` | <!--v:meanSiderealYearDaysFull-->365.256364374<!--/v--> |
| Anomalistic | `tropical × H / (H − 16)` | <!--v:anomalisticYearDaysFull-->365.259632390<!--/v--> |

Note: The tropical year mean is quantized at H/8 resolution (the obliquity cycle). The sidereal and anomalistic means follow algebraically.

The ratios `H/(H−13)` and `H/(H−16)` come from the coin rotation paradox:
- In one axial precession cycle (H/13), there is exactly **1 fewer sidereal year than tropical years** — the precessing equinox "absorbs" one full orbit
- In one perihelion precession cycle (H/16), there is exactly **1 fewer anomalistic year than tropical years** — the precessing perihelion "absorbs" one full orbit
- In one apsidal precession cycle (H/3), there is exactly **1 fewer anomalistic year than sidereal years**


## Fourier Harmonic Variations

Year-length variations are modelled as Fourier series around the derived means. Coefficients were fitted from measured data points spanning the full H cycle (1-year steps, 335,318 rows). The reference time is `t = year − balancedYear`.

### Tropical Year

The tropical year is measured at the actual solstices and equinoxes (declination extrema and zero-crossings), NOT at RA crossings. The mean tropical year is the average of 4 cardinal point intervals: SS-to-SS, WS-to-WS, VE-to-VE, AE-to-AE.

Two paths compute the tropical year:

- `computeSolarYearDaysDirect(year)` — Step 6c direct year-length Fourier fit (TROPICAL_YEAR_HARMONICS, 12 terms). J2000-anchored to the CSV year-2000 measurement (365.24219037 at J2000). **Frozen era device**: since the one-source consolidation it serves the internal kinematic chain and the `?hybridSpin=0` opt-out display; the Predictions panel row and the tropical-year chart read the one-source family (`createYearLengths`).
- `computeSolarYearDaysFromCardinals(year)` — analytical derivative of the cardinal-point harmonic formula (CARDINAL_POINT_HARMONICS, 23 harmonics per type plus the ECC/JOINT/DERIVED term families, averaged over all 4 CPs). Kept for chart consistency in `charts/report` code paths that already display cardinal-point data.

Both paths converge at year 2000 within ~2 μd (the Step 6c year-length fit vs the Step 6d cardinal-point derivative at their shared J2000 anchor).

### Sidereal Year (6 harmonics)

```
Y_sid(t) = meanSiderealYear + Σ harmonics
```

The sidereal year is measured by tracking the Sun's **world angle** (ICRF) at each cardinal point event, then computing:

```
siderealYear = JD_interval × 360 / (360 − dWA)
```

where `dWA` is the world-angle advancement over one tropical year interval (single-year step). For multi-year spans (stepYears > 1), use `step × 360 − dWA` in the denominator. This is the same formula used by `year-length-harmonics.js`.

Sidereal year variations are much smaller than tropical — the orbital period is nearly constant, with only tiny perturbations from planetary gravitational interactions.

### Anomalistic Year (8 harmonics)

```
Y_anom(t) = meanAnomalisticYear + Σ harmonics
```

The anomalistic year is measured from perihelion-to-perihelion and aphelion-to-aphelion intervals, averaged. The dominant term is H/18 (0.060 s), followed by H/19 and H/17; the H/24 beat frequency between the inclination (H/3) and obliquity (H/8) cycles is the fourth-largest (0.020 s).


## Derived Day and Year Quantities

Given the three year lengths from above, all other time quantities are derived. The derivation chain starts from the sidereal year in SI seconds:

```
siderealYearSeconds = siderealYearJ2000 × 86400
        │
        ▼  ÷ siderealYear(days_kinematic) via H/13 identity
  ┌──────────────────────────────────────────────────────────────┐
  │ LOD_mean = siderealYearSeconds / siderealYear(days_kinematic)│
  │          = 86399.999676 s at J2000                           │
  │  ← the KINEMATIC baseline used throughout the sidereal↔      │
  │    tropical conversion chain and the calibrated ΔT stack     │
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
  │          = 86400.001380 s at J2000 (display basis)       │
  │  ← closes on the USNO target 86,400.0017 in the fit's    │
  │    measured-day basis (joint optimum vs Espenak;         │
  │    tools/fit/dt-corrections-fit.js --joint; the 0.32 ms  │
  │    spread is the measured-vs-Fourier sidereal-days       │
  │    difference at 2000 — doc 99 § "The two J2000 day      │
  │    bases")                                               │
  │    (used in Predictions panel LOD readout, pure-physics  │
  │     ΔT V-curve, physical display — see § "The ecliptic   │
  │     missing-motion LOD                                   │
  │     Correction")                                         │
  └──────────────────────────────────────────────────────────┘
```

### Day Types

**Solar day** — the time for the Sun to return to the same local meridian (noon to noon). The solar day varies throughout the year due to orbital eccentricity and obliquity (equation of time). The framework maintains **two mean-LOD values**:

- **LOD_mean** = `siderealYearSeconds / siderealYear(days_kinematic)` ≈ <!--v:meanSolarDaySeconds-->86,399.999676<!--/v--> s at J2000 — the kinematic baseline used inside all sidereal↔tropical conversions and the calibrated ΔT correction stack.
- **LOD_real** = lod_kinematic + lod_kinematic/(T_s₃ × mSY) + DT cycle sum = <!--v:lodRealPhysical-->86,400.001780<!--/v--> s at J2000 — Layer 4: adds the ecliptic missing-motion correction on the nodal period (~<!--v:h5LodCorrectionMs-->3.441<!--/v--> ms) + the Bond/Hallstatt/Jose5/Jose4 cyclic δLOD (Layer 3) + the Core-mantle swing. Closes on the USNO target <!--v:usnoLodJ2000-->86,400.0021<!--/v--> s in the fit's measured-day basis (doc 99 § "The two J2000 day bases"). Used in the user-facing physical LOD display. NOTE the baseline is `o.lodKinematic` (Fourier-direct), NOT LOD_mean — the two differ by the day-basis spread (<!--v:dayBasisSpreadMs-->0.32<!--/v--> ms at J2000; see the declared scene day basis below).

Both fluctuate over millennia as the sidereal year in days changes. See § "The ecliptic missing-motion LOD Correction" below.

**The declared scene day basis.** The scene's measured year lengths — the Step-6c/6d fits, the tweakpane *days* rows — are counted in the **measured mean solar day**, sidereal-pinned at J2000:

`measuredDay = siderealYearSeconds(IAU) / siderealYearDays(6c anchor)` = <!--v:measuredMeanSolarDayJ2000Seconds-->86,400.000427<!--/v--> s

It is derived in place from the 6c anchor (no stored copy — it cannot detach from the fit) and the `lodRealPhysical` basis-consistency gate ties the same family to the ΔT joint fit. Five day quantities coexist and must not be conflated:

| basis | J2000 value | role |
|---|---|---|
| SI day | 86,400 s exactly | the JD axis and all IAU references |
| LOD_mean (H/13 identity) | <!--v:meanSolarDaySeconds-->86,399.999676<!--/v--> s | kinematic baseline (kinematic sidereal days) |
| Fourier-kinematic day (`o.lodKinematic`) | <!--v:lodKinematicFourierJ2000Seconds-->86,400.000107<!--/v--> s | the panel *seconds* column — pins the sidereal year to IAU seconds by construction |
| **measured mean solar day — the DECLARED scene basis** | <!--v:measuredMeanSolarDayJ2000Seconds-->86,400.000427<!--/v--> s | the day the scene's measured year lengths are counted in |
| LOD_real (physical observable) | <!--v:lodRealPhysical-->86,400.001780<!--/v--> s | Layer-4 display (adds the ecliptic term + ΔT cycles + swing) |

One day basis cannot close all three year types: pinning sidereal leaves tropical <!--v:yearResidualTropicalSecPerYr-->+0.027<!--/v--> s/yr and anomalistic <!--v:yearResidualAnomalisticSecPerYr-->+0.065<!--/v--> s/yr against IAU (per-type closing days <!--v:closingDayTropicalSeconds-->86,400.000353<!--/v--> / <!--v:closingDaySiderealSeconds-->86,400.000427<!--/v--> / <!--v:closingDayAnomalisticSeconds-->86,400.000250<!--/v--> s) — recorded model-vs-IAU structure, not a unit artifact.

**Sidereal day** — the time for Earth to rotate 360° relative to the vernal equinox. Shorter than the solar day because Earth's orbital motion means the Sun drifts ~1°/day eastward, requiring extra rotation to reach the next noon. Formula:

```
siderealDay = solarYearSec / (solarYearSec / 86400 + 1)
```

**Stellar day** — the time for Earth to rotate 360° relative to fixed stars (ICRF). Slightly *longer* than the sidereal day because the vernal equinox precesses westward, so Earth needs less rotation to "catch" the moving equinox than to return to the same fixed star. The precession correction adds ~8.37 ms to the sidereal day.

The rate that matters here is precession in **right ascension** (along the equator, m ≈ 4612″/cy), not precession in **longitude** (along the ecliptic, p ≈ 5029″/cy — the axial precession, one turn per T_p(t), the composed lunisolar period whose J2000 anchor is <!--v:axialPrecRound-->~25,771<!--/v--> yr). The two are related by m = p·cos ε, so the precession rate carries `STELLAR_DAY_RA_PROJECTION = cos ε`. Without it the offset comes out ~9.12 ms, overshooting the IAU value of 8.373 ms by 1/cos ε. See § "Stellar−Sidereal Offset" below.

### J2000 Day-Length Values

| Quantity | Model value | Reference |
|----------|-------------|-----------|
| Mean solar day — **LOD_mean** (H/13 identity) | <!--v:meanSolarDaySeconds-->86,399.999676<!--/v--> s | — (kinematic) |
| Mean solar day — **LOD_real** (Layer 4: + the ecliptic term + DT cycles + swing, physical) | <!--v:lodRealPhysical-->86,400.001780<!--/v--> s | USNO joint-optimum target <!--v:usnoLodJ2000-->86,400.0021<!--/v--> s (fit's measured-day basis — the declared scene day; <!--v:dayBasisSpreadMs-->0.32<!--/v--> ms basis spread) |
| Sidereal day | 86164.091 s | 86164.091 s (IAU) |
| Stellar day | 86164.099 s | 86164.099 s (IAU) |

See § "The ecliptic missing-motion LOD Correction" below for the distinction between the two mean solar day values.

### The ecliptic missing-motion LOD Correction (Kinematic vs Physical)

The framework maintains two distinct LOD values that differ by a small correction on the nodal period of Earth's orbit plane (formerly written on the anchor's H/5 — plan 06 T2 item, see below):

**LOD_mean** — the kinematic baseline from the H/13 identity:
```
LOD_mean = siderealYearSeconds / (mSY × H/(H−13))
         = 86399.999676 s at J2000
```

**LOD_real** (Layer 4) — the physical LOD, three-part construction:
```
LOD_real = o.lodKinematic + h5Correction(year) + dtCycleLodCorrectionSum(year)

where:
  o.lodKinematic     = IAU_sid_sec / Fourier_sid_days ≈ 86399.999995 s at J2000
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

**Why no other explicit corrections appear:** the axial precession is ALREADY implicit in LOD_mean via the device's `H/(H−13)` calendar denominator (over H tropical years the sidereal frame counts H−13 years — the missing 13 IS the axial precession). Adding an explicit H/13 correction would double-count. H/8 obliquity is oscillatory (mean zero). H/16 perihelion motion contributes to the anomalistic year, not to the tropical-day counting relative to the Sun. Only H/5 (ecliptic precession) gives the correct reference for the Sun's apparent motion.


## Precession Periods (Coin Rotation Paradox)

All precession periods emerge from ratios of year lengths:

| Precession | Formula | Mean period |
|------------|---------|-------------|
| Axial | `Y_sid / (Y_sid − Y_trop)` | T_p = <!--v:earthAxialPeriod-->25,771<!--/v--> yr |
| Perihelion | `Y_anom(s) / (Y_anom(s) − Y_trop(s))` | H/16 ≈ <!--v:earthPeriPeriod-->20,936<!--/v--> yr |
| Inclination | `Y_anom(s) / (Y_anom(s) − Y_sid(s))` | H/3 ≈ <!--v:earthPeriPeriodICRF-->111,570<!--/v--> yr |
| Obliquity | the beat of the clock against the nodal mode: 1/(1/T_p − 1/T_s₃) (the retired label H/8 read <!--v:hDiv8-->41,915<!--/v--> yr) | <!--v:obliqCycleYears-->~41,224<!--/v--> yr |
| Ecliptic (nodal) | the N-body chain's dominant nodal mode s₃: 1,296,000/\|s₃\| (the retired label H/5 read <!--v:hDiv5-->67,063<!--/v--> yr) | <!--v:eclPrecYears-->~68,751<!--/v--> yr |

These are time-varying — each uses the instantaneous year lengths at the given epoch, so precession periods themselves oscillate slightly.

The coin rotation paradox manifests at every timescale:

| Timescale | Precession | Cycle absorbed | Offset per cycle |
|-----------|------------|---------------|-----------------|
| Years | Axial (H/13) | 1 fewer sidereal year than tropical years | ~20 min/year |
| Years | Perihelion (H/16) | 1 fewer anomalistic year than tropical years | ~15 min/year |
| Days | Orbital (1 year) | 1 fewer solar day than sidereal days | ~3m 56s/day |
| Days | Axial (T_p) | 1 fewer sidereal day than stellar days | ~9.1 ms/day |


## J2000 Reference Values

| Quantity | Model value | Reference |
|----------|-------------|-----------|
| Tropical year | 365.242190 days | 365.242190 days (IAU) |
| Sidereal year | 365.256363 days | 365.256363 days (IAU) |
| Anomalistic year | 365.259633 days | <!--v:anomalisticYearInputDays-->365.259636<!--/v--> days (IAU) |
| LOD_mean (kinematic, H/13 identity) | <!--v:meanSolarDaySeconds-->86,399.999676<!--/v--> s | — |
| LOD_real (Layer 4: physical, + the ecliptic term + DT cycles + swing) | <!--v:lodRealPhysical-->86,400.001780<!--/v--> s | USNO joint-optimum target <!--v:usnoLodJ2000-->86,400.0021<!--/v--> s (fit's measured-day basis) |
| Sidereal day | 86164.091 s | 86164.091 s (IAU) |
| Stellar day | 86164.099 s | 86164.099 s (IAU) |
| Axial precession | <!--v:axialPrecJ2000-->25,771<!--/v--> yr | <!--v:axialPrecJ2000-->25,771<!--/v--> yr (instantaneous J2000 rate) |


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

**Axial coin rotation — <!--v:axialCoinRotationMs-->9.13<!--/v--> ms, on the ecliptic.** Axial precession accumulates exactly one extra sidereal day per precession period T_p (<!--v:axialPrecExact-->25,771.40<!--/v--> yr at J2000, the certified year laws' beat):

```
axialCoinRotationMs × 366.24 sidereal days/year × T_p years = 1.0000 sidereal days
```

This is a count on the ecliptic and is deliberately **not** projected. `axialCoinRotationMs` uses the unprojected rate. Substituting 8.37 ms into the identity gives 0.917 days, not 1.000.

**Stellar−sidereal day offset — 8.37 ms, on the equator.** The physical difference between the two day lengths depends on how fast the equinox moves *along the equator* (precession in right ascension, m), not along the ecliptic (precession in longitude, p — one turn per T_p(t), the composed precession period, <!--v:axialPrecRound-->~25,771<!--/v--> yr at J2000). Since m = p·cos ε, the stellar day carries `STELLAR_DAY_RA_PROJECTION = cos ε`:

```
stellarDay = siderealDay × (1 + cos(ε) / (T_p(t) × rotationsPerYear))
           → 8.37 ms above the sidereal day, vs the IAU value of 8.373 ms
```

T_p is the physical period in both identities, not the frozen clock's counter (the anchor interval's thirteenth, 0.086 % longer): on the counter the offset read 7 µs low and the coin rotation 8 µs low, and the counting identity closed only against the counter's own period.

**This was confirmed by measurement, not asserted.** The "Analyze Stellar Day" tool's Method D tracks Earth's rotation about its own spin axis against ICRF — using no precession period at all, since the spin axis precesses on the precession cone and the projection plane tilts with it — and reproduces the IAU stellar day to ~0.02 ms. Methods A and B, which reference the ecliptic normal instead of the spin axis, overshoot by ~0.79 and ~0.47 ms respectively; that ~23.44° of axis difference *is* the cos ε.

The obliquity used follows the family of the sidereal day it is applied to: `OBLIQUITY_MEAN` for the H-cycle mean values, `computeObliquityEarth(year)` for epoch-specific ones. At J2000 the choice is worth 0.0008 ms, but across the deep-time obliquity range (~22.0°–24.5°) the offset runs 8.46 → 8.30 ms.


## Implementation

### JavaScript (`script.js`)

The tropical year's frozen-clock law (the era device and opt-out path; the displayed of-date value is the one-source family — see the Status banner) is the direct year-length Fourier fit (Step 6c, TROPICAL_YEAR_HARMONICS, 12 terms):

```javascript
function computeSolarYearDaysDirect(currentYear) {
  return evalYearFourier(currentYear, meansolaryearlengthinDays, TROPICAL_YEAR_HARMONICS);
}
```

A secondary derivation via cardinal-point harmonics is kept for chart consistency:

```javascript
function computeSolarYearDaysFromCardinals(currentYear) {
  return (computeSolsticeYearLength(currentYear, 'SS') +
          computeSolsticeYearLength(currentYear, 'WS') +
          computeSolsticeYearLength(currentYear, 'VE') +
          computeSolsticeYearLength(currentYear, 'AE')) / 4;
}
```

The sidereal and anomalistic years use the simpler Fourier evaluator:

```javascript
function evalYearFourier(currentYear, mean, harmonics) {
  const t = currentYear - balancedYear;
  let result = mean;
  for (const [div, sinC, cosC] of harmonics) {
    const phase = 2 * Math.PI * t / (holisticyearLength / div);
    result += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  return result;
}
```

### Source Files

| File | Role |
|------|------|
| `src/script.js` | Runtime formulas, harmonic coefficients |
| `tools/lib/constants.js` | Pipeline constants (reads from JSON) |
| `public/input/fitted-coefficients.json` | Fitted harmonic coefficients |
| `public/input/astro-reference.json` | IAU reference values |


## Updating Coefficients

If `H` or `inputmeanlengthsolaryearindays` changes:

1. **Means update automatically** — they are derived formulas, not constants
2. **The harmonic fitters are FROZEN and retired** (git history commit
   16d7c87f; README §"The frozen era clock"): the coefficients are the
   certified era device, and re-fitting them against a one-source export
   is a cross-family error (measured, the C-4b adjudication). Step 6a
   (`export-solar-measurements.js`) remains the measurement/reference
   export. If `H` or the input mean year ever changes, the freeze itself
   must be re-adjudicated (an owner decision), not silently re-run.
3. **stepYears must divide H evenly** — current: H=<!--v:H-->335,317<!--/v-->, stepYears=1 (335,318 rows)

Training data: `data/02-solar-measurements.csv`

## Related

- [Solstice Prediction](14-solstice-prediction.md) — cardinal point harmonic formulas
- **Solar Day Report** (browser: Reports > Solar Day) — measures 365 noon-to-noon intervals from 6 starting points, visualizes the analemma and equation-of-time bias by starting angle
