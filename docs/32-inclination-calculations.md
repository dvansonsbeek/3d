# Inclination Calculations

This document describes how planetary orbital inclinations are calculated in the Holistic Universe Model. Inclination calculations involve two distinct but related concepts:

1. **Inclination to the Invariable Plane** - How much each planet's orbital plane tilts relative to the solar system's fundamental reference plane (oscillates over time)
2. **Inclination to the Ecliptic** - How much each planet's orbital plane tilts relative to Earth's orbital plane (changes as both planes move)

---

## Physical Background

### The Invariable Plane

The **invariable plane** is the fundamental reference plane of the solar system—perpendicular to the total angular momentum vector. Unlike the ecliptic, the invariable plane is truly fixed in space.

### Why Inclinations Change

Each planet's orbital plane precesses around the invariable plane due to gravitational torques from other planets. This precession has two effects:

1. **Ascending node (Ω) rotates** - The line where the orbital plane crosses the invariable plane precesses over time
2. **Inclination oscillates** - The plane tilts toward and away from the invariable plane

The inclination oscillation is driven by the ICRF perihelion longitude (ω̃), not the ascending node. The ICRF perihelion rate equals the ecliptic perihelion rate minus the general precession rate (H/13).

### Reference Frames

```
                    INVARIABLE PLANE (fixed)
                    =======================
                           ↑
                           | Planet's inclination (oscillates)
                           ↓
                    PLANET'S ORBITAL PLANE
                           ↑
                           | Earth's inclination (oscillates 0.85° - 2.12°)
                           ↓
    ─────────────────── ECLIPTIC (tilts over time) ───────────────────
```

The **ecliptic inclination** (what we traditionally measure) depends on both:
- The planet's own inclination to the invariable plane
- Earth's inclination to the invariable plane

---

## Part 1: Inclination Oscillations to the Invariable Plane

### The ICRF Perihelion Approach

The model calculates dynamic inclination using the planet's ICRF perihelion longitude:

```
i(t) = mean + amplitude × cos(ω̃_ICRF(t) - cycleAnchor)
```

Where:
- `mean` = Computed from J2000 constraint (mean = inclJ2000 - amplitude × cos(ω̃_J2000 - cycleAnchor))
- `amplitude` = Fibonacci-derived: ψ / (d × √m), see [Fibonacci Laws](10-fibonacci-laws.md)
- `ω̃_ICRF(t)` = Current ICRF perihelion longitude (ecliptic perihelion minus general precession)
- `cycleAnchor` = Per-planet cycle anchor (ICRF perihelion longitude where MAX inclination occurs, evaluated at the balanced year — see table below)

### Why This Works

The ICRF perihelion longitude tracks each planet's apsidal precession in an inertial frame. As the perihelion sweeps through its cycle:
- At `ω̃_ICRF(t) = cycleAnchor`: `cos(0°) = +1` → **Maximum inclination** (mean + amplitude)
- At `ω̃_ICRF(t) = cycleAnchor + 90°`: `cos(90°) = 0` → Mean inclination
- At `ω̃_ICRF(t) = cycleAnchor + 180°`: `cos(180°) = -1` → **Minimum inclination** (mean - amplitude)

For Saturn (anti-phase), the sign is flipped: MAX at balanced year (where others are at MIN).

### Per-Planet Cycle Anchors

Each planet's inclination cycle anchor is the ICRF perihelion longitude where the planet reaches its inclination extremum (MAX for in-phase, MIN for Saturn). After a 2026-04-09 audit that re-fitted the JPL ecliptic-inclination trends in the J2000-fixed frame and adjusted the asc-node integers `ascendingNodeCyclesIn8H`, all seven fitted planets share the **same balanced-year anchor**: **n=7, year ≈ -2,649,854** (the oldest of the eight anchors in the current Grand Holistic Octave).

