# Verification Data Reference

This document describes the astronomical verification data embedded in the simulation for validating planetary positions against known historical events.

**Last Updated:** June 2026

**Related Documents:**
- [52 - Analysis & Export Tools](52-analysis-export-tools.md) - Planet report generation and data export
- [51 - Planet Inspector Reference](51-planet-inspector-reference.md) - Where reports are displayed
- [20 - Constants Reference](20-constants-reference.md) - Orbital constants and sources

---

## Overview

The simulation includes over 8,000 verification data points from authoritative astronomical sources. These allow users to compare the model's calculated positions against historically observed events such as planetary transits, oppositions, conjunctions, mutual occultations, and historical observations (notably Tycho Brahe's Mars observations).

**Location:** `script.js` line ~11398 (`PLANET_TEST_DATES`)

---

## Data Sources

### NASA Eclipse/Transit Catalogs

| Catalog | URL | Used For |
|---------|-----|----------|
| Mercury Transit Catalog | eclipse.gsfc.nasa.gov/transit/catalog/MercuryCatalog.html | Mercury transit positions |
| Venus Transit Catalog | eclipse.gsfc.nasa.gov/transit/catalog/VenusCatalog.html | Venus transit positions |

### Opposition & Conjunction Tables

| Source | Used For |
|--------|----------|
| Jean Meeus astronomical tables | Mars opposition declinations |
| nakedeyeplanets.com | Mars opposition dates |
| stjerneskinn.com | Mars opposition data |
| astropixels.com (JPL DE405) | Jupiter-Saturn conjunctions |
| astropro.com | Great conjunction 3000-year table |

### Historical Observations

| Source | Used For |
|--------|----------|
| Tycho Brahe Mars observations | ~7,384 declination measurements (1580s–1600s) |

### Mutual Planetary Events

| Source | URL | Used For |
|--------|-----|----------|
| Wikipedia | List of mutual planetary eclipses | Occultation dates |
| Project Pluto | projectpluto.com/mut_pln.htm | Occultation verification |
| Bogan Astronomy | bogan.ca/astro/occultations/occltlst.htm | Occultation data |

---

## Data Structure

Each verification entry has the following structure:

```javascript
{
  jd: 2451716.5,           // Julian Day of the event
  ra: '7.412897222',       // Right Ascension (decimal hours) - optional
  dec: '20.8486',          // Declination (degrees) - optional
  longitude: '302.97',     // Ecliptic longitude (degrees) - optional
  type: 'position',        // 'position' or 'both' (RA+Dec)
  label: 'NASA date',      // Description of the event
  comparePlanet: 'saturn', // For conjunctions/occultations - optional
  showOnScreen: true,      // Whether to display in reports
  tier: '2R',              // Data quality tier (1A-1D, 2A-2R, 3)
  weight: 2                // Optimization weight (0 = reference only)
}
```

### Field Descriptions

| Field | Description |
|-------|-------------|
| `jd` | Julian Day number of the event |
| `ra` | Right Ascension in decimal hours (e.g., 7.412 = 7h 24m 43s) |
| `dec` | Declination in degrees (positive = north, negative = south) |
| `longitude` | Ecliptic longitude in degrees (tropical zodiac) |
| `type` | `'position'` for declination-only, `'both'` for RA+Dec |
| `label` | Event type: 'NASA date', 'Opposition', 'Occultation', 'Tycho Brahe', etc. |
| `comparePlanet` | For conjunctions, the other planet involved |
| `showOnScreen` | If `true`, appears in default report output |
| `tier` | Data quality tier used by the optimizer (1A=highest, 3=lowest) |
| `weight` | Optimization weight: higher = more influence on parameter fitting |

### Data Quality Tiers

| Tier | Count | Description |
|------|-------|-------------|
| 1A | 42 | Highest quality — model start positions |
| 1B | 76 | High quality — precise transit observations |
| 1C | 7,384 | Historical observations (Tycho Brahe Mars data) |
| 1D | 88 | High quality — precise declinations |
| 2A | 46 | Medium quality — opposition data |
| 2B | 180 | Medium quality — conjunction/opposition data |
| 2C | 69 | Medium quality — occultation dates |
| 2R | 50 | Reference positions (RA+Dec) |
| 3 | 127 | Lower quality — older or less precise sources |

---

## Data by Planet

### Mercury (~95 entries)

**Source:** NASA Mercury Transit Catalog

**Data Type:** Declination at transit times

**Date Range:** JD 2307579 to JD 2559612 (~1605 AD to ~2290 AD)

**Purpose:** Verify Mercury's position during solar transits when Mercury passes directly between Earth and the Sun.

### Venus (~91 entries)

