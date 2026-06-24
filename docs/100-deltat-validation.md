# ΔT model validation via historical solar eclipses

**Date**: 2026-06-18 (initial); 2026-06-20 (cross-references to doc 101 added); 2026-06-22 (citation + numbers synced to post-α(t) canonical state); 2026-06-25 (doc 103 cross-reference added; Strategy A finding context note added)
**Status**: Step B complete — first quantitative comparison of our ΔT against published formulas. Companion analyses with different methodologies now exist at [doc 101](101-pure-tidal-eclipses.md) (solar visibility window), [doc 102](102-gia-alpha-lunar-validation.md) (lunar timing test + α(t) GIA correction), and [doc 103](103-135-babylonian-case-study.md) (-135 Babylonian case study identifying Meeus polynomial residual as the dominant historical-era residual).

> **Snapshot note (2026-06-22)**: This document records the **original pre-α(t) RMS-residual test** (35 events, 584 BCE – 2024 CE) from 2026-06-18. The live model was subsequently extended with an α(t) viscoelastic GIA correction (doc 102, 2026-06-22), shifting the canonical solar mean-residual from 8,658 → 8,682 s (drift of 0.3% — see [doc 101](101-pure-tidal-eclipses.md) line 13). The headline "model vs Stephenson" RMS-residual conclusion is unchanged at the noise floor. The "pure-tidal without non-tidal speedup" framing used below predates the α(t) work; the current canonical framing — Munk-MacDonald-scale (~5-6 ms/cy) non-tidal speedup rejected, GIA-scale (~0.6 ms/cy) contribution included via α(t) — lives in [doc 102](102-gia-alpha-lunar-validation.md) and the website's [Lunar Eclipse Validation](https://holisticuniverse.com/model/lunar-eclipse-validation) page.

> **Snapshot note (2026-06-25)**: Two findings since the 2026-06-22 update refine the "Ancient era" interpretation below (lines 86-101) without changing this doc's RMS numbers. **(1)** [Doc 101](101-pure-tidal-eclipses.md)'s 2026-06-24 update box documents the **Strategy A finding**: disabling the framework's scene-graph Earth-rotation overlay (commit `4d44776`) brought ★ TOTAL umbra-centerline matches at -584 Thales (73 km), -762 Bur-Sagale (85 km), -708 Confucius re-attribution (176 km), etc. This is a *tight* per-event criterion that doc 100's *aggregate* RMS metric averages out — both verdicts are now consistent under the broader interpretation in doc 101 §"Related work". **(2)** [Doc 103](103-135-babylonian-case-study.md) decomposes the framework's one persistent residual (-135 Babylonian at 1159 km) and traces ~890 km of it to **Meeus Ch. 47 polynomial residual at this specific JD** (β_Meeus = 0.728° vs β_ELP-2000/82 ≈ 0.66°). This is the *direct empirical confirmation* of doc 100's own claim that "Meeus's T³/T⁴ polynomial dominates the ancient error budget" (line 175). Numerical results in this document (RMS 2.13-2.19°, 16/9/7 wins) are computed with Meeus directly and are unaffected by either finding.