| Planet | Cycle Anchor | Balance Group | n | Balanced Year | ICRF Direction | Incl. Trend at J2000 |
|--------|-------------|---------------|----------|-------------|----------------|----------------------|
| Mercury | 234.52° | In-phase | n=7 | -2,649,854 | Retrograde | Decreasing |
| Venus | 259.82° | In-phase | n=7 | -2,649,854 | Retrograde | Decreasing |
| Earth | 21.77° | In-phase | n=0 (locked) | -302,635 | Prograde | Decreasing |
| Mars | 231.95° | In-phase | n=7 | -2,649,854 | Retrograde | Decreasing |
| Jupiter | 291.18° | In-phase | n=7 (= n=0)* | -2,649,854 | Retrograde | Decreasing |
| **Saturn** | **120.38°** | **Anti-phase** | n=7 (= n=0)* | -2,649,854 | **Retrograde** | **Increasing** |
| Uranus | 21.33° | In-phase | n=7 (= n=0)* | -2,649,854 | Retrograde | Decreasing |
| Neptune | 174.04° | In-phase | n=7 | -2,649,854 | Retrograde | Decreasing |
| Pluto | 203.32° | — | — | — | Retrograde | — |

\* Jupiter, Saturn, and Uranus have ICRF perihelion periods that divide H exactly, so their phase at n=7 coincides numerically with their phase at n=0. The conceptual anchor is still n=7 — the oldest balanced year of the current 8H octave.

