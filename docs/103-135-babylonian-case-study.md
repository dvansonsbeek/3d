---
docVersion: 1.0
modelVersion: v11.0
coefficients: sha256:c6b0f26097c7945c
status: current
---

# -135 Babylonian solar eclipse — case study

**Status**: Framework places -135 Apr 15 Babylon at **BestGap <!--v:babylon135BestGapKm-->188<!--/v--> km at ΔUT <!--v:babylon135BestDeltaUT-->-0h54<!--/v-->** within the ±4h scan window; verdict **off-peak** — the umbra centerline reaches within ~200 km of Babylon, comfortably inside the regional class and consistent with the diary's totality report at the identification-cascade level (the ΔT-free matcher places the traditional date as the unique survivor with required-ΔT inside Stephenson's published totality window; local magnitude 0.986 in the pre-E4 matcher run). The framework's own predicted UT (<!--v:babylon135FrameworkUT-->06:05<!--/v-->) sits within 9 min of the documented UT (<!--v:babylon135DocumentedUT-->06:14<!--/v-->) — not a ΔT-signal event. Values are generated (`tools/verify/eclipse-audit.js --write`) through the UMBRA TIER — since U1 (the umbra strangler) the package besselian is the single umbra implementation, the same `@essrt/physics` chain the api centerline gate certifies: the E4 framework-native Sun with the derived 70-term planetary completion on framework-native carriers (FQ-5 N3 — the argument rates injected from the model's own planet records), the full-series Moon with the derived Delaunay + planetary tails, the elliptical Sun distance, the exact axis∩ellipsoid ground mapping, and the WGS84 geodetic output convention, with the doc-66 §1 deep-branch secular completions in the arguments. Prior certified-batch values (the retired scene-umbra chain) live in git history.

