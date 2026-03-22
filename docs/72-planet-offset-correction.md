# 72 — Planet Offset Correction

## Overview

The planet offset correction is a post-hoc correction layer that captures a systematic declination error caused by the eccentricity-induced orbit center offset projected through the relative orbital inclination between a planet and Earth.

The amplitude is fully derived from orbital mechanics — no fitted amplitude parameter. Only the phase and bias constants (4 per planet) are fitted from Tier 1 observed data.

Currently implemented for Mercury only. Mercury is uniquely affected because it has both the highest eccentricity (0.206) and the largest relative inclination to Earth (4.87°) of any planet.

## Physical Origin

### The Eccentricity Offset

In an eccentric orbit, the geometric center of the ellipse is displaced from the focus (Sun) by `e × a`, where `e` is the eccentricity and `a` is the semi-major axis. This displacement is directed toward the aphelion.

For Mercury: `e × a = 0.206 × 0.387 AU = 0.080 AU`

In the geocentric model, this means Mercury's orbit center is offset from the Sun by 0.08 AU. The model's scene-graph decomposes the orbital inclination into two fixed tilt angles (`orbitTilta`, `orbitTiltb`) computed at J2000. These tilts correctly orient the orbital plane but do not account for the displacement of the orbit center from the focus. The eccentricity offset, viewed through the tilted plane, produces a systematic out-of-plane error.

### Projection Through Relative Inclination

Mercury's orbit is tilted by 4.87° relative to Earth's orbit on the invariable plane. This means Mercury's orbit center offset (0.08 AU) is not in the same plane as Earth's orbit — it has an out-of-plane component:

```
out-of-plane displacement = e × a × sin(relative inclination)
                          = 0.206 × 0.387 × sin(4.87°)
                          = 0.0066 AU
```

Viewed from Earth at ~1 AU distance, this subtends:

```
angular error = 0.0066 AU / 1 AU × (180°/π) ≈ 0.38°
```

This matches the observed offset amplitude of **0.36°** at J2000. The small difference arises because the Earth's own eccentricity offset (0.017 AU toward 283°) partially cancels Mercury's offset depending on the relative perihelion angles (Mercury perihelion at 77°, Earth at 103°).

### Why Mercury Is Unique

The formula `e × a × sin(Δincl)` explains why only Mercury needs this correction:

| Planet | e | a (AU) | e×a (AU) | Δincl | Predicted | Parallax absorbs |
|--------|------|--------|----------|-------|-----------|-----------------|
| **Mercury** | **0.206** | 0.387 | **0.080** | **4.87°** | **0.38°** | 55% → 0.09° residual |
| Venus | 0.007 | 0.723 | 0.005 | 0.58° | 0.003° | 99% |
| Mars | 0.093 | 1.524 | 0.142 | 0.05° | 0.007° | ~100% (co-planar) |
| Jupiter | 0.048 | 5.203 | 0.252 | 1.26° | 0.061° | 97% |
| Saturn | 0.054 | 9.537 | 0.516 | 0.65° | 0.034° | ~95% |

Mercury dominates because of the **product** `e × sin(Δincl)`:
- Mercury: `0.206 × sin(4.87°) = 0.017` — an order of magnitude larger than any other planet
- Mars has decent eccentricity (0.093) but is nearly co-planar with Earth (Δincl = 0.05°)
- Jupiter has moderate Δincl (1.26°) but small eccentricity and the parallax easily absorbs it

### The Mercury Discovery

Analysis of 23 Mercury transit observations (1632-1799, Tier 1B) revealed:

- **May transits** (RA ~45°, near ascending node): Dec error **+0.23°**
- **November transits** (RA ~225°, near descending node): Dec error **+0.07°**
- Strong correlation with Sun longitude: r = 0.95

The sinusoidal pattern peaks near Mercury's ascending node on the invariable plane (32.8°), where the out-of-plane component of the orbit center offset is largest.

## Time Dependence

All three components of the amplitude formula evolve over time:

### 1. Dynamic Eccentricity

The eccentricity oscillates over the perihelion ecliptic precession period:

```
e(t) = orbitalEccentricityBase + orbitalEccentricityAmplitude × cos(eccentricityPhase(t))
```

For Mercury the variation is ±0.04% (negligible), but for Venus it's ±15% — significant if the correction is ever applied to other planets.

### 2. Relative Inclination

Both planet and Earth inclinations oscillate as their ascending nodes precess:

```
incl(t) = invPlaneInclinationMean + invPlaneInclinationAmplitude × cos(ascNode(t) - phaseAngle)
```

The planet's ascending node precesses at `360°/perihelionEclipticYears`. Earth's precesses at `360°/(H/3)`. The relative inclination `|planetIncl(t) - earthIncl(t)|` therefore oscillates with a complex beat pattern.

### 3. Phase Drift

The correction phase drifts at **-2.94°/century**, completing a full cycle in ~12,250 years:

```
driftRate = -(2 × 2π/(H/13) + 2π/perihelionEclipticYears)
         = -(2 × 1.397 + 0.148) °/century
```

This arises because the offset is measured in equatorial coordinates (Dec), but the inclination geometry is in the invariable plane frame. Earth's axial precession (H/13) rotates the equatorial reference frame, creating a geometric frequency doubling (2×H/13 ≈ H/26 ≈ 12,885 years).

The drift rate is **fully derived** from existing model constants — no free parameter.

## Formula

Applied in `scene-graph.js` after all other corrections:

```
Lsun = (280.460 + 0.9856474 × (JD - 2451545)) × π/180
Δyears = year - 2000

── Phase (drifts with precession) ──
phaseRate = -(2 × 2π/(H/13) + 2π/perihelionEclipticYears)         [derived]
decPhi = decPhi0 × π/180 + phaseRate × Δyears
raPhi  = raPhi0  × π/180 + phaseRate × Δyears

── Dynamic eccentricity ──
eccPhase = eccentricityPhaseJ2000 + 2π/perihelionEclipticYears × Δyears
e(t) = orbitalEccentricityBase + orbitalEccentricityAmplitude × cos(eccPhase)

── Semi-major axis (from actual orbital period via Kepler) ──
orbitCount = round(totalDaysInH / solarYearInput)
P_years = totalDaysInH / orbitCount / 365.25
a = (P_years²)^(1/3)                                               [Kepler: a³ = P²]

── Relative inclination (both oscillate) ──
planetIncl = planetMean + planetAmpl × cos(planetAscNode(t) - phaseAngle)    [node precesses at perihelionEclipticYears]
earthIncl  = earthMean  + earthAmpl  × cos(earthAscNode(t)  - phaseAngle)    [node precesses at H/3]

── Amplitude (fully derived from orbital mechanics) ──
amp = e(t) × a × sin(|planetIncl(t) - earthIncl(t)|) × 180/π      [degrees]

── Apply ──
sph.theta -= (raConst + amp × cos(Lsun - raPhi)) × π/180
sph.phi   += (decConst + amp × cos(Lsun - decPhi)) × π/180
```

## Parameters

### Fully derived (not stored — computed from orbital mechanics)

| Parameter | Source | Meaning |
|-----------|--------|---------|
| `e(t)` | `base + ampl × cos(eccPhase(t))` | Dynamic eccentricity |
| `a` | Kepler's third law from actual period | Semi-major axis (AU) |
| `Δincl(t)` | `\|planetIncl(t) - earthIncl(t)\|` | Relative inclination (both oscillate) |
| `amplitude` | `e(t) × a × sin(Δincl(t))` | Orbit center out-of-plane offset (AU → degrees) |
| `phaseRate` | `-(2 × 2π/(H/13) + 2π/perihelionEclipticYears)` | Phase drift from precessing equatorial frame |

### Fitted per planet (stored in `fitted-coefficients.json`)

| Parameter | Mercury | Meaning |
|-----------|---------|---------|
| `decConst` | 0.14° | Mean Dec bias from rotation chain |
| `decPhi0` | -40.5° | Dec pattern phase at J2000 |
| `raConst` | 0.018° | Mean RA bias |
| `raPhi0` | 122° | RA pattern phase at J2000 |

**Total free parameters: 4** per planet.
**Derived parameters: 5** — from orbital mechanics and model constants.

The 4 fitted parameters capture how the scene-graph rotation chain maps the eccentricity offset error into equatorial coordinates:

- **`decConst`** — The mean northward Dec bias. This arises because the orbit center offset has a net out-of-plane component that doesn't average to zero over all Sun longitudes (the projection through obliquity is asymmetric).
- **`decPhi0`** — The Sun longitude where the Dec error is maximum. Related to the ascending node geometry but shifted by the obliquity transformation.
- **`raConst`** / **`raPhi0`** — Same for RA (much smaller, ~10× less than Dec, because the offset primarily affects latitude/declination, not longitude/RA).

These are stable across normal pipeline refitting (post-hoc layer, never refitted).

### Performance

| Metric | Without offset | Fixed offset | Time-dependent |
|--------|---------------|-------------|----------------|
| Mercury T1 RMS | 0.147° | 0.039° | **0.030°** |
| Mercury All RMS | 0.310° | 0.410° | 0.497° |
| Valid timespan | — | ~1600-2200 | **Full H** |

The All RMS increase is expected and acceptable: the correction prioritizes matching the 23 observed transit positions over the ~5000 JPL numerical positions. The JPL data (Tier 2) is computed, not observed — Tier 1 accuracy is the true measure of model quality.

## Extending to Other Planets

The formula works for any planet. To add the correction:

1. Collect Tier 1 residuals from `baseline(planet).entries`
2. Check correlation of dDec with sin(L)/cos(L). If r > 0.8, proceed.
3. Fit only `decConst`, `decPhi0`, `raConst`, `raPhi0` — the amplitude is derived automatically from `e × a × sin(Δincl)`
4. Add 4 parameters to `PLANET_OFFSET_CORRECTION` in `fitted-coefficients.json`

In practice, only Mercury needs it — the formula predicts <0.06° for all other planets, which the parallax correction fully absorbs.

The phase rate uses the same formula for all planets:
```
phaseRate = -(2 × 2π/(H/13) + 2π/planet.perihelionEclipticYears)
```

## Implementation Files

| File | What |
|------|------|
| `tools/lib/scene-graph.js` (lines 1047-1073) | Applies the correction |
| `public/input/fitted-coefficients.json` | Stores 4 fitted parameters per planet |
| `tools/lib/correction-stack.js` | Defines as `type: 'post-hoc'` — always disabled during fitting |
| `src/script.js` (line ~963, ~36490) | Browser implementation (synced by export-to-script.js) |

## Related

- [71 — Correction Stack Architecture](71-correction-stack-architecture.md) — How all correction layers interact
- [67 — Planet Parallax Corrections](67-planet-parallax-corrections.md) — Layer 1 (parallax) that runs before offset
- [37 — Planets Precession Cycles](37-planets-precession-cycles.md) — perihelionEclipticYears, inclination oscillation
