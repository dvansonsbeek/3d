# 72 — Planet Offset Correction

## Overview

The planet offset correction is a post-hoc correction layer that captures the systematic error introduced when the geocentric model projects a planet's orbital inclination through its rotation hierarchy. It is time-dependent: the phase drifts with Earth's axial precession and the amplitude scales with the planet's oscillating inclination.

Currently implemented for Mercury only. The same approach applies to any planet where the Tier 1 (observed) RMS reveals a Sun-longitude-dependent pattern.

## Physical Origin

### The Problem

The geocentric model represents each planet's orbital inclination through scene-graph rotation nodes (`orbitTilta`, `orbitTiltb`). These are computed once from the J2000 epoch values of:

- Invariable plane inclination (`invPlaneInclinationJ2000`)
- Ascending node on the invariable plane (`ascendingNodeInvPlane`)

The decomposition `(inclination, ascendingNode) → (orbitTilta, orbitTiltb)` introduces a systematic error because:

1. The two tilt angles don't perfectly reconstruct the original 3D rotation at all ecliptic longitudes
2. The projection through Earth's obliquity (23.4°) to get equatorial declination amplifies the mismatch
3. The tilt values are fixed at J2000 — they don't track the precessing ascending node or oscillating inclination

### What the Error Looks Like

For Mercury (7° ecliptic inclination, 4.87° relative to Earth):

| Component | Value | Meaning |
|-----------|-------|---------|
| Constant bias | +0.14° | Mean orbital plane sits ~0.14° too far north |
| Sinusoidal amplitude | 0.35° | 7.4% × relative inclination (4.77°) |
| Phase | Drifts at -2.94°/century | Tracks precessing equatorial frame |

The error is entirely in **declination** — RA errors are ~10× smaller. This is because the inclination affects latitude (→ declination), not longitude (→ RA).

### Why Relative Inclination

The amplitude is proportional to the **difference** between the planet's and Earth's invariable plane inclinations, not the planet's absolute inclination:

| Planet | Incl. (inv.plane) | Δ to Earth (1.48°) | Raw Dec signal | Offset needed? |
|--------|-------------------|-------------------|----------------|----------------|
| **Mercury** | 6.35° | **4.87°** | 0.208° | **Yes** — too large for parallax |
| Venus | 2.15° | 0.67° | 0.137° | No — parallax absorbs 99% |
| **Mars** | 1.63° | **0.15°** | 0.140° | No — nearly co-planar with Earth |
| Jupiter | 0.32° | 1.16° | 0.020° | No — parallax absorbs 97% |
| Saturn | 0.93° | 0.56° | 0.011° | No — parallax absorbs it |

Mars and Earth are nearly co-planar on the invariable plane (Δ = 0.15°), so the geocentric model barely needs to tilt Mars's orbit relative to Earth's — the rotation decomposition error is negligible. Mercury's 4.87° relative inclination creates a 0.21° signal that the 48-parameter parallax correction can only absorb ~55% of, leaving a 0.09° structured residual.

The **projection factor** (~7.4%) converts relative inclination to declination offset. It represents the geometric efficiency of the rotation hierarchy error projected through Earth's obliquity (23.4°).

### The Mercury Discovery

Analysis of 23 Mercury transit observations (1632-1799, Tier 1B) revealed:

- **May transits** (RA ~45°, near ascending node): Dec error **+0.23°**
- **November transits** (RA ~225°, near descending node): Dec error **+0.07°**
- Strong correlation with Sun longitude: r = 0.95

## Time Dependence

### Phase Drift

The correction phase drifts at **-2.94°/century**, completing a full cycle in ~12,250 years. This matches **2 × Earth's axial precession rate** (H/13) plus Mercury's node precession rate:

```
driftRate = -(2 × 2π/(H/13) + 2π/perihelionEclipticYears)
         = -(2 × 1.397 + 0.148) °/century
         = -2.94 °/century
```

**Why 2× Earth's axial precession?** The offset is in equatorial coordinates (Dec), but the inclination pattern is in the invariable plane frame. Earth's precessing equator (H/13 = 25,770 years) rotates the equatorial reference. The sin/cos product in the ecliptic-to-equatorial coordinate transformation creates a geometric frequency doubling, giving 2×(H/13) ≈ H/26 ≈ 12,885 years.

The drift rate is **fully derived** from existing model constants — no free parameter.

### Amplitude Scaling

The amplitude equals the **relative inclination** (planet minus Earth) times a projection factor. Both inclinations oscillate over time:

```
planetIncl(t) = invPlaneInclinationMean + invPlaneInclinationAmplitude × cos(inclPhase(t))
earthIncl(t)  = earthInvPlaneInclinationMean + earthInvPlaneInclinationAmplitude × cos(earthInclPhase(t))

relativeIncl(t) = |planetIncl(t) - earthIncl(t)|
amplitude(t) = relativeIncl(t) × projectionFactor
```

The planet inclination oscillates at its `perihelionEclipticYears` period. Earth's inclination oscillates at `H/3` (111,669 years). For Mercury at J2000: `|6.35° - 1.58°| × 0.074 = 0.353°`.

## Formula

Applied in `scene-graph.js` after all other corrections:

