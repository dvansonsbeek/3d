---
docVersion: 1.0
modelVersion: v11.0
coefficients: sha256:c6b0f26097c7945c
status: current
---

# Constants Reference

This document is the **single source of truth** for all constants used in the Holistic Universe Model simulation. Other documents should reference this document rather than duplicating values.

> **Synchronized with `tools/lib/constants.js`** — the frontmatter `coefficients` hash records the exact coefficient state this doc tracks.

### Code organization

Constants in `src/script.js` are organized into 11 numbered sections with sub-headers:

1. Foundational Model Constants — 2. Model Start & Physical Constants — 3. Sun & Moon Input Constants — 4. Planet Input Constants (4a. major planets, 4b. minor bodies, 4c. ascending nodes) — 5. Inclination System (5a–5d) — 6. Predictive Formula System — 7. Body Diameters — 8. Astronomical Reference Values / ASTRO_REFERENCE (8a–8g) — 9. Derived Constants (9a–9e) — 10. Mass Calculations (10a–10b) — 11. Orbital Formulas (11a–11c)

The shared tools module `tools/lib/constants.js` mirrors these with its own 14-section structure.

### How other documents should reference constants

- **Rule A — Formulas stay, computed numbers go.** Write "H/13" not a specific year count.
- **Rule B — Theory-intrinsic integers stay inline.** Fibonacci numbers, cycle counts (13, 3, 16), and ratios are part of the theory.
- **Rule C — Approximate values for readability.** Use "H/13 (<!--v:axialPrecRound-->~25,794<!--/v--> years; see [Constants Reference](20-constants-reference.md))" when a number aids understanding.
- **Rule D — Tables reference this document.** If a doc repeats planet parameters, add: "For current values see [Constants Reference](20-constants-reference.md)."

---

### ESSRT epoch dependence — most tabulated values are J2000-anchored

Per the [Expanding Solar System Resonance Theory (Doc 99)](99-expanding-solar-system-resonance-theory.md), the model has two distinct categories of "constants":

- **Scale-invariant integers** — Fibonacci divisors (3, 5, 8, 13, 16, 21, 34), L1 integer labels (n = 9, 12, ..., 65, 66, 68, ..., 185 — 32 components total), integer divisors of 8H. These are **the same at every epoch** — structural constants of the solar system.
- **Epoch-dependent literal periods, lengths, and seconds-values** — these scale with the current value of H(t). **Most numeric values tabulated below** (H = <!--v:H-->335,317<!--/v--> yr; sidereal year = 365.25636 days; LOD = 86,400 s; Moon distance = 384,399 km; planet orbital periods in years; etc.) are **J2000-epoch values** — the model's primary calibration anchor. They apply to the modern era; for deep-time / future-projection work, use the epoch-dependent helpers in `src/script.js`:

| J2000-anchored constant in this doc | Epoch-dependent helper (accepts `t_Ma` argument) |
|---|---|
| `holisticyearLength` (H = <!--v:H-->335,317<!--/v--> yr) | `meanHAtAge(t_Ma)` |
| `meanLengthOfDay` (~86,400.0 s) | `meanLodSecondsAtAge(t_Ma)` |
| `meanSiderealYearSeconds` (`siderealYearJ2000 × 86400`) | `meanSiderealYearSecondsAtAge(t_Ma)` |
| Tropical year (from `meanSolarYearDays`) | `meanTropicalYearSecondsAtAge(t_Ma)` |
| Moon distance (`moonDistance` = <!--v:moonOrbitalRadius-->384,399.07<!--/v--> km) | `meanMoonDistanceMetresAtAge(t_Ma)` |
| Planet orbital periods (Part 4 `solarYearInput`) | `meanPlanetOrbitalPeriodAtAge(t_Ma, T_p_J2000_s)` |
| α(t) GIA correction → ΔT | `meanDeltaTSecondsAtAge(t_Ma)` |

H(t) evolves under two physically independent drivers: **Driver 1** = Earth-Moon tidal evolution (LOD grows, Moon recedes); **Driver 2** = solar mass loss (every planet's orbit slowly expands via Kepler's 3rd law). At Devonian (380 Ma) H ≈ <!--v:hAtDevonian-->306,189<!--/v--> yr; at J2000 H = <!--v:H-->335,317<!--/v--> yr; at +200 Myr H ≈ <!--v:hAt200MyrFuture-->352,600<!--/v--> yr. The integer divisors above are unchanged at every epoch — only the per-cycle period in years (or seconds) scales.

For the canonical 9-step derivation chain from `t_Ma` through LOD, H, AU, M_Sun, Kepler year, Moon distance, Moon period, anomalistic year, stellar/sidereal days, and planet orbital + synodic periods, see [Doc 99 — ESSRT](99-expanding-solar-system-resonance-theory.md) and the canonical reference at `docs/archive/old-documents/IP-deep-time-extension.md` (untracked archive). For the Solar System Resonance Cycle (8H = <!--v:eightH-->2,682,536<!--/v--> yr at J2000) period table covering all major planetary cycles as integer divisors of 8H, see [Doc 55](55-solar-system-resonance-cycle-periods.md).

---

## Parameter Summary

