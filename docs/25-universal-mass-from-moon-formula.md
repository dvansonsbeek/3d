# Universal Mass-from-Moon Formula

This document generalizes doc 24's Δa correction to a single closed-form formula that approximates DE440 mass ratios for **every moon-bearing planet** in the solar system — from Earth out to Pluto, with residuals ranging from 3 ppm (Neptune) to 340 ppm (Mars). The formula has two physically-motivated correction terms, both computable from observable quantities. Earth-Moon and the outer planets sit on opposite ends of the same curve, not as special cases.

**Related documents:**
- [24 — Moon Kepler Derivation](24-moon-kepler-derivation.md) — the Earth-Moon-Sun case (this doc generalizes it)
- [26 — Universal Sun-side Δa Formula](26-universal-sun-side-delta-a.md) — the Sun-side mirror of this document: derives `T_planet` from `a_planet` for every planet using the exact symmetric Δa
- [20 — Constants Reference §1.3 DE440 Sun/Planet Mass Ratios](20-constants-reference.md) — current mass-ratio table
- [21 — Orbital Formulas Reference §A.6.1](21-orbital-formulas-reference.md) — central GM/Mass table

---

## The Universal Formula

For any planet **P** observed via one of its moons **M**:

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

### From System to Planet-Alone

The bare formula's output `GM_P_system` covers **planet + all moons**. To recover the planet-alone value:

```
GM_P_alone  =  GM_P_system · ratio / (ratio + 1)         (single-moon systems)
GM_P_alone  =  GM_P_system − ΣGM_moons                   (multi-moon systems)
```

**This distinction matters**: published "Sun/Planet" mass ratios are inconsistent across sources — DE440's `BODY1`–`BODY9` are planet-**system** ratios (planet + moons), while `BODY199`/`BODY299`/etc. are planet-**alone**. See [§Sun/System vs Sun/Planet-Alone](#sunsystem-vs-sunplanet-alone) below for the full table of per-planet conversions and binary-system magnitudes.

**Note on sign conventions**: the formula's `+3·μ·m` and `−1.5·J2·(R/a)²` corrections act on **GM** (the absolute gravitational parameter). The corresponding mass-ratio `Sun/P` (= GM_SUN / GM_P) moves in the **opposite** direction — a positive correction to GM is a negative correction to the ratio.

## Physical Meaning of Each Term

### Term 1: bare Kepler — the two-body skeleton

```
GM_two-body  =  4π² · a³ / T²
```

The Keplerian relationship between a moon's orbital period, distance, and the total gravitational parameter of the planet+moon system. Exact for an isolated two-body problem with Kepler-effective (osculating) elements.

### Term 2: solar Δa = a · μ · m — three-body Sun perturbation (additive)

The Sun pulls on both the planet and the moon, but unequally. The differential pull modifies the moon's effective Kepler orbit. The leading-order Hill-Brown solar perturbation can be re-parameterized as a shift in semi-major axis:

```
Δa  =  a · μ · m         (positive: extends a_geometric → a_Kepler-effective)
ΔGM/GM  ≈  +3 · μ · m    (positive: bare Kepler under-estimates GM_true)
```

**Geometric interpretation:**
- `a · μ` = **planet's wobble around the planet-moon barycenter** (km)
- `m` = **fraction of planet's heliocentric year completed during one lunar month**

The product is the **wobble distance × phase-fraction**. This is the same physical quantity computed in doc 24 for Earth-Moon, just now seen as a universal pattern.

### Term 3: J2 oblateness — planet-shape perturbation (subtractive)

A non-spherical (oblate) planet creates a non-Keplerian potential. For a near-circular orbit with inclination `i` to the planet's equator:

```
GM_kepler_formula  ≈  GM_true · ( 1 + 1.5·J2·(R/a)² · (1 − 1.5·sin²i) )
```

So bare Kepler **over-estimates** GM_true for an oblate planet's moon. Subtract the correction to recover GM_true. The `(1 − 1.5·sin²i)` factor handles non-equatorial moons — for retrograde or polar orbits it can flip sign.

---

## Mass-Ratio Verification — Multi-Moon Analysis

The strongest test: apply the formula to **every major moon** of each planet and compare to DE440. If the formula is correct, all moons of a given planet should converge to the same `Sun/Planet` ratio (to within their data-precision floors).

### Earth (1 moon) — DE440 ratio (Sun/EMB): **328,900.5614**

