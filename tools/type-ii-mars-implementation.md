# Type II Mars -- Eccentricity Corrections & Calibration

**Date**: 2026-03-08
**Status**: Complete (dynamic implementation, sensitivity analysis done)

---

## What It Does

Mars is the only Type II planet in the model. Its geocentric apparent position
depends on both Mars's own large orbital eccentricity (e=0.0934, about 5.6x
Earth's) and the geocentric parallax from Earth's off-center position.

Unlike Type III planets (Jupiter through Neptune) where Earth's eccentricity
dominates, Mars's own eccentricity is the primary effect. The Type II formula
reflects this by using a hybrid approach: half the Mars eccentricity distance
as the static orbit offset, minus half the Earth geocentric parallax.

---

## The Physical Mechanism

### Why Mars needs a different formula

Type III planets use:
```
elipticOrbit = 2 * e_Earth * sin(delta_omega)
```

This fails catastrophically for Mars (RMS explodes from 1.99 deg to 125 deg)
because Mars's own eccentricity (0.0934) vastly outweighs the Earth parallax
effect (order of e_Earth = 0.0167). The orbit offset for Mars must primarily
reflect Mars's own eccentric orbit, not Earth's.

### The Type II formula

```
eo = eccDist / 2 - eo_geocentric / 2
```

Expanded:

```
eo = (e_Mars * d * 100) / 2  -  (2 * e_Earth * 100 * sin(delta_omega)) / 2
   = (e_Mars * d * 100) / 2  -  e_Earth * 100 * sin(delta_omega)
```

