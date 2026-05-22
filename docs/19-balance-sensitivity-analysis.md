# Doc 19 — Dual-Balance Sensitivity Analysis

> **Scope.** The Holistic-Universe model's eight-planet dual balance closes to 99.997% on Law 3 (inclination) and 99.862% on Law 5 (eccentricity) using phase-derived base eccentricities ([doc 10](10-fibonacci-laws.md)). The remaining 0.14% eccentricity-balance gap is small but real. This document decomposes that gap into per-planet contributions, computes single-parameter sensitivities (Δm/m, Δa/a, Δe/e per planet) that would close it, and shows that the gap cannot be attributed to any single observed planetary parameter being mis-measured — the required shifts are 4–6 orders of magnitude larger than the precision of DE440 masses and JPL orbital periods. Scale checks on Trans-Neptunian Object populations (§5) reveal a different open question: external-body contributions are typically *much larger* than the gap (10× to 500×, depending on Fibonacci-divisor assignment), so the real puzzle is not whether external bodies can close the gap but what determines their net contribution after in-phase / anti-phase cancellation. The analysis is reproducible via [`tools/verify/dual-balance-optimizer.js`](../tools/verify/dual-balance-optimizer.js) which prints all the numbers used here.

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

The eccentricity-base channel is the exception: base eccentricities are not directly observed. They are framework constructs derived from the balanced-year phase via the law of cosines. The "Δe/e = ±0.28%" reading for Saturn therefore says the *phase-derived bases* differ from the *forced-100%-balance bases* by 0.28% on Saturn — a difference of a few parts per thousand in a quantity that is not externally constrained. This is the channel through which a small framework-level refinement could in principle close the gap (see §7).

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

The total mass of the main-belt asteroids is ~3× the mass of Ceres (~1.4 × 10⁻⁹ M_sun) distributed at roughly the same a. Treating the belt as a single equivalent body:

```
v_belt ≈ √(1.4 × 10⁻⁹) × 2.7^(3/2) × ⟨e⟩ / √d  ≈ 1.66 × 10⁻⁴ × ⟨e⟩ / √d
```

For ⟨e⟩ ≈ 0.1 and d = 3, that's ~9.6 × 10⁻⁶ — **about 22% of the gap**. For d = 1, ~17 × 10⁻⁶ ≈ 39% of the gap. The main asteroid belt is **the same order of magnitude as the gap**, not three orders below it.

### 5.3 Scale check: Trans-Neptunian Objects

The total mass of the TNO + scattered-disk population is poorly constrained but commonly estimated at ~0.02–0.1 M_⊕ (~6 × 10⁻⁸ to 3 × 10⁻⁷ M_sun). At a ≈ 40 AU and ⟨e⟩ ≈ 0.15:

```
v_TNO ≈ √M_TNO × 40^(3/2) × 0.15 / √d
```

Numerically, with M_TNO at the conservative end (0.02 M_⊕):

| Fibonacci d | v_TNO | Compared to 4.27 × 10⁻⁵ gap |
|---:|---:|---:|
| 1 | 9.3 × 10⁻³ | **218× gap** |
| 8 | 3.3 × 10⁻³ | **77× gap** |
| 55 | 1.3 × 10⁻³ | **29× gap** |

Even at the **conservative 0.02 M_⊕** estimate and the **largest Fibonacci divisor (d = 55)**, the TNO population contributes **30× more v than the entire balance gap**. At commonly-cited TNO masses (0.05–0.1 M_⊕), the contribution is 50–500× the gap. A single Pluto+Charon system alone contributes ~27× the gap (at d = 21).

This is a surprising and important result: **the TNO population has far more than enough mass to close the gap — by 1 to 2 orders of magnitude, on either side**. The question is no longer "can external bodies close the gap?" (clearly yes), but "what determines the *net* contribution after in-phase and anti-phase parts cancel?"

### 5.4 Re-framing: the cancellation question

The fact that the 8-planet sum sits at 99.86% balance — only 4.27 × 10⁻⁵ off — when external bodies could contribute v values 100× larger in either direction is itself a **non-trivial observation**. Three possible explanations:

1. **Near-perfect cancellation.** The TNO population naturally distributes across in-phase and anti-phase groups with v contributions that cancel to ~0.5% precision, leaving the observed 4.27 × 10⁻⁵ residual. This would be a striking framework prediction but is currently unsupported by any structural rule — the framework has no formal in-phase / anti-phase assignment for sub-planetary bodies.

2. **Structural exclusion.** The framework's balance equation applies only to a privileged subset of bodies (perhaps "primary" planets meeting a mass threshold, or only those with Fibonacci-locked resonances). TNOs and asteroids would then enter the dynamics via N-body perturbations but not via the balance equation itself. This is a plausible interpretation but requires articulating the inclusion criterion.

