# WebGeoCalc Explorer

## Overview

The **WebGeoCalc Explorer** is a modal panel in the Tools menu that shows the actual observed perihelion-precession history of each planet, based on JPL NAIF WebGeoCalc ephemeris queries over the 1900–2026 observational baseline. For each planet it plots the three angles that describe the orientation of the orbit in the ecliptic frame — ascending node `Ω`, argument of periapsis `ω`, and longitude of perihelion `ϖ = Ω + ω` — and overlays the model's prediction so the observed data and the model can be compared directly, in the same frame the data live in.

This is the panel that grounds the Holistic Universe Model's perihelion rates in *observation*, not theory. The model's Fibonacci ecliptic periods (`perihelionEclipticYears` per planet) are chosen to match what WebGeoCalc reports, not what any secular-theory textbook predicts. The Explorer makes that calibration visible.

## Why the 1900–2026 baseline matters

JPL/NAIF's WebGeoCalc service queries the planetary ephemerides DE440/DE441, which are themselves fits to millennia of astronomical observations backed up by modern radar, laser, and spacecraft ranging. The 1900–2026 window is the stretch where the underlying observations are densest and most accurate — older data is less trustworthy and future ephemeris values are extrapolations.

For some planets the 1900–2026 baseline is **long enough** to resolve the long-term perihelion trend cleanly (Mercury, Mars, Saturn). For others it is **shorter than the dominant short-period oscillation** (Venus, Jupiter, Uranus, Neptune), so a naïve linear fit over the window picks up that oscillation and gives a rate that flips sign across sub-windows. The Explorer labels the un-resolvable cases explicitly so they are not mistaken for reliable observations.

## Three charts per planet

Each planet's tab shows three SVG line charts on the same time axis (1900–2026):

### 1. Longitude of Perihelion — `ϖ` (primary chart)

The main result. `ϖ = Ω + ω` is the angle between the vernal equinox and the perihelion direction, measured in the ecliptic plane. Its time derivative `dϖ/dt` is what is normally called "the perihelion precession rate" — the quantity Le Verrier computed for Mercury.

The chart plots the unwrapped `ϖ(t)` values directly (so a monotonic precession shows as a straight line even though `ϖ` wraps every 360°). A linear regression is fit through the data and the slope is reported in `″/cy`. For planets with resolvable trends, both a raw-OLS rate and a sin+lin rate (linear + sinusoid model, removes the dominant oscillation) are reported; they should agree closely.

**Overlaid in yellow**: the model's predicted `ϖ(t)` computed by integrating `predictGeocentricPrecession(year, planet)` from J2000, which combines the Fibonacci long-term-mean baseline rate and the fitted missing-advance fluctuation. When the yellow and blue curves overlap, the model reproduces the observation.

### 2. Ascending Node — `Ω` (collapsible)

Longitude of the ascending node on the ecliptic, measured from the vernal equinox. Its time derivative `dΩ/dt` is the ascending-node regression rate. For most planets this is westward (retrograde) at roughly the general-precession rate; planets with strong mutual perturbations show additional drift.

Collapsed by default so the primary `ϖ` chart gets full attention. The model's prediction is not overlaid here — the integrated-rate machinery is perihelion-specific.

### 3. Argument of Periapsis — `ω` (collapsible)

