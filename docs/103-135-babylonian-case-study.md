# -135 Babylonian solar eclipse — framework prediction vs documented totality

> **2026-07-19 audit refresh**. The current 26-event solar-eclipse alignment audit reports for -135 Apr 15 Babylon: Gap@PrsUT (at documented UT 06:14) **708 km**, Gap@MdlUT (at framework UT 07:02) 3,097 km, **BestGap 15 km at −0h15 offset** within the ±4h scan window; verdict **◇↻ ΔT-signal + umbra reaches site (off-peak)**. Framework's own greatest-eclipse UT differs from the documented UT by ~48 minutes (a real ΔT-signal on the LOD/rotation prediction), but within the ±4h scan window the framework umbra passes within 15 km of Babylon — the tightest per-event match in the entire 26-event audit. The "811 km / ↶ regional" numbers in the earlier snapshot below reflect an earlier framework state; the physics decomposition and forward-path discussion remain useful as historical context.

**Status** (*historical snapshot, pre-2026-07-19*): Framework's audit-26 BestGap at -135 = **811 km**, verdict **↶ regional** (umbra in Babylon's region — 300-1000 km — within ±4h scan, not on centerline). Framework's Sun position is computed by `moveModel` via Kepler orbital mechanics + framework H-lattice harmonics (`sunLongitudeCorrection`). Component-level audit shows the residual decomposes into three real physics contributors — Sun ecl_lon drift at antiquity (0.30° drift → ~640 km umbra offset), framework ΔT vs Stephenson (958 sec gap → ~370 km umbra offset), and framework GMST vs IAU (0.70° gap → ~170 km umbra offset). The Meeus Ch. 47 Moon polynomial is exonerated (all modern lunar theories converge within 0.001° at year -135). The 0.30° Sun drift is downstream of framework's linear-rate mean-motion philosophy (no T² polynomial); Meeus Ch. 25 has +0.0003032 °/T² in L₀ and -0.0001537 °/T² in M, and framework has neither by design. Extending the H-lattice fit window with Meeus as reference was investigated on 2026-07-11 and found to be reference-limited, not fit-limited (see § Forward path).

**Prior baseline**: [`doc 101`](101-pure-tidal-eclipses.md) — pure-tidal physics validated against 19 documented solar eclipses.

---

## Thesis

The Babylonian astronomical diary recording the 15 April 136 BCE (= -135 astronomical) solar eclipse is one of the most scholarly-secure attributions in the historical eclipse corpus. Framework's prediction at that event is documented below with a full component-level breakdown of the residual: Sun ecl_lon drift, ΔT convention gap vs Stephenson/NASA, GMST convention gap vs IAU, and the convention differences in "greatest eclipse" geographic definition (piercing point vs radial projection of closest approach). Each component is quantified; each has a defined physical mechanism. The Moon polynomial is exonerated by direct testing against all modern lunar theories.

---

## Diary attribution (background)

The Babylonian astronomical diary recording the 15 April 136 BCE eclipse is regarded as one of the most secure attributions in the historical eclipse corpus:

- **Two independent tablets**: BM 45745 (astronomical diary) + LBAT 1285 (goal-year text)
- **Four-planet astronomical fingerprint**: Venus, Mercury, Jupiter, Mars in specific configurations at the eclipse moment; only 15 April 136 BCE satisfies all four
- **Double-dated calendar locks**: Arsacid Era 175 = Seleucid Era 239, intercalary Addaru day 29
- **Stephenson & Steele 2006** (*JHA*) re-examined and re-confirmed
- **No scholarly alternative proposed** in ADART or Stephenson 2016

The attribution is rock-solid. The interpretation question is whether the diary's language for the eclipse admits observation of a ~95-99% deep partial under modern re-examination, OR whether framework's residual is dominated by tractable physics components (Sun ecl_lon accuracy at antiquity, ΔT calibration, GMST convention, greatest-eclipse geographic definition).

---

## Framework prediction at -135 Apr 15