Where:
- `e_Mars` = Mars orbital eccentricity (0.09339410)
- `d` = Mars orbit distance in AU (1.5237, from Kepler's 3rd law)
- `e_Earth` = Earth's orbital eccentricity (0.01671022)
- `delta_omega` = angle between Earth's and Mars's ecliptic perihelion
  longitudes (precesses over time)
- `100` = scale factor (1 AU = 100 scene units)

The two terms:
- **Term 1: `(e_Mars * d * 100) / 2`** -- half the Mars eccentricity distance.
  The `/2` accounts for the off-center orbit geometry already providing half
  the eccentricity effect (same principle as the Sun's EoC using e/2).
- **Term 2: `e_Earth * 100 * sin(delta_omega)`** -- the Earth geocentric
  parallax correction. This is subtracted because Mars's orbit center offset
  partially absorbs the parallax that Type III planets handle additively.

Both terms are evaluated dynamically each frame: Term 1 is constant (Mars's
eccentricity and orbit distance don't change), but Term 2 fluctuates as the
perihelion longitudes precess at different rates.

### Static initialization (script.js)

The initial `marsElipticOrbit` value in `src/script.js` (line 1764) uses a
legacy formula with a second-order eccentricity correction:

```javascript
const realEcc = e / (1 + e);                         // = 0.08542 (reduced eccentricity)
const marsElipticOrbit =
    (realEcc * orbitDist / 2) * 100                   // Term 1: 6.507 (half reduced ecc dist)
  + (e * orbitDist - realEcc * orbitDist) * 100;       // Term 2: 1.216 (difference correction)
                                                       // Total:  7.723
```

This differs from the tools formula (`e * d * 100 / 2 = 7.115`) by 0.608
scene units. However, this static value is **overwritten on the first frame**
by the dynamic geocentric update, so the difference has zero runtime impact.
The legacy formula remains in script.js as a historical artifact.

### J2000 values

| Component                 | Value       | Notes                                    |
|---------------------------|-------------|------------------------------------------|
| e_Mars * d * 100 (eccDist)| 14.23       | Mars eccentricity distance in scene units|
| eccDist / 2 (Term 1)      | 7.12        | Static half-eccentricity offset          |
| eo_geocentric (Term 2 x2) | ~2.67       | Dynamic, depends on perihelion alignment |
| eo_geocentric / 2         | ~1.34       | Half Earth parallax subtracted           |
| **Total eo**              | **~5.78**   | eccDist/2 - eo_geo/2 (fluctuates)        |

---

## Scene Graph Chain

Mars uses the same 5-layer hierarchy as Type III planets:

```
barycenter
  -> marsPerihelionDurationEcliptic1  (ecliptic precession, +2pi/periEclipticYears)
    -> marsPerihelionFromEarth        (Mars's own eccentricity wobble, speed = 2pi)
      -> marsPerihelionDurationEcliptic2  (counter-rotation, -2pi/periEclipticYears)
        -> marsRealPerihelionAtSun    (dynamic geocentric, speed = synodic, orbitRadius = eo)
          -> mars                     (planet orbit, NEGATIVE speed = -2pi/solarYearCount)
```

Key differences from Type III:
- Mars planet speed is **negative** (`-2pi / solarYearCount`), reflecting its
  retrograde motion pattern in the geocentric frame
- RealPerihelionAtSun speed is `-2pi + 2*2pi/solarYearCount` (synodic rate)
- RealPerihelionAtSun `startPos = startpos * 2` (double the planet startPos)
- `orbitCentera = 100` (1 AU offset, same as Type III)

### Perihelion precession

Mars's perihelion precesses with period `H / (4 + 1/3)` years, where
`H = 335008` solar years. This corresponds to the 4+1/3 Fibonacci-derived
divisor. The precession is split into two counter-rotating ecliptic layers
that bracket the PerihelionFromEarth annual wobble, ensuring the perihelion
direction tracks correctly in the ecliptic frame.

---

## Dynamic Implementation

### How it works

Each frame, inside `moveModel()`, the code:

1. Reads Earth's current ecliptic perihelion longitude from
   `earthPerihelionPrecession1.orbitObj.rotation.y`
2. Reads Mars's current ecliptic perihelion longitude from
   `marsPerihelionDurationEcliptic1.orbitObj.rotation.y`
3. Computes `delta_omega = omega_Earth - omega_Mars` (in radians)
4. Computes `eo_geocentric = 2 * e_Earth * 100 * sin(delta_omega)`
5. Applies Type II formula: `eo = eccDist / 2 - eo_geocentric / 2`
6. Updates `obj.orbitRadius`, `pivotObj.position.x`, `rotationAxis.position.x`

### Properties enabling dynamic update

The `marsRealPerihelionAtSun` object carries three properties that trigger
the dynamic update in `moveModel()`:

```javascript
eclipticPrecLayer: marsPerihelionDurationEcliptic1,  // precession layer reference
longitudePerihelion: marsLongitudePerihelion,         // J2000 base angle (336.065 deg)
planetType: 'II',                                    // selects Type II formula branch
_orbitalEccentricity: marsOrbitalEccentricity,       // for eccDist calculation
_orbitDistance: marsOrbitDistance,                     // for eccDist calculation
```

The `if (obj.eclipticPrecLayer)` guard ensures only planets with these
properties get the dynamic update. The `planetType === 'II'` branch selects
the Mars-specific formula.

### Static initialization value

The static `marsElipticOrbit` constant computed at load time provides the
initial `orbitRadius`. This value is immediately overwritten by the dynamic
calculation on the first frame, so its exact value is inconsequential.

### Code locations

**`src/script.js`:**
- Mars constants: lines 122-133
- `marsElipticOrbit` static computation: ~line 1764
- `marsRealPerihelionAtSun` object: lines 3009-3035
- Dynamic update in `moveModel()`: lines 29449-29466
- `perihelionLongitudeEcliptic()` helper: ~line 29739

**`tools/lib/scene-graph.js`:**
- Type II derived values: `computePlanetDerived()` lines 299-305
- Type II speed/startPos: `getPlanetSceneData()` lines 288-290
- Dynamic update: `moveModel()` lines 784-795

**`tools/lib/constants.js`:**
- Mars planet entry: lines 79-97
- Mars perihelion reference JD: line 241 (`2458377.167`, 2018 Sep 16)

---

## No Equation of Center for Mars

### Why Mars is excluded

Type III planets use an equation of center (EoC) with `eccentricity / 2` to
model variable orbital speed (Kepler's 2nd law). Mars is explicitly excluded
from the EoC (`pd.p.type !== 'II'` guard at scene-graph.js line 540).

### Empirical validation

Testing every EoC fraction from -0.30 to +0.50 confirms that **zero** is
optimal for Mars:

| EoC Fraction | RMS RA   | RMS Dec  | RMS Total |
|--------------|----------|----------|-----------|
| -0.10        | 2.63 deg | 0.73 deg | 2.73 deg  |
| -0.05        | 1.99 deg | 0.72 deg | 2.12 deg  |
| -0.02        | 1.82 deg | 0.75 deg | 1.97 deg  |
| -0.01        | 1.81 deg | 0.76 deg | 1.97 deg  |
| **0.00**     | **1.83 deg** | **0.78 deg** | **1.99 deg** |
| +0.02        | 1.95 deg | 0.82 deg | 2.12 deg  |
| +0.05        | 2.28 deg | 0.91 deg | 2.45 deg  |
| +0.10        | 3.08 deg | 1.07 deg | 3.26 deg  |
| +0.50 (half) | 11.68 deg | 2.85 deg | 12.02 deg |

The minimum is at -0.01 to -0.02 with an improvement of only 0.025 deg
over zero -- essentially noise. Any positive EoC fraction makes Mars
significantly worse.

### Physical explanation

Mars's Type II formula already captures the eccentricity effect through the
geometric orbit offset (`eccDist/2`). Adding EoC speed variation on top
double-counts the effect. The off-center orbit geometry provides the speed
variation implicitly through positional displacement, unlike Type III planets
where the eccentricity effect is primarily a parallax correction.

---

## Orbital Plane Tilt

### Tilt placement

Mars uses the same tilt placement fix as Type III planets (see
`type-iii-geocentric-parallax.md` section "Orbital Plane Tilt Placement Fix").
The ecliptic inclination tilt is applied at `mars.containerObj` (below the
annual rotation) rather than `marsRealPerihelionAtSun.containerObj` (above it).

### Ascending node correction

```javascript
ascNodeToolCorrection.mars = 135.8
```

This empirical correction accounts for the reference frame change when moving
the tilt from above to below the annual rotation. The corrected tilt
decomposition on the planet container is:

```javascript
orbitTilta: cos((-90 - (ascendingNode + 135.8)) * pi/180) * -eclipticInclination
orbitTiltb: sin((-90 - (ascendingNode + 135.8)) * pi/180) * -eclipticInclination
```

The `setupVisualTiltGroup()` function zeroes the container rotation on
`marsRealPerihelionAtSun` while preserving visual elements in a child
`tiltGroupObj`.

---

## Current Baseline (JPL, 2000-2200)

144 opposition reference points, Tier 2 (JPL Horizons DE441):

| Metric        | Value     |
|---------------|-----------|
| RMS RA        | 1.83 deg  |
| RMS Dec       | 0.78 deg  |
| RMS Total     | 1.99 deg  |
| Max RA error  | 3.45 deg  |
| Max Dec error | 1.42 deg  |
| Start RA err  | -0.009 deg |
| Start Dec err | -0.149 deg |
| Entries       | 144       |

---

## Tycho Brahe Validation (1582-1600)

### Dataset

923 declination-only observations from Tycho Brahe's Uraniborg observatory,
digitized by Wayne Pafko (2000) from *Tychonis Brahe Dani Opera Omnia*,
volumes 10 and 13. These are Tier 1C data -- the most precise pre-telescope
planetary measurements ever made (accuracy: 1-2 arcminutes).

Imported via `tools/pipeline/import-tycho-mars.js`, stored in
`config/reference-data.json` under `tier1_observations.tycho_mars`.

### Results with current parameters

| Metric                    | Value      |
|---------------------------|------------|
| Observations compared     | 923        |
| RMS Dec (all)             | 2.24 deg   |
| RMS Dec (excl. 18 outliers >5 deg) | 0.96 deg |
| Mean Dec bias             | -0.75 deg  |
| Within 1 deg              | 62%        |
| Within 2 deg              | 97%        |
| Max error                 | 24.3 deg   |

### Outlier analysis

18 observations (2% of total) at just 6 unique dates show errors >5 deg,
clustered in 1589-1592. At these dates, the model places Mars on the opposite
side of the ecliptic from Tycho's observation -- a cumulative phase drift
over 400 years causes a timing error at ecliptic crossings where declination
changes sign rapidly.

| Year cluster | N outliers | Max error | Likely cause                  |
|--------------|-----------|-----------|-------------------------------|
| 1589.0       | 1         | 10.6 deg  | Ecliptic crossing phase error |
| 1590.2-0.8   | 10        | 18.6 deg  | Ecliptic crossing phase error |
| 1592.2       | 1         | 24.3 deg  | Ecliptic crossing phase error |
| 1596.1       | 2         | 5.6 deg   | Ecliptic crossing phase error |

Excluding these, 905 observations span 18 years with 0.96 deg RMS -- the
model tracks Mars well 400 years before the calibration epoch.

### By-year breakdown

| Year | N   | RMS Dec  | Max error |
|------|-----|----------|-----------|
| 1582 | 1   | 0.89 deg | 0.89 deg  |
| 1583 | 3   | 0.92 deg | 1.18 deg  |
| 1584 | 5   | 0.89 deg | 1.01 deg  |
| 1585 | 27  | 0.69 deg | 1.10 deg  |
| 1586 | 24  | 0.74 deg | 1.52 deg  |
| 1587 | 85  | 0.82 deg | 1.37 deg  |
| 1588 | 13  | 2.23 deg | 4.54 deg  |
| 1591 | 104 | 0.59 deg | 1.29 deg  |
| 1593 | 135 | 1.37 deg | 3.37 deg  |
| 1594 | 16  | 0.33 deg | 0.42 deg  |
| 1595 | 294 | 1.08 deg | 1.34 deg  |
| 1596 | 88  | 0.88 deg | 5.59 deg  |
| 1600 | 7   | 0.68 deg | 0.91 deg  |

Best individual year: 1594 (0.33 deg RMS, 16 observations).

---

## Parameter Sensitivity Analysis (Tycho)

### Method

Each parameter was scanned individually across a wide range while measuring
both Tycho Dec RMS (1582-1600, 923 points) and JPL Dec RMS (2000-2200, 144
points). The combined metric `sqrt(Tycho^2 + JPL_Dec^2)` identifies the
best tradeoff.

### Single-parameter sensitivity

| Parameter                 | Current    | Best Tycho | Tycho at best | JPL at best | Leverage |
|---------------------------|------------|------------|---------------|-------------|----------|
| **angleCorrection**       | -2.107     | -4.0       | 0.90 deg      | 0.78 deg    | High     |
| **longitudePerihelion**   | 336.065    | 330.0      | 0.78 deg      | 0.93 deg    | High     |
| **orbitalEccentricity**   | 0.09339    | 0.110      | 0.80 deg      | 0.90 deg    | High     |
| solarYearInput            | 686.934    | 686.942    | 1.08 deg      | 0.87 deg    | Moderate |
| ascendingNode             | 49.557     | 55.0       | 1.11 deg      | 0.69 deg    | Low      |
| inclinationPhaseAngle     | 203.320    | 205.0      | 1.15 deg      | 0.79 deg    | Minimal  |
| eclipticInclinationJ2000  | 1.850      | (no effect)| 1.20 deg      | 0.78 deg    | None     |

Three parameters have strong leverage on Tycho Dec: `angleCorrection`,
`longitudePerihelion`, and `orbitalEccentricity`.

`eclipticInclinationJ2000` has zero effect because it is consumed during
static initialization into tilt components that don't change with the
parameter scan (the derived tilt values are baked into object definitions).

### solarYearInput detail

Mars's orbital period feeds through `Math.round(totalDaysInH / solarYearInput)`
to get the integer `solarYearCount`. Small period changes shift the count in
discrete steps (~2 per 0.01 days), each changing the effective period by
~0.004 days. Over 400 years (~213 orbits), this accumulates to ~0.85 days
of phase shift per step.

| solarYearInput | Tycho Dec  | JPL Dec   | Notes        |
|----------------|------------|-----------|--------------|
| 686.928        | 1.48 deg   | 0.73 deg  |              |
| 686.934        | 1.20 deg   | 0.78 deg  | Current      |
| 686.942        | 1.08 deg   | 0.87 deg  | Best Tycho   |
| 686.950        | 1.36 deg   | 0.99 deg  |              |
| 686.980        | 3.27 deg   | 1.13 deg  | IAU sidereal |

The IAU sidereal period (686.9796 days) performs poorly for Tycho because the
model uses integer orbit counts, and the effective period differs from the
input.

### 3D optimization: angleCorrection x longitudePerihelion x eccentricity

A coarse 3D grid search (7 x 4 x 4 = 112 configurations) identified the
best combined Tycho + JPL Dec configuration:

| Configuration | angleCorr | longPeri | ecc    | Tycho Dec | JPL Dec  | Combined |
|---------------|-----------|----------|--------|-----------|----------|----------|
| Current       | -2.107    | 336.065  | 0.0934 | 1.20 deg  | 0.78 deg | 1.43 deg |
| **Best comb.**| **-4.5**  | **336**  | **0.10**| **0.69 deg** | **0.76 deg** | **1.03 deg** |

The best combined configuration:
- Improves Tycho Dec by **42%** (1.20 deg -> 0.69 deg)
- Improves JPL Dec by **3%** (0.78 deg -> 0.76 deg)
- Reduces combined metric by **28%** (1.43 deg -> 1.03 deg)
- Barely changes `longitudePerihelion` (336.065 -> 336)
- The two effective changes are `angleCorrection` (-2.1 -> -4.5) and
  `orbitalEccentricity` (0.0934 -> 0.10)

### Top 10 configurations from 3D scan

| AC   | LP  | ecc    | Tycho   | JPL Dec | Combined |
|------|-----|--------|---------|---------|----------|
| -4.5 | 336 | 0.100  | 0.69    | 0.76    | 1.03     |
| -3.5 | 335 | 0.100  | 0.69    | 0.76    | 1.03     |
| -4.0 | 336 | 0.100  | 0.71    | 0.74    | 1.03     |
| -3.0 | 335 | 0.100  | 0.72    | 0.74    | 1.03     |
| -4.0 | 335 | 0.100  | 0.68    | 0.78    | 1.03     |
| -3.0 | 334 | 0.100  | 0.68    | 0.78    | 1.03     |
| -5.0 | 336 | 0.100  | 0.67    | 0.78    | 1.03     |
| -3.5 | 336 | 0.100  | 0.74    | 0.72    | 1.03     |
| -3.5 | 334 | 0.100  | 0.66    | 0.80    | 1.04     |
| -4.5 | 335 | 0.100  | 0.66    | 0.80    | 1.04     |

The top configurations all converge on `orbitalEccentricity = 0.10`, with
`angleCorrection` and `longitudePerihelion` trading off against each other.

### Physical interpretation

**Eccentricity = 0.10 vs 0.0934 (J2000):**
Mars's orbital eccentricity varies between ~0.075 and ~0.105 over long
timescales due to gravitational perturbations from Jupiter and Saturn. The
J2000 value (0.0934) is a snapshot. A value of 0.10 is a better average for
a model spanning 1582-2200, sitting well within the natural variation range.

**angleCorrection = -4.5 vs -2.107:**
This parameter sets the angular offset of the perihelion from Earth direction.
The larger correction may reflect accumulated precession effects that the
simplified precession model doesn't fully capture over 400+ years.

### Decision: Keep current values (pending)

The optimization results are documented here for future reference. Applying
the changes would improve historical accuracy at minimal JPL cost, but
should be done as part of the broader optimization campaign (see plan file)
to avoid piecemeal parameter changes that may interact with other planet
optimizations.

---

## Comparison: Type II vs Type III

### Overview

| Feature                      | Type II (Mars)                    | Type III (Jupiter-Neptune)          |
|------------------------------|-----------------------------------|-------------------------------------|
| Dominant eccentricity        | Planet's own (e=0.093)            | Earth's (e=0.017)                   |
| Static orbit offset          | eccDist / 2                       | 2 * e_Earth * sin(delta_omega)      |
| Dynamic geocentric           | eccDist/2 - eo_geo/2              | eo_geo (full)                       |
| Equation of center           | **None** (zero fraction optimal)  | e_planet / 2                        |
| Planet speed sign             | Negative (-2pi/count)             | Positive (+2pi/count)               |
| RealPeri speed               | Synodic rate                      | -2pi (annual)                       |
| Mirror pair                  | Jupiter                           | N/A                                 |

### Type III elipticOrbit formula (for reference)

Type III planets use a pure Earth-parallax correction:

```
eo = 2 * e_Earth * 100 * sin(delta_omega)
```

Expanded:

```
eo = 2 * 0.01671022 * 100 * sin(omega_Earth - omega_planet)
   = 3.342 * sin(omega_Earth - omega_planet)
```

Where:
- `e_Earth` = 0.01671022 (Earth's orbital eccentricity)
- `omega_Earth` = ~102.9 deg (Earth's ecliptic longitude of perihelion)
- `omega_planet` = planet's ecliptic longitude of perihelion (precesses)
- The factor of 2 arises because the off-center orbit geometry provides
  approximately half the total effect; the `RealPerihelionAtSun` layer
  must supply the full `2 * e` to get the correct total amplitude

The result depends entirely on the **relative angle** between perihelion
directions. When aligned (Saturn, delta_omega ~10 deg), the correction is
small (~0.6). When perpendicular (Jupiter, delta_omega ~89 deg), it is
maximal (~3.3). The planet's own eccentricity plays **no role** in the
orbit offset -- it only enters through the equation of center (speed
variation).

Type III also applies an equation of center with half-eccentricity:

```
theta += 2 * (e_planet / 2) * sin(M) + 1.25 * (e_planet / 2)^2 * sin(2M)
```

This models Kepler's 2nd law (faster at perihelion, slower at aphelion).
The `/2` avoids double-counting with the geometric speed variation already
present from the off-center orbit.

### Type II elipticOrbit formula (Mars)

Mars uses a hybrid of its own eccentricity and the Earth parallax:

```
eo = (e_Mars * d * 100) / 2  -  e_Earth * 100 * sin(delta_omega)
```

The first term (half Mars eccentricity distance, ~7.12) dominates. The
second term (Earth parallax, ~1.34) is a correction. Mars does **not** use
an equation of center -- the geometric orbit offset already captures the
full speed variation effect.

### J2000 comparison

| Planet  | omega_planet | delta_omega | elipticOrbit | Formula      | EoC          |
|---------|-------------|-------------|-------------|--------------|--------------|
| Mars    | 336.1 deg   | -233.1 deg  | ~5.78       | eccDist/2 - eo_geo/2 | None  |
| Jupiter | 14.3 deg    | 88.6 deg    | +3.34       | 2*e_E*sin(dw)| e/2 = 0.024  |
| Saturn  | 92.4 deg    | 10.5 deg    | +0.61       | 2*e_E*sin(dw)| e/2 = 0.027  |
| Uranus  | 170.9 deg   | -68.0 deg   | -3.10       | 2*e_E*sin(dw)| e/2 = 0.024  |
| Neptune | 44.9 deg    | 58.0 deg    | +2.83       | 2*e_E*sin(dw)| e/2 = 0.004  |

Mars's elipticOrbit is the largest because it includes the planet's own
eccentricity. For Type III planets, the elipticOrbit is purely from Earth's
eccentricity and ranges from 0.6 (Saturn, nearly aligned) to 3.3 (Jupiter,
nearly perpendicular).

### Why Mars cannot use Type III formula

Setting Mars to Type III (changing its formula to
`2 * e_Earth * sin(delta_omega)`) produces RMS = 125 deg -- the orbit offset
becomes ~3 scene units instead of ~5, and the speed sign/phase is wrong.
The Type II formula is essential for Mars.

### Why Type III planets cannot use Type II formula

Type III planets have small eccentricities (0.01-0.05) relative to their
orbital distances (5-30 AU). The eccDist/2 term would be comparable to the
geocentric parallax term, producing an unstable subtraction. Type III works
because it directly corrects the dominant effect (Earth parallax) without
involving the planet's eccentricity in the offset calculation.

---

## Constants Reference

### Current values (tools/lib/constants.js and src/script.js)

```
solarYearInput:            686.934       (orbital period in days)
eclipticInclinationJ2000:  1.84969142    (ecliptic inclination, degrees)
orbitalEccentricity:       0.09339410    (J2000 eccentricity)
longitudePerihelion:       336.0650681   (ecliptic longitude of perihelion, degrees)
ascendingNode:             49.55737662   (ecliptic ascending node, degrees)
angleCorrection:           -2.107087     (perihelion alignment offset, degrees)
startpos:                  121.67        (orbital phase at model start, degrees)
perihelionEclipticYears:   H / (4+1/3)  (perihelion precession period)
inclinationPhaseAngle:     203.3195      (inclination variation phase)
ascNodeToolCorrection:     135.8         (tilt placement frame correction)
type:                      'II'          (formula selector)
mirrorPair:                'jupiter'     (paired planet)
perihelionRef_JD:          2458377.167   (2018 Sep 16 16:00 UTC)
```

### Derived values

```
solarYearCount:            178123        (integer orbit count in H)
orbitDistance:              1.5237        (AU, from Kepler's 3rd law)
eccDist:                   9.33          (eccentricity * orbitDistance * 100)
elipticOrbit (static):     4.67          (eccDist / 2, overwritten dynamically)
perihelionDistance:         18.99         (eccDist + elipticOrbit)
planetSpeed:               -0.00003529   (rad/solar year, negative)
```

---

## Diagnostic Tools

- `node tools/optimize.js baseline mars` -- Full JPL baseline with RMS
- `tools/pipeline/import-tycho-mars.js` -- Tycho data import pipeline
- `tools/explore/test-mars-eoc.js` -- Mars equation of center testing
- `tools/explore/conjunction-finder.js` -- validates conjunction timing
- `tools/explore/saturn-drift-analysis.js mars` -- RA/Dec/lat/lon vs JPL