3. **Coincidence.** The 99.86% closure of the 8-planet sum is partly fortuitous — there's no deep reason the residual *should* be 4.27 × 10⁻⁵ specifically, and a complete framework would predict whatever number the corrected external-body sum produces. The current 99.86% would then be a piece of evidence rather than a constraint.

A future analysis would need to:

1. Estimate the v-contribution of each known minor-body population (belt, Trojans, Centaurs, classical KBOs, scattered disk, plutinos).
2. Either (a) propose an in-phase / anti-phase assignment rule and test whether the net contribution lands at ~4 × 10⁻⁵, or (b) propose a structural-exclusion criterion that justifies leaving them out.
3. Treat the result as a falsifiable prediction of the framework once a rule is committed to.

This is outside the scope of the current document but is the natural follow-up analysis. The result of §5.3 makes it a substantially harder analysis than the original framing suggested, because the magnitudes involved are large.

---

## 6. Setting a principled Law 5 threshold

### 6.1 How Law 3's 99.994% threshold was derived

The Law 3 threshold sits at 99.994% — i.e. configurations are accepted if their inclination balance is ≥ 99.994%. The number is not arbitrary: it is set by the *measured* external-body contribution to the invariable plane.

**Li, Xia & Zhou 2019** ([arXiv:1909.11293](https://arxiv.org/abs/1909.11293)) integrated the Trans-Neptunian Object population to compute its net tilt of the invariable plane. They found **~1.25″** — equivalent to **0.006%** of the invariable-plane angle. Adding this to the 8-planet sum closes the inclination balance to exactly 100%; therefore an 8-planet-only framework should land at 100% − 0.006% = **99.994%**, and any configuration below that fails to leave room for the TNO contribution. The threshold is principled, externally derived, and falsifiable.

### 6.2 Why the analogous calculation fails for Law 5

The Law 5 weight is `v = √m · a^(3/2) · e / √d`. Two structural differences make the Li-2019 approach not transfer directly:

1. **No zero-mean for TNO eccentricities.** Inclinations distribute symmetrically about the invariable plane, so individual contributions partially cancel in Li 2019. TNO eccentricities sit at ⟨e⟩ ≈ 0.15 with no analogous cancellation axis — every TNO contributes a positive v with sign determined by its (currently undefined) in-phase / anti-phase assignment.

2. **a^(3/2) amplifies single bodies enormously.** The Law 3 weight contains `√a` (sub-linear), so distant bodies are only modestly heavier than nearby ones. The Law 5 weight contains `a^(3/2)` (super-linear), so a single Sedna-class body at a ≈ 500 AU contributes more v than the entire 8-planet sum.

### 6.3 The numbers for individual major TNOs

At the framework's default d = 8 assignment, the seven largest TNOs contribute (recomputed in §5.3):

| Body | v contribution | as % of v_in_phase (0.01543) |
|---|---:|---:|
| Pluto+Charon | 1.85 × 10⁻³ | **12%** |
| Eris | 7.94 × 10⁻³ | **51%** |
| Makemake | 6.8 × 10⁻⁴ | 4.4% |
| Haumea | 8.5 × 10⁻⁴ | 5.5% |
| Gonggong | 2.94 × 10⁻³ | **19%** |
| Quaoar | 1.08 × 10⁻⁴ | 0.7% |
| Sedna | **6.84 × 10⁻²** | **443%** |
| **Worst-case sum (all in-phase)** | **8.28 × 10⁻²** | **536%** |
| **Expected ±-random residual (σ)** | **6.90 × 10⁻²** | **447%** |
| Current 8-planet ecc-balance gap | 4.27 × 10⁻⁵ | 0.28% |

The worst-case and random-residual contributions are **3 to 4 orders of magnitude larger** than the current 8-planet gap. The Li-2019 calibration argument — "external bodies introduce a small known offset, so set the threshold just below 100%" — does not apply to Law 5 at these magnitudes.

### 6.4 Three principled options for the threshold

Given the above, three logically consistent ways to set a Law 5 threshold exist; none matches the current 99%:

| Option | Threshold | Rationale | Implication |
|---|---:|---|---|
| **A. Strict 8-planet scope** | ~99.9999% (1 ppm) | The balance equation is *defined* over the 8 primary planets; the prediction is 100% within DE440 / JPL measurement precision. | The framework's current 99.86% achievement would **fail this test by 5 orders of magnitude**. Forces a framework revision. |
| **B. Framework-prediction as target** | 99.862% ± δ (δ ≈ ppm) | The phase-derived 99.862% *is* the framework's prediction. Threshold = predicted value ± uncertainty from measurement precision. | Current 99% threshold is then **100× too loose**. Any deviation from 99.862% beyond ppm-level would falsify Law 5. |
| **C. Includes external-body uncertainty** | ≤ some number > 50% | If external bodies enter the equation, the natural-cancellation residual is poorly constrained (TNO contributions are 100× the gap); the threshold must be loose enough to admit this uncertainty. | A statistically derived threshold here is **looser than 99%**, not tighter. |

The current 99% threshold sits in a no-man's-land between A and C: tighter than the cancellation-allowed bound, looser than the strict measurement-limited bound. **It is not principled — it is a working choice for the deep-analysis filter in balance-search.js, not a theoretical commitment of the framework.**

### 6.5 Current state and honest recommendation

Until a Li-2019 analogue computation is done for Law 5 — taking known TNOs from the MPC database, computing per-body v, applying some in-phase / anti-phase assignment rule, and reporting the net residual — the framework's Law 5 closure of 99.862% should be described as:

> *The framework's 8-planet phase-derived eccentricity balance closes to 99.862%. A principled threshold analogous to Law 3's 99.994% has not yet been derived because external-body contributions in the Law 5 weight (a^(3/2)·e per body) are several orders of magnitude larger than the observed residual, and the framework currently lacks an inclusion / cancellation rule for sub-planetary bodies. The current 99% threshold used by balance-search.js is a working filter, not a derived bound.*

This is the honest framing. It preserves Law 5's empirical result without claiming a threshold derivation that hasn't been done.

### 6.6 Path forward

The Law-5 analogue of Li 2019 would require:

1. **MPC TNO catalog** — full population with a, e, mass-estimate or absolute-magnitude → mass.
2. **An in-phase / anti-phase rule** for TNOs — either inherited from a structural property (orbital direction? Fibonacci-d locking? proximity to invariable plane?) or treated as a free parameter to be fit.
3. **Per-body v computation** with that rule applied.
4. **Net residual Σv** compared to the framework's 4.27 × 10⁻⁵ gap.

Until step 2 is articulated, step 4 has no unique answer. This is the open work.

---

## 7. Honest scientific framing

The sensitivity table in §3 should be read as a **diagnostic tool**, not as a list of predictions. Concretely:

- **The Δe/e column** is the channel through which an eventual framework refinement of the phase-derived bases could close the gap. Bases are framework-derived, so small shifts here represent re-fitting within the framework, not contradicting an observable. A 0.3% Saturn-base shift sits at the boundary of what could be absorbed without disturbing other framework predictions.

- **The Δm/m and Δa/a columns** are sensitivity readings. They quantify how *unlikely* it is that the gap is due to mis-measured masses or orbits: the required shifts are 4–6 orders of magnitude larger than DE440 / JPL precision. This is itself an important result — it formally rules out the simplest "the masses are slightly wrong" explanation.

- **The implication** is that if the framework is correct *and* the gap is real (both of which require continued empirical scrutiny), the explanation involves gravitating bodies not currently in the balance sum. Section 5 shows that the TNO population alone has ~100× more total v than the gap — far more than enough mass, with the open question being what determines the net residual after in-phase / anti-phase cancellation.

---

## 8. What this analysis does *not* claim

To prevent over-interpretation:

1. **It does not claim the solar system "is at 100% balance".** It says: *if* it is, then the 4.27 × 10⁻⁵ residual v in the eight-planet sum should be matched by external bodies. The framework does not yet require 100%.

2. **It does not propose adjustments to DE440 masses or JPL periods.** The sensitivity readings *rule out* such adjustments as the gap source.

3. **It does not assign Fibonacci d-values to asteroid/TNO populations.** That assignment is a separate framework extension which would require its own derivation.

4. **It does not claim the phase-derived bases are wrong.** The Δe/e column is informational — it shows the size of the gap in eccentricity units. The phase-derived approach remains the framework's authoritative source.

5. **It does not propose a cancellation rule for external bodies.** §5.3 shows the TNO population's *total* v is 30–500× the gap, so any framework extension including those bodies must explain why their net contribution lands at the small observed residual. This document treats that as an open question, not a solved problem.

---

## 9. Reproducing this analysis

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

## 10. Related documents

- [doc 10 — Fibonacci Laws of Planetary Motion](10-fibonacci-laws.md) — Laws 3 and 5, exhaustive search, configuration uniqueness
- [doc 20 — Constants Reference](20-constants-reference.md) — H, ψ, K, mass and eccentricity sources
- [doc 25 — Universal Mass-from-Moon Formula](25-universal-mass-from-moon-formula.md) — how `massFraction.earth` is derived (Δa correction); related to the ~9 ppm Earth-mass refinement that triggered the recent balance-presets regeneration
- [doc 53 — Balance Explorer Reference](53-balance-explorer-reference.md) — interactive UI panel showing the 42 deep-analysis survivors
- [doc 55 — Solar System Resonance Cycle Periods](55-solar-system-resonance-cycle-periods.md) — full per-planet 8H/n period table