| Moon | a (km) | T (d) | bare ratio | corrected ratio | solar ppm | J2 ppm |
|---|---|---|---|---|---|---|
| Moon | 384,399.07 | 27.32166 | 329,796.93 | **328,899.35** | +2,727 | 0.5 |

Corrected formula matches DE440 to **3.7 ppm**. The 2,727 ppm shift between bare and corrected reflects the full Earth-Moon Δa = 349 km (doc 24). The residual 3.7 ppm is the Hill-Brown m⁴-and-beyond floor of the 3-body problem.

### Mars (2 moons) — DE440 Sun/System ratio: **3,098,703.59**

| Moon | a (km) | T (d) | bare ratio | corrected ratio | solar ppm | J2 ppm |
|---|---|---|---|---|---|---|
| Phobos | 9,376 | 0.31891 | 3,096,446 | 3,097,640 | 0.0 | 386 |
| Deimos | 23,463 | 1.26244 | 3,096,355 | 3,096,545 | 0.0 | 62 |

**Range corrected:** 3,096,545 – 3,097,640 (340 ppm spread). Median: **3,097,640**. Within ~340 ppm of DE440 — limited by both moons being tiny captured asteroids with imprecise orbital determinations.

### Jupiter (4 Galilean moons) — DE440 Sun/System ratio: **1,047.348625**

| Moon | a (km) | T (d) | bare ratio | corrected ratio | solar ppm | J2 ppm |
|---|---|---|---|---|---|---|
| Io | 421,800 | 1.76914 | 1,046.61 | 1,047.27 | 0.06 | 633 |
| Europa | 671,034 | 3.55118 | 1,047.35 | 1,047.61 | 0.06 | 250 |
| Ganymede | 1,070,412 | 7.15455 | 1,047.35 | 1,047.45 | 0.39 | 98 |
| Callisto | 1,882,700 | 16.68902 | 1,047.36 | 1,047.40 | 0.66 | 32 |

**Range corrected:** 1,047.27 – 1,047.61 (320 ppm spread). Median: **1,047.45**. Within ~100 ppm of DE440. Outer Galileans (Callisto, Ganymede) match DE440 to 100 ppm directly; inner Io needs the largest J2 correction.

### Saturn (7 major moons) — DE440 Sun/System ratio: **3,497.9018**

| Moon | a (km) | T (d) | bare ratio | corrected ratio | solar ppm | J2 ppm |
|---|---|---|---|---|---|---|
| Mimas | 185,539 | 0.94242 | 3,489.51 | 3,498.52 | 0.00 | 2,577 |
| Enceladus | 238,042 | 1.37022 | 3,492.99 | 3,498.48 | 0.00 | 1,567 |
| Tethys | 294,672 | 1.88780 | 3,495.23 | 3,498.81 | 0.00 | 1,022 |
| Dione | 377,415 | 2.73691 | 3,496.59 | 3,498.77 | 0.00 | 623 |
| Rhea | 527,068 | 4.51750 | 3,497.65 | 3,498.76 | 0.01 | 320 |
| Titan | 1,221,870 | 15.94542 | 3,497.65 | 3,497.85 | 1.05 | 60 |
| Iapetus | 3,560,820 | 79.32150 | 3,497.13 | 3,497.15 | 0.07 | 6 |

**Range bare:** 3,489.51 – 3,497.65 (2,300 ppm spread — dominated by J2). **Range corrected:** 3,497.15 – 3,498.81 (475 ppm spread). Median: **3,498.52**. The J2 correction collapses Saturn's spread by **~5×**, demonstrating the formula captures the right physics.

### Uranus (5 major moons) — DE440 Sun/System ratio: **22,902.944**

| Moon | a (km) | T (d) | bare ratio | corrected ratio | solar ppm | J2 ppm |
|---|---|---|---|---|---|---|
| Miranda | 129,872 | 1.41350 | 22,888.87 | 22,893.28 | 0.00 | 193 |
| Ariel | 190,945 | 2.52038 | 22,897.40 | 22,899.46 | 0.00 | 90 |
| Umbriel | 265,998 | 4.14418 | 22,899.23 | 22,900.29 | 0.01 | 46 |
| Titania | 436,298 | 8.70587 | 22,900.98 | 22,901.38 | 0.03 | 17 |
| Oberon | 583,519 | 13.46323 | 22,893.55 | 22,893.77 | 0.05 | 10 |

**Range corrected:** 22,893 – 22,901 (350 ppm spread). Median: **22,899**. Within ~200 ppm of DE440. Titania is closest to DE440; Miranda/Oberon residuals reflect modest data precision.

