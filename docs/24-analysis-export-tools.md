# Analysis and Export Tools Reference

## Overview

The Holistic Model includes several powerful analysis and export tools accessible via the Settings panel (gear icon). These tools allow users to generate detailed reports, validate astronomical calculations, and export data for external analysis.

---

## Location in UI

All analysis tools are found in the **Settings panel** under the following folders:

```
Settings (gear icon)
├── Create Object File
├── Create Solstice File
├── Create Year Analysis Report
└── Console Tests (F12)
```

---

## Create Year Analysis Report

### Purpose

Generates a comprehensive Excel file containing year-by-year astronomical measurements including tropical year lengths, anomalistic year data, sidereal year calculations, and orbital parameters.

### Location

`Settings > Create Year Analysis Report`

### Controls

| Control | Description |
|---------|-------------|
| **Mode** | `Range` or `List` - determines how years are specified |
| **Year list (CSV)** | Comma-separated list of specific years (List mode only) |
| **Start year** | First year in range (Range mode only) |
| **End year** | Last year in range (Range mode only) |
| **Create file** | Checkbox to trigger report generation |

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
- Vernal Equinox (RA=0°)
- Summer Solstice (RA=90°)
- Autumnal Equinox (RA=180°)
- Winter Solstice (RA=270°)

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

**Source**: `script.js` lines 12423-12903

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

## Create Solstice File

### Purpose

Exports solstice timing data for a range of years to an Excel file.

### Location

`Settings > Create Solstice File`

### Controls

| Control | Description |
|---------|-------------|
| **Mode** | `Range` or `List` - determines how years are specified |
| **Year list (CSV)** | Comma-separated list of specific years (List mode only) |
| **Start year** | First year in range (Range mode only) |
| **End year** | Last year in range (Range mode only) |
| **Create file** | Checkbox to trigger export |

### Output

Excel file with solstice dates and times for the specified years.

### Technical Implementation

**Source**: `script.js` lines 10836-10874

---

## Create Object File

### Purpose

Exports position and property data for celestial objects.

### Location

`Settings > Create Object File`

### Controls

| Control | Description |
|---------|-------------|
| **Mode** | `Range` or `List` |
| **Year list (CSV)** | Comma-separated list (List mode) |
| **Start year** | First year (Range mode) |
| **End year** | Last year (Range mode) |
| **Create file** | Trigger export |

### Technical Implementation

**Source**: `script.js` lines 10797-10835

---

## Console Tests (F12)

### Purpose

Runs detailed astronomical validation tests with output to the browser's Developer Console (F12).

### Location

`Settings > Console Tests (F12)`

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
══════════════════════════════════════════════════════════════════════════
TROPICAL YEAR ANALYSIS (VERNAL EQUINOX)
══════════════════════════════════════════════════════════════════════════
Year range: 2000 to 2025

Year    VE Julian Day    Interval (days)    IAU Ref (days)    Diff (seconds)
─────────────────────────────────────────────────────────────────────────
2001    2451991.234567   365.242374         365.242374        +0.12
2002    2452356.477891   365.243324         365.242374        +82.15
...

SUMMARY:
  Mean tropical year: 365.242374 days
  IAU J2000 reference: 365.242374 days
  Difference: +0.05 seconds
  Status: ✓ PASS (within ±1 second tolerance)
```

### Technical Implementation

**Source**: `script.js` lines 10918-10969 (UI setup), various analysis functions

**Key Functions**:
- `sunRACrossingForYear()` - Finds when Sun crosses a specific RA
- `perihelionForYearMethodB()` - Finds perihelion using distance minimization
- `aphelionForYearMethodB()` - Finds aphelion using distance maximization

---

## Planet Report Export

### Purpose

Exports detailed statistics for a specific planet to Excel format.

### Location

Available via the Planet Stats panel when viewing a planet's details.

### Technical Implementation

**Source**: `script.js` lines 18602+

**Function**: `exportPlanetReportToExcel(planetKey, excelData)`

---

## Key Functions Reference

### sunRACrossingForYear(year, targetRA, prevJD)

Finds the Julian Day when the Sun crosses a specific Right Ascension value.

**Parameters**:
- `year` - Calendar year
- `targetRA` - Target RA in degrees (0=VE, 90=SS, 180=AE, 270=WS)
- `prevJD` - Optional previous crossing JD for optimization

**Returns**: Object with `jd` property containing the crossing Julian Day

### perihelionForYearMethodB(year, verbose, prevJD)

Finds the perihelion (closest approach to Sun) for a given year.

**Parameters**:
- `year` - Calendar year
- `verbose` - Boolean for console logging
- `prevJD` - Optional previous perihelion JD for optimization

**Returns**: Object with `jd` and `distance` properties

### aphelionForYearMethodB(year, verbose, prevJD)

Finds the aphelion (farthest point from Sun) for a given year.

**Parameters**:
- `year` - Calendar year
- `verbose` - Boolean for console logging
- `prevJD` - Optional previous aphelion JD for optimization

**Returns**: Object with `jd` and `distance` properties

### apparentRaFromPdA(pdA, pdB)

Calculates the apparent Right Ascension angle between two planet data objects in Earth's equatorial frame.

**Parameters**:
- `pdA` - First planet data object
- `pdB` - Second planet data object

**Returns**: Angle in radians

**Usage**: Used for perihelion longitude calculations. See [13-perihelion-precession.md](13-perihelion-precession.md) for details.

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

## Tips for Using Analysis Tools

1. **Performance**: Year Analysis Report can take several minutes for large year ranges. The console shows progress updates.

2. **List Mode**: Use comma-separated years for non-consecutive analysis (e.g., "2000, 2025, 2050, 2100").

3. **Console Tests**: Open Developer Tools (F12) before running to see detailed output.

4. **Validation**: Compare model output against IAU references to verify accuracy.

5. **Export Formats**: All exports use Excel format (.xlsx) via the SheetJS library.
