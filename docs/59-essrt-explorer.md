# ESSRT Explorer

## Overview

The **ESSRT Explorer** is a modal panel in the Tools menu that visualizes the **Expanding Solar System Resonance Theory** (see [doc 99](99-expanding-solar-system-resonance-theory.md)) — how the Earth Fundamental Cycle H, length-of-day, sidereal/tropical year length, Moon distance, and Earth-Sun distance evolve across deep time.

The Solar System Resonance Cycle (8H ≈ 2.68 Myr today) and its 32-integer L1 lattice are **structural invariants** — the integers stay fixed at any epoch. What changes is the literal time unit: H itself expands monotonically across geological time via two physically independent drivers:

- **Driver 1 — Earth-Moon tidal evolution**: lunar tidal friction slows Earth's spin, lengthening LOD; H ∝ LOD via the structural identity `H = 13 × axial precession period` (where axial precession scales with LOD).
- **Driver 2 — Solar mass loss**: the Sun loses ~10⁹ kg/s in solar wind; by angular-momentum conservation `a × M = const`, each planet's semi-major axis slowly expands; Kepler's third law `T² ∝ a³ / M` then sets each planet's orbital period.

The panel plots each quantity over the full Hadean → +1 Gyr range or a focused Phanerozoic 650-Myr window, with anchor-point validation against the Wu et al. 2024 cyclostratigraphic compilation.

This is the panel that grounds the model's deep-time claims in *observation*. The structural invariants (the 8H/N integer divisors of [doc 55](55-solar-system-resonance-cycle-periods.md), the Fibonacci hierarchy of [doc 10](10-fibonacci-laws.md), the L1 climate-formula lattice of [doc 92](92-climate-formula.md)) all live on a scaffold whose absolute scale evolves with H(t). The ESSRT Explorer makes that evolution visible.

## Accessing the Explorer

1. Open the Tweakpane Tools folder.
2. Click **"ESSRT Explorer"**.
3. Use the **Quantity** tabs (top row, gold accent) to select what to plot.
4. Use the **Range** tabs (second row, teal accent) to select the time range.

The two-tab-row layout matches the layered look of the Climate Formula Explorer ([doc 58](58-climate-formula-explorer.md)). Quantity tabs use the standard gold active-state; range tabs use a teal-cyan accent (`#3ec9b9`) so the two rows are visually distinct.

## Quantity tabs

| Tab key | Tab label | Plotted quantity | Driver | Source helper |
|---|---|---|---|---|
| `h` | **H-Period** | Earth Fundamental Cycle H(t) in years | 1 only (∝ LOD) | `meanHAtAge(t_Ma)` |
| `axial` | **Axial Precession** | Earth's polar-axis precession period = H/13 | 1 only | `meanHAtAge(t_Ma) / 13` |
| `obliqCycle` | **Obliquity period** | H/8 obliquity oscillation period | 1 only | `meanHAtAge(t_Ma) / 8` |
| `lod` | **Length of Day** | Earth's mean solar day length (hours) | 1 only | `meanLodSecondsAtAge(t_Ma) / 3600` |
| `year` | **Length of Year** | Tropical year length in mean-solar days *at each epoch* | 1 + 2 | `meanTropicalYearSecondsAtAge(t_Ma) / meanLodSecondsAtAge(t_Ma)` |
| `au` | **AU Distance** | Earth-Sun semi-major axis (km) | 2 only | `meanAuAtAge(t_Ma)` |
| `moon` | **Moon Distance** | Earth-Moon distance (km) | 1 (Farhat 2022 polynomial) | `meanMoonDistanceMetresAtAge(t_Ma) / 1000` |

**Driver attribution.** H, axial precession, obliquity cycle, and LOD scale via Driver 1 only. AU distance and Moon distance scale via Driver 2 (AU) and Driver 1 (Moon, via the Farhat polynomial). Year length is the only quantity combining both drivers — Driver 2 sets year-in-seconds (~constant); Driver 1 sets day-in-seconds (variable); their ratio is days-per-year, which evolves dramatically (e.g. ~400 days/year at the Devonian, matching Wells 1963 coral growth bands).

## Range tabs

