# Planet Geocentric Parallax Corrections — Implementation Reference

**Date**: 2026-03-24
**Status**: Complete (up to 78-term correction for inner planets, 68 for outer, JPL-verified)

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

Applied to both RA and Dec independently (up to 78 coefficients for inner planets, 68 for outer):

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
   + AR·sin(cp) + AS·cos(cp) + AT·sin(2cp) + AU·cos(2cp)       [Jupiter-Saturn conjunction phase]
   + AV·sin(cp)/d + AW·cos(cp)/d
   + AX·sin(L)/d + AY·cos(L)/d + AZ·sin(L) + BA·cos(L)        [Sun mean longitude L]
   + BB·T·sin(L)/d + BC·T·cos(L)/d + BD·T·sin(L) + BE·T·cos(L)
   + BF·cos(u)·sin(L)/d² + BG·cos(u)·cos(L)/d²
   + BH·sin(L)/d³ + BI·cos(L)/d³
   + BJ·sin(u−L)/d² + BK·cos(u−L)/d²                           [synodic phase at close approach]
   + BL·T²/d + BM·T²·sin(u)/d + BN·T²·cos(u)/d                [quadratic time drift]
   + BO·sin(2u)/d³ + BP·cos(2u)/d³ + BQ·sin(u)/d⁴
   + BR·sin(M)/d + BS·cos(M)/d                                  [mean anomaly M — inner planets only]
   + BT·sin(2M)/d + BU·cos(2M)/d
   + BV·sin(M) + BW·cos(M)
   + BX·sin(2M) + BY·cos(2M)
   + BZ·sin(M)/d² + CA·cos(M)/d²
