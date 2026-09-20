---
docVersion: 1.0
modelVersion: v14.0
coefficients: sha256:3f803b0a4e2b0b3c
status: current
---

# -135 Babylonian solar eclipse — case study

**Status**: the framework places -135 Apr 15 Babylon at **BestGap <!--v:babylon135BestGapKm-->372<!--/v--> km at ΔUT <!--v:babylon135BestDeltaUT-->-1h00<!--/v-->** within the ±4h scan window; verdict **off-peak** — inside the regional class and consistent with the diary's totality report at the identification-cascade level. The ΔT-free matcher places the traditional date as the unique survivor with required-ΔT inside Stephenson's published totality window, and the local-circumstance instrument reads magnitude **0.988** at the site on the traditional date. The framework's own predicted UT (<!--v:babylon135FrameworkUT-->06:01<!--/v-->) sits within 9 min of the documented UT (<!--v:babylon135DocumentedUT-->06:14<!--/v-->) — not a ΔT-signal event.

Values are generated (`tools/verify/eclipse-audit.js --write`) through the umbra tier: the package besselian is the single umbra implementation — the same `@essrt/physics` chain the api centerline gate certifies. Its basis: the framework-native Sun (mean longitude = L₀ + the mean tropical rate + the f(Y) year-harmonic drift shape in SI/TT plus the derived luni-solar torque term δp = −p₀·tan ε·δε(t) on the model's own two-component obliquity law; eccentricity = the J2000-anchored H/3 inclination-coupling line — the same frame-invariant law the Moon's E-factor rides; zero fitted sun constants end to end), the derived 70-term planetary completion on framework-native carriers, the full-series Moon with the derived Delaunay + planetary tails and the doc-66 §1 secular completions in the arguments, the elliptical Sun distance, the exact axis∩ellipsoid ground mapping, and the WGS84 geodetic output convention. This assembled Sun beats a Meeus Ch. 25 basis both against JPL in-window (0.95″ vs 1.28″ scatter) and against the ancient corpus timing structure; the Meeus polynomial remains only as the finders' un-injected default.

The residual decomposes into quantifiable physics contributors (the linear-rate Sun's along-track drift at antiquity, ΔT- and GMST-convention gaps vs Stephenson/IAU) plus the piercing-point-vs-radial-projection greatest-eclipse convention difference. The Meeus Ch. 47 Moon polynomial is exonerated (all modern lunar theories converge within 0.001° at year -135), and α(t) tuning across the full Peltier ICE-6G literature uncertainty range shifts the umbra by only ~3.3 km per 100 s of ΔT change — the α(t) constants are not load-bearing here.

---

## Diary attribution (background)

The Babylonian astronomical diary recording the 15 April 136 BCE (= -135 astronomical) eclipse is regarded as one of the most secure attributions in the historical eclipse corpus:

- **Two independent tablets**: BM 45745 (astronomical diary) + LBAT 1285 (goal-year text)
- **Four-planet astronomical fingerprint**: Venus, Mercury, Jupiter, Mars in specific configurations at the eclipse moment; only 15 April 136 BCE satisfies all four
- **Double-dated calendar locks**: Arsacid Era 175 = Seleucid Era 239, intercalary Addaru day 29
- **Stephenson & Steele 2006** (*JHA*) re-examined and re-confirmed
- **No scholarly alternative proposed** in ADART or Stephenson 2016

The framework agrees with the attribution at the off-peak class.

---

## Framework prediction at -135 Apr 15

The certified eclipse chain computes the Sun via the framework-native assembly above. The scene's displayed wheel Sun rides the SAME certified Sun through one δ term added on top of its own stack (δ = λ_certified − λ_twin, applied inside the clock-convention window — full weight in the corpus era, tapering off where a TT-clock Sun would clash with the deliberately-UT deep-time scene); the stack underneath is exact-Kepler by derivation (linear tropical-year rate + full Kepler EoC through the derived split-completion corrector — [doc 65](65-equation-of-center.md)), with no fitted longitude harmonics in the display path. Moon position comes from the framework's full derived lunar series (Meeus Ch. 47 base + the derived Delaunay extension terms; λ <!--v:moonSeriesLonVsJplRms-->2.84<!--/v-->″ / β <!--v:moonSeriesLatVsJplRms-->0.35<!--/v-->″ vs JPL). Earth ΔT comes from the L1-orbital-coupled α(t) tidal integrator (`meanDeltaTSecondsAtAge`).

Audit-26 result for -135 Apr 15 (documented UT 06:14):

| Quantity | Value |
|---|---:|
| Framework's own eclipse UT (MdlUT) | <!--v:babylon135FrameworkUT-->06:01<!--/v--> |
| Documented UT | <!--v:babylon135DocumentedUT-->06:14<!--/v--> |
| BestΔUT (offset giving minimum umbra↔site distance) | <!--v:babylon135BestDeltaUT-->-1h00<!--/v--> |
| **BestGap (umbra↔site at BestΔUT)** | **<!--v:babylon135BestGapKm-->372<!--/v--> km** |
| Verdict | **off-peak** |

---

## The linear-rate Sun at antiquity

The framework's mean solar motion is linear-rate by design — no T² polynomial term. Meeus's T² term (+0.0003032 °/T² in L₀) captures the Sun's real secular acceleration (planetary perturbations + tidal effects on Earth's mean motion); a linear rate calibrated near J2000 therefore drifts against a T²-accelerated polynomial away from the window:

