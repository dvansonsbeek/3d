---
docVersion: 1.0
modelVersion: v13.0
coefficients: sha256:56d7365a511916d5
status: current
---

# Perihelion Longitude Calculation Methods

## Overview

This document describes the three methods used to calculate perihelion longitude and precession rates in the 3D Solar System model, their technical implementation, and the fluctuation patterns observed in Earth-frame measurements.

---

## The Three Methods

### Method 1: Earth-Frame (Equatorial RA)

**What it measures:** The right ascension of a planet's perihelion direction in the scene's equatorial frame (`earth.rotationAxis`), measured from the perihelion-of-Earth point.

**Physical meaning:** The ecliptic advance projected into the equatorial frame, plus the term the changing obliquity adds to any right ascension — rate_RA = rate_ecl · dα/dλ + ∂α/∂ε · ε̇ (+ a coupling ≤ 0.7 ″/cy), pinned for all seven planets by `tools/verify/perihelion-projection-closure.js` (doc 13 §1.8). In the scene the equatorial frame and the star field share the H/13 rotation, so this rate is the same relative to the equinox and relative to the stars; the frame wording for the physical statement is settled in doc 13 §1.8.

**Characteristics:**
- A right ascension in the scene's equatorial frame (coordinate b) — no observer publishes this quantity; every published perihelion rate is an ecliptic longitude (coordinate a, Method 2)
- Fluctuates over time because the projection slope dα/dλ and the obliquity move with Earth's precession cycles
- Over a full H the average returns to the ecliptic (lattice) value

| Metric | Mercury |
|--------|-----------------|
| Rate at J2000 (Earth-frame RA) | <!--v:mercuryPeriRateEarthFrameMeasuredJ2000-->579.83<!--/v--> ″/cy = <!--v:mercuryPeriRateEclipticArcsecCy-->531.44<!--/v--> × dα/dλ + <!--v:mercuryPeriObliquityRateTermJ2000-->4.31<!--/v--> (+κ) |
| Lattice (ecliptic) rate | <!--v:mercuryPeriRateEclipticArcsecCy-->531.44<!--/v--> ″/cy |
| Earth-frame range over H | <!--v:mercuryFluctuationMin-->-47<!--/v--> to <!--v:mercuryFluctuationMax-->+48<!--/v--> ″/cy about the lattice rate |
| Dominant Earth-frame period | ~<!--v:mercuryOscillationPeriod-->7,451<!--/v--> years (H/45) |

### Method 2: Ecliptic-Frame (J2000 Ecliptic)

**What it measures:** The longitude of perihelion in the J2000 ecliptic coordinate system, directly from the model's precession layer.

**Physical meaning:** This is the "true" heliocentric precession rate - the rate at which the perihelion point advances around the Sun in an inertial reference frame.

**Characteristics:**
- Perfectly stable - no fluctuations
- Represents the configured precession rate in the model
- Standard astronomical reference frame for orbital elements

| Metric | Mercury Example |
|--------|-----------------|
| Rate | Exactly 531.4 arcsec/century |
| Fluctuation | None |
| Starting longitude (J2000) | 77.46° |

---

## Technical Implementation

### Earth-Frame Calculation (`apparentRaFromPdA`)

**Coordinate System:** Earth's Equatorial Frame (NOT ecliptic)

The `.ra` values are computed by transforming world positions into Earth's local equatorial frame:

```javascript
// Transform planet position to Earth's equatorial frame
LOCAL.copy(PLANET_POS);
earth.rotationAxis.worldToLocal(LOCAL);  // Key transformation

// Convert to spherical coordinates
SPHERICAL.setFromVector3(LOCAL);
obj.ra = SPHERICAL.theta;   // Right Ascension in radians (azimuthal angle)
obj.dec = SPHERICAL.phi;    // Declination in radians (polar angle)
```

This transformation includes all of Earth's orientation effects:
- Axial tilt (~23.4°)
- Axial precession (H/13 year cycle)
- Obliquity variations (H/8 year cycle)
- Inclination precession (H/3 year cycle)

The `apparentRaFromPdA` function then computes the angle between two objects:

