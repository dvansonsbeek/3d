# Planet Geocentric Parallax Corrections — Implementation Reference

**Date**: 2026-03-09
**Status**: Complete (up to 42-term correction, all 7 planets, JPL-verified)

---

## Overview

The holistic model uses circular orbits in tilted planes to represent planetary motion. While this captures the main geometry, it introduces systematic errors in RA/Dec predictions because:

1. **Geocentric parallax**: The model's geocentric distance varies differently from reality (shifted-circle vs elliptical orbit), causing parallax errors that scale with 1/distance.
2. **Precession drift**: Small mismatches in precession rates accumulate over centuries.
3. **Elliptical orbit effects**: The model's circular orbit has the wrong radial distance profile — the phase of distance variation doesn't match Kepler's ellipse.

These errors are corrected empirically using a linear model fitted to JPL Horizons reference data via least squares. A physics-based heliocentric distance correction was attempted but failed (see §7).

---

## 1. The Problem

The scene graph models each planet's orbital plane as a tilted circle. The tilt direction is approximated using the ascending node angle, but the true correction depends on the planet's orbital phase relative to Earth, which varies continuously. The resulting systematic error:

1. **Oscillates with the planet's orbital position** relative to its ascending node
2. **Scales inversely with geocentric distance** (closer = larger angular error)
3. **Drifts secularly** due to precession model mismatch (~0.1–0.6°/century)

**Why u = RA − ascendingNode?** The ascending node is where the orbital plane crosses the ecliptic. The planet's ecliptic latitude depends on sin(u) where u is the angular distance from the node. A tilt-direction error produces a declination error that oscillates with u, modulated by 1/d because the same angular error appears larger when the planet is closer.

**Why heliocentric distance terms?** The model's eo offset produces distance variation at the wrong phase relative to Kepler's ellipse. Terms involving 1/s (heliocentric distance) capture how the planet's true position relative to the Sun affects the geocentric parallax differently than the model predicts.

---

## 2. The Correction Formula

Applied to both RA and Dec independently (up to 42 coefficients per coordinate per planet):

```
dX = A + B/d + C·T
   + (D·sin(u) + E·cos(u) + F·sin(2u) + G·cos(2u) + H·sin(3u) + I·cos(3u)) / d
   + T·(J·sin(u) + K·cos(u)) / d
   + L/s + M·sin(u)/d² + N·sin(2u)/s + O·cos(u)/s
   + P·T·sin(2u)/d + Q·T·cos(2u)/d + R·T·sin(u)/s
   + S·T/d + U·cos(u)/d² + V/s² + W·sin(u)/s² + X·cos(3u)/s + Y·sin(3u)/s
   + Z/(d·s) + AA·sin(u)/(d·s) + AB·cos(2u)/(d·s) + AC·T·sin(2u)/s
   + AD·cos(3u)/d² + AE·sin(2u)/s²
   + AF·sin(3u)/s² + AG·cos(3u)/s² + AH·cos(u)/s² + AI·sin(u)/(d²·s)
   + AJ·cos(4u)/s + AK·sin(2u)/(d²·s)
   + AL·sin(4u)/d + AM·cos(4u)/d + AN·T·sin(u)/d² + AO·T·cos(u)/d²
   + AP·sin(u)/d³ + AQ·cos(u)/d³
```

Where:
- `u = (RA − ascendingNode)` in radians — orbital phase relative to ascending node
- `d` = geocentric distance (AU)
- `s` = heliocentric distance (AU)
- `T` = (JD − J2000) / 36525 — centuries from J2000

Note: The letter T is skipped as a coefficient name to avoid confusion with the time variable.

### Basis Functions