| Epoch | T (Jcy from J2000) | Meeus T² contribution | Linear rate | Δ |
|---|---:|---:|---:|---:|
| J2000 | 0 | 0° | 0° | 0° |
| Year 2100 | 1 | +0.0003° | 0° (calibrated) | ~0° |
| Year -135 | -21.35 | +0.138° | 0° | ~−0.3° |
| Year ±7000 | ∓70 | +1.49° | 0° | ~−1.5° |

The **certified eclipse chain carries this drift natively** — the f(Y) year harmonics plus the derived torque term supply the secular shape without a fitted polynomial. What remains linear-rate are the scene's raw wheel laws underneath the δ term; in the scan-window metric any residual λ-drift acts along-track and is largely dial-degenerate with ΔT (absorbed by BestΔUT); the ΔT-free matcher measures the pair jointly and lands inside Stephenson's window.

The design position: sampling the framework Sun against Meeus Ch. 25 across -800 to +3000 AD shows the residual is dominated by Meeus reference degradation past ±2000 yr — reference-limited, not fit-limited. Fitting anchor-divisor harmonics to the T² shape would regress modern residuals (a single lattice sinusoid cannot approximate T²), so the linear-rate philosophy at antiquity stands as a design consequence, with the derived drift terms carrying the physical part.

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

Maximum spread across all five theories: **0.001°**. All modern lunar theories converge at year -135. NASA's γ = 0.7119 is geometrically consistent with β = 0.706° via γ ≈ β × d_M / R_E ≈ 0.702, the 0.01 residual within of-date-vs-J2000 frame difference over 21 centuries. **The Moon polynomial is not a source of the -135 residual.**

### The Meeus-Moon internal Sun coupling, measured

Meeus Ch. 47's Delaunay arguments (`D`, `M`) internally reference Meeus's own Sun. Injecting the framework Sun into those arguments and measuring the Moon-position shift:

| Epoch | Sun drift | Moon shift from Sun injection | km at Babylon geometry |
|---|---:|---:|---:|
| 2024 Apr 8 | +1.0" | −0.1" | 0.0 |
| 1133 Aug 2 | −137" | −6.8" | 0.2 |
| −135 Apr 15 | **−1111"** | **+40"** | **1.2** |
| −556 May 19 | −1629" | −74" | 2.3 |
| −762 Jun 15 | −1918" | +23" | 0.7 |

The Moon shift is 20–500× smaller than the Sun drift it stems from (the D-dependent terms enter as `sin(k·D + …)` with bounded derivatives and largely cancelling phases). The framework-native fundamental arguments are the shipped default ([doc 66 §1](66-moon-meeus-corrections.md)), so no structural asymmetry remains; the numerical effect of the coupling is ≤ ~39 km at −135 — not a closable component.

---

## ΔT calibration

