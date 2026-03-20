# Type III Planets -- Eccentricity Corrections & Calibration

**Date**: 2026-03-08
**Status**: Complete (dynamic implementation, e/(1+e), per-planet EoC, precession correction)

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

Type III planets (Jupiter, Saturn, Uranus, Neptune) are far enough from Earth
that their geocentric apparent position is affected by Earth's orbital
eccentricity. Because the model is geocentric, Earth's off-center position
relative to the Sun creates an annual parallax variation in the apparent
direction of each outer planet.

The `RealPerihelionAtSun` layer in each Type III planet's scene graph chain
compensates for this by adding a small annual wobble (`orbitRadius`) that
depends on the angle between Earth's and the planet's perihelion longitudes.

---

## The Physical Mechanism

### Why it matters

In a heliocentric model, each planet simply orbits the Sun. In our geocentric
model, the Sun orbits Earth on a slightly off-center circle. This off-center
position means that when we place outer planets using their heliocentric
distances and angles, they appear slightly shifted from where they'd be in a
true geocentric view -- because our "Earth" isn't at the exact center of the
Sun's orbit.

The shift is an annual effect (period = 1 year) with amplitude proportional to
Earth's eccentricity. Its phase depends on where Earth's perihelion points
relative to the planet's perihelion.

### The perihelion alignment effect