```javascript
function apparentRaFromPdA(pdA, pdB) {
  // 1. Get RA values (in Earth's equatorial frame)
  const ra1 = pdA.ra;  // Earth's perihelion RA
  const ra2 = pdB.ra;  // Planet's perihelion RA

  // 2. Project onto the equatorial plane WITH declination: ρ = r·sin(φ),
  //    φ = .dec (THREE polar angle from the axis, so sin φ = cos δ)
  const x1 = r1 * Math.sin(dec1) * Math.cos(ra1);
  const z1 = r1 * Math.sin(dec1) * Math.sin(ra1);
  const x2 = r2 * Math.sin(dec2) * Math.cos(ra2);
  const z2 = r2 * Math.sin(dec2) * Math.sin(ra2);

  // 3. Calculate apparent angle from Earth perihelion to planet perihelion
  const dx = x2 - x1;
  const dz = z2 - z1;
  let apparentRA = Math.atan2(dz, dx);

  // 4. Return opposite direction (perihelion is opposite to aphelion view)
  return (apparentRA + Math.PI) * (180 / Math.PI);
}
```

#### Projection with declination

The projection carries each body's declination, so the result is exactly the
right ascension of the 3D vector from the Earth-perihelion point to the
planet's perihelion marker:

```
ρ = r × sin(φ)          φ = .dec, the THREE polar angle from the rotation axis (sin φ = cos δ)
x = ρ × cos(ra)
z = ρ × sin(ra)
```

**Why the declination term is load-bearing.** The reference point (the
perihelion-of-Earth marker, e·AU ≈ 0.017 AU from Earth) and a planet's
perihelion marker (0.3–30 AU) sit at very different declinations. Projecting
with the full distance instead of ρ was measured (Node scene mirror of the
Step-3 export, snapshot mode) to generate 96 % of Venus's exported
"precession fluctuation" — std 513 → 20 ″/cy with the declination term,
Mercury 96 → 35 ″/cy — as harmonics 8–15 of the H/13 equatorial rotation
with H/3 and H/8 sidebands (a 1.7–3.2 kyr band). That band is a property of
the projection, not of the orbits; the Step-4c/4d feature bases are built
for the orbital signal and could not span it. With the term in place every
planet's Step-4c/4d fit sits at the ~0.1 ″/cy numerical floor
(Venus <!--v:venusPredRmse-->0.0972<!--/v--> ″/cy).

### Ecliptic-Frame Calculation (`perihelionLongitudeEcliptic`)

```javascript
function perihelionLongitudeEcliptic(precessionLayer, longitudePerihelion) {
  // 1. Read precession angle directly from the layer's rotation
  let precessionAngle = precessionLayer.orbitObj.rotation.y;

  // 2. Add base longitude of perihelion (J2000 starting position)
  let totalAngle = precessionAngle + (longitudePerihelion * Math.PI / 180);

  // 3. Normalize to [0, 360)
  totalAngle = totalAngle % (2 * Math.PI);
  if (totalAngle < 0) totalAngle += (2 * Math.PI);

  return totalAngle * (180 / Math.PI);
}
```

This method reads directly from `precessionLayer.orbitObj.rotation.y`, which represents the pure precession angle in the ecliptic plane (rotation around the world Y-axis). This completely bypasses the scene graph hierarchy and Earth's reference frame effects.

### Method 3: Predictive Dynamic (the shipped physical-beat formula)

**What it measures:** The instantaneous Earth-frame right-ascension rate (coordinate b, Method 1) at any simulation year, computed analytically from the trained physical-beat basis (~2,400 terms; the 429-term system described below is the legacy predecessor and is not shipped).

**Physical meaning:** A machine-learned model of how Earth's reference frame distorts the observed precession rate, capturing all significant harmonics from Earth's obliquity, eccentricity, and perihelion cycles.

**Characteristics:**
- Dynamic — updates with the current simulation year
- Analytical — no need to sample the simulation over centuries
- Covers all 7 planets (Mercury through Neptune)
- Ported from Python (`tools/lib/python/predictive_formula.py`)

| Metric | Mercury Example |
|--------|-----------------|
| Earth-frame RA rate at 1900 | <!--v:mercuryEarthFrameRa1900-->579.84<!--/v--> arcsec/century |
| Earth-frame RA rate at 2000 | <!--v:mercuryEarthFrameRa2000-->579.83<!--/v--> arcsec/century |
| Fluctuation range | ±100 arcsec/century (varies by epoch) |
| Feature count | 429 terms in 25 groups |

**How it works:**

```
1. Build 429-term feature vector from:
   - Planet/Earth angle differences and their sin/cos
   - Earth obliquity (normalized), eccentricity (normalized)
   - Earth Rate Deviation (ERD) — derivative of Earth perihelion
   - Periodic terms, cross-terms, beat frequencies
   - Venus-specific interactions, higher harmonics

2. Dot product with trained coefficients → fluctuation (″/cy)

3. Total = baseline heliocentric rate + fluctuation
```