```

Where:
- `u = (RA − ascendingNode(t))` in radians — orbital phase relative to **dynamic** ascending node
- `d` = geocentric distance (AU)
- `s` = heliocentric distance (AU)
- `T` = (JD − J2000) / 36525 — centuries from J2000
- `cp` = conjunction phase (Jupiter-Saturn triple synodic period ~59.5 yr)
- `L` = Sun mean longitude (280.460° + 0.9856474°/day × dt)
- `M` = planet mean anomaly — **dynamic**, computed from EoC computation (inner planets only)

Note: The letter T is skipped as a coefficient name to avoid confusion with the time variable. The ascending node `u` uses `calculateDynamicAscendingNodeFromTilts()` rather than a static J2000 value.

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
| AR–AW | sin(cp), cos(cp), ... /d | Conjunction | Jupiter-Saturn conjunction phase (~59.5 yr) |
| AX–BE | sin(L)/d, cos(L), T·sin(L)/d, ... | Sun longitude | Eccentricity offset through inclination |
| BF–BK | cos(u)·sin(L)/d², sin(u−L)/d², ... | Cross-terms | Nonlinear close-approach × Sun longitude |
| BL–BN | T²/d, T²·sin(u)/d, T²·cos(u)/d | Quadratic drift | Non-linear time drift |
| BO–BQ | sin(2u)/d³, cos(2u)/d³, sin(u)/d⁴ | High-order | Venus close approach (0.26 AU) |
| BR, BS | sin(M)/d, cos(M)/d | Mean anomaly | 1st harmonic EoC residual at distance |
| BT, BU | sin(2M)/d, cos(2M)/d | Mean anomaly | 2nd harmonic EoC residual at distance |
| BV, BW | sin(M), cos(M) | Mean anomaly | Distance-independent 1st harmonic |
| BX, BY | sin(2M), cos(2M) | Mean anomaly | Distance-independent 2nd harmonic |
| BZ, CA | sin(M)/d², cos(M)/d² | Mean anomaly | 1st harmonic at close approach |

### Discovery Process

The correction grew incrementally from 6 to 36 parameters:

1. **6→11 params**: Added time drift (C), 3rd harmonic (H,I), and time-modulated harmonics (J,K) based on residual analysis showing secular trends and higher-order oscillations.
2. **11→15 params**: Added heliocentric distance terms (L,M,N,O) after discovering that residuals correlate with 1/sunDist and 1/d².
3. **15→18 params**: Added time-modulated 2nd harmonics (P,Q,R). Cross-validated per planet — only Mercury, Mars, Saturn, Neptune benefited.
4. **18→24 params**: Systematic search of candidate basis functions via greedy forward selection with LOOCV. Tested each candidate as a 19th parameter, picked the best, then searched for 20th given the 19th, etc.
5. **24→30→36 params**: Extended with cross-distance terms (1/(d·s), harmonics/(d·s)), quadratic heliocentric terms (harmonics/s²), triple-distance coupling (harmonics/(d²·s)), and 4th harmonic. Applied after enriching reference data to 2000+ points for Venus, Jupiter, Saturn. Per-planet tier selection via LOOCV determines optimal count.
6. **36→42 params**: Added 4th harmonic parallax terms (AL,AM), precessing close-approach terms (AN,AO), and cubic close-approach terms (AP,AQ) targeting Venus inferior conjunction errors. Venus enriched to 3800+ points with IC-dense sampling.
7. **42→68 params**: Added Jupiter-Saturn conjunction phase terms (AR–AW), Sun mean longitude eccentricity-offset terms (AX–BE), nonlinear close-approach × Sun longitude cross-terms (BF–BK), quadratic time drift (BL–BN), and high-order close-approach terms (BO–BQ). All 7 planets enriched to 5000+ points.
8. **68→78 params (inner planets only)**: Added mean anomaly (M) basis functions (BR–CA) for Mercury, Venus, Mars. These capture the unmodeled EoC residual — the difference between the model's partial `eocFraction` and the full Kepler equation. Mercury (e=0.206, 47% unmodeled) gained 45% improvement. M is computed dynamically from the EoC animation, not a static formula. Outer planets excluded because their slow M cycles (17–133 in 400yr) cause collinearity with existing slow-varying terms.

### Fitting Method

Coefficients are determined by **linear least squares** against JPL Horizons reference data (after IAU 1976 precession correction from J2000 to of-date frame).

The sin/cos decomposition eliminates phase parameters — `amplitude·sin(u − φ)/d` becomes `(a·sin(u) + b·cos(u))/d` — making fitting fully deterministic. No grid search, no local minima. The normal equations are solved by Gaussian elimination with partial pivoting.

---

## 3. Per-Planet Tier Selection

Not all planets benefit from all terms. Each planet uses the tier with the lowest 10-fold cross-validation error. Inner planets (Mercury, Venus, Mars) can use up to 78 terms including mean anomaly; outer planets use up to 68:

| Planet | n pts | Tier | RMS Tot | Notes |
|--------|-------|------|---------|-------|
| Mercury | ~15k | 78p (A–CA) | 0.106° | Mean anomaly terms, 1600–2400 |
| Venus | ~19k | 78p (A–CA) | 0.058° | 1600–2400 |
| Mars | ~16k | 78p (A–CA) | 0.217° | Mean anomaly terms, 1600–2400 |
| Jupiter | ~13k | 68p (A–BQ) | 0.068° | No M terms (too few cycles) |
| Saturn | ~10k | 68p (A–BQ) | 0.090° | No M terms (too few cycles) |
| Uranus | ~15k | 68p (A–BQ) | 0.052° | No M terms (too few cycles) |
| Neptune | ~15k | 68p (A–BQ) | 0.010° | No M terms (too few cycles) |

Absent coefficients evaluate to zero via `(dc.X || 0)` fallback in the formula.

---

## 4. Overfitting Protection

**LOOCV / k-fold CV**: For each candidate tier (15p, 18p, 24p, 30p, 36p, 42p), every data point is held out once (LOOCV for small datasets) or 10-fold CV is used (for enriched datasets with 2000+ points). The tier with lowest CV error wins.

**Multicollinearity rejection**: Outer planets develop huge coefficients (millions) for 1/s² and 1/(d²·s) terms because at large heliocentric distances these become nearly collinear with simpler terms. These tiers are rejected even when CV appears slightly better, as the coefficients are numerically unstable for extrapolation beyond the training range.

**Data ratio**: At 42 params (84 coefficients for RA+Dec), a planet needs substantial data for reliable fitting. Uranus (41 pts) is restricted to 24p. Enriched planets (Venus with 3800+ pts, Jupiter/Saturn with 2400+ pts) can support higher tiers where cross-validation confirms benefit.

---

## 5. Accuracy

### Current Baselines

RMS is computed over all training data (1800–2200 primary window + observed pre-1800 anchors).

| Planet | Tier | RMS Tot | Notes |
|--------|------|---------|-------|
| Mercury | 78p | **0.071°** | Mean anomaly terms give 45% improvement |
| Venus | 78p | **0.031°** | |
| Mars | 78p | **0.091°** | Close approach limit (e=0.093) |
| Jupiter | 68p | **0.050°** | |
| Saturn | 68p | **0.063°** | |
| Uranus | 68p | **0.016°** | |
| Neptune | 68p | **0.004°** | |

### Data Sources and Weighting Philosophy

**Reference data** is sourced from two independent ephemeris services, cross-checked to agree within 0.04 arcseconds in overlapping periods:

- **JPL Horizons DE441** (NASA/JPL): Primary source for 1600–2400
- **IMCCE Miriade INPOP19** (OBSPM/CNRS, Paris): Independent source, fills Saturn 1600–1752 gap and extends coverage to 1200–2800

The full dataset contains ~175,000 data points spanning 1200–2800 CE for all 7 planets. However, **only observed and near-J2000 data is used for fitting**. The weighting follows a scientific rationale:

#### Why not fit on all data equally?

Testing revealed that fitting on wider time ranges (1200–2800 or even 1600–2400) with equal weight produces worse results in the reliable 1800–2200 window. The 68–78 parallax basis functions are smooth (sin/cos × polynomial in T) and cannot model 800+ years of orbital evolution without distorting the near-J2000 accuracy. Attempts to add long-period terms (Great Inequality ~883yr, T³) caused numerical instability — these terms are nearly linear over 800 years and become collinear with existing basis functions.

The model is **physically derived** (circular orbits + EoC + precession), not numerological. The parallax correction should model **geocentric viewing geometry**, not compensate for wrong orbital physics. Wider fitting ranges cause the parallax to absorb model limitations instead of correcting geometry.

#### Why not fit on 1800–2200 only?

Pure 1800–2200 fitting gives the best near-J2000 accuracy but provides no constraint on long-term behavior. The model can drift arbitrarily outside this window, making historical conjunction matching impossible.

#### Current weighting scheme

The solution: **train primarily on 1800–2200, anchored by confirmed historical observations**.

| Data | Weight | Count | Era | Rationale |
|------|--------|-------|-----|-----------|
| JPL/IMCCE computed (1800–2200) | 1.0 | ~44,000 | Primary training | Most reliable era, dense coverage |
| Mercury transits (observed) | 3.0 | 23 | 1632–1799 | NASA GSFC Transit Catalog, confirmed events |
| Venus transits (observed) | 3.0 | 4 | 1640–1769 | Famous transits (Horrocks 1639, etc.) |
| Jupiter-Saturn conjunctions | 3.0 | 8 | 1604–1783 | Telescope-era observations |
| Jupiter-Saturn 1682–83 triple | 5.0 | 6 | 1682–1683 | First telescopically confirmed conjunction |
| Extended JPL/IMCCE (validation) | 0.0 | ~130,000 | 1200–2800 | Reference only, not used in fitting |
| Ancient observations | 0.0 | ~130 | pre-1200 | Reference only |

The 41 pre-1800 anchor points provide ~200 years of leverage outside the training window without distorting the 1800–2200 accuracy (< 0.001° impact). They constrain the model's long-term extrapolation toward physically correct behavior at historically confirmed events.

### Data Tier Structure

| Tier | Description | Example |
|------|-------------|---------|
| 1A | Modern direct observation, < 1 arcsec | Venus transits 2004, 2012 |
| 1B | Telescope-era observation, 1–40 arcsec | Mercury transits 1631–1799, Venus transits |
| 1C | Pre-telescope precision, 1–2 arcmin | Tycho Brahe Mars 1583–1600 |
| 1D | Ancient/medieval, 10–60 arcmin | Jupiter-Saturn conjunctions 1206+ |
| 2A | JPL forward extrapolation (2025–2100) | All planets |
| 2B | JPL computed monthly (1900–2500) | All planets |
| 2C | JPL/IMCCE extended monthly (1200–2800) | All planets (IMCCE fills gaps) |
| 2R | JPL recent high-accuracy (1960–2025) | All planets |
| 3 | Ancient data (visual comparison only) | Back to ~1000 BC |

### Historical Conjunction Validation

The 1682–83 Jupiter-Saturn triple conjunction — the first telescopically observed — serves as the primary long-term validation target. Current model separation: 0.79–0.91° (actual: ~0.08°). The gap represents the accumulated effect of circular orbit approximation over 320 years.

The 2020 Jupiter-Saturn conjunction serves as the near-J2000 reference: model separation 0.61° (actual: 0.10°).

### Remaining Error Sources

1. **Circular orbit approximation**: The dominant error source for Mars (e=0.093) and Mercury (e=0.206). At close approach (<1 AU), the circular orbit places the planet at the wrong ecliptic longitude. The mean anomaly terms capture much of this for Mercury, but Mars is near the physical limit of what a circular model can achieve.

2. **Conjunction accuracy**: Jupiter-Saturn conjunctions show ~0.6–0.9° separation where the actual separation is ~0.1°. This is the sum of both planets' individual position errors at the conjunction date. Improving this requires either elliptical orbits or better long-term orbital mechanics.

3. **Elliptical orbit limitation**: At Mercury transits (inferior conjunction), the circular orbit produces ~0.2° Dec errors at specific dates. The dynamic tilt direction and mean anomaly terms eliminated the systematic Dec drift (-0.30°/century → +0.02°/century) but residual scatter remains at close approach.

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
| `tools/fit/parallax-correction.js` | Fit tiers from 15p to 78p, 10-fold CV selection, output coefficients |
| `tools/explore/archive/search-next-params.js` | Test 30 candidates as next parameter, ranked by LOOCV (superseded by parallax-greedy-select) |
| `tools/fit/parallax-greedy-select.js` | Sequential best-3 selection per planet |

After any change to the geometric model (startpos, EoC, dynamic tilt, holisticyearLength):

```bash
node tools/fit/parallax-correction.js   # refit coefficients
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
| **Dynamic inclination** | Tilt magnitude | Complementary — parallax corrects residual tilt error |
| **Dynamic tilt direction** | Container ascending node | Complementary — uses `calculateDynamicAscendingNodeFromTilts()` in moveModel() |
| **IAU precession** | J2000 → of-date frame | Critical prerequisite for fitting — converts JPL data to model frame |
| **Moon Meeus Ch. 47** | Full RA/Dec override | Same architecture, many more terms (60+60) |

---

## 9. Reference Data

Reference data in `data/reference-data.json` contains two tiers per planet:

- **Tier 2 (weight > 0)**: 41–3812 data points per planet, spanning ~1800–2200 for most planets (Uranus: 2000–2200 only). Sources include JPL Horizons API, NASA Mercury Transit Catalog, and Meeus opposition tables. RA/Dec in J2000 frame — the precession module (`tools/lib/precession.js`) converts to of-date frame before comparison with the model. Venus has been enriched to 3812 points (including IC-dense sampling near 125 inferior conjunctions). Jupiter and Saturn have been enriched to ~2500 points for robust higher-tier fitting.
- **Tier 3 (weight = 0)**: Ancient observation data back to ~1000 BC from ISAW and mutual planetary event catalogs. Available for visual comparison but excluded from RMS calculations and parallax fitting.