The framework's ΔT integrates LOD deviation from the J2000 anchor — the LLR-anchored Farhat 2022 tidal channel, the L1-orbital-coupled α(t) GIA channel, the 4-flag lattice stack and the Core-mantle swing ([doc 104](104-millennial-rotation-swing.md)) — with **no eclipse-fitted parameters**. At -135 the framework's ΔT sits between the references (NASA Five Millennium Canon ~11,969 s; Stephenson 2016 ~12,230 s), and the ΔT-free required-ΔT lands inside the tablet's published totality window [<!--v:lunarDtBoundsBabylon135LowSeconds-->11,220<!--/v-->, <!--v:lunarDtBoundsBabylon135HighSeconds-->12,140<!--/v-->] s (`u2-dt-free-matcher.mjs`).

**α(t) sensitivity, measured**: the case-study diagnostic sweeps `EARTH_MOI_FACTOR_RATE_YR` across the Peltier ICE-6G literature uncertainty range — ~3.3 km of umbra shift per 100 s of ΔT change. The shipped α(t) constants (α = <!--v:alphaJ2000-->0.3306947<!--/v--> from IERS, dα/dt = -1.35e-11/yr from Cox & Chao dJ₂/dt with the Peltier factor-2.0 J₂→α conversion) are *empirically uncloseable* against this event: tuning them across their full literature range moves the umbra by tens of km. This is the direct empirical proof that the Peltier defaults are not load-bearing on the lunar-timing or solar-visibility results.

---

## GMST (Earth-rotation frame)

The framework's GMST is derived implicitly from Earth's rotation-rate integrator (LOD via mass-loss + tidal integration), not from a closed-form IAU polynomial (Meeus eq. 12.4). At -135 the two differ by **0.358°** (≈ 86 s UT) — a rotation-frame convention difference separate from ΔT. In sub-solar longitude it largely cancels against the Sun-longitude term; the net contribution to the residual is small.

---

## Convention: piercing point vs radial projection

Two geometric definitions of "greatest eclipse point" diverge by thousands of km for near-grazing eclipses (NASA γ = 0.7119 here):

