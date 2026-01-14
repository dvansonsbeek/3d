# Invariable Plane Overview

This document provides a conceptual overview of the invariable plane and how the Holistic Universe Model uses it as a fundamental reference frame.

---

## What is the Invariable Plane?

The **invariable plane** is the plane passing through the solar system's barycenter (center of mass) perpendicular to its total angular momentum vector. It is the most fundamental reference plane for the solar system because:

1. **It is truly fixed** - Unlike the ecliptic, it doesn't change over time
2. **Defined by physics** - Perpendicular to the total angular momentum
3. **Dominated by giant planets** - Jupiter contributes 60.3%, Saturn 24.5%, Neptune 7.9%, Uranus 5.3%

The invariable plane is within 0.5° of Jupiter's orbital plane (specifically 0.32°).

---

## Why the Invariable Plane Matters

### The Problem with the Ecliptic

The **ecliptic** (Earth's orbital plane) is traditionally used as the reference for planetary positions. However, the ecliptic is not fixed—it tilts over time as Earth's orbital plane precesses around the invariable plane.

This creates a confusing situation:
- Planetary inclinations measured relative to the ecliptic change over time
- Even if a planet's orbit relative to the invariable plane is stable, its "ecliptic inclination" varies
- The ~111,296-year precession cycle means measurements from different epochs aren't directly comparable

### The Invariable Plane Solution

By measuring positions relative to the invariable plane:
- Values are truly constant over astronomical timescales
- All planetary motions can be compared on equal footing
- The fundamental physics of the solar system becomes clearer

---

## Invariable Plane Orientation

### Source: Souami & Souchay (2012)

The definitive modern reference is [Souami & Souchay (2012)](https://www.aanda.org/articles/aa/full_html/2012/07/aa19011-12/aa19011-12.html), "The solar system's invariable plane", published in Astronomy & Astrophysics.

**Key findings at J2000.0 epoch:**

| Parameter | Value |
|-----------|-------|
| Inclination to ecliptic | 1°34'43.3" ≈ **1.578°** |
| Ascending node on ecliptic | 107°34'56" ≈ **107.58°** |

### The Ecliptic-Invariable Relationship

Since the ecliptic IS Earth's orbital plane, we can flip the perspective:

| Viewpoint | Value | Meaning |
|-----------|-------|---------|
| Invariable plane's ascending node on ecliptic | 107.58° | Where invariable plane crosses *up* through ecliptic |
| Earth's ascending node on invariable plane | 284.51° | Where Earth's orbit crosses *up* through invariable plane |

These values differ by ~177° (not exactly 180°) due to measurement precision and the fact that the "mean ecliptic" is a defined plane, not identical to Earth's instantaneous orbit.

---

## Planetary Inclinations to the Invariable Plane

Each planet's orbit is tilted relative to the invariable plane. These values are fundamentally more stable than ecliptic inclinations:

| Planet | Inclination to Inv. Plane | Inclination to Ecliptic | Notes |
|--------|---------------------------|------------------------|-------|
| Mercury | 6.35° | 7.01° | Highest inclination |
| Venus | 2.15° | 3.39° | |
| Earth | 1.48° (mean) | 0° (by definition) | Oscillates 0.85° - 2.12° |
| Mars | 1.63° | 1.85° | |
| Jupiter | 0.32° | 1.30° | Closest to invariable plane |
| Saturn | 0.93° | 2.49° | |
| Uranus | 0.99° | 0.77° | |
| Neptune | 0.74° | 1.77° | |
| Pluto | 15.55° | 17.14° | Dwarf planet |

**Key observations:**

1. **Giant planets have small inclinations** (0.32°-1.02°) because they collectively define the invariable plane through their dominant angular momentum
2. **Inner planets have larger inclinations** (1.57°-6.35°) because they contribute negligibly to total angular momentum
3. **For all planets except Earth**, inclination to the invariable plane is smaller than inclination to the ecliptic

---

## Planetary Crossings

### Every Planet Crosses the Invariable Plane

Every planet's orbit is tilted relative to the invariable plane. This means:

1. **Half of each orbit is ABOVE the invariable plane**
2. **Half of each orbit is BELOW the invariable plane**
3. The planet crosses the invariable plane at two points:
   - **Ascending Node**: Planet goes from below to above
   - **Descending Node**: Planet goes from above to below

### Earth's Crossings

Earth crosses the invariable plane **twice per year**:

| Crossing | When | Earth's Position |
|----------|------|------------------|
| **Ascending** (below → above) | Early July | Heliocentric longitude ~284.5° |
| **Descending** (above → below) | Early January | Heliocentric longitude ~104.5° |

**Result:**
- Earth is **ABOVE** the invariable plane from July to January
- Earth is **BELOW** the invariable plane from January to July

### Height Above/Below the Plane

The maximum height a planet reaches above/below the invariable plane depends on:
1. Its inclination to the invariable plane
2. Its distance from the Sun

| Planet | Max Height | When |
|--------|------------|------|
| Mercury | ~0.05 AU | At perihelion, 90° from node |
| Earth | ~0.03 AU | Near aphelion, 90° from node |
| Jupiter | ~0.03 AU | Despite tiny inclination, large distance |

---

## The Inclination Cycle vs. Annual Crossings

A common misconception is that Earth's position relative to the invariable plane follows the ~111,296-year inclination cycle. In reality:

| Timescale | What Changes | Effect |
|-----------|-------------|--------|
| **1 year** | Earth's position in its orbit | Earth crosses plane twice per year |
| **~111,296 years** | Earth's orbital plane tilt | Changes HOW FAR above/below Earth gets |

```
Year 2000:
- Earth's orbit tilted ~1.57° from invariable plane
- Earth crosses invariable plane in ~January and ~July
- Maximum height above/below: sin(1.57°) × 1 AU ≈ 0.027 AU ≈ 4 million km

Year 50000 (minimum tilt):
- Earth's orbit tilted ~0.85° from invariable plane
- Earth STILL crosses invariable plane twice per year
- Maximum height: sin(0.85°) × 1 AU ≈ 0.015 AU ≈ 2.2 million km (min ~0.848°)
```

The crossing dates shift over the ~111,296-year precession cycle as the ascending node circulates through 360°.

---

## Orbital Plane Precession

All planetary orbital planes **precess around the invariable plane** like spinning tops:

| Body | Precession Period | Notes |
|------|-------------------|-------|
| Earth | ~111,296 years | One-third of holistic year |
| Jupiter-Saturn | ~50,000-60,000 years | Coupled motion |
| Invariable plane | Essentially fixed | Varies < 0.1 mas over 100 years |

As orbital planes precess:
1. The ascending node circulates through 360°
2. The inclination oscillates (the plane "nods")
3. These are coupled motions—two aspects of the same precession

---

## Visualization in the Simulation

The 3D simulation shows the invariable plane as a translucent disc. Enable it via **Celestial Tools > Earth Inclination to Invariable plane**.

### What You Can See

1. **The plane itself** - A translucent disc centered on the Sun
2. **Earth's height indicator** - A line showing Earth's current distance above/below the plane
3. **Crossing markers** - Points where Earth's orbit intersects the plane (ascending and descending nodes)
4. **High/low markers** - Points where Earth reaches maximum height above/below the plane

### Visual Elements

| Element | Color | Description |
|---------|-------|-------------|
| Plane disc | Translucent | The invariable plane surface |
| Height line | Variable | Earth's current height above/below |
| Ascending node | Green | Where Earth crosses going north |
| Descending node | Red | Where Earth crosses going south |
| High point | Yellow | Maximum height above plane |
| Low point | Blue | Maximum depth below plane |

### Planet Inspector Values

For each planet, the inspector shows:

| Field | Description |
|-------|-------------|
| Ascending Node on Inv. Plane (Ω) | Where the orbit crosses upward through the plane |
| Height above Inv. Plane | Current distance above (positive) or below (negative) |
| Above/Below status | Whether currently above or below the plane |

---

## Angular Momentum Validation (Option A vs B)

The simulation includes two approaches to verify the invariable plane orientation.

### Background: What Defines the Invariable Plane?

The invariable plane is perpendicular to the **total angular momentum vector** of the solar system. Since angular momentum is conserved in an isolated system, this plane is fixed in space—unlike the ecliptic, which slowly precesses over time.

For a planet in an elliptical orbit, the **specific angular momentum** (per unit mass) is:

```
h = √(GM☉ × a × (1 - e²))
```

The **total angular momentum** of a planet is `L = mass × h`.

### Option A: Calculated from Angular Momentum

The function `calculateInvariablePlaneFromAngularMomentum()` computes the invariable plane orientation dynamically:

**Step 1:** Calculate each planet's angular momentum magnitude

**Step 2:** Convert to 3D vector using inclination (i) and ascending node (Ω):
```
L_x = L × sin(i) × sin(Ω)
L_y = L × cos(i)
L_z = L × (-sin(i) × cos(Ω))
```

**Step 3:** Sum all vectors: `L_total = Σ L_planet`

**Step 4:** Calculate tilt: `tilt = arccos(L_total_y / |L_total|)`

**Step 5:** Calculate ascending node: `ascending_node = atan2(L_total_x, -L_total_z)`

### Angular Momentum Contributions by Planet

| Planet | Mass (kg) | a (AU) | L (% of total) |
|--------|-----------|--------|----------------|
| Mercury | 3.30 × 10²³ | 0.387 | 0.01% |
| Venus | 4.87 × 10²⁴ | 0.723 | 2.0% |
| Earth | 5.97 × 10²⁴ | 1.000 | 2.9% |
| Mars | 6.42 × 10²³ | 1.524 | 0.5% |
| **Jupiter** | 1.90 × 10²⁷ | 5.203 | **60.2%** |
| **Saturn** | 5.68 × 10²⁶ | 9.537 | **24.5%** |
| Uranus | 8.68 × 10²⁵ | 19.19 | 5.2% |
| Neptune | 1.02 × 10²⁶ | 30.07 | 6.8% |

**Key insight**: Jupiter (60%) and Saturn (25%) contribute ~85% of the total angular momentum. The invariable plane orientation is dominated by these two gas giants.

### Option B: Published Reference Data (Souami & Souchay 2012)

| Parameter | Value |
|-----------|-------|
| Inclination to ecliptic | 1°34'43.3" = **1.5787°** |
| Ascending node on ecliptic | 107°34'56" = **107.582°** |

### Important: Two Different Reference Frames

> **~107°**: Where the invariable plane crosses the ecliptic (going north)
> **~284°**: Where Earth's orbit crosses the invariable plane (going north)

These differ by ~177° (not exactly 180° due to 3D geometry). The simulation uses **284°** (Earth's ascending node on the invariable plane) from Souami & Souchay.

### Validation Output

| Field | Description | Expected |
|-------|-------------|----------|
| Calculated Tilt | Invariable plane tilt from ecliptic | 1.5787° ± 0.01° |
| Calculated Asc. Node | Ascending node on ecliptic | ~107° ± 0.5° |
| Jupiter L (%) | Jupiter's angular momentum contribution | 58-62% |
| Saturn L (%) | Saturn's angular momentum contribution | 23-26% |
| A vs B Diff | Difference between methods | < 0.1° |

### Why This Validation Matters

1. **Self-consistency check**: Confirms orbital elements produce correct invariable plane
2. **Educational**: Shows users how angular momentum defines the plane
3. **Debugging**: If values diverge, indicates data inconsistency
4. **Independence**: Two different calculation methods should agree

**Location:** `script.js` lines 19007-19089

---

## Mass-Weighted Balance Tracking

The simulation tracks whether planets are balanced above and below the invariable plane over time.

### Physics Rationale

Since the invariable plane is defined by total angular momentum, the mass-weighted average height of all planets should oscillate around zero over long timescales. This provides another validation of the model's accuracy.

### Balance Indicators

| Field | Description |
|-------|-------------|
| Mass Balance (AU) | Mass-weighted average height: `Σ(mass × height) / total_mass` |
| Planets Above | Number of planets currently above the plane |
| Planets Below | Number of planets currently below the plane |

### Balance Trend Analysis

The simulation can track balance over time to verify convergence to zero:

| Field | Description |
|-------|-------------|
| Years Tracked | Duration since tracking started |
| Sample Count | Number of yearly samples recorded |
| Lifetime Average | Running average (should converge to ~0) |
| Min/Max Seen | Range of observed balance values |

**Expected behavior:** Over periods exceeding Neptune's orbital period (~165 years), the lifetime average should approach zero.

### Functions

| Function | Description |
|----------|-------------|
| `updateInvariablePlaneBalance()` | Calculates mass-weighted balance each frame |
| `updateBalanceTrendAnalysis()` | Records yearly samples when tracking is active |
| `startBalanceTracking()` | Begins new tracking session |
| `stopBalanceTracking()` | Pauses tracking (preserves data) |
| `resetBalanceTracking()` | Clears all tracking data |

**Location:** `script.js` lines 18861-18991

---

## Summary

The invariable plane provides a fixed reference frame for understanding the solar system's geometry:

- **Fixed in space** - Unlike the precessing ecliptic
- **Physics-based** - Perpendicular to total angular momentum
- **Universal reference** - All planetary motions can be measured consistently

Every planet, including Earth, crosses this plane twice per orbit. The ~111,296-year precession cycle determines how tilted each orbit is, but the crossings happen on orbital timescales (1 year for Earth, 12 years for Jupiter, etc.).

The angular momentum validation (Option A vs B) and mass-weighted balance tracking provide continuous verification that the simulation accurately represents the solar system's physics.

---

## Further Reading

For technical implementation details:
- [16 - Invariable Plane Calculations](16-invariable-plane-calculations.md) - Height calculation formulas and code
- [15 - Inclination Calculations](15-inclination-calculations.md) - Dynamic inclination oscillations

For constants and data:
- [10 - Constants Reference](10-constants-reference.md) - All invariable plane constants

---

**Previous**: [04 - Dynamic Elements Overview](04-dynamic-elements-overview.md)
**Next**: [10 - Constants Reference](10-constants-reference.md)
