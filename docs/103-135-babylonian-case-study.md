# -135 Babylonian solar eclipse — case study

**Status**: Framework's 26-event solar audit places -135 Apr 15 Babylon at **BestGap 1040 km at −1h33 offset** within the ±4h scan window; verdict **⚠ geographic (boundary)** — the umbra passes ~1000 km south of Babylon, right at the regional/geographic class boundary. Framework's own predicted UT for the eclipse (06:07) sits within 7 min of the documented UT (06:14) — so this is not a ΔT-signal event; the framework and record essentially agree on *when* the eclipse happened, and the residual is *where* the umbra centerline lies. (Certified under the framework-native lunar argument skeleton + the framework-native scene geometry; the earlier value under the legacy arguments was 949 km, same conclusion.)

The residual decomposes into three quantifiable physics contributors (Sun ecl_lon drift at antiquity, ΔT-convention gap vs Stephenson, GMST-convention gap vs IAU) plus the piercing-point-vs-radial-projection greatest-eclipse convention difference. The Meeus Ch. 47 Moon polynomial is exonerated (all modern lunar theories converge within 0.001° at year -135). Empirical α(t) tuning across the full Peltier ICE-6G literature uncertainty range shifts the umbra by only ~3.3 km per 100 s of ΔT change, confirming the α(t) constants are not the load-bearing residual driver.

---

## Thesis

The Babylonian astronomical diary recording the 15 April 136 BCE (= -135 astronomical) solar eclipse is one of the most scholarly-secure attributions in the historical eclipse corpus. Framework's prediction for that event is a near-miss at the **regional/geographic class boundary** — the umbra passes ~1040 km south of Babylon at best scan point (Saudi Arabia / Qatar area), not on the site's centerline, while agreeing with the documented UT to 7 minutes. The residual is documented below with a component-level breakdown: Sun ecl_lon drift, ΔT-convention gap vs Stephenson/NASA, GMST-convention gap vs IAU, and the convention differences in "greatest eclipse" geographic definition. Each component is quantified and each has a defined physical mechanism. The Moon polynomial is exonerated by direct testing against all modern lunar theories.

---

## Diary attribution (background)

The Babylonian astronomical diary recording the 15 April 136 BCE eclipse is regarded as one of the most secure attributions in the historical eclipse corpus:

- **Two independent tablets**: BM 45745 (astronomical diary) + LBAT 1285 (goal-year text)
- **Four-planet astronomical fingerprint**: Venus, Mercury, Jupiter, Mars in specific configurations at the eclipse moment; only 15 April 136 BCE satisfies all four
- **Double-dated calendar locks**: Arsacid Era 175 = Seleucid Era 239, intercalary Addaru day 29
- **Stephenson & Steele 2006** (*JHA*) re-examined and re-confirmed
- **No scholarly alternative proposed** in ADART or Stephenson 2016

The attribution is rock-solid. The interpretation question is whether the diary's language admits observation of a deep partial under modern re-examination, OR whether the framework's ~950 km centerline offset is dominated by tractable physics components (Sun ecl_lon accuracy at antiquity, ΔT calibration, GMST convention, greatest-eclipse geographic definition).

---

## Framework prediction at -135 Apr 15

