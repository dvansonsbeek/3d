# Type I Inner Planets -- Mercury & Venus Implementation

**Date**: 2026-03-08
**Status**: Complete (e/(1+e) derivation, EoC with phase-optimized fractions, period calibration)

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

Type I planets (Mercury and Venus) orbit closer to Earth than the Sun's
orbital distance. In the geocentric model, they appear as inferior planets
whose apparent position oscillates around the Sun. Their scene graph
architecture differs fundamentally from Type II (Mars) and Type III
(Jupiter--Neptune).

Key differences from outer planets:
- **Planet speed is positive** (`+2pi / solarYearCount`), not negative
- **RealPeri speed is negative** (`-2pi`), creating the annual wobble
- **RealPeri startPos** = `180 - ascendingNode` (the "lowest point"), not
  `startpos * 2`
- **No dynamic geocentric update** -- the `elipticOrbit` is static
- **Equation of center** -- phase-optimized EoC with per-planet fractions

---

## The Physical Mechanism

### Orbit geometry

In the geocentric frame, Mercury and Venus orbit Earth with their apparent
position modulated by an off-center circular orbit. The `elipticOrbit` value
sets the radius of the `RealPerihelionAtSun` wobble layer, which creates the
apparent eccentricity of the planet's motion.

### The Type I formula

```
realOrbitalEccentricity = orbitalEccentricityBase / (1 + orbitalEccentricityBase)
perihelionDistance = orbitDistance * realOrbitalEccentricity * 100
elipticOrbit = perihelionDistance / 2
```

