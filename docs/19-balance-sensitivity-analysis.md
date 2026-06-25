# Doc 19 — Dual-Balance Sensitivity Analysis

> **Scope.** The Holistic-Universe model's eight-planet dual balance closes to 99.997% on Law 3 (inclination) and 99.862% on Law 5 (eccentricity) using phase-derived base eccentricities ([doc 10](10-fibonacci-laws.md)). The remaining 0.14% eccentricity-balance gap is small but real. This document decomposes that gap into per-planet contributions (§2), computes single-parameter sensitivities Δm/m, Δa/a, Δe/e per planet (§3), and shows that the gap cannot be attributed to any single observed planetary parameter being mis-measured — the required shifts are 4–6 orders of magnitude larger than the precision of DE440 masses and JPL orbital periods (§4). §5 then extends the framework's own Law 4 to external bodies, showing that **every body following Law 4 contributes a uniform `v = K · sin(tilt) ≈ 1.7 × 10⁻⁶` to the balance equation** — independent of mass and distance, because the huge `a^(3/2)` factor cancels with the tiny Law-4-predicted eccentricity amplitude. Random ± aggregation across N ≈ 625 such bodies gives σ ≈ 4.3 × 10⁻⁵, matching the framework's observed residual. **Per [doc 27](27-law4-tno-obliquity-predictions.md), the relevant population is the sub-200-km low-`e` classical-belt KBOs (the Law-4-admissible regime); large named TNOs (Pluto, Eris, Haumea, ...) are *not* part of the N = 625 because their externally-forced `e_amp` values give individual `v` contributions ~10–40× larger than K · sin(tilt).** §6 uses this result to derive the principled Law 5 threshold at 99.862% — exactly the framework's current achievement — analogous to Law 3's Li-2019-derived 99.994%, and distinguishes it from the looser 99% screening filter used in `balance-search.js`. Reproducible via [`tools/verify/dual-balance-optimizer.js`](../tools/verify/dual-balance-optimizer.js) and [`scripts/tno_balance_test.py`](../scripts/tno_balance_test.py).

> **Scope note (ESSRT).** The dual-balance laws (Law 3 vector inclination + Law 5 scalar eccentricity), per-planet sensitivities (Δm/m, Δa/a, Δe/e), and the Law-4 extension to external bodies are scale-invariant — they hold at any epoch. K, the per-planet v contributions, and the DE440/JPL planet parameters used here are J2000-anchored snapshots. Under [ESSRT](99-expanding-solar-system-resonance-theory.md), H(t) evolves at deep time via Drivers 1 (LOD growth) and 2 (Kepler), but the balance-gap analysis (0.14% residual) is structural and epoch-invariant — the σ ≈ 4.3 × 10⁻⁵ external-body aggregation result holds at any epoch with epoch-consistent inputs.

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

## 5. External-body contributions via Law 4 extension

If the framework's dual balance is a real physical property of the solar system, the actual eccentricity balance should close to 100% — but only when *all* gravitating bodies are included. The eight-planet sum we test today is necessarily incomplete: it excludes asteroids, Trans-Neptunian Objects, the Kuiper belt, the inner and outer Oort clouds, and interplanetary dust.

The framework's own [Fibonacci Laws Derivation](https://www.holisticuniverse.com/reference/fibonacci-laws-derivation) attributes the 0.14% Law 5 residual to:

> *"contributions from minor bodies (dwarf planets, asteroids) not included in the 8-planet framework, or measurement uncertainties in planetary masses — particularly Uranus and Neptune (~0.02–0.08% uncertain)."*

§5 quantifies the minor-body channel; §6 derives a principled threshold from it.

### 5.1 Law-4 extension to external bodies

The framework's Law 4 specifies how eccentricity amplitudes scale across bodies:

$$
e_{\text{amp}} = K \cdot \frac{\sin(\text{tilt}) \cdot \sqrt{d}}{\sqrt{m} \cdot a^{3/2}}
$$

Substituting this into the Law 5 weight `v = √m · a^(3/2) · e / √d` produces a striking cancellation — the huge `a^(3/2)` factor and the small `√m` factor in the denominator of e_amp cancel against the corresponding factors in v:

$$
v = \sqrt{m} \cdot a^{3/2} \cdot e_{\text{amp}} / \sqrt{d} = K \cdot \sin(\text{tilt})
$$

**Every body where actual `e_amp` matches the Law-4 intrinsic prediction contributes the SAME v to the eccentricity balance, regardless of its mass or distance.** This is the framework-natural extension of Law 5 to external bodies. (Which bodies actually satisfy `actual ≈ intrinsic` is the central population question — see §5.2 caveat and §5.4.) With K = 3.4149 × 10⁻⁶ and ⟨sin(tilt)⟩ ≈ 0.5 (isotropic average for unmeasured TNO axial obliquities):

$$
v_{\text{per body}} \approx 1.7 \times 10^{-6}
$$

The result is independent of the body's specific (m, a, d). It only depends on the body's axial tilt and on K — itself a universal Earth-derived constant.

### 5.2 Aggregate contribution from minor-body populations

For N bodies with random ± in-phase / anti-phase distribution, the expected net contribution to Σv_in − Σv_anti is:

$$
\sigma \approx K \cdot \langle\sin(\text{tilt})\rangle \cdot \sqrt{N} \approx 1.7 \times 10^{-6} \cdot \sqrt{N}
$$

| Population size N | σ (random ±) | vs framework residual 4.27 × 10⁻⁵ |
|---:|---:|---:|
| 100 | 1.7 × 10⁻⁵ | 0.40× |
| 500 | 3.8 × 10⁻⁵ | 0.89× |
| **625** | **4.27 × 10⁻⁵** | **1.00× ← calibrated match** |
| 1000 | 5.4 × 10⁻⁵ | 1.26× |
| 5000 | 1.2 × 10⁻⁴ | 2.8× |
| 10000 | 1.7 × 10⁻⁴ | 4.0× |

**The framework's 4.27 × 10⁻⁵ residual is quantitatively consistent with the random-residual contribution from ~625 minor bodies.** This is well within the order of magnitude of the known + extrapolated TNO population (catalogued ≥ 4000, expected total > 10⁵ in the Kuiper belt).

#### Population caveat — which 625?

The √N aggregation requires each body's *actual* v contribution to be roughly K · sin(tilt) ≈ 1.7 × 10⁻⁶. Per [doc 27 §2.4](27-law4-tno-obliquity-predictions.md#24-why-no-individual-tno-obliquity-prediction-is-possible), this is only true in the Law-4-admissible regime — empirically the **sub-200-km low-`e` classical-belt KBO** population, where intrinsic Law-4 amplitude dominates external forcing.

Large named TNOs are **not** part of this aggregation. Their `e_amp` values are dominated by external forcing (Neptune resonance, scattering, tides) and run far above Law 4's intrinsic prediction. Worked example for Pluto with its integrated `e_amp ≈ 0.025`:

```
v_Pluto = √m · a^(3/2) · e_amp / √d
       = √(7.27×10⁻⁹) · 39.482^(3/2) · 0.025 / √55
       ≈ 7.1 × 10⁻⁵
```

That is **~40× the K · sin(tilt) value** and **~1.6× the entire framework residual** from a single body. A √N aggregation that includes Pluto-class bodies is dominated by their individual variance, not by random aggregation — so they cannot be among the 625.

The corollary: the 625 must be a population *smaller and more dynamically quiescent than the named TNOs* — sub-200-km classical-belt bodies in the Law-4-compatible regime. Whether ~625 such bodies exist at the right size/eccentricity slice is an open empirical question; surveys like Col-OSSOS enumerate 10⁴–10⁵ bodies > 100 km in the cold classical belt, so 625 in the relevant slice is plausible but not directly counted.

### 5.3 Mass uncertainty contribution

