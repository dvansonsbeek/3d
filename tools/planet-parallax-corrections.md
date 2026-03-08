# Planet Geocentric Parallax Corrections — Implementation Reference

**Date**: 2026-03-08
**Status**: Complete (11-term extended correction, all 7 planets, JPL-verified)

---

## Overview

The planets' positions in the model are determined by two systems working together:

1. **Scene graph hierarchy** (geometric): Each planet orbits within nested rotating
   containers that encode orbital period, perihelion precession, orbital plane tilt,
   and geocentric offset (eo). This produces circular or offset-circular orbits
   in 3D space.

2. **Post-hoc parallax corrections** (perturbative): An 11-term analytical correction
   adjusts both RA and Dec for each planet, compensating for the geometric model's
   approximation errors that vary with orbital phase, geocentric distance, and time.

The correction is analogous to the Moon's Meeus Ch. 47 override (see
`tools/moon-meeus-corrections.md`), but uses a simpler analytical form because the
planet error patterns are dominated by low-order harmonics of the ascending node angle
plus a secular precession drift.

---

## 1. The Problem: Distance-Dependent Oscillating Errors

### 1.1 Root Cause

The scene graph models each planet's orbital plane as a tilted circle. The tilt is
decomposed into two rotation axes (rx, rz) using the ascending node angle:

```
correctedAscNode = ascendingNode + ascNodeTiltCorrection
angle = (-90 - correctedAscNode) * d2r
container.rx = cos(angle) * -inclination * d2r
container.rz = sin(angle) * -inclination * d2r
```

The `ascNodeTiltCorrection` compensates for a frame transformation when orbital
plane tilt is moved from one scene graph layer to another:
- Type I/II (inner planets): `180 - ascendingNode`
- Type III (outer planets): `2 * startpos`

These formulas are approximations. The true correction depends on the planet's
orbital phase relative to Earth, which varies continuously. The result is a
systematic error in the planet's ecliptic latitude (and hence declination) that:

1. **Oscillates with the planet's orbital position** relative to its ascending node
2. **Scales inversely with geocentric distance** (closer = larger angular error)
3. **Repeats on the synodic return cycle** (e.g., 15.77 years for Mars)
4. **Drifts secularly** due to precession model mismatch (~0.1–0.6°/century)

### 1.2 Error Decomposition

Statistical analysis of model-vs-JPL residuals (via `tools/explore/error-diagnostic.js`)
revealed three distinct error components:

1. **Harmonic oscillation** (1st, 2nd, 3rd harmonics of ascending node angle),
   scaled by 1/d — the dominant source for inner planets
2. **Secular time drift** — linear trend in centuries from J2000, significant for
   outer planets (Neptune: 0.62°/century in RA)
3. **Time-dependent harmonic modulation** — the harmonic amplitudes themselves
   change slowly over centuries (due to precession shifting the node angle)

### 1.3 Physical Interpretation

**Why u = RA − ascendingNode?**

The ascending node is where the planet's orbital plane crosses the ecliptic. The
planet's ecliptic latitude depends on `sin(u)` where u is the angular distance from
the node. When the tilt direction has a phase error, the resulting declination error
also oscillates with u, modulated by 1/d because the same angular error in the
orbital plane produces a larger apparent error when the planet is closer.

**Why 3rd harmonic?**

The 1st harmonic (sin/cos of u) captures the dominant tilt-direction error. The
2nd harmonic (sin/cos of 2u) captures the ellipticity effect: the error pattern
is not purely sinusoidal because the geocentric perspective changes as Earth moves
in its own orbit. The 3rd harmonic (sin/cos of 3u) captures residual asymmetry,
especially significant for Mercury (large eccentricity → asymmetric error pattern,
4th harmonic at 33% of RA RMS) and Mars (3rd harmonic at 24% of Dec RMS).

**Why does 1/d appear?**

The orbital plane tilt produces a fixed displacement in the Z-direction (perpendicular
to the ecliptic). This displacement subtends an angle proportional to 1/d at the
observer. At d = 0.37 AU (Mars closest), the same tilt error appears ~7x larger
than at d = 2.68 AU (Mars farthest).

**Why time-dependent terms?**

The model's precession and the IAU precession correction are not perfectly matched.
Over centuries, a secular drift accumulates. Additionally, as the equatorial frame
precesses, the harmonic amplitudes measured in the equatorial system slowly rotate,
producing the T×sin(u)/d and T×cos(u)/d terms.

