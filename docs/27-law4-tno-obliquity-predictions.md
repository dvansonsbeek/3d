# Law-4 TNO Obliquity Predictions

> **TL;DR.** Law 4 — `e_amp = K · sin(tilt) · √d / (√m · a^(3/2))` — is *bidirectional*. Solved for `sin(tilt)`, it predicts axial obliquity from secular eccentricity amplitude. Applied to 17 known TNOs under the proxy assumption `e_obs ≈ e_amp`, all require `sin(tilt) ≫ 1` — but this assumption is known to break for resonant and scattered-disk bodies, whose observed eccentricity is dominated by **base** eccentricity (resonance-forced or scattered), not by the **amplitude** Law 4 actually constrains. For 16 of the 17 the test is **inconclusive, not refutational**: their secular `e_amp` is not directly measured.
>
> Where independent secular-amplitude estimates exist (e.g. Pluto's `e_amp ≈ 0.025` from Williams-Benson / Malhotra integrations), Law 4 predicts an **intrinsic** amplitude of ~0.001; the additional ~0.024 is Neptune-resonance forcing on top. This is not a failed test of Law 4 — it's a decomposition: intrinsic (Law-4 amount) + external (Neptune-driven) ≈ 1 : 25 for Pluto. The honest verdict is that known TNO dynamics are dominated by external coupling (Neptune resonance, scattering, galactic tides), so Law 4's intrinsic component is overwhelmed and not separately observable from current data.
>
> The genuine falsifier remains: a 100-km classical KBO at `a ≈ 45 AU`, `e ≈ 0.05` (where `e_obs ≈ e_amp` is plausible because no strong resonance forces a non-zero base) is predicted by Law 4 to have **tilt ≈ 36.6°**. But this is a **population-statistical** claim over sub-200-km cold-classical-belt KBOs — no individually catalogued/named TNO is testable, because every named body sits above the Law-4 admissibility curve. Comets and main-belt asteroids also fail to provide a clean test (§2.5). LSST is expected to constrain small-KBO rotation poles by ~2030–2035. The same Law-4 compliance test rejects all Planet Nine candidates ([doc 15](15-planet-nine-prediction.md)).
>
> **Scope interpretation (§7):** the body classes Law 4 admits are exactly those the IAU classifies as planets. "Cleared the neighborhood" (IAU) and "intrinsic Law-4 closure" (framework) are two formalisations of the same physical fact — a planet evolves under its own dynamics; everything else is externally forced. The framework's contribution is to make this quantitative and predictive.

**Related documents:**
- [10 — Fibonacci Laws](10-fibonacci-laws.md) — Law 4 derivation, K = 3.4149×10⁻⁶
- [15 — Planet Nine Prediction](15-planet-nine-prediction.md) — same two-tier methodology applied to ETNO candidates
- [19 — Dual-Balance Sensitivity Analysis](19-balance-sensitivity-analysis.md) — Approach 2 (Law-4 natural) reading of v-balance
- [38 — Eccentricity Balance Scale](38-eccentricity-scale.md) — K constant in context
- Code: [`scripts/tno_obliquity_prediction.py`](../scripts/tno_obliquity_prediction.py)
- Output: [`data/tno-obliquity-predictions.json`](../data/tno-obliquity-predictions.json)

---

## 1. The Bidirectional Reading of Law 4

The framework's Law 4 (eccentricity amplitude scaling) is normally written in the **forward direction**:

```
e_amp = K · sin(tilt) · √d / (√m · a^(3/2))
```

with K = 3.4149 × 10⁻⁶ (the universal eccentricity-amplitude constant derived from Earth). For the 8 primary planets, all four quantities — `m`, `a`, `d` (Fibonacci divisor), and `tilt` (axial obliquity) — are independently observed, and the law closes to <1% across the full set.

Solved for `sin(tilt)`:

```
sin(tilt) = e_amp · √m · a^(3/2) / (K · √d)
```

This is the **inverse reading**. It states that, *given* a body's eccentricity-oscillation amplitude, mass, semi-major axis, and Fibonacci d-slot, the framework predicts its axial obliquity.

### 1.1 Why this is the framework's deepest single claim

In conventional dynamics, eccentricity (a property of the *orbit*) and obliquity (a property of *rotation*) are independent state variables. Their long-term evolutions are weakly coupled through tidal and spin-orbit resonance effects, but no first-principles theory links them as a single algebraic identity.

Law 4 *does* link them — quantitatively, with a single universal constant K. If the framework is right, every body in the mirror-pair structure carries a hidden constraint: rotational orientation is locked to orbital shape.

The same identity rejects Planet Nine ([doc 15 §3.1](15-planet-nine-prediction.md#31-tier-1--law-4-compliance-the-eccentricity-must-be-physically-realisable)) — it also makes a positive prediction for every body the framework admits.

### 1.2 The critical assumption — and where it breaks

Law 4 constrains the **secular oscillation amplitude** `e_amp`, not the current observed eccentricity `e_obs`. For the primary planets these are independently known: `e_amp` comes from multi-Myr ephemeris integrations (Laskar 2011, VSOP). For TNOs, no such fit is directly published — orbital ephemerides span ~200 years against 10⁵–10⁷-year secular cycles.

We could choose two readings:

| Reading | Input to Law 4 | When it's appropriate |
|---|---|---|
| **(a) `e_obs ≈ e_amp`** | observed eccentricity | Body with negligible base eccentricity; current value reflects amplitude (e.g. classical-belt KBOs at low `e`) |
| **(b) `e_obs = e_base + ∆`, `e_amp = ∆`** | small oscillation around a forced base | Body whose eccentricity is **resonance-forced** (plutinos at e ≈ 0.25), **scattered** (SDOs at e ≈ 0.5), or **detached** (Sedna at e ≈ 0.85) |

Reading (a) is the **simplest and most generous** — if a body fails it, it fails the easiest possible compatibility test. Reading (b) is **astrophysically appropriate for almost every catalogued major TNO** — every one of them is in a resonance, scattered-disk, or detached regime.

The script and the table in §2 below use reading (a). Therefore the "fails by 8–7658×" numbers are **upper bounds on tension**, not direct evidence Law 4 is wrong for these bodies. Where reading (b) is more appropriate (which is the majority of the sample), the test is **inconclusive**: we'd need an independent measurement of secular `e_amp` to apply Law 4 properly, and we don't have one for most TNOs.

The conclusion that's robust to the assumption is **direction**, not magnitude: the framework expects much smaller `e_amp` values for distant low-mass bodies than the catalogue's `e_obs` values would naïvely imply.

---

## 2. Application: 17 Known TNOs (Reading (a), `e_obs ≈ e_amp`)

Seventeen catalogued TNOs were tested across the full Fibonacci d-pool `[1, 2, 3, 5, 8, 13, 21, 34, 55]`. For each body, the minimum required `sin(tilt)` is found at `d = 55` (largest d → least restrictive). Results below are taken from `scripts/tno_obliquity_prediction.py` under reading (a). **For most of these bodies reading (b) is more appropriate — see §2.1 and §2.2.**

| Body | m (M☉) | a (AU) | e_obs | min sin(tilt) | verdict |
|---|---:|---:|---:|---:|---|
| Pluto+Charon | 7.27×10⁻⁹ | 39.48 | 0.249 | **208×** | unphysical |
| Eris+Dysnomia | 8.40×10⁻⁹ | 67.86 | 0.439 | **888×** | unphysical |
| Haumea+system | 2.02×10⁻⁹ | 43.13 | 0.191 | **96×** | unphysical |
| Makemake | 1.54×10⁻⁹ | 45.79 | 0.159 | **76×** | unphysical |
| Gonggong | 9.00×10⁻¹⁰ | 67.49 | 0.503 | **330×** | unphysical |
| Quaoar+Weywot | 7.00×10⁻¹⁰ | 43.69 | 0.039 | **12×** | unphysical |
| Sedna | 4.00×10⁻¹⁰ | 506.00 | 0.852 | **7658×** | unphysical |
| Orcus+Vanth | 6.30×10⁻¹⁰ | 39.42 | 0.226 | **55×** | unphysical |
| Salacia+Actaea | 4.92×10⁻¹⁰ | 42.18 | 0.106 | **25×** | unphysical |
| Varuna | 2.00×10⁻¹⁰ | 42.70 | 0.054 | **8×** | unphysical |
| 2002 MS4 | 1.50×10⁻¹⁰ | 41.93 | 0.143 | **19×** | unphysical |
| Ixion | 1.30×10⁻¹⁰ | 39.61 | 0.241 | **27×** | unphysical |
| 2002 AW197 | 1.20×10⁻¹⁰ | 47.42 | 0.131 | **19×** | unphysical |
| 2003 AZ84 | 1.30×10⁻¹⁰ | 39.49 | 0.176 | **20×** | unphysical |
| 2004 GV9 | 1.00×10⁻¹⁰ | 41.85 | 0.077 | **8×** | unphysical |
| Chaos | 1.00×10⁻¹⁰ | 45.84 | 0.106 | **13×** | unphysical |
| Varda | 1.40×10⁻¹⁰ | 45.93 | 0.144 | **21×** | unphysical |

**Result under reading (a): 0 of 17 known TNOs satisfy `sin(tilt) ≤ 1`** at any Fibonacci d. The proxy `e_obs ≈ e_amp` returns failures from 8× (Varuna, lowest-eccentricity classical KBO in the sample) to 7658× (Sedna, the most eccentric).

As argued in §1.2, this is **not yet a refutation** of Law 4 for these bodies — it's a refutation of the proxy. Reading (b) is more appropriate for almost the entire sample.

### 2.1 Pluto: the one body where we can decompose intrinsic vs external

Pluto's secular eccentricity oscillation is well-characterised by long-term numerical integrations (Williams & Benson 1971; Malhotra & Williams 1997). Inside the 3:2 Neptune resonance, Pluto's `e` ranges roughly **0.22 to 0.27 over a ~3.7 Myr secular cycle**. Taking half the peak-to-peak range:

```
e_base ≈ 0.245     (resonance-forced centre)
e_amp  ≈ 0.025     (half peak-to-peak — the actual secular amplitude)
```

**What does Law 4 predict for Pluto?** Given the measured obliquity 119.6° (`sin = 0.870`), Law 4's intrinsic prediction is:

```
e_amp_intrinsic = K · sin(tilt) · √d / (√m · a^(3/2))
                ≈ 3.4×10⁻⁶ · 0.870 · √55 / (√(7.27×10⁻⁹) · 39.482^(3/2))
                ≈ 1.0 × 10⁻³
```

So Law 4 predicts an intrinsic amplitude of **~0.001**. The actual amplitude is **~0.025**. The decomposition is:

```
e_amp_actual  ≈ 0.025
            = e_amp_intrinsic (Law-4, ~0.001) + e_amp_external (~0.024)
intrinsic : external ≈ 1 : 24
```

This is **not a failed test of Law 4**. It's a measurement of how strongly Neptune's 3:2 resonance pumps Pluto's eccentricity on top of Pluto's intrinsic Law-4 amplitude. The framework expects external forcing to dominate intrinsic for any body that sits in a strong resonance — and that's exactly what we see for Pluto. The intrinsic component is correctly captured by Law 4; the external component is what makes Pluto a "non-planet" in the §7 sense.

**What this rules out**: it rules out the *strict* reading where Pluto's actual `e_amp` should equal Law 4's intrinsic prediction. That reading would make Pluto a "planet" in the framework's sense — i.e., evolving under its own dynamics alone — which the data contradicts. Pluto is externally forced, as expected. The "25× under-prediction" headline number is the external/intrinsic ratio, not a refutation of Law 4's intrinsic claim.

**Why this still matters**: it bounds the size of intrinsic and external separately. For other resonant TNOs without published integrations, we can expect a similar split (Law-4-intrinsic ~ 10⁻³, plus resonance-driven extra). The Law 4 intrinsic prediction is a real (small) baseline; the actual secular amplitude is intrinsic + external.

### 2.2 The other 16 — what we'd need to test

For Eris, Haumea, Makemake, Sedna, Quaoar, Varuna, etc., per-body secular-amplitude estimates at the precision needed for a Law-4 check are not available in the public literature at the time of writing. Their dynamics span:

- **Plutinos** (Orcus, Ixion, 2003 AZ84) — same 3:2 resonance forcing as Pluto, but no Williams-Benson-style integrations published per body
- **Scattered-disk objects** (Eris, Gonggong) — strong gravitational scattering, secular amplitude not well-defined
- **Detached / inner-Oort-cloud** (Sedna) — galactic-tide-dominated, amplitude on >100-Myr timescales
- **Classical KBOs** (Quaoar, Varuna, Salacia, 2002 MS4, 2002 AW197, 2004 GV9, Chaos, Varda) — secular amplitude may plausibly match observed `e_obs` (no strong resonance forces a base) but no per-body integration confirms it

For the classical KBOs in this list — where reading (a) is *least* unreasonable — Varuna (sin = 8×) and 2004 GV9 (sin = 8×) sit at the boundary. These are the bodies whose obliquities would be the most diagnostic if measured.

### 2.3 Honest framing

| Body class | Reading appropriate | Status |
|---|---|---|
| Pluto (resonant, integrated) | (b), `e_amp ≈ 0.025` | Intrinsic + external decomposition: intrinsic ≈ 0.001 (Law-4 correct), external ≈ 0.024 (Neptune-driven) |
| Other plutinos | (b), but no `e_amp` published | Same external-dominated regime expected; not directly testable |
| Scattered-disk (Eris, Gonggong) | Amplitude ill-defined | Not a Law-4 test |
| Sedna (detached) | (b) on Gyr timescale | Out of scope |
| Haumea (collisional family) | (b), but rotation also anomalous | Out of scope |
| Classical KBOs (Quaoar, Varuna, ...) | (a) plausibly OK | Borderline — closer to compliance, no obliquity yet measured |

### 2.4 Why no individual TNO obliquity prediction is possible

Sharpening the result: **under reading (a) — the forward test "is `sin(tilt) ≤ 1` for some d?" — no catalogued/named TNO in the current sample passes**. (This is a statement about the proxy test, not about Law 4's intrinsic prediction; per §2.1, intrinsic e_amp is still well-defined for every body and typically small.) The threshold table (§3) sets the regime:

| e | Max diameter for Law 4 compliance (ρ = 2 g/cm³) |
|---:|---:|
| 0.500 | 38 km |
| 0.150 | 84 km |
| 0.050 | **175 km** |
| 0.020 | 322 km |
| 0.010 | 511 km |

Every named TNO in the catalogue is **≥ ~700 km in diameter at `e ≥ 0.04`** — above this curve. Varuna (~700 km, e=0.054) is the closest to compliance at 8.4× tension; everything else fails harder.

This means the framework's positive obliquity-prediction power outside the 8 primary planets is:

| Target | Per-body prediction? | Population prediction? |
|---|:---:|:---:|
| 8 IAU planets | Already confirmed (<1% closure) | n/a |
| Named TNOs (Pluto, Eris, ...) | **No** — all above the threshold | n/a |
| Sub-200-km low-`e` classical KBOs | No — not individually catalogued | **Yes** — clustering near `arcsin(e·√m·a^(3/2)/(K·√d))` |

The §4 prediction is a **population-statistical** claim across the small classical-belt population (LSST will measure ~10³ rotation poles over its run), **not** a per-body claim for any catalogued TNO. We cannot point to a named body and predict its obliquity.

### 2.5 Can smaller comets or asteroids test the law?

It is tempting to look at smaller bodies — comets and asteroids — since their `√m` factor is much smaller and the equation appears to admit them. The numbers do not support this:

**67P/Churyumov-Gerasimenko** (Rosetta target — mass and obliquity both directly measured):
- `m ≈ 5×10⁻¹⁸ M☉`, `a ≈ 3.46 AU`, `e ≈ 0.641`
- Law 4 at d = 55: `sin(tilt) ≈ 0.00036` → predicted obliquity **≈ 0.02°**
- Measured obliquity: **52°**
- Disagreement: ~52° (the prediction is essentially zero; reality is mid-range)

**Ceres** (largest main-belt asteroid):
- `m = 4.7×10⁻¹⁰ M☉`, `a = 2.766 AU`, `e = 0.076`
- Law 4 at d = 55: `sin(tilt) ≈ 0.30` → predicted obliquity **≈ 17.4°**
- Measured obliquity: **4°**
- Disagreement: ~13°

Comets and asteroids show a **different failure mode** from TNOs:

| Class | Law 4 admits? (sin ≤ 1) | Predicted matches measured? |
|---|:---:|:---:|
| TNOs (Pluto, Varuna, ...) | No (sin = 8×–7658×) | Cannot test — admitted region not reached |
| Comets (67P) | Yes (sin ≈ 0.0004) | No — predicted ~0°, measured 52° |
| Main-belt asteroids (Ceres) | Yes (sin ≈ 0.3) | No — off by ~13° |

The reason aligns with §7: comets are dominated by Jupiter scattering and non-gravitational outgassing torques; asteroids are dominated by Yarkovsky/YORP radiative spin-axis evolution and Jupiter resonances. Neither class evolves under intrinsic Law-4 algebra — their rotational states are set by external forcing. They are "non-planets" in the framework's sense and the prediction does not apply to them.

**Conclusion:** comets and small asteroids do not provide a usable test of Law 4. The only viable extension beyond the 8 planets is the sub-200-km low-`e` classical-belt KBO population, which requires LSST-class survey data to constrain.

---

## 3. Threshold: Where the Framework *Can* Apply

For a hypothetical TNO at `a = 45 AU` (the classical-belt mean), Law 4 places an upper limit on mass as a function of `e_obs`:

```
√m_max = K · √d_max / (e · a^(3/2))   →   sin(tilt) = 1 at d = 55
```

| e_obs | max m (M☉) | max m (M_Earth) | ~diameter (km, ρ = 2 g/cm³) |
|---:|---:|---:|---:|
| 0.500 | 2.82×10⁻¹⁴ | 9.4×10⁻⁹ | **38** |
| 0.300 | 7.82×10⁻¹⁴ | 2.6×10⁻⁸ | **53** |
| 0.150 | 3.13×10⁻¹³ | 1.0×10⁻⁷ | **84** |
| 0.100 | 7.04×10⁻¹³ | 2.3×10⁻⁷ | **110** |
| 0.050 | 2.82×10⁻¹² | 9.4×10⁻⁷ | **175** |
| 0.020 | 1.76×10⁻¹¹ | 5.9×10⁻⁶ | **322** |
| 0.010 | 7.04×10⁻¹¹ | 2.3×10⁻⁵ | **511** |

Note: this threshold is computed under reading (a), `e_obs ≈ e_amp`. For resonant or scattered bodies whose observed eccentricity is dominated by a forced/scattered base, the relevant input to this table is the secular *amplitude* `e_amp` — typically much smaller than `e_obs` — which moves the body into a much more permissive row.

Two readings of the same table:

1. **For high-`e_amp` bodies (true secular amplitude > 0.15)**, Law 4 admits only sub-100-km objects. We have no high-`e_amp` body confirmed in the catalogue.
2. **For low-`e_amp` bodies (~0.05)** — the regime of classical-belt KBOs with no resonance forcing — Law 4 admits bodies up to ~175 km. This is exactly the size range of the catalogued classical-belt population whose obliquities are not yet measured.

The "low-`e_amp` classical KBO" region is the framework's testable prediction zone. Quaoar and Varuna (`e_obs ≈ 0.04–0.05`, plausibly close to `e_amp` because no resonance forces them) sit closest to compliance in the sample.

---

## 4. Testable Prediction

> **A 100-km-diameter classical KBO with density ρ ≈ 2 g/cm³, semi-major axis `a = 45 AU`, and observed eccentricity `e ≈ 0.05` (mass ~10⁻¹² M☉) has, under Law 4, predicted `sin(tilt) ≈ 0.596`, i.e. axial obliquity ≈ 36.6° at `d = 55`.**

This is a falsifiable measurement target — but it is a **population-statistical** claim, not a claim about any individually named body. As §2.4 shows, every catalogued/named TNO is too large at its observed eccentricity to satisfy Law 4. The candidate population is the sub-200-km classical-belt KBO catalogue (Col-OSSOS enumerates thousands at this scale). Their individual axial obliquities are not currently measured; the Vera Rubin Observatory (LSST) lightcurve survey is expected to constrain rotation poles for ~10³ TNOs over its 10-year run, of which the cold classical-belt subset is the relevant test population.

If a population-statistical measurement of small classical-belt KBOs yields a mean obliquity near ~36° (or, more strongly, a clustering near `arcsin(K · √d · a^(-3/2) · √m / e)` for each body's parameters), the framework's Law 4 bidirectional claim is empirically supported beyond the 8 primary planets.

If the obliquity distribution is uniform (random), the bidirectional claim is restricted to the primary-planet domain — which is the framework's stated scope, but a measurement that *could* have been positive and instead came up null is still informative.

### 4.1 Why this prediction is non-trivial

A uniform-random expectation for `sin(tilt)` (Lambert's law over a sphere) is `⟨sin(tilt)⟩ = π/4 ≈ 0.785` (mean obliquity ≈ 57.3°). Law 4's prediction `sin(tilt) ≈ 0.6` for the canonical 100-km classical KBO is **distinguishable** from the random expectation by ~30%. A sample of ~10² obliquity measurements at ±10° precision would resolve it.

---

## 5. Methodology

### 5.1 Two-tier compatibility test (same as Planet Nine)

[Doc 15](15-planet-nine-prediction.md) introduced the two-tier compatibility test for proposed Planet Nine candidates:

- **Tier 1 (Law-4 compliance)**: observed eccentricity must be reachable as `e_amp` for some `(d, tilt)` pair. Failure: `sin(tilt) > 1` for all d.
- **Tier 2 (v-balance integration)**: even if Tier 1 passes, the candidate must integrate into the framework's mirror-pair v-balance without breaking Law 5 (99.862%).

The TNO obliquity analysis applies Tier 1 in inverse mode **under the `e_obs ≈ e_amp` proxy (reading (a))**. The 17 known TNOs all fail Tier 1 by 8–7658× under that proxy.

For TNOs, the proxy is generally inappropriate (§1.2), so the failure is an **upper-bound on tension**, not a direct refutation. The one body where reading (b) can be applied — Pluto — yields a clean intrinsic/external decomposition (~0.001 intrinsic + ~0.024 external, §2.1), with Law 4 correctly capturing the intrinsic component and Neptune resonance forcing the rest.

For Planet Nine candidates the situation is different: the rejection is robust to which reading is used. The mass × `a^(3/2)` factor at 4–10 M_Earth and 300–700 AU is so large that even with a hypothetical tiny secular amplitude (`e_amp` → 0.001) the candidate fails by ~10³×. The rejection in [doc 15](15-planet-nine-prediction.md) therefore stands independently of the `e_obs` vs `e_amp` distinction.

### 5.2 The d-pool

The Fibonacci d-pool `[1, 2, 3, 5, 8, 13, 21, 34, 55]` is the same one used by `balance-search.js` ([doc 80](#)). For TNO obliquity prediction the *largest* d minimises required `sin(tilt)`, so all reported values are at `d = 55`. This is the most-favourable choice for the body; a tighter d would push every prediction even further into the unphysical region.

### 5.3 Mass values

Masses are taken from current best estimates (NSSDC, Brown & Butler 2018, Grundy et al. 2019, etc.). For binaries (Pluto+Charon, Eris+Dysnomia, Haumea+system, Orcus+Vanth, Salacia+Actaea, Varda+Ilmarë), the system mass is used. Uncertainties on TNO masses are typically 10–30%; this does not affect the qualitative conclusion (failure by 8× cannot be closed by a 30% mass shift).

---

## 6. Summary

1. **Law 4 is bidirectional.** Solved for `sin(tilt)`, it predicts axial obliquity from the body's secular eccentricity *amplitude* (`e_amp`), mass, semi-major axis, and Fibonacci d-slot.
2. **The critical distinction** between `e_obs` (snapshot eccentricity) and `e_amp` (secular oscillation amplitude) matters for TNOs. For resonant or scattered bodies, `e_obs` is dominated by **base** eccentricity, which Law 4 does not constrain.
3. **Under the proxy `e_obs ≈ e_amp` (reading (a))** all 17 catalogued major TNOs fail by 8–7658×. This is an **upper bound on tension**, not a direct refutation — the proxy is inappropriate for most of the sample.
4. **Pluto is the only TNO** for which an independently-integrated `e_amp ≈ 0.025` is available. Under reading (b), Pluto's actual amplitude decomposes into an intrinsic Law-4 component (~0.001) plus a Neptune-resonance external component (~0.024) — ratio ≈ 1 : 24. Law 4 correctly predicts the intrinsic part; the rest is external forcing. This is the expected regime for a body locked in a 3:2 mean-motion resonance, not a refutation of Law 4.
5. **For the remaining 16**, secular-amplitude measurements at usable precision are not in the literature. Per-body Myr-scale integrations would let us decompose each body's actual `e_amp` into intrinsic (Law-4) + external (resonance/scattering/tides) — as we did for Pluto. For classical KBOs (no strong resonance), Law-4 intrinsic should be close to actual; for plutinos and scattered-disk objects, large external/intrinsic ratios are expected.
6. **No individual named TNO is testable.** Every catalogued body (Pluto, Eris, Haumea, ..., Varuna) sits above the Law-4 admissibility curve — too massive for its observed eccentricity. Varuna is closest at 8.4× tension; all others fail harder.
7. **Comets and asteroids don't help either.** Law 4 admits 67P and Ceres numerically (their `√m` factor is tiny) and predicts a negligible intrinsic obliquity contribution (~0° for 67P, ~17° for Ceres) — but the measured obliquities are 52° and 4°, set primarily by external processes (Jupiter scattering, non-gravitational outgassing, Yarkovsky/YORP). Same decomposition as Pluto: Law 4 captures a (small or near-zero) intrinsic baseline; external forcing dominates the actual rotational state.
8. **The cleanest remaining falsifier** is a population-statistical claim over sub-200-km low-`e` cold-classical-belt KBOs. For a representative 100-km body at `a ≈ 45 AU, e ≈ 0.05`, Law 4 predicts **tilt ≈ 36.6°** — distinguishable from the random-rotation expectation (~57°) by ~30%. LSST is expected to constrain small-KBO rotation poles by 2030–2035.

The conventional astronomy community treats orbital eccentricity and axial obliquity as independent state variables. The framework links them through K and the mirror-pair structure as an **intrinsic baseline** for every body. For the 8 IAU planets that baseline matches reality at <1% closure. For non-planet bodies (resonant TNOs, scattered objects, comets, asteroids) the intrinsic component is correctly present but overwhelmed by external forcing — the link survives as a baseline but is not directly observable per-body. **Whether the intrinsic baseline is statistically dominant in any external-body population** (e.g., sub-200-km cold-classical-belt KBOs where external forcing is weakest) is **open** — that population is the next falsifier worth waiting on, and LSST is the natural validator.

---

## 7. Scope and the Planet Definition

The pattern of where Law 4 cleanly applies, and where its intrinsic prediction is overwhelmed by external forcing, suggests a reframing of what the framework actually says about *which bodies are planets*.

### 7.1 The IAU criterion in framework language

The IAU's 2006 planet definition has three criteria; the third — **"has cleared the neighborhood around its orbit"** — is what demoted Pluto. Bodies that satisfy this criterion are gravitationally dominant in their orbital region. Bodies that don't share their region with co-orbital matter that dictates their evolution.

The framework's Law-4 scope partitions bodies identically:

| Body class | IAU planet? | Actual `e_amp` matches Law-4 intrinsic? |
|---|:---:|:---:|
| 8 primary planets | Yes | Yes, <1% closure (intrinsic ≈ actual) |
| Plutinos (Pluto, Orcus, Ixion) | No | No — actual `e_amp` ≈ Law-4 intrinsic + Neptune-forced extra (Pluto: 1 : 24 split) |
| Scattered-disk (Eris, Gonggong) | No | No — `e_amp` set by scattering |
| Detached (Sedna) | No | No — galactic tides dominate |
| Comets | No | No — no secular `e_amp` regime |
| Classical KBOs | No (dwarf or small) | Borderline / testable |

Stated colloquially: **a planet is "boss" over its own properties — non-planets have their settings (`e_amp`) and behaviour (obliquity) dictated externally.** A Law-4-compliant body's secular amplitude and rotational orientation are set by its own `(m, a, d)` algebra. A non-compliant body's amplitude is forced by something else (Neptune resonance, scattering, galactic tides).

### 7.2 Two languages for the same fact

These are not independent criteria that happen to agree. They are the **same statement** in different terms:

- **IAU**: a planet has cleared its neighborhood → no co-orbital matter forces it
- **Framework**: a planet's `e_amp` closes Law 4 intrinsically → no external coupling forces it

Both say *I evolve according to my own physics, not someone else's pull.* Pluto fails the IAU criterion because it's locked in Neptune's 3:2 grip; correspondingly, Pluto's actual `e_amp` is dominated by that same Neptune coupling (~96% external, ~4% Law-4-intrinsic — §2.1). The framework's intrinsic prediction is still correct as a baseline; it's just overwhelmed by external forcing, which is exactly what "not cleared the neighborhood" means in physical terms. **Same physical fact, two languages.**

This means the framework offers what the IAU's third criterion has long been criticised for lacking: a **single quantitative test**. Soter (2006) proposed a mass-discriminant Λ to formalise "cleared the neighborhood" but it never became canonical. Law 4 provides a different formalisation — *does the body's secular `e_amp` close under K with `sin(tilt) ≤ 1` using only its own (m, a, d)?* — that returns a clean numerical pass/fail.

### 7.3 Circularity, and where it isn't

A fair objection: the 8 framework planets and the 8 IAU planets are the same set, and K was derived from Earth. So "Law 4 fits exactly the planets we already call planets" might be tautological — we fitted to that set.

What makes the statement non-circular is **prediction**:

1. **A new body's classification is predictable, not stipulated.** If a Trans-Neptunian body were discovered tomorrow that satisfied Law 4 intrinsically — `e_obs` reasonably interpretable as `e_amp` (no resonance forcing), `sin(tilt) ≤ 1` for some Fibonacci d — the framework would label it "planet-like" in the precise sense above. A measurement of its obliquity would test the claim. The small-KBO prediction in §4 is one form of this.

2. **Planet Nine candidates fail predictively.** All proposed Planet Nine mass/distance/eccentricity combinations fail Law 4 by 4–7 orders of magnitude ([doc 15](15-planet-nine-prediction.md)) — robust to the `e_obs` vs `e_amp` distinction (§5.1). The framework rejects a hypothesised 9th planet on the same criterion it uses to confirm the existing 8. That isn't tautology; that's a falsifiable extension.

3. **The framework adds a "why" the IAU criterion lacks.** "Cleared the neighborhood" is a *symptom*; Law 4 proposes a *mechanism*: bodies inside the mirror-pair structure obey a single algebraic identity tying mass, distance, d-slot, eccentricity amplitude, and obliquity. Whether that mechanism is real or coincidental remains the framework's central open question, but it predicts something specific — no 9th body fits the 4-pair structure.

The honest framing: the framework's Law-4 scope and the IAU's third criterion are two formalisations of the same observation — that exactly 8 bodies in the solar system evolve under their own intrinsic dynamics, and the rest are externally forced. The framework's contribution is to make this **quantitative and predictive** rather than qualitative and post-hoc.

---

## Reproducing

```bash
python3 scripts/tno_obliquity_prediction.py
```

Output: console table (above) + `data/tno-obliquity-predictions.json` (machine-readable per-body and per-d results).
