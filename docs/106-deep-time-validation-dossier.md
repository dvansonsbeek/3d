---
docVersion: 1.0
modelVersion: v26.2
coefficients: sha256:ff77fbc9baa370e4
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

The model's T_p(t)/LOD(t)/Moon-distance curve against the published
paleontological record: **43 anchors** (41 chronology anchors plus the two
precession rows at 1.4 and 2.46 Ga) across Wells 1963 (coral growth
bands, ×9), de Winter 2020 (rudist bivalve), Pannella 1972 (bivalves), a
Triassic compilation, Williams 2000 (Elatina tidal rhythmites),
Mitchell–Kirscher 2023 (multi-proxy LOD), Wu et al. 2024 (34-record
cyclostratigraphic inversion, LOD + Moon distance), and the mid-Precambrian
set — Lantink 2022's Joffre, the Weeli Wolli and Moodies tidalites, Zhou
2024's three precession constants (the measured quantity) with their derived
distance and day-length cross-checks, Meyers–Malinverno 2018 and Nanfen 2023.
Since plan 12 (option A) nothing in the chain is fitted to these rows: the
Earth–Moon distance history is a cited physical input (Farhat et al. 2022,
the AstroGeo22 ephemeris) and every row tests the derived day length,
distance and composed precession on it; the documented bands name their
cause — see [doc 99 §mid-Precambrian window](99-expanding-solar-system-resonance-theory.md#the-mid-precambrian-window-135-ga--the-cited-history-and-the-record).

| Statistic (days/yr anchors) | Phanerozoic (0–500 Ma) | All (0–620 Ma) |
|:---|:---:|:---:|
| Mean absolute deviation | **<!--v:paleoMadPhanPct-->0.48<!--/v-->%** | <!--v:paleoMadAllPct-->0.98<!--/v-->% |
| RMS deviation | <!--v:paleoRmsPhanPct-->0.68<!--/v-->% | <!--v:paleoRmsAllPct-->2.05<!--/v-->% |
| Within 1% | <!--v:paleoWithin1Phan-->10/12<!--/v--> | <!--v:paleoWithin1All-->11/14<!--/v--> |

Flagship: Wells's Devonian 400 days/yr vs the model's
<!--v:daysPerYearAtDevonian-->402.83<!--/v--> (the composed precession period at
380 Ma = <!--v:axialPrecAtDevonian-->21,235<!--/v--> yr) — with **zero free
parameters** in the composed lunisolar coupling: the deep-time
trajectory is calibrated to Farhat 2022 and the modern LLR recession rate,
never to the fossil data it is tested against.

- Anchors + sources + tolerances: [`data/paleo-validation-anchors.json`](../data/paleo-validation-anchors.json)
- Gate: `tools/verify/paleo-anchors.js` (in `npm run test:verify` and CI)
- The cross-check binding the two proxy classes: one tidal chain sets both
  the day count (tropical_year_s/LOD) and the composed precession period, so
  a day-count and a precession constant measured at the *same* epoch must
  agree with it together — the Devonian passes (Wells's ~400 days/yr against
  the Devonian-window precession constants of Wu et al. 2024, 59.5–61.5 ″/yr,
  which the composed clock reads to 2–3 %). (The frozen era clock's
  day-count invariant this bullet once cited is deleted with its counter,
  plan 09 step 7a — [doc 99 record](99-expanding-solar-system-resonance-theory.md#the-frozen-era-clocks-day-count-invariant-device-tier).)
- Full tables and the per-anchor discussion: [doc 99 §Validation](99-expanding-solar-system-resonance-theory.md#validation-against-published-paleontological-measurements)
- The Hadean endpoint is the input's: the cited history ends at 4,429 Ma
  (Farhat et al. 2022's lunar-age input, 4.425 Ga) with the Moon at
  <!--v:moonDistanceAtHadeanRE-->6.19<!--/v--> R⊕; the former "Roche
  crossing at 4.498 Ga, an unfitted consistency check" was the deleted
  spline's pinned endpoint and is withdrawn (plan 12 option A).

## B. Cyclostratigraphy and climate spectra — artifact-backed

The climate formula's orbital lines against the Cenozoic isotope record (the comb-era measurements below used the integer-label comb; the shipped lines are the physical set, doc 92 §2):

- **Cenogrid spectral evidence** — MTM F-tests and windowed spectra of the
  Westerhold 2020 CENOGRID stack against the comb-era line set:
  the archived doc 91; its scripts and result files were deleted at plan 09
  step 7e ([doc 109 §22](109-model-nbody-engine-and-lattice-test.md) is the record).
- **Devonian obliquity beat** — the composed clock's beat 2π/(ψ̇ − |s₃|)
  reads 31.7 kyr at 380 Ma (vs 41.2 today), consistent with Berger, Loutre &
  Laskar 1992's deep-time solution (29 kyr at 500 Ma) and with the Devonian
  cyclostratigraphic values near 29.5 kyr, and 2–8 % off the Wu 2024
  inferences — the residual attributed to the Pangea-window recession
  history. The former "matches 36–38 kyr (Meyers 2008, Boulila 2018)" was a
  mis-citation of Cretaceous and Eocene records, withdrawn: [doc 99 §Predicted climate lines](99-expanding-solar-system-resonance-theory.md#predicted-climate-lines-at-each-age--obliquity-band).
- **The 405-kyr caveat, stated plainly** — the Laskar g₂−g₅ eccentricity
  eigenbeat was *off* the comb-era grid (it is a line of the shipped physical set); the record's 405-kyr power is
  carbon-cycle amplified and is not claimed for the lattice (the comb-era
  attribution record, doc 93, is archived).
- **Discriminating power, stated plainly** — the 66-Ma record cannot
  distinguish a fixed lattice from a clock-rescaled one (2.4σ; a record —
  the lattice framing is retired): the archived doc 98. The LOD-climate
  correlation fails its null tests and is recorded as **open
  correspondence, not validation**: [doc 94](94-insolation-null-test.md)
  (the capstone doc 95 is archived).

## C. Historical era — gate- and artifact-backed

- **Babylonian eclipse case study (−135)** — the framework places the
  totality path <!--v:babylon135BestGapKm-->152<!--/v--> km from Babylon at
  ΔUT <!--v:babylon135BestDeltaUT-->-0h52<!--/v--> (framework
  <!--v:babylon135FrameworkUT-->06:06<!--/v--> vs documented
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
  <!--v:lunarBabylon746MagnitudeUmbral-->0.915<!--/v--> vs canon
  <!--v:lunarBabylon746CanonMagnitudeUmbral-->0.920<!--/v-->, visible from
  Babylon at <!--v:lunarBabylon746AltitudeDeg-->35.2<!--/v-->°); the
  <!--v:lunarDtBandsN-->267<!--/v--> raw Stephenson-2016 timing reductions
  (framework ΔT mean abs <!--v:lunarDtBandsFrameworkMeanAbsSeconds-->1,214<!--/v--> s —
  statistically identical to Stephenson's own fitted spline at
  <!--v:lunarDtBandsSplineMeanAbsSeconds-->1,211<!--/v--> s, with zero eclipse
  input); the untimed tablets S10–S14 as published ΔT intervals (lunar
  rise/set <!--v:lunarS13FrameworkInside-->6<!--/v-->/<!--v:lunarS13N-->7<!--/v-->
  contained; the −135 Babylon totality window
  [<!--v:lunarDtBoundsBabylon135LowSeconds-->11,220<!--/v-->,
  <!--v:lunarDtBoundsBabylon135HighSeconds-->12,140<!--/v-->] s contains the
  framework's <!--v:lunarDtBoundsBabylon135FrameworkSeconds-->11,982<!--/v--> s);
  and the measured framework-vs-ELP lunar-theory drift
  (Δṅ ≈ <!--v:lunarTheoryDriftDeltaNdot-->0.22<!--/v--> ″/cy²) with the
  PRE-REGISTERED re-reduction prediction pinned before the contact-time
  machinery existed — and now MEASURED against it: the Phase C
  differential re-reduction (69/75 Babylonian observations identified)
  is statistically consistent with the pinned column, χ² = 6.7 over 5
  centuries under the E5 basis — the dLOD/dt stack survives its
  falsification test — [doc 102 §Phase C verdict](102-gia-alpha-lunar-validation.md).
- **The certified Sun** — the eclipse chain's Sun is assembled from the
  model's own dynamics: a mean longitude that integrates the one-source
  tropical year, Kepler's equation of centre on the one-source e(t) and
  ϖ(t) (the banked N-body series), and the derived planetary completion
  (the Sun's long inequalities from the model's own engine), shared by
  all three runtimes. Against JPL Horizons over ±3000 yr it reads
  <!--v:sunVsHorizonsMeanArcsec-->2.50<!--/v-->″ mean / <!--v:sunVsHorizonsSdArcsec-->2.26<!--/v-->″ sd
  (modern sd <!--v:sunVsHorizonsModernSdArcsec-->0.78<!--/v-->″); the Babylon −135 umbra
  track sits <!--v:babylon135BestGapKm-->152<!--/v--> km from the documented
  station — [doc 103](103-135-babylonian-case-study.md). The era-device
  Sun assembly this bullet once described (the H/16 eccentricity
  channel, the H/3 coupling and the cos-ε torque term on the
  two-component obliquity law) is retired.

## D. The honesty ledger — what does NOT validate, asserted anyway

| Item | Status | Where |
|:---|:---|:---|
| Williams 2000 (620 Ma rhythmites) | documented <!--v:anchorWilliams620DeltaPct-->+7.26<!--/v-->% miss of the smooth formula at the Snowball boundary; asserted as a band — an unexplained improvement fails the gate. Regime analysis shows Williams conflicts with Wu's 650 Ma anchor and stays the outlier under every history tried | [doc 99 §Williams](99-expanding-solar-system-resonance-theory.md#the-williams-2000-620-ma-discrepancy--honest-discussion) |
| The mid-Precambrian window (Driver 1½ retired) | the model carries NO thermal-tide pump and no fitted recession regime since plan 12 option A: the distance history is Farhat 2022's ocean-model solution, whose authors' own review concludes the day-length lock "is not supported" once the questionable stromatolite points are dropped. On it the derived precession reads Joffre −1.8 %, Xiamaling −1.0 %, and Zhou 2024's older two sites −6.5 % / −7.2 % (2.5–3.6σ) — the OPEN discrepancy, asserted as bands: either the solution lacks the Mesoproterozoic dissipation peak Zhou suspect or the inferred constants are biased; the model states the gap and does not fit it | [doc 99 §mid-Precambrian window](99-expanding-solar-system-resonance-theory.md#the-mid-precambrian-window-135-ga--the-cited-history-and-the-record) |
| Wu 2024 Pangea interval (200–500 Ma Moon rows) | the smooth Farhat polynomial cannot capture the supercontinent-era high-dissipation recession; deviations asserted as bands | [doc 99 §Pangea](99-expanding-solar-system-resonance-theory.md#the-pangea-high-tidal-dissipation-interval-the-mid-range-mismatch) |
| Saturn Laplace–Lagrange bound | the retired law framework's documented physical-constraint failure — recorded at the integer-law retirement; its instrument is deleted | [doc 109](109-model-nbody-engine-and-lattice-test.md), CLAUDE.md §falsification |
| LOD–climate correlation | fails every null test → open correspondence, not validation | [doc 94](94-insolation-null-test.md) |
| Fixed vs clock-rescaled lattice discrimination (retired framing; record) | 2.4σ — the 66-Ma record cannot decide | doc 98 (archived) |
| Uniform secular solar drift | bounded at r = −0.13 ± 0.09 ms/cy; a uniform −0.5 is disfavoured ~4σ | fit-anchor documentation |
| The former Config-#7 falsification criterion | RETIRED with the integer-law restatement (its instrument is deleted; doc 109 is the evidence record). The current criterion stands on three legs: the deep-time scaling split, historical-era exactness, and two-expansions μ-consistency | CLAUDE.md §falsification, [doc 109](109-model-nbody-engine-and-lattice-test.md) |

## Re-running everything

```
npm run test:verify     # the gate suite, incl. paleo-anchors
npm run check           # the full enforced chain
```

`/gates` runs the standalone model checks. The anchor gate alone:
`node tools/verify/paleo-anchors.js`.