### 1.4 The 15.77-Year Mars Cycle

Mars returns to the same ecliptic longitude AND the same geocentric distance every
15.77 years. This arises from:

```
synodic_period = 779.933 days
return_count = 7.386 synodic periods
cycle = (779.933 * 7.386) / 365.242 = 15.77 years

Equivalently: (7.386 + 1) * 686.932 / 365.242 = 15.77 years
```

The Dec error oscillates with this period because the same orbital geometry
(distance + node angle) repeats. Other planets have analogous return cycles.

---

## 2. The Correction Formula

### 2.1 General Form (11-parameter model)

Applied to both RA and Dec independently:

```
correction = A + B/d + C·T
           + (D·sin(u) + E·cos(u) + F·sin(2u) + G·cos(2u)
            + H·sin(3u) + I·cos(3u)) / d
           + T · (J·sin(u) + K·cos(u)) / d
```

where:
- `u = (RA − ascendingNode)` converted to radians — the planet's angular position
  relative to its ascending node, as seen from Earth
- `d` = geocentric distance (AU)
- `T = (JD − j2000JD) / julianCenturyDays` — centuries from J2000, derived from
  model constants (not hardcoded)
- `A` = constant bias (distance-independent systematic offset)
- `B/d` = distance-dependent bias (tilt magnitude error)
- `C·T` = secular time drift (precession mismatch)
- `D,E` = 1st harmonic / distance (tilt direction error)
- `F,G` = 2nd harmonic / distance (ellipticity of error pattern)
- `H,I` = 3rd harmonic / distance (higher-order asymmetry)
- `J,K` = time-dependent 1st harmonic / distance (precession-modulated amplitude)

11 coefficients per coordinate, per planet = 22 coefficients per planet total.

### 2.2 Model Evolution

The correction was developed in stages, each validated against JPL Horizons data:

| Model | Params | Added terms | Key improvement |
|-------|--------|-------------|-----------------|
| Model 1 | 3 | A + B·sin(u−φ)/d | Basic tilt correction |
| Model 2 | 3 | A + (C·sin + D·cos)/d | Eliminated phase search |
| Model 4 | 4 | + B/d bias | Distance-dependent offset |
| **Model 5** | **6** | **+ sin(2u)/d, cos(2u)/d** | **2nd harmonic: +13% Mercury** |
| **Extended** | **11** | **+ C·T, 3rd harmonic, T-modulated** | **Time drift + asymmetry** |

The 11-parameter extended model was selected because:
- 3rd harmonic: significant for Mercury (33% of RA RMS at 4th harmonic) and Mars (24% Dec)
- Time drift term C·T: dominant remaining error for Neptune (0.62°/century)
- Time-modulated harmonic J,K: captures slow precession rotation of error pattern

### 2.3 Fitting Method

Coefficients are determined by **linear least squares** fitting against JPL Horizons
reference data (after applying IAU 1976 precession correction to convert J2000
coordinates to of-date frame).

The fitting is fully linear (no grid search needed) because the sin/cos decomposition
eliminates the phase parameter:

```
B_amplitude * sin(u - phase) / d  =  (C * sin(u) + D * cos(u)) / d
where: C = B_amplitude * cos(phase),  D = -B_amplitude * sin(phase)
```