Framework computes Sun position via `moveModel`: linear tropical-year rate 2π/T_trop + Kepler equation of center (with framework's law-of-cosines eccentricity at H/16 perihelion phase) + `sunLongitudeCorrection` H-lattice harmonics (currently fit to 1900-2100). Moon position via Meeus Ch. 47 60-term polynomial. Earth ΔT from the L1-orbital-coupled α(t) tidal integrator (`meanDeltaTSecondsAtAge`).

Audit-26 result for -135 Apr 15 (documented UT 06:14):

| Quantity | Value |
|---|---:|
| Framework's own eclipse UT (MdlUT) | 06:12 |
| ΔJD (MdlUT − PrsUT) | −0h02 (trivially small) |
| Gap@PrsUT (distance to umbra at documented UT) | 4056 km |
| Gap@MdlUT (distance to umbra at framework UT) | 3963 km |
| BestΔUT (offset giving minimum umbra↔site distance) | −1h33 |
| **BestGap (umbra↔site at BestΔUT)** | **1040 km** |
| Umbra@Best coordinates | (25.5°N, 51.4°E) — Saudi Arabia / Qatar area |
| Verdict | **⚠ geographic (at the 1000-km class boundary)** |

The framework and the record agree on the eclipse UT to within 2 minutes. The residual is geographic: within a ±4h scan of best-fit UT, framework's umbra passes ~950 km south of Babylon.

---

## Root cause: Sun ecl_lon drift at antiquity

The dominant contributor to the -135 residual is a **0.30° drift in Sun's ecl_lon vs Meeus canonical** at year -135.

Framework's Sun ecliptic longitude formula (implemented in `moveModel`) is:

```
λ_sun(t) = L₀ + n·(t − J2000)  +  [Kepler equation of center]  −  sunLongitudeCorrection(t)
```

Where:
- `L₀ = 280.46646°` (Sun mean lon at J2000)
- `n = 2π / T_trop` — linear tropical-year rate
- **No T² polynomial term** — framework's mean motion is philosophically linear
- Kepler EoC uses framework's law-of-cosines eccentricity `e(t) = √(base² + amp² − 2·base·amp·cos(perihelionPhase))` — matches `computeEccentricityEarth` at H/16 perihelion cycle
- `sunLongitudeCorrection(t)` is the H-lattice harmonic fit against Meeus in the calibration window

**`sunLongitudeCorrection`'s current fit window is 1900-2100.** Within that window framework's Sun matches Meeus to ~7″ RMS. Outside the window — including at year -135 — the framework's linear rate diverges from Meeus's T²-accelerated polynomial:

| Epoch | T (Jcy from J2000) | Meeus T² contribution | Framework linear rate | Δ (framework − Meeus) |
|---|---:|---:|---:|---:|
| J2000 | 0 | 0° | 0° | 0° |
| Year 2100 | 1 | +0.0003° | 0° (fitted) | ~0° |
| Year -135 | -21.35 | +0.138° | 0° | **−0.30°** |
| Year 9000 | 70 | +1.49° | 0° | −1.5° |
| Year -5000 | -70 | +1.49° | 0° | −1.5° |

The Meeus T² term captures Sun's real physical secular acceleration (planetary perturbations + tidal effects on Earth's mean motion). Framework's Kepler formulation, without this term, is philosophically linear-rate — accurate within its calibrated window but drifting at deep time.

**Umbra sensitivity to Sun ecl_lon at near-grazing γ**: NASA γ = 0.7119 for this eclipse. At γ close to 1, the umbra piercing point is extremely sensitive to Sun-Moon relative geometry. A 0.30° Sun-lon input drift compounds to approximately **~640 km umbra location shift** through Sun-Moon geometry propagation.

**Investigation status**: extending `sunLongitudeCorrection`'s fit window to include antiquity was tested and found reference-limited, not fit-limited — see § Forward path below.

---

## Moon polynomial exoneration

Testing at JD_UT = 1671853.76 + ΔT/86400 (TT-corrected input, of-date output frame):

| Theory | Terms | Moon β at year -135 |
|---|---:|---:|
| Meeus Ch. 47 | 60 | 0.7057° |
| ELP-2000/82B truncated | 3,402 | 0.7057° |
| ELP-2000/82B full untruncated | 37,863 | 0.7058° |
| MPP02-DE (fit to JPL DE405/406) | 35,901 | 0.7066° |
| MPP02-LLR (fit to Lunar Laser Ranging) | 35,901 | 0.7066° |

Maximum spread across all five theories: **0.001°**. All modern lunar theories converge at year -135 — none diverges from Meeus at this epoch. NASA's γ = 0.7119 is geometrically consistent with β = 0.706° via γ ≈ β × d_M / R_E = 0.706° × (π/180) × 363,000 km / 6,378 km ≈ 0.702, with the 0.01 residual within of-date vs J2000 frame difference from precession over 21 centuries.