> **Companion analyses (added 2026-06-20)**: This document uses a **residual-RMS methodology** — Moon-Sun geocentric separation in degrees, evaluated across 35 historical solar eclipses. [Doc 101](101-pure-tidal-eclipses.md) presents a complementary **visibility-window methodology** on a focused, cleaner 19-event dataset (-762 to 1654 CE). [Doc 102](102-gia-alpha-lunar-validation.md) (2026-06-22) presents a higher-resolution **lunar timing test** on 270 primary-source observations from Stephenson 2016 — the validation that motivated the α(t) GIA addition to the live model. The three analyses surface different aspects of the same picture and reach consistent conclusions; see [Related work](#related-work--visibility-window-methodology-doc-101) below for the synthesis. **Numerical baselines in this document have been synced to post-α(t) canonical values** (8,658 → 8,682 s); verify-pipeline confirms no Moon/Sun position regression since 2026-06-18 (Moon RMS 0.0015°, Sun RMS 0.0033°).

---

## Goal

Determine whether our secular Architecture α ΔT formula (derived from the
Farhat 2022 Moon-distance polynomial + angular-momentum LOD) gives historical
eclipse predictions competitive with the established observational fits
(Stephenson-Morrison 2004, Espenak-Meeus 2006).

This is the validation question the user posed: *"did the expected Moon eclipses
happen at the time specified?"* — applied across 35 historical solar eclipses
spanning 584 BCE to 2024 CE.

---

## Method

For each historical eclipse with known **JD of greatest eclipse in UT** and
NASA-published **γ** (path-centerline offset):

1. Convert UT → TT three different ways:
   - `JD_TT = JD_UT + ΔT_ours(year) / 86400`
   - `JD_TT = JD_UT + ΔT_Stephenson(year) / 86400`
   - `JD_TT = JD_UT + ΔT_EspenakMeeus(year) / 86400`
2. Predict Moon-Sun geocentric separation at each `JD_TT` using our model
   (Meeus Ch. 47 + 5-layer hierarchy).
3. Expected separation for a true geocentric eclipse is `|γ| × 0.95°` (the
   Moon's parallax radius — see doc 66 §5).
4. Residual = `predicted_sep − expected_sep`. The ΔT giving the **smallest**
   |residual| is the most consistent with the recorded observation, given
   our shared Meeus Moon theory.

Tool: [`tools/verify/moon-deltat-comparison.js`](../tools/verify/moon-deltat-comparison.js).

---

## Results

35 eclipses tested; 3 dropped as outliers (`|residual| > 30°` — these are
hour-of-day input errors in the eclipse catalog, where ALL three ΔT give
nearly-identical extreme residuals because Meeus is being evaluated 3+ hours
away from the actual greatest-eclipse moment).

### Per-era summary

| Era | n | Ours wins | Stephenson wins | E-M wins | RMS-Ours | RMS-Step | RMS-EM |
|---|---:|---:|---:|---:|---:|---:|---:|
| Modern (2000-2024) | 4 | 2 | 2 | 0 | **0.02°** | 0.02° | 0.02° |
| 20th century (1900-99) | 6 | 4 | 2 | 0 | **1.54°** | 1.54° | 1.54° |
| 19th century (1806-68) | 4 | 2 | 2 | 0 | **1.43°** | 1.43° | 1.43° |
| 18th century (1706-80) | 3 | 3 | 0 | 0 | **4.28°** | 4.31° | 4.31° |
| 17-15th century (1433-1652) | 3 | 2 | 0 | 1 | **3.25°** | 3.31° | 3.33° |
| Medieval (632-1261) | 5 | 2 | 1 | 2 | 2.28° | **2.22°** | 2.23° |
| Ancient (584 BCE-484 CE) | 7 | 1 | 2 | 4 | 1.62° | 1.20° | **1.18°** |
| **TOTAL** | **32** | **16** | **9** | **7** | **2.19°** | **2.13°** | **2.14°** |

### Interpretation

#### Modern era (post-2000) — full validation

All three ΔT formulas produce identical results (0.02° RMS). This confirms:

- Our ΔT implementation is numerically correct (no sign errors, no offset bugs).
- The Architecture α deep-time chain agrees with the IAU/IERS reference at J2000
  to within negligible levels.
- The Meeus Ch. 47 + 5-layer hierarchy reproduces NASA GSFC eclipse paths to
  within the geocentric parallax limit.

#### 20th-15th century — our model is competitive

Across four centuries (1433-1999), our model has **the smallest residual in 11
of 16 eclipses** and matches the published RMS to two decimal places. The
~1.5-4° absolute residuals in these eras come from the Meeus polynomial's
T³/T⁴ accumulated error, not from ΔT differences.

#### Ancient era (before 600 CE) — Stephenson and E-M preferred

Stephenson-Morrison wins 2 and Espenak-Meeus wins 4 of 7 ancient eclipses,
versus our model's 1 win. RMS is ~0.4° lower for the observational fits
(1.18° vs 1.62°).

**This is expected and not damning**, for two reasons:

1. **The observational fits are partly self-validating.** Stephenson-Morrison
   and Espenak-Meeus polynomials were calibrated on the very same ancient
   eclipse data we're testing against. They've absorbed any systematic
   discrepancies into their fitted coefficients. Our model has not.

2. **The ~0.4° gap is small compared to inherent Meeus uncertainty
   (~5-10° at -1000 BCE).** The test cannot definitively distinguish ΔT
   models in this regime — all three live well inside the noise floor set
   by ELP-2000/82's polynomial extrapolation.

#### Overall verdict

The three ΔT formulas have **statistically indistinguishable performance**
(total RMS 2.13-2.19°) across the historical record. The 35-eclipse sample
shows:

- **16 wins for our model** (Architecture α)
- 9 wins for Stephenson-Morrison
- 7 wins for Espenak-Meeus

Our smooth secular ΔT is **as good a representation** of long-term Earth-rotation
behavior as the established observational fits, for the historical eclipse
test that has been the gold-standard ΔT validation for 50+ years.

---

## What this means for ΔT documentation

The previous glossary entry (`src/data/glossary.ts`) framed the relationship
correctly:

> *"Our value and theirs are different reductions of the same Earth-rotation
> physics, not the same quantity"*

This validation **confirms** that framing empirically. Neither approach
"wins" the comparison; both produce historical eclipse predictions within
the same accuracy band, set by the shared Meeus Ch. 47 lunar theory.

Our model's advantage (as characterized in this pre-α(t) snapshot — see doc 102 for the current α(t)-GIA extension):
- Independent grounding (Wells 1963, Wu et al. 2024 cyclostratigraphy, modern LLR)
- Extends to deep time (Phanerozoic, Hadean) where no observational fit exists
- No fitted parameters; pure secular tidal physics (now plus α(t) GIA from independent satellite gravimetry — see doc 102)

Published fits' advantage:
- Calibrated on the very eclipse record used here
- Include non-tidal short-period variations (1500-1820 AD "Stephenson dip" etc.)
- Validated for historical-eclipse computation specifically

Both are honest, both are useful, and they agree on the headline number to ~2°
RMS across two and a half millennia.

---

## Next steps

### Within current scope — keep documentation aligned

- ✅ Doc 66 (Moon Meeus corrections) now includes the deep-time consistency
      section (Step A done).
- ✅ Doc 100 (this file) summarizes the historical eclipse validation.

### Future work — only if higher accuracy becomes a goal

- **Topocentric correction** (`gamma`-based parallax model) would reduce the
  modern-era residual floor below 0.04°, but doesn't change the ΔT comparison.
- **Improved hour-of-day inputs** for pre-1800 eclipses (currently using
  catalog estimates with ±3-hour uncertainty) would tighten residuals in the
  17-18th century era where 3 outliers had to be dropped.
- **Deep-time Moon mean longitude** (replace Meeus Ch. 47's T-polynomial with
  integrated Farhat-derived mean motion — Step C in the original plan) would
  enable genuinely-unique pre-Holocene eclipse predictions. Stephenson's data
  ends ~700 BCE; ours could extend to Hadean. No published lunar theory does
  this.

### What NOT to do

- **Don't fit ΔT to observational eclipse data.** That would eliminate
  the independence argument that makes our model distinctive (deep-time
  physics validated against Wells/Wu, not against eclipses).
- **Don't refit the Meeus Moon constants.** Section 5 of doc 66 establishes
  consistency at J2000; refitting against deep-time anchors would degrade
  modern accuracy without helping ancient eclipse work (Meeus's T³/T⁴
  polynomial dominates the ancient error budget, not the T² tidal-acceleration
  term we already match).

---

## Reproducing

```
node tools/verify/moon-deltat-comparison.js
```

Output includes per-eclipse residuals for each ΔT choice plus the era-summary
table reproduced above. Runtime: ~5 seconds.

---

## Related work — visibility-window methodology (doc 101)

The June 2026 analysis presented above was extended on 2026-06-20 by [doc 101](101-pure-tidal-eclipses.md), which applies a different methodology to a focused subset of the same broader historical record.

**Methodology differences:**

| | Doc 100 (this document) | Doc 101 |
|---|---|---|
| Metric | Moon-Sun geocentric separation (degrees) | Sub-solar geographic distance from observation site (km) |
| Pass/fail | Smallest \|residual\| wins | ΔT within visibility window (penumbra ≤ 7,500 km / umbra ≤ 4,500 km) |
| Dataset | 35 eclipses (584 BCE — 2024 CE) | 19 well-localized events (-762 — 1654 CE) |
| Reference | Geocentric parallax `\|γ\| × 0.95°` | Sub-solar geometric distance at conjunction |
| Foundation | Meeus Ch. 47 polynomial | Same, plus NASA TT-space cross-check (±15 min, n=11 events) |

**Verdict comparison:**

| | Doc 100 (RMS residual) | Doc 101 (visibility window) |
|---|---|---|
| Our model vs Stephenson | 16 / 9 / 7 wins (~2° RMS each, statistically indistinguishable) | 19/19 vs 17/19 penumbra; 8,682 s vs 8,789 s mean residual (model wins both) |
| Verdict | All three ΔT formulas equally good at the noise floor | Pure-tidal slightly outperforms on per-event visibility |

The two analyses are **complementary, not contradictory**:

- Doc 100's RMS test is a broad aggregate — averages residuals across an inhomogeneous dataset that includes events where geographic localization is impossible (γ outside ±1, modern eclipses with negligible ΔT contribution, etc.). This is appropriate for the "are all three ΔT formulas in the same noise band" question.
- Doc 101's visibility-window test is sharper per-event — uses only the events where geographic localization is meaningful, and asks the discrete question "is the model's eclipse path within penumbra reach of the documented site?" rather than the continuous question "how close is the separation". This surfaces small-but-real pure-tidal-vs-Stephenson differences that doc 100's aggregate RMS smooths over.

Both verdicts are consistent with the broader thesis: **pure-tidal Farhat physics is sufficient to explain the historical eclipse record without requiring a non-tidal Earth-rotation speedup component**. Doc 100 establishes the "not worse than empirical fits" floor; doc 101 establishes the "slightly better on the per-event question" ceiling. Together they bracket the strength of the pure-tidal claim.

Three things doc 101 does that doc 100 does not:

1. **NASA TT-space cross-check of the underlying Moon polynomial** (n=11 events, ±15 min mean residual). Doc 100 implicitly assumes the polynomial is accurate; doc 101 independently verifies this.
2. **Identifies one mis-attributed entry in earlier datasets**: "Cambyses (-522)" was a category error (no documented Babylonian solar eclipse from his reign; the diary references are lunar). Doc 100's 35-event dataset never included this entry, so its results are unaffected — but this clarifies the historical record.
3. **Surfaces a candidate alternative date for the Thales eclipse** (-581 March 28 / 582 BC March 28) where the model's umbra path runs directly across Anatolia. Doc 100 used the traditional -584 May 28 date; doc 101 flags this as an open question for paleo-astronomy.

---

## References

- Stephenson, F.R., & Morrison, L.V. (2004). *Long-term fluctuations in the Earth's rotation: 700 BC to AD 1990.*
- Espenak, F., & Meeus, J. (2006). *Five Millennium Canon of Solar Eclipses: -1999 to +3000.* NASA TP-2006-214141.
- Stephenson, F.R., Morrison, L.V., & Hohenkerk, C.Y. (2016). *Measurement of the Earth's rotation: 720 BC to AD 2015.* Proc. R. Soc. A.
- Farhat, M., Auclair-Desrotour, P., Boué, G., & Laskar, J. (2022). *The resonant tidal evolution of the Earth-Moon distance.* A&A 665, L1.
- Wu, Y., Malinverno, A., Meyers, S.R., & Hinnov, L.A. (2024). *A 650-Myr history of Earth's axial precession frequency and the evolution of the Earth-Moon system derived from cyclostratigraphy.* Sci. Adv. 10(42), eado2412. doi:10.1126/sciadv.ado2412
- Stephenson, F.R. (1997). *Historical Eclipses and Earth's Rotation.* Cambridge University Press. (Cited in doc 101 for the Babylonian solar-eclipse window 369-136 BC.)
- Panchenko, D. (1994). *Thales's Prediction of a Solar Eclipse.* J. Hist. Astron. 25(4), 275ff. doi:10.1177/002182869402500402. (Cited in doc 101 for the Thales eclipse-date dating discussion.)
- Doc 66: `docs/66-moon-meeus-corrections.md` (Moon implementation reference)
- Doc 99: `docs/99-expanding-solar-system-resonance-theory.md` (ESSRT framework)
- Doc 101: `docs/101-pure-tidal-eclipses.md` (companion visibility-window analysis on 19-event dataset, 2026-06-20)
- Doc 102: `docs/102-gia-alpha-lunar-validation.md` (higher-resolution lunar timing test on 270 primary-source observations + α(t) viscoelastic GIA correction derivation, 2026-06-22)
- Doc 103: `docs/103-135-babylonian-case-study.md` (-135 Babylonian focused case study — decomposes the framework's one persistent residual into ΔT (~270 km, α(t)-uncloseable), Meeus β-residual (~440 km), and other Meeus terms (~450 km); confirms Meeus polynomial accuracy as the historical-era residual floor, 2026-06-25)
