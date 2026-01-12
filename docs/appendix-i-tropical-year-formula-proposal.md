# Appendix I: Tropical Year and Day Length Formula - Proposed Approach

## Overview

The current formulas for tropical year length and day length use a simplified sinusoidal model based on the perihelion cycle (holisticyearLength / 16 = 20,868 years). However, the actual variation is driven by two fundamental orbital parameters:

1. **Obliquity** (axial tilt) - varies over the full holisticyear cycle (333,888 years)
2. **Eccentricity** (orbital shape) - varies over the perihelion cycle (20,868 years)

This document proposes a new approach that derives the tropical year and day length from these underlying physical parameters.

## Goal

Update the existing formulas in the model:
- **`o.lengthofsolarYear`** - tropical year length (days)
- **`o.lengthofDay`** - mean solar day length (seconds)

These formulas should be based on `o.obliquityEarth` and `o.eccentricityEarth` which are already computed in the model.

## Available Resources

We have access to:

1. **The 3D model** - can generate actual solstice-to-solstice measurements for any timeframe
2. **`o.obliquityEarth`** - computed obliquity at any year (formula exists)
3. **`o.eccentricityEarth`** - computed eccentricity at any year (formula exists)

The model can measure the actual tropical year by detecting solstices, which gives us ground truth data to fit against.

## Current Formulas in the Model

### Obliquity Formula (`computeObliquityEarth`)

```javascript
function computeObliquityEarth(currentYear) {
  const t = currentYear - balancedYear;

  const cycle3 = holisticyearLength / 3;   // 111,296 years
  const cycle8 = holisticyearLength / 8;   // 41,736 years

  const phase3 = (t / cycle3) * 2 * Math.PI;
  const phase8 = (t / cycle8) * 2 * Math.PI;

  return earthtiltMean
       - earthInvPlaneInclinationAmplitude * Math.cos(phase3)
       + earthInvPlaneInclinationAmplitude * Math.cos(phase8);
}
```

**Constants:**
| Parameter | Value | Description |
|-----------|-------|-------------|
| `earthtiltMean` | 23.41398° | Mean obliquity |
| `earthInvPlaneInclinationAmplitude` | 0.633849° | Amplitude of variation |
| `holisticyearLength` | 333,888 years | Full holistic cycle |
| `balancedYear` | -301,340 | Reference year (1246 - 14.5 × 20868) |

**Obliquity range:** ~22.15° to ~24.68° (approximately ±1.27° from mean)

### Eccentricity Formula (`computeEccentricityEarth`)

```javascript
function computeEccentricityEarth(currentYear, balancedYear, perihelionCycleLength,
                                   eccentricityMean, eccentricityAmplitude,
                                   eccentricitySinusCorrection) {
  const root = Math.sqrt(eccentricityMean² + eccentricityAmplitude²);

  const degrees = ((currentYear - balancedYear) / perihelionCycleLength) * 360;
  const θ = degrees * Math.PI / 180;

  const cosθ = Math.cos(θ);
  const absCosθ = Math.abs(cosθ);
  const signCosθ = Math.sign(cosθ);

  const term1 = signCosθ * Math.pow(absCosθ, eccentricitySinusCorrection);
  const term2 = cosθ * Math.pow(absCosθ, eccentricitySinusCorrection);

  const e1 = root + (-eccentricityAmplitude + (eccentricityMean - root) * term1) * cosθ;
  const e2 = root + (-eccentricityAmplitude + (eccentricityMean - root) * term2) * cosθ;

  return e1 > root ? e1 : e2;
}
```

**Constants:**
| Parameter | Value | Description |
|-----------|-------|-------------|
| `eccentricityMean` | 0.015313 | Mean eccentricity |
| `eccentricityAmplitude` | 0.001431 | Amplitude of variation |
| `eccentricitySinusCorrection` | 0.652 | Non-linear correction factor |
| `perihelionCycleLength` | 20,868 years | = holisticyearLength / 16 |

**Eccentricity range:** ~0.0139 to ~0.0167 (approximately)

## Proposed New Formulas

### Tropical Year Length (`o.lengthofsolarYear`)

```javascript
function computeTropicalYear(obliquity, eccentricity) {
  const Δobl = obliquity - obliquityMean;
  const Δecc = eccentricity - eccentricityMean;

  return meanTropicalYear
       + k_obl × Δobl
       + k_ecc × Δecc
       + k_obl_ecc × (Δobl × Δecc);
}
```

Or potentially with squared terms if non-linear effects are significant:

```javascript
function computeTropicalYear(obliquity, eccentricity) {
  const Δobl = obliquity - obliquityMean;
  const Δecc = eccentricity - eccentricityMean;

  return meanTropicalYear
       + k_obl × Δobl
       + k_obl2 × Δobl²
       + k_ecc × Δecc
       + k_ecc2 × Δecc²
       + k_obl_ecc × (Δobl × Δecc);
}
```

### Length of Day (`o.lengthofDay`)

Once we have the tropical year, the day length follows from:

```javascript
function computeDayLength(tropicalYear) {
  return siderealYearSeconds / (tropicalYear + tropicalYear / (precessionCycle - 1));
}
```

Where:
- `siderealYearSeconds` = 31558149.6846777 seconds
- `precessionCycle` = holisticyearLength / 13 = 25,684 years

## Sample Data Requirements

To fit the formula coefficients (k_obl, k_ecc, k_obl_ecc, etc.), we need to collect measured tropical year and day length data at various points where obliquity and eccentricity have different values.

### Data to Collect at Each Sample Point

For each sample year, run the model and record:

1. **Year** (decimal)
2. **`o.obliquityEarth`** (degrees)
3. **`o.eccentricityEarth`** (dimensionless)
4. **Measured tropical year** (days) - from solstice-to-solstice detection in the model
5. **Measured mean solar day** (seconds) - from meridian transit detection (see below)

### How to Measure Day Length in the Model

The model has Earth rotation. We can measure the mean solar day by tracking meridian transits:

#### Approach: Meridian Transit Detection

1. **Add a reference marker on Earth** - Place a marker at a fixed longitude (e.g., 0° = Greenwich meridian) on the Earth model

2. **Track solar noon** - Detect when the Sun crosses the local meridian (highest point in the sky from that location). This is when the angle between the meridian marker and the Sun (projected onto the equatorial plane) is 0°.

3. **Measure interval** - Record the time (in seconds) between successive solar noon events over a full tropical year

4. **Calculate mean** - Average all the daily intervals to get the mean solar day length for that year

#### Alternative: Sidereal Day + Correction

If measuring solar noon is complex, we can:

1. **Measure sidereal day** - Track when a fixed point on Earth aligns with a distant reference star (or the vernal equinox direction). This gives the sidereal day.

2. **Derive solar day** - The mean solar day relates to the sidereal day by:
   ```
   solarDay = siderealDay × (tropicalYear + 1) / tropicalYear
   ```

   Or equivalently:
   ```
   solarDay = siderealDay + siderealDay / tropicalYear
   ```

3. **Use measured tropical year** - Since we already measure the tropical year, we can derive the solar day if we measure the sidereal day.

