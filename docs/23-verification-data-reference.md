# Verification Data Reference

This document describes the astronomical verification data embedded in the simulation for validating planetary positions against known historical events.

**Last Updated:** March 2026

**Related Documents:**
- [52 - Analysis & Export Tools](52-analysis-export-tools.md) - Planet report generation and data export
- [51 - Planet Inspector Reference](51-planet-inspector-reference.md) - Where reports are displayed
- [20 - Constants Reference](20-constants-reference.md) - Orbital constants and sources

---

## Overview

The simulation includes over 8,000 verification data points from authoritative astronomical sources. These allow users to compare the model's calculated positions against historically observed events such as planetary transits, oppositions, conjunctions, mutual occultations, and historical observations (notably Tycho Brahe's Mars observations).

**Location:** `script.js` line ~7591 (`PLANET_TEST_DATES`)

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