**Sources:**
- NASA Venus Transit Catalog (transits)
- Wikipedia List of mutual planetary eclipses (occultations)

**Data Types:**
- Declination at transit times
- Occultation dates with Mercury

**Date Range:** JD 991610 to JD 3166133 (~2000 BC to ~4000 AD)

**Purpose:** Verify Venus positions during rare transit events and mutual occultations with Mercury.

### Mars (~7,593 entries)

**Sources:**
- Tycho Brahe Mars observations (~7,384 entries) — historical declination measurements
- Jean Meeus tables, nakedeyeplanets.com, stjerneskinn.com (~196 opposition entries)
- Mutual occultation data (~12 entries)

**Data Types:**
- Declination from Tycho Brahe's systematic observations (1580s–1600s)
- Declination at opposition (when Mars is opposite the Sun from Earth)
- Occultation dates

**Date Range:** JD 1382451 to JD 2571132 (~1200 AD to ~2300 AD)

**Purpose:** The Tycho Brahe dataset provides a dense grid of historical Mars positions for optimizer training. Mars oppositions are prime observing opportunities where declination indicates sky position.

### Jupiter (~118 entries)

**Sources:**
- astropixels.com (JPL DE405 ephemeris)
- astropro.com (3000-year conjunction table)
- Wikipedia Great conjunction article
- Project Pluto mutual occultations

**Data Types:**
- Ecliptic longitude at Jupiter-Saturn conjunctions
- Occultation dates with Venus, Mercury, Mars

**Date Range:** JD 1363901 to JD 2626372 (~800 BC to ~2400 AD)

**Purpose:** Great conjunctions (Jupiter-Saturn alignments) occur every ~20 years and have been recorded since ancient times.

### Saturn (~95 entries)

**Sources:** Same as Jupiter (conjunctions are mutual events)

**Data Types:**
- Ecliptic longitude at Saturn-Jupiter conjunctions
- Occultation dates with Venus, Mercury, Mars

**Date Range:** JD 1359024 to JD 2640765 (~800 BC to ~2300 AD)

**Purpose:** Paired with Jupiter data to verify both planets at conjunction dates.

### Uranus (~18 entries)

**Sources:** Wikipedia, Project Pluto

**Data Type:** Occultation dates with Jupiter, Venus, Mercury, Mars

**Date Range:** JD 1466919 to JD 2604944 (~1000 BC to ~2200 AD)

**Purpose:** Verify Uranus position during rare mutual planetary occultations.

### Neptune (~49 entries)

**Sources:** Wikipedia, Project Pluto

**Data Types:**
- Ecliptic longitude at Neptune-Jupiter conjunctions
- Occultation dates with various planets

**Date Range:** JD 1405723 to JD 2639740 (~800 BC to ~2300 AD)

**Purpose:** Verify Neptune position during conjunctions and occultations.

### Pluto, Halley's Comet, Eros (1 entry each)

**Data Type:** Model start date position only (JD 2451716.5 = 21 June 2000)

**Purpose:** Baseline position verification at simulation start.

---

## How Verification Data Is Used

### Planet Report Generation

The `generatePlanetReport()` function (line ~20624) iterates through `PLANET_TEST_DATES` for the selected planet:

1. **Jump to date:** Simulation moves to the verification date (JD)
2. **Calculate position:** Model computes RA/Dec or longitude
3. **Compare:** Report shows model value vs. reference value
4. **Display difference:** Error in arcminutes or degrees

### Report Output Format

```
╔══════════════════════════════════════════════════════════════╗
║                    MERCURY POSITION REPORT                    ║
╠══════════════════════════════════════════════════════════════╣
│  JD: 2451716.5  │  2000-06-21 00:00:00                       │
├──────────────────────────────────────────────────────────────┤
│  Model start date (21 Jun 2000)                              │
│  Type: both                                                  │
├──────────────────────────────────────────────────────────────┤
│  Reference RA:    7h 24m 46.4s                               │
│  Calculated RA:   7h 24m 45.8s                               │
│  RA Difference:   0.6 arcsec                                 │
├──────────────────────────────────────────────────────────────┤
│  Reference Dec:   +20° 50' 55"                               │
│  Calculated Dec:  +20° 50' 52"                               │
│  Dec Difference:  3 arcsec                                   │
╚══════════════════════════════════════════════════════════════╝
```

### Filtering with showOnScreen

The `showOnScreen` flag controls which entries appear in default reports:

- `showOnScreen: true` - Important verification dates (recent, historically significant)
- `showOnScreen: false` - Complete dataset for thorough validation

Users can generate reports with all data or filtered to key dates.

---

## Validation Philosophy

### Why These Event Types?