| Term | Formula | Group | Physics |
|------|---------|-------|---------|
| A | 1 | Core | Constant offset |
| B | 1/d | Core | Distance-dependent parallax bias |
| C | T | Core | Secular precession drift |
| D, E | sin(u)/d, cos(u)/d | Harmonics/d | 1st harmonic — tilt-direction error |
| F, G | sin(2u)/d, cos(2u)/d | Harmonics/d | 2nd harmonic — geocentric perspective shift |
| H, I | sin(3u)/d, cos(3u)/d | Harmonics/d | 3rd harmonic — orbital asymmetry |
| J, K | T·sin(u)/d, T·cos(u)/d | T×Harmonics/d | Precessing 1st harmonic (node regression) |
| L | 1/s | Heliocentric | Heliocentric distance bias |
| M | sin(u)/d² | Nonlinear/d² | Close-approach parallax amplification |
| N, O | sin(2u)/s, cos(u)/s | Heliocentric | Heliocentric harmonics |
| P, Q | T·sin(2u)/d, T·cos(2u)/d | T×Harmonics/d | Precessing 2nd harmonic |
| R | T·sin(u)/s | T×Heliocentric | Precessing heliocentric 1st harmonic |
| S | T/d | Extended | Evolving parallax bias |
| U | cos(u)/d² | Nonlinear/d² | cos companion of M |
| V, W | 1/s², sin(u)/s² | Extended | Quadratic heliocentric distance |
| X, Y | cos(3u)/s, sin(3u)/s | Extended | Heliocentric 3rd harmonic |
| Z | 1/(d·s) | Cross-distance | Geocentric × heliocentric coupling |
| AA, AB | sin(u)/(d·s), cos(2u)/(d·s) | Cross-distance | Harmonic cross-distance coupling |
| AC | T·sin(2u)/s | T×Heliocentric | Precessing heliocentric 2nd harmonic |
| AD | cos(3u)/d² | Nonlinear/d² | 3rd harmonic close-approach |
| AE | sin(2u)/s² | Quadratic/s² | Heliocentric quadratic 2nd harmonic |
| AF, AG | sin(3u)/s², cos(3u)/s² | Quadratic/s² | Heliocentric quadratic 3rd harmonic |
| AH | cos(u)/s² | Quadratic/s² | Heliocentric quadratic 1st harmonic |
| AI | sin(u)/(d²·s) | Triple-distance | d²×s coupling |
| AJ | cos(4u)/s | Heliocentric | 4th harmonic heliocentric |
| AK | sin(2u)/(d²·s) | Triple-distance | 2nd harmonic d²×s coupling |
| AL | sin(4u)/d | Harmonics/d | 4th harmonic parallax |
| AM | cos(4u)/d | Harmonics/d | 4th harmonic parallax (cos) |
| AN | T·sin(u)/d² | T×Nonlinear/d² | Precessing close-approach 1st harmonic |
| AO | T·cos(u)/d² | T×Nonlinear/d² | Precessing close-approach 1st harmonic (cos) |
| AP | sin(u)/d³ | Cubic/d³ | Ultra-close-approach parallax |
| AQ | cos(u)/d³ | Cubic/d³ | Ultra-close-approach parallax (cos) |

### Discovery Process

The correction grew incrementally from 6 to 36 parameters:

1. **6→11 params**: Added time drift (C), 3rd harmonic (H,I), and time-modulated harmonics (J,K) based on residual analysis showing secular trends and higher-order oscillations.
2. **11→15 params**: Added heliocentric distance terms (L,M,N,O) after discovering that residuals correlate with 1/sunDist and 1/d².
3. **15→18 params**: Added time-modulated 2nd harmonics (P,Q,R). Cross-validated per planet — only Mercury, Mars, Saturn, Neptune benefited.
4. **18→24 params**: Systematic search of candidate basis functions via greedy forward selection with LOOCV. Tested each candidate as a 19th parameter, picked the best, then searched for 20th given the 19th, etc.
5. **24→30→36 params**: Extended with cross-distance terms (1/(d·s), harmonics/(d·s)), quadratic heliocentric terms (harmonics/s²), triple-distance coupling (harmonics/(d²·s)), and 4th harmonic. Applied after enriching reference data to 2000+ points for Venus, Jupiter, Saturn. Per-planet tier selection via LOOCV determines optimal count.
6. **36→42 params**: Added 4th harmonic parallax terms (AL,AM), precessing close-approach terms (AN,AO), and cubic close-approach terms (AP,AQ) targeting Venus inferior conjunction errors. Venus enriched to 3800+ points with IC-dense sampling.

### Fitting Method

Coefficients are determined by **linear least squares** against JPL Horizons reference data (after IAU 1976 precession correction from J2000 to of-date frame).

The sin/cos decomposition eliminates phase parameters — `amplitude·sin(u − φ)/d` becomes `(a·sin(u) + b·cos(u))/d` — making fitting fully deterministic. No grid search, no local minima. The normal equations are solved by Gaussian elimination with partial pivoting.

---

## 3. Per-Planet Tier Selection