**Key insights**:
- All seven fitted planets share the same balanced-year anchor (n=7, ≈ -2,649,854 BC = the **start of the current Grand Holistic Octave**).
- Earth's cycle anchor is set independently from the IAU obliquity model and is locked to the n=0 reference; this is consistent with n=7 because Earth's H/3 ICRF return divides 8H seven times.
- Balance groups are determined by the **invariable plane balance condition**: Σ(in-phase) w = Σ(anti-phase) w (Law 3, scalar form).
- Saturn is **anti-phase**: its inclination is at MAX at n=7 while all other planets are at MIN.
- Earth is the **sole planet** with prograde ICRF perihelion motion (+H/3); all others are retrograde.
- The cycle anchors give a total inclination trend error of ~4.3″/century across all 7 fitted planets in the [J2000-fixed frame](#two-frames--be-careful-which-one-you-mean), with all 7 directions matching JPL.

### Inclination Constants

All values derived from **Fibonacci Laws** (amplitude = ψ / (d × √m)) with means computed for **exact J2000 invariable plane inclination match** (verified by [Inclination Optimization](../tools/verify/inclination-optimization.js) and [Inclination Verification](../tools/verify/inclination-verification.js)):

For current values, see [Constants Reference](20-constants-reference.md).

| Planet | Mean | Amplitude |
|--------|------|-----------|
| Mercury | `mercuryInvPlaneInclinationMean` | `mercuryInvPlaneInclinationAmplitude` |
| Venus | `venusInvPlaneInclinationMean` | `venusInvPlaneInclinationAmplitude` |
| Earth | `earthInvPlaneInclinationMean` | `earthInvPlaneInclinationAmplitude` |
| Mars | `marsInvPlaneInclinationMean` | `marsInvPlaneInclinationAmplitude` |
| Jupiter | `jupiterInvPlaneInclinationMean` | `jupiterInvPlaneInclinationAmplitude` |
| Saturn | `saturnInvPlaneInclinationMean` | `saturnInvPlaneInclinationAmplitude` |
| Uranus | `uranusInvPlaneInclinationMean` | `uranusInvPlaneInclinationAmplitude` |
| Neptune | `neptuneInvPlaneInclinationMean` | `neptuneInvPlaneInclinationAmplitude` |
| Pluto | `plutoInvPlaneInclinationMean` | `plutoInvPlaneInclinationAmplitude` |

### Implementation

```javascript
function computePlanetInvPlaneInclinationDynamic(planet, currentYear) {
  // Get planet-specific constants
  const mean = mercuryInvPlaneInclinationMean;
  const amplitude = mercuryInvPlaneInclinationAmplitude;
  const icrfPeriod = mercuryPerihelionICRFYears;     // |ICRF period|
  const periLongJ2000 = mercuryLongitudePerihelion;   // ICRF perihelion at J2000
  const cycleAnchor = mercuryInclinationCycleAnchor;  // 234.52° (n=7 anchor)

  // Calculate current ICRF perihelion longitude
  const yearsSinceJ2000 = currentYear - 2000;
  const icrfRate = 360 / icrfPeriod;  // negative for retrograde planets
  const periLongCurrent = periLongJ2000 + icrfRate * yearsSinceJ2000;

  // Calculate inclination from ICRF perihelion position
  const phaseDeg = periLongCurrent - cycleAnchor;
  const phaseRad = phaseDeg * Math.PI / 180;

  // Saturn is anti-phase: flip the cosine sign
  const sign = (planet === 'saturn') ? -1 : 1;
  return mean + sign * amplitude * Math.cos(phaseRad);
}
```

### ICRF Perihelion Periods

The inclination oscillation period equals the absolute ICRF perihelion period for each planet. The ICRF rate = ecliptic rate − general precession (H/13):

| Planet | Ecliptic Period | ICRF Period | ICRF Direction |
|--------|----------------|-------------|----------------|
| Mercury | `H × 8/11` | `8H/93` ≈ 28,844 yr | Retrograde |
| Venus | `−8H/6` | `8H/110` ≈ 24,387 yr | Retrograde |
| Earth | `H / 3` | `H/3` ≈ 111,772 yr | Prograde (sole) |
| Mars | `H × 8/35` | `8H/69` ≈ 38,877 yr | Retrograde |
| Jupiter | `H / 5` | `H/8` ≈ 41,915 yr | Retrograde |
| Saturn | `H / 8` | `H/5` ≈ 67,063 yr | Retrograde |
| Uranus | `H / 3` | `H/16` ≈ 20,957 yr | Retrograde |
| Neptune | `H × 2` | `2H/25` ≈ 26,825 yr | Retrograde |
| Pluto | `H` | `H/14` ≈ 23,951 yr | Retrograde |

For computed period values, see [Constants Reference](20-constants-reference.md).

### Grand Holistic Octave (8H)

All ICRF perihelion periods divide evenly into 8H = 2,682,536 years (the "Grand Holistic Octave"), ensuring all 8 planets return simultaneously to their balanced-year configuration. This is a structural consequence of the Fibonacci period ratios.

---

## Part 2: Ecliptic Inclination Calculation

### Two Frames — Be Careful Which One You Mean

When we talk about a planet's "ecliptic inclination", there are **two distinct quantities** that look almost identical at J2000 but have very different time derivatives:

1. **Inclination to the J2000 ecliptic** (fixed in inertial space)
   The angle between the planet's orbital plane at time *t* and Earth's orbital plane *frozen at J2000*. The reference plane never moves.
   This is the quantity JPL publishes in [Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html), with the header
   *"Keplerian elements and their rates, with respect to the mean ecliptic and equinox of J2000"*.

2. **Inclination to the ecliptic of date** (instantaneous)
   The angle between the planet's orbital plane at time *t* and Earth's orbital plane *also at time t*. The reference plane is moving — Earth's orbital plane oscillates at the H/3 ICRF cycle and its node regresses at −H/5.

The two definitions agree exactly **only at the J2000 instant**. A century away from J2000, Earth's plane has drifted by ~0.015°, and a planet's "ecliptic inclination" looks different in the two frames by a comparable amount. For Saturn (JPL `dI/dt` = +0.00194°/cy ≈ 7″/cy) and Neptune (+0.00035°/cy ≈ 1.27″/cy), this Earth-plane drift is **larger than the trend itself** and changes its sign.

**Always compare the model against the J2000-fixed frame when comparing to JPL `dI/dt` values.** All trend-search and verification scripts in `tools/` use the J2000-fixed frame for JPL comparison, even though the visual scene-graph and the dynamic balance simulator use the moving Earth plane internally (since that's what physically rotates with the rest of the system).

### Why the Distinction Matters

A planet's invariable-plane inclination oscillates slowly (period ~30–100 kyr depending on the planet's ICRF rate). Earth's invariable-plane inclination oscillates at H/3 ≈ 112 kyr with amplitude 0.636°. When you compute the angle between two oscillating planes, the time derivatives **partially cancel**:

```
d/dt angle(planet, Earth-of-date) = d_planet/dt − d_earth/dt + cross-terms
d/dt angle(planet, Earth-J2000)   = d_planet/dt only (from a fixed reference)
```

For inner planets, the cancellation is fortuitous — `d_planet/dt` and `d_earth/dt` are similar in magnitude, so the moving-frame derivative looks small (matching JPL coincidentally). For the outer giants the cancellation is destructive — the moving-frame derivative gets the *wrong sign* relative to JPL.

This was the root cause of an extended search across rate-based hypotheses (single-rate, two-rate partition, eigenmode wobble) that all looked broken for Saturn/Neptune. The model was right; the comparison frame was wrong. See `tools/explore/jpl-frame-reconciliation.js` for the diagnostic that surfaced this.

### The Problem (model side)

The **ecliptic** (Earth's orbital plane) tilts over time as Earth's inclination to the invariable plane changes. This means a planet's inclination measured relative to the *moving* ecliptic also changes — even if the planet's orbit relative to the invariable plane were perfectly fixed. The scene-graph computes the moving-frame quantity for visualization. JPL trend comparisons use the fixed-J2000 frame.

### The Geometry

Each orbital plane can be represented by its **normal vector** in invariable-plane coordinates:

```
n = (sin(i) × sin(Ω), sin(i) × cos(Ω), cos(i))
```

Where:
- `i` = Inclination to invariable plane
- `Ω` = Ascending node on invariable plane

### Time Evolution of Ω

Both Earth's and each planet's ascending node on the invariable plane evolve linearly over time. They are **distinct angles from the ICRF perihelion** that drives the inclination oscillation, and they evolve at **different rates**. Each planet's Ω regression period is `−(8H)/N` for an integer N stored as `ascendingNodeCyclesIn8H` in `data/planets.json`. After the 2026-04-09 audit:

| Body | N | Ω period (yr) | Notes |
|------|---|---------------|-------|
| Earth | 40 | −H/5 ≈ −67,063 | Ecliptic precession rate (= −(8H)/40) |
| Mercury | 9 | −298,060 | |
| Venus | 1 | −2,682,536 (= −8H) | Full Grand Octave |
| Mars | 63 | −42,580 | |
| Jupiter | 36 | −74,515 | Shared with Saturn (J+S lockstep) |
| Saturn | 36 | −74,515 | Shared with Jupiter |
| Uranus | 12 | −223,545 | |
| Neptune | 3 | −894,179 | |

The integers were chosen to fit JPL ecliptic-inclination trends to <2″/century each in the J2000-fixed frame. Jupiter and Saturn share N=36 because the gas-giant pair's invariable-plane balance requires their nodes to regress in lockstep. See [55-grand-holistic-octave-periods.md](55-grand-holistic-octave-periods.md) for the full derivation.

```javascript
// Earth: Ω regresses at -H/5
const earthOmega = earthAscJ2000 + (360 / (-H / 5)) * (year - 2000);

// Planet: Ω regresses at -(8H)/N
const planetOmega = planetAscJ2000 + (360 / (-(8 * H) / N)) * (year - 2000);
```

The canonical implementations are `computeAscendingNodeInvPlane()` and the inline Earth Ω in `computeEclipticInclination()`, both in [tools/lib/orbital-engine.js](../tools/lib/orbital-engine.js). See [Invariable Plane Calculations](33-invariable-plane-calculations.md#ascending-node-precession) for details.

### The Algorithm

The angle between two planes equals the angle between their normal vectors:

```javascript
// Calculate orbital plane normal in invariable plane coordinates
function getOrbitalNormal(inclination, ascendingNode) {
  const i = inclination * DEG2RAD;
  const Ω = ascendingNode * DEG2RAD;

  return new THREE.Vector3(
    Math.sin(i) * Math.sin(Ω),
    Math.sin(i) * Math.cos(Ω),
    Math.cos(i)
  );
}

// Calculate ecliptic inclination using dot product
function calculateEclipticInclination(planetNormal, eclipticNormal) {
  const cosAngle = planetNormal.dot(eclipticNormal);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  return Math.acos(clampedCos) * RAD2DEG;
}
```

### Full Implementation

```javascript
// Pooled vectors for performance
const _eclipticNormal = new THREE.Vector3();
const _planetNormal = new THREE.Vector3();

function updateDynamicInclinations() {
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;

  // Earth's DYNAMIC inclination and ascending node on the invariable plane.
  // - Inclination oscillates at H/3 (driven by Earth's ICRF perihelion).
  // - Ω regresses linearly at -H/5 (the ecliptic precession rate) — NOT H/3.
  const earthIncl = o.earthInvPlaneInclinationDynamic;
  const earthAscNode = earthAscJ2000 + (360 / (-H / 5)) * (currentYear - 2000);

  // Calculate current ecliptic normal
  const earthI = earthIncl * DEG2RAD;
  const earthOmega = earthAscNode * DEG2RAD;
  _eclipticNormal.set(
    Math.sin(earthI) * Math.sin(earthOmega),
    Math.cos(earthI),
    Math.sin(earthI) * Math.cos(earthOmega)
  );

  // Planet configuration with DYNAMIC inclinations and asc-node values.
  // Each planet's Ω regresses linearly at -(8H)/N where N is the planet's
  // ascendingNodeCyclesIn8H integer (NOT at the perihelionEclipticYears period).
  const ascNodeOf = (key, j2000) =>
    j2000 + (360 / (-(8 * H) / planetData[key].ascendingNodeCyclesIn8H)) * (currentYear - 2000);

  const planets = [
    { key: 'mercury', incl: o.mercuryInvPlaneInclinationDynamic, ascNode: ascNodeOf('mercury', mercuryAscJ2000) },
    { key: 'venus',   incl: o.venusInvPlaneInclinationDynamic,   ascNode: ascNodeOf('venus',   venusAscJ2000)   },
    { key: 'mars',    incl: o.marsInvPlaneInclinationDynamic,    ascNode: ascNodeOf('mars',    marsAscJ2000)    },
    // ... etc for all planets
  ];

  for (const { key, incl, ascNode } of planets) {
    // Calculate planet's orbital plane normal
    const pI = incl * DEG2RAD;
    const pOmega = ascNode * DEG2RAD;
    _planetNormal.set(
      Math.sin(pI) * Math.sin(pOmega),
      Math.cos(pI),
      Math.sin(pI) * Math.cos(pOmega)
    );

    // Calculate ecliptic inclination
    const cosAngle = _planetNormal.dot(_eclipticNormal);
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    const eclipticIncl = Math.acos(clampedCos) * RAD2DEG;

    o[key + 'EclipticInclinationDynamic'] = eclipticIncl;
  }
}
```

### Output Variables

| Variable | Description |
|----------|-------------|
| `o.<planet>InvPlaneInclinationDynamic` | Current inclination to invariable plane (oscillates) |
| `o.<planet>EclipticInclinationDynamic` | Current inclination to ecliptic (calculated from both planes) |

---

## Part 3: J2000 Calibration

### The Calibration Challenge

The model needs to produce exact J2000 ecliptic inclinations while using a physically-based approach. Two sets of ascending node values are maintained:

1. **Souami & Souchay (S&S) values** - Original published values from the 2012 paper
2. **Verified values** - Adjusted values calibrated to match J2000 exactly

### J2000 Ecliptic Inclinations (Reference)

| Planet | J2000 Ecliptic Inclination |
|--------|---------------------------|
| Mercury | 7.00501638° |
| Venus | 3.3946018° |
| Mars | 1.84971028° |
| Jupiter | 1.30450732° |
| Saturn | 2.4853834° |
| Uranus | 0.77234317° |
| Neptune | 1.768273° |
| Pluto | 17.14175° |

### Calibration Method

For each planet, the ascending node is adjusted so that at J2000:
- Using dynamic Earth inclination (~1.578°)
- Using Earth's ascending node (284.51° - Souami & Souchay 2012)
- The calculated ecliptic inclination matches the J2000 reference

The mathematical solution:

```
cos(i_target) = n_planet · n_ecliptic

Expanding:
cos(i_target) = A × sin(Ω_P) × ex + A × cos(Ω_P) × ey + B × ez

Where:
  A = sin(i_P)       [planet inclination to inv. plane]
  B = cos(i_P)
  ex, ey, ez = ecliptic normal components

Solution:
  Ω_P = atan2(ex, ey) ± acos(C / (A × R))

Where:
  C = cos(i_target) - B × ez
  R = sqrt(ex² + ey²)
```

### Verified Ascending Node Values (J2000 starting points)

The values in the table below are the **J2000 starting points** for each planet's ascending node on the invariable plane. They were originally calibrated to reproduce the JPL J2000 ecliptic inclination given Earth's reference Ω of 284.51°. In the current model these starting values are paired with the linear precession rate `−(8H)/N` from the table above (and `−H/5` for Earth) — so Ω(t) = Ω_J2000 + (360 / period) · (t − 2000), and the J2000 ecliptic inclinations remain matched to within ~10⁻⁵°.

Values calibrated with `earthAscendingNodeInvPlaneVerified = 284.51°` (Souami & Souchay 2012):

| Planet | S&S Value (°) | Verified Value (°) | Δ from S&S |
|--------|---------------|--------------------|-----------|
| Mercury | 32.22 | 32.83 | +0.61° |
| Venus | 52.31 | 54.70 | +2.39° |
| Earth | 284.51 | 284.51 | 0.00° |
| Mars | 352.95 | 354.87 | +1.92° |
| Jupiter | 306.92 | 312.89 | +5.97° |
| Saturn | 122.27 | 118.81 | -3.46° |
| Uranus | 308.44 | 307.80 | -0.64° |
| Neptune | 189.28 | 192.04 | +2.76° |
| Pluto | 107.06 | 101.06 | -6.00° |

### Earth's Ascending Node

The value 284.51° for `earthAscendingNodeInvPlaneVerified` is the original Souami & Souchay (2012) value for Earth's ascending node on the invariable plane at J2000.

---

## Part 4: Long-Term Behavior

### Ecliptic Inclination Variations

The ecliptic inclination of each planet varies cyclically due to:
1. **Earth's inclination** oscillating between 0.85° and 2.12°
2. **Planet's inclination** oscillating within its Laplace-Lagrange bounds
3. **Both ascending nodes** precessing at different rates

### Expected Ranges

| Planet | Approx. Min | Approx. Max | Notes |
|--------|-------------|-------------|-------|
| Mercury | ~4.3° | ~8.4° | Large range, highest invariable plane inclination |
| Venus | ~1.3° | ~4.4° | Moderate range |
| Mars | ~0.1° | ~3.2° | Can nearly align with ecliptic |
| Jupiter | ~0.9° | ~1.6° | Small range, closest to invariable plane |
| Saturn | ~1.5° | ~3.4° | Moderate range |
| Uranus | ~0.2° | ~2.0° | Can nearly align with ecliptic |
| Neptune | ~1.0° | ~2.4° | Moderate range |
| Pluto | ~13.5° | ~17.6° | Always highly inclined |

### Special Cases: Mars, Saturn, and Uranus

**Mars** has an invariable plane inclination range (1.36° - 5.84°) that overlaps Earth's range (0.85° - 2.12°). When their inclinations are equal and ascending nodes align, Mars's orbital plane can become **nearly parallel to the ecliptic** (ecliptic inclination approaching 0°).

**Saturn** (0.78° - 1.11°) and **Uranus** (0.92° - 1.04°) also have ranges that overlap Earth's minimum values. These planets can experience very low ecliptic inclinations when the geometry aligns.

**Jupiter** (0.28° - 0.41°) and **Neptune** (0.62° - 0.74°) have inclination ranges entirely **below** Earth's minimum (0.85°), so their planes can never become exactly parallel to the ecliptic, but they can get relatively close (minimum ecliptic inclination ~0.4° for Jupiter).

---

## Validation

### At J2000 (Year 2000)

Dynamic inclinations should match static J2000 values within 0.01°.

### Trend Verification

The model computes ecliptic inclination trends in two frames:

- **Moving frame**: the angle between the planet's orbit and Earth's *current* (moving) orbital plane. This is the physical observable for an Earth-bound observer at any epoch.
- **J2000-fixed frame**: the angle between the planet's orbit and Earth's orbital plane *frozen at J2000*. This matches JPL's published frame ("mean ecliptic and equinox of J2000").

JPL's catalog dI/dt values are in the J2000-fixed frame. The model's primary "Trend" column shows the moving-frame trend. To compare, the code re-expresses JPL's value into the moving frame:

```
frameCorrection = trend_moving − trend_J2000_fixed
JPL_displayed   = JPL_catalog  + frameCorrection
```

The displayed error simplifies to `|trend_J2000_fixed − JPL_catalog|` — a direct J2000-vs-J2000 comparison.

#### Why the frame correction is large

Earth's orbital plane precesses around the invariable plane at -H/5 (~67,063 yr). This ecliptic precession shifts the reference plane by ~0.01°/cy — large enough to flip the apparent sign of the inclination trend for most planets. For example, Mercury's inclination is *increasing* in the moving frame (+0.00488°/cy) but *decreasing* in the J2000-fixed frame (-0.00605°/cy), because the ecliptic is tilting away from Mercury's orbit faster than Mercury's orbit converges toward it.

#### Why only inclination needs a frame correction

Inclination is the angle between two planes — the planet's orbit and the ecliptic. When the ecliptic moves, this angle changes even if the planet's orbit is fixed. No other Keplerian element has this property:

- **Eccentricity** and **semi-major axis** are intrinsic to the orbit's shape. They are frame-independent.
- **Argument of perihelion (ω)** is measured within the orbital plane. Frame-independent.
- **Longitude of perihelion (ϖ = Ω + ω)** is technically frame-dependent through Ω, but the effect is negligible over the short comparison intervals (~200 years) used for rate verification. The ecliptic tilts by only ~0.01° over that span, far below the precision of perihelion rate comparisons.
- **Ascending node (Ω)** is also frame-dependent (measured from the vernal equinox direction in the ecliptic). This is already handled: the `ascendingNodeCyclesIn8H` integers were fit directly to JPL's J2000-fixed-frame trends.
- **Positions (RA/Dec)** are compared in the ICRF, an inertial frame tied to distant quasars. Both the model and JPL output in the same frame.

#### Current results

All seven fitted planets match JPL's J2000-fixed-frame trends in both sign and magnitude, to a total of ~4.3″/century:

| Planet | Model moving (°/cy) | Model J2000 (°/cy) | JPL catalog (°/cy) | Error |
|--------|-------|-------|-------|-------|
| Mercury | +0.00488 | -0.00605 | -0.00595 | 0.4″ |
| Venus | +0.00284 | -0.00124 | -0.00079 | 1.6″ |
| Mars | +0.00207 | -0.00825 | -0.00813 | 0.4″ |
| Jupiter | -0.00359 | -0.00182 | -0.00184 | 0.1″ |
| Saturn | -0.00246 | +0.00242 | +0.00194 | 1.7″ |
| Uranus | +0.00209 | -0.00240 | -0.00243 | 0.1″ |
| Neptune | -0.00901 | +0.00034 | +0.00035 | 0.0″ |

---

## UI Display

### Planet Inspector Panel

The planet information panels display four invariable plane values:

| UI Label | Description |
|----------|-------------|
| **Ascending Node on Inv. Plane (Ω)** | Current ascending node in ecliptic coordinates |
| **Descending Node on Inv. Plane** | Ascending node + 180° |
| **ω̃ at Max Inclination** | ICRF perihelion longitude where inclination reaches maximum (= cycle anchor) |
| **Current Oscillation Phase** | Position in oscillation cycle (0° = max, 180° = min) |

**Note**: The ascending node values use ecliptic coordinates (precession period H/16), while the oscillation phase uses ICRF perihelion coordinates (per-planet ICRF period).

---

## References

1. **Souami, D. & Souchay, J. (2012)** - "The solar system's invariable plane", A&A 543, A133
   - [Full paper](https://www.aanda.org/articles/aa/full_html/2012/07/aa19011-12/aa19011-12.html)
2. **JPL Approximate Positions of the Planets** - Secular variation rates
   - https://ssd.jpl.nasa.gov/planets/approx_pos.html
3. **Laplace-Lagrange Secular Theory** - Eigenmode oscillations
   - https://farside.ph.utexas.edu/teaching/celestial/Celestial/node91.html

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [10 - Fibonacci Laws](10-fibonacci-laws.md) | Fibonacci Laws derivation with balance condition |
| [20 - Constants Reference](20-constants-reference.md) | All inclination and ascending node constants |
| [31 - Ascending Node Calculations](31-ascending-node-calculations.md) | Ascending node precession |
| [33 - Invariable Plane Calculations](33-invariable-plane-calculations.md) | Height above/below invariable plane |
| [Ascending Node Optimization](../tools/verify/ascending-node-optimization.js) | Numerical optimization to calculate ascending node values |
| [Ascending Node Verification](../tools/verify/ascending-node-verification.js) | Verification that J2000-verified ascending nodes produce correct ecliptic inclinations |
| [Ascending Node Souami-Souchay](../tools/verify/ascending-node-souami-souchay.js) | Comparison of S&S vs Verified ascending node accuracy |
| [Inclination Optimization](../tools/verify/inclination-optimization.js) | Optimization script to calculate mean/amplitude values |
| [Inclination Verification](../tools/verify/inclination-verification.js) | Verification script for mean/amplitude values |
| [Analytical Ascending Nodes](../tools/verify/analytical-ascending-nodes.js) | Analytical (closed-form) calculation of ascending nodes |

---

**Previous**: [31 - Ascending Node Calculations](31-ascending-node-calculations.md)
**Next**: [33 - Invariable Plane Calculations](33-invariable-plane-calculations.md)
