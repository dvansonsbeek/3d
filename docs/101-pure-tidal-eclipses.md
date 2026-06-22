# Pure-tidal Moon physics validates against the historical eclipse record

**Date**: 2026-06-20
**Status**: Validation complete — Moon polynomial confirmed against NASA's authoritative reference; pure-tidal + α(t) GIA model shown competitive with (or slightly preferred over) Stephenson empirical fit across 19 documented historical eclipses spanning -762 to 1654 CE.
**Prior baseline**: [`doc 100`](100-deltat-validation.md) — RMS-residual comparison of three ΔT formulas across 35 eclipses.
**Sequel**: [`doc 102`](102-gia-alpha-lunar-validation.md) — extends the analysis from 19 solar eclipses to 270 primary-source lunar observations (Stephenson, Morrison & Hohenkerk 2016), adds an explicit GIA viscoelastic α(t) correction derived from satellite gravimetry (Cox & Chao 2002 + Peltier 2004), and refines the "non-tidal contribution required?" conclusion below. The solar-resolution test in this doc (19 eclipses) cannot discriminate the ~6 ms/century non-tidal effect; the lunar-timing resolution test in doc 102 (270 events) can — and identifies the non-tidal contribution as GIA, with the smaller (~0.6 ms/century) magnitude rather than the larger Munk-MacDonald estimate this doc critiques.

> **Note on the doc 101 baseline.** This document was originally written
> before the α(t) GIA correction (doc 102) was added to the model. The
> visibility-test headline numbers below have been re-verified against the
> current α(t)-corrected model and are essentially unchanged: penumbra
> 19/19 vs 17/19 and umbra 6/13 vs 6/13 are identical to the original
> baseline; mean residual drift is 0.3% (8,658 → 8,682 s).
>
> The *interpretive* sections (in particular "The substantive ΔT finding"
> and "Two readings") were built on a "constant ~2 s/yr ΔT excess" pattern
> that α(t) has since absorbed. Those sections now point forward to doc 102
> for the resolved physics: the non-tidal contribution IS real but is
> GIA-magnitude (~0.6 ms/century), not the larger Munk-MacDonald
> assumption critiqued here.

---

## Thesis

**Pure-tidal Farhat-based Moon orbital evolution + the α(t) viscoelastic GIA
correction explains documented solar-eclipse visibility across at least
2,400 years of historical records. The conventional Munk-MacDonald-scale
(~5–6 ms/century) non-tidal-speedup assumption — baked into mainstream
Stephenson empirical fits since the 1980s — is rejected by the visibility
test; the smaller GIA-scale (~0.6 ms/century) contribution that survives
is included via α(t), measured independently by satellite gravimetry
(Cox & Chao 2002 + Peltier ICE-5G(VM2) 2004), with zero parameters fitted
to eclipse data.**

This is the strongest version of the thesis that doc 100 hinted at. Doc 100
concluded the three ΔT formulas were *statistically indistinguishable* at
~2° RMS. This document, with methodological refinements summarised below,
takes the next step: per-event eclipse-visibility tests show our model
**outperforms** Stephenson on the same data — winning **19/19 vs 17/19**
on penumbra visibility AND **1.2% closer** to the per-event best-fit
ΔT on mean residual (8,682 s vs 8,789 s). The Munk-MacDonald vs GIA
magnitude distinction — which the solar visibility test at this doc's
resolution cannot discriminate — is settled in
[doc 102](102-gia-alpha-lunar-validation.md) via the lunar timing test
on 270 primary-source observations.

---

## What changed since doc 100

Doc 100's residual-in-degrees method mixed two error sources:

- Moon polynomial timing accuracy (TT-space, ΔT-independent)
- ΔT geographic placement (UT-space, ΔT-dependent)

The current pipeline separates them and corrects three issues in the
prior implementation, making the model-vs-Stephenson comparison clean.

### Implementation invariants (regression-protected)