Not all planets benefit from all 42 terms. Each planet uses the tier with the lowest leave-one-out cross-validation (LOOCV) or k-fold CV error:

| Planet | n pts | Tier | RMS Tot | Notes |
|--------|-------|------|---------|-------|
| Mercury | 95 | 42p (A–AQ) | 0.01° | All 42 terms validated |
| Venus | 3812 | 42p (A–AQ) | 0.22° | Enriched to 3812 pts incl. IC-dense sampling |
| Mars | 184 | 30p (A–AE) | 0.02° | Higher tiers show multicollinearity |
| Jupiter | 2499 | 42p (A–AQ) | 0.06° | Enriched from 70 to 2499 pts |
| Saturn | 2502 | 36p (A–AK) | 0.10° | Higher tiers overfit despite large dataset |
| Uranus | 41 | 24p (A–Y) | 0.01° | Small dataset limits tier |
| Neptune | 69 | 24p (A–Y) | 0.01° | 24p validated by CV |

Absent coefficients evaluate to zero via `(dc.X || 0)` fallback in the formula.

---

## 4. Overfitting Protection

**LOOCV / k-fold CV**: For each candidate tier (15p, 18p, 24p, 30p, 36p, 42p), every data point is held out once (LOOCV for small datasets) or 10-fold CV is used (for enriched datasets with 2000+ points). The tier with lowest CV error wins.

**Multicollinearity rejection**: Outer planets develop huge coefficients (millions) for 1/s² and 1/(d²·s) terms because at large heliocentric distances these become nearly collinear with simpler terms. These tiers are rejected even when CV appears slightly better, as the coefficients are numerically unstable for extrapolation beyond the training range.

**Data ratio**: At 42 params (84 coefficients for RA+Dec), a planet needs substantial data for reliable fitting. Uranus (41 pts) is restricted to 24p. Enriched planets (Venus with 3800+ pts, Jupiter/Saturn with 2400+ pts) can support higher tiers where cross-validation confirms benefit.

---

## 5. Accuracy

### Current Baselines

RMS is computed over all weighted reference data (tier 2, weight > 0). The reference data spans well beyond the 2000–2200 enrichment window for most planets:

| Planet | n pts | Tier | RMS Tot | Data range | Primary source |
|--------|-------|------|---------|------------|----------------|
| Mercury | 95 | 42p | **0.01°** | 1803–2200 | NASA Mercury Transit Catalog |
| Venus | 3812 | 42p | **0.22°** | 1875–2200 | JPL Horizons (incl. IC-dense) |
| Mars | 184 | 30p | **0.02°** | 1899–2200 | Meeus opposition tables |
| Jupiter | 2499 | 42p | **0.06°** | 1803–2200 | JPL Horizons |
| Saturn | 2502 | 36p | **0.10°** | 1803–2200 | JPL Horizons |
| Uranus | 41 | 24p | **0.01°** | 2000–2200 | JPL Horizons |
| Neptune | 69 | 24p | **0.01°** | 1805–2200 | JPL Horizons / mutual events |

All 7 planets within 0.22°. Five under 0.06°. The accuracy holds over ~200–400 years for most planets (back to ~1800), not just the 2000–2200 window.

Additional ancient observation data (tier 3, back to ~1000 BC, from ISAW/mutual event catalogs) is present in the reference dataset with weight=0. These are available for visual comparison but do not contribute to the RMS.

### Remaining Error Sources

1. **Orbital eccentricity residual**: The empirical correction absorbs most of the elliptical orbit effect, but some residual remains for Mercury (e=0.206) and Mars (e=0.093).

2. **Mutual perturbations**: Jupiter–Saturn gravitational interaction causes ~1° longitude perturbations over their ~20-year conjunction cycle. Partially absorbed by harmonic correction.

3. **Per-planet specialization**: The current universal 42-term formula is the practical limit for a shared formula. Beyond this, planet-specific branches would be needed.

---

## 6. Implementation

### Code Locations

The correction is applied in two places that must be kept in sync:

| File | Function / Location | Planet name keys |
|------|---------------------|-----------------|
| `tools/lib/scene-graph.js` | `computePlanetPosition()` ~line 909 | lowercase |
| `src/script.js` | Planet display loop ~line 29142 | Capitalized |

Both compute the same formula. The structure is:

```javascript
// Precompute shared values
const u = (sph.theta / d2r - ascendingNode) * d2r;  // scene-graph.js
const invD = 1/d, invD2 = invD*invD, invS = 1/s, invS2 = invS*invS;
const T = (jd - j2000JD) / julianCenturyDays;
const sinU = Math.sin(u), cosU = Math.cos(u), /* sin2U, cos2U, sin3U, cos3U */;

// Sum all terms (absent coefficients fall back to 0)
const corrDec = dc.A + dc.B * invD + (dc.C || 0) * T + /* ... all terms ... */;
sph.phi += corrDec * d2r;   // Dec correction
sph.theta -= corrRA * d2r;  // RA correction (opposite sign)
```

See the source files for the full formula. Sign conventions: positive dDec increases phi (decreases dec); positive dRA decreases theta.

### Coefficient Tables

| File | Object | Keys |
|------|--------|------|
| `tools/lib/constants.js` | `ASTRO_REFERENCE.decCorrection` / `raCorrection` | lowercase |
| `src/script.js` | `ASTRO_REFERENCE.decCorrection` / `raCorrection` | Capitalized |

Planet visual positions in the 3D scene are NOT corrected — the corrections are sub-degree, invisible at scene scale.

### Fitting and Re-fitting

| Tool | Purpose |
|------|---------|
| `tools/explore/fit-extended-correction.js` | Fit 15p/18p/24p/30p/36p/42p tiers, LOOCV/k-fold selection, output coefficients |
| `tools/explore/archive/search-next-params.js` | Test 30 candidates as next parameter, ranked by LOOCV (superseded by greedy-forward-select) |
| `tools/explore/greedy-forward-select.js` | Sequential best-3 selection per planet |

After any change to the geometric model (startpos, EoC, dynamic tilt, holisticyearLength):

```bash
node tools/explore/fit-extended-correction.js   # refit coefficients
# Copy output into constants.js and script.js
node tools/optimize.js baseline all             # verify

# Optional: re-optimize orbital params, then refit again (converges in 1–2 cycles)
node tools/optimize.js optimize mars startpos,eocFraction,perihelionRef_JD
```

---

## 7. Why Empirical, Not Physics-Based

A physics-based correction was attempted: scaling the 3D heliocentric vector by r_kepler / r_model, where r_kepler = a(1 − e·cos(M)). This failed because:

1. **Wrong phase**: The model's eo offset produces distance variation 271° offset from Kepler's perihelion (for Mars). Correcting to the true distance disrupts the angular positions that were tuned for the model's current distance profile.

2. **Coupled axes**: Scaling the 3D vector changes both RA and Dec simultaneously. Mercury went from 0.48° to 3.00°, Mars from 0.31° to 1.87°.

The empirical approach works because it operates directly in RA/Dec output space. The basis functions are physically motivated (parallax ∝ 1/d, orbital harmonics from node geometry) but the coefficients are data-driven, letting each planet absorb its particular combination of geometric approximation errors.

---

## 8. Relationship to Other Corrections

| System | Adjusts | Interaction with parallax correction |
|--------|---------|--------------------------------------|
| **EoC (variable speed)** | Orbital angle | Independent — EoC adjusts longitude, parallax adjusts apparent RA/Dec |
| **Dynamic geocentric eo** | Orbit center offset | Complementary — parallax was fitted with eo active |
| **Dynamic inclination** | Tilt magnitude | Complementary — parallax corrects tilt *direction* error |
| **IAU precession** | J2000 → of-date frame | Critical prerequisite for fitting — converts JPL data to model frame |
| **Moon Meeus Ch. 47** | Full RA/Dec override | Same architecture, many more terms (60+60) |

---

## 9. Reference Data

Reference data in `config/reference-data.json` contains two tiers per planet:

- **Tier 2 (weight > 0)**: 41–3812 data points per planet, spanning ~1800–2200 for most planets (Uranus: 2000–2200 only). Sources include JPL Horizons API, NASA Mercury Transit Catalog, and Meeus opposition tables. RA/Dec in J2000 frame — the precession module (`tools/lib/precession.js`) converts to of-date frame before comparison with the model. Venus has been enriched to 3812 points (including IC-dense sampling near 125 inferior conjunctions). Jupiter and Saturn have been enriched to ~2500 points for robust higher-tier fitting.
- **Tier 3 (weight = 0)**: Ancient observation data back to ~1000 BC from ISAW and mutual planetary event catalogs. Available for visual comparison but excluded from RMS calculations and parallax fitting.