| Tab key | Range | Label |
|---|---|---|
| `full` | −4,540 Ma → +1,000 Ma (5.54 Gyr) | "Full (−4.54 to +1 Gyr)" |
| `phanero` | −650 Ma → 0 Ma (Phanerozoic eon) | "Phanerozoic (650 Ma)" |

The **Full** range spans from Earth-Moon genesis (~4.54 Ga) to +1 Gyr in the future, covering the entire geological + projected lifespan of the formalism. The **Phanerozoic** range zooms into the past 650 Myr where cyclostratigraphy data (Wu 2024) provides direct validation anchors.

Some quantities use a tighter Phanerozoic Y-range than the Full range — e.g., year-length-in-days clamps to `[0, 500]` on Phanerozoic (covers ~365 to ~416 days/year cleanly) versus `[0, 2000]` on Full (must accommodate the ~1750 days/year Hadean value).

## Chart layout

```
┌─────────────────────────────────────────────────────────────┐
│ Expanding Solar System Resonance Theory (ESSRT)       [×]   │
│ The Solar System Resonance Cycle expands monotonically...   │
│                                            [Export Full] [Export Phanerozoic] │
├─────────────────────────────────────────────────────────────┤
│ [H-Period][Axial Precession][Obliquity][LOD][Year][AU][Moon]│  ← Quantity (gold)
│ [Full (−4.54 to +1 Gyr)] [Phanerozoic (650 Ma)]             │  ← Range (teal)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─── Y axis: quantity in natural units ─────────┐          │
│  │                                                │          │
│  │     ▗▘                                         │          │
│  │  ▗▘                                            │          │
│  │ /                                              │          │
│  │/                                               │          │
│  │── era markers (Earth-Moon genesis, Cambrian,   │          │
│  │     Devonian, Pangea, J2000 highlighted) ──   │          │
│  │── Wu 2024 ±2σ anchors (orange ◯) ──          │          │
│  │── Extrapolation zone (grey hatched, t > 0) ── │          │
│  └────────────────────────────────────────────────┘          │
│  X axis: Time (Ma; negative = past, 0 = J2000)              │
└─────────────────────────────────────────────────────────────┘
```

### Era markers

Five geological-era vertical markers anchor the time axis:

| t_cal (Ma) | Era | Color | Style |
|---|---|---|---|
| −4540 | Earth-Moon genesis | `#a66` reddish | dashed, 1.1 stroke |
| −541 | Cambrian | `#699` teal-grey | dashed, 0.8 stroke |
| −380 | Devonian | `#6a9` green-grey | dashed, 0.8 stroke |
| −250 | Pangea (mid) | `#c95` orange-tan | dashed, 0.8 stroke |
| 0 | **J2000 (now)** | `#fb3` gold | **solid**, 1.4 stroke |

Era labels render rotated −32° below the chart, with overlap-avoidance heuristics to keep the most-significant markers visible.

### Wu et al. 2024 anchor overlay

For three quantities (LOD, year, axial precession period, Moon distance — those where Wu 2024 provides direct cyclostratigraphic measurements), the panel overlays the Wu compilation's anchor points with ±2σ error bars:

| Anchor age (Ma) | LOD (hr) | Moon (Earth radii) | Axial period (arcsec/yr) |
|---:|---:|---:|---:|
| 0 (J2000) | 24.00 | 60.27 | 51.25 |
| 100 | 23.65 ± 0.15 | 59.50 ± 0.5 | 53.0 ± 1.0 |
| 200 | 23.70 ± 0.10 | 58.50 ± 0.5 | 54.36 ± 1.0 |
| 300 | 22.75 ± 0.25 | 54.00 ± 1.0 | 59.5 ± 0.5 |
| 400 | 21.75 ± 0.25 | 52.50 ± 0.5 | 61.5 ± 0.5 |
| 500 | 21.20 ± 0.30 | 53.50 ± 0.5 | 64.5 ± 0.5 |
| 650 | 20.94 ± 0.10 | 56.73 ± 0.30 | 67.64 ± 0.30 |

The overlay shows the model's predicted curve passes through every Wu anchor's error bar — see [doc 99 §"Validation against published paleontological measurements"](99-expanding-solar-system-resonance-theory.md) for the per-anchor agreement table and source citations (Wells 1963, Williams 2000, Patterson 1956, Wu et al. 2024).

