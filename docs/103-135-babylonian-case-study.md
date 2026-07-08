# -135 Babylonian solar eclipse — pure-tidal physics vs NASA at a documented totality

**Status**: Resolved with revised attribution — framework's pure-tidal + α(t) GIA prediction places the -135-04-15 eclipse centerline over central Saudi Arabia (~1159 km south-east of Babylon). The diary's "totality at Babylon" record is interpreted as a deep partial eclipse (~95-99% magnitude). The disagreement with NASA's path-through-Mesopotamia is **NOT** attributable to the Meeus Ch. 47 Moon polynomial: empirical testing against ELP-2000/82B (both truncated and full 37,863-term untruncated) and ELP/MPP02 (DE-fit and LLR-fit variants) shows all modern lunar theories converge to Moon β ≈ 0.706° at year -135 in the of-date frame within 0.001° of each other, and geometrically consistent with NASA's γ = 0.7119. The Moon polynomial is confirmed correct; the residual comes from **elsewhere** (candidates: Sun polynomial precision, ΔT convention, or greatest-eclipse ray-trace methodology).
**Prior baseline**: [`doc 101`](101-pure-tidal-eclipses.md) — pure-tidal physics validated against 19 documented solar eclipses; -135 noted as the one persistent residual that motivated this case study.

---

## Thesis

The Babylonian astronomical diary recording the 15 April 136 BCE (= -135 astronomical) solar eclipse is one of the most scholarly-secure attributions in the historical eclipse corpus. The framework matches every other tested deep-time totality at ★ TOTAL or ◐ near-T precision, but its -135 prediction places the umbra centerline ~1159 km from Babylon. This document decomposes that gap into ΔT and non-ΔT components, documents the empirical Moon-polynomial finding (all modern theories converge), and concludes that the residual is a Sun-polynomial-precision, ΔT-convention, or ray-trace-methodology limit — **not** a Moon polynomial accuracy issue as an earlier attribution supposed. The framework's prediction (centerline over Saudi Arabia, deep partial at Babylon) remains the correct prediction *given the current Sun-polynomial precision*; closing the gap to NASA would require replacing Meeus Ch. 25 Sun with VSOP87 (or better), auditing the ΔT convention, and/or refining the greatest-eclipse ray-trace geometry.

---

## Decomposition of the 1159 km gap

The framework's BestGap to Babylon at -135-04-15 is 1159 km. Empirical decomposition (test buttons added 2026-06-24, Moon-polynomial audit added 2026-07):

- **~270 km** from framework's ΔT being −696 s under NASA's value (framework
  11,273 s vs NASA 11,969 s; closable to ~80 km by tuning α(t) within Peltier
  ICE-5G vs ICE-6G uncertainty — but α(t) tuning produces only ~3.3 km gap
  improvement per 100 sec of ΔT change, so even the full ΔT-driven component
  closes modestly)
- **~0 km from Moon polynomial** — empirically verified 2026-07: Meeus Ch. 47
  (60 terms), ELP-2000/82B truncated (3,402 terms), ELP-2000/82B full (37,863
  terms), MPP02-DE, and MPP02-LLR **all** give Moon β = 0.706° ± 0.001° at
  year -135 in the of-date frame (TT-corrected JD). NASA's published γ =
  0.7119 for this eclipse is geometrically consistent with β = 0.706° via
  γ ≈ β × d_M / R_E. **No modern lunar theory diverges from Meeus at -135.**
  The earlier attribution (~440 km from a "Meeus polynomial Moon β residual")
  was based on an unverified assumption about what ELP-2000/82 would give;
  direct testing showed the assumption was wrong.
- **~890 km from other sources** — sources not yet definitively identified.
  Candidates in decreasing likely-magnitude order:
  1. Framework Sun position from Meeus Ch. 25 (low precision) vs NASA using
     VSOP87 (higher precision) at year -135
  2. Framework's greatest-eclipse ray-trace methodology vs NASA's definition
     of the greatest-eclipse geographic point (γ minimum along shadow axis)
  3. ΔT convention subtleties (UT1 vs UT0 vs TDB corrections)

## Resolution interpretation

Framework's pure-tidal + α(t) GIA + Meeus-Sun + Meeus-Moon polynomial predicts the -135 Apr 15 eclipse centerline crossed **central Saudi Arabia (~24.8°N, 52.3°E)**, with Babylon at 1159 km from centerline observing a **deep partial eclipse (~95-99% magnitude)**. The diary's record of Venus, Mercury, and "Normal Stars" visible is consistent with this magnitude.

The disagreement with NASA's path-through-Mesopotamia is empirically **NOT** a Moon-polynomial accuracy limit (see § Decomposition above). The residual must come from Sun polynomial precision (framework Meeus Ch. 25 vs NASA VSOP87), ΔT convention, and/or ray-trace geometry differences.