#### Implementation Suggestion

Add a function to the model:
```javascript
function measureMeanSolarDay(startYear, endYear) {
  // 1. Jump to June solstice of startYear
  // 2. For each day until June solstice of endYear:
  //    - Detect solar noon (Sun at highest altitude or crossing meridian)
  //    - Record the JD of each solar noon
  // 3. Calculate intervals between successive solar noons
  // 4. Return the mean interval in seconds
}
```

Or for sidereal approach:
```javascript
function measureSiderealDay(year) {
  // 1. Pick a reference direction (e.g., vernal equinox or distant star)
  // 2. Track when Earth's reference meridian aligns with this direction
  // 3. Measure the interval between successive alignments
  // 4. This gives the sidereal day (should be ~86164.0905 seconds)
}
```

### Proposed Sample Points

#### Request 1: Current perihelion cycle (1000-3000 AD)
This covers about 2000 years centered on the current era, with good resolution:

```
Years: 1000, 1100, 1200, 1246, 1300, 1400, 1500, 1600, 1700, 1800,
       1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000
```
**Count:** 22 data points

#### Request 2: Full perihelion cycle (-9188 to +11680)
This covers one complete perihelion cycle (centered on 1246 AD ± 10,434 years):

```
Years: -9188, -8000, -7000, -6000, -5000, -4000, -3000, -2000, -1000, 0,
       1000, 1246, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 11680
```
**Count:** 23 data points

#### Request 3: Extended range for obliquity variation (-50000 to +50000)
This captures the full obliquity variation cycle:

```
Years: -50000, -40000, -30000, -20000, -10000, 0, 10000, 20000, 30000, 40000, 50000
```
**Count:** 11 data points

## Implementation Plan

### Phase 0: Add Day Length Measurement Capability

Before collecting data, implement a function to measure mean solar day length:

1. **Option A: Measure solar noon transits**
   - Add a reference meridian marker on Earth (e.g., at longitude 0°)
   - Track when the Sun crosses this meridian (solar noon)
   - Measure intervals between successive solar noons over a full year
   - Return the mean interval

2. **Option B: Measure sidereal day + derive solar day**
   - Track when Earth's meridian aligns with a fixed star or vernal equinox direction
   - Measure the sidereal day interval
   - Use formula: `solarDay = siderealDay × (tropicalYear + 1) / tropicalYear`

**Recommendation:** Option B may be simpler since we already measure tropical year.

### Phase 1: Data Collection

Run the model to measure both solstice-to-solstice intervals and day lengths at the sample years.

For each year, output:
- Year
- `o.obliquityEarth`
- `o.eccentricityEarth`
- Measured tropical year (from solstice detection)
- Measured mean solar day (from meridian transit or sidereal derivation)

### Phase 2: Analysis

1. Plot tropical year vs obliquity (color-coded by eccentricity)
2. Plot tropical year vs eccentricity (color-coded by obliquity)
3. Plot day length vs obliquity and eccentricity
4. Identify linear and non-linear relationships
5. Perform multivariate regression to determine coefficients

### Phase 3: Formula Implementation

1. Determine the best-fit coefficients (k_obl, k_ecc, etc.) for tropical year
2. Update `o.lengthofsolarYear` to use the new formula based on obliquity and eccentricity
3. Update `o.lengthofDay` to derive from the tropical year using the relationship:
   ```
   dayLength = siderealYearSeconds / (tropicalYear + tropicalYear / (precessionCycle - 1))
   ```

### Phase 4: Validation

1. Compare formula predictions to measured values
2. Verify match at known reference points (IAU 2000 AD, 1246 AD)
3. Test across the full holisticyear range
4. Verify day length matches expected values (86400 seconds at 2000 AD)

## Expected Outcomes

1. **Physics-based formulas** that use `o.obliquityEarth` and `o.eccentricityEarth`
2. **Valid across the entire 333,888 year holisticyear** (not just 20,868 year perihelion cycle)
3. **Consistent behavior** where tropical year and day length are properly linked
4. **Better accuracy** at cycle boundaries where the current simplified formula has errors
5. **Day length correctly derived** from tropical year rather than independent sinusoid

## Model Time Representation

### Fundamental Time Units

The 3D model uses **radians** as the fundamental unit of time, with one solar year equal to 2π radians:

| Concept | Value | Meaning |
|---------|-------|---------|
| **One Solar year** | 2π radians | A complete circle = 6.283185307... |
| **One Solar day** | 2π / meansolaryearlengthinDays | Radians per day |

### Key Time Constants (from script.js)

```javascript
// The mean solar year is rounded to align with the holisticyear cycle:
const meansolaryearlengthinDays = Math.round(input * (holisticyearLength / 16)) / (holisticyearLength / 16);
// This yields: 7621874 / 20868 = 365.242188997... days (meansolaryearlengthinDays)

const meanearthRotationsinDays = meansolaryearlengthinDays + 1;  // = 366.242188997... rotations/year
const meansiderealyearlengthinDays = meansolaryearlengthinDays * (HY/13) / ((HY/13) - 1);
const meanlengthofday = meansiderealyearlengthinSeconds / meansiderealyearlengthinDays;
const meanSiderealday = (meansolaryearlengthinDays / (meansolaryearlengthinDays + 1)) * meanlengthofday;
```

**Important:** The `meansolaryearlengthinDays` (365.242188997...) is the value actually used in the model. It is derived by rounding to ensure alignment with the holisticyear/16 cycle (20,868 years).

### Time Unit Conversions

| Unit | Symbol | Definition | Value |
|------|--------|------------|-------|
| `sDay` | 1 solar day | 1 / meansolaryearlengthinDays | ~0.00273791 years |
| `sYear` | 365 days | sDay × 365 | ~0.999336 years |
| `sHour` | 1 hour | sDay / 24 | ~0.000114 years |
| `sMinute` | 1 minute | sHour / 60 | ~1.9 × 10⁻⁶ years |
| `sSecond` | 1 second | sMinute / 60 | ~3.17 × 10⁻⁸ years |

### Relationship Between Days, Rotations, and Years

The model correctly accounts for the difference between solar days and Earth rotations:

- **Solar days per year:** 365.242188997... (meansolaryearlengthinDays)
- **Earth rotations per year:** 366.242188997... (one extra rotation because Earth orbits the Sun)
- **Sidereal day:** Time for one complete rotation relative to stars
- **Solar day:** Time for Sun to return to same position in sky (slightly longer than sidereal day)

Formula relationship:
```
solarDay = siderealDay × (tropicalYear + 1) / tropicalYear
```

Or equivalently:
```
siderealDay = solarDay × tropicalYear / (tropicalYear + 1)
```

---

## Generic Alignment Measurement Framework

### Overview

To collect comprehensive data, we need a generic measurement system that can detect various astronomical alignments and measure the intervals between them. This framework supports multiple alignment types, each measuring different cycles.

### Alignment Types