Each Wu anchor is plotted as an orange filled circle (`#e07b00`, radius 5) with a vertical ±2σ error bar. Clicking the legend opens the Wu et al. 2024 paper (sciadv.ado2412).

### Extrapolation zone

Future of J2000 (t_cal > 0) is shaded with a subtle grey wash + 45° diagonal hatch pattern + italic "Extrapolation" label at the top of the zone. This identifies the marked region as model projection rather than data-anchored fit — the proper-physics formulas remain valid forward, but no observational anchors exist there.

### Hover tooltip

Mouse-over on the chart triggers a snap-to-nearest-sample tooltip showing the exact year and value. Implementation uses an invisible `.essrt-hover-capture` overlay drawn last in SVG; binding wires the closest-sample lookup, draws a vertical hover line + dot at that sample, and positions a tooltip with the year + formatted value (e.g., "−380 Ma · 21.75 hr").

### Footnotes (per-quantity)

Two quantities include a footnote below the chart:

- **Axial Precession** — *"Note: shown is the structural mean H/13. The real axial precession also oscillates by ~50-500 years around this mean on shorter cycles of ~21,000 and ~42,000 years (the H/16 perihelion and H/8 obliquity cycles). These short-period fluctuations are invisible at the modal's deep-time scale (one chart pixel spans ~590,000 years on the Phanerozoic view), but show up in the orbital calculator at modern epochs."*
- **Obliquity Cycle** — *"Note: Earth's axial tilt oscillates between approximately 22.4° and 24.5° around a stable mean ~23.4°. The cycle period (shown here, ∝ H) evolves with deep time; the mean stays essentially fixed."*

These prevent the common misreading that the modal is showing *the obliquity oscillation itself* or *the axial precession positions* — it shows the *periods* of those cycles, which scale with H(t).

## Export buttons

Two buttons in the header produce publication-grade SVG exports:

- **Export Full** — renders the current quantity over the Full (−4.54 to +1 Gyr) range as a paper-style SVG (white background, sized for figure inclusion).
- **Export Phanerozoic** — renders the current quantity over the Phanerozoic 650 Ma window as a paper-style SVG.

Both use `essrtRenderPaperChart()` which mirrors the modal renderer's geometry so the export looks identical to the on-screen view minus the interactive UI chrome. Triggered by `essrtExport(rangeKey)`; opens the SVG in a new tab as a data URL; right-click to save or screenshot.

## Validation summary

The modal's curves pass through anchored data points from multiple independent sources:

| Quantity | Anchor source | Range | Agreement |
|---|---|---|---|
| LOD | Wells 1963 (coral growth rings) | Devonian (~380 Ma) | Sub-percent |
| LOD + Moon | Wu et al. 2024 (cyclostratigraphy) | 100–650 Ma | Within ±2σ at all 6 anchors |
| Moon distance | Farhat 2022 (Moon-distance polynomial) | 0–4.5 Ga | <0.5% over full range |
| Earth-Moon genesis | Patterson 1956 (Pb-Pb meteorite age) | 4.54 Ga | Moon at Roche limit at this epoch |
| Williams 2000 (620 Ma tidal rhythmites) | rhythmite varves | 620 Ma | Discrepancy with Wu; doc 99 discusses |

Full per-anchor agreement table + statistical summary at [doc 99 §"Validation against published paleontological measurements"](99-expanding-solar-system-resonance-theory.md).

## Code locations