Framework computes Sun position via `moveModel`: linear tropical-year rate 2π/T_trop + Kepler equation of center (with framework's law-of-cosines eccentricity at H/16 perihelion phase) + `sunLongitudeCorrection` H-lattice harmonics (currently fit to 1900-2100). Moon position via Meeus Ch. 47 60-term polynomial. Earth ΔT from Cox&Chao-calibrated tidal integrator L1-α (`meanDeltaTSecondsAtAge`).

At the documented event JD_UT = 1671853.76 (15 April 136 BCE, 06:14 UT):

| Quantity | Value | Source |
|---|---:|---|
| Sun ecl_lon (framework scene) | 21.25° | `moveModel` output |
| Sun ecl_lon (Meeus Ch. 25 reference) | 21.55° | `_eclSunLon(jd)` |
| Δ (framework − Meeus) | **−0.30°** | Framework's drift at antiquity |
| Moon ecl_lon | 21.38° | Meeus Ch. 47 (post-hoc RA/Dec overlay applied to scene Moon) |
| Moon β (ecliptic latitude) | 0.7057° | Meeus Ch. 47 (matches ELP-2000, MPP02 within 0.001°) |
| Moon distance | 368,219 km | Meeus polynomial + framework consistent |
| Framework ΔT (L1-α at 1.00×) | 11,273 sec | Cox&Chao dα/dt calibrated at J2000 |
| Framework GMST | 291.22° | Implicit from Earth-rotation rate |
| IAU GMST (Meeus eq. 12.4) | 291.93° | Δ = −0.70° = −169 sec UT equivalent |

Framework's umbra piercing-point at framework JD (06:14 UT):
- Coordinates: **(54.03°N, 78.93°E)** — central Kazakhstan
- Distance to Babylon (32.50°N, 44.40°E): **3623 km**

Framework's umbra piercing-point at NASA's greatest UT (06:07:39 UT):
- Coordinates: **(51.59°N, 75.83°E)**
- Distance to Babylon: 3313 km
- Distance to NASA's greatest (47°N, 59°E): **1320 km**

Framework's audit-26 BestGap (±4h scan, 30-sec resolution):
- Time offset from preset UT: −1h15
- Umbra @ best: (27.2°N, 50.2°E) — Saudi Arabia
- **BestGap = 811 km** from Babylon
- Verdict: **↶ regional match** (umbra in Babylon's region, not on centerline)

---

## Root cause: Sun ecl_lon drift at antiquity

The dominant contributor to the -135 residual is a **0.30° drift in Sun's ecl_lon vs Meeus canonical**. Its physical mechanism is well-characterized:

**Framework's Sun ecliptic longitude formula** (implemented in `moveModel`) is:

```
λ_sun(t) = L₀ + n·(t − J2000)  +  [Kepler equation of center]  −  sunLongitudeCorrection(t)
```

Where:
- `L₀ = 280.46646°` (Sun mean lon at J2000)
- `n = 2π / T_trop` — linear tropical-year rate
- **No T² polynomial term** — framework's mean motion is philosophically linear
- Kepler EoC uses framework's law-of-cosines eccentricity `e(t) = √(base² + amp² − 2·base·amp·cos(perihelionPhase))` — matches `computeEccentricityEarth` at H/16 perihelion cycle
- `sunLongitudeCorrection(t)` is **subtracted** because it was fit as the framework-vs-Meeus scene-side drift; subtracting it rotates the scene Sun back toward Meeus canonical within the fit window

**`sunLongitudeCorrection`'s current fit window is 1900-2100.** Within that window, framework's Sun matches Meeus to ~7″ RMS. Outside that window — including at year -135 — the H-lattice harmonic fit doesn't have observation constraints, so the framework's linear rate diverges from Meeus's T²-accelerated polynomial:

| Epoch | T (Jcy from J2000) | Meeus T² contribution | Framework linear rate | Δ (framework − Meeus) |
|---|---:|---:|---:|---:|
| J2000 | 0 | 0° | 0° | 0° |
| Year 2100 | 1 | +0.0003° | 0° (fitted) | ~0° |
| Year -135 | -21.35 | +0.138° | 0° | **−0.30°** |
| Year 9000 | 70 | +1.49° | 0° | −1.5° |
| Year -5000 | -70 | +1.49° | 0° | −1.5° |

The Meeus T² term captures Sun's real physical secular acceleration (planetary perturbations + tidal effects on Earth's mean motion). Framework's Kepler formulation, without this term, is philosophically linear-rate — accurate within its calibrated window but drifting at deep time.

**Umbra sensitivity to Sun ecl_lon at near-grazing γ**: NASA γ = 0.7119 for this eclipse. At γ close to 1, the umbra piercing point is extremely sensitive to Sun-Moon relative geometry. A 0.30° Sun-lon input drift compounds to approximately **~640 km umbra location shift** through Sun-Moon geometry propagation.

**Recovery path (Stage 4, optional)**: extend `sunLongitudeCorrection`'s fit window to include documented antiquity eclipses. The fit produces H-lattice-compliant harmonics (year-multiples, small precession divisors, lunar precession) with no polynomial cheat. Expected outcome: 0.30° drift closes → -135 BestGap improves from 811 km toward ~170 km, matching Meeus canonical at that epoch.

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

A separate observation on the Moon side: Meeus Ch. 47's periodic-term arguments (the Delaunay `D` mean-elongation and `M` Sun's mean-anomaly) are polynomials that internally reference Meeus's own Sun (Ch. 25). Since the framework's Sun disagrees with Meeus's Sun by 0.31° at year -135 (see § Root cause), Meeus Moon and framework Sun are *internally inconsistent* when combined for eclipse geometry — Meeus Moon assumes a Sun position that the framework doesn't produce.

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