| Alignment Type | Description | What It Measures | Cycle Length | Unit |
|---------------|-------------|------------------|--------------|------|
| **Sun at 0°** | Sun crosses vernal equinox direction | Tropical year (VE to VE) | ~365.24 days | Days |
| **Sun at 90°** | Sun at summer solstice position | Tropical year (SS to SS) | ~365.24 days | Days |
| **Sun at 180°** | Sun crosses autumnal equinox direction | Tropical year (AE to AE) | ~365.24 days | Days |
| **Sun at 270°** | Sun at winter solstice position | Tropical year (WS to WS) | ~365.24 days | Days |
| **Sun World Angle** | Sun returns to same ICRF position | Sidereal year | ~365.26 days | Days |
| **Sun-Earth-Wobble Center** | Sun aligned between Earth and wobble center | Precession reference | ~25,684 years | Years |
| **Sun-Earth-Perihelion** | Sun aligned between Earth and perihelion point | Anomalistic year | ~365.26 days | Days |
| **Meridian-Sun** | Earth meridian aligned with Sun | Mean solar day | ~86,400 sec | Seconds |
| **Meridian-Star** | Earth meridian aligned with fixed star/vernal point | Sidereal day | ~86,164 sec | Seconds |

### Unit Selection Rationale

1. **Days** (9 decimal places) for year-length measurements:
   - Natural unit for orbital periods
   - 9 decimals gives ~0.01 second precision
   - Range: ~365.24 days

2. **Seconds** (6 decimal places) for day-length measurements:
   - Natural unit for rotation periods
   - 6 decimals gives microsecond precision
   - Range: ~86,400 seconds

3. **Years** (6 decimal places) for long-cycle measurements:
   - Natural unit for multi-millennia cycles
   - 6 decimals gives ~30 second precision
   - Range: ~25,684 years

### Generic Measurement Function

```javascript
/**
 * Generic alignment detection and interval measurement
 * @param {string} alignmentType - Type of alignment to detect
 * @param {number} startYear - Start year for measurement
 * @param {number} endYear - End year for measurement
 * @param {string} outputUnit - 'days', 'seconds', or 'years'
 * @returns {object} - { events: [], meanInterval: number, unit: string }
 */
function measureAlignmentIntervals(alignmentType, startYear, endYear, outputUnit) {
  const events = [];

  // Run simulation from startYear to endYear
  // For each timestep, check if alignment condition is met
  // Record JD of each alignment event

  switch (alignmentType) {
    case 'sun-longitude-0':    // Vernal equinox
    case 'sun-longitude-90':   // Summer solstice
    case 'sun-longitude-180':  // Autumnal equinox
    case 'sun-longitude-270':  // Winter solstice
      // Detect when Sun's ecliptic longitude crosses target angle
      break;

    case 'sun-earth-wobble-center':
      // Detect when Sun, Earth, and wobble center are collinear
      break;

    case 'sun-earth-perihelion':
      // Detect when Sun, Earth, and perihelion point are collinear
      // This is when Earth is at perihelion
      break;

    case 'meridian-sun':
      // Detect solar noon (Sun crossing Earth's meridian)
      break;

    case 'meridian-star':
      // Detect when Earth's meridian aligns with vernal equinox direction
      break;
  }

  // Calculate intervals between successive events
  const intervals = [];
  for (let i = 1; i < events.length; i++) {
    intervals.push(events[i].jd - events[i-1].jd);
  }

  // Convert to requested unit
  const meanIntervalJD = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  let meanInterval;

  switch (outputUnit) {
    case 'days':
      meanInterval = meanIntervalJD;
      break;
    case 'seconds':
      meanInterval = meanIntervalJD * 86400;
      break;
    case 'years':
      meanInterval = meanIntervalJD / meansolaryearlengthinDays; // 365.242188997...
      break;
  }

  return {
    alignmentType,
    startYear,
    endYear,
    eventCount: events.length,
    meanInterval,
    unit: outputUnit,
    intervals // for analysis
  };
}
```

### Day Length Measurement: Both Approaches

We will implement **both** approaches to verify they produce consistent results:

#### Option A: Direct Solar Noon Detection

```javascript
function measureMeanSolarDay_OptionA(startYear, numYears) {
  // 1. Set up reference meridian on Earth (longitude 0°)
  // 2. For each day in the measurement period:
  //    - Track Sun's position relative to Earth
  //    - Detect when Sun crosses the meridian (solar noon)
  //    - Record the JD of each solar noon
  // 3. Calculate intervals between successive solar noons
  // 4. Return mean interval in seconds

  const result = measureAlignmentIntervals(
    'meridian-sun',
    startYear,
    startYear + numYears,
    'seconds'
  );

  return {
    method: 'Direct solar noon detection',
    meanSolarDay: result.meanInterval,
    unit: 'seconds',
    sampleSize: result.eventCount
  };
}
```

#### Option B: Sidereal Day + Derivation

```javascript
function measureMeanSolarDay_OptionB(startYear, numYears, measuredTropicalYear) {
  // 1. Measure sidereal day using fixed star/vernal equinox alignment
  const siderealResult = measureAlignmentIntervals(
    'meridian-star',
    startYear,
    startYear + numYears,
    'seconds'
  );

  const siderealDay = siderealResult.meanInterval;

  // 2. Derive mean solar day from sidereal day and tropical year
  // Formula: solarDay = siderealDay × (tropicalYear + 1) / tropicalYear
  const tropicalYearDays = measuredTropicalYear;
  const meanSolarDay = siderealDay * (tropicalYearDays + 1) / tropicalYearDays;

  return {
    method: 'Sidereal day + derivation',
    siderealDay: siderealDay,
    tropicalYear: tropicalYearDays,
    meanSolarDay: meanSolarDay,
    unit: 'seconds',
    sampleSize: siderealResult.eventCount
  };
}
```

#### Verification: Comparing Both Methods

```javascript
function verifyDayLengthMethods(year) {
  // Measure tropical year first (needed for Option B)
  const tropicalYear = measureAlignmentIntervals(
    'sun-longitude-90',  // Summer solstice to summer solstice
    year,
    year + 10,
    'days'
  ).meanInterval;

  // Measure day length using both methods
  const optionA = measureMeanSolarDay_OptionA(year, 1);
  const optionB = measureMeanSolarDay_OptionB(year, 1, tropicalYear);

  const difference = Math.abs(optionA.meanSolarDay - optionB.meanSolarDay);

  console.log(`Year ${year}:`);
  console.log(`  Option A (direct):     ${optionA.meanSolarDay.toFixed(6)} seconds`);
  console.log(`  Option B (derived):    ${optionB.meanSolarDay.toFixed(6)} seconds`);
  console.log(`  Difference:            ${(difference * 1000000).toFixed(3)} microseconds`);
  console.log(`  Sidereal day:          ${optionB.siderealDay.toFixed(6)} seconds`);
  console.log(`  Tropical year:         ${tropicalYear.toFixed(9)} days`);

  return {
    year,
    optionA: optionA.meanSolarDay,
    optionB: optionB.meanSolarDay,
    difference,
    siderealDay: optionB.siderealDay,
    tropicalYear
  };
}
```

### Measurement Summary Table