| Component | Location |
|-----------|----------|
| Panel modal | `createEssrtPanel()` / `openEssrtPanel()` / `closeEssrtPanel()` in `src/script.js` |
| Quantity tab config | `ESSRT_QTY_TABS` (7 entries: h, axial, obliqCycle, lod, year, au, moon) |
| Range tab config | `ESSRT_RANGE_TABS` (2 entries: full, phanero) |
| Per-quantity specs | `ESSRT_QTY_SPECS` (title, subtitle, yLabel, compute, yFmt, yMin/Max, hasWu, wuKey, wuConvert, footnote) |
| Era markers | `ESSRT_ERA_MARKERS` (5 entries: genesis, Cambrian, Devonian, Pangea, J2000) |
| Wu 2024 anchor data | `WU_ANCHORS` (7 entries with LOD / Moon / axial values + per-quantity ±2σ) |
| Chart renderer | `essrtRenderChart(qtyKey, rangeKey)` in `src/script.js` |
| Paper-export renderer | `essrtRenderPaperChart(qtyKey, rangeKey)` |
| Export trigger | `essrtExport(rangeKey)` |
| Tick computer | `essrtNiceTicks(min, max, targetTicks)` — round-number Y-axis ticks |
| Series sampler | `essrtComputeSeries(spec, t_lo, t_hi, N, planetKey)` |
| Underlying physics | `meanLodSecondsAtAge`, `meanHAtAge`, `meanSiderealYearSecondsAtAge`, `meanTropicalYearSecondsAtAge`, `meanMoonDistanceMetresAtAge`, `meanAuAtAge`, `meanPlanetOrbitalPeriodAtAge` (all in `src/script.js` near line 4700) |
| Tools-menu button | "ESSRT Explorer" in Tweakpane Tools folder |
| CSS | `.cfm-*` classes shared with Climate Formula Explorer + ESSRT-specific overrides |

## Scope and limitations

1. **Earth-centric quantities only.** The 7 plotted quantities all describe Earth (H, axial precession, obliquity, LOD, year, AU, Moon). Per-planet deep-time evolution (e.g. Jupiter's perihelion period at deep time) is implicit — every planet's 8H/N period rescales with H(t) — but the modal doesn't plot per-planet curves directly. The structural argument is in [doc 99 §"Predicted planetary perihelion precession periods through time"](99-expanding-solar-system-resonance-theory.md).
2. **Two-driver framework only.** The proper-physics formulas combine Driver 1 (Farhat polynomial + angular-momentum conservation) and Driver 2 (Kepler scaling under solar mass loss). Other long-term effects — late-stage giant-planet migration, dust accretion, GR perturbations beyond Kepler — are not in the formulas. Forward validity is bounded by the proper-physics formula's horizon (~+2 Gyr per [doc 99 §"The proper-physics formula's predictive horizon"](99-expanding-solar-system-resonance-theory.md)).
3. **Hadean uncertainty is real.** Backward to Earth-Moon genesis, the formulas extrapolate well beyond the Wu 2024 anchor range (max 650 Ma). The Hadean predictions (e.g., LOD ~5 hr, H ~73,000 yr) are model output, not observation — see [doc 99 §"Interpretation 2: Proper-physics formula at the Hadean"](99-expanding-solar-system-resonance-theory.md) for the discussion.
4. **No discrimination between Wu and Williams 2000.** The Williams 2000 620-Ma tidal-rhythmite LOD estimate (21.9 hr) disagrees mildly with the proper-physics curve (~21.0 hr) and with Wu 2024's nearby 650-Ma anchor (20.94 hr). [Doc 99 §"The Williams 2000 (620 Ma) discrepancy"](99-expanding-solar-system-resonance-theory.md) discusses both views; the modal plots only the model curve + Wu anchors.
5. **Read-only.** No "edit polynomial coefficients" feature. To update the proper-physics formulas, edit the helper functions in `src/script.js` and reload.

## Related documentation

- [doc 99 — Expanding Solar System Resonance Theory (ESSRT)](99-expanding-solar-system-resonance-theory.md) — complete theoretical framework, Driver 1 + 2 derivations, per-anchor validation tables, deep-time L1 predictions, falsifiable claims
- [doc 55 — Solar System Resonance Cycle Periods](55-solar-system-resonance-cycle-periods.md) — the 8H/N integer-divisor lattice that stays invariant under H(t) scaling
- [doc 10 — Fibonacci Laws](10-fibonacci-laws.md) — the structural Fibonacci identities (H/3, H/5, H/8, H/13, H/16) the modal scales
- [doc 58 — Climate Formula Explorer](58-climate-formula-explorer.md) — sibling Tools-menu modal (companion to ESSRT Explorer)
- [doc 57 — Formula Verification](57-formula-verification.md) — sibling Tools-menu modal comparing model vs published celestial-mechanics formulas across ±12 kyr
- [doc 56 — WebGeoCalc Explorer](56-webgeocalc-explorer.md) — sibling Tools-menu modal showing observed perihelion-precession history (JPL NAIF, 1900–2026)
- [doc 50 — UI Panels Reference](50-ui-panels-reference.md) — overview of all UI panels