**E4/E5 update — the framework-native Sun is now the certified basis.** Exploration 3b landed the assembled framework Sun in the eclipse chain across all three runtimes (package tier, audit, browser finders): mean longitude = L₀ + the mean tropical rate + the f(Y) year-harmonic drift shape in SI/TT **plus the derived torque term (E5)** — the year harmonics carry only the geometric equinox displacement of the tilt nodes (the exact 8:3 amplitude signature), and the classical luni-solar torque adds the precession-rate modulation δp = −p₀·tan ε·δε(t) on the model's own two-component obliquity law, per-divisor drift scale 1 + p₀·tan²ε·H/(2π·div) — and eccentricity = the H/16 channel law + the derived H/3 inclination-coupling imprint (amplitude base/2, lattice phase). Zero fitted sun constants end to end; the Meeus Ch. 25 polynomial remains only as the finders' un-injected default. Under this basis the values above regenerated: **194 km — better than the 206 km of the Meeus-era basis** (the torqueless E4 intermediate read 277 km; the ancient corpus blind-selected the torque term's per-divisor structure before its derivation existed; the later FQ-5 N3 carrier swap — the completion table re-extracted on framework-native argument rates — moved it again to the current 188 km); the audit-26 verdict counts reproduce exactly, −708 Lu drops to 9 km, and the −135 required-ΔT sits inside Stephenson's window (12,012 s in [11,220, 12,140]). The assembled Sun beats the Meeus basis against JPL in-window (0.95″ vs 1.28″ scatter) and against the ancient corpus timing structure. The "Sun ecl_lon drift at antiquity" section below is the pre-E4 attribution — it now applies only to the scene wheels' linear-rate Sun, not to the certified eclipse chain, which carries the drift natively.

The residual decomposes into three quantifiable physics contributors (Sun ecl_lon drift at antiquity, ΔT-convention gap vs Stephenson, GMST-convention gap vs IAU) plus the piercing-point-vs-radial-projection greatest-eclipse convention difference. The Meeus Ch. 47 Moon polynomial is exonerated (all modern lunar theories converge within 0.001° at year -135). Empirical α(t) tuning across the full Peltier ICE-6G literature uncertainty range shifts the umbra by only ~3.3 km per 100 s of ΔT change, confirming the α(t) constants are not the load-bearing residual driver.

---

## Thesis

The Babylonian astronomical diary recording the 15 April 136 BCE (= -135 astronomical) solar eclipse is one of the most scholarly-secure attributions in the historical eclipse corpus. Framework's prediction for that event is **off-peak class** — the umbra centerline reaches within ~200 km of Babylon within the scan window while agreeing with the documented UT to 9 minutes, and the ΔT-free identification cascade selects the traditional date uniquely with the required ΔT inside Stephenson's published totality window. The residual budget below documents the component-level physics (the antiquity Sun ecl_lon story, ΔT and GMST conventions, the greatest-eclipse geographic definition); two formerly load-bearing components are RESOLVED and documented in their own sections — the deep-branch lunar argument secular (doc 66 §1 completions) and the scene umbra chain's Sun frame (the series-injected Sun). The Moon polynomial is exonerated by direct testing against all modern lunar theories.

---

## Diary attribution (background)

The Babylonian astronomical diary recording the 15 April 136 BCE eclipse is regarded as one of the most secure attributions in the historical eclipse corpus:

- **Two independent tablets**: BM 45745 (astronomical diary) + LBAT 1285 (goal-year text)
- **Four-planet astronomical fingerprint**: Venus, Mercury, Jupiter, Mars in specific configurations at the eclipse moment; only 15 April 136 BCE satisfies all four
- **Double-dated calendar locks**: Arsacid Era 175 = Seleucid Era 239, intercalary Addaru day 29
- **Stephenson & Steele 2006** (*JHA*) re-examined and re-confirmed
- **No scholarly alternative proposed** in ADART or Stephenson 2016

The attribution is rock-solid — and the framework now agrees with it at the off-peak class: umbra track within ~200 km, UT within 9 minutes, and the ΔT-free cascade selecting the traditional date uniquely.

---

## Framework prediction at -135 Apr 15

The certified eclipse chain computes the Sun via the E4/E5 framework-native assembly (see the update at the top). Since the SW campaign the SCENE's wheel Sun rides the SAME certified Sun through one δ term added on top of its own stack (δ = λ_certified − λ_twin, applied inside the clock-convention window — full weight in the corpus era, tapering off where a TT-clock Sun would clash with the deliberately-UT deep-time scene); since FQ-3 the stack underneath is EXACT-KEPLER by derivation (linear tropical-year rate + full Kepler EoC realized through the derived split-completion corrector — doc 65 §The Exact-Kepler Wheel), with the fitted `sunLongitudeCorrection` harmonics retired from the display path entirely. Moon position via the framework's full derived lunar series (Meeus Ch. 47 base + the derived Delaunay extension terms; λ <!--v:moonSeriesLonVsJplRms-->2.92<!--/v-->″ / β <!--v:moonSeriesLatVsJplRms-->0.61<!--/v-->″ vs JPL). Earth ΔT from the L1-orbital-coupled α(t) tidal integrator (`meanDeltaTSecondsAtAge`).

Audit-26 result for -135 Apr 15 (documented UT 06:14):

| Quantity | Value |
|---|---:|
| Framework's own eclipse UT (MdlUT) | <!--v:babylon135FrameworkUT-->06:05<!--/v--> |
| Documented UT | <!--v:babylon135DocumentedUT-->06:14<!--/v--> |
| BestΔUT (offset giving minimum umbra↔site distance) | <!--v:babylon135BestDeltaUT-->-0h54<!--/v--> |
| **BestGap (umbra↔site at BestΔUT)** | **<!--v:babylon135BestGapKm-->188<!--/v--> km** |
| Verdict | **off-peak** |

The framework and the record agree on the eclipse UT to within 9 minutes, and the umbra track passes within ~200 km of the site within the scan window. (Generated rows — `tools/verify/eclipse-audit.js --write`; prior certified-batch values live in git history.)

---

## Root cause: Sun ecl_lon drift at antiquity

**Pre-E4 attribution — historical.** This section documents the residual physics of the pre-E4 basis; since the E4 landing the certified eclipse chain carries the rate drift natively via the f(Y) year harmonics, and since the SW campaign the scene's displayed Sun rides the certified chain too (the raw wheel laws underneath remain linear-rate — the analysis below still describes THEM). The dominant contributor to the pre-E4 -135 residual was a **0.30° drift in the scene Sun's ecl_lon vs Meeus canonical** at year -135.

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

**Umbra sensitivity to Sun ecl_lon at near-grazing γ**: NASA γ = 0.7119 for this eclipse — the piercing point is highly sensitive to Sun-Moon relative geometry. In the scan-window metric the λ-drift acts along-track and is largely dial-degenerate with ΔT (absorbed by BestΔUT); the ΔT-free matcher measures the pair jointly.

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

**Conclusion**: the Meeus-Moon-uses-Meeus-Sun inconsistency is real but numerically negligible relative to the framework's linear-rate Sun cost. Mechanically porting Meeus Moon to reference framework Sun would not close the -135 residual meaningfully (re-measured under the shipped framework-native arguments: ~30 km TT-eval / ~72 km UT-eval at −135 via the D/M substitution probe). The structural asymmetry itself is resolved — the framework-native fundamental arguments are the shipped default (doc 66 §1), and framework-native D/M is likewise shipped (identity-composed with real-time secular integrals).

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

> **Update (certified chain):** re-measured under the certified framework
> chain this drift is **0.358°**; the figures below are the Meeus-era
> measurements, kept because the mechanism discussion still applies.

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

## Component-level decomposition — the BestGap residual

Under the current umbra chain (the U1 umbra tier — the package besselian,
certified Sun with the derived planetary completion + full-series Moon
with the derived tails + exact ellipsoid mapping), the BestGap
is <!--v:babylon135BestGapKm-->188<!--/v--> km. The components:

| Component | Current state at −135 | Assessment |
|---|---|---|
| Scene umbra frame (the scaffold Sun's of-date declination in the axis frame) | RESOLVED — the series-injected Sun closed the scene-vs-tier gap from ~2,000 km to ~20 km at the −135 instant (measured, the reconciliation probes) | Was the dominant cross-track term; now gone by construction |
| Deep-branch lunar argument secular | RESOLVED — doc 66 §1 completions; deep ≡ certified skeleton at +8.9″ at this instant | Was the dominant along-track term |
| Sun ecl_lon linear-rate drift at antiquity | Along-track/dial component — absorbed by BestΔUT within the scan (degenerate with the ΔT dial); the ΔT-free matcher measures the pair jointly and lands inside Stephenson's window | Framework design position (linear-rate mean motion) |
| ΔT (framework vs NASA/Stephenson references) | Framework sits between the references; ~2–3 km per 100 s | Exonerated |
| Moon arguments (D/M substitution) | ≤ 0.0061° / 39 km | Exonerated |
| Umbra "greatest" convention (piercing point vs radial projection) | Definitional spread between catalog conventions | Not physics |

The residual ~194 km is the composite of the remaining along-track dial
degeneracy, the certified skeleton's own instant residual class vs DE441
(a series-accuracy topic, 20.3h), and scan-grid sampling. Prior
decompositions of the pre-injection chain live in git history.

---

## α(t) empirical sensitivity — the load-bearing test

The `-135 Babylonian case study` diagnostic button includes a direct α(t) tuning sweep that scales `EARTH_MOI_FACTOR_RATE_YR` across the Peltier ICE-6G literature uncertainty range and measures the resulting historical-eclipse umbra displacement.

**Empirical sensitivity**: ~3.3 km per 100 s of ΔT change.

Implication: the α(t) constants shipped in the framework (α = <!--v:alphaJ2000-->0.3306947<!--/v--> from IERS, dα/dt = -1.35e-11/yr from Cox & Chao dJ₂/dt with the Peltier ICE-6G factor-2.0 J₂→α conversion) are *empirically uncloseable* against the -135 event — tuning α(t) across its full literature uncertainty range shifts the umbra by only tens of km — small even against the current 194 km BestGap residual. This is the direct empirical proof that the choice of Peltier ICE-6G defaults is not load-bearing on the lunar-timing or solar-visibility results — a stronger statement than an abstract "zero fitting" assertion, because it demonstrates the residual is dominated by the Sun-side and GMST-side physics rather than by the α(t) constants.

---

## Interpretation

Framework places the -135 Apr 15 umbra track within **194 km of Babylon** at its best scan point, agreeing with the documented UT to 9 minutes; the local-circumstance instrument reads magnitude **0.988** at the site on the traditional date, and the ΔT-free identification cascade selects that date uniquely with the required ΔT inside Stephenson's published totality window — the framework's reduction and Stephenson's overlap. The diary's record (Venus, Mercury, and "Normal Stars" visible) is consistent with the deep-totality-boundary circumstances the framework now computes at the site.

The former disagreement classes are resolved or exonerated per the component table above; what remains is dial-degenerate along-track budget and the certified series' own instant residual class.

**NASA Five Millennium Canon's own "greatest" is at (47°N, 59°E) — ~2100 km from Babylon.** So even the authoritative reference does not place greatest at Babylon; NASA's path crosses Babylon at a non-greatest moment via a combination of VSOP87 Sun precision + Stephenson-calibrated ΔT + its own greatest-eclipse convention.

---

## Empirical context — audit-26 aggregate

Under the current shipped stack (LLR α₁ + L1-orbital α(t) + 4-flag lattice stack + Core-mantle swing + jointly-calibrated deltaTStart, with the framework-native lunar argument skeleton), the 26-event audit summary is:

| Verdict | Count | Meaning |
|---|---:|---|
| ✓ confirmed | 3 | UT and geography match within 300 km at the framework's own UT |
| ↻ off-peak observer | 13 | Site on the path; observer wasn't at greatest moment |
| ↶ regional match | 5 | Umbra in the same region as site (300-1000 km) |
| ◇ ΔT-signal (any) | 0 | Framework agrees with the documented UT on every event |
| ⚠ geographic offset | 5 | Umbra *centerline* >1000 km from site at every scanned moment (an umbra-distance gate, not visibility — the penumbra can still cover the site) |

Total: 26 events (3 confirmed / 13 off-peak / 5 regional / 0 ΔT-signal / 5 geographic). Modern eclipses (1900+): all within ~130 km BestGap (Carbondale 12 km and Agadez 127 km confirmed at greatest moment; Príncipe 24 km, Burgos 25 km, Dallas 48 km, Constanța 66 km off-peak). Mid-CE (1004–1715): off-peak or regional (Tuscany 12 km, Halley 1715 87 km, Cairo 1004 104 km, Cairo 993 241 km, England 1133 319 km, London 1654 642 km, Russia 1185 885 km). Deep antiquity under the E5 framework-native Sun (geometric + derived torque drift): **-708 Lu 9 km · 71 Plutarch 37 km (confirmed, ΔUT +0h05) · -556 Nabonidus 104 km · -762 Nineveh 174 km · -135 Babylon 194 km · -584 Thales 211 km — the entire first-hand ancient corpus confirmed/off-peak class**; regional: -309 Antigonus 790 km, -430 Athens 853 km; geographic: -647 (early diary partial, 1,561 km) plus the four Cairo geographic rows (977/978/979/985 — the record review adjudicates 978/979/985 as second-hand or misdated; 977 is the first-hand Ibn Yunus record). (Per-event values from the generated audit run — `tools/verify/eclipse-audit.js`.)

The -135 event is off-peak class: the umbra track reaches within ~200 km of Babylon while agreeing with the documented UT to 9 minutes, and at this high-γ presentation the framework computes deep-totality-boundary circumstances at the site — consistent with the diary's language (planets and Normal Stars visible).

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

1. **Sun ecl_lon fit-window extension** — investigated and closed as not-viable with current reference (Stage 4 in `IP-framework-native-sun-ecliptic-longitude.md`, private plans repo):
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

With the framework-native Moon complete and the ΔT stack shipped, the -135 prediction stands at the off-peak class (umbra within 194 km, UT within 9 minutes). Path (b) of option 1 — accepting the linear-rate Sun at antiquity as a design consequence — is the adopted position; the Meeus-Moon-internal-Sun observation is measured and closed (≤ 39 km).

### The deep-branch lunar secular — closed and certified

The deep branch's fundamental arguments carry the full certified
secular content through derived, bounded completions — the secular-ë
carrier (the Lp T³/T⁴ tail) and the of-date rate completion on the
DYNAMICAL axial precession (the sidereal/solar-year beat identity,
epoch-valid at any age) — full construction and evidence in
[doc 66 §1](66-moon-meeus-corrections.md). Certified state at this
event: the deep branch sits **+8.9″ from the certified skeleton** at
the −135 instant; the residual against DE441 there is the certified
skeleton's own periodic scatter class (series truncation — 20.3h
territory, not lunar-argument territory). The Babylon
local-circumstance magnitude on the traditional date is **0.988**
(`tools/explore/ancient-local-circumstances.mjs`; the unique
identification-cascade survivor), and the ΔT-free required-ΔT lands
inside the tablet's published totality window
[<!--v:lunarDtBoundsBabylon135LowSeconds-->11,220<!--/v-->,
<!--v:lunarDtBoundsBabylon135HighSeconds-->12,140<!--/v-->] s
(`u2-dt-free-matcher.mjs`) — the framework's reduction and
Stephenson's overlap. The theory-difference drift against ELP-class
reductions is Δṅ ≈
<!--v:lunarTheoryDriftDeltaNdot-->0.26<!--/v--> ″/cy² ([doc 102](102-gia-alpha-lunar-validation.md)).
The scene umbra chain shares this accuracy class: with the
series-injected Sun (both bodies from the certified of-date series;
the scaffold Sun and its modern-calibration laws retired), the scene
ground track matches the scaffold-free Besselian tier to ~20 km at
the −135 instant, and the audit BestGap row above reads the same
geometry the physics tier does.

---

## Cross-references

- [Doc 102 — GIA α(t) lunar validation](102-gia-alpha-lunar-validation.md) — L1-orbital-coupled α(t) GIA formulation, 4-flag lattice stack, L-5b lunar and L-7 solar validation infrastructure
- [Doc 107 — Ancient-record review](107-ancient-record-review.md) — the identification adjudication of the audit's ancient rows (the Cairo cluster, the Lu ganzhi filter, the multi-candidate date scans this case study's ±25-yr scan belongs to)
- [Doc 66 — Moon Meeus corrections](66-moon-meeus-corrections.md) — polynomial accuracy table across lunar theories at antiquity
- `IP-framework-native-sun-ecliptic-longitude.md` (private plans repo) — framework's Sun formula, Section 7 dual-mechanism prediction, Stage 4 antiquity-fit proposal
- Diary attribution: Stephenson & Steele 2006 *JHA*; Sachs & Hunger *ADART* Vol. III; Huber & De Meis 2004, *Babylonian Eclipse Observations from 750 BC to 1 BC*

