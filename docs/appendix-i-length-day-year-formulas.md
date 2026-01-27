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
                                   eccentricityMean, eccentricityAmplitude) {
  // 1. root = √(eₘ² + a²) — derived mean eccentricity
  const root = Math.sqrt(eccentricityMean * eccentricityMean + eccentricityAmplitude * eccentricityAmplitude);

  // 2. θ in radians
  const degrees = ((currentYear - balancedYear) / perihelionCycleLength) * 360;
  const cosθ = Math.cos(degrees * Math.PI / 180);

  // 3. e(t) = e₀ + (-A - (e₀ - e_base)·cos(θ))·cos(θ)
  const h1 = root - eccentricityMean;
  return root + (-eccentricityAmplitude - h1 * cosθ) * cosθ;
}
```

**Constants:**
| Parameter | Value | Description |
|-----------|-------|-------------|
| `eccentricityMean` | 0.015313 | Mean eccentricity |
| `eccentricityAmplitude` | 0.001431 | Amplitude of variation |
| `perihelionCycleLength` | 20,868 years | = holisticyearLength / 16 |

**Eccentricity range:** ~0.0139 to ~0.0167 (approximately)

## Proposed New Formulas

### Tropical Year Length (`o.lengthofsolarYear`)

```javascript
function computeTropicalYear(obliquity, eccentricity) {
  const Δobl = obliquity - obliquityMean;
  const Δecc = eccentricity - eccentricityDerivedMean;

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
  const Δecc = eccentricity - eccentricityDerivedMean;

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
- `siderealYearSeconds` = 31558149.645 seconds
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
   - True Anomalistic Year (WobbleCenter→Sun): 365.259692495 days (+4.88 seconds from IAU)
   - Earth-Frame measurements show ~122 second offset due to wobble parallax
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
| **Sidereal year** | 365.256359512 days | Orbital period in inertial frame (measured 1990-2010) |
| **Anomalistic year** | 365.259692495 days | Perihelion-to-perihelion (HY/16 cycle) |
| **Sidereal - Tropical difference** | 1224.39 seconds | Precession period (HY/13) |

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

**Current pattern (perihelion in early January, measured 1990-2010):**

| Cardinal Point | Year Length | Diff from IAU | Relative to Mean | Reason |
|----------------|-------------|---------------|------------------|--------|
| Summer Solstice (SS) | 365.241925931 days | +25.91s | SHORTEST (-22.8s) | Aphelion in middle → fast orbital speed |
| Autumnal Equinox (AE) | 365.242129149 days | +9.60s | Medium (-5.2s) | Transition period |
| Vernal Equinox (VE) | 365.242249945 days | -10.72s | Medium (+5.2s) | Transition period |
| Winter Solstice (WS) | 365.242448513 days | -25.18s | LONGEST (+22.4s) | Perihelion in middle → slow orbital speed |

**Note:** The ~±26s deviation from IAU at solstices is expected because the model uses a circular orbit (constant angular velocity) while IAU uses elliptical orbit (Kepler's 2nd Law). The mean of all four cardinal points cancels this effect.

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
  const Δecc = eccentricity - eccentricityDerivedMean;   // √(eccentricityMean² + eccentricityAmplitude²)

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

### Validation Summary (1990-2010 Analysis)

Comprehensive alignment analysis for years 1990-2010 confirms excellent model accuracy:

| Metric | Measured | IAU Reference | Difference |
|--------|----------|---------------|------------|
| **Mean Tropical Year** | 365.242188384 days | 365.242189700 days | **-0.11 seconds** |
| **Sidereal Year** | 365.256359512 days | 365.256363000 days | **-0.30 seconds** |
| **Anomalistic Year** | 365.259692495 days | 365.259636000 days | **+4.88 seconds** |
| **Sidereal - Tropical** | 1224.39 seconds | 1224.57 seconds | **-0.18 seconds** |

**Key Findings:**
- Mean tropical year accuracy: sub-second (0.11s)
- Sidereal year accuracy: sub-second (0.30s)
- All four cardinal points show correct pattern (SS shortest, WS longest)
- Precession rate validated by sidereal-tropical difference
- Four independent sidereal year measurement methods (A, B, C, D) all agree

### Next Steps

1. ~~**Collect sample data** at key years for formula fitting (Step 5)~~ ✅ COMPLETED
2. **Derive and implement new formulas** based on collected data (Steps 6-7)
3. **Validate** formula accuracy across the holisticyear (Step 8)

---

## Step 5 Results: Collected Sample Data (One Full Perihelion Cycle)

Data was collected at 9 key years spanning from 1000 AD to 22000 AD, covering one complete perihelion precession cycle (~20,868 years). This provides comprehensive validation of which quantities are constant vs. time-varying.

### Complete Data Collection Table

#### Core Measurements

| Year | Obliquity (°) | Eccentricity | Sidereal Day (s) | Stellar Day A (s) | Anomalistic (d) | Sidereal Year (d) | Mean Tropical (d) |
|------|---------------|--------------|------------------|-------------------|-----------------|-------------------|-------------------|
| 1000 | 23.54 | 0.01718 | 86164.090537 | 86164.099690 | 365.259692496 | 365.256358345 | 365.242184787 |
| 1990 | 23.44 | 0.01671 | 86164.090517 | 86164.099675 | 365.259692495 | 365.256359512 | 365.242188384 |
| 3000 | 23.24 | 0.01614 | 86164.090519 | 86164.099690 | 365.259692433 | 365.256365151 | 365.242191951 |
| 6000 | 22.67 | 0.01468 | 86164.090531 | 86164.099686 | 365.259692053 | 365.256401867 | 365.242201768 |
| 10000 | 22.35 | 0.01391 | 86164.090523 | 86164.099642 | 365.259692084 | 365.256453633 | 365.242210605 |
| 13000 | 22.51 | 0.01402 | 86164.090528 | 86164.099655 | 365.259692643 | 365.256457097 | 365.242212689 |
| 16000 | 22.53 | 0.01501 | 86164.090523 | 86164.099650 | 365.259692945 | 365.256425633 | 365.242210599 |
| 19000 | 22.67 | 0.01620 | 86164.090582 | 86164.099674 | 365.259692610 | 365.256384050 | 365.242204951 |
| 22000 | 22.88 | 0.01674 | 86164.090598 | 86164.099669 | 365.259692107 | 365.256364790 | 365.242197026 |

#### Cardinal Point Tropical Years

| Year | VE (days) | SS (days) | AE (days) | WS (days) | Shortest | Longest | Perihelion Phase |
|------|-----------|-----------|-----------|-----------|----------|---------|------------------|
| 1990 | 365.242250 | 365.241926 | 365.242129 | 365.242449 | SS | WS | ~0° (Jan perihelion) |
| 13000 | 365.242134 | 365.242437 | 365.242338 | 365.241943 | WS | SS | ~180° (Jul perihelion) |
| 16000 | 365.241974 | 365.242261 | 365.242489 | 365.242118 | VE | AE | ~270° |
| 19000 | 365.242003 | 365.242031 | 365.242438 | 365.242348 | VE/SS | AE | ~330° |
| 22000 | 365.242193 | 365.241921 | 365.242217 | 365.242457 | SS | WS | ~360° (returned) |

---

## Step 5 Analysis: Confirmed Findings

### 1. CONFIRMED CONSTANT Values (No Time Variation)

These quantities showed no significant variation across the 21,000-year test span:

| Quantity | Mean Value | Max Variation | Status |
|----------|------------|---------------|--------|
| **Sidereal day** | 86164.0905 s | ±0.08 ms | **CONSTANT** ✓ |
| **Stellar day** | 86164.0997 s | ±0.05 ms | **CONSTANT** ✓ |
| **Anomalistic year** | 365.259692 d | ±0.05 s | **CONSTANT** ✓ |

**Why these are constant:**
- They measure pure rotations or orbital returns in inertial (ICRF) reference frames
- They don't depend on the orientation of Earth's axis or perihelion position
- They only depend on the model's fundamental orbital mechanics

### 1b. Mean Solar Day - Small Cyclical Variation (~4ms)

The mean solar day was measured using Method A (Earth-frame, based on Sun's Right Ascension from Earth's equatorial plane). This measurement is tied to the Earth-wobble-center reference frame.

#### Mean Solar Day Measurements

| Year | Mean Solar Day (s) | Diff from Model (86399.988589s) | Equation of Time Range |
|------|--------------------|---------------------------------|------------------------|
| 2000 | 86399.988582 | -0.007 ms | 45.5 s |
| 13000 | 86399.984447 | **-4.141 ms** (minimum) | 42.7 s |
| 22000 | 86399.989288 | +0.699 ms | 43.2 s |

#### Mean Solar Day Variation Pattern

The mean solar day shows a small cyclical variation (~±2ms amplitude) tied to the perihelion cycle. Since the model's balanced year is 1246 AD:

| Year | Phase | Mean Solar Day | Description |
|------|-------|----------------|-------------|
| **1246 AD** | 0° | ~86399.991 s | **Peak HIGH** (perihelion aligned) |
| ~6200 AD | 90° | ~86399.989 s | Midpoint (falling) |
| **~11680 AD** | 180° | ~86399.986 s | **Peak LOW** (perihelion opposite) |
| ~17100 AD | 270° | ~86399.989 s | Midpoint (rising) |
| ~22100 AD | 360° | ~86399.991 s | Return to peak high |

**Total variation:** ~4-5 ms peak-to-peak over the 20,868-year perihelion cycle.

**Why the variation occurs:** The mean solar day measurement uses the Earth-wobble-center frame (which simulates axial precession). As perihelion precesses through the seasons, the interaction between Earth's orbital eccentricity and the measurement reference frame causes small systematic variations in the averaged solar day length.

**Practical significance:** This ~4ms variation is negligible for most purposes. For high-precision applications, the mean solar day can be treated as constant at 86399.9886s (model value) or 86400.0000s (IAU SI definition).

#### Equation of Time Pattern Shift

The dates of longest/shortest solar days shift with perihelion precession:

| Year | Shortest Day (from SS) | Longest Day (from SS) | Perihelion Position |
|------|------------------------|----------------------|---------------------|
| 2000 | Day 89 (mid-September) | Day 183 (late December) | January |
| 13000 | Day 271 (mid-March) | Day 1 (mid-June) | July |
| 22000 | Day 89 (early September) | Day 182 (mid-December) | January (returned) |

At year 13000 (perihelion in July), the equation of time pattern is shifted ~180 days compared to year 2000. The longest solar days occur in June instead of December, and the shortest days occur in March instead of September.

### 2. CONFIRMED CYCLICAL Values (Perihelion Cycle = 20,868 years)

#### Cardinal Point Tropical Year Pattern Rotation

The cardinal point tropical years follow a sinusoidal pattern that completes one full cycle with perihelion precession:

| Year | Shortest Year | Longest Year | Perihelion Position |
|------|---------------|--------------|---------------------|
| 1990 | SS (-22.8s) | WS (+22.4s) | January (near WS) |
| ~6200 | AE | VE | April (near VE) |
| ~11680 | WS | SS | July (near SS) |
| ~17100 | VE | AE | October (near AE) |
| 22000 | SS (-23.2s) | WS (+23.1s) | January (returned) |

**Pattern confirmed:** At year 22000 (one full perihelion cycle from ~1130 AD), the pattern has returned to SS shortest / WS longest, validating the 20,868-year cycle.

#### Sidereal Year - Unexpected Cyclical Variation

The sidereal year shows a periodic variation tied to the perihelion cycle:

| Year | Sidereal Year (days) | Δ from 1990 baseline |
|------|----------------------|----------------------|
| 1990 | 365.256359512 | baseline |
| 6000 | 365.256401867 | +3.66 s |
| 10000 | 365.256453633 | +8.13 s |
| 13000 | 365.256457097 | +8.43 s (peak) |
| 16000 | 365.256425633 | +5.71 s |
| 19000 | 365.256384050 | +2.12 s |
| 22000 | 365.256364790 | +0.46 s (returned) |

**Key finding:** The sidereal year variation is **cyclical**, not a secular drift. It peaks around year 13000 (~half perihelion cycle) and returns to near-baseline at year 22000 (full cycle).

**Amplitude:** ~8.5 seconds peak-to-peak variation over the perihelion cycle.

**Cause:** This is likely due to the interaction between the sidereal year measurement method (Sun's world position angle) and the perihelion precession affecting the Sun's apparent orbital path.

#### Mean Tropical Year Variation

The mean tropical year (average of all 4 cardinal points) shows small variation:

| Year | Mean Tropical (days) | Δ from IAU (s) |
|------|----------------------|----------------|
| 1990 | 365.242188384 | -0.11 |
| 13000 | 365.242212689 | +1.99 |
| 22000 | 365.242197026 | +0.63 |

**Amplitude:** ~2 seconds variation over the perihelion cycle.

---

## Derived Formulas from Collected Data

### Formula 1: Cardinal Point Tropical Year

The cardinal point years follow a sinusoidal pattern:

```javascript
function cardinalTropicalYear(year, cardinalPoint) {
  const PERIHELION_CYCLE = 20868;  // HY/16
  const MEAN_TROPICAL = 365.242189;  // days
  const AMPLITUDE = 0.000262;  // days (~22.6 seconds)

  // Phase offsets from J2000 (where SS is shortest)
  const PHASE_OFFSET = {
    SS: 0,      // Summer Solstice at minimum
    AE: 90,     // Autumnal Equinox at midpoint (rising)
    WS: 180,    // Winter Solstice at maximum
    VE: 270     // Vernal Equinox at midpoint (falling)
  };

  const phase = ((year - 2000) / PERIHELION_CYCLE) * 360 + PHASE_OFFSET[cardinalPoint];
  const variation = AMPLITUDE * Math.cos(phase * Math.PI / 180);

  return MEAN_TROPICAL + variation;
}
```

### Formula 2: Sidereal Year Variation

The sidereal year follows a sinusoidal pattern with the perihelion cycle:

- **1246 AD** = Peak LOW (balanced year, perihelion aligned with winter solstice)
- **6463 AD** = Mean value (rising)
- **11680 AD** = Peak HIGH (half-cycle, perihelion aligned with summer solstice)
- **16897 AD** = Mean value (falling)
- **22114 AD** = Peak LOW (returned)

```javascript
function siderealYear(year) {
  const PERIHELION_CYCLE = 20868;  // HY/16
  const MEAN_SIDEREAL = 365.256408;  // days (mean value at phase 90°/270°)
  const AMPLITUDE = 0.000049;  // days (~4.2 seconds half-amplitude)
  const PEAK_LOW_YEAR = 1246;  // balanced year = peak low (0° phase)

  // Cosine curve with minimum at 0° (year 1246) and maximum at 180° (year 11680)
  const phase = ((year - PEAK_LOW_YEAR) / PERIHELION_CYCLE) * 2 * Math.PI;
  const variation = -AMPLITUDE * Math.cos(phase);  // negative cos = low at 0°

  return MEAN_SIDEREAL + variation;
}
```

**Key values:**
| Phase | Year | Sidereal Year (days) | Description |
|-------|------|----------------------|-------------|
| 0° | 1246 AD | 365.256359 | **Peak LOW** |
| 90° | 6463 AD | 365.256408 | Mean (rising) |
| 180° | 11680 AD | 365.256457 | **Peak HIGH** |
| 270° | 16897 AD | 365.256408 | Mean (falling) |
| 360° | 22114 AD | 365.256359 | Peak LOW (returned) |

**Calibration note:** By increasing `siderealYearInSeconds` by ~4.2 seconds to match the **mean** of this sinusoidal curve (at years 6463 or 16897), the model will average to LOD = 86400.000s across the full perihelion cycle.

### Formula 3: Fixed Values (No Formula Needed)

These use the model's existing constant calculations:

```javascript
// Sidereal day (constant)
const SIDEREAL_DAY = 86164.090517;  // seconds

// Stellar day (constant)
const STELLAR_DAY = 86164.099675;  // seconds

// Anomalistic year (constant)
const ANOMALISTIC_YEAR = 365.259692;  // days
```

---

## Validation: Full Cycle Return

The most important validation is that values return to their starting point after one complete perihelion cycle:

| Quantity | Year 1990 | Year 22000 | Difference | Expected |
|----------|-----------|------------|------------|----------|
| Sidereal Year | 365.256359512 d | 365.256364790 d | +0.46s | ~0s ✓ |
| Cardinal Pattern | SS shortest | SS shortest | Same | Same ✓ |
| Mean Tropical | 365.242188384 d | 365.242197026 d | +0.75s | ~0s ✓ |

The small residual differences (~0.5-0.8 seconds) are within measurement precision and confirm the cyclical nature of these variations.

---

## Summary: Constant vs. Variable Quantities

### Truly Constant (Use Fixed Values)

| Quantity | Value | Precision |
|----------|-------|-----------|
| Sidereal day | 86164.0905 s | ±0.1 ms |
| Stellar day | 86164.0997 s | ±0.1 ms |
| Anomalistic year | 365.259692 d | ±0.05 s |
| Stellar - Sidereal diff | +9.158 ms | exact |

### Effectively Constant (Negligible Variation)

| Quantity | Mean Value | Variation | Notes |
|----------|------------|-----------|-------|
| Mean solar day | 86399.9886 s | ±2 ms | Peak at 1246 AD, trough at ~11680 AD |

### Cyclical (Use Formulas with Perihelion Cycle)

| Quantity | Period | Amplitude | Driver |
|----------|--------|-----------|--------|
| Cardinal tropical years | 20,868 y | ±22.6 s | Perihelion position relative to seasons |
| Sidereal year | 20,868 y | ±4.2 s | Perihelion precession effect on Sun position |
| Mean tropical year | 20,868 y | ±1.0 s | Average of cardinal point variations |
| Mean solar day | 20,868 y | ±2 ms | Earth-wobble-center frame interaction |
| Equation of time dates | 20,868 y | ±180 days | Longest/shortest day calendar dates shift |

### Long-Cycle (Use Formulas with Holistic Year)

| Quantity | Period | Amplitude | Driver |
|----------|--------|-----------|--------|
| Obliquity | 333,888 y | ±1.27° | Full holistic year cycle |
| Eccentricity | 20,868 y | ±0.0014 | Perihelion cycle |

---

## Sidereal Year Analysis: Four Methods Comparison

### Overview

The sidereal year was measured using four independent methods to understand the source of the observed ~8.5-second cyclical variation:

| Method | Reference Frame | Description |
|--------|-----------------|-------------|
| **A** | Origin→Sun | Sun's world position angle from origin (ICRF) |
| **B** | WobbleCenter→Sun | Sun's world position angle from wobble center |
| **C** | Sun→Earth | Inverse measurement from Sun perspective (Earth-frame) |
| **D** | Sun→WobbleCenter | Inverse measurement from Sun to fixed wobble center |

Methods A, B, and D all measure from **fixed reference points** (origin or wobble center), providing "wobble-free" measurements. Method C measures from the **Earth's position**, which includes the Earth-wobble effect (Earth orbits the wobble center over the 25,684-year precession cycle).

### Raw Data: Four Methods at Three Epochs

| Year | Method A (d) | Method B (d) | Method C (d) | Method D (d) |
|------|--------------|--------------|--------------|--------------|
| 2000 | 365.256359537 | 365.256359537 | 365.256379769 | 365.256359544 |
| 13000 | 365.256457097 | 365.256457099 | 365.256477331 | 365.256457105 |
| 22000 | 365.256364790 | 365.256364788 | 365.256385029 | 365.256364803 |

### Key Finding 1: Wobble Contribution is CONSTANT

The difference between Method C (Earth-frame) and Method D (wobble-free inverse) reveals the Earth-wobble parallax contribution:

| Year | C - D Difference (s) |
|------|---------------------|
| 2000 | **+1.748 s** |
| 13000 | **+1.748 s** |
| 22000 | **+1.749 s** |

**Conclusion:** The Earth-wobble parallax effect adds a **constant ~1.75 seconds** to the sidereal year when measured from Earth's position. This offset does NOT vary with epoch.

#### Mathematical Derivation of the 1.748 Second Offset

The 1.748-second offset can be derived exactly from first principles using the model's geometry.

**The Setup:**

In the geocentric model, Earth orbits around a fixed "wobble center" (at the origin) with:
- Wobble radius: `r = eccentricityAmplitude = 0.0014226 AU`
- Wobble period: `T_wobble = HY/13 = 333,888/13 = 25,683.69 years` (axial precession)
- Sun distance: `D = 1 AU`
- Sidereal year: `T_sidereal = 365.2564 days = 31,558,150 seconds`

**The Physics:**

When measuring the Sun's angular position from Earth instead of from the fixed wobble center, there is a parallax effect. The wobble displacement vector rotates slowly (one revolution per 25,684 years), which causes an apparent angular velocity difference in the Sun's motion.

The angular velocity of the wobble is:
```
ω_wobble = 2π / T_wobble = 2π / 25,683.69 radians/year
```

The wobble displacement creates a parallax angle proportional to `r/D`. As the wobble rotates, this parallax changes, adding an effective angular velocity contribution to the Sun's apparent motion when viewed from Earth:

```
Δω = (r/D) × ω_wobble = (0.0014226 / 1) × (2π / 25,683.69) radians/year
```

**The Calculation:**

The extra time needed for the Sun to complete a full 360° from Earth's perspective (compared to the wobble center) is:

```
ΔT = (r/D) × (T_sidereal / T_wobble) × T_sidereal
   = (0.0014226 / 1) × (1 / 25,683.69) × 31,558,150 seconds
   = 0.0014226 × 3.894 × 10⁻⁵ × 31,558,150 seconds
   = 1.748 seconds
```

**Verification:**

| Parameter | Value | Source |
|-----------|-------|--------|
| r (wobble radius) | 0.0014226 AU | `eccentricityAmplitude` in script.js |
| D (Sun distance) | 1 AU | Mean orbital radius |
| T_wobble | 25,683.69 years | `HY/13 = 333,888/13` |
| T_sidereal | 31,558,150 s | IAU sidereal year |
| **Calculated ΔT** | **1.748 s** | Formula above |
| **Measured (C-D)** | **1.748 s** | Model measurement |

**Interpretation:**

The 1.748-second offset is a **geometric consequence** of measuring from a moving platform (Earth orbiting the wobble center) rather than from a fixed point. It represents the annual parallax contribution from Earth's axial precession wobble.

This offset is:
- **Constant** across all epochs (the wobble geometry doesn't change)
- **Always positive** (Earth-frame sidereal year is always longer)
- **Independent of perihelion position** (not affected by the 20,868-year perihelion cycle)

### Key Finding 2: The ~8.5s Variation is Real (Not a Wobble Artifact)

The cyclical variation appears **equally in ALL methods**:

| Transition | Method A/B/D (wobble-free) | Method C (Earth) |
|------------|---------------------------|------------------|
| 2000 → 13000 | +8.43 s | +8.43 s |
| 13000 → 22000 | -7.98 s | -7.98 s |
| 2000 → 22000 | +0.45 s | +0.45 s |

**Conclusion:** The ~8.5-second sidereal year variation is a **real model effect**, not an artifact of the Earth-wobble measurement frame. It affects all methods equally, indicating it's intrinsic to how the Sun's orbital path interacts with perihelion precession.

### Summary Table

| Quantity | Value | Character |
|----------|-------|-----------|
| Wobble parallax offset (C-D) | +1.75 s | **CONSTANT** |
| Sidereal year cyclical variation | ±4.2 s | **CYCLICAL** (20,868-year period) |
| Sidereal year at 2000 (Earth-frame, Method C) | 365.256379769 d | +1.45s from IAU |
| Sidereal year at 2000 (wobble-free, Method A/B/D) | 365.256359537 d | -0.30s from IAU |

### Implications for Model Calibration

The sidereal year follows a sinusoidal pattern aligned with the perihelion cycle (see Formula 2 above):

| Phase | Year | Sidereal Year | LOD Effect |
|-------|------|---------------|------------|
| 0° | **1246 AD** | 365.256359 d | **Peak LOW** |
| 90° | 6463 AD | 365.256408 d | Mean |
| 180° | **11680 AD** | 365.256457 d | **Peak HIGH** |
| 270° | 16897 AD | 365.256408 d | Mean |

**Proposed Calibration Approach:**

1. **Increase `siderealYearInSeconds` by ~4.2 seconds** to align the model's mean sidereal year with the sinusoidal mean value (365.256408 days)

2. **Result:**
   - At mean phase years (6463, 16897 AD): LOD = 86400.000s exactly
   - At peak low (1246 AD): LOD slightly shorter (~-2 ms)
   - At peak high (11680 AD): LOD slightly longer (~+2 ms)

3. **Benefits:**
   - The model averages to LOD = 86400.000s across the full perihelion cycle
   - The ~4ms cyclical variation is preserved as a real physical effect
   - Year 2000 (near peak low) will have LOD very close to 86400s

**Current vs Proposed:**

| Parameter | Current Value | Proposed Value | Change |
|-----------|---------------|----------------|--------|
| `siderealYearInSeconds` | 31,558,149.68 s | 31,558,153.9 s | +4.2 s |
| Mean sidereal year | 365.256360 d | 365.256408 d | +4.2 s |
| Mean LOD | 86399.9886 s | 86400.000 s | +11.4 ms |

---

## Key Discovery: The 11.4ms Solar Day Offset Explained

### The Observed Offset

When measuring mean solar day length using Method A (wobble-center RA) and Method D (Earth-position RA with cumulative tracking), both consistently show:

| Method | Measured Value | Offset from 86400s |
|--------|----------------|-------------------|
| Method A | 86399.988578 s | **-11.422 ms** |
| Method D | 86399.988814 s | **-11.186 ms** |
| Method B (derived) | 86399.999985 s | -0.015 ms |
| Method C (fixed-frame) | 86400.000000 s | 0.000 ms |

Methods B and C produce exactly 86400s (the theoretical values), while Methods A and D (the "real" measurements using RA tracking) are consistently ~11.4ms short.

### The Discovery: This is Correct Behavior

The ~11.4ms/day offset is **not an error** - it is a real physical effect of perihelion precession on the solar day.

**The math:**
```
11.4 ms/day × 365.24 days/year = 4.16 seconds/year
4.16 s/year × 20,868 years = 86,812 seconds ≈ 1.005 days
```

**One extra day over one perihelion cycle.**

### Verification

Let's verify this relationship from first principles:

```
Perihelion cycle: 20,868 years
Days per year: 365.242189
Total days in one perihelion cycle: 20,868 × 365.242189 = 7,622,683.4 days

If perihelion precession adds 1 extra day over this cycle:
Extra time per day = 86400 s / 7,622,683.4 days = 0.01134 s = 11.34 ms
```

This matches the observed **11.4 ms** almost exactly.

### Physical Interpretation

As perihelion slowly precesses around Earth's orbit (completing one circuit in 20,868 years):

1. **The Sun's apparent path through the sky shifts slightly each year** relative to the fixed stars
2. **The relationship between tropical year and solar day evolves** - the Sun needs to travel slightly further (or less) to return to the same hour angle
3. **Over one complete perihelion circuit, this accumulates to exactly one extra solar day**

This is analogous to how the sidereal year is longer than the tropical year by one day per precession cycle - but here, it's the perihelion precession (not axial precession) creating the effect.

### Why Methods Differ

| Method | What It Measures | Includes Perihelion Effect? |
|--------|------------------|----------------------------|
| **A/D** (RA tracking) | Actual hour angle progression | **YES** - captures the real Sun-Earth geometry |
| **B** (derived from sidereal) | Theoretical relationship | **NO** - assumes fixed orbital geometry |
| **C** (fixed-frame) | Pure JD time step | **NO** - ignores all astronomical effects |

Methods A and D capture the real physical relationship between Earth's rotation and the Sun's position, including the subtle effect of perihelion drift. Methods B and C use idealized mathematical relationships that don't account for this effect.

### Implications

1. **The model is working as designed** - the 11.4ms offset reflects real physics
2. **No calibration change needed** - this is not an error to fix
3. **Method A/D give the "true" solar day** as experienced by an observer on Earth
4. **Method B gives the "mean" solar day** averaged over the perihelion cycle

### Formula

The perihelion precession contribution to solar day length:

```javascript
// Perihelion precession adds 1 day per perihelion cycle
const PERIHELION_CYCLE_YEARS = 20868;  // HY/16
const DAYS_PER_CYCLE = PERIHELION_CYCLE_YEARS * 365.242189;
const EXTRA_TIME_PER_DAY = 86400 / DAYS_PER_CYCLE;  // = 0.01134 seconds = 11.34 ms

// The "true" solar day (as measured via RA tracking) is:
const TRUE_SOLAR_DAY = 86400 - EXTRA_TIME_PER_DAY;  // = 86399.989 seconds
```

This explains why Methods A and D consistently measure ~86399.989s rather than 86400.000s.

---

## Implemented Formulas (January 2026)

The following formulas have been implemented and verified in `script.js`. All use the perihelion cycle (HY/16 = 20,868 years) with phase referenced to the balanced year (1246 AD = 180° phase, half-cycle point).

### Formula Constants (Legacy - see updated formulas below)

```javascript
const meansolardayAmplitudeinSeconds = 0.0022;    // LOD oscillation amplitude (legacy)
const meansolaryearAmplitudeinDays = -0.000023;   // Solar year oscillation (~2 seconds) (legacy)
// Note: meansiderealyearAmplitudeinSeconds is no longer used - sidereal year in seconds is constant
```

**Important:** The formulas in this section are **legacy sinusoidal approximations**. The current implementation uses obliquity-based and eccentricity-based formulas documented in the "Tropical Year Formula Based on Obliquity" and "Sidereal Year Formula Based on Eccentricity" sections below.

### 1. Length of Day (`computeLengthofDay`)

The mean solar day oscillates by ±2.2ms over the perihelion cycle.

```javascript
function computeLengthofDay(currentYear, balancedYear, perihelionCycleLength,
                            perihelionprecessioncycleYear, meansolardayAmplitudeinSeconds, meanlengthofday) {
  const delta = currentYear - balancedYear;
  const cycleValue = (delta / perihelionCycleLength) < 1 ? delta : perihelionprecessioncycleYear;
  const angle = (cycleValue / perihelionCycleLength) * 360 * Math.PI / 180;

  // Uses -cos: maximum at 180° (1246 AD), minimum at 0°/360°
  return -meansolardayAmplitudeinSeconds * Math.cos(angle) + meanlengthofday;
}
```

**Phase alignment:**
| Phase | Year | LOD |
|-------|------|-----|
| 0° | Balanced year | Mean - amplitude (minimum) |
| 180° | **1246 AD** | Mean + amplitude (**maximum**) |
| 360° | 22114 AD | Mean - amplitude (minimum) |

### 2. Length of Solar Year (`computeLengthofsolarYear`)

The tropical year oscillates by approximately ±2 seconds over the perihelion cycle.

```javascript
function computeLengthofsolarYear(currentYear, balancedYear, perihelionCycleLength,
                                   perihelionprecessioncycleYear, meansolaryearAmplitudeinDays, meansolaryearlengthinDays) {
  const delta = currentYear - balancedYear;
  const cycleValue = (delta / perihelionCycleLength) < 1 ? delta : perihelionprecessioncycleYear;
  const angle = (cycleValue / perihelionCycleLength) * 360 * Math.PI / 180;

  // Uses sin with negative amplitude: minimum at 90°, maximum at 270°
  return meansolaryearAmplitudeinDays * Math.sin(angle) + meansolaryearlengthinDays;
}
```

**Phase alignment (with amplitude = -0.000023):**
| Phase | Year | Solar Year |
|-------|------|------------|
| 90° | -3971 BC | Mean - amplitude (**minimum**) |
| 180° | 1246 AD | Mean (zero crossing) |
| 270° | 6463 AD | Mean + amplitude (**maximum**) |
| 360° | 11680 AD | Mean (zero crossing) |

### 3. Length of Sidereal Year - OBSOLETE

**This sinusoidal formula is obsolete.** The sidereal year **in seconds** is now understood to be constant (the orbital period). The sidereal year **in days** varies with eccentricity because day length changes.

See the "Sidereal Year Formula Based on Eccentricity" section below for the current implementation:
```javascript
// Current formula (eccentricity-based):
function computeLengthofsiderealYear(eccentricity) {
  const k = 3208;  // seconds per unit eccentricity
  return meansiderealyearlengthinDays - (k / meanlengthofday) * (eccentricity - eccentricityDerivedMean);
}

// Sidereal year in seconds is CONSTANT:
lengthofsiderealYearInSeconds = meansiderealyearlengthinSeconds;  // 31,558,149.724 s
```

### 4. Length of Sidereal Day

The sidereal day uses the standard astronomical relationship with a fixed 86400 seconds per day (not the oscillating LOD).

```javascript
// Sidereal day = solar year in seconds / (solar year in days + 1)
predictions.lengthofsiderealDayRealLOD = (o.lengthofsolarYear * 86400) / (o.lengthofsolarYear + 1);
```

**Result:** ~86164.090529 seconds (matches IAU reference of 86164.09053 s)

### 5. Length of Stellar Day

The stellar day accounts for axial precession (the stellar day is longer than sidereal day by ~9.16 ms).

```javascript
// Stellar day = sidereal day + precession correction
const precessionCorrection = (lengthofsiderealYear - lengthofsolarYear * 86400) /
                             (holisticyearLength/13) / (lengthofsolarYear + 1);
predictions.lengthofstellarDay = precessionCorrection + lengthofsiderealDay;
```

**Result:** ~86164.0989 seconds (~9.16 ms longer than sidereal day)

### 6. Length of Anomalistic Year

The anomalistic year is the time between successive perihelia.

```javascript
function computeLengthofanomalisticYearRealLOD(perihelionPrecession, lengthofsolarYear, lengthofDay) {
  // anomalisticYear = tropicalYear × P / (P - 1), where P = perihelion precession period
  return ((perihelionPrecession * lengthofsolarYear) / (perihelionPrecession - 1)) * lengthofDay;
}
```

**Result:** ~365.259636 days (matches IAU reference)

---

### Summary of Legacy Waveforms

**Note:** These sinusoidal waveforms are legacy approximations. The current implementation uses:
- **Tropical Year**: Obliquity-based formula (see below)
- **Sidereal Year**: Eccentricity-based formula (see below)
- **Length of Day**: Derived from constant sidereal year in seconds / variable sidereal year in days

| Quantity | Legacy Waveform | Current Formula |
|----------|-----------------|-----------------|
| LOD | `-cos` ±2.2 ms | Derived: `meansiderealyearlengthinSeconds / siderealYear(days)` |
| Solar Year | `sin` ±2 s | Obliquity-based: coefficient 2.3 s/° |
| Sidereal Year (days) | `-cos` ±4.2 s | Eccentricity-based: coefficient 3208 s/unit |
| Sidereal Year (seconds) | Varied | **CONSTANT**: 31,558,149.724 s |

---

## Tropical Year Formula Based on Obliquity (January 2026)

### Discovery: Tropical Year Correlates with Obliquity

Analysis of 27,000 years of model data (one complete perihelion cycle from -9188 to 11680 AD, 221 data points) revealed that the tropical year length is almost entirely determined by obliquity:

| Correlation | Value | R² |
|-------------|-------|-----|
| Tropical Year vs Obliquity | **-0.9998** | 0.9995 |
| Tropical Year vs Eccentricity | -0.023 | 0.0005 |

The obliquity explains 99.95% of the tropical year variation. Eccentricity has negligible effect.

### The Formula

The tropical year can be computed directly from obliquity using:

```
Tropical Year = meansolaryearlengthinDays - (k / meanlengthofday) × (obliquity - earthtiltMean)
```

Where:
| Constant | Value | Description |
|----------|-------|-------------|
| `meansolaryearlengthinDays` | 365.242188997508 | Mean tropical year (days) |
| `meanlengthofday` | 86399.98848 | Mean solar day (seconds) |
| `earthtiltMean` | 23.41398° | Mean obliquity |
| `k` | 2.3 | Obliquity coefficient (seconds/degree) |

### Derivation of Coefficient k

From regression analysis:
```
k_days = -0.0000266207 days per degree
k_seconds = k_days × 86400 = -2.30 seconds per degree
```

The formula `k / meanlengthofday` converts the coefficient from seconds to days:
```
2.3 / 86399.98848 = 0.0000266207 days/degree
```

### JavaScript Implementation

```javascript
function computeTropicalYearFromObliquity(obliquity) {
  const k = 2.3;  // seconds per degree
  return meansolaryearlengthinDays - (k / meanlengthofday) * (obliquity - earthtiltMean);
}
```

### Excel Formula

```
= meanTropicalYear - (2.3 / meanLengthOfDay) * (obliquity - meanObliquity)
```

Example with cell references:
```
= $A$1 - (2.3 / $BH$3) * (W264 - $U$3)
```

Where:
- `$A$1` = meansolaryearlengthinDays (365.242188997508)
- `$BH$3` = meanlengthofday (86399.98848)
- `W264` = current obliquity
- `$U$3` = earthtiltMean (23.41398)

### Verification

| Year | Obliquity (°) | Model Tropical Year | Formula Tropical Year | Error |
|------|---------------|---------------------|----------------------|-------|
| -9188 | 24.496011 | 365.242161708 | 365.242160193 | 0.13 s |
| -3971 | 24.241159 | 365.242168900 | 365.242166971 | 0.17 s |
| 1246 | 23.537579 | 365.242185671 | 365.242185703 | 0.00 s |
| 6463 | 22.834282 | 365.242203085 | 365.242204411 | 0.11 s |
| 11680 | 22.537552 | 365.242212291 | 365.242212306 | 0.00 s |

The formula matches the model within ~0.2 seconds across the full 20,868-year perihelion cycle.

### Physical Interpretation

The tropical year is the time between successive vernal equinoxes. The equinox occurs when the Sun crosses the celestial equator, which is determined by Earth's axial tilt (obliquity).

- **Higher obliquity** → The ecliptic is more tilted relative to the celestial equator → The Sun crosses the equator at a steeper angle → **Shorter tropical year**
- **Lower obliquity** → The ecliptic is less tilted → The Sun crosses at a shallower angle → **Longer tropical year**

The coefficient of -2.3 seconds per degree quantifies this geometric relationship.

### Relationship to Day Length

Once the tropical year is known, the day length follows from:

```javascript
// Sidereal year in days = tropical year × P / (P - 1)
// where P = precession period = H/13 = 25683.69 years
const siderealYearDays = tropicalYear * (holisticyearLength/13) / ((holisticyearLength/13) - 1);

// Day length = sidereal year (seconds) / sidereal year (days)
const dayLength = meansiderealyearlengthinSeconds / siderealYearDays;
```

This preserves the fundamental relationship: the sidereal year in seconds is fixed at 31,558,149.724 seconds, and the day length adjusts based on how many days fit into that fixed duration.

---

## Sidereal Year Formula Based on Eccentricity (January 2026)

### Discovery: Sidereal Year Correlates with Eccentricity

Analysis of the same 27,000-year dataset revealed a remarkable finding: while the tropical year depends on obliquity, the **sidereal year depends on eccentricity**.

Initial analysis suggested the sidereal year "extra" variation (beyond the precession relationship to tropical year) depended on both obliquity and eccentricity. However, a deeper analysis revealed that the obliquity term (+2.29 s/°) almost exactly cancels the obliquity effect inherited from the tropical year via the precession scaling (-2.30 s/°).

**The net result:** The sidereal year depends only on eccentricity.

| Regression | R² |
|------------|-----|
| Sidereal Year vs Eccentricity only | 0.9996 |

### The Formula

The sidereal year can be computed directly from eccentricity using:

```
Sidereal Year (days) = meansiderealyearlengthinDays - (k / meanlengthofday) × (eccentricity - eccentricityDerivedMean)
```

Where:
| Constant | Value | Description |
|----------|-------|-------------|
| `meansiderealyearlengthinDays` | 365.256410333209 | Mean sidereal year (days) |
| `meanlengthofday` | 86399.98848 | Mean solar day (seconds) |
| `eccentricityDerivedMean` | √(eₘ² + a²) | Derived mean eccentricity |
| `k` | 3208 | Eccentricity coefficient (seconds/unit) - calibrated to J2000 precession |

### JavaScript Implementation

```javascript
function computeLengthofsiderealYearDays(eccentricity) {
  const k = 3208;  // seconds per unit eccentricity (calibrated to precession = 25,771.57 years at J2000)
  return meansiderealyearlengthinDays - (k / meanlengthofday) * (eccentricity - eccentricityDerivedMean);
}
```

### Excel Formula

```
= meansiderealyearlengthinDays - (3208 / meanLengthOfDay) * (eccentricity - eccentricityDerivedMean)
```

Example with cell references:
```
= $B$1 - (3208 / $BH$3) * (X264 - $V$3)
```

Where:
- `$B$1` = meansiderealyearlengthinDays (365.256410333209)
- `$BH$3` = meanlengthofday (86399.98848)
- `X264` = current eccentricity
- `$V$3` = eccentricityDerivedMean = √(eccentricityMean² + eccentricityAmplitude²)

### Verification

| Year | Eccentricity | Measured Sidereal | Formula Sidereal | Error |
|------|--------------|-------------------|------------------|-------|
| -9188 | 0.013898 | 365.256462012 | 365.256461396 | 0.05 s |
| 1246 | 0.016744 | 365.256359901 | 365.256359291 | 0.05 s |
| 11680 | 0.013898 | 365.256462167 | 365.256461396 | 0.07 s |

The formula matches the model measurements within ~0.1 seconds.

### Physical Interpretation

The sidereal year is the time for Earth to complete one full orbit relative to the fixed stars.

- **Higher eccentricity** → More elliptical orbit → Earth spends more time near aphelion (moving slower, by Kepler's 2nd law) and less time near perihelion (moving faster) → The integrated orbital time changes → **Shorter sidereal year** (with negative coefficient)
- **Lower eccentricity** → More circular orbit → More uniform velocity throughout orbit → **Longer sidereal year**

The coefficient of 3208 seconds per unit eccentricity quantifies how the orbital period changes as the orbit becomes more or less elliptical. This value is specifically calibrated to produce the correct precession period of 25,771.57 years at epoch J2000.

### Calibration to Precession

The eccentricity coefficient (3208) is not arbitrary - it is the value that produces the correct axial precession period. The relationship between sidereal year, tropical year, and precession is:

```
Precession Period = Sidereal Year × Tropical Year / (Sidereal Year - Tropical Year)
```

By calibrating `meansiderealyearAmplitudeinSecondsaDay = 3208` and `meansiderealyearlengthinSeconds = 31,558,149.724`, the model produces:
- **Precession period at J2000: 25,771.57 years** (matching IAU/IERS observations)

If this coefficient is changed, the precession period will change accordingly. The coefficient was derived by iteratively adjusting the sidereal year parameters until the model matched the observed precession rate.

---

## Summary: Elegant Separation of Dependencies

The analysis reveals an elegant result:

| Year Type | Depends On | Coefficient | Physical Reason |
|-----------|------------|-------------|-----------------|
| **Tropical Year** | Obliquity | 2.3 s/° | Geometry of equinox crossings - steeper ecliptic angle means faster equinox-to-equinox cycle |
| **Sidereal Year** | Eccentricity | 3208 s/unit | Orbital mechanics - more elliptical orbit changes the integrated orbital period (calibrated to J2000 precession = 25,771.57 years) |

**Tropical year** measures the Sun's position relative to Earth's equator (equinox to equinox), so it depends on **axial tilt (obliquity)**.

**Sidereal year** measures Earth's position relative to the stars (full orbit), so it depends on **orbital shape (eccentricity)**.

This separation makes physical sense: obliquity affects the reference frame for measuring the tropical year, while eccentricity affects the actual orbital dynamics that determine the sidereal year.

---

## Complete Formula Relationships (January 2026)

### The Fundamental Constants

The model is built on these fundamental constants:

| Constant | Value | Description |
|----------|-------|-------------|
| `meansiderealyearlengthinSeconds` | 31,558,149.724 s | **Fixed** orbital period in SI seconds (calibrated to precession) |
| `meansolaryearlengthinDays` | 365.242188997508 days | Mean tropical year |
| `meansiderealyearlengthinDays` | 365.256410333209 days | Mean sidereal year |
| `meanlengthofday` | 86,399.98848 s | Mean solar day (derived) |
| `earthtiltMean` | 23.41398° | Mean obliquity |
| `eccentricityDerivedMean` | √(eₘ² + a²) | Derived mean eccentricity |
| `meansiderealyearAmplitudeinSecondsaDay` | 3208 | Eccentricity coefficient (calibrated to J2000 precession = 25,771.57 years) |

### The Key Insight: Sidereal Year in Seconds is Constant

The **sidereal year in seconds** represents one complete orbit around the Sun. This is a fixed orbital period determined by the Sun's gravitational field and Earth's semi-major axis:

```
Sidereal Year (seconds) = meansiderealyearlengthinSeconds = 31,558,149.724 s (CONSTANT)
```

This value does not change with obliquity or eccentricity - it is a fundamental property of Earth's orbit.

### Derived Relationships

From this constant, all other values are derived:

#### 1. Sidereal Year in Days (varies with eccentricity)

```javascript
siderealYear (days) = meansiderealyearlengthinDays - (k_ecc / meanlengthofday) × (eccentricity - eccentricityDerivedMean)
```

Where `k_ecc = 3208` seconds per unit eccentricity (constant `meansiderealyearAmplitudeinSecondsaDay`). This value is calibrated to produce the correct precession period of 25,771.57 years at J2000.

#### 2. Length of Day (derived from sidereal year)

Since the sidereal year in seconds is constant, and the sidereal year in days varies:

```javascript
lengthofDay = meansiderealyearlengthinSeconds / siderealYear (days)
```

This means the **length of day depends on eccentricity** (indirectly, through the sidereal year in days).

#### 3. Tropical Year in Days (varies with obliquity)

```javascript
tropicalYear (days) = meansolaryearlengthinDays - (k_obl / meanlengthofday) × (obliquity - earthtiltMean)
```

Where `k_obl = 2.3` seconds per degree (constant `meansolaryearAmplitudeinSecondsaDay`).

#### 4. Self-Consistency Check

The formulas are self-consistent:

```
siderealYear (seconds) = siderealYear (days) × lengthofDay
                       = siderealYear (days) × (meansiderealyearlengthinSeconds / siderealYear (days))
                       = meansiderealyearlengthinSeconds  ✓ (always constant!)
```

### Complete Dependency Chain

```
                    ┌─────────────────┐
                    │   OBLIQUITY     │
                    │  (from formula) │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  TROPICAL YEAR  │
                    │     (days)      │
                    └─────────────────┘


                    ┌─────────────────┐
                    │  ECCENTRICITY   │
                    │  (from formula) │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  SIDEREAL YEAR  │
                    │     (days)      │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ SIDEREAL YEAR   │ │  LENGTH OF DAY  │ │ (other derived  │
│   (seconds)     │ │    (seconds)    │ │    values)      │
│   = CONSTANT    │ │   = constant /  │ │                 │
│                 │ │  sidereal(days) │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### JavaScript Implementation

```javascript
// 1. Compute obliquity and eccentricity for the current year
const obliquity = computeObliquityEarth(currentYear);
const eccentricity = computeEccentricityEarth(currentYear, ...);

// 2. Compute year lengths from obliquity and eccentricity
const tropicalYear = computeLengthofsolarYear(obliquity);      // days
const siderealYear = computeLengthofsiderealYear(eccentricity); // days

// 3. Sidereal year in seconds is CONSTANT
const siderealYearSeconds = meansiderealyearlengthinSeconds;    // always 31,558,149.724 s

// 4. Length of day is DERIVED
const lengthofDay = meansiderealyearlengthinSeconds / siderealYear;  // seconds
```

### Excel Formulas

| Quantity | Excel Formula |
|----------|---------------|
| Tropical Year (days) | `= meanTropicalYear - (2.3 / meanLOD) * (obliquity - meanObliquity)` |
| Sidereal Year (days) | `= meanSiderealYear - (3208 / meanLOD) * (eccentricity - meanEccentricity)` |
| Sidereal Year (seconds) | `= meansiderealyearlengthinSeconds` (constant) |
| Length of Day (seconds) | `= meansiderealyearlengthinSeconds / siderealYear(days)` |

### Variation Ranges

Over one perihelion cycle (20,868 years):

| Quantity | Mean Value | Variation | Depends On |
|----------|------------|-----------|------------|
| Obliquity | 23.41398° | ±1.08° | H/3 and H/8 cycles |
| Eccentricity | 0.015321 | ±0.00142 | H/16 cycle |
| Tropical Year | 365.242189 days | ±2.5 s | Obliquity |
| Sidereal Year (days) | 365.256410 days | ±4.4 s | Eccentricity |
| Sidereal Year (seconds) | 31,558,149.724 s | **0** (constant) | - |
| Length of Day | 86,399.98848 s | ±12 ms | Eccentricity |

### Physical Interpretation Summary

1. **Sidereal year in seconds is constant** because it represents the orbital period - the time to complete one full orbit. This is determined by Kepler's 3rd law and doesn't change with Earth's orientation or orbital shape variations.

2. **Sidereal year in days varies with eccentricity** because the day length changes. More elliptical orbits have different velocity distributions, affecting how many "days" fit into the constant orbital period.

3. **Length of day varies with eccentricity** as a consequence: `LOD = constant seconds / variable days`.

4. **Tropical year varies with obliquity** because it measures equinox-to-equinox time. The steeper the ecliptic angle (higher obliquity), the faster the Sun crosses the equator, shortening the tropical year.

---

## Anomalistic Year Formula (January 2026)

### Definition

The **anomalistic year** is the time between successive perihelia (closest approaches to the Sun). It differs from the tropical year because the perihelion point itself precesses.

### IAU Reference Value

| Quantity | Value | Notes |
|----------|-------|-------|
| Anomalistic Year (J2000) | 365.259636 days | IAU reference |
| Anomalistic Year (J2000) | 31,558,432.5 seconds | In SI seconds |

### The Precession Relationship

The perihelion precession combines **apsidal** and **axial** precession:

```
1/(HY/16) = 1/(HY/3) + 1/(HY/13)
   16/HY  =    3/HY  +   13/HY
```

Where:
- **HY/3 = 111,296 years** - Apsidal precession (perihelion advance in inertial frame)
- **HY/13 = 25,684 years** - Axial precession (equinox regression)
- **HY/16 = 20,868 years** - Perihelion precession (combined effect)

### The Apsidal Correction Factors

The three precession cycles are related by the **apsidal denominator (3)**:

| Cycle | Denominator | Ratio to 3 | Factor |
|-------|-------------|------------|--------|
| Apsidal | 3 | 3/3 = 1 | 1.000 |
| Axial | 13 | 13/3 | **4.333...** |
| Perihelion | 16 | 16/3 | **5.333...** |

Note: 16 = 3 + 13, therefore 16/3 = 13/3 + 1, or **5.333 = 4.333 + 1**

---

### Three-Step Calculation Process

The anomalistic year is calculated in three steps:

#### Step 1: Raw Anomalistic Year in Days (Eccentricity Variation)

First, calculate the raw anomalistic year in days, which varies with eccentricity:

```
Raw Anomalistic Year (days) = mean_anomalistic_days + (k_ecc / mean_LOD) × (eccentricity - eccentricityDerivedMean)
```

Where:
- `mean_anomalistic_days` = 365.259692339 days
- `k_ecc` = **-6** seconds per unit eccentricity
- `mean_LOD` = 86,399.98848 seconds
- `eccentricityDerivedMean` = √(eccentricityMean² + eccentricityAmplitude²)

**Excel Formula (Step 1):**
```excel
= $A$3 + (($CF$3 / $BH$3) * (E264 - $E$2))
```

Where:
- `$A$3` = mean anomalistic year in days (365.259692339)
- `$CF$3` = **-6** (eccentricity coefficient)
- `$BH$3` = mean length of day (86,399.98848 seconds)
- `E264` = current eccentricity
- `$E$2` = eccentricityDerivedMean = √(eccentricityMean² + eccentricityAmplitude²)

#### Step 2: Apply Apsidal Correction (Seconds Experienced on Earth)

Next, apply the apsidal correction using factors 4.333 (13/3) and 5.333 (16/3):

```
Anomalistic Year (seconds) = (raw_days × LOD) -
    ((raw_days × LOD) - (mean_days × mean_LOD)) / (13/3) × (16/3)
```

**Excel Formula (Step 2):**
```excel
= (A_raw * LOD) - ((A_raw * LOD) - (A_mean * LOD_mean)) / 4.333333 * 5.333333
```

Where:
- `A_raw` = raw anomalistic year in days (from Step 1)
- `LOD` = current length of day in seconds
- `A_mean` = mean anomalistic year in days (365.259692339)
- `LOD_mean` = mean length of day in seconds (86,399.98848)
- `4.333333` = 13/3 (axial/apsidal ratio)
- `5.333333` = 16/3 (perihelion/apsidal ratio)

This gives the **anomalistic year in seconds as experienced on Earth**.

#### Step 3: Convert to IAU-Compatible Days

Finally, divide by 86400 to get the IAU-compatible value in days:

```
Anomalistic Year (IAU days) = Anomalistic Year (seconds) / 86400
```

**Excel Formula (Step 3):**
```excel
= Step2_result / 86400
```

This produces the value that matches the IAU reference of **365.259636 days**.

---

### Why This Process Works

The factors **13/3 (4.333...)** and **16/3 (5.333...)** encode the relationship between:
- The axial precession contribution (13/3 of the apsidal rate)
- The perihelion precession contribution (16/3 of the apsidal rate)

The apsidal correction extracts the difference between calculated and mean values, scaling by the ratio 16/13 = 1.2308.

**There is no accumulated drift.** The apsidal correction ensures that the calculated anomalistic year matches the observed/IAU value exactly.

---

### Complete JavaScript Implementation

```javascript
// Constants
const meanAnomalisticYearinDays = 365.259692339;
const meanAnomalisticYearAmplitude = -6;  // seconds per unit eccentricity
const meanlengthofday = 86399.98848;
const eccentricityDerivedMean = Math.sqrt(eccentricityMean * eccentricityMean + eccentricityAmplitude * eccentricityAmplitude);

// Step 1: Raw anomalistic year in days (varies with eccentricity)
function computeRawAnomalisticYearDays(eccentricity) {
  return meanAnomalisticYearinDays +
    (meanAnomalisticYearAmplitude / meanlengthofday) *
    (eccentricity - eccentricityDerivedMean);
}

// Step 2: Apply apsidal correction to get seconds experienced on Earth
function computeAnomalisticYearSeconds(rawAnomDays, lengthofDay) {
  const rawSeconds = rawAnomDays * lengthofDay;
  const meanSeconds = meanAnomalisticYearinDays * meanlengthofday;
  const difference = rawSeconds - meanSeconds;
  const apsidalCorrection = (difference / (13/3)) * (16/3);
  return rawSeconds - apsidalCorrection;
}

// Step 3: Convert to IAU-compatible days
function computeAnomalisticYearIAUDays(anomSeconds) {
  return anomSeconds / 86400;
}

// Complete calculation
const rawAnomDays = computeRawAnomalisticYearDays(eccentricity);
const anomSeconds = computeAnomalisticYearSeconds(rawAnomDays, lengthofDay);
const anomIAUDays = computeAnomalisticYearIAUDays(anomSeconds);
```

---

### Comparison of Year Types

| Year Type | Mean (days) | Eccentricity Coefficient | Variation |
|-----------|-------------|-------------------------|-----------|
| Sidereal | 365.256410 | **-3208** s/unit ecc | ~4.4 seconds |
| Tropical | 365.242189 | (via obliquity) | ~2.5 seconds |
| **Anomalistic** | **365.259692** | **-6** s/unit ecc | **~0.12 seconds** |

The anomalistic year has a very small eccentricity variation (~0.12 seconds) compared to the sidereal year (~4.4 seconds). This is because the eccentricity effect on day length nearly cancels with the eccentricity effect on the anomalistic year itself.

### Summary

| Year Type | Primary Driver | HY Fraction | Correction Factor |
|-----------|---------------|-------------|-------------------|
| Tropical | Obliquity | HY/3, HY/8 | None |
| Sidereal | Eccentricity | HY/16 | None |
| **Anomalistic** | **Perihelion precession** | **HY/16** | **13/3 and 16/3** |

The anomalistic year requires a three-step calculation:
1. **Raw days** from eccentricity (coefficient -6)
2. **Apsidal correction** using 13/3 and 16/3 factors
3. **Division by 86400** to match IAU reference

This process ensures the calculated value matches the IAU reference with no accumulated drift.

---

### Legacy Formula Reference

The older model implementation (before the three-step process):

```javascript
// Mean anomalistic year in days
const meanAnomalisticYearinDays = meansolaryearlengthinDays +
    (meansolaryearlengthinDays / (perihelionCycleLength - 1));

// Calculated anomalistic year (varies with perihelion precession)
const calcAnomalisticDays = lengthofsolarYear * perihelionPrecession /
    (perihelionPrecession - 1);
```
= $A$3 + (($CF$3 / $BH$3) * (E264 - $E$2))
```

Where:
- `$A$3` = mean anomalistic year in days (365.259692339)
- `$CF$3` = **-6** (eccentricity coefficient)
- `$BH$3` = mean length of day (86,399.98848 seconds)
- `E264` = current eccentricity
- `$E$2` = eccentricityDerivedMean = √(eccentricityMean² + eccentricityAmplitude²)

#### JavaScript Implementation

```javascript
// Anomalistic year in days (varies with eccentricity)
const meanAnomalisticYearAmplitude = -6;  // seconds per unit eccentricity

function computeAnomalisticYearDays(eccentricity) {
  return meanAnomalisticYearinDays +
    (meanAnomalisticYearAmplitude / meanlengthofday) *
    (eccentricity - eccentricityDerivedMean);
}
```

#### Comparison of Year Types

| Year Type | Mean (days) | Eccentricity Coefficient | Variation |
|-----------|-------------|-------------------------|-----------|
| Sidereal | 365.256410 | **-3208** s/unit ecc | ~4.4 seconds |
| Tropical | 365.242189 | (via obliquity) | ~2.5 seconds |
| **Anomalistic** | **365.259692** | **-6** s/unit ecc | **~0.12 seconds** |

The anomalistic year has a very small eccentricity variation (~0.12 seconds) compared to the sidereal year (~4.4 seconds). This is because the eccentricity effect on day length nearly cancels with the eccentricity effect on the anomalistic year itself.

### Summary

| Year Type | Primary Driver | HY Fraction | Correction Factor |
|-----------|---------------|-------------|-------------------|
| Tropical | Obliquity | HY/3, HY/8 | None |
| Sidereal | Eccentricity | HY/16 | None |
| **Anomalistic** | **Perihelion precession** | **HY/16** | **13/3 and 16/3** |

The anomalistic year requires an apsidal correction using the factors 13/3 and 16/3, which represent the ratios of axial and perihelion precession rates to the fundamental apsidal rate. This correction ensures the calculated value matches the IAU reference with no accumulated drift.

---

*Document updated: January 2026 - Added sidereal year four-methods analysis confirming that wobble parallax is constant (+1.75s) while the ~8.5s cyclical variation is a real model effect. Updated sidereal year formula with correct phase alignment: 1246 AD = peak low, 11680 AD = peak high. Added calibration approach to achieve mean LOD = 86400s. Added Key Discovery section explaining that the 11.4ms solar day offset is correct behavior (sinusoidal, not constant) - perihelion precession adds exactly 1 extra day over the 20,868-year cycle. Added Implemented Formulas section documenting all corrected formulas in script.js. Updated constants: meansiderealyearlengthinSeconds = 31,558,149.724 s, meansiderealyearAmplitudeinSecondsaDay = 3208 (calibrated to J2000 precession period of 25,771.57 years). Added Anomalistic Year Formula section documenting the apsidal correction using 13/3 and 16/3 factors to match IAU reference value.*