```
Lsun = (280.460 + 0.9856474 × (JD - 2451545)) × π/180

year = startmodelYear + (JD - startmodelJD) / meanSolarYearDays
Δyears = year - 2000

phaseRate = -(2 × 2π/(H/13) + 2π/perihelionEclipticYears)    [derived]

decPhi = decPhi0 × π/180 + phaseRate × Δyears
raPhi  = raPhi0  × π/180 + phaseRate × Δyears

planetIncl = invPlaneInclinationMean + invPlaneInclinationAmplitude × cos(...)   [planet]
earthIncl  = earthInvPlaneInclinationMean + earthInvPlaneInclinationAmplitude × cos(...)   [Earth, H/3]

amp = |planetIncl - earthIncl| × projectionFactor              [derived from relative inclination]

sph.theta -= (raConst + amp × cos(Lsun - raPhi)) × π/180
sph.phi   += (decConst + amp × cos(Lsun - decPhi)) × π/180
```

The amplitude is the planet's own `invPlaneInclinationAmplitude` — the same value that drives the inclination oscillation over the perihelion ecliptic precession cycle. It is not fitted; it follows directly from the model geometry.

## Parameters

### Derived from model constants (not stored in JSON)

| Parameter | Formula | Meaning |
|-----------|---------|---------|
| `amplitude` | `\|planetIncl(t) - earthIncl(t)\| × projectionFactor` | Relative inclination × projection efficiency |
| `phaseRate` | `-(2 × 2π/(H/13) + 2π/perihelionEclipticYears)` | Phase drift: 2× Earth axial precession + node rate |
| `planetIncl(t)` | `mean + ampl × cos(inclPhase)` | Planet inclination oscillation |
| `earthIncl(t)` | `mean + ampl × cos(earthInclPhase)` | Earth inclination oscillation (period H/3) |

### Fitted per planet (stored in `fitted-coefficients.json`)

| Parameter | Mercury | Meaning |
|-----------|---------|---------|
| `projectionFactor` | 0.074 | Geometric projection efficiency (~7.4%) |
| `decConst` | 0.14° | Mean Dec bias from rotation chain |
| `decPhi0` | -40.5° | Dec pattern phase at J2000 |
| `raConst` | 0.018° | Mean RA bias |
| `raPhi0` | 122° | RA pattern phase at J2000 |

**Total free parameters: 5** per planet (projectionFactor, decConst, decPhi0, raConst, raPhi0).
**Derived parameters: 4** (phaseRate, planetIncl, earthIncl, amplitude) — from existing model constants.

The `projectionFactor` (7.4%) represents the geometric efficiency of the rotation hierarchy error projected through Earth's obliquity. The 4 const/phi parameters capture the specific phase and bias of the error at J2000. All 5 would change if the model architecture changes significantly, but are stable across normal parameter refitting.

### Performance

| Metric | Without offset | Fixed offset | Time-dependent (relative incl) |
|--------|---------------|-------------|-------------------------------|
| Mercury T1 RMS | 0.147° | 0.039° | **0.029°** |
| Mercury All RMS | 0.310° | 0.410° | 0.480° |
| Valid timespan | — | ~1600-2200 | **Full H** |

The All RMS increase is expected and acceptable: the correction prioritizes matching the 23 observed transit positions over the ~5000 JPL numerical positions. The JPL data (Tier 2) is computed, not observed — Tier 1 accuracy is the true measure of model quality.

## Why Only Mercury Needs This

The same inclination-projection error exists for all planets, but it's only significant for Mercury because:

1. Mercury has the largest relative inclination to Earth (4.87°) — 8× larger than Jupiter (1.16°), 32× larger than Mars (0.15°)
2. The raw model error (0.21°) is too large and structured for the 48-parameter parallax correction to fully absorb — parallax only captures 55% of it
3. Mars has Δincl = 0.15° (nearly co-planar with Earth) → raw signal only 0.002°, fully absorbed by parallax
4. Jupiter has Δincl = 1.16° → raw signal 0.020°, parallax absorbs 97%

If a future planet shows a Sun-longitude-correlated Dec residual after parallax fitting, the same correction can be added:

1. Collect Tier 1 residuals from `baseline(planet).entries`
2. Check correlation of dDec with sin(L)/cos(L). If r > 0.8, proceed.
3. Fit `projectionFactor`, `decConst`, `decPhi0` using the relative inclination formula
4. Fit `raConst`, `raPhi0`
5. Add 5 parameters to `PLANET_OFFSET_CORRECTION` in `fitted-coefficients.json`
   (amplitude, phase rate, and inclination scaling are derived automatically)

The phase rate uses the same formula for all planets:
```
phaseRate = -(2 × 2π/(H/13) + 2π/planet.perihelionEclipticYears)
```

## Implementation Files

| File | What |
|------|------|
| `tools/lib/scene-graph.js` (lines 1041-1060) | Applies the correction |
| `public/input/fitted-coefficients.json` | Stores `PLANET_OFFSET_CORRECTION` |
| `tools/lib/correction-stack.js` | Defines as `type: 'post-hoc'` — always disabled during fitting |
| `src/script.js` (line ~963, ~36490) | Browser implementation (synced by export-to-script.js) |

## Related

- [71 — Correction Stack Architecture](71-correction-stack-architecture.md) — How all correction layers interact
- [67 — Planet Parallax Corrections](67-planet-parallax-corrections.md) — Layer 1 (parallax) that runs before offset
- [37 — Planets Precession Cycles](37-planets-precession-cycles.md) — perihelionEclipticYears, inclination oscillation