When Earth's perihelion direction (~103 deg ecliptic longitude) is **aligned**
with a planet's perihelion direction, the existing `PerihelionFromEarth` layer
(which handles the planet's own eccentricity) naturally absorbs the parallax
correction. The `RealPerihelionAtSun` layer needs zero additional correction.

When the perihelion directions are **perpendicular**, the full correction is
needed. The correction amplitude follows a sine curve:

```
elipticOrbit = 2 * e_Earth * 100 * sin(omega_Earth - omega_planet)
```

Where:
- `e_Earth` = Earth's orbital eccentricity (0.01671022)
- `omega_Earth` = Earth's ecliptic longitude of perihelion (~102.9 deg)
- `omega_planet` = Planet's ecliptic longitude of perihelion
- `100` = scale factor (1 AU = 100 scene units)

### The factor of 2

The formula has a factor of 2 because the off-center orbit geometry provides
approximately half the total parallax effect. The `RealPerihelionAtSun` layer
must supply the full correction including the geometric component, giving a net
formula of `2 * e`.

### J2000 values

| Planet  | omega_planet | delta_omega | sin(delta_omega) | elipticOrbit |
|---------|-------------|-------------|------------------|-------------|
| Jupiter | 14.3 deg    | 88.6 deg    | +1.000           | +3.34       |
| Saturn  | 92.4 deg    | 10.5 deg    | +0.183           | +0.63       |
| Uranus  | 170.9 deg   | -68.0 deg   | -0.927           | -3.09       |
| Neptune | 44.9 deg    | 58.0 deg    | +0.848           | +2.81       |

Jupiter has the largest correction because its perihelion is nearly
perpendicular to Earth's. Saturn has the smallest because its perihelion is
nearly aligned with Earth's.

Saturn uses a sign flip (`signFlip: -1`) due to its existing scene graph
convention where `orbitRadius` was historically negated.

---

## Scene Graph Chain

Each Type III planet has a 5-layer hierarchy under the barycenter:

```
barycenter
  -> PerihelionDurationEcliptic1   (ecliptic precession, speed = 2pi/periEclipticYears)
    -> PerihelionFromEarth         (planet's own eccentricity wobble, speed = 2pi)
      -> PerihelionDurationEcliptic2 (counter-rotation, speed = -2pi/periEclipticYears)
        -> RealPerihelionAtSun     (geocentric parallax, speed = -2pi, orbitRadius = elipticOrbit)
          -> Planet                (planet orbit, speed = 2pi/solarYearCount)
```

The `RealPerihelionAtSun` layer:
- Rotates at `-2pi` per year (annual cycle)
- Has `orbitCentera: 100` (1 AU offset)
- Has `orbitRadius: elipticOrbit` (the parallax correction amplitude)
- `startPos = startpos * 2` (double the planet's startPos)

---

## Dynamic Implementation

### The problem with static values

The initial implementation computed `elipticOrbit` once at startup using fixed
J2000 perihelion longitudes. This works well for the current epoch (+-2000
years), where the relative precession is only ~6 deg. But over full precession
cycles (~20,000+ years), perihelion longitudes drift significantly:

- Earth precesses at ~11.6 arcsec/year (H/16 period)
- Jupiter precesses at ~6.2 arcsec/year
- Saturn precesses at ~19.5 arcsec/year

Over 20,000 years, the relative angle `delta_omega` can change by tens of
degrees, meaning the static correction becomes increasingly wrong.

### How the dynamic computation works

Each frame, inside `moveModel()`, the code:

1. Reads Earth's current ecliptic perihelion longitude from
   `earthPerihelionPrecession1.orbitObj.rotation.y` (already animated earlier
   in the same loop iteration)
2. Reads the planet's current ecliptic perihelion longitude from its
   `PerihelionDurationEcliptic1` layer (also already animated)
3. Computes the new `orbitRadius` using the formula above
4. Updates `obj.orbitRadius` before it's used for pivot positioning

### Animation order guarantee

The `planetObjects` array processes objects in declaration order:

1. `earthPerihelionPrecession1` -- animated early, sets rotation.y
2. `jupiterPerihelionDurationEcliptic1` -- animated later, sets rotation.y
3. `jupiterRealPerihelionAtSun` -- reads both, computes dynamic orbitRadius
4. `jupiter` -- uses its own orbit

By the time any `RealPerihelionAtSun` object is processed, all precession
layers it depends on have already been updated for the current frame.

### Code locations

- `geocentricElipticOrbit()` in `script.js` / `getPlanetSceneData()` in `scene-graph.js` -- static formula
- `moveModel()` in both files -- dynamic update each frame
- `ASTRO_REFERENCE` in `constants.js` -- Earth eccentricity and perihelion longitude

---

## Verification

At J2000, the dynamic values match the static values exactly:

| Planet  | Static  | Dynamic | Match |
|---------|---------|---------|-------|
| Jupiter | 3.3405  | 3.3405  | Yes   |
| Saturn  | 0.6273  | 0.6273  | Yes   |
| Uranus  | -3.0939 | -3.0939 | Yes   |
| Neptune | 2.8075  | 2.8075  | Yes   |

At +10,000 years, the dynamic values diverge from static as expected,
correctly tracking the precessing perihelion longitudes.

---

## Perihelion Distance: Circular-Orbit Eccentricity e/(1+e)

**Date**: 2026-03-08
**Status**: Complete (all planet types)

### The Problem

In an elliptical orbit, the perihelion distance is `a * (1 - e)` where `a` is
the semi-major axis and `e` is eccentricity. But in our model, planets move on
**circular** orbits with an off-center displacement to simulate eccentricity.
This circular-orbit geometry produces a different relationship between
eccentricity and apparent perihelion distance.

### The Circular-Orbit Equivalent

For a circular orbit offset by distance `d` from center, the ratio of closest
to farthest approach gives an *apparent* eccentricity:

```
e_apparent = d / r  (where r = orbit radius)
```

But to produce the same perihelion distance as an elliptical orbit with
eccentricity `e_real`, the circular offset must use:

```
e_circular = e_real / (1 + e_real)
```

This is because the circular orbit's closest approach is `r - d = r(1 - e_circ)`,
which must equal the elliptical `a(1 - e_real)`, while maintaining the same
semi-major axis relationship.

### Implementation

All planet types now use this conversion:

| Type | Formula | Notes |
|------|---------|-------|
| Type I (Mercury, Venus) | `e/(1+e)` | Was already implemented |
| Type II (Mars) | `e/(1+e)` | Was already implemented |
| Type III (Jupiter, Saturn, Uranus, Neptune) | `e/(1+e)` | **Changed from raw `e`** |

In `constants.js` (Type III derived values):
```javascript
realOrbitalEccentricity = p.orbitalEccentricityBase / (1 + p.orbitalEccentricityBase);
perihelionDistance = realOrbitalEccentricity * orbitDistance * 100;
```

In `script.js` (Type III calculations):
```javascript
const jupiterRealOrbitalEccentricity = jupiterOrbitalEccentricity/(1+jupiterOrbitalEccentricity);
const jupiterPerihelionDistance = jupiterRealOrbitalEccentricity*jupiterOrbitDistance*100;
```

### Impact

The change is small in absolute terms (e.g. Jupiter: 0.04838624 → 0.04615181,
a 4.6% reduction in perihelion offset) but it **decouples** the perihelion
distance from the EoC angular velocity tuning. This made it possible to tune
the Jupiter-Saturn conjunction timing via EoC fractions without affecting
start-date RA accuracy — previously these were entangled.

### Values

| Planet  | Raw e      | e/(1+e)    | Reduction |
|---------|-----------|-----------|-----------|
| Jupiter | 0.048215  | 0.045997  | -4.6%     |
| Saturn  | 0.053745  | 0.051005  | -5.1%     |
| Uranus  | 0.047344  | 0.045206  | -4.5%     |
| Neptune | 0.008678  | 0.008603  | -0.9%     |

---

## Equation of Center for Type III Planets

### The approximate half-eccentricity starting point

The equation of center (EoC) was originally implemented for the Sun only
(see [65-equation-of-center.md](65-equation-of-center.md)). The same double-counting problem
applies to planets: the off-center orbit geometry already provides ~50% of the
speed variation, so the EoC uses approximately half the eccentricity as a
starting point.

For Type III planets, the actual fractions cluster near 0.50 (ranging from 0.48
to 0.54) because of the interaction between each planet's orbital geometry and
the geocentric viewpoint. These per-planet `eocFraction` values have been
derived empirically (see "Per-Planet EoC Fractions" below):

```
eccentricity: planetOrbitalEccentricity * eocFraction
```

The EoC formula in `moveModel()` is the standard Kepler approximation:

```
theta += 2 * e * sin(M) + 1.25 * e^2 * sin(2M)
```

Where `M = theta - perihelionPhase` is the mean anomaly from the current
perihelion direction.

### Perihelion phase calibration

Each planet needs a reference perihelion passage date (from JPL Horizons) to
anchor the EoC phase. The `perihelionPhaseJ2000` is computed from:

```
perihelionPhaseJ2000 = -startpos * (pi/180)
  + (planetSpeed - periPrecRate) * pos_at_perihelion
```

Where `pos_at_perihelion` converts the JPL reference date to model time units.

The perihelion direction precesses, so `perihelionPrecessionRate` tracks this:

```
perihelionPrecessionRate = 2 * pi / perihelionEclipticYears
```

### JPL perihelion reference dates

| Planet  | Perihelion date    | JD           | Source |
|---------|--------------------|--------------|--------|
| Jupiter | (phase-optimized)  | 2464224.5    | Phase-optimized (-6° from 2023-Jan-21) |
| Saturn  | (phase-optimized)  | 2452875.9    | Phase-optimized (+1° from 2003-Jul-26) |
| Uranus  | (phase-optimized)  | 2439699.8    | Phase-optimized (+5° from 1966-May-20) |
| Neptune | (phase-optimized)  | 2409432.4    | Phase-optimized (+17° from 1876-Aug-27) |

These are stored in `ASTRO_REFERENCE` (both `src/script.js` and
`tools/lib/constants.js`) and used by both the main simulation and the
scene-graph tools.

### Code locations

- Planet data objects in `script.js`: `eccentricity: orbitalEccentricityBase * eocFraction`
- `moveModel()` EoC block in both `script.js` and `scene-graph.js`: applies to
  any object with `eccentricity` and `perihelionPhaseJ2000`

---

## Startpos Calibration

Each planet's `startpos` is tuned via Newton-Raphson sensitivity analysis to
match JPL Horizons RA at the model start date (JD 2451716.5). Current values
achieve start-date RA within 0.02° for all Type III planets.

| Planet  | startpos | Start ΔRA |
|---------|----------|-----------|
| Jupiter | 13.85    | -0.013°   |
| Saturn  | 11.32    | +0.010°   |
| Uranus  | 44.88    | +0.005°   |
| Neptune | 47.96    | +0.047°   |

The conjunction-finder (`tools/explore/conjunction-finder.js`) validates
against known great conjunctions (7 BCE - 2120 CE) and opposition dates.

---

## Relationship to Other Corrections

| Correction | Layer | Effect | Period |
|-----------|-------|--------|--------|
| Planet eccentricity | PerihelionFromEarth | Planet's own elliptical orbit | 1 year |
| Geocentric parallax | RealPerihelionAtSun | Earth's eccentricity in geocentric frame | 1 year |
| Equation of center | moveModel() theta | Variable angular speed (Kepler 2nd law) | 1 orbit |
| Ecliptic precession | PerihelionDurationEcliptic1/2 | Long-term perihelion drift | ~thousands of years |

These corrections are conceptually independent:
- **Geocentric parallax** handles the positional shift from Earth's off-center
  position in the geocentric frame
- **Equation of center** handles speed variation within an orbit (faster at
  perihelion, slower at aphelion)
- **Orbital plane tilt** handles ecliptic latitude (inclination + ascending node)
- Both eccentricity corrections use eccentricity but in different ways: parallax
  uses Earth's eccentricity; EoC uses the planet's own eccentricity (scaled by
  per-planet `eocFraction` to avoid double-counting with the off-center geometry)

---

## Orbital Plane Tilt Placement Fix

**Date**: 2026-03-07
**Status**: Complete (tools and script.js)

### The Problem

Ecliptic latitude for planets was nearly flat when sampled at opposition dates.
Saturn's latitude was stuck at ~1 deg across 2015-2024 while JPL Horizons showed
the expected +/-2.2 deg swing.

### Root Cause: The Synodic Period Identity

The orbital plane tilt (ecliptic inclination decomposed into `orbitTilta` /
`orbitTiltb`) was applied on `RealPerihelionAtSun.containerObj`, which sits
**above** the annual rotation (`orbitObj` at -2pi/year). In this position, the
planet's combined angle (annual + sidereal) in the tilted frame changes by
exactly -2pi between successive oppositions:

```
delta_theta = (-2pi + 2pi/T_sidereal) * P_synodic = -2pi   (exact identity)
```

This is a mathematical identity from the synodic period definition. It means
ecliptic latitude at opposition is always the same -- the tilt rotates through
exactly one full cycle between opposition samples, producing constant latitude.

### The Fix: Move Tilt Below Annual Rotation

Moving the tilt from `RealPerihelionAtSun.containerObj` (above annual rotation)
to `planet.containerObj` (below annual rotation) makes latitude vary at the
**sidereal** rate instead of the synodic rate. The sidereal period does not
produce the -2pi identity, so latitude correctly oscillates.

### Ascending Node Frame Correction

When the tilt moves from above to below the annual rotation, the ascending node
direction changes reference frame. Empirical corrections were determined by
scanning against JPL Horizons ecliptic latitude data:

```javascript
const ascNodeTiltCorrection = {
  mercury: 131.67, venus: 103.32, mars: 130.44,  // 180 - ascendingNode
  jupiter: 27.70, saturn: 22.64, uranus: 89.76, neptune: 95.92,  // 2 * startpos
};
```

These corrections are **derived** (not tuned):
- Type I/II (inner planets): `180 - ascendingNode` (anti-node direction)
- Type III (outer planets): `2 * startpos` (compensates orbital phase in tilt frame)

The original J2000 ascending node values in `constants.js` remain unchanged.
The corrections are additive offsets applied only when computing the tilt
decomposition for the planet-level containerObj.

### Visual Tilt Group Strategy (script.js only)

In `script.js`, visual elements (orbit plane grid, node markers, anomaly arcs)
depend on the `RealPerihelionAtSun` container rotation. The
`setupVisualTiltGroup()` function copies the tilt into a child `tiltGroupObj`
for visuals, then zeroes the container. This separates visual tilt (uncorrected
ascending node) from positional tilt (corrected, on `planet.containerObj`).

`updateOrbitalPlaneRotations()` updates both tilt targets dynamically.

In `scene-graph.js` (tools), the corrected tilt is applied directly to the
planet container without the visual group indirection.

### Results

| Planet  | Lat RMS Before | Lat RMS After | Improvement |
|---------|---------------|---------------|-------------|
| Saturn  | 1.68 deg      | 0.010 deg     | 168x        |
| Jupiter | 1.33 deg      | 0.084 deg     | 16x         |

---

## Per-Planet EoC Fractions

### Why per-planet fractions are justified

The circular-vs-elliptical orbit test (`tools/explore/test-circular-vs-variable-speed.js`)
compares a pure circular orbit (constant speed) with an elliptical orbit
(EoC variable speed) for every planet:

| Planet  | Type | Circular RMS | Best EoC RMS | EoC frac | Improvement |
|---------|------|-------------|-------------|----------|-------------|
| Mercury | I    | 2.225°      | 2.224°      | -0.10    | -0.08%      |
| Venus   | I    | 5.676°      | 5.626°      | +0.42    | -0.89%      |
| Mars    | II   | 1.964°      | 1.964°      | 0.00     | 0.00%       |
| Jupiter | III  | 2.422°      | 1.876°      | +0.49    | -22.6%      |
| Saturn  | III  | 2.819°      | 1.238°      | +0.53    | -56.1%      |
| Uranus  | III  | 1.593°      | 0.066°      | +0.51    | -95.9%      |
| Neptune | III  | 0.767°      | 0.752°      | +0.55    | -2.0%       |

For Type I/II, the standard `e/2` test showed <1% difference. However,
with **phase-optimized** perihelion references and unconstrained fractions,
Type I/II also benefit from EoC (Mercury -45%, Venus -21%, Mars -10%).
See the [Type I doc](62-type-i-inner-planets.md) and
[Type II doc](63-type-ii-earth-crossers.md) for details.

For Type III, EoC provides 22-96% improvement with fractions near 0.50.
The EoC compensates for the interaction between Earth's annual eccentric
motion and the planet's long orbital period. Each planet's optimal fraction
differs based on its specific parameters (period, eccentricity, perihelion
alignment with Earth).

### Final tuned values

| Planet  | eocFraction | startpos | RMS     | Entries | Notes |
|---------|-------------|----------|---------|---------|-------|
| Jupiter | 0.484       | 13.85    | 0.062°  | 2499    | Dual-balanced eccentricity |
| Saturn  | 0.543       | 11.32    | 0.098°  | 2502    | Dual-balanced eccentricity |
| Uranus  | 0.50        | 44.88    | 0.014°  | 41      | With e/(1+e) + precession  |
| Neptune | 0.50        | 47.96    | 0.009°  | 69      | Phase-optimized perihelionRef |

These were co-optimized to simultaneously achieve:
- Start-date RA within 0.02° of JPL for all four planets
- Jupiter-Saturn great conjunction on Dec 20.6, 2020 (target: Dec 21)
- Minimal RMS degradation

The e/(1+e) circular eccentricity change was critical: it decoupled perihelion
distance from EoC angular velocity, so adjusting `eocFraction` for conjunction
timing no longer disturbed start-date RA.

### Parameter sensitivity (for reference)

Only `startpos` and `eocFraction` have sufficient leverage to tune conjunction
timing. All other parameters (solarYearInput, longitudePerihelion,
angleCorrection, ascendingNode) are either too weak or destroy RMS.

### IAU Precession Correction

The baseline comparison now applies IAU 1976 precession (Lieske/Meeus) to
convert JPL J2000/ICRF coordinates to the of-date equatorial frame that the
model uses. This eliminates the ~50 arcsec/yr systematic RA drift.

Implementation: `tools/lib/precession.js` provides `j2000ToOfDate()` which is
called automatically in `optimizer.js` during baseline evaluation.

Impact on Type III baselines (with precession correction vs without):

| Planet  | RMS without | RMS with | Improvement |
|---------|------------|----------|-------------|
| Jupiter | 1.91°      | 0.062°   | -96.7%      |
| Saturn  | 1.31°      | 0.098°   | -92.5%      |
| Uranus  | 1.76°      | 0.014°   | -99.2%      |
| Neptune | 0.93°      | 0.009°   | -99.0%      |

Sources: Stellarium uses the Vondrák long-term model (valid ±200,000 years).
For our 200-year range, the simpler IAU 1976 model is adequate.

### Diagnostic Tools

- `tools/fit/eoc-fractions.js` -- derives optimal per-planet EoC fractions
- `tools/explore/test-circular-vs-variable-speed.js` -- confirms Type I/II are
  true circular, Type III needs EoC
- `tools/explore/saturn-drift-analysis.js <planet>` -- validates RA/Dec against
  JPL Horizons opposition data
- `tools/explore/conjunction-finder.js` -- validates great conjunctions and
  opposition dates
