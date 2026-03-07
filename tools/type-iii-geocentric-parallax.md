# Type III Planets -- Geocentric Parallax Correction

**Date**: 2026-03-07
**Status**: Complete (dynamic implementation)

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

The formula has a factor of 2, matching the same doubling pattern seen in the
equation of center (`eocEccentricity = e/2`). The off-center orbit geometry
provides approximately half the total effect. The `RealPerihelionAtSun` layer
must supply the remaining half, but since the geometry already handles a
component in a different phase direction, the net formula works out to `2 * e`.

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

**`src/script.js`:**
- `geocentricElipticOrbit()` -- static formula for initialization (~line 1770)
- Static const values: `jupiterElipticOrbit`, etc. (~lines 1778-1802)
- RealPerihelionAtSun objects with `eclipticPrecLayer`, `longitudePerihelion`,
  `signFlip` properties (~lines 3140, 3293, 3446, 3599)
- Dynamic update in `moveModel()` -- before `obj.a ?? obj.orbitRadius`
- `perihelionLongitudeEcliptic()` -- reads precession layer rotation (~line 29677)

**`tools/lib/scene-graph.js`:**
- Static computation in `getPlanetSceneData()` (~line 285)
- Dynamic update in `moveModel()` -- after Earth precession layers, before
  animating each planet's `realPeri` layer
- Updates `pivot.px` and `rotAxis.px` directly

**`tools/lib/constants.js`:**
- `ASTRO_REFERENCE.earthEccentricityJ2000 = 0.01671022`
- `ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 = 102.947`
- Type III `elipticOrbit` computed in derived values (~line 288)

---

## Verification

At J2000, the dynamic values match the static values exactly:

| Planet  | Static  | Dynamic | Match |
|---------|---------|---------|-------|
| Jupiter | 3.3405  | 3.3405  | Yes   |
| Saturn  | 0.6273  | 0.6273  | Yes   |
| Uranus  | -3.0939 | -3.0939 | Yes   |
| Neptune | 2.8075  | 2.8075  | Yes   |

Conjunction-finder results are unchanged:
- Great conjunctions RMS: 88.9 days (n=40, range 10 BCE - 2120 CE)
- Jupiter oppositions RMS: 0.8 days (n=14)
- Saturn oppositions RMS: 0.3 days (n=10)

At +10,000 years, the dynamic values diverge from static as expected,
correctly tracking the precessing perihelion longitudes.

---

## Relationship to Other Corrections

| Correction | Layer | Effect | Period |
|-----------|-------|--------|--------|
| Planet eccentricity | PerihelionFromEarth | Planet's own elliptical orbit | 1 year |
| Geocentric parallax | RealPerihelionAtSun | Earth's eccentricity in geocentric frame | 1 year |
| Equation of center | moveModel() theta adjustment | Variable angular speed | 1 orbit |
| Ecliptic precession | PerihelionDurationEcliptic1/2 | Long-term perihelion drift | ~thousands of years |

The geocentric parallax correction is conceptually separate from the equation
of center. The EoC handles speed variation within an orbit; the parallax
correction handles the positional shift from Earth's off-center position. Both
use Earth's eccentricity but in different ways.