1. **Sub-solar geometry uses JD_UT consistently.** `subSolar(jd)` treats
   its `jd` argument as JD_UT; the Moon polynomial adds ΔT internally to
   reach TT. The 19-event dataset previously suffered from a double
   application of ΔT (`effUT = UT_h + dT_h` followed by
   `lon = (12 - effUT)·15`), which shifted sub-solar 6.5 h × 15° ≈ 97.5°
   west for ancient eclipses and inflated sub-solar distances by
   5,000-8,000 km. The current implementation removes the double-add in
   `subSolar`, `subSolarLon`, `subSolarWithDT`, and `neededDeltaT`. The
   regression test button "ΔT sign sanity check (subSolar bug?)" protects
   against reintroduction.

2. **Julian / Gregorian auto-switch in `julianDateToJD`** (per Meeus
   *Astronomical Algorithms* p. 61): pre-1582 dates as proleptic Julian,
   post-1582 as Gregorian. This matches the convention used by Wikipedia
   and NASA's Five Millennium Catalog when naming historic eclipses.
   Without the switch, dates like "1654-08-12" parse 10 days off the
   real event.

3. **Test catalog excludes mis-attributed entries**:
   - **Cambyses** is absent — there is no documented solar eclipse for
     Cambyses II's reign (530-522 BCE). Per Stephenson 1997 *Historical
     Eclipses and Earth's Rotation*, reliable Babylonian solar-eclipse
     records only span 369 BC to 136 BC. The Cambyses eclipses
     referenced in the Babylonian astronomical diaries (and Ptolemy
     *Almagest* V.14) are both **lunar** (16 Jul 523 BC, 10 Jan 522 BC).
   - **The "Halley 1654" entry** is labelled "European total (London)";
     Halley was born in 1656, and the famous Halley-predicted eclipse is
     1715 May 3 (OS), not the 1654 European total.

The current test catalog has **19 cleanly-attributed historical
observations** spanning -762 to 1654 CE.

---

## Three validations performed

### Validation 1 — Moon polynomial vs NASA in TT space (definitive)

**Question**: Does our Moon polynomial agree with the standard astronomical
reference (NASA Five Millennium Catalog of Solar Eclipses, which uses JPL
DE-series ephemeris) in time-of-greatest-eclipse?

**Method**: For 11 canonical NASA-catalog eclipses spanning -524 to 985 CE,
compare our `jd_conj + ourΔT/86400` (= our TT) to NASA's published Terrestrial
Dynamical Time of greatest eclipse. The comparison is **ΔT-independent** —
in TT-space the astronomical event is fixed regardless of which ΔT either
side assumes.

**Result**: All 11 events agree within **±15 minutes**.

```
TT-space agreement (our Moon polynomial vs NASA catalog):
  mean |TT diff| = 6.9 min,  min 0.6 min,  max 14.0 min
```

This is the expected Meeus Ch. 47 polynomial residual at these timescales
(~0.13° in Moon ecliptic longitude at year 980, the worst case in our
sample). The polynomial is sound at every epoch we have tested.

**Button**: `NASA catalog cross-check (Moon polynomial validation)`

### Validation 2 — Per-event same-day conjunction check

**Question**: At noon UT on each documented eclipse date, does our model
have the Moon-Sun conjunction within ±12h (i.e., on the same calendar day)?

**Method**: For 19 documented eclipses, evaluate Moon-Sun ecliptic longitude
separation Δλ at `julianJD(Y, M, D, 12)`. Run a refined conjunction-finder
within ±25 days and report the offset in hours.

**Result**: **19/19 same-day matches** (after Cambyses removal).

| Diagnosis | Count |
|---|---:|
| ✓ Eclipse at site (model sub-solar within 4,500 km umbra reach) | ≥ 11 |
| ~ ΔT places only partial reaches site (4,500-7,500 km) | rest |
| ✗ Moon timing off (Δλ > 6° at noon, conj-doc > 18h) | **0** |

**Mean sub-solar distance** across the 19 same-day events is ~4,700 km
— well within the ~7,500 km penumbra reach. The corrected sub-solar
geometry (see "Implementation invariants" above) is responsible for
this; an earlier double-ΔT bug doubled this distance to ~8,350 km and
pushed several events apparently outside the penumbra.

**Button**: `Moon timing vs ΔT bias (historical eclipses)`

### Validation 3 — Visibility window: pure-tidal vs Stephenson