---

## External references on the -135 Apr 15 eclipse

Independent published sources for cross-checking framework's interpretation:

- **EclipseWise (Espenak) — authoritative path map for -135 Apr 15** ([link](https://eclipsewise.com/solar/SEprime/-0199--0100/SE-0135Apr15Tprime.html)) — the NASA Five Millennium Canon "prime" version of the eclipse-path diagram. Independent verification of the greatest-eclipse coordinates at (46.8°N, 58.9°E). The path map shows greatest in central Kazakhstan and the totality track extending across central Asia; whether the track also dips through Mesopotamia at a non-greatest moment depends on the specific ΔT applied.

- **IMCCE (Institut de mécanique céleste et de calcul des éphémérides) — "L'éclipse de Babylone"** ([link](https://promenade.imcce.fr/en/pages4/468.html)) — explicit narrative of the "two pictures" question: *"if we recalculate with modern theories, the circumstances of the eclipse regardless of the slowdown of the rotation of the Earth, it is found that the entire band of total visibility passed not to Babylon (located in present-day Iraq about 160 km south of Baghdad), but in Morocco… the Earth slows 1.6 millisecond per century… which, cumulated, give a difference of about 4 hours for the eclipse of Babylon."* IMCCE explicitly acknowledges the polynomial-precision limit at deep historical past: *"it shows the limits of the current celestial mechanics for any prediction of the path of totality of an eclipse of the Sun. It cannot, across centuries, be absolutely accurate because of irregularities in the rotation of our planet impossible to determine in advance."*

- **Russian geology repository — historical-eclipse compilation** ([link](https://repository.geologyscience.ru/server/api/core/bitstreams/6dd0f726-52e0-4e06-a7c4-28fb9cfa2aa6/content)) — discussion in the context of Earth-rotation history; independent third source for path-geometry / ΔT-sensitivity framing.

These external sources establish the context every reconstruction shares: the eclipse's geographic placement at Babylon depends critically on the exact Sun precision, ΔT model, and greatest-eclipse convention — the IMCCE-acknowledged "limits of current celestial mechanics." Within that context the framework's current prediction (umbra track within 194 km of Babylon, UT within 9 minutes, deep-totality-boundary local circumstances at the site) places the traditional identification on solid footing.