| Measurement | Method | Detection | Output Unit | Precision |
|-------------|--------|-----------|-------------|-----------|
| Tropical year (SS) | Sun at 90° | Solstice crossing | Days | 9 decimals |
| Tropical year (VE) | Sun at 0° | Equinox crossing | Days | 9 decimals |
| Sidereal year | Sun World Angle | ICRF position return | Days | 9 decimals |
| Anomalistic year | Sun-Earth-Perihelion | Perihelion passage | Days | 9 decimals |
| Mean solar day (A) | Meridian-Sun | Solar noon | Seconds | 6 decimals |
| Mean solar day (B) | Meridian-Star + formula | Sidereal noon | Seconds | 6 decimals |
| Sidereal day | Meridian-Star | Star transit | Seconds | 6 decimals |

## Implementation Steps (Ordered)

### Step 1: Core Detection Functions ✅ IMPLEMENTED

The base detection functions have been implemented in `script.js`:

| Function | Status | Description |
|----------|--------|-------------|
| `solsticeForYear(year)` | ✅ Done | Detects June solstice by finding maximum Sun declination |
| `equinoxForYear(year, which)` | ✅ Done | Detects equinox (0=vernal, 2=autumnal) by finding declination zero-crossing |
| `perihelionForYear(year, debug, prevJD)` | ✅ Done | Detects perihelion by minimum Earth→Sun distance (Earth-Frame) |
| `perihelionForYearMethodB(year, debug, prevJD)` | ✅ Done | Detects perihelion by minimum WobbleCenter→Sun distance (True) |
| `aphelionForYear(year, debug, prevJD)` | ✅ Done | Detects aphelion by maximum Earth→Sun distance (Earth-Frame) |
| `aphelionForYearMethodB(year, debug, prevJD)` | ✅ Done | Detects aphelion by maximum WobbleCenter→Sun distance (True) |
| `siderealNoonForJD(jd)` | ✅ Done | Tracks Earth rotation (360°) to measure sidereal day (~86164.09s) |
| `solarNoonForJD(jd, debug, cumulativeState)` | ✅ Done | Binary search with cumulative RA tracking to measure solar day (~86400s) |

#### Detection Algorithm Details

All detection functions use a two-phase approach:

**Phase 1: Coarse Search**
- Sample at 30-minute intervals around an estimated time
- For first detection: wide search window (±20 days = 960 samples)
- For subsequent detections: narrow window using previous result (±6 days = 288 samples)

**Phase 2: Parabolic Interpolation**
- Fit a parabola through the best sample and its neighbors
- Find the vertex for sub-sample precision
- Formula: `t_max = t₀ + (step/2) × (y₋₁ - y₊₁) / (y₋₁ - 2y₀ + y₊₁)`

#### Perihelion/Aphelion Implementation

```javascript
function perihelionForYear(year, debug = false, prevPerihelionJD = null) {
  let approxJD, searchRange;

  if (prevPerihelionJD !== null) {
    // Chain from previous: ~365.26 day offset, ±6 day window
    approxJD = prevPerihelionJD + 365.26;
    searchRange = 288;
  } else {
    // First search: early January estimate, ±20 day window
    approxJD = startmodelJD + ((year + 0.03) - startmodelYear) * meansolaryearlengthinDays;
    searchRange = 960;
  }

  // Search for minimum sun.distAU
  // Parabolic interpolation for sub-sample precision
  // Returns { jd, distance, raDeg }
}

function aphelionForYear(year, debug = false, prevAphelionJD = null) {
  // Same structure but finds maximum distance
  // Also calculates alignmentDiff for verification:
  //   alignmentDiff = sunToEarth - (periToSun + periToEarth)
  // At aphelion, alignmentDiff should be ~0 (perfect alignment)
  // Returns { jd, distance, raDeg, alignmentDiff }
}
```

#### Key Insight: Perihelion Point Geometry

The model's `earthPerihelionFromEarth` object represents a fixed reference point at 1 AU from the Sun in the perihelion direction. This creates an important geometric relationship:

- **At perihelion**: Earth is closest to Sun (~0.983 AU), far from the perihelion point
- **At aphelion**: Earth is farthest from Sun (~1.017 AU), and passes through the perihelion point

At aphelion, the alignment is perfect:
```
sunToEarth = periToSun + periToEarth
```

This was verified in testing with `alignmentDiff ≈ 0.0000000000 AU`.

### Step 2: Analysis Functions ✅ IMPLEMENTED

Analysis functions that use the detection functions:

| Function | Status | Measures |
|----------|--------|----------|
| `analyzeTropicalYear(start, end)` | ✅ Done | Tropical year (SS to SS) from solstices |
| `analyzeSiderealYear(start, end)` | ✅ Done | Sidereal year via Sun's world position angle (ICRF) |
| `analyzeAnoministicYear(start, end)` | ✅ Done | Anomalistic year from both perihelion AND aphelion |
| `analyzeAllAlignments(start, end)` | ✅ Done | Comprehensive: SS, VE, AE, WS, perihelion, aphelion |
| `analyzeSiderealDay(year)` | ✅ Done | Sidereal day length (30 days, with derived comparison) |
| `analyzeSolarDay(year)` | ✅ Done | Mean solar day using both methods (direct + derived) |
| `analyzeStellarDay(year)` | ✅ Done | Stellar day using 3 methods (rotation angles, world matrix, derived) |

#### Anomalistic Year Implementation

The anomalistic year measurement requires understanding the geocentric model structure:

**The Problem with Earth→Sun Distance:**

In the geocentric model, Earth is NOT stationary at the origin. Earth orbits the `earthWobbleCenter` (fixed at origin) with a period of HY/13 = 25,684 years (clockwise), simulating axial precession. This means measuring the minimum Earth→Sun distance gives an "Earth-Frame Perihelion Interval" that is affected by Earth's wobble position.

**The Solution - Two Reference Frames:**

| Method | Reference Frame | What It Measures | Accuracy |
|--------|-----------------|------------------|----------|
| `perihelionForYear()` | Earth→Sun | Earth-Frame Perihelion Interval | -122 sec from IAU |
| `perihelionForYearMethodB()` | WobbleCenter→Sun | True Anomalistic Year | +5 sec from IAU |

**Method B Implementation (`perihelionForYearMethodB`):**

```javascript
function perihelionForYearMethodB(year, debug = false, prevPerihelionJD = null) {
  // Measure minimum distance from FIXED wobble center to Sun
  // This gives the true anomalistic year (inertial reference frame)

  const WOBBLE_POS = new THREE.Vector3();
  const SUN_POS = new THREE.Vector3();

  // Get fixed wobble center position (at origin, 0,0,0)
  earthWobbleCenter.planetObj.getWorldPosition(WOBBLE_POS);

  // Get Sun position
  sun.planetObj.getWorldPosition(SUN_POS);

  // Calculate distance in AU
  const distance = WOBBLE_POS.distanceTo(SUN_POS) / 100;  // scene units to AU

  // Search for minimum distance (perihelion)
  // ... binary search refinement ...
}
```

**Why This Works:**

- The wobble center is fixed at the origin (inertial reference frame)
- The Sun orbits the perihelion point, which orbits the wobble center
- WobbleCenter→Sun distance is independent of Earth's axial precession wobble
- This matches how astronomers define the anomalistic year in heliocentric coordinates