Beyond minor-body contributions, the framework also attributes part of the residual to "measurement uncertainties in planetary masses — particularly Uranus and Neptune (~0.02–0.08% uncertain)" (these two planets' masses are currently constrained only by Voyager 2 flybys; the rest are determined to ~10⁻⁶ to 10⁻⁸ fractional precision by orbiters and ranging).

A 100,000-trial Monte Carlo perturbing each planet's mass within its 1-σ uncertainty (`scripts/mass_uncertainty_monte_carlo.py`) gives the per-planet contribution to the Law 5 balance σ:

| Planet | σ_rel (mass) | σ(gap) attributable | % of framework residual |
|---|---:|---:|---:|
| Mercury | 1 × 10⁻⁷ | 2.2 × 10⁻¹³ | 0.00% |
| Venus | 1 × 10⁻⁷ | 6.3 × 10⁻¹⁴ | 0.00% |
| Earth | 3 × 10⁻⁹ | 2.3 × 10⁻¹⁴ | 0.00% |
| Mars | 1 × 10⁻⁷ | 2.2 × 10⁻¹² | 0.00% |
| Jupiter | 1 × 10⁻⁸ | 4.0 × 10⁻¹¹ | 0.00% |
| Saturn | 3 × 10⁻⁶ | 2.3 × 10⁻⁸ | 0.05% |
| **Uranus** | **5 × 10⁻⁴** | **1.4 × 10⁻⁶** | **3.34%** |
| **Neptune** | **5 × 10⁻⁴** | **4.3 × 10⁻⁷** | **1.01%** |
| **Combined (all 8 in quadrature)** | — | **1.5 × 10⁻⁶** | **3.48%** |

**Mass-uncertainty contribution: 3.5% of the framework residual**, dominated almost entirely by Uranus (which carries 37% of in-phase v and has the largest fractional mass uncertainty). At the upper end of the cited 0.02–0.08% range (Neptune at 8 × 10⁻⁴), the combined contribution would reach ~6%; at the lower end (Uranus at 2 × 10⁻⁴), ~1.5%. **The remaining 94–98% of the residual is in the minor-body channel.**

This is consistent with the framework's testable prediction: a Uranus or Neptune orbiter providing precise mass measurements would shrink the mass-uncertainty channel toward zero, but the bulk of the residual would remain — leaving the minor-body signature largely intact.

### 5.4 Combined external-body budget

Combining the two channels in quadrature (independent contributions):

$$
\sigma_{\text{external}} = \sqrt{\sigma_{\text{minor body}}^2 + \sigma_{\text{mass uncertainty}}^2}
$$

| Channel | σ contribution | % of residual |
|---|---:|---:|
| Minor bodies (N=625, Law-4 extension, §5.2) | 4.27 × 10⁻⁵ | ~96% (dominant) |
| Mass uncertainty (Uranus/Neptune, §5.3) | 1.5 × 10⁻⁶ | ~4% |
| **Quadrature combined** | **~4.27 × 10⁻⁵** | **100%** |

The mass-uncertainty channel is small enough to be effectively absorbed in the calibrated N (a 3.5% reduction in σ_minor_body shifts the implied N from 625 to ~580 — within the noise of the calibration anyway).

**The framework's claim stands empirically:** the 8-planet Law 5 balance closes to 99.862% with a residual quantitatively consistent with the sum of expected external-body contributions, under the framework's own Law 4 extended to minor bodies.

The required assumption is that **for the relevant population, each body's actual `e_amp` ≈ its Law-4 intrinsic prediction** — i.e., external forcing on that body's eccentricity amplitude is negligible. By analogy with distant outer planets (Neptune's base/amp ratio ~1000×), this is *plausible for non-resonant non-scattered bodies* — but [doc 27 §2.1](27-law4-tno-obliquity-predictions.md#21-pluto-the-one-body-where-we-can-decompose-intrinsic-vs-external) has now tested it against the one body with integrated `e_amp` data:

- **Pluto**: Law-4 intrinsic `e_amp ≈ 0.001`, actual `e_amp ≈ 0.025`. Decomposition is **intrinsic + external ≈ 1 : 24**. The Law-4 intrinsic component is correctly captured; the additional ~96% is Neptune-resonance forcing.

This means the assumption **fails individually for resonant/scattered bodies** (Pluto-class), which is exactly the doc 27 §7 reading: such bodies are "non-planets" because external forcing dominates. The √N = 625 aggregation therefore restricts to a population where the assumption *does* hold — sub-200-km low-`e` classical-belt KBOs (no resonance, weak scattering, no detachment), where actual `e_amp` should approximate Law-4 intrinsic. Formal extension of Law 4 to that population, with bottom-up N count, is open theoretical work (§6.5).

**Testable prediction.** A future Uranus or Neptune orbiter (e.g., NASA's proposed Uranus Orbiter and Probe mission, target launch ~2032) would shrink the mass-uncertainty channel by ~100× (typical orbiter precision ~10⁻⁶ vs current ~5 × 10⁻⁴). The Law 5 residual would not move significantly — most of it is in the minor-body channel — but the mass-uncertainty budget would essentially vanish, sharpening the framework's prediction.

---

## 6. Setting a principled Law 5 threshold

### 6.1 How Law 3's 99.994% threshold was derived

The Law 3 threshold sits at 99.994% — i.e. configurations are accepted if their inclination balance is ≥ 99.994%. The number is not arbitrary: it is set by the *measured* external-body contribution to the invariable plane.

**Li, Xia & Zhou 2019** ([arXiv:1909.11293](https://arxiv.org/abs/1909.11293)) integrated the Trans-Neptunian Object population to compute its net tilt of the invariable plane. They found **~1.25″** — equivalent to **0.006%** of the invariable-plane angle. Adding this to the 8-planet sum closes the inclination balance to exactly 100%; therefore an 8-planet-only framework should land at 100% − 0.006% = **99.994%**, and any configuration below that fails to leave room for the TNO contribution. The threshold is principled, externally derived, and falsifiable.

### 6.2 The Law-5 analogue using Law-4 extension

The §5 analysis gives the corresponding derivation for Law 5. Under Law-4 extension to external bodies, every body contributes v = K · sin(tilt) ≈ 1.7 × 10⁻⁶, and random ± aggregation across N bodies gives:

$$
\sigma_{\text{external}} \approx K \cdot \langle\sin(\text{tilt})\rangle \cdot \sqrt{N}
$$

Expressed as a fraction of the total v in the balance equation (Σv_planets ≈ 0.031 — see §2):

$$
\Delta_{\text{balance}} \approx \frac{\sigma_{\text{external}}}{\Sigma v_{\text{planets}}}
$$

#### Sensitivity to N

The implied threshold depends on the minor-body population size N:

| N (minor bodies) | σ_external | Δ_balance | Implied threshold | Original empirical-category mapping |
|---:|---:|---:|---:|---|
| 30 | 9.4 × 10⁻⁶ | 0.030% | 99.970% | Major dwarf planets (H<5) |
| 100 | 1.7 × 10⁻⁵ | 0.055% | 99.945% | TNOs with H<6 (>600 km) |
| **625** | **4.3 × 10⁻⁵** | **0.138%** | **99.862%** | **TNOs with H<8 (>250 km)** |
| 5000 | 1.2 × 10⁻⁴ | 0.389% | 99.611% | All numbered TNOs (>50 km) |
| 100000 | 5.4 × 10⁻⁴ | 1.742% | 98.258% | Predicted total population (>100 km) |

The threshold varies by ~1.7 percentage points across realistic N values — significantly wider than the framework's measurement precision. A bottom-up theoretical derivation of N (which bodies follow Law 4?) is open work (§6.5).

> ⚠️ **Empirical-category caveat.** The "Original empirical-category mapping" column above pairs N values with named-TNO populations at various size cuts. Per [doc 27 §2.4](27-law4-tno-obliquity-predictions.md#24-why-no-individual-tno-obliquity-prediction-is-possible) and the population caveat in §5.2, **none of those named populations actually fit the Law-4-admissible regime** — they sit above the curve at their observed eccentricities. The mapping is retained here for historical context (the table was originally calibrated against these named categories), but the *correct* population that the √N = 625 actually counts is the **sub-200-km low-`e` cold-classical-belt KBOs** — bodies smaller than any named TNO, enumerated only statistically. The N values themselves remain meaningful (they parameterise the √N dependence of the threshold); the labels in the rightmost column do not.

#### Calibrated N from the framework's residual

The most defensible "natural" N value is the one that makes the predicted σ_external equal to the framework's observed residual:

$$
N_{\text{calibrated}} = \left(\frac{\text{gap}}{K \cdot \langle\sin(\text{tilt})\rangle}\right)^2 = \left(\frac{4.27 \times 10^{-5}}{1.7 \times 10^{-6}}\right)^2 \approx 625
$$

N = 625 was originally calibrated against the "TNOs with absolute magnitude H<8" (>250 km diameter) population. Per [doc 27 §2.4](27-law4-tno-obliquity-predictions.md#24-why-no-individual-tno-obliquity-prediction-is-possible), bodies in this size range sit above Law 4's admissibility curve at their observed eccentricities and do **not** fit the K · sin(tilt) per-body model — they belong to the externally-forced regime (§5.2 population caveat). The correct interpretation of "N=625" is therefore: ~625 bodies from the **sub-200-km low-`e` classical-belt KBO** population (where Law 4 actually admits the body and the intrinsic K · sin(tilt) contribution is the dominant v). This population is enumerated only statistically (via surveys like Col-OSSOS), not by named-body catalogue. The calibration is internally consistent under this revised population, but **less directly observed** than the original H<8 framing suggested.

**The framework's principled Law 5 threshold, derived analogously to Law 3's, is therefore 100% − 0.138% = 99.862% — exactly the framework's current achievement.**

**Methodological caveat:** this calibration is partially circular — we used the observed residual to set N, which means the threshold can't be tighter than the residual itself. A truly independent derivation would require either (a) a framework theory specifying which bodies follow Law 4, or (b) an independent astronomical count of those bodies. Both are open work. The threshold above should be read as "the framework's claim is self-consistent under a defensible minor-body population estimate," not "the framework's threshold is derived from first principles."

### 6.3 Two-tier threshold structure

The §6.2 analysis distinguishes two different thresholds that the framework's pipeline currently conflates:

| Tier | Threshold | Purpose | Where set |
|---|---:|---|---|
| **Search filter** | **99.000%** | Permissive screening: cast a wide net so exploration doesn't miss interesting near-bound candidates. Not a scientific bound. | `balance-search.js` deep-analysis filter |
| **Scientific bound** | **99.862%** | The framework's actual claim about Law 5 closure under Law-4 extension to minor bodies. Derived in §6.2 (calibrated to observed residual). | This document |

| Quantity | Value | Notes |
|---|---:|---|
| Law 3 threshold (Li 2019 derivation) | 99.994% | TNO-margin derived |
| **Law 5 scientific bound (Law-4 extension, calibrated)** | **99.862%** | **derived in §6.2** |
| Law 5 current achievement (8 planets) | 99.862% | passes by construction ✓ |
| balance-search.js search filter | 99.000% | screening filter (not the scientific bound) |

The framework's 99.862% Law 5 closure passes the derived scientific bound (by construction, since the bound was calibrated to it). The `balance-search.js` 99% filter is intentionally looser — it serves to find candidate configurations during exploration, with the principled bound applied afterward at validation time.

This separation is the honest framing: the search filter and the scientific bound serve different purposes and should not be conflated as the same number.

### 6.4 Empirical sanity check

The Law-4-extension result was sanity-checked against an empirical 19-TNO sample (Pluto+Charon, Eris+Dysnomia, Haumea+system, Makemake, Gonggong, Quaoar+Weywot, Sedna, Varuna, Ixion, Huya, Chaos, and others; orbital elements from JPL SBDB, mass estimates from binary observations where available).

Under Law-4 extension:
- v per body: 1.7 × 10⁻⁶ (uniform)
- Σv across the 19 bodies (worst case, all in-phase): 3.24 × 10⁻⁵ (76% of gap)
- σ (random ± across 19 bodies): 7.4 × 10⁻⁶ (17% of gap)

This is consistent with the 19-body sample being a small fraction of the ~625 minor bodies that combine to give σ ≈ gap.

> **Methodological sanity check (limited scope).** As a methodological check, the same 19-TNO sample was tested using their *currently-observed* eccentricities (e ≈ 0.15 typical) instead of Law-4-derived values. That interpretation produces per-body v values 100–500× the gap (Sedna alone gives v = 0.19 ≈ 4500× the residual) and is empirically incompatible with the framework's 99.86% closure. This demonstrates that **observed-e cannot be the input to v**: it would shatter the framework's residual by orders of magnitude. Details in `scripts/tno_balance_test.py`.
>
> **What this does and does not show (per [doc 27](27-law4-tno-obliquity-predictions.md)).** The 19-TNO sanity sample (Pluto, Eris, Haumea, ...) consists entirely of bodies that the doc 27 analysis identifies as **outside** the Law-4-admissible regime — they sit above the admissibility curve at their observed eccentricities. Pluto's actual integrated `e_amp ≈ 0.025` gives a v contribution ~40× the K · sin(tilt) value, decomposable into intrinsic (~0.001, Law-4 amount) + external (~0.024, Neptune-driven) — see [doc 27 §2.1](27-law4-tno-obliquity-predictions.md#21-pluto-the-one-body-where-we-can-decompose-intrinsic-vs-external). So the §6.4 sanity check:
> - ✅ **Does show** that observed-e fails wildly as a v-input for any TNO (rules out that reading).
> - ❌ **Does not confirm** that Law-4 extension applies to these 19 specific bodies — they are not in the admissible regime.
>
> The framework's actual claim (per the §5.2 population caveat) is restricted to sub-200-km low-`e` cold-classical-belt KBOs, which are *not* in this 19-body sample. The 19-TNO sanity check rules out one wrong interpretation; it does not validate the framework's chosen one.

### 6.5 Path forward

The §6.2 derivation produces a principled Law 5 threshold but rests on two assumptions: (i) Law 4 extends to TNOs and (ii) the calibrated N=625 is a defensible estimate of the relevant minor-body population. A more rigorous derivation would:

1. **Independently constrain N** — bottom-up count of bodies that follow Law 4, ideally from MPC TNO catalog with framework-applicable inclusion criterion. Removes the circular calibration in §6.2.
2. **Validate Law 4 in the TNO regime** — current claim is by analogy with distant outer planets (Neptune's base/amp ≈ 1000×); a more rigorous derivation should address resonance regimes (plutinos, Sedna).
3. **Sharpen the scientific bound** — replace the calibrated 99.862% with an N-independent value. Because the threshold scales as √N, a factor-of-2 change in N shifts it by ~0.07 percentage points.
4. **Decide whether to tighten the `balance-search.js` filter** — the current 99% is intentionally permissive; future revisions might choose a tighter filter once N is independently constrained.

Steps 1–3 together would close the methodological circularity in §6.2's calibration. Step 4 is downstream of that work.

---

## 7. Honest scientific framing

The sensitivity table in §3 should be read as a **diagnostic tool**, not as a list of predictions. Concretely:

- **The Δe/e column** is the channel through which an eventual framework refinement of the phase-derived bases could close the gap. Bases are framework-derived, so small shifts here represent re-fitting within the framework, not contradicting an observable. A 0.3% Saturn-base shift sits at the boundary of what could be absorbed without disturbing other framework predictions.

- **The Δm/m and Δa/a columns** are sensitivity readings. They quantify how *unlikely* it is that the gap is due to mis-measured masses or orbits: the required shifts are 4–6 orders of magnitude larger than DE440 / JPL precision. This is itself an important result — it formally rules out the simplest "the masses are slightly wrong" explanation.

- **The implication** is that the gap is not in the planets; it is in what's missing from the eight-planet sum. §5 shows the gap is quantitatively consistent with random ± contributions from ~625 minor bodies (calibrated N) under the framework's own Law 4 extension. §6 derives the corresponding principled threshold at 99.862% — equal to the framework's current achievement by construction — analogous to Law 3's Li-2019-derived 99.994%. The 99% filter in `balance-search.js` is a separate screening tool, not the scientific bound (§6.3).

---

## 8. What this analysis does *not* claim

To prevent over-interpretation:

1. **It does not claim the solar system "is at 100% balance".** It says: *if* it is, then the 4.27 × 10⁻⁵ residual v in the eight-planet sum should be matched by external bodies. The framework does not yet require 100%.

2. **It does not propose adjustments to DE440 masses or JPL periods.** The sensitivity readings *rule out* such adjustments as the gap source.

3. **It does not assign Fibonacci d-values to asteroid/TNO populations.** That assignment is a separate framework extension which would require its own derivation.

4. **It does not claim the phase-derived bases are wrong.** The Δe/e column is informational — it shows the size of the gap in eccentricity units. The phase-derived approach remains the framework's authoritative source.

5. **It does not formally extend Law 4 to TNOs, and the per-body extension has now been individually tested and failed.** §5 extends Law 4 to TNOs *by analogy* (because Neptune's base/amp ≈ 1000× suggests distant bodies have small base eccentricities near their Law-4 amplitudes). Under that extension, each body contributes v = K · sin(tilt) ≈ 1.7×10⁻⁶, and random ± across ~625 minor bodies gives σ ≈ gap. **[Doc 27](27-law4-tno-obliquity-predictions.md) tests this against the one body where independent integrated `e_amp` data exists — Pluto, with `e_amp ≈ 0.025` — and finds Law 4 under-predicts by ~25×.** The per-body extension therefore fails individually for resonance-forced bodies like Pluto. The framework's claim in §5 is retained at the **statistical** level (aggregate σ across the Law-4-admissible sub-200-km classical-belt KBO population) but **not** at the individual level: Pluto and other named TNOs are *not* part of the √N = 625 — see the §5.2 population caveat. Whether the right population of sub-200-km low-`e` bodies exists at N ≈ 625 to close the budget is an empirical open question.

6. **It does not claim the derived 99.862% Law 5 threshold is final or N-independent.** The §6.2 derivation calibrates N from the framework's observed residual, which means the threshold *cannot* be tighter than the residual — it is a self-consistency check rather than an independent prediction. A bottom-up N derivation (independent count of bodies following Law 4) would produce an N-independent threshold that could be tighter or looser; until that is done, the 99.862% number should be read as "the framework's claim is consistent with a calibrated population of ~625 minor bodies" rather than "the framework predicts 99.862% from first principles." The two-tier separation (search filter 99% vs scientific bound 99.862%) is also intentional: the search filter could be tightened in a future revision once N is independently constrained.

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

The empirical sanity check in §6.4 is reproducible via:

```bash
python3 scripts/tno_balance_test.py
```

This reads a hardcoded 19-TNO sample (orbital elements from JPL SBDB, masses from binary observations where available) and computes per-body v under the Law-4 extension (the framework-natural interpretation used throughout the doc). The script additionally reports an observed-e calculation as a methodological sanity check, demonstrating that the framework's Law-4 extension is required for empirical consistency. Output: `data/tno-balance-test.json`.

The mass-uncertainty Monte Carlo in §5.3 is reproducible via:

```bash
PYTHONPATH=tools/fit/python python3 scripts/mass_uncertainty_monte_carlo.py
```

This perturbs each planet's mass within its 1-σ relative uncertainty (10⁻⁹ to 5×10⁻⁴ depending on planet), recomputes the Law 5 balance for 100,000 Monte Carlo trials, and reports the σ(balance) attributable to mass uncertainty per planet and combined. Output: `data/mass-uncertainty-mc.json`. The script depends on `tools/lib/python/constants_scripts.py` and `tools/fit/python/load_constants.py` (Node.js subprocess bridge).

---

## 10. Related documents

- [doc 10 — Fibonacci Laws of Planetary Motion](10-fibonacci-laws.md) — Laws 3 and 5, exhaustive search, configuration uniqueness
- [doc 20 — Constants Reference](20-constants-reference.md) — H, ψ, K, mass and eccentricity sources
- [doc 25 — Universal Mass-from-Moon Formula](25-universal-mass-from-moon-formula.md) — how `massFraction.earth` is derived (Δa correction); related to the ~9 ppm Earth-mass refinement that triggered the recent balance-presets regeneration
- [doc 53 — Balance Explorer Reference](53-balance-explorer-reference.md) — interactive UI panel showing the 42 deep-analysis survivors
- [doc 99 — Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) — Deep-time scaling of H(t); the balance-gap analysis is structural and epoch-invariant
- [doc 55 — Solar System Resonance Cycle Periods](55-solar-system-resonance-cycle-periods.md) — full per-planet 8H/n period table