Where:
- `orbitalEccentricityBase` = J2000 eccentricity (input constant, unchanged)
- `realOrbitalEccentricity` = circular-orbit equivalent (derived)
- `orbitDistance` = semi-major axis in AU (from Kepler's 3rd law)
- `100` = scale factor (1 AU = 100 scene units)
- `/2` = the off-center orbit geometry provides half the eccentricity effect

### Additional derived values

```
eccentricityPerihelion = (perihelionDistance / 2) * orbitalEccentricityBase
lowestPoint = 180 - ascendingNode
```

The `eccentricityPerihelion` uses the raw J2000 eccentricity (not the derived
value) -- it serves a different geometric purpose in the PerihelionFromEarth
layer's orbit center calculation.

---

## Derived Eccentricity: e/(1+e) Circular-Orbit Equivalent

All planet types derive a circular-orbit equivalent eccentricity: `e/(1+e)`.
This maps the focus-to-center distance of an ellipse onto the equivalent
offset for a circle of the same semi-major axis.

For full details, values, and physical basis, see the
[Type III doc, "Perihelion Distance: Circular-Orbit Eccentricity e/(1+e)"](64-type-iii-outer-planets.md#perihelion-distance-circular-orbit-eccentricity-e1e) section.

Type I values:

| Planet  | J2000 e    | e/(1+e)    |
|---------|------------|------------|
| Mercury | 0.20563593 | 0.17056221 |
| Venus   | 0.00677672 | 0.00673098 |

---

## Scene Graph Chain

Type I planets use the same 5-layer hierarchy as Type II/III:

```
barycenter
  -> PerihelionDurationEcliptic1  (ecliptic precession, +2pi/periEclipticYears)
    -> PerihelionFromEarth        (eccentricity wobble, speed = +2pi)
      -> PerihelionDurationEcliptic2  (counter-rotation, -2pi/periEclipticYears)
        -> RealPerihelionAtSun    (annual wobble, speed = -2pi, orbitRadius = elipticOrbit)
          -> planet               (planet orbit, POSITIVE speed = +2pi/solarYearCount)
```

### Key Type I differences

| Property               | Type I                     | Type II (Mars)              | Type III                  |
|------------------------|----------------------------|-----------------------------|---------------------------|
| Planet speed           | +2pi/count (positive)      | -2pi/count (negative)       | +2pi/count (positive)     |
| RealPeri speed         | -2pi                       | synodic rate                | -2pi                      |
| RealPeri startPos      | 180 - ascendingNode        | startpos * 2                | startpos * 2              |
| elipticOrbit           | static (PD/2)              | dynamic (eccDist/2 - geo/2) | dynamic (geocentric)      |
| EoC fraction           | Merc: -0.53, Ven: +0.44   | -0.06 (near zero)           | 0.51-0.56 (near e/2)     |
| Dynamic geocentric     | No                         | Yes                         | Yes                       |

### PerihelionFromEarth layer

The orbit center of the PerihelionFromEarth layer encodes the perihelion
direction using the longitude of perihelion + angleCorrection:

```javascript
orbitCentera: cos((longitudePerihelion + angleCorrection + 90) * pi/180) * perihelionDistance
orbitCenterb: cos((90 - (longitudePerihelion + angleCorrection - 90)) * pi/180) * perihelionDistance
```

This places the orbit center at the correct ecliptic angle for the planet's
perihelion direction.

### Perihelion precession

| Planet  | Precession period          | Rate (arcsec/century) |
|---------|----------------------------|-----------------------|
| Mercury | H / (1 + 3/8) = H / 1.375 | ~570                  |
| Venus   | −8H / 6                    | ~−290 (model)         |

Mercury has the fastest perihelion precession of any planet, famously
including the 43 arcsec/century anomaly explained by general relativity.

---

## What Type I Does NOT Use

### No dynamic geocentric update

The `moveModel()` dynamic geocentric block (scene-graph.js line 784) only
applies to Type II and Type III planets:

```javascript
if (pm.sceneData.p.type === 'III' || pm.sceneData.p.type === 'II') { ... }
```

Type I planets have a static `elipticOrbit` set at initialization. Testing
showed that adding dynamic geocentric to Mercury **worsened** RMS by +86%.
The Type I `elipticOrbit = PD/2` formula already handles the eccentricity
geometry differently -- the annual wobble is absorbed by the `RealPeri`
layer's `-2pi` speed rather than a dynamic orbit radius.

### Equation of center — phase-optimized per-planet fractions

Type I planets now include equation of center (EoC) with per-planet fractions
and phase-optimized perihelion reference dates. The EoC applies the standard
Keplerian speed variation formula:

```javascript
theta += 2 * (e * eocFraction) * sin(M) + 1.25 * (e * eocFraction)^2 * sin(2M)
```

Each planet has:
- `eccentricity`: `orbitalEccentricityBase * eocFraction` (effective EoC amplitude)
- `perihelionPhaseJ2000`: phase-optimized initial phase (from perihelion ref JD)
- `perihelionPrecessionRate`: `2pi / perihelionEclipticYears`

#### Type I EoC fractions

| Planet  | eocFraction | Effective e | perihelionRef_JD |
|---------|-------------|-------------|------------------|
| Mercury | -0.527      | -0.1084     | 2460335.9        |
| Venus   | +0.436      | +0.00296    | 2455464.42       |

Mercury's **negative** fraction means the speed variation is opposite to the
Keplerian direction (slower at perihelion). This is physically consistent with
the geocentric observation geometry: Type I planets are seen from outside their
orbit, and the apparent speed pattern differs from the heliocentric one.

Venus's fraction (0.436) yields a very small effective amplitude (0.003),
consistent with its tiny orbital eccentricity (0.00678).

#### Historical context: circular-vs-elliptical test

The test script `tools/explore/test-circular-vs-variable-speed.js` originally
showed negligible EoC benefit (<1%) when testing the standard `e/2` formula.
The key insight was that Type I planets need **phase-optimized** perihelion
reference dates and **unconstrained** EoC fractions (not the geometric `e/2`).
With these degrees of freedom, EoC provides significant improvement:

| Planet  | RMS without EoC | RMS with EoC | Improvement |
|---------|----------------|-------------|-------------|
| Mercury | 2.50 deg       | 1.38 deg    | -44.8%      |
| Venus   | 3.31 deg       | 2.62 deg    | -20.8%      |

The improvement is much larger than the original <1% test suggested because
the phase optimization allows the EoC to correct systematic timing errors
that the geometric offset alone cannot address.

#### Phase formula

The `perihelionPhaseJ2000` is computed from the phase-optimized reference JD:

```javascript
perihelionPhaseJ2000 = -startpos * (pi/180)
  + (2*pi / (H / solarYearCount) - 2*pi / perihelionEclipticYears)
  * (perihelionRef_JD - startmodelJD) / meanSolarYearDays
```

This uses the same formula structure as Type III planets, but with the
phase-optimized reference JD providing the correct initial phase alignment.

---

## Current Baselines (JPL, 2000-2200)

### Mercury (95 Tier 2 reference points)

| Metric        | Value      |
|---------------|------------|
| RMS Total     | 0.009 deg  |
| Entries       | 95         |

### Venus (2481 Tier 2 reference points)

| Metric        | Value      |
|---------------|------------|
| RMS Total     | 0.238 deg  |
| Entries       | 2481       |

---

## Constants Reference

### Mercury (tools/lib/constants.js lines 41-59, src/script.js lines 93-105)

```
solarYearInput:            87.9683       (orbital period in days)
eclipticInclinationJ2000:  7.00497902    (ecliptic inclination, degrees)
orbitalEccentricityBase:       (phase-derived at runtime)
realOrbitalEccentricity:   0.17056221    (e/(1+e) -- DERIVED)
eocFraction:               -0.527        (EoC multiplier, negative = anti-Keplerian)
longitudePerihelion:        77.4569131    (ecliptic longitude of perihelion, degrees)
ascendingNode:             48.33033155   (ecliptic ascending node, degrees)
angleCorrection:           0.9709        (perihelion alignment offset, degrees)
startpos:                  83.653        (orbital phase at model start, degrees)
perihelionEclipticYears:   H / (1+3/8)  (perihelion precession period)
perihelionRef_JD:          2460335.9     (phase-optimized)
inclinationCycleAnchor:    234.52        (ICRF perihelion longitude where MAX inclination occurs, at balanced year n=7 ≈ -2,649,854 BC, degrees)
type:                      'I'           (formula selector)
mirrorPair:                'uranus'      (paired planet)
```

### Venus (tools/lib/constants.js lines 60-78, src/script.js lines 108-119)

```
solarYearInput:            224.695       (orbital period in days, calibrated)
eclipticInclinationJ2000:  3.39467605    (ecliptic inclination, degrees)
orbitalEccentricityBase:       (phase-derived at runtime)
realOrbitalEccentricity:   0.00671192    (e/(1+e) -- DERIVED)
eocFraction:               0.436         (EoC multiplier)
longitudePerihelion:        131.5765919   (ecliptic longitude of perihelion, degrees)
ascendingNode:             76.67877109   (ecliptic ascending node, degrees)
angleCorrection:           -2.8029       (perihelion alignment offset, degrees)
startpos:                  249.364       (orbital phase at model start, degrees)
perihelionEclipticYears:   H * 2         (perihelion precession period)
perihelionRef_JD:          2455464.42    (phase-optimized)
inclinationCycleAnchor:    259.82        (ICRF perihelion longitude where MAX inclination occurs, at balanced year n=7 ≈ -2,649,854 BC, degrees)
type:                      'I'           (formula selector)
mirrorPair:                'neptune'     (paired planet)
```

### Derived values

| Value                  | Mercury   | Venus     |
|------------------------|-----------|-----------|
| solarYearCount         | 1392228   | 545059    |
| orbitDistance (AU)      | 0.3871    | 0.7233    |
| realOrbitalEccentricity| 0.17056   | 0.00671   |
| perihelionDistance      | 6.603     | 0.485     |
| elipticOrbit           | 3.301     | 0.243     |
| eccentricityPerihelion | 0.679     | 0.001     |
| lowestPoint            | 131.67    | 103.32    |

---

## Diagnostic Tools

- `node tools/optimize.js baseline mercury` -- Full JPL baseline with RMS
- `node tools/optimize.js baseline venus` -- Full JPL baseline with RMS
- `node tools/optimize.js optimize <planet> startpos,angleCorrection` -- parameter optimization
- `node tools/explore/test-circular-vs-variable-speed.js <planet>` -- circular vs elliptical orbit comparison (confirms true circular for Type I/II, EoC needed for Type III)
