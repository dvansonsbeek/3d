# Equation of Center -- Implementation Reference

**Date**: 2026-03-07 (updated)
**Status**: Phase 1 complete (Sun only), planets pending

---

## What It Does

The equation of center adds Kepler's 2nd Law variable speed to the Sun's orbit.
The Sun moves faster near perihelion (January) and slower near aphelion (July):

```
theta += 2 * e * sin(M) + 1.25 * e^2 * sin(2M)
```

Where `e` is the eccentricity and `M` is the mean anomaly from perihelion.

Gated by `useVariableSpeed` flag. When false, all orbits use constant angular
velocity and `correctionSun` should be set to 0.913280.

---

## The Double-Counting Problem

### Two speed mechanisms in the model

The model approximates an elliptical orbit using a **circular orbit with an
offset center**. Earth sits at `eccentricityBase * 100` units (~1.54 units)
from the circle center. This design correctly reproduces the distance variation
between perihelion and aphelion.

However, it also creates **apparent angular speed variation from geometry
alone**: when the Sun is closer to Earth, the same arc length on the circle
subtends a larger angle as seen from Earth. So even without any equation of
center, the Sun already appears to move faster near perihelion -- purely from
the off-center viewing position.

The standard equation of center formula was designed for pure Keplerian orbits
where the mean anomaly advances uniformly and ALL speed variation must be added
by the formula. In our model, the off-center geometry already provides
approximately half of the correct speed variation. Adding the full equation of
center on top would produce roughly double the real effect.

### Quantitative analysis

For a circular orbit of radius `a` centered at point C, observed from point O
displaced by `d = e_geom * a`:

```
apparent angle ~ M + e_geom * sin(M)     (first-order geometric parallax)
```

The real Keplerian equation of center gives:

```
true anomaly ~ M + 2 * e_real * sin(M)   (first-order)
```

The geometric offset provides amplitude `e_geom`, while the full Keplerian
effect has amplitude `2 * e_real`. The geometric offset contributes exactly
**half** the first-order effect for the same eccentricity value.

When we add an explicit EoC with eccentricity `eoc`, the total first-order
amplitude becomes:

```
total = e_geom + 2 * eoc
```

Setting this equal to the desired Keplerian amplitude `2 * e_real`:

```
eoc = e_real - e_geom / 2
```

### Observable consequence of using full eccentricity

With the full geometric eccentricity (0.0154) used in the equation of center,
the season lengths become too asymmetric. The spring/summer half-year is too
long, autumn/winter too short:

| Cardinal Point | Error with full ecc (hours) |
|----------------|-----------------------------|
| Vernal Equinox | -14.9 |
| Summer Solstice | +0.8 |
| Autumnal Equinox | +23.9 |
| Winter Solstice | +8.0 |
| **RMS** | **14.7** |

---

## Derived Parameters (no free parameters)

Both `eocEccentricity` and `perihelionPhaseOffset` are **derived from existing
model constants** -- they are not tunable free parameters.

### eocEccentricity

**Formula:**
```
eocEccentricity = eccentricityDerivedMean - eccentricityBase / 2
```

Where:
- `eccentricityDerivedMean = sqrt(eccentricityBase^2 + eccentricityAmplitude^2)` -- the mean geometric eccentricity over a full precession cycle
- `eccentricityBase` -- the fixed component of the Earth-barycenter offset

**Physics:**
- The geometric offset provides apparent speed variation with amplitude `e_geom` (first order)
- The explicit EoC adds `2 * eoc`
- Total must equal the real Keplerian amplitude `2 * e_real`
- Therefore: `eoc = e_real - e_geom / 2`

**Why eccentricityDerivedMean is the right e_real:**
The Earth-barycenter distance oscillates over the H/16 precession cycle. The
*mean* distance over a full cycle equals `sqrt(base^2 + amp^2)` -- this is a
mathematical identity for the mean of a vector sum where one component is fixed
and the other rotates. Using the mean ensures the EoC is correct on average
across all precession phases.

**Numerical value:** `sqrt(0.015373^2 + 0.001370^2) - 0.015373/2 = 0.007747`

**Previous hardcoded value was 0.0085** -- this overshot the total EoC effect
by 310 arcsec. The correction was discovered through numerical analysis using
the scene-graph tools (`tools/explore/derive-eoc-constants.js`).

### perihelionPhaseOffset