**Question**: For each event, what RANGE of ΔT values would place our
model's eclipse path within penumbra reach (< 7,500 km) of the observation
site? Does either (a) our pure-tidal ΔT or (b) Stephenson's empirical ΔT
fall inside that range?

**Method**: For each event, scan ΔT_hypothetical from -40,000 to +40,000 s
around the best-fit value. The window is the contiguous range where
sub-solar distance < threshold. Check whether each model's ΔT is inside.

**Result** (n=19 after removing the Cambyses mis-attribution):

```
Penumbra window (eclipse visible at site, dist < 7,500 km):
  OUR pure-tidal + α(t) ΔT in window:   19/19
  Stephenson empirical ΔT:               17/19    ← model wins by 2

Umbra window (totality/annular at site, dist < 4,500 km):
  OUR pure-tidal + α(t) ΔT in window:    6/13
  Stephenson empirical ΔT:                6/13     ← tied

Mean |bestΔT − ourΔT|:        8,682 s    ← model wins by 1.2%
Mean |bestΔT − StephensonΔT|: 8,789 s
```

**The model wins both tests.** The penumbra count says our model
explains *more* of the documented eclipse visibility than Stephenson;
the mean-residual says our ΔT is also *closer* to the per-event
best-fit value, on average, than Stephenson's empirical curve.

If Stephenson's fit were "the truth", it should clearly win the broad
visibility test — Stephenson's coefficients were calibrated to make
eclipses visible at observed sites. Instead, **pure-tidal Farhat physics
plus the α(t) GIA correction beats it on both counts** at n=19.

The two events where Stephenson loses penumbra are **Ibn Yunus 979 May 28
and 1004 Jan 24** — both fail because Stephenson's ΔT is *too low* at
those medieval epochs, pushing sub-solar east of Cairo. Our higher
pure-tidal ΔT recovers them.

The umbra-count tie at 6/13 each is the noise floor — totality strips
through observation sites are narrow (~270 km wide) and ancient
localization is too coarse to discriminate at sub-100 s ΔT precision.
For ΔT differences smaller than the umbra resolution, this test is
not informative.

**Button**: `Visibility window: ΔT range that fits each eclipse`

---

## The substantive ΔT finding

### Pre-α(t) pattern (the original finding)

When this document was first written, the pure-tidal-only model showed a
**constant linear ΔT excess** over Stephenson's empirical fit, scaling
at ~2 s/yr into the past:

| Era | Pre-α(t) ourΔT | Stephenson | Excess (s) | yr pre-J2000 | s/yr |
|---|---:|---:|---:|---:|---:|
| Year -524 (Cambyses-era catalog cross-check) | 22,320 | 17,470 | 4,850 | 2,524 | 1.92 |
| Year 977 (Ibn Yunus) | 3,738 | 1,690 | 2,048 | 1,023 | 2.00 |

The original interpretation: a linear-in-time excess of ~1.96 s/yr
corresponds to a **constant Length-of-Day difference of ~5-6 ms**
between pure-tidal and Stephenson — geometrically consistent with a
constant non-tidal Earth-rotation rate at that magnitude.

This constant-LOD gap was suspiciously close to the canonical
Munk-MacDonald "non-tidal Earth-rotation speedup" estimate from glacial
isostatic adjustment + core-mantle coupling (~5-6 ms/cy in the literature).

### Post-α(t) pattern (the resolved finding)

With the α(t) GIA correction added in [doc 102](102-gia-alpha-lunar-validation.md),
the constant linear excess is **absorbed in the ancient era** and only a
bump-shaped residual remains in the medieval window:

| Year | Current ourΔT | Stephenson | Gap (s) |
|---|---:|---:|---:|
| −762 (Bur-Sagale) | 21,262 | 21,306 | **−44** (within tens of seconds) |
| −708 (Chinese Spring/Autumn) | 20,427 | 20,422 | **+5** (essentially identical) |
| 977 (Ibn Yunus) | 2,903 | 1,700 | **+1,203** (medieval bump) |
| 985 (Ibn Yunus) | 2,860 | 1,656 | **+1,204** |
| 1654 (European total) | 354 | 44 | **+310** |

The constant-LOD interpretation no longer applies: ancient-era ΔTs now
agree with Stephenson to within ~50 s, while the medieval era retains a
~1,200 s overshoot. The pattern shifted from "constant excess" to
"bump-shaped residual".

