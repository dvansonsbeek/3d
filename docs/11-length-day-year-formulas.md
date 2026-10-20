---
docVersion: 1.0
modelVersion: v26.4
coefficients: sha256:f62e8a7b8b7ed53d
status: current
---

# Year and Day Length Formulas

> **Status — one year family, one J2000 day.** The year lengths are ONE of-date family — `createYearLengths` in `@essrt/physics` (doc 110 chain 3): the sidereal year on the λ̇ channel and the solar-mass law, the tropical year as its beat with the general precession of date, the anomalistic year with the series' apsidal rate. Every displayed and served value (tweakpane year rows, Framework Verification model lines, the report's Physics columns, the API) rides it; day counts divide by the kinematic day of date (`lodKinematic`, the Layer-0 tidal mean day), which at J2000 is the SI day, 86,400 s. *Record:* the former Fourier-harmonic year laws on the fitted unit's divisors (the "era device", with its rounded 365.2422-d input) are deleted at plan 09 — what went is listed in `public/input/model-version.json` `_v24Note`, the comb-era research record in doc 109 §22.

> **Scope.** This document describes the J2000 anchors and the of-date laws inside the one-family window. At deep-time / Phanerozoic / Hadean epochs the **mean values themselves shift** per the [Expanding Solar System Resonance Theory (Doc 99)](99-expanding-solar-system-resonance-theory.md): the composed lunisolar precession period T_p(t) grows under Driver 1 (Earth-Moon tidal evolution → LOD grows) while the sidereal year in seconds shifts under Driver 2 (solar mass loss → Kepler `dT/T = −2 dM/M`). For deep-time work use the epoch-dependent helpers (`meanLodSecondsAtAge`, `meanSiderealYearSecondsAtAge`, `meanLunisolarPrecessionPeriodYearsAtAge`, `meanTropicalYearSecondsAtAge`) — see [Doc 20 §"ESSRT epoch dependence"](20-constants-reference.md#essrt-epoch-dependence--most-tabulated-values-are-j2000-anchored) for the J2000-constant → helper map.

## Architecture

The year lengths are movements, not counts. Two J2000 anchors are
inputs — the IAU sidereal year and the IAU general precession p_A — and
everything else is derived from them and from the model's own motions:

```
siderealYearJ2000 = 365.256363004 d (IAU)      p_A = 50.28796195 ″/yr (IAU 2006)
        │                                            │
        ▼                                            ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │ J2000 tropical year:  1/T_trop = 1/T_sid + p_A/(1,296,000″·365.25 d)   │ 365.242190469 d
  │ J2000 anomalistic year: the one-family law of date at 2000 — the      │ 365.259634985 d
  │   sidereal year and the series' own apsidal rate ϖ̇ (11.609 ″/yr)      │
  └──────────────────────────────────────────────────────────────────────┘
        │
        ├──► OF DATE, inside the one-family window (±2 Myr) — the published family
        │    (`model.yearLengths`, the scene's own rates, gated by the Node scene twin):
        │      sidereal:    the λ̇ channel on the mass-loss law
        │      tropical:    1/T_trop = 1/T_sid + p(t)/(360°·365.25 d), p(t) the general precession of date
        │      anomalistic: 1/T_anom = 1/T_trop − ϖ̇_eq(t)/(360°·365.25 d)
        │
        └──► OF DATE, the deep chain (Layer 0, every epoch to the tidal-lock asymptote —
             what the deep JD↔year calendar integrates):
               sidereal:  T₀·(1 − Δm)²                         (Driver 2, solar mass loss)
               tropical:  1/T_trop = 1/T_sid + ψ̇(t)/(1,296,000″·365.25 d),
                          ψ̇(t) = [ω₀/ω(t)]⁻¹… = (LOD₀/LOD(t))·p₀·[f_S + (1 − f_S)(a₀/a_M(t))³]
                          — one equinox turn per the composed precession period T_p(t)
               (no deep anomalistic year: the apsidal line is not resolved beyond the window)
        │
        ▼  Days of the epoch
  ┌──────────────────────────────────────────────────────────────────────┐
  │ yearDays = yearSeconds / LOD(t)        LOD(t) the kinematic day of date │
  │ siderealDay = T_sid/(T_sid/LOD + 1 + 1/T_p(t))                           │
  └──────────────────────────────────────────────────────────────────────┘
```

### Key Principle

The **sidereal year in SI seconds is an input** (the IAU value, `astro-reference.json`), and the tropical year is derived from it and the precession — at J2000 from p_A, at every other epoch from the composed precession rate of date. The retired era device derived the three means from one input mean solar year and its unit H (the tropical mean rounded onto 1/(H/8), the sidereal × H/(H − 13), the anomalistic × H/(H − 16)) and carried the tropical year of date as "one turn per H/13", 0.086 % slow on the equinox term; the combs that modulated them are deleted (plan 09 steps 3, 4c, 4d, 5d).


## Mean Year Lengths (Inputs)

The three J2000 mean year lengths are the IAU inputs of `astro-reference.json`:

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

The window CSV (Step 6a2) is the measurement export the laws are checked against.

### Tropical Year

The tropical year is measured at the actual solstices and equinoxes (declination extrema and zero-crossings), NOT at RA crossings. The mean tropical year is the average of 4 cardinal point intervals: SS-to-SS, WS-to-WS, VE-to-VE, AE-to-AE — `computeSolarYearDaysFromCardinals(year)`, the intervals between successive APPARENT crossings of the one certified Sun (`createModel().cardinal.yearLengthDays`, whose mean longitude integrates the one-source tropical year; plan 06 R1 — the fitted cardinal-point harmonic formula, CARDINAL_POINT_* with 23 harmonics per type plus the ECC/JOINT/DERIVED families, left the runtime; doc 14 is its record). Kept for chart consistency in `charts/report` code paths that already display cardinal-point data.

### Sidereal Year

The sidereal year is measured by tracking the Sun's **world angle** (ICRF) at each cardinal point event, then computing:

```
siderealYear = JD_interval × 360 / (360 − dWA)
```

where `dWA` is the world-angle advancement over one tropical year interval (single-year step). For a span of n years, use `n × 360 − dWA` in the denominator. The retired year-length fitter used the same estimator.

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
  │ LOD_mean = ω₀ = 86,400 s at J2000 — the SI day, the ONE      │
  │  J2000 day basis (the day the IAU year inputs are stated in) │
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
  │    tools/fit/dt-corrections-fit.js --joint) — the SI     │
  │    day ω₀, the ONE J2000 day basis (doc 99 § "The J2000  │
  │    day basis")                                           │
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

**The scene day basis.** The scene's measured year lengths — the tweakpane *days* rows, the window CSV — are counted in the SI day ω₀. The `lodRealPhysical` basis-consistency gate ties the ΔT joint fit to the same basis. The day quantities that coexist and must not be conflated:

| basis | J2000 value | role |
|---|---|---|
| SI day — ω₀, LOD_mean | 86,400 s exactly | the JD axis, all IAU references, the kinematic day at J2000 (<!--v:meanSolarDaySeconds-->86,400.000000<!--/v--> s), the scene's day basis (<!--v:measuredMeanSolarDayJ2000Seconds-->86,400.000000<!--/v--> s) and `o.lodKinematic` at J2000 (<!--v:lodKinematicFourierJ2000Seconds-->86,400.000000<!--/v--> s; the key name is historical) — ONE basis |
| kinematic day of date | the Layer-0 tidal mean length of day | the year-length denominators of date; ≡ ω₀ at J2000 |
| LOD_real (physical observable) | <!--v:lodRealPhysical-->86,400.001200<!--/v--> s | Layer-4 display (adds the ecliptic term + ΔT cycles + swing) |

The three J2000 year lengths are inputs on the same day (the IAU values on the 86,400-s day), so there is one day basis and no per-type closing day.

**Sidereal day** — the time for Earth to rotate 360° relative to the vernal equinox. Shorter than the solar day because Earth's orbital motion means the Sun drifts ~1°/day eastward, requiring extra rotation to reach the next noon. Formula:

```
siderealDay = solarYearSec / (solarYearSec / 86400 + 1)
```

**Stellar day** — the time for Earth to rotate 360° relative to fixed stars (ICRF). Slightly *longer* than the sidereal day because the vernal equinox precesses westward, so Earth needs less rotation to "catch" the moving equinox than to return to the same fixed star. The precession correction adds ~8.37 ms to the sidereal day.

The rate that matters here is precession in **right ascension** (along the equator, m ≈ 4612″/cy), not precession in **longitude** (along the ecliptic, p ≈ 5029″/cy — the axial precession, one turn per T_p(t), the composed lunisolar period whose J2000 anchor is <!--v:axialPrecRound-->~25,772<!--/v--> yr). The two are related by m = p·cos ε, so the precession rate carries `STELLAR_DAY_RA_PROJECTION = cos ε`. Without it the offset comes out ~9.12 ms, overshooting the IAU value of 8.373 ms by 1/cos ε. See § "Stellar−Sidereal Offset" below.

### J2000 Day-Length Values

| Quantity | Model value | Reference |
|----------|-------------|-----------|
| Mean solar day — **LOD_mean** (the SI day ω₀) | <!--v:meanSolarDaySeconds-->86,400.000000<!--/v--> s | the SI day (input) |
| Mean solar day — **LOD_real** (Layer 4: + the ecliptic term + DT cycles + swing, physical) | <!--v:lodRealPhysical-->86,400.001200<!--/v--> s | USNO joint-optimum target <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s (the same day basis) |
| Sidereal day — on LOD_real of J2000 (the simulator readout) | <!--v:siderealDayJ2000Physical-->86,164.091730<!--/v--> s | <!--v:siderealDayInputSeconds-->86,164.090531<!--/v--> s (IAU, on the 86,400-s day — the two differ by the day's excess, <!--v:lodRealJ2000ExcessMs-->1.20<!--/v--> ms) |
| Stellar day — on LOD_real of J2000 | <!--v:stellarDayJ2000Physical-->86,164.100105<!--/v--> s | <!--v:stellarDayInputSeconds-->86,164.098904<!--/v--> s (IAU 2000A, on the 86,400-s day) |

See § "The ecliptic missing-motion LOD Correction" below for the distinction between the two mean solar day values.

### The ecliptic missing-motion LOD Correction (Kinematic vs Physical)

The framework maintains two distinct LOD values that differ by a small correction on the nodal period of Earth's orbit plane (see below):

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
| Perihelion | `Y_anom(s) / (Y_anom(s) − Y_trop(s))` | T_peri ≈ <!--v:earthPeriPeriod-->20,938<!--/v--> yr |
| Inclination | `Y_anom(s) / (Y_anom(s) − Y_sid(s))` | T_aps ≈ <!--v:earthPeriPeriodICRF-->111,635<!--/v--> yr |
| Obliquity | the beat of the spin axis's inertial precession against the nodal mode: 1/(1/T_ψ̇ᵢₙ − 1/T_s₃) with T_ψ̇ᵢₙ = <!--v:spinAxisInertialPeriodYearsJ2000-->25,722<!--/v--> yr (the pole's period, 0.097 ″/yr above the equinox clock T_p — IAU's planetary precession). A record sees the window mean of the pole rate, not the J2000 instant: <!--v:obliqCycleRealizedLr04Years-->~40,927<!--/v--> yr over the LR04 record | <!--v:obliqCycleYears-->~41,099<!--/v--> yr at J2000 |
| Ecliptic (nodal) | the N-body chain's dominant nodal mode s₃: 1,296,000/\|s₃\| | <!--v:eclPrecYears-->~68,751<!--/v--> yr |

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
| Anomalistic year | <!--v:anomalisticYearJ2000Days-->365.2596350<!--/v--> days | <!--v:anomalisticYearSimon1994Days-->365.259636<!--/v--> days (Simon 1994 mean element; the model's law of date at 2000: <!--v:anomalisticYearJ2000Days-->365.2596350<!--/v-->) |
| LOD_mean (kinematic, the SI day ω₀) | <!--v:meanSolarDaySeconds-->86,400.000000<!--/v--> s | — |
| LOD_real (Layer 4: physical, + the ecliptic term + DT cycles + swing) | <!--v:lodRealPhysical-->86,400.001200<!--/v--> s | USNO joint-optimum target <!--v:usnoLodJ2000-->86,400.0012<!--/v--> s (fit's measured-day basis) |
| Sidereal day — on LOD_real of J2000 (the simulator readout) | <!--v:siderealDayJ2000Physical-->86,164.091730<!--/v--> s | <!--v:siderealDayInputSeconds-->86,164.090531<!--/v--> s (IAU, on the 86,400-s day — the two differ by the day's excess, <!--v:lodRealJ2000ExcessMs-->1.20<!--/v--> ms) |
| Stellar day — on LOD_real of J2000 | <!--v:stellarDayJ2000Physical-->86,164.100105<!--/v--> s | <!--v:stellarDayInputSeconds-->86,164.098904<!--/v--> s (IAU 2000A, on the 86,400-s day) |
| Axial precession | <!--v:axialPrecJ2000-->25,772<!--/v--> yr | <!--v:axialPrecJ2000-->25,772<!--/v--> yr (instantaneous J2000 rate) |


## Physical Insights

### What Moves Each Year Type of Date

| Year type | Moved by | Physical reason |
|-----------|----------|-----------------|
| Tropical | the general precession of date p(t) | Measures equinox-to-equinox — the equinox's return along the ecliptic of date shortens the year by one turn per precession period; p(t) follows the obliquity and the ecliptic's own motion |
| Sidereal | the λ̇ channel (planetary perturbations) and the solar-mass law | Measures full orbit against the stars — nearly constant (about −0.1 s per millennium in the modern era) |
| Anomalistic | the series' apsidal rate ϖ̇ of date | Measures perihelion-to-perihelion — the perihelion's advance lengthens the year by one turn per apsidal period |

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

holds at every epoch — it is algebraically tautological. **Within the modern era** the sidereal year in SI seconds is treated as the calibration anchor (`siderealYearJ2000 × 86400`); the of-date laws move the year lengths in seconds and the kinematic day of date converts them to day counts, with the J2000 anchor held fixed.

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

T_p is the physical period in both identities.

**This was confirmed by measurement, not asserted.** The "Analyze Stellar Day" tool's Method D tracks Earth's rotation about its own spin axis against ICRF — using no precession period at all, since the spin axis precesses on the precession cone and the projection plane tilts with it — and reproduces the IAU stellar day to ~0.02 ms. Methods A and B, which reference the ecliptic normal instead of the spin axis, overshoot by ~0.79 and ~0.47 ms respectively; that ~23.44° of axis difference *is* the cos ε.

The obliquity used follows the family of the sidereal day it is applied to: the IAU J2000 obliquity input for the mean values, the hybrid obliquity of date (`_sceneEpsTargetDeg(year)`) for epoch-specific ones. At J2000 the choice is worth 0.0008 ms, but across the deep-time obliquity range (~22.0°–24.5°) the offset runs 8.46 → 8.30 ms.


### The Framework Verification instrument's "measured solar day"

The instrument's mean noon-to-noon interval is NOT a day length of the sky, and
the model publishes no offset for it: the quantity is a property of the
instrument's window. The instrument counts 365 solar noons from the June solstice; 365 days
end 0.2422 d short of the tropical year, so the equation of time has not
returned to its start value and the mean noon-to-noon interval differs from the
mean solar day by −(0.2422/365)·dEoT/dt at the solstice. The first-order
equation of time, −2e·sin M + tan²(ε/2)·sin 2λ, gives at the solstice (λ = 90°,
M = 90° − ϖ) two lines: the e·cos(90° − ϖ) term on the perihelion-of-date
cycle (5.2 ms first-order; the instrument's 65-epoch measurement reads 5.6) and
the tan²(ε/2) term on the obliquity cycle (1.4 against 1.7), with a mean of the
same order (first-order 18.6 ms against the measured 14.2; the exact value
depends on the window's first-noon convention). The physical day of date is the mean
solar day (`dayLengthSeconds`); the equation of time is the certified Sun's; an
observer who counts noons over an integer-day window measures this term and can
derive it from both.

## Implementation

### JavaScript (`script.js`)

The tropical year of date in days of the epoch is the published SI law over the kinematic day of date:

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
| `data/*.json` fit artifacts | The shipped fitted artifacts (the ΔT stack, the core-mantle resonator, the climate formula, the banked deep-time record `deep-time-fitted.json`) — embedded by `tools/constants/generate.mjs`; `public/input/fitted-coefficients.json`, the comb families' former home, was emptied at plan 09 and deleted at plan 11 step 1 |
| `public/input/astro-reference.json` | IAU reference values — the J2000 year lengths, the SI day, the general precession |


## Updating Coefficients

The year lengths carry no fitted coefficients: the J2000 values are the IAU inputs (`astro-reference.json`), the of-date laws are the one-source family on the banked N-body series. Nothing here is refitted; a change is an input change or a law change. The exporter (`export-solar-measurements.js`) is the measurement export over the −4000…+4000 window (Step 6a2) — the window CSV, `data/02-solar-measurements-window.csv`, which `check:csv-smoke` compares bit-exactly.

## Related

- **Solar Day Report** (browser: Reports > Solar Day) — measures 365 noon-to-noon intervals from 6 starting points, visualizes the analemma and equation-of-time bias by starting angle