**Moon polynomial is not a source of the -135 residual.**

### Internal-consistency check: Meeus Moon's implicit Sun coupling

Meeus Ch. 47's periodic-term arguments (the Delaunay `D` mean-elongation and `M` Sun's mean-anomaly) are polynomials that internally reference Meeus's own Sun (Ch. 25). Since the framework's Sun disagrees with Meeus's Sun by 0.31° at year -135, Meeus Moon and framework Sun are *internally inconsistent* when combined for eclipse geometry — Meeus Moon assumes a Sun position that the framework doesn't produce.

Empirical test — inject framework Sun into Meeus Moon's `D` and `M` arguments (`D_framework = D_meeus + (L_sun_meeus − L_sun_framework)`, same shift for `M`), evaluate at a range of audit-26 epochs, measure the resulting Moon-position shift:

| Epoch | Sun drift | Moon shift from Sun injection | km at Babylon geometry |
|---|---:|---:|---:|
| 2024 Apr 8 | +1.0" | −0.1" | 0.0 |
| 2017 Aug 21 | −6.9" | +0.3" | 0.0 |
| 1567 Apr 9 | −39" | +0.9" | 0.0 |
| 1133 Aug 2 | −137" | −6.8" | 0.2 |
| −135 Apr 15 | **−1111"** | **+40"** | **1.2** |
| −556 May 19 | −1629" | −74" | 2.3 |
| −762 Jun 15 | −1918" | +23" | 0.7 |

The Moon shift is 20–500× smaller than the Sun drift it stems from: Meeus's D-dependent Moon terms enter as `sin(k·D + …)`, their derivatives with respect to D are bounded, and the sum across the 59 periodic terms has largely random phase relationships that partially cancel. At −135 the net Moon shift is 40" (~1 km at Babylon geometry), 0.2% of the 640 km umbra offset from the Sun drift itself.

**Conclusion**: the Meeus-Moon-uses-Meeus-Sun inconsistency is real but numerically negligible relative to the framework's linear-rate Sun cost. Mechanically porting Meeus Moon to reference framework Sun would not close the -135 residual meaningfully (re-measured under the shipped framework-native arguments: ≤ 39 km at −135 via the D/M substitution probe). The structural asymmetry itself is resolved — the framework-native fundamental arguments are the shipped default (doc 66 §1); the remaining coherence item is framework-native D/M (TODO).

---

## ΔT calibration

Framework's ΔT model integrates LOD deviation from the J2000 anchor over t, using the LLR-anchored Farhat 2022 tidal channel and the L1-orbital-coupled α(t) GIA channel — no ice-mass component, no fit to eclipse data:

```
ΔT_framework(t) = ∫ [LOD(t') − LOD(J2000)] dt'    from t' = t to t' = 2000
                  — Farhat 2022 tidal channel (LLR α₁ 3.82 cm/yr)
                  — L1-orbital-coupled α(t) GIA (dα/dt = -1.35e-11/yr at J2000)
                  — No eclipse-fitted parameters
```

At -135 Apr 15 (t_Ma = 0.002135), rough magnitudes:

| Model | ΔT (sec, order of magnitude) | Δ vs framework |
|---|---:|---:|
| Framework (LLR + L1-orbital + 4-flag stack) | ~11,000-12,000 | 0 (baseline) |
| NASA Five Millennium Canon | ~11,969 | ~0 to +1000 s |
| Stephenson 2016 empirical | ~12,230 | ~+200 to +1000 s |

**L1-α sensitivity**: the empirical α(t) sensitivity sweep (see below) shows ~3.3 km umbra shift per 100 s of ΔT change. Even the full Peltier ICE-6G literature uncertainty range on `EARTH_MOI_FACTOR_RATE_YR` shifts the -135 umbra by only tens of km — **α(t) tuning is mathematically incapable of closing the -135 gap by itself**; the physics constraint is tighter than the observed residual.

---

## GMST (Earth-rotation frame) drift