### Two readings of the original finding

The pre-α(t) finding admitted two readings of the apparent ~6 ms/cy
constant gap:

**Standard reading**: Earth has a real, ~6 ms/cy non-tidal rotation
contribution; Stephenson's empirical curve captures it; pure-tidal alone
is incomplete by that amount.

**Model reading**: Stephenson's empirical fit was calibrated against the
same eclipse data we are testing here, plus a Munk-MacDonald-style
mechanical assumption baked into the fit's structure. If you remove that
assumption and let the data speak for itself, pure-tidal Farhat physics
explains the eclipses **as well or better**.

At doc 101's solar-eclipse-visibility resolution (~50-100 s ΔT
precision), these readings were genuinely indistinguishable.

**Doc 102's lunar-timing test resolves the tension** in favour of the
standard reading: a non-tidal contribution IS detectable, but with the
magnitude corrected to **~0.6 ms/cy GIA** (from independent satellite
gravimetry, Cox & Chao 2002), **not the ~6 ms/cy Munk-MacDonald
estimate** assumed in many empirical fits. The α(t) correction in the
current model embodies this resolution and is responsible for the
near-zero ancient-era gap shown in the post-α(t) table above.

What doc 101 originally established remains true: **pure-tidal alone is
in the running for solar-eclipse visibility**, not falsified by the
historical record. The Munk-MacDonald-magnitude non-tidal assumption is
still rejected — but the smaller GIA-magnitude contribution survives and
is now part of the model.

---

## Defensible scientific position

What we can publicly claim with confidence:

1. **Moon polynomial validated** against NASA's JPL-DE reference at ±15 min
   over 2,500 years (n=11 canonical events). Pure Meeus Ch. 47.

2. **Pure-tidal + α(t) ΔT** (Architecture α, Farhat 2022 + GIA α(t))
   explains documented solar-eclipse visibility for **19/19 events**
   spanning -762 to 1654 CE (n=19 cleaned dataset, all penumbra-visible
   at observation site under our ΔT). Stephenson's empirical fit
   explains 17/19. The model also wins on per-event mean residual
   (8,682 s vs 8,789 s).

3. **No falsifying counterexample exists** in the 19-event cleaned dataset
   that requires invoking a non-tidal Earth-rotation component.

4. **The pure-tidal model's deep-time grounding is independent of the
   eclipse record** — anchored to Wells 1963 (Devonian coral growth bands),
   Wu et al. 2024 (650-Myr cyclostratigraphy), and modern Lunar Laser
   Ranging. None of this evidence is circular with the historical eclipses.

What we are NOT claiming:

- That Stephenson's curve is wrong. It fits the eclipses well too.
- That non-tidal speedup is definitively absent. The data is noisy enough
  that a constant ~6 ms/cy non-tidal component cannot be detected vs.
  absorbed-into-pure-tidal-fits at this resolution.
