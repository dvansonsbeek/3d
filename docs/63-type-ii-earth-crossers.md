# Type II Mars -- Eccentricity Corrections & Calibration

**Date**: 2026-03-08
**Status**: Complete (dynamic implementation, sensitivity analysis done)

---

## Type Classification

The model classifies planets into three types based on their orbital distance
relative to Earth's orbit, each requiring a different scene graph formula:

- **[Type I](62-type-i-inner-planets.md)** (Mercury, Venus) -- orbit inside Earth's orbit (inferior planets)
- **[Type II](63-type-ii-earth-crossers.md)** (Mars, Eros) -- orbit crosses Earth-Sun distance (Earth-crossers)
- **[Type III](64-type-iii-outer-planets.md)** (Jupiter, Saturn, Uranus, Neptune) -- orbit well outside Earth's orbit

The key physical difference: Type I eccentricity is static (planet seen from
outside its orbit), Type II uses a hybrid of planet + Earth eccentricity, and
Type III is dominated by Earth's eccentricity (parallax effect).

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
- `e_Mars` = Mars orbital eccentricity (0.09297543)
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

## Derived Eccentricity: e/(1+e) Circular-Orbit Equivalent

Mars uses `e/(1+e) = 0.08506635` (from base e = 0.09297543) for the orbit
offset calculation. See the
[Type III doc, "Perihelion Distance: Circular-Orbit Eccentricity e/(1+e)"](64-type-iii-outer-planets.md#perihelion-distance-circular-orbit-eccentricity-e1e)
section for the full derivation and physical basis.

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
`H = 335317` solar years. This corresponds to the 4+1/3 Fibonacci-derived
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
_orbitalEccentricityBase: marsOrbitalEccentricity,       // for eccDist calculation
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
- Mars perihelion reference JD: line 250 (`2458669.2`, phase-optimized from 2018 Sep 16)

---

## Equation of Center for Mars

### Near-zero EoC fraction

Mars now has an equation of center with `eocFraction = -0.066`, producing
an effective eccentricity of `0.09339 * -0.066 = -0.00616`. This is very
small compared to Type III planets (fractions ~0.50), confirming that Mars's
eccentricity is primarily captured by the geometric orbit offset.

The EoC is applied using the same formula as all other planets:

```javascript
theta += 2 * (e * eocFraction) * sin(M) + 1.25 * (e * eocFraction)^2 * sin(2M)
```

With a phase-optimized perihelion reference:

```
perihelionRef_JD: 2456505.6  (phase-optimized)
```

### Why the fraction is near zero

The original empirical tests (documented in the circular-vs-elliptical test)
showed zero EoC was optimal when testing the standard `e/2` formula. With
phase-optimized reference dates and unconstrained fractions, a small negative
value (-0.066) provides marginal improvement. The negative sign means the
speed variation is opposite to the Keplerian direction — consistent with the
geometric orbit offset already providing the dominant eccentricity effect.

### Historical context

Mars was originally excluded from EoC by an explicit `pd.p.type !== 'II'`
guard. This guard was removed to allow all planets to use the same EoC
infrastructure. The near-zero fraction confirms the original finding that
Mars's eccentricity is primarily geometric, while still allowing the small
phase correction that the EoC provides.

### Impact

The EoC improvement for Mars is modest compared to Type III planets (which see
22-96% improvement), consistent with the small fraction value.

---

## Orbital Plane Tilt

### Tilt placement

Mars uses the same tilt placement fix as Type III planets (see
[64-type-iii-outer-planets.md](64-type-iii-outer-planets.md) section "Orbital Plane Tilt Placement Fix").
The ecliptic inclination tilt is applied at `mars.containerObj` (below the
annual rotation) rather than `marsRealPerihelionAtSun.containerObj` (above it).

### Ascending node correction

```javascript
ascNodeToolCorrection.mars = 180 - ascendingNode  // = 130.44
```

This correction equals `180 - ascendingNode` (the anti-node direction),
consistent with all Type I/II planets. The corrected tilt decomposition on
the planet container is:

```javascript
orbitTilta: cos((-90 - (ascendingNode + correction)) * pi/180) * -eclipticInclination
orbitTiltb: sin((-90 - (ascendingNode + correction)) * pi/180) * -eclipticInclination
```

The `setupVisualTiltGroup()` function zeroes the container rotation on
`marsRealPerihelionAtSun` while preserving visual elements in a child
`tiltGroupObj`.

---

## Current Baseline (JPL, 2000-2200)

184 reference points, Tier 2 (JPL Horizons DE441, 2000-2200):

| Metric        | Value      |
|---------------|------------|
| RMS Total     | 0.024 deg  |
| Entries       | 184        |

---

## Tycho Brahe Validation (1582-1600)

### Dataset

923 declination-only observations from Tycho Brahe's Uraniborg observatory,
digitized by Wayne Pafko (2000) from *Tychonis Brahe Dani Opera Omnia*,
volumes 10 and 13. These are Tier 1C data -- the most precise pre-telescope
planetary measurements ever made (accuracy: 1-2 arcminutes).

Imported via `tools/pipeline/import-tycho-mars.js`, stored in
`data/reference-data.json` under `tier1_observations.tycho_mars`.

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
| **orbitalEccentricityBase**   | 0.09339    | 0.110      | 0.80 deg      | 0.90 deg    | High     |
| solarYearInput            | 686.931    | 686.942    | 1.08 deg      | 0.87 deg    | Moderate |
| ascendingNode             | 49.557     | 55.0       | 1.11 deg      | 0.69 deg    | Low      |
| inclinationPhaseAngle     | 203.320    | 205.0      | 1.15 deg      | 0.79 deg    | Minimal  |
| eclipticInclinationJ2000  | 1.850      | (no effect)| 1.20 deg      | 0.78 deg    | None     |

Three parameters have strong leverage on Tycho Dec: `angleCorrection`,
`longitudePerihelion`, and `orbitalEccentricityBase`.

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
| 686.931        | 1.20 deg   | 0.78 deg  | Current      |
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
| Current       | -2.107    | 336.065  | 0.0934 | 1.20 deg  | 0.78 deg | 1.43 deg  |
| **Best comb.**| **-4.5**  | **336**  | **0.10**| **0.69 deg** | **0.76 deg** | **1.03 deg** |

The best combined configuration:
- Improves Tycho Dec by **42%** (1.20 deg -> 0.69 deg)
- Improves JPL Dec by **3%** (0.78 deg -> 0.76 deg)
- Reduces combined metric by **28%** (1.43 deg -> 1.03 deg)
- Barely changes `longitudePerihelion` (336.065 -> 336)
- The two effective changes are `angleCorrection` (-2.1 -> -4.5) and
  `orbitalEccentricityBase` (0.0934 -> 0.10)

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

The top configurations all converge on `orbitalEccentricityBase = 0.10`, with
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
| Equation of center           | eocFraction=-0.07 (near zero)     | Per-planet eocFraction (0.49-0.56)  |
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

For full EoC details, see the
[Type III doc, "Equation of Center"](64-type-iii-outer-planets.md#equation-of-center-for-type-iii-planets) section.

### Type II elipticOrbit formula (Mars)

Mars uses a hybrid of its own eccentricity and the Earth parallax:

```
eo = (e_Mars * d * 100) / 2  -  e_Earth * 100 * sin(delta_omega)
```

The first term (half Mars eccentricity distance, ~7.12) dominates. The
second term (Earth parallax, ~1.34) is a correction. Mars uses a near-zero
EoC fraction (-0.0624), confirming that the geometric orbit offset captures
most of the speed variation effect.

### J2000 comparison

| Planet  | omega_planet | delta_omega | elipticOrbit | Formula      | EoC          |
|---------|-------------|-------------|-------------|--------------|--------------|
| Mars    | 336.1 deg   | -233.1 deg  | ~5.78       | eccDist/2 - eo_geo/2 | frac=-0.07   |
| Jupiter | 14.3 deg    | 88.6 deg    | +3.34       | 2*e_E*sin(dw)| frac=0.51    |
| Saturn  | 92.4 deg    | 10.5 deg    | +0.61       | 2*e_E*sin(dw)| frac=0.56    |
| Uranus  | 170.9 deg   | -68.0 deg   | -3.10       | 2*e_E*sin(dw)| frac=0.54    |
| Neptune | 44.9 deg    | 58.0 deg    | +2.83       | 2*e_E*sin(dw)| frac=0.55    |

Mars's elipticOrbit (~5.78 dynamically) is the largest because it includes
the planet's own eccentricity. For Type III planets, the elipticOrbit is
purely from Earth's eccentricity and ranges from 0.6 (Saturn, nearly aligned)
to 3.3 (Jupiter, nearly perpendicular).

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
solarYearInput:            686.931       (orbital period in days, calibrated from ISAW drift)
eclipticInclinationJ2000:  1.84969142    (ecliptic inclination, degrees)
orbitalEccentricityBase:       0.09297543    (base eccentricity)
eocFraction:               -0.066        (EoC multiplier, near-zero = mostly geometric)
longitudePerihelion:       336.0650681   (ecliptic longitude of perihelion, degrees)
ascendingNode:             49.55737662   (ecliptic ascending node, degrees)
angleCorrection:           -2.107087     (perihelion alignment offset, degrees)
startpos:                  121.47        (orbital phase at model start, degrees)
perihelionEclipticYears:   H / (4+1/3)  (perihelion precession period)
perihelionRef_JD:          2456505.6     (phase-optimized)
inclinationPhaseAngle:     203.3195      (inclination variation phase)
ascNodeToolCorrection:     130.44        (180 - ascendingNode, tilt placement frame correction)
type:                      'II'          (formula selector)
mirrorPair:                'jupiter'     (paired planet)
```

### Derived values

```
solarYearCount:            178124        (integer orbit count in H)
orbitDistance:              1.5237        (AU, from Kepler's 3rd law)
eccDist:                   14.23         (eccentricity * orbitDistance * 100)
elipticOrbit (static):     7.72          (realEcc*d/2*100 + (e-realEcc)*d*100, overwritten dynamically)
perihelionDistance:         21.95         (eccDist + elipticOrbit)
planetSpeed:               -0.00003529   (rad/solar year, negative)
```

---

## Diagnostic Tools

- `node tools/optimize.js baseline mars` -- Full JPL baseline with RMS
- `tools/pipeline/import-tycho-mars.js` -- Tycho data import pipeline
- `tools/explore/test-mars-eoc.js` -- Mars equation of center testing
- `tools/explore/conjunction-finder.js` -- validates conjunction timing
- `tools/explore/saturn-drift-analysis.js mars` -- RA/Dec/lat/lon vs JPL
