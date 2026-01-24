# Perihelion Longitude Calculation Methods

## Overview

This document describes the two methods used to calculate perihelion longitude in the 3D Solar System model, their technical implementation, and the fluctuation patterns observed in Earth-frame measurements.

---

## The Two Methods

### Method 1: Earth-Frame (Equatorial RA)

**What it measures:** The apparent Right Ascension of a planet's perihelion as observed from Earth's equatorial coordinate system.

**Physical meaning:** This is what an astronomer on Earth would measure when determining the direction of a planet's perihelion point, expressed in the Earth's equatorial coordinate system.

**Characteristics:**
- Fluctuates over time due to Earth's precession cycles
- Shows apparent precession rates that vary significantly from the true heliocentric rate
- Over very long periods (~300,000 years), the average converges to the Ecliptic value

| Metric | Mercury Example |
|--------|-----------------|
| Current rate (year 2000) | ~575 arcsec/century |
| Long-term average | ~534 arcsec/century |
| Fluctuation range | ±100 arcsec/century |
| Fluctuation period | ~6,500 years |

### Method 2: Ecliptic-Frame (J2000 Ecliptic)

**What it measures:** The longitude of perihelion in the J2000 ecliptic coordinate system, directly from the model's precession layer.

**Physical meaning:** This is the "true" heliocentric precession rate - the rate at which the perihelion point advances around the Sun in an inertial reference frame.

**Characteristics:**
- Perfectly stable - no fluctuations
- Represents the configured precession rate in the model
- Standard astronomical reference frame for orbital elements

| Metric | Mercury Example |
|--------|-----------------|
| Rate | Exactly 533.7 arcsec/century |
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
- Axial precession (~25,684 year cycle)
- Obliquity variations (~41,736 year cycle)
- Inclination precession (~111,296 year cycle)

The `apparentRaFromPdA` function then computes the angle between two objects:

```javascript
function apparentRaFromPdA(pdA, pdB) {
  // 1. Get RA values (in Earth's equatorial frame)
  const ra1 = pdA.ra;  // Earth's perihelion RA
  const ra2 = pdB.ra;  // Planet's perihelion RA

  // 2. Project to 2D equatorial plane (ignoring declination)
  const x1 = r1 * Math.cos(ra1);
  const z1 = r1 * Math.sin(ra1);
  const x2 = r2 * Math.cos(ra2);
  const z2 = r2 * Math.sin(ra2);

  // 3. Calculate apparent angle from Earth perihelion to planet perihelion
  const dx = x2 - x1;
  const dz = z2 - z1;
  let apparentRA = Math.atan2(dz, dx);

  // 4. Return opposite direction (perihelion is opposite to aphelion view)
  return (apparentRA + Math.PI) * (180 / Math.PI);
}
```

#### 2D Projection Limitation

**Important:** This function uses a 2D projection that ignores declination.

**Current 2D approach:**
```
x = r × cos(ra)
z = r × sin(ra)
```

**Correct 3D approach would be:**
```
x = r × cos(dec) × cos(ra)
z = r × cos(dec) × sin(ra)
y = r × sin(dec)
```

**Impact of ignoring declination:**

| Declination Difference | Radial Error | Angular Error | Impact |
|------------------------|--------------|---------------|--------|
| 0° (same dec) | 0% | 0° | None |
| 5° | ~0.4% | ~2-3° | Minor |
| 10° | ~1.5% | ~5-8° | Noticeable |
| 23.4° (max ecliptic) | ~8% | Up to ~26° | Significant |

**Why this matters:**
- The ecliptic is tilted ~23.4° from the equator
- Perihelion markers on the ecliptic can have declinations up to ±23.4°
- When comparing two points at **different** declinations, the 2D projection introduces errors
- When comparing two points at **similar** declinations, errors largely cancel out

**For perihelion precession measurements:**
- Perihelion markers typically stay at similar declinations over short time periods
- The 2D approximation is acceptable for relative angular changes
- For high-precision absolute positions, a 3D approach would be more accurate

**Potential 3D improvement:**
```javascript
// Full 3D position calculation
const x1 = r1 * Math.cos(dec1) * Math.cos(ra1);
const z1 = r1 * Math.cos(dec1) * Math.sin(ra1);
const x2 = r2 * Math.cos(dec2) * Math.cos(ra2);
const z2 = r2 * Math.cos(dec2) * Math.sin(ra2);

// Then compute angle in the equatorial plane
const dx = x2 - x1;
const dz = z2 - z1;
let angle = Math.atan2(dz, dx);
```

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

---

## The Fluctuation Pattern

### Observed Pattern

Analysis of Mercury's perihelion precession over ~49,000 years revealed:

| Metric | Value |
|--------|-------|
| Mean rate | 533.7 arcsec/century |
| Minimum rate | 427 arcsec/century |
| Maximum rate | 710 arcsec/century |
| Range | 283 arcsec/century |
| Fluctuation | ±50% of mean |
| Dominant period | ~6,500 years |

### Root Cause

The ~6,500 year period corresponds to `holisticyearLength / 45 = 6,626 years`, which is a harmonic interaction between:

1. **Earth's Inclination Precession**: Period = holisticyearLength / 3 ≈ 111,296 years
2. **Earth's Ecliptic Precession**: Period = holisticyearLength / 5 ≈ 66,778 years

The beat frequency between these two precession cycles:

```
1/(1/3 - 1/5) = 1/(2/15) = 15/2 = 7.5

holisticyearLength / 7.5 ≈ 39,756 years (fundamental beat)

Further harmonics divide this, producing the ~6,500 year observed period.
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

Over a complete cycle of all Earth precession periods (the Holistic Year of ~333,888 years), the oscillations in each direction cancel out:

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
| This model's configured precession | 532 arcsec/century | Newtonian mechanics |
| Earth-frame fluctuation | ±100 arcsec/century | Reference frame artifact (averages to zero) |
| Relativistic correction | +43 arcsec/century | Real physical effect (not in this model) |

**Important distinction:**
- The Earth-frame fluctuations shown in this model are **coordinate artifacts** that average out over time
- The relativistic 43 arcsec/century is a **real physical effect** that accumulates continuously and never averages out

The Earth-frame showing ~575 arcsec/century currently might be coincidental - we happen to be at a high point in the ~6,500 year fluctuation cycle. This is NOT the same as the relativistic anomaly.

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
- `Mercury (Earth)` - Earth-frame value (fluctuates)
- `Mercury (Ecliptic)` - Ecliptic-frame value (stable)

---

## References

- [17-mercury-precession-breakdown.md](17-mercury-precession-breakdown.md) - Mercury precession analysis
- [11-orbital-formulas-reference.md](11-orbital-formulas-reference.md) - Orbital mechanics calculations
- [04-dynamic-elements-overview.md](04-dynamic-elements-overview.md) - Earth precession layer documentation
- [Appendix G - Mercury Precession Centuries](appendix-g-mercury-precession-centuries.js) - Precession rates by century (1800-2100)

---

*Document created: 2025-12-26*
*Related to: Perihelion longitude calculations in script.js*
