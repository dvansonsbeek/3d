# Type III Planets -- Eccentricity Corrections & Calibration

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

## Equation of Center for Type III Planets

### The same half-eccentricity pattern

The equation of center (EoC) was originally implemented for the Sun only
(see `equation-of-center-implementation.md`). The same double-counting problem
applies to planets: the off-center orbit geometry already provides ~50% of the
speed variation, so the EoC must use half the eccentricity to avoid
overcorrecting.

For Type III planets:

```
eccentricity: planetOrbitalEccentricity / 2
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
| Jupiter | 2023 Jan 21 04:00  | 2459965.667  | JPL Horizons |
| Saturn  | 2003 Jul 26        | 2452846.0    | JPL Horizons |
| Uranus  | 1966 May 20        | 2439275.0    | JPL Horizons |
| Neptune | 1876 Aug 27        | 2406600.0    | JPL Horizons |

These are stored in `ASTRO_REFERENCE` (both `src/script.js` and
`tools/lib/constants.js`) and used by both the main simulation and the
scene-graph tools.

### Code locations

**`src/script.js`:**
- Jupiter/Saturn/Uranus/Neptune planet objects (~lines 3198, 3354, 3510, 3666):
  `eccentricity: orbitalEccentricity / 2`, `perihelionPhaseJ2000`,
  `perihelionPrecessionRate`
- `moveModel()` EoC block (~line 29302): applies to any object with
  `eccentricity` and `perihelionPhaseJ2000`

**`tools/lib/scene-graph.js`:**
- `buildSceneGraph()` planet chain (~line 520): `periRefMap` lookup adds EoC
  parameters for Type III planets
- `animateObject()` (~line 563): same EoC formula as script.js

---

## Startpos Calibration

### Jupiter: 13.76 -> 13.62

Optimized using a combined metric of:
- Jupiter opposition dates (2015-2025): RMS 0.8 days
- Jupiter-Saturn great conjunction dates (10 BCE - 2120 CE)

The startpos was scanned in fine steps around the original value, with the
combined opposition + conjunction error used as the optimization target.

### Saturn: 11.397 -> 11.34

Optimized using:
- Saturn opposition dates (2015-2025): RMS 0.3 days
- Jupiter-Saturn great conjunction timing (n=40 known events)

Saturn's startpos was scanned from 10.0 to 13.0 in coarse steps, then
fine-tuned to 11.34 using a weighted metric favoring both opposition timing
and great conjunction accuracy.

### Validation tool

The conjunction-finder (`tools/explore/conjunction-finder.js`) validates
against:
- 19 known great conjunctions from 7 BCE through 1861 CE
- 14 Jupiter oppositions (2015-2025)
- 10 Saturn oppositions (2015-2025)

Current results:
- Great conjunctions: mean 21.6 days, RMS 88.9 days (n=40)
- Jupiter oppositions: mean 0.4 days, RMS 0.8 days (n=14)
- Saturn oppositions: mean 0.1 days, RMS 0.3 days (n=10)

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
  uses Earth's eccentricity; EoC uses the planet's own eccentricity (halved to
  avoid double-counting with the off-center geometry)

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
const ascNodeToolCorrection = {
  mercury: 123.2, venus: 69.8, mars: 135.8,
  jupiter: 27.3, saturn: 24.5, uranus: 93.8, neptune: 96.7,
};
```

These corrections are **fixed** (not time-dependent) because both the tilt
direction and planet orbit angle are in the same rotating frame -- the frame
rotation cancels in the relative angle.

The original J2000 ascending node values in `constants.js` remain unchanged.
The corrections are additive offsets applied only when computing the tilt
decomposition for the planet-level containerObj.

### Visual Tilt Group Strategy (script.js only)

In `src/script.js`, visual elements depend on the `RealPerihelionAtSun`
container rotation:
- `orbitPlaneHelper` (orbital plane grid)
- `inclinationPlane` (ascending/descending node markers)
- Anomaly visualization arcs
- `orbitalAnglesFromTilts()` UI display