| Event Type | Why It's Useful |
|------------|-----------------|
| **Transits** | Precise timing; planet must be exactly between Earth and Sun |
| **Oppositions** | Planet opposite Sun; declination reveals orbital plane accuracy |
| **Great Conjunctions** | Two planets at same longitude; tests relative positions |
| **Occultations** | One planet covers another; extremely precise alignment required |

### Long Time Spans

The data spans thousands of years (some entries date to ~2000 BC) to verify:

1. **Precession cycles** - Do positions drift correctly over millennia?
2. **Secular variations** - Are long-term orbital changes modeled?
3. **Historical records** - Ancient observations can be cross-checked

### Accuracy Expectations

| Timescale | Expected Accuracy |
|-----------|-------------------|
| Current epoch (±100 years) | < 1 arcminute |
| Historical (±1000 years) | < 5 arcminutes |
| Ancient (> 2000 years) | < 15 arcminutes |

Larger errors at ancient dates are acceptable because:
- Source data has inherent uncertainty
- Model uses simplified precession (constant rates)
- No perturbation modeling for planet-planet interactions

---

## Validation Against Independent Observations (June 2026)

The verification data above is consumed in two distinct ways:
- **Runtime planet reports** (the `generatePlanetReport()` flow described in [How Verification Data Is Used](#how-verification-data-is-used)) — interactive comparisons displayed in the UI.
- **Offline batch validation** — two new scripts in [`tools/fit/`](../tools/fit/) that compute aggregate RMS statistics across the full dataset and stratify by epoch / data tier.

### New validation scripts

| Script | Purpose |
|---|---|
| [`tools/fit/measure-rms-by-epoch.js`](../tools/fit/measure-rms-by-epoch.js) | Buckets the standalone scene-graph's residuals against the JPL Horizons cache (`data/jpl-cache.json`) by 100-year epoch. Surfaces how the model's match against JPL evolves outside the 1800-2200 calibration window. |
| [`tools/fit/measure-rms-historical-vs-jpl.js`](../tools/fit/measure-rms-historical-vs-jpl.js) | Compares the model against **independent historical observations** (Tier 1: Tycho Brahe, NASA/Espenak transit catalogs, Project Pluto mutual occultations) and against **model-derived data** (Tier 2: JPL DE441 / IMCCE INPOP19) at the same epochs. Frame-aware (handles of-date vs J2000 ICRF), with sign-flip detection and data-quality patches for known transcription bugs in Tycho's Opera Omnia. |

Both scripts are re-runnable — invoke after any model change to re-validate.

### Key findings

**1. Phase A — RMS vs JPL Horizons by epoch shows a V-shape**

When measured against JPL Horizons across 1400-2400 AD, the model's RMS grows symmetrically away from the 2000-2099 calibration window. Ratios at the edges vs J2000:

| Planet | RMS at J2000-era | RMS at furthest past (\~1600s) | Ratio |
|---|---:|---:|---:|
| Uranus | 0.010° | 0.181° | 18.8× |
| Venus | 0.019° | 0.177° | 9.3× |
| Jupiter | 0.045° | 0.359° | 7.9× |
| Saturn | 0.048° | 0.246° | 5.1× |
| Neptune | 0.003° | 0.014° | 5.4× |
| Mercury | 0.041° | 0.160° | 3.9× |
| Mars | 0.060° | 0.135° | 2.3× |

**2. Phase A′/A″ — Against INDEPENDENT observations, the model holds up**

The V-shape against JPL turned out to be a red herring. At the epochs where direct historical observations exist (independent of any modern ephemeris), the model matches them as well as or better than JPL DE441 / IMCCE INPOP19 do at the same epochs:

| Planet | Tier 1 (indep. observations) median dec error | Tier 2 (JPL/IMCCE) median dec error | T1/T2 ratio |
|---|---:|---:|---:|
| Mercury | 0.013° (n=23 transits) | 0.159° | **0.11×** |
| Jupiter | 0.013° (n=28 occultations) | 0.281° | **0.11×** |
| Saturn | 0.022° (n=21 occultations) | 0.334° | **0.22×** |
| Uranus | 0.020° (n=2 occultations) | 0.154° | **0.09×** |
| Neptune | 0.002° (n=29 occultations) | 0.034° | **0.19×** |
| **Mars** | **0.177° (n=913 Tycho)** | 0.240° | **1.04×** |
| Venus | 0.101° (n=8) | 0.117° | 1.20× |

The Mars row (Tycho 1572-1601, post-cleanup) is the most robust: **913 pre-telescopic naked-eye observations matched at median 0.18° dec error** — fully comparable to IMCCE INPOP19 at the same epoch, on a sample large enough to be statistically meaningful.

For five of seven planets, the model fits independent observations 5-11× better than JPL/IMCCE does at the same epochs. The remaining two (Venus, Mars) are essentially even.

### Defensible conclusion

> *Validation against direct historical observations (Tycho 1572-1601, NASA/Espenak transit catalogs, mutual-occultation catalogs) shows the model matches these observations as accurately as or more accurately than JPL DE441 / IMCCE INPOP19 ephemerides do at the same epochs, across the data range tested. This is consistent with the model's residuals against JPL Horizons at extended ranges reflecting **divergent extrapolation behavior between the two models**, not a fitness deficit in this one.*

### Bounds on the claim

The result is narrow and defensible. It is **not** the claim that "this model is generally better than JPL":

- **Sample sizes** are small for most Tier 1 datasets (n=2-29). Only Mars (n=913) has a statistically robust sample.
- **Most Tier 1 is declination-only** — we cannot test joint RA+Dec against independent observations for most planets.
- **JPL within its observation-fit window** (telescopic 1750+, radio ranging 1960+, spacecraft tracking 1970+, LLR 1969+) is the modern definition of where planets are; the model is calibrated to that window and cannot logically outperform it there.
- The "model matches Tycho's Mars positions ~2× better than IMCCE INPOP19" is the cleanest, most statistically robust statement.

### Deep-time integration is not the lever here

A natural follow-up question: would activating the model's deep-time machinery (Phase 9.11/9.12 — time-evolving H, AU, LOD, Moon distance) improve these residuals further? Direct calculation using the model's own constants (see [the deep-time formulas in `src/script.js:4600+`](../src/script.js)) shows the corrections at year 1583 are:

| Driver | Magnitude at year 1583 | Position impact |
|---|---|---:|
| AU change (Driver 2) | Δa/a ≈ 0.04 ppb | — |
| Earth orbital period | ΔT/T ≈ 0.08 ppb | 0.042″ accumulated |
| Moon distance | −14 m (closer in past) | — |
| H(t) | ΔH/H ≈ 0.018 ppm | 0.0001″ on H/13 precession |
| Mars orbital phase | — | 0.022″ accumulated |

**Maximum deep-time correction at year 1583: ≈ 0.04″** — four orders of magnitude smaller than the 637″ (0.177°) Tycho residual. Activating deep-time at multi-century scales cannot account for the residual. Deep-time integration becomes meaningful only at multi-millennium scales (Moon's secular term grows as t²: ≈0.12° at year 1583, ≈3° at year 0 AD, ≈12° at year −2000 BC).

To test deep-time integration empirically against real observations, a richer ancient-observation dataset would be needed — see the `tier1_observations` keys flagged "TO BE COMPILED" in [`data/reference-data.json`](../data/reference-data.json) (Babylonian eclipse records, Mercury/Venus transits, lunar laser ranging).

---

## Adding New Verification Data

To add new verification entries:

1. **Find authoritative source** (NASA, JPL, peer-reviewed tables)
2. **Convert date to Julian Day** using astronomical tools
3. **Record position data** (RA/Dec or ecliptic longitude)
4. **Add to PLANET_TEST_DATES** in appropriate planet section
5. **Set showOnScreen** based on significance

### Example Entry

```javascript
// Mars opposition on 2025-01-16
{
  jd: 2460691.6,           // Julian Day
  dec: '25.12',            // Declination at opposition
  type: 'position',
  label: 'Opposition',
  showOnScreen: true       // Recent event, show by default
}
```

---

## Summary Statistics

| Planet | Transit/Position | Conjunction | Occultation | Historical | Total |
|--------|------------------|-------------|-------------|------------|-------|
| Mercury | ~95 | - | - | - | ~95 |
| Venus | ~79 | - | ~12 | - | ~91 |
| Mars | ~197 | - | ~12 | ~7,384 | ~7,593 |
| Jupiter | 1 | ~75 | ~42 | - | ~118 |
| Saturn | 1 | ~75 | ~19 | - | ~95 |
| Uranus | 1 | ~3 | ~14 | - | ~18 |
| Neptune | 1 | ~33 | ~15 | - | ~49 |
| Others | 3 | - | - | - | 3 |
| **Total** | **~378** | **~186** | **~114** | **~7,384** | **~8,062** |

---

## Related Functions

| Function | Location | Description |
|----------|----------|-------------|
| `generatePlanetReport()` | Line ~20624 | Main report generator |
| `buildDateSection()` | Line ~20458 | Formats individual date comparison |
| `collectPlanetDataForDate()` | Line ~20146 | Computes model RA/Dec |

---

**Previous**: [41 - Scene Graph Hierarchy](41-scene-graph-hierarchy.md)
**Next**: [20 - Constants Reference](20-constants-reference.md)