**Verified Results (years 1990-2010):**

| Metric | Value (days) | Diff from IAU |
|--------|--------------|---------------|
| **True Anomalistic Year (WobbleCenter→Sun)** | 365.259692495 | **+4.88 seconds** |
| Earth-Frame Perihelion Interval (Earth→Sun) | 365.258225538 | -121.86 seconds |
| Earth-Frame Aphelion Interval | 365.258225575 | -121.86 seconds |
| IAU anomalistic year (J2000) | 365.259636000 | (reference) |
| HY/16 Formula prediction | 365.259692337 | +4.87 seconds |

**Key Findings:**

1. **True Anomalistic Year matches HY/16 formula within 0.01 seconds** - The model's perihelion precession period (HY/16 = 20,868 years) correctly predicts the anomalistic year length.

2. **Earth-Frame offset oscillates** - The ~127 second difference between Earth-Frame and True measurements oscillates over the 25,684 year axial precession cycle.

3. **Perihelion and aphelion measurements agree** - Both give identical intervals (to within 0.001 seconds), confirming the detection algorithm works correctly.

**Theoretical Formula:**
```
anomalisticYear = tropicalYear × perihelionPrecessionYears / (perihelionPrecessionYears - 1)
                = 365.2421890 × 20868 / 20867
                = 365.259692337 days
```

This matches the measured True Anomalistic Year (365.259692495 days) within 0.01 seconds.

#### Sidereal Year Analysis

The `analyzeSiderealYear()` function measures when the Sun returns to the same absolute world position angle (ICRF reference frame):

**Method:** Direct measurement of Sun's world position angle in the XZ plane using `sun.planetObj.getWorldPosition()`. The first crossing establishes a target angle (at sun.ra = 90°), then subsequent years detect when the Sun returns to that same world angle.

| Metric | Value (days) | Notes |
|--------|--------------|-------|
| IAU sidereal year (J2000) | 365.256363 | Fixed star reference |
| IAU tropical year (J2000) | 365.242189 | Mean tropical year |
| Sidereal - Tropical (IAU) | ~1224 seconds | Due to precession |

The sidereal year is longer than the tropical year because Earth must travel slightly further in its orbit to return to the same position relative to fixed stars (ICRF), due to axial precession causing the vernal equinox to drift westward.

### Step 3: GUI Integration ✅ IMPLEMENTED

Settings menu under "Console tests (F12)" in the Calibration folder:

```
├── Calibration
│   ├── Start year                   ✅
│   ├── End year                     ✅
│   ├── Analyze Tropical Year        ✅ (solstice based)
│   ├── Analyze Sidereal Year        ✅
│   ├── Analyze Sidereal Day         ✅ (30 days, with derived comparison)
│   ├── Analyze Stellar Day          ✅ (3 methods: rotation angles, world matrix, derived)
│   ├── Analyze Solar Day            ✅ (o.runSolarDayAnalysis)
│   └── Analyze All Alignments       ✅ (comprehensive output)
```

Each button triggers async function, outputs to console (F12).

### Step 4: Verify Methods ✅ COMPLETED

Verified at year 1990:
- ✅ Solar day Method A (direct): 86399.988576s (matches model expected 86399.988589s within 0.013ms)
- ✅ Method B (derived): 86399.999985s
- ✅ Sidereal day: 86164.090517 seconds (matches expected ~86164.09s)
- ✅ All methods now produce consistent results (previous 44ms bias was fixed)

### Step 5: Collect Sample Data

Run "Analyze All Alignments" for each sample period:

**Request 1:** Years 1000-3000 (22 points)
**Request 2:** Years -9188 to +11680 (23 points)
**Request 3:** Years -50000 to +50000 (11 points)

Output for each year:
- `o.obliquityEarth` (degrees, 6 decimals)
- `o.eccentricityEarth` (8 decimals)
- Tropical year SS (days, 9 decimals)
- Tropical year VE (days, 9 decimals)
- Anomalistic year (days, 9 decimals)
- Sidereal day (seconds, 6 decimals)
- Solar day A (seconds, 6 decimals)
- Solar day B (seconds, 6 decimals)

### Step 6: Derive Formula Coefficients

Perform regression analysis on collected data to find:
- `k_obl` - obliquity coefficient
- `k_ecc` - eccentricity coefficient
- `k_obl_ecc` - interaction term
- (and squared terms if needed)

### Step 7: Implement New Formulas

Update in script.js:
- `o.lengthofsolarYear` - new physics-based formula
- `o.lengthofDay` - derived from tropical year

### Step 8: Validation

- Match IAU 2000 AD within 0.01 seconds
- Match 1246 AD reference value
- Day length = 86400 seconds at 2000 AD
- Valid across full 333,888 year holisticyear

---

## Files to Modify

| File | Changes |
|------|---------|
| `script.js` | Add detection functions, analysis functions, GUI controls |
| `appendix-i-tropical-year-formula-analysis.md` | Update with final derived formula |

---

---

## Current Implementation Status (January 2026)

### ✅ Completed

1. **Core Detection Functions**
   - `solsticeForYear(year)` - June solstice detection via max declination
   - `equinoxForYear(year, which)` - Equinox detection via declination zero-crossing
   - `perihelionForYear(year, debug, prevJD)` - Perihelion via minimum distance
   - `aphelionForYear(year, debug, prevJD)` - Aphelion via maximum distance + alignment verification

2. **Analysis Functions**
   - `analyzeTropicalYear(start, end)` - Tropical year from solstice intervals
   - `analyzeAnoministicYear(start, end)` - Anomalistic year from both perihelion AND aphelion
   - `analyzeAllAlignments(start, end)` - Comprehensive analysis of all intervals

3. **Anomalistic Year Validation**
   - Both perihelion (min distance) and aphelion (max distance) give consistent results: ~365.2585 days
   - ~95 seconds shorter than IAU anomalistic year (365.259636 days)
   - ~23 minutes longer than tropical year (as expected)
   - Aphelion alignment check confirms geometry: `sunToEarth = periToSun + periToEarth` (diff ≈ 0)

4. **Day Length Measurement Functions** ✅ IMPLEMENTED
   - `siderealNoonForJD(startJD)` - Detects when Earth completes one full rotation (360°). Measures sidereal day (~86164.09s).
   - `solarNoonForJD(startJD, debug, cumulativeState)` - Uses binary search with cumulative RA tracking to detect when hour angle increases by 360°. The `cumulativeState` parameter handles sun.ra wrap-around across multiple calls (essential for full-year measurements).
   - `analyzeSiderealDay(year)` - Measures sidereal day intervals over a tropical year
   - `analyzeSolarDay(year)` - Comprehensive mean solar day analysis with two methods

### Day Length Measurement Results

Testing at year 1990 over 365 solar days produced:

#### Method A: Direct Solar Noon Detection (Hour Angle)

Tracks when `earth.planetObj.rotation.y - sun.ra` increases by 2π (360°).