Simply zeroing the container rotation would break these visuals. The
`RealPerihelionAtSun` objects are initially *defined* with computed tilt values
(using the uncorrected ascending node). The `setupVisualTiltGroup()` function
then copies these values into a child `tiltGroupObj` and zeros the container
rotation. The end result is zero tilt on the container, but the mechanism is
"copy then zero" rather than "defined as zero":

```
RealPerihelionAtSun.containerObj  (NO TILT -- zeroed)
  |-- tiltGroupObj                (visual tilt for helpers/markers)
  |     |-- orbitPlaneHelper
  |     +-- inclinationPlane      (node markers, added later)
  +-- orbitObj                    (annual rotation -2pi)
       +-- pivotObj
            +-- planet.containerObj  (CORRECTED tilt for position accuracy)
                 +-- planet.orbitObj  (sidereal)
                      +-- planet.pivotObj
```

The `setupVisualTiltGroup()` function:
1. Creates a new `THREE.Object3D` tilt group
2. Copies the container's current rotation into the tilt group
3. Zeros the container rotation
4. Reparents `orbitPlaneHelper` into the tilt group
5. Stores the group as `pd.tiltGroupObj`

### Dynamic Updates

`updateOrbitalPlaneRotations()` now updates **both**:
- `realPeriData.tiltGroupObj` -- standard ascending node (for visuals)
- `planetData.containerObj` -- corrected ascending node (for position)

Visual element references (`inclinationPlane`, anomaly arcs, node markers,
`orbitalAnglesFromTilts()`) read from `tiltGroupObj || containerObj`.

### What Stays Unchanged

- `calculateDynamicAscendingNodeFromTilts()` reads from `orbitTilta`/`orbitTiltb`
  DATA properties (not Three.js rotation), which remain the original J2000 values
- `FixedPerihelionAtSun` objects keep their static tilt (not updated dynamically)
- Ecliptic longitude and opposition timing are unaffected

### Code Locations

**`src/script.js`:**
- `ascNodeTiltCorrection` in ASTRO_REFERENCE (~line 996), aliased to
  `ascNodeToolCorrection` (~line 2719)
- Planet data objects with corrected `orbitTilta`/`orbitTiltb` (mercury ~2773,
  venus ~2917, mars ~3061, jupiter ~3208, saturn ~3364, uranus ~3520,
  neptune ~3676)
- `setupVisualTiltGroup()` function (~line 32749)
- Calls to `setupVisualTiltGroup` after `createPlanet` (~line 4989)
- `updateOrbitalPlaneRotations()` updated helper (~line 30430)
- Visual references updated: `inclinationPlane` attachment (~line 9296),
  anomaly tilt (~lines 9593, 12796), node marker tilt (~line 13047),
  `orbitalAnglesFromTilts()` (~line 31224)

**`tools/lib/scene-graph.js`:**
- `ascNodeToolCorrection` constant (~line 254, sourced from
  `C.ASTRO_REFERENCE.ascNodeTiltCorrection`)
- `getPlanetSceneData()`: corrected ascending node for planet tilt (~line 275)
- `RealPerihelionAtSun` tilt uses corrected ascending node (~line 506);
  note: differs from script.js which uses uncorrected node then copies to
  tiltGroupObj
- Planet container gets corrected tilt (~line 517)
- `moveModel()`: dynamic inclination targets planet.container (~line 781)

### Results

| Planet  | Lat RMS Before | Lat RMS After | Improvement |
|---------|---------------|---------------|-------------|
| Saturn  | 1.68 deg      | 0.010 deg     | 168x        |
| Jupiter | 1.33 deg      | 0.084 deg     | 16x         |

---

## Parameter Sensitivity Analysis (Jupiter Conjunction)

**Date**: 2026-03-08
**Status**: Investigated, accepted as-is

### The Problem

The 2020-Dec-21 Great Conjunction shows Jupiter at 20h09m40s in the model,
while the actual position was ~20h11m37s (Saturn). The conjunction separation
is 0.49 deg instead of the observed ~0.1 deg.