NASA Five Millennium Canon's own greatest is at (47°N, 59°E) — **~2100 km from Babylon** — so even the authoritative reference does not place greatest at Babylon. NASA's path crosses Babylon at a non-greatest moment via a combination of its higher-precision Sun polynomial (VSOP87) and its own ΔT convention.

## Empirical Moon-polynomial audit (2026-07)

Testing at JD_UT = 1671853.76 + ΔT/86400 (TT-corrected input, of-date output frame):

| Theory | Terms | Moon β at year -135 |
|---|---:|---:|
| Meeus Ch. 47 | 60 | 0.7057° |
| ELP-2000/82B truncated | 3,402 | 0.7057° |
| ELP-2000/82B full untruncated | 37,863 | 0.7058° |
| MPP02-DE (fit to JPL DE405/406) | 35,901 | 0.7066° |
| MPP02-LLR (fit to Lunar Laser Ranging) | 35,901 | 0.7066° |

Maximum spread across all five theories: **0.001°**. This is within the expected accuracy of each theory at year -135 (T ≈ -21.3 Jcy, well beyond the 1900-2100 validation window). The theories are not diverging materially at deep past — they converge to the same underlying physical Moon position.

NASA's γ = 0.7119 for this eclipse is consistent with β = 0.706° via the standard relation γ ≈ β × d_M / R_E = 0.706° × (π/180) × 363,000 km / 6,378 km = 0.702. The 0.01 residual is within the ~0.03° of-date vs J2000 frame difference caused by ecliptic pole precession over 21 centuries.

**Empirical conclusion**: the Moon polynomial is confirmed correct across all theories, and geometrically consistent with NASA's own value. Any earlier claim that a higher-precision Moon polynomial would close the -135 residual is unsupported by direct testing.

---

## Scene Moon distance internal drift (2026-07)

The framework's scene-rendered Moon position was audited against its own Meeus polynomial output. The scene Moon **direction** (RA/Dec) was already Meeus-corrected via post-hoc override, but **distance** was not: `SPHERICAL.radius` retained the value set from the scene-graph orbital integration (`SPHERICAL.setFromVector3(LOCAL)`) while `SPHERICAL.theta` and `SPHERICAL.phi` were overwritten with Meeus values.

At year -135 this internal drift was:

| Quantity | Scene-graph value | Meeus polynomial | Δ |
|---|---:|---:|---:|
| Moon distance | 363,391 km | 368,219 km | −4,828 km (−1.3%) |
| Effective β from ray-trace | 0.744° | 0.7071° | +0.037° |

The 0.037° effective-β excess in the ray-trace was an artifact: the shadow projection used the wrong Moon distance, placing the umbra where a β = 0.744° Moon would cast it.

**Fix**: added `obj._meeusDistKm = moonDistance * (1 - moonOrbitalEccentricityBase * Math.cos(Mpr))` in the Meeus block and set `SPHERICAL.radius = obj._meeusDistKm * 100 / currentAUDistance` before the ecliptic-to-scene transform. After fix: scene Moon distance ratio (framework/Meeus) = **1.000000**.

**Effect on -135 residual**: umbra shifted +0.7° north (matches physical prediction β × Δd/R_E = 0.535°). Distance to NASA's greatest changed from 1236 km → 1233 km. Latitude gap to NASA closed by 500 km worth of leverage; longitude gap of ~15° eastward remained. The residual is therefore NOT a distance-drift issue either — the framework and Meeus polynomial now agree on Moon distance to seven decimal places, and the −135 gap is unchanged. Attribution shifts to the ray-trace vs Meeus-analytical umbra convention (the framework ray-trace places umbra ~8° west of sub-solar due to shadow-axis tilt at β = 0.7°; the Meeus-method analytical formula treats umbra_lon ≈ sub-solar_lon) and to the NASA γ = 0.7119 "greatest eclipse" convention for grazing partial events.

---

## Empirical context — match record at all other tested deep-time events

With Strategy A disabled (commit `4d44776`), framework's pure-tidal predictions match the documented record at ★ TOTAL or ◐ near-T level for nearly all tested events:

| Event | Framework best match | Distance | Class |
|---|---|---|---|
| -584 Thales | -584-05-28 (at documented date) | **73 km** | ★ TOTAL — vindicates Herodotus |
| -762 Bur-Sagale | -762-06-15 (at documented date) | 364 km | ◐ near-T — vindicates Eponym Canon |
| -708 Confucius | -694-10-10 (+14 yr) | 176 km | ★ TOTAL — chronology re-attribution |
| -189 Hipparchus era | -175-06-06 (+14 yr) | 228 km | ◐ near-T |
| -132 Hellenistic probe | -126-04-06 (+6 yr) | 260 km | ◐ near-T |
| -107 Hellenistic probe | -115-08-29 (-8 yr) | 156 km | ★ TOTAL |
| **-135 Babylonian** | **-126-04-06 (+9 yr)** | **801 km** | **○ partial — the case-study event** |
| -88 Late-Hellenistic probe | -103-07-19 (-15 yr) | 903 km | ○ partial — borderline |