**This section is the canonical parameter accounting.** The model has only
**6 free parameters**; every other number is either derived or anchored to
astronomical observations. Other documents (and the simulator's About panel)
should reference this section rather than carrying their own counts.

### Free Parameters (6 DOF)

The six true degrees of freedom that define the model. Everything else is derived or taken from observations.

| # | Parameter | Variable | Value | DOF | Section |
|---|-----------|----------|-------|-----|---------|
| 1 | Earth Fundamental Cycle | `holisticyearLength` | <!--v:H-->335,317<!--/v--> years | 1 | [Part 1 — Earth Fundamental Cycle](#the-earth-fundamental-cycle-h) |
| 2 | Balanced year | `balancedYear` | −<!--v:anchorYearOffset-->302,635<!--/v--> (derived) | 0 | [Part 2 — Time Constants](#time-constants) |
| 3 | Fibonacci divisors | — | 3, 5, 8, 13, 21, 34 | 3 | [Part 1 — Fibonacci Divisors](#fibonacci-divisor-assignments) |
| 4 | Mean obliquity | `earthtiltMean` | <!--v:meanObliquity-->23.41353<!--/v-->° | 1 | [Part 1 — Earth Parameters](#earth-parameters) |
| 5 | Inclination amplitude | `earthInvPlaneInclinationAmplitude` | <!--v:earthInclAmp-->0.63605<!--/v-->° | 1 | [Part 1 — Earth Parameters](#earth-parameters) |
| 6 | Planet config | the default configuration | Unique mirror-symmetric solution | 0 | [Part 1 — Fibonacci Divisors](#fibonacci-divisor-assignments) |

Total: **6 DOF** (items 2 and 6 are derived/constrained, not independently free).

### Core Calibration Inputs (28 — Earth, Sun & Moon)

The 28 Earth/Sun/Moon reference values from astronomical observations (IAU,
JPL, Meeus) used to anchor the model, tabulated below. The **per-planet**
calibration inputs (J2000 orbital elements, orbital periods, mass ratios,
axial tilts) are tabulated in [Part 3 — External Reference Values](#part-3--external-reference-values)
and [Part 4 — Tuned/Optimized Parameters](#part-4--tunedoptimized-parameters);
they anchor per-planet geometry but carry no model freedom.

| Parameter | Variable | Value |
|-----------|----------|-------|
| Perihelion-solstice alignment | `perihelionalignmentYear` | <!--v:periAlignYear-->1246.03125<!--/v--> AD |
| Long. perihelion (J2000) | `perihelionLongitudeJ2000_deg` | <!--v:earthPerihelionLongitudeJ2000-->102.947<!--/v-->° |
| Obliquity (J2000) | `obliquityJ2000_arcsec` | <!--v:obliquityJ2000Arcsec-->84381.406<!--/v-->" (<!--v:obliquityJ2000Deg-->23.439279<!--/v-->°) |
| Obliquity rate (J2000) | `obliquityRate_arcsecPerCentury` | −46.836769"/cy |
| Obliquity range | — | <!--v:mainstreamObliqRange-->~22.1° to ~24.5°<!--/v--> |
| Earth incl. (J2000) | `earthInclinationJ2000_deg` | <!--v:earthInclJ2000-->1.57869<!--/v-->° |
| Eccentricity (J2000) | `eccentricityJ2000` | <!--v:j2000Eccentricity-->0.01671022<!--/v--> |
| Sidereal year (J2000) | `siderealYearJ2000` | <!--v:siderealYearInputDays-->365.256363004<!--/v--> days |
| Tropical year mean (J2000) | `tropicalYearMeanJ2000` | <!--v:tropicalYearMeanJ2000Days-->365.2421897<!--/v--> days |
| Tropical year VE (J2000) | `tropicalYearVEJ2000` | <!--v:tropicalYearVEJ2000Days-->365.242374<!--/v--> days |
| Tropical year SS (J2000) | `tropicalYearSSJ2000` | <!--v:tropicalYearSSJ2000Days-->365.241626<!--/v--> days |
| Tropical year AE (J2000) | `tropicalYearAEJ2000` | <!--v:tropicalYearAEJ2000Days-->365.242018<!--/v--> days |
| Tropical year WS (J2000) | `tropicalYearWSJ2000` | 365.242740 days |
| Anomalistic year (J2000) | `anomalisticYearJ2000` | <!--v:anomalisticYearInputDays-->365.259636<!--/v--> days |
| Tropical year rate | `tropicalYearRateSecPerCentury` | −0.53 s/cy |
| Axial precession (J2000) | `iauPrecessionJ2000` | <!--v:iauPrecessionInputYears-->25,770.73<!--/v--> years (input, model day basis; published IAU exact 25,771.57634) |
| June Solstice 2000 JD | `juneSolstice2000_JD` | <!--v:juneSolstice2000JD-->2451716.575<!--/v--> |
| Solar day (J2000) | `solarDayJ2000` | 86400.0 s |
| Sidereal day (J2000) | `siderealDayJ2000` | <!--v:siderealDayInputSeconds-->86,164.090531<!--/v--> s |
| Stellar day (J2000) | `stellarDayJ2000` | <!--v:stellarDayInputSeconds-->86,164.098904<!--/v--> s |
| Perihelion passage JD | `perihelionPassageJ2000_JD` | <!--v:perihelionPassageJD-->2451547.042<!--/v--> |
| Moon mean anomaly (J2000) | `moonMeanAnomalyJ2000_deg` | <!--v:moonMeanAnomalyJ2000Deg-->134.9634<!--/v-->° |
| Moon mean anomaly rate | `moonMeanAnomalyRate_degPerDay` | <!--v:moonMeanAnomalyRateDegPerDay-->13.06499295<!--/v-->°/day |
| Moon elongation (J2000) | `moonMeanElongationJ2000_deg` | <!--v:moonMeanElongationJ2000Deg-->297.8502<!--/v-->° |
| Moon elongation rate | `moonMeanElongationRate_degPerDay` | <!--v:moonMeanElongationRateDegPerDay-->12.19074912<!--/v-->°/day |
| Sun mean anomaly (J2000) | `sunMeanAnomalyJ2000_deg` | <!--v:sunMeanAnomalyJ2000Deg-->357.5291<!--/v-->° |
| Sun mean anomaly rate | `sunMeanAnomalyRate_degPerDay` | <!--v:sunMeanAnomalyRateDegPerDay-->0.98560028<!--/v-->°/day |
| Moon arg. latitude (J2000) | `moonArgLatJ2000_deg` | <!--v:moonArgLatJ2000Deg-->93.2720993<!--/v-->° |

---

# Part 1 — Foundational Model Constants

These constants define the model. Changing any of them changes the theory.

## The Earth Fundamental Cycle (H)

| Constant | Variable | Value |
|----------|----------|-------|
| Earth Fundamental Cycle | `holisticyearLength` (H) | **<!--v:H-->335,317<!--/v-->** years |
| Perihelion alignment year | `perihelionalignmentYear` | <!--v:periAlignYear-->1246.03125<!--/v--> AD |
| Obliquity cycle position | `temperatureGraphMostLikely` | 14.5 (of 16) |

The Earth Fundamental Cycle is divided by Fibonacci-related integers to produce all Earth precession cycles (see [Part 2 — Derived Constants](#part-2--derived-constants)).

## Earth Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Base Eccentricity | `eccentricityBase` | <!--v:eccentricityBase-->0.015386<!--/v--> | Base orbital eccentricity (derived from perihelion longitude) |
| Eccentricity Amplitude | `eccentricityAmplitude` | <!--v:eccentricityAmplitude-->0.001356<!--/v--> | Oscillation amplitude (derived from base + e(J2000) constraint) |
| Mean Obliquity | `earthtiltMean` | <!--v:meanObliquity-->23.41353<!--/v--> deg | Mean axial tilt (derived from obliquity at J2000) |
| RA Angle | `earthRAAngle` | ~1.254 | **Derived**: `2A − A²/ε` where A = inclination amplitude, ε = earthtiltMean |
| Mean Inclination (inv. plane) | `earthInvPlaneInclinationMean` | <!--v:earthInclMean-->1.48113<!--/v--> deg | Mean orbital inclination to invariable plane (derived) |
| Inclination Amplitude | `earthInvPlaneInclinationAmplitude` | <!--v:earthInclAmp-->0.63605<!--/v--> deg | Oscillation amplitude (derived from obliquity rate) |
| Inclination Cycle Anchor | `earthInclinationCycleAnchor` | 21.77 deg | ICRF perihelion longitude where Earth reaches MAX inclination (anchor for the oscillation) |
| Perihelion Ref JD | `perihelionRefJD` | <!--v:perihelionPassageJD-->2451547.042<!--/v--> | JD of Earth perihelion 2000 (Jan 3.542) |

## Fibonacci Divisor Assignments

| Planet | Fibonacci Divisor (d) | Phase Group | Mirror Pair | EoC Type |
|--------|----------------------|-------------|-------------|----------|
| Mercury | 21 | In-phase (<!--v:mercuryInclCycleAnchor-->234.52<!--/v-->°) | Uranus | I |
| Venus | 34 | In-phase (<!--v:venusInclCycleAnchor-->218.64<!--/v-->°) | Neptune | I |
| Earth | 3 | In-phase (21.77°) | Saturn | — |
| Mars | 5 | In-phase (<!--v:marsInclCycleAnchor-->236.07<!--/v-->°) | Jupiter | II |
| Jupiter | 5 | In-phase (<!--v:jupiterInclCycleAnchor-->287.06<!--/v-->°) | Mars | III |
| Saturn | 3 | Anti-phase (<!--v:saturnInclCycleAnchor-->116.26<!--/v-->°) | Earth | III |
| Uranus | 21 | In-phase (21.33°) | Mercury | III |
| Neptune | 34 | In-phase (<!--v:neptuneInclCycleAnchor-->174.04<!--/v-->°) | Venus | III |

Phase angles re-anchored 2026-04-09 to balanced year n=7 (≈ -<!--v:systemResetYearBC-->2,649,854 BC<!--/v-->). See [10-fibonacci-laws.md § Phase Groups](10-fibonacci-laws.md#phase-groups) and [32-inclination-calculations.md § Per-Planet Phase Angles](32-inclination-calculations.md#per-planet-phase-angles).

## Model Start & Alignment

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Start Model JD | `startmodelJD` | <!--v:startModelJD-->2,451,716.5<!--/v--> | June Solstice 2000 00:00 UTC |
| Start Model Year | `startmodelYear` | <!--v:startModelYear-->2000.5<!--/v--> | Decimal year of model start |
| Start Angle | `startAngleModel` | <!--v:startAngleModel-->89.91949879<!--/v--> deg | Sun ecliptic longitude at model start |
| Correction Days | `correctionDays` | <!--v:correctionDays-->-0.8288<!--/v--> | Correction for solstice alignment offset |
| Variable Speed | `useVariableSpeed` | true | Enables equation of center (Kepler's 2nd law) |

## Physical Constants

| Constant | Variable | Value |
|----------|----------|-------|
| Speed of Light | `speedOfLight` | <!--v:speedOfLight-->299,792.458<!--/v--> km/s |
| Astronomical Unit | `currentAUDistance` | <!--v:oneAU-->149,597,870.698828<!--/v--> km |
| Mean Sidereal Year | `meanSiderealYearSeconds` | siderealYearJ2000 × 86400 (derived) |
| Gravitational Constant | `G_CONSTANT` | 6.6743 × 10⁻²⁰ km³/(kg·s²) |
| Earth/Moon Mass Ratio | `MASS_RATIO_EARTH_MOON` | <!--v:massRatioEarthMoon-->81.30056816<!--/v--> |

### DE440 Sun/Planet Mass Ratios

| Planet | `massRatioDE440` (M_Sun / M_Planet) |
|--------|-------------------------------------|
| Mercury | <!--v:mercuryMassRatioDE440-->6,023,657.94<!--/v--> |
| Venus | <!--v:venusMassRatioDE440-->408,523.72<!--/v--> |
| Mars | <!--v:marsMassRatioDE440-->3,098,703.59<!--/v--> |
| Jupiter | <!--v:jupiterMassRatioDE440-->1,047.348625<!--/v--> |
| Saturn | <!--v:saturnMassRatioDE440-->3,497.9018<!--/v--> |
| Uranus | <!--v:uranusMassRatioDE440-->22,902.944<!--/v--> |
| Neptune | <!--v:neptuneMassRatioDE440-->19,412.237<!--/v--> |

---

# Part 2 — Derived Constants

These are computed from foundational constants. The formula is the definition; the number is a convenience.

## Precession Periods (from H)

| Cycle | Formula | Period (years) | Direction |
|-------|---------|----------------|-----------|
| Inclination Precession | H / 3 | <!--v:inclPrecYears-->~111,772<!--/v--> | Counter-clockwise |
| Ecliptic Precession | H / 5 | <!--v:eclPrecYears-->~67,063<!--/v--> | Counter-clockwise |
| Obliquity Cycle | H / 8 | <!--v:obliqCycleYears-->~41,915<!--/v--> | Clockwise (negative) |
| Axial Precession | H / 13 | <!--v:axialPrecRound-->~25,794<!--/v--> | Clockwise (negative) |
| Perihelion Precession | H / 16 | <!--v:periPrecYears-->~20,957<!--/v--> | Both directions |

## Time Constants

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Mean Solar Year | `meanSolarYearDays` | round(inputMeanSolarYear × H/8) / (H/8) | <!--v:meanSolarYearDaysFull-->365.242203646102<!--/v--> days |
| Mean Sidereal Year | `meanSiderealYearDays` | meanSolarYearDays × (H/13) / ((H/13) - 1) | <!--v:meanSiderealYearDaysFull-->365.256364374<!--/v--> days |
| Mean Anomalistic Year | `meanAnomalisticYearDays` | meanSolarYearDays / (H/16 - 1) + meanSolarYearDays | <!--v:anomalisticYearDaysFull-->365.259632390<!--/v--> days |
| Mean Length of Day | `meanLengthOfDay` | meanSiderealYearSeconds / meanSiderealYearDays | ~86,400.0 s |
| Mean Sidereal Day | `meanSiderealDay` | (meanSolarYearDays/(meanSolarYearDays+1)) × meanLengthOfDay | <!--v:meanSiderealDaySeconds-->86,164.0902182<!--/v--> s |
| Mean Stellar Day | `meanStellarDay` | (meanSiderealDay/(H/13)) / (meanSolarYearDays+1) + meanSiderealDay | <!--v:meanStellarDaySeconds-->86,164.0985857<!--/v--> s |
| Balanced Year | `balancedYear` | perihelionalignmentYear - (14.5 × H/16) | <!--v:balancedYear-->-302,635<!--/v--> |
| Perihelion Alignment JD | `perihelionalignmentJD` | startmodelJD - meanSolarYearDays × (startModelYearWithCorrection - perihelionalignmentYear) | ~<!--v:periAlignJD-->2,176,153<!--/v--> |
| Perihelion Cycle Length | `perihelionCycleLength` | H / 16 | <!--v:periPrecYears-->~20,957<!--/v--> years |
| Total Days in H | `totalDaysInH` | H × meanSolarYearDays | ~<!--v:totalDaysInH-->122,471,920<!--/v--> days |
| J2000.0 epoch JD | `j2000JD` | startmodelJD - (startmodelYear - 2000) × meanSolarYearDays | ~2451545.0 |
| Julian century | `julianCenturyDays` | 36525 (100 × 365.25) | 36,525 days (IAU Julian century) |
| Earth rotations/year | `meanEarthRotationsPerYear` | meanSolarYearDays + 1 | 366.2422 |
| Start year corrected | `startModelYearWithCorrection` | startmodelYear + correctionDays / meanSolarYearDays | ~2000.4977 |
| Years balanced→J2000 | `yearsFromBalancedToJ2000` | (startmodelJD - balancedJD) / meanSolarYearDays | ~<!--v:anchorYearOffset-->302,635<!--/v--> |

Input constants used in the formulas above:

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Input Solar Year | `inputMeanSolarYear` | <!--v:inputMeanSolarYear-->365.2422<!--/v--> days | Input mean solar year |
| Sidereal Year (seconds) | `meanSiderealYearSeconds` | siderealYearJ2000 × 86400 | Derived from IAU sidereal year reference |

## Eccentricity Derived Values

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Derived Mean Eccentricity | `eccentricityDerivedMean` | sqrt(base² + amplitude²) | ~<!--v:eccentricityDerivedMean-->0.0154456<!--/v--> |
| EoC Eccentricity | `eocEccentricity` | derivedMean - base/2 | ~<!--v:eocEccentricityValue-->0.00775<!--/v--> |
| Perihelion Phase Offset | `perihelionPhaseOffset` | (see constants.js derivation) | ~<!--v:periPhaseOffsetDeg-->0.4828<!--/v--> deg |

## Ascending Node Frame Corrections

When orbital plane tilt is moved from `RealPerihelionAtSun.containerObj` (above annual rotation) to `planet.containerObj` (below), the ascending node direction changes reference frame. These corrections compensate for that shift. **Derived, not tuned.**

| Planet | `ascNodeTiltCorrection` | Formula |
|--------|------------------------|---------|
| Mercury | ~131.67 | 180 - ascendingNode |
| Venus | ~103.32 | 180 - ascendingNode |
| Mars | ~130.44 | 180 - ascendingNode |
| Jupiter | ~27.70 | 2 × startpos |
| Saturn | ~22.64 | 2 × startpos |
| Uranus | ~89.76 | 2 × startpos |
| Neptune | ~95.92 | 2 × startpos |

Type I/II (inner): `180 - ascendingNode` (anti-node direction). Type III (outer): `2 × startpos` (compensates orbital phase in tilt frame).

## Mass Computation & Universal Constants

### Planet Mass Fractions (M_planet / M_Sun)

Non-Earth planets: `massFraction[p] = 1 / massRatioDE440[p]` (the GM chain cancels).

Earth mass is derived from Moon orbital mechanics:
```
GM_Earth_Moon = 4π²·d³ / T²   (d = moonDistance, T = moonSiderealMonth × meanLengthOfDay)
GM_Earth = GM_Earth_Moon × (M_Earth / (M_Earth + M_Moon)) × (meanLengthOfDay / meanSiderealDay)
massFraction.earth = (GM_Earth / G) / M_Sun
```

| Planet | `massFraction` |
|--------|---------------|
| Mercury | <!--v:mercuryMassFraction-->1.660 × 10⁻⁷<!--/v--> |
| Venus | <!--v:venusMassFraction-->2.448 × 10⁻⁶<!--/v--> |
| Earth | <!--v:earthMassFraction-->3.004 × 10⁻⁶<!--/v--> |
| Mars | <!--v:marsMassFraction-->3.227 × 10⁻⁷<!--/v--> |
| Jupiter | <!--v:jupiterMassFraction-->9.548 × 10⁻⁴<!--/v--> |
| Saturn | <!--v:saturnMassFraction-->2.859 × 10⁻⁴<!--/v--> |
| Uranus | <!--v:uranusMassFraction-->4.366 × 10⁻⁵<!--/v--> |
| Neptune | <!--v:neptuneMassFraction-->5.151 × 10⁻⁵<!--/v--> |

### Universal Coupling Constant (ψ)

| Constant | Formula | Value |
|----------|---------|-------|
| ψ (psi) | d_E × amp_E × √m_E (from Earth) | <!--v:psiValue-->3.3069 × 10⁻³<!--/v--> |
| K | e_amp_E × √m_E / (sin(tilt_E) × √d_E) (from Earth) | <!--v:kValue-->3.4143 × 10⁻⁶<!--/v--> |

### J2000 Eccentricities (eccJ2000)

All 8 planets, combining inner planet J2000 values with outer planet pre-dual-balance values:

| Planet | `eccJ2000` | Source |
|--------|-----------|--------|
| Mercury | <!--v:mercuryEccJ2000Full-->0.20563593<!--/v--> | J2000 (same as model) |
| Venus | <!--v:venusEccJ2000Full-->0.00677672<!--/v--> | J2000 (same as model) |
| Earth | <!--v:j2000Eccentricity-->0.01671022<!--/v--> | J2000 (from ASTRO_REFERENCE) |
| Mars | 0.09339410 | J2000 (same as model) |
| Jupiter | <!--v:jupiterEccJ2000Full-->0.04838624<!--/v--> | J2000 (base derived from phase) |
| Saturn | <!--v:saturnEccJ2000Full-->0.05386179<!--/v--> | J2000 (base derived from phase) |
| Uranus | <!--v:uranusEccJ2000Full-->0.04725744<!--/v--> | J2000 (base derived from phase) |
| Neptune | <!--v:neptuneEccJ2000Full-->0.00859048<!--/v--> | J2000 (base derived from phase) |

## Planet Inclination Parameters (from ψ formula)

Amplitudes derived from Fibonacci Laws: `amp = ψ / (d × √m)`. Means from J2000 constraint.
See [Fibonacci Laws](10-fibonacci-laws.md), verified by [Inclination Optimization](../tools/verify/inclination-optimization.js) and [Inclination Verification](../tools/verify/inclination-verification.js).

| Planet | Mean (deg) | Amplitude (deg) | Range (deg) | Phase Angle | ICRF Period |
|--------|----------|---------------|-----------|-------------|-------------|
| Mercury | <!--v:mercuryInclMean-->6.703216<!--/v--> | <!--v:mercuryInclAmp-->0.386488<!--/v--> | 6.32 - 7.09 | <!--v:mercuryInclCycleAnchor-->234.52<!--/v-->° | 8H/93 ≈ <!--v:mercuryPeriPeriodICRF-->28,844<!--/v--> yr |
| Venus | <!--v:venusInclMean-->2.151359<!--/v--> | 0.062165 | 2.09 - 2.21 | <!--v:venusInclCycleAnchor-->218.64<!--/v-->° | 8H/110 ≈ <!--v:venusPeriPeriodICRF-->24,387<!--/v--> yr |
| Earth | <!--v:earthInclMean-->1.48113<!--/v--> | <!--v:earthInclAmp-->0.63605<!--/v--> | 0.85 - 2.12 | <!--v:earthInclCycleAnchor-->21.77<!--/v-->° | H/3 ≈ <!--v:earthPeriPeriodICRF-->111,772<!--/v--> yr |
| Mars | <!--v:marsInclMean-->1.833256<!--/v--> | <!--v:marsInclAmp-->1.164246<!--/v--> | 0.67 - 3.00 | <!--v:marsInclCycleAnchor-->236.07<!--/v-->° | 8H/68 ≈ <!--v:marsPeriPeriodICRF-->39,449<!--/v--> yr |
| Jupiter | <!--v:jupiterInclMean-->0.321086<!--/v--> | <!--v:jupiterInclAmp-->0.021404<!--/v--> | 0.30 - 0.34 | <!--v:jupiterInclCycleAnchor-->287.06<!--/v-->° | 8H/65 ≈ <!--v:jupiterPeriPeriodICRF-->41,270<!--/v--> yr |
| Saturn | <!--v:saturnInclMean-->0.984967<!--/v--> | <!--v:saturnInclAmp-->0.065194<!--/v--> | 0.92 - 1.05 | <!--v:saturnInclCycleAnchor-->116.26<!--/v-->° (anti-phase) | 8H/169 ≈ <!--v:saturnPeriPeriodICRF-->15,873<!--/v--> yr |
| Uranus | <!--v:uranusInclMean-->1.015182<!--/v--> | <!--v:uranusInclAmp-->0.023831<!--/v--> | 0.99 - 1.04 | 21.33° | H/10 ≈ <!--v:uranusPeriPeriodICRF-->33,532<!--/v--> yr |
| Neptune | <!--v:neptuneInclMean-->0.743803<!--/v--> | <!--v:neptuneInclAmp-->0.013551<!--/v--> | 0.73 - 0.76 | <!--v:neptuneInclCycleAnchor-->174.04<!--/v-->° | 2H/25 ≈ <!--v:neptunePeriPeriodICRF-->26,825<!--/v--> yr |
| Pluto | <!--v:plutoInclMean-->15.716200<!--/v--> | <!--v:plutoInclAmp-->0.717024<!--/v--> | 15.00 - 16.43 | <!--v:plutoInclCycleAnchor-->203.32<!--/v-->° | H/12 ≈ <!--v:plutoPeriPeriodICRF-->27,943<!--/v--> yr |

**Formula**: `i(t) = mean + amplitude × cos(ω̃_ICRF(t) - cycleAnchor)` (Saturn: sign flipped, anti-phase)

## Planet Orbital Distances & Periods

| Planet | Orbit Count in H | Distance (AU) | Period (years) |
|--------|-----------------|---------------|----------------|
| Mercury | 1,392,228 | <!--v:mercurySemiMajor-->0.3871<!--/v--> | 0.2408 |
| Venus | 545,059 | <!--v:venusSemiMajor-->0.7233<!--/v--> | 0.6152 |
| Mars | 178,289 | <!--v:marsSemiMajor-->1.5237<!--/v--> | 1.8808 |
| Jupiter | 28,281 | <!--v:jupiterSemiMajor-->5.1996<!--/v--> | 11.8566 |
| Saturn | 11,396 | <!--v:saturnSemiMajor-->9.5310<!--/v--> | 29.4243 |
| Uranus | 4,004 | <!--v:uranusSemiMajor-->19.1408<!--/v--> | 83.7417 |
| Neptune | 2,048 | <!--v:neptuneSemiMajor-->29.9282<!--/v--> | 163.7270 |

## Perihelion Precession Periods (Ecliptic)

| Planet | Formula | Period (years) |
|--------|---------|----------------|
| Mercury | H / (1 + 3/8) | ~<!--v:mercuryPeriPeriod-->243,867<!--/v--> |
| Venus | -8H / 6 | ~-<!--v:venusPeriPeriod-->447,089<!--/v--> (retrograde) |
| Earth | H / 16 | <!--v:periPrecYears-->~20,957<!--/v--> |
| Mars | H × 8/36 | ~<!--v:marsPeriPeriod-->74,515<!--/v--> |
| Jupiter | 8H / 39 | ~<!--v:jupiterPeriPeriod-->68,783<!--/v--> |
| Saturn | -8H / 65 | ~-<!--v:saturnPeriPeriod-->41,270<!--/v--> (retrograde) |
| Uranus | H / 3 | <!--v:inclPrecYears-->~111,772<!--/v--> |
| Neptune | H × 2 | ~<!--v:neptunePeriPeriod-->670,634<!--/v--> |

## Moon Derived Cycles

All Moon cycles are derived from the 3 input months (sidereal, anomalistic, nodal) and H. Integer rounding to `totalDaysInH = H × meanSolarYearDays` ensures exact cycle closure over the Earth Fundamental Cycle.

| Cycle | Variable | Formula | Value (days) |
|-------|----------|---------|-------------|
| Sidereal Month | `moonSiderealMonth` | totalDaysInH / ceil(totalDaysInH / input) | ~27.3217 |
| Anomalistic Month | `moonAnomalisticMonth` | totalDaysInH / ceil(totalDaysInH / input) | ~27.5545 |
| Nodal Month | `moonNodalMonth` | totalDaysInH / ceil(totalDaysInH / input) | ~27.2122 |
| Synodic Month | `moonSynodicMonth` | (from sidereal count - 1 + 13 - H) | ~29.5306 |
| Tropical Month | `moonTropicalMonth` | (from sidereal count - 1 + 13) | ~27.3216 |

| Cycle | Variable | Value (days) | Value (years) |
|-------|----------|-------------|--------------|
| Apsidal Precession (star-referenced) | `moonApsidalPrecessionDaysEarth` | ~3,232.60 | ~8.8506 |
| Apsidal Precession (equinox-of-date) | `moonApsidalPrecessionDaysICRF` | ~3,231.49 | ~8.8475 |
| Nodal Precession (star-referenced) | `moonNodalPrecessionDaysEarth` | ~6,793.43 | ~18.5994 |
| Nodal Precession (equinox-of-date) | `moonNodalPrecessionDaysICRF` | ~6,798.33 | ~18.6132 |

> **Frame note (legacy naming):** the `…ICRF`-named variables hold the EQUINOX-OF-DATE periods (the Meeus/IERS observables) and the `…Earth`-named variables hold the STAR-REFERENCED (inertial) periods — the labels predate the frame audit. The star-referenced periods are reproduced from first principles by the planetary laboratory at ±1×10⁻⁴.
| Apsidal-Nodal Beat | `moonApsidalMeetsNodalDays` | ~206 | — |
| Lunar Leveling Cycle | `moonLunarLevelingCycleDays` | ~61,250 | ~167.7 |
| Draconic Year (ICRF) | `moonDraconicYearICRF` | ~346.620 | — |
| Draconic Year (Earth frame) | `moonDraconicYearEarth` | ~346.597 | — |
| Full Moon Cycle (Earth frame) | `moonFullMoonCycleEarth` | ~<!--v:fullMoonCycleEarth-->411.78<!--/v--> | — |
| Full Moon Cycle (ICRF) | `moonFullMoonCycleICRF` | ~411.86 | — |

Eclipse cycles (from derived months): Saros = 223 synodic ≈ 6585.32 days, Exeligmos = 3 × Saros, Callippic = 940 synodic ≈ 76 solar years.

## Year-Length Fourier Harmonics

Year-length variations are modelled with Fourier harmonics. The **means are derived** from `inputmeanlengthsolaryearindays` via `round(input × H/8) / (H/8)` and the standard sidereal/anomalistic ratios. Only the harmonic coefficients are fitted (from data spanning full H at 1-year steps, 335,318 rows).

Each array entry: `[period_divisor, sin_coeff, cos_coeff]` — period = H / divisor.

| Array | Terms | RMS | Dominant term |
|-------|-------|-----|---------------|
| `TROPICAL_YEAR_HARMONICS` | 12 | 0.002 s | H/8 (obliquity) |
| `SIDEREAL_YEAR_HARMONICS` | 6 | 0.001 s | H/8 + H/3 |
| `ANOMALISTIC_YEAR_HARMONICS` | 8 | 0.002 s | H/18 |

Note: The tropical year's **primary display path** is `TROPICAL_YEAR_HARMONICS` via `computeSolarYearDaysDirect` (Step 6c). The `CARDINAL_POINT_HARMONICS` derivative route (23 harmonics per type + ECC/JOINT/DERIVED families) is kept for chart consistency in cardinal-point report paths.

## Sun Longitude — the certified chain and the legacy harmonics

The certified apparent solar longitude is **assembled, not fitted** (E4/E5
framework-native Sun, `packages/physics/src/model.js`, exported as
`eclipse.frameworkSunDeps`): mean tropical rate + the closed-form f(Y)
year-harmonic drift (scaled by the derived obliquity-torque factors 1.306 /
1.815) + equation of centre with the H/16 + derived-H/3 e(t). It carries
**zero fitted solar constants**; accuracy <!--v:frameworkSunVsJplRms-->0.93<!--/v-->″ RMS vs JPL (modern window; the Meeus Ch. 25 reference: <!--v:meeusCh25SunVsJplRms-->1.22<!--/v-->″).
The scene wheel displays the same longitude via the δ overlay
(δ = λ_certified − λ_twin, clock-convention window). See
[doc 99 § The framework-native Sun](99-expanding-solar-system-resonance-theory.md#the-framework-native-sun-e4e5--the-certified-apparent-solar-longitude).

The **legacy fitted family** remains in the coefficients file and is still
evaluated inside the wheel's legacy stack (superseded on the display path by
the δ overlay):

| Constant | Value | Description |
|----------|-------|-------------|
| `SUN_LONGITUDE_HARMONICS` | 3-term array | Fitted sun-longitude harmonics, ~279″ annual span. RETIRED from the scene display path (FQ-3 exact-Kepler corrector, doc 65); registry entry retained — Step 0 remains its fitter, the D2 completion's PAIRED hash fingerprints it, and the Step-6a instrument still applies it |
| `SUN_LONGITUDE_MEAN` | −0.0018807° | Fitted mean offset (~−6.8″) |

## Earth Perihelion Harmonics

The `PERI_HARMONICS` array models Earth's perihelion longitude with 25 Fourier terms (RMSE 0.0006°, J2000 exact).

| Constant | Value | Description |
|----------|-------|-------------|
| `PERI_HARMONICS` | 25-term array | `[period, sin_coeff, cos_coeff]` per term |
| `PERI_OFFSET` | ~-0.260 deg | Global offset correction (J2000-anchored) |

## Delta-T

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Initial Delta-T | `deltaTStart` | <!--v:deltaTStart-->55.85<!--/v--> s | Long-term ΔT trend value at J2000 (paired with `usno_target_lod_s` = <!--v:usnoLodJ2000-->86,400.0017<!--/v--> at the joint optimum against Espenak). Not the IERS instantaneous observation (63.63 s at J2000) — the trend value passing through J2000, which excludes industrial-era Earth-rotation acceleration our cyclic model doesn't capture. |

## Perihelion Longitude Formula Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Mid-Eccentricity Amplitude | `mideccentricitypointAmplitude` | 2.4587 deg | Amplitude of mid-eccentricity-point variation |
| Helion Point Amplitude | `helionpointAmplitude` | 5.05 deg | Amplitude of perihelion-point variation |

Used by `computeLongitudePerihelion()` to estimate Earth's longitude of perihelion from the balanced year and precession cycle.

---

# Part 3 — External Reference Values

These come from external astronomical sources and do not change with the model.

## Earth J2000 Reference Values

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Obliquity | `obliquityJ2000_arcsec` | <!--v:obliquityJ2000Arcsec-->84381.406<!--/v-->" (<!--v:obliquityJ2000Deg-->23.439279<!--/v--> deg) | IAU 2006 (Capitaine et al. 2003) |
| Obliquity rate | `obliquityRate_arcsecPerCentury` | <!--v:obliquityRateArcsecPerCy-->-46.836769<!--/v-->"/cy | IAU 2006 |
| Obliquity range | - | ~22.1 deg to ~24.5 deg | Laskar 1993 |
| Earth inclination | `earthInclinationJ2000_deg` | <!--v:earthInclJ2000-->1.57869<!--/v--> deg | Astronomical Almanac |
| Earth inclination rate | `earthInclinationRate_arcsecPerCentury` | -18"/cy | Astronomical Almanac |
| Eccentricity | `earthEccentricityJ2000` | <!--v:j2000Eccentricity-->0.01671022<!--/v--> | JPL Horizons |
| Long. of perihelion | `earthPerihelionLongitudeJ2000` | <!--v:earthPerihelionLongitudeJ2000-->102.947<!--/v--> deg | JPL Horizons |
| Perihelion passage J2000 | `perihelionRefJD` | <!--v:perihelionPassageJD-->2451547.042<!--/v--> | USNO (2000 Jan 3 13:00 UTC) |
| IAU precession period | `iauPrecessionJ2000` | <!--v:iauPrecessionInputYears-->25,770.73<!--/v--> years | IAU 2006 rate re-expressed on the model day basis (published exact: 25,771.57634 yr) |
| June Solstice 2000 JD | `juneSolstice2000_JD` | <!--v:juneSolstice2000JD-->2451716.575<!--/v--> | USNO (June 21, 2000 01:48 UTC) |

## Year & Day Lengths (J2000)

| Constant | Variable | Value | Source |
|----------|----------|-------|--------|
| Tropical year (mean) | `tropicalYearMeanJ2000` | <!--v:tropicalYearMeanJ2000Days-->365.2421897<!--/v--> days | Meeus & Savoie 1992 |
| Tropical year (VE) | `tropicalYearVEJ2000` | <!--v:tropicalYearVEJ2000Days-->365.242374<!--/v--> days | Meeus & Savoie 1992 |
| Tropical year (SS) | `tropicalYearSSJ2000` | <!--v:tropicalYearSSJ2000Days-->365.241626<!--/v--> days | Meeus & Savoie 1992 |
| Tropical year (AE) | `tropicalYearAEJ2000` | <!--v:tropicalYearAEJ2000Days-->365.242018<!--/v--> days | Meeus & Savoie 1992 |
| Tropical year (WS) | `tropicalYearWSJ2000` | 365.242740 days | Meeus & Savoie 1992 |
| Tropical year rate | `tropicalYearRateSecPerCentury` | -0.53 s/cy | Meeus & Savoie 1992 |
| Anomalistic year | `anomalisticYearJ2000` | <!--v:anomalisticYearInputDays-->365.259636<!--/v--> days | JPL Horizons |
| Sidereal year | `siderealYearJ2000` | <!--v:siderealYearInputDays-->365.256363004<!--/v--> days | JPL Horizons (adjusted for LOD=86400) |
| Solar day | `solarDayJ2000` | 86400.0 s | SI definition |
| Sidereal day | `siderealDayJ2000` | 86164.09053083288 s (~23h 56m 4.0905s) | IERS |
| Stellar day | `stellarDayJ2000` | 86164.0989036905 s (~23h 56m 4.0989s) | IERS |

## Coin Rotation Offsets (Derived)

These offsets arise from the coin rotation paradox — precessing reference frames cause systematic measurement biases that cancel with multi-angle averaging.

| Constant | Variable | Formula | Value |
|----------|----------|---------|-------|
| Perihelion Coin Rotation | `perihelionCoinRotationMs` | meanlengthofday / (H/16) / meansolaryearlengthinDays × 1000 | ~11.29 ms/day |
| Yearly accumulation | `perihelionCoinRotationYearlySeconds` | offset × meansolaryearlengthinDays | ~4.12 s/year |
| Axial Coin Rotation | `axialCoinRotationMs` | meanSiderealday / (H/13) / (meansolaryearlengthinDays + 1) × 1000 | ~9.12 ms/sidereal day |
| Yearly accumulation | `axialCoinRotationYearlySeconds` | offset × (meansolaryearlengthinDays + 1) | ~3.34 s/year |

**Perihelion Coin Rotation**: Theoretical value derived from 1 extra solar day per H/16 cycle.

**Axial Coin Rotation**: Axial precession (H/13) accumulates exactly 1 extra sidereal day over one axial precession cycle — 9.12 ms per sidereal day. This is a count on the **ecliptic** lattice and is deliberately *not* projected. It is **not** the physical stellar−sidereal day offset, which is the same rate projected onto the **equator** (precession in right ascension, m = p·cos ε) and is therefore ~8.37 ms. See [Year and Day Length Formulas](11-length-day-year-formulas.md) for details.

## Moon Constants (External)

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Sidereal Month | `moonSiderealMonthInput` | <!--v:moonSiderealMonthInput-->27.32166156<!--/v--> days | Return to same star |
| Anomalistic Month | `moonAnomalisticMonthInput` | 27.55454988 days | Perigee to perigee |
| Nodal Month | `moonNodalMonthInput` | 27.21222082 days | Node to node |
| Mean Distance | `moonDistance` | <!--v:moonOrbitalRadius-->384,399.07<!--/v--> km | Mean Earth-Moon distance |
| Orbital Eccentricity | `moonOrbitalEccentricity` | <!--v:moonOrbitalEccentricityFull-->0.054900489<!--/v--> | |
| Ecliptic Inclination | `moonEclipticInclinationJ2000` | <!--v:moonEclipticInclination-->5.1573<!--/v--> deg | Dynamical mean osculating inclination (v4 E3c); the Brown/ELP theory constant <!--v:moonInclinationConstantBrownELP-->5.1453964<!--/v--> (latitude sinF normalization) is kept as `moonInclinationConstantBrownELP` |
| Moon Tilt | `moonTilt` | <!--v:moonAxialTilt-->6.687<!--/v--> deg | |

### Lunar Mean Longitude Coefficients (Meeus Ch. 47)

| Constant | Variable | Value |
|----------|----------|-------|
| Moon Mean Anomaly J2000 | `moonMeanAnomalyJ2000_deg` | <!--v:moonMeanAnomalyJ2000Deg-->134.9634<!--/v--> deg |
| Moon Mean Anomaly Rate | `moonMeanAnomalyRate_degPerDay` | <!--v:moonMeanAnomalyRateDegPerDay-->13.06499295<!--/v--> |
| Moon Mean Elongation J2000 | `moonMeanElongationJ2000_deg` | <!--v:moonMeanElongationJ2000Deg-->297.8502<!--/v--> deg |
| Moon Mean Elongation Rate | `moonMeanElongationRate_degPerDay` | <!--v:moonMeanElongationRateDegPerDay-->12.19074912<!--/v--> |
| Moon Mean Elongation J2000 (full) | `moonMeanElongationJ2000Full_deg` | <!--v:moonMeanElongationJ2000FullDeg-->297.8502042<!--/v--> deg |
| Moon Mean Elongation Rate | `moonMeanElongationRate_degPerCentury` | <!--v:moonMeanElongationRateDegPerCentury-->445267.1115168<!--/v--> |
| Moon Arg. of Latitude J2000 | `moonArgLatJ2000_deg` | <!--v:moonArgLatJ2000Deg-->93.2720993<!--/v--> deg |
| Moon Arg. of Latitude Rate | `moonArgLatRate_degPerCentury` | <!--v:moonArgLatRateDegPerCentury-->483202.0175273<!--/v--> |
| Sun Mean Anomaly J2000 | `sunMeanAnomalyJ2000_deg` | <!--v:sunMeanAnomalyJ2000Deg-->357.5291<!--/v--> deg |
| Sun Mean Anomaly Rate | `sunMeanAnomalyRate_degPerDay` | <!--v:sunMeanAnomalyRateDegPerDay-->0.98560028<!--/v--> |

The per-day rates are used for EoC phase computation; the per-century rates are used for the Meeus Ch. 47 ecliptic latitude correction (see [Moon Meeus Corrections](66-moon-meeus-corrections.md)).

## Planet J2000 Orbital Elements

### Eccentricities & Longitudes of Perihelion

| Planet | Eccentricity (J2000) | Long. Perihelion (deg) | Source |
|--------|---------------------|----------------------|--------|
| Mercury | <!--v:mercuryEccJ2000Full-->0.20563593<!--/v--> | <!--v:mercuryPeriLongJ2000Full-->77.4569131<!--/v--> | JPL J2000 |
| Venus | <!--v:venusEccJ2000Full-->0.00677672<!--/v--> | <!--v:venusPeriLongJ2000Full-->131.5765919<!--/v--> | JPL J2000 |
| Mars | 0.09339410 | <!--v:marsPeriLongJ2000Full-->336.0650681<!--/v--> | JPL J2000 |
| Jupiter | <!--v:jupiterEccJ2000Full-->0.04838624<!--/v--> | <!--v:jupiterPeriLongJ2000Full-->14.70659401<!--/v--> | JPL J2000 |
| Saturn | <!--v:saturnEccJ2000Full-->0.05386179<!--/v--> | <!--v:saturnPeriLongJ2000Full-->92.12794343<!--/v--> | JPL J2000 |
| Uranus | <!--v:uranusEccJ2000Full-->0.04725744<!--/v--> | <!--v:uranusPeriLongJ2000Full-->170.7308251<!--/v--> | JPL J2000 |
| Neptune | <!--v:neptuneEccJ2000Full-->0.00859048<!--/v--> | <!--v:neptunePeriLongJ2000Full-->45.80124471<!--/v--> | JPL J2000 |

### Ecliptic Inclinations & Ascending Nodes

| Planet | Inclination (deg) | Ascending Node (deg) | Source |
|--------|------------------|---------------------|--------|
| Mercury | <!--v:mercuryEclInclJ2000Full-->7.00497902<!--/v--> | <!--v:mercuryAscNodeEclJ2000-->48.33033155<!--/v--> | JPL/SPICE |
| Venus | <!--v:venusEclInclJ2000Full-->3.39467605<!--/v--> | <!--v:venusAscNodeEclJ2000-->76.67877109<!--/v--> | JPL/SPICE |
| Mars | <!--v:marsEclInclJ2000Full-->1.84969142<!--/v--> | <!--v:marsAscNodeEclJ2000-->49.55737662<!--/v--> | JPL/SPICE |
| Jupiter | <!--v:jupiterEclInclJ2000Full-->1.30439695<!--/v--> | <!--v:jupiterAscNodeEclJ2000-->100.4877868<!--/v--> | JPL/SPICE |
| Saturn | <!--v:saturnEclInclJ2000Full-->2.48599187<!--/v--> | <!--v:saturnAscNodeEclJ2000-->113.6452856<!--/v--> | JPL/SPICE |
| Uranus | <!--v:uranusEclInclJ2000Full-->0.77263783<!--/v--> | <!--v:uranusAscNodeEclJ2000-->74.00919023<!--/v--> | JPL/SPICE |
| Neptune | <!--v:neptuneEclInclJ2000Full-->1.77004347<!--/v--> | <!--v:neptuneAscNodeEclJ2000-->131.7853754<!--/v--> | JPL/SPICE |
| Pluto | <!--v:plutoEclInclJ2000Full-->17.14001<!--/v--> | <!--v:plutoAscNodeEclJ2000-->110.30393<!--/v--> | JPL Horizons |
| Moon | <!--v:moonEclipticInclination-->5.1573<!--/v--> (dynamical mean osc; theory constant <!--v:moonInclinationConstantBrownELP-->5.1453964<!--/v-->) | — | — |

### Ecliptic Inclination Trend Rates

JPL publishes these trends in the **J2000-fixed** ecliptic frame ("mean ecliptic and equinox of J2000"). The model error column below is the difference between the model's J2000-fixed-frame trend and JPL's catalog value, after the 2026-04-09 audit re-fit `ascendingNodeCyclesIn8H` and the n=7 phase anchor.

| Planet | Rate (deg/century) | Direction | Model Error |
|--------|------------------|-----------|-------------|
| Mercury | <!--v:mercuryEclInclTrendDegPerCy-->-0.00595<!--/v--> | Decreasing | ~0.4"/cy |
| Venus | <!--v:venusEclInclTrendDegPerCy-->-0.00079<!--/v--> | Decreasing | ~1.7"/cy |
| Mars | <!--v:marsEclInclTrendDegPerCy-->-0.00813<!--/v--> | Decreasing | ~0.4"/cy |
| Jupiter | <!--v:jupiterEclInclTrendDegPerCy-->-0.00184<!--/v--> | Decreasing | ~0.0"/cy |
| Saturn | **+<!--v:saturnEclInclTrendDegPerCy-->0.00194<!--/v-->** | **Increasing** | ~1.7"/cy |
| Uranus | <!--v:uranusEclInclTrendDegPerCy-->-0.00243<!--/v--> | Decreasing | ~0.1"/cy |
| Neptune | **+<!--v:neptuneEclInclTrendDegPerCy-->0.00035<!--/v-->** | **Increasing** | ~0.0"/cy |
| Pluto | -0.00100 | Decreasing | (not fitted) |

**Source**: [JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html)

**Note**: All 7 fitted planets now match JPL trend direction in the J2000-fixed frame. Total trend error is ~4.3″/century across the 7 planets. See [32-inclination-calculations.md § Two Frames](32-inclination-calculations.md#two-frames--be-careful-which-one-you-mean) for the frame distinction. Model errors verified by [Inclination Verification](../tools/verify/inclination-verification.js).

### Mean & True Anomaly at J2000

| Planet | Mean Anomaly (deg) | True Anomaly (deg) | Source |
|--------|-------------------|-------------------|--------|
| Mercury | <!--v:mercuryMeanAnomalyJ2000-->156.6364301<!--/v--> | <!--v:mercuryTrueAnomalyJ2000-->164.1669319<!--/v--> | JPL J2000 |
| Venus | <!--v:venusMeanAnomalyJ2000-->324.9668371<!--/v--> | <!--v:venusTrueAnomalyJ2000-->324.5198504<!--/v--> | JPL J2000 |
| Mars | <!--v:marsMeanAnomalyJ2000-->109.2630844<!--/v--> | <!--v:marsTrueAnomalyJ2000-->118.9501056<!--/v--> | JPL J2000 |
| Jupiter | <!--v:jupiterMeanAnomalyJ2000-->32.47179744<!--/v--> | <!--v:jupiterTrueAnomalyJ2000-->35.69428061<!--/v--> | JPL J2000 |
| Saturn | <!--v:saturnMeanAnomalyJ2000-->325.663876<!--/v--> | <!--v:saturnTrueAnomalyJ2000-->321.7910116<!--/v--> | JPL J2000 |
| Uranus | <!--v:uranusMeanAnomalyJ2000-->145.7292678<!--/v--> | <!--v:uranusTrueAnomalyJ2000-->148.5142459<!--/v--> | JPL J2000 |
| Neptune | <!--v:neptuneMeanAnomalyJ2000-->262.5003424<!--/v--> | <!--v:neptuneTrueAnomalyJ2000-->261.2242728<!--/v--> | JPL J2000 |
| Pluto | 15.55009 | 26.31965048 | JPL J2000 |

### Axial Tilts

| Body | Value (deg) | Source |
|------|-----------|--------|
| Sun | 7.155 | IAU |
| Mercury | <!--v:mercuryAxialTiltJ2000-->0.03<!--/v--> | IAU |
| Venus | <!--v:venusAxialTiltJ2000-->2.6392<!--/v--> | IAU (retrograde rotation) |
| Mars | <!--v:marsAxialTiltJ2000-->25.19<!--/v--> | IAU |
| Jupiter | <!--v:jupiterAxialTiltJ2000-->3.13<!--/v--> | IAU |
| Saturn | <!--v:saturnAxialTiltJ2000-->26.73<!--/v--> | IAU |
| Uranus | <!--v:uranusAxialTiltJ2000-->82.23<!--/v--> | IAU (near-sideways) |
| Neptune | <!--v:neptuneAxialTiltJ2000-->28.32<!--/v--> | IAU |
| Pluto | 57.47 | IAU |

## Invariable Plane — Souami & Souchay (2012)

### Inclinations

| Planet | J2000 Value (deg) | Source |
|--------|------------------|--------|
| Mercury | <!--v:mercuryInclJ2000-->6.3472858<!--/v--> | S&S 2012 |
| Venus | <!--v:venusInclJ2000-->2.1545441<!--/v--> | S&S 2012 |
| Earth | 1.57866663 | S&S 2012 |
| Mars | <!--v:marsInclJ2000-->1.6311858<!--/v--> | S&S 2012 |
| Jupiter | <!--v:jupiterInclJ2000-->0.3219652<!--/v--> | S&S 2012 |
| Saturn | <!--v:saturnInclJ2000-->0.9254704<!--/v--> | S&S 2012 |
| Uranus | <!--v:uranusInclJ2000-->0.9946692<!--/v--> | S&S 2012 |
| Neptune | <!--v:neptuneInclJ2000-->0.7354155<!--/v--> | S&S 2012 |
| Pluto | <!--v:plutoInclJ2000-->15.5639473<!--/v--> | S&S 2012 (adjusted) |

### Ascending Nodes (S&S original values)

| Planet | Value (deg) | Source |
|--------|-----------|--------|
| Earth | <!--v:earthAscNodeJ2000-->284.51<!--/v--> | S&S 2012 |
| Mercury | 32.22 | S&S 2012 |
| Venus | 52.31 | S&S 2012 |
| Mars | <!--v:marsOmegaSS-->352.95<!--/v--> | S&S 2012 |
| Jupiter | <!--v:jupiterOmegaSS-->306.92<!--/v--> | S&S 2012 |
| Saturn | <!--v:saturnOmegaSS-->122.27<!--/v--> | S&S 2012 |
| Uranus | <!--v:uranusOmegaSS-->308.44<!--/v--> | S&S 2012 |
| Neptune | <!--v:neptuneOmegaSS-->189.28<!--/v--> | S&S 2012 |
| Pluto | <!--v:plutoOmegaSS-->107.06<!--/v--> | S&S 2012 |
| Ceres | 80.89 | S&S 2012 |

## Perihelion Precession Rates (1900–2100)

Observed linear trend rates from JPL SPICE/WebGeoCalc. These fluctuate over time and are not valid for long-term predictions.

| Planet | Rate (arcsec/cy) | Range | Source |
|--------|-----------------|-------|--------|
| Mercury | ~570 | single value | JPL SPICE |
| Venus | ~0 | single value | JPL SPICE |
| Earth | 1,164 (heliocentric; 6,186 wrt equinox) | single value | JPL SPICE |
| Mars | ~1550–1650 | min–max | JPL SPICE |
| Jupiter | ~800–1800 | min–max | JPL SPICE |
| Saturn | ~-3400 to -2000 | retrograde | JPL SPICE |
| Uranus | ~1100–1300 | min–max | JPL SPICE |
| Neptune | ~-200 to 200 | min–max | JPL SPICE |

## Laplace-Lagrange Inclination Bounds

Theoretical orbital inclination ranges from secular perturbation theory.

| Planet | Min (deg) | Max (deg) | Source |
|--------|----------|----------|--------|
| Mercury | 4.57 | 9.86 | Farside Table 10.4 |
| Venus | 0.00 | 3.38 | Farside Table 10.4 |
| Earth | 0.00 | 2.95 | Farside Table 10.4 |
| Mars | 0.00 | 5.84 | Farside Table 10.4 |
| Jupiter | 0.241 | 0.489 | Farside Table 10.4 |
| Saturn | 0.797 | 1.02 | Farside Table 10.4 |
| Uranus | 0.902 | 1.11 | Farside Table 10.4 |
| Neptune | 0.554 | 0.800 | Farside Table 10.4 |

**Source**: [Farside physics textbook (Brouwer & van Woerkom)](https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html)

### Inclination Cycle Anchors

Each planet has a per-planet cycle anchor (ICRF perihelion longitude where the planet reaches MAX inclination, evaluated at one of the eight balanced-year anchors). After the 2026-04-09 audit, the seven fitted planets share anchor n=7 (≈ -<!--v:systemResetYearBC-->2,649,854 BC<!--/v-->, the start of the current Solar System Resonance Cycle); Earth is locked to its IAU-derived n=0 reference.

| Planet | Cycle Anchor | Balanced Year | Notes |
|--------|-------------|--------|-------|
| Mercury | <!--v:mercuryInclCycleAnchor-->234.52<!--/v-->° | n=7 | |
| Venus | <!--v:venusInclCycleAnchor-->218.64<!--/v-->° | n=7 | |
| Earth | 21.77° | n=0 | locked, IAU reference |
| Mars | <!--v:marsInclCycleAnchor-->236.07<!--/v-->° | n=7 | |
| Jupiter | <!--v:jupiterInclCycleAnchor-->287.06<!--/v-->° | n=7* | |
| Saturn | <!--v:saturnInclCycleAnchor-->116.26<!--/v-->° | n=7* | anti-phase |
| Uranus | 21.33° | n=7* | |
| Neptune | <!--v:neptuneInclCycleAnchor-->174.04<!--/v-->° | n=7 | |
| Pluto | <!--v:plutoInclCycleAnchor-->203.32<!--/v-->° | — | not fitted |

\* Jupiter, Saturn, and Uranus have ICRF periods that divide H exactly; their phase at n=7 numerically coincides with their phase at n=0 (and any other anchor).

The eigenmode-cluster claim from earlier model versions (cycle anchors ≈ Laplace-Lagrange γ₁–γ₈) no longer holds in detail under the n=7 anchor — the alignment was specific to the n=0 anchor set. See [10-fibonacci-laws.md § Phase Groups](10-fibonacci-laws.md#phase-groups).

The `EIGENMODE_PHASES` array in `script.js` provides Laplace-Lagrange reference values:

| Value | Label | Source |
|-------|-------|--------|
| 202.8° | γ₈ | Farside Table 10.1 |
| 20.23° | γ₁ | Farside Table 10.1 |
| 255.6° | γ₃ | Farside Table 10.1 |
| 296.9° | γ₄ | Farside Table 10.1 |
| 127.3° | γ₆ | Farside Table 10.1 |
| 315.6° | γ₇ | Farside Table 10.1 |
| 318.3° | γ₂ | Farside Table 10.1 |

f₅ = 0 (invariable plane, no evolution) is excluded — 7 active Laplace-Lagrange modes remain.

## Minor Bodies

### Pluto

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Orbital Period | `solarYearInput` | <!--v:plutoOrbitalPeriodInputDays-->90,465<!--/v--> days | JPL Horizons |
| Eccentricity | `orbitalEccentricityBase` | <!--v:plutoEccJ2000Full-->0.2488273<!--/v--> | JPL Horizons |
| Long. Perihelion | `longitudePerihelion` | <!--v:plutoPeriLongJ2000Full-->224.06891<!--/v--> deg | JPL Horizons |
| Sun/Pluto Mass Ratio | `MASS_RATIO_SUN_PLUTO` | <!--v:plutoMassRatioDE440-->136,045,556<!--/v--> | DE440 |
| GM | `GM_PLUTO_ALONE` | ~870 km³/s² | Pluto alone (matches Wikipedia / DE440 BODY999). System value ~975.5 km³/s² also stored as `GM_PLUTO_SYSTEM`. |

### Halley's Comet

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | <!--v:halleysEclInclJ2000Full-->162.26269<!--/v--> deg | JPL (retrograde orbit) |
| Ascending Node (Ecliptic) | `ascendingNode` | <!--v:halleysAscNodeEclJ2000-->58.42008<!--/v--> deg | JPL Horizons |
| Orbital Period | `solarYearInput` | <!--v:halleysOrbitalPeriodInputDays-->27,503<!--/v--> days | JPL |
| Eccentricity | `orbitalEccentricityBase` | <!--v:halleysEccJ2000Full-->0.96714291<!--/v--> | JPL |
| Long. Perihelion | `longitudePerihelion` | <!--v:halleysPeriLongJ2000Full-->111.33249<!--/v--> deg | JPL Horizons |
| Mass | `M_HALLEYS` | ~2.2 × 10¹⁴ kg | Estimated (~11×8×8 km, ~0.6 g/cm³) |

### Eros

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | 10.82760 deg | JPL Horizons |
| Ascending Node (Ecliptic) | `ascendingNode` | <!--v:erosAscNodeEclJ2000-->304.30993<!--/v--> deg | JPL Horizons |
| Orbital Period | `solarYearInput` | <!--v:erosOrbitalPeriodInputDays-->642.93<!--/v--> days | JPL |
| Eccentricity | `orbitalEccentricityBase` | <!--v:erosEccJ2000Full-->0.2229512<!--/v--> | JPL |
| Long. Perihelion | `longitudePerihelion` | <!--v:erosPeriLongJ2000Full-->178.81322<!--/v--> deg | JPL Horizons |
| Mass | `M_EROS` | 6.687 × 10¹⁵ kg | NEAR Shoemaker (2000–2001) |

### Ceres

| Parameter | Variable | Value | Source |
|-----------|----------|-------|--------|
| Ecliptic Inclination | `eclipticInclinationJ2000` | <!--v:ceresEclInclJ2000Full-->10.59407<!--/v--> deg | JPL Horizons |
| Inv. Plane Inclination | `invPlaneInclinationJ2000` | <!--v:ceresInvPlaneInclJ2000-->0.4331698<!--/v--> deg | S&S 2012 |
| Ascending Node (Ecliptic) | `ascendingNode` | <!--v:ceresAscNodeEclJ2000-->80.30533<!--/v--> deg | JPL Horizons |
| Orbital Period | `solarYearInput` | <!--v:ceresOrbitalPeriodInputDays-->1,680.5<!--/v--> days | JPL |
| Eccentricity | `orbitalEccentricityBase` | <!--v:ceresEccJ2000Full-->0.0755347<!--/v--> | JPL |
| Long. Perihelion | `longitudePerihelion` | <!--v:ceresPeriLongJ2000Full-->73.59769<!--/v--> deg | JPL Horizons |
| Orbit Distance | `orbitDistanceOverride` | 2.76596 AU | JPL Horizons |
| GM | `GM_CERES` | 62.6274 km³/s² | Dawn spacecraft (2015–2018) |

---

# Part 4 — Tuned/Optimized Parameters

These values result from the optimization campaign (2025-2026) and may change in future campaigns. For the optimization process and history, see [Optimization Tool Overview](60-optimization-tool-overview.md) and [Optimization Execution Plan](61-optimization-execution-plan.md).

## Sun / Earth Tuned Parameters

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Correction Sun | `correctionSun` | <!--v:correctionSunDeg-->0.49688<!--/v--> deg | Degree correction for Sun position (dynamic EoC); optimizer step 1 |

## Planet Orbital Periods (Tuned)

| Planet | Variable | Value (days) |
|--------|----------|-------------|
| Mercury | `solarYearInput` | <!--v:mercuryOrbitalPeriodInputDays-->87.9683<!--/v--> |
| Venus | `solarYearInput` | <!--v:venusOrbitalPeriodInputDays-->224.695<!--/v--> |
| Mars | `solarYearInput` | <!--v:marsOrbitalPeriodInputDays-->686.93<!--/v--> |
| Jupiter | `solarYearInput` | <!--v:jupiterOrbitalPeriodInputDays-->4330.53<!--/v--> |
| Saturn | `solarYearInput` | <!--v:saturnOrbitalPeriodInputDays-->10747<!--/v--> |
| Uranus | `solarYearInput` | <!--v:uranusOrbitalPeriodInputDays-->30586<!--/v--> |
| Neptune | `solarYearInput` | <!--v:neptuneOrbitalPeriodInputDays-->59800<!--/v--> |

Values from `astro-reference.json`. These are the official JPL solar year periods.

## Planet Orbital Eccentricities (Base)

Base eccentricities represent the long-term oscillation midpoint. They are derived at runtime from the balanced-year phase (same principle as Earth). The eccentricity balance (Law 5) emerges naturally at ~99.9%.

Note: these values are computed at runtime by constants.js — not stored in JSON.

## Planet Eccentricity Amplitudes & Coupling Constant

Eccentricity oscillation amplitudes from the tilt formula: `e_amp = K × sin(tilt) × √d / (√m × a^(3/2))`. See [doc 36 §4-5](36-tilt-and-definitive-balance-calculations.md).

| Constant | Formula | Value | Description |
|----------|---------|-------|-------------|
| K | e_amp × √m × a^1.5 / (sin(tiltMean) × √d) | <!--v:kValue-->3.4143 × 10⁻⁶<!--/v--> | Universal eccentricity amplitude constant (from Earth) |

All 8 planet amplitudes are derived at runtime from K using model mean obliquity:
`e_amp = K × sin(meanObliquity) × √d / (√m × a^1.5)`. See [The Closed Loop](72-the-closed-loop.md).

## Planet Eccentricity Phase Constants (J2000)

Phase angles for the eccentricity oscillation are now derived at runtime from the balanced-year phase: `phase = (2000 - balancedYear) / wobblePeriod × 360°`. Earth's phase is independently determined by the Sun optimizer. The phases are no longer stored in JSON — they are computed by constants.js and script.js (section E2d).

## Per-Planet EoC Fractions

The Equation of Center fraction determines how much of a planet's Keplerian variable-speed behavior is captured by the EoC formula vs the geometric offset. See [Equation of Center](65-equation-of-center.md).

| Planet | `eocFraction` | Type | Description |
|--------|--------------|------|-------------|
| Mercury | <!--v:mercuryEocFraction-->-0.527<!--/v--> | I | Negative (inferior planet geometry) |
| Venus | <!--v:venusEocFraction-->0.436<!--/v--> | I | Below geometric 0.50 |
| Mars | <!--v:marsEocFraction-->-0.066224<!--/v--> | II | Near-zero (Earth-crossing) |
| Jupiter | <!--v:jupiterEocFraction-->0.495<!--/v--> | III | Near geometric prediction of 0.50 |
| Saturn | <!--v:saturnEocFraction-->0.54<!--/v--> | III | Above 0.50 |
| Uranus | <!--v:uranusEocFraction-->0.53<!--/v--> | III | Above 0.50 |
| Neptune | <!--v:neptuneEocFraction-->0.585<!--/v--> | III | Above 0.50 |

## Planet Angle Corrections & Start Positions (Tuned)

| Planet | `angleCorrection` (deg) | `startpos` (deg) |
|--------|------------------------|------------------|
| Mercury | <!--v:mercuryAngleCorrectionDeg-->0.971596<!--/v--> | <!--v:mercuryStartPosDeg-->83.65<!--/v--> |
| Venus | <!--v:venusAngleCorrectionDeg-->-2.750621<!--/v--> | <!--v:venusStartPosDeg-->249.29<!--/v--> |
| Mars | <!--v:marsAngleCorrectionDeg-->-2.110263<!--/v--> | <!--v:marsStartPosDeg-->121.46<!--/v--> |
| Jupiter | <!--v:jupiterAngleCorrectionDeg-->0.930611<!--/v--> | <!--v:jupiterStartPosDeg-->13.89<!--/v--> |
| Saturn | <!--v:saturnAngleCorrectionDeg-->-0.178873<!--/v--> | <!--v:saturnStartPosDeg-->11.28<!--/v--> |
| Uranus | <!--v:uranusAngleCorrectionDeg-->-0.732907<!--/v--> | <!--v:uranusStartPosDeg-->44.90<!--/v--> |
| Neptune | <!--v:neptuneAngleCorrectionDeg-->2.332348<!--/v--> | <!--v:neptuneStartPosDeg-->47.96<!--/v--> |

## J2000-Verified Ascending Nodes (Optimized)

Calibrated to reproduce exact J2000 ecliptic inclinations (optimized by [Ascending Node Optimization](../tools/verify/ascending-node-optimization.js)):

| Planet | `ascendingNodeInvPlane` | Delta from S&S |
|--------|------------------------|--------------|
| Earth | <!--v:earthAscNodeJ2000-->284.51<!--/v--> | 0.00 deg (S&S 2012) |
| Mercury | 32.83 | +0.61 deg |
| Venus | 54.70 | +2.39 deg |
| Mars | <!--v:marsOmegaJ2000-->354.87<!--/v--> | +1.92 deg |
| Jupiter | <!--v:jupiterOmegaJ2000-->312.89<!--/v--> | +5.97 deg |
| Saturn | <!--v:saturnOmegaJ2000-->118.81<!--/v--> | -3.46 deg |
| Uranus | <!--v:uranusOmegaJ2000-->307.80<!--/v--> | -0.64 deg |
| Neptune | <!--v:neptuneOmegaJ2000-->192.04<!--/v--> | +2.76 deg |
| Pluto | <!--v:plutoOmegaJ2000-->101.06<!--/v--> | -6.00 deg |

See [34-j2000-calibration.md](34-j2000-calibration.md) for the methodology.
**Verification**: [Ascending Node Verification](../tools/verify/ascending-node-verification.js) verifies correct J2000 ecliptic inclinations. [Ascending Node Souami-Souchay](../tools/verify/ascending-node-souami-souchay.js) compares S&S vs Verified values.

## Planet Perihelion Reference Dates (Phase-Optimized)

| Planet | `perihelionRef_JD` | Notes |
|--------|-------------------|-------|
| Mercury | 2460335.9 | Phase-optimized |
| Venus | 2455464.42 | Re-optimized with 42p correction |
| Mars | 2456505.6 | Re-optimized with Dec correction |
| Jupiter | 2464224.5 | Phase-optimized (-6 deg from 2023-Jan-21) |
| Saturn | 2452875.9 | Phase-optimized (+1 deg from 2003-Jul-26) |
| Uranus | 2439699.8 | Phase-optimized (+5 deg from 1966-May-20) |
| Neptune | 2409432.4 | Phase-optimized (+17 deg from 1876-Aug-27) |

## Moon Start Positions (Tuned)

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Apsidal Start | `moonStartposApsidal` | <!--v:moonStartposApsidalDeg-->347.5476<!--/v--> deg | Apsidal precession start |
| Nodal Start | `moonStartposNodal` | <!--v:moonStartposNodalDeg-->64.0435<!--/v--> deg | Nodal precession start |
| Moon Start | `moonStartposMoon` | <!--v:moonStartposMoonDeg-->67.8443<!--/v--> deg | Orbital position start |

## Parallax Correction Tiers

Per-planet empirical parallax correction for geocentric RA and Dec. Coefficients stored in `ASTRO_REFERENCE.raCorrection` and `ASTRO_REFERENCE.decCorrection` in `tools/lib/constants.js`.

| Planet | RA Parameters | Dec Parameters | Total | Selection |
|--------|-------------|---------------|-------|-----------|
| Mercury | 42 | 42 | 84 | Full 42p tier |
| Venus | 42 | 42 | 84 | Full 42p tier |
| Mars | 30 | 30 | 60 | 30p tier |
| Jupiter | 42 | 42 | 84 | Full 42p tier |
| Saturn | 36 | 36 | 72 | 36p tier |
| Uranus | 24 | 24 | 48 | 24p tier |
| Neptune | 24 | 24 | 48 | 24p tier |

Tier selection by per-planet LOOCV/k-fold cross-validation. See [Planet Parallax Corrections](67-planet-parallax-corrections.md).

## Predictive Planet Parameters (`PREDICT_PLANETS`)

Per-planet configuration for the predictive perihelion precession formula:

| Planet | Period Formula | Theta0 (deg) | Baseline (arcsec/cy) |
|--------|---------------|---------------|---------------------|
| Mercury | H × 8/11 | <!--v:mercuryPeriLongJ2000Full-->77.4569131<!--/v--> | <!--v:arcsecInCircle-->1,296,000<!--/v-->/period×100 |
| Venus | -8H / 6 | <!--v:venusPeriLongJ2000Full-->131.5765919<!--/v--> | -<!--v:arcsecInCircle-->1,296,000<!--/v-->/period×100 (retrograde) |
| Mars | 8H / 36 | <!--v:marsPeriLongJ2000Full-->336.0650681<!--/v--> | <!--v:arcsecInCircle-->1,296,000<!--/v-->/period×100 |
| Jupiter | 8H / 39 | <!--v:jupiterPeriLongJ2000Full-->14.70659401<!--/v--> | <!--v:arcsecInCircle-->1,296,000<!--/v-->/period×100 |
| Saturn | -8H / 65 | <!--v:saturnPeriLongJ2000Full-->92.12794343<!--/v--> | -<!--v:arcsecInCircle-->1,296,000<!--/v-->/period×100 (retrograde) |
| Uranus | H / 3 | <!--v:uranusPeriLongJ2000Full-->170.7308251<!--/v--> | <!--v:arcsecInCircle-->1,296,000<!--/v-->/period×100 |
| Neptune | H × 2 | <!--v:neptunePeriLongJ2000Full-->45.80124471<!--/v--> | <!--v:arcsecInCircle-->1,296,000<!--/v-->/period×100 |

### Predictive Normalization Constants

| Constant | Variable | Value | Description |
|----------|----------|-------|-------------|
| Obliquity mean | `PREDICT_OBLIQ_MEAN` | 23.414 deg | Normalization center for obliquity features |
| Eccentricity base | `PREDICT_ECC_BASE` | 0.015321 | Training normalization (frozen at training-time value) |
| Eccentricity amplitude | `PREDICT_ECC_AMP` | 0.0014226 | Training normalization (frozen at training-time value) |
| Eccentricity mean | `PREDICT_ECC_MEAN` | sqrt(base² + amp²) ≈ <!--v:earthEccBase-->0.01539<!--/v--> | Normalization center |

### Predictive Coefficients (`PREDICT_COEFFS`)

7 arrays of 429 trained coefficients each, one per planet. These are the regression weights from the Python training pipeline (`tools/lib/python/coefficients/*_coeffs_unified.py`). The dot product of the 429-term feature vector with the coefficient array gives the geocentric precession fluctuation above/below the heliocentric baseline.

---

## References

### Primary Source

- **Souami, D. & Souchay, J. (2012)**: "The solar system's invariable plane"
  - Publication: Astronomy & Astrophysics, 543, A133
  - URL: https://www.aanda.org/articles/aa/full_html/2012/07/aa19011-12/aa19011-12.html
  - Used for: Invariable plane inclinations and ascending nodes for all planets

### JPL/NASA Data Sources

- **JPL Horizons System**
  - URL: https://ssd.jpl.nasa.gov/horizons/
  - Used for: J2000 ecliptic orbital elements (inclination, eccentricity, ascending node, mean anomaly)

- **JPL Approximate Positions of the Planets**
  - URL: https://ssd.jpl.nasa.gov/planets/approx_pos.html
  - Used for: Longitude of perihelion reference values

- **JPL SPICE Toolkit**
  - URL: https://naif.jpl.nasa.gov/naif/toolkit.html
  - Used for: High-precision ascending node values (preferred over Horizons where available)

### Standard Values

- **IAU (International Astronomical Union)**
  - Used for: Astronomical Unit definition, epoch definitions, obliquity (IAU 2006 precession model)
  - J2000 Epoch: January 1, 2000, 12:00 TT (JD 2451545.0)

- **IERS (International Earth Rotation Service)**
  - Used for: Length of day, Earth rotation parameters, sidereal/stellar day definitions

- **Meeus & Savoie (1992)**
  - Publication: "The history of the tropical year", J. British Astronomical Association, 102(1), 40-42
  - Used for: Cardinal tropical year lengths, tropical year rate

- **USNO (United States Naval Observatory)**
  - Used for: Solstice timing reference (June Solstice 2000 JD)

---

**Previous**: [19 - Balance Sensitivity Analysis](19-balance-sensitivity-analysis.md)
**Next**: [Orbital Formulas Reference](21-orbital-formulas-reference.md)