**Formula:**
```
perihelionPhaseOffset = ((startModelYear - balancedYear) / (H/16) * 360
                        + correctionSun
                        + 360 * (startmodelJD - perihelionRefJD) / yearDays) % 360
```

Where `perihelionRefJD = 2451547.042` (JD of Earth perihelion 2000, Jan 3.542),
stored in `ASTRO_REFERENCE.perihelionPassageJ2000_JD`.

**Physics:** This aligns the EoC perihelion direction with the geometric
perihelion direction set by the EP1 precession phase at J2000. The formula
computes the angular difference between:
1. Where the Sun is at the reference perihelion date (from correctionSun and
   the time offset from model start to perihelion)
2. Where the geometric eccentricity vector points at J2000 (from the EP1
   precession phase, which depends on balancedYear and H/16)

**Numerical value:** ~0.51 degrees (analytical, ignoring small tilt corrections
from earthRAAngle; full scene-graph computation gives -0.79 degrees, but the
difference has negligible effect on Sun position: <0.001 degrees)

**Previous hardcoded value was 2 degrees** -- this was co-tuned with the
incorrect eocEccentricity of 0.0085 to jointly compensate for the EoC
overshoot.

### correctionSun

The only remaining tunable parameter. Sets the Sun's starting angular position
on its orbit to align cardinal points (solstices/equinoxes) with observed dates.

| Parameter | Value | How determined |
|-----------|-------|----------------|
| `eocEccentricity` | 0.007747 | **Derived**: `eccentricityDerivedMean - eccentricityBase / 2` |
| `perihelionPhaseOffset` | ~0.51 deg | **Derived**: from EP1 precession phase + correctionSun + perihelion date |
| `correctionSun` | 0.471334 | **Tuned**: aligns summer solstice timing |
| `useVariableSpeed` | true | Toggle |

The geometric orbit offset parameters are **unchanged**:
- `eccentricityBase` = 0.015373 (offset of circle center from Earth)
- `eccentricityAmplitude` = 0.001370 (oscillation amplitude over H/16 cycle)

### Results

Sun baseline vs JPL Horizons (2000-2025, 26 yearly dates):
- RMS RA: 0.28 degrees (entirely JPL ICRF frame drift at ~54 arcsec/yr)
- RMS Dec: 0.002 degrees
- True model error after frame correction: ~0.003 degrees

Year lengths:
- Mean Tropical Year: 365.242190835 days (IAU: 365.242189700, diff +0.10s)
- Mean Sidereal Year: 365.256363246 days (IAU: 365.256363000, diff +0.02s)
- Anomalistic Year: 365.259636199 days (IAU: 365.259636000, diff +0.02s)

### Understanding the ~54 arcsec/yr RA drift

The 0.28° RMS RA error is **not a model error** -- it is a coordinate frame mismatch
between JPL Horizons (fixed ICRF/J2000 equinox) and our model (of-date equatorial
frame where the equinox precesses naturally).

The precession of the equinoxes is 50.29 arcsec/yr in **ecliptic longitude**. However,
the drift we measure is in **Right Ascension**, which requires projecting through the
obliquity of the ecliptic. The standard formula for precession in RA is:

```
Δα = m + n · sin(α) · tan(δ)
```

Where:
- `m = 46.1 arcsec/yr` -- general precession in RA
- `n = 20.04 arcsec/yr` -- precession coupling term from obliquity
- `α` = Sun's RA at measurement point
- `δ` = Sun's Dec at measurement point

At the June solstice (α ≈ 90°, δ ≈ 23.44°):

```
Δα = 46.1 + 20.04 · sin(90°) · tan(23.44°)
   = 46.1 + 20.04 · 1.0 · 0.4336
   = 46.1 + 8.69
   = 54.8 arcsec/yr
```

This matches our observed baseline drift of ~54.1 arcsec/yr to within 1.3%. The extra
~4.5 arcsec/yr beyond the raw 50.29 comes from the obliquity projection term -- precession
tilts the equatorial coordinate grid relative to the ecliptic, and at the solstice position
this tilt maximally affects RA.

After correcting for this frame drift, the true Sun model error is ~0.003 degrees.

---

## Start-Date Independence

| Parameter | Start-date dependent? | Explanation |
|-----------|-----------------------|-------------|
| `eocEccentricity` | No | Derived from mean eccentricity over full precession cycle |
| `perihelionPhaseOffset` | No | Derived from precession phases and perihelion reference date |
| `correctionSun` | Yes | Aligns Sun position at model start (June 21 2000); would differ for March 21 start |

