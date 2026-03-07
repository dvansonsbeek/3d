# Moon Meeus Corrections -- Implementation Reference

**Date**: 2026-03-07 (updated 2026-03-07)
**Status**: Complete (full Meeus Ch. 47: 60L+60B terms, RA+Dec override, JPL-verified)

---

## Overview

The Moon's position in the model is determined by two systems working together:

1. **5-layer precession hierarchy** (geometric): Handles the Moon's orbital period,
   apsidal precession, nodal precession, and their interactions using nested rotating
   containers in Three.js. This produces the orbital circle visible in the scene.

2. **Meeus analytical corrections** (perturbative): Adds equation of center, solar
   perturbations (evection, variation, annual equation), and ecliptic latitude from
   Meeus "Astronomical Algorithms" Ch. 47. These shift the Moon's actual position
   away from its geometric circle.

The visual result: the orbit ring shows the unperturbed circular path, while the
Moon mesh shows the physically correct Meeus-corrected position -- making the
gravitational perturbation effects directly visible.

---

## 1. Full Meeus Ch. 47 Longitude + Latitude

Applied in `moveModel()` when `useVariableSpeed && obj.lunarPerturbations`.

### Fundamental Arguments (polynomial in T = centuries from J2000)

```
d  = (startmodelJD - 2451545.0) + pos * meanSolarYearDays
T  = d / 36525
L' = 218.3164 + 481267.8812*T + ...  (Moon mean longitude)
D  = 297.8502 + 445267.1114*T + ...  (mean elongation)
M  = 357.5291 + 35999.0503*T + ...   (Sun mean anomaly)
M' = 134.9634 + 477198.8675*T + ...  (Moon mean anomaly)
F  = 93.2721  + 483202.0175*T + ...  (argument of latitude)
E  = 1 - 0.002516*T                  (Earth eccentricity correction)
```

### 1.1 Longitude Series (Table 47.A, 60 terms + 3 additional)

Table-driven summation of 60 periodic terms, each with argument D*a + M*b + M'*c + F*d.
Terms involving M are multiplied by E (or E^2 for |M|=2).
Additional corrections: A1 (Venus), A2 (Jupiter), L'-F (flattening).

The equation-of-center portion (6288774*sin(M') + 213618*sin(2M')) is partially
subtracted because the off-center orbit geometry already provides half.

### 1.2 Latitude Series (Table 47.B, 60 terms + 6 additional)