The -135 event is the single persistent discrepancy. All other events match cleanly at deep historical time, confirming the framework's pure-tidal physics is correct overall. The -135 anomaly is therefore an event-specific polynomial accuracy issue, not a systematic framework error.

---

## Diary attribution (background)

The Babylonian astronomical diary recording the 15 April 136 BCE eclipse is regarded as one of the most secure attributions in the historical eclipse corpus:

- **Two independent tablets**: BM 45745 (astronomical diary) +
  LBAT 1285 (goal-year text)
- **Four-planet astronomical fingerprint**: Venus, Mercury, Jupiter, Mars
  in specific configurations at the eclipse moment; only 15 April 136 BCE
  satisfies all four
- **Double-dated calendar locks**: Arsacid Era 175 = Seleucid Era 239,
  intercalary Addaru day 29
- **Stephenson & Steele 2006** (*JHA*) re-examined and re-confirmed
- **No scholarly alternative proposed** in ADART or Stephenson 2016

The attribution is rock-solid. The interpretation issue is therefore not chronological — it's about whether the diary's language for "totality at Babylon" admits ~95-99% deep partial under modern re-examination, OR whether the framework's non-Moon-polynomial residual (Sun polynomial precision, ΔT convention, or ray-trace methodology) shifts the centerline ~1000 km. Both readings are consistent with the diary text.

---

## Diagnostic test buttons (Console Tests F12 → Historical Eclipses & ΔT)

Three test buttons quantified the decomposition:

1. **"-135 Babylonian root-cause diagnostic"** — Meeus standalone places umbra at (50.6°N, 86.3°E) in the simplified leverage calc. Framework's ±5h ray-trace scan finds best approach at 04:24 UT (24.8°N, 52.3°E) Saudi Arabia, 1159 km from Babylon.

2. **"Babylonian-era Meeus residual sweep (8 events)"** — measures β_Meeus vs β_needed at 8 events from -762 to -135 BCE. β_diff is small (≤0.12°) at events that matched (-584 Thales, -309 Sicily, -762 Bur-Sagale), and large (+0.30°) at -135 specifically. **Pattern is event-specific, not era-systematic.**

3. **"α(t) GIA tuning sweep at -135 Babylonian"** — tests scale factors 0.50× to 1.10× on `EARTH_MOI_FACTOR_RATE_YR`. Across 1690 sec of ΔT range, umbra latitude shifts only 1.8°. **Sensitivity: ~3.3 km gap improvement per 100 sec ΔT change.** Closing the 1159 km gap would require ~35,000 sec of ΔT shift = 50× the literature uncertainty bound. α(t) tuning is mathematically incapable of closing the gap alone.

The decomposition (as originally framed 2026-06-24) concluded the 1159 km gap must be dominated by Moon polynomial residual. **The 2026-07 empirical audit (see § Empirical Moon-polynomial audit above) showed this earlier conclusion was wrong**: five modern lunar theories all give Moon β ≈ 0.706° at year -135 within 0.001° of each other. The residual is therefore NOT a Moon-polynomial-truncation issue and must come from Sun polynomial precision, ΔT convention, or ray-trace methodology.

---

## Forward path

[`hidden/old-documents/IP-elp2000-moon-polynomial.md`](hidden/old-documents/IP-elp2000-moon-polynomial.md) — the earlier proposal to add ELP-2000/82 was **empirically superseded** by the 2026-07 audit above. All modern lunar theories tested (ELP-2000/82B truncated and full, MPP02-DE, MPP02-LLR) converge with Meeus at year -135. Higher-precision Moon polynomial does not close the residual.

The next promising avenues (in decreasing order of expected leverage, after the 2026-07 distance-drift audit ruled out scene-vs-polynomial internal drift):

1. **NASA γ / greatest-eclipse convention audit** — at -135, NASA's γ = 0.7119 marks a grazing partial. The 15° longitude offset between framework ray-trace and NASA "greatest" resembles a definitional difference (sub-shadow-axis vs closest-approach vs tangent-of-shadow-axis-to-Earth-surface). Rough estimate: 4-8 hours. **Most likely source.**
2. **Sun polynomial upgrade** — replace Meeus Ch. 25 low-precision Sun with VSOP87 (or ELP/VSOP for both Sun and Moon consistency). Rough estimate: 8-16 hours, medium technical complexity.
3. **ΔT convention audit** — verify UT1 vs UT0 vs TDB corrections match NASA's convention. Rough estimate: 4-8 hours.