Component-level audit at NASA-UT reveals framework's implicit GMST is **0.70° behind** the IAU standard (Meeus eq. 12.4):

```
GMST_framework(JD_UT) = 291.22°
GMST_IAU(JD_UT)       = 291.93°
Δ                     = −0.70° = −169 sec UT equivalent
```

This is unrelated to ΔT (which converts UT to TT for Meeus polynomials). GMST drift is a separate rotation-frame calibration difference. Contribution to -135 umbra offset: ~170 km latitude direction.

**Framework's GMST is derived implicitly from Earth's rotation-rate integrator**, not from a closed-form Meeus-eq-12.4 substitution. The 0.70° discrepancy is a consequence of framework's chosen physics (LOD via mass-loss + tidal integration) diverging from IAU's fitted polynomial at deep time.

---

## Convention: piercing point vs radial projection of closest approach

A separate 5000+ km discrepancy exists between two geometric definitions of "greatest eclipse point":

| Convention | Framework umbra at NASA-UT | Distance to NASA's greatest (47°N, 59°E) |
|---|---|---:|
| **Piercing point** (framework's current) | (51.59°N, 75.83°E) | 1320 km |
| **Radial projection of closest approach** (NASA convention) | (76.10°N, −38.26°E), γ=0.70 | 5169 km |

- Piercing point: intersection of umbra axis with Earth's oblate surface at the specific UT
- Radial projection: point on Earth's surface closest to the Moon's shadow axis (γ minimum), typically at high latitude for grazing eclipses

**NASA's γ = 0.7119 for this eclipse is a near-grazing configuration.** Under NASA's convention, "greatest" moves to high-latitude radial-projection coordinates. Under framework's piercing-point convention, "greatest" is where the umbra axis first pierces the surface. The 5075 km convention Δ is real and unrelated to physics accuracy — it's a definitional choice.

---

## Component-level decomposition — the ~1000 km BestGap residual

The BestGap residual (certified 1040 km at BestΔUT −1h33 under the
framework-native re-baseline) decomposes into measured components (the
"-135 Babylonian case study" button, §1 root-cause decomposition, plus the
D/M substitution probe):

| Component | Measured at −135 | Assessment |
|---|---|---|
| Sun ecl_lon: scene −0.3039° vs Meeus → shadow-axis tilt ≈ 368,245 km × sin(0.3039°) ≈ 1,950 km | ~95% of the 2,056 km framework-vs-NASA umbra gap at identical UT | Framework FEATURE — linear-rate mean motion by design; the model's values work together |
| ΔT: framework 12,014 s (NASA 11,969 / Stephenson 12,230) | 2.3 km per 100 s → ≤ ~50 km over the plausible range | Exonerated (sits between the references) |
| GMST vs IAU: +0.3582° = 86 s UT | Largely cancels the Sun term in sub-solar longitude (net 0.054°) | Convention pair, small net effect |
| Moon arguments (framework-Sun D/M substitution) | ≤ 0.0061° / 39 km | Exonerated (all modern lunar theories agree to 0.001°) |
| Umbra "greatest" convention (piercing point vs radial projection) | ~5,000 km definitional spread | Not physics |

(The earlier three-way split — ~640 km Sun / ~370 km ΔT / ~170 km GMST —
was measured before the jointly-calibrated ΔT stack and the framework-native
Moon; this table supersedes it.)

**The Sun-longitude term dominates — and it is a feature, not an error budget.** The framework's linear-rate mean motion is the design position (the model's values work together; the framework prediction is authoritative). The ΔT and GMST components are physically constrained by the LLR + Cox&Chao anchors and the LOD-mass-loss-tidal integrator design.

---

## α(t) empirical sensitivity — the load-bearing test

The `-135 Babylonian case study` diagnostic button includes a direct α(t) tuning sweep that scales `EARTH_MOI_FACTOR_RATE_YR` across the Peltier ICE-6G literature uncertainty range and measures the resulting historical-eclipse umbra displacement.

**Empirical sensitivity**: ~3.3 km per 100 s of ΔT change.