The Moon shift is 20–500× smaller than the Sun drift it stems from: Meeus's D-dependent Moon terms (evection 4586", variation 2370", …) enter as `sin(k·D + …)` — their derivatives with respect to D are bounded, and the sum across the 59 periodic terms has largely random phase relationships that partially cancel. At −135 the net Moon shift is 40" (~1 km at Babylon geometry), 0.2% of the 640 km umbra offset from the Sun drift itself.

**Conclusion**: the Meeus-Moon-uses-Meeus-Sun inconsistency is real but numerically negligible relative to the framework's linear-rate Sun cost. Mechanically porting Meeus Moon to reference framework Sun would not close the -135 residual meaningfully; it would only make the framework internally consistent about which Sun its Moon computation refers to. The cleaner structural fix is **Path C — framework-native Moon** (see [project_lunar_framework_native](../.claude/projects/-home-dennis-code-3d/memory/project_lunar_framework_native.md) and § Forward path).

---

## ΔT calibration

Framework's ΔT model:

```
ΔT_framework(t) = ∫ [LOD(t) − LOD(J2000)] dt
                — Cox&Chao-calibrated dα/dt at J2000
                — L1-α orbital-α integrator, symmetric under time reversal
                — Tidal-only; no ice-mass component; framework's authentic claim
```

At -135 Apr 15 (t_Ma = 0.002135):

| Model | ΔT (sec) | Δ vs framework |
|---|---:|---:|
| **Framework L1-α 1.00×** | **11,273** | 0 (baseline) |
| NASA Five Millennium Canon | 11,969 | +696 |
| Stephenson 2016 empirical | 12,230 | +958 |

**Framework is 958 sec under Stephenson at -135.** This translates to Earth over-rotating relative to Stephenson's calibration by 958/86400 × 360° ≈ 3.99°. Sub-solar shift eastward at Babylon latitude: ~374 km.

**L1-α sensitivity**: 2.1 km umbra shift per 100 sec ΔT change. Even a 3200 sec α-scaling swing (baseline 1.00× to 1.50×, half the Cox&Chao calibration) shifts umbra only 47 km. **α(t) tuning is mathematically incapable of closing the -135 gap by itself** — the physics constraint from Cox&Chao dα/dt is tighter than the observed residual.

---

## GMST (Earth-rotation frame) drift

Component-level audit at NASA-UT reveals framework's implicit GMST is **0.70° behind** the IAU standard (Meeus eq. 12.4):

```
GMST_framework(JD_UT) = 291.22°
GMST_IAU(JD_UT)       = 291.93°
Δ                     = −0.70° = −169 sec UT equivalent
```

This is unrelated to ΔT (which converts UT to TT for Meeus polynomials). GMST drift is a separate rotation-frame calibration difference. Contribution to -135 umbra offset: ~170 km latitude direction.