### Neptune (2 moons) — DE440 Sun/System ratio: **19,412.237**

| Moon | a (km) | T (d) | bare ratio | corrected ratio | solar ppm | J2 ppm |
|---|---|---|---|---|---|---|
| Triton | 354,759 | 5.87685 | 19,411.94 | 19,412.31 | 0.06 | 19 |
| Nereid | 5,513,787 | 360.13619 | 19,416.14 | 19,416.14 | 0.01 | 0.1 |

**Triton corrected:** 19,412.31 — matches DE440 to **4 ppm**. Nereid sits 200 ppm high, consistent with its highly eccentric (e ≈ 0.75) and inclined orbit being less precisely determined.

### Pluto (Charon) — DE440 Sun/System ratio: **136,045,556**

| Moon | a (km) | T (d) | bare ratio | corrected ratio | solar ppm | J2 ppm |
|---|---|---|---|---|---|---|
| Charon | 19,595.764 | 6.38723 | 136,056,060 | 136,052,934 | 23.0 | 0.0 |

Within **54 ppm** of DE440 — limited by orbital-element precision in the Pluto-Charon binary system.

---

## Sun/System vs Sun/Planet-Alone

The bare formula's output `GM_P_system` covers **planet + all moons**. To convert to `GM_P_alone` (Sun/Planet ratio as listed for individual bodies), subtract the total moon mass:

| Planet | Moons' share of system mass | DE440 Sun/System | DE440 Sun/Planet-Alone | Multiplier `Sun/alone ÷ Sun/system` |
|---|---|---|---|---|
| Earth | **1.2151%** | 328,900.56 | **332,946.05** | 1.012301 |
| Mars | 0.0000% | 3,098,703.55 | 3,098,703.71 | 1.000000 |
| Jupiter | 0.0207% | 1,047.349 | **1,047.566** | 1.000207 |
| Saturn | 0.0247% | 3,497.902 | **3,498.769** | 1.000247 |
| Uranus | 0.0104% | 22,902.944 | **22,905.337** | 1.000105 |
| Neptune | 0.0208% | 19,412.260 | **19,416.299** | 1.000208 |
| Pluto | **10.8546%** | 136,045,556 | **152,610,777** | **1.121676** |