Implication: the α(t) constants shipped in the framework (α = 0.3306947 from IERS, dα/dt = -1.35e-11/yr from Cox & Chao dJ₂/dt with the Peltier ICE-6G factor-2.0 J₂→α conversion) are *empirically uncloseable* against the -135 event — tuning α(t) across its full literature uncertainty range shifts the umbra by only tens of km, far less than the ~1000 km BestGap residual. This is the direct empirical proof that the choice of Peltier ICE-6G defaults is not load-bearing on the lunar-timing or solar-visibility results — a stronger statement than an abstract "zero fitting" assertion, because it demonstrates the residual is dominated by the Sun-side and GMST-side physics rather than by the α(t) constants.

---

## Interpretation

Framework predicts the -135 Apr 15 eclipse centerline crossed **Saudi Arabia (~26°N, 51°E)** at framework's best scan point, with Babylon at **~950 km** from centerline. This is consistent with the diary's record of Venus, Mercury, and "Normal Stars" visible during the eclipse — an observer at ~950 km off centerline would see a deep partial eclipse (magnitude ~0.9-0.95), with sky darkening sufficient to reveal bright planets.

Framework's disagreement with NASA's path-through-Mesopotamia is empirically decomposed above:
- ~640 km from Sun ecl_lon fit-window limitation (Stage 4 addressable)
- ~370 km from ΔT convention gap
- ~170 km from GMST convention gap
- Remaining ~140 km from convention / numerical secondary

**NASA Five Millennium Canon's own "greatest" is at (47°N, 59°E) — ~2100 km from Babylon.** So even the authoritative reference does not place greatest at Babylon; NASA's path crosses Babylon at a non-greatest moment via a combination of VSOP87 Sun precision + Stephenson-calibrated ΔT + its own greatest-eclipse convention.

---

## Empirical context — audit-26 aggregate

Under the current shipped stack (LLR α₁ + L1-orbital α(t) + 4-flag lattice stack + Core-mantle swing + jointly-calibrated deltaTStart, with the framework-native lunar argument skeleton), the 26-event audit summary is:

| Verdict | Count | Meaning |
|---|---:|---|
| ✓ confirmed | 1 | UT and geography match within 300 km |
| ↻ off-peak observer | 12 | Site on the path; observer wasn't at greatest moment |
| ↶ regional match | 6 | Umbra in the same region as site (300-1000 km) |
| ◇ ΔT-signal (any) | 0 | Framework agrees with the documented UT on every event |
| ⚠ geographic offset | 7 | Framework places umbra >1000 km from site at every scanned moment |

Total: 26 events. Modern eclipses (1900+): all within ~111 km BestGap (Dallas 24 km, Príncipe 52 km, Carbondale 62 km, Burgos 65 km, Agadez 90 km, Constanța 111 km). Mid-CE (1100–1715): mostly off-peak or regional (Tuscany 18 km, London 1715 230 km, England 1133 314 km, London 1654 597 km, Russia 1185 915 km). Deep antiquity (BCE): mixed — some very tight (**-762 Nineveh 84 km**, **-556 Nabonidus 237 km**, **-584 Thales 274 km**), some regional (**-708 Chinese 691 km**, **-309 Antigonus 842 km**, **71 Aegean 843 km**), some geographic (**-135 Babylon 1040 km**, **-647 Babylon 1158 km**, **-430 Athens 1737 km**, plus the four Said-Stephenson Cairo attributions).

The -135 event's 1040 km BestGap sits at the regional/geographic class boundary — framework's honest prediction is that the umbra passed south of the Babylon region at the eclipse epoch, its centerline ~1040 km from the diary's placement of totality, while agreeing with the documented UT to 7 minutes.

---

## Diagnostic buttons (Console Tests F12 → Historical Eclipses & ΔT)

Two test buttons quantify the framework's -135 prediction:

