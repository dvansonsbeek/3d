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
approximately 55% of the correct speed variation. Adding the full equation of
center on top produces ~155% of the real effect.

### Observable consequence

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

### The fix: Separate EoC eccentricity

The equation of center needs a **reduced eccentricity** (`eocEccentricity`)
that only provides the ~45% of speed variation not already captured by the
off-center geometry.

---

## Current Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `eocEccentricity` | 0.0085 | Eccentricity for the equation of center formula (~55% of geometric eccentricity) |
| `perihelionPhaseOffset` | 2 degrees | Fine-tunes the direction where the EoC peaks relative to the geometric perihelion |
| `correctionSun` | 0.511153 | Sun starting position on orbit (aligns summer solstice with new EoC eccentricity) |
| `useVariableSpeed` | true | Master toggle for the equation of center |

The geometric orbit offset parameters are **unchanged**:
- `eccentricityBase` = 0.015373 (offset of circle center from Earth)
- `eccentricityAmplitude` = 0.001370 (oscillation amplitude over H/16 cycle)

### Results

| Cardinal Point | Error (hours) |
|----------------|---------------|
| Vernal Equinox | -0.2 |
| Summer Solstice | 0.0 |
| Autumnal Equinox | +0.4 |
| Winter Solstice | +0.5 |
| **RMS** | **0.36** |

Year lengths:
- Mean Tropical Year: 365.242190835 days (IAU: 365.242189700, diff +0.10s)
- Mean Sidereal Year: 365.256363246 days (IAU: 365.256363000, diff +0.02s)
- Anomalistic Year: 365.259636199 days (IAU: 365.259636000, diff +0.02s)

---

## Start-Date Independence

| Parameter | Start-date dependent? | Explanation |
|-----------|-----------------------|-------------|
| `eocEccentricity` | No | Depends only on the geometric offset size (eccentricityBase) |
| `perihelionPhaseOffset` | No | Corrects phase relationship between geometric and EoC mechanisms |
| `correctionSun` | Yes | Aligns Sun position at model start (June 21 2000); would differ for March 21 start |

If the model started on a different date, only `correctionSun` would change.
The `eocEccentricity` and `perihelionPhaseOffset` describe a structural
interaction between the off-center geometry and the equation of center -- they
are independent of where the Sun is on any particular date.

---

## Dynamic vs Fixed Values

### Currently fixed

**`eocEccentricity`** (0.0085): The geometric eccentricity oscillates over the
H/16 perihelion cycle between `eccentricityBase - eccentricityAmplitude`
(0.014003) and `eccentricityBase + eccentricityAmplitude` (0.016743). When the
geometric eccentricity is larger, the off-center geometry provides more speed
variation, so the EoC needs less -- and vice versa.

The variation is small (~10% over the 20,868-year cycle) and the fixed value
works well for the present epoch. Making it dynamic would improve long-timescale
accuracy but is not essential for current use.

**`perihelionPhaseOffset`** (2 degrees): Could vary slightly with eccentricity
changes but the effect is negligible.

### Already dynamic

**Perihelion direction**: The `perihelionPhaseJ2000` precesses at the H/16 rate
(~20,868 years). This is essential -- the direction of fastest/slowest motion
rotates over time.

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
- Earth perihelion 2000: JD 2451547.042 (January 3.542)
- Model start: JD 2451716.5 (June 21.0)
- Plus the `perihelionPhaseOffset` (2 degrees)

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
  - Constants: lines 46-52 (`correctionSun`, `useVariableSpeed`, `perihelionPhaseOffset`, `eocEccentricity`)
  - Sun object: ~line 2434 (`eccentricity: eocEccentricity`, `perihelionPhaseJ2000`)
  - moveModel: ~line 29200 (equation of center gate and formula)
- `tools/lib/constants.js`: lines 14, 25-26 (shared constants)
- `tools/lib/scene-graph.js`: line 399 (Sun eccentricity), line 547 (moveModel)

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
pattern established here.

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
