# Planet Geocentric Parallax Corrections — Implementation Reference

**Date**: 2026-03-09
**Status**: Complete (up to 24-term correction, all 7 planets, JPL-verified)

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

Applied to both RA and Dec independently (up to 24 coefficients per coordinate per planet):

```
dX = A + B/d + C·T
   + (D·sin(u) + E·cos(u) + F·sin(2u) + G·cos(2u) + H·sin(3u) + I·cos(3u)) / d
   + T·(J·sin(u) + K·cos(u)) / d
   + L/s + M·sin(u)/d² + N·sin(2u)/s + O·cos(u)/s
   + P·T·sin(2u)/d + Q·T·cos(2u)/d + R·T·sin(u)/s
   + S·T/d + U·cos(u)/d² + V/s² + W·sin(u)/s² + X·cos(3u)/s + Y·sin(3u)/s
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

### Discovery Process

The correction grew incrementally from 6 to 24 parameters:

1. **6→11 params**: Added time drift (C), 3rd harmonic (H,I), and time-modulated harmonics (J,K) based on residual analysis showing secular trends and higher-order oscillations.
2. **11→15 params**: Added heliocentric distance terms (L,M,N,O) after discovering that residuals correlate with 1/sunDist and 1/d².
3. **15→18 params**: Added time-modulated 2nd harmonics (P,Q,R). Cross-validated per planet — only Mercury, Mars, Saturn, Neptune benefited.
4. **18→24 params**: Systematic search of 30 candidate basis functions via greedy forward selection with LOOCV. Tested each candidate as a 19th parameter, picked the best, then searched for 20th given the 19th, etc. Only Mercury and Mars validated all 6 new terms; others showed multicollinearity (see §4).

### Fitting Method

Coefficients are determined by **linear least squares** against JPL Horizons reference data (after IAU 1976 precession correction from J2000 to of-date frame).

The sin/cos decomposition eliminates phase parameters — `amplitude·sin(u − φ)/d` becomes `(a·sin(u) + b·cos(u))/d` — making fitting fully deterministic. No grid search, no local minima. The normal equations are solved by Gaussian elimination with partial pivoting.

---

## 3. Per-Planet Tier Selection

Not all planets benefit from all 24 terms. Each planet uses the tier with the lowest leave-one-out cross-validation (LOOCV) error:

| Planet | n pts | Tier | RMS Tot | CV Tot | Notes |
|--------|-------|------|---------|--------|-------|
| Mercury | 95 | 24p (A–Y) | 0.03° | 0.038° | All 24 terms validated |
| Venus | 48 | 15p (A–O) | 0.04° | 0.085° | 18p/24p overfit (too few points) |
| Mars | 184 | 24p (A–Y) | 0.04° | 0.055° | Largest dataset, all 24 terms validated |
| Jupiter | 70 | 15p (A–O) | 0.07° | 0.116° | 24p collinear in 1/s² terms |
| Saturn | 67 | 18p (A–R) | 0.09° | 0.133° | P,Q,R improve CV over 15p |
| Uranus | 41 | 15p (A–O) | 0.01° | 0.023° | Already excellent at 15p |
| Neptune | 69 | 18p (A–R) | 0.01° | 0.015° | P,Q,R validated by CV |

Absent coefficients evaluate to zero via `(dc.X || 0)` fallback in the formula.

---

## 4. Overfitting Protection

**LOOCV**: For each candidate tier (15p, 18p, 24p), every data point is held out once, the model is refit on n-1 points, and the held-out error is recorded. The tier with lowest CV error wins.

**Multicollinearity rejection**: Outer planets develop huge coefficients (millions) for 1/s² terms because at large heliocentric distances these become nearly collinear with 1/s. These tiers are rejected even when CV appears slightly better, as the coefficients are numerically unstable for extrapolation beyond the training range.

**Data ratio**: At 24 params (48 coefficients for RA+Dec), a planet needs ~70+ points for reliable fitting. Venus (48) and Uranus (41) are restricted to 15p.

---

## 5. Accuracy

### Improvement History

| Planet | Raw | 11p | 15p | 18p | 24p | Reduction |
|--------|-----|-----|-----|-----|-----|-----------|
| Mercury | 1.18° | 0.48° | 0.08° | 0.06° | **0.03°** | 97.5% |
| Venus | 0.48° | 0.13° | **0.04°** | — | — | 91.7% |
| Mars | 1.06° | 0.31° | 0.17° | 0.08° | **0.04°** | 96.2% |
| Jupiter | 0.26° | 0.08° | **0.07°** | — | — | 73.1% |
| Saturn | 0.54° | 0.11° | 0.10° | **0.09°** | — | 83.3% |
| Uranus | 0.10° | 0.02° | **0.01°** | — | — | 90.0% |
| Neptune | 0.68° | 0.03° | 0.02° | **0.01°** | — | 98.5% |

All 7 planets within 0.09°. Five under 0.04°. Bold = current tier.

### Remaining Error Sources

1. **Orbital eccentricity residual**: The empirical correction absorbs most of the elliptical orbit effect, but some residual remains for Mercury (e=0.206) and Mars (e=0.093).

2. **Mutual perturbations**: Jupiter–Saturn gravitational interaction causes ~1° longitude perturbations over their ~20-year conjunction cycle. Partially absorbed by harmonic correction.

3. **Per-planet specialization**: Greedy forward selection found planet-specific improvements beyond 24p (e.g., T²·cos(u)/d for Saturn, sin(3u)/d² for Venus), but these would require per-planet formula branches. The current universal 24-term formula is the practical limit for a shared formula.

---

## 6. Implementation

### Code Locations

The correction is applied in two places that must be kept in sync:

| File | Function / Location | Planet name keys |
|------|---------------------|-----------------|
| `tools/lib/scene-graph.js` | `computePlanetPosition()` ~line 889 | lowercase |
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
| `tools/explore/fit-extended-correction.js` | Fit 15p/18p/24p tiers, LOOCV selection, output coefficients |
| `tools/explore/search-next-params.js` | Test 30 candidates as next parameter, ranked by LOOCV |
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

JPL Horizons ephemeris data in `config/reference-data.json`. Each planet has 41–184 data points spanning 2000–2200, with RA/Dec in J2000 frame. The precession module (`tools/lib/precession.js`) converts J2000 to of-date frame before comparison with the model.