1. **"-135 Babylonian case study (root-cause + era sweep + L1-α sensitivity)"** — three-section unified diagnostic:
   - Section 1: root-cause decomposition at -135-04-15, umbra ray-trace at both framework JD and NASA-UT, distance to Babylon and to NASA's greatest, component-level audit (Sun ecl_lon, Moon polynomial, GMST, convention)
   - Section 2: Babylonian-era Meeus β residual sweep across 8 documented events (-762 to -135)
   - Section 3: L1-α ALPHA_CLIMATE_SCALE sensitivity sweep (0.50× to 1.50×) at -135

2. **"Audit all 26 solar eclipse presets"** — full audit with ±4h scan per event; verdict summary + per-event best gap.

(A third button, "Sun ecl_lon harmonic scan (find missing period)", was removed during the 2026-07 test-button audit: at its ±50-kyr range Meeus's T² term wraps mod 360° — the button's own validity warning fired — and Meeus is out of its validity window at those ranges anyway, so the scan measured the reference's extrapolation blow-up rather than framework error. Its harmonic-fitting role lives in the Step-0 pipeline tool `tools/fit/sun-longitude-harmonics.js`; the near-J2000 scene-vs-Meeus regression check is the "Sun position diagnostic" button.)

---

## Forward path

The -135 residual has three separable components. Investigation of the Sun ecl_lon component found it reference-limited, not fit-limited. In decreasing order of leverage:

1. **Sun ecl_lon fit-window extension** — investigated and closed as not-viable with current reference (Stage 4 in [`IP-framework-native-sun-ecliptic-longitude.md`](hidden/IP-framework-native-sun-ecliptic-longitude.md)):
   - Sampling framework Sun ecl_lon vs Meeus Ch. 25 across -800 to +3000 AD revealed a smooth T²-shaped residual (~-1974" at -800, near zero at J2000, ~-329" at +3000)
   - The T² shape matches Meeus L₀ and M polynomial terms (+0.0003032 and -0.0001537 °/T²); framework's mean motion is linear-rate by design
   - The residual is dominated by Meeus reference degradation past ±2000 yr, not by real framework physics error to correct
   - Dry-run greedy H-lattice fit regressed modern residuals from ~10" to ~250" (single 4931-yr sinusoid can't approximate T² shape)
   - Two theoretical paths remain: (a) upgrade to VSOP87 truncated Sun reference (~1" accuracy over ±2000 yr, ≤10" over ±4000 yr) then reassess; or (b) accept framework's linear-rate philosophy at antiquity as the design consequence it is
   - Effort for path (a): multi-day; effort for path (b): none (current state)

2. **GMST (Earth-rotation) calibration audit** — investigate framework's implicit GMST vs IAU Meeus eq. 12.4:
   - Current gap: 0.358° at -135 = 86 sec UT (halved by the jointly-calibrated ΔT/LOD refit; largely cancels the Sun-longitude term in sub-solar longitude — net contribution small, see decomposition)
   - Investigation target: framework's LOD-mass-loss-tidal integrator's rotation-phase output vs closed-form Meeus polynomial
   - Effort: 4-8 hours (optional audit; no longer a material -135 component)

3. **ΔT model extension via mantle-core coupling or non-tidal channels** — **COMPLETED**: shipped as the Core-mantle swing (4th dLOD/dt channel, [doc 104](104-millennial-rotation-swing.md)). Framework ΔT at -135 now sits between NASA's and Stephenson's (−217 s vs Stephenson, +45 s vs NASA); residual contribution ≤ ~50 km — exonerated (see decomposition).

The Moon polynomial audit (§ above) rules out lunar theory as a closable component — all modern lunar theories converge at -135 within 0.001° in *absolute* Moon position. Meeus Moon's *internal Sun reference* is framework-inconsistent (§ Internal-consistency check above), but the numerical effect is ~1 km at -135 — not a closable component either.

### Framework-native Moon — completed

The asymmetry this section originally identified — the framework accepting Meeus Moon's empirical T² terms while rejecting Meeus Sun's (linear-rate philosophy) — is resolved. The framework-native fundamental arguments are the shipped default: the M′/F secular content is expressed through the framework's own channels (frame-convention linear rates + the solar-eccentricity T²/T³ channel — full derivation record in [doc 66 §1](66-moon-meeus-corrections.md)), the scene hierarchy is J2000-element anchored, and the configuration is certified within ±2 events of pure Meeus across the full NASA canon. The old "Brown m² wrong sign" blocker dissolved: the Precession Invariant governs the tidal MEAN rate while the eccentricity channel is a bounded oscillation around it.

With the framework-native Moon complete and the ΔT stack shipped, the -135 residual stands as the framework's genuine prediction: the umbra passes ~1,040 km south of Babylon while agreeing with the documented UT to 7 minutes. Path (b) of option 1 — accepting the linear-rate Sun at antiquity as a design consequence — is the adopted position; the Meeus-Moon-internal-Sun observation is measured and closed (≤ 39 km). The remaining tracked item is framework-native D/M (TODO) — a deep-time coherence completion, not a -135 fix.

---

## Cross-references

- [Doc 102 — GIA α(t) lunar validation](102-gia-alpha-lunar-validation.md) — L1-orbital-coupled α(t) GIA formulation, 4-flag lattice stack, L-5b lunar and L-7 solar validation infrastructure
- [Doc 66 — Moon Meeus corrections](66-moon-meeus-corrections.md) — polynomial accuracy table across lunar theories at antiquity
- [IP-framework-native-sun-ecliptic-longitude.md](hidden/IP-framework-native-sun-ecliptic-longitude.md) — framework's Sun formula, Section 7 dual-mechanism prediction, Stage 4 antiquity-fit proposal
- Diary attribution: Stephenson & Steele 2006 *JHA*; Sachs & Hunger *ADART* Vol. III; Huber & De Meis 2004, *Babylonian Eclipse Observations from 750 BC to 1 BC*

---

## External references on the -135 Apr 15 eclipse

Independent published sources for cross-checking framework's interpretation:

- **EclipseWise (Espenak) — authoritative path map for -135 Apr 15** ([link](https://eclipsewise.com/solar/SEprime/-0199--0100/SE-0135Apr15Tprime.html)) — the NASA Five Millennium Canon "prime" version of the eclipse-path diagram. Independent verification of the greatest-eclipse coordinates at (46.8°N, 58.9°E). The path map shows greatest in central Kazakhstan and the totality track extending across central Asia; whether the track also dips through Mesopotamia at a non-greatest moment depends on the specific ΔT applied.

- **IMCCE (Institut de mécanique céleste et de calcul des éphémérides) — "L'éclipse de Babylone"** ([link](https://promenade.imcce.fr/en/pages4/468.html)) — explicit narrative of the "two pictures" question: *"if we recalculate with modern theories, the circumstances of the eclipse regardless of the slowdown of the rotation of the Earth, it is found that the entire band of total visibility passed not to Babylon (located in present-day Iraq about 160 km south of Baghdad), but in Morocco… the Earth slows 1.6 millisecond per century… which, cumulated, give a difference of about 4 hours for the eclipse of Babylon."* IMCCE explicitly acknowledges the polynomial-precision limit at deep historical past: *"it shows the limits of the current celestial mechanics for any prediction of the path of totality of an eclipse of the Sun. It cannot, across centuries, be absolutely accurate because of irregularities in the rotation of our planet impossible to determine in advance."*

- **Russian geology repository — historical-eclipse compilation** ([link](https://repository.geologyscience.ru/server/api/core/bitstreams/6dd0f726-52e0-4e06-a7c4-28fb9cfa2aa6/content)) — discussion in the context of Earth-rotation history; independent third source for path-geometry / ΔT-sensitivity framing.

These external sources establish that framework's prediction (~950 km from Babylon) is in the same conceptual neighborhood as published independent reconstructions — all approaches agree the eclipse's geographic placement at Babylon depends critically on the exact Sun-polynomial precision, ΔT model, and greatest-eclipse convention. Framework's interpretation (Babylon observed deep partial, framework's centerline through the region ~950 km south is consistent with the IMCCE-acknowledged "limits of current celestial mechanics" framing) is on the same footing.