This makes the fitting deterministic and robust — no local minima, no initialization
sensitivity. The normal equations (X'X)β = X'y are solved by Gaussian elimination
with partial pivoting.

### 2.4 Fitting Tool

`tools/explore/fit-extended-correction.js` — Fits all 11 coefficients for both RA
and Dec, for all 7 planets simultaneously. Disables existing correction before
fitting to measure raw errors. Output format matches constants.js directly.

---

## 3. Coefficients

### 3.1 Dec Correction Coefficients

Stored in `ASTRO_REFERENCE.decCorrection` (constants.js: lowercase keys, script.js: capitalized):

| Planet | A | B | C | D | E | F | G | H | I | J | K |
|--------|------|-------|-------|--------|--------|-------|--------|-------|-------|-------|-------|
| Mercury | 0.1783 | 3.5673 | 0.1559 | -5.4328 | -0.2678 | 0.0940 | -3.1939 | 1.0857 | 0.0850 | -0.0311 | -0.1880 |
| Venus | 0.0437 | -0.0966 | 0.0577 | -0.4116 | -0.0168 | 0.4793 | 0.1413 | -0.2270 | -0.0256 | -0.0123 | -0.0418 |
| Mars | -0.0887 | -0.3737 | 0.1854 | -0.0387 | -0.2556 | -0.0694 | -0.1293 | 0.0104 | 0.0586 | 0.1899 | -0.1338 |
| Jupiter | -0.0443 | -0.1734 | 0.0249 | 0.2952 | -0.0468 | 0.0134 | -0.0571 | 0.0116 | -0.0349 | -0.4416 | 0.1897 |
| Saturn | 0.1007 | -1.4316 | 0.0095 | -0.8950 | -0.3876 | 0.0600 | 0.0278 | 0.0153 | 0.0706 | 1.6760 | 0.8588 |
| Uranus | -5.4965 | 106.1258 | -0.0140 | -4.2419 | 6.2516 | -0.1521 | 0.0548 | -0.0808 | -0.1954 | 0.9457 | -0.0454 |
| Neptune | -0.0236 | -0.0319 | 0.0054 | -1.8929 | -1.4210 | -0.1843 | 0.1434 | -0.0085 | 0.0308 | 5.7511 | 5.3847 |

### 3.2 RA Correction Coefficients

Stored in `ASTRO_REFERENCE.raCorrection`:

| Planet | A | B | C | D | E | F | G | H | I | J | K |
|--------|------|---------|-------|--------|---------|--------|-------|--------|--------|--------|-------|
| Mercury | -0.0539 | -4.9193 | 0.3245 | 1.5397 | 5.2298 | -2.3940 | 4.6703 | -1.2783 | -5.6792 | -0.4133 | 0.2514 |
| Venus | 0.6074 | -1.2066 | 0.0150 | 1.2003 | 0.4581 | -0.3214 | 1.0958 | -0.1873 | -0.4883 | -0.0605 | 0.0400 |
| Mars | 0.6145 | -0.2738 | -0.1009 | 0.1439 | -0.0011 | 0.2643 | -0.0099 | -0.0396 | -0.0327 | -0.4061 | 0.0487 |
| Jupiter | 0.3774 | -2.6427 | 0.2077 | 0.1446 | -0.1472 | -0.2493 | 0.0295 | 0.0788 | 0.0801 | -0.6651 | -0.1367 |
| Saturn | 0.6307 | -3.4158 | -0.4651 | -0.0388 | -1.8985 | 0.5727 | -0.0705 | -0.2016 | -0.0477 | -0.7648 | 1.9948 |
| Uranus | 52.8271 | -1007.7449 | -0.1175 | 29.4285 | -57.3179 | 0.7051 | -0.3225 | 0.1894 | 1.4402 | 1.2335 | 0.0234 |
| Neptune | -0.0198 | 6.9895 | -0.6160 | 1.5396 | 0.6993 | 0.5250 | -0.1262 | 0.1078 | -0.2092 | -1.6152 | -0.0952 |

Note: Outer planets (Uranus, Neptune) have large B coefficients because their
geocentric distances are large (17–30 AU), so B/d remains small. Similarly, the
large J,K values for Neptune reflect how even a small secular drift accumulates
significantly over the 200-year fitting window.

### 3.3 Coefficient Magnitudes by Planet

The correction amplitude (peak-to-peak in Dec, at minimum geocentric distance):

| Planet | Min d (AU) | Max Dec correction | Max RA correction | Significance |
|--------|-----------|-------------------|-------------------|-------------|
| Mercury | 0.55 | ~10° | ~10° | Very significant |
| Venus | 0.26 | ~1.6° | ~2° | Significant |
| Mars | 0.37 | ~0.7° | ~0.7° | Significant |
| Jupiter | 3.9 | ~0.1° | ~0.2° | Moderate |
| Saturn | 8.0 | ~0.1° | ~0.3° | Small |
| Uranus | 17 | ~0.1° | ~0.05° | Small |
| Neptune | 29 | ~0.1° | ~0.05° | Small |

---

## 4. Implementation

### 4.1 In the Optimizer (`tools/lib/scene-graph.js`)

Applied in `computePlanetPosition()` after converting to spherical coordinates
and before the Moon Meeus override:

```javascript
// Post-hoc RA/Dec corrections for geocentric parallax + precession drift
// Model: dX = A + B/d + C*T + (D*sin(u) + E*cos(u) + F*sin(2u) + G*cos(2u)
//              + H*sin(3u) + I*cos(3u))/d + T*(J*sin(u) + K*cos(u))/d
if (target !== 'moon' && target !== 'sun') {
  const ascNode = C.planets[target].ascendingNode;
  const u = (sph.theta / d2r - ascNode) * d2r;
  const invD = 1 / distAU;
  const T = (jd - C.j2000JD) / C.julianCenturyDays;  // centuries from J2000
  const sinU = Math.sin(u), cosU = Math.cos(u);
  const sin2U = Math.sin(2*u), cos2U = Math.cos(2*u);
  const sin3U = Math.sin(3*u), cos3U = Math.cos(3*u);

  const dc = C.ASTRO_REFERENCE.decCorrection[target];
  if (dc) {
    const corrDec = dc.A + dc.B * invD + (dc.C || 0) * T
      + (dc.D * sinU + dc.E * cosU + dc.F * sin2U + dc.G * cos2U
       + (dc.H || 0) * sin3U + (dc.I || 0) * cos3U) * invD
      + T * ((dc.J || 0) * sinU + (dc.K || 0) * cosU) * invD;
    sph.phi += corrDec * d2r;
  }

  const rc = C.ASTRO_REFERENCE.raCorrection[target];
  if (rc) {
    const corrRA = rc.A + rc.B * invD + (rc.C || 0) * T
      + (rc.D * sinU + rc.E * cosU + rc.F * sin2U + rc.G * cos2U
       + (rc.H || 0) * sin3U + (rc.I || 0) * cos3U) * invD
      + T * ((rc.J || 0) * sinU + (rc.K || 0) * cosU) * invD;
    sph.theta -= corrRA * d2r;
  }
}
```

**Key design decisions:**
- `j2000JD` and `julianCenturyDays` are derived from model constants
  (`startmodelJD`, `startmodelYear`, `meanSolarYearDays`), not hardcoded
- `|| 0` fallback on optional terms ensures backward compatibility if
  coefficients are added incrementally
- The formula uses all 11 terms but degrades gracefully to 6-term if H–K are absent

Sign conventions:
- **Dec**: `sph.phi += correction` because phi = π/2 − dec. A positive dDec
  (model too high) requires increasing phi to decrease dec.
- **RA**: `sph.theta -= correction` because a positive dRA (model too high)
  requires decreasing theta.

### 4.2 In the Display Code (`src/script.js`)

Applied in `updatePositions()` after computing obj.ra and obj.dec from the
3D world position, before the Moon Meeus override:

```javascript
const _dc = ASTRO_REFERENCE.decCorrection[obj.name];
const _rc = ASTRO_REFERENCE.raCorrection[obj.name];
if (_dc || _rc) {
  const _ascNode = _planetAscNodeLookup[obj.name];
  const _u = (obj.ra * (180 / Math.PI) - _ascNode) * (Math.PI / 180);
  const _invD = 1 / obj.distAU;
  const _T = (currentJD - j2000JD) / julianCenturyDays;
  const _sinU = Math.sin(_u), _cosU = Math.cos(_u);
  const _sin2U = Math.sin(2*_u), _cos2U = Math.cos(2*_u);
  const _sin3U = Math.sin(3*_u), _cos3U = Math.cos(3*_u);
  // ... same formula as scene-graph.js ...
}
```

Uses `obj.name` (capitalized: "Mercury", "Venus", etc.) as the lookup key,
so the correction tables in `ASTRO_REFERENCE` use capitalized keys in script.js
and lowercase keys in constants.js.

### 4.3 Derived Epoch Constants

The J2000 epoch and Julian century length are derived from model constants,
not hardcoded:

```javascript
// In constants.js:
const j2000JD = startmodelJD - (startmodelYear - 2000.0) * meanSolarYearDays;
const julianCenturyDays = 100 * meanSolarYearDays;

// In script.js:
const j2000JD = startmodelJD - (startmodelYear - 2000.0) * meansolaryearlengthinDays;
const julianCenturyDays = 100 * meansolaryearlengthinDays;
```

This ensures the time parameter T stays consistent with the model's own time
system. If `meanSolarYearDays` changes (e.g., due to a different `holisticyearLength`),
the epoch and century length adjust automatically.

### 4.4 Visual Position Correction

Unlike the Moon (where `pivotObj.position` is updated to match the corrected RA/Dec),
the planet visual positions are NOT corrected. The correction magnitudes are
sub-degree — invisible at the scale of the 3D scene. The orbit rings and planet
meshes remain at their geometric positions.

If visual correction is desired in the future (e.g., for a zoomed-in view), the
Moon's Stage 2 pattern can be followed: build a corrected position from the
corrected spherical coordinates, transform local → world → orbitObj local, and
update pivotObj.position.

---

## 5. Accuracy

### 5.1 Current Results (11-parameter model)

Total RMS error (degrees) against JPL Horizons reference data:

| Planet | No correction | 6-param model | 11-param model | n |
|--------|--------------|---------------|----------------|---|
| Mercury | 1.16° | 0.82° | **0.48°** | 95 |
| Venus | 0.49° | 0.28° | **0.13°** | 48 |
| Mars | 1.06° | 0.63° | **0.31°** | 184 |
| Jupiter | 0.27° | 0.24° | **0.08°** | 70 |
| Saturn | 0.57° | 0.50° | **0.11°** | 67 |
| Uranus | 0.10° | 0.09° | **0.02°** | 41 |
| Neptune | 0.68° | 0.60° | **0.03°** | 69 |

All 7 planets are now within 0.5°. Five of seven are under 0.15°.

### 5.2 Improvement Breakdown by Component

The 11-parameter model provides improvement from three sources:

| Source | Helps most | Typical gain |
|--------|-----------|-------------|
| 3rd harmonic (H,I terms) | Mercury, Mars | 5–15% |
| Time drift (C term) | Neptune, Saturn, Uranus | 10–50% |
| Time-modulated harmonic (J,K) | Neptune, Saturn | 5–20% |

### 5.3 Per-Planet Error Analysis

```
mercury  RA=0.47°  Dec=0.10°  Tot=0.48°   Dominant: RA harmonic residual
venus    RA=0.12°  Dec=0.06°  Tot=0.13°   Well-corrected
mars     RA=0.20°  Dec=0.24°  Tot=0.31°   Dominant: Dec from eccentricity
jupiter  RA=0.08°  Dec=0.03°  Tot=0.08°   Well-corrected
saturn   RA=0.10°  Dec=0.04°  Tot=0.11°   Well-corrected
uranus   RA=0.01°  Dec=0.01°  Tot=0.02°   Excellent
neptune  RA=0.03°  Dec=0.01°  Tot=0.03°   Excellent (time drift absorbed)
```

### 5.4 Remaining Error Sources

The residual errors after correction come from:

1. **Orbital eccentricity**: The circular/offset-circular orbit model cannot fully
   capture the radial distance variation of elliptical orbits. Mars (e=0.093) and
   Mercury (e=0.206) are most affected. A future heliocentric distance correction
   (scaling the heliocentric vector by the Keplerian r/r_model ratio) could address
   this — see the plan in `tools/type-ii-mars-implementation.md`.

2. **Mutual perturbations**: Jupiter–Saturn gravitational interaction causes ~1°
   longitude perturbations over their ~20-year conjunction cycle. These are not
   modeled but partially absorbed by the harmonic correction.

3. **Higher harmonics**: The 4th harmonic is significant for Mercury (33% of RA RMS).
   Adding sin(4u)/d and cos(4u)/d terms would require 13 parameters but could
   reduce Mercury's error by another 10–15%.

4. **Reference data coverage**: Some planets have limited reference data in
   certain orbital phases, leading to less constrained fits. Mars has the best
   coverage (184 points) while Uranus has the least (41 points).

---

## 6. Extending the Correction

### 6.1 Adding More Harmonics

To add a 4th harmonic (sin(4u), cos(4u)), extend the formula:

```javascript
const sin4U = Math.sin(4*u), cos4U = Math.cos(4*u);
const corrDec = dc.A + dc.B * invD + (dc.C || 0) * T
  + (dc.D * sinU + dc.E * cosU + dc.F * sin2U + dc.G * cos2U
   + (dc.H || 0) * sin3U + (dc.I || 0) * cos3U
   + (dc.L || 0) * sin4U + (dc.M || 0) * cos4U) * invD
  + T * ((dc.J || 0) * sinU + (dc.K || 0) * cosU) * invD;
```

The `|| 0` fallback ensures backward compatibility with existing coefficients.

### 6.2 Adding More Time-Dependent Terms

Currently only the 1st harmonic has time modulation (J,K terms). To add time
modulation of the 2nd harmonic:

```javascript
+ T * ((dc.N || 0) * sin2U + (dc.O || 0) * cos2U) * invD
```

Or a quadratic time drift:

```javascript
+ (dc.P || 0) * T * T  // quadratic secular drift
```

### 6.3 Re-fitting After Model Changes

After any change to the geometric model (e.g., new startpos, EoC parameters,
dynamic tilt, holisticyearLength), the correction coefficients should be re-fitted:

```bash
# 1. Disable existing correction:
#    Set decCorrection: {} and raCorrection: {} in constants.js
#    Call sg._invalidateGraph() if in node

# 2. Fit new coefficients:
node tools/explore/fit-extended-correction.js

# 3. Copy output into constants.js decCorrection/raCorrection tables
# 4. Mirror to script.js (capitalize planet names)

# 5. Verify:
node tools/optimize.js baseline all
```

The linear least squares fitting is deterministic — it will always find the
global optimum, regardless of starting values.

### 6.4 Optimization Workflow

After re-fitting coefficients, further improvement can come from re-optimizing
the underlying orbital parameters:

```bash
# Optimize startpos, eocFraction, perihelionRef_JD for each planet:
node tools/optimize.js optimize venus startpos,eocFraction,perihelionRef_JD

# Then re-fit correction coefficients (they depend on the orbital params):
node tools/explore/fit-extended-correction.js

# Iterate if needed — typically converges in 1–2 cycles
```

---

## 7. Relationship to Other Corrections

### 7.1 Moon Meeus Corrections

The Moon uses a much more sophisticated correction (Meeus Ch. 47: 60 longitude +
60 latitude terms) because lunar perturbations are large and well-characterized.
The planet correction uses 11 terms per coordinate because the error pattern
is simpler (dominated by the ascending node geometry plus precession drift).

Both corrections share the same architecture:
1. Compute position from 3D scene graph
2. Convert to RA/Dec
3. Apply post-hoc correction
4. (Optional) Update visual position

### 7.2 Equation of Center (Variable Speed)

The EoC adjusts orbital **angle** (longitude). The parallax correction adjusts
the **apparent position** (RA/Dec). They operate on independent axes and do not
interact. The EoC is applied in moveModel() during scene graph animation; the
parallax correction is applied after position computation.

### 7.3 Dynamic Ecliptic Inclination

Dynamic inclination updates the tilt **magnitude** over long timescales. The
parallax correction compensates for the tilt **direction** error at any given
moment. They are complementary.

### 7.4 Dynamic Geocentric eo

The eo correction adjusts the orbit center offset, which primarily affects RA
(orbital longitude). The parallax correction addresses the residual RA error
plus the full Dec error. Some overlap exists, but the parallax correction was
fitted with eo active, so the two are self-consistent.

### 7.5 IAU Precession Correction

JPL Horizons returns RA/Dec in the fixed ICRF/J2000 frame. The model computes
in the of-date equatorial frame (precessing equator). The `j2000ToOfDate()`
function in `tools/lib/precession.js` applies IAU 1976 precession to convert
JPL data to the model's frame before fitting. This is critical — without it,
outer planet errors are dominated by the ~50.3″/yr precession shift.

---

## 8. Constants Changed

### 8.1 Orbital Parameters (optimized with 11-param correction active)

| Constant | Previous | Current | File |
|----------|----------|---------|------|
| mercuryStartpos | 83.62 | 83.47 | constants.js, script.js |
| mercuryEocFraction | -0.50 | -0.49 | constants.js, script.js |
| mercuryPerihelionRef_JD | 2460336.1 | 2460335.7 | constants.js, script.js |
| venusStartpos | 249.33 | 249.31 | constants.js, script.js |
| venusEocFraction | 1.0 | 0.547 | constants.js, script.js |
| venusPerihelionRef_JD | 2460602.0 | 2460639.3 | constants.js, script.js |
| marsStartpos | 121.46 | 121.47 | constants.js, script.js |
| marsEocFraction | -0.0624 | -0.066 | constants.js, script.js |
| marsPerihelionRef_JD | 2459253.2 | 2456505.6 | constants.js, script.js |
| jupiterStartpos | 13.82 | 13.85 | constants.js, script.js |
| jupiterEocFraction | 0.50 | 0.484 | constants.js, script.js |
| saturnEocFraction | 0.50 | 0.543 | constants.js, script.js |
| ascNodeTiltCorrection | Math.round(...) | exact (no rounding) | constants.js, script.js |

### 8.2 Venus eocFraction Discovery

Venus was initially set to `eocFraction: 1.0` under the assumption that as a
Type I planet (circular orbit), the full eccentricity should be handled by the
Equation of Center. Optimization discovered that `eocFraction: 0.547` reduces
Venus error from 0.24° to 0.13° — a 46% improvement.

This value (~0.5) matches the geometric prediction seen in outer planets: the
geometric orbit offset handles approximately half the eccentricity effect, and
the EoC handles the other half. This principle appears universal across planet
types, not just Type III.

### 8.3 Derived Epoch Constants

The hardcoded J2000 epoch and Julian century values were replaced throughout
the codebase with model-derived constants:

```javascript
j2000JD = startmodelJD - (startmodelYear - 2000.0) * meanSolarYearDays
julianCenturyDays = 100 * meanSolarYearDays
```

Files updated: `constants.js`, `scene-graph.js`, `precession.js`, `script.js`,
`fit-extended-correction.js`, `error-diagnostic.js`.

---

## 9. Files Modified

| File | Changes |
|------|---------|
| `tools/lib/constants.js` | 11-param decCorrection + raCorrection tables; updated startpos/eocFraction/perihelionRef_JD; removed rounding from ascNodeTiltCorrection; added j2000JD and julianCenturyDays derived constants |
| `tools/lib/scene-graph.js` | 11-param correction formula in computePlanetPosition(); uses C.j2000JD/C.julianCenturyDays |
| `tools/lib/precession.js` | Uses j2000JD and julianCenturyDays from constants.js |
| `tools/lib/optimizer.js` | Added perihelionRef_JD param accessor; removed angleCorrection from tunable params |
| `tools/optimize.js` | Updated help text and default params |
| `src/script.js` | Mirrored all constant changes; 11-param correction tables + code in updatePositions(); added _planetAscNodeLookup; added j2000JD/julianCenturyDays; replaced all hardcoded epoch values |

---

## 10. Fitting Tools

`tools/explore/fit-extended-correction.js` — **Primary fitting tool**. Fits all
11 coefficients (A–K) for both RA and Dec, for all 7 planets simultaneously.
Disables existing correction before fitting. Output format matches constants.js
directly. Uses `C.jdToYear()` for time computation.

`tools/explore/error-diagnostic.js` — Deep error analysis tool. Computes time
trends (linear regression), distance correlation, residual harmonics (1st–4th),
1/d-weighted harmonics, worst-point identification, distance-quartile breakdown,
and theoretical floor from higher-order models. Essential for identifying which
additional terms would be most beneficial.

`tools/explore/fit-dec-model5.js` — Original 6-parameter Dec fitting tool.
Superseded by fit-extended-correction.js but kept for reference.

`tools/explore/fit-ra-model5.js` — Original 6-parameter RA fitting tool.

`tools/explore/fit-dec-multiterm.js` — Compares 7 correction models (1-term
through 8-term) to determine optimal complexity. Useful for evaluating whether
additional harmonics are warranted.

---

## 11. Diagnostic Example

To understand the remaining error structure for a planet:

```bash
node tools/explore/error-diagnostic.js 2>&1 | less
```

This produces per-planet reports like:

```
═══════════════════════════════════════════════════════════════
  MARS  (n=184)  RMS: RA=0.199°  Dec=0.239°  Tot=0.312°
═══════════════════════════════════════════════════════════════

  Time trend (linear):
    RA:  slope=-0.101°/century  range=0.20° over data span
    Dec: slope= 0.185°/century  range=0.37° over data span

  Distance correlation (|error| vs 1/d):
    RA:  r=0.185   Dec: r=0.456

  Residual harmonic analysis (Dec):
    harmonic 1: amplitude=0.0734°  (31% of RMS)
    harmonic 2: amplitude=0.0432°  (18% of RMS)
    harmonic 3: amplitude=0.0274°  (11% of RMS)
    harmonic 4: amplitude=0.0186°  (8% of RMS)
```

This reveals whether adding more harmonics, time terms, or 1/d² terms would help.