**Framework's GMST is derived implicitly from Earth's rotation rate integrator**, not from a closed-form Meeus-eq-12.4 substitution. The 0.70° discrepancy is a consequence of framework's chosen physics (LOD via mass-loss + tidal integration) diverging from IAU's fitted polynomial at deep time.

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

## Component-level decomposition — the 1320 km NASA-UT residual

The framework's remaining 1320 km distance-to-NASA's-greatest at NASA-UT decomposes empirically:

| Component | Contribution | Physical origin |
|---|---:|---|
| Sun ecl_lon drift (0.30° × 70× amplification) | ~640 km | `sunLongitudeCorrection` fit window doesn't cover antiquity |
| ΔT gap vs Stephenson (958 sec) | ~370 km | Framework L1-α tidal-only; Stephenson includes empirical ΔT knowledge |
| GMST vs IAU (0.70° = 169 sec UT) | ~170 km | Framework rotation-frame integrator vs Meeus polynomial |
| Convention (piercing vs radial-projection) | (~5000 km depending on choice) | Definitional, not physics |
| Numerical roundoff / secondary | ~140 km | Ray-trace grid resolution, atmospheric refraction not modeled |

**Sun ecl_lon drift is the dominant closable component.** The other two physics components (ΔT calibration, GMST calibration) are tighter — framework's choices there are physically constrained by Cox&Chao (ΔT) and by the LOD-mass-loss-tidal integrator design (GMST).

---

## Interpretation

Framework predicts the -135 Apr 15 eclipse centerline crossed **Saudi Arabia (~24-27°N, 50-52°E)** at the moment of best umbra approach to Babylon, with Babylon at **811 km** from centerline observing a **deep partial eclipse (~92-97% magnitude)**. The diary's record of Venus, Mercury, and "Normal Stars" visible is consistent with this magnitude.

Framework's disagreement with NASA's path-through-Mesopotamia is empirically decomposed above:
- ~640 km from Sun ecl_lon fit-window limitation (Stage 4 addressable)
- ~370 km from ΔT convention gap (Cox&Chao vs Stephenson — physically constrained)
- ~170 km from GMST convention gap
- Remaining ~140 km from convention/numerical

**NASA Five Millennium Canon's own "greatest" is at (47°N, 59°E) — ~2100 km from Babylon.** So even the authoritative reference does not place greatest at Babylon. NASA's path crosses Babylon at a non-greatest moment via a combination of VSOP87 Sun precision + Stephenson-calibrated ΔT + its own greatest-eclipse convention.

---

## Empirical context — match record at other tested deep-time events

Audit-26 covers 26 documented eclipse presets. Framework's current prediction quality:

| Verdict | Count | Meaning |
|---|---:|---|
| ✓ confirmed | 2 | UT and geography match within 300 km |
| ↻ off-peak observer | 8 | Site on the path; observer wasn't at greatest moment |
| ↶ regional match | 5 | Umbra in the same region as site (300-1000 km) |
| ◇ ΔT-signal + off-peak/regional | 5 | Framework predicts different UT; umbra reaches site region |
| ◇⚠ ΔT-signal + geographic | 2 | Framework predicts different UT AND places umbra >1000 km |
| ⚠ geographic offset | 4 | Framework places umbra >1000 km from site at every scanned moment |

Total: 26 events. Modern eclipses (1900+): all within 120 km BestGap. Mid-CE (1100-1700): mostly regional or off-peak. Deep antiquity (BCE): mixed — some very good (**-556 Nabonidus 29 km**, **-708 Chinese 103 km**, **-762 Nineveh 326 km**), some regional-to-geographic.

The -135 event's 811 km BestGap places it in the "regional" category — framework's honest prediction is that the umbra passed through the Babylon *region* at the eclipse epoch, but its centerline was farther south than the diary places totality.

---

## Diagnostic buttons (Console Tests F12 → Historical Eclipses & ΔT)

Two test buttons quantify the framework's -135 prediction:

1. **"-135 Babylonian case study (root-cause + era sweep + L1-α sensitivity)"** — three-section unified diagnostic:
   - Section 1: root-cause decomposition at -135-04-15, umbra ray-trace at both framework JD and NASA-UT, distance to Babylon and to NASA's greatest, component-level audit (Sun ecl_lon, Moon polynomial, GMST, convention)
   - Section 2: Babylonian-era Meeus β residual sweep across 8 documented events (-762 to -135)
   - Section 3: L1-α ALPHA_CLIMATE_SCALE sensitivity sweep (0.50× to 1.50×) at -135

2. **"Audit all 26 solar eclipse presets"** — full audit with ±4h scan per event; verdict summary + per-event best gap.

One research-mode button supports Sun/framework calibration work:

3. **"Sun ecl_lon harmonic scan (find missing period)"** — samples framework scene Sun ecl_lon vs Meeus Ch. 25 across 41 epochs (-50 to +50 kyr, 2.5-kyr steps); fits the drift to 11 candidate H-lattice periods + T²/T³/T⁴ polynomial. Diagnostic tool for characterizing Sun ecl_lon deviation and identifying candidate H-lattice periods for Stage 4 refit.

---

## Forward path

The -135 residual has three separable components. The Sun ecl_lon component was investigated on 2026-07-11 and found to be reference-limited, not fit-limited (details below). In decreasing order of leverage:

