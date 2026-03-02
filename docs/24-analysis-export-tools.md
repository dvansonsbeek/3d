# Analysis and Export Tools Reference

This document describes all data export, report generation, and validation systems in the Holistic Universe Model simulation.

**Last Updated:** March 2026

**Related Documents:**
- [21 - Planet Inspector Reference](21-planet-inspector-reference.md) - Planet inspector panel and where planet reports are displayed
- [22 - UI Panels Reference](22-ui-panels-reference.md) - Panel system overview
- [11 - Orbital Formulas Reference](11-orbital-formulas-reference.md) - Calculations used in exports

---

## Overview

The simulation provides four export / validation systems:

| System | Purpose | Output Format | Location |
|--------|---------|---------------|----------|
| **Planet Positions & Orbits** | All planets over a date range | Excel (.xlsx) or TSV | Reports menu |
| **Solstices & Equinoxes** | Annual solstice/equinox data | Excel (.xlsx) | Reports menu |
| **Year Length Analysis** | Tropical, anomalistic, sidereal year lengths | Excel (.xlsx) | Reports menu |
| **Planet Position Reports** | Detailed validation for individual planets | Excel (.xlsx) or Clipboard | Hierarchy Inspector |

Console validation tests are under **Tools > Console Tests (F12)**.

All Excel exports use the [SheetJS library](https://sheetjs.com/) loaded on-demand from CDN.

---

## Location in UI

```
Reports (observed category)
├── Planet Positions & Orbits
├── Solstices & Equinoxes
└── Year Length Analysis

Tools
├── Planet Inspector          [opens Hierarchy Inspector]
├── Invariable Plane Inspector
└── Console Tests (F12)
```

---

## Part 1: Planet Positions & Orbits

### Purpose

Exports comprehensive planetary position and orbital element data for all objects over a configurable date range.

### Location

`Reports > Planet Positions & Orbits`

### Controls

| Control | Description |
|---------|-------------|
| **Mode** | `Range` or `List` — determines how dates are specified |
| **JD list (CSV)** | Comma-separated Julian Day numbers (List mode only) |
| **Start JD** | First Julian Day in range (Range mode only) |
| **End JD** | Last Julian Day in range (Range mode only) |
| **# points** | Number of evenly-spaced sample points (Range mode only) |
| **Create file (be patient)** | Button to trigger export |

### Output Files

**For small datasets (< 5000 rows):**
- Single file: `Holistic_objects_results.xlsx`
- Contains 3 sheets

**For large datasets (>= 5000 rows):**
- Three TSV files:
  - `Holistic_objects_EarthLongitude.tsv`
  - `Holistic_objects_PerihelionPlanets.tsv`
  - `Holistic_objects_SunPlanets.tsv`

#### Sheet 1: Earth Longitude

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

#### Sheet 2: Perihelion Planets

Orbital elements for all planets (Mercury through Neptune).

| Column | Description |
|--------|-------------|
| JD | Julian Day number |
| Date | Formatted date |
| Time | Formatted time |
| Year | Calendar year |
| {Planet} Perihelion | Longitude of perihelion (deg) |
| {Planet} Ascending Node | Ascending node on ecliptic (deg) |
| {Planet} Arg Periapsis | Argument of periapsis (deg) |
| {Planet} Ecliptic Inclination | Inclination to ecliptic (deg) |
| {Planet} Asc Node InvPlane | Ascending node on invariable plane, ICRF (deg) |
| {Planet} Asc Node InvPlane Max Incl | Node at maximum inclination, ICRF (deg) |
| {Planet} Inclination Phase Angle | Phase angle for inclination oscillation (deg) |
| {Planet} InvPlane Inclination | Dynamic inclination to invariable plane (deg) |

#### Sheet 3: Sun & Planets

Position data for Sun and all planets.

| Column | Description |
|--------|-------------|
| JD | Julian Day number |
| Date | Formatted date |
| Time | Formatted time |
| Year | Calendar year |
| Sun RA | Sun's Right Ascension (deg) |
| Sun Dec | Sun's Declination (deg) |
| Sun Distance Earth | Earth-Sun distance (AU) |
| {Planet} RA | Planet Right Ascension (deg) |
| {Planet} Dec | Planet Declination (deg) |
| {Planet} Distance Earth | Earth-Planet distance (AU) |
| {Planet} Distance Sun | Sun-Planet distance (AU) |

#### TSV Format Notes

- Uses system locale decimal separator (comma or period)
- Tab-separated values for easy import
- Compatible with Excel, LibreOffice, Google Sheets

### Functions

| Function | Line | Description |
|----------|------|-------------|
| `runRATest()` | ~19744 | Main export function |
| `buildJdArray()` | ~19661 | Build Julian Day array from config |
| `forceSceneUpdate()` | ~19706 | Force calculation update |

---

## Part 2: Solstices & Equinoxes

### Purpose

Exports solstice and equinox timing data with RA and obliquity for a range of years to an Excel file.

### Location

`Reports > Solstices & Equinoxes`

### Controls

| Control | Description |
|---------|-------------|
| **Mode** | `Range` or `List` — determines how years are specified |
| **Year list (CSV)** | Comma-separated list of specific years (List mode only) |
| **Start year** | First year in range (Range mode only) |
| **End year** | Last year in range (Range mode only) |
| **Create file (be patient)** | Button to trigger export |

### Output

Excel file (`Holistic_solstice_results.xlsx`) with columns:

| Column | Description |
|--------|-------------|
| Date | Solstice date |
| Time | Solstice time (UTC) |
| Year | Calendar year |
| JD | Julian Day number |
| RA | Sun's Right Ascension (deg) |
| Obliquity | Earth's axial tilt (deg) |

### Technical Implementation

**Source**: `script.js` line ~14435

**Function**: `runSolsticeExport(years)`

---

## Part 3: Year Length Analysis

### Purpose

Generates a comprehensive Excel file containing year-by-year astronomical measurements including tropical year lengths, anomalistic year data, sidereal year calculations, and orbital parameters.

### Location

`Reports > Year Length Analysis`

### Controls

| Control | Description |
|---------|-------------|
| **Mode** | `Range` or `List` — determines how years are specified |
| **Year list (CSV)** | Comma-separated list of specific years (List mode only) |
| **Start year** | First year in range (Range mode only) |
| **End year** | Last year in range (Range mode only) |
| **Create file (be patient)** | Button to trigger report generation |

### Output

Downloads an Excel file (`Holistic_year_analysis_YYYY_YYYY.xlsx`) containing 5 sheets:

#### Sheet 1: Summary

- **Orbital Parameters**: Obliquity and eccentricity at mid-point year
- **Tropical Year by Cardinal Point**: Measured vs IAU J2000 reference for all 4 cardinal points (VE, SS, AE, WS)
- **Mean Tropical Year**: Average of 4 cardinal points with IAU comparison
- **Anomalistic Year**: Perihelion-to-perihelion and aphelion-to-aphelion intervals
- **Sidereal Year**: Measured sidereal year with IAU comparison
- **Measurement Offset Corrections**: Solar day offset and wobble parallax values
- **Precession Calculation**: Derived precession period from sidereal/tropical difference

#### Sheet 2: Cardinal Points

Year-by-year Julian Day and interval data for each cardinal point:
- Vernal Equinox (RA=0 deg)
- Summer Solstice (RA=90 deg)
- Autumnal Equinox (RA=180 deg)
- Winter Solstice (RA=270 deg)

#### Sheet 3: Anomalistic

Year-by-year perihelion and aphelion data:
- Julian Day of event
- Earth-Sun distance at event (AU)
- Interval from previous year

#### Sheet 4: Sidereal

Year-by-year sidereal crossing data:
- Julian Day when Sun returns to same position relative to stars
- Interval from previous year

#### Sheet 5: Detailed

Combined view of all measurements per year:
- Obliquity and eccentricity
- Mean tropical year (average of 4 cardinals)
- All 4 cardinal intervals
- Perihelion and aphelion intervals
- Sidereal interval

### Technical Implementation

**Source**: `script.js` line ~14499

**Function**: `runYearAnalysisExport(years)`

**Algorithm**:
1. Collects all measurements in a single pass through the year range
2. For each year, finds:
   - All 4 cardinal point crossings using `sunRACrossingForYear()`
   - Perihelion using `perihelionForYearMethodB()`
   - Aphelion using `aphelionForYearMethodB()`
   - Sidereal crossing using world angle tracking
3. Calculates intervals between consecutive years
4. Generates Excel workbook using SheetJS library

### Use Cases

- Validating model accuracy against IAU reference values
- Analyzing year length variations over time
- Studying the relationship between tropical and sidereal years
- Verifying precession calculations

---

## Part 4: Planet Position Reports

Planet position reports provide detailed validation data comparing calculated positions against NASA, JPL, and other reference sources. Reports are generated from the **Hierarchy Inspector** panel.

### Accessing Reports

1. Open the **Hierarchy Inspector** (`Tools > Planet Inspector`)
2. Navigate to **Step 5** (planet validation)
3. Click on a planet name to generate its report
4. Use **Download Excel** or **Copy to Clipboard** buttons

### Report Contents

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
| Long Perihelion Calc | Calculated longitude of perihelion (deg) |
| Long Perihelion Ref | Reference longitude of perihelion (deg) |
| Long Perihelion Diff | Difference (deg) |
| Asc Node Calc | Calculated ascending node (deg) |
| Asc Node Ref | Reference ascending node (deg) |
| Asc Node Diff | Difference (deg) |
| Arg Periapsis Calc | Calculated argument of periapsis (deg) |

### Accuracy Color Coding

The on-screen report uses color coding to indicate accuracy:

| Color | RA Difference | Meaning |
|-------|---------------|---------|
| Green | <= 5 minutes | Excellent accuracy |
| Amber | 5-15 minutes | Acceptable accuracy |
| Red | > 15 minutes | Needs investigation |

### Event Types

Reports include various astronomical events:

| Event Type | Description | Comparison Method |
|------------|-------------|-------------------|
| NASA date | Transit/inferior conjunction | Planet RA vs Sun RA |
| Opposition | Planet opposite to Sun | Planet RA vs Sun RA + 12h |
| Occultation | Close conjunction | Both planets vs reference longitude |
| JPL reference | JPL Horizons validation | Direct RA/Dec comparison |

### Functions

| Function | Line | Description |
|----------|------|-------------|
| `generatePlanetReport(planetKey, showAll)` | ~20624 | Main report generator |
| `exportPlanetReportToExcel(planetKey, excelData)` | ~20688 | Excel export |
| `copyReportToClipboard(reportText)` | ~20768 | Clipboard copy |
| `collectPlanetDataForDate(planetKey, testDate)` | ~20146 | Data collection helper |
| `buildReportHeader(planetKey)` | ~20252 | Screen header builder |
| `buildDateSection(planetKey, testDate, data)` | ~20458 | Screen section builder |
| `generateAndDisplayReport(planetKey)` | ~20792 | UI integration |

### Global State

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

## Part 5: Console Tests (F12)

### Purpose

Runs detailed astronomical validation tests with output to the browser's Developer Console (F12).

### Location

`Tools > Console Tests (F12)`

### Configuration

| Control | Description |
|---------|-------------|
| **Start year** | First year in analysis range |
| **End year** | Last year in analysis range |

### Available Tests

#### Year Length Analysis

| Test | Description |
|------|-------------|
| **Analyze Year at June Solstice** | Measures tropical year length at summer solstice |
| **Analyze Year at December Solstice** | Measures tropical year length at winter solstice |
| **Analyze Year Length by Cardinal** | Comprehensive analysis of all 4 cardinal points |
| **Analyze Anomalistic Year** | Measures perihelion-to-perihelion interval |
| **Analyze Sidereal Year** | Measures Sun's return to same stellar position |
| **Analyze All Alignments** | Combined analysis of all year types |

#### Day Length Analysis

| Test | Description |
|------|-------------|
| **Analyze Sidereal Day** | Measures Earth's rotation relative to stars |
| **Analyze Solar Day** | Measures Earth's rotation relative to Sun |
| **Analyze Stellar Day** | Measures Earth's rotation relative to distant stars |

### Output Format

Results are printed to the browser console with:
- Measured values
- IAU/reference values for comparison
- Difference in seconds
- Pass/fail status based on tolerance

### Example Console Output

```
TROPICAL YEAR ANALYSIS (VERNAL EQUINOX)
Year range: 2000 to 2025

Year    VE Julian Day    Interval (days)    IAU Ref (days)    Diff (seconds)
2001    2451991.234567   365.242374         365.242374        +0.12
2002    2452356.477891   365.243324         365.242374        +82.15
...

SUMMARY:
  Mean tropical year: 365.242374 days
  IAU J2000 reference: 365.242374 days
  Difference: +0.05 seconds
  Status: PASS (within +/-1 second tolerance)
```

---

## Key Functions Reference

### sunRACrossingForYear(year, targetRA, prevJD)

Finds the Julian Day when the Sun crosses a specific Right Ascension value.

**Location**: line ~13644

**Parameters**:
- `year` - Calendar year
- `targetRA` - Target RA in degrees (0=VE, 90=SS, 180=AE, 270=WS)
- `prevJD` - Optional previous crossing JD for optimization

**Returns**: Object with `jd` property containing the crossing Julian Day

### perihelionForYearMethodB(year, verbose, prevJD)

Finds the perihelion (closest approach to Sun) for a given year.

**Location**: line ~14109

**Parameters**:
- `year` - Calendar year
- `verbose` - Boolean for console logging
- `prevJD` - Optional previous perihelion JD for optimization

**Returns**: Object with `jd` and `distance` properties

### aphelionForYearMethodB(year, verbose, prevJD)

Finds the aphelion (farthest point from Sun) for a given year.

**Location**: line ~14209

**Parameters**:
- `year` - Calendar year
- `verbose` - Boolean for console logging
- `prevJD` - Optional previous aphelion JD for optimization

**Returns**: Object with `jd` and `distance` properties

### apparentRaFromPdA(pdA, pdB)

Calculates the apparent Right Ascension angle between two planet data objects in Earth's equatorial frame.

**Location**: line ~26429

**Parameters**:
- `pdA` - First planet data object
- `pdB` - Second planet data object

**Returns**: Angle in radians

**Usage**: Used for perihelion longitude calculations. See [13-perihelion-precession.md](13-perihelion-precession.md) for details.

---

## Utility Functions

### Library Loading

| Function | Line | Description |
|----------|------|-------------|
| `ensureSheetJs()` | ~19727 | Load SheetJS from CDN on-demand |
| `workbookToBlob(wb)` | ~19738 | Convert workbook to downloadable blob |

### Coordinate Conversion

| Function | Line | Description |
|----------|------|-------------|
| `raToHMSFromRadians(rad)` | ~20052 | Radians to HMS format |
| `raDecimalHoursToHMS(decimalHours)` | ~20065 | Decimal hours to HMS |
| `decDecimalDegreesToDMS(decimalDegrees)` | ~20078 | Decimal degrees to DMS |
| `longitudeToRAHMS(longitudeDeg, obliquityDeg)` | ~20388 | Ecliptic longitude to RA |

**Longitude to RA Formula:**
```
RA = atan2(sin(l) * cos(e), cos(l))
```
Where l = ecliptic longitude, e = obliquity

### Validation Functions

| Function | Line | Description |
|----------|------|-------------|
| `compareRAToSun(planetRARad, sunRARad)` | ~20283 | NASA transit validation |
| `compareRAOpposition(planetRARad, sunRARad)` | ~20306 | Opposition alignment check |
| `compareRAToReference(planetRARad, refRA)` | ~20334 | Reference data comparison |
| `compareRAToLongitude(planetRARad, longitudeDeg, obliquityDeg)` | ~20419 | Occultation validation |
| `compareDecValues(calculatedDecRad, refDecStr)` | ~20261 | Declination within 1 deg |

---

## IAU Reference Values

The analysis tools compare against these IAU J2000 reference values:

| Measurement | IAU J2000 Value |
|-------------|-----------------|
| Tropical Year (VE) | 365.242374 days |
| Tropical Year (SS) | 365.241626 days |
| Tropical Year (AE) | 365.242018 days |
| Tropical Year (WS) | 365.242740 days |
| Tropical Year (Mean) | 365.242189 days |
| Anomalistic Year | 365.259636 days |
| Sidereal Year | 365.256363 days |
| IAU Precession Period | 25,771.57 years |

---

## Data Sources

Reports compare against these reference sources:

| Source | URL | Data Type |
|--------|-----|-----------|
| NASA GSFC | gsfc.nasa.gov | Transit dates, positions |
| JPL Horizons | ssd.jpl.nasa.gov | Orbital elements, ephemerides |
| Wikipedia | wikipedia.org | Opposition dates, conjunctions |
| IAU | iau.org | Standard values |

---

## Technical Notes

### Performance

- Report generation pauses the simulation (`o.Run = false`)
- Jumps to each test date sequentially
- Uses `requestAnimationFrame` yielding every 25 rows
- Restores previous state after completion
- Year Analysis can take several minutes for large year ranges; the console shows progress

### Memory Management

- Large datasets (>= 5000 rows) use TSV to avoid memory issues
- Excel files are generated in-memory before download
- SheetJS library loaded only when needed

### Browser Compatibility

- Uses `navigator.clipboard.writeText()` for clipboard
- Uses `URL.createObjectURL()` for downloads
- Requires modern browser with Blob support

---

## Tips

1. **List Mode**: Use comma-separated years for non-consecutive analysis (e.g., "2000, 2025, 2050, 2100").

2. **Console Tests**: Open Developer Tools (F12) before running to see detailed output.

3. **Validation**: Compare model output against IAU references to verify accuracy.

4. **Export Formats**: All exports use Excel format (.xlsx) via the SheetJS library. Large bulk exports fall back to TSV.

---

**Previous**: [22 - UI Panels Reference](22-ui-panels-reference.md)
**Next**: [26 - Fibonacci Laws](26-fibonacci-laws.md)