- **Piercing point** (the framework's convention): where the umbra axis intersects Earth's oblate surface at the given UT.
- **Radial projection of closest approach** (NASA's convention): the surface point closest to the shadow axis — typically high-latitude for grazing geometry.

At NASA-UT the two land ~5,000 km apart for this event. The spread is definitional, not physics — NASA's own "greatest" is at (47°N, 59°E), ~2,100 km from Babylon; even the authoritative reference does not place greatest at Babylon.

---

## Component decomposition — the BestGap residual

| Component | State at −135 | Assessment |
|---|---|---|
| Scene umbra frame | The scene rides the certified of-date series for both bodies; the scene ground track matches the scaffold-free Besselian tier to ~20 km at the −135 instant | Closed by construction |
| Deep-branch lunar argument secular | The deep branch sits +8.9″ from the certified skeleton at this instant ([doc 66 §1](66-moon-meeus-corrections.md)) | Closed |
| Linear-rate Sun drift at antiquity | Along-track/dial component — absorbed by BestΔUT within the scan (degenerate with the ΔT dial); the ΔT-free matcher measures the pair jointly and lands inside Stephenson's window | Design position |
| ΔT (framework vs NASA/Stephenson) | Framework sits between the references; ~3.3 km per 100 s | Exonerated |
| Moon arguments (D/M coupling) | ≤ 0.0061° / ~39 km | Exonerated |
| Greatest-eclipse convention | Definitional spread between catalog conventions | Not physics |

What remains in the BestGap is the composite of the along-track dial degeneracy, the certified series' own instant residual class vs DE441 (a series-accuracy topic), and scan-grid sampling. The theory-difference drift against ELP-class reductions is Δṅ ≈ <!--v:lunarTheoryDriftDeltaNdot-->0.32<!--/v--> ″/cy² ([doc 102](102-gia-alpha-lunar-validation.md)).

---

## Empirical context — audit-26 aggregate

Under the current shipped stack, the 26-event audit summary:

| Verdict | Count | Meaning |
|---|---:|---|
| ✓ confirmed | 3 | UT and geography match within 300 km at the framework's own UT |
| ↻ off-peak observer | 13 | Site on the path; observer wasn't at greatest moment |
| ↶ regional match | 5 | Umbra in the same region as site (300-1000 km) |
| ◇ ΔT-signal (any) | 0 | Framework agrees with the documented UT on every event |
| ⚠ geographic offset | 5 | Umbra *centerline* >1000 km from site at every scanned moment (an umbra-distance gate, not visibility — the penumbra can still cover the site) |

Modern eclipses (1900+): all within ~130 km BestGap (Carbondale 12 km and Agadez 127 km confirmed at greatest moment; Príncipe 24 km, Burgos 25 km, Dallas 48 km, Constanța 66 km off-peak). Mid-CE (1004–1715): off-peak or regional (Tuscany 12 km, Halley 1715 87 km, Cairo 1004 104 km, Cairo 993 241 km, England 1133 319 km, London 1654 642 km, Russia 1185 885 km). Deep antiquity: **-708 Lu 9 km · 71 Plutarch 37 km (confirmed, ΔUT +0h05) · -556 Nabonidus 104 km · -762 Nineveh 174 km · -135 Babylon · -584 Thales 211 km — the entire first-hand ancient corpus confirmed/off-peak class**; regional: -309 Antigonus 790 km, -430 Athens 853 km; geographic: -647 (early diary partial, 1,561 km) plus the four Cairo geographic rows (977/978/979/985 — [doc 107](107-ancient-record-review.md) adjudicates 978/979/985 as second-hand or misdated; 977 is the first-hand Ibn Yunus record). (Per-event values from the generated audit run — `tools/verify/eclipse-audit.js`.)

At this high-γ presentation the framework computes deep-totality-boundary circumstances at the site — consistent with the diary's language (Venus, Mercury and "Normal Stars" visible).

---

## Diagnostic buttons (Console Tests F12 → Historical Eclipses & ΔT)

1. **"-135 Babylonian case study (root-cause + era sweep + L1-α sensitivity)"** — root-cause decomposition at -135-04-15 (umbra ray-trace at framework JD and NASA-UT, distances to Babylon and to NASA's greatest, component-level audit), the Babylonian-era Meeus β residual sweep across 8 documented events (-762 to -135), and the L1-α `ALPHA_CLIMATE_SCALE` sensitivity sweep (0.50× to 1.50×).
2. **"Audit all 26 solar eclipse presets"** — full audit with ±4h scan per event; verdict summary + per-event best gap.

---

## Cross-references

- [Doc 102 — GIA α(t) lunar validation](102-gia-alpha-lunar-validation.md) — the α(t) formulation, 4-flag lattice stack, lunar and solar validation infrastructure
- [Doc 107 — Ancient-record review](107-ancient-record-review.md) — the identification adjudication of the audit's ancient rows
- [Doc 66 — Moon Meeus corrections](66-moon-meeus-corrections.md) — the lunar series, the framework-native arguments, polynomial accuracy across lunar theories at antiquity
- [Doc 104 — Millennial rotation swing](104-millennial-rotation-swing.md) — the Core-mantle ΔT channel
- Diary attribution: Stephenson & Steele 2006 *JHA*; Sachs & Hunger *ADART* Vol. III; Huber & De Meis 2004, *Babylonian Eclipse Observations from 750 BC to 1 BC*

## External references on the -135 Apr 15 eclipse

- **EclipseWise (Espenak)** ([path map](https://eclipsewise.com/solar/SEprime/-0199--0100/SE-0135Apr15Tprime.html)) — independent verification of the greatest-eclipse coordinates at (46.8°N, 58.9°E); greatest in central Kazakhstan, with the Mesopotamian crossing dependent on the ΔT applied.
- **IMCCE — "L'éclipse de Babylone"** ([link](https://promenade.imcce.fr/en/pages4/468.html)) — the "two pictures" narrative: without Earth-rotation slowdown the totality band passes through Morocco, not Babylon; IMCCE explicitly acknowledges the polynomial-precision limit at deep historical past ("limits of the current celestial mechanics… irregularities in the rotation of our planet impossible to determine in advance").
- **Russian geology repository — historical-eclipse compilation** ([link](https://repository.geologyscience.ru/server/api/core/bitstreams/6dd0f726-52e0-4e06-a7c4-28fb9cfa2aa6/content)) — independent third source for path-geometry / ΔT-sensitivity framing.

These sources establish the context every reconstruction shares: the eclipse's geographic placement at Babylon depends critically on Sun precision, the ΔT model, and the greatest-eclipse convention. Within that context the framework's prediction — BestGap <!--v:babylon135BestGapKm-->372<!--/v--> km within the scan window, UT within 9 minutes, deep-totality-boundary local circumstances at the site — places the traditional identification on solid footing.