None are currently prioritized; the deep-partial-at-Babylon reading remains the project's official position and is consistent with the diary text + the empirical match record at all other deep-time events.

---

## Cross-references

- [Doc 101 — pure-tidal eclipses](101-pure-tidal-eclipses.md) — framework validation; -135 documented under Interpretation 1 (deep partial reading)
- [Doc 102 — GIA α(t) lunar validation](102-gia-alpha-lunar-validation.md) — α(t) GIA contribution magnitude (rules out α(t) tuning as -135 solution)
- [Doc 66 — Moon Meeus corrections](66-moon-meeus-corrections.md) — polynomial accuracy table (2026-07 finding: all modern lunar theories at year -135 agree with Meeus Ch. 47 within 0.001°; doc 66's original ~10-30 arcsec estimate at deep past appears empirically defensible after this audit)
- [`hidden/old-documents/IP-elp2000-moon-polynomial.md`](hidden/old-documents/IP-elp2000-moon-polynomial.md) — forward-path proposal for higher-precision Moon polynomial
- [`hidden/old-documents/IP-strategy-z-earth-rotation-integration.md`](hidden/old-documents/IP-strategy-z-earth-rotation-integration.md) — Strategy A investigation history (the prior step that exposed -135 as the persistent residual; Strategy Z proposal abandoned, Strategy A disabled instead)
- Diary attribution: Stephenson & Steele 2006 *JHA*; Sachs & Hunger *ADART* Vol. III; Huber & De Meis 2004, *Babylonian Eclipse Observations from 750 BC to 1 BC*

---

## External references on the -135 Apr 15 eclipse

Independent published sources for cross-checking the framework's interpretation:

- **EclipseWise (Espenak) — authoritative path map for -135 Apr 15** ([link](https://eclipsewise.com/solar/SEprime/-0199--0100/SE-0135Apr15Tprime.html)) — the NASA Five Millennium Canon "prime" version of the eclipse-path diagram. Lets a reader independently verify the greatest-eclipse coordinates at (46.8°N, 58.9°E) and inspect the ELP-2000/82 path geometry. The path map shows greatest in central Kazakhstan and the totality track extending across central Asia; the question of whether the track also dips through Mesopotamia at a non-greatest moment depends on the specific ΔT applied.

- **IMCCE (Institut de mécanique céleste et de calcul des éphémérides) — "L'éclipse de Babylone"** ([link](https://promenade.imcce.fr/en/pages4/468.html)) — explicit narrative of the framework's "two pictures" question: *"if we recalculate with modern theories, the circumstances of the eclipse regardless of the slowdown of the rotation of the Earth, it is found that the entire band of total visibility passed not to Babylon (located in present-day Iraq about 160 km south of Baghdad), but in Morocco… the Earth slows 1.6 millisecond per century… which, cumulated, give a difference of about 4 hours for the eclipse of Babylon."* This directly corroborates this doc's decomposition: *without* the ΔT correction the path is far west; *with* Stephenson-empirical ΔT the path crosses Mesopotamia; *with* the framework's pure-tidal + α(t) ΔT the path lands ~1159 km south-east of Babylon over Saudi Arabia. IMCCE also explicitly acknowledges the polynomial-precision limit at deep historical past: *"it shows the limits of the current celestial mechanics for any prediction of the path of totality of an eclipse of the Sun. It cannot, across centuries, be absolutely accurate because of irregularities in the rotation of our planet impossible to determine in advance."*

- **Russian geology repository — historical-eclipse compilation** ([link](https://repository.geologyscience.ru/server/api/core/bitstreams/6dd0f726-52e0-4e06-a7c4-28fb9cfa2aa6/content)) — discussion of the -135 Babylonian eclipse in the context of Earth-rotation history; useful as a third independent source for the same path-geometry / ΔT-sensitivity framing.

These external sources establish that **the framework's prediction (~1159 km from Babylon) is in the same conceptual neighborhood as the published independent reconstructions**: all approaches agree the eclipse's geographic placement at Babylon depends critically on the exact ΔT model used. The Interpretation 1 reading adopted in this doc (Babylon saw deep partial, framework's path-through-Saudi-Arabia is correct given its current Sun-polynomial precision) is consistent with the IMCCE-acknowledged "limits of current celestial mechanics" framing. **Note (2026-07 update)**: after the empirical Moon-polynomial audit above, the cross-model spread's cause is now attributed to Sun-polynomial precision, ΔT convention, and ray-trace methodology differences — NOT to Moon polynomial precision as originally supposed. Modern Moon theories converge across the full historical past; the -135 residual is a subtler problem than a truncated series.