### Parameter Sensitivity (RA effect per unit change)

| Parameter              | RA sensitivity     | Can fix conjunction? | Primary effect       |
|------------------------|--------------------|--------------------|----------------------|
| **startpos**           | ~65 arcsec/deg     | **Yes**            | Orbital phase        |
| **EoC fraction**       | ~115 arcsec/0.1    | **Yes**            | Speed variation      |
| solarYearInput         | ~5 arcsec/0.1d     | Yes but destroys RMS | Orbital period     |
| longitudePerihelion    | ~3 arcsec/deg      | No                 | Perihelion direction |
| angleCorrection        | ~3 arcsec/deg      | No                 | Perihelion direction |
| ascendingNode          | ~1 arcsec/deg      | No                 | Ecliptic latitude    |
| ascNodeTiltCorrection  | ~2 arcsec/deg      | No                 | Ecliptic latitude    |

Only `startpos` and the EoC eccentricity fraction have sufficient leverage to
close the conjunction gap. All other parameters are either too weak or destroy
RMS when pushed far enough.

### EoC Fraction Investigation

The current implementation uses `eccentricity / 2` (fraction 0.50) for all
Type III planets. The theoretical basis is that the off-center orbit geometry
provides ~50% of the first-order speed variation, so the EoC corrects the
remaining ~50%.

Scanning the EoC fraction from 0 to 1.0 for Jupiter (with startpos
co-optimized for start-date RA) reveals:

| EoC frac | startpos | Jup RA 2020 | Conjunction sep | Start dRA | RMS   |
|----------|----------|-------------|-----------------|-----------|-------|
| 0.45     | 13.70    | 20h12m52s   | 0.31 deg        | -0.001    | 1.91  |
| 0.47     | 13.75    | 20h11m34s   | 0.01 deg        | -0.008    | 1.88  |
| 0.48     | 13.77    | 20h10m59s   | 0.16 deg        | +0.001    | 1.88  |
| 0.50     | 13.82    | 20h09m40s   | 0.49 deg        | -0.006    | 1.88  |

Fraction 0.47 gives a near-perfect conjunction (0.01 deg separation) with
negligible RMS cost (+0.004 deg).

### Per-Planet Optimal Fractions

Each planet has a slightly different RMS-optimal fraction:

| Planet  | Optimal frac | RMS at optimal | RMS at 0.50 | Difference |
|---------|-------------|----------------|-------------|------------|
| Jupiter | 0.49        | 1.876          | 1.879       | -0.003     |
| Saturn  | 0.52        | 1.238          | 1.248       | -0.010     |
| Uranus  | 0.44        | 0.059          | 0.062       | -0.003     |
| Neptune | 0.54        | 0.759          | 0.791       | -0.032     |

The variation (0.44 to 0.54) is not physically motivated -- it arises from
higher-order terms in the Kepler equation that interact differently with the
off-center geometry depending on each planet's eccentricity and the reference
data sampling. The e/2 rule is a geometric property of the model, not a fitted
parameter.

### Decision: Keep e/2 for All

Using per-planet fractions would be curve-fitting without physical
justification. The e/2 derivation follows from the off-center circle geometry
and should apply uniformly. The conjunction gap (~0.5 deg for Jupiter) is
accepted as a structural limitation of the constant-speed approximation model.

The conjunction can be improved by adjusting `startpos` (trading start-date RA
accuracy) or by slightly lowering the EoC fraction. These options remain
available as future tuning if conjunction accuracy becomes a priority.

### Diagnostic Tools

- `tools/explore/archive/latitude-tilt-diagnostic.js` -- confirms the -2pi
  synodic identity and validates the fix
- `tools/explore/archive/all-planet-ascending-node-scan.js` -- scanned all 7
  planets for optimal ascending node corrections vs JPL Horizons
- `tools/explore/saturn-drift-analysis.js <planet>` -- validates RA, Dec,
  ecliptic longitude and latitude against JPL Horizons opposition data