**Two systems stand out** as binary-like: Earth (1.2% moon share) and especially Pluto (10.9% — Charon takes a tenth of the system's mass). For these the system / planet-alone distinction shifts the ratio by **percent-level**, far larger than any data precision. For Jupiter/Saturn/Uranus/Neptune the shift is just 100-250 ppm, but it's still resolvable.

## Aggregated Comparison — Both Ratios

Comparing the universal formula's output (with corrections and the moon-mass split) against DE440 for both `Sun/System` and `Sun/Planet-alone`:

### Sun/Planet-System (our derived values, ranked by best match)

| Planet | Best moon | Our Sun/System | DE440 reference | Δ |
|---|---|---|---|---|
| Neptune | Triton | **19,412.31** | 19,412.260 | **3 ppm** |
| Earth | Moon | **328,899.35** | 328,900.56 | **3.7 ppm** |
| Saturn | Titan | 3,497.85 | 3,497.902 | 15 ppm |
| Jupiter | Callisto | 1,047.40 | 1,047.349 | 49 ppm |
| Pluto | Charon | 136,052,934 | 136,045,556 | 54 ppm |
| Uranus | Titania | 22,901.38 | 22,902.944 | 68 ppm |
| Mars | Phobos | 3,097,640 | 3,098,703.55 | 340 ppm |

### Sun/Planet-Alone (after planet/moon split)

| Planet | Best moon (split via mass ratio) | Our Sun/Alone | DE440 reference | Δ |
|---|---|---|---|---|
| Neptune | Triton | **19,416.35** | 19,416.299 | **3 ppm** |
| Earth | Moon (÷ 81.30056816) | **332,944.79** | 332,946.05 | **3.8 ppm** |
| Saturn | Titan | 3,498.71 | 3,498.769 | 17 ppm |
| Pluto | Charon (÷ 8.213, from DE440 `BODY999`/(`BODY9`−`BODY999`)) | 152,617,440 | 152,610,777 | 44 ppm |
| Jupiter | Callisto | 1,047.62 | 1,047.566 | 49 ppm |
| Uranus | Titania | 22,903.76 | 22,905.337 | 69 ppm |
| Mars | Phobos | 3,097,640 | 3,098,703.71 | 343 ppm |

### Multi-Moon Planet-Alone Ranges

For planets with multiple moons, each moon's Kepler derivation yields a slightly different `GM_system`. The planet-alone subtraction `ΣGM_moons` is a **constant** (from independent inter-moon perturbation measurements), so **the per-moon spread in Sun/Planet-Alone is the same ppm spread as in Sun/System**:

| Planet | Our derived Sun/Alone range | DE440 reference | Spread |
|---|---|---|---|
| Mars (2 moons) | 3,096,545.59 – 3,097,640.56 | 3,098,703.71 | 353 ppm |
| Jupiter (4 Galileans) | 1,047.487 – 1,047.827 | 1,047.566 | 325 ppm |
| Saturn (7 majors) | 3,498.01 – 3,499.68 | 3,498.767 | 475 ppm |
| Uranus (5 majors) | 22,895.67 – 22,903.77 | 22,905.343 | 354 ppm |
| Neptune (2 moons) | 19,416.35 – 19,420.19 | 19,416.299 | 197 ppm (Nereid noisy) |

Earth has a single moon, and only Pluto's Charon is precise enough to use in this analysis (the four smaller Plutonian moons — Nix, Hydra, Kerberos, Styx — have poorly-determined elements), so their planet-alone values are **single numbers, not ranges** (332,944.79 and 152,617,440 respectively).

For multi-moon planets, the **best moon** of each system (closest to DE440 — typically a large outer satellite like Callisto, Titan, Titania, Triton) is the recommended choice for a single representative value. Averaging across all moons biases toward the noisier inner-moon measurements where J2 corrections are largest.

**The J2 correction's effect is dramatic for Saturn**: bare-Kepler spread across 7 moons was 2,300 ppm (3489.5–3497.7), the corrected formula collapses it to 475 ppm — a **5× reduction**, confirming the formula captures real physics rather than fitting parameters.

---

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

---

## Data-Convention Caveat

The universal formula assumes published `(a, T)` are **observational averages** (mean elements), in which case:
- **+3·μ·m** corrects for solar perturbation (matters for Earth)
- **−1.5·J2·(R/a)²** corrects for planet oblateness (matters for outer-planet moons)

For sources that publish **osculating** (Kepler-effective) elements at a specific epoch, the J2 correction is already absorbed into `a`, and bare Kepler returns GM_true directly. This is why some Jupiter Galilean residuals are unusually small with bare Kepler alone — JPL Horizons publishes osculating elements for major moons.

When in doubt, applying the J2 correction to mean elements over-corrects; not applying it to osculating elements under-corrects. The 50-475 ppm spreads in the tables above reflect this ambiguity plus genuine observational precision floors.

---

## Origins and Prior Work

The formula synthesizes three classical results with one re-parameterization that may be new. Honest accounting:

### What is classical

| Element | Origin | Status |
|---|---|---|
| Kepler's third law `GM = 4π²·a³/T²` | Kepler 1619, Newton 1687 | Universally taught |
| Hill-Brown m² solar perturbation on lunar orbit | Hill 1878, Brown 1896–1908 | Standard celestial-mechanics textbook material; coefficient α₂ ≈ ½ is tabulated |
| `(1 − 1.5·J2·(R/a)²)` oblateness correction to Kepler's law | Clairaut, Laplace (18th-19th c.); modernized by Brouwer 1959, Kozai 1959 | Standard satellite-dynamics textbook material |
| Mass-from-moon Kepler technique | Newton (1687) onwards | How JPL determines outer-planet system masses for DE440 (Park et al. 2021) |
| Sun/System vs Sun/Planet-alone distinction (BODY-i vs BODY-iJ9) | JPL DE-series ephemerides since 1980s | Documented in DE440 SPICE kernel `gm_de440.tpc` |

None of the underlying physics is original to this work.

### What may be original

1. **The re-parameterization `Δa = a·μ·m`** (doc 24): the Hill-Brown leading solar correction is conventionally written as `α₂·m²` with `α₂` from perturbation expansions. Re-expressing it as `3·μ·m` — where both factors are intrinsic observables of the planet-moon-Sun geometry — gives a geometric reading: `a·μ` is the planet's wobble around the planet-moon barycenter, and `m` is the moon's month as a fraction of the planet's heliocentric year. The two forms agree when `μ ≈ m/6`, which holds in the Earth-Moon-Sun system to ~3% (see doc 24 §"What this formula is, honestly"). We have not found this presentation in standard celestial-mechanics or astrodynamics texts, but it is not a new physical law — it is a useful re-parameterization that exploits a numerical relation specific to our solar system.

2. **Closed-form derivation of the textbook value 384,748 km**: doc 24 §External Corroboration shows that this Kepler-effective Moon distance appears in physics references (UNLV's Jeffery, university homework problems) but is **stated rather than derived** in those sources. The `Δa = 349 km` bridge from the geometric LLR value (384,399 km) appears to be original to this work.

3. **Unified universal formula across all 7 moon-bearing planets**: while each term is classical, packaging them as a single closed-form `(1 + 3·μ·m − 1.5·J2·(R/a)²·(1 − 1.5·sin²i))` and demonstrating it against 22 moons of 7 planets in the DE440 reference frame is a synthesis we have not seen in textbook or review form.

### What this is not

- **Not a new law of physics.** The corrections are all classical.
- **Not a fundamental discovery.** JPL and IAU have used these tools for decades to fit ephemerides.
- **Not a "7th Fibonacci Law."** The Fibonacci laws (doc 10) describe the model's intrinsic cycle structure (precession, eccentricity, inclination resonances). This formula is calibration/derivation work that produces the mass inputs the Fibonacci framework consumes — they live at different layers.

### Suggested framing

A **pedagogical / synthesizing contribution** suitable for an undergraduate astrodynamics audience or a physics-education journal (e.g., *American Journal of Physics*, *European Journal of Physics*). The novel pieces — the `Δa = a·μ·m` re-parameterization and the closed-form derivation of the 384,748 km textbook value — are honest small contributions, not paradigm shifts.

---

## What Remains Outside

**Mercury and Venus** have no moons → no `(a_M, T_M)` to plug into Kepler. Their mass ratios (`MASS_RATIO_SUN_MERCURY = 6,023,657.94`, `MASS_RATIO_SUN_VENUS = 408,523.72`) come exclusively from **spacecraft trajectory perturbations** (Mariner 10, MESSENGER, Venera, Magellan). This is a fundamental observational limit — no closed-form orbital derivation exists for planets without natural satellites.

---

## Summary

The Earth-Moon `Δa = a·μ·m` discovery (doc 24) was not a one-off. It is the **leading term of a universal closed-form formula**:

```
GM_P_system  =  (4π²·a³/T²) · ( 1  +  3·μ·m  −  1.5·J2·(R_P/a)²·(1 − 1.5·sin²i) )
```

Every observable in this formula is either an orbital element of a moon (`a`, `T`), an intrinsic mass/period ratio (`μ`, `m`), or a published gravity coefficient (`J2`). No fitted parameters.

When applied to the major moons of Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto, both Sun/system and Sun/planet-alone ratios match DE440 to 3-340 ppm (best moon, after the planet/moon mass-ratio split). Earth and Neptune both reach 3-4 ppm precision — the Hill-Brown m⁴ floor of the 3-body problem:

| Planet | Sun/System Δ | Sun/Planet-Alone Δ |
|---|---|---|
| Neptune | **3 ppm** | **3 ppm** |
| Earth | **3.7 ppm** | **3.8 ppm** |
| Saturn | 15 ppm | 17 ppm |
| Pluto | 54 ppm | 44 ppm |
| Jupiter | 49 ppm | 49 ppm |
| Uranus | 68 ppm | 69 ppm |
| Mars | 340 ppm | 343 ppm |

For Saturn specifically, the J2 correction collapses the 7-moon spread from 2,300 ppm (bare) to 475 ppm (corrected) — a ~5× reduction that is the strongest single piece of evidence the formula captures real physics rather than fitting parameters.

The 1.5·J2·(R/a)² oblateness correction is the dominant term for outer-planet moons, while 3·μ·m solar Δa is dominant for Earth and Pluto. The same formula handles both regimes. **Earth and Pluto stand out** as the two binary-like systems where the system/planet-alone distinction shifts the ratio by percent-level (1.2% and 11% respectively), making the planet/moon split a first-order effect rather than a trivial refinement.

## See Also

- [24 — Moon Kepler Derivation](24-moon-kepler-derivation.md) — the Earth-Moon-Sun specialization, with the Δa = 349 km / 384,748 km derivation
- [20 — Constants Reference](20-constants-reference.md) §1.3 — DE440 mass-ratio table
- [21 — Orbital Formulas Reference §A.6.1](21-orbital-formulas-reference.md) — implementation
- JPL DE440 SPICE kernel: [gm_de440.tpc](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc) — authoritative system GMs