**Usage in planetStats:**
- "Missing advance of perihelion" = `predictGeocentricPrecession(year, planet)` − baseline
- "Perihelion precession (Geocentric)" = `predictGeocentricPrecession(year, planet)`

---

## The Fluctuation Pattern

### Observed Pattern

Analysis of Mercury's perihelion precession over ~49,000 years revealed:

| Metric | Value |
|--------|-------|
| Mean rate | 531.4 arcsec/century |
| Minimum rate | 427 arcsec/century |
| Maximum rate | 710 arcsec/century |
| Range | 283 arcsec/century |
| Fluctuation | ±50% of mean |
| Dominant period | ~7,450 years |

### Root Cause

The ~7,450 year period corresponds to `H / 45`, which is a harmonic interaction between:

1. **Earth's Inclination Precession**: Period = H/3
2. **Earth's Ecliptic Precession**: Period = H/5

The beat frequency between these two precession cycles:

```
1/(1/3 - 1/5) = 1/(2/15) = 15/2 = 7.5

H / 7.5 = ~44,709 years (fundamental beat)

The 6th harmonic of this: H / 45 = ~7,451 years — the dominant observed period.
```

### Scene Hierarchy Effect

The fluctuations arise because Mercury's perihelion marker inherits all parent transformations in the scene graph:

```
startingPoint
  └── earth
        └── earthInclinationPrecession      ← Rotation affects Mercury
              └── earthEclipticPrecession   ← Rotation affects Mercury
                    └── earthObliquityPrecession
                          └── earthPerihelionPrecession1
                                └── earthPerihelionPrecession2
                                      └── barycenterEarthAndSun
                                            └── mercuryPerihelionDurationEcliptic1
                                                  └── mercuryPerihelionFromEarth
                                                        └── mercury
```

When measuring in Earth's equatorial frame, all these rotations compound to create the apparent fluctuation in precession rate.

### Why the Average Converges

Over a complete cycle of all Earth precession periods (the Earth Fundamental Cycle H), the oscillations in each direction cancel out:

- Sometimes Earth's orientation adds to the apparent precession rate
- Sometimes it subtracts from it
- The integral over the full cycle equals zero

Therefore, the long-term average of Earth-frame measurements equals the true Ecliptic value.

---

## Historical Context: Mercury's Perihelion Anomaly

### The Classical Problem (1859)

Urbain Le Verrier discovered that Mercury's observed perihelion precession (~575 arcsec/century) exceeded Newtonian predictions (~532 arcsec/century) by about 43 arcsec/century. This discrepancy remained unexplained for 56 years.

### Einstein's Solution (1915)

General Relativity explained the additional 43 arcsec/century as a consequence of spacetime curvature near the Sun. This was one of the first experimental confirmations of General Relativity.

### Relationship to This Model

| Effect | Rate | Nature |
|--------|------|--------|
| This model's configured precession | 531.4 arcsec/century | Newtonian mechanics |
| Earth-frame fluctuation | ±100 arcsec/century | Reference frame artifact (averages to zero) |
| Relativistic correction | +43 arcsec/century | Real physical effect (not in this model) |

**Important distinction:**
- The Earth-frame fluctuations shown in this model are **coordinate artifacts** that average out over time
- The relativistic 43 arcsec/century is a **real physical effect** that accumulates continuously and never averages out

The Earth-frame showing ~575 arcsec/century currently might be coincidental - we happen to be at a high point in the ~7,450 year fluctuation cycle. This is NOT the same as the relativistic anomaly.

---

## Practical Usage

### When to Use Earth-Frame

- Understanding what historical astronomers measured
- Visualizing how Earth's orientation affects observations
- Studying the interaction between Earth's precession cycles

### When to Use Ecliptic-Frame

- Comparing to published orbital elements (J2000 ecliptic)
- Verifying the model's configured precession rates
- Scientific calculations requiring stable reference frames

### GUI Display

Both values are shown in the "Perihelion Planets" folder for each planet:
- `Mercury (Geocentric)` - Earth-frame value (fluctuates)
- `Mercury (Heliocentric)` - Ecliptic-frame value (stable)

---

## References

- [13-mercury-precession-breakdown.md](13-mercury-precession-breakdown.md) - Mercury precession analysis
- [21-orbital-formulas-reference.md](21-orbital-formulas-reference.md) - Orbital mechanics calculations
- [04-dynamic-elements-overview.md](04-dynamic-elements-overview.md) - Earth precession layer documentation
- [Mercury Precession Centuries](../tools/verify/mercury-precession-centuries.js) - Precession rates by century (1800-2100)

---

*Related to: Perihelion longitude calculations in script.js*
