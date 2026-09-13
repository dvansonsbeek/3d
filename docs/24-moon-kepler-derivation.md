---
docVersion: 1.0
modelVersion: v13.0
coefficients: sha256:9e0460662933228f
status: current
---

# The Δa Mass Derivation

The model derives its gravitational parameters from Kepler's third law plus
one physically-motivated correction, `Δa`. This document is that chain in
three parts, one thread: the Earth–Moon case (Part I — how `GM_Earth` and
`GM_Moon` come out of the Moon's orbit to ~4 ppm), its generalization to
every moon-bearing planet (Part II — one closed-form formula, verified
against 22 moons of 7 planets), and the exact Sun-side mirror (Part III —
the symmetric Δa identity that connects the elaborate and simple two-body
period formulas, and its reading as one-third of each planet's pull on the
Sun).

**Related documents:**
- [20 — Constants Reference](20-constants-reference.md) — canonical mass / GM values
- [21 — Orbital Formulas Reference §A.6.1](21-orbital-formulas-reference.md) — central GM/Mass table
- Code: [src/script.js §E2a](../src/script.js) and [tools/lib/constants.js §9](../tools/lib/constants.js) (search `moonOrbitalShift`); [src/script.js §E2 / OrbitalFormulas.keplerPeriod](../src/script.js)

> *Scope: the derivations use J2000-anchored inputs (Moon distance, sidereal
> month, sidereal year, LOD) to reproduce the modern-era JPL DE440 reference
> GMs. The same Δa machinery applies at any epoch when the inputs are taken
> from the corresponding epoch-dependent helpers; see
> [Doc 99 — ESSRT](99-expanding-solar-system-resonance-theory.md) for the
> deep-time Moon-distance evolution (Farhat 2022 polynomial) and
> [Doc 20 § "ESSRT epoch dependence"](20-constants-reference.md#essrt-epoch-dependence--most-tabulated-values-are-j2000-anchored)
> for the J2000-constant → helper map.*

---

# Part I — Earth–Moon: the Δa correction

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

This gap is **not** explained by the M+m correction (which is already split out via the Earth/Moon mass ratio). It is caused by the **Sun's tidal perturbation** on the Moon's orbit. The Earth-Moon-Sun system is the classical 3-body problem (no closed-form solution since Poincaré 1890), so the simple Kepler formula needs a correction to match observations.

## The Δa Correction

The fix is a physically-motivated shift to the Moon's semi-major axis **before** the Kepler computation:

```
Δa = a_M  ·  μ  ·  m
```

Each factor is a natural quantity of the Earth-Moon-Sun system:

| Factor | Physical meaning | Value |
|---|---|---|
| `a_M` | Moon's geometric distance from Earth | <!--v:moonOrbitalRadius-->384,399.07<!--/v--> km |
| `a_M · μ` | **Earth's wobble around the Earth-Moon barycenter** | ≈ 4,670 km |
| `m` | **Orbital phase ratio**: the fraction of Earth's heliocentric orbit completed during one lunar orbit | ≈ 7.5% |

The product is the **Earth-Moon barycentric wobble × orbital phase fraction during one lunar orbit**.

### What this formula is, honestly

The actual leading-order solar perturbation in **Hill-Brown lunar theory** scales as `m²` — i.e., `ΔGM / GM ≈ α₂ · m²` for some rational coefficient `α₂` from the perturbation expansion. To match the 0.27% gap, this implies `α₂ ≈ ½`.

The model's formula uses `Δa/a = μ · m`, which gives `ΔGM / GM = 3·μ·m`. **For these to agree**:

```
3 · μ · m  ≈  ½ · m²
       μ  ≈  m / 6
```

In our solar system, `μ = M_M/(M_E+M_M) = 0.01215` and `m = T_M/T_S = 0.0748`, so `μ/m = 0.162 ≈ 1/6.16` — which holds the relation `μ ≈ m/6` to within ~3%. This is what makes the two forms numerically equivalent.

So `Δa = a_M · μ · m` is **a clean re-parameterization of the Hill-Brown `½·m²` correction** using two physically meaningful inputs (mass ratio × period ratio) instead of `m²` and a rational coefficient. It is not a new physical law — it is a useful shorthand that exploits a numerical relation specific to the Earth-Moon-Sun system. If `μ/m` were significantly different (e.g., a hypothetical Moon with twice the current Moon-mass), the formula would not give the right correction; the underlying `α₂·m²` form from lunar theory would be needed.

The model uses this re-parameterization because:

- All three factors (`a_M`, `μ`, `m`) are observed quantities the model already tracks
- The agreement with JPL DE440 (~4 ppm) is well within the precision floor of any Kepler-from-Moon-orbit derivation
- Avoiding the explicit `α₂·m²` form sidesteps the question of which Hill-Brown coefficient applies for our specific observable

## The Full Computation Chain

From observational inputs to final values, in 8 steps.

### Inputs (model runtime values)

The Δa chain consumes three hardcoded observational constants and three model-derived values. Both layers are shown — the derived values are what the chain actually uses, so the chain stays self-consistent with the rest of the model's time geometry.

**Hardcoded (observational):**

```
a_M       = moonDistance              = 384,399.07 km     // IAU mean lunar distance
T_M_iau   = moonSiderealMonthInput    = 27.32166156 days  // IAU sidereal month
ratio     = MASS_RATIO_EARTH_MOON     = 81.30056816      // M_Earth / M_Moon (DE440 SPICE kernel)
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

2.  μ   =  1 / (ratio + 1)  =  M_Moon / (M_E + M_M)      = 0.01215058    (Moon mass fraction)

3.  Δa  =  a_M · μ · m                                    = 349.37 km     (solar-tidal shift)

4.  moonDistanceCorrected  =  a_M + Δa                    = 384,748.44 km

5.  T (in seconds)  =  T_M · LOD                          = 2,360,591.63 s

6.  GM(M_E + M_M)  =  4π² · moonDistanceCorrected³ / T²
                   =  4π² · (384,748.44)³ / (2,360,591.63)²
                   =  403,504.73 km³/s²

7.  GM_Earth  =  GM(M_E + M_M)  ·  ratio / (ratio + 1)
              =  403,504.73 · 0.987849
              =  398,601.91 km³/s²

8.  GM_Moon   =  GM(M_E + M_M)  /  (ratio + 1)
              =  403,504.73 / 82.30056816
              =  4,902.82 km³/s²
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
| GM_Moon | **4,902.82 km³/s²** | 4,902.80 km³/s² | **3.7 ppm** |
| GM_Sun (downstream, after subtracting GM_Earth) | **132,712,430,441 km³/s²** | 132,712,440,042 km³/s² | **0.07 ppm** |
| M_Earth (= GM_Earth / G with G = 6.6743×10⁻²⁰ km³/(kg·s²)) | **5.972191 × 10²⁴ kg** | spread of published values: 5.972168–5.972370 × 10²⁴ | within published spread |

The G uncertainty (~22 ppm) sets a hard floor on how precisely M_Earth can be expressed in kg — different reference sources disagree by up to 30 ppm because they use slightly different G values to convert their fitted GM_Earth.

## External Corroboration of the 384,748 km Value

The corrected Moon distance produced by `Δa` — `moonDistanceCorrected ≈ 384,748 km` — is not a fitted target. **It is an established physics-textbook value**: University of Nevada Las Vegas astrophysics reference pages list it directly as a constant (*"Moon mean orbital radius R_Mo = 384,748 km"* — [moon facts](https://www.physics.unlv.edu/~jeffery/astro/moon/moon_facts.html)), and university physics textbooks pair `T = 27.321661 days` with `r = 384,748 km` in Kepler's-law problems.

Wikipedia's [Lunar Distance](https://en.wikipedia.org/wiki/Lunar_distance) article catalogs four distinct mean-distance definitions — LLR/Brown's harmonic-mean parallax (384,399 km), time-averaged center-to-center (385,000.6 km), mean osculating ellipse (383,397 km) — none of which is 384,748 km. That value is the **Kepler-effective semi-major axis**: what Kepler's third law *requires* in order to recover the JPL DE440 combined parameter from the IAU sidereal month:

```
a_Kepler  =  ( GM_EM · T² / (4π²) )^(1/3)  =  384,748 km
```

This is the value [Wikipedia's Lunar Theory](https://en.wikipedia.org/wiki/Lunar_theory) article alludes to when noting that *"following a line of thought put forth by Horrocks and Hill, one can detach one of the most pronounced perturbations of the Sun and amalgamate its effect with the motion of the Kepler ellipse"* — but published references state the value rather than derive it. The `Δa = a_M · μ · m` formula provides the closed-form bridge:

```
geometric a_M  (LLR / Brown's parallax)        =  384,399 km
+  Δa  =  a_M · μ · m                          =     349 km
=  Kepler-effective semi-major axis            =  384,748 km
```

The formula uses no fitted coefficient, and its inputs are the same orbital quantities that drive the rest of the model.

## Residual: Why ~3.7 ppm Remains

The Δa correction reduces the 0.27% raw-Kepler gap to a ~3.7 ppm residual. That residual reflects **higher-order Brown's lunar theory terms** (`m⁴` and beyond) that no clean closed-form correction can capture.

This is a fundamental limit of the 3-body problem:
- Poincaré (1890) proved analytically there is no closed-form solution
- Brown's lunar theory uses thousands of terms to reach JPL's precision
- Any model that derives `GM_Earth` from the Moon's orbit via Kepler + a single correction term has a precision floor in the few-ppm range

JPL DE440 sidesteps this entirely by **fitting** `GM_Earth` from artificial-satellite tracking (~10⁻⁹ precision), not from the Moon's orbit. The model's derivation matches the precision floor of the Kepler-from-Moon-orbit method.

---

# Part II — The Universal Mass-from-Moon Formula

The Earth-Moon Δa is the leading term of a single closed-form formula that approximates DE440 mass ratios for **every moon-bearing planet** — from Earth out to Pluto, with residuals ranging from 3 ppm (Neptune) to 340 ppm (Mars). For any planet **P** observed via one of its moons **M**:

```
GM_P_system  =  ( 4π² · a_M³ / T_M² )  ·  ( 1  +  3·μ·m  −  1.5·J2·(R_P/a_M)² · (1 − 1.5·sin²i) )
                └────────┬────────┘     └──────┬─────┘   └────────────────┬──────────────────┘
                  bare Kepler          solar Δa term         planet-oblateness J2 term
                                       (additive)              (subtractive)
```

where:

| Symbol | Meaning |
|---|---|
| `a_M`, `T_M` | Moon's semi-major axis and orbital period (sidereal) |
| `μ = M_M / (M_P + M_M)` | Moon's mass fraction in the planet-moon system |
| `m = T_M / T_P_around_Sun` | Moon's orbital period as fraction of planet's heliocentric year |
| `J2` | Planet's second zonal gravity coefficient (oblateness, from gravity-field maps) |
| `R_P` | Planet's equatorial radius |
| `i` | Moon's inclination relative to planet's equator |
| `ratio = M_P / M_M` | Planet/moon mass ratio (e.g., from laser ranging or moon-pair perturbations) |

**Term 1 (bare Kepler)** is the two-body skeleton — exact for an isolated pair. **Term 2 (solar Δa)** is Part I's correction seen as a universal pattern: `a·μ` is the planet's wobble around the planet-moon barycenter, `m` the phase-fraction of its heliocentric year per lunar month, and `ΔGM/GM ≈ +3·μ·m` (bare Kepler under-estimates GM). **Term 3 (J2 oblateness)** corrects for the planet's non-spherical potential: bare Kepler **over-estimates** GM for an oblate planet's moon, and the `(1 − 1.5·sin²i)` factor handles non-equatorial orbits (it can flip sign for polar/retrograde moons).

### From System to Planet-Alone

The bare formula's output `GM_P_system` covers **planet + all moons**. To recover the planet-alone value:

```
GM_P_alone  =  GM_P_system · ratio / (ratio + 1)         (single-moon systems)
GM_P_alone  =  GM_P_system − ΣGM_moons                   (multi-moon systems)
```

**This distinction matters**: published "Sun/Planet" mass ratios are inconsistent across sources — DE440's `BODY1`–`BODY9` are planet-**system** ratios (planet + moons), while `BODY199`/`BODY299`/etc. are planet-**alone**:

| Planet | Moons' share of system mass | DE440 Sun/System | DE440 Sun/Planet-Alone | Multiplier `Sun/alone ÷ Sun/system` |
|---|---|---|---|---|
| Earth | **1.2151%** | 328,900.56 | **332,946.05** | 1.012301 |
| Mars | 0.0000% | 3,098,703.59 | 3,098,703.75 | 1.000000 |
| Jupiter | 0.0207% | 1,047.349 | **1,047.566** | 1.000207 |
| Saturn | 0.0247% | 3,497.902 | **3,498.769** | 1.000247 |
| Uranus | 0.0104% | <!--v:uranusMassRatioDE440-->22,902.944<!--/v--> | **22,905.337** | 1.000105 |
| Neptune | 0.0208% | 19,412.237 | **19,416.275** | 1.000208 |
| Pluto | **10.8546%** | <!--v:plutoMassRatioDE440-->136,045,556<!--/v--> | **152,610,777** | **1.121676** |

Two systems stand out as binary-like: Earth (1.2% moon share) and especially Pluto (10.9% — Charon takes a tenth of the system's mass). For these the system / planet-alone distinction shifts the ratio by **percent-level**, far larger than any data precision.

**Note on sign conventions**: the formula's `+3·μ·m` and `−1.5·J2·(R/a)²` corrections act on **GM**. The corresponding mass-ratio `Sun/P` (= GM_SUN / GM_P) moves in the **opposite** direction.

## Verification Against DE440

The strongest test: apply the formula to every major moon of each planet — all moons of a given planet should converge to the same `Sun/Planet` ratio to within their data-precision floors. Saturn is the sharpest exemplar, because its inner moons carry J2 corrections up to 2,577 ppm:

### Saturn (7 major moons) — DE440 Sun/System ratio: **<!--v:saturnMassRatioDE440-->3,497.9018<!--/v-->**

| Moon | a (km) | T (d) | bare ratio | corrected ratio | solar ppm | J2 ppm |
|---|---|---|---|---|---|---|
| Mimas | 185,539 | 0.94242 | 3,489.51 | 3,498.52 | 0.00 | 2,577 |
| Enceladus | 238,042 | 1.37022 | 3,492.99 | 3,498.48 | 0.00 | 1,567 |
| Tethys | 294,672 | 1.88780 | 3,495.23 | 3,498.81 | 0.00 | 1,022 |
| Dione | 377,415 | 2.73691 | 3,496.59 | 3,498.77 | 0.00 | 623 |
| Rhea | 527,068 | 4.51750 | 3,497.65 | 3,498.76 | 0.01 | 320 |
| Titan | 1,221,870 | 15.94542 | 3,497.65 | 3,497.85 | 1.05 | 60 |
| Iapetus | 3,560,820 | 79.32150 | 3,497.13 | 3,497.15 | 0.07 | 6 |

**Range bare:** 3,489.51 – 3,497.65 (2,300 ppm spread — dominated by J2). **Range corrected:** 3,497.15 – 3,498.81 (475 ppm). The J2 correction collapses Saturn's 7-moon spread by **~5×** — the strongest single piece of evidence that the formula captures real physics rather than fitting parameters.

### Best moon per planet, both ratios

Each planet's best moon (typically a large outer satellite, where the J2 correction is small and the elements are precise) against DE440:

**Sun/Planet-System:**

| Planet | Best moon | Formula Sun/System | DE440 reference | Δ |
|---|---|---|---|---|
| Neptune | Triton | **19,412.31** | <!--v:neptuneMassRatioDE440-->19,412.237<!--/v--> | **4 ppm** |
| Earth | Moon | **328,899.35** | 328,900.56 | **3.7 ppm** |
| Saturn | Titan | 3,497.85 | 3,497.902 | 15 ppm |
| Jupiter | Callisto | 1,047.40 | 1,047.349 | 49 ppm |
| Pluto | Charon | 136,052,934 | <!--v:plutoMassRatioDE440-->136,045,556<!--/v--> | 54 ppm |
| Uranus | Titania | 22,901.38 | <!--v:uranusMassRatioDE440-->22,902.944<!--/v--> | 68 ppm |
| Mars | Phobos | 3,097,640 | <!--v:marsMassRatioDE440-->3,098,703.59<!--/v--> | 343 ppm |

**Sun/Planet-Alone (after the planet/moon split):**

| Planet | Best moon (split via mass ratio) | Formula Sun/Alone | DE440 reference | Δ |
|---|---|---|---|---|
| Neptune | Triton | **19,416.35** | 19,416.299 | **3 ppm** |
| Earth | Moon (÷ <!--v:massRatioEarthMoon-->81.30056816<!--/v-->) | **332,944.79** | 332,946.05 | **3.8 ppm** |
| Saturn | Titan | 3,498.71 | 3,498.769 | 17 ppm |
| Pluto | Charon (÷ 8.213, from DE440 `BODY999`/(`BODY9`−`BODY999`)) | 152,617,440 | 152,610,777 | 44 ppm |
| Jupiter | Callisto | 1,047.62 | 1,047.566 | 49 ppm |
| Uranus | Titania | 22,903.76 | 22,905.337 | 69 ppm |
| Mars | Phobos | 3,097,640 | 3,098,703.71 | 343 ppm |

Multi-moon spreads (corrected, per planet): Jupiter's four Galileans 325 ppm, Saturn's seven majors 475 ppm, Uranus's five majors ~354 ppm, Neptune's two moons 197 ppm (Nereid noisy — e ≈ 0.75), Mars's two ~353 ppm (both tiny captured asteroids with imprecise orbits). Earth and Pluto have a single usable moon each, so their planet-alone values are single numbers, not ranges. Averaging across all moons biases toward the noisier inner-moon measurements where J2 corrections are largest; the best-moon convention avoids that.

## Why Earth-Moon Has Δa = 349 km but Outer Planets Don't

Both correction terms exist for every system; the only question is which dominates. The solar Δa term scales as `μ·m`, and `m = T_moon / T_planet` shrinks dramatically for outer planets:

| System | μ | m | 3·μ·m (ppm) | 1.5·J2·(R/a)² (ppm) | Dominant |
|---|---|---|---|---|---|
| **Earth-Moon** | 0.01215 | **0.0748** | **2,727** | 0.5 | **solar Δa** |
| Mars-Phobos | ~0 | 0.000464 | ~0 | 386 | J2 |
| Jupiter-Io | 4.7e-5 | 0.000409 | 0.06 | 633 | J2 |
| Saturn-Mimas | 6.6e-8 | 0.0000877 | 0.0 | 2,577 | J2 |
| **Pluto-Charon** | **0.108** | 7.06e-5 | **23** | ~0 | **solar Δa** (binary) |

**The pattern**: Earth is unique in having a sizable `m` (0.075) because it is the innermost moon-bearing planet. Pluto-Charon is the **mirror image**: tiny `m` but huge `μ` (Charon is 11% of Pluto's mass — a true binary). Earth and Pluto sit at **opposite ends of the same curve**, not as special cases.

## Data-Convention Caveat

The universal formula assumes published `(a, T)` are **observational averages** (mean elements). For sources that publish **osculating** (Kepler-effective) elements at a specific epoch, the J2 correction is already absorbed into `a`, and bare Kepler returns GM_true directly — JPL Horizons publishes osculating elements for major moons, which is why some Galilean residuals are unusually small with bare Kepler alone. When in doubt, applying the J2 correction to mean elements over-corrects; not applying it to osculating elements under-corrects. The 50-475 ppm spreads in the tables above reflect this ambiguity plus genuine observational precision floors.

**Mercury and Venus** have no moons → no `(a_M, T_M)` to plug into Kepler. Their mass ratios (`MASS_RATIO_SUN_MERCURY = 6,023,657.94`, `MASS_RATIO_SUN_VENUS = 408,523.72`) come exclusively from **spacecraft trajectory perturbations** (Mariner 10, MESSENGER, Venera, Magellan). This is a fundamental observational limit — no closed-form orbital derivation exists for planets without natural satellites.

## Origins and Prior Work

Every physical ingredient is classical: Kepler's third law (Kepler 1619, Newton 1687), the Hill-Brown m² solar perturbation (Hill 1878, Brown 1896–1908, coefficient α₂ ≈ ½ tabulated), the `(1 − 1.5·J2·(R/a)²)` oblateness correction (Clairaut/Laplace, modernized by Brouwer 1959, Kozai 1959), the mass-from-moon Kepler technique (how JPL determines outer-planet system masses for DE440 — Park et al. 2021), and the Sun/System vs Sun/Planet-alone distinction (documented in the DE440 SPICE kernel `gm_de440.tpc`).

What may be original here, honestly bounded:

1. **The re-parameterization `Δa = a·μ·m`** — the Hill-Brown leading solar correction re-expressed through two intrinsic observables (barycentric wobble × phase-fraction), numerically equivalent to `½·m²` because `μ ≈ m/6` in our solar system. Not found in standard celestial-mechanics texts; not a new physical law.
2. **The closed-form derivation of the textbook 384,748 km value** — published references state it; the `Δa = 349 km` bridge from the geometric LLR value appears to be original.
3. **The unified formula demonstrated across 22 moons of 7 planets** in the DE440 frame — each term is classical; the synthesis and verification sweep is not in textbook or review form we have found.

This is calibration/derivation work — it produces the mass inputs the rest of the model consumes. It is **not** a new law of physics and not part of the model's cycle-structure claims. Suggested framing: a pedagogical/synthesizing contribution (e.g., *American Journal of Physics* class).

---

# Part III — The Universal Sun-side Δa

The Moon-side `Δa = +349 km` has an exact Sun-side counterpart. Kepler's 3rd law on Earth's heliocentric orbit returns the **combined** parameter `GM_Sun_plus_Earth = 4π²·AU³/T_sidereal_year²`; the model recovers `GM_Sun` by subtracting `GM_Earth_alone`. That GM-subtraction is mathematically equivalent to plugging a slightly-shrunk "Kepler-effective AU" into the bare formula:

```
Δa_Sun-side  =  AU × M_Earth/(3·M_Sun)  ≈  149.77 km
a_eff_Sun    =  AU − Δa_Sun-side        ≈  149,597,720.93 km
```

So the two derivations are **symmetric but opposite in sign**:

| Body | Geometric a | Kepler-effective a | Δa | Direction |
|---|---|---|---|---|
| **Moon** (deriving GM_Earth+Moon **system**) | <!--v:moonOrbitalRadius-->384,399.07<!--/v--> km | 384,748.44 km | **+349.37 km** | ADD a moon's contribution |
| **Earth/Sun** (deriving GM_Sun **alone**) | 149,597,870.70 km (1 AU) | 149,597,720.93 km | **−149.77 km** | SUBTRACT Earth's contribution |

In the code, the Sun-side correction is done at the GM level (subtraction), not at the AU level — the km-equivalent is the conceptual reading. The generalization to every planet is exact:

## The Symmetric Δa Identity

For any planet **b** orbiting the Sun:

```
Δa_b  =  a_b  ·  ( 1  −  ( (μ_S + μ_E − μ_b) / (μ_S + μ_E) )^(1/3) )
```

with `μ_S = GM_Sun_alone`, `μ_E = GM_Earth_alone` (the AU-anchor body), `μ_b` the planet's own GM. Plugged into the elaborate two-body period formula, the `(a−Δa)³` numerator exactly cancels the `(μ_S + μ_E − μ_b)` denominator:

```
(a_b − Δa_b)³ =  a_b³ · (μ_S + μ_E − μ_b) / (μ_S + μ_E)

T_b  =  2π · √( (a_b − Δa_b)³ / (μ_S + μ_E − μ_b) )
     =  2π · √( a_b³ / (μ_S + μ_E) )                ← algebraically identical
```

This is an **algebraic identity**, not an approximation — exact to machine precision. The body's own `μ_b` drops out entirely because it appears in both the numerator (via Δa) and the denominator, and they cancel in lockstep.

For Earth specifically, setting `μ_b = μ_E` makes the numerator `μ_S`, recovering **exactly** the asymmetric Part-I form at 149.77 km — the symmetric and asymmetric formulas coincide for the anchor body. They diverge only where `μ_b ≠ μ_E`: sub-kilometer for Mercury–Mars, but ~235 km for Jupiter — which is why only the symmetric form closes the elaborate-form residual to zero for the gas giants. The **simple** `T = 2π·√(a³/(μ_S+μ_E))` form (used in the model) has no residual either way, because it never computes Δa at all.

## Per-Planet Δa Table

Computed with the model's mass-ratio constants and standard semi-major axes:

| Planet | a (AU) | a (km) | μ_b/μ_S | Δa (km) | Δa / a |
|---|---|---|---|---|---|
| Mercury | 0.387098 | 57,909,037 | 1.66×10⁻⁷ | **3.21** | 5.5×10⁻⁸ |
| Venus | 0.723332 | 108,208,927 | 2.45×10⁻⁶ | **88.29** | 8.2×10⁻⁷ |
| Earth | 1.000000 | 149,597,871 | 3.00×10⁻⁶ | **149.77** | 1.0×10⁻⁶ |
| Mars | 1.523679 | 227,939,134 | 3.23×10⁻⁷ | **24.52** | 1.1×10⁻⁷ |
| Jupiter | 5.202600 | 778,297,882 | 9.55×10⁻⁴ | **247,782** | 3.2×10⁻⁴ |
| Saturn | 9.554900 | 1,429,392,695 | 2.86×10⁻⁴ | **136,227** | 9.5×10⁻⁵ |
| Uranus | 19.218400 | 2,875,031,718 | 4.37×10⁻⁵ | **41,844** | 1.5×10⁻⁵ |
| Neptune | 30.110400 | 4,504,451,726 | 5.15×10⁻⁵ | **77,348** | 1.7×10⁻⁵ |
| Pluto | 39.482000 | 5,906,423,131 | 7.35×10⁻⁹ | **14.47** | 2.4×10⁻⁹ |

The Δa scales as `a × μ_b/(3·μ_S)` — the planet's distance times one-third of its own mass-ratio. Jupiter dominates by being both far and heavy.

## Physical Interpretation: Δa = 1/3 × Sun's Barycentric Pull

The Sun's offset from the Solar System Barycenter (SSB) due to a single planet is, by definition of the barycenter, `Δr = a_b·M_b/M_S`, while the leading-order Δa is `a_b·M_b/(3·M_S)`. So **each planet's Δa equals exactly one-third of its contribution to the Sun's barycentric displacement** — the factor 3 is algebraic (differentiating `a³` yields `3·a²`, which propagates to the linear Δa form). The ratio is 3.00 for every planet.

Summing the per-planet barycentric pulls gives the **maximum Sun-SSB excursion** when all planets align:

```
3 · Σ Δa  =  Σ (a_b · M_b / M_Sun)  ≈  1,510,000 km  ≈  2.17 R☉
```

This is a well-known quantity in **solar inertial motion (SIM) studies** — Jose (1965, *Astron. J.* 70:193), Charvátová & Střeštík (1991, *Climatic Change* 19:91-101). The Sun's actual position relative to the SSB sweeps from ~0 (planets scattered) to ~2 R☉ (alignment) on a Jupiter-Saturn-dominated cycle of roughly 178.7 years (the "Jose cycle").

## In-Model Visualization: the Sun-SSB Trajectory Chart

The simulator shows this live: click the **Sun** in the planet selector → **CYCLES** tab → §"Sun-SSB Barycentric Motion". Live readouts (Sun-SSB offset in km and R☉, ecliptic direction, "inside Sun?" flag, dominant planet and its share) plus a 2D SVG chart of the SSB trajectory over ±25 years centered on the current simulated date, color-coded by height above/below the invariable plane (RdBu palette, range ±~16,000 km against the ~1.5M km in-plane motion).

The computation is a **center-of-mass sum, not a gravity simulation**: for each of the eight planets, the Keplerian chain's heliocentric position of date (ecliptic J2000) is projected into the engine's own invariable-plane frame and weighted by its system mass fraction:

```
(x, y, z)_SSB  =  Σ_b  (M_b_SYSTEM / M_Sun) · r⃗_b_chain
```

with `M_b_SYSTEM` the planet+moons DE440 masses and the chart axes fixed to the theoretical maximum excursion above (~2.17 R☉ in-plane). The current-position marker passes inside the Sun's body roughly every 20 years during Jupiter-Saturn cancellation events (e.g., around 1990, 2002, 2017, 2030). Source of truth: `computeSunSSBOffset(year)` and `buildSunSSBChart(currentYear)` in [src/script.js](../src/script.js) — the planet vectors come from the model's own N-body element chain (`@essrt/physics/planets/keplerian-chain`), the same path that renders the planets.

## Practical Use

For period computation, the **simple form is strictly preferable**:

```
T_b  =  2π · √( a_b³ / (μ_S + μ_E) )
```

No Δa, no body-specific term, same denominator for every planet, exact to machine precision. Implementation: [src/script.js §E2 / OrbitalFormulas.keplerPeriod](../src/script.js) uses the simple form with `GM_SUN_PLUS_EARTH` as the canonical denominator; the Δa machinery is documented here as the conceptual lens (it explains the 149.77 / 349 km mirror and makes the body-mass dependence visible).

In spreadsheet notation, with `Q` = planet a (m), `G11` = GM_Sun_alone, `G15` = GM_Earth_alone, `G` = planet GM (m³/s²), `A28` = day length (s), `B29` = `meanSolarYear/meanSiderealYear`:

```excel
Δa:        M = Q * ( 1 - ( (G11 + G15 - G) / (G11 + G15) )^(1/3) )
elaborate: T = ( 2*PI() * SQRT( (Q - M)^3 / (G11 + G15 - G) ) / A28 ) * B29
simple:    T = ( 2*PI() * SQRT( Q^3 / (G11 + G15) ) / A28 ) * B29
```

Both `T` forms produce the same value for every planet: Mercury 87.97 d, Venus 224.69 d, Earth 365.24 d, Mars <!--v:marsOrbitalPeriodInputDays-->686.93<!--/v--> d, Jupiter 4330.54 d, Saturn 10,746.92 d, Uranus 30,587.39 d, Neptune 59,800.74 d.

---

## Summary

**Headline:** the model derives `GM_Earth` and `GM_Moon` to ~4 ppm and `GM_Sun` to 0.07 ppm against JPL DE440, from Kepler's law plus the `Δa = a_M·μ·m` correction — no fitted coefficient. The residuals sit at the precision floor of Kepler-from-Moon-orbit derivations (Hill-Brown m⁴-and-beyond terms), inside the ~22 ppm G-uncertainty that bounds any mass-in-kg statement.

- **Part I**: `Δa = a_M·μ·m` re-parameterizes Hill-Brown's leading `½·m²` solar correction through the barycentric wobble × phase-fraction, deriving the textbook Kepler-effective Moon distance 384,748 km in closed form.
- **Part II**: the same term, plus the classical J2 oblateness correction, gives one universal mass-from-moon formula matching DE440 to 3–340 ppm across 22 moons of 7 planets; for Saturn the J2 term collapses the 7-moon spread ~5×. Earth (large `m`) and Pluto (large `μ`) sit at opposite ends of the same curve.
- **Part III**: the symmetric Sun-side `Δa_b = a_b·(1 − ((μ_S+μ_E−μ_b)/(μ_S+μ_E))^(1/3))` makes the elaborate two-body period formula algebraically identical to the simple `T = 2π·√(a³/(μ_S+μ_E))` — exact, not approximate — and each planet's Δa equals exactly 1/3 of its pull on the Sun; the summed pulls (~2.17 R☉) are the Sun-SSB excursion the simulator charts live from the chain's own positions.

## See Also

- [src/script.js §E2a](../src/script.js) — implementation (`moonOrbitalShift`, `moonDistanceCorrected`, `GM_EARTH_MOON_SYSTEM`); `computeSunSSBOffset` / `buildSunSSBChart` — the Sun-SSB chart
- [tools/lib/constants.js §9](../tools/lib/constants.js) — same Δa chain in the tooling module
- [20 — Constants Reference](20-constants-reference.md) §1.3 — DE440 mass-ratio table
- [21 — Orbital Formulas Reference §A.6.1](21-orbital-formulas-reference.md) — central GM/Mass reference table
- [99 — Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) — deep-time Moon distance evolution (Farhat 2022 polynomial → `meanMoonDistanceMetresAtAge`); the Δa machinery extends to any epoch given epoch-consistent inputs
- JPL DE440 SPICE kernel: [gm_de440.tpc](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc) — authoritative system GMs
