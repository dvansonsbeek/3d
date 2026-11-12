---
docVersion: 1.0
modelVersion: v27.14
coefficients: sha256:617134ba66522681
status: current
---

# The residual spectra: is anything periodic left that the model does not carry?

**Purpose.** The model is standard celestial mechanics on two cited histories, integrated on one
axis and gated end to end. Its gates read each residual against a tolerance; none of them had read
the residuals' SPECTRA. This document is the record of that sweep (holisticuniverse plan 32): every
residual series the model produces against an external record, through one spectral harness, with
a pre-registered decision rule — *a line with no external physics standing in two independent
series reopens the theory; none, and the framework stands as what it is, the next model input
being a cited ocean-dissipation history.* Every number in the tables is written by
`tools/docs/render-doc112-tables.mjs` from the governed artifact `data/residual-spectrum-sweep.json`
(`tools/explore/residual-spectra/write-sweep.mjs --write`); the numbers in the prose are the
registry's (`tools/docs/model-values.mjs`, the `residualSweep*`, `lunarCanon*`, `cardinalGate*`,
`josePairRefit*`, `lr04Residual*` and `la2004*` keys).

**The answer.** <!--v:residualSweepSeriesCount-->33<!--/v--> series,
<!--v:residualSweepLinesAboveFloor-->40<!--/v--> lines above the red-noise floor,
<!--v:residualSweepSurvivorsWithoutPhysics-->0<!--/v--> survivors without external physics under
the rule, and <!--v:residualSweepLinesStandingWithPhysics-->0<!--/v--> lines standing with physics
named — the <!--v:residualSweepLinesClosedByTheFollowUp-->1<!--/v--> line that stood when the sweep
was first read (the lunar canon's full-moon-cycle line: the model's lunar perigee and node running
on the ephemeris polynomials' T² without most of their T³) is closed by the follow-up's secular
completion of ϖ and Ω (§7). Every line that stands is one of four known things: a mixing product of
the climate formula's own orbital lines (the state-dependent ice response), a named planetary or
lunar argument of the Sun's longitude whose phase drifts at depth (the Sun tier's windowed
harmonics), two N-body solutions drifting apart by their precession-rate histories, or an
instrument of the gate itself. The sweep also found five things the gates had not, each recorded
below with its measurement: the Jose pair of the ΔT stack is a fit convenience on a smoothed
record; the certified Sun's barycentre term lacks its elliptic sidebands and its Σk ≠ 0 planetary
arguments drift; the Horizons swap gate's cardinal statistic is partly its own interpolation error;
the lunar finder timed opposition where the canon times greatest eclipse (the follow-up's step A);
and under that definition term the model's lunar mean anomaly ran
<!--v:lunarArgumentMpAheadAtMinus1500DegBeforeCompletion-->0.54<!--/v-->° ahead of the ephemeris's
at −1500 (<!--v:lunarArgumentMpAheadAtMinus1500Deg-->-0.04<!--/v-->° since the completion, step B).

---

## 1. The method

One harness for every series (`tools/explore/residual-spectra/spectrum.mjs`): a generalised
weighted Lomb–Scargle periodogram with a floating mean, so irregular records (eclipse timings,
paleo anchors, LR04's 1–5-kyr spacing) and regular ones share one statistic; the frequency grid
from one cycle per span to the pseudo-Nyquist of the median spacing, oversampled four to eight
times; the series' own **spectral window**; and two **noise floors** from 1,000 seeded surrogates
on the same instants — AR(1) noise with the series' lag-one correlation read off its unequal
spacing, and white noise — each floor the 99th percentile of the surrogates' MAXIMUM power over
the whole grid, so the correction for the number of frequencies searched is in the statistic. A
line is counted only above the AR(1) floor; its **splits** are reported beside it — the amplitude
on the interior (the first and last tenth of the span removed) and on each half — and a line that
does not stand in both halves is marked. Two classifiers name what stands: the LR04 lines against
sum and difference tones of the formula's own 28 orbital lines within half the resolution
(primary families only: obliquity with eccentricity, precession with obliquity or eccentricity),
and the Sun's lines against the named arguments of its longitude (the lunar D, M′, F; the Sun's
anomaly; the planets' mean longitudes; the node and perigee), each argument reduced by the series'
own sampling comb (yearly for the cardinal instants, the synodic month for eclipses, ten days for
the dense Sun windows).

Three lessons the harness itself taught, each a defect found and fixed inside the sweep: a series
must be put in time order before its lag-one correlation is estimated (LR04 is listed by age, and
the estimator stepping backwards read ρ = 0 — the "red-noise" floor was the white one and eight
LR04 lines "stood"); recomputing the trigonometry per surrogate took fourteen minutes per La2004
series where one pass over the frequencies takes seconds; and a smooth, densely sampled residual
has ρ ≈ 1 at its cadence, so its AR(1) floor sits near the whole variance — the honest statement
for such a series is "n cycles seen", not a significance.

## 2. The series and their lines

The residual sign is record − model throughout; `n` is the number of samples; `span` the time
axis in years (Myr for the paleo anchors, kyr for LR04 and La2004); ρ the lag-one correlation of
the series at its own cadence; the floor the AR(1) p < 0.01 level of normalised power.

<!-- generated:doc112-series -->
| # | series | n | span | rms | ρ (lag 1) | AR(1) floor | lines above it | strongest line | amplitude | × floor | stands | what the line is |
|---|:---|---:|:---|---:|---:|---:|---:|---:|---:|---:|:---|:---|
| 1 | ΔT: Espenak & Meeus 2006 − model, yearly | 361 | 1,650 … 2,010 yr | 13.5 s | 0.998 | 0.962 | 0 | 240.0 yr | 17.5 | 0.86 | yes | a span-scale family (1.50 cycles) |
| 2 | ΔT: SMH2016 timed observations − model | 322 | -720.0 … 1,280 yr | 1231 s | 0.000 | 0.114 | 0 | 14.16 yr | 454 | 0.66 | no | (unnamed — see the probes) |
| 2b | ΔT: SMH2016 spline − model (the stack's own fit record) | 274 | -720.0 … 2,010 yr | 24.5 s | 0.976 | 0.873 | 0 | 949.6 yr | 17.9 | 0.41 | yes | a span-scale family (2.88 cycles) |
| 2-J | as 2, the shipped Jose pair subtracted | 322 | -720.0 … 1,280 yr | 1226 s | 0.000 | 0.114 | 0 | 14.16 yr | 451 | 0.65 | no | (unnamed — see the probes) |
| 2-J | as 2b, the shipped Jose pair subtracted | 274 | -720.0 … 2,010 yr | 79.7 s | 0.991 | 0.942 | 0 | 910.0 yr | 64.7 | 0.65 | no | a span-scale family (3.00 cycles) |
| 2-J′ | the stack RE-FITTED on the spline with all four cycles (the check) | 274 | -720.0 … 2,010 yr | 15.9 s | 0.937 | 0.676 | 0 | 532.7 yr | 16.8 | 0.82 | yes | a span-scale family (5.13 cycles) |
| 2-J′ | the stack RE-FITTED with Bond + Hallstatt only (free of the Jose fit) | 274 | -720.0 … 2,010 yr | 64.9 s | 0.994 | 0.949 | 0 | 949.6 yr | 64.8 | 0.56 | no | a span-scale family (2.88 cycles) |
| 3 | the 45 paleo anchors − the chain (relative) | 45 | -3,200 … 0.000 Myr | 0.0137 relative | 0.055 | 0.915 | 0 | 116.4 Myr | 0.0192 | 0.28 | yes | (unnamed — see the probes) |
| 3 | the anchors inside 600 Ma | 25 | -600.0 … 0.000 Myr | 0.0135 relative | 0.002 | 0.909 | 0 | 800.0 Myr | 0.0205 | 0.31 | no | a span-scale family (0.75 cycles) |
| 4 | LR04 − the climate formula, post-MPT window | 801 | -1,000 … 0.000 kyr | 0.205 ‰ | 0.875 | 0.245 | 0 | 72.73 kyr | 0.137 | 0.93 | yes | obliquity p+s6 (53.6) − climate-internal harmonic (g₂−g₅)/2 (202.8) |
| 4 | LR04 − the formula, iNHG–MPT window | 731 | -2,700 … -1,000 kyr | 0.166 ‰ | 0.738 | 0.130 | 0 | 73.12 kyr | 0.0812 | 0.92 | yes | obliquity p+ζ7 (41.6) − eccentricity z6−g5 (96.8) |
| 4 | LR04 − the formula, pre-iNHG window | 585 | -5,320 … -2,700 kyr | 0.113 ‰ | 0.629 | 0.118 | 1 | 2,096 kyr | 0.0609 | 1.29 | yes | a span-scale family (1.25 cycles) |
| 4 | LR04 − the formula, the full-record fit | 2,115 | -5,320 … 0.000 kyr | 0.250 ‰ | 0.892 | 0.157 | 0 | 90.17 kyr | 0.0842 | 0.36 | no | obliquity p+s6 (53.6) − eccentricity g3−g2 (130.7) |
| 5 | the certified Sun − Horizons, yearly means | 6,000 | -2,999 … 3,000 yr | 3.24 ″ | 0.936 | 0.081 | 1 | 2,666 yr | 0.943 | 1.35 | no | a span-scale family (2.25 cycles) |
| 5 | the Sun − Horizons, 10-d cadence, −2500…−2200 | 10,957 | -2,500 … -2,200 yr | 2.73 ″ | 0.991 | 0.252 | 1 | 3.986 yr | 1.20 | 1.20 | yes | 2V − 3E |
| 5 | the Sun − Horizons, 10-d cadence, −400…−100 | 10,957 | -400.0 … -100.0 yr | 4.74 ″ | 0.986 | 0.178 | 2 | 1.000 yr | 0.755 | 1.30 | yes | annual (M) |
| 5 | the Sun − Horizons, 10-d cadence, 1700…2000 | 10,958 | 1,700 … 2,000 yr | 1.59 ″ | 0.982 | 0.152 | 2 | 1.000 yr | 0.834 | 2.70 | yes | annual (M) |
| 6 | the lunar canon − the finder, UT | 12,056 | -1,998 … 3,001 yr | 4.78 min | 0.992 | 0.259 | 2 | 1,428 yr | 4.25 | 1.77 | yes | a span-scale family (3.50 cycles) |
| 6 | the lunar canon − the finder, dynamical time | 12,056 | -1,998 … 3,001 yr | 1.42 min | 0.916 | 0.034 | 2 | 2,500 yr | 0.712 | 3.99 | yes | a span-scale family (2.00 cycles) |
| 7 | e − La2004 (×10³), a linear trend removed | 4,999 | -9,996 … 0.000 kyr | 0.129 ‰ | 0.570 | 0.015 | 6 | 94.97 kyr | 0.0605 | 7.28 | yes | the solutions' own eccentricity line eccentricity g4−g5 (94.9 kyr) |
| 7 | ε − La2004 (″), a linear trend removed | 4,999 | -9,996 … 0.000 kyr | 803 ″ | 0.947 | 0.116 | 1 | 40.76 kyr | 702 | 3.31 | no | the solutions' own obliquity line obliquity p+s3 (40.9 kyr) |
| 7 | ϖ of date − La2004 (″), a linear trend removed | 4,999 | -9,996 … 0.000 kyr | 22804 ″ | 0.375 | 0.010 | 4 | 4,443 kyr | 9783 | 9.89 | no | a span-scale family (2.25 cycles) |
| 7 | ϖ of date − La2004 (″), a quadratic removed | 4,999 | -9,996 … 0.000 kyr | 17994 ″ | 0.000 | 0.005 | 2 | 4,998 kyr | 3832 | 4.42 | yes | a span-scale family (2.00 cycles) |
| 8 | the vernal equinox instants − Horizons | 6,000 | -3,000 … 2,999 yr | 1.26 min | 0.789 | 0.028 | 4 | 3.984 yr | 0.371 | 3.34 | no | 2V − 2E (aliased) |
| 8 | the June solstice instants − Horizons | 6,000 | -2,999 … 2,999 yr | 1.33 min | 0.830 | 0.035 | 3 | 2,666 yr | 0.406 | 2.60 | no | a span-scale family (2.25 cycles) |
| 8 | the autumnal equinox instants − Horizons | 6,000 | -2,999 … 3,000 yr | 1.44 min | 0.907 | 0.061 | 1 | 2,666 yr | 0.412 | 1.72 | yes | a span-scale family (2.25 cycles) |
| 8 | the December solstice instants − Horizons | 6,001 | -3,000 … 3,000 yr | 1.41 min | 0.892 | 0.053 | 2 | 2,667 yr | 0.363 | 1.91 | no | a span-scale family (2.25 cycles) |
<!-- /generated:doc112-series -->

## 3. ΔT and the Jose pair

Series 1 (the Espenak & Meeus canon, yearly) is a smooth residual whose one swing of about 240
years carries most of its variance and is seen for one and a half cycles: red noise explains it
(the telescopic residual, doc 111 §1.31's class). Series 2 (the 322 timed Babylonian, Chinese,
Greek and Arab observations of Stephenson, Morrison & Hohenkerk) scatters at twenty minutes and
is white; a sixty-second line is a thousandth of its variance and undetectable in principle.
Series 2b, the SMH spline the ΔT stack was fitted on, shows only what red noise explains.

**Hypothesis 1 of the plan — are the Jose harmonics (716 and 897 yr) in the record free of their
own fit?** The test re-fits the stack on the spline (the model's non-cycle part — the anchor, the
raw tidal integral and the core–mantle swing — plus a least-squares cosine/sine pair per cycle,
anchored to zero at 2000 as the model carries them). With all four cycles the re-fit reproduces
the shipped amplitudes and leaves nothing at the Jose periods — the instrument is sound. With Bond
and Hallstatt only, the record free of the Jose fit shows one feature of
<!--v:josePairRefitLineSeconds-->65<!--/v--> s: it stands above the white floor and below the
red-noise floor, and it is <!--v:josePairRefitLineFirstHalfSeconds-->17<!--/v--> s in the first
half of the record and <!--v:josePairRefitLineSecondHalfSeconds-->115<!--/v--> s in the second.
That is an episode of Stephenson's smoothed curve in the second millennium, not a stationary line
of the Earth's rotation; the timed observations cannot see it. The pair is a fit convenience.

*The follow-up's decision (TODO item 4): the pair stays.* The joint fitter run with the pair
excluded (`DT_CORRECTIONS_DISABLED=1 DT_FLAGS=bond,hallstatt node tools/fit/dt-corrections-fit.js
--joint`, report mode) scores the telescopic canon at 23.2 s rms against 12.5 s with all four
cycles and the full window at 73.3 s against 21.4 s — the modern record does see the pair, and the
fitter's own composite rule (full-window rms ≤ 40 s) would not accept the two-cycle stack. The
timed ancient corpus is indifferent (doc 102's ablation). A convenience the record it was fitted on
needs is kept as what the paper calls it, a labelled hypothesis; nothing in the stack moves.

<!-- generated:doc112-jose -->
| the re-fit on the SMH2016 spline | Bond (s) | Hallstatt (s) | Jose5 (s) | Jose4 (s) | residual rms (s) | power at 897 yr (× AR(1) / × white) | power at 716 yr |
|:---|---:|---:|---:|---:|---:|---:|---:|
| all four cycles (the check) | 375.8 (shipped 368.8) | 87.2 (shipped 80.0) | 67.8 (shipped 50.0) | 45.8 (shipped 50.0) | 15.9 | 0.004 (0.01 / 0.06) | 0.003 (0.00 / 0.04) |
| Bond + Hallstatt only | 373.6 (shipped 368.8) | 67.2 (shipped 80.0) | — | — | 64.9 | 0.525 (0.55 / 6.68) | 0.266 (0.28 / 3.38) |

The Jose-free residual's strongest line: 949.6 yr, 64.8 s — 17.0 s in the first half of the record, 114.5 s in the second; 6.7× the white floor, 0.56× the AR(1) floor.
<!-- /generated:doc112-jose -->

## 4. LR04 and the formula's mixing tones

Series 4 is LR04 minus the climate formula, per fitted regime window and for the full-record fit,
with the fitter's own composition of the prediction. With the red-noise floors in place nothing
stands in the three fitted windows except a swing of 1.25 cycles across the pre-iNHG window — a
curvature, not a line (it coincides with the 2.4-Myr g₄ − g₃ eccentricity modulation within that
window's resolution, for the record). The strongest residual feature is the same in two disjoint
windows: a tone at <!--v:lr04ResidualToneKyr-->72.7<!--/v--> kyr carrying
<!--v:lr04ResidualToneSharePct-->23<!--/v--> % of the post-MPT residual variance, which the
classifier places as the obliquity line minus the ~97-kyr eccentricity line; its companions are
obliquity − eccentricity and precession − obliquity differences and one eccentricity harmonic.
These are the mixing products of a multiplicative, state-dependent response to the orbital
forcing — external physics the linear line sum cannot carry (doc 92; the B-section research entry
on the nonlinear 100-kyr response) — not a missing orbital line. **Hypothesis 4 is confirmed in
its expected direction.** The full-record fit's 100-kyr cluster and its 41-kyr residual are one
line set forced across the MPT, where the response amplitude changes.

<!-- generated:doc112-lr04 -->
| window | n | rms (‰) | ρ | AR(1) floor | lines above it | strongest peak (kyr, ‰, × AR(1), × white, stands) | the primary-family tone it matches |
|:---|---:|---:|---:|---:|---:|:---|:---|
| post-mpt (0–1000 ka) | 801 | 0.205 | 0.875 | 0.245 | 0 | 72.7 / 0.137 / 0.93 / 8.7 / yes; 285.7 / 0.081 / 0.32 / 3.0 / yes; 65.6 / 0.077 / 0.29 / 2.7 / yes | obliquity p+s6 (53.6) − climate-internal harmonic (g₂−g₅)/2 (202.8); a span-scale swing; 2 × eccentricity g3−g2 (130.7) |
| inhg-mpt (1000–2700 ka) | 731 | 0.166 | 0.738 | 0.130 | 0 | 73.1 / 0.081 / 0.92 / 4.1 / yes; 68.7 / 0.072 / 0.72 / 3.2 / yes; 50.7 / 0.066 / 0.60 / 2.7 / no | obliquity p+ζ7 (41.6) − eccentricity z6−g5 (96.8); obliquity p+s3 (40.9) − eccentricity z5−g5 (101.0); climatic precession p+g2 (22.4) − obliquity p+ζ4 (40.2) |
| pre-inhg (2700–5320 ka) | 585 | 0.113 | 0.629 | 0.118 | 1 | 2096.0 / 0.061 / 1.29 / 4.0 / yes | a span-scale swing |
| full (0–5320 ka) | 2115 | 0.250 | 0.892 | 0.157 | 0 | 90.2 / 0.084 / 0.36 / 4.9 / no; 41.2 / 0.084 / 0.36 / 4.9 / yes; 106.4 / 0.082 / 0.34 / 4.6 / no | obliquity p+s6 (53.6) − eccentricity g3−g2 (130.7); —; — |
<!-- /generated:doc112-lr04 -->

## 5. The certified Sun against JPL Horizons

Series 5 compares the model's apparent geocentric longitude of the Sun with Horizons' (DE441,
TT) as the swap gate does, in yearly means over ±3,000 years and at the cache's own ten-day
cadence in three 300-year windows. The yearly means carry only a span-scale family (the annual
term's slow drift sampled at a fixed longitude — a curvature, not a line). In the dense windows
every line above the floor is a named argument, and fitting the residual directly at the named
frequencies gives the table below. Two patterns in it: the barycentre term's elliptic sidebands
D ± M′ are present at the same amplitude and phase in every window — terms the model's Sun does
not carry; and every Venus and Jupiter residual keeps a constant phase and grows linearly with the
distance from J2000 — arguments drifting, not terms missing. The drift sorts by the sum of the
coefficients: the frame-free arguments (V − E, 2V − 2E) drift by a few degrees per unit at
−2350, the Σk ≠ 0 ones (2V − 3E, 3V − 4E, J) share one larger drift — CLAUDE.md §1.15's rule, "a
term with Σk ≠ ±1 stays a constant row with its window named", here measured outside its window.
The barycentre term itself is right to a few hundredths of an arcsecond at every epoch.

*The follow-up (TODO item 3).* The sidebands were the lunar equation's own: the completion carried
the Earth-around-EMB wobble as 6.44″·sin D, the leading term of a geometry the model already holds,
and the wiring now derives it exactly on the model's own Moon — the Earth sits at EMB − μ·R_M, so the
geocentric Sun's longitude is turned by atan2(ρ·sin Δ, r_S + ρ·cos Δ) with ρ = μ·r_M·cos β_M from the
full lunar series and Δ = λ_M − λ_S on the Sun's own elements of date (`embWobbleArcsecAtT`, doc 111
§1.41 c). The table below is the re-run on it: D ± M′ and D ± M read ≤ 0.04″ in every window, no
constant fitted. The drift was then measured per composed family, since the ±M sideband rows share a
frequency and a row's own offset is not a quantity: the Σk = 0 families do not drift (the carriers
are right to 0.02°/cy), the Σk = −1 ones by 0.58 (the Venus families), 0.36–0.39 (Mars, Jupiter)
and 0.18°/cy (Jupiter alone) per unit Σk — not one frame rate, not a carrier error, and the
sideband rows on the e-vectors of date make it worse where there is no residual. It stays a constant
row with its window named, ≤ 1.3″ at −2650 inside the Sun's ancient scatter.

<!-- generated:doc112-sun-named -->
| argument | period (yr) | -2500…-2200 (″, °) | -400…-100 (″, °) | 1700…2000 (″, °) |
|:---|---:|---:|---:|---:|
| D (the barycentre term) | 0.0809 | 0.021″ -91° | 0.011″ -93° | 0.008″ -92° |
| D − M′ | 1.1274 | 0.041″ -14° | 0.030″ -50° | 0.012″ -84° |
| D + M′ | 0.0390 | 0.001″ 118° | 0.001″ 139° | 0.001″ 148° |
| D − M | 0.0880 | 0.000″ -31° | 0.000″ -65° | 0.000″ -81° |
| D + M | 0.0748 | 0.000″ 93° | 0.001″ 93° | 0.000″ 127° |
| M′ | 0.0754 | 0.071″ -43° | 0.071″ -32° | 0.071″ -28° |
| annual (M) | 1.0000 | 0.553″ 109° | 0.763″ 129° | 0.835″ 147° |
| semi-annual (2M) | 0.5000 | 0.002″ 56° | 0.009″ 179° | 0.018″ 169° |
| V − E | 1.5987 | 0.231″ 103° | 0.181″ 107° | 0.134″ 108° |
| 2V − 2E | 0.7993 | 0.514″ -149° | 0.417″ -148° | 0.322″ -147° |
| 2V − 3E | 3.9834 | 1.204″ 52° | 0.668″ 50° | 0.142″ 57° |
| 3V − 4E | 1.1408 | 0.830″ -21° | 0.491″ -22° | 0.147″ -14° |
| 3V − 5E | 8.1020 | 0.129″ -45° | 0.143″ 7° | 0.125″ -15° |
| E − J | 1.0921 | 0.243″ -122° | 0.142″ -118° | 0.081″ -107° |
| 2E − 2J | 0.5460 | 0.188″ 128° | 0.105″ 126° | 0.059″ 122° |
| J | 11.8620 | 0.569″ -38° | 0.312″ -17° | 0.108″ 60° |
| 2E − 2Mars | 1.0677 | 0.126″ 55° | 0.144″ 59° | 0.122″ 54° |
| the lunar node Ω (nutation) | 18.6130 | 0.770″ -161° | 0.380″ -164° | 0.014″ 158° |

Window rms: 2.730″ (-2500…-2200, n 10,957); 4.739″ (-400…-100, n 10,957); 1.586″ (1700…2000, n 10,958). The direct weighted least-squares fit of a cosine/sine pair at each named frequency; amplitude in arcseconds of longitude, phase of the record − model difference.
<!-- /generated:doc112-sun-named -->

## 6. The cardinal instants and the gate's own interpolation

Series 8 compares the model's cardinal instants with the crossings the swap gate reads off
Horizons' longitude, by a Lagrange cubic through four ten-day rows. All four series carry one
line of about half a minute at 2.715 years, stable over six millennia, and a doublet at 6.40
years — and the Moon's elongation advances 12.368 cycles a year, so a yearly sampling folds the
synodic month onto exactly 2.715 years. Splitting each residual into the apparent Sun's part (the
model's longitude at the Horizons instant) and the cardinal tier's own part attributes everything
to the former: the tier's own part is two seconds rms. Yet the dense residual holds only a
fraction of that at the alias. The one quantity left is the crossing instant: Horizons' longitude
carries the 6.44″ barycentre wobble with a 29.5-day period, and a cubic across thirty days
follows it to a few arcseconds, in step with the Moon's phase. With the wobble removed before the
interpolation the line falls from <!--v:cardinalGateInterpolationLineMin-->0.52<!--/v--> to
<!--v:cardinalGateInterpolationLineDewobbledMin-->0.01<!--/v--> min and the doublet vanishes; the
Venus and D − M′ lines, which are the Sun's, do not move. The gate's cardinal statistic was in part
its own instrument (doc 111 §1.5's class). Since the follow-up the gate, this series and the probes'
split read the de-wobbled crossing from one home (`tools/lib/horizons-crossing.js`): the gate's
cardinal sd is <!--v:cardinalVsHorizonsSdMin-->0.90<!--/v--> min, the 2.715-yr line is gone from
the four series (the table below), and the three-method comparison stays as the record of what the
bare cubic carried.

<!-- generated:doc112-cardinal -->
| cardinal type | n | rms total (min) | the apparent Sun's part | the cardinal tier's part | 2.715 yr: total / Sun / tier (min) | 6.40-yr doublet: total / Sun / tier (min) |
|:---|---:|---:|---:|---:|:---|:---|
| VE | 6,000 | 1.257 | 1.238 | 0.024 | 0.011 / 0.010 / 0.000 | 0.008 / 0.008 / 0.000 |
| SS | 6,000 | 1.326 | 1.290 | 0.037 | 0.011 / 0.011 / 0.000 | 0.004 / 0.004 / 0.000 |
| AE | 6,000 | 1.435 | 1.460 | 0.029 | 0.018 / 0.018 / 0.001 | 0.006 / 0.006 / 0.000 |
| WS | 6,000 | 1.407 | 1.449 | 0.043 | 0.005 / 0.005 / 0.000 | 0.005 / 0.005 / 0.000 |

| the Horizons crossing found by (VE) | rms of the Sun's part (min) | 2.715 yr (min) | 6.3988 yr | 6.4245 yr | 2V − 3E alias 3.98 yr | D − M′ alias 8.85 yr |
|:---|---:|---:|---:|---:|---:|---:|
| a Lagrange cubic through four 10-d rows (the gate) | 1.313 | 0.522 | 0.205 | 0.208 | 0.344 | 0.002 |
| a quintic through six rows | 1.253 | 0.348 | 0.143 | 0.145 | 0.344 | 0.002 |
| the cubic on the longitude with the 6.44″ barycentre wobble removed first | 1.238 | 0.010 | 0.008 | 0.006 | 0.344 | 0.001 |
<!-- /generated:doc112-cardinal -->

## 7. The lunar canon and the event's definition

Series 6 matches the NASA Five Millennium Canon's 12,064 lunar eclipses to the model's finder as
the recall generator does. In UT the residual carries, beside its lines, the ΔT stack against the
canon's own ΔT polynomial — not independent of §3. The sweep read the finder as it then stood —
returning the OPPOSITION in longitude, bisected to a second — and that instant is kept on every
event as `jdOpposition` since the follow-up, so the record below stays reproducible; the shipped
instant is now greatest eclipse (the end of this section).

*At the opposition instant.* In dynamical time (the canon's TD against the model's TT) the ΔT
family is gone and one line dominates: 3.617 years, seven minutes, ninety times the floor,
identical in both halves. No combination of the lunar arguments matches it; its frequency is eight
cycles per 358 lunations, the twelfth harmonic of the argument of latitude under full-moon sampling
— which is not a perturbation but the sawtooth an eclipse's distance from the node traces from
season to season, the signature of a residual LINEAR in that distance. Regressed on the node
distance the residual gives r = <!--v:lunarCanonNodeTermCorrelation-->-0.93<!--/v-->,
<!--v:lunarCanonNodeTermSlopeMinPerDeg-->-0.86<!--/v--> min per degree (gamma alone gives zero:
its sign flips between the nodes, the node distance's does not), and the sd falls from
<!--v:lunarCanonTimingSdTDMin-->9.9<!--/v--> to
<!--v:lunarCanonTimingSdAfterNodeTermMin-->3.6<!--/v--> min. The cause was in the finder's source:
the canon times GREATEST ECLIPSE, the solar finder refines its conjunctions to minimum γ, and the
lunar finder did not (`packages/physics/src/eclipse/finders.cjs`). The canon-recall gate's "tight"
count had carried that definition offset since it was written.

The remainder's spectrum has one line, 1.127 years — the full-moon cycle, the anomaly at full
moon — at nearly five minutes, and a first probe missed it because its frequency grid stopped
short of the line (0.82 of the Nyquist rate for a 0.887 cycle/yr line). The one-term slope is
biased: under eclipse sampling sin 2F correlates with sin M′ (r −0.32), so the regression absorbs
part of an anomaly term into the node term and leaves the rest. The five-term fit — the node term,
its two anomaly sidebands (the Moon's speed of date is in the offset's denominator), and a direct
cos M′, sin M′ pair — reads the node coefficient as
<!--v:lunarCanonNodeTermFittedMin-->-29.4<!--/v--> min against the shadow geometry's
<!--v:lunarCanonNodeTermPredictedMin-->-29.6<!--/v--> (−i²Ḟ/2λ̇²), its cos M′ modulation −0.144
against the speed-of-date −0.128, a direct pair of
<!--v:lunarCanonDirectAnomalyTermMin-->4.7<!--/v--> min where the geometry predicts zero, and an sd
of <!--v:lunarCanonTimingSdAfterFiveTermMin-->1.4<!--/v--> min after it (what the remainder still
holds at the full-moon cycle, <!--v:lunarCanonFiveTermRemainderFmcLineMin-->0.7<!--/v--> min, is a
term growing with age that one span-wide coefficient cannot take out). The direct pair is two
things, which the follow-up separated: its sin M′ part (4.7 min) is the offset's own form beyond
the five regressors — it vanishes with the instant — and its cos M′ part (1.7 min) is the span
mean of a term that grows into the past, the one that stands.

*At the shipped instant.* The finder now refines each opposition to the Moon's least distance
from the shadow axis and classifies by it (`findLunarEclipsesInRange`, doc 111 §1.41 b, where the
second cancellation that re-measurement exposed — Chauvenet's ×1.02 shadow where the canon uses
Danjon's 1/85 — is recorded). Against the canon the residual is
<!--v:lunarCanonTimingSdGreatestMin-->1.4<!--/v--> min sd with the node term gone
(<!--v:lunarCanonGreatestNodeTermMin-->0.04<!--/v--> min), the direct anomaly term at
<!--v:lunarCanonGreatestAnomalyTermMin-->0.1<!--/v--> min (it stood at
<!--v:lunarCanonGreatestAnomalyTermBeforeCompletionMin-->1.7<!--/v--> min in cos M′ before the ϖ/Ω
completion below), and <!--v:lunarCanonGreatestRemainderMin-->1.4<!--/v--> min after it — the
finder's own remainder, whose spectrum holds no line but the span-scale swing (the series table).

A cos M′ term in a timing residual is a phase of M′, and a third instrument places it: Meeus
Ch. 49's full-moon instants, on the ephemeris's own arguments, read against both sides (both
oppositions, so the finder's instant does not enter). The canon − Meeus difference carries the
pure definition term in every era with no anomaly term at all — the canon's M′ is the
polynomial's. As first measured, the model − Meeus difference was 0.3 min in the fit window and
acquired a cos M′ term into the past — −0.5, −2.0, −5.7 min for the three millennia before 1000 —
the model's M′ ahead of the polynomial by 0.05°, 0.20°, 0.55°. The arguments read directly (the
composer's `moonArgs` against `pureMeeusArgs`) said the same and where it sat: the model's
perigee ϖ = L′ − M′ and node Ω = L′ − F matched the Meeus polynomials in T² — plan 23's
construction — and carried 0.13 and 0.20 of their T³ + T⁴ tails at −1500; the model's M′ was
<!--v:lunarArgumentMpAheadAtMinus1500DegBeforeCompletion-->0.54<!--/v-->° ahead there and
<!--v:lunarArgumentMpAheadAtMinus3000DegBeforeCompletion-->1.66<!--/v-->° at −3000 (in the future
the model's cubic had the opposite sign). Since the completion (below) the same reads carry
<!--v:lunarPerigeeTailShareAtMinus1500-->1.07<!--/v--> and
<!--v:lunarNodeTailShareAtMinus1500-->1.02<!--/v--> of the tails, the model's M′ sits
<!--v:lunarArgumentMpAheadAtMinus1500Deg-->-0.04<!--/v-->° from the polynomial at −1500 and
<!--v:lunarArgumentMpAheadAtMinus3000Deg-->-0.04<!--/v-->° at −3000, and the model − Meeus cos M′
term by era is <!--v:lunarCanonModelAnomalyTermMinus1000To0Min-->0.2<!--/v--> and
<!--v:lunarCanonModelAnomalyTermMinus1999ToMinus1000Min-->0.3<!--/v--> min (the era table below).

This was a difference the lunar theory's record names (doc 66, "the predicted-ë-vs-secular-ë
difference"), measured here for the first time in its eclipse consequence. The Moon's arguments
are framework-native: L′, ϖ and Ω are composed from the chains on the model's own histories, and
ϖ and Ω ride the deep eccentricity channel through the physical exponents s_ϖ and s_Ω on the
model's own e(t); their T² is pinned to the polynomials by construction, their T³ is whatever the
channel's e(t) curvature gives. ELP's T³ embodies the SECULAR-theory ë; the channel's own ë is
about a seventh of it — the ratio measured here as the perigee's 0.13. L′ carries the secular
convention through its completion carrier (`lpSecularCompletion`, bounded, tapered, zero through
T², derived at 98.8 % and confirmed against DE441 — `moon/arguments.cjs`); ϖ and Ω had no such
carrier. In the eclipse timings the gap was the Moon's longitude error EoC · δM′ · cos M′: about
100″ at −750 (three minutes of timing at the anomaly's phase, inside the ancient ΔT scatter),
650″ at −3000.

**Fixed in the follow-up (step B).** To first order in Δ(e²) the channel factor is
s · (3/2) · Δ(e²)/(1 − e₀²), so the completion ϖ and Ω need is L′'s own carrier scaled by K_W/K_PL
and K_N/K_PL (`apsidalNodalSecularCompletion` in `moon/arguments.cjs`: one carrier, three
scalings, no new constant, zero through T², bounded at the taper edge and frozen beyond it at
<!--v:lunarCompletionFrozenPerigeePastDeg-->86<!--/v-->° on ϖ and
<!--v:lunarCompletionFrozenNodePastDeg-->-14.4<!--/v-->° on Ω on the past side — doc 66); the
bundle's secular Taylor check had already reproduced Meeus's ϖ T³ at 96.6 %. Since it the shipped
lunar-canon residual holds no full-moon-cycle line (the series table below), the tight canon
recall is <!--v:lunarCanonRecallTightPercent-->99.49<!--/v--> %, and doc 102's dense-target
corpus moved with the Moon: its −400 century's standard error fell from 188 to
<!--v:lunarDenseSeMinus400Seconds-->167<!--/v--> s while its full-stack ablation χ² rose from
34.0 to <!--v:lunarDenseChi2FullStack-->38.5<!--/v--> — the century medians moved by up to
47 s as the corrected Moon re-timed the ancient records, out of sample for the ΔT stack.

<!-- generated:doc112-lunar -->
| the lunar canon against the finder | value |
|:---|---:|
| matched eclipses | 12,056 |
| residual in UT (canon UT − model UT, the shipped greatest-eclipse instant) | -1.74 ± 4.45 min |
| residual in dynamical time (canon TD − model TT, the shipped instant) | -0.38 ± 1.37 min |
| its node term in the five-term fit (sin 2F) | 0.04 min |
| its direct anomaly term (cos M′, sin M′) — the model's M′ against the ephemeris's | 0.08 min; remainder 1.372 min sd |
| the same residual at the OPPOSITION instant the finder bisects first (the record of §1.41 b) | -0.36 ± 9.90 min |
| the node distance u of the mean argument of latitude at the canon instant spans | -22.2° … 22.3° |
| regression of the dynamical-time residual on u | slope -0.8605 min/°, r = -0.9307 |
| regression on sin 2F | slope -25.90 min, r = -0.9329 |
| regression on gamma (its sign flips between the nodes) | r = 0.0006 |
| residual after the sin 2F term | 3.563 min sd |
| correlation of sin 2F with sin M′ under eclipse sampling (the one-term slope's bias) | -0.322 |

| the five-term fit of the dynamical-time residual | fitted (min) | the shadow geometry predicts |
|:---|---:|---:|
| sin 2F (the node term) | -29.39 | -29.62 (−i²Ḟ/2λ̇²) |
| sin 2F · cos M′ (the speed of date on it), as a ratio to the node term | -0.143 | -0.128 (≈ −2.3 e) |
| sin 2F · sin M′ | 0.01 | 0 |
| cos M′ (direct) | -0.06 | 0 |
| sin M′ (direct) | -4.71 | 0 |
| the direct anomaly term's amplitude | 4.71 | 0 |
| residual after the five terms | 1.402 min sd | |

| by eclipse type | n | slope on u (min/°) | r |
|:---|---:|---:|---:|
| Penumbral | 4,370 | -0.9057 | -0.9617 |
| Partial | 4,207 | -0.8299 | -0.9034 |
| Total | 3,479 | -0.4058 | -0.5838 |

| era | n | canon − Meeus 49: sd → after the definition terms (min) | its cos M′ | model − Meeus 49: sd (min) | its cos M′ (min) | the model's M′ phase it implies | the polynomial's own T³+T⁴ in M′ at the midpoint |
|:---|---:|---:|---:|---:|---:|---:|---:|
| -1999 … -1000 | 2,429 | 9.89 → 1.77 | 0.02 | 0.48 | 0.34 | -0.033° | -0.717° |
| -1000 … 0 | 2,387 | 9.73 → 1.66 | 0.01 | 0.38 | 0.16 | -0.016° | -0.251° |
| 0 … 1000 | 2,392 | 9.72 → 1.56 | 0.05 | 0.33 | 0.02 | -0.002° | -0.052° |
| 1000 … 1600 | 1,449 | 9.83 → 1.52 | 0.00 | 0.30 | -0.04 | 0.004° | -0.005° |
| 1600 … 2200 | 1,450 | 9.80 → 1.49 | 0.04 | 0.31 | -0.06 | 0.006° | -0.000° |
| 2200 … 3000 | 1,946 | 9.89 → 1.47 | 0.04 | 0.37 | -0.04 | 0.004° | 0.003° |

| epoch | model − polynomial: L′ (″) | M′ (″) | F (″) | perigee ϖ (″) | the polynomial's T³+T⁴ in ϖ (″) | share the model carries | node Ω (″) | the polynomial's T³+T⁴ in Ω (″) | share |
|:---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| -3000 | 21 | -157 | 11 | 178 | 6805 | 1.03 | 10 | -1334 | 0.99 |
| -2500 | 20 | -163 | 21 | 182 | 4875 | 1.04 | -1 | -945 | 1.00 |
| -2000 | 18 | -151 | 25 | 169 | 3363 | 1.05 | -7 | -645 | 1.01 |
| -1500 | 17 | -128 | 26 | 145 | 2212 | 1.07 | -9 | -419 | 1.02 |
| -1000 | 14 | -101 | 23 | 116 | 1368 | 1.08 | -9 | -256 | 1.04 |
| -584 | 12 | -78 | 20 | 90 | 860 | 1.10 | -8 | -159 | 1.05 |
| -500 | 11 | -74 | 19 | 85 | 777 | 1.11 | -8 | -144 | 1.05 |
| -135 | 9 | -55 | 15 | 64 | 477 | 1.13 | -6 | -87 | 1.07 |
| 0 | 8 | -49 | 14 | 57 | 390 | 1.15 | -6 | -71 | 1.08 |
| 500 | 5 | -28 | 9 | 33 | 161 | 1.21 | -3 | -29 | — |
| 1000 | 3 | -13 | 4 | 15 | 47 | 1.33 | -2 | -8 | — |
| 1500 | 1 | -3 | 1 | 4 | 6 | — | -0 | -1 | — |
| 2500 | 1 | -3 | 1 | 4 | -6 | — | -1 | 1 | — |
| 3000 | 3 | -13 | 5 | 16 | -43 | 0.62 | -2 | 7 | — |
| 4000 | 13 | -55 | 23 | 68 | -329 | 0.79 | -10 | 52 | 0.81 |
| 5000 | 29 | -132 | 54 | 161 | -1061 | 0.85 | -25 | 160 | 0.84 |

| series | strongest lines (period yr, amplitude min, × floor, stands) |
|:---|:---|
| lunar-canon-TD | 2499.6511 / 0.712 / 4.0× / stands; 1666.4341 / 0.367 / 1.1× / stands |
| lunar-canon-TD-anomaly-term-removed | 2499.6511 / 0.712 / 3.9× / stands; 1666.4341 / 0.368 / 1.0× / stands |
| lunar-canon-TD-opposition | 3.6174 / 7.037 / 93.6× / stands; 1.2033 / 2.280 / 10.8× / stands; 1.3822 / 1.650 / 5.6× / stands; 1.8030 / 1.587 / 5.1× / stands; 3.6135 / 1.428 / 4.2× / stands; 1.8087 / 1.370 / 3.8× / stands |
| lunar-canon-TD-opposition-node-term-removed | 1.1274 / 4.150 / 274.3× / stands; 1.1270 / 0.914 / 13.3× / stands; 1.1278 / 0.830 / 11.0× / stands; 3.6174 / 0.866 / 10.9× / stands; 2499.6511 / 0.720 / 8.2× / stands; 1.0593 / 0.602 / 5.8× / stands |
| lunar-canon-TD-opposition-five-term-removed | 2499.6511 / 0.717 / 4.9× / stands; 1666.4341 / 0.367 / 1.3× / stands |
<!-- /generated:doc112-lunar -->

## 8. The Earth's elements against La2004

Series 7 compares the banked model's eccentricity, obliquity and perihelion of date with La2004
over the past ten million years at two-kyr cadence (La2010 is not on disk). The residuals carry
secular drifts — removed as a stated linear, then quadratic, trend and reported beside the lines.
All three say one thing: the precession-rate history differs between La2004's tidal dissipation
model and the composed law on the cited Earth–Moon history, a mean of
<!--v:la2004PrecessionRateDriftArcsecPerYr-->0.0203<!--/v-->″/yr over the span, with the
obliquity's and the perihelion-of-date's 41-kyr terms drifting in phase with it (the obliquity
line is five times larger in the older half). The eccentricity residual sits on the eccentricity's
own secular lines at a few tenths of a percent of each, larger in the older half: two N-body
solutions whose modes drift apart with age, not a line either lacks. These are survivors WITH
external physics — the cited dissipation history the decision names as the next input.

<!-- generated:doc112-la2004 -->
| element | detrend | trend | rms after | lines above the floor (period kyr, amplitude, × floor, first / second half) |
|:---|:---|:---|---:|:---|
| eccentricity (‰) | linear | slope 0.000730 per Myr | 0.1294 | 94.97 / 0.0605 / 7.3× / 0.0777 : 0.0433; 403.88 / 0.0408 / 3.3× / 0.0609 : 0.0210; 98.97 / 0.0372 / 2.8× / 0.0467 : 0.0285; 100.72 / 0.0265 / 1.4× / 0.0237 : 0.0307; 55.07 / 0.0259 / 1.3× / 0.0332 : 0.0188; 123.79 / 0.0235 / 1.1× / 0.0309 : 0.0169 |
| obliquity (″) | linear | slope 2.21 per Myr | 802.7 | 40.76 / 702 / 3.3× / 1.20e+3 : 208 |
| perihelion (″) | linear | slope 2.03e+4 per Myr | 2.280e+4 | 4442.67 / 9.78e+3 / 9.9× / 1.81e+4 : 9.99e+3; 2856.00 / 5.41e+3 / 2.9× / 4.18e+3 : 7.31e+3; 2221.33 / 4.34e+3 / 1.9× / 4.05e+3 : 5.20e+3; 1817.45 / 3.61e+3 / 1.3× / 4.16e+3 : 3.54e+3 |
| eccentricity (‰) | quadratic | slope 0.000730 per Myr, curvature -0.000295 per Myr² | 0.1293 | 94.97 / 0.0605 / 7.3× / 0.0777 : 0.0433; 403.88 / 0.0408 / 3.3× / 0.0609 : 0.0210; 98.97 / 0.0372 / 2.8× / 0.0467 : 0.0284; 100.72 / 0.0266 / 1.4× / 0.0237 : 0.0307; 55.07 / 0.0259 / 1.3× / 0.0332 : 0.0188; 123.79 / 0.0234 / 1.1× / 0.0309 : 0.0169 |
| obliquity (″) | quadratic | slope 2.21 per Myr, curvature 1.22 per Myr² | 802.7 | 40.76 / 702 / 3.3× / 1.20e+3 : 208 |
| perihelion (″) | quadratic | slope 2.03e+4 per Myr, curvature -1.88e+3 per Myr² | 1.799e+4 | 4998.00 / 3.83e+3 / 4.4× / 4.72e+3 : 3.07e+3; 40.80 / 2.47e+3 / 1.8× / 4.15e+3 : 810 |
<!-- /generated:doc112-la2004 -->

## 9. The paleo anchors

Series 3 is the 45 anchors of `data/paleo-validation-anchors.json` against the chain through the
gate's own predictors, the eleven rows published as ranges entering at their midpoints. Nothing
periodic stands (a 45-point floor sits near the whole variance). The Moon-distance rows read 7–9 %
inside the smoothed history at 300, 400 and 500 Ma and one percent outside it at 650 Ma: an
interval with edges — the Pangaea dissipation episode — not a period. Hypothesis 3 is confirmed.

## 10. The decision

<!-- generated:doc112-decision -->
| the sweep's counts | |
|:---|---:|
| residual series analysed | 33 |
| lines above the red-noise floor (p < 0.01 over each grid), span-scale families excluded | 40 |
| of them named by an astronomical argument or a primary-family mixing tone within half the resolution | 24 |
| span-scale families (a smooth curvature's Fourier terms, ≤ 6 cycles of the span) | 25 |
| lines above the floor the classifiers did not name, read against the probes (§3–§5) | 16 |
| lines standing against their record with physics the instruments do not supply (one series each) | 0 |
| lines that stood with named physics and were closed by a follow-up | 1 |
| survivors without external physics in two independent series | 0 |

Unnamed lines by series: lunar-canon-TD-opposition 1.203 (2.28); lunar-canon-TD-opposition 1.382 (1.65); lunar-canon-TD-opposition 1.803 (1.59); lunar-canon-TD-opposition 3.614 (1.43); lunar-canon-TD-opposition 3.621 (1.28); lunar-canon-TD-opposition 1.059 (1.16); lunar-canon-TD-opposition 2.237 (0.850); lunar-canon-TD-opposition 3.611 (0.827, unstable); lunar-canon-TD-opposition-node-term-removed 1.127 (4.15); lunar-canon-TD-opposition-node-term-removed 1.127 (0.914); lunar-canon-TD-opposition-node-term-removed 1.128 (0.830); lunar-canon-TD-opposition-node-term-removed 1.059 (0.602); lunar-canon-TD-opposition-node-term-removed 1.127 (0.538, unstable); lunar-canon-TD-opposition-node-term-removed 1.128 (0.514, unstable); lunar-canon-TD-opposition-node-term-removed 1.498 (0.462); lunar-canon-TD-opposition-node-term-removed 1.127 (0.387).

Closed by the follow-up: lunar-canon-TD at 1.1274 yr (the full-moon cycle (the anomaly at full moon)) stood at 1.69 min over the whole span — the cos M′ term of the shipped instant's residual (the span mean of a term growing into the past: −0.5 / −2.0 / −5.7 min per millennium before 1000 in probes.lunarThirdInstrument; the sin M′ part of the opposition instant's 5-min pair was the definition offset's own form and left with the instant) — the model's perigee and node ride the deep eccentricity channel (the physical exponents s_ϖ, s_Ω on the model's own e(t)), Meeus-exact in T² by construction; their T³ is the channel's own ë, about a seventh of the secular-theory ë that ELP's polynomials embody — L′ carries that convention through lpSecularCompletion, ϖ and Ω do not (doc 66's "predicted-ë-vs-secular-ë" drift, here measured): the model's M′ runs ahead of the polynomial's by the complement, 0 in the fit window, 0.2° at −500, 0.54° at −1500, 1.66° at −3000 — and reads 0.08 min since apsidalNodalSecularCompletion (moon/arguments.cjs): L′'s secular-ë carrier scaled to ϖ and Ω — the model's M′ within 0.04° of the polynomial over ±3,000 yr; the model's M′ against the polynomial, before → after: 5965″ → -157″ at -3000, 1935″ → -128″ at -1500, 665″ → -74″ at -500, 325″ → -49″ at 0.
<!-- /generated:doc112-decision -->

By the plan's rule the framework stands as what it is: no line stands without physics, and the
one that stood with physics named — the secular-ë convention of the lunar perigee's and node's
T³, which the ephemeris polynomials embody and the model's eccentricity channel carried a seventh
of (§7; doc 66 names the difference) — was neither a survivor without physics nor a polynomial to
add. It was the completion L′ already had, extended to ϖ and Ω: a bounded, tapered carrier of the
secular − channel curvature difference through s_ϖ and s_Ω, zero through T² by construction
(`lpSecularCompletion`'s class), built in the follow-up's step B and gated as L′'s was — the
dense DE441 comparison — and by the canon's dynamical-time residual by era with the definition
term removed (the third instrument above): the line is gone from the shipped series. The next
model input is a cited ocean-dissipation history that depends on the continental configuration —
it addresses the paleo interval (§9), the La2004 precession-rate difference (§8) and the
Mesoproterozoic step in one input. The four instrument findings are the sweep's practical yield,
each a bounded change the owner decides: the Jose pair (§3) is a labelled hypothesis the record
does not support as a line; the Sun tier's whitelist (§5) can carry the two lunar sidebands and
arguments of date; the swap gate's cardinal crossing (§6) should remove the wobble before
interpolating; the lunar finder (§7) now refines its events to the least distance from the
shadow axis as the solar finder does (the follow-up's step A), and the eclipse formula of date is
plan 33.

## 11. Reproduction

`tools/explore/residual-spectra/`: `spectrum.mjs` (the harness), `series.mjs` (the ΔT series and
the Jose re-fit), `series-records.mjs` (LR04 and La2004), `series-paleo.mjs`, `series-sun.mjs`
(the Sun and the cardinal instants, the swap gate's recipe), `probes.mjs` (the named-argument
table, the dense peaks, the cardinal split and crossing methods, the lunar canon's pairs, the
five-term definition fit, Meeus Ch. 49 as the third instrument), `model-internals.mjs` (the
composer's chain run slice by slice to read the lunar arguments the surface does not expose),
`write-sweep.mjs --write` (the governed artifact), and the standalone
scripts the exploration was done with (`run-*.mjs`, `classify-*.mjs`, `probe-*.mjs`). The model is
`createModel()` with its three banked artifacts; a bare model has no series and its deep elements
are the mode tail's. The artifact's `inputs` block hashes the model's sources, every record read
and these scripts; `npm run check:artifacts` names it stale when any of them moves, and
`node tools/explore/residual-spectra/write-sweep.mjs --write` regenerates it (about twenty-five
minutes). The hover of every number here is the artifact.
