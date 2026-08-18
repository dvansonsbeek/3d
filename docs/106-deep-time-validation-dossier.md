---
docVersion: 1.0
modelVersion: v11.0
coefficients: sha256:17f2ead87bad401e
status: current
---

# 106 — Deep-Time Validation Dossier

The single entry point for the question *"how well does the model match the
geological and historical record, and how would we know if it stopped?"*
Every claim here is one of three things: **gate-backed** (a script in the
enforced chain fails if it breaks), **artifact-backed** (a generated result
whose freshness `check:artifacts` guards), or **correspondence** (an observed
pattern the null tests could not promote to validation — stated as such).
Nothing in this document is a number typed by hand: every value is a
registry-owned marker span, recomputed from the engine by `docs:values`.

The honest-miss rows are load-bearing. A dossier that only lists agreements
is an advertisement; the documented deviations (§D) are asserted by the same
gates as the agreements — an unexplained *improvement* fails the chain too,
because a miss that silently becomes a hit means the formula changed.

---

## A. Rotational and tidal chronology — gate-backed

The model's H(t)/LOD(t)/Moon-distance curve against the published
paleontological record: **41 anchors** across Wells 1963 (coral growth
bands, ×9), de Winter 2020 (rudist bivalve), Pannella 1972 (bivalves), a
Triassic compilation, Williams 2000 (Elatina tidal rhythmites),
Mitchell–Kirscher 2023 (multi-proxy LOD), Wu et al. 2024 (34-record
cyclostratigraphic inversion, LOD + Moon distance), the Patterson 1956 /
rigid-Roche consistency check, and the mid-Precambrian set matched by the
Driver-1½ regime-aware recession history (Farhat 2022's Joffre, Weeli
Wolli and Moodies proxies plus Zhou 2024's three paired distance+LOD
epochs, Meyers–Malinverno 2018 and Nanfen 2023 — see
[doc 99 §mid-Precambrian window](99-expanding-solar-system-resonance-theory.md#the-mid-precambrian-window-135-ga--the-regime-aware-recession-history-driver-1)).

| Statistic (days/yr anchors) | Phanerozoic (0–500 Ma) | All (0–620 Ma) |
|:---|:---:|:---:|
| Mean absolute deviation | **<!--v:paleoMadPhanPct-->0.18<!--/v-->%** | <!--v:paleoMadAllPct-->0.61<!--/v-->% |
| RMS deviation | <!--v:paleoRmsPhanPct-->0.24<!--/v-->% | <!--v:paleoRmsAllPct-->1.55<!--/v-->% |
| Within 1% | <!--v:paleoWithin1Phan-->12/12<!--/v--> | <!--v:paleoWithin1All-->13/14<!--/v--> |

Flagship: Wells's Devonian 400 days/yr vs the model's
<!--v:daysPerYearAtDevonian-->399.96<!--/v--> (H at 380 Ma =
<!--v:hAtDevonian-->306,189<!--/v--> yr, vs <!--v:H-->335,317<!--/v--> at
J2000) — with **zero free parameters** in the H/13 coupling: the deep-time
trajectory is calibrated to Farhat 2022 and the modern LLR recession rate,
never to the fossil data it is tested against.

- Anchors + sources + tolerances: [`data/paleo-validation-anchors.json`](../data/paleo-validation-anchors.json)
- Gate: `tools/verify/paleo-anchors.js` (in `npm run test:verify` and CI)
- The single-equation cross-check binding the two proxy classes: the exact
  day-count invariant `H × (sidYear_s/LOD) × (AU₀/AU)² = TOTAL_DAYS_IN_H × H₀/(H₀−13)`
  ([doc 99 §near-invariant](99-expanding-solar-system-resonance-theory.md))
  requires a day-count and a lattice period measured at the *same* epoch to
  agree — the Devonian passes it (Wells's ~400 days/yr against the observed
  ~37 kyr obliquity beat, Meyers 2008 / Boulila 2018).
- Full tables and the per-anchor discussion: [doc 99 §Validation](99-expanding-solar-system-resonance-theory.md#validation-against-published-paleontological-measurements)
- The Hadean endpoint: the Farhat polynomial extrapolated to the Patterson
  1956 Pb–Pb age places the Moon at
  <!--v:anchorHadeanRochePred-->1.48<!--/v--> R⊕ — the rigid Roche limit at
  the giant-impact epoch, an unfitted consistency check across 4.5 Gyr.

## B. Cyclostratigraphy and climate spectra — artifact-backed

The L1 integer-divisor lattice (8H/n) against the Cenozoic isotope record:

- **Cenogrid spectral evidence** — MTM F-tests and windowed spectra of the
  Westerhold 2020 CENOGRID stack against the 8H lattice:
  [doc 91](91-milankovitch-evidence.md) with generated artifacts
  (`data/milankovitch-8h-cenogrid-*.json`, `data/cenogrid-mtm-ftest.json`)
  under `check:artifacts` freshness.
- **Devonian obliquity beat** — the n=65 band predicted at 37.68 kyr at the
  Devonian (8.7% shorter than modern) matches published 36–38 kyr
  observations (Meyers 2008, Boulila 2018): [doc 99 §Predicted L1 periods](99-expanding-solar-system-resonance-theory.md#predicted-l1-periods-at-each-age--obliquity-band).
- **The 405-kyr caveat, stated plainly** — the Laskar g₂−g₅ eccentricity
  eigenbeat is *off* the 8H lattice; the record's 405-kyr power is
  carbon-cycle amplified and is not claimed for the lattice:
  [doc 93](93-l1-attribution-reference.md).
- **Discriminating power, stated plainly** — the 66-Ma record cannot
  distinguish a fixed lattice from an H(t)-rescaled one (2.4σ):
  [doc 98](98-lattice-mechanism.md). The LOD-climate correlation fails its
  null tests and is recorded as **open correspondence, not validation**:
  [doc 95](95-climate-summary.md), [doc 94](94-insolation-null-test.md).

## C. Historical era — gate- and artifact-backed

- **Babylonian eclipse case study (−135)** — the framework places the
  totality path <!--v:babylon135BestGapKm-->223<!--/v--> km from Babylon at
  ΔUT <!--v:babylon135BestDeltaUT-->-0h54<!--/v--> (framework
  <!--v:babylon135FrameworkUT-->06:05<!--/v--> vs documented
  <!--v:babylon135DocumentedUT-->06:14<!--/v-->):
  [doc 103](103-135-babylonian-case-study.md), eclipse-audit artifacts under
  freshness guard.
- **ΔT vs Stephenson 2016** — the framework ΔT stack against the published
  polynomial, served live as an api cross-validation endpoint
  (`/v1/cross-validation/deltat-stephenson2016`) and pinned by the fit
  metrics ([doc 105](105-dt-stack-flag-audit.md)).
- **Eclipse canon** — the 2024 events (Apr 8 Total, Oct 2 Annular, both
  lunar) are semantic anchors in the `createModel` parity gate
  (`test:model`), recomputed from the shipped physics on every CI run.
- **Lunar alignment** — `tools/verify/lunar-alignment.js` (reproduction
  gate + generator, same convention as eclipse-audit; owns
  `data/lunar-alignment-summary.json`): the model's lunar finder vs the
  NASA 5-Millennium Canon on the TT axis
  (<!--v:lunarCanonMatched-->1,450<!--/v-->/<!--v:lunarCanonEvents-->1,450<!--/v-->
  matched 1600–2200, <!--v:lunarCanonTypeAgree-->1,447<!--/v--> types agree);
  documented visibility regions vs the api observer tier
  (<!--v:lunarVisibilityInsideAgree-->14<!--/v-->/<!--v:lunarVisibilityChecked-->14<!--/v-->
  both directions); the −746 Feb 6 Babylonian partial (magnitude
  <!--v:lunarBabylon746MagnitudeUmbral-->0.911<!--/v--> vs canon
  <!--v:lunarBabylon746CanonMagnitudeUmbral-->0.920<!--/v-->, visible from
  Babylon at <!--v:lunarBabylon746AltitudeDeg-->34.4<!--/v-->°); the
  <!--v:lunarDtBandsN-->267<!--/v--> raw Stephenson-2016 timing reductions
  (framework ΔT mean abs <!--v:lunarDtBandsFrameworkMeanAbsSeconds-->1,212<!--/v--> s —
  statistically identical to Stephenson's own fitted spline at
  <!--v:lunarDtBandsSplineMeanAbsSeconds-->1,211<!--/v--> s, with zero eclipse
  input); the untimed tablets S10–S14 as published ΔT intervals (lunar
  rise/set <!--v:lunarS13FrameworkInside-->7<!--/v-->/<!--v:lunarS13N-->7<!--/v-->
  contained; the −135 Babylon totality window
  [<!--v:lunarDtBoundsBabylon135LowSeconds-->11,220<!--/v-->,
  <!--v:lunarDtBoundsBabylon135HighSeconds-->12,140<!--/v-->] s contains the
  framework's <!--v:lunarDtBoundsBabylon135FrameworkSeconds-->12,012<!--/v--> s);
  and the measured framework-vs-ELP lunar-theory drift
  (Δṅ ≈ <!--v:lunarTheoryDriftDeltaNdot-->0.23<!--/v--> ″/cy²) with the
  PRE-REGISTERED re-reduction prediction pinned before the contact-time
  machinery exists — [doc 102 §per-century convergence](102-gia-alpha-lunar-validation.md).

## D. The honesty ledger — what does NOT validate, asserted anyway

| Item | Status | Where |
|:---|:---|:---|
| Williams 2000 (620 Ma rhythmites) | documented <!--v:anchorWilliams620DeltaPct-->+5.70<!--/v-->% miss of the smooth formula at the Snowball boundary; asserted as a band — an unexplained improvement fails the gate. Regime analysis shows Williams conflicts with Wu's 650 Ma anchor and stays the outlier under every history tried | [doc 99 §Williams](99-expanding-solar-system-resonance-theory.md#the-williams-2000-620-ma-discrepancy--honest-discussion) |
| The thermal-tide pump mechanism (Driver 1½) | the mid-Precambrian window is now MATCHED by the shipped regime-aware history (§A), but the pump mechanism stays contested in the literature: Mitchell–Kirscher 2023 argue a resonance-held stall, Zhou 2024 argue the Lamb resonance is unlikely. The fit lets the data decide (partial pump, zero disfavoured ~2.4σ; the factor×window product is the constrained quantity). The pre-regime quartic's −26%/−37% divergences are preserved in git history and in the probe script | [doc 99 §mid-Precambrian window](99-expanding-solar-system-resonance-theory.md#the-mid-precambrian-window-135-ga--the-regime-aware-recession-history-driver-1), `tools/explore/farhat-divergence-probe.js` |
| Wu 2024 Pangea interval (200–500 Ma Moon rows) | the smooth Farhat polynomial cannot capture the supercontinent-era high-dissipation recession; deviations asserted as bands | [doc 99 §Pangea](99-expanding-solar-system-resonance-theory.md#the-pangea-high-tidal-dissipation-interval-the-mid-range-mismatch) |
| Saturn Laplace–Lagrange bound | the model's documented physical-constraint failure (verify-laws 44/45; `allPass: false`) — distinct from the Config-7 mirror uniqueness, which holds | `tools/verify/verify-laws.js`, CLAUDE.md §falsification |
| LOD–climate correlation | fails every null test → open correspondence, not validation | [doc 95](95-climate-summary.md) |
| Lattice vs H(t) discrimination | 2.4σ — the 66-Ma record cannot decide | [doc 98](98-lattice-mechanism.md) |
| Uniform secular solar drift | bounded at r = −0.13 ± 0.09 ms/cy; a uniform −0.5 is disfavoured ~4σ | fit-anchor documentation |
| The falsification criterion | the shipped configuration must remain the *unique* mirror-symmetric deep-analysis candidate among 7,558,272; checks 46–50 of verify-laws | CLAUDE.md §falsification |

## Re-running everything

```
npm run test:verify     # the gate suite, incl. paleo-anchors
npm run check           # the full enforced chain
```

`/gates` runs the standalone model checks. The anchor gate alone:
`node tools/verify/paleo-anchors.js`.