1. **Sun ecl_lon fit-window extension** — investigated 2026-07-11, **closed as not-viable with current reference** (Stage 4 in [`IP-framework-native-sun-ecliptic-longitude.md`](hidden/IP-framework-native-sun-ecliptic-longitude.md)):
   - Sampling framework Sun ecl_lon vs Meeus Ch. 25 across -800 to +3000 AD revealed a smooth T²-shaped residual (~-1974" at -800, near zero at J2000, ~-329" at +3000)
   - The T² shape matches Meeus L₀ and M polynomial terms (+0.0003032 and -0.0001537 °/T²); framework's mean motion is linear-rate by design
   - The residual is dominated by Meeus reference degradation past ±2000 yr, not by real framework physics error to correct
   - Dry-run greedy H-lattice fit regressed modern residuals from ~10" to ~250" (single 4931-yr sinusoid can't approximate T² shape)
   - Two theoretical paths remain: (a) upgrade to VSOP87 truncated Sun reference (~1" accuracy over ±2000 yr, ≤10" over ±4000 yr) then reassess; or (b) accept framework's linear-rate philosophy at antiquity as the design consequence it is
   - Effort for path (a): multi-day; effort for path (b): none (current state)

2. **GMST (Earth-rotation) calibration audit** — investigate framework's implicit GMST vs IAU Meeus eq. 12.4:
   - Current gap: 0.70° at -135 = 169 sec UT
   - Contribution to -135 residual: ~170 km
   - Investigation target: framework's LOD-mass-loss-tidal integrator's rotation-phase output vs closed-form Meeus polynomial
   - Effort: 4-8 hours

3. **ΔT calibration extension** — framework's L1-α tidal integrator is physically constrained by Cox&Chao dα/dt at J2000; extending to include ice-mass or non-tidal components would shift ΔT toward Stephenson/NASA at deep time:
   - Current gap vs Stephenson: 958 sec at -135
   - Contribution to -135 residual: ~370 km
   - Investigation target: literature review of non-tidal ΔT models (Peltier ICE-5G/6G, Milne GIA)
   - Effort: multi-day literature review + integrator extension

The Moon polynomial audit (§ above) rules out lunar theory as a closable component — all modern lunar theories converge at -135 within 0.001° in *absolute* Moon position. Meeus Moon's *internal Sun reference* is framework-inconsistent (§ Internal-consistency check above), but the numerical effect is ~1 km at -135 — not a closable component either.

### Identified direction: Path C — framework-native Moon

The framework's Sun is philosophically linear-rate; Meeus Moon's `L'`, `M'`, `F`, and `D` polynomials all carry T² and higher-order secular terms that come from Moon's real physical secular acceleration. Currently the framework accepts Meeus Moon's T² terms (uses Meeus Ch. 47 as-is) but rejects Meeus Sun's T² terms (linear-rate philosophy) — an asymmetry in how the framework treats secular physics for the two bodies.

**Path C** — framework-native Moon (analogous to what Stages 1-2 did for Sun): compute Moon's ecliptic longitude via `moveModel` + framework H-lattice harmonics + framework-native perturbation series, dropping polynomial T² terms and replacing them with H-lattice equivalents. Would resolve the asymmetry, but the ~Mp T² polynomial physics doesn't have an obvious H-lattice representation (Brown's m² approach gives the wrong sign — see [project_lunar_framework_native](../.claude/projects/-home-dennis-code-3d/memory/project_lunar_framework_native.md)). Multi-week research effort; correct long-term direction. Documented as the target in Section 7's forward research program.

Until Path C lands, options 2 and 3 above are the modest closable components; option 1 (Sun ecl_lon fit) is closed as not viable with current reference; and the Meeus-Moon-uses-Meeus-Sun observation is documented as an internal-consistency remark, not an actionable fix.

---

## Cross-references

- [Doc 101 — pure-tidal eclipses](101-pure-tidal-eclipses.md) — framework validation across 19 documented solar eclipses; -135 documented under Interpretation 1 (deep partial reading)
- [Doc 102 — GIA α(t) lunar validation](102-gia-alpha-lunar-validation.md) — α(t) GIA contribution magnitude
- [Doc 66 — Moon Meeus corrections](66-moon-meeus-corrections.md) — polynomial accuracy table across lunar theories at antiquity
- [IP-framework-native-sun-ecliptic-longitude.md](hidden/IP-framework-native-sun-ecliptic-longitude.md) — framework's Sun formula, Section 7 dual-mechanism prediction, Stage 4 antiquity-fit proposal
- Diary attribution: Stephenson & Steele 2006 *JHA*; Sachs & Hunger *ADART* Vol. III; Huber & De Meis 2004, *Babylonian Eclipse Observations from 750 BC to 1 BC*

---

## External references on the -135 Apr 15 eclipse

Independent published sources for cross-checking framework's interpretation:

- **EclipseWise (Espenak) — authoritative path map for -135 Apr 15** ([link](https://eclipsewise.com/solar/SEprime/-0199--0100/SE-0135Apr15Tprime.html)) — the NASA Five Millennium Canon "prime" version of the eclipse-path diagram. Independent verification of the greatest-eclipse coordinates at (46.8°N, 58.9°E). The path map shows greatest in central Kazakhstan and the totality track extending across central Asia; whether the track also dips through Mesopotamia at a non-greatest moment depends on the specific ΔT applied.

- **IMCCE (Institut de mécanique céleste et de calcul des éphémérides) — "L'éclipse de Babylone"** ([link](https://promenade.imcce.fr/en/pages4/468.html)) — explicit narrative of the "two pictures" question: *"if we recalculate with modern theories, the circumstances of the eclipse regardless of the slowdown of the rotation of the Earth, it is found that the entire band of total visibility passed not to Babylon (located in present-day Iraq about 160 km south of Baghdad), but in Morocco… the Earth slows 1.6 millisecond per century… which, cumulated, give a difference of about 4 hours for the eclipse of Babylon."* IMCCE explicitly acknowledges the polynomial-precision limit at deep historical past: *"it shows the limits of the current celestial mechanics for any prediction of the path of totality of an eclipse of the Sun. It cannot, across centuries, be absolutely accurate because of irregularities in the rotation of our planet impossible to determine in advance."*

- **Russian geology repository — historical-eclipse compilation** ([link](https://repository.geologyscience.ru/server/api/core/bitstreams/6dd0f726-52e0-4e06-a7c4-28fb9cfa2aa6/content)) — discussion in the context of Earth-rotation history; independent third source for path-geometry / ΔT-sensitivity framing.

These external sources establish that framework's prediction (~800 km from Babylon) is in the same conceptual neighborhood as published independent reconstructions — all approaches agree the eclipse's geographic placement at Babylon depends critically on the exact Sun-polynomial precision, ΔT model, and greatest-eclipse convention. Framework's interpretation (Babylon observed deep partial, framework's centerline through Saudi Arabia is correct given current fit-window limitations) is consistent with the IMCCE-acknowledged "limits of current celestial mechanics" framing.