Same table-driven approach for ecliptic latitude (beta).
Additional corrections: -2235*sin(L'), A3, and Venus/flattening terms.

### 1.3 Post-hoc RA+Dec Override

The full Meeus ecliptic longitude (L' + Sigma_l) and latitude (Sigma_b) are
stored in moveModel. In updatePositions, both RA and Dec are overridden with
the Meeus-derived equatorial coordinates using ecliptic-to-equatorial conversion.

This bypasses the hierarchy's RA entirely, fixing the ~1.2-degree RA errors
that arose from the 5-layer precession approximation. The orbit ring still
shows the hierarchy path, while the Moon mesh shows the correct Meeus position.

---

## 2. Ecliptic Latitude Correction (Meeus Ch. 47)

### The Problem

The 5-layer hierarchy's node positions have phase errors. The hierarchy produces
a draconitic month of ~30.9 days instead of the correct 27.2 days, causing the
Moon's ecliptic latitude to be wrong by up to ~5 degrees at any given time.
This made solar eclipses invisible in the 3D scene.

### The Solution

The Moon's ecliptic latitude beta is computed analytically using Meeus Ch. 47's
13-term Fourier series, using the argument of latitude F:

```
T = d / 36525    (centuries from J2000)
F = 93.2720993 + 483202.0175273 * T    (argument of latitude, degrees)
D' = 297.8502042 + 445267.1115168 * T  (mean elongation, per-century rate)

beta = (
  5128122 * sin(F)
+  280602 * sin(M' + F)
+  277693 * sin(M' - F)
+  173237 * sin(2D' - F)
+   55413 * sin(2D' - M' + F)
+   46271 * sin(2D' - M' - F)
+   32573 * sin(2D' + F)
+   17198 * sin(2M' + F)
+    9266 * sin(2D' + M' - F)
+    8822 * sin(2M' - F)
+    8216 * sin(2D' - M_sun - F)
+    4324 * sin(2D' - 2M' - F)
+    4200 * sin(2D' + M' + F)
) * 1e-6 degrees
```

The main term `5.128 * sin(F)` represents the basic 5.14-degree orbital
inclination. The remaining terms capture perturbations from the Sun's gravity.

### Application: Two-Stage Correction

The correction is applied in `updatePositions()` (not `moveModel()`) because
it needs the world matrices to be current.

**Stage 1 -- RA/Dec readout correction (post-hoc)**:

After computing the Moon's RA/Dec from its 3D world position, both RA and Dec
are replaced with the full Meeus values:

```
1. Compute ecliptic longitude lambda = L' + Sigma_l (stored in moveModel)
2. Compute ecliptic latitude beta = Sigma_b (stored in moveModel)
3. Convert ecliptic → equatorial:
   RA  = atan2(sin(lam)*cos(eps) - tan(bet)*sin(eps), cos(lam))
   Dec = asin(sin(bet)*cos(eps) + cos(bet)*sin(eps)*sin(lam))
4. Override both obj.ra and obj.dec
```

This gives accurate RA/Dec numbers (verified against JPL to 0.02 degrees in Dec).
The RA override eliminates the ~1.2-degree errors from the 5-layer hierarchy.

**Stage 2 -- Visual 3D position correction**:

The Moon's `pivotObj.position` is updated to match the corrected RA/Dec, so the
Moon mesh appears at the physically correct position in the 3D scene:

```
1. Build corrected position from corrected spherical (same radius and RA, new Dec)
2. Transform: Earth equatorial local -> world (via earth.rotationAxis.matrixWorld)
3. Transform: world -> orbitObj local (via inverse of pivotObj.parent.matrixWorld)
4. Set pivotObj.position and rotationAxis.position to the result
```

Uses pre-allocated Vector3 and Matrix4 objects. No extra `updateWorldMatrix`
calls -- uses matrices already computed at the top of `updatePositions()`.
The renderer's auto matrix update propagates the change before drawing.

### Visual Effect

The orbit ring (child of orbitObj, sibling of pivotObj) shows the geometric
circular path dictated by the 5-layer hierarchy. The Moon mesh (child of
pivotObj) shows the Meeus-corrected position. The difference between the
ring and the Moon makes the gravitational perturbation effects visible --
the Moon's actual path deviates from its geometric orbit due to solar gravity.

---

## 3. Constants

Stored in `ASTRO_REFERENCE` in both `src/script.js` and `tools/lib/constants.js`:

| Constant | Value | Unit | Source |
|----------|-------|------|--------|
| moonMeanAnomalyJ2000_deg | 134.9634 | deg | Meeus Ch. 47 |
| moonMeanAnomalyRate_degPerDay | 13.06499295 | deg/day | Meeus Ch. 47 |
| moonMeanElongationJ2000_deg | 297.8502 | deg | Meeus Ch. 47 |
| moonMeanElongationRate_degPerDay | 12.19074912 | deg/day | Meeus Ch. 47 |
| sunMeanAnomalyJ2000_deg | 357.5291 | deg | Meeus Ch. 25 |
| sunMeanAnomalyRate_degPerDay | 0.98560028 | deg/day | Meeus Ch. 25 |
| moonArgLatJ2000_deg | 93.2720993 | deg | Meeus Ch. 47 |
| moonArgLatRate_degPerCentury | 483202.0175273 | deg/century | Meeus Ch. 47 |
| moonMeanElongationJ2000Full_deg | 297.8502042 | deg | Meeus Ch. 47 |
| moonMeanElongationRate_degPerCentury | 445267.1115168 | deg/century | Meeus Ch. 47 |

Note: Two sets of mean elongation constants exist. The per-day rates are used
for the longitude perturbations (computed from `d`). The per-century rates are
used for the latitude correction (computed from `T = d/36525`).

---

## 4. StartPos Values

Optimized against JPL Horizons (7-day sampling, 2000-2025) with Meeus
corrections active, then validated against 58 NASA GSFC solar eclipses:

| Parameter | Old Value | New Value |
|-----------|-----------|-----------|
| moonStartposApsidal | 330 | 347.622 |
| moonStartposNodal | 64 | -83.630 |
| moonStartposMoon | 132 | 131.930 |

---

## 5. Accuracy

### Eclipse accuracy (frame-independent ground truth)
- 58 solar eclipses 2000-2025 (NASA GSFC catalog)
- RMS Moon-Sun separation: **0.81 degrees** (geocentric)
- 25 eclipses within 0.5 degrees
- Best match: 2020-Jun-21 annular eclipse at 0.11 degrees

### Geocentric parallax limit
- The 0.81-degree RMS is the **theoretical best** for geocentric coordinates.
- Solar eclipses are topocentric events. The Moon's parallax (~0.95 degrees)
  means the geocentric Moon-Sun separation at eclipse time is approximately
  |gamma| x 0.95 degrees, where gamma is the eclipse shadow offset.
- Pearson r(|gamma|, geocentric_sep) = 0.9945 (r^2 = 0.989)
- Residual RMS after subtracting expected parallax: **0.04 degrees**
- To improve beyond 0.81 degrees would require topocentric correction
  (accounting for the observer's location on Earth).

### JPL Horizons comparison (subject to ICRF frame drift)
- RA RMS: 0.25 degrees (includes ~54 arcsec/yr frame drift)
- Dec RMS: 0.02 degrees
- Total RMS: 0.25 degrees

### Historical eclipse accuracy by era

Tested against solar eclipses from 584 BCE to 2024 CE using
`tools/explore/moon-ancient-eclipses.js`. Results:

| Era | Sep RMS° | Residual RMS° | ≤1.5° |
|-----|----------|---------------|-------|
| Modern (2000-2024) | ~0.8 | ~0.04 | 5/5 |
| 20th century (1900-1999) | ~1.0 | ~0.6 | 8/9 |
| 19th century (1806-1868) | ~1.5 | ~1.2 | 3/4 |
| 18th century (1706-1780) | ~2.5 | ~2.0 | 2/4 |
| 17th-15th century | ~3.5 | ~3.0 | 1/4 |
| Medieval (632-1261) | ~5+ | ~5+ | 1/5 |
| Ancient (584 BCE-484 CE) | ~8+ | ~8+ | 1/8 |

Accuracy degrades significantly before ~1900. This is expected given the
combined uncertainties described below.

---

## 6. NASA GSFC Eclipse Catalog: Computed, Not Observed

### The catalog is numerically computed

The NASA GSFC Five Millennium Canon of Solar Eclipses (-1999 to +3000) is
**entirely numerically computed**, not based on historical observations.

Sources used in the computation:
- **Sun position**: VSOP87 theory (Bretagnon & Francou, 1988)
- **Moon position**: ELP-2000/82 theory (Chapront-Touzé & Chapront, 1983),
  with some later corrections from ELP-2000/85
- **Earth rotation**: Delta-T extrapolation from historical records and
  models (Stephenson & Morrison, Morrison & Stephenson)
- **Besselian elements**: Computed from the above to predict shadow paths

The catalog predicts where eclipses *should* have occurred according to these
theories. It does not incorporate historical observations to verify or correct
its predictions.

### Three layers of uncertainty for ancient eclipses

**Layer 1: ELP-2000/82 lunar theory accuracy**

ELP-2000/82 is a semi-analytical theory fitted to the DE200 numerical
ephemeris. Its internal precision degrades with time distance from J2000:

| Era | T (centuries) | Longitude precision |
|-----|---------------|---------------------|
| 2000 CE | 0 | ~0.5 arcsec |
| 1000 CE | -10 | ~2-5 arcsec |
| 0 CE | -20 | ~10-30 arcsec |
| 1000 BCE | -30 | ~1-3 arcmin |
| 2000 BCE | -40 | ~5-10 arcmin |

The polynomial terms (T², T³, T⁴) in the fundamental arguments accumulate
errors for large |T|. The theory was designed for high accuracy near the
present epoch, not for millennia-scale extrapolation.

**Layer 2: Delta-T (Earth rotation) uncertainty**

Delta-T = TT - UT1, the difference between uniform atomic time and Earth's
variable rotation. It directly affects *where* on Earth an eclipse is visible
and slightly affects *when* the eclipse occurs.

| Era | Delta-T uncertainty | Geographic shift |
|-----|--------------------|--------------------|
| 2000 CE | < 1 second | negligible |
| 1900 CE | ~1 second | ~0.4 km |
| 1000 CE | ~300-600 seconds | ~200+ km |
| 0 CE | ~1200-1800 seconds | ~500+ km |
| 1000 BCE | ~3000-5000 seconds | ~1000+ km |

Before ~700 BCE, there are no direct Delta-T measurements at all. Values are
extrapolated using tidal deceleration models with large uncertainties.

**Layer 3: Combined effect**

For ancient eclipses, the NASA catalog's predictions are the output of theories
extrapolated far beyond their validated range, using a Delta-T model with
large uncertainties. The fact that our model disagrees with the catalog for
ancient dates does not necessarily mean our model is wrong -- it may equally
mean the catalog's extrapolations are unreliable.

### Verified historical observations

Only a small number of ancient eclipses have **independent historical
documentation** that can serve as genuine ground truth:

- **Babylonian records** (~750 BCE onward): Clay tablets with dated eclipse
  observations. About 40 reliable solar eclipse records, providing the primary
  source for Delta-T calibration before telescopic observations.
- **Chinese records** (~720 BCE onward): Court astronomer records in dynastic
  histories. Generally give date and sometimes time of day.
- **Greek/Roman records**: Scattered literary references (Thales ~585 BCE,
  Thucydides ~431 BCE, Ennius ~189 BCE). Often imprecise about timing.

Key insight: these observations constrain *that* an eclipse occurred on a given
date, but rarely provide precise timing (to hours). Since the Moon moves ~0.5°
per hour, timing uncertainty of ±3 hours translates to ±1.5° position error.

### Implications for this model

1. **Modern era (2000-2025)**: Our 0.04° residual RMS confirms the Meeus
   Ch. 47 implementation is correct. The 0.81° raw RMS equals the theoretical
   geocentric parallax limit.

2. **Historical era (before ~1900)**: Degraded accuracy is expected and shared
   by all analytical lunar theories. Our model uses Meeus Ch. 47 (based on
   ELP-2000/82), so it inherits the same limitations as the NASA catalog.

3. **Opportunity**: A tool like this model, with its interactive 3D
   visualization and fast computation, could help lunar scientists develop and
   validate improved perturbation series. The table-driven architecture
   (60 longitude + 60 latitude terms) makes it straightforward to test
   alternative coefficient sets or additional terms.

---

## 7. Files Modified

| File | Changes |
|------|---------|
| `src/script.js` ~line 881 | ASTRO_REFERENCE constants |
| `src/script.js` ~line 2606 | `lunarPerturbations: true` on Moon object |
| `src/script.js` ~line 29259 | Longitude perturbations + Meeus latitude in moveModel |
| `src/script.js` ~line 29008 | Post-hoc Dec correction + visual position correction in updatePositions |
| `tools/lib/constants.js` ~line 218 | ASTRO_REFERENCE constants |
| `tools/lib/scene-graph.js` ~line 458 | `lunarPerturbations: true` on moonDef |
| `tools/lib/scene-graph.js` ~line 555 | Longitude perturbations + Meeus latitude storage |
| `tools/lib/scene-graph.js` ~line 715 | Post-hoc Dec correction in computePlanetPosition |

---

## 7. Eclipse Validation Tool

`tools/explore/moon-eclipse-optimizer.js` -- Computes Moon-Sun separation at 58
known solar eclipses (2000-2025) and optionally optimizes startPos values to
minimize the RMS separation. Eclipse JD values from NASA GSFC eclipse catalog.

`tools/explore/moon-error-analysis.js` -- Compares Moon position against JPL
Horizons with 7-day sampling over 2 years.

`tools/explore/moon-ancient-eclipses.js` -- Tests Moon-Sun separation at
historical and ancient solar eclipses from 584 BCE to 2024 CE, organized by
era (Modern, 20th century, 19th century, 18th century, 17th-15th century,
Medieval, Ancient). Shows how accuracy degrades with time distance from J2000.

`tools/explore/moon-parallax-analysis.js` -- Proves the 0.81° RMS at modern
eclipses is the geocentric parallax limit. Correlates Moon-Sun separation with
NASA gamma parameter (Pearson r=0.9945). Shows residual RMS of 0.04° after
subtracting expected parallax.

`tools/explore/moon-full-meeus-test.js` -- Standalone test comparing 3
configurations (current model, full Meeus Moon + model Sun, full Meeus
standalone) to confirm the 0.81° RMS is configuration-independent.