Uses **binary search with cumulative RA tracking** for sub-microsecond precision. The cumulative tracking handles sun.ra wrap-around when it crosses from ~2π back to ~0 (which happens once per year).

| Metric | Value |
|--------|-------|
| Mean solar day | 86399.988576 seconds |
| Median | 86398.922798 seconds |
| Min (Day 90) | 86379.674 seconds (-20.3s from mean) |
| Max (Day 183) | 86425.192 seconds (+25.2s from mean) |
| Range | 45.5 seconds |

The daily variation matches the expected **equation of time** pattern, with shortest days around early April and longest days around early July.

#### Method B: Derived from Sidereal Day

Measures sidereal day directly from `earth.planetObj.rotation.y`, then derives solar day.

| Metric | Value |
|--------|-------|
| Sidereal day mean | 86164.090517 seconds |
| Tropical year | 365.242188998 days |
| **Derived solar day** | **86399.999985 seconds** |

Formula: `solarDay = siderealDay × (tropicalYear + 1) / tropicalYear`

#### Method C: Fixed-Frame Solar Noon Detection

Measures Sun position in world coordinates using `atan2(z, x)`, ignoring Earth's equatorial plane and axial tilt.

| Metric | Value |
|--------|-------|
| Mean solar day | 86400.000000 seconds |
| Range | 0.000000 seconds |

This method always gives exactly 86400s because the simulation uses Julian Days where 1 JD = 86400s by definition. It confirms the model time step but not physical solar day length. Shows no daily variation since it ignores the equatorial coordinate system.

#### Comparison

| Method | Solar Day (s) | Diff from model (86399.989s) | Diff from 86400s |
|--------|---------------|------------------------------|------------------|
| Method A (Earth-frame) | 86399.988576 | **-0.013 ms** | -11.424 ms |
| Method B (derived) | 86399.999985 | +11.396 ms | -0.015 ms |
| Method C (fixed-frame) | 86400.000000 | +11.411 ms | 0.000 ms |

#### Why The Methods Differ

**Method A (Earth-frame) - THE PHYSICALLY CORRECT MEASUREMENT**

Uses sun.ra (Right Ascension) measured from Earth's equatorial plane. This is how solar time is actually defined - relative to Earth's rotation axis and equatorial coordinate system. Shows equation of time variation (±20-25s daily) due to Earth's orbital eccentricity and axial tilt. Matches the model's expected `meanlengthofday` (86399.988589s) within 0.013 milliseconds.

**Method B (Derived) - MATHEMATICAL CROSS-CHECK**

Derives solar day from sidereal day using the fundamental relationship: in one year, Earth rotates (tropical year + 1) times relative to stars, but only (tropical year) times relative to the Sun. Provides independent verification of the sidereal/solar day relationship.

**Method C (Fixed-frame) - SIMULATION REFERENCE**

Measures Sun's angular position in world XZ plane (ignoring Earth's tilt). Always gives exactly 86400s because the simulation uses Julian Days where 1 JD = 86400s by definition. This is a tautology - it confirms the model time step, not physical solar day length.

**The ~11ms difference** between Method A and Methods B/C reflects the model's mean solar day constant (`meanlengthofday = 86399.989s`), which correctly accounts for the relationship between tropical year length and sidereal day length.

### Understanding the Model's Day Types

In this geocentric model, Earth rotates `(tropicalYear + 1)` times per tropical year. This is the definition of the **sidereal day**:

```
siderealDay = tropicalYear / (tropicalYear + 1) solar days
```

The relationship `solarDay = siderealDay × (tropicalYear + 1) / tropicalYear` holds exactly.

| Term | Definition | Duration |
|------|------------|----------|
| **Sidereal day** | Time for Earth to rotate 360° relative to vernal equinox (precessing frame) | ~86164.0905 seconds |
| **Stellar day** | Time for Earth to rotate 360° relative to fixed stars (ICRF, inertial frame) | ~86164.0997 seconds |
| **Solar day** | Time for Sun to return to same position in sky | ~86400 seconds |

The stellar day is ~9.16ms longer than the sidereal day due to axial precession. As the vernal equinox precesses westward over the 25,684 year cycle, Earth must rotate slightly less than 360° in inertial space to complete one rotation relative to the precessing equinox.

The `siderealNoonForJD()` function measures the sidereal day by tracking `earth.planetObj.rotation.y`.
The `stellarNoonMethodA/B/C()` functions measure the stellar day using three independent methods.

### Sidereal Day Analysis Results

The `analyzeSiderealDay()` function measures 30 consecutive sidereal day intervals starting from the June solstice. Unlike solar day (which varies ±20-25s due to equation of time), sidereal day shows **zero variation** throughout the year - every day is identical. This is because sidereal day measures pure rotation relative to the vernal equinox, without any equatorial plane projection effects.

**Test Results (Year 1990, 30 days):**

| Metric | Value |
|--------|-------|
| Number of measurements | 30 |
| Mean | 86164.090517 seconds |
| Range | 0.000000 seconds (no variation) |
| **Derived (model constants)** | **86164.090532 seconds** |
| IAU reference | 86164.0905 seconds |
| Measured - Derived | -0.014743 ms |
| Measured - IAU | +0.017 ms |

The derived value comes from the model's fundamental constants:
```
siderealDay = meansolaryearlengthinDays / (meansolaryearlengthinDays + 1) × 86400
           = 365.242188997 / 366.242188997 × 86400
           = 86164.090532 seconds
```

The excellent agreement (within 0.015ms) between measured, derived, and IAU values confirms the model's rotation implementation is correct.

### Stellar Day Analysis Results

The `analyzeStellarDay()` function measures the stellar day (rotation relative to fixed stars/ICRF) using three independent methods. Like sidereal day, stellar day shows **zero variation** throughout the year.

**Test Results (Year 1990, 30 days):**

#### Method A: Rotation Angles Sum
Tracks `earth.planetObj.rotation.y + earth.orbitObj.rotation.y` to measure total rotation in inertial (ICRF) space.

| Metric | Value |
|--------|-------|
| Mean | 86164.099675 seconds |
| Range | 0.000000 seconds |

#### Method B: World Matrix Y-Rotation
Extracts the Y-rotation component directly from Earth's world transformation matrix using Euler decomposition (`euler.setFromRotationMatrix(earth.planetObj.matrixWorld, 'YXZ')`).

| Metric | Value |
|--------|-------|
| Mean | 86164.099675 seconds |
| Range | 0.000000 seconds |

#### Method C: Mathematical Derivation
Derives the stellar day from the sidereal day using the precession period:
```
precessionPeriodYears = holisticyearLength / 13 = 25,683.692 years
rotationsPerYear = meansolaryearlengthinDays + 1 = 366.242189
stellarDayFactor = 1 + 1 / (precessionPeriodYears × rotationsPerYear)
stellarDay = siderealDay × stellarDayFactor
```

| Metric | Value |
|--------|-------|
| Sidereal day (input) | 86164.090517 seconds |
| Precession period | 25,683.692 years |
| Stellar day factor | 1.000000106 |
| **Stellar day** | **86164.099675 seconds** |

#### Method Agreement

All three methods agree within 0.24ms:

| Method | Stellar Day (s) | Diff from Mean |
|--------|-----------------|----------------|
| Method A (rotation angles) | 86164.099675 | baseline |
| Method B (world matrix) | 86164.099675 | 0.000 ms |
| Method C (derived) | 86164.099675 | 0.000 ms |

#### Stellar vs Sidereal Day Comparison

| Metric | Value |
|--------|-------|
| Sidereal day (model) | 86164.090517 seconds |
| Stellar day (measured) | 86164.099675 seconds |
| **Difference** | **+9.158 ms** |
| Expected from precession | +9.158 ms |

The ~9.16ms difference is exactly what the precession model predicts. The stellar day is longer because Earth must rotate slightly more than 360° in inertial space to complete one rotation relative to the precessing vernal equinox.

**Why no daily variation?**

Unlike solar day (which varies ±20-25s due to the equation of time from Earth's orbital eccentricity and axial tilt), both sidereal and stellar days are perfectly constant. This is because:
- Sidereal day: Pure rotation relative to vernal equinox direction
- Stellar day: Pure rotation in inertial space (ICRF)

Neither involves tracking the Sun's position, which introduces the equation of time variation.

---

## Conclusions: What Changes and What Stays Fixed

Based on testing at years 1241-1251 (near balanced year 1246) and 1990, we can now categorize all astronomical quantities into fixed constants and time-varying values.

### Fixed Constants (No Change Across Epochs)

These values are determined by the model's fundamental constants and do not change over time:

| Quantity | Value | Determined By |
|----------|-------|---------------|
| **Sidereal day** | 86164.090517 seconds | `meansolaryearlengthinDays / (meansolaryearlengthinDays + 1) × 86400` |
| **Stellar day** | 86164.099675 seconds | `siderealDay × (1 + 1/(precessionPeriod × rotationsPerYear))` |
| **Stellar - Sidereal difference** | +9.158 ms | Precession period (HY/13 = 25,683.7 years) |
| **Mean solar day** (yearly average) | 86399.988589 seconds | `meansiderealyearlengthinSeconds / meansiderealyearlengthinDays` |
| **Sidereal year** | 365.256358 days | Orbital period in inertial frame |
| **Anomalistic year** | 365.259692 days | Perihelion-to-perihelion (HY/16 cycle) |
| **Sidereal - Tropical difference** | ~1224.5 seconds | Precession period (HY/13) |

**Why these are constant:**
- They measure pure rotations or orbital returns in inertial (ICRF) reference frames
- They don't depend on the orientation of Earth's axis or perihelion position
- They only depend on the model's fundamental orbital mechanics

### Time-Varying Values (Change Over Perihelion Cycle)

These values vary over the perihelion precession cycle (HY/16 = 20,868 years):

| Quantity | Variation Period | Cause |
|----------|------------------|-------|
| **Cardinal point tropical years** (VE, SS, AE, WS) | 20,868 years | Perihelion precession through seasons |
| **Mean tropical year** | 20,868 years (and HY) | Obliquity + eccentricity interaction |
| **Solar day longest/shortest dates** | 20,868 years | Equation of time pattern shifts with perihelion |
| **Obliquity** | 333,888 years (HY) | Full holisticyear cycle |
| **Eccentricity** | 20,868 years | Perihelion cycle (HY/16) |

### Cardinal Point Year Lengths: Current vs Shifted Perihelion

**Current pattern (perihelion in early January, ~1246 AD):**

| Cardinal Point | Year Length | Relative to Mean | Reason |
|----------------|-------------|------------------|--------|
| Summer Solstice (SS) | 365.241919 days | SHORTEST (-23s) | Aphelion in middle → fast orbital speed |
| Vernal Equinox (VE) | 365.242184 days | Medium (-0.5s) | Transition period |
| Autumnal Equinox (AE) | 365.242184 days | Medium (-0.5s) | Transition period |
| Winter Solstice (WS) | 365.242455 days | LONGEST (+23s) | Perihelion in middle → slow orbital speed |

**Pattern when perihelion shifts to July (~11,680 AD, half-cycle later):**

The pattern will reverse:
- SS will become LONGEST (perihelion in middle)
- WS will become SHORTEST (aphelion in middle)

### Equation of Time: Date Shift Over Time

The dates of longest and shortest solar days shift with perihelion precession:

| Year | Perihelion Date | Longest Solar Day | Shortest Solar Day |
|------|-----------------|-------------------|-------------------|
| 1241 | ~Jan 3 | Day 182 (early July) | Day 276 (early October) |
| 1990 | ~Jan 3 | Day 183 (early July) | Day 90 (early April) |
| ~11680 | ~July | ~Day 0 (late December) | ~Day 180 (late June) |

The equation of time pattern (±20-25s daily variation) remains the same amplitude, but the calendar dates shift.

---

## Formulas for Time-Varying Quantities

### Formula 1: Cardinal Point Tropical Year Lengths

The tropical year measured from each cardinal point depends on where perihelion falls relative to that point.

**Key insight:** When perihelion is in the middle of a cardinal-to-cardinal interval, Earth moves slowest there, making that interval LONGEST. When aphelion is in the middle, Earth moves fastest, making it SHORTEST.

```javascript
// Perihelion longitude (degrees from vernal equinox, 0-360°)
// At year 1246: perihelion ≈ 282° (early January, ~12 days after WS)
// Precesses at rate: 360° / 20868 years = 0.01725°/year

function perihelionLongitude(year) {
  const balancedYear = 1246;
  const perihelionCycle = holisticyearLength / 16;  // 20,868 years
  const perihelionAtBalanced = 282;  // degrees from VE at year 1246

  return (perihelionAtBalanced + (year - balancedYear) * 360 / perihelionCycle) % 360;
}

// Cardinal point longitudes (degrees from VE)
const VE_LONGITUDE = 0;
const SS_LONGITUDE = 90;
const AE_LONGITUDE = 180;
const WS_LONGITUDE = 270;

// Year length variation amplitude (seconds)
const CARDINAL_AMPLITUDE = 24;  // ±24 seconds from mean

function cardinalYearLength(year, cardinalLongitude) {
  const periLong = perihelionLongitude(year);

  // Distance from cardinal midpoint to perihelion
  // Midpoint of VE→SS interval is at 45°, SS→AE at 135°, etc.
  const midpoint = (cardinalLongitude + 45) % 360;

  // Angular distance to perihelion (0-180°)
  let dist = Math.abs(periLong - midpoint);
  if (dist > 180) dist = 360 - dist;

  // When perihelion is at midpoint (dist=0): longest year
  // When perihelion is opposite (dist=180): shortest year
  const variation = CARDINAL_AMPLITUDE * Math.cos(dist * Math.PI / 180);

  return meansolaryearlengthinDays + variation / 86400;
}
```

### Formula 2: Mean Tropical Year (Average of 4 Cardinal Points)

The mean tropical year varies slightly due to the interaction of obliquity and eccentricity:

```javascript
function meanTropicalYear(year) {
  const obliquity = computeObliquityEarth(year);
  const eccentricity = computeEccentricityEarth(year);

  // Base value
  const baseTropical = 365.242188998;  // meansolaryearlengthinDays

  // Variation coefficients (to be determined from regression)
  const k_obl = 0;       // Effect of obliquity deviation
  const k_ecc = 0;       // Effect of eccentricity deviation
  const k_obl_ecc = 0;   // Interaction term

  const Δobl = obliquity - 23.41398;      // earthtiltMean
  const Δecc = eccentricity - 0.015313;   // eccentricityMean

  return baseTropical + k_obl * Δobl + k_ecc * Δecc + k_obl_ecc * Δobl * Δecc;
}
```

**Note:** The coefficients k_obl, k_ecc, k_obl_ecc need to be determined by collecting data across different epochs and performing regression analysis.

### Formula 3: Equation of Time Date Shift

The calendar date of longest/shortest solar day shifts with perihelion:

```javascript
function longestSolarDayNumber(year) {
  // Day number (0 = June solstice) when solar day is longest
  // This is approximately when Earth is at aphelion

  const periLong = perihelionLongitude(year);
  const aphelionLong = (periLong + 180) % 360;

  // Convert aphelion longitude to day number from June solstice
  // SS is at 90°, so aphelion at 270° means day ~180 (December)
  const dayFromSS = ((aphelionLong - 90) / 360) * 365.24;

  return Math.round(dayFromSS);
}

function shortestSolarDayNumber(year) {
  // Approximately 90 days before longest (quarter orbit)
  // Actually depends on eccentricity and obliquity interaction
  return (longestSolarDayNumber(year) + 90) % 365;
}
```

### Formula 4: Derived Day Lengths (Already Implemented)

These formulas are already correct in the model:

```javascript
// Sidereal day (constant)
const siderealDay = meansolaryearlengthinDays / (meansolaryearlengthinDays + 1) * 86400;
// = 86164.090532 seconds

// Stellar day (constant)
const precessionPeriod = holisticyearLength / 13;  // 25,683.7 years
const rotationsPerYear = meansolaryearlengthinDays + 1;
const stellarDayFactor = 1 + 1 / (precessionPeriod * rotationsPerYear);
const stellarDay = siderealDay * stellarDayFactor;
// = 86164.099675 seconds

// Mean solar day (constant yearly average)
const meanSolarDay = meansiderealyearlengthinSeconds / meansiderealyearlengthinDays;
// = 86399.988589 seconds
```

---

### 🔄 In Progress

1. **Equinox Interval Detection Review**
   - Equinox detection exists but needs verification against solstice measurements
   - Both should yield similar tropical year values
   - Current implementation uses linear interpolation for zero-crossing

### ⏳ Pending

1. **Sample Data Collection** (Step 5)
   - Collect comprehensive data across perihelion cycle (-9188 to +11680)
   - Collect extended data for obliquity variation (-50000 to +50000)

2. **Formula Derivation** (Steps 6-7)
   - Regression analysis to determine k_obl, k_ecc coefficients
   - Update `o.lengthofsolarYear` with physics-based formula
   - Update `o.lengthofDay` derived from tropical year

3. **Validation** (Step 8)
   - Match IAU 2000 AD within 0.01 seconds
   - Match 1246 AD reference value
   - Day length = 86400 seconds at 2000 AD
   - Valid across full 333,888 year holisticyear

### ✅ Recently Completed

1. **Fixed 44ms Solar Day Measurement Bias** (January 2026)
   - Root cause identified: The original `solarNoonForJD()` used 1-minute linear sampling which introduced systematic bias
   - Additionally, `sun.ra` wraps from ~2π to ~0 once per year, breaking monotonic hour angle tracking
   - **Solution implemented:** Binary search (40 iterations, sub-microsecond precision) with cumulative RA tracking
   - The cumulative tracking handles the wrap-around by detecting large negative deltas in sun.ra and adding 2π
   - Result: Method A now matches model expected value within **0.013 milliseconds** (was +44ms before fix)

2. **Enhanced Solar Day Analysis Output** (January 2026)
   - Added Method C (fixed-frame) explanation to `analyzeSolarDay()`
   - Added comprehensive "WHY THE METHODS DIFFER" section explaining:
     - Method A: Physically correct measurement using Earth's equatorial frame
     - Method B: Mathematical cross-check deriving solar from sidereal day
     - Method C: Simulation reference (tautology confirming JD = 86400s)
   - Added explanation of the ~11ms difference between methods

3. **Sidereal Year Analysis** (January 2026)
   - `analyzeSiderealYear(start, end)` - Measures sidereal year via Sun's absolute world position angle
   - Uses `sun.planetObj.getWorldPosition()` to track when Sun returns to same ICRF position
   - Compares with IAU sidereal year (365.256363 days) and calculates sidereal-tropical difference
   - GUI button: "Analyze Sidereal Year"

4. **Day Length Measurement Functions** (January 2026)
   - `siderealNoonForJD(startJD)` - Tracks Earth rotation (360°) via `earth.planetObj.rotation.y`
   - `solarNoonForJD(startJD, debug, cumulativeState)` - Binary search with cumulative RA tracking
   - `analyzeSiderealDay(year)` - Measures sidereal day intervals over a tropical year
   - `analyzeSolarDay(year)` - Comprehensive solar day analysis with Methods A, B, and C
   - GUI buttons: "Analyze Sidereal Day", "Analyze Solar Day", "RA Rate Diagnostics"

5. **Corrected terminology** (January 2026)
   - Reverted `stellarNoonForJD()` back to `siderealNoonForJD()`
   - The model uses `tropicalYear + 1` rotations per year, which defines sidereal day (not stellar day)
   - The formula `solarDay = siderealDay × (tropicalYear + 1) / tropicalYear` requires sidereal day

6. **Stellar Day Analysis** (January 2026)
   - `analyzeStellarDay(year)` - Measures stellar day (rotation relative to fixed stars/ICRF) using three methods
   - **Method A (Rotation Angles Sum):** Tracks `earth.planetObj.rotation.y + earth.orbitObj.rotation.y`
   - **Method B (World Matrix Y-Rotation):** Extracts Y-rotation via Euler decomposition from world matrix
   - **Method C (Mathematical Derivation):** Derives from sidereal day using precession factor
   - All three methods agree: **86164.099675 seconds** (9.158ms longer than sidereal day)
   - The stellar-sidereal difference matches the model's precession period (HY/13 = 25,683.7 years)
   - GUI button: "Analyze Stellar Day"

7. **Sidereal Day Analysis Update** (January 2026)
   - Changed to run 30 days instead of full year (no daily variation exists)
   - Added derived value comparison from model constants
   - Results: Measured 86164.090517s vs Derived 86164.090532s vs IAU 86164.0905s
   - All three values agree within 0.02ms, confirming model accuracy

### Next Steps

1. **Collect sample data** at key years for formula fitting (Step 5)
2. **Derive and implement new formulas** based on collected data (Steps 6-7)
3. **Validate** formula accuracy across the holisticyear (Step 8)

---

*Document updated: January 2026 - Added conclusions section (fixed vs varying quantities), proposed formulas for cardinal point years and equation of time date shift*