Both derived constants use the *mean* geometric eccentricity and the J2000
precession state. Since the perihelion direction already precesses dynamically
via `perihelionPrecessionRate * pos`, the fixed offset correctly anchors the
J2000 reference direction. No dynamic update is needed.

---

## How It Works -- Technical Detail

### The Coordinate System

In `moveModel()`, each object's angular position is:
```
theta = speed * pos - startPos * (PI / 180)
```

For the Sun: `speed = 2*PI` (one full orbit per year), `startPos = correctionSun`.

### Mean Anomaly from Perihelion

The equation of center requires the mean anomaly M measured from perihelion:
```
perihelionPhase = perihelionPhaseJ2000 + perihelionPrecessionRate * pos
M = theta - perihelionPhase
```

The perihelion phase is computed from:
- Sun's theta at model start: `-correctionSun * PI/180`
- Angular distance from model start to perihelion: `2*PI * (days_since_perihelion / year_length)`
- Earth perihelion 2000: JD 2451547.042 (January 3.542), stored in `ASTRO_REFERENCE.perihelionPassageJ2000_JD`
- Plus the derived `perihelionPhaseOffset`

The phase precesses dynamically at `2*PI / (H/16)` radians per simulation year.

### The Series Expansion

We use a 2-term series expansion instead of iterative Kepler equation solving:
```
correction = 2*e*sin(M) + 1.25*e^2*sin(2*M)
```

Accurate to <0.01 deg for eccentricity < 0.21. No iteration needed.
`moveModel()` runs every animation frame for ~80 objects -- performance matters.

---

## Shared Parameter: correctionSun

`correctionSun` serves dual purposes:
1. Sun's `startPos` -- where it begins on its orbit
2. Planet `PerihelionFromEarth` nodes also use it as their `startPos`

Changing `correctionSun` shifts all planet RA values by the same amount (~0.18
degrees for the current change). This is negligible compared to existing planet
errors (2-7 degrees RMS) and will be absorbed during future planet optimization.

---

## Code Locations

- `src/script.js`:
  - Input constants: line ~48 (`useVariableSpeed`)
  - Astronomical reference: `ASTRO_REFERENCE.perihelionPassageJ2000_JD` (line ~862)
  - Derived constants: after `eccentricityDerivedMean` (~line 980): `eocEccentricity`, `perihelionPhaseOffset`
  - Sun object: ~line 2447 (`eccentricity: eocEccentricity`, `perihelionPhaseJ2000`)
  - moveModel: ~line 29200 (equation of center gate and formula)
- `tools/lib/constants.js`: lines 208-216 (derived constants)
- `tools/lib/scene-graph.js`: line 399 (Sun eccentricity), line 547 (moveModel)
- `tools/explore/derive-eoc-constants.js`: numerical verification script

---

## Scope and Future Work

### Currently Sun-only

The equation of center only applies to the Sun. No planets have
`perihelionPhaseJ2000` defined, so the moveModel gate
(`useVariableSpeed && obj.eccentricity && obj.perihelionPhaseJ2000 !== undefined`)
only passes for the Sun.

### Extending to planets

When adding variable speed to planets, each would face the same double-counting
issue. Each planet would need its own reduced EoC eccentricity, following the
same derivation: `eoc = e_real - e_geom / 2`.

Additional considerations for planets:
- Planets with large eccentricity (Mercury e=0.206) have a large equation of
  center (~24 degrees) -- the double-counting correction would be significant
- The Moon's perigee precesses rapidly (8.85-year cycle), so its perihelion
  phase must be fully dynamic
- Planet `startpos` and `angleCorrection` parameters will need re-optimization

---

## Verification Checklist

After any future changes to this system:

1. Run year analysis report in browser -- check cardinal point timing
2. Verify season lengths: VE-SS ~92.7d, SS-AE ~93.7d, AE-WS ~89.9d
3. Check precession period is still ~25,772 years
4. Check year lengths match IAU to within a few seconds
5. Verify Sun visually speeds up in January and slows down in July
6. Check equation of center display in UI shows correct values
7. No NaN values in any object positions
8. Run `node tools/optimize.js diagnose sun` -- eccentricity ratio ~1.08
9. Run `node tools/optimize.js baseline sun` -- RA drift ~54 arcsec/yr (frame effect)
