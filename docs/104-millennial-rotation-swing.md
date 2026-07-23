# Doc 104 — The Millennial Rotation Swing: Core–Mantle Identification and the Difference-Tone Structure

## Status

Research synthesis — closes the former TODO item "identify the physical channel for the ~0.5 ms/century fractional non-tidal secular rate." The residual is fully decomposed; its millennial component is identified with the documented core–mantle LOD fluctuation, independently confirmed against archeomagnetic core-flow reconstructions, and found to be representable in-window as the shipped ΔT stack's own lattice difference tones with a physically motivated damping interpretation — quantified in §6 as a driven-damped-resonator formula (T₀ ≈ 3.8–4.0 kyr, low Q, in the published axiMC eigenmode range) with a first guard-passing "channel-4" implementation form. Builds on docs 93 (L1 attribution), 99 (ESSRT), 102 (GIA α), 103 (Babylonian case study). Companion scripts: `scripts/archive/lod_swing_archeomag_calibration.py`, `scripts/archive/bond_coreflow_phase_lock_test.py`, `scripts/archive/lod_residual_142yr_window_test.py`, `scripts/archive/lod_swing_difference_tones.py`, `scripts/archive/core_mantle_resonator_fit.py`, `scripts/archive/core_mantle_excitation_inversion.py`, `scripts/archive/core_mantle_channel4_feasibility.py`, `scripts/archive/lod_swing_interaction_network.py`, `scripts/archive/h26_phase_locked_test.py`, `scripts/archive/lod_residual_h46_millennial_cycle.py`, `scripts/archive/lod_residual_transient_plus_periods.py`, and the Stage-E / phantom-check instrumentation in `tools/fit/dt-corrections-fit.js`.

**Update — the swing NOW SHIPS.** After this document was written, the campaign continued (joint fit, impulse-consistent episode) and the Core-mantle swing was integrated as the model's 4th dLOD/dt driver (Resonator), default-ON, fitted jointly with the flags by `tools/fit/dt-corrections-fit.js --joint` (anchors moved with it: USNO 86400.0014, deltaTStart 56.05, Espenak RMS 12.60 s). §8's shipping constraints are therefore HISTORICAL — each was resolved as described in TODO.md ("JOINT-WORLD FLIP") and the fit tool's documentation; a full rewrite of §6/§8 to the joint-world narrative is pending (integration backlog). The research scripts referenced below now live in `scripts/archive/` (see `scripts/archive/README-resonator-2026-07.md`).

---

## 1. The phenomenon

After the framework's kinematic trend and the shipped 4-flag ΔT stack (Bond 8H/1830, Hallstatt 8H/1104, Jose5 8H/2989, Jose4 8H/3749) are removed from the Stephenson eclipse record, one aperiodic structure remains — the **millennial rotation swing**:

| Era | Behavior |
|---|---|
| −720 … +600 | Real day runs **~1.8–3.6 ms SHORTER** than the model trend (Earth fast); already full-strength at record start — onset unobservable |
| ~600 … 1000 | Gradual turnaround, centered **~900 CE** (the "990 CE bump" in ΔT is this swing's integral) |
| 1000 … 1800 | Overshoot: day **~0.5–1.1 ms LONGER** than trend (Earth slow) |
| Instrumental era | Converged; residual ≈ 0 |

The often-quoted "~0.75 ms/day missing motion" is the window-average of this swing (−0.67 ms/day computed over −720…2016). Established by elimination: it is not a constant (2D epoch sweep: the ancient window wants δ ≈ −750 μs/day, the modern window pins δ ≈ 0), not a secular rate (solar signed-drift bound r = −0.13 ± 0.09 ms/cy), and not any single lattice harmonic (H/46 test; transient-first scan of the full resolvable band).

### Identification

This is the documented **millennial LOD fluctuation** of the eclipse literature — Stephenson & Morrison's "~1,500-yr oscillation" — whose physical mechanism is **core–mantle angular momentum exchange**, demonstrated archeomagnetically by Dumberry & Bloxham (2006): episodic eastward/westward zonal flows in the outer core, inverted from archeomagnetic field models, reproduce the ±3–4 ms LOD signal in amplitude and timescale. In the framework's decomposition, the shipped Bond flag carries the quasi-periodic part of this fluctuation over the eclipse window; the swing is its aperiodic remainder.

### Amplitude budget: two engines

The amplitude excludes climate as the bulk driver. Moving ~3 ms of LOD by mass redistribution requires ~1.5 m of sea-level-equivalent ice; observed Common-Era GMSL change is ≲ 0.3 m (ceiling ~2 ms per m SLE). Therefore two look-alike ~1,500-yr phenomena coexist:

- **Climatic Bond cycle** (IRD/temperature): rotational expression ≤ ~0.5 ms — plausibly the 990 CE bump's share (Medieval-Warm-Period-scale redistribution);
- **Core–mantle swing**: ~3–4 ms — the bulk, including most of the shipped Bond flag's δLOD amplitude.

The two are inseparable inside a 2.7-kyr window (nominal beat ~26 kyr), and §5 shows they do **not** share a Holocene clock.

---

## 2. What the literature knows: periods and amplitudes

The claimed period of the millennial fluctuation is **not stable across analyses** — the literature's own record supports a broadband millennial process, not a spectral line. Every entry below rests on only 1.5–3 cycles of usable record.

| Period (yr) | Amplitude / quantity | Source | Record type |
|---|---|---|---|
| ~1,500 | LOD semi-amplitude ~4 ms | Stephenson & Morrison 1995, *Phil. Trans. R. Soc. A* 351; Stephenson, Morrison & Hohenkerk 2016, *Proc. R. Soc. A* 472:20160404 | Eclipse/occultation LOD, 720 BC–AD 2015 |
| ~1,500 | ±~4 ms LOD; matching episodic zonal core flows ~0.1°/yr | Dumberry & Bloxham 2006, *GJI* 165:32–46 | Core-flow inversion of CALS-family archeomagnetic model |
| millennial, episodic | Eastward drift AD 1000–1400, westward since 1400; direction changes < 100 yr | Dumberry & Finlay 2007, *EPSL* 254:146–157 | CMB drift analysis, last 3 kyr |
| ~600 + ~1,800 | Zonal-flow oscillations reproducing eclipse-LOD amplitude | Wardinski & Korte 2008, *JGR* 113:B05101 | Core-flow inversion, 5000 BC–AD 1950 |
| bimillennial pulses | Zonal flow always westward, mean 0.09°/yr; LOD matches eclipse clock error ≥ 1,200 yr | Suttie, Nilsson, Gillet & Dumberry 2025, *EPSL* 652:119185 | 9,000-yr palaeoflow inversion |
| 1,150 (obs.); 725–825 + 1,550–1,700 (flows) | EMD characteristic periods; predicted ΔLOD −6…+4 ms | Rivera, Pavón-Carrasco & Osete 2026, *G³* 27:e2025GC012475 (open access) | SHAWQ-family core-flow inversion, last 3,300 yr |
| ~1,000–1,400 + ~2,000 | Shared spectral peaks, eclipse ΔLOD vs dipole/quadrupole field energies | Puente-Borque et al. 2025, *PEPI* 362:107350 | Paleomagnetic-model / LOD correlation |
| ~1,350 (or 2,700/2) | Quasi-periodic dipole-tilt cyclicity | Nilsson, Muscheler & Snowball 2011, *EPSL* 311:299–305 | Holocene dipole-tilt reconstruction |
| 1,125 | Recurrence from interference of two high-latitude westward-drift waveforms | Nilsson, Suttie, Korte, Holme & Hill 2020, *GJI* 222:1423–1432 | 9,000-yr archeomagnetic drift analysis |
| ~800 + ~2,200; ~5,900 | Geomagnetic (incl. non-dipole) modulation of ¹⁴C/¹⁰Be production | Pavón-Carrasco et al. 2018, *Sci. Rep.* 8:9820 | Cosmogenic radionuclides vs field models |
| ~2,400 (Hallstatt) | Contested: solar (Usoskin et al. 2016, *A&A* 587:A150) vs geomagnetic (Pavón-Carrasco 2018) | — | Radionuclide reconstructions |
| few centuries | "Archeomagnetic jerks" (~10 events / 5 kyr), controversially correlated with cooling events | Gallet, Genevey & Fluteau 2005, *EPSL* 236:339; Gallet et al. 2006, *EPSL* 246:17 | Archeomagnetic |

Decadal context (relevant to §6): ~6-yr torsional/Alfvén waves (Gillet, Jault, Canet & Fournier 2010, *Nature* 465:74; amplitude ~0.12 ms), ~8.6-yr (Duan & Huang 2020, *Nat. Commun.* 11:2273; ~0.08 ms, extrema lock to geomagnetic jerks), ~13.5-yr line in modern LOD (Hsu et al. 2021, *J. Geodesy* 95:55; Ding & Jiang 2024, *Sci. China Earth Sci.*, 13.6-yr GPS⇄LOD⇄geomagnetic reverse-phase triplet), 18.6-yr lunar nodal tide (theory 0.126–0.160 ms: Defraigne & Smits 1999; IERS Conventions 2010; Ray & Erofeeva 2014, *JGR* 119:1498), ~60-yr MAC-layer waves (Buffett 2014, *Nature* 507:484), ~65-yr slow torsional (Zatman & Bloxham 1997, *Nature* 388:760).

---

## 3. What the literature knows: cause theories

1. **Fluctuating thermal/magnetic winds** (Dumberry & Bloxham 2006) — the default: temporal changes in axial gradients of azimuthal flow tied to fluctuating latitudinal density gradients; convective turnover ~500 yr naturally produces millennial variation. Required core–mantle torque ~10¹⁷–10¹⁸ N·m, within reach of gravitational + electromagnetic coupling.
2. **Axisymmetric Magneto-Coriolis (axiMC) eigenmodes** — Dumberry, Gerick & Gillet 2025, *GJI* 240:2076: predicted periods **one to a few thousand years (gravest mode ~3,000 yr)**, quality factors **Q ~ 1–10** — damped resonances, episodically re-excited, explicitly proposed to "exchange axial angular momentum with the mantle and hence… explain a part of the observed millennial changes in length of day." The only published wave theory aimed squarely at this band.
3. **Stochastic/chaotic convection** (red noise, no oscillator) — the null hypothesis; no published analysis demonstrates the millennial line rises above red noise with > 2–3 cycles of record.
4. **Ruled out for this band**: torsional oscillations (fundamental ~6 yr since Gillet 2010), inner-core superrotation oscillations (decadal-to-multidecadal only; the mantle–inner-core gravitational mode may not even survive in the strong-field regime — Dumberry 2025, arXiv:2505.21271), gravitational-coupling oscillations (decadal).
5. **External/astronomical forcing**: no published mechanism converts astronomical forcing into a 500–2,000-yr core oscillation. Precession/tidal mechanical forcing of the geodynamo exists as a *power-budget* argument (Malkus 1968, *Science* 160:259; Le Bars, Cébron & Le Gal 2015, *Annu. Rev. Fluid Mech.* 47:163; Andrault, Monteux, Le Bars & Samuel 2016, *EPSL* 443:195 — which notes mechanically driven core flow would be episodically variable) but derives no millennial period. Planetary-tidal dynamo synchronization exists only for the Sun (Stefani et al. 2019, *Sol. Phys.* 294:60 — 11.07-yr Venus–Earth–Jupiter beat, Suess–de Vries and Hallstatt as further beats; rebutted by Nauman et al. 2022). Solar-heliospheric planetary claims for Hallstatt (Abreu et al. 2012, *A&A* 548:A88; Scafetta et al. 2016, *Earth-Sci. Rev.* 162:24; Charvátová 2000, *Ann. Geophys.* 18:399) concern the Sun, not the core. No published work ties the Jupiter–Saturn synodic family to core/LOD millennial signals — the framework's beat interpretation (§6) has **no published competitor and no published support**.
6. **Predictability**: geodynamo e-folding time ~30 yr (Hulot, Lhuillier & Aubert 2010, *GRL* 37:L06305; Lhuillier, Aubert & Hulot 2011, *GJI* 186:492); practical forecast horizon half-to-one century (Aubert 2015, *GJI* 203:1738; Sanchez, Wicht & Bärenzung 2020, *EPS* 72:157). **No deterministic millennial core-flow prediction exists in the literature**; at best, statistical phase persistence over one or two cycles if a low-Q eigenmode or a stable drift-interference pattern (Nilsson et al. 2022, *PNAS* 119:e2200749119) exists.

---

## 4. Independent confirmation: archeomagnetic cross-checks

Script: `scripts/archive/lod_swing_archeomag_calibration.py` → `data/lod-swing-archeomag-calibration.json`.

**Same-lineage consistency (observational).** Against the state-of-the-art observational LOD residual (Kiani Shahvandi et al. 2024, *GRL* 51:e2024GL111148 companion data, Zenodo 13885017, CC-BY 4.0 — Morrison et al. 2021 Addendum lineage; local copy `data/kiani-shahvandi2024-lod-residual.txt`):

| Framework component | r vs observed residual |
|---|---|
| 4-flag stack alone | +0.84 |
| swing alone | +0.37 |
| **stack + swing** | **+0.91** |

**Independent lineage (geomagnetic).** Against the SHAWQ-flow ΔLOD predictions of Rivera et al. 2026 (Figure 9a digitized from the open-access vector PDF → `data/rivera2026-fig9a-digitized.json`; digitization QC r = 0.82 vs the Zenodo series):

- Control reproduces the paper: band-filtered prediction vs observed r ≈ 0.62/0.63 at 280/340-yr lead (published: ~0.6 at 291/315 yr).
- **Adding the swing improves every comparison**: PT 0.39 → 0.48; TG 0.44 → 0.52 (band-filtered, lead-scanned).

**Conclusion: confirmation, not calibration.** The swing is independently confirmed as core–mantle physics by a non-eclipse data lineage. But all archeomagnetic flow predictions lead the observed rotation by a fitted ~100–430 yr (Rivera's comparative table: Dumberry & Bloxham 109 yr, Wardinski & Korte 186 yr, Suttie 428 yr, Rivera 291–315 yr) and raw-curve agreement is only ~0.4 — deriving stack amplitudes/phases from flows would degrade the eclipse fit. Zero-eclipse-fit via archeomagnetic calibration is not achievable at current field-model quality.

---

## 5. The Holocene phase-lock test (negative result, recorded deliberately)

Script: `scripts/archive/bond_coreflow_phase_lock_test.py` → `data/bond-coreflow-phase-lock-test.json`.

Hypothesis (formulated as a falsifiable prediction, tested before publication): if the climatic Bond cycle and the core swing both ride the 8H/1830 = 1,465.9-yr clock, Bond IRD events and archeomagnetic core-flow episodes must be phase-locked across the Holocene. Data: Bond et al. 2001 stacked %HSG (*Science* 294:2130, NOAA archive; local `data/bond2001-raw.txt`) and CAM ΔLOD derived from the CFF joint field+flow models (Nilsson, Suttie, Troyano, Gillet, Aubert & Irbäck, *jSEDI*, doi:10.46298/jsedi.17320; EarthRef ERDA 2776; derived series `data/cff-coreflow-lod-derived.json`, LOD = 1.138(t₁⁰ + 12⁄7 t₃⁰) per Jault et al. 1988 / Jackson et al. 1993).

**Result: no lock, at every level.**

- Bond events are quasi-periodic (Rayleigh vs 1,465.9 yr: p ≈ 0.75–0.82; spacings 800–2,200 yr, mean 1,338 ± 430);
- the Bond stack's spectrum peaks at **~1,000 and ~2,450 yr** with almost nothing at 1,466 (R² = 0.046) — independently reproducing Obrochta et al. 2012 (*Quat. Sci. Rev.* 55:23, the "1,500-yr cycle" as a ~1,000/~2,000-yr mixture); note the 2,450-yr peak coincides with the framework's Hallstatt label (8H/1104 = 2,430 yr);
- CFF core-flow episodes: Rayleigh p ≈ 0.9; CFF spectral power at 1,466 yr ≈ 0.004 (its peaks: ~3,000–3,300 yr);
- cross-coherence (millennial band, ±1,000-yr lags): max r = 0.34, below the phase-randomized null p95 = 0.49.

The 8H/1830 flag is what the eclipse window shows it to be — the periodic part of the millennial fluctuation over the last 2.7 kyr — **not** a Holocene-wide shared clock. Caveat: CFF posterior σ (~2 ms) limits statistical power before ~2000 BCE.

---

## 6. The difference-tone structure

Script: `scripts/archive/lod_swing_difference_tones.py` → `data/deltaT-swing-difference-tones.json`.

### Lattice closure under beats

The beat of two lattice tones is itself a lattice tone: **beat(8H/n₁, 8H/n₂) = 8H/(n₁−n₂)**. Nonlinear intermodulation of shipped cycles can therefore only generate lattice periods — a falsifiable structural statement. The shipped pairs give:

| Pair | Δn | Period |
|---|---|---|
| bond − hallstatt | 726 | 3,695 yr |
| jose4 − jose5 | 760 | 3,530 yr |
| bond − jose4 | 1919 | 1,398 yr |
| hallstatt − jose5 | 1885 | 1,423 yr |
| bond − jose5 | 1159 | 2,315 yr |
| hallstatt − jose4 | 2645 | 1,014 yr |

### Findings

1. **The swing is the stack's two dominant difference tones, in-window.** Forcing exactly n = 726 (3,695 yr) and n = 2645 (1,014 yr) — amplitudes/phases fitted, divisors fixed a priori — collapses the post-stack residual from 268.8 to 38.3 s RMS (~98% of variance; amplitudes ~395 + 77 s). A blind scan over 6,328 divisor pairs independently selects the same tone pair.
2. **Zero-parameter phase test.** Quadratic mixing predicts each difference tone's phase as φ₁ − φ₂ of its shipped parents. The 1,014-yr tone matches within **22° (62 yr)**; the 3,695-yr tone within 50° (509 yr) — the latter fits only ~0.7 of a period in-window, so its phase is weakly constrained in both directions. Joint chance coincidence ~3% (suggestive, not decisive).
3. **Sum tones are absent.** Quadratic mixing also creates sum tones (n₁+n₂); all four sit at or below the 14.6-s noise floor while the difference tones carry ~400 s. The mixing element **integrates** — a low-pass rectifier, which is physically correct for core–mantle coupling with multi-century time constants.
4. **Envelope timing.** The deterministic beat envelopes of the shipped pairs (zero free parameters) place the hallstatt×jose5 destructive minimum at **997 CE** — the swing's turnaround — and near-total jose4×jose5 cancellation at ~44 CE.
5. **Constant amplitudes are vetoed** by the modern window (~1.5 ms/day predicted vs ≈ 0 observed): the tones must decay toward the present.

### Physical carrier

Item 5 is not a defect — it is the signature the axiMC eigenmode theory predicts. Dumberry, Gerick & Gillet 2025's gravest mode (~3,000 yr, Q ~ 1–10) sits at the framework's beat periods (3,530–3,695 yr); low Q means the mode rings down in one-to-few cycles unless re-excited. The synthesis:

> **The core acts as a damped, low-pass resonator. The lattice cycles' beat envelope supplies the excitation clock; the core rectifies it (difference tones, no sum tones) and rings down between excitations (quiet modern window). The literature's inability to agree on "the period" (1,150 vs 1,350 vs 1,500 vs 2,000 yr) is expected: a damped resonator excited by several beats has characteristic times, not an eigenline.**

Framing discipline: this is a **kinematic identification with a candidate physical carrier**, not a claimed mechanism. No published work supports astronomical pacing of this band (§3.5) — and none opposes it with a specific competitor for these numbers.

### Climate-archive corollary

If multiple slow systems (core, and the solar/heliospheric modulation recorded in radionuclides) rectify the same beat structure, the *archives record the difference tones, not the carriers*. This would explain in one stroke: (a) why the Bond IRD spectrum peaks at ~1,000 yr (≈ the 1,014-yr hallstatt−jose4 tone; the "Eddy" band of the solar literature) and ~2,450 yr (Hallstatt itself) rather than at the 1,466-yr flag; and (b) why the Hallstatt cycle's attribution is genuinely contested between solar and geomagnetic origins (Usoskin vs Pavón-Carrasco) — both record the same rectified beat. Testable: difference-tone *phases* in the climate archives.

### The resonator formula, quantified

Script: `scripts/archive/core_mantle_resonator_fit.py` → `data/core-mantle-resonator-fit.json`.

Three formula candidates were fitted to the post-stack residual with the H/46-guard discipline (modern-window mean |δLOD| ≤ 0.2 ms/day, Espenak shape ≤ 5 s, |δLOD(2000)| ≤ 0.1 ms/day):

| Model | Free parameters | RMS (from 268.8 s) | Best fit | axiMC range? |
|---|---|---|---|---|
| B0 flat rectifier `k·LP_τ[F²]` | k, τ | 258 s | τ = 100 yr | — |
| A1 rectifier→resonator (steady state) | k, T₀, Q | 66 s | T₀ = 3,900 yr, Q = 8 | yes |
| A2 free ring-down (transient) | T₀, Q, a, b | 53 s | T₀ = 3,800 yr, Q = 1.75 | yes |

Two structurally different models independently select **T₀ ≈ 3.8–3.9 kyr** — inside the published axiMC eigenmode range they were not told about — while the flat rectifier fails: **the frequency selection of a resonance is required**, not passive low-passing. A2's Q = 1.75 gives a decay time ~2,100 yr (right order for "full-strength in antiquity, faded by the telescope era"). Both variants nevertheless fail the modern-window guards (constant or insufficiently decayed amplitude), which motivates the channel-4 form below. Five independent arrows now point at one object: the blind two-tone scan (~3.7–3.8 kyr), the bond−hallstatt difference tone (3,695 yr), the CFF core-flow spectrum (3,020–3,330 yr), and both resonator fits.

### The interaction network: Δn = 34 phase-locking

Script: `scripts/archive/lod_swing_interaction_network.py` → `data/deltaT-swing-interaction-network.json`.

All four flags interact — cooperatively, not democratically. Weighting each pair's forcing (AᵢAⱼ/2) by the eigenmode gain |H| at its beat frequency (T₀ = 3,900 yr, Q = 8):

| Pair | Beat | Share of response |
|---|---|---|
| bond × hallstatt | 3,695 yr | 86.9% |
| jose5 × jose4 | 3,530 yr | 6.1% |
| bond × jose5 | 2,315 yr | 5.1% |
| bond × jose4 | 1,398 yr | 1.3% |
| hallstatt × jose5 | 1,423 yr | 0.4% |
| hallstatt × jose4 | 1,014 yr | 0.2% |

The key structural fact: the difference-tone spectrum self-organizes into **locked bands**. bond−hallstatt (Δn 726) and jose4−jose5 (Δn 760) are split by only Δn = 34 → their relative phase turns once per 8H/34 = 78,898 yr — rigidly phase-locked over any Holocene window, forming **one coherent ~3.6-kyr band carrying 93% of the response that requires all four flags to build**. The same Δn = 34 splitting locks hall−jose5 (1885) with bond−jose4 (1919) at ~1.4 kyr. Roles separate cleanly: the locked ~3.6-kyr band is the *engine* (power); the fast hallstatt×jose4 envelope (1,014 yr) is the *timer* (it sets the in-window forcing-extremum epochs). Driving-side correlations indicate the coupling is selective (pair-dependent efficiency/sign; uniform F² does worse than individual pairs), though with ~6 effective dof in-window no single-pair attribution is decisive.

### Excitation: the recovered driving history

Script: `scripts/archive/core_mantle_excitation_inversion.py` → `data/core-mantle-excitation-inversion.json`.

Because the oscillator equation is known, the forcing is recoverable by deconvolution: f(t) = ÿ + (ω₀/Q)ẏ + ω₀²y. Applied to the observed LOD residual and the CFF core-flow ΔLOD: (a) the driving is **smooth, not impulsive** (kurtosis within phase-randomized surrogates — continuous envelope-modulated forcing, not discrete kicks); (b) in the well-measured window the forcing reverses sign across the ~900 CE turnaround — a push centered at 730 CE and a pull at 1220 CE — landing **7–10 yr from consecutive extrema of the hallstatt×jose4 envelope** (deterministic max 723 / min 1230, zero free parameters); (c) a third appearance of the low-pass signature: the recovered *forcing* correlates with pair products containing sum tones (bond×hall's 914-yr component) while the *response* contains none (|H| at 914 yr ≈ 0.06). Statistical weight of the timing link: p = 0.02 uncorrected, ~0.06 after multiplicity, n = 2 events, partial circularity (stack phases fitted to the same eclipse record) — **suggestive, not established; "as-if" status**.

### Channel-4 feasibility: the first guard-passing model

Script: `scripts/archive/core_mantle_channel4_feasibility.py` → `data/core-mantle-channel4-feasibility.json`.

Two implementation routes tested:

- **5th stack cycle (constant amplitude): architecturally dead.** The modern window caps a persistent 1,014-yr tone at 18.5 s (the free fit wants 59 s); at that ceiling it absorbs 1.7 s of RMS. Constant-amplitude cycles cannot carry a decayed signal — the same wall the h253 experiment hit, now understood physically.
- **4th force (transient resonator): feasible.** The fully decaying composite — eigenmode ring-down + hallstatt×jose4 drive tone at the *locked* predicted phase (φ_hall − φ_jose4 = +103.3°), all sharing one episodic decay envelope — reaches **RMS 118.8 s (80% of the swing's variance) with ALL guards passing** (modern 0.151 ms/day, shape 0.79 s, δLOD(2000) = 0.098) at T₀ = 4,000 yr, Q = 0.55, decay ~700 yr. Caveats: Q sits at the near-critical grid edge (in-window the "oscillation" is effectively one aperiodic arc), and the launch epoch is pinned at −720 (record start) for want of a physical excitation convention.

**The formula as it stands:**

> **channel 4 = env(t; T₀, Q, t_launch) × [eigenmode ringing + locked drive-tone response], driven by the Δn = 34-locked four-cycle beat band through quadratic (low-pass) coupling** — T₀ ≈ 3.8–4.0 kyr and low Q externally corroborated (axiMC); drive-phase attribution as-if (n = 2).

### Tested and rejected external drivers

Two astronomically flavored driver hypotheses were tested and rejected for the swing (both preserved as scripts/artifacts):

1. **Earth-planet perihelion alignments** (invariable-plane-explorer epochs): alignment epochs vs CFF core-flow episodes give p = 0.58 (Monte-Carlo nearest-distance null) and no alignment marks the ~900 CE turnaround; independently, the configuration clocks (≥ ~11–70 kyr per Earth-relative perihelion synodic) are 5–20× too slow to pace the 1–3.5-kyr episodes. At most a slow modulating layer; not the driver.
2. **H/26 = 12,896.8-yr J/S-symmetric alignment comb** (`scripts/archive/h26_phase_locked_test.py` → `data/h26-phase-locked-test.json`): a ~12.9-kyr line IS archive-significant (free and epoch-locked fits both clear permutation p95 in Cheng ~50 cycles, EPICA ~62, GISP2 ~3.9) — but the superposed-epoch fold shows a **distributed pattern, not peaks** (no event-like anomaly at any alignment epoch), part of EPICA's significance is ~100-kyr termination aliasing, and the alignment comb is degenerate to ~295 yr with the framework's perihelion-solstice (semi-precession) comb — mechanism attribution open, and irrelevant to the swing on timescale grounds. Retained as a genuine archive result of the broader lattice program.

---

## 7. The 14.2-yr peak (closed alongside)

Script: `scripts/archive/lod_residual_142yr_window_test.py` → `data/deltaT-142yr-window-test.json`.

The ~14.2-yr line in the 270-observation eclipse residual is a **sampling-window artifact**: (a) physical ceiling — the observations span −720…+1280 with ~10³-s timing noise, and a real 0.15-ms decadal LOD line integrates to only ~0.12 s of ΔT (SMH 2016: decadal fluctuations resolved only after +1600); (b) the observation epochs' own spectral window peaks at **14.30 yr** (2nd-strongest structure, part of a ~7.15-yr harmonic comb ≈ the 88-lunation eclipse cycle) — a property of *when* eclipses were recorded, which also explains why it passed subset-robustness checks. The genuine 13.5–13.6-yr core mode (Hsu 2021; Ding & Jiang 2024) is undetectable at ancient noise; no framework component is warranted.

---

## 8. Shipping constraints and forward path

The swing does **not** enter the runtime model because:

1. **Envelope formalism missing** — the harmonic-only correction architecture has no damped-amplitude machinery, and constant-amplitude difference tones violate the modern instrumental window (~1.5 ms/day). The guard-passing channel-4 form (§6) specifies exactly what the extension would need: an episodic decay envelope env(t; T₀, Q, t_launch).
2. **Excitation-epoch convention missing** — the feasibility fit launches at −720 (record start) only because that is where the data begins; a physical convention (e.g., envelope-extremum-locked) is undecided, and the drive attribution rests on n = 2 forcing extrema.
3. **Eclipse-fit purity** — the tone amplitudes/phases are eclipse-fitted; archeomagnetic calibration cannot yet replace them (§4).
4. **Anchor discipline** — any millennial component must close the J2000 LOD anchor (precedent: the earlier Bond-integration attempt was reverted for breaking it).

What would change this: (i) an archeomagnetic flow model without the ~300-yr lead systematic, enabling external calibration (an ArchKalmag14k-based flow/LOD series is the watch item); (ii) adopting the envelope architecture and an excitation-epoch convention so the guard-passing channel-4 form can be integrated with anchor closure; (iii) confirmation of the difference-tone phases in independent climate archives; (iv) more forcing extrema than two — only a longer clean record can firm up the drive attribution.

Remaining open questions: the ~12-s irreducible 8H/2024 content (Stage-E floor of `tools/fit/dt-corrections-fit.js`); the 3,695-yr tone's phase (window-degenerate — only a longer record or external data can pin it); paper component-(ii) wording update.

---

## 9. Data provenance

| Artifact | Source | License/access |
|---|---|---|
| `data/kiani-shahvandi2024-lod-residual.txt` | Zenodo 13885017 (Kiani Shahvandi et al. 2024 GRL + Morrison et al. 2021 Addendum) | CC-BY 4.0 |
| `data/rivera2026-fig9a-digitized.json` | Rivera et al. 2026, *G³* e2025GC012475, Fig. 9a (vector-PDF digitization; axis calibration on tick combs; QC r = 0.82) | CC-BY 4.0 |
| `data/cff-coreflow-lod-derived.json` | EarthRef ERDA 2776 (`cff.models.zip`, 503 MB, not stored in repo) → CAM ΔLOD from posterior flow coefficients | Public (EarthRef) |
| `data/bond2001-raw.txt` | NOAA NCEI paleoclimatology, Bond et al. 2001 drift-ice stack | Public domain |
| `data/deltaT-swing-difference-tones.json` etc. | This repo's analysis scripts (see Status) | — |

## 10. Sources

**Eclipse LOD record:** Stephenson & Morrison 1995, *Phil. Trans. R. Soc. A* 351:165; Stephenson, Morrison & Hohenkerk 2016, *Proc. R. Soc. A* 472:20160404; Morrison, Stephenson, Hohenkerk & Zawilski 2021, *Proc. R. Soc. A* 477:20200776 (Addendum).

**Core-flow / archeomagnetic:** Dumberry & Bloxham 2006, *GJI* 165:32; Dumberry & Finlay 2007, *EPSL* 254:146; Wardinski & Korte 2008, *JGR* 113:B05101; Nilsson, Muscheler & Snowball 2011, *EPSL* 311:299; Nilsson et al. 2020, *GJI* 222:1423; Nilsson et al. 2022, *PNAS* 119:e2200749119; Suttie et al. 2025, *EPSL* 652:119185; Rivera, Pavón-Carrasco & Osete 2026, *G³* 27:e2025GC012475; Puente-Borque et al. 2025, *PEPI* 362:107350; Pavón-Carrasco et al. 2018, *Sci. Rep.* 8:9820; Gallet, Genevey & Fluteau 2005, *EPSL* 236:339; Gallet et al. 2006, *EPSL* 246:17; Nilsson et al. (CFF), *jSEDI*, doi:10.46298/jsedi.17320.

**Core dynamics theory:** Dumberry, Gerick & Gillet 2025, *GJI* 240:2076 (axiMC modes); Buffett 2014, *Nature* 507:484; Buffett, Knezek & Holme 2016, *GJI* 204:1789; Hori, Jones & Teed 2015, *GRL* 42:6622; Gillet, Jault, Canet & Fournier 2010, *Nature* 465:74; Zatman & Bloxham 1997, *Nature* 388:760; Duan & Huang 2020, *Nat. Commun.* 11:2273; Hsu et al. 2021, *J. Geodesy* 95:55; Ding & Jiang 2024, *Sci. China Earth Sci.* (10.1007/s11430-024-1415-1); Dumberry 2025, arXiv:2505.21271.

**Rotation / LOD explanation & prediction:** Kiani Shahvandi et al. 2024, *GRL* 51:e2024GL111148; Kiani Shahvandi et al. 2024, *PNAS* 121:e2406930121; Gross, Fukumori & Menemenlis 2005, *JGR* 110:B09405; Hulot, Lhuillier & Aubert 2010, *GRL* 37:L06305; Lhuillier, Aubert & Hulot 2011, *GJI* 186:492; Aubert 2015, *GJI* 203:1738; Sanchez, Wicht & Bärenzung 2020, *EPS* 72:157.

**Astronomical-forcing literature (assessed, none applicable to this band):** Malkus 1968, *Science* 160:259; Le Bars, Cébron & Le Gal 2015, *Annu. Rev. Fluid Mech.* 47:163; Andrault, Monteux, Le Bars & Samuel 2016, *EPSL* 443:195; Stefani et al. 2019, *Sol. Phys.* 294:60 (+ Nauman et al. 2022 rebuttal); Abreu et al. 2012, *A&A* 548:A88; Scafetta et al. 2016, *Earth-Sci. Rev.* 162:24; Charvátová 2000, *Ann. Geophys.* 18:399; Keeling & Whorf 2000, *PNAS* 97:3814; Greff-Lefftz & Legros 1999, *Science* 286:1707.

**Climate archives:** Bond et al. 2001, *Science* 294:2130; Obrochta et al. 2012, *Quat. Sci. Rev.* 55:23; Usoskin et al. 2016, *A&A* 587:A150.

**Tidal (18.6-yr) reference values:** Defraigne & Smits 1999, *GJI* 139:563; IERS Conventions 2010; Ray & Erofeeva 2014, *JGR* 119:1498.
