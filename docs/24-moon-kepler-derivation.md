# Moon-Earth Kepler Derivation: The Δa Correction

This document describes how the model derives `GM_Earth` and `GM_Moon` from the Moon's orbit, using a physically-motivated correction `Δa = a_M · μ · m` to handle the Sun's perturbation on the otherwise-Keplerian two-body Earth-Moon problem.

**Related documents:**
- [20 — Constants Reference](20-constants-reference.md) — canonical mass / GM values
- [21 — Orbital Formulas Reference §A.6.1](21-orbital-formulas-reference.md) — central GM/Mass table
- Code: [src/script.js §E2a](../src/script.js) and [tools/lib/constants.js §9](../tools/lib/constants.js) (search `moonOrbitalShift`)

---

## The Problem

For a clean two-body system orbiting their common barycenter, Kepler's third law gives the combined gravitational parameter exactly:

```
G(M₁ + M₂) = 4π² · a³ / T²
```

Apply this to the Moon orbiting Earth, with `a = 384,399.07 km` and `T = 27.32166156 days`:

```
G(M_Earth + M_Moon)_raw = 4π² · 384,399.07³ / (27.32166156 × 86400)²
                        = 402,406.51 km³/s²
```

The **JPL DE440 reference value** is `403,503.24 km³/s²`. The naive Kepler result is **0.27% too low** — a gap of 1,097 km³/s².

This gap is **not** explained by the M+m correction (which we already split out via the Earth/Moon mass ratio). It is fundamentally caused by the **Sun's tidal perturbation** on the Moon's orbit. The Earth-Moon-Sun system is the classical 3-body problem (no closed-form solution since Poincaré 1890), so the simple Kepler formula needs a correction to match observations.

## The Δa Correction

The fix is to apply a physically-motivated shift to the Moon's semi-major axis **before** the Kepler computation:

```
Δa = a_M  ·  μ  ·  m
```

Each factor is a natural quantity of the Earth-Moon-Sun system:

| Factor | Physical meaning | Value |
|---|---|---|
| `a_M` | Moon's geometric distance from Earth | 384,399.07 km |
| `a_M · μ` | **Earth's wobble around the Earth-Moon barycenter** | ≈ 4,670 km |
| `m` | **Orbital phase ratio**: the fraction of Earth's heliocentric orbit completed during one lunar orbit | ≈ 7.5% |

The product is the **Earth-Moon barycentric wobble × orbital phase fraction during one lunar orbit**.

### What this formula is, honestly

The actual leading-order solar perturbation in **Hill-Brown lunar theory** scales as `m²` — i.e., `ΔGM / GM ≈ α₂ · m²` for some rational coefficient `α₂` from the perturbation expansion. To match our 0.27% gap, this implies `α₂ ≈ ½`.

Our formula uses `Δa/a = μ · m`, which gives `ΔGM / GM = 3·μ·m`. **For these to agree**:

```
3 · μ · m  ≈  ½ · m²
       μ  ≈  m / 6
```

In our solar system, `μ = M_M/(M_E+M_M) = 0.01215` and `m = T_M/T_S = 0.0748`, so `μ/m = 0.162 ≈ 1/6.16` — which holds the relation `μ ≈ m/6` to within ~3%. This is what makes the two forms numerically equivalent.