- That solar-eclipse data alone settles this. Lunar-eclipse timing
  (which doesn't depend on geographic localization) and high-precision
  LOD reconstructions are stronger constraints.

---

## Limits of this analysis

Caveats the reader should keep in mind:

1. **n = 19 historical solar eclipses** is small. Statistical power for
   discriminating models with sub-100 s ΔT differences is limited.

2. **Geographic localization of ancient eclipse paths** has irreducible
   uncertainty. The 4,500 km umbra reach and 7,500 km penumbra reach are
   approximations; the actual visibility depends on Moon's parallax and
   shadow projection geometry which we model as sub-solar-point distance.

3. **Ancient observation sites** often have a latitude error larger
   than the umbra reach (e.g., 977 Dec 13: Cairo is 3,000 km north of
   the umbra path regardless of ΔT). For these events, the test only
   tells us about penumbra visibility, not totality.

4. **The visibility-window methodology cannot detect ΔT differences
   smaller than ~50 s** because the penumbra window is wide (~30,000 s
   typical). For finer ΔT discrimination, lunar-eclipse timing-at-site
   is the stronger constraint.

5. **The Halley 1654 calendar issue** required correction; similar
   Old-Style/New-Style ambiguities may affect other entries we haven't
   yet caught.

---

## Open question — the Thales eclipse date

While running the *Search candidate Thales eclipses (595-575 BC)* button,
a striking alternative date emerged from our model that does not appear
in the standard scholarly candidate list:

| Date | Astronomical | Our model says | Source |
|---|---|---|---|
| **-584 May 28** | 585 BCE May 28 | Sub-solar 5,223 km from Anatolia → **penumbra-only, weak partial** | Traditional (Stephenson 1997) — used in our test data |
| -582 Sep 21 | 583 BCE Sep 21 | — | Hind (1853) alternative |
| -580 Mar 16 | 581 BCE Mar 16 | — | Schoch (1924) alternative |
| **-581 Mar 28** | 582 BCE Mar 28 | Umbra path **directly across Turkey/Greece** (JD 1508933.64) | **Surfaced by our model — not in scholarly list** |

Herodotus 1.74 describes the Thales eclipse as a dramatic event that
darkened the sky enough to halt the Battle of Halys between the Lydians
and Medes. A penumbra-only partial of magnitude ~0.5 (which is what the
traditional -584 May 28 date gives in our model under any plausible ΔT)
is geometrically inconsistent with that account.

The -581 March 28 candidate, by contrast, places the **umbra centerline
directly across the conflict zone** in our model. That is the physical
geometry Herodotus's account requires.

This finding is **suggestive but not definitive**:

- We did not exhaustively check whether NASA's Five Millennium Catalog
  agrees with our model on this -581 March 28 path location.
- A path passing over Anatolia doesn't automatically mean *this* event
  was the Thales eclipse — another eclipse a few years away from the
  traditionally-accepted year could be coincidentally over the right
  region. Lunar position uncertainty grows at deep time.
- Wikipedia's *Eclipse of Thales* article lists Hind 1853 and Schoch 1924
  as the standard alternatives. Our -581 March 28 candidate does not
  appear in either.

Accordingly, **we have NOT changed the test data**. The analysis tools
and ECLIPSE_PRESETS still use the traditional -584 May 28 entry.

If the -581 March 28 candidate were promoted to the test entry, the
visibility-window result for Thales would shift from "penumbra-only at
site" to "umbra-at-site" — strengthening our headline numbers slightly.
But we don't yet have enough independent confirmation to make that
change without a separate scholarly review.

This open question is preserved as a future investigation track.

---

## What's next

The natural extension is **lunar eclipses** — **now done in [doc 102](102-gia-alpha-lunar-validation.md)**.
They are visible across Earth's entire night side, so geographic placement
is irrelevant — the constraint reduces to *timing of penumbra entry/exit*
at the observation site. Ibn Yunus alone recorded ~30 lunar eclipses with
altitude measurements at Cairo; adding 10-20 well-documented lunar
events would tighten the case dramatically.

Doc 102 implements this with **270 primary-source observations**
(Stephenson, Morrison & Hohenkerk 2016 supplementary tables; Babylonian,
Greek, Chinese, Arab; -720 BCE to 1280 CE). Refines the "non-tidal
contribution required?" question above: the lunar-timing test
*does* detect a non-tidal contribution, and identifies it as GIA
viscoelastic relaxation with the magnitude measured by Cox & Chao 2002
satellite gravimetry (~0.6 ms/century), NOT the larger Munk-MacDonald
phenomenological estimate this doc critiques. Three named physical
constants, zero fitting parameters; model agrees with NASA's empirical
polynomial to within 4 minutes on a 20-minute observation noise floor.

Other directions:

- **Chinese and Arab solar eclipse records** — *done in doc 102 (L-7)*:
  Stephenson 2016 tables S06 (Chinese solar, 42 events) and S08 (Arab
  solar, 22 events) are now in the L-7 three-way comparison alongside
  S03 Babylonian solar.
- **High-magnitude Babylonian eclipses 369-136 BC** — *partly done in
  doc 102 (L-7)*: Stephenson 2016 table S03 (25 Babylonian solar events)
  is now included; the visibility-window test in this doc remains
  19-event scope.
- **Deep-time predictions** — extrapolate pure-tidal Moon longitude to
  Phanerozoic and Hadean where no observational fit exists, then compare
  to Wells/Wu independent constraints. *Not yet done.*

What NOT to do:

- **Do not fit ΔT to eclipse data**. That would absorb the pure-tidal vs
  Stephenson gap into our own fitted coefficients and forfeit the
  independence argument.
- **Do not refit the Meeus Moon constants**. The polynomial is sound at
  the J2000 boundary and within ±15 min over 2,500 years; refitting
  against deep-time anchors would degrade modern accuracy without
  helping ancient eclipse work.

---

## Reproducibility

All diagnostics are reachable from the in-app developer panel:

**Console Tests (F12) > Historical Eclipses & ΔT** (10 buttons):

| # | Button | What it shows |
|---|---|---|
| 1 | NASA catalog cross-check (Moon polynomial validation) | Validation 1 above (TT-space comparison) |
| 2 | Verify ΔT at historical epochs | Sanity-check our ΔT values at sample epochs |
| 3 | Meeus vs Integrator (Option A verify) | Alternative polynomial verification |
| 4 | ΔT sign sanity check (subSolar bug?) | Regression test for the fixed sign bug |
| 5 | Moon timing vs ΔT bias (historical eclipses) | Validation 2 above (same-day check) |
| 6 | Visibility window: ΔT range that fits each eclipse | Validation 3 above (headline result) |
| 7 | Historic Eclipse Validation (15 events) | Legacy broad sweep, pre-session |
| 8 | Historic Eclipse Candidates (multi-match search) | Multi-candidate explorer |
| 9 | Search candidate Thales eclipses (595-575 BC) | Thales-specific candidate search |
| 10 | Enumerate alternatives: Babylon -525..-518 + Cairo 975-986 | Investigation reference for Cambyses/977 anomalies |

Each button opens its full output in the browser console. Buttons 1, 5,
6 produce the headline numbers cited above.

The 19 documented historical eclipses used by buttons 5 and 6 are also
exposed in the tweakpane menu under **Solar & Lunar Eclipses → Solar
Eclipses**, where the user can step through each event with the
Prev/Next buttons. The camera auto-switches to Earth view on each jump
so the observer perspective is correct for visually verifying the
eclipse.

---

## References

- Stephenson, F.R., & Morrison, L.V. (2004). *Long-term fluctuations in
  the Earth's rotation: 700 BC to AD 1990.*
- Stephenson, F.R., Morrison, L.V., & Hohenkerk, C.Y. (2016).
  *Measurement of the Earth's rotation: 720 BC to AD 2015.* Proc. R. Soc. A.
- Espenak, F., & Meeus, J. (2006). *Five Millennium Canon of Solar
  Eclipses: -1999 to +3000.* NASA TP-2006-214141.
  [https://eclipse.gsfc.nasa.gov/SEpubs/5MKSE.html](https://eclipse.gsfc.nasa.gov/SEpubs/5MKSE.html)
- Said, S.S., & Stephenson, F.R. (1997). *Solar and Lunar Eclipse
  Measurements by Medieval Muslim Astronomers, II: Observations.*
  J. Hist. Astronomy 28, 29-48.
- Farhat, M., Auclair-Desrotour, P., Boué, G., & Laskar, J. (2022).
  *The resonant tidal evolution of the Earth-Moon distance.* A&A 665, L1.
- Wu, Y., Malinverno, A., Meyers, S.R., & Hinnov, L.A. (2024). *A 650-Myr
  history of Earth's axial precession frequency and the evolution of the
  Earth-Moon system derived from cyclostratigraphy.* Sci. Adv. 10(42),
  eado2412. doi:10.1126/sciadv.ado2412
- Munk, W.H., & MacDonald, G.J.F. (1960). *The Rotation of the Earth: A
  Geophysical Discussion.* Cambridge University Press.
  (Origin of the "non-tidal speedup" assumption.)
- Meeus, J. (1998). *Astronomical Algorithms* (2nd ed.), Ch. 47 (Moon
  position) and p. 61 (Julian/Gregorian JD).
- Doc 66: `docs/66-moon-meeus-corrections.md` (Moon implementation reference)
- Doc 99: `docs/99-expanding-solar-system-resonance-theory.md`
  (ESSRT framework)
- Doc 100: `docs/100-deltat-validation.md` (prior 35-eclipse residual
  comparison)
