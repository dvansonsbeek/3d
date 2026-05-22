# Doc 19 — Dual-Balance Sensitivity Analysis

> **Scope.** The Holistic-Universe model's eight-planet dual balance closes to 99.997% on Law 3 (inclination) and 99.862% on Law 5 (eccentricity) using phase-derived base eccentricities ([doc 10](10-fibonacci-laws.md)). The remaining 0.14% eccentricity-balance gap is small but real. This document decomposes that gap into per-planet contributions, computes single-parameter sensitivities (Δm/m, Δa/a, Δe/e per planet) that would close it, and shows that the gap cannot be attributed to any single observed planetary parameter being mis-measured — the required shifts are 5–10 orders of magnitude larger than the precision of DE440 masses and JPL orbital periods. The natural interpretation is that the gap reflects the absence of *additional gravitating bodies* (asteroids, Trans-Neptunian Objects, dust) from the balance equations. The analysis is reproducible via [`tools/verify/dual-balance-optimizer.js`](../tools/verify/dual-balance-optimizer.js) which prints all the numbers used here.

---

## 1. Current state of the dual balance

The two relevant Fibonacci laws ([doc 10](10-fibonacci-laws.md#law-3) §Law 3, §Law 5) are:

**Law 3 — inclination balance:** the seven in-phase planets balance Saturn (anti-phase) via the angular-momentum-like weight `w = √(m · a · (1−e²)) / d`.

**Law 5 — eccentricity balance:** the same in-phase/anti-phase split, via the eccentricity-like weight `v = √m · a^(3/2) · e / √d`.

With phase-derived base eccentricities (computed at runtime from the balanced-year phase in [`constants.js`](../tools/lib/constants.js)) and DE440 masses / JPL periods, the current values are:

| Quantity | Value | Signed gap (in-phase − anti-phase) |
|---|---:|---:|
| Inclination balance | 99.997236% | Σw_in − Σw_anti = **−9.6 × 10⁻⁷** |
| Eccentricity balance | 99.861842% | Σv_in − Σv_anti = **−4.27 × 10⁻⁵** |

The eccentricity gap is the larger of the two and is the focus of this analysis. The sign tells us that anti-phase Σv (Saturn alone) **exceeds** in-phase Σv (seven planets summed) — to close the gap, the in-phase side needs additional v, or the anti-phase side needs less.

---

## 2. Per-planet contribution to the gap

The eccentricity-balance weight `v` is dominated by the four giant planets — the inner planets contribute essentially nothing because v scales as a^(3/2):

| Planet | Group | v contribution | % of group |
|---|---|---:|---:|
| **Jupiter** | in-phase | 7.93 × 10⁻³ | **51.4%** |
| **Uranus** | in-phase | 5.70 × 10⁻³ | **37.0%** |
| **Neptune** | in-phase | 1.73 × 10⁻³ | **11.2%** |
| Mars | in-phase | 4.37 × 10⁻⁵ | 0.28% |
| Earth | in-phase | 1.54 × 10⁻⁵ | 0.10% |
| Mercury | in-phase | 4.40 × 10⁻⁶ | 0.03% |
| Venus | in-phase | 1.27 × 10⁻⁶ | 0.01% |
| **Saturn** | anti-phase | 1.547 × 10⁻² | 100% (anti-phase singleton) |

The in-phase eccentricity weight is essentially a 3-body affair: Jupiter (51%) + Uranus (37%) + Neptune (11%) account for 99.6% of the in-phase v-sum. The inner four planets combined contribute 0.4%. Any framework adjustment to close the gap must operate through one of these four outer planets (or through external bodies, §5).

---

## 3. Single-parameter sensitivity table

For each free planet (Earth's parameters are held fixed by the Sun optimizer), the table below shows the percent shift in mass, semi-major axis, or base eccentricity that would close the eccentricity-balance gap to exactly 100% — *holding all other parameters and other planets fixed*.

Derived from the partial derivatives of v with respect to each parameter:
- Δm/m = 2 · Δv/v   (since ∂v/∂m = v/(2m))
- Δa/a = (2/3) · Δv/v   (since ∂v/∂a = (3/2)·v/a)
- Δe/e = Δv/v   (since ∂v/∂e = v/e)

| Planet | Group | Δm/m | Δa/a | Δe/e | Side-effect on incl balance (via e) |
|---|---|---:|---:|---:|---:|
| Mercury | in | +1939% | +646% | +970% | −1.5 × 10⁻² |
| Venus | in | +6712% | +2237% | +3356% | −2.3 × 10⁻⁴ |
| Mars | in | +195% | +65% | +98% | −3.3 × 10⁻³ |
| **Jupiter** | in | **+1.077%** | **+0.359%** | **+0.539%** | **−5.1 × 10⁻⁴** |
| **Saturn** | anti | **−0.552%** | **−0.184%** | **−0.276%** | **−4.0 × 10⁻⁴** |
| **Uranus** | in | **+1.497%** | **+0.499%** | **+0.748%** | **−6.6 × 10⁻⁵** |
| **Neptune** | in | **+4.928%** | **+1.643%** | **+2.464%** | **−6.1 × 10⁻⁶** |

The inner-planet shifts are astronomical (1000%+) because their v contribution is microscopic — they have zero leverage. The four giant planets are the only realistic single-parameter levers.

**Smallest single-parameter shift that closes the gap: Saturn Δa/a = −0.184%** (Saturn's orbital period would need to be 0.184% shorter than 29.46 years).

---

## 4. Why the gap cannot be closed by re-measuring observables

The sensitivity table reads as *predictions* only if the corresponding observable is unknown to better than the shift size. For all three parameters that's emphatically not the case:

| Parameter | Smallest required shift (from table) | Observed precision | Ratio (shift / precision) |
|---|---:|---:|---:|
| Mass `m` | Saturn ±0.552% (0.0055) | DE440: ~1 × 10⁻⁷ fractional | **~5.5 × 10⁴** |
| Semi-major axis `a` | Saturn ±0.184% (0.0018) | JPL ephemeris: ~1 × 10⁻⁹ fractional | **~1.8 × 10⁶** |
| Eccentricity base `e` | Saturn ±0.276% (0.0028) | Framework-derived (not directly observed) | n/a — derived value |

For mass and semi-major axis, the required shift is *five to six orders of magnitude larger* than the precision of the published observable. **There is no reasonable interpretation in which the framework's 0.14% gap could be explained by mis-measurement of Saturn's mass or orbit.**

The eccentricity-base channel is the exception: base eccentricities are not directly observed. They are framework constructs derived from the balanced-year phase via the law of cosines. The "Δe/e = ±0.28%" reading for Saturn therefore says the *phase-derived bases* differ from the *forced-100%-balance bases* by 0.28% on Saturn — a difference of a few parts per thousand in a quantity that is not externally constrained. This is the channel through which a small framework-level refinement could in principle close the gap (see §6).

The implication for mass and `a` is stronger and more interesting: **the gap is not in the planets; it is in what's missing from the eight-planet sum.**

---

## 5. The external-bodies hypothesis

If the framework's dual balance is a real physical property of the solar system, the actual eccentricity balance should close to 100% — but only when *all* gravitating bodies are included. The eight-planet sum we test today is necessarily incomplete: it excludes asteroids, Trans-Neptunian Objects, the Kuiper belt, the inner and outer Oort clouds, and interplanetary dust.

The gap to close is **Δv = 4.27 × 10⁻⁵** (added to the in-phase side, or removed from the anti-phase Saturn side).

### 5.1 Scale check: Ceres-equivalent body

The most massive asteroid, Ceres (m ≈ 4.7 × 10⁻¹⁰ M_sun, a ≈ 2.77 AU, e ≈ 0.076), would contribute approximately:

```
v_Ceres ≈ √(4.7 × 10⁻¹⁰) × 2.77^(3/2) × 0.076 / √d
       ≈ 7.6 × 10⁻⁶ / √d
```

For d = 1 (smallest Fibonacci) this is **7.6 × 10⁻⁶ — about 18% of the gap**. For the standard Fibonacci d-values (d ≥ 3), Ceres alone contributes 4.4 × 10⁻⁶ or less.

### 5.2 Scale check: full asteroid belt

The total mass of the main-belt asteroids is ~3% of Ceres (~1.4 × 10⁻¹¹ M_sun) distributed at roughly the same a. Treating the belt as a single equivalent body:

```
v_belt ≈ √(1.4 × 10⁻¹¹) × 2.7^(3/2) × ⟨e⟩ / √d  ≈ 1.3 × 10⁻⁶ × ⟨e⟩ / √d
```

For ⟨e⟩ ≈ 0.1 and d = 3, that's ~7.5 × 10⁻⁸ — three orders of magnitude below the gap. **The main asteroid belt is too light to close the gap on its own.**

### 5.3 Scale check: Trans-Neptunian Objects

The total mass of the TNO + scattered-disk population is poorly constrained but commonly estimated at ~0.05–0.1 M_⊕ (~1.5 × 10⁻⁷ to 3 × 10⁻⁷ M_sun) — roughly 100× the main belt. At a ≈ 40 AU and ⟨e⟩ ≈ 0.15:

```
v_TNO ≈ √(2 × 10⁻⁷) × 40^(3/2) × 0.15 / √d  ≈ 2.7 × 10⁻⁵ / √d
```

For d = 3, this gives **~1.6 × 10⁻⁵ — about 37% of the gap on its own**. For d = 1, ~63%. **The TNO population is the right order of magnitude to be a significant contributor to closing the gap**, but assigning it to a single Fibonacci d-value is a non-trivial framework extension.

### 5.4 Putting it together

A combined contribution from asteroid belt + TNOs + Centaurs + outer-disk dust could plausibly aggregate to the ~4 × 10⁻⁵ v-units required. The analysis would need to:

1. Estimate the v-contribution of each known minor-body population (belt, Trojans, Centaurs, classical KBOs, scattered disk, plutinos).
2. Decide how each population maps onto a Fibonacci d-value and an in-phase / anti-phase group — the framework currently has no rule for this.
3. Compare the aggregated v against the 4.27 × 10⁻⁵ gap.

This is outside the scope of the current document but is the natural follow-up analysis.

---

## 6. Honest scientific framing

The sensitivity table in §3 should be read as a **diagnostic tool**, not as a list of predictions. Concretely:

- **The Δe/e column** is the channel through which an eventual framework refinement of the phase-derived bases could close the gap. Bases are framework-derived, so small shifts here represent re-fitting within the framework, not contradicting an observable. A 0.3% Saturn-base shift sits at the boundary of what could be absorbed without disturbing other framework predictions.

- **The Δm/m and Δa/a columns** are sensitivity readings. They quantify how *unlikely* it is that the gap is due to mis-measured masses or orbits: the required shifts are 4–6 orders of magnitude larger than DE440 / JPL precision. This is itself an important result — it formally rules out the simplest "the masses are slightly wrong" explanation.

- **The implication** is that if the framework is correct *and* the gap is real (both of which require continued empirical scrutiny), the missing contribution must come from gravitating bodies not currently in the balance sum. Section 5 shows TNO populations are at the right order of magnitude.

---

## 7. What this analysis does *not* claim

To prevent over-interpretation:

1. **It does not claim the solar system "is at 100% balance".** It says: *if* it is, then the 4.27 × 10⁻⁵ residual v in the eight-planet sum should be matched by external bodies. The framework does not yet require 100%.

2. **It does not propose adjustments to DE440 masses or JPL periods.** The sensitivity readings *rule out* such adjustments as the gap source.

3. **It does not assign Fibonacci d-values to asteroid/TNO populations.** That assignment is a separate framework extension which would require its own derivation.

4. **It does not claim the phase-derived bases are wrong.** The Δe/e column is informational — it shows the size of the gap in eccentricity units. The phase-derived approach remains the framework's authoritative source.

---

## 8. Reproducing this analysis

All numbers in this document come from a single script run:

```bash
node tools/verify/dual-balance-optimizer.js
```

The script produces four sections of output:

1. **Current state** — using phase-derived bases from [`constants.js`](../tools/lib/constants.js)
2. **Forced-100%/100% optimizer** — comparison only, shows what bases a forced 100% solution would require
3. **Per-planet contribution gap** (the §2 table here)
4. **Sensitivity table** (the §3 table here)

The full script logic is in [`tools/verify/dual-balance-optimizer.js`](../tools/verify/dual-balance-optimizer.js). It reads canonical values via `tools/lib/constants.js` (the same source the simulation uses) and writes nothing — it is verification-and-diagnostic only.

---

## 9. Related documents

- [doc 10 — Fibonacci Laws of Planetary Motion](10-fibonacci-laws.md) — Laws 3 and 5, exhaustive search, configuration uniqueness
- [doc 20 — Constants Reference](20-constants-reference.md) — H, ψ, K, mass and eccentricity sources
- [doc 25 — Universal Mass-from-Moon Formula](25-universal-mass-from-moon-formula.md) — how `massFraction.earth` is derived (Δa correction); related to the ~9 ppm Earth-mass refinement that triggered the recent balance-presets regeneration
- [doc 53 — Balance Explorer Reference](53-balance-explorer-reference.md) — interactive UI panel showing the 42 deep-analysis survivors
- [doc 55 — Solar System Resonance Cycle Periods](55-solar-system-resonance-cycle-periods.md) — full per-planet 8H/n period table