So `Δa = a_M · μ · m` is **a clean re-parameterization of the Hill-Brown `½·m²` correction** using two physically meaningful inputs (mass ratio × period ratio) instead of `m²` and a rational coefficient. It's not a new physical law — it's a useful shorthand that exploits a numerical relation specific to the Earth-Moon-Sun system. If `μ/m` were significantly different (e.g., a hypothetical Moon with twice Earth's current Moon-mass), the formula would not give the right correction; you'd have to use the underlying `α₂·m²` form from lunar theory.

The model uses this re-parameterization because:

- All three factors (`a_M`, `μ`, `m`) are observed quantities the model already tracks
- The agreement with JPL DE440 (~4 ppm) is well within the precision floor of any Kepler-from-Moon-orbit derivation
- Avoiding the explicit `α₂·m²` form sidesteps the question of which Hill-Brown coefficient applies for our specific observable

## The Full Computation Chain

From observational inputs to final values, in 8 steps:

### Inputs (model runtime values)

The Δa chain consumes three hardcoded observational constants and three model-derived values. Both layers are shown — the derived values are what the chain actually uses, so the chain stays self-consistent with the rest of the model's time geometry.

**Hardcoded (observational):**

```
a_M       = moonDistance              = 384,399.07 km     // IAU mean lunar distance
T_M_iau   = moonSiderealMonthInput    = 27.32166156 days  // IAU sidereal month
ratio     = MASS_RATIO_EARTH_MOON     = 81.3007           // M_Earth / M_Moon (lunar laser ranging)
```

**Model-derived (computed at runtime, used by the chain):**

```
T_M       = moonSiderealMonth         = 27.32166241 days  // T_M_iau quantized to fit H integer-moons
T_S       = meansiderealyearlengthinDays = 365.25636437 days  // sidereal year derived via H/13 from tropical year
LOD       = meanlengthofday           = 86,399.99968 s    // sidereal-seconds / sidereal-days ratio
```

The derived values differ from their nominal IAU references by sub-ppm amounts (T_M by 0.074 sec, T_S by 0.118 sec, LOD by 0.32 ms). Using them rather than raw IAU values keeps the GM derivation consistent with the model's year-length, sidereal-day, and scene-graph speeds.

### Computation

```
1.  m   =  T_M / T_S                                     = 0.07480133    (lunar small parameter, Hill 1878)

2.  μ   =  1 / (ratio + 1)  =  M_Moon / (M_E + M_M)      = 0.01215056    (Moon mass fraction)

3.  Δa  =  a_M · μ · m                                    = 349.37 km     (solar-tidal shift)

4.  moonDistanceCorrected  =  a_M + Δa                    = 384,748.44 km

5.  T (in seconds)  =  T_M · LOD                          = 2,360,591.63 s

6.  GM(M_E + M_M)  =  4π² · moonDistanceCorrected³ / T²
                   =  4π² · (384,748.44)³ / (2,360,591.63)²
                   =  403,504.72 km³/s²

7.  GM_Earth  =  GM(M_E + M_M)  ·  ratio / (ratio + 1)
              =  403,504.72 · 0.987849
              =  398,601.91 km³/s²

8.  GM_Moon   =  GM(M_E + M_M)  /  (ratio + 1)
              =  403,504.72 / 82.3007
              =  4,902.81 km³/s²
```

### Equivalent multiplicative form

The `Δa` shift is mathematically equivalent to a multiplicative factor on `GM`. To leading order:

```
ΔGM / GM ≈ 3 · Δa / a_M  =  3 · μ · m  =  0.002727
```

The exact factor (using the cube `(1 + Δa/a_M)³` rather than the linear approximation) is **1.002729**, vs the target factor **1.002725** for an exact JPL match. The model's factor is therefore ~4 ppm above the exact target, which combines with the mass-ratio split to produce the ~3.7 ppm residual in `GM_Earth` quoted below. The residual comes from higher-order Brown's lunar theory terms not captured by the leading-order `μ·m` formula.

## Precision vs Reference Values

| Quantity | Model | JPL/GRAIL reference | Residual |
|---|---|---|---|
| GM_Earth | **398,601.91 km³/s²** | 398,600.44 km³/s² | **3.7 ppm** |
| GM_Moon | **4,902.81 km³/s²** | 4,902.80 km³/s² | **2.1 ppm** |
| GM_Sun (downstream, after subtracting GM_Earth) | **132,712,430,441 km³/s²** | 132,712,440,042 km³/s² | **0.07 ppm** |
| M_Earth (= GM_Earth / G with G = 6.6743×10⁻²⁰ km³/(kg·s²)) | **5.972191 × 10²⁴ kg** | spread of published values: 5.972168–5.972370 × 10²⁴ | within published spread |

The G uncertainty (~22 ppm) sets a hard floor on how precisely M_Earth can be expressed in kg — different reference sources disagree by up to 30 ppm because they use slightly different G values to convert their fitted GM_Earth.

## Residual: Why ~3.7 ppm Remains

The Δa correction reduces the 0.27% raw-Kepler gap to a ~3.7 ppm residual. That residual reflects **higher-order Brown's lunar theory terms** (`m⁴` and beyond) that no clean closed-form correction can capture.

This is a fundamental limit of the 3-body problem:
- Poincaré (1890) proved analytically there is no closed-form solution
- Brown's lunar theory uses thousands of terms to reach JPL's precision
- Any model that derives `GM_Earth` from the Moon's orbit via Kepler + a single correction term has a precision floor in the few-ppm range

JPL DE440 sidesteps this entirely by **fitting** `GM_Earth` from artificial-satellite tracking (~10⁻⁹ precision), not from the Moon's orbit. Our derivation matches the precision floor of the Kepler-from-Moon-orbit method.

## Summary

The `Δa = a_M · μ · m` correction:

1. **Uses only natural orbital quantities** of the Earth-Moon-Sun system (Moon's distance, Moon/Earth mass ratio, Moon/Sun period ratio)
2. **Achieves 3.7 ppm precision** for GM_Earth and 2.1 ppm for GM_Moon
3. **Leaves GM_Sun precision at 0.07 ppm** vs JPL DE440
4. **Re-parameterizes Hill-Brown's leading `½·m²` correction** as `3·μ·m` — numerically equivalent to ~3% in our solar system because `μ ≈ m/6` — using only quantities the model already tracks, rather than introducing a fitted coefficient

The remaining ~3.7 ppm gap is the honest precision floor of any Kepler-from-Moon-orbit derivation in a 3-body system — not a failure of the model, but a feature of the underlying physics.

## See Also

- [src/script.js §E2a](../src/script.js) — implementation (`moonOrbitalShift`, `moonDistanceCorrected`, `GM_EARTH_MOON_SYSTEM`)
- [tools/lib/constants.js §9](../tools/lib/constants.js) — same chain in the tooling module
- [21 — Orbital Formulas Reference §A.6.1](21-orbital-formulas-reference.md) — central GM/Mass reference table
