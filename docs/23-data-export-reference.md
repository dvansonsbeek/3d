# Data Export Reference

This document describes the data export and report generation systems in the Holistic Universe Model simulation.

**Last Updated:** January 2026

**Related Documents:**
- [21 - Planet Inspector Reference](21-planet-inspector-reference.md) - Where planet reports are displayed
- [22 - UI Panels Reference](22-ui-panels-reference.md) - Panel system overview
- [11 - Orbital Formulas Reference](11-orbital-formulas-reference.md) - Calculations used in exports

---

## Overview

The simulation provides three export systems:

| System | Purpose | Output Format |
|--------|---------|---------------|
| **Planet Position Reports** | Detailed validation data for individual planets | Excel (.xlsx) or Clipboard |
| **Bulk Objects Export** | All planets over date range | Excel or TSV |
| **Solstice Export** | Annual solstice data | Excel (.xlsx) |

All exports use the [SheetJS library](https://sheetjs.com/) loaded on-demand from CDN.

---

## Part 1: Planet Position Reports

### 1.1 Overview

Planet position reports provide detailed validation data comparing calculated positions against NASA, JPL, and other reference sources. Reports are generated from the Hierarchy Inspector panel (Step 5).

**Location:** `script.js` lines 11546-12200

### 1.2 Accessing Reports

1. Open the **Hierarchy Inspector** panel (⚙️ button or keyboard shortcut)
2. Navigate to **Step 5** (planet validation)
3. Click on a planet name to generate its report
4. Use **Download Excel** or **Copy to Clipboard** buttons

### 1.3 Report Contents

Each report contains two data sheets plus documentation:

#### Sheet 1: Documentation

| Field | Description |
|-------|-------------|
| Report Title | Planet name and "Position Report" |
| Generation Date | When the report was created |
| Model Start Date | Simulation reference date |
| Data Sources | NASA GSFC, JPL Horizons, Wikipedia, etc. |
| Column Descriptions | Explanation of each data column |
| Calculation Methods | Longitude to RA conversion formula |
| Color Legend | Green/Amber/Red accuracy thresholds |

#### Sheet 2: Position Data

| Column | Description |
|--------|-------------|
| JD | Julian Day number |
| Date | Formatted date (UTC) |
| Time | Formatted time (UTC) |
| Label | Event type (NASA date, Opposition, Occultation, etc.) |
| Planet RA | Calculated Right Ascension |
| Planet Dec | Calculated Declination |
| Reference RA | Source data RA (if provided) |
| Reference Dec | Source data Declination (if provided) |
| Reference Longitude | Ecliptic longitude (for conjunctions) |
| Compare Planet | Companion planet (for occultations) |
| Companion RA | Companion planet Right Ascension |
| Companion Dec | Companion planet Declination |
| Planet Distance Earth | Distance from Earth (AU) |
| Planet Distance Sun | Distance from Sun (AU) |
| Sun RA | Sun's Right Ascension |
| Sun Dec | Sun's Declination |
| Sun Distance Earth | Earth-Sun distance (AU) |

#### Sheet 3: Longitude Data

| Column | Description |
|--------|-------------|
| JD | Julian Day number |
| Date | Formatted date (UTC) |
| Time | Formatted time (UTC) |
| Label | Event type |
| Long Perihelion Calc | Calculated longitude of perihelion (°) |
| Long Perihelion Ref | Reference longitude of perihelion (°) |
| Long Perihelion Diff | Difference (°) |
| Asc Node Calc | Calculated ascending node (°) |
| Asc Node Ref | Reference ascending node (°) |
| Asc Node Diff | Difference (°) |
| Arg Periapsis Calc | Calculated argument of periapsis (°) |

### 1.4 Accuracy Color Coding

The screen report uses color coding to indicate accuracy:

| Color | RA Difference | Meaning |
|-------|---------------|---------|
| Green | ≤ 5 minutes | Excellent accuracy |
| Amber | 5-15 minutes | Acceptable accuracy |
| Red | > 15 minutes | Needs investigation |

### 1.5 Event Types

Reports include various astronomical events:

| Event Type | Description | Comparison Method |
|------------|-------------|-------------------|
| NASA date | Transit/inferior conjunction | Planet RA vs Sun RA |
| Opposition | Planet opposite to Sun | Planet RA vs Sun RA + 12h |
| Occultation | Close conjunction | Both planets vs reference longitude |
| JPL reference | JPL Horizons validation | Direct RA/Dec comparison |

### 1.6 Functions

| Function | Line | Description |
|----------|------|-------------|
| `generatePlanetReport(planetKey, showAll)` | 12024 | Main report generator |
| `exportPlanetReportToExcel(planetKey, excelData)` | 12088 | Excel export |
| `copyReportToClipboard(reportText)` | 12168 | Clipboard copy |
| `collectPlanetDataForDate(planetKey, testDate)` | 11546 | Data collection helper |
| `buildReportHeader(planetKey)` | 11652 | Screen header builder |
| `buildDateSection(planetKey, testDate, data)` | 11858 | Screen section builder |
| `generateAndDisplayReport(planetKey)` | 12192 | UI integration |

---

## Part 2: Bulk Objects Export

### 2.1 Overview

The bulk export system generates comprehensive planetary position and orbital element data for all objects over a configurable date range.

**Location:** `script.js` lines 11078-11450
**Trigger:** `runRATestToggle` checkbox in UI

### 2.2 Output Files

**For small datasets (< 5000 rows):**
- Single file: `Holistic_objects_results.xlsx`
- Contains 3 sheets

**For large datasets (≥ 5000 rows):**
- Three TSV files:
  - `Holistic_objects_EarthLongitude.tsv`
  - `Holistic_objects_PerihelionPlanets.tsv`
  - `Holistic_objects_SunPlanets.tsv`

### 2.3 Sheet 1: Earth Longitude

Earth-specific position data from different reference frames.

| Column | Description |
|--------|-------------|
| JD | Julian Day number |
| Date | Formatted date |
| Time | Formatted time |
| Year | Calendar year |
| Earth Wobble RA | RA from wobble center frame |
| Earth Wobble Dec | Dec from wobble center frame |
| Earth Wobble Dist Earth | Distance (always 0) |
| Earth Wobble Dist Sun | Sun distance (AU) |
| Earth Longitude RA | RA from longitude frame |
| Earth Longitude Dec | Dec from longitude frame |
| Earth Longitude Dist Earth | Distance (AU) |
| Earth Longitude Dist Sun | Sun distance (AU) |
| Mid-eccentricity Orbit RA | RA from mean eccentricity frame |
| Mid-eccentricity Orbit Dec | Dec from mean eccentricity frame |
| Mid-eccentricity Orbit Dist Earth | Distance (AU) |
| Mid-eccentricity Orbit Dist Sun | Sun distance (AU) |

### 2.4 Sheet 2: Perihelion Planets

Orbital elements for all planets (Mercury through Neptune).

| Column | Description |
|--------|-------------|
| JD | Julian Day number |
| Date | Formatted date |
| Time | Formatted time |
| Year | Calendar year |
| {Planet} Perihelion | Longitude of perihelion (°) |
| {Planet} Ascending Node | Ascending node on ecliptic (°) |
| {Planet} Arg Periapsis | Argument of periapsis (°) |
| {Planet} Ecliptic Inclination | Inclination to ecliptic (°) |
| {Planet} Asc Node InvPlane | Ascending node on invariable plane, ICRF (°) |
| {Planet} Asc Node InvPlane Max Incl | Node at maximum inclination, ICRF (°) |
| {Planet} Inclination Phase Angle | Phase angle for inclination oscillation (°) |
| {Planet} InvPlane Inclination | Dynamic inclination to invariable plane (°) |

### 2.5 Sheet 3: Sun & Planets

Position data for Sun and all planets.

| Column | Description |
|--------|-------------|
| JD | Julian Day number |
| Date | Formatted date |
| Time | Formatted time |
| Year | Calendar year |
| Sun RA | Sun's Right Ascension (°) |
| Sun Dec | Sun's Declination (°) |
| Sun Distance Earth | Earth-Sun distance (AU) |
| {Planet} RA | Planet Right Ascension (°) |
| {Planet} Dec | Planet Declination (°) |
| {Planet} Distance Earth | Earth-Planet distance (AU) |
| {Planet} Distance Sun | Sun-Planet distance (AU) |

### 2.6 TSV Format Notes

- Uses system locale decimal separator (comma or period)
- Tab-separated values for easy import
- Compatible with Excel, LibreOffice, Google Sheets

### 2.7 Functions

| Function | Line | Description |
|----------|------|-------------|
| `runRATest()` | 11160 | Main export function |
| `buildJdArray()` | 11078 | Build Julian Day array from config |
| `forceSceneUpdate()` | 11122 | Force calculation update |

---

## Part 3: Solstice Export

### 3.1 Overview

Exports solstice position data for a range of years.

**Location:** `script.js` line 10983
**Output:** `Holistic_solstice_results.xlsx`

### 3.2 Exported Data

| Column | Description |
|--------|-------------|
| Date | Solstice date |
| Time | Solstice time (UTC) |
| Year | Calendar year |
| JD | Julian Day number |
| RA | Sun's Right Ascension (°) |
| Obliquity | Earth's axial tilt (°) |

---

## Part 4: Utility Functions

### 4.1 Library Loading

| Function | Line | Description |
|----------|------|-------------|
| `ensureSheetJs()` | 11143 | Load SheetJS from CDN on-demand |
| `workbookToBlob(wb)` | 11154 | Convert workbook to downloadable blob |

### 4.2 Coordinate Conversion

| Function | Line | Description |
|----------|------|-------------|
| `raToHMSFromRadians(rad)` | 11452 | Radians to HMS format |
| `raDecimalHoursToHMS(decimalHours)` | 11465 | Decimal hours to HMS |
| `decDecimalDegreesToDMS(decimalDegrees)` | 11478 | Decimal degrees to DMS |
| `longitudeToRAHMS(longitudeDeg, obliquityDeg)` | 11788 | Ecliptic longitude to RA |

**Longitude to RA Formula:**
```
RA = atan2(sin(λ) × cos(ε), cos(λ))
```
Where λ = ecliptic longitude, ε = obliquity

### 4.3 Validation Functions

| Function | Description |
|----------|-------------|
| `compareRAToSun(planetRARad, sunRARad)` | NASA transit validation |
| `compareRAOpposition(planetRARad, sunRARad)` | Opposition alignment check |
| `compareRAToReference(planetRARad, refRA)` | Reference data comparison |
| `compareRAToLongitude(planetRARad, longitudeDeg, obliquityDeg)` | Occultation validation |
| `compareDecValues(calculatedDecRad, refDecStr)` | Declination within 1° |

---

## Part 5: Technical Notes

### 5.1 Performance Considerations

- Report generation freezes simulation (`o.Run = false`)
- Jumps to each test date sequentially
- Uses `requestAnimationFrame` yielding every 25 rows
- Restores previous state after completion

### 5.2 Memory Management

- Large datasets (≥ 5000 rows) use TSV to avoid memory issues
- Excel files are generated in-memory before download
- SheetJS library loaded only when needed

### 5.3 Browser Compatibility

- Uses `navigator.clipboard.writeText()` for clipboard
- Uses `URL.createObjectURL()` for downloads
- Requires modern browser with Blob support

### 5.4 Global State

```javascript
_currentReportData = {
  planetKey: string,        // Planet identifier
  screenReport: string,     // HTML-formatted report
  excelData: {
    positionRows: array,    // Position data rows
    longitudeRows: array    // Longitude data rows
  }
}
```

---

## Part 6: Data Sources

Reports compare against these reference sources:

| Source | URL | Data Type |
|--------|-----|-----------|
| NASA GSFC | gsfc.nasa.gov | Transit dates, positions |
| JPL Horizons | ssd.jpl.nasa.gov | Orbital elements, ephemerides |
| Wikipedia | wikipedia.org | Opposition dates, conjunctions |
| IAU | iau.org | Standard values |

---

**Previous**: [22 - UI Panels Reference](22-ui-panels-reference.md)
**Next**: (End of documentation)