The angle from the ascending node to the perihelion, measured within the orbital plane. `ω = ϖ − Ω`. Its time derivative is the argument-of-periapsis rate. Standish Table 1 (1800–2050) and Table 2a (3000 BC–3000 AD) disagree on the *sign* of `ω̇` for Saturn — the ecliptic-retrograde phenomenon the model predicts. See [docs/10-fibonacci-laws.md § Saturn's Ecliptic-Retrograde Perihelion Precession](10-fibonacci-laws.md) for the details.

## Observed rates at a glance

The WebGeoCalc trends extracted by the Explorer for the 1900–2026 window are summarized here (full discussion in [docs/37-planets-precession-cycles.md § Perihelion longitude advance](37-planets-precession-cycles.md)):

| Planet | WebGeoCalc observed (ϖ̇) | Trend resolvability | Model Fibonacci (H-fraction) |
|--------|-------------------------|---------------------|------------------------------|
| Mercury | ~570 ″/cy prograde | ✓ resolvable | 531 (H × 8/11) |
| Venus | ~0 ″/cy (flips sign across windows) | ✗ un-determined | −290 (−8H/6) |
| Earth | ~6,186 ″/cy prograde (wrt equinox) | ✓ resolvable | 6,187 (H/16) |
| Mars | ~1,600 ″/cy prograde | ✓ resolvable | 1,691 (H × 8/35) |
| Jupiter | ~1,800 ″/cy prograde (current epoch) | ✗ un-determined | 1,933 (H/5) |
| Saturn | ~−3,400 ″/cy retrograde | ✓ resolvable | −3,092 (−H/8) |
| Uranus | ~1,100 ″/cy (current epoch) | ✗ un-determined | 1,160 (H/3) |
| Neptune | ~200 ″/cy (current epoch) | ✗ un-determined | 193 (2H) |

The four un-determined planets (Venus, Jupiter, Uranus, Neptune) inherit their sign from Laskar-style million-year secular integrations — their perihelion oscillation period exceeds the 126-year observational baseline so only the instantaneous slope is accessible from WebGeoCalc. Earth is omitted from the panel itself because its ecliptic inclination is zero by definition and its ascending node is numerically undefined.

## Frame note

All three angles are measured in the **ecliptic-of-date** frame — the plane that contains Earth's orbit at the instantaneous epoch. The ecliptic is not itself an inertial frame; it precesses wrt the ICRF (J2000 inertial) at approximately `−50.3 ″/yr = −5,030 ″/cy` (general precession, `H/13`). Every ecliptic rate therefore differs from the corresponding ICRF rate by this universal constant:

```
ω_ICRF = ω_ecliptic − ω_gen              (ω_gen = 2π / (H/13))
```

For the Holistic Universe Model this distinction is load-bearing: the model anchors its Fibonacci structure in the ICRF frame and derives ecliptic rates from there via the relation above. The WebGeoCalc Explorer measures the date-frame (what JPL reports), which is the frame the model is calibrated to match. See [docs/13-mercury-precession-breakdown.md § 1.5a Reference Frames](13-mercury-precession-breakdown.md) for the full discussion of why ecliptic-only first-order L-L fails where a two-frame treatment succeeds.

## Data pipeline

```
tools/lib/webgeocalc-client.js            ← HTTP client for WebGeoCalc REST API
        │
        ▼
tools/explore/wgc-perihelion-rates.js     ← queries Ω, ω, ϖ monthly 1800–2100
        │                                   performs raw OLS + sin+lin fits
        ▼
public/input/wgc-perihelion-data.json     ← committed JSON of per-planet time series
        │
        ▼
openWGCPanel()  in src/script.js          ← loads JSON via fetch(), renders SVGs
```

The JSON contains per-planet `yrArr`, `omArr` (Ω), `wArr` (ω), `piArr` (ϖ) monthly samples plus a pre-computed `rates` block with `rawPi` and `sinPi` trend estimates and an `oscPeriod` for the dominant oscillation (used to decide whether the baseline is reliable).

Re-running `node tools/explore/wgc-perihelion-rates.js` regenerates the JSON from WebGeoCalc; this is only needed after DE441 ephemeris updates at JPL. The JSON is fetched at panel-open time from the GitHub raw URL so the simulation does not need to bundle it.

## UI layout

```
┌─────────────────────────────────────────────────────────┐
│  WebGeoCalc Explorer                             [×]    │
│  Observed perihelion precession 1900–2026 (JPL NAIF)    │
├─────────────────────────────────────────────────────────┤
│  [Mercury] [Venus] [Mars] [Jupiter] [Saturn] ...        │  ← tab row
├─────────────────────────────────────────────────────────┤
│  MERCURY PERIHELION PRECESSION                          │
│  ── Observed: raw 574.6 ″/cy · sin+lin 573.8 ″/cy       │
│  ── Model:    570.3 ″/cy (baseline 531.4 + missing 38.9)│
│  Baseline: 126 yr, 18× oscillation — OLS reliable       │
│                                                         │
│  ┌─── Longitude of perihelion ϖ vs Time ──────┐         │
│  │              ▗▖▗▖                          │         │
│  │          ▗▘▗▘                              │         │
│  │     ▗▘▗▘                                   │         │
│  │ ▗▘▗▘            (blue = observed,          │         │
│  │                  yellow = model)           │         │
│  └──────────────────────────────────────────── ┘         │
│  Frame note: ecliptic-of-date, ≠ ICRF by H/13.          │
│  ▶ Ascending node Ω (click to expand)                   │
│  ▶ Argument of periapsis ω (click to expand)            │
└─────────────────────────────────────────────────────────┘
```

- **Tab row**: one per planet (Earth excluded for the reason above).
- **Summary block**: observed trend, model prediction, resolvability flag.
- **Primary chart**: `ϖ` vs time with observed polyline + model overlay + OLS trend.
- **Collapsible charts**: `Ω` and `ω` for when you want to inspect node/argument behaviour separately.
- **Frame note**: reminder that angles live in the ecliptic-of-date frame.

## Color coding

- **Blue (`#268bd2`)** — observed `ϖ` data
- **Yellow (`#ffe066`)** — model `ϖ` prediction (baseline + missing advance)
- **Teal (`#2aa198`)** — observed `Ω`
- **Olive (`#859900`)** — observed `ω`
- **Orange (`#cb4b16`)** — un-determined-trend warning label

## Model comparison logic

For the model overlay, the Explorer calls `predictGeocentricPrecession(year, planet)` at each sampled year and integrates the instantaneous rate trapezoidally from J2000 forward and backward, anchored at the JPL J2000 longitude of perihelion (`planet.longitudePerihelion`). The model's predicted `ϖ(t)` can thus be compared pointwise to the observed curve, not just through a single slope number.

The model's instantaneous rate at year Y is:

```
ω_model(Y) = perihelionEclipticBaseline[planet]  +  missingAdvance[planet](Y)
```

- **Baseline rate**: constant, equal to `360°·3600 / H·fraction = Fibonacci long-term mean`.
- **Missing advance**: year-dependent, fitted via the 429-term `PREDICT_COEFFS` predictive formula to reproduce observed behaviour.

The yellow and blue curves tracking each other over 1900–2026 is the visual validation that the Fibonacci + missing-advance combination matches the 1900–2026 reality.

## Scope and limitations

1. **Only perihelion-related angles** — the Explorer does not show eccentricity, inclination, or semi-major-axis evolution. Those are handled elsewhere (the Eccentricity Balance Scale, the Grand Holistic Octave panel, the planetStats panel).
2. **No ICRF frame variant** — all angles are in the ecliptic-of-date frame; the ICRF-frame rate is noted but not plotted. Future work: add an optional ICRF-frame chart that subtracts general precession.
3. **Earth is excluded** — ecliptic inclination zero by definition ⇒ `Ω` undefined. WebGeoCalc's reference charts also omit Earth.
4. **Baseline is fixed at 1900–2026** — extending the pipeline script to broader windows (say 1600–2200) is possible but introduces ephemeris extrapolation issues outside DE441's validated span.
5. **No per-planet export** — the Explorer is read-only; to dump the time series to CSV use the pipeline script directly.

## Related documentation

- [Mercury Precession Breakdown](13-mercury-precession-breakdown.md) — First-order Laplace-Lagrange analysis, reference-frame discussion, why the model's Fibonacci framework matches WebGeoCalc where L-L fails.
- [Planets Precession Cycles](37-planets-precession-cycles.md) — Full per-planet tables (axial, perihelion ecliptic, ICRF, ascending node, obliquity, eccentricity) with Fibonacci fractions and WebGeoCalc / Laskar references.
- [Grand Holistic Octave Periods](55-grand-holistic-octave-periods.md) — The period table modal; shows each WebGeoCalc-observed rate next to the model's Fibonacci fraction.
- [Perihelion Precession](12-perihelion-precession.md) — The three methods used inside the simulation for computing perihelion longitude and precession (scene-graph, ICRF analytical, predictive formula).
- [Constants Reference § Observed trend rates](20-constants-reference.md) — The constants block that feeds the display.

## Code Location

| Component | Location |
|-----------|----------|
| Panel modal | `createWGCPanel()` / `openWGCPanel()` / `closeWGCPanel()` in `src/script.js` |
| Per-planet content | `wgcRenderPlanet()` in `src/script.js` |
| SVG chart renderer | `wgcRenderChart()` in `src/script.js` |
| Angle unwrapping | `wgcUnwrap()` in `src/script.js` |
| Linear regression | `wgcLinearFit()` in `src/script.js` |
| Data loader | `loadWGCData()` (fetches `public/input/wgc-perihelion-data.json` from the raw GitHub URL) |
| Data generator | `tools/explore/wgc-perihelion-rates.js` |
| WebGeoCalc HTTP client | `tools/lib/webgeocalc-client.js` |
| Committed data | `public/input/wgc-perihelion-data.json` |
| Tools-menu button | "WebGeoCalc Explorer" in Tweakpane Tools folder (`src/script.js` near line 26229) |
| CSS | `.wgc-*` classes in `src/style.css` |
